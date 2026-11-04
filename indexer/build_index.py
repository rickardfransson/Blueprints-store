#!/usr/bin/env python3
"""Bygger en katalog (index.json) över Home Assistant-blueprints.

Källa: forumkategorin "Blueprints Exchange" på community.home-assistant.io.
Forumet kör Discourse, som ger JSON om man lägger till ".json" på en URL.

Flöde:
  1. Hämta trådlistan i kategorin (sida för sida).
  2. För varje tråd: läs första inlägget och leta efter
     my.home-assistant.io/redirect/blueprint_import/?blueprint_url=...
  3. Hämta blueprint-YAML:en från den länken (GitHub, gist eller forumet).
  4. Plocka ut namn, beskrivning, domän, inputs, krav, känsliga tjänster
     (lås, larm, kommandon …) och en innehålls-hash.
  5. Skriv allt till index.json.

Körs normalt nattligen av GitHub Actions. Lokalt:
    python indexer/build_index.py --max-pages 2 --out index.json
"""

from __future__ import annotations

import argparse
import hashlib
import html
import json
import logging
import re
import sys
import time
from dataclasses import dataclass, field
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Callable
from urllib.parse import parse_qs, unquote, urlparse

import requests
import yaml

FORUM = "https://community.home-assistant.io"
CATEGORY_PATH = "/c/blueprints-exchange/53"
SCHEMA_VERSION = 1
USER_AGENT = "ha-blueprint-store-indexer/0.1 (+https://github.com/rickardfransson/Blueprints-store)"

log = logging.getLogger("indexer")

# Typ för "hämta en URL och ge tillbaka text". Utbytbar i tester.
Fetcher = Callable[[str], str]


# --------------------------------------------------------------------------
# Hämtning med artig hastighetsbegränsning
# --------------------------------------------------------------------------

class HttpFetcher:
    """Hämtar URL:er, väntar mellan anrop och respekterar 429/Retry-After
    samt GitHubs API-gräns (60 anrop i timmen utan inloggning)."""

    def __init__(self, delay: float = 1.0, retries: int = 4, timeout: float = 20.0):
        self.session = requests.Session()
        self.session.headers["User-Agent"] = USER_AGENT
        self.delay = delay
        self.retries = retries
        self.timeout = timeout
        self._last = 0.0

    def __call__(self, url: str) -> str:
        for attempt in range(self.retries + 1):
            wait = self.delay - (time.monotonic() - self._last)
            if wait > 0:
                time.sleep(wait)
            self._last = time.monotonic()
            resp = self.session.get(url, timeout=self.timeout)
            if (resp.status_code in (403, 429) and resp.headers.get("X-RateLimit-Remaining") == "0"
                    and attempt < self.retries):
                reset = float(resp.headers.get("X-RateLimit-Reset", time.time() + 60))
                pause = min(max(reset - time.time(), 1) + 2, 3700)
                log.warning("GitHubs gräns nådd, väntar %.0fs", pause)
                time.sleep(pause)
                continue
            if resp.status_code == 429 and attempt < self.retries:
                pause = float(resp.headers.get("Retry-After", 10 * (attempt + 1)))
                log.warning("429 från %s, väntar %.0fs", url, pause)
                time.sleep(pause)
                continue
            if resp.status_code >= 500 and attempt < self.retries:
                time.sleep(2 ** attempt)
                continue
            resp.raise_for_status()
            return resp.text
        raise RuntimeError(f"gav upp efter {self.retries} försök: {url}")


# --------------------------------------------------------------------------
# YAML: blueprints använder egna taggar (!input, !secret, ...) som
# vanliga yaml.safe_load inte känner till. Vi ersätter dem med platshållare.
# --------------------------------------------------------------------------

class _BlueprintLoader(yaml.SafeLoader):
    pass


def _tag_placeholder(loader: yaml.Loader, suffix: str, node: yaml.Node) -> Any:
    if isinstance(node, yaml.ScalarNode):
        return {"__tag__": suffix, "value": loader.construct_scalar(node)}
    if isinstance(node, yaml.SequenceNode):
        return {"__tag__": suffix, "value": loader.construct_sequence(node)}
    return {"__tag__": suffix, "value": loader.construct_mapping(node)}


_BlueprintLoader.add_multi_constructor("!", _tag_placeholder)


