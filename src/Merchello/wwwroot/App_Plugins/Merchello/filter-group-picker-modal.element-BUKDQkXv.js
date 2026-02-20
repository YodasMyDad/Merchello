import { html as l, css as m, state as c, customElement as f } from "@umbraco-cms/backoffice/external/lit";
import { UmbModalBaseElement as g } from "@umbraco-cms/backoffice/modal";
import { M as b } from "./merchello-api-B76CV0sD.js";
import { m as v } from "./modal-layout.styles-C2OaUji5.js";
var y = Object.defineProperty, C = Object.getOwnPropertyDescriptor, h = (t) => {
  throw TypeError(t);
}, o = (t, e, i, r) => {
  for (var s = r > 1 ? void 0 : r ? C(e, i) : e, u = t.length - 1, d; u >= 0; u--)
    (d = t[u]) && (s = (r ? d(e, i, s) : d(s)) || s);
  return r && s && y(e, i, s), s;
}, _ = (t, e, i) => e.has(t) || h("Cannot " + i), S = (t, e, i) => (_(t, e, "read from private field"), e.get(t)), G = (t, e, i) => e.has(t) ? h("Cannot add the same private member more than once") : e instanceof WeakSet ? e.add(t) : e.set(t, i), p = (t, e, i, r) => (_(t, e, "write to private field"), e.set(t, i), i), n;
let a = class extends g {
  constructor() {
    super(...arguments), this._selectedIds = [], this._filterGroups = [], this._isLoading = !0, this._errorMessage = null, this._searchTerm = "", G(this, n, !1);
  }
  connectedCallback() {
    super.connectedCallback(), p(this, n, !0), this._loadFilterGroups();
  }
  disconnectedCallback() {
    super.disconnectedCallback(), p(this, n, !1);
  }
  async _loadFilterGroups() {
    this._isLoading = !0, this._errorMessage = null;
    const { data: t, error: e } = await b.getFilterGroups();
    if (!S(this, n)) return;
    if (e) {
      this._errorMessage = e.message, this._isLoading = !1;
      return;
    }
    const i = this.data?.excludeIds ?? [];
    this._filterGroups = (t ?? []).filter((r) => !i.includes(r.id)), this._selectedIds = this._selectedIds.filter((r) => this._filterGroups.some((s) => s.id === r)), this._isLoading = !1;
  }
  get _isMultiSelect() {
    return this.data?.multiSelect !== !1;
  }
  get _filteredFilterGroups() {
    const t = [...this._filterGroups].sort((i, r) => i.name.localeCompare(r.name)), e = this._searchTerm.trim().toLowerCase();
    return e ? t.filter((i) => i.name.toLowerCase().includes(e)) : t;
  }
  get _tableConfig() {
    return {
      allowSelection: !0
    };
  }
  get _tableColumns() {
    return [
      { name: "Filter Group", alias: "groupName" },
      { name: "Filters", alias: "filterCount", width: "120px", align: "right" }
    ];
  }
  _createTableItems(t) {
    return t.map((e) => ({
      id: e.id,
      icon: "icon-filter",
      data: [
        {
          columnAlias: "groupName",
          value: e.name
        },
        {
          columnAlias: "filterCount",
          value: e.filters?.length ?? 0
        }
      ]
    }));
  }
  _applySelection(t) {
    const e = new Set(this._filterGroups.map((r) => r.id)), i = t.filter((r) => e.has(r));
    this._selectedIds = this._isMultiSelect ? i : i.slice(0, 1);
  }
  _handleTableSelected(t) {
    t.stopPropagation();
    const e = t.target;
    if (this._isMultiSelect) {
      this._applySelection(e.selection);
      return;
    }
    const i = e.selection.find((r) => !this._selectedIds.includes(r));
    if (i) {
      this._applySelection([i]);
      return;
    }
    this._applySelection(e.selection.slice(0, 1));
  }
  _handleTableDeselected(t) {
    t.stopPropagation();
    const e = t.target;
    this._applySelection(e.selection);
  }
  _handleSearchInput(t) {
    this._searchTerm = t.target.value;
  }
  _handleSearchClear() {
    this._searchTerm = "";
  }
  _handleSubmit() {
    const t = new Map(this._filterGroups.map((i) => [i.id, i])), e = this._selectedIds.map((i) => t.get(i)).filter((i) => !!i);
    this.value = {
      selectedIds: e.map((i) => i.id),
      selectedNames: e.map((i) => i.name)
    }, this.modalContext?.submit();
  }
  _handleCancel() {
    this.modalContext?.reject();
  }
  _renderContent() {
    return this._isLoading ? l`<div class="loading"><uui-loader></uui-loader></div>` : this._errorMessage ? l`
        <div class="error-banner" role="alert">
          <uui-icon name="icon-alert"></uui-icon>
          <span>${this._errorMessage}</span>
          <uui-button look="secondary" label="Retry" @click=${() => this._loadFilterGroups()}>
            Retry
          </uui-button>
        </div>
      ` : this._filterGroups.length === 0 ? l`<p class="empty-state">No filter groups available.</p>` : this._filteredFilterGroups.length === 0 ? l`<p class="empty-state">No filter groups match your search.</p>` : l`
      <umb-table
        .config=${this._tableConfig}
        .columns=${this._tableColumns}
        .items=${this._createTableItems(this._filteredFilterGroups)}
        .selection=${this._selectedIds}
        @selected=${this._handleTableSelected}
        @deselected=${this._handleTableDeselected}>
      </umb-table>
    `;
  }
  render() {
    const t = this._selectedIds.length, e = this._isMultiSelect ? `Add Selected (${t})` : "Add Filter Group";
    return l`
      <umb-body-layout headline="Select Filter Groups">
        <div id="main">
          <div class="toolbar">
            <uui-input
              type="search"
              label="Search filter groups"
              placeholder="Search filter groups"
              .value=${this._searchTerm}
              @input=${this._handleSearchInput}>
              <uui-icon name="icon-search" slot="prepend"></uui-icon>
              ${this._searchTerm ? l`
                    <uui-button
                      slot="append"
                      compact
                      look="secondary"
                      label="Clear search"
                      @click=${this._handleSearchClear}>
                      <uui-icon name="icon-wrong"></uui-icon>
                    </uui-button>
                  ` : ""}
            </uui-input>
          </div>
          <div class="results-container">${this._renderContent()}</div>
        </div>

        <uui-button slot="actions" label="Cancel" look="secondary" @click=${this._handleCancel}>
          Cancel
        </uui-button>
        <uui-button
          slot="actions"
          .label=${e}
          look="primary"
          color="positive"
          ?disabled=${t === 0}
          @click=${this._handleSubmit}>
          ${e}
        </uui-button>
      </umb-body-layout>
    `;
  }
};
n = /* @__PURE__ */ new WeakMap();
a.styles = [
  v,
  m`
    :host {
      display: block;
    }

    #main {
      display: flex;
      flex-direction: column;
      gap: var(--uui-size-space-4);
      height: 100%;
    }

    .toolbar uui-input {
      width: 100%;
    }

    .results-container {
      flex: 1;
      overflow-y: auto;
      min-height: 300px;
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
      display: flex;
      align-items: center;
      gap: var(--uui-size-space-3);
      flex-wrap: wrap;
      padding: var(--uui-size-space-4);
      background: var(--uui-color-danger-standalone);
      color: var(--uui-color-danger-contrast);
      border-radius: var(--uui-border-radius);
    }
  `
];
o([
  c()
], a.prototype, "_selectedIds", 2);
o([
  c()
], a.prototype, "_filterGroups", 2);
o([
  c()
], a.prototype, "_isLoading", 2);
o([
  c()
], a.prototype, "_errorMessage", 2);
o([
  c()
], a.prototype, "_searchTerm", 2);
a = o([
  f("merchello-filter-group-picker-modal")
], a);
const x = a;
export {
  a as MerchelloFilterGroupPickerModalElement,
  x as default
};
//# sourceMappingURL=filter-group-picker-modal.element-BUKDQkXv.js.map
