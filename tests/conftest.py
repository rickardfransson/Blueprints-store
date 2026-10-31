"""Gemensamma testfixturer. Körs mot en riktig Home Assistant via
pytest-homeassistant-custom-component."""

from unittest.mock import patch

import pytest

from homeassistant.core import HomeAssistant
from homeassistant.setup import async_setup_component

pytest_plugins = "pytest_homeassistant_custom_component"

MOTION_URL = "https://github.com/alice/blueprints/blob/main/automation/motion.yaml"
MOTION_RAW = "https://raw.githubusercontent.com/alice/blueprints/main/automation/motion.yaml"
MOTION_YAML = """blueprint:
  name: Motion light
  description: Tänd vid rörelse
  domain: automation
  input:
    motion:
      name: Rörelsesensor
      selector:
        entity:
          domain: binary_sensor
    light:
      name: Lampa
      selector:
        target:
          entity:
            domain: light
triggers:
  - trigger: state
    entity_id: !input motion
    to: "on"
actions:
  - action: light.turn_on
    target: !input light
"""


def make_index(sha: str = "a" * 64) -> dict:
    return {
        "schema_version": 1,
        "generated_at": "2026-10-31T07:00:00+00:00",
        "stats": {},
        "errors": [],
        "blueprints": [
            {
                "id": "abc123",
                "source_url": MOTION_URL,
                "source_type": "github",
                "name": "Motion light",
                "description": "Tänd vid rörelse",
                "domain": "automation",
                "author": None,
                "min_ha_version": None,
                "inputs": [],
                "requires_integrations": [],
                "requires_domains": ["binary_sensor", "light"],
                "sha256": sha,
                "topic": {"id": 1, "url": "https://community.home-assistant.io/t/x/1",
                          "title": "Motion light", "tags": [], "likes": 3, "views": 10,
                          "created_at": None, "bumped_at": "2026-10-01", "poster": "alice"},
            }
        ],
    }


@pytest.fixture(autouse=True)
def auto_enable_custom_integrations(enable_custom_integrations):
    yield


@pytest.fixture
async def base_components(hass: HomeAssistant):
    """Sätt upp det integrationen behöver. Sidomenyn (frontend) ersätts med
    attrapper, eftersom själva webbgränssnittet inte finns i testmiljön."""
    hass.config.components.add("frontend")
    hass.config.components.add("panel_custom")
    assert await async_setup_component(hass, "http", {})
    assert await async_setup_component(hass, "websocket_api", {})
    assert await async_setup_component(hass, "automation", {})
    with (
        patch("custom_components.blueprint_store.async_register_frontend") as reg,
        patch("custom_components.blueprint_store.async_unregister_frontend") as unreg,
    ):
        yield reg, unreg