def parse_yaml(text: str) -> dict:
    data = yaml.load(text, Loader=_BlueprintLoader)  # noqa: S506 - SafeLoader-subklass
    if not isinstance(data, dict):
        raise ValueError("YAML är inte en mappning")
    return data


# --------------------------------------------------------------------------
# Länkar
# --------------------------------------------------------------------------

IMPORT_RE = re.compile(
    r"https?://my\.home-assistant\.io/(?:create-link/\?redirect=)?redirect/blueprint_import/?\?[^\"'<>\s]+",
    re.IGNORECASE,
)


def extract_import_urls(cooked_html: str) -> list[str]:
    """Hitta blueprint-URL:er bakom 'Importera'-knappar i ett inläggs HTML."""
    found: list[str] = []
    for match in IMPORT_RE.findall(cooked_html):
        query = urlparse(html.unescape(match)).query
        for value in parse_qs(query).get("blueprint_url", []):
            url = clean_url(unquote(value))
            if url and url not in found:
                found.append(url)
    return found


def clean_url(url: str) -> str:
    """Reda ut vanliga slarvfel i import-länkar.

    - Markdown-länk inklistrad: "[text](https://...)" -> "https://..."
    - Samma länk inklistrad två gånger i rad: "https://a...https://a..." -> första
    """
    url = url.strip()
    md = re.search(r"\]\((https?://[^)\s]+)\)?", url)
    if md:
        url = md.group(1)
    second = url.find("https://", 8)
    if second > 0:
        url = url[:second]
    url = url.strip().rstrip("]>")
    # Ta bara bort en avslutande ")" som saknar "(" – den kan höra till filnamnet.
    while url.endswith(")") and url.count(")") > url.count("("):
        url = url[:-1]
    return url


GITHUB_BLOB_RE = re.compile(r"^https://github\.com/([^/]+)/([^/]+)/blob/(.+)$")
GIST_RE = re.compile(r"^https://gist\.github\.com/(?:([^/]+)/)?([0-9a-f]+)")
BLUEPRINT_START_RE = re.compile(r"^\s*blueprint\s*:", re.MULTILINE)
FORUM_TOPIC_RE = re.compile(r"^https://community\.home-assistant\.io/t/(?:[^/]+/)?(\d+)")


def classify_source(url: str) -> str:
    if GITHUB_BLOB_RE.match(url) or url.startswith("https://raw.githubusercontent.com/"):
        return "github"
    if GIST_RE.match(url):
        return "gist"
    if FORUM_TOPIC_RE.match(url):
        return "forum"
    return "url"


def github_raw_url(url: str) -> str:
    """github.com/u/r/blob/branch/path -> raw.githubusercontent.com/u/r/branch/path
    (samma omvandling som Home Assistants egen importfunktion gör)."""
    m = GITHUB_BLOB_RE.match(url)
    if not m:
        return url
    user, repo, rest = m.groups()
    return f"https://raw.githubusercontent.com/{user}/{repo}/{rest}"


CODE_BLOCK_RE = re.compile(r"<code[^>]*>(.*?)</code>", re.DOTALL | re.IGNORECASE)


def yaml_from_forum_html(cooked_html: str) -> str | None:
    """Plocka första kodblock i ett foruminlägg som ser ut som en blueprint."""
    for block in CODE_BLOCK_RE.findall(cooked_html):
        text = html.unescape(re.sub(r"<[^>]+>", "", block))
        if BLUEPRINT_START_RE.search(text):
            return text
    return None


