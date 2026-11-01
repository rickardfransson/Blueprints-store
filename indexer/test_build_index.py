"""Tester som körs helt utan nätverk: forumet och GitHub ersätts av en
ordbok med påhittade svar som har samma form som de riktiga."""

import json
from urllib.parse import quote

import pytest

import build_index as bi

F = bi.FORUM
CAT = f"{F}{bi.CATEGORY_PATH}/l/latest.json"


def import_badge(url: str) -> str:
    # Discourse HTML-escapar & i href, precis som här.
    href = ("https://my.home-assistant.io/redirect/blueprint_import/"
            f"?blueprint_url={quote(url, safe='')}")
    return f'<p><a href="{href.replace("&", "&amp;")}"><img alt="Open your Home Assistant"></a></p>'


GH = "https://github.com/alice/blueprints/blob/main/automation/motion.yaml"
GIST = "https://gist.github.com/bob/abc123def"
FORUM_BP = f"{F}/t/simple-forum-blueprint/1002"
BROKEN = "https://github.com/carol/bp/blob/main/broken.yaml"

MOTION_YAML = """
blueprint:
  name: Motion light (ZHA)
  description: Tänd lampan vid rörelse
  domain: automation
  author: Alice
  homeassistant:
    min_version: 2024.6.0
  input:
    sensors:
      name: Sensorer
      input:
        motion:
          name: Rörelsesensor
          selector:
            entity:
              filter:
                - integration: zha
                  domain: binary_sensor
        light:
          name: Lampa
          selector:
            target:
              entity:
                domain: light
    delay:
      name: Fördröjning
      default: 120
      selector:
        number: {min: 0, max: 3600}
triggers:
  - trigger: state
    entity_id: !input motion
    to: "on"
actions:
  - action: light.turn_on
    target: !input light
"""

SCRIPT_YAML = """blueprint:
  name: Notify everyone
  domain: script
  input:
    msg:
      name: Meddelande
      selector: {text: {}}
sequence:
  - action: notify.notify
    data:
      message: !input msg
      api_key: !secret notify_key
"""


def topic(tid, cooked, title="T", likes=0):
    return json.dumps({
        "id": tid, "title": title, "like_count": likes, "views": 10,
        "created_at": "2026-01-01T00:00:00Z", "tags": ["automation"],
        "post_stream": {"posts": [{"cooked": cooked, "username": "u"}]},
    })


def listing(topics, more):
    return json.dumps({"topic_list": {
        "topics": topics, "more_topics_url": "/next" if more else None}})


def t(tid, bumped="2026-10-01", **kw):
    return {"id": tid, "slug": f"topic-{tid}", "title": f"Topic {tid}",
            "bumped_at": bumped, "like_count": 0, **kw}


FORUM_COOKED = (import_badge(FORUM_BP) +
                '<pre><code class="lang-yaml">blueprint:\n  name: Forum &amp; friends\n'
                '  domain: automation\n  input: {}\ntriggers: []\nactions: []\n</code></pre>')

RESPONSES = {
    f"{CAT}?page=0": listing([t(1, pinned=True), t(1001), t(1002), t(1003)], more=True),
    f"{CAT}?page=1": listing([t(1004), t(1005), t(1006)], more=False),
    f"{F}/t/1001.json": topic(1001, "<p>Hej!</p>" + import_badge(GH), likes=50),
    f"{F}/t/1002.json": topic(1002, FORUM_COOKED, likes=3),
    f"{F}/t/1003.json": topic(1003, "<p>Bara en fråga, ingen blueprint</p>"),
    f"{F}/t/1004.json": topic(1004, import_badge(BROKEN)),
    f"{F}/t/1005.json": topic(1005, import_badge(GIST), likes=7),
    f"{F}/t/1006.json": topic(1006, import_badge(GH)),  # dubblett av 1001
    "https://raw.githubusercontent.com/alice/blueprints/main/automation/motion.yaml": MOTION_YAML,
    "https://raw.githubusercontent.com/carol/bp/main/broken.yaml": "blueprint: [oj\n",
    "https://api.github.com/gists/abc123def": json.dumps(
        {"files": {"n.yaml": {"filename": "n.yaml", "content": SCRIPT_YAML}}}),
}


class FakeFetch:
    def __init__(self, responses):
        self.responses = responses
        self.calls = []

    def __call__(self, url):
        self.calls.append(url)
        if url not in self.responses:
            raise RuntimeError(f"404 {url}")
        return self.responses[url]


@pytest.fixture
def result():
    return bi.build_index(FakeFetch(RESPONSES), max_pages=5)


def by_name(res):
    return {b["name"]: b for b in res.blueprints}


def test_overview(result):
    assert result.topics_seen == 6           # pinnade tråden hoppas över
    assert len(result.blueprints) == 3       # motion, forum, gist
    assert result.topics_without_import == 1
    assert len(result.errors) == 1 and result.errors[0]["source_url"] == BROKEN


