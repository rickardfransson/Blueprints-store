# HA Blueprint Store

En "butik" för Home Assistant-blueprints: sök, bläddra och installera med ett klick.

Projektet har tre delar:

1. **Katalogroboten** (`indexer/`). Körs varje natt på GitHub, läser forumets
   Blueprints Exchange och bygger en katalog, `index.json`. ✅ *Klar (första version)*
2. **Integrationen** (`custom_components/blueprint_store/`). Installeras via HACS
   och läser katalogen. ⏳ *Nästa steg*
3. **Butikssidan** i Home Assistants sidomeny. ⏳ *Efter det*

## Så kommer du igång

1. Skapa ett nytt repo på GitHub, t.ex. `ha-blueprint-store`, och ladda upp
   allt i den här mappen.
2. I repot: **Settings → Pages → Source: GitHub Actions**.
3. Gå till fliken **Actions**, välj *Bygg blueprint-katalog* och tryck
   **Run workflow**. Börja gärna med `max_pages` = 1 för ett snabbt test.
4. När den är klar finns katalogen på
   `https://<ditt-användarnamn>.github.io/ha-blueprint-store/index.json`.
5. Byt ut `OWNER` i `indexer/build_index.py` (raden `USER_AGENT`) mot ditt
   GitHub-namn, så att forumets ansvariga ser vem som hämtar.

Därefter körs roboten automatiskt varje natt.

## Köra lokalt

```bash
pip install -r indexer/requirements.txt pytest
cd indexer && python -m pytest -q          # tester, inget nätverk behövs
python build_index.py --max-pages 1 --out ../index.json
```

## Hur roboten fungerar

- Den läser trådlistan i forumkategorin (Discourse ger JSON gratis).
- I varje tråds första inlägg letar den efter **Importera**-knappen
  (`my.home-assistant.io/redirect/blueprint_import/?blueprint_url=...`).
  Länken bakom knappen pekar på själva blueprinten.
- Blueprinten hämtas från GitHub, en gist eller forumet, och den plockar ut
  namn, beskrivning, typ, inställningar, krav (t.ex. ZHA) och lägsta HA-version.
- Varje blueprint får ett fingeravtryck (`sha256`). Integrationen jämför det
  senare för att upptäcka uppdateringar.
- Trådar som inte har ändrats sedan förra natten hämtas inte igen, så forumet
  belastas så lite som möjligt. Den väntar också 1 sekund mellan anrop och
  backar vid "för många anrop" (429).

Se `example-index.json` för hur katalogen ser ut.

## Att tänka på

- Stäm av med forumets moderatorer innan katalogen används brett.
- Trasiga blueprints hamnar under `errors` i katalogen, inte i butiken.
