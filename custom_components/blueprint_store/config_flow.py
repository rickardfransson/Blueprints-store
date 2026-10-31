"""Inställningsguide: lägg till via Inställningar → Enheter och tjänster."""

from __future__ import annotations

from typing import Any

import voluptuous as vol

from homeassistant.config_entries import ConfigEntry, ConfigFlow, ConfigFlowResult, OptionsFlow
from homeassistant.core import callback

from .const import CONF_INDEX_URL, DEFAULT_INDEX_URL, DOMAIN


class BlueprintStoreConfigFlow(ConfigFlow, domain=DOMAIN):
    VERSION = 1

    async def async_step_user(self, user_input: dict[str, Any] | None = None) -> ConfigFlowResult:
        if self._async_current_entries():
            return self.async_abort(reason="single_instance_allowed")
        if user_input is not None:
            return self.async_create_entry(title="Blueprint Store", data={})
        return self.async_show_form(step_id="user")

    @staticmethod
    @callback
    def async_get_options_flow(config_entry: ConfigEntry) -> OptionsFlow:
        return BlueprintStoreOptionsFlow()


class BlueprintStoreOptionsFlow(OptionsFlow):
    async def async_step_init(self, user_input: dict[str, Any] | None = None) -> ConfigFlowResult:
        errors: dict[str, str] = {}
        if user_input is not None:
            url = user_input[CONF_INDEX_URL].strip()
            if not url.startswith("https://"):
                errors[CONF_INDEX_URL] = "invalid_url"
            else:
                return self.async_create_entry(data={CONF_INDEX_URL: url})
        current = self.config_entry.options.get(CONF_INDEX_URL, DEFAULT_INDEX_URL)
        return self.async_show_form(
            step_id="init",
            data_schema=vol.Schema({vol.Required(CONF_INDEX_URL, default=current): str}),
            errors=errors,
        )