def fetch_blueprint_yaml(url: str, fetch: Fetcher) -> str:
    kind = classify_source(url)
    if kind == "github":
        return fetch(github_raw_url(url))
    if kind == "gist":
        # Hämta gistens första fil som vanlig text. Det kräver inget API-anrop,
        # så GitHubs API-gräns (och token-krångel) slipper vi för de flesta gists.
        user, gist_id = GIST_RE.match(url).groups()  # type: ignore[union-attr]
        raw = (f"https://gist.githubusercontent.com/{user}/{gist_id}/raw" if user
               else f"https://gist.github.com/{gist_id}/raw")
        try:
            text = fetch(raw)
            if BLUEPRINT_START_RE.search(text):
                return text
        except Exception:  # noqa: BLE001 - provar API:t nedan
            pass
        # Gisten har flera filer och blueprinten var inte den första: fråga API:t.
        data = json.loads(fetch(f"https://api.github.com/gists/{gist_id}"))
        for f in data.get("files", {}).values():
            if f.get("filename", "").endswith((".yaml", ".yml")):
                return f.get("content") or fetch(f["raw_url"])
        raise ValueError("gisten saknar YAML-fil")
    if kind == "forum":
        topic_id = FORUM_TOPIC_RE.match(url).group(1)  # type: ignore[union-attr]
        topic = json.loads(fetch(f"{FORUM}/t/{topic_id}.json"))
        for post in topic.get("post_stream", {}).get("posts", []):
            text = yaml_from_forum_html(post.get("cooked", ""))
            if text:
                return text
        raise ValueError("hittade ingen blueprint-kod i forumtråden")
    return fetch(url)


# --------------------------------------------------------------------------
# Metadata ur blueprinten
# --------------------------------------------------------------------------

def _walk_inputs(inputs: dict) -> list[tuple[str, dict]]:
    """Platta ut inputs. Nyare blueprints kan gruppera dem i sektioner."""
    flat: list[tuple[str, dict]] = []
    for key, spec in (inputs or {}).items():
        if isinstance(spec, dict) and "input" in spec and isinstance(spec["input"], dict):
            flat.extend(_walk_inputs(spec["input"]))
        else:
            flat.append((key, spec if isinstance(spec, dict) else {}))
    return flat


def _as_list(value: Any) -> list:
    if value is None:
        return []
    return value if isinstance(value, list) else [value]


def requirements_from_inputs(inputs: dict) -> tuple[set[str], set[str]]:
    """Vilka integrationer och entitetsdomäner kräver blueprinten?"""
    integrations: set[str] = set()
    domains: set[str] = set()
    for _, spec in _walk_inputs(inputs):
        selector = spec.get("selector") or {}
        if not isinstance(selector, dict):
            continue
        for sel_type, sel in selector.items():
            if not isinstance(sel, dict):
                continue
            filters = _as_list(sel.get("filter")) or [sel]
            for flt in filters:
                if not isinstance(flt, dict):
                    continue
                for integ in _as_list(flt.get("integration")):
                    integrations.add(str(integ))
                for dom in _as_list(flt.get("domain")):
                    domains.add(str(dom))
                for ent in _as_list(flt.get("entity")):
                    if isinstance(ent, dict):
                        integrations.update(map(str, _as_list(ent.get("integration"))))
                        domains.update(map(str, _as_list(ent.get("domain"))))
            if sel_type == "device":
                for ent in _as_list(sel.get("entity")):
                    if isinstance(ent, dict):
                        domains.update(map(str, _as_list(ent.get("domain"))))
    return integrations, domains


# Vad en blueprint kan göra som är värt att känna till innan man installerar.
# Nyckeln är kategorin som butiken visar som ett märke, värdet är de
# tjänstedomäner (och i några fall hela tjänster) som räknas dit.
SENSITIVE_ACTIONS: dict[str, set[str]] = {
    "locks": {"lock"},
    "alarm": {"alarm_control_panel"},
    "climate": {"climate", "water_heater"},
    "covers": {"cover"},
    "commands": {"shell_command", "python_script", "pyscript", "command_line"},
    "system": {"hassio", "homeassistant.restart", "homeassistant.stop"},
    "web_requests": {"rest_command"},
}
# Entitetsdomäner i blueprintens inställningar som räcker för ett märke,
# t.ex. "välj ett lås" även om själva tjänsten är en mall.
SENSITIVE_INPUT_DOMAINS = {"locks": {"lock"}, "alarm": {"alarm_control_panel"},
                           "climate": {"climate", "water_heater"}, "covers": {"cover"}}
SENSITIVE_ORDER = [*SENSITIVE_ACTIONS, "webhook"]


def _walk_values(node: Any):
    """Alla (nyckel, värde)-par i ett YAML-träd, på alla nivåer."""
    if isinstance(node, dict):
        for key, value in node.items():
            yield key, value
            yield from _walk_values(value)
    elif isinstance(node, list):
        for item in node:
            yield from _walk_values(item)


