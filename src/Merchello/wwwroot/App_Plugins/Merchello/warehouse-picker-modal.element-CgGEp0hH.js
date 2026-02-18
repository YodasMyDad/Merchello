import { html as l, css as m, state as u, customElement as g } from "@umbraco-cms/backoffice/external/lit";
import { UmbModalBaseElement as b } from "@umbraco-cms/backoffice/modal";
import { M as v } from "./merchello-api-Dp_zU_yi.js";
var f = Object.defineProperty, y = Object.getOwnPropertyDescriptor, p = (t) => {
  throw TypeError(t);
}, o = (t, e, s, a) => {
  for (var r = a > 1 ? void 0 : a ? y(e, s) : e, c = t.length - 1, d; c >= 0; c--)
    (d = t[c]) && (r = (a ? d(e, s, r) : d(r)) || r);
  return a && r && f(e, s, r), r;
}, _ = (t, e, s) => e.has(t) || p("Cannot " + s), C = (t, e, s) => (_(t, e, "read from private field"), e.get(t)), w = (t, e, s) => e.has(t) ? p("Cannot add the same private member more than once") : e instanceof WeakSet ? e.add(t) : e.set(t, s), h = (t, e, s, a) => (_(t, e, "write to private field"), e.set(t, s), s), n;
let i = class extends b {
  constructor() {
    super(...arguments), this._selectedIds = [], this._warehouses = [], this._isLoading = !0, this._errorMessage = null, this._searchTerm = "", w(this, n, !1);
  }
  connectedCallback() {
    super.connectedCallback(), h(this, n, !0), this._loadWarehouses();
  }
  disconnectedCallback() {
    super.disconnectedCallback(), h(this, n, !1);
  }
  async _loadWarehouses() {
    this._isLoading = !0, this._errorMessage = null;
    const { data: t, error: e } = await v.getWarehousesList();
    if (!C(this, n)) return;
    if (e) {
      this._errorMessage = e.message, this._isLoading = !1;
      return;
    }
    const s = this.data?.excludeIds ?? [];
    this._warehouses = (t ?? []).filter((a) => !s.includes(a.id)), this._isLoading = !1;
  }
  get _isMultiSelect() {
    return this.data?.multiSelect !== !1;
  }
  get _sortedWarehouses() {
    return [...this._warehouses].sort((t, e) => (t.name ?? "").localeCompare(e.name ?? ""));
  }
  get _filteredWarehouses() {
    const t = this._searchTerm.trim().toLowerCase();
    return t ? this._sortedWarehouses.filter(
      (e) => [e.name ?? "", e.code ?? "", e.supplierName ?? ""].some(
        (s) => s.toLowerCase().includes(t)
      )
    ) : this._sortedWarehouses;
  }
  get _tableConfig() {
    return {
      allowSelection: !0
    };
  }
  get _tableColumns() {
    return [
      { name: "Warehouse", alias: "warehouseName" },
      { name: "Code", alias: "warehouseCode", width: "150px" },
      { name: "Supplier", alias: "supplierName", width: "220px" },
      { name: "Regions", alias: "serviceRegionCount", width: "110px", align: "right" },
      { name: "Options", alias: "shippingOptionCount", width: "110px", align: "right" }
    ];
  }
  _createTableItems(t) {
    return t.map((e) => ({
      id: e.id,
      icon: "icon-box",
      data: [
        {
          columnAlias: "warehouseName",
          value: e.name ?? "Unnamed Warehouse"
        },
        {
          columnAlias: "warehouseCode",
          value: e.code ?? "-"
        },
        {
          columnAlias: "supplierName",
          value: e.supplierName ?? "-"
        },
        {
          columnAlias: "serviceRegionCount",
          value: e.serviceRegionCount
        },
        {
          columnAlias: "shippingOptionCount",
          value: e.shippingOptionCount
        }
      ]
    }));
  }
  _applySelection(t) {
    const e = new Set(this._warehouses.map((a) => a.id)), s = t.filter((a) => e.has(a));
    this._selectedIds = this._isMultiSelect ? s : s.slice(0, 1);
  }
  _handleTableSelected(t) {
    t.stopPropagation();
    const e = t.target;
    if (this._isMultiSelect) {
      this._applySelection(e.selection);
      return;
    }
    const s = e.selection.find((a) => !this._selectedIds.includes(a));
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
    const t = new Map(this._warehouses.map((s) => [s.id, s])), e = this._selectedIds.map((s) => t.get(s)).filter((s) => !!s);
    this.value = {
      selectedIds: e.map((s) => s.id),
      selectedNames: e.map((s) => s.name ?? "Unnamed Warehouse")
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
          <uui-button look="secondary" label="Retry loading warehouses" @click=${() => this._loadWarehouses()}>
            Retry
          </uui-button>
        </div>
      ` : this._warehouses.length === 0 ? l`<p class="empty-state">No warehouses available.</p>` : this._filteredWarehouses.length === 0 ? l`<p class="empty-state">No warehouses match your search.</p>` : l`
      <umb-table
        .config=${this._tableConfig}
        .columns=${this._tableColumns}
        .items=${this._createTableItems(this._filteredWarehouses)}
        .selection=${this._selectedIds}
        @selected=${this._handleTableSelected}
        @deselected=${this._handleTableDeselected}>
      </umb-table>
    `;
  }
  render() {
    const t = this._selectedIds.length, e = this._isMultiSelect ? `Add Selected (${t})` : "Add Warehouse";
    return l`
      <umb-body-layout headline="Select Warehouses">
        <div id="main">
          <div class="toolbar">
            <uui-input
              type="search"
              label="Search warehouses"
              placeholder="Search by warehouse name, code, or supplier"
              .value=${this._searchTerm}
              @input=${this._handleSearchInput}>
              <uui-icon name="icon-search" slot="prepend"></uui-icon>
              ${this._searchTerm ? l`
                    <uui-button
                      slot="append"
                      compact
                      look="secondary"
                      label="Clear warehouse search"
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
i.styles = m`
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
      flex-wrap: wrap;
      gap: var(--uui-size-space-3);
      padding: var(--uui-size-space-3);
      background: var(--uui-color-danger-standalone);
      color: var(--uui-color-danger-contrast);
      border-radius: var(--uui-border-radius);
    }
  `;
o([
  u()
], i.prototype, "_selectedIds", 2);
o([
  u()
], i.prototype, "_warehouses", 2);
o([
  u()
], i.prototype, "_isLoading", 2);
o([
  u()
], i.prototype, "_errorMessage", 2);
o([
  u()
], i.prototype, "_searchTerm", 2);
i = o([
  g("merchello-warehouse-picker-modal")
], i);
const M = i;
export {
  i as MerchelloWarehousePickerModalElement,
  M as default
};
//# sourceMappingURL=warehouse-picker-modal.element-CgGEp0hH.js.map
