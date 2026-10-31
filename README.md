# Blueprint Store

En "butik" för Home Assistant-blueprints. Sök, bläddra och installera
blueprints från communityn med ett klick, direkt i Home Assistant.

- 🔎 Sök bland alla blueprints i forumets Blueprints Exchange
- ✅ Visar bara det som passar ditt system (rätt HA-version och integrationer)
- 👀 Läs koden innan du installerar
- 🔄 Uppdateringar dyker upp under **Inställningar → Uppdateringar**

## Installera (via HACS)

1. Öppna **HACS** → menyn (⋮) uppe till höger → **Custom repositories**.
2. Klistra in `https://github.com/rickardfransson/Blueprints-store`,
   välj typen **Integration** och klicka på **Add**.
3. Sök efter **Blueprint Store** i HACS och klicka på **Download**.
4. Starta om Home Assistant.
5. Gå till **Inställningar → Enheter och tjänster → Lägg till integration**
   och välj **Blueprint Store**.

Nu finns **Blueprint Store** i sidomenyn. Sidan syns bara för administratörer.

## Hur det fungerar

Projektet har tre delar:

1. **Katalogroboten** (`indexer/`). Körs varje natt på GitHub, läser forumets
   Blueprints Exchange och publicerar en katalog:
   https://rickardfransson.github.io/Blueprints-store/index.json
2. **Integrationen** (`custom_components/blueprint_store/`). Hämtar katalogen
   var sjätte timme och installerar blueprints med Home Assistants egen
   importfunktion, samma som knappen "Importera blueprint".
3. **Butikssidan** (`custom_components/blueprint_store/frontend/`). Sidan i
   sidomenyn.

Integrationen installerar bara blueprints som finns i katalogen, och allt
som kommer från forumet visas som text, aldrig som kod.

### Uppdateringar

Varje blueprint i katalogen har ett fingeravtryck. När någon ändrar en
blueprint som du har installerat via butiken får fingeravtrycket ett nytt
värde, och då dyker en uppdatering upp under **Inställningar → Uppdateringar**.
Blueprints som du har installerat på annat sätt visas som installerade, men
följs inte upp med uppdateringar förrän du installerar dem om via butiken.

## Inställningar

Under **Inställningar → Enheter och tjänster → Blueprint Store → Konfigurera**
kan du byta adress till katalogen, till exempel om du kör en egen.

## Utveckling

```bash
# Katalogroboten (inget nätverk behövs)
pip install -r indexer/requirements.txt pytest
cd indexer && python -m pytest -q test_build_index.py

# Integrationen, mot en riktig Home Assistant
pip install pytest-homeassistant-custom-component
python -m pytest -v tests
```

GitHub kör båda testerna automatiskt, tillsammans med Home Assistants och
HACS egna kontroller.
