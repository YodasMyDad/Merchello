import { html as l, css as f, state as n, customElement as v } from "@umbraco-cms/backoffice/external/lit";
import { UmbModalBaseElement as g } from "@umbraco-cms/backoffice/modal";
import { M as m } from "./merchello-api-s-9cx0Ue.js";
var x = Object.defineProperty, b = Object.getOwnPropertyDescriptor, h = (e) => {
  throw TypeError(e);
}, d = (e, t, r, s) => {
  for (var i = s > 1 ? void 0 : s ? b(t, r) : t, c = e.length - 1, o; c >= 0; c--)
    (o = e[c]) && (i = (s ? o(t, r, i) : o(i)) || i);
  return s && i && x(t, r, i), i;
}, _ = (e, t, r) => t.has(e) || h("Cannot " + r), F = (e, t, r) => (_(e, t, "read from private field"), t.get(e)), y = (e, t, r) => t.has(e) ? h("Cannot add the same private member more than once") : t instanceof WeakSet ? t.add(e) : t.set(e, r), p = (e, t, r, s) => (_(e, t, "write to private field"), t.set(e, r), r), u;
let a = class extends g {
  constructor() {
    super(...arguments), this._filterGroups = [], this._selectedFilterIds = [], this._selectedFilterNames = [], this._expandedGroups = /* @__PURE__ */ new Set(), this._isLoading = !0, this._errorMessage = null, y(this, u, !1);
  }
  connectedCallback() {
    super.connectedCallback(), p(this, u, !0), this._loadFilterGroups();
  }
  disconnectedCallback() {
    super.disconnectedCallback(), p(this, u, !1);
  }
  async _loadFilterGroups() {
    this._isLoading = !0, this._errorMessage = null;
    const { data: e, error: t } = await m.getFilterGroups();
    if (!F(this, u)) return;
    if (t) {
      this._errorMessage = t.message, this._isLoading = !1;
      return;
    }
    const r = this.data?.excludeFilterIds ?? [];
    this._filterGroups = (e ?? []).map((s) => ({
      ...s,
      filters: s.filters.filter((i) => !r.includes(i.id))
    })).filter((s) => s.filters.length > 0), this._expandedGroups = new Set(this._filterGroups.map((s) => s.id)), this._isLoading = !1;
  }
  _toggleGroupExpanded(e) {
    const t = new Set(this._expandedGroups);
    t.has(e) ? t.delete(e) : t.add(e), this._expandedGroups = t;
  }
  _toggleFilterSelection(e, t) {
    const r = this.data?.multiSelect !== !1, s = `${e.name}: ${t.name}`;
    if (this._selectedFilterIds.includes(t.id)) {
      const i = this._selectedFilterIds.indexOf(t.id);
      this._selectedFilterIds = this._selectedFilterIds.filter((c, o) => o !== i), this._selectedFilterNames = this._selectedFilterNames.filter((c, o) => o !== i);
    } else
      r ? (this._selectedFilterIds = [...this._selectedFilterIds, t.id], this._selectedFilterNames = [...this._selectedFilterNames, s]) : (this._selectedFilterIds = [t.id], this._selectedFilterNames = [s]);
  }
  _handleSubmit() {
    this.value = {
      selectedFilterIds: this._selectedFilterIds,
      selectedFilterNames: this._selectedFilterNames
    }, this.modalContext?.submit();
  }
  _handleCancel() {
    this.modalContext?.reject();
  }
  _renderColorSwatch(e) {
    return e ? l`
      <span
        class="color-swatch"
        style="background-color: ${e};"
        title="${e}">
      </span>
    ` : null;
  }
  _renderFilterRow(e, t) {
    const r = this._selectedFilterIds.includes(t.id);
    return l`
      <div
        class="filter-row ${r ? "selected" : ""}"
        @click=${() => this._toggleFilterSelection(e, t)}>
        <uui-checkbox
          .checked=${r}
          @change=${(s) => {
      s.stopPropagation(), this._toggleFilterSelection(e, t);
    }}>
        </uui-checkbox>
        <div class="filter-info">
          ${this._renderColorSwatch(t.hexColour)}
          <span class="filter-name">${t.name}</span>
        </div>
        <span class="product-count">${t.productCount} products</span>
      </div>
    `;
  }
  _renderFilterGroup(e) {
    const t = this._expandedGroups.has(e.id), r = e.filters.length, s = e.filters.filter(
      (i) => this._selectedFilterIds.includes(i.id)
    ).length;
    return l`
      <div class="filter-group">
        <div
          class="group-header"
          @click=${() => this._toggleGroupExpanded(e.id)}>
          <uui-symbol-expand ?open=${t}></uui-symbol-expand>
          <span class="group-name">${e.name}</span>
          <span class="group-count">
            ${s > 0 ? l`<strong>${s}/</strong>` : ""}${r} filters
          </span>
        </div>
        ${t ? l`
              <div class="group-filters">
                ${e.filters.map((i) => this._renderFilterRow(e, i))}
              </div>
            ` : null}
      </div>
    `;
  }
  _renderContent() {
    return this._isLoading ? l`<div class="loading"><uui-loader></uui-loader></div>` : this._errorMessage ? l`<div class="error-banner">${this._errorMessage}</div>` : this._filterGroups.length === 0 ? l`<p class="empty-state">No product filters available.</p>` : l`
      <div class="filter-groups">
        ${this._filterGroups.map((e) => this._renderFilterGroup(e))}
      </div>
    `;
  }
  render() {
    const e = this._selectedFilterIds.length;
    return l`
      <umb-body-layout headline="Select Product Filters">
        <div id="main">
          <div class="results-container">${this._renderContent()}</div>
        </div>

        <div slot="actions">
          <uui-button label="Cancel" look="secondary" @click=${this._handleCancel}>
            Cancel
          </uui-button>
          <uui-button
            label="Add Selected"
            look="primary"
            color="positive"
            ?disabled=${e === 0}
            @click=${this._handleSubmit}>
            Add Selected (${e})
          </uui-button>
        </div>
      </umb-body-layout>
    `;
  }
};
u = /* @__PURE__ */ new WeakMap();
a.styles = f`
    :host {
      display: block;
    }

    #main {
      display: flex;
      flex-direction: column;
      gap: var(--uui-size-space-4);
      height: 100%;
    }

    .results-container {
      flex: 1;
      overflow-y: auto;
      min-height: 300px;
    }

    .filter-groups {
      display: flex;
      flex-direction: column;
      gap: var(--uui-size-space-2);
    }

    .filter-group {
      border: 1px solid var(--uui-color-border);
      border-radius: var(--uui-border-radius);
      overflow: hidden;
    }

    .group-header {
      display: flex;
      align-items: center;
      gap: var(--uui-size-space-2);
      padding: var(--uui-size-space-3);
      background: var(--uui-color-surface-alt);
      cursor: pointer;
      user-select: none;
    }

    .group-header:hover {
      background: var(--uui-color-surface-emphasis);
    }

    .group-name {
      font-weight: 600;
      flex: 1;
    }

    .group-count {
      font-size: var(--uui-type-small-size);
      color: var(--uui-color-text-alt);
    }

    .group-filters {
      border-top: 1px solid var(--uui-color-border);
    }

    .filter-row {
      display: flex;
      align-items: center;
      gap: var(--uui-size-space-2);
      padding: var(--uui-size-space-2) var(--uui-size-space-3);
      padding-left: var(--uui-size-space-6);
      cursor: pointer;
      border-bottom: 1px solid var(--uui-color-border-standalone);
    }

    .filter-row:last-child {
      border-bottom: none;
    }

    .filter-row:hover {
      background: var(--uui-color-surface-emphasis);
    }

    .filter-row.selected {
      background: var(--uui-color-selected);
    }

    .filter-info {
      display: flex;
      align-items: center;
      gap: var(--uui-size-space-2);
      flex: 1;
    }

    .filter-name {
      font-weight: 500;
    }

    .color-swatch {
      display: inline-block;
      width: 16px;
      height: 16px;
      border-radius: 2px;
      border: 1px solid var(--uui-color-border);
    }

    .product-count {
      font-size: var(--uui-type-small-size);
      color: var(--uui-color-text-alt);
    }

    .loading {
      display: flex;
      justify-content: center;
      padding: var(--uui-size-space-6);
    }

    .empty-state {
      color: var(--uui-color-text-alt);
      text-align: center;
      padding: var(--uui-size-space-6);
    }

    .error-banner {
      padding: var(--uui-size-space-3);
      background: var(--uui-color-danger-standalone);
      color: var(--uui-color-danger-contrast);
      border-radius: var(--uui-border-radius);
    }

    [slot="actions"] {
      display: flex;
      gap: var(--uui-size-space-2);
      justify-content: flex-end;
    }
  `;
d([
  n()
], a.prototype, "_filterGroups", 2);
d([
  n()
], a.prototype, "_selectedFilterIds", 2);
d([
  n()
], a.prototype, "_selectedFilterNames", 2);
d([
  n()
], a.prototype, "_expandedGroups", 2);
d([
  n()
], a.prototype, "_isLoading", 2);
d([
  n()
], a.prototype, "_errorMessage", 2);
a = d([
  v("merchello-filter-picker-modal")
], a);
const C = a;
export {
  a as MerchelloFilterPickerModalElement,
  C as default
};
//# sourceMappingURL=filter-picker-modal.element-pOV95NvQ.js.map
