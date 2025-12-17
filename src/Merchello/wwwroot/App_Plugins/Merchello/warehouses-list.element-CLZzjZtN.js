import { LitElement as w, html as t, nothing as b, css as x, state as d, customElement as W } from "@umbraco-cms/backoffice/external/lit";
import { UmbElementMixin as k } from "@umbraco-cms/backoffice/element-api";
import { UMB_NOTIFICATION_CONTEXT as C } from "@umbraco-cms/backoffice/notification";
import { M as f } from "./merchello-api-DgfpLvp2.js";
import { e as $, f as m, h as z } from "./navigation-D1KCp5wk.js";
import { b as M } from "./badge.styles-DUcdl6GY.js";
import "./merchello-empty-state.element-mt97UoA5.js";
var A = Object.defineProperty, D = Object.getOwnPropertyDescriptor, _ = (e) => {
  throw TypeError(e);
}, u = (e, a, i, r) => {
  for (var o = r > 1 ? void 0 : r ? D(a, i) : a, h = e.length - 1, p; h >= 0; h--)
    (p = e[h]) && (o = (r ? p(a, i, o) : p(o)) || o);
  return r && o && A(a, i, o), o;
}, y = (e, a, i) => a.has(e) || _("Cannot " + i), c = (e, a, i) => (y(e, a, "read from private field"), a.get(e)), v = (e, a, i) => a.has(e) ? _("Cannot add the same private member more than once") : a instanceof WeakSet ? a.add(e) : a.set(e, i), g = (e, a, i, r) => (y(e, a, "write to private field"), a.set(e, i), i), l, n;
let s = class extends k(w) {
  constructor() {
    super(), this._warehouses = [], this._isLoading = !0, this._errorMessage = null, this._isDeleting = null, v(this, l), v(this, n, !1), this.consumeContext(C, (e) => {
      g(this, l, e);
    });
  }
  connectedCallback() {
    super.connectedCallback(), g(this, n, !0), this._loadWarehouses();
  }
  disconnectedCallback() {
    super.disconnectedCallback(), g(this, n, !1);
  }
  async _loadWarehouses() {
    this._isLoading = !0, this._errorMessage = null;
    const { data: e, error: a } = await f.getWarehousesList();
    if (c(this, n)) {
      if (a) {
        this._errorMessage = a.message, this._isLoading = !1;
        return;
      }
      e && (this._warehouses = e), this._isLoading = !1;
    }
  }
  _handleAddWarehouse() {
    $();
  }
  async _handleDelete(e, a) {
    if (e.preventDefault(), e.stopPropagation(), !confirm(
      `Are you sure you want to delete warehouse "${a.name || "Unnamed"}"? This action cannot be undone.`
    )) return;
    this._isDeleting = a.id;
    const { error: r } = await f.deleteWarehouse(a.id);
    if (c(this, n)) {
      if (this._isDeleting = null, r) {
        this._errorMessage = `Failed to delete warehouse: ${r.message}`, c(this, l)?.peek("danger", {
          data: { headline: "Failed to delete", message: r.message || "Could not delete warehouse" }
        });
        return;
      }
      c(this, l)?.peek("positive", {
        data: { headline: "Warehouse deleted", message: "The warehouse has been deleted successfully" }
      }), this._loadWarehouses();
    }
  }
  _renderLoadingState() {
    return t`<div class="loading"><uui-loader></uui-loader></div>`;
  }
  _renderErrorState() {
    return t`
      <div class="error-banner">
        <uui-icon name="icon-alert"></uui-icon>
        <span>${this._errorMessage}</span>
      </div>
    `;
  }
  _renderEmptyState() {
    return t`
      <merchello-empty-state
        icon="icon-store"
        headline="No warehouses configured"
        message="Add your first warehouse to start fulfilling orders from different locations.">
      </merchello-empty-state>
      <div class="empty-action">
        <uui-button
          look="primary"
          color="positive"
          label="Add Warehouse"
          @click=${this._handleAddWarehouse}>
          Add Warehouse
        </uui-button>
      </div>
    `;
  }
  _renderWarningBadge(e, a) {
    return e > 0 ? b : t`
      <span class="badge badge-warning" title="${a}">
        <uui-icon name="icon-alert"></uui-icon>
      </span>
    `;
  }
  _renderWarehouseRow(e) {
    const a = this._isDeleting === e.id;
    return t`
      <uui-table-row class="clickable">
        <uui-table-cell class="name-cell">
          <a href=${m(e.id)} class="warehouse-link">
            <span class="warehouse-name">${e.name || "Unnamed Warehouse"}</span>
            ${e.code ? t`<span class="warehouse-code">${e.code}</span>` : b}
          </a>
        </uui-table-cell>
        <uui-table-cell>${e.supplierName || "—"}</uui-table-cell>
        <uui-table-cell>
          <span class="count-cell">
            ${this._renderWarningBadge(e.serviceRegionCount, "No shipping regions configured")}
            <span>${e.serviceRegionCount}</span>
          </span>
        </uui-table-cell>
        <uui-table-cell>
          <span class="count-cell">
            ${this._renderWarningBadge(e.shippingOptionCount, "No shipping methods configured")}
            <span>${e.shippingOptionCount}</span>
          </span>
        </uui-table-cell>
        <uui-table-cell class="address-cell">${e.addressSummary || "—"}</uui-table-cell>
        <uui-table-cell>
          <div class="actions-cell">
            <a href=${m(e.id)}>
              <uui-button
                look="secondary"
                compact
                label="Edit">
                <uui-icon name="icon-edit"></uui-icon>
              </uui-button>
            </a>
            <uui-button
              look="primary"
              color="danger"
              compact
              label="Delete"
              ?disabled=${a}
              @click=${(i) => this._handleDelete(i, e)}>
              <uui-icon name="${a ? "icon-hourglass" : "icon-trash"}"></uui-icon>
            </uui-button>
          </div>
        </uui-table-cell>
      </uui-table-row>
    `;
  }
  _renderWarehousesTable() {
    return t`
      <div class="table-container">
        <uui-table class="warehouse-table">
          <uui-table-head>
            <uui-table-head-cell>Warehouse</uui-table-head-cell>
            <uui-table-head-cell>Supplier</uui-table-head-cell>
            <uui-table-head-cell>Regions</uui-table-head-cell>
            <uui-table-head-cell>Options</uui-table-head-cell>
            <uui-table-head-cell>Address</uui-table-head-cell>
            <uui-table-head-cell class="actions-header">Actions</uui-table-head-cell>
          </uui-table-head>
          ${this._warehouses.map((e) => this._renderWarehouseRow(e))}
        </uui-table>
      </div>
    `;
  }
  _renderContent() {
    return this._isLoading ? this._renderLoadingState() : this._errorMessage ? this._renderErrorState() : this._warehouses.length === 0 ? this._renderEmptyState() : this._renderWarehousesTable();
  }
  render() {
    return t`
      <umb-body-layout header-fit-height main-no-padding>
        <div class="warehouses-container">
          <!-- Header Actions -->
          <div class="header-actions">
            <a href=${z()}>
              <uui-button
                look="primary"
                color="positive"
                label="Add Warehouse">
                Add Warehouse
              </uui-button>
            </a>
          </div>

          <!-- Info Banner -->
          <div class="info-banner">
            <uui-icon name="icon-info"></uui-icon>
            <span>Warehouses define your shipping origins. Configure service regions to specify where each warehouse can ship to, then add shipping options with costs.</span>
          </div>

          <!-- Content -->
          ${this._renderContent()}
        </div>
      </umb-body-layout>
    `;
  }
};
l = /* @__PURE__ */ new WeakMap();
n = /* @__PURE__ */ new WeakMap();
s.styles = [
  M,
  x`
      :host {
        display: block;
        height: 100%;
        background: var(--uui-color-background);
      }

      .warehouses-container {
        max-width: 100%;
        padding: var(--uui-size-layout-1);
      }

      .header-actions {
        display: flex;
        gap: var(--uui-size-space-2);
        align-items: center;
        justify-content: flex-end;
        margin-bottom: var(--uui-size-space-4);
      }

      .header-actions a {
        text-decoration: none;
      }

      .info-banner {
        display: flex;
        gap: var(--uui-size-space-3);
        align-items: flex-start;
        padding: var(--uui-size-space-4);
        background: var(--uui-color-surface-alt);
        border: 1px solid var(--uui-color-border);
        border-radius: var(--uui-border-radius);
        margin-bottom: var(--uui-size-space-4);
        font-size: 0.875rem;
        color: var(--uui-color-text-alt);
      }

      .info-banner uui-icon {
        flex-shrink: 0;
        color: var(--uui-color-interactive);
      }

      .table-container {
        background: var(--uui-color-surface);
        border: 1px solid var(--uui-color-border);
        border-radius: var(--uui-border-radius);
        overflow: hidden;
      }

      .warehouse-table {
        width: 100%;
      }

      uui-table-row.clickable {
        cursor: pointer;
      }

      uui-table-row.clickable:hover {
        background: var(--uui-color-surface-emphasis);
      }

      .name-cell {
        min-width: 200px;
      }

      .warehouse-link {
        display: flex;
        flex-direction: column;
        gap: var(--uui-size-space-1);
        text-decoration: none;
        color: inherit;
      }

      .warehouse-link:hover .warehouse-name {
        color: var(--uui-color-interactive);
        text-decoration: underline;
      }

      .warehouse-name {
        font-weight: 500;
        color: var(--uui-color-text);
      }

      .warehouse-code {
        font-size: 0.75rem;
        color: var(--uui-color-text-alt);
      }

      .count-cell {
        display: inline-flex;
        align-items: center;
        gap: var(--uui-size-space-2);
      }

      .badge-warning {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        padding: 2px;
        background: var(--uui-color-warning-standalone);
        color: var(--uui-color-warning-contrast);
        border-radius: 50%;
      }

      .badge-warning uui-icon {
        font-size: 0.75rem;
      }

      .address-cell {
        color: var(--uui-color-text-alt);
        font-size: 0.875rem;
      }

      .actions-header {
        text-align: right;
      }

      .actions-cell {
        display: inline-flex;
        gap: var(--uui-size-space-1);
        justify-content: flex-end;
      }

      .actions-cell a {
        text-decoration: none;
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
        padding: var(--uui-size-space-4);
        background: var(--uui-color-danger-standalone);
        color: var(--uui-color-danger-contrast);
        border-radius: var(--uui-border-radius);
        margin-bottom: var(--uui-size-space-4);
      }

      .empty-action {
        display: flex;
        justify-content: center;
        margin-top: var(--uui-size-space-4);
      }
    `
];
u([
  d()
], s.prototype, "_warehouses", 2);
u([
  d()
], s.prototype, "_isLoading", 2);
u([
  d()
], s.prototype, "_errorMessage", 2);
u([
  d()
], s.prototype, "_isDeleting", 2);
s = u([
  W("merchello-warehouses-list")
], s);
const P = s;
export {
  s as MerchelloWarehousesListElement,
  P as default
};
//# sourceMappingURL=warehouses-list.element-CLZzjZtN.js.map
