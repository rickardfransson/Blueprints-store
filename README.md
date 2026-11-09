<img src="custom_components/blueprint_store/brand/icon.png" alt="" width="96" align="right">

# Blueprint Store for Home Assistant

[![Open your Home Assistant instance and open this repository in the Marketplace.](https://my.home-assistant.io/badges/marketplace_repository.svg)](https://my.home-assistant.io/redirect/marketplace_repository/?owner=rickardfransson&repository=Blueprints-store&category=integration)

Browse, search and install blueprints from the Home Assistant community without leaving Home Assistant.

Thousands of blueprints are shared on the [Blueprints Exchange](https://community.home-assistant.io/c/blueprints-exchange/53) forum, but finding the right one means digging through forum threads. Blueprint Store adds a page to your sidebar where you can search all of them, see which ones work with your setup, and install one with a single click.

## Features

- **Search the whole Blueprints Exchange** by name, description, tag, author or integration (try `motion light` or `zha`).
- **Browse by category**, such as lighting, buttons and remotes, notifications, climate, energy, security or voice and AI. Each category shows how many blueprints it has, and a blueprint can belong to several.
- **See only what fits your system.** Blueprints that need a newer version of Home Assistant, or an integration you don't have, are hidden by default.
- **Read the code before you install.** Every blueprint can be previewed, and the forum thread is one click away.
- **See what a blueprint can control.** Blueprints that lock doors, arm the alarm, change the heating, open covers, run commands, restart Home Assistant, send web requests or can be started from a webhook get a warning badge, so you know before you install.
- **Get notified about updates.** When the author changes a blueprint you installed through the store, it shows up under **Settings → Updates**, next to your other updates.
- **Know what an update changes.** Before you update, the store shows which automations and scripts use the blueprint, which settings are new or removed, and every changed line. New required settings are highlighted, because they are what breaks existing automations.
- **Remove blueprints you no longer need.** A blueprint can be removed from the store page once nothing uses it.
- **Favorites and what's new.** Star the blueprints you want to try later, and see what has been added or changed since your last visit.
- **Nothing happens on its own.** Blueprints are only installed or updated when you click the button.
- **English and Swedish.** The store page follows the language set in your Home Assistant profile. Other languages fall back to English. Translations are welcome: copy the `en` block at the top of `frontend/blueprint-store-panel.js` and send a pull request.

## Installation

You need Home Assistant 2025.1 or newer.

**Home Assistant 2026.11 or newer (Marketplace)**

1. Click the button above, or add the repository yourself: go to **Settings → Marketplace**, select **Add from link** in the upper-right corner, enter `rickardfransson/Blueprints-store` and select **Add**. The Marketplace needs to be connected to GitHub before you can add a repository.
2. Open **Blueprint Store** in the Marketplace and select **Install**.
3. Restart Home Assistant.
4. Go to **Settings → Devices & services → Add integration** and pick **Blueprint Store**.

**Home Assistant 2026.10 or older ([HACS](https://hacs.xyz))**

[![Open your Home Assistant instance and open this repository in HACS.](https://my.home-assistant.io/badges/hacs_repository.svg)](https://my.home-assistant.io/redirect/hacs_repository/?owner=rickardfransson&repository=Blueprints-store&category=integration)

1. Click the button above, or in HACS open the ⋮ menu → **Custom repositories**, paste `https://github.com/rickardfransson/Blueprints-store`, choose **Integration** and click **Add**.
2. Find **Blueprint Store** in HACS and click **Download**.
3. Restart Home Assistant.
4. Go to **Settings → Devices & services → Add integration** and pick **Blueprint Store**.

If you installed Blueprint Store through HACS and then update to 2026.11, it moves to the Marketplace on its own and keeps getting updates. You don't need to reinstall it.

[![Open your Home Assistant instance and start setting up Blueprint Store.](https://my.home-assistant.io/badges/config_flow_start.svg)](https://my.home-assistant.io/redirect/config_flow_start/?domain=blueprint_store)

**Blueprint Store** now appears in the sidebar. The page is only visible to administrators.

## Using it

1. Open **Blueprint Store** from the sidebar.
2. Search, pick a category, or filter by type (automation, script or template). Sort by most popular, recently updated or name.
3. Click a blueprint to see its description, its requirements and the settings you'll be asked for.
4. Click **Show code** if you want to read it, then **Install**.
5. Go to **Settings → Automations & scenes → Blueprints** and create an automation from it, as you would with any other blueprint.

Installing a blueprint does not change anything in your home. It only becomes active once you create an automation or script from it.

### Warning badges

Some blueprints control things where a mistake matters. The catalog checks what each blueprint does and marks it with a badge on the card. The details explain what each badge means.

| Badge | The blueprint… |
|---|---|
| Controls locks | locks or unlocks locks |
| Controls the alarm | arms or disarms an alarm panel |
| Controls heating | changes climate devices or water heaters |
| Controls doors and blinds | opens or closes covers, such as garage doors |
| Runs commands | uses `shell_command`, `python_script`, `pyscript` or `command_line` |
| Restarts Home Assistant or add-ons | restarts or stops Home Assistant, or uses the Supervisor (`hassio`) |
| Sends web requests | uses `rest_command` |
| Can be triggered from outside | starts from a webhook |

The badges are a guide, not a guarantee. They come from reading the blueprint's code, and a blueprint that builds its actions from templates can do things the check doesn't see. Read the code before using a blueprint for anything important.

### Favorites and what's new

Click the star on a card to save a blueprint as a favorite, and tick **Only favorites** to see just those.

Blueprints added to the catalog since your last visit are marked **New**, and blueprints whose code has changed are marked **Changed**. Tick **Only new since my last visit** to see just those. The option only appears when there is something new.

Favorites and the time of your last visit are saved with your Home Assistant user, so they follow you between your computer and your phone.

### Updates

When a blueprint you installed through the store changes, an update entity appears under **Settings → Updates**. You can install it there or from the store page.

Updating a blueprint reloads every automation that uses it. If the author made bigger changes, such as adding a required setting, you may need to open those automations and adjust them.

Open the blueprint in the store before updating, and it shows you:

- **which automations and scripts use it**, with links to each one
- **new required settings** (highlighted in red). Automations that use the blueprint stop working until you open them and fill these in.
- new optional settings and settings that were removed
- **Show every change**: the full list of changed lines

Check the forum thread too before updating anything important.

### Removing a blueprint

Open an installed blueprint and click **Remove**, then click again to confirm. The file is deleted and its update notice disappears.

A blueprint can't be removed while an automation or script still uses it. The store lists them so you can change or delete them first.

Blueprints you installed some other way are shown as installed, but you won't get update notices for them until you reinstall them through the store.

## Is it safe?

- Blueprints are written by the community. A blueprint can control your devices, so read the code before using one for locks, alarms or heating.
- The store only installs blueprints that are listed in its catalog, and it uses Home Assistant's own import function to do it (the same one behind the **Import blueprint** button).
- Text from the forum is always displayed as plain text, never run as code.
- The integration doesn't install any extra Python packages and doesn't touch your existing automations.
- It sends nothing about your system anywhere. It only downloads the catalog and the blueprints you choose to install.

Taking a backup before trying any new integration is always a good idea.

## How it works

A script runs every night on GitHub. It reads the Blueprints Exchange, finds each thread's **Import blueprint** link, downloads the blueprint and records its name, description, requirements, which sensitive actions it uses, which categories it belongs to, when it was added to the catalog, when its code last changed, and a fingerprint of its contents. The result is published as a single file:

https://rickardfransson.github.io/Blueprints-store/index.json

The integration downloads this file every six hours. That way the forum gets one visitor a night instead of one from every Home Assistant install.

Threads without an import link, and blueprints that fail to load, are left out of the catalog.

## Settings

Under **Settings → Devices & services → Blueprint Store → Configure** you can point the integration to a different catalog, for example if you run your own copy of the indexer.

## Removing it

Delete the integration under **Settings → Devices & services**, then remove it in the Marketplace (or in HACS on 2026.10 and older). Blueprints you already installed stay where they are and keep working. To remove individual blueprints, use **Remove** in the store first (see [Removing a blueprint](#removing-a-blueprint)).

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

GitHub Actions runs both test suites on every change, along with Home Assistant's `hassfest` and the HACS validation (`hacs/action`), which also checks what the Marketplace needs.

## License

MIT. See [LICENSE](LICENSE).

This is a community project and is not affiliated with Home Assistant or Nabu Casa. The blueprints in the catalog belong to their authors.