def sensitive_categories(data: dict, input_domains: set[str]) -> list[str]:
    """Vilka känsliga saker blueprinten styr: lås, larm, värme, kommandon …"""
    found: set[str] = set()
    for key, value in _walk_values({k: v for k, v in data.items() if k != "blueprint"}):
        if key in ("action", "service") and isinstance(value, str) and "." in value:
            service = value.strip().lower()
            domain = service.split(".", 1)[0]
            for cat, names in SENSITIVE_ACTIONS.items():
                if domain in names or service in names:
                    found.add(cat)
        elif key in ("trigger", "platform") and value == "webhook":
            found.add("webhook")
    for cat, domains in SENSITIVE_INPUT_DOMAINS.items():
        if input_domains & domains:
            found.add(cat)
    return [c for c in SENSITIVE_ORDER if c in found]


def describe_blueprint(text: str) -> dict:
    data = parse_yaml(text)
    bp = data.get("blueprint")
    if not isinstance(bp, dict):
        raise ValueError("saknar 'blueprint:'-sektion")
    domain = bp.get("domain")
    if domain not in {"automation", "script", "template"}:
        raise ValueError(f"okänd domän: {domain!r}")
    inputs = bp.get("input") or {}
    integrations, domains = requirements_from_inputs(inputs)
    ha = bp.get("homeassistant") or {}
    return {
        "name": str(bp.get("name") or "").strip(),
        "description": str(bp.get("description") or "").strip(),
        "domain": domain,
        "author": bp.get("author"),
        "min_ha_version": ha.get("min_version") if isinstance(ha, dict) else None,
        "inputs": [
            {
                "key": key,
                "name": spec.get("name", key),
                "selector": next(iter(spec.get("selector") or {}), None)
                if isinstance(spec.get("selector"), dict) else None,
                "required": "default" not in spec,
            }
            for key, spec in _walk_inputs(inputs)
        ],
        "requires_integrations": sorted(integrations),
        "requires_domains": sorted(domains),
        "sensitive": sensitive_categories(data, domains),
        "sha256": hashlib.sha256(text.encode("utf-8")).hexdigest(),
    }


# --------------------------------------------------------------------------
# Forumet
# --------------------------------------------------------------------------

def iter_topics(fetch: Fetcher, max_pages: int):
    url = f"{FORUM}{CATEGORY_PATH}/l/latest.json?page=0"
    for page in range(max_pages):
        data = json.loads(fetch(url))
        topics = data.get("topic_list", {}).get("topics", [])
        if not topics:
            return
        for t in topics:
            if t.get("pinned"):  # t.ex. kategorins "Om"-tråd
                continue
            yield t
        if not data.get("topic_list", {}).get("more_topics_url"):
            return
        url = f"{FORUM}{CATEGORY_PATH}/l/latest.json?page={page + 1}"


@dataclass
class Result:
    blueprints: list[dict] = field(default_factory=list)
    errors: list[dict] = field(default_factory=list)
    topics_seen: int = 0
    topics_without_import: int = 0
    duplicates: int = 0


