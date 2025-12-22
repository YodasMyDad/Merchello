import { LitElement as S, html as l, nothing as k, css as w, state as h, customElement as x } from "@umbraco-cms/backoffice/external/lit";
import { UmbElementMixin as M } from "@umbraco-cms/backoffice/element-api";
import { UMB_MODAL_MANAGER_CONTEXT as C, UMB_CONFIRM_MODAL as E } from "@umbraco-cms/backoffice/modal";
import { UMB_NOTIFICATION_CONTEXT as A } from "@umbraco-cms/backoffice/notification";
import { M as _ } from "./merchello-api-s-9cx0Ue.js";
import { M as f } from "./supplier-modal.token-CWeQ_zlc.js";
import "./merchello-empty-state.element-mt97UoA5.js";
var L = Object.defineProperty, D = Object.getOwnPropertyDescriptor, g = (e) => {
  throw TypeError(e);
}, c = (e, i, t, n) => {
  for (var r = n > 1 ? void 0 : n ? D(i, t) : i, m = e.length - 1, v; m >= 0; m--)
    (v = e[m]) && (r = (n ? v(i, t, r) : v(r)) || r);
  return n && r && L(i, t, r), r;
}, y = (e, i, t) => i.has(e) || g("Cannot " + t), a = (e, i, t) => (y(e, i, "read from private field"), i.get(e)), b = (e, i, t) => i.has(e) ? g("Cannot add the same private member more than once") : i instanceof WeakSet ? i.add(e) : i.set(e, t), p = (e, i, t, n) => (y(e, i, "write to private field"), i.set(e, t), t), u, d, s;
let o = class extends M(S) {
  constructor() {
    super(), this._suppliers = [], this._isLoading = !0, this._errorMessage = null, this._isDeleting = null, b(this, u), b(this, d), b(this, s, !1), this.consumeContext(C, (e) => {
      p(this, u, e);
    }), this.consumeContext(A, (e) => {
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
    const { data: e, error: i } = await _.getSuppliers();
    if (a(this, s)) {
      if (i) {
        this._errorMessage = i.message, this._isLoading = !1;
        return;
      }
      e && (this._suppliers = e), this._isLoading = !1;
    }
  }
  async _handleAddSupplier() {
    const i = await a(this, u)?.open(this, f, {
      data: {}
    })?.onSubmit().catch(() => {
    });
    a(this, s) && i?.isCreated && this._loadSuppliers();
  }
  async _handleEditSupplier(e) {
    const t = await a(this, u)?.open(this, f, {
      data: { supplier: e }
    })?.onSubmit().catch(() => {
    });
    a(this, s) && t?.isUpdated && this._loadSuppliers();
  }
  async _handleDelete(e, i) {
    if (e.preventDefault(), e.stopPropagation(), !await a(this, u)?.open(this, E, {
      data: {
        headline: "Delete Supplier",
        content: `Are you sure you want to delete supplier "${i.name}"? This will remove the supplier association from all linked warehouses.`,
        confirmLabel: "Delete",
        color: "danger"
      }
    })?.onSubmit().catch(() => {
    }) || !a(this, s)) return;
    this._isDeleting = i.id;
    const { error: r } = await _.deleteSupplier(i.id);
    if (a(this, s)) {
      if (this._isDeleting = null, r) {
        this._errorMessage = `Failed to delete supplier: ${r.message}`, a(this, d)?.peek("danger", {
          data: { headline: "Failed to delete", message: r.message || "Could not delete supplier" }
        });
        return;
      }
      a(this, d)?.peek("positive", {
        data: { headline: "Supplier deleted", message: "The supplier has been deleted successfully" }
      }), this._loadSuppliers();
    }
  }
  _renderLoadingState() {
    return l`<div class="loading"><uui-loader></uui-loader></div>`;
  }
  _renderErrorState() {
    return l`
      <div class="error-banner">
        <uui-icon name="icon-alert"></uui-icon>
        <span>${this._errorMessage}</span>
      </div>
    `;
  }
  _renderEmptyState() {
    return l`
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
    return l`
      <uui-table-row class="clickable" @click=${() => this._handleEditSupplier(e)}>
        <uui-table-cell>
          <div class="supplier-info">
            <span class="supplier-name">${e.name}</span>
            ${e.code ? l`<span class="supplier-code">${e.code}</span>` : k}
          </div>
        </uui-table-cell>
        <uui-table-cell>${e.warehouseCount}</uui-table-cell>
        <uui-table-cell>
          <div class="actions-cell">
            <uui-button
              look="secondary"
              compact
              label="Edit"
              @click=${(t) => {
      t.stopPropagation(), this._handleEditSupplier(e);
    }}>
              <uui-icon name="icon-edit"></uui-icon>
            </uui-button>
            <uui-button
              look="primary"
              color="danger"
              compact
              label="Delete"
              ?disabled=${i}
              @click=${(t) => this._handleDelete(t, e)}>
              <uui-icon name="${i ? "icon-hourglass" : "icon-trash"}"></uui-icon>
            </uui-button>
          </div>
        </uui-table-cell>
      </uui-table-row>
    `;
  }
  _renderSuppliersTable() {
    return l`
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
    return l`
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
const R = o;
export {
  o as MerchelloSuppliersListElement,
  R as default
};
//# sourceMappingURL=suppliers-list.element-BziDBRlF.js.map
