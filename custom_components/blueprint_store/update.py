"""En uppdateringsentitet per blueprint som installerats via butiken.

De dyker upp under Inställningar → Uppdateringar när någon har ändrat en
blueprint i katalogen.
"""

from __future__ import annotations

from typing import Any

from homeassistant.components.update import UpdateEntity, UpdateEntityFeature
from homeassistant.config_entries import ConfigEntry
from homeassistant.core import HomeAssistant, callback
from homeassistant.exceptions import HomeAssistantError
from homeassistant.helpers.entity_platform import AddEntitiesCallback
from homeassistant.helpers.update_coordinator import CoordinatorEntity

from .const import DOMAIN
from .store import BlueprintStore, IndexCoordinator, StoreError


async def async_setup_entry(
    hass: HomeAssistant, entry: ConfigEntry, async_add_entities: AddEntitiesCallback
) -> None:
    store: BlueprintStore = hass.data[DOMAIN]
    added: set[str] = set()

    @callback
    def _add_new() -> None:
        new = [
            BlueprintUpdate(store, url)
            for url in store.tracked
            if url not in added and url in store.index["by_url"]
        ]
        added.update(e.source_url for e in new)
        if new:
            async_add_entities(new)

    _add_new()
    entry.async_on_unload(store.async_listen_tracked(_add_new))
    entry.async_on_unload(store.coordinator.async_add_listener(_add_new))


class BlueprintUpdate(CoordinatorEntity[IndexCoordinator], UpdateEntity):
    _attr_has_entity_name = True
    _attr_supported_features = UpdateEntityFeature.INSTALL
    _attr_icon = "mdi:file-document-refresh-outline"

    def __init__(self, store: BlueprintStore, source_url: str) -> None:
        super().__init__(store.coordinator)
        self.store = store
        self.source_url = source_url
        bp = store.index["by_url"][source_url]
        self._attr_unique_id = f"{DOMAIN}_{bp['id']}"
        self._attr_name = f"Blueprint {bp['name']}"[:120]

    @property
    def _bp(self) -> dict[str, Any] | None:
        return self.store.index["by_url"].get(self.source_url)

    @property
    def available(self) -> bool:
        return super().available and self._bp is not None and self.source_url in self.store.tracked

    @property
    def title(self) -> str | None:
        return self._bp["name"] if self._bp else None

    @property
    def installed_version(self) -> str | None:
        sha = self.store.tracked.get(self.source_url, {}).get("sha256")
        return sha[:7] if sha else None

    @property
    def latest_version(self) -> str | None:
        sha = (self._bp or {}).get("sha256")
        return sha[:7] if sha else None

    @property
    def release_url(self) -> str | None:
        return (self._bp or {}).get("topic", {}).get("url")

    @property
    def release_summary(self) -> str | None:
        return "The blueprint has changed. Open the forum thread to see what is new."

    async def async_install(self, version: str | None, backup: bool, **kwargs: Any) -> None:
        try:
            await self.store.async_install(self.source_url, overwrite=True)
        except StoreError as err:
            raise HomeAssistantError(str(err)) from err
        self.async_write_ha_state()