def build_index(fetch: Fetcher, max_pages: int, previous: dict | None = None,
                now: str | None = None) -> Result:
    """Bygg katalogen. 'previous' = förra körningens index; oförändrade
    trådar (samma bumped_at) återanvänds så vi inte belastar forumet i onödan."""
    cache: dict[int, list[dict]] = {}
    if previous:
        for bp in previous.get("blueprints", []):
            cache.setdefault(bp["topic"]["id"], []).append(bp)

    res = Result()
    seen_sources: set[str] = set()

    for t in iter_topics(fetch, max_pages):
        res.topics_seen += 1
        topic_id = t["id"]
        topic_url = f"{FORUM}/t/{t.get('slug', 'topic')}/{topic_id}"

        cached = cache.get(topic_id)
        # Poster från en äldre katalog utan "sensitive" läses om en gång.
        if (cached and cached[0]["topic"].get("bumped_at") == t.get("bumped_at")
                and all("sensitive" in bp for bp in cached)):
            for bp in cached:
                if bp["source_url"] not in seen_sources:
                    seen_sources.add(bp["source_url"])
                    res.blueprints.append(bp)
            continue

        try:
            topic = json.loads(fetch(f"{FORUM}/t/{topic_id}.json"))
            first = topic["post_stream"]["posts"][0]
            urls = extract_import_urls(first.get("cooked", ""))
        except Exception as exc:  # noqa: BLE001
            res.errors.append({"topic": topic_url, "stage": "topic", "error": str(exc)})
            continue

        if not urls:
            res.topics_without_import += 1
            continue

        for src in urls:
            if src in seen_sources:  # samma blueprint länkad från flera trådar
                continue
            try:
                text = fetch_blueprint_yaml(src, fetch)
                meta = describe_blueprint(text)
            except Exception as exc:  # noqa: BLE001
                res.errors.append({"topic": topic_url, "source_url": src,
                                   "stage": "blueprint", "error": str(exc)[:300]})
                continue
            seen_sources.add(src)
            res.blueprints.append({
                "id": hashlib.sha1(src.encode()).hexdigest()[:12],
                "source_url": src,
                "source_type": classify_source(src),
                **meta,
                "topic": {
                    "id": topic_id,
                    "url": topic_url,
                    "title": topic.get("title") or t.get("title"),
                    "tags": [x if isinstance(x, str) else x.get("name")
                             for x in topic.get("tags") or t.get("tags") or []],
                    "likes": topic.get("like_count", t.get("like_count", 0)),
                    "views": topic.get("views", t.get("views", 0)),
                    "created_at": topic.get("created_at", t.get("created_at")),
                    "bumped_at": t.get("bumped_at"),
                    "poster": first.get("username"),
                },
            })
    before = len(res.blueprints)
    res.blueprints = dedupe(res.blueprints)
    res.duplicates = before - len(res.blueprints)
    stamp_dates(res.blueprints, previous, now or datetime.now(timezone.utc).isoformat(timespec="seconds"))
    return res


def stamp_dates(blueprints: list[dict], previous: dict | None, now: str) -> None:
    """Sätt added_at (när blueprinten kom in i katalogen) och changed_at (när
    innehållet senast ändrades). Butiken använder dem för "Nytt sedan sist".

    Ny version av samma blueprint i samma tråd (t.ex. en ny versionslänk)
    räknas som en ändring, inte som en ny blueprint.
    """
    old_by_url: dict[str, dict] = {}
    old_by_name: dict[tuple, dict] = {}
    for bp in (previous or {}).get("blueprints", []):
        old_by_url[bp["source_url"]] = bp
        old_by_name[(bp["topic"]["id"], bp.get("domain"), _name_key(bp.get("name", "")))] = bp

    for bp in blueprints:
        old = old_by_url.get(bp["source_url"]) or old_by_name.get(
            (bp["topic"]["id"], bp.get("domain"), _name_key(bp.get("name", ""))))
        if old is None:
            # Allra första körningen: allt är inte "nytt", använd trådens datum.
            bp["added_at"] = now if previous else (bp["topic"].get("created_at") or now)
            bp["changed_at"] = None
            continue
        bp["added_at"] = old.get("added_at") or old["topic"].get("created_at") or now
        if old.get("sha256") != bp.get("sha256"):
            bp["changed_at"] = now
        else:
            bp["changed_at"] = old.get("changed_at")


# --------------------------------------------------------------------------
# Dubbletter
# --------------------------------------------------------------------------

GIT_REF_RE = re.compile(
    r"^https://(?:github\.com/[^/]+/[^/]+/blob|raw\.githubusercontent\.com/[^/]+/[^/]+)/([^/]+)/"
)
BRANCH_NAMES = {"main", "master", "dev", "develop", "latest", "stable", "release"}


def version_rank(url: str) -> tuple:
    """Hur "ny" en länk ser ut: en gren (main) > högsta versionsnummer > övrigt.

    Används när samma blueprint är länkad i flera versioner i en tråd,
    t.ex. .../blob/v1.0/x.yaml, .../blob/v1.4/x.yaml.
    """
    m = GIT_REF_RE.match(url)
    if not m:
        return (1, ())
    ref = m.group(1).lower()
    if ref in BRANCH_NAMES:
        return (2, ())
    if re.fullmatch(r"v?\d+(\.\d+)*([-.]?[a-z0-9]+)?", ref):
        return (1, tuple(int(x) for x in re.findall(r"\d+", ref)))
    return (0, ())  # t.ex. en commit-hash


