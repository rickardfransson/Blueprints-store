"""Tester för Blueprint Store mot en riktig Home Assistant."""

from pathlib import Path
from unittest.mock import patch


from pytest_homeassistant_custom_component.common import MockConfigEntry

from homeassistant import config_entries
from homeassistant.config_entries import ConfigEntryState
from homeassistant.core import HomeAssistant
from homeassistant.data_entry_flow import FlowResultType

from custom_components.blueprint_store.const import DEFAULT_INDEX_URL, DOMAIN

from .conftest import MOTION_RAW, MOTION_URL, MOTION_YAML, make_index


async def _setup(hass: HomeAssistant, aioclient_mock, index=None) -> MockConfigEntry:
    aioclient_mock.get(DEFAULT_INDEX_URL, json=index or make_index())
    entry = MockConfigEntry(domain=DOMAIN, data={})
    entry.add_to_hass(hass)
    assert await hass.config_entries.async_setup(entry.entry_id)
    await hass.async_block_till_done()
    return entry


async def test_config_flow_creates_single_entry(hass: HomeAssistant, base_components) -> None:
    result = await hass.config_entries.flow.async_init(
        DOMAIN, context={"source": config_entries.SOURCE_USER}
    )
    assert result["type"] is FlowResultType.FORM
    with patch(
        "custom_components.blueprint_store.async_setup_entry", return_value=True
    ):
        result = await hass.config_entries.flow.async_configure(result["flow_id"], {})
    assert result["type"] is FlowResultType.CREATE_ENTRY

    again = await hass.config_entries.flow.async_init(
        DOMAIN, context={"source": config_entries.SOURCE_USER}
    )
    assert again["type"] is FlowResultType.ABORT


async def test_setup_registers_panel_and_unloads(hass, aioclient_mock, base_components) -> None:
    reg, unreg = base_components
    entry = await _setup(hass, aioclient_mock)
    assert entry.state is ConfigEntryState.LOADED
    reg.assert_called_once()
    assert await hass.config_entries.async_unload(entry.entry_id)
    unreg.assert_called_once()


async def test_setup_retries_when_index_unreachable(hass, aioclient_mock, base_components) -> None:
    aioclient_mock.get(DEFAULT_INDEX_URL, status=500)
    entry = MockConfigEntry(domain=DOMAIN, data={})
    entry.add_to_hass(hass)
    await hass.config_entries.async_setup(entry.entry_id)
    assert entry.state is ConfigEntryState.SETUP_RETRY


async def test_list_install_and_update(hass, aioclient_mock, hass_ws_client, base_components) -> None:
    entry = await _setup(hass, aioclient_mock)
    aioclient_mock.get(MOTION_RAW, text=MOTION_YAML)
    ws = await hass_ws_client(hass)

    # Listan: inget installerat ännu
    await ws.send_json({"id": 1, "type": f"{DOMAIN}/list"})
    res = await ws.receive_json()
    assert res["success"], res
    [bp] = res["result"]["blueprints"]
    assert bp["name"] == "Motion light" and bp["installed"] is False

    # Förhandsvisning ger YAML:en
    await ws.send_json({"id": 2, "type": f"{DOMAIN}/preview", "source_url": MOTION_URL})
    res = await ws.receive_json()
    assert res["success"], res
    assert "Motion light" in res["result"]["yaml"]

    # Installation skriver filen med source_url
    await ws.send_json({"id": 3, "type": f"{DOMAIN}/install", "source_url": MOTION_URL})
    res = await ws.receive_json()
    assert res["success"], res
    assert res["result"]["domain"] == "automation"
    path = Path(hass.config.path("blueprints", "automation", res["result"]["path"]))
    content = await hass.async_add_executor_job(path.read_text)
    assert MOTION_URL in content

    # Nu syns den som installerad, utan uppdatering
    await ws.send_json({"id": 4, "type": f"{DOMAIN}/list"})
    [bp] = (await ws.receive_json())["result"]["blueprints"]
    assert bp["installed"] is True and bp["update_available"] is False
    await hass.async_block_till_done()
    states = [s for s in hass.states.async_all("update") if "motion_light" in s.entity_id]
    assert len(states) == 1 and states[0].state == "off"

    # Katalogen får ny version -> uppdatering finns
    aioclient_mock.clear_requests()
    aioclient_mock.get(DEFAULT_INDEX_URL, json=make_index(sha="b" * 64))
    aioclient_mock.get(MOTION_RAW, text=MOTION_YAML)
    await ws.send_json({"id": 5, "type": f"{DOMAIN}/refresh"})
    assert (await ws.receive_json())["success"]
    await hass.async_block_till_done()
    assert hass.states.get(states[0].entity_id).state == "on"

    # Installera uppdateringen via Home Assistants vanliga uppdateringstjänst
    await hass.services.async_call(
        "update", "install", {"entity_id": states[0].entity_id}, blocking=True
    )
    await hass.async_block_till_done()
    assert hass.states.get(states[0].entity_id).state == "off"


async def test_install_rejects_urls_outside_catalog(hass, aioclient_mock, hass_ws_client, base_components) -> None:
    await _setup(hass, aioclient_mock)
    ws = await hass_ws_client(hass)
    await ws.send_json({"id": 1, "type": f"{DOMAIN}/install",
                        "source_url": "https://evil.example/bp.yaml"})
    res = await ws.receive_json()
    assert not res["success"] and res["error"]["code"] == "not_in_catalog"


async def _install(ws, msg_id: int) -> dict:
    await ws.send_json({"id": msg_id, "type": f"{DOMAIN}/install", "source_url": MOTION_URL})
    res = await ws.receive_json()
    assert res["success"], res
    return res["result"]


