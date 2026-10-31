"""Kärnan: hämtar katalogen, håller koll på vad som är installerat och installerar.

Installationen går genom Home Assistants egen blueprint-import
(samma kod som knappen "Importera blueprint" använder), så GitHub-, gist-
och forumlänkar hanteras exakt som i kärnan.
"""

from __future__ import annotations

from collections.abc import Callable
from dataclasses import dataclass
import logging
from pathlib import Path
from typing import Any

from homeassistant.components.blueprint import importer, models
from homeassistant.components.blueprint.const import BLUEPRINT_FOLDER
from homeassistant.components.blueprint.errors import FileAlreadyExists
from homeassistant.config_entries import ConfigEntry
from homeassistant.core import HomeAssistant, callback
from homeassistant.exceptions import HomeAssistantError
from homeassistant.helpers.aiohttp_client import async_get_clientsession
from homeassistant.helpers.storage import Store
from homeassistant.helpers.update_coordinator import DataUpdateCoordinator, UpdateFailed
from homeassistant.util import dt as dt_util, yaml as yaml_util

from .const import (
    BLUEPRINT_DOMAINS,
    CONF_INDEX_URL,
    DEFAULT_INDEX_URL,
    DOMAIN,
    STORAGE_KEY,
    STORAGE_VERSION,
    SUPPORTED_SCHEMA_VERSION,
    UPDATE_INTERVAL,
)

_LOGGER = logging.getLogger(__name__)


class StoreError(HomeAssistantError):
    """Fel som visas för användaren i butikssidan."""


class IndexCoordinator(DataUpdateCoordinator[dict[str, Any]]):
    """Hämtar index.json med jämna mellanrum."""

    def __init__(self, hass: HomeAssistant, entry: ConfigEntry) -> None:
        super().__init__(
            hass, _LOGGER, name=DOMAIN, update_interval=UPDATE_INTERVAL, config_entry=entry
        )
        self.url: str = entry.options.get(
            CONF_INDEX_URL, entry.data.get(CONF_INDEX_URL, DEFAULT_INDEX_URL)
        )

    async def _async_update_data(self) -> dict[str, Any]:
        session = async_get_clientsession(self.hass)
        try:
            async with session.get(self.url, timeout=30) as resp:
                resp.raise_for_status()
                data = await resp.json(content_type=None)
        except Exception as err:  # noqa: BLE001
            raise UpdateFailed(f"Kunde inte hämta katalogen från {self.url}: {err}") from err

        if not isinstance(data, dict) or not isinstance(data.get("blueprints"), list):
            raise UpdateFailed("Katalogen har fel format")
        if data.get("schema_version") != SUPPORTED_SCHEMA_VERSION:
            raise UpdateFailed(
                f"Katalogversion {data.get('schema_version')} stöds inte, uppdatera integrationen"
            )
        data["by_url"] = {bp["source_url"]: bp for bp in data["blueprints"] if bp.get("source_url")}
        return data


@dataclass
class Installed:
    """En blueprint som finns på disk."""

    domain: str
    path: str  # relativt blueprints/<domain>/
    source_url: str | None


def _scan_blueprint_folder(root: Path) -> list[Installed]:
    """Läs alla blueprints på disk och plocka ut deras source_url (körs i executor)."""
    found: list[Installed] = []
    for domain in BLUEPRINT_DOMAINS:
        base = root / domain
        if not base.is_dir():
            continue
        for file in base.rglob("*.yaml"):
            try:
                data = yaml_util.parse_yaml(file.read_text(encoding="utf-8"))
                meta = data.get("blueprint", {}) if isinstance(data, dict) else {}
                src = meta.get("source_url") if isinstance(meta, dict) else None
            except Exception:  # noqa: BLE001 - trasiga filer hoppas över
                continue
            found.append(Installed(domain, file.relative_to(base).as_posix(), src))
    return found