def _name_key(name: str) -> str:
    return re.sub(r"\W+", "", (name or "").lower())


GIT_FILE_RE = re.compile(
    r"^https://(?:github\.com/([^/]+)/([^/]+)/blob|raw\.githubusercontent\.com/([^/]+)/([^/]+))/[^/]+/(.+)$"
)


def _file_key(url: str) -> tuple | None:
    """Samma fil i samma repo, oavsett version: github.com/u/r/blob/v1.0/x.yaml
    och github.com/u/r/blob/main/x.yaml ger samma nyckel."""
    m = GIT_FILE_RE.match(url)
    if not m:
        return None
    user, repo = (m.group(1) or m.group(3)).lower(), (m.group(2) or m.group(4)).lower()
    return (user, repo, m.group(5))


def dedupe(blueprints: list[dict]) -> list[dict]:
    """Ta bort dubbletter men behåll ordningen.

    1. Samma tråd, samma typ och samma namn = olika versioner av samma
       blueprint. Behåll den nyaste.
    2. Samma tråd och samma fil i samma repo, men olika versioner (namnet
       kan ha ändrats mellan versionerna). Behåll den nyaste.
    3. Exakt samma innehåll i flera trådar. Behåll den mest gillade.
    """
    def pick(groups: dict, better) -> set[int]:
        keep = set()
        for idxs in groups.values():
            keep.add(max(idxs, key=lambda i: (better(blueprints[i]), -i)))
        return keep

    by_version: dict[tuple, list[int]] = {}
    for i, bp in enumerate(blueprints):
        key = (bp["topic"]["id"], bp.get("domain"), _name_key(bp.get("name", ""))) if bp.get("name") else (i,)
        by_version.setdefault(key, []).append(i)
    keep = pick(by_version, lambda bp: version_rank(bp["source_url"]))

    by_file: dict[tuple, list[int]] = {}
    for i in sorted(keep):
        fk = _file_key(blueprints[i]["source_url"])
        key = (blueprints[i]["topic"]["id"], *fk) if fk else (i,)
        by_file.setdefault(key, []).append(i)
    keep = pick(by_file, lambda bp: version_rank(bp["source_url"]))

    by_content: dict[str, list[int]] = {}
    for i in sorted(keep):
        by_content.setdefault(blueprints[i].get("sha256") or str(i), []).append(i)
    keep = pick(by_content, lambda bp: bp["topic"].get("likes") or 0)

    return [bp for i, bp in enumerate(blueprints) if i in keep]


def main(argv: list[str] | None = None) -> int:
    ap = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    ap.add_argument("--out", default="index.json")
    ap.add_argument("--previous", help="förra index.json, för att slippa hämta oförändrade trådar")
    ap.add_argument("--max-pages", type=int, default=500, help="antal trådlistsidor (ca 30 trådar/sida)")
    ap.add_argument("--delay", type=float, default=1.0, help="sekunder mellan anrop")
    ap.add_argument("-v", "--verbose", action="store_true")
    args = ap.parse_args(argv)

    logging.basicConfig(level=logging.DEBUG if args.verbose else logging.INFO,
                        format="%(levelname)s %(message)s")

    previous = None
    if args.previous and Path(args.previous).exists():
        previous = json.loads(Path(args.previous).read_text("utf-8"))

    res = build_index(HttpFetcher(delay=args.delay), args.max_pages, previous)
    res.blueprints.sort(key=lambda b: (-(b["topic"]["likes"] or 0), b["name"].lower()))

    index = {
        "schema_version": SCHEMA_VERSION,
        "generated_at": datetime.now(timezone.utc).isoformat(timespec="seconds"),
        "stats": {
            "topics_seen": res.topics_seen,
            "blueprints": len(res.blueprints),
            "topics_without_import_link": res.topics_without_import,
            "duplicates_removed": res.duplicates,
            "errors": len(res.errors),
        },
        "blueprints": res.blueprints,
        "errors": res.errors,
    }
    Path(args.out).write_text(json.dumps(index, ensure_ascii=False, indent=1), "utf-8")
    log.info("Klar: %(blueprints)d blueprints från %(topics_seen)d trådar, %(errors)d fel",
             index["stats"])
    return 0


if __name__ == "__main__":
    sys.exit(main())
