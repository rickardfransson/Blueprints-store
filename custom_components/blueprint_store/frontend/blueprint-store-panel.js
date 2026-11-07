/* Blueprint Store – the page in Home Assistant's sidebar.
 *
 * Plain JavaScript, no build step. All text from the catalog (which comes
 * from the forum) is set with textContent and never as HTML, so nothing in
 * a blueprint description can run as code inside Home Assistant.
 *
 * Translations: the page follows the language chosen in the user's Home
 * Assistant profile. Swedish and English are included; any other language
 * falls back to English. To add a language, copy the `en` block in
 * TRANSLATIONS and translate the values.
 */

const PAGE_SIZE = 60;

// Kategorierna sätts av indexeraren (indexer/build_index.py, CATEGORY_RULES).
// "other" är butikens egen: blueprints som inte hamnade i någon kategori.
const CATEGORY_ICONS = {
  lighting: "💡", remotes: "🎛️", notifications: "🔔", climate: "🌡️", energy: "⚡",
  security: "🛡️", presence: "🚶", media: "🎵", covers: "🪟", voice_ai: "🎙️",
  maintenance: "🔧", schedule: "🕒", other: "📦",
};

const TRANSLATIONS = {
  en: {
    domains: { automation: "Automation", script: "Script", template: "Template" },
    searchPlaceholder: 'Search, e.g. "motion light" or "zha"',
    refresh: "Download the catalog again",
    allTypes: "All types",
    allCategories: "All",
    categoriesLabel: "Category",
    categories: {
      lighting: "Lighting",
      remotes: "Buttons & remotes",
      notifications: "Notifications",
      climate: "Climate",
      energy: "Energy",
      security: "Security",
      presence: "Presence & motion",
      media: "Media",
      covers: "Blinds & covers",
      voice_ai: "Voice & AI",
      maintenance: "Maintenance",
      schedule: "Time & schedules",
      other: "Other",
    },
    sortPopular: "Most popular",
    sortRecent: "Recently updated",
    sortName: "Name A–Z",
    onlyFits: "Only show what fits my system",
    onlyInstalled: "Only installed",
    onlyFavorites: "Only favorites",
    onlyNew: (n) => `Only new since my last visit (${n})`,
    badgeNew: "New",
    badgeChanged: "Changed",
    favoriteAdd: "Save as favorite",
    favoriteRemove: "Remove from favorites",
    sensitive: {
      locks: "Controls locks",
      alarm: "Controls the alarm",
      climate: "Controls heating",
      covers: "Controls doors and blinds",
      commands: "Runs commands",
      system: "Restarts Home Assistant or add-ons",
      web_requests: "Sends web requests",
      webhook: "Can be triggered from outside",
    },
    sensitiveHeading: "Worth knowing",
    sensitiveHelp: {
      locks: "Locks or unlocks locks.",
      alarm: "Arms or disarms the alarm.",
      climate: "Changes heating, cooling or water heaters.",
      covers: "Opens or closes covers, such as garage doors and blinds.",
      commands: "Runs shell commands or Python scripts on the machine Home Assistant runs on.",
      system: "Can restart or stop Home Assistant, or control add-ons and the host.",
      web_requests: "Sends requests to other services on the network or the internet.",
      webhook: "Starts from a webhook, so anyone who knows its address can trigger it.",
    },
    usedByHeading: (n) => `Used by ${n === 1 ? "1 automation or script" : `${n} automations or scripts`}`,
    notUsed: "Not used by any automation or script yet.",
    changesHeading: "What changes in the update",
    checkingChanges: "Checking what has changed…",
    changesFailed: (e) => `Could not check the changes: ${e}`,
    changesNone: "The update changes nothing you need to adjust.",
    changesIdentical: "The content is the same as what you have.",
    addedRequired: "New required settings:",
    nowRequired: "Settings that are now required:",
    addedOptional: "New optional settings:",
    removedInputs: "Removed settings:",
    mustAdjust: "Everything listed above that uses the blueprint stops working until you open it and fill in the new settings.",
    showDiff: "Show every change",
    hideDiff: "Hide changes",
    diffTruncated: "The list is cut short. Read the full code with Show code.",
    remove: "Remove",
    removeConfirm: "Click again to remove",
    removing: "Removing…",
    removed: "Removed. You can install it again at any time.",
    removeBlocked: "Remove it from the automations and scripts above first.",
    loading: "Loading the catalog…",
    loadFailed: (e) => `Could not load the catalog: ${e}`,
    count: (shown, total) => `${shown} of ${total} blueprints`,
    catalogUpdated: (when) => ` · catalog updated ${when}`,
    noResultsFits: 'No matches. Try unticking "Only show what fits my system".',
    noResults: "No matches.",
    showMore: (n) => `Show more (${n} left)`,
    badgeUpdate: "Update available",
    badgeInstalled: "Installed",
    badgeNeedsHa: (v) => `Needs HA ${v}`,
    badgeMissing: (list) => `Missing ${list}`,
    untitled: "Untitled",
    unknownAuthor: "unknown",
    byLine: (author, likes, when) => `by ${author} · ♥ ${likes} · updated ${when}`,
    close: "Close",
    noDescription: "No description.",
    requirements: "Requirements",
    haVersion: (v) => `Home Assistant ${v || "(any version)"}`,
    youHave: (v) => ` – you have ${v}`,
    notInstalled: " – not installed",
    settingsHeading: "Settings you'll be asked for",
    optional: " (optional)",
    notice: "Blueprints are written by the community and can control your devices. Consider reading the code before you install.",
    openThread: "Open forum thread",
    showCode: "Show code",
    install: "Install",
    statusLatest: "Installed. You have the latest version.",
    statusUpdate: "A newer version is available.",
    statusUntracked: "Installed, but not through the store, so the store can't tell when a newer version comes out.",
    reinstallViaStore: "Reinstall through the store",
    update: "Update",
    installing: "Installing…",
    done: "Done ✓",
    fetching: "Loading…",
    codeFailed: (e) => `Could not load the code: ${e}`,
    installedAs: (p) => `Installed as ${p}`,
    installedOk: {
      automation: "Installed! You can now create an automation from it.",
      script: "Installed! You can now create a script from it.",
      template: "Installed! You can now create a template entity from it.",
    },
    goToBlueprints: "Go to blueprints",
    goTo: { automation: "Go to automations", script: "Go to scripts" },
    failed: (e) => `That didn't work: ${e}`,
    errors: {
      not_in_catalog: "This blueprint is no longer in the catalog. Try refreshing the page.",
      fetch_failed: "The blueprint could not be downloaded from its source.",
      invalid_blueprint: "The blueprint could not be read. It may be broken or use a format this version of Home Assistant doesn't support.",
      file_exists: "A blueprint with the same file name already exists.",
      not_loaded: "Blueprint Store is not running. Check Settings → Devices & services.",
      unauthorized: "Only administrators can install blueprints.",
      not_installed: "The blueprint is not installed.",
      in_use: "The blueprint is still used by an automation or script.",
    },
  },

  sv: {
    domains: { automation: "Automation", script: "Skript", template: "Mall" },
    searchPlaceholder: 'Sök, t.ex. "rörelse lampa" eller "zha"',
    refresh: "Hämta katalogen igen",
    allTypes: "Alla typer",
    allCategories: "Alla",
    categoriesLabel: "Kategori",
    categories: {
      lighting: "Belysning",
      remotes: "Knappar & fjärrkontroller",
      notifications: "Notiser",
      climate: "Klimat",
      energy: "Energi",
      security: "Säkerhet",
      presence: "Närvaro & rörelse",
      media: "Media",
      covers: "Gardiner & portar",
      voice_ai: "Röst & AI",
      maintenance: "Underhåll",
      schedule: "Tid & schema",
      other: "Övrigt",
    },
    sortPopular: "Populärast",
    sortRecent: "Senast uppdaterade",
    sortName: "Namn A–Ö",
    onlyFits: "Bara sådant som passar mitt system",
    onlyInstalled: "Bara installerade",
    onlyFavorites: "Bara favoriter",
    onlyNew: (n) => `Bara nytt sedan mitt förra besök (${n})`,
    badgeNew: "Ny",
    badgeChanged: "Ändrad",
    favoriteAdd: "Spara som favorit",
    favoriteRemove: "Ta bort från favoriter",
    sensitive: {
      locks: "Styr lås",
      alarm: "Styr larmet",
      climate: "Styr värmen",
      covers: "Styr portar och persienner",
      commands: "Kör kommandon",
      system: "Startar om Home Assistant eller tillägg",
      web_requests: "Skickar webbanrop",
      webhook: "Kan startas utifrån",
    },
    sensitiveHeading: "Bra att veta",
    sensitiveHelp: {
      locks: "Låser eller låser upp lås.",
      alarm: "Larmar på eller av.",
      climate: "Ändrar värme, kyla eller varmvattenberedare.",
      covers: "Öppnar eller stänger t.ex. garageportar och persienner.",
      commands: "Kör skalkommandon eller Python-skript på datorn som Home Assistant körs på.",
      system: "Kan starta om eller stänga av Home Assistant, eller styra tillägg och värddatorn.",
      web_requests: "Skickar anrop till andra tjänster i nätverket eller på internet.",
      webhook: "Startas via en webhook, så den som känner till adressen kan starta den.",
    },
    usedByHeading: (n) => `Används av ${n === 1 ? "1 automation eller skript" : `${n} automationer eller skript`}`,
    notUsed: "Används inte av någon automation eller något skript än.",
    changesHeading: "Det här ändras i uppdateringen",
    checkingChanges: "Kollar vad som har ändrats…",
    changesFailed: (e) => `Kunde inte kolla ändringarna: ${e}`,
    changesNone: "Uppdateringen ändrar inget som du behöver justera.",
    changesIdentical: "Innehållet är detsamma som det du har.",
    addedRequired: "Nya obligatoriska inställningar:",
    nowRequired: "Inställningar som nu är obligatoriska:",
    addedOptional: "Nya valfria inställningar:",
    removedInputs: "Borttagna inställningar:",
    mustAdjust: "Allt ovan som använder blueprinten slutar fungera tills du öppnar det och fyller i de nya inställningarna.",
    showDiff: "Visa alla ändringar",
    hideDiff: "Dölj ändringarna",
    diffTruncated: "Listan är avkortad. Läs hela koden med Visa koden.",
    remove: "Ta bort",
    removeConfirm: "Klicka igen för att ta bort",
    removing: "Tar bort…",
    removed: "Borttagen. Du kan installera den igen när du vill.",
    removeBlocked: "Ta först bort den från automationerna och skripten ovan.",
    loading: "Hämtar katalogen…",
    loadFailed: (e) => `Kunde inte läsa katalogen: ${e}`,
    count: (shown, total) => `${shown} av ${total} blueprints`,
    catalogUpdated: (when) => ` · katalogen uppdaterad ${when}`,
    noResultsFits: 'Inga träffar. Testa att bocka ur "Bara sådant som passar mitt system".',
    noResults: "Inga träffar.",
    showMore: (n) => `Visa fler (${n} kvar)`,
    badgeUpdate: "Uppdatering finns",
    badgeInstalled: "Installerad",
    badgeNeedsHa: (v) => `Kräver HA ${v}`,
    badgeMissing: (list) => `Saknar ${list}`,
    untitled: "Namnlös",
    unknownAuthor: "okänd",
    byLine: (author, likes, when) => `av ${author} · ♥ ${likes} · uppdaterad ${when}`,
    close: "Stäng",
    noDescription: "Ingen beskrivning.",
    requirements: "Krav",
    haVersion: (v) => `Home Assistant ${v || "(ingen gräns)"}`,
    youHave: (v) => ` – du har ${v}`,
    notInstalled: " – inte installerad",
    settingsHeading: "Det här får du ställa in",
    optional: " (valfri)",
    notice: "Blueprints skrivs av communityn och kan styra dina enheter. Läs gärna koden innan du installerar.",
    openThread: "Öppna forumtråden",
    showCode: "Visa koden",
    install: "Installera",
    statusLatest: "Installerad. Du har den senaste versionen.",
    statusUpdate: "Det finns en nyare version.",
    statusUntracked: "Installerad, men inte via butiken. Därför kan butiken inte se när det kommer en nyare version.",
    reinstallViaStore: "Installera om via butiken",
    update: "Uppdatera",
    installing: "Installerar…",
    done: "Klar ✓",
    fetching: "Hämtar…",
    codeFailed: (e) => `Kunde inte hämta koden: ${e}`,
    installedAs: (p) => `Installerad som ${p}`,
    installedOk: {
      automation: "Installerad! Nu kan du skapa en automation från den.",
      script: "Installerad! Nu kan du skapa ett skript från den.",
      template: "Installerad! Nu kan du skapa en mallentitet från den.",
    },
    goToBlueprints: "Gå till blueprints",
    goTo: { automation: "Gå till automationer", script: "Gå till skript" },
    failed: (e) => `Det gick inte: ${e}`,
    errors: {
      not_in_catalog: "Blueprinten finns inte längre i katalogen. Testa att ladda om sidan.",
      fetch_failed: "Blueprinten gick inte att hämta från källan.",
      invalid_blueprint: "Blueprinten gick inte att läsa. Den kan vara trasig eller använda ett format som din version av Home Assistant inte stöder.",
      file_exists: "Det finns redan en blueprint med samma filnamn.",
      not_loaded: "Blueprint Store är inte igång. Kontrollera Inställningar → Enheter och tjänster.",
      unauthorized: "Bara administratörer kan installera blueprints.",
      not_installed: "Blueprinten är inte installerad.",
      in_use: "Blueprinten används fortfarande av en automation eller ett skript.",
    },
  },
};

