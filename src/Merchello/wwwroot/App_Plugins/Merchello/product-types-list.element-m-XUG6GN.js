import { LitElement as P, html as d, nothing as T, css as M, state as h, customElement as k } from "@umbraco-cms/backoffice/external/lit";
import { UmbElementMixin as x } from "@umbraco-cms/backoffice/element-api";
import { UmbModalToken as C, UMB_MODAL_MANAGER_CONTEXT as z, UMB_CONFIRM_MODAL as w } from "@umbraco-cms/backoffice/modal";
import { UMB_NOTIFICATION_CONTEXT as E } from "@umbraco-cms/backoffice/notification";
import { M as v } from "./merchello-api-BuImeZL2.js";
import "./merchello-empty-state.element-mt97UoA5.js";
const f = new C("Merchello.ProductType.Modal", {
  modal: {
    type: "sidebar",
    size: "medium"
  }
});
var A = Object.defineProperty, L = Object.getOwnPropertyDescriptor, _ = (e) => {
  throw TypeError(e);
}, l = (e, t, i, a) => {
  for (var n = a > 1 ? void 0 : a ? L(t, i) : t, y = e.length - 1, m; y >= 0; y--)
    (m = e[y]) && (n = (a ? m(t, i, n) : m(n)) || n);
  return a && n && A(t, i, n), n;
}, b = (e, t, i) => t.has(e) || _("Cannot " + i), r = (e, t, i) => (b(e, t, "read from private field"), t.get(e)), g = (e, t, i) => t.has(e) ? _("Cannot add the same private member more than once") : t instanceof WeakSet ? t.add(e) : t.set(e, i), p = (e, t, i, a) => (b(e, t, "write to private field"), t.set(e, i), i), c, u, o;
let s = class extends x(P) {
  constructor() {
    super(), this._productTypes = [], this._isLoading = !0, this._errorMessage = null, this._deletingId = null, g(this, c), g(this, u), g(this, o, !1), this.consumeContext(z, (e) => {
      p(this, c, e);
    }), this.consumeContext(E, (e) => {
      p(this, u, e);
    });
  }
  connectedCallback() {
    super.connectedCallback(), p(this, o, !0), this._loadProductTypes();
  }
  disconnectedCallback() {
    super.disconnectedCallback(), p(this, o, !1);
  }
  async _loadProductTypes() {
    this._isLoading = !0, this._errorMessage = null;
    const { data: e, error: t } = await v.getProductTypes();
    if (r(this, o)) {
      if (t) {
        this._errorMessage = t.message, this._isLoading = !1;
        return;
      }
      e && (this._productTypes = e), this._isLoading = !1;
    }
  }
  async _handleAddProductType() {
    const t = await r(this, c)?.open(this, f, {
      data: {}
    })?.onSubmit().catch(() => {
    });
    r(this, o) && t?.isCreated && (r(this, u)?.peek("positive", {
      data: {
        headline: "Product type created",
        message: `"${t.productType?.name}" has been created successfully`
      }
    }), this._loadProductTypes());
  }
  async _handleEditProductType(e) {
    const i = await r(this, c)?.open(this, f, {
      data: { productType: e }
    })?.onSubmit().catch(() => {
    });
    r(this, o) && i?.isUpdated && (r(this, u)?.peek("positive", {
      data: {
        headline: "Product type updated",
        message: `"${i.productType?.name}" has been updated successfully`
      }
    }), this._loadProductTypes());
  }
  async _handleDeleteProductType(e, t) {
    e.preventDefault(), e.stopPropagation();
    const i = r(this, c)?.open(this, w, {
      data: {
        headline: "Delete Product Type",
        content: `Are you sure you want to delete the product type "${t.name}"? This action cannot be undone. Note: You cannot delete a product type that is assigned to products.`,
        confirmLabel: "Delete",
        color: "danger"
      }
    });
    try {
      await i?.onSubmit();
    } catch {
      return;
    }
    if (!r(this, o)) return;
    this._deletingId = t.id;
    const { error: a } = await v.deleteProductType(t.id);
    if (r(this, o)) {
      if (this._deletingId = null, a) {
        this._errorMessage = `Failed to delete product type: ${a.message}`, r(this, u)?.peek("danger", {
          data: { headline: "Failed to delete", message: a.message }
        });
        return;
      }
      r(this, u)?.peek("positive", {
        data: { headline: "Product type deleted", message: "The product type has been deleted successfully" }
      }), this._loadProductTypes();
    }
  }
  _renderLoadingState() {
    return d`<div class="loading"><uui-loader></uui-loader></div>`;
  }
  _renderErrorState() {
    return d`
      <div class="error-banner">
        <uui-icon name="icon-alert"></uui-icon>
        <span>${this._errorMessage}</span>
      </div>
    `;
  }
  _renderEmptyState() {
    return d`
      <merchello-empty-state
        icon="icon-tags"
        headline="No product types configured"
        message="Create product types to categorize your products (e.g., Physical, Digital, Service). Product types help organize and filter your product catalog.">
      </merchello-empty-state>
      <div class="empty-action">
        <uui-button look="primary" color="positive" label="Add Product Type" @click=${this._handleAddProductType}>
          Add Product Type
        </uui-button>
      </div>
    `;
  }
  _renderProductTypeRow(e) {
    const t = this._deletingId === e.id;
    return d`
      <div class="product-type-row" @click=${() => this._handleEditProductType(e)}>
        <div class="product-type-info">
          <span class="product-type-name">${e.name}</span>
          ${e.alias ? d`<span class="product-type-alias">${e.alias}</span>` : T}
        </div>
        <div class="product-type-actions">
          <uui-button
            look="secondary"
            compact
            label="Edit"
            @click=${(i) => {
      i.stopPropagation(), this._handleEditProductType(e);
    }}>
            <uui-icon name="icon-edit"></uui-icon>
          </uui-button>
          <uui-button
            look="primary"
            color="danger"
            compact
            label="Delete"
            ?disabled=${t}
            @click=${(i) => this._handleDeleteProductType(i, e)}>
            <uui-icon name=${t ? "icon-hourglass" : "icon-trash"}></uui-icon>
          </uui-button>
        </div>
      </div>
    `;
  }
  _renderContent() {
    return this._isLoading ? this._renderLoadingState() : this._errorMessage ? this._renderErrorState() : this._productTypes.length === 0 ? this._renderEmptyState() : d`
      <div class="product-types-list">
        ${this._productTypes.map((e) => this._renderProductTypeRow(e))}
      </div>
    `;
  }
  render() {
    return d`
      <umb-body-layout header-fit-height main-no-padding>
        <div class="container">
          <!-- Header Actions -->
          <div class="header-actions">
            <uui-button look="primary" color="positive" label="Add Product Type" @click=${this._handleAddProductType}>
              Add Product Type
            </uui-button>
          </div>

          <!-- Info Banner -->
          <div class="info-banner">
            <uui-icon name="icon-info"></uui-icon>
            <span>
              Product types help categorize your products for organization and filtering.
              Common examples include Physical, Digital, Service, or Subscription.
            </span>
          </div>

          <!-- Content -->
          ${this._renderContent()}
        </div>
      </umb-body-layout>
    `;
  }
};
c = /* @__PURE__ */ new WeakMap();
u = /* @__PURE__ */ new WeakMap();
o = /* @__PURE__ */ new WeakMap();
s.styles = M`
    :host {
      display: block;
      height: 100%;
      background: var(--uui-color-background);
    }

    .container {
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

    .product-types-list {
      display: flex;
      flex-direction: column;
      gap: var(--uui-size-space-2);
    }

    .product-type-row {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: var(--uui-size-space-3) var(--uui-size-space-4);
      background: var(--uui-color-surface);
      border: 1px solid var(--uui-color-border);
      border-radius: var(--uui-border-radius);
      cursor: pointer;
      transition: background 0.15s ease;
    }

    .product-type-row:hover {
      background: var(--uui-color-surface-emphasis);
    }

    .product-type-info {
      display: flex;
      align-items: center;
      gap: var(--uui-size-space-3);
    }

    .product-type-name {
      font-weight: 600;
      font-size: 1rem;
    }

    .product-type-alias {
      font-size: 0.8125rem;
      color: var(--uui-color-text-alt);
      font-family: var(--uui-font-monospace);
    }

    .product-type-actions {
      display: flex;
      gap: var(--uui-size-space-1);
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
  `;
l([
  h()
], s.prototype, "_productTypes", 2);
l([
  h()
], s.prototype, "_isLoading", 2);
l([
  h()
], s.prototype, "_errorMessage", 2);
l([
  h()
], s.prototype, "_deletingId", 2);
s = l([
  k("merchello-product-types-list")
], s);
const U = s;
export {
  s as MerchelloProductTypesListElement,
  U as default
};
//# sourceMappingURL=product-types-list.element-m-XUG6GN.js.map