class BlueprintStore:
    """Allt integrationen vet, samlat på ett ställe."""

    def __init__(self, hass: HomeAssistant, entry: ConfigEntry) -> None:
        self.hass = hass
        self.coordinator = IndexCoordinator(hass, entry)
        # source_url -> {"sha256", "domain", "path", "installed_at"}
        # = blueprints som installerats via butiken (behövs för uppdateringar).
        self.tracked: dict[str, dict[str, Any]] = {}
        self._storage: Store[dict[str, Any]] = Store(hass, STORAGE_VERSION, STORAGE_KEY)
        self._on_tracked_change: list[Callable[[], None]] = []

    async def async_load(self) -> None:
        stored = await self._storage.async_load() or {}
        self.tracked = stored.get("tracked", {})

    @callback
    def async_listen_tracked(self, cb: Callable[[], None]) -> Callable[[], None]:
        self._on_tracked_change.append(cb)
        return lambda: self._on_tracked_change.remove(cb)

    # ------------------------------------------------------------------ katalog

    @property
    def index(self) -> dict[str, Any]:
        return self.coordinator.data or {"blueprints": [], "by_url": {}}

    def entry_for(self, source_url: str) -> dict[str, Any]:
        bp = self.index["by_url"].get(source_url)
        if bp is None:
            raise StoreError("Blueprinten finns inte i katalogen")
        return bp

    def update_available(self, source_url: str) -> bool:
        rec = self.tracked.get(source_url)
        bp = self.index["by_url"].get(source_url)
        return bool(rec and bp and rec.get("sha256") and rec["sha256"] != bp.get("sha256"))

    async def async_installed(self) -> dict[str, Installed]:
        root = Path(self.hass.config.path(BLUEPRINT_FOLDER))
        items = await self.hass.async_add_executor_job(_scan_blueprint_folder, root)
        return {i.source_url: i for i in items if i.source_url}

    # ------------------------------------------------------------ installation

    async def async_preview(self, source_url: str) -> dict[str, Any]:
        """Hämta blueprinten så att användaren kan läsa YAML:en innan installation."""
        self.entry_for(source_url)
        imported = await self._fetch(source_url)
        return {
            "yaml": imported.raw_data,
            "suggested_filename": imported.suggested_filename,
            "domain": imported.blueprint.domain,
        }

    async def async_install(self, source_url: str, overwrite: bool = False) -> dict[str, Any]:
        bp_entry = self.entry_for(source_url)
        imported = await self._fetch(source_url)
        blueprint = imported.blueprint
        blueprint.update_metadata(source_url=source_url)
        domain = blueprint.domain
        filename = imported.suggested_filename
        if not filename.endswith(".yaml"):
            filename = f"{filename}.yaml"

        installed = await self.async_installed()
        if (existing := installed.get(source_url)) is not None:
            filename, overwrite = existing.path, True  # uppdatera på samma ställe

        await self._save(domain, filename, blueprint, overwrite)

        self.tracked[source_url] = {
            "sha256": bp_entry.get("sha256"),
            "domain": domain,
            "path": filename,
            "installed_at": dt_util.utcnow().isoformat(),
        }
        await self._storage.async_save({"tracked": self.tracked})
        for cb in list(self._on_tracked_change):
            cb()
        return {"domain": domain, "path": filename}

    async def _fetch(self, source_url: str) -> importer.ImportedBlueprint:
        try:
            return await importer.fetch_blueprint_from_url(self.hass, source_url)
        except HomeAssistantError as err:
            raise StoreError(f"Kunde inte hämta blueprinten: {err}") from err
        except Exception as err:  # noqa: BLE001
            raise StoreError(f"Blueprinten gick inte att läsa: {err}") from err

    async def _save(
        self, domain: str, filename: str, blueprint: models.Blueprint, overwrite: bool
    ) -> None:
        """Spara via kärnans egen blueprint-hantering, med reservväg för äldre versioner."""
        domain_blueprints = self.hass.data.get("blueprint", {})
        core = domain_blueprints.get(domain) if isinstance(domain_blueprints, dict) else None
        if core is not None and hasattr(core, "async_add_blueprint"):
            try:
                await core.async_add_blueprint(blueprint, filename, allow_override=overwrite)
                return
            except FileAlreadyExists as err:
                raise StoreError("Det finns redan en blueprint med det filnamnet") from err
            except TypeError:
                _LOGGER.debug("Äldre Home Assistant, använder reservväg för att spara")

        target = Path(self.hass.config.path(BLUEPRINT_FOLDER, domain, filename))

        def _write() -> None:
            if target.exists() and not overwrite:
                raise StoreError("Det finns redan en blueprint med det filnamnet")
            target.parent.mkdir(parents=True, exist_ok=True)
            target.write_text(blueprint.yaml(), encoding="utf-8")

        await self.hass.async_add_executor_job(_write)
        if self.hass.services.has_service(domain, "reload"):
            await self.hass.services.async_call(domain, "reload", blocking=True)
