<img src="custom_components/blueprint_store/brand/icon.png" alt="" width="96" align="right">

# Blueprint Store for Home Assistant

[![Open your Home Assistant instance and open this repository inside HACS.](https://my.home-assistant.io/badges/hacs_repository.svg)](https://my.home-assistant.io/redirect/hacs_repository/?owner=rickardfransson&repository=Blueprints-store&category=integration)

Browse, search and install blueprints from the Home Assistant community without leaving Home Assistant.

Thousands of blueprints are shared on the [Blueprints Exchange](https://community.home-assistant.io/c/blueprints-exchange/53) forum, but finding the right one means digging through forum threads. Blueprint Store adds a page to your sidebar where you can search all of them, see which ones work with your setup, and install one with a single click.

## Features

- **Search the whole Blueprints Exchange** by name, description, tag, author or integration (try `motion light` or `zha`).
- **See only what fits your system.** Blueprints that need a newer version of Home Assistant, or an integration you don't have, are hidden by default.
- **Read the code before you install.** Every blueprint can be previewed, and the forum thread is one click away.
- **Get notified about updates.** When the author changes a blueprint you installed through the store, it shows up under **Settings → Updates**, next to your other updates.
- **Nothing happens on its own.** Blueprints are only installed or updated when you click the button.
- **English and Swedish.** The store page follows the language set in your Home Assistant profile. Other languages fall back to English. Translations are welcome: copy the `en` block at the top of `frontend/blueprint-store-panel.js` and send a pull request.

## Installation

You need [HACS](https://hacs.xyz) and Home Assistant 2025.1 or newer.

1. Click the **Open in HACS** button above, or add the repository manually:
   in HACS, open the ⋮ menu → **Custom repositories**, paste `https://github.com/rickardfransson/Blueprints-store`, choose **Integration** and click **Add**.
2. Find **Blueprint Store** in HACS and click **Download**.
3. Restart Home Assistant.
4. Go to **Settings → Devices & services → Add integration** and pick **Blueprint Store**.

[![Open your Home Assistant instance and start setting up Blueprint Store.](https://my.home-assistant.io/badges/config_flow_start.svg)](https://my.home-assistant.io/redirect/config_flow_start/?domain=blueprint_store)

**Blueprint Store** now appears in the sidebar. The page is only visible to administrators.

## Using it

1. Open **Blueprint Store** from the sidebar.
2. Search or filter by type (automation, script or template). Sort by most popular, recently updated or name.
3. Click a blueprint to see its description, its requirements and the settings you'll be asked for.
4. Click **Show code** if you want to read it, then **Install**.
5. Go to **Settings → Automations & scenes → Blueprints** and create an automation from it, as you would with any other blueprint.

Installing a blueprint does not change anything in your home. It only becomes active once you create an automation or script from it.

### Updates

When a blueprint you installed through the store changes, an update entity appears under **Settings → Updates**. You can install it there or from the store page.

Updating a blueprint reloads every automation that uses it. If the author made bigger changes, such as adding a required setting, you may need to open those automations and adjust them. Check the forum thread before updating anything important.

Blueprints you installed some other way are shown as installed, but you won't get update notices for them until you reinstall them through the store.

## Is it safe?

- Blueprints are written by the community. A blueprint can control your devices, so read the code before using one for locks, alarms or heating.
- The store only installs blueprints that are listed in its catalog, and it uses Home Assistant's own import function to do it (the same one behind the **Import blueprint** button).
- Text from the forum is always displayed as plain text, never run as code.
- The integration doesn't install any extra Python packages and doesn't touch your existing automations.
- It sends nothing about your system anywhere. It only downloads the catalog and the blueprints you choose to install.

Taking a backup before trying any new integration is always a good idea.

## How it works

A script runs every night on GitHub. It reads the Blueprints Exchange, finds each thread's **Import blueprint** link, downloads the blueprint and records its name, description, requirements and a fingerprint of its contents. The result is published as a single file:

https://rickardfransson.github.io/Blueprints-store/index.json

The integration downloads this file every six hours. That way the forum gets one visitor a night instead of one from every Home Assistant install.

Threads without an import link, and blueprints that fail to load, are left out of the catalog.

## Settings

Under **Settings → Devices & services → Blueprint Store → Configure** you can point the integration to a different catalog, for example if you run your own copy of the indexer.

## Removing it

Delete the integration under **Settings → Devices & services**, then remove it in HACS. Blueprints you already installed stay where they are and keep working.

## Troubleshooting

**The store is empty or shows an error.** The catalog couldn't be downloaded. Check that Home Assistant has internet access, then click the refresh button at the top of the store page.

**I can't find a blueprint I know exists.** Untick **Only show what fits my system**. If it's still missing, the forum thread may not have an import link, or the blueprint couldn't be read. Please [open an issue](https://github.com/rickardfransson/Blueprints-store/issues) with a link to the thread.

**Something else is wrong.** [Open an issue](https://github.com/rickardfransson/Blueprints-store/issues) and include your Home Assistant version and any errors from **Settings → System → Logs**.

## Development

```bash
# The indexer (no network needed)
pip install -r indexer/requirements.txt pytest
cd indexer && python -m pytest -q test_build_index.py

# The integration, tested against a real Home Assistant
pip install pytest-homeassistant-custom-component
python -m pytest -v tests
```

GitHub Actions runs both test suites on every change, along with Home Assistant's `hassfest` and the HACS validation.

## License

MIT. See [LICENSE](LICENSE).

This is a community project and is not affiliated with Home Assistant or Nabu Casa. The blueprints in the catalog belong to their authors.
