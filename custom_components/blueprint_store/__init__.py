"""Blueprint Store: sök, bläddra och installera Home Assistant-blueprints."""

from __future__ import annotations

import json
from pathlib import Path

from homeassistant.components import panel_custom
from homeassistant.components.frontend import async_remove_panel
from homeassistant.components.http import StaticPathConfig
from homeassistant.config_entries import ConfigEntry
from homeassistant.const import Platform
from homeassistant.core import HomeAssistant

from . import websocket
from .const import (
    DOMAIN,
    PANEL_COMPONENT,
    PANEL_ICON,
    PANEL_STATIC_URL,
    PANEL_TITLE,
    PANEL_URL_PATH,
)
from .store import BlueprintStore

PLATFORMS = [Platform.UPDATE]
_FRONTEND_DIR = Path(__file__).parent / "frontend"
_WS_FLAG = f"{DOMAIN}_ws_registered"
_STATIC_FLAG = f"{DOMAIN}_static_registered"


async def async_setup_entry(hass: HomeAssistant, entry: ConfigEntry) -> bool:
    store = BlueprintStore(hass, entry)
    await store.async_load()
    await store.coordinator.async_config_entry_first_refresh()
    hass.data[DOMAIN] = store

    # Websocket-kommandon kan bara registreras en gång per körning av Home
    # Assistant, så de överlever omladdning av integrationen.
    if not hass.data.get(_WS_FLAG):
        websocket.async_register(hass)
        hass.data[_WS_FLAG] = True

    await async_register_frontend(hass)
    await hass.config_entries.async_forward_entry_setups(entry, PLATFORMS)
    entry.async_on_unload(entry.add_update_listener(_async_reload))
    return True


async def async_unload_entry(hass: HomeAssistant, entry: ConfigEntry) -> bool:
    ok = await hass.config_entries.async_unload_platforms(entry, PLATFORMS)
    if ok:
        async_unregister_frontend(hass)
        hass.data.pop(DOMAIN, None)
    return ok


async def async_register_frontend(hass: HomeAssistant) -> None:
    """Lägg till butikssidan i sidomenyn."""
    if not hass.data.get(_STATIC_FLAG):
        await hass.http.async_register_static_paths(
            [StaticPathConfig(PANEL_STATIC_URL, str(_FRONTEND_DIR), False)]
        )
        hass.data[_STATIC_FLAG] = True

    version = await hass.async_add_executor_job(_integration_version)
    await panel_custom.async_register_panel(
        hass,
        frontend_url_path=PANEL_URL_PATH,
        webcomponent_name=PANEL_COMPONENT,
        sidebar_title=PANEL_TITLE,
        sidebar_icon=PANEL_ICON,
        module_url=f"{PANEL_STATIC_URL}/blueprint-store-panel.js?v={version}",
        require_admin=True,
        config={},
    )


def async_unregister_frontend(hass: HomeAssistant) -> None:
    async_remove_panel(hass, PANEL_URL_PATH)


async def _async_reload(hass: HomeAssistant, entry: ConfigEntry) -> None:
    await hass.config_entries.async_reload(entry.entry_id)


def _integration_version() -> str:
    manifest = json.loads((Path(__file__).parent / "manifest.json").read_text("utf-8"))
    return manifest.get("version", "0")
