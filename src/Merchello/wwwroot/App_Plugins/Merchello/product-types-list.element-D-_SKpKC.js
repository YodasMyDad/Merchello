import { LitElement as T, html as n, css as x, state as p, customElement as P } from "@umbraco-cms/backoffice/external/lit";
import { UmbElementMixin as w } from "@umbraco-cms/backoffice/element-api";
import { UmbModalToken as k, UMB_MODAL_MANAGER_CONTEXT as C, UMB_CONFIRM_MODAL as M } from "@umbraco-cms/backoffice/modal";
import { UMB_NOTIFICATION_CONTEXT as $ } from "@umbraco-cms/backoffice/notification";
import { M as b } from "./merchello-api-Dp_zU_yi.js";
import "./merchello-empty-state.element-D2dcD7_8.js";
const g = new k("Merchello.ProductType.Modal", {
  modal: {
    type: "sidebar",
    size: "medium"
  }
});
var S = Object.defineProperty, E = Object.getOwnPropertyDescriptor, f = (e) => {
  throw TypeError(e);
}, d = (e, t, a, r) => {
  for (var u = r > 1 ? void 0 : r ? E(t, a) : t, m = e.length - 1, y; m >= 0; m--)
    (y = e[m]) && (u = (r ? y(t, a, u) : y(u)) || u);
  return r && u && S(t, a, u), u;
}, v = (e, t, a) => t.has(e) || f("Cannot " + a), i = (e, t, a) => (v(e, t, "read from private field"), t.get(e)), _ = (e, t, a) => t.has(e) ? f("Cannot add the same private member more than once") : t instanceof WeakSet ? t.add(e) : t.set(e, a), h = (e, t, a, r) => (v(e, t, "write to private field"), t.set(e, a), a), s, c, o;
let l = class extends w(T) {
  constructor() {
    super(), this._productTypes = [], this._isLoading = !0, this._errorMessage = null, this._deletingId = null, this._searchTerm = "", _(this, s), _(this, c), _(this, o, !1), this.consumeContext(C, (e) => {
      h(this, s, e);
    }), this.consumeContext($, (e) => {
      h(this, c, e);
    });
  }
  connectedCallback() {
    super.connectedCallback(), h(this, o, !0), this._loadProductTypes();
  }
  disconnectedCallback() {
    super.disconnectedCallback(), h(this, o, !1);
  }
  get _filteredProductTypes() {
    const e = [...this._productTypes].sort((a, r) => a.name.localeCompare(r.name)), t = this._searchTerm.trim().toLowerCase();
    return t ? e.filter(
      (a) => [a.name, a.alias ?? ""].some((r) => r.toLowerCase().includes(t))
    ) : e;
  }
  async _loadProductTypes() {
    this._isLoading = !0, this._errorMessage = null;
    const { data: e, error: t } = await b.getProductTypes();
    if (i(this, o)) {
      if (t) {
        this._errorMessage = t.message, this._isLoading = !1;
        return;
      }
      this._productTypes = e ?? [], this._isLoading = !1;
    }
  }
  _handleSearchInput(e) {
    this._searchTerm = e.target.value;
  }
  _handleSearchClear() {
    this._searchTerm = "";
  }
  async _handleAddProductType() {
    if (!i(this, s)) return;
    const t = await i(this, s).open(this, g, {
      data: {}
    }).onSubmit().catch(() => {
    });
    i(this, o) && t?.isCreated && (i(this, c)?.peek("positive", {
      data: {
        headline: "Product type created",
        message: `"${t.productType?.name}" has been created successfully`
      }
    }), this._loadProductTypes());
  }
  async _handleEditProductType(e) {
    if (!i(this, s)) return;
    const a = await i(this, s).open(this, g, {
      data: { productType: e }
    }).onSubmit().catch(() => {
    });
    i(this, o) && a?.isUpdated && (i(this, c)?.peek("positive", {
      data: {
        headline: "Product type updated",
        message: `"${a.productType?.name}" has been updated successfully`
      }
    }), this._loadProductTypes());
  }
  async _handleDeleteProductType(e) {
    if (!i(this, s)) return;
    const t = i(this, s).open(this, M, {
      data: {
        headline: "Delete product type",
        content: `Delete "${e.name}" permanently. Product types assigned to products cannot be deleted.`,
        confirmLabel: "Delete",
        color: "danger"
      }
    });
    try {
      await t.onSubmit();
    } catch {
      return;
    }
    if (!i(this, o)) return;
    this._deletingId = e.id;
    const { error: a } = await b.deleteProductType(e.id);
    if (i(this, o)) {
      if (this._deletingId = null, a) {
        this._errorMessage = `Failed to delete product type: ${a.message}`, i(this, c)?.peek("danger", {
          data: { headline: "Failed to delete product type", message: a.message }
        });
        return;
      }
      i(this, c)?.peek("positive", {
        data: { headline: "Product type deleted", message: `"${e.name}" was deleted` }
      }), this._loadProductTypes();
    }
  }
  _renderLoadingState() {
    return n`
      <div class="state-block">
        <uui-loader-bar></uui-loader-bar>
      </div>
    `;
  }
  _renderErrorState() {
    return n`
      <div class="error-banner" role="alert">
        <uui-icon name="icon-alert"></uui-icon>
        <span>${this._errorMessage}</span>
        <uui-button look="secondary" label="Retry" @click=${() => this._loadProductTypes()}>
          Retry
        </uui-button>
      </div>
    `;
  }
  _renderEmptyState() {
    return n`
      <merchello-empty-state
        icon="icon-tags"
        headline="No product types configured"
        message="Create product types to classify products such as Physical, Digital, and Service.">
      </merchello-empty-state>
      <div class="state-action">
        <uui-button look="primary" color="positive" label="Add product type" @click=${this._handleAddProductType}>
          Add Product Type
        </uui-button>
      </div>
    `;
  }
  _renderNoSearchResults() {
    return n`
      <div class="state-block state-block-compact">
        <p class="state-text">No product types match "${this._searchTerm}".</p>
        <uui-button look="secondary" label="Clear search" @click=${this._handleSearchClear}>
          Clear Search
        </uui-button>
      </div>
    `;
  }
  _renderProductTypeRow(e) {
    const t = this._deletingId === e.id, a = e.alias?.trim() ? e.alias : "Not set";
    return n`
      <uui-table-row>
        <uui-table-cell>
          <div class="name-cell">
            <uui-icon name="icon-tag"></uui-icon>
            <span class="type-name">${e.name}</span>
          </div>
        </uui-table-cell>
        <uui-table-cell>
          <span class="type-alias">${a}</span>
        </uui-table-cell>
        <uui-table-cell class="actions-cell">
          <uui-button
            look="secondary"
            compact
            label=${`Edit ${e.name}`}
            @click=${() => this._handleEditProductType(e)}>
            Edit
          </uui-button>
          <uui-button
            look="secondary"
            color="danger"
            compact
            label=${`Delete ${e.name}`}
            ?disabled=${t}
            @click=${() => this._handleDeleteProductType(e)}>
            ${t ? "Deleting..." : "Delete"}
          </uui-button>
        </uui-table-cell>
      </uui-table-row>
    `;
  }
  _renderProductTypesTable() {
    return n`
      <uui-table class="product-types-table">
        <uui-table-head>
          <uui-table-head-cell>Name</uui-table-head-cell>
          <uui-table-head-cell>Alias</uui-table-head-cell>
          <uui-table-head-cell class="actions-header">Actions</uui-table-head-cell>
        </uui-table-head>
        ${this._filteredProductTypes.map((e) => this._renderProductTypeRow(e))}
      </uui-table>
    `;
  }
  _renderContent() {
    return this._isLoading ? this._renderLoadingState() : this._errorMessage ? this._renderErrorState() : this._productTypes.length === 0 ? this._renderEmptyState() : this._filteredProductTypes.length === 0 ? this._renderNoSearchResults() : this._renderProductTypesTable();
  }
  render() {
    const e = this._productTypes.length;
    return n`
      <umb-body-layout header-fit-height main-no-padding>
        <div class="container">
          <div class="toolbar">
            <uui-input
              type="search"
              label="Search product types"
              placeholder="Search by name or alias"
              .value=${this._searchTerm}
              @input=${this._handleSearchInput}>
              <uui-icon name="icon-search" slot="prepend"></uui-icon>
              ${this._searchTerm ? n`
                    <uui-button slot="append" compact look="secondary" label="Clear search" @click=${this._handleSearchClear}>
                      <uui-icon name="icon-wrong"></uui-icon>
                    </uui-button>
                  ` : ""}
            </uui-input>
            <uui-button look="primary" color="positive" label="Add product type" @click=${this._handleAddProductType}>
              Add Product Type
            </uui-button>
          </div>

          <uui-box>
            <div class="intro">
              <uui-icon name="icon-info"></uui-icon>
              <span>
                Product types classify products for reporting, filtering, and merchandising rules.
                Keep names clear and consistent across your catalog.
              </span>
            </div>
          </uui-box>

          <uui-box>
            <div class="table-header">
              <h4>Product Types</h4>
              <span>${e} total</span>
            </div>
            ${this._renderContent()}
          </uui-box>
        </div>
      </umb-body-layout>
    `;
  }
};
s = /* @__PURE__ */ new WeakMap();
c = /* @__PURE__ */ new WeakMap();
o = /* @__PURE__ */ new WeakMap();
l.styles = x`
    :host {
      display: block;
      height: 100%;
      background: var(--uui-color-background);
    }

    .container {
      display: flex;
      flex-direction: column;
      gap: var(--uui-size-layout-1);
      padding: var(--uui-size-layout-1);
    }

    .toolbar {
      display: flex;
      flex-direction: column;
      gap: var(--uui-size-space-3);
    }

    @media (min-width: 900px) {
      .toolbar {
        align-items: flex-end;
        flex-direction: row;
      }

      .toolbar uui-input {
        flex: 1;
      }
    }

    .toolbar uui-input {
      width: 100%;
    }

    .intro {
      display: flex;
      align-items: flex-start;
      gap: var(--uui-size-space-3);
      color: var(--uui-color-text-alt);
    }

    .intro uui-icon {
      color: var(--uui-color-interactive);
      flex-shrink: 0;
    }

    .table-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: var(--uui-size-space-3);
      margin-bottom: var(--uui-size-space-3);
    }

    .table-header h4 {
      margin: 0;
      font-size: var(--uui-type-h5-size);
      font-weight: var(--uui-font-weight-bold, 700);
    }

    .table-header span {
      color: var(--uui-color-text-alt);
      font-size: var(--uui-type-small-size);
    }

    .product-types-table {
      width: 100%;
    }

    .name-cell {
      align-items: center;
      display: flex;
      gap: var(--uui-size-space-2);
    }

    .name-cell uui-icon {
      color: var(--uui-color-interactive);
    }

    .type-name {
      font-weight: 600;
    }

    .type-alias {
      color: var(--uui-color-text-alt);
      font-family: var(--uui-font-monospace);
      font-size: var(--uui-type-small-size);
    }

    .actions-cell {
      display: flex;
      gap: var(--uui-size-space-2);
      justify-content: flex-end;
      flex-wrap: wrap;
    }

    .actions-header {
      text-align: right;
      width: 220px;
    }

    .state-block {
      padding: var(--uui-size-space-4) 0;
    }

    .state-block-compact {
      align-items: center;
      display: flex;
      flex-direction: column;
      gap: var(--uui-size-space-3);
      justify-content: center;
    }

    .state-text {
      color: var(--uui-color-text-alt);
      margin: 0;
    }

    .state-action {
      display: flex;
      justify-content: center;
      margin-top: var(--uui-size-space-4);
    }

    .error-banner {
      align-items: center;
      background: var(--uui-color-danger-standalone);
      border-radius: var(--uui-border-radius);
      color: var(--uui-color-danger-contrast);
      display: flex;
      flex-wrap: wrap;
      gap: var(--uui-size-space-3);
      padding: var(--uui-size-space-3);
    }
  `;
d([
  p()
], l.prototype, "_productTypes", 2);
d([
  p()
], l.prototype, "_isLoading", 2);
d([
  p()
], l.prototype, "_errorMessage", 2);
d([
  p()
], l.prototype, "_deletingId", 2);
d([
  p()
], l.prototype, "_searchTerm", 2);
l = d([
  P("merchello-product-types-list")
], l);
const I = l;
export {
  l as MerchelloProductTypesListElement,
  I as default
};
//# sourceMappingURL=product-types-list.element-D-_SKpKC.js.map
