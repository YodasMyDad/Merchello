import { html as a, css as _, state as c, customElement as v } from "@umbraco-cms/backoffice/external/lit";
import { UmbModalBaseElement as g } from "@umbraco-cms/backoffice/modal";
import { M as m } from "./merchello-api-BxVn4Zbt.js";
var x = Object.defineProperty, b = Object.getOwnPropertyDescriptor, h = (e) => {
  throw TypeError(e);
}, n = (e, t, r, i) => {
  for (var s = i > 1 ? void 0 : i ? b(t, r) : t, l = e.length - 1, d; l >= 0; l--)
    (d = e[l]) && (s = (i ? d(t, r, s) : d(s)) || s);
  return i && s && x(t, r, s), s;
}, f = (e, t, r) => t.has(e) || h("Cannot " + r), F = (e, t, r) => (f(e, t, "read from private field"), t.get(e)), y = (e, t, r) => t.has(e) ? h("Cannot add the same private member more than once") : t instanceof WeakSet ? t.add(e) : t.set(e, r), p = (e, t, r, i) => (f(e, t, "write to private field"), t.set(e, r), r), u;
let o = class extends g {
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
    const r = this.data?.excludeFilterIds ?? [], i = this.data?.filterGroupId;
    let s = e ?? [];
    i && (s = s.filter((l) => l.id === i)), this._filterGroups = s.map((l) => ({
      ...l,
      filters: l.filters.filter((d) => !r.includes(d.id))
    })).filter((l) => l.filters.length > 0), this._expandedGroups = new Set(this._filterGroups.map((l) => l.id)), this._isLoading = !1;
  }
  _toggleGroupExpanded(e) {
    const t = new Set(this._expandedGroups);
    t.has(e) ? t.delete(e) : t.add(e), this._expandedGroups = t;
  }
  _toggleFilterSelection(e, t) {
    const r = this.data?.multiSelect !== !1, i = `${e.name}: ${t.name}`;
    if (this._selectedFilterIds.includes(t.id)) {
      const s = this._selectedFilterIds.indexOf(t.id);
      this._selectedFilterIds = this._selectedFilterIds.filter((l, d) => d !== s), this._selectedFilterNames = this._selectedFilterNames.filter((l, d) => d !== s);
    } else
      r ? (this._selectedFilterIds = [...this._selectedFilterIds, t.id], this._selectedFilterNames = [...this._selectedFilterNames, i]) : (this._selectedFilterIds = [t.id], this._selectedFilterNames = [i]);
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
    return e ? a`
      <span
        class="color-swatch"
        style="background-color: ${e};"
        title="${e}">
      </span>
    ` : null;
  }
  _renderFilterRow(e, t) {
    const r = this._selectedFilterIds.includes(t.id);
    return a`
      <div
        class="filter-row ${r ? "selected" : ""}"
        @click=${() => this._toggleFilterSelection(e, t)}>
        <uui-checkbox
          .checked=${r}
          @change=${(i) => {
      i.stopPropagation(), this._toggleFilterSelection(e, t);
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
    const t = this._expandedGroups.has(e.id), r = e.filters.length, i = e.filters.filter(
      (s) => this._selectedFilterIds.includes(s.id)
    ).length;
    return a`
      <div class="filter-group">
        <div
          class="group-header"
          @click=${() => this._toggleGroupExpanded(e.id)}>
          <uui-symbol-expand ?open=${t}></uui-symbol-expand>
          <span class="group-name">${e.name}</span>
          <span class="group-count">
            ${i > 0 ? a`<strong>${i}/</strong>` : ""}${r} filters
          </span>
        </div>
        ${t ? a`
              <div class="group-filters">
                ${e.filters.map((s) => this._renderFilterRow(e, s))}
              </div>
            ` : null}
      </div>
    `;
  }
  _renderContent() {
    return this._isLoading ? a`<div class="loading"><uui-loader></uui-loader></div>` : this._errorMessage ? a`<div class="error-banner">${this._errorMessage}</div>` : this._filterGroups.length === 0 ? a`<p class="empty-state">No product filters available.</p>` : a`
      <div class="filter-groups">
        ${this._filterGroups.map((e) => this._renderFilterGroup(e))}
      </div>
    `;
  }
  render() {
    const e = this._selectedFilterIds.length;
    return a`
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
o.styles = _`
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
n([
  c()
], o.prototype, "_filterGroups", 2);
n([
  c()
], o.prototype, "_selectedFilterIds", 2);
n([
  c()
], o.prototype, "_selectedFilterNames", 2);
n([
  c()
], o.prototype, "_expandedGroups", 2);
n([
  c()
], o.prototype, "_isLoading", 2);
n([
  c()
], o.prototype, "_errorMessage", 2);
o = n([
  v("merchello-filter-picker-modal")
], o);
const k = o;
export {
  o as MerchelloFilterPickerModalElement,
  k as default
};
//# sourceMappingURL=filter-picker-modal.element-BNnkiD4u.js.map
