import { LitElement as y, html as n, nothing as S, css as k, state as h, customElement as w } from "@umbraco-cms/backoffice/external/lit";
import { UmbElementMixin as x } from "@umbraco-cms/backoffice/element-api";
import { UmbModalToken as E, UMB_MODAL_MANAGER_CONTEXT as M } from "@umbraco-cms/backoffice/modal";
import { UMB_NOTIFICATION_CONTEXT as C } from "@umbraco-cms/backoffice/notification";
import { M as b } from "./merchello-api-gshzVGsw.js";
import { M as L } from "./create-supplier-modal.token-D_m5XdXY.js";
import "./merchello-empty-state.element-mt97UoA5.js";
const A = new E("Merchello.EditSupplier.Modal", {
  modal: {
    type: "sidebar",
    size: "small"
  }
});
var z = Object.defineProperty, D = Object.getOwnPropertyDescriptor, g = (e) => {
  throw TypeError(e);
}, d = (e, i, t, r) => {
  for (var l = r > 1 ? void 0 : r ? D(i, t) : i, m = e.length - 1, _; m >= 0; m--)
    (_ = e[m]) && (l = (r ? _(i, t, l) : _(l)) || l);
  return r && l && z(i, t, l), l;
}, v = (e, i, t) => i.has(e) || g("Cannot " + t), a = (e, i, t) => (v(e, i, "read from private field"), i.get(e)), f = (e, i, t) => i.has(e) ? g("Cannot add the same private member more than once") : i instanceof WeakSet ? i.add(e) : i.set(e, t), p = (e, i, t, r) => (v(e, i, "write to private field"), i.set(e, t), t), u, c, s;
let o = class extends x(y) {
  constructor() {
    super(), this._suppliers = [], this._isLoading = !0, this._errorMessage = null, this._isDeleting = null, f(this, u), f(this, c), f(this, s, !1), this.consumeContext(M, (e) => {
      p(this, u, e);
    }), this.consumeContext(C, (e) => {
      p(this, c, e);
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
    const { data: e, error: i } = await b.getSuppliers();
    if (a(this, s)) {
      if (i) {
        this._errorMessage = i.message, this._isLoading = !1;
        return;
      }
      e && (this._suppliers = e), this._isLoading = !1;
    }
  }
  async _handleAddSupplier() {
    const i = await a(this, u)?.open(this, L, {
      data: {}
    })?.onSubmit().catch(() => {
    });
    a(this, s) && i?.supplier && this._loadSuppliers();
  }
  async _handleEditSupplier(e) {
    const t = await a(this, u)?.open(this, A, {
      data: { supplier: e }
    })?.onSubmit().catch(() => {
    });
    a(this, s) && t?.updated && this._loadSuppliers();
  }
  async _handleDelete(e, i) {
    if (e.preventDefault(), e.stopPropagation(), !confirm(
      `Are you sure you want to delete supplier "${i.name}"?

This will remove the supplier association from all linked warehouses.`
    )) return;
    this._isDeleting = i.id;
    const { error: r } = await b.deleteSupplier(i.id);
    if (a(this, s)) {
      if (this._isDeleting = null, r) {
        this._errorMessage = `Failed to delete supplier: ${r.message}`, a(this, c)?.peek("danger", {
          data: { headline: "Failed to delete", message: r.message || "Could not delete supplier" }
        });
        return;
      }
      a(this, c)?.peek("positive", {
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
        <uui-table-cell class="name-cell">
          <span class="supplier-name">${e.name}</span>
          ${e.code ? n`<span class="supplier-code">${e.code}</span>` : S}
        </uui-table-cell>
        <uui-table-cell class="count-cell">
          <span class="warehouse-count">${e.warehouseCount}</span>
        </uui-table-cell>
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
c = /* @__PURE__ */ new WeakMap();
s = /* @__PURE__ */ new WeakMap();
o.styles = [
  k`
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
        background: var(--uui-color-surface);
        border: 1px solid var(--uui-color-border);
        border-radius: var(--uui-border-radius);
        overflow: hidden;
      }

      .supplier-table {
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
        display: flex;
        flex-direction: column;
        gap: var(--uui-size-space-1);
      }

      .supplier-name {
        font-weight: 500;
        color: var(--uui-color-text);
      }

      .supplier-code {
        font-size: 0.75rem;
        color: var(--uui-color-text-alt);
      }

      .count-cell {
        text-align: center;
      }

      .warehouse-count {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        min-width: 24px;
        height: 24px;
        padding: 0 8px;
        background: var(--uui-color-surface-alt);
        border-radius: 12px;
        font-size: 0.875rem;
        font-weight: 500;
      }

      .actions-header {
        text-align: right;
      }

      .actions-cell {
        display: inline-flex;
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
d([
  h()
], o.prototype, "_suppliers", 2);
d([
  h()
], o.prototype, "_isLoading", 2);
d([
  h()
], o.prototype, "_errorMessage", 2);
d([
  h()
], o.prototype, "_isDeleting", 2);
o = d([
  w("merchello-suppliers-list")
], o);
const U = o;
export {
  o as MerchelloSuppliersListElement,
  U as default
};
//# sourceMappingURL=suppliers-list.element-xXm5kAv1.js.map