function h(tag, attrs = {}, ...children) {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs || {})) {
    if (v === undefined || v === null || v === false) continue;
    if (k === "class") el.className = v;
    else if (k.startsWith("on")) el.addEventListener(k.slice(2), v);
    else if (k in el && typeof v !== "string") el[k] = v;
    else el.setAttribute(k, v === true ? "" : v);
  }
  for (const c of children.flat()) {
    if (c === null || c === undefined || c === false) continue;
    el.append(c instanceof Node ? c : document.createTextNode(String(c)));
  }
  return el;
}

function parseVersion(v) {
  const m = String(v || "").match(/^(\d+)\.(\d+)(?:\.(\d+))?/);
  return m ? [Number(m[1]), Number(m[2]), Number(m[3] || 0)] : null;
}

function versionAtLeast(have, need) {
  const a = parseVersion(have), b = parseVersion(need);
  if (!a || !b) return true;
  for (let i = 0; i < 3; i++) {
    if (a[i] !== b[i]) return a[i] > b[i];
  }
  return true;
}

function relativeDate(iso, lang) {
  if (!iso) return "";
  const days = Math.floor((Date.now() - new Date(iso).getTime()) / 86400000);
  if (Number.isNaN(days)) return "";
  const rtf = new Intl.RelativeTimeFormat(lang, { numeric: "auto" });
  if (days < 31) return rtf.format(-days, "day");
  if (days < 365) return rtf.format(-Math.floor(days / 30), "month");
  return rtf.format(-Math.floor(days / 365), "year");
}

