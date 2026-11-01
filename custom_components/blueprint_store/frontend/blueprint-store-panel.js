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

const TRANSLATIONS = {
  en: {
    domains: { automation: "Automation", script: "Script", template: "Template" },
    searchPlaceholder: 'Search, e.g. "motion light" or "zha"',
    refresh: "Download the catalog again",
    allTypes: "All types",
    sortPopular: "Most popular",
    sortRecent: "Recently updated",
    sortName: "Name A–Z",
    onlyFits: "Only show what fits my system",
    onlyInstalled: "Only installed",
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
    reinstall: "Reinstall",
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
    },
  },

  sv: {
    domains: { automation: "Automation", script: "Skript", template: "Mall" },
    searchPlaceholder: 'Sök, t.ex. "rörelse lampa" eller "zha"',
    refresh: "Hämta katalogen igen",
    allTypes: "Alla typer",
    sortPopular: "Populärast",
    sortRecent: "Senast uppdaterade",
    sortName: "Namn A–Ö",
    onlyFits: "Bara sådant som passar mitt system",
    onlyInstalled: "Bara installerade",
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
    reinstall: "Installera om",
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

function firstParagraph(text, max = 180) {
  const plain = String(text || "")
    .replace(/!\[[^\]]*\]\([^)]*\)/g, "")      // markdown images
    .replace(/\[([^\]]+)\]\([^)]*\)/g, "$1")   // markdown links -> text
    .replace(/[#*_`>]/g, "")
    .trim();
  const para = plain.split(/\n\s*\n/)[0].replace(/\s+/g, " ");
  return para.length > max ? para.slice(0, max - 1) + "…" : para;
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
    this._filters = { q: "", domain: "", fits: true, installed: false, sort: "popular" };
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
      const res = await this._hass.callWS({ type: "blueprint_store/list" });
      this._items = res.blueprints || [];
      this._meta = res;
    } catch (err) {
      this._error = this._errorText(err);
    }
    this._loading = false;
    this._renderList();
  }

  _compat(bp) {
    const comps = new Set(this._hass.config.components || []);
    const missing = [...(bp.requires_integrations || []), ...(bp.requires_domains || [])]
      .filter((d) => !comps.has(d));
    const versionOk = versionAtLeast(this._hass.config.version, bp.min_ha_version);
    return { missing, versionOk, ok: versionOk && missing.length === 0 };
  }

  _filtered() {
    const f = this._filters;
    const words = f.q.toLowerCase().split(/\s+/).filter(Boolean);
    const list = this._items.filter((bp) => {
      if (f.domain && bp.domain !== f.domain) return false;
      if (f.installed && !bp.installed) return false;
      if (f.fits && !bp.installed && !this._compat(bp).ok) return false;
      if (!words.length) return true;
      const hay = [
        bp.name, bp.description, bp.topic?.title, bp.author, bp.topic?.poster,
        ...(bp.topic?.tags || []), ...(bp.requires_integrations || []),
      ].join(" ").toLowerCase();
      return words.every((w) => hay.includes(w));
    });
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
          ),
        ),
        (this._status = h("div", { class: "status" })),
        (this._grid = h("div", { class: "grid" })),
        (this._more = h("div", { class: "more" })),
      ),
      (this._dialog = h("dialog", { class: "dialog", onclose: () => (this._dialog.textContent = "") })),
    );
    this._built = true;
    setTimeout(() => search.focus(), 50);
  }

  _renderList() {
    if (!this._built) return;
    const t = this.t;
    this._grid.textContent = "";
    this._more.textContent = "";
    if (this._loading) {
      this._status.textContent = t.loading;
      return;
    }
    if (this._error) {
      this._status.textContent = t.loadFailed(this._error);
      return;
    }
    const list = this._filtered();
    const updated = this._meta.generated_at ? t.catalogUpdated(this._date(this._meta.generated_at)) : "";
    this._status.textContent = t.count(list.length, this._items.length) + updated;
    if (!list.length) {
      this._grid.append(h("p", { class: "empty" }, this._filters.fits ? t.noResultsFits : t.noResults));
      return;
    }
    for (const bp of list.slice(0, this._shown)) this._grid.append(this._card(bp));
    if (list.length > this._shown) {
      this._more.append(h("button", {
        class: "btn", onclick: () => { this._shown += PAGE_SIZE; this._renderList(); },
      }, t.showMore(list.length - this._shown)));
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

  _card(bp) {
    const t = this.t;
    return h("button", { class: "card", onclick: () => this._openDetails(bp) },
      h("div", { class: "card-top" },
        h("span", { class: "chip" }, t.domains[bp.domain] || bp.domain),
        this._badge(bp),
      ),
      h("div", { class: "card-title" }, bp.name || bp.topic?.title || t.untitled),
      h("div", { class: "card-desc" }, firstParagraph(bp.description)),
      h("div", { class: "card-meta" },
        h("span", {}, `♥ ${bp.topic?.likes ?? 0}`),
        h("span", {}, bp.author || bp.topic?.poster || ""),
        h("span", {}, this._date(bp.topic?.bumped_at)),
      ),
    );
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

    const installLabel = bp.update_available ? t.update : bp.installed ? t.reinstall : t.install;
    const installBtn = h("button", {
      class: "btn primary",
      onclick: () => this._install(bp, installBtn, result),
    }, installLabel);

    d.append(
      h("div", { class: "dlg-head" },
        h("div", {},
          h("span", { class: "chip" }, t.domains[bp.domain] || bp.domain),
          h("h2", {}, bp.name || bp.topic?.title || t.untitled),
          h("div", { class: "sub" },
            t.byLine(bp.author || bp.topic?.poster || t.unknownAuthor, bp.topic?.likes ?? 0, this._date(bp.topic?.bumped_at))),
        ),
        h("button", { class: "icon-btn", title: t.close, "aria-label": t.close, onclick: () => d.close() }, "✕"),
      ),
      h("div", { class: "dlg-body" },
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
        h("button", { class: "btn", onclick: (e) => this._preview(bp, yamlBox, e.target) }, t.showCode),
        installBtn,
      ),
    );
    if (bp.installed && bp.installed_path) {
      result.append(h("p", { class: "muted" }, t.installedAs(bp.installed_path)));
    }
    d.showModal();
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
      bp.update_available = false;
      bp.installed_path = `${res.domain}/${res.path}`;
      btn.textContent = t.done;
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
  .check { display: flex; align-items: center; gap: 6px; cursor: pointer; }
  .status { color: var(--secondary-text-color); margin: 8px 2px 12px; font-size: 14px; }
  .grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 12px; }
  .card { all: unset; box-sizing: border-box; cursor: pointer; display: flex; flex-direction: column; gap: 8px; padding: 14px;
          background: var(--card-background-color); border-radius: var(--ha-card-border-radius, 12px);
          border: 1px solid var(--divider-color); box-shadow: var(--ha-card-box-shadow, none); min-height: 160px; }
  .card:hover, .card:focus-visible { border-color: var(--primary-color); }
  .card-top { display: flex; gap: 6px; flex-wrap: wrap; align-items: center; }
  .card-title { font-size: 16px; font-weight: 500; line-height: 1.3; }
  .card-desc { color: var(--secondary-text-color); font-size: 14px; line-height: 1.4; flex: 1; }
  .card-meta { display: flex; gap: 12px; font-size: 12px; color: var(--secondary-text-color); }
  .chip { font-size: 12px; padding: 2px 8px; border-radius: 10px; background: var(--secondary-background-color);
          color: var(--secondary-text-color); }
  .badge { font-size: 12px; padding: 2px 8px; border-radius: 10px; }
  .badge.ok { background: rgba(67,160,71,.15); color: var(--success-color, #43a047); }
  .badge.update { background: rgba(3,169,244,.15); color: var(--info-color, #039be5); }
  .badge.warn { background: rgba(255,152,0,.15); color: var(--warning-color, #ef6c00); }
  .more { text-align: center; margin: 20px 0; }
  .empty { color: var(--secondary-text-color); }
  .btn { font: inherit; cursor: pointer; padding: 8px 14px; border-radius: 8px; border: 1px solid var(--divider-color);
         background: transparent; color: var(--primary-color); text-decoration: none; display: inline-block; }
  .btn.primary { background: var(--primary-color); color: var(--text-primary-color, #fff); border-color: var(--primary-color); }
  .btn:disabled { opacity: .6; cursor: default; }
  .icon-btn { font: inherit; font-size: 20px; background: none; border: none; color: inherit; cursor: pointer; padding: 8px;
              border-radius: 50%; line-height: 1; }
  .dialog { width: min(720px, calc(100vw - 32px)); max-height: calc(100vh - 64px); padding: 0; border: none;
            border-radius: 16px; background: var(--card-background-color); color: var(--primary-text-color); }
  .dialog::backdrop { background: rgba(0,0,0,.5); }
  .dlg-head { display: flex; justify-content: space-between; align-items: flex-start; padding: 20px 20px 0; }
  .dlg-head h2 { margin: 8px 0 4px; font-size: 22px; font-weight: 500; }
  .sub { color: var(--secondary-text-color); font-size: 14px; }
  .dlg-body { padding: 8px 20px; }
  .dlg-body h3 { font-size: 15px; margin: 18px 0 6px; }
  .desc { white-space: pre-line; line-height: 1.5; max-height: 260px; overflow: auto; }
  .req, .inputs { margin: 0; padding-left: 20px; line-height: 1.7; }
  .req li.ok::marker { content: "✓  "; color: var(--success-color, #43a047); }
  .req li.bad::marker { content: "✗  "; color: var(--error-color, #db4437); }
  .muted { color: var(--secondary-text-color); }
  .notice { margin: 18px 0 8px; padding: 10px 12px; border-radius: 8px; font-size: 14px;
            background: rgba(255,152,0,.12); }
  .yaml { background: var(--code-editor-background-color, var(--secondary-background-color)); padding: 12px; border-radius: 8px;
          overflow: auto; max-height: 320px; font-size: 12px; }
  .result p { margin: 10px 0; }
  .result .btn { margin-right: 8px; }
  .success { color: var(--success-color, #43a047); }
  .error { color: var(--error-color, #db4437); }
  .dlg-actions { display: flex; flex-wrap: wrap; justify-content: flex-end; gap: 8px; padding: 12px 20px 20px; }
  :host([narrow]) .content { padding: 12px; }
`;

customElements.define("blueprint-store-panel", BlueprintStorePanel);
