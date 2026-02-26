import { LitElement as w, html as s, nothing as g, css as k, state as d, customElement as x } from "@umbraco-cms/backoffice/external/lit";
import { UmbElementMixin as C } from "@umbraco-cms/backoffice/element-api";
import { UMB_MODAL_MANAGER_CONTEXT as $, UMB_CONFIRM_MODAL as M } from "@umbraco-cms/backoffice/modal";
import { UMB_NOTIFICATION_CONTEXT as L } from "@umbraco-cms/backoffice/notification";
import { M as f } from "./merchello-api-NdGX4WPd.js";
import { M as v } from "./supplier-modal.token-CWeQ_zlc.js";
import "./merchello-empty-state.element-D2dcD7_8.js";
import { c as E } from "./collection-layout.styles-I8XQedsa.js";
var D = Object.defineProperty, T = Object.getOwnPropertyDescriptor, y = (e) => {
  throw TypeError(e);
}, c = (e, t, i, a) => {
  for (var n = a > 1 ? void 0 : a ? T(t, i) : t, m = e.length - 1, _; m >= 0; m--)
    (_ = e[m]) && (n = (a ? _(t, i, n) : _(n)) || n);
  return a && n && D(t, i, n), n;
}, S = (e, t, i) => t.has(e) || y("Cannot " + i), r = (e, t, i) => (S(e, t, "read from private field"), t.get(e)), b = (e, t, i) => t.has(e) ? y("Cannot add the same private member more than once") : t instanceof WeakSet ? t.add(e) : t.set(e, i), h = (e, t, i, a) => (S(e, t, "write to private field"), t.set(e, i), i), u, p, l;
let o = class extends C(w) {
  constructor() {
    super(), this._suppliers = [], this._isLoading = !0, this._errorMessage = null, this._isDeleting = null, this._searchTerm = "", b(this, u), b(this, p), b(this, l, !1), this.consumeContext($, (e) => {
      h(this, u, e);
    }), this.consumeContext(L, (e) => {
      h(this, p, e);
    });
  }
  connectedCallback() {
    super.connectedCallback(), h(this, l, !0), this._loadSuppliers();
  }
  disconnectedCallback() {
    super.disconnectedCallback(), h(this, l, !1);
  }
  async _loadSuppliers() {
    this._isLoading = !0, this._errorMessage = null;
    const { data: e, error: t } = await f.getSuppliers();
    if (r(this, l)) {
      if (t) {
        this._errorMessage = t.message, this._isLoading = !1;
        return;
      }
      e && (this._suppliers = e), this._isLoading = !1;
    }
  }
  async _handleAddSupplier() {
    const t = await r(this, u)?.open(this, v, {
      data: {}
    })?.onSubmit().catch(() => {
    });
    r(this, l) && t?.isCreated && this._loadSuppliers();
  }
  async _handleEditSupplier(e) {
    const i = await r(this, u)?.open(this, v, {
      data: { supplier: e }
    })?.onSubmit().catch(() => {
    });
    r(this, l) && i?.isUpdated && this._loadSuppliers();
  }
  async _handleDelete(e, t) {
    e.preventDefault(), e.stopPropagation();
    const i = r(this, u)?.open(this, M, {
      data: {
        headline: "Delete Supplier",
        content: `Deleting "${t.name}" removes its association from linked warehouses.`,
        confirmLabel: "Delete",
        color: "danger"
      }
    });
    try {
      await i?.onSubmit();
    } catch {
      return;
    }
    if (!r(this, l)) return;
    this._isDeleting = t.id;
    const { error: a } = await f.deleteSupplier(t.id);
    if (r(this, l)) {
      if (this._isDeleting = null, a) {
        this._errorMessage = `Failed to delete supplier: ${a.message}`, r(this, p)?.peek("danger", {
          data: { headline: "Failed to delete", message: a.message || "Could not delete supplier" }
        });
        return;
      }
      r(this, p)?.peek("positive", {
        data: { headline: "Supplier deleted", message: "The supplier has been deleted successfully" }
      }), this._loadSuppliers();
    }
  }
  get _sortedSuppliers() {
    return [...this._suppliers].sort((e, t) => e.name.localeCompare(t.name));
  }
  get _filteredSuppliers() {
    const e = this._searchTerm.trim().toLowerCase();
    return e ? this._sortedSuppliers.filter(
      (t) => [t.name, t.code ?? ""].some(
        (i) => i.toLowerCase().includes(e)
      )
    ) : this._sortedSuppliers;
  }
  _handleSearchInput(e) {
    this._searchTerm = e.target.value;
  }
  _handleSearchClear() {
    this._searchTerm = "";
  }
  _handleRowKeydown(e, t) {
    e.key !== "Enter" && e.key !== " " || (e.preventDefault(), this._handleEditSupplier(t));
  }
  _renderLoadingState() {
    return s`<div class="loading"><uui-loader></uui-loader></div>`;
  }
  _renderErrorState() {
    return s`
      <div class="error-banner" role="alert">
        <uui-icon name="icon-alert"></uui-icon>
        <span>${this._errorMessage}</span>
        <uui-button look="secondary" label="Retry loading suppliers" @click=${() => this._loadSuppliers()}>
          Retry
        </uui-button>
      </div>
    `;
  }
  _renderEmptyState() {
    return s`
      <merchello-empty-state
        icon="icon-truck"
        headline="No suppliers configured"
        message="Add suppliers to track where your inventory comes from and link them to warehouses.">
      </merchello-empty-state>
      <div class="empty-action">
        <uui-button
          look="primary"
          color="positive"
          label="Add Supplier"
          @click=${this._handleAddSupplier}>
          Add Supplier
        </uui-button>
      </div>
    `;
  }
  _renderNoSearchResultsState() {
    return s`
      <p class="empty-state">
        No suppliers match
        <strong>${this._searchTerm.trim()}</strong>.
      </p>
    `;
  }
  _renderSupplierRow(e) {
    const t = this._isDeleting === e.id;
    return s`
      <uui-table-row
        class="clickable"
        tabindex="0"
        @click=${() => this._handleEditSupplier(e)}
        @keydown=${(i) => this._handleRowKeydown(i, e)}>
        <uui-table-cell>
          <div class="supplier-info">
            <span class="supplier-name">${e.name}</span>
            ${e.code ? s`<span class="supplier-code">${e.code}</span>` : g}
          </div>
        </uui-table-cell>
        <uui-table-cell>${e.warehouseCount}</uui-table-cell>
        <uui-table-cell>
          <div class="actions-cell">
            <uui-button
              look="secondary"
              compact
              label="Edit"
              @click=${(i) => {
      i.stopPropagation(), this._handleEditSupplier(e);
    }}>
              <uui-icon name="icon-edit"></uui-icon>
            </uui-button>
            <uui-button
              look="primary"
              color="danger"
              compact
              label="Delete"
              ?disabled=${t}
              @click=${(i) => this._handleDelete(i, e)}>
              <uui-icon name="${t ? "icon-hourglass" : "icon-trash"}"></uui-icon>
            </uui-button>
          </div>
        </uui-table-cell>
      </uui-table-row>
    `;
  }
  _renderSuppliersTable() {
    return s`
      <div class="table-container">
        <uui-table class="supplier-table">
          <uui-table-head>
            <uui-table-head-cell>Supplier</uui-table-head-cell>
            <uui-table-head-cell>Warehouses</uui-table-head-cell>
            <uui-table-head-cell class="actions-header">Actions</uui-table-head-cell>
          </uui-table-head>
          ${this._filteredSuppliers.map((e) => this._renderSupplierRow(e))}
        </uui-table>
      </div>
    `;
  }
  _renderContent() {
    return this._isLoading ? this._renderLoadingState() : this._errorMessage ? this._renderErrorState() : this._suppliers.length === 0 ? this._renderEmptyState() : this._filteredSuppliers.length === 0 ? this._renderNoSearchResultsState() : this._renderSuppliersTable();
  }
  render() {
    const e = this._suppliers.length, t = this._filteredSuppliers.length;
    return s`
      <umb-body-layout header-fit-height main-no-padding>
        <div class="suppliers-container layout-container">
          <div class="filters">
            <div class="filters-top">
              <div class="search-box">
                <uui-input
                  type="search"
                  label="Search suppliers"
                  placeholder="Search by supplier name or code"
                  .value=${this._searchTerm}
                  @input=${this._handleSearchInput}>
                  <uui-icon name="icon-search" slot="prepend"></uui-icon>
                  ${this._searchTerm ? s`
                        <uui-button
                          slot="append"
                          compact
                          look="secondary"
                          label="Clear supplier search"
                          @click=${this._handleSearchClear}>
                          <uui-icon name="icon-wrong"></uui-icon>
                        </uui-button>
                      ` : g}
                </uui-input>
              </div>
              <span class="results-summary">
                ${this._isLoading ? "Loading suppliers..." : `${t} of ${e} supplier${e === 1 ? "" : "s"}`}
              </span>
              <div class="header-actions">
                <uui-button look="primary" color="positive" label="Add Supplier" @click=${this._handleAddSupplier}>
                  Add Supplier
                </uui-button>
              </div>
            </div>
          </div>

          <uui-box>
            <div class="header-content">
              <div class="header-copy">
                <h2>Suppliers</h2>
                <p>
                  Suppliers represent the companies or sources that provide your inventory. Link suppliers to
                  warehouses to track where your stock comes from.
                </p>
              </div>
            </div>
          </uui-box>

          <uui-box>
            ${this._renderContent()}
          </uui-box>
        </div>
      </umb-body-layout>
    `;
  }
};
u = /* @__PURE__ */ new WeakMap();
p = /* @__PURE__ */ new WeakMap();
l = /* @__PURE__ */ new WeakMap();
o.styles = [
  E,
  k`
      :host {
        display: block;
        height: 100%;
        background: var(--uui-color-background);
      }

      .header-content {
        display: block;
      }

      .header-copy h2 {
        margin: 0 0 var(--uui-size-space-2) 0;
        font-size: 1.125rem;
      }

      .header-copy p {
        margin: 0;
        color: var(--uui-color-text-alt);
      }

      .search-box {
        max-width: 420px;
      }

      .results-summary {
        color: var(--uui-color-text-alt);
        font-size: 0.8125rem;
        align-self: flex-end;
      }

      .table-container {
        overflow-x: auto;
      }

      .supplier-table {
        width: 100%;
      }

      uui-table-head-cell,
      uui-table-cell {
        white-space: nowrap;
      }

      uui-table-row.clickable {
        cursor: pointer;
      }

      uui-table-row.clickable:hover,
      uui-table-row.clickable:focus-visible {
        background: var(--uui-color-surface-emphasis);
        outline: none;
      }

      .supplier-info {
        display: flex;
        flex-direction: column;
        gap: var(--uui-size-space-1);
      }

      .supplier-name {
        font-weight: 500;
        color: var(--uui-color-interactive);
      }

      .supplier-code {
        font-size: 0.75rem;
        color: var(--uui-color-text-alt);
      }

      .actions-header {
        text-align: right;
      }

      .actions-cell {
        display: flex;
        gap: var(--uui-size-space-1);
        justify-content: flex-end;
      }

      .loading {
        display: flex;
        justify-content: center;
        padding: var(--uui-size-space-6);
      }

      .error-banner {
        display: flex;
        gap: var(--uui-size-space-3);
        align-items: center;
        flex-wrap: wrap;
        padding: var(--uui-size-space-4);
        background: var(--uui-color-danger-standalone);
        color: var(--uui-color-danger-contrast);
        border-radius: var(--uui-border-radius);
      }

      .empty-state {
        margin: 0;
        color: var(--uui-color-text-alt);
        text-align: center;
        padding: var(--uui-size-space-6);
      }

      .empty-action {
        display: flex;
        justify-content: center;
        margin-top: var(--uui-size-space-4);
      }
    `
];
c([
  d()
], o.prototype, "_suppliers", 2);
c([
  d()
], o.prototype, "_isLoading", 2);
c([
  d()
], o.prototype, "_errorMessage", 2);
c([
  d()
], o.prototype, "_isDeleting", 2);
c([
  d()
], o.prototype, "_searchTerm", 2);
o = c([
  x("merchello-suppliers-list")
], o);
const W = o;
export {
  o as MerchelloSuppliersListElement,
  W as default
};
//# sourceMappingURL=suppliers-list.element-BQKbx2dJ.js.map