// Bara bokstäver och siffror, gemener – för att jämföra text med blueprintens namn.
function normalize(text) {
  return String(text || "").toLowerCase().normalize("NFKD").replace(/[^\p{L}\p{N}]+/gu, "");
}

const VERSION_RE = /(^|\s|[-–(\[])v(ersion)?\s*[:.]?\s*\d+(\.\d+)*[a-z]?\b[)\]]?/gi;

// Rader som bara är en länketikett och saknar mening utan själva länken.
const LINK_LABELS = new Set(["link", "links", "githublink", "github", "gist", "source", "sourcecode",
  "code", "download", "import", "importblueprint", "blueprint", "changelog"]);

// Kort beskrivning för korten. Hoppar över rader som bara upprepar namnet
// och/eller ett versionsnummer (t.ex. "📱 Appliance Notifications Version: 4.0").
function cardSummary(bp, max = 180) {
  const plain = String(bp.description || "")
    .replace(/!\[[^\]]*\]\([^)]*\)/g, "")      // markdown images
    .replace(/\[([^\]]*)\]\([^)]*\)/g, "$1")   // markdown-länkar -> bara texten (tom text -> inget)
    .replace(/<[^>]+>/g, " ")                  // html-taggar
    .replace(/https?:\/\/\S+/g, "")            // långa webbadresser säger inget på ett kort
    .replace(/[#*`|]/g, "")                    // markdown-tecken (men inte _ som i blueprint_import)
    .replace(/^\s*>\s?/gm, "");                // citat
  const name = normalize(bp.name);
  const title = normalize(bp.topic?.title);
  const useful = plain.split(/\n/).map((l) => l.trim()).filter((line) => {
    const n = normalize(line.replace(VERSION_RE, " "));
    if (!n || LINK_LABELS.has(n)) return false;              // tom, bara emoji/version/länketikett
    // Rubriken i forumet är ofta samma mening som beskrivningen, så den
    // jämförs bara exakt. Namnet får också matcha delvis ("Frigate Notifications").
    return n !== title && n !== name && !(n.length >= 4 && name.includes(n));
  });
  // Första stycket bland det som är kvar (rader i följd hör ihop).
  const para = [];
  for (const line of plain.split(/\n/).map((l) => l.trim())) {
    if (useful.includes(line)) para.push(line);
    else if (para.length && !line) break;
  }
  let text = para.join(" ").replace(/\s+/g, " ").trim();
  if (!text) {
    // Inget kvar efter sållningen: visa hellre första raden än ett tomt kort,
    // men inte om den bara är namnet igen.
    const first = plain.split(/\n/).map((l) => l.trim()).find(Boolean) || "";
    const n = normalize(first);
    text = n === name || LINK_LABELS.has(n) ? "" : first.replace(/\s+/g, " ");
  }
  return text.length > max ? text.slice(0, max - 1).trimEnd() + "…" : text;
}

// Favoriter och senaste besök sparas per användare i Home Assistant, så att
// de följer med mellan datorer och telefoner. Om det inte går (äldre
// versioner) sparas de i webbläsaren i stället.
const USER_DATA_KEY = "blueprint_store";

async function loadUserData(hass) {
  try {
    const res = await hass.callWS({ type: "frontend/get_user_data", key: USER_DATA_KEY });
    if (res?.value && typeof res.value === "object") return res.value;
    if (res && "value" in res) return {};
  } catch (_err) { /* faller tillbaka på webbläsaren */ }
  try {
    return JSON.parse(localStorage.getItem(USER_DATA_KEY) || "{}") || {};
  } catch (_err) {
    return {};
  }
}

async function saveUserData(hass, value) {
  try { localStorage.setItem(USER_DATA_KEY, JSON.stringify(value)); } catch (_err) { /* ingen lagring */ }
  try {
    await hass.callWS({ type: "frontend/set_user_data", key: USER_DATA_KEY, value });
  } catch (_err) { /* webbläsaren räcker */ }
}

function after(iso, since) {
  if (!iso || !since) return false;
  const a = Date.parse(iso), b = Date.parse(since);
  return !Number.isNaN(a) && !Number.isNaN(b) && a > b;
}

function pickLanguage(hass) {
  const lang = String(hass?.locale?.language || hass?.language || "en").toLowerCase();
  const base = lang.split(/[-_]/)[0];
  return TRANSLATIONS[base] ? base : "en";
}

class BlueprintStorePanel extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: "open" });
    this._items = [];
    this._meta = {};
    this._loading = true;
    this._error = null;
    this._shown = PAGE_SIZE;
    this._filters = { q: "", domain: "", category: "", fits: true, installed: false, favorites: false, fresh: false, sort: "popular" };
    this._favorites = new Set();
    this._lastVisit = null;  // förra besöket, avgör vad som är "nytt"
    this._built = false;
    this._lang = "en";
    this.t = TRANSLATIONS.en;
  }

  set hass(hass) {
    const first = !this._hass;
    this._hass = hass;
    const lang = pickLanguage(hass);
    if (lang !== this._lang) {
      this._lang = lang;
      this.t = TRANSLATIONS[lang];
      if (!first) this._rebuild();
    }
    if (first) {
      this._build();
      this._load();
    }
    if (this._menuButton) this._menuButton.hass = hass;
  }
  get hass() { return this._hass; }

  set narrow(v) {
    this._narrow = v;
    if (this._menuButton) this._menuButton.narrow = v;
    this.toggleAttribute("narrow", !!v);
  }

  set panel(v) { this._panel = v; }

  _errorText(err) {
    const known = err?.code && this.t.errors[err.code];
    if (known) return known;
    return err?.message || String(err);
  }

  _date(iso) { return relativeDate(iso, this._lang); }

  // ------------------------------------------------------------------ data

  async _load(refresh = false) {
    this._loading = true;
    this._error = null;
    this._renderList();
    try {
      if (refresh) await this._hass.callWS({ type: "blueprint_store/refresh" });
      if (!this._userData) await this._loadUserData();
      const res = await this._hass.callWS({ type: "blueprint_store/list" });
      this._items = res.blueprints || [];
      this._meta = res;
    } catch (err) {
      this._error = this._errorText(err);
    }
    this._loading = false;
    this._renderList();
  }

  async _loadUserData() {
    this._userData = await loadUserData(this._hass);
    this._favorites = new Set(Array.isArray(this._userData.favorites) ? this._userData.favorites : []);
    // Det som kommit in sedan förra besöket räknas som nytt under hela det
    // här besöket, även om sidan laddas om under tiden.
    this._lastVisit = this._userData.last_visit || null;
    this._userData.last_visit = new Date().toISOString();
    saveUserData(this._hass, this._userData);
  }

  _toggleFavorite(bp) {
    if (this._favorites.has(bp.source_url)) this._favorites.delete(bp.source_url);
    else this._favorites.add(bp.source_url);
    this._userData = { ...(this._userData || {}), favorites: [...this._favorites] };
    saveUserData(this._hass, this._userData);
  }

  _isNew(bp) { return after(bp.added_at, this._lastVisit); }

  _isChanged(bp) { return !this._isNew(bp) && after(bp.changed_at, this._lastVisit); }

  _compat(bp) {
    const comps = new Set(this._hass.config.components || []);
    const missing = [...(bp.requires_integrations || []), ...(bp.requires_domains || [])]
      .filter((d) => !comps.has(d));
    const versionOk = versionAtLeast(this._hass.config.version, bp.min_ha_version);
    return { missing, versionOk, ok: versionOk && missing.length === 0 };
  }

  // Katalogen kan vara äldre än kategorierna. Då visas inga kategorier alls.
  _hasCategories() { return this._items.some((bp) => Array.isArray(bp.categories)); }

  _categoriesOf(bp) { return bp.categories?.length ? bp.categories : ["other"]; }

  // Alla filter utom kategorin. Kategoriraden räknar på det här, så att
  // siffrorna stämmer med de andra valen.
  _filteredExceptCategory() {
    const f = this._filters;
    const words = f.q.toLowerCase().split(/\s+/).filter(Boolean);
    const catLabels = this.t.categories;
    return this._items.filter((bp) => {
      if (f.domain && bp.domain !== f.domain) return false;
      if (f.installed && !bp.installed) return false;
      if (f.favorites && !this._favorites.has(bp.source_url)) return false;
      if (f.fresh && !this._isNew(bp) && !this._isChanged(bp)) return false;
      if (f.fits && !bp.installed && !this._compat(bp).ok) return false;
      if (!words.length) return true;
      const hay = [
        bp.name, bp.description, bp.topic?.title, bp.author, bp.topic?.poster,
        ...(bp.topic?.tags || []), ...(bp.requires_integrations || []),
        ...(bp.categories || []).map((c) => catLabels[c]),
      ].join(" ").toLowerCase();
      return words.every((w) => hay.includes(w));
    });
  }

  _filtered(base = this._filteredExceptCategory()) {
    const f = this._filters;
    const list = f.category && this._hasCategories()
      ? base.filter((bp) => this._categoriesOf(bp).includes(f.category))
      : [...base];
    const collator = new Intl.Collator(this._lang);
    const by = {
      popular: (a, b) => (b.topic?.likes || 0) - (a.topic?.likes || 0),
      recent: (a, b) => String(b.topic?.bumped_at || "").localeCompare(String(a.topic?.bumped_at || "")),
      name: (a, b) => collator.compare(a.name || "", b.name || ""),
    }[f.sort];
    list.sort(by);
    // Updates first, so they don't get missed.
    list.sort((a, b) => Number(!!b.update_available) - Number(!!a.update_available));
    return list;
  }

  // ------------------------------------------------------------- rendering

  _rebuild() {
    if (!this._built) return;
    if (this._dialog?.open) this._dialog.close();
    this.shadowRoot.textContent = "";
    this._built = false;
    this._build();
    this._renderList();
  }

  _build() {
    const t = this.t;
    const f = this._filters;
    const root = this.shadowRoot;
    root.append(h("style", {}, STYLES));

    this._menuButton = document.createElement("ha-menu-button");
    this._menuButton.hass = this._hass;
    this._menuButton.narrow = this._narrow;

    const set = (key) => (e) => {
      f[key] = e.target.type === "checkbox" ? e.target.checked : e.target.value;
      this._shown = PAGE_SIZE;
      this._renderList();
    };

    const option = (value, label, current) => h("option", { value, selected: value === current }, label);

    const search = h("input", {
      type: "search", placeholder: t.searchPlaceholder, value: f.q,
      oninput: set("q"), class: "search",
    });

    root.append(
      h("header", { class: "toolbar" },
        this._menuButton,
        h("div", { class: "title" }, "Blueprint Store"),
        h("button", { class: "icon-btn", title: t.refresh, "aria-label": t.refresh, onclick: () => this._load(true) }, "⟳"),
      ),
      h("div", { class: "content" },
        h("div", { class: "controls" },
          search,
          h("div", { class: "row" },
            h("select", { onchange: set("domain") },
              option("", t.allTypes, f.domain),
              ...Object.entries(t.domains).map(([v, l]) => option(v, l, f.domain)),
            ),
            h("select", { onchange: set("sort") },
              option("popular", t.sortPopular, f.sort),
              option("recent", t.sortRecent, f.sort),
              option("name", t.sortName, f.sort),
            ),
            h("label", { class: "check" },
              h("input", { type: "checkbox", checked: f.fits, onchange: set("fits") }),
              t.onlyFits),
            h("label", { class: "check" },
              h("input", { type: "checkbox", checked: f.installed, onchange: set("installed") }),
              t.onlyInstalled),
            h("label", { class: "check" },
              h("input", { type: "checkbox", checked: f.favorites, onchange: set("favorites") }),
              t.onlyFavorites),
            (this._freshLabel = h("label", { class: "check", hidden: true },
              h("input", { type: "checkbox", checked: f.fresh, onchange: set("fresh") }),
              h("span"))),
          ),
        ),
        (this._catRow = h("div", { class: "cats", role: "group", "aria-label": t.categoriesLabel })),
        (this._status = h("div", { class: "status" })),
        (this._grid = h("div", { class: "grid" })),
        (this._more = h("div", { class: "more" })),
      ),
      (this._dialog = h("dialog", { class: "dialog" })),  // töms när den öppnas, se _openDetails
    );
    this._built = true;
    setTimeout(() => search.focus(), 50);
  }

  _renderList() {
    if (!this._built) return;
    const t = this.t;
    this._grid.textContent = "";
    this._more.textContent = "";
    this._catRow.textContent = "";
    if (this._loading) {
      this._status.textContent = t.loading;
      return;
    }
    if (this._error) {
      this._status.textContent = t.loadFailed(this._error);
      return;
    }
    const fresh = this._items.filter((bp) => this._isNew(bp) || this._isChanged(bp)).length;
    this._freshLabel.hidden = !fresh && !this._filters.fresh;
    this._freshLabel.querySelector("span").textContent = this.t.onlyNew(fresh);
    const base = this._filteredExceptCategory();
    this._renderCategories(base);
    const list = this._filtered(base);
    const updated = this._meta.generated_at ? t.catalogUpdated(this._date(this._meta.generated_at)) : "";
    this._status.textContent = t.count(list.length, this._items.length) + updated;
    if (!list.length) {
      this._grid.append(h("p", { class: "empty" }, this._filters.fits ? t.noResultsFits : t.noResults));
      return;
    }
    this._list = list;
    for (const bp of list.slice(0, this._shown)) this._grid.append(this._card(bp));
    this._renderMore();
  }

  _renderCategories(base) {
    if (!this._hasCategories()) return;
    const t = this.t;
    const f = this._filters;
    const counts = {};
    for (const bp of base) for (const c of this._categoriesOf(bp)) counts[c] = (counts[c] || 0) + 1;
    const pick = (value) => () => {
      f.category = f.category === value ? "" : value;
      this._shown = PAGE_SIZE;
      this._renderList();
    };
    const chip = (value, label, n) => h("button", {
      class: "cat", "aria-pressed": String(f.category === value), onclick: pick(value),
    }, label, n === undefined ? null : h("span", { class: "n" }, String(n)));
    this._catRow.append(chip("", t.allCategories));
    // Tomma kategorier döljs, utom den som är vald (annars går den inte att välja bort).
    for (const c of Object.keys(CATEGORY_ICONS)) {
      if (!counts[c] && f.category !== c) continue;
      this._catRow.append(chip(c, `${CATEGORY_ICONS[c]} ${t.categories[c] || c}`, counts[c] || 0));
    }
  }

  // "Visa fler" lägger bara till nya kort under de som redan finns. Att bygga
  // om hela listan gjorde att sidan blev kort för ett ögonblick och hoppade upp.
  _showMore() {
    const from = this._shown;
    this._shown += PAGE_SIZE;
    for (const bp of this._list.slice(from, this._shown)) this._grid.append(this._card(bp));
    this._renderMore();
  }

  _renderMore() {
    this._more.textContent = "";
    const left = this._list.length - this._shown;
    if (left > 0) {
      this._more.append(h("button", { class: "btn", onclick: () => this._showMore() }, this.t.showMore(left)));
    }
  }

  _badge(bp) {
    const t = this.t;
    if (bp.update_available) return h("span", { class: "badge update" }, t.badgeUpdate);
    if (bp.installed) return h("span", { class: "badge ok" }, t.badgeInstalled);
    const c = this._compat(bp);
    if (!c.versionOk) return h("span", { class: "badge warn" }, t.badgeNeedsHa(bp.min_ha_version));
    if (c.missing.length) return h("span", { class: "badge warn" }, t.badgeMissing(c.missing.join(", ")));
    return null;
  }

  _freshBadge(bp) {
    if (this._isNew(bp)) return h("span", { class: "badge new" }, this.t.badgeNew);
    if (this._isChanged(bp)) return h("span", { class: "badge new" }, this.t.badgeChanged);
    return null;
  }

  _sensitiveBadges(bp) {
    const labels = this.t.sensitive;
    return (bp.sensitive || []).filter((c) => labels[c])
      .map((c) => h("span", { class: "badge sensitive", title: this.t.sensitiveHelp[c] }, "⚠ ", labels[c]));
  }

  _favButton(bp, onchange) {
    const t = this.t;
    const btn = h("button", { class: "fav" });
    const paint = () => {
      const on = this._favorites.has(bp.source_url);
      btn.textContent = on ? "★" : "☆";
      btn.classList.toggle("on", on);
      btn.title = on ? t.favoriteRemove : t.favoriteAdd;
      btn.setAttribute("aria-label", btn.title);
      btn.setAttribute("aria-pressed", String(on));
    };
    btn.addEventListener("click", (e) => {
      e.stopPropagation();  // öppna inte detaljrutan
      this._toggleFavorite(bp);
      paint();
      onchange?.();
    });
    btn.addEventListener("keydown", (e) => e.stopPropagation());
    paint();
    return btn;
  }

  _card(bp) {
    const t = this.t;
    // Kortet är en div med knapproll, eftersom favoritknappen inte får ligga
    // inuti en annan knapp.
    const open = () => this._openDetails(bp);
    const card = h("div", {
      class: "card", role: "button", tabindex: "0", onclick: open,
      onkeydown: (e) => {
        if (e.key === "Enter" || e.key === " ") { e.preventDefault(); open(); }
      },
    },
      h("div", { class: "card-top" },
        h("span", { class: "chip" }, t.domains[bp.domain] || bp.domain),
        this._freshBadge(bp),
        this._badge(bp),
        h("span", { class: "spacer" }),
        this._favButton(bp, () => { if (this._filters.favorites) this._renderList(); }),
      ),
      h("div", { class: "card-title" }, bp.name || bp.topic?.title || t.untitled),
      h("div", { class: "card-desc" }, cardSummary(bp)),
      bp.sensitive?.length ? h("div", { class: "card-top" }, this._sensitiveBadges(bp)) : null,
      h("div", { class: "card-meta" },
        h("span", {}, `♥ ${bp.topic?.likes ?? 0}`),
        h("span", {}, bp.author || bp.topic?.poster || ""),
        h("span", {}, this._date(bp.topic?.bumped_at)),
      ),
    );
    return card;
  }

  _openDetails(bp) {
    const t = this.t;
    const d = this._dialog;
    d.textContent = "";
    const c = this._compat(bp);
    const result = h("div", { class: "result" });
    const yamlBox = h("div");

    const reqList = [...(bp.requires_integrations || []), ...(bp.requires_domains || [])];
    const comps = new Set(this._hass.config.components || []);

    // Den blå knappen visar alltid nästa vettiga steg. En blueprint som redan
    // är installerad och aktuell behöver inte installeras igen, så då leder
    // knappen vidare till blueprint-listan i stället.
    const upToDate = bp.installed && !bp.update_available;
    const primary = upToDate
      ? h("button", { class: "btn primary", onclick: () => this._navigate("/config/blueprint/dashboard") }, t.goToBlueprints)
      : h("button", {
        class: "btn primary",
        onclick: () => this._install(bp, primary, result),
      }, bp.update_available ? t.update : t.install);

    let status = null;
    if (bp.update_available) {
      status = h("div", { class: "status-box update" }, t.statusUpdate);
    } else if (bp.installed && bp.tracked) {
      status = h("div", { class: "status-box ok" }, "✓ ", t.statusLatest);
    } else if (bp.installed) {
      const relink = h("button", {
        class: "link-btn",
        onclick: () => this._install(bp, relink, result),
      }, t.reinstallViaStore);
      status = h("div", { class: "status-box ok" }, "✓ ", t.statusUntracked, " ", relink);
    }
    if (status && bp.installed_path) {
      status.append(h("div", { class: "muted small" }, t.installedAs(bp.installed_path)));
    }

    const usedBy = bp.used_by || [];
    const usage = bp.installed ? h("div", { class: "usage" },
      h("h3", {}, usedBy.length ? t.usedByHeading(usedBy.length) : ""),
      usedBy.length
        ? h("ul", { class: "used-by" }, ...usedBy.map((eid) => h("li", {}, this._entityLink(eid))))
        : h("p", { class: "muted" }, t.notUsed),
    ) : null;
    if (usage && !usedBy.length) usage.querySelector("h3").remove();

    const changes = bp.update_available ? h("div", { class: "changes" }) : null;
    if (changes) this._loadChanges(bp, changes);

    const sensitive = (bp.sensitive || []).filter((c) => t.sensitive[c]);
    const sensitiveBox = sensitive.length ? h("div", { class: "sensitive-box" },
      h("h3", {}, "⚠ ", t.sensitiveHeading),
      h("ul", {}, ...sensitive.map((c) => h("li", {}, h("strong", {}, t.sensitive[c]), " – ", t.sensitiveHelp[c]))),
    ) : null;

    const remove = bp.installed ? h("button", {
      class: "btn danger",
      disabled: usedBy.length > 0,
      title: usedBy.length ? t.removeBlocked : null,
      onclick: () => this._remove(bp, remove, result),
    }, t.remove) : null;

    d.append(
      h("div", { class: "dlg-head" },
        h("div", {},
          h("span", { class: "chip" }, t.domains[bp.domain] || bp.domain),
          ...(bp.categories || []).filter((c) => t.categories[c])
            .map((c) => [" ", h("span", { class: "chip" }, `${CATEGORY_ICONS[c]} ${t.categories[c]}`)]).flat(),
          " ", this._freshBadge(bp),
          h("h2", {}, bp.name || bp.topic?.title || t.untitled),
          h("div", { class: "sub" },
            t.byLine(bp.author || bp.topic?.poster || t.unknownAuthor, bp.topic?.likes ?? 0, this._date(bp.topic?.bumped_at))),
        ),
        h("div", { class: "head-btns" },
          this._favButton(bp, () => this._renderList()),
          h("button", { class: "icon-btn", title: t.close, "aria-label": t.close, onclick: () => d.close() }, "✕"),
        ),
      ),
      h("div", { class: "dlg-body" },
        status,
        changes,
        usage,
        bp.installed && usedBy.length ? h("p", { class: "muted small" }, t.removeBlocked) : null,
        sensitiveBox,
        h("p", { class: "desc" }, bp.description || t.noDescription),

        h("h3", {}, t.requirements),
        h("ul", { class: "req" },
          h("li", { class: c.versionOk ? "ok" : "bad" },
            t.haVersion(bp.min_ha_version),
            c.versionOk ? "" : t.youHave(this._hass.config.version)),
          ...reqList.map((r) => h("li", { class: comps.has(r) ? "ok" : "bad" }, r,
            comps.has(r) ? "" : t.notInstalled)),
        ),

        bp.inputs?.length ? h("h3", {}, t.settingsHeading) : null,
        bp.inputs?.length ? h("ul", { class: "inputs" },
          ...bp.inputs.map((i) => h("li", {}, i.name || i.key, i.required ? "" : h("span", { class: "muted" }, t.optional)))) : null,

        h("div", { class: "notice" }, t.notice),
        yamlBox,
        result,
      ),
      h("div", { class: "dlg-actions" },
        bp.topic?.url
          ? h("a", { class: "btn", href: bp.topic.url, target: "_blank", rel: "noopener noreferrer" }, t.openThread)
          : null,
        remove,
        h("button", { class: "btn", onclick: (e) => this._preview(bp, yamlBox, e.target) }, t.showCode),
        primary,
      ),
    );
    d.showModal();
  }

  _entityLink(entityId) {
    const st = this._hass.states[entityId];
    const name = st?.attributes?.friendly_name || entityId;
    const [domain, objectId] = entityId.split(".");
    let path = null;
    if (domain === "automation" && st?.attributes?.id) path = `/config/automation/edit/${st.attributes.id}`;
    else if (domain === "script") path = `/config/script/edit/${objectId}`;
    if (!path) return h("span", {}, name);
    return h("a", {
      href: path,
      onclick: (e) => { e.preventDefault(); this._navigate(path); },
    }, name);
  }

  // Hämtar den nya versionen och jämför med den installerade, så att man ser
  // nya obligatoriska inställningar innan man trycker på Uppdatera.
  async _loadChanges(bp, box) {
    const t = this.t;
    box.append(h("h3", {}, t.changesHeading), h("p", { class: "muted" }, t.checkingChanges));
    let res;
    try {
      res = await this._hass.callWS({ type: "blueprint_store/diff", source_url: bp.source_url });
    } catch (err) {
      box.lastChild.textContent = t.changesFailed(this._errorText(err));
      return;
    }
    box.lastChild.remove();
    const names = (list) => list.map((i) => i.name || i.key).join(", ");
    const groups = [
      [res.added_required, t.addedRequired, "bad"],
      [res.now_required, t.nowRequired, "bad"],
      [res.added_optional, t.addedOptional, ""],
      [res.removed, t.removedInputs, ""],
    ].filter(([list]) => list?.length);

    if (res.identical) {
      box.append(h("p", {}, t.changesIdentical));
      return;
    }
    if (!groups.length) box.append(h("p", { class: "success" }, "✓ ", t.changesNone));
    for (const [list, label, cls] of groups) {
      box.append(h("p", { class: cls ? `change ${cls}` : "change" }, h("strong", {}, label), " ", names(list)));
    }
    const breaking = (res.added_required?.length || 0) + (res.now_required?.length || 0);
    if (breaking && (res.used_by || bp.used_by || []).length) {
      box.append(h("div", { class: "notice warn-box" }, t.mustAdjust));
    }

    if (res.diff) {
      const pre = h("pre", { class: "yaml diff", hidden: true },
        ...res.diff.split("\n").map((line) => h("span", {
          class: line.startsWith("+") && !line.startsWith("+++") ? "add"
            : line.startsWith("-") && !line.startsWith("---") ? "del"
              : line.startsWith("@@") ? "hunk" : "",
        }, line || " ")));
      const toggle = h("button", {
        class: "link-btn",
        onclick: () => {
          pre.hidden = !pre.hidden;
          toggle.textContent = pre.hidden ? t.showDiff : t.hideDiff;
        },
      }, t.showDiff);
      box.append(h("p", {}, toggle), pre);
      if (res.diff_truncated) pre.append(h("span", { class: "hunk" }, t.diffTruncated));
    }
  }

  async _remove(bp, btn, result) {
    const t = this.t;
    // Två klick i stället för en ruta som frågar "Är du säker?".
    if (!btn.dataset.armed) {
      btn.dataset.armed = "1";
      btn.textContent = t.removeConfirm;
      setTimeout(() => {
        if (btn.isConnected && btn.dataset.armed && !btn.disabled) {
          delete btn.dataset.armed;
          btn.textContent = t.remove;
        }
      }, 5000);
      return;
    }
    btn.disabled = true;
    btn.textContent = t.removing;
    result.textContent = "";
    try {
      await this._hass.callWS({ type: "blueprint_store/remove", source_url: bp.source_url });
    } catch (err) {
      delete btn.dataset.armed;
      btn.disabled = false;
      btn.textContent = t.remove;
      result.append(h("p", { class: "error" }, t.failed(this._errorText(err))));
      return;
    }
    Object.assign(bp, { installed: false, tracked: false, update_available: false, installed_path: null, used_by: [] });
    this._renderList();
    this._openDetails(bp);
    this._dialog.querySelector(".result")?.append(h("p", { class: "success" }, t.removed));
  }

  async _preview(bp, box, btn) {
    const t = this.t;
    btn.disabled = true;
    box.textContent = t.fetching;
    try {
      const res = await this._hass.callWS({ type: "blueprint_store/preview", source_url: bp.source_url });
      box.textContent = "";
      box.append(h("pre", { class: "yaml" }, res.yaml));
    } catch (err) {
      box.textContent = t.codeFailed(this._errorText(err));
      btn.disabled = false;
    }
  }

  async _install(bp, btn, result) {
    const t = this.t;
    btn.disabled = true;
    const old = btn.textContent;
    btn.textContent = t.installing;
    result.textContent = "";
    try {
      const res = await this._hass.callWS({
        type: "blueprint_store/install",
        source_url: bp.source_url,
        overwrite: !!bp.installed,
      });
      bp.installed = true;
      bp.tracked = true;
      bp.update_available = false;
      bp.installed_path = `${res.domain}/${res.path}`;
      btn.textContent = t.done;
      this._dialog.querySelector(".status-box")?.remove();
      const targets = { automation: "/config/automation/dashboard", script: "/config/script/dashboard" };
      result.append(
        h("p", { class: "success" }, t.installedOk[res.domain] || t.installedOk.automation),
        h("button", { class: "btn primary", onclick: () => this._navigate("/config/blueprint/dashboard") }, t.goToBlueprints),
        targets[res.domain]
          ? h("button", { class: "btn", onclick: () => this._navigate(targets[res.domain]) }, t.goTo[res.domain])
          : null,
      );
      this._renderList();
    } catch (err) {
      btn.disabled = false;
      btn.textContent = old;
      result.append(h("p", { class: "error" }, t.failed(this._errorText(err))));
    }
  }

  _navigate(path) {
    this._dialog.close();
    history.pushState(null, "", path);
    window.dispatchEvent(new CustomEvent("location-changed", { detail: { replace: false } }));
  }
}

