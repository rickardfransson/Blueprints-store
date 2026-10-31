"""Konstanter för Blueprint Store."""

from datetime import timedelta

DOMAIN = "blueprint_store"

CONF_INDEX_URL = "index_url"
DEFAULT_INDEX_URL = "https://rickardfransson.github.io/Blueprints-store/index.json"

SUPPORTED_SCHEMA_VERSION = 1
UPDATE_INTERVAL = timedelta(hours=6)

PANEL_URL_PATH = "blueprint-store"
PANEL_COMPONENT = "blueprint-store-panel"
PANEL_STATIC_URL = "/blueprint_store_static"
PANEL_TITLE = "Blueprint Store"
PANEL_ICON = "mdi:store-outline"

STORAGE_KEY = f"{DOMAIN}.installed"
STORAGE_VERSION = 1

BLUEPRINT_DOMAINS = ("automation", "script", "template")
