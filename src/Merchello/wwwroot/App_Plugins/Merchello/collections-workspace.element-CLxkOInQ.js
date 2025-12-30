import { LitElement as y, html as n, nothing as w, css as k, state as p, customElement as x } from "@umbraco-cms/backoffice/external/lit";
import { UmbElementMixin as M } from "@umbraco-cms/backoffice/element-api";
import { UmbModalToken as T, UMB_MODAL_MANAGER_CONTEXT as E, UMB_CONFIRM_MODAL as $ } from "@umbraco-cms/backoffice/modal";
import { UMB_NOTIFICATION_CONTEXT as z } from "@umbraco-cms/backoffice/notification";
import { M as f } from "./merchello-api-Z_Hs6xGH.js";
import "./merchello-empty-state.element-mt97UoA5.js";
const b = new T("Merchello.Collection.Modal", {
  modal: {
    type: "sidebar",
    size: "medium"
  }
});
var L = Object.defineProperty, A = Object.getOwnPropertyDescriptor, v = (e) => {
  throw TypeError(e);
}, h = (e, t, i, u) => {
  for (var l = u > 1 ? void 0 : u ? A(t, i) : t, s = e.length - 1, _; s >= 0; s--)
    (_ = e[s]) && (l = (u ? _(t, i, l) : _(l)) || l);
  return u && l && L(t, i, l), l;
}, C = (e, t, i) => t.has(e) || v("Cannot " + i), o = (e, t, i) => (C(e, t, "read from private field"), t.get(e)), g = (e, t, i) => t.has(e) ? v("Cannot add the same private member more than once") : t instanceof WeakSet ? t.add(e) : t.set(e, i), m = (e, t, i, u) => (C(e, t, "write to private field"), t.set(e, i), i), d, c, a;
let r = class extends M(y) {
  constructor() {
    super(), this._collections = [], this._isLoading = !0, this._errorMessage = null, this._isDeleting = null, this._searchTerm = "", g(this, d), g(this, c), g(this, a, !1), this.consumeContext(E, (e) => {
      m(this, d, e);
    }), this.consumeContext(z, (e) => {
      m(this, c, e);
    });
  }
  connectedCallback() {
    super.connectedCallback(), m(this, a, !0), this._loadCollections();
  }
  disconnectedCallback() {
    super.disconnectedCallback(), m(this, a, !1);
  }
  async _loadCollections() {
    this._isLoading = !0, this._errorMessage = null;
    const { data: e, error: t } = await f.getProductCollections();
    if (o(this, a)) {
      if (t) {
        this._errorMessage = t.message, this._isLoading = !1;
        return;
      }
      e && (this._collections = e), this._isLoading = !1;
    }
  }
  get _filteredCollections() {
    if (!this._searchTerm.trim())
      return this._collections;
    const e = this._searchTerm.toLowerCase().trim();
    return this._collections.filter(
      (t) => t.name.toLowerCase().includes(e)
    );
  }
  _handleSearchInput(e) {
    this._searchTerm = e.target.value;
  }
  async _handleAddCollection() {
    const t = await o(this, d)?.open(this, b, {
      data: {}
    })?.onSubmit().catch(() => {
    });
    o(this, a) && t?.isCreated && (o(this, c)?.peek("positive", {
      data: { headline: "Collection created", message: "The collection has been created successfully" }
    }), this._loadCollections());
  }
  async _handleEditCollection(e) {
    const i = await o(this, d)?.open(this, b, {
      data: { collection: e }
    })?.onSubmit().catch(() => {
    });
    o(this, a) && i?.isUpdated && (o(this, c)?.peek("positive", {
      data: { headline: "Collection updated", message: "The collection has been updated successfully" }
    }), this._loadCollections());
  }
  async _handleDelete(e, t) {
    e.preventDefault(), e.stopPropagation();
    let i = `Are you sure you want to delete the collection "${t.name}"?`;
    if (t.productCount > 0 && (i = `This collection is used by ${t.productCount} product${t.productCount === 1 ? "" : "s"}. Deleting it will remove the collection from all these products. Are you sure you want to delete "${t.name}"?`), !await o(this, d)?.open(this, $, {
      data: {
        headline: "Delete Collection",
        content: i,
        confirmLabel: "Delete",
        color: "danger"
      }
    })?.onSubmit().catch(() => {
    }) || !o(this, a)) return;
    this._isDeleting = t.id;
    const { error: s } = await f.deleteProductCollection(t.id);
    if (o(this, a)) {
      if (this._isDeleting = null, s) {
        this._errorMessage = `Failed to delete collection: ${s.message}`, o(this, c)?.peek("danger", {
          data: { headline: "Failed to delete", message: s.message || "Could not delete collection" }
        });
        return;
      }
      o(this, c)?.peek("positive", {
        data: { headline: "Collection deleted", message: "The collection has been deleted successfully" }
      }), this._loadCollections();
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
        icon="icon-tag"
        headline="No collections yet"
        message="Create collections to organize and group your products for easier management and customer browsing.">
      </merchello-empty-state>
      <div class="empty-action">
        <uui-button
          look="primary"
          color="positive"
          label="Add Collection"
          @click=${this._handleAddCollection}>
          Add Collection
        </uui-button>
      </div>
    `;
  }
  _renderCollectionRow(e) {
    const t = this._isDeleting === e.id;
    return n`
      <uui-table-row class="clickable" @click=${() => this._handleEditCollection(e)}>
        <uui-table-cell>
          <div class="collection-info">
            <span class="collection-name">${e.name}</span>
          </div>
        </uui-table-cell>
        <uui-table-cell>${e.productCount}</uui-table-cell>
        <uui-table-cell>
          <div class="actions-cell">
            <uui-button
              look="secondary"
              compact
              label="Edit"
              @click=${(i) => {
      i.stopPropagation(), this._handleEditCollection(e);
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
  _renderCollectionsTable() {
    const e = this._filteredCollections;
    return e.length === 0 && this._searchTerm.trim() ? n`
        <div class="no-results">
          <uui-icon name="icon-search"></uui-icon>
          <span>No collections match "${this._searchTerm}"</span>
        </div>
      ` : n`
      <div class="table-container">
        <uui-table class="collection-table">
          <uui-table-head>
            <uui-table-head-cell>Collection</uui-table-head-cell>
            <uui-table-head-cell>Products</uui-table-head-cell>
            <uui-table-head-cell class="actions-header">Actions</uui-table-head-cell>
          </uui-table-head>
          ${e.map((t) => this._renderCollectionRow(t))}
        </uui-table>
      </div>
    `;
  }
  _renderContent() {
    return this._isLoading ? this._renderLoadingState() : this._errorMessage ? this._renderErrorState() : this._collections.length === 0 ? this._renderEmptyState() : this._renderCollectionsTable();
  }
  render() {
    const e = this._collections.length > 0 && !this._isLoading;
    return n`
      <umb-body-layout header-fit-height main-no-padding>
        <div class="collections-container">
          <!-- Header Actions -->
          <div class="header-actions">
            ${e ? n`
              <uui-input
                id="search-input"
                type="search"
                placeholder="Search collections..."
                .value=${this._searchTerm}
                @input=${this._handleSearchInput}>
                <uui-icon name="icon-search" slot="prepend"></uui-icon>
              </uui-input>
            ` : w}
            <uui-button
              look="primary"
              color="positive"
              label="Add Collection"
              @click=${this._handleAddCollection}>
              Add Collection
            </uui-button>
          </div>

          <!-- Info Banner -->
          <div class="info-banner">
            <uui-icon name="icon-info"></uui-icon>
            <span>Collections help you organize products into groups for easier management and can be used for filtering in your storefront.</span>
          </div>

          <!-- Content -->
          ${this._renderContent()}
        </div>
      </umb-body-layout>
    `;
  }
};
d = /* @__PURE__ */ new WeakMap();
c = /* @__PURE__ */ new WeakMap();
a = /* @__PURE__ */ new WeakMap();
r.styles = [
  k`
      :host {
        display: block;
        height: 100%;
        background: var(--uui-color-background);
      }

      .collections-container {
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

      #search-input {
        width: 300px;
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

      .collection-table {
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

      .collection-info {
        display: flex;
        flex-direction: column;
        gap: var(--uui-size-space-1);
      }

      .collection-name {
        font-weight: 500;
        color: var(--uui-color-interactive);
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

      .no-results {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: var(--uui-size-space-3);
        padding: var(--uui-size-space-6);
        color: var(--uui-color-text-alt);
      }

      .no-results uui-icon {
        font-size: 2rem;
      }
    `
];
h([
  p()
], r.prototype, "_collections", 2);
h([
  p()
], r.prototype, "_isLoading", 2);
h([
  p()
], r.prototype, "_errorMessage", 2);
h([
  p()
], r.prototype, "_isDeleting", 2);
h([
  p()
], r.prototype, "_searchTerm", 2);
r = h([
  x("merchello-collections-workspace")
], r);
const U = r;
export {
  r as MerchelloCollectionsWorkspaceElement,
  U as default
};
//# sourceMappingURL=collections-workspace.element-CLxkOInQ.js.map
