import { LitElement as S, html as n, nothing as k, css as w, state as h, customElement as x } from "@umbraco-cms/backoffice/external/lit";
import { UmbElementMixin as M } from "@umbraco-cms/backoffice/element-api";
import { UMB_MODAL_MANAGER_CONTEXT as C } from "@umbraco-cms/backoffice/modal";
import { UMB_NOTIFICATION_CONTEXT as E } from "@umbraco-cms/backoffice/notification";
import { M as f } from "./merchello-api-DXy2hS5y.js";
import { M as _ } from "./supplier-modal.token-CWeQ_zlc.js";
import "./merchello-empty-state.element-mt97UoA5.js";
var A = Object.defineProperty, L = Object.getOwnPropertyDescriptor, g = (e) => {
  throw TypeError(e);
}, c = (e, i, r, t) => {
  for (var l = t > 1 ? void 0 : t ? L(i, r) : i, m = e.length - 1, v; m >= 0; m--)
    (v = e[m]) && (l = (t ? v(i, r, l) : v(l)) || l);
  return t && l && A(i, r, l), l;
}, y = (e, i, r) => i.has(e) || g("Cannot " + r), a = (e, i, r) => (y(e, i, "read from private field"), i.get(e)), b = (e, i, r) => i.has(e) ? g("Cannot add the same private member more than once") : i instanceof WeakSet ? i.add(e) : i.set(e, r), p = (e, i, r, t) => (y(e, i, "write to private field"), i.set(e, r), r), u, d, s;
let o = class extends M(S) {
  constructor() {
    super(), this._suppliers = [], this._isLoading = !0, this._errorMessage = null, this._isDeleting = null, b(this, u), b(this, d), b(this, s, !1), this.consumeContext(C, (e) => {
      p(this, u, e);
    }), this.consumeContext(E, (e) => {
      p(this, d, e);
    });
  }
  connectedCallback() {
    super.connectedCallback(), p(this, s, !0), this._loadSuppliers();
  }
  disconnectedCallback() {
    super.disconnectedCallback(), p(this, s, !1);
  }
  async _loadSuppliers() {
    this._isLoading = !0, this._errorMessage = null;
    const { data: e, error: i } = await f.getSuppliers();
    if (a(this, s)) {
      if (i) {
        this._errorMessage = i.message, this._isLoading = !1;
        return;
      }
      e && (this._suppliers = e), this._isLoading = !1;
    }
  }
  async _handleAddSupplier() {
    const i = await a(this, u)?.open(this, _, {
      data: {}
    })?.onSubmit().catch(() => {
    });
    a(this, s) && i?.isCreated && this._loadSuppliers();
  }
  async _handleEditSupplier(e) {
    const r = await a(this, u)?.open(this, _, {
      data: { supplier: e }
    })?.onSubmit().catch(() => {
    });
    a(this, s) && r?.isUpdated && this._loadSuppliers();
  }
  async _handleDelete(e, i) {
    if (e.preventDefault(), e.stopPropagation(), !confirm(
      `Are you sure you want to delete supplier "${i.name}"?

This will remove the supplier association from all linked warehouses.`
    )) return;
    this._isDeleting = i.id;
    const { error: t } = await f.deleteSupplier(i.id);
    if (a(this, s)) {
      if (this._isDeleting = null, t) {
        this._errorMessage = `Failed to delete supplier: ${t.message}`, a(this, d)?.peek("danger", {
          data: { headline: "Failed to delete", message: t.message || "Could not delete supplier" }
        });
        return;
      }
      a(this, d)?.peek("positive", {
        data: { headline: "Supplier deleted", message: "The supplier has been deleted successfully" }
      }), this._loadSuppliers();
    }
  }
  _renderLoadingState() {
    return n`<div class="loading"><uui-loader></uui-loader></div>`;
  }
  _renderErrorState() {
    return n`
      <div class="error-banner">
        <uui-icon name="icon-alert"></uui-icon>
        <span>${this._errorMessage}</span>
      </div>
    `;
  }
  _renderEmptyState() {
    return n`
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
  _renderSupplierRow(e) {
    const i = this._isDeleting === e.id;
    return n`
      <uui-table-row class="clickable" @click=${() => this._handleEditSupplier(e)}>
        <uui-table-cell>
          <div class="supplier-info">
            <span class="supplier-name">${e.name}</span>
            ${e.code ? n`<span class="supplier-code">${e.code}</span>` : k}
          </div>
        </uui-table-cell>
        <uui-table-cell>${e.warehouseCount}</uui-table-cell>
        <uui-table-cell>
          <div class="actions-cell">
            <uui-button
              look="secondary"
              compact
              label="Edit"
              @click=${(r) => {
      r.stopPropagation(), this._handleEditSupplier(e);
    }}>
              <uui-icon name="icon-edit"></uui-icon>
            </uui-button>
            <uui-button
              look="primary"
              color="danger"
              compact
              label="Delete"
              ?disabled=${i}
              @click=${(r) => this._handleDelete(r, e)}>
              <uui-icon name="${i ? "icon-hourglass" : "icon-trash"}"></uui-icon>
            </uui-button>
          </div>
        </uui-table-cell>
      </uui-table-row>
    `;
  }
  _renderSuppliersTable() {
    return n`
      <div class="table-container">
        <uui-table class="supplier-table">
          <uui-table-head>
            <uui-table-head-cell>Supplier</uui-table-head-cell>
            <uui-table-head-cell>Warehouses</uui-table-head-cell>
            <uui-table-head-cell class="actions-header">Actions</uui-table-head-cell>
          </uui-table-head>
          ${this._suppliers.map((e) => this._renderSupplierRow(e))}
        </uui-table>
      </div>
    `;
  }
  _renderContent() {
    return this._isLoading ? this._renderLoadingState() : this._errorMessage ? this._renderErrorState() : this._suppliers.length === 0 ? this._renderEmptyState() : this._renderSuppliersTable();
  }
  render() {
    return n`
      <umb-body-layout header-fit-height main-no-padding>
        <div class="suppliers-container">
          <!-- Header Actions -->
          <div class="header-actions">
            <uui-button
              look="primary"
              color="positive"
              label="Add Supplier"
              @click=${this._handleAddSupplier}>
              Add Supplier
            </uui-button>
          </div>

          <!-- Info Banner -->
          <div class="info-banner">
            <uui-icon name="icon-info"></uui-icon>
            <span>Suppliers represent the companies or sources that provide your inventory. Link suppliers to warehouses to track where your stock comes from.</span>
          </div>

          <!-- Content -->
          ${this._renderContent()}
        </div>
      </umb-body-layout>
    `;
  }
};
u = /* @__PURE__ */ new WeakMap();
d = /* @__PURE__ */ new WeakMap();
s = /* @__PURE__ */ new WeakMap();
o.styles = [
  w`
      :host {
        display: block;
        height: 100%;
        background: var(--uui-color-background);
      }

      .suppliers-container {
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
        overflow-x: auto;
        background: var(--uui-color-surface);
        border: 1px solid var(--uui-color-border);
        border-radius: var(--uui-border-radius);
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

      uui-table-row.clickable:hover {
        background: var(--uui-color-surface-emphasis);
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
c([
  h()
], o.prototype, "_suppliers", 2);
c([
  h()
], o.prototype, "_isLoading", 2);
c([
  h()
], o.prototype, "_errorMessage", 2);
c([
  h()
], o.prototype, "_isDeleting", 2);
o = c([
  x("merchello-suppliers-list")
], o);
const I = o;
export {
  o as MerchelloSuppliersListElement,
  I as default
};
//# sourceMappingURL=suppliers-list.element-LKwXunGl.js.map