NEW_MOTION_YAML = MOTION_YAML.replace(
    "triggers:",
    """    delay:
      name: Fördröjning
      selector:
        number: {min: 0, max: 600}
    brightness:
      name: Ljusstyrka
      default: 100
      selector:
        number: {min: 0, max: 100}
triggers:""",
)


async def test_diff_shows_new_required_settings(hass, aioclient_mock, hass_ws_client, base_components) -> None:
    await _setup(hass, aioclient_mock)
    aioclient_mock.get(MOTION_RAW, text=MOTION_YAML)
    ws = await hass_ws_client(hass)
    await _install(ws, 1)

    # Samma version: inga skillnader
    await ws.send_json({"id": 2, "type": f"{DOMAIN}/diff", "source_url": MOTION_URL})
    res = await ws.receive_json()
    assert res["success"], res
    assert res["result"]["identical"] is True

    aioclient_mock.clear_requests()
    aioclient_mock.get(DEFAULT_INDEX_URL, json=make_index(sha="b" * 64))
    aioclient_mock.get(MOTION_RAW, text=NEW_MOTION_YAML)
    await ws.send_json({"id": 3, "type": f"{DOMAIN}/diff", "source_url": MOTION_URL})
    res = await ws.receive_json()
    assert res["success"], res
    diff = res["result"]
    assert [i["key"] for i in diff["added_required"]] == ["delay"]
    assert [i["key"] for i in diff["added_optional"]] == ["brightness"]
    assert diff["removed"] == [] and diff["identical"] is False
    assert "+    delay:" in diff["diff"]
    assert diff["used_by"] == []


async def test_diff_needs_installed_blueprint(hass, aioclient_mock, hass_ws_client, base_components) -> None:
    await _setup(hass, aioclient_mock)
    ws = await hass_ws_client(hass)
    await ws.send_json({"id": 1, "type": f"{DOMAIN}/diff", "source_url": MOTION_URL})
    res = await ws.receive_json()
    assert not res["success"] and res["error"]["code"] == "not_installed"


async def test_remove_blueprint_and_its_update_entity(hass, aioclient_mock, hass_ws_client, base_components) -> None:
    await _setup(hass, aioclient_mock)
    aioclient_mock.get(MOTION_RAW, text=MOTION_YAML)
    ws = await hass_ws_client(hass)
    installed = await _install(ws, 1)
    await hass.async_block_till_done()
    path = Path(hass.config.path("blueprints", "automation", installed["path"]))
    assert len(hass.states.async_all("update")) == 1

    await ws.send_json({"id": 2, "type": f"{DOMAIN}/remove", "source_url": MOTION_URL})
    res = await ws.receive_json()
    assert res["success"], res
    await hass.async_block_till_done()
    assert not await hass.async_add_executor_job(path.exists)
    assert hass.states.async_all("update") == []

    await ws.send_json({"id": 3, "type": f"{DOMAIN}/list"})
    [bp] = (await ws.receive_json())["result"]["blueprints"]
    assert bp["installed"] is False and bp["tracked"] is False

    # Går att installera igen, och då kommer uppdateringsentiteten tillbaka
    await _install(ws, 4)
    await hass.async_block_till_done()
    assert len(hass.states.async_all("update")) == 1


async def test_blueprint_in_use_is_listed_and_cannot_be_removed(
    hass, aioclient_mock, hass_ws_client, base_components, request
) -> None:
    await _setup(hass, aioclient_mock)
    aioclient_mock.get(MOTION_RAW, text=MOTION_YAML)
    ws = await hass_ws_client(hass)
    installed = await _install(ws, 1)

    def fake_usage(hass, path):
        return ["automation.kitchen_motion"] if path == installed["path"] else []

    # Home Assistant räknar ut användningen. Här låtsas vi att en automation
    # i köket använder blueprinten.
    patcher = patch(
        "homeassistant.components.automation.automations_with_blueprint", side_effect=fake_usage
    )
    patcher.start()
    request.addfinalizer(patcher.stop)

    await ws.send_json({"id": 2, "type": f"{DOMAIN}/list"})
    [bp] = (await ws.receive_json())["result"]["blueprints"]
    assert bp["used_by"] == ["automation.kitchen_motion"]

    await ws.send_json({"id": 3, "type": f"{DOMAIN}/remove", "source_url": MOTION_URL})
    res = await ws.receive_json()
    assert not res["success"] and res["error"]["code"] == "in_use"
    path = Path(hass.config.path("blueprints", "automation", installed["path"]))
    assert await hass.async_add_executor_job(path.exists)


async def test_all_commands_require_admin(
    hass, aioclient_mock, hass_ws_client, hass_read_only_access_token, base_components
) -> None:
    """En användare som inte är admin får inte anropa något av kommandona."""
    await _setup(hass, aioclient_mock)
    ws = await hass_ws_client(hass, hass_read_only_access_token)
    commands = [
        {"type": f"{DOMAIN}/list"},
        {"type": f"{DOMAIN}/preview", "source_url": MOTION_URL},
        {"type": f"{DOMAIN}/diff", "source_url": MOTION_URL},
        {"type": f"{DOMAIN}/install", "source_url": MOTION_URL},
        {"type": f"{DOMAIN}/remove", "source_url": MOTION_URL},
        {"type": f"{DOMAIN}/refresh"},
    ]
    for msg_id, command in enumerate(commands, start=1):
        await ws.send_json({"id": msg_id, **command})
        res = await ws.receive_json()
        assert not res["success"], command
        assert res["error"]["code"] == "unauthorized", command