def test_github_blueprint_metadata(result):
    bp = by_name(result)["Motion light (ZHA)"]
    assert bp["source_type"] == "github"
    assert bp["domain"] == "automation"
    assert bp["min_ha_version"] == "2024.6.0"
    assert bp["requires_integrations"] == ["zha"]
    assert bp["requires_domains"] == ["binary_sensor", "light"]
    assert [i["key"] for i in bp["inputs"]] == ["motion", "light", "delay"]
    assert [i["required"] for i in bp["inputs"]] == [True, True, False]
    assert bp["topic"]["likes"] == 50 and bp["topic"]["id"] == 1001


def test_forum_hosted_blueprint_is_unescaped(result):
    assert "Forum & friends" in by_name(result)


def test_gist_script_with_secret_tag(result):
    bp = by_name(result)["Notify everyone"]
    assert bp["domain"] == "script" and bp["source_type"] == "gist"


def test_duplicate_links_counted_once(result):
    assert sum(b["source_url"] == GH for b in result.blueprints) == 1


def test_unchanged_topics_are_not_refetched(result):
    previous = {"blueprints": result.blueprints}
    fetch = FakeFetch(RESPONSES)
    again = bi.build_index(fetch, max_pages=5, previous=previous)
    assert len(again.blueprints) == 3
    assert f"{F}/t/1001.json" not in fetch.calls   # oförändrad -> cache
    assert f"{F}/t/1004.json" in fetch.calls       # trasig förra gången -> försök igen


def test_changed_topic_is_refetched(result):
    previous = {"blueprints": result.blueprints}
    responses = dict(RESPONSES)
    responses[f"{CAT}?page=0"] = listing([t(1001, bumped="2026-10-30")], more=False)
    fetch = FakeFetch(responses)
    bi.build_index(fetch, max_pages=5, previous=previous)
    assert f"{F}/t/1001.json" in fetch.calls


@pytest.mark.parametrize("url,expected", [
    (GH, "https://raw.githubusercontent.com/alice/blueprints/main/automation/motion.yaml"),
    ("https://raw.githubusercontent.com/x/y/main/a.yaml",
     "https://raw.githubusercontent.com/x/y/main/a.yaml"),
])
def test_github_raw_url(url, expected):
    assert bi.github_raw_url(url) == expected


def test_rejects_non_blueprint():
    with pytest.raises(ValueError):
        bi.describe_blueprint("automation:\n  - alias: x\n")
    with pytest.raises(ValueError):
        bi.describe_blueprint("blueprint:\n  name: x\n  domain: lights\n")



def test_gist_is_fetched_as_plain_text_without_api():
    fetch = FakeFetch({
        "https://gist.githubusercontent.com/kim/abc123/raw": SCRIPT_YAML,
    })
    assert bi.fetch_blueprint_yaml("https://gist.github.com/kim/abc123", fetch) == SCRIPT_YAML
    assert not any("api.github.com" in u for u in fetch.calls)


def test_gist_without_user_in_url():
    fetch = FakeFetch({"https://gist.github.com/abc123/raw": SCRIPT_YAML})
    assert bi.fetch_blueprint_yaml("https://gist.github.com/abc123", fetch) == SCRIPT_YAML


def test_gist_with_several_files_falls_back_to_api():
    fetch = FakeFetch({
        "https://gist.githubusercontent.com/kim/abc123/raw": "# README\nBara text",
        "https://api.github.com/gists/abc123": json.dumps({"files": {
            "README.md": {"filename": "README.md", "content": "text"},
            "bp.yaml": {"filename": "bp.yaml", "content": SCRIPT_YAML}}}),
    })
    assert bi.fetch_blueprint_yaml("https://gist.github.com/kim/abc123", fetch) == SCRIPT_YAML


@pytest.mark.parametrize("dirty,clean", [
    ("[YOUR_RAW_URL_HERE](https://gist.githubusercontent.com/a/b/raw/c/x.yaml)",
     "https://gist.githubusercontent.com/a/b/raw/c/x.yaml"),
    ("https://gist.githubusercontent.com/a/b/raw/c/x.yamlhttps://gist.githubusercontent.com/a/b/raw/c/x.yaml",
     "https://gist.githubusercontent.com/a/b/raw/c/x.yaml"),
    ("  https://github.com/a/b/blob/main/x.yaml ", "https://github.com/a/b/blob/main/x.yaml"),
    ("https://gist.github.com/a/f6e5)", "https://gist.github.com/a/f6e5"),
    ("https://gist.githubusercontent.com/a/b/raw/c/Key Fob (4 Buttons)",
     "https://gist.githubusercontent.com/a/b/raw/c/Key Fob (4 Buttons)"),
])
def test_clean_url(dirty, clean):
    assert bi.clean_url(dirty) == clean
