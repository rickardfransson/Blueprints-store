#!/usr/bin/env python3
"""Skriver en läsbar sammanfattning av index.json (Markdown, för GitHub Actions)."""

import collections
import json
import re
import sys


def error_kind(err: dict) -> str:
    """Gör om ett felmeddelande till en kategori, så att liknande fel räknas ihop."""
    msg = err.get("error", "").splitlines()[0] if err.get("error") else ""
    msg = re.sub(r"https?://\S+", "<url>", msg)
    msg = re.sub(r"\d+", "N", msg)
    return f"{err.get('stage', '?')}: {msg[:110]}"


def main(path: str) -> None:
    index = json.load(open(path, encoding="utf-8"))
    s = index["stats"]
    bps = index["blueprints"]
    errors = index["errors"]

    print("## Blueprint-katalog\n")
    print("| | Antal |\n|---|---:|")
    print(f"| Trådar lästa | {s['topics_seen']} |")
    print(f"| Blueprints i katalogen | {s['blueprints']} |")
    print(f"| Trådar utan import-knapp | {s['topics_without_import_link']} |")
    print(f"| Fel | {s['errors']} |")
    if "duplicates_removed" in s:
        print(f"| Dubbletter borttagna | {s['duplicates_removed']} |")

    print("\n### Per typ\n")
    for k, v in collections.Counter(b["domain"] for b in bps).most_common():
        print(f"- {k}: {v}")
    print("\n### Per källa\n")
    for k, v in collections.Counter(b["source_type"] for b in bps).most_common():
        print(f"- {k}: {v}")

    if errors:
        print("\n### Vanligaste felen\n")
        print("| Antal | Fel |\n|---:|---|")
        for kind, n in collections.Counter(map(error_kind, errors)).most_common(15):
            print(f"| {n} | `{kind.replace('|', '/')}` |")
        print("\n### Fel per källa\n")
        hosts = collections.Counter(
            re.sub(r"^https?://([^/]+).*", r"\1", e.get("source_url") or "(tråden)") for e in errors
        )
        for k, v in hosts.most_common(8):
            print(f"- {k}: {v}")


if __name__ == "__main__":
    main(sys.argv[1])
