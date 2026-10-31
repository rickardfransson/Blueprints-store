"""Websocket-kommandon som butikssidan anropar."""

from __future__ import annotations

from typing import Any

import voluptuous as vol

from homeassistant.components import websocket_api
from homeassistant.core import HomeAssistant, callback

from .const import DOMAIN
from .store import BlueprintStore, StoreError


def _store(hass: HomeAssistant) -> BlueprintStore | None:
    return hass.data.get(DOMAIN)


@callback
def async_register(hass: HomeAssistant) -> None:
    for handler in (ws_list, ws_preview, ws_install, ws_refresh):
        websocket_api.async_register_command(hass, handler)


@websocket_api.websocket_command({vol.Required("type"): f"{DOMAIN}/list"})
@websocket_api.async_response
async def ws_list(hass: HomeAssistant, connection: websocket_api.ActiveConnection, msg: dict) -> None:
    store = _store(hass)
    if store is None:
        connection.send_error(msg["id"], "not_loaded", "Blueprint Store är inte igång")
        return
    installed = await store.async_installed()
    index = store.index
    items: list[dict[str, Any]] = []
    for bp in index["blueprints"]:
        url = bp["source_url"]
        inst = installed.get(url)
        items.append({
            **bp,
            "installed": inst is not None,
            "installed_path": f"{inst.domain}/{inst.path}" if inst else None,
            "tracked": url in store.tracked,
            "update_available": inst is not None and store.update_available(url),
        })
    connection.send_result(msg["id"], {
        "generated_at": index.get("generated_at"),
        "index_url": store.coordinator.url,
        "last_update_success": store.coordinator.last_update_success,
        "blueprints": items,
    })


@websocket_api.websocket_command(
    {vol.Required("type"): f"{DOMAIN}/preview", vol.Required("source_url"): str}
)
@websocket_api.require_admin
@websocket_api.async_response
async def ws_preview(hass: HomeAssistant, connection: websocket_api.ActiveConnection, msg: dict) -> None:
    store = _store(hass)
    if store is None:
        connection.send_error(msg["id"], "not_loaded", "Blueprint Store är inte igång")
        return
    try:
        connection.send_result(msg["id"], await store.async_preview(msg["source_url"]))
    except StoreError as err:
        connection.send_error(msg["id"], "preview_failed", str(err))


@websocket_api.websocket_command(
    {
        vol.Required("type"): f"{DOMAIN}/install",
        vol.Required("source_url"): str,
        vol.Optional("overwrite", default=False): bool,
    }
)
@websocket_api.require_admin
@websocket_api.async_response
async def ws_install(hass: HomeAssistant, connection: websocket_api.ActiveConnection, msg: dict) -> None:
    store = _store(hass)
    if store is None:
        connection.send_error(msg["id"], "not_loaded", "Blueprint Store är inte igång")
        return
    try:
        result = await store.async_install(msg["source_url"], overwrite=msg["overwrite"])
    except StoreError as err:
        connection.send_error(msg["id"], "install_failed", str(err))
        return
    connection.send_result(msg["id"], result)


@websocket_api.websocket_command({vol.Required("type"): f"{DOMAIN}/refresh"})
@websocket_api.require_admin
@websocket_api.async_response
async def ws_refresh(hass: HomeAssistant, connection: websocket_api.ActiveConnection, msg: dict) -> None:
    store = _store(hass)
    if store is None:
        connection.send_error(msg["id"], "not_loaded", "Blueprint Store är inte igång")
        return
    await store.coordinator.async_refresh()
    connection.send_result(msg["id"], {"ok": store.coordinator.last_update_success})