const STYLES = `
  :host { display: block; height: 100%; background: var(--primary-background-color); color: var(--primary-text-color);
          font-family: var(--paper-font-body1_-_font-family, Roboto, sans-serif); }
  .toolbar { display: flex; align-items: center; gap: 8px; height: var(--header-height, 56px); padding: 0 12px;
             background: var(--app-header-background-color, var(--primary-color)); color: var(--app-header-text-color, #fff);
             border-bottom: var(--app-header-border-bottom, none); box-sizing: border-box; }
  .title { flex: 1; font-size: 20px; margin-left: 4px; }
  .content { max-width: 1200px; margin: 0 auto; padding: 16px; box-sizing: border-box; }
  .controls { display: flex; flex-direction: column; gap: 10px; margin-bottom: 8px; }
  .row { display: flex; flex-wrap: wrap; gap: 10px 18px; align-items: center; }
  .search, select { font: inherit; color: inherit; background: var(--card-background-color); border: 1px solid var(--divider-color);
                    border-radius: 8px; padding: 10px 12px; }
  .search { width: 100%; box-sizing: border-box; font-size: 16px; }
  .cats { display: flex; flex-wrap: wrap; gap: 6px; margin: 4px 0 0; }
  .cat { font: inherit; font-size: 14px; cursor: pointer; display: inline-flex; align-items: center; gap: 6px;
         padding: 6px 12px; border-radius: 16px; border: 1px solid var(--divider-color);
         background: var(--card-background-color); color: var(--primary-text-color); white-space: nowrap; }
  .cat:hover { border-color: var(--primary-color); }
  .cat:focus-visible { outline: 2px solid var(--primary-color); outline-offset: 1px; }
  .cat[aria-pressed="true"] { background: var(--primary-color, #03a9f4); border-color: var(--primary-color, #03a9f4);
                              color: var(--text-primary-color, #fff); }
  .cat .n { font-size: 12px; opacity: .7; }
  /* På mobil blir raden en rad som går att svepa i sidled. */
  :host([narrow]) .cats { flex-wrap: nowrap; overflow-x: auto; scrollbar-width: none; margin: 4px -12px 0;
                          padding: 0 12px 2px; }
  .check { display: flex; align-items: center; gap: 6px; cursor: pointer; }
  .status { color: var(--secondary-text-color); margin: 8px 2px 12px; font-size: 14px; }
  .grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(min(280px, 100%), 1fr)); gap: 12px; }
  .card { all: unset; box-sizing: border-box; cursor: pointer; display: flex; flex-direction: column; gap: 8px; padding: 14px;
          min-width: 0; overflow: hidden;
          background: var(--card-background-color); border-radius: var(--ha-card-border-radius, 12px);
          border: 1px solid var(--divider-color); box-shadow: var(--ha-card-box-shadow, none); min-height: 160px; }
  .card:hover, .card:focus-visible { border-color: var(--primary-color); outline: none; }
  .card-top { display: flex; gap: 6px; flex-wrap: wrap; align-items: center; }
  /* Långa ord och adresser bryts i stället för att gå utanför kortet. */
  .card-title { font-size: 16px; font-weight: 500; line-height: 1.3; overflow-wrap: anywhere;
                display: -webkit-box; -webkit-box-orient: vertical; -webkit-line-clamp: 3; overflow: hidden; }
  .card-desc { color: var(--secondary-text-color); font-size: 14px; line-height: 1.4; flex: 1; overflow-wrap: anywhere;
               display: -webkit-box; -webkit-box-orient: vertical; -webkit-line-clamp: 5; overflow: hidden; }
  .card-meta { display: flex; flex-wrap: wrap; gap: 4px 12px; font-size: 12px; color: var(--secondary-text-color); }
  .card-meta span { overflow-wrap: anywhere; }
  .chip { font-size: 12px; padding: 2px 8px; border-radius: 10px; background: var(--secondary-background-color);
          color: var(--secondary-text-color); }
  .badge { font-size: 12px; padding: 2px 8px; border-radius: 10px; }
  .badge.ok { background: rgba(67,160,71,.15); color: var(--success-color, #43a047); }
  .badge.update { background: rgba(3,169,244,.15); color: var(--info-color, #039be5); }
  .badge.warn { background: rgba(255,152,0,.15); color: var(--warning-color, #ef6c00); }
  .badge.new { background: rgba(156,39,176,.15); color: #8e24aa; }
  .badge.sensitive { background: rgba(219,68,55,.12); color: var(--error-color, #db4437); }
  .spacer { flex: 1; }
  .fav { all: unset; cursor: pointer; font-size: 20px; line-height: 1; padding: 2px 4px; border-radius: 6px;
         color: var(--secondary-text-color); }
  .fav.on { color: #f9a825; }
  .fav:hover, .fav:focus-visible { background: var(--secondary-background-color); }
  .head-btns { display: flex; align-items: center; gap: 4px; }
  .head-btns .fav { font-size: 22px; padding: 6px; }
  .more { text-align: center; margin: 20px 0; }
  .empty { color: var(--secondary-text-color); }
  .btn { font: inherit; cursor: pointer; padding: 8px 14px; border-radius: 8px; border: 1px solid var(--divider-color);
         background: transparent; color: var(--primary-color); text-decoration: none; display: inline-block; }
  .btn.primary { background: var(--primary-color); color: var(--text-primary-color, #fff); border-color: var(--primary-color); }
  .btn:disabled { opacity: .6; cursor: default; }
  .btn.danger { color: var(--error-color, #db4437); }
  .sensitive-box { margin: 12px 0; padding: 4px 12px 8px; border-radius: 8px; background: rgba(219,68,55,.08); }
  .sensitive-box h3 { margin-top: 8px; }
  .sensitive-box ul, .used-by { margin: 0; padding-left: 20px; line-height: 1.7; }
  .used-by a { color: var(--primary-color); }
  .changes { margin: 8px 0; }
  .change { margin: 6px 0; }
  .change.bad strong { color: var(--error-color, #db4437); }
  .warn-box { margin-top: 8px; }
  .diff span { display: block; white-space: pre; }
  .diff .add { background: rgba(67,160,71,.18); }
  .diff .del { background: rgba(219,68,55,.18); }
  .diff .hunk { color: var(--secondary-text-color); }
  .icon-btn { font: inherit; font-size: 20px; background: none; border: none; color: inherit; cursor: pointer; padding: 8px;
              border-radius: 50%; line-height: 1; }
  .dialog { width: min(720px, calc(100vw - 32px)); max-height: calc(100vh - 64px); padding: 0; border: none;
            border-radius: 16px; background: var(--card-background-color); color: var(--primary-text-color);
            overflow: hidden; }
  /* Rubrik och knappar står still, bara mitten scrollar. */
  .dialog[open] { display: flex; flex-direction: column; }
  .dialog::backdrop { background: rgba(0,0,0,.5); }
  .dlg-head { flex: none; display: flex; justify-content: space-between; align-items: flex-start; gap: 8px;
              padding: 20px 20px 12px; border-bottom: 1px solid var(--divider-color); }
  .dlg-head h2 { margin: 8px 0 4px; font-size: 22px; font-weight: 500; }
  .sub { color: var(--secondary-text-color); font-size: 14px; }
  .dlg-body { flex: 1 1 auto; min-height: 0; overflow: auto; padding: 8px 20px 16px; }
  .dlg-body h3 { font-size: 15px; margin: 18px 0 6px; }
  .desc { white-space: pre-line; line-height: 1.5; overflow-wrap: anywhere; }
  .req, .inputs { margin: 0; padding-left: 20px; line-height: 1.7; }
  .req li.ok::marker { content: "✓  "; color: var(--success-color, #43a047); }
  .req li.bad::marker { content: "✗  "; color: var(--error-color, #db4437); }
  .muted { color: var(--secondary-text-color); }
  .notice { margin: 18px 0 8px; padding: 10px 12px; border-radius: 8px; font-size: 14px;
            background: rgba(255,152,0,.12); }
  .yaml { background: var(--code-editor-background-color, var(--secondary-background-color)); padding: 12px; border-radius: 8px;
          overflow: auto; max-height: 320px; font-size: 12px; }
  .status-box { margin: 12px 0 4px; padding: 10px 12px; border-radius: 8px; font-size: 14px; line-height: 1.5; }
  .status-box.ok { background: rgba(67,160,71,.12); }
  .status-box.update { background: rgba(3,169,244,.12); }
  .small { font-size: 12px; margin-top: 2px; overflow-wrap: anywhere; }
  .link-btn { all: unset; cursor: pointer; color: var(--primary-color); text-decoration: underline; }
  .link-btn:disabled { opacity: .6; cursor: default; text-decoration: none; }
  .result p { margin: 10px 0; }
  .result .btn { margin-right: 8px; }
  .success { color: var(--success-color, #43a047); }
  .error { color: var(--error-color, #db4437); }
  .dlg-actions { flex: none; display: flex; flex-wrap: wrap; justify-content: flex-end; gap: 8px;
                 padding: 12px 20px 16px; border-top: 1px solid var(--divider-color); }
  :host([narrow]) .content { padding: 12px; }
`;

customElements.define("blueprint-store-panel", BlueprintStorePanel);
