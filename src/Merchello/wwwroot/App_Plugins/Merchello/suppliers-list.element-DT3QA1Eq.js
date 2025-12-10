import { LitElement as b, html as s, nothing as v, css as g, state as u, customElement as f } from "@umbraco-cms/backoffice/external/lit";
import { UmbElementMixin as y } from "@umbraco-cms/backoffice/element-api";
import { UmbModalToken as S, UMB_MODAL_MANAGER_CONTEXT as w } from "@umbraco-cms/backoffice/modal";
import { M as p } from "./merchello-api-gshzVGsw.js";
import { M as x } from "./create-supplier-modal.token-D_m5XdXY.js";
import "./merchello-empty-state.element-mt97UoA5.js";
const k = new S("Merchello.EditSupplier.Modal", {
  modal: {
    type: "sidebar",
    size: "small"
  }
});
var E = Object.defineProperty, M = Object.getOwnPropertyDescriptor, m = (e) => {
  throw TypeError(e);
}, n = (e, i, r, t) => {
  for (var o = t > 1 ? void 0 : t ? M(i, r) : i, c = e.length - 1, d; c >= 0; c--)
    (d = e[c]) && (o = (t ? d(i, r, o) : d(o)) || o);
  return t && o && E(i, r, o), o;
}, _ = (e, i, r) => i.has(e) || m("Cannot " + r), h = (e, i, r) => (_(e, i, "read from private field"), i.get(e)), L = (e, i, r) => i.has(e) ? m("Cannot add the same private member more than once") : i instanceof WeakSet ? i.add(e) : i.set(e, r), A = (e, i, r, t) => (_(e, i, "write to private field"), i.set(e, r), r), l;
let a = class extends y(b) {
  constructor() {
    super(), this._suppliers = [], this._isLoading = !0, this._errorMessage = null, this._isDeleting = null, L(this, l), this.consumeContext(w, (e) => {
      A(this, l, e);
    });
  }
  connectedCallback() {
    super.connectedCallback(), this._loadSuppliers();
  }
  async _loadSuppliers() {
    this._isLoading = !0, this._errorMessage = null;
    const { data: e, error: i } = await p.getSuppliers();
    if (i) {
      this._errorMessage = i.message, this._isLoading = !1;
      return;
    }
    e && (this._suppliers = e), this._isLoading = !1;
  }
  async _handleAddSupplier() {
    (await h(this, l)?.open(this, x, {
      data: {}
    })?.onSubmit().catch(() => {
    }))?.supplier && this._loadSuppliers();
  }
  async _handleEditSupplier(e) {
    (await h(this, l)?.open(this, k, {
      data: { supplier: e }
    })?.onSubmit().catch(() => {
    }))?.updated && this._loadSuppliers();
  }
  async _handleDelete(e, i) {
    if (e.preventDefault(), e.stopPropagation(), !confirm(
      `Are you sure you want to delete supplier "${i.name}"?

This will remove the supplier association from all linked warehouses.`
    )) return;
    this._isDeleting = i.id;
    const { error: t } = await p.deleteSupplier(i.id);
    if (this._isDeleting = null, t) {
      this._errorMessage = `Failed to delete supplier: ${t.message}`;
      return;
    }
    this._loadSuppliers();
  }
  _renderLoadingState() {
    return s`<div class="loading"><uui-loader></uui-loader></div>`;
  }
  _renderErrorState() {
    return s`
      <div class="error-banner">
        <uui-icon name="icon-alert"></uui-icon>
        <span>${this._errorMessage}</span>
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
  _renderSupplierRow(e) {
    const i = this._isDeleting === e.id;
    return s`
      <uui-table-row class="clickable" @click=${() => this._handleEditSupplier(e)}>
        <uui-table-cell class="name-cell">
          <span class="supplier-name">${e.name}</span>
          ${e.code ? s`<span class="supplier-code">${e.code}</span>` : v}
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
    return s`
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
    return s`
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
l = /* @__PURE__ */ new WeakMap();
a.styles = [
  g`
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
n([
  u()
], a.prototype, "_suppliers", 2);
n([
  u()
], a.prototype, "_isLoading", 2);
n([
  u()
], a.prototype, "_errorMessage", 2);
n([
  u()
], a.prototype, "_isDeleting", 2);
a = n([
  f("merchello-suppliers-list")
], a);
const T = a;
export {
  a as MerchelloSuppliersListElement,
  T as default
};
//# sourceMappingURL=suppliers-list.element-DT3QA1Eq.js.map
