/* Blueprint Store – sidan i Home Assistants sidomeny.
 *
 * Ren JavaScript utan byggsteg. All text från katalogen (som kommer från
 * forumet) sätts med textContent och aldrig som HTML, så att ingen kod
 * från en blueprint-beskrivning kan köras i Home Assistant.
 */

const PAGE_SIZE = 60;
const DOMAINS = { automation: "Automation", script: "Skript", template: "Mall" };

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

function relativeDate(iso) {
  if (!iso) return "";
  const days = Math.floor((Date.now() - new Date(iso).getTime()) / 86400000);
  if (days < 1) return "idag";
  if (days < 2) return "igår";
  if (days < 31) return `${days} dagar sedan`;
  if (days < 365) return `${Math.floor(days / 30)} mån sedan`;
  return `${Math.floor(days / 365)} år sedan`;
}

function firstParagraph(text, max = 180) {
  const plain = String(text || "")
    .replace(/!\[[^\]]*\]\([^)]*\)/g, "")      // markdown-bilder
    .replace(/\[([^\]]+)\]\([^)]*\)/g, "$1")   // markdown-länkar -> text
    .replace(/[#*_`>]/g, "")
    .trim();
  const para = plain.split(/\n\s*\n/)[0].replace(/\s+/g, " ");
  return para.length > max ? para.slice(0, max - 1) + "…" : para;
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
  }

  set hass(hass) {
    const first = !this._hass;
    this._hass = hass;
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
      this._error = err.message || String(err);
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
    let list = this._items.filter((bp) => {
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
    const by = {
      popular: (a, b) => (b.topic?.likes || 0) - (a.topic?.likes || 0),
      recent: (a, b) => String(b.topic?.bumped_at || "").localeCompare(String(a.topic?.bumped_at || "")),
      name: (a, b) => a.name.localeCompare(b.name, "sv"),
    }[f.sort];
    list.sort(by);
    // Uppdateringar först, så de inte missas.
    list.sort((a, b) => Number(!!b.update_available) - Number(!!a.update_available));
    return list;
  }

  // ------------------------------------------------------------- rendering

  _build() {
    const root = this.shadowRoot;
    root.append(h("style", {}, STYLES));

    this._menuButton = document.createElement("ha-menu-button");
    this._menuButton.hass = this._hass;
    this._menuButton.narrow = this._narrow;

    const set = (key) => (e) => {
      this._filters[key] = e.target.type === "checkbox" ? e.target.checked : e.target.value;
      this._shown = PAGE_SIZE;
      this._renderList();
    };

    const search = h("input", {
      type: "search", placeholder: "Sök, t.ex. \"rörelse lampa\" eller \"zha\"",
      oninput: set("q"), class: "search",
    });

    root.append(
      h("header", { class: "toolbar" },
        this._menuButton,
        h("div", { class: "title" }, "Blueprint Store"),
        h("button", { class: "icon-btn", title: "Hämta katalogen igen", onclick: () => this._load(true) }, "⟳"),
      ),
      h("div", { class: "content" },
        h("div", { class: "controls" },
          search,
          h("div", { class: "row" },
            h("select", { onchange: set("domain") },
              h("option", { value: "" }, "Alla typer"),
              ...Object.entries(DOMAINS).map(([v, l]) => h("option", { value: v }, l)),
            ),
            h("select", { onchange: set("sort") },
              h("option", { value: "popular" }, "Populärast"),
              h("option", { value: "recent" }, "Senast uppdaterade"),
              h("option", { value: "name" }, "Namn A–Ö"),
            ),
            h("label", { class: "check" },
              h("input", { type: "checkbox", checked: true, onchange: set("fits") }),
              "Bara sådant som passar mitt system"),
            h("label", { class: "check" },
              h("input", { type: "checkbox", onchange: set("installed") }),
              "Bara installerade"),
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
    this._grid.textContent = "";
    this._more.textContent = "";
    if (this._loading) {
      this._status.textContent = "Hämtar katalogen…";
      return;
    }
    if (this._error) {
      this._status.textContent = `Kunde inte läsa katalogen: ${this._error}`;
      return;
    }
    const list = this._filtered();
    const total = this._items.length;
    const updated = this._meta.generated_at ? ` · katalogen uppdaterad ${relativeDate(this._meta.generated_at)}` : "";
    this._status.textContent = `${list.length} av ${total} blueprints${updated}`;
    if (!list.length) {
      this._grid.append(h("p", { class: "empty" },
        this._filters.fits
          ? "Inga träffar. Testa att bocka ur \"Bara sådant som passar mitt system\"."
          : "Inga träffar."));
      return;
    }
    for (const bp of list.slice(0, this._shown)) this._grid.append(this._card(bp));
    if (list.length > this._shown) {
      this._more.append(h("button", {
        class: "btn", onclick: () => { this._shown += PAGE_SIZE; this._renderList(); },
      }, `Visa fler (${list.length - this._shown} kvar)`));
    }
  }

  _badge(bp) {
    if (bp.update_available) return h("span", { class: "badge update" }, "Uppdatering finns");
    if (bp.installed) return h("span", { class: "badge ok" }, "Installerad");
    const c = this._compat(bp);
    if (!c.versionOk) return h("span", { class: "badge warn" }, `Kräver HA ${bp.min_ha_version}`);
    if (c.missing.length) return h("span", { class: "badge warn" }, `Saknar ${c.missing.join(", ")}`);
    return null;
  }

  _card(bp) {
    return h("button", { class: "card", onclick: () => this._openDetails(bp) },
      h("div", { class: "card-top" },
        h("span", { class: "chip" }, DOMAINS[bp.domain] || bp.domain),
        this._badge(bp),
      ),
      h("div", { class: "card-title" }, bp.name || bp.topic?.title || "Namnlös"),
      h("div", { class: "card-desc" }, firstParagraph(bp.description)),
      h("div", { class: "card-meta" },
        h("span", {}, `♥ ${bp.topic?.likes ?? 0}`),
        h("span", {}, bp.author || bp.topic?.poster || ""),
        h("span", {}, relativeDate(bp.topic?.bumped_at)),
      ),
    );
  }

  _openDetails(bp) {
    const d = this._dialog;
    d.textContent = "";
    const c = this._compat(bp);
    const result = h("div", { class: "result" });
    const yamlBox = h("div");

    const reqList = [...(bp.requires_integrations || []), ...(bp.requires_domains || [])];
    const comps = new Set(this._hass.config.components || []);

    const installLabel = bp.update_available ? "Uppdatera" : bp.installed ? "Installera om" : "Installera";
    const installBtn = h("button", {
      class: "btn primary",
      onclick: () => this._install(bp, installBtn, result),
    }, installLabel);

    d.append(
      h("div", { class: "dlg-head" },
        h("div", {},
          h("span", { class: "chip" }, DOMAINS[bp.domain] || bp.domain),
          h("h2", {}, bp.name),
          h("div", { class: "sub" },
            `av ${bp.author || bp.topic?.poster || "okänd"} · ♥ ${bp.topic?.likes ?? 0} · uppdaterad ${relativeDate(bp.topic?.bumped_at)}`),
        ),
        h("button", { class: "icon-btn", title: "Stäng", onclick: () => d.close() }, "✕"),
      ),
      h("div", { class: "dlg-body" },
        h("p", { class: "desc" }, bp.description || "Ingen beskrivning."),

        h("h3", {}, "Krav"),
        h("ul", { class: "req" },
          h("li", { class: c.versionOk ? "ok" : "bad" },
            `Home Assistant ${bp.min_ha_version || "(ingen gräns)"}`,
            c.versionOk ? "" : ` – du har ${this._hass.config.version}`),
          ...reqList.map((r) => h("li", { class: comps.has(r) ? "ok" : "bad" }, r,
            comps.has(r) ? "" : " – inte installerad")),
        ),

        bp.inputs?.length ? h("h3", {}, "Det här får du ställa in") : null,
        bp.inputs?.length ? h("ul", { class: "inputs" },
          ...bp.inputs.map((i) => h("li", {}, i.name || i.key, i.required ? "" : h("span", { class: "muted" }, " (valfri)")))) : null,

        h("div", { class: "notice" },
          "Blueprints skrivs av communityn och kan styra dina enheter. Läs gärna koden innan du installerar."),
        yamlBox,
        result,
      ),
      h("div", { class: "dlg-actions" },
        h("a", { class: "btn", href: bp.topic?.url, target: "_blank", rel: "noopener noreferrer" }, "Öppna forumtråden"),
        h("button", { class: "btn", onclick: (e) => this._preview(bp, yamlBox, e.target) }, "Visa koden"),
        installBtn,
      ),
    );
    if (bp.installed && bp.installed_path) {
      result.append(h("p", { class: "muted" }, `Installerad som ${bp.installed_path}`));
    }
    d.showModal();
  }

  async _preview(bp, box, btn) {
    btn.disabled = true;
    box.textContent = "Hämtar…";
    try {
      const res = await this._hass.callWS({ type: "blueprint_store/preview", source_url: bp.source_url });
      box.textContent = "";
      box.append(h("pre", { class: "yaml" }, res.yaml));
    } catch (err) {
      box.textContent = `Kunde inte hämta koden: ${err.message || err}`;
      btn.disabled = false;
    }
  }

  async _install(bp, btn, result) {
    btn.disabled = true;
    const old = btn.textContent;
    btn.textContent = "Installerar…";
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
      btn.textContent = "Klar ✓";
      const target = { automation: "/config/automation/dashboard", script: "/config/script/dashboard" }[res.domain]
        || "/config/blueprint/dashboard";
      result.append(
        h("p", { class: "success" }, `Installerad! Nu kan du skapa en ${DOMAINS[res.domain]?.toLowerCase() || "automation"} från den.`),
        h("button", { class: "btn primary", onclick: () => this._navigate("/config/blueprint/dashboard") }, "Gå till blueprints"),
        target !== "/config/blueprint/dashboard"
          ? h("button", { class: "btn", onclick: () => this._navigate(target) }, `Gå till ${DOMAINS[res.domain]?.toLowerCase()}er`)
          : null,
      );
      this._renderList();
    } catch (err) {
      btn.disabled = false;
      btn.textContent = old;
      result.append(h("p", { class: "error" }, `Det gick inte: ${err.message || err}`));
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
