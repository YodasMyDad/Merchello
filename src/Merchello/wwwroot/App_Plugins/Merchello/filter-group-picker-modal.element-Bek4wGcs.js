import { html as r, css as f, state as d, customElement as g } from "@umbraco-cms/backoffice/external/lit";
import { UmbModalBaseElement as b } from "@umbraco-cms/backoffice/modal";
import { M as m } from "./merchello-api-BuImeZL2.js";
var v = Object.defineProperty, y = Object.getOwnPropertyDescriptor, p = (e) => {
  throw TypeError(e);
}, o = (e, t, s, l) => {
  for (var i = l > 1 ? void 0 : l ? y(t, s) : t, u = e.length - 1, n; u >= 0; u--)
    (n = e[u]) && (i = (l ? n(t, s, i) : n(i)) || i);
  return l && i && v(t, s, i), i;
}, _ = (e, t, s) => t.has(e) || p("Cannot " + s), x = (e, t, s) => (_(e, t, "read from private field"), t.get(e)), w = (e, t, s) => t.has(e) ? p("Cannot add the same private member more than once") : t instanceof WeakSet ? t.add(e) : t.set(e, s), h = (e, t, s, l) => (_(e, t, "write to private field"), t.set(e, s), s), c;
let a = class extends b {
  constructor() {
    super(...arguments), this._selectedIds = [], this._selectedNames = [], this._filterGroups = [], this._isLoading = !0, this._errorMessage = null, w(this, c, !1);
  }
  connectedCallback() {
    super.connectedCallback(), h(this, c, !0), this._loadFilterGroups();
  }
  disconnectedCallback() {
    super.disconnectedCallback(), h(this, c, !1);
  }
  async _loadFilterGroups() {
    this._isLoading = !0, this._errorMessage = null;
    const { data: e, error: t } = await m.getFilterGroups();
    if (!x(this, c)) return;
    if (t) {
      this._errorMessage = t.message, this._isLoading = !1;
      return;
    }
    const s = this.data?.excludeIds ?? [];
    this._filterGroups = (e ?? []).filter((l) => !s.includes(l.id)), this._isLoading = !1;
  }
  _toggleSelection(e) {
    const t = this.data?.multiSelect !== !1;
    if (this._selectedIds.includes(e.id)) {
      const s = this._selectedIds.indexOf(e.id);
      this._selectedIds = this._selectedIds.filter((l, i) => i !== s), this._selectedNames = this._selectedNames.filter((l, i) => i !== s);
    } else
      t ? (this._selectedIds = [...this._selectedIds, e.id], this._selectedNames = [...this._selectedNames, e.name]) : (this._selectedIds = [e.id], this._selectedNames = [e.name]);
  }
  _handleSubmit() {
    this.value = {
      selectedIds: this._selectedIds,
      selectedNames: this._selectedNames
    }, this.modalContext?.submit();
  }
  _handleCancel() {
    this.modalContext?.reject();
  }
  _renderFilterGroupRow(e) {
    const t = this._selectedIds.includes(e.id), s = e.filters?.length ?? 0;
    return r`
      <uui-table-row
        selectable
        ?selected=${t}
        @click=${() => this._toggleSelection(e)}>
        <uui-table-cell style="width: 40px;">
          <uui-checkbox
            aria-label="Select ${e.name}"
            .checked=${t}
            @change=${(l) => {
      l.stopPropagation(), this._toggleSelection(e);
    }}>
          </uui-checkbox>
        </uui-table-cell>
        <uui-table-cell>
          <div class="group-info">
            <uui-icon name="icon-filter"></uui-icon>
            <span class="group-name">${e.name}</span>
          </div>
        </uui-table-cell>
        <uui-table-cell class="filter-count">${s} filter${s !== 1 ? "s" : ""}</uui-table-cell>
      </uui-table-row>
    `;
  }
  _renderContent() {
    return this._isLoading ? r`<div class="loading"><uui-loader></uui-loader></div>` : this._errorMessage ? r`<div class="error-banner">${this._errorMessage}</div>` : this._filterGroups.length === 0 ? r`<p class="empty-state">No filter groups available.</p>` : r`
      <uui-table class="groups-table">
        <uui-table-head>
          <uui-table-head-cell style="width: 40px;"></uui-table-head-cell>
          <uui-table-head-cell>Name</uui-table-head-cell>
          <uui-table-head-cell>Filters</uui-table-head-cell>
        </uui-table-head>
        ${this._filterGroups.map((e) => this._renderFilterGroupRow(e))}
      </uui-table>
    `;
  }
  render() {
    const e = this._selectedIds.length;
    return r`
      <umb-body-layout headline="Select Filter Groups">
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
c = /* @__PURE__ */ new WeakMap();
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

    .groups-table {
      width: 100%;
    }

    uui-table-row[selectable] {
      cursor: pointer;
    }

    uui-table-row[selected] {
      background: var(--uui-color-selected);
      color: var(--uui-color-selected-contrast, #fff);
      font-weight: 600;
    }

    uui-table-row[selected] uui-icon {
      color: var(--uui-color-selected-contrast, #fff);
    }

    .group-info {
      display: flex;
      align-items: center;
      gap: var(--uui-size-space-2);
    }

    .group-name {
      font-weight: 500;
    }

    .filter-count {
      color: var(--uui-color-text-alt);
      font-size: var(--uui-type-small-size);
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
o([
  d()
], a.prototype, "_selectedIds", 2);
o([
  d()
], a.prototype, "_selectedNames", 2);
o([
  d()
], a.prototype, "_filterGroups", 2);
o([
  d()
], a.prototype, "_isLoading", 2);
o([
  d()
], a.prototype, "_errorMessage", 2);
a = o([
  g("merchello-filter-group-picker-modal")
], a);
const $ = a;
export {
  a as MerchelloFilterGroupPickerModalElement,
  $ as default
};
//# sourceMappingURL=filter-group-picker-modal.element-Bek4wGcs.js.map
