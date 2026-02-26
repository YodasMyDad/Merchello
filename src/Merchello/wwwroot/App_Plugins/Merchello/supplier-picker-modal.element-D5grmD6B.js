import { html as r, css as m, state as u, customElement as g } from "@umbraco-cms/backoffice/external/lit";
import { UmbModalBaseElement as b } from "@umbraco-cms/backoffice/modal";
import { M as f } from "./merchello-api-NdGX4WPd.js";
import { m as S } from "./modal-layout.styles-C2OaUji5.js";
var v = Object.defineProperty, y = Object.getOwnPropertyDescriptor, h = (t) => {
  throw TypeError(t);
}, o = (t, e, s, i) => {
  for (var l = i > 1 ? void 0 : i ? y(e, s) : e, c = t.length - 1, d; c >= 0; c--)
    (d = t[c]) && (l = (i ? d(e, s, l) : d(l)) || l);
  return i && l && v(e, s, l), l;
}, _ = (t, e, s) => e.has(t) || h("Cannot " + s), C = (t, e, s) => (_(t, e, "read from private field"), e.get(t)), w = (t, e, s) => e.has(t) ? h("Cannot add the same private member more than once") : e instanceof WeakSet ? e.add(t) : e.set(t, s), p = (t, e, s, i) => (_(t, e, "write to private field"), e.set(t, s), s), n;
let a = class extends b {
  constructor() {
    super(...arguments), this._selectedIds = [], this._suppliers = [], this._isLoading = !0, this._errorMessage = null, this._searchTerm = "", w(this, n, !1);
  }
  connectedCallback() {
    super.connectedCallback(), p(this, n, !0), this._loadSuppliers();
  }
  disconnectedCallback() {
    super.disconnectedCallback(), p(this, n, !1);
  }
  async _loadSuppliers() {
    this._isLoading = !0, this._errorMessage = null;
    const { data: t, error: e } = await f.getSuppliers();
    if (!C(this, n)) return;
    if (e) {
      this._errorMessage = e.message, this._isLoading = !1;
      return;
    }
    const s = this.data?.excludeIds ?? [];
    this._suppliers = (t ?? []).filter((i) => !s.includes(i.id)), this._isLoading = !1;
  }
  get _isMultiSelect() {
    return this.data?.multiSelect !== !1;
  }
  get _sortedSuppliers() {
    return [...this._suppliers].sort((t, e) => t.name.localeCompare(e.name));
  }
  get _filteredSuppliers() {
    const t = this._searchTerm.trim().toLowerCase();
    return t ? this._sortedSuppliers.filter(
      (e) => [e.name, e.code ?? ""].some(
        (s) => s.toLowerCase().includes(t)
      )
    ) : this._sortedSuppliers;
  }
  get _tableConfig() {
    return {
      allowSelection: !0
    };
  }
  get _tableColumns() {
    return [
      { name: "Supplier", alias: "supplierName" },
      { name: "Code", alias: "supplierCode", width: "180px" },
      { name: "Warehouses", alias: "warehouseCount", width: "130px", align: "right" }
    ];
  }
  _createTableItems(t) {
    return t.map((e) => ({
      id: e.id,
      icon: "icon-truck",
      data: [
        {
          columnAlias: "supplierName",
          value: e.name
        },
        {
          columnAlias: "supplierCode",
          value: e.code ?? "-"
        },
        {
          columnAlias: "warehouseCount",
          value: e.warehouseCount
        }
      ]
    }));
  }
  _applySelection(t) {
    const e = new Set(this._suppliers.map((i) => i.id)), s = t.filter((i) => e.has(i));
    this._selectedIds = this._isMultiSelect ? s : s.slice(0, 1);
  }
  _handleTableSelected(t) {
    t.stopPropagation();
    const e = t.target;
    if (this._isMultiSelect) {
      this._applySelection(e.selection);
      return;
    }
    const s = e.selection.find((i) => !this._selectedIds.includes(i));
    if (s) {
      this._applySelection([s]);
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
    const t = new Map(this._suppliers.map((s) => [s.id, s])), e = this._selectedIds.map((s) => t.get(s)).filter((s) => !!s);
    this.value = {
      selectedIds: e.map((s) => s.id),
      selectedNames: e.map((s) => s.name)
    }, this.modalContext?.submit();
  }
  _handleCancel() {
    this.modalContext?.reject();
  }
  _renderContent() {
    return this._isLoading ? r`<div class="loading"><uui-loader></uui-loader></div>` : this._errorMessage ? r`
        <div class="error-banner" role="alert">
          <uui-icon name="icon-alert"></uui-icon>
          <span>${this._errorMessage}</span>
          <uui-button look="secondary" label="Retry loading suppliers" @click=${() => this._loadSuppliers()}>
            Retry
          </uui-button>
        </div>
      ` : this._suppliers.length === 0 ? r`<p class="empty-state">No suppliers available.</p>` : this._filteredSuppliers.length === 0 ? r`<p class="empty-state">No suppliers match your search.</p>` : r`
      <umb-table
        .config=${this._tableConfig}
        .columns=${this._tableColumns}
        .items=${this._createTableItems(this._filteredSuppliers)}
        .selection=${this._selectedIds}
        @selected=${this._handleTableSelected}
        @deselected=${this._handleTableDeselected}>
      </umb-table>
    `;
  }
  render() {
    const t = this._selectedIds.length, e = this._isMultiSelect ? `Add Selected (${t})` : "Add Supplier";
    return r`
      <umb-body-layout headline="Select Suppliers">
        <div id="main">
          <div class="toolbar">
            <uui-input
              type="search"
              label="Search suppliers"
              placeholder="Search by supplier name or code"
              .value=${this._searchTerm}
              @input=${this._handleSearchInput}>
              <uui-icon name="icon-search" slot="prepend"></uui-icon>
              ${this._searchTerm ? r`
                    <uui-button
                      slot="append"
                      compact
                      look="secondary"
                      label="Clear supplier search"
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
  S,
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

    .toolbar uui-icon[slot="prepend"] {
      margin-left: 2px;
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
      flex-wrap: wrap;
      gap: var(--uui-size-space-3);
      padding: var(--uui-size-space-3);
      background: var(--uui-color-danger-standalone);
      color: var(--uui-color-danger-contrast);
      border-radius: var(--uui-border-radius);
    }
  `
];
o([
  u()
], a.prototype, "_selectedIds", 2);
o([
  u()
], a.prototype, "_suppliers", 2);
o([
  u()
], a.prototype, "_isLoading", 2);
o([
  u()
], a.prototype, "_errorMessage", 2);
o([
  u()
], a.prototype, "_searchTerm", 2);
a = o([
  g("merchello-supplier-picker-modal")
], a);
const k = a;
export {
  a as MerchelloSupplierPickerModalElement,
  k as default
};
//# sourceMappingURL=supplier-picker-modal.element-D5grmD6B.js.map
