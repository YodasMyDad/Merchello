import { LitElement as w, html as r, nothing as g, css as x, state as h, customElement as k } from "@umbraco-cms/backoffice/external/lit";
import { UmbElementMixin as M } from "@umbraco-cms/backoffice/element-api";
import { UmbModalToken as $, UMB_MODAL_MANAGER_CONTEXT as T, UMB_CONFIRM_MODAL as E } from "@umbraco-cms/backoffice/modal";
import { UMB_NOTIFICATION_CONTEXT as S } from "@umbraco-cms/backoffice/notification";
import { M as C } from "./merchello-api-Dp_zU_yi.js";
import "./merchello-empty-state.element-D2dcD7_8.js";
const f = new $("Merchello.Collection.Modal", {
  modal: {
    type: "sidebar",
    size: "medium"
  }
});
var D = Object.defineProperty, L = Object.getOwnPropertyDescriptor, v = (e) => {
  throw TypeError(e);
}, d = (e, t, i, a) => {
  for (var l = a > 1 ? void 0 : a ? L(t, i) : t, m = e.length - 1, _; m >= 0; m--)
    (_ = e[m]) && (l = (a ? _(t, i, l) : _(l)) || l);
  return a && l && D(t, i, l), l;
}, y = (e, t, i) => t.has(e) || v("Cannot " + i), o = (e, t, i) => (y(e, t, "read from private field"), t.get(e)), b = (e, t, i) => t.has(e) ? v("Cannot add the same private member more than once") : t instanceof WeakSet ? t.add(e) : t.set(e, i), p = (e, t, i, a) => (y(e, t, "write to private field"), t.set(e, i), i), u, c, s;
let n = class extends M(w) {
  constructor() {
    super(), this._collections = [], this._isLoading = !0, this._errorMessage = null, this._isDeletingCollectionId = null, this._searchTerm = "", b(this, u), b(this, c), b(this, s, !1), this.consumeContext(T, (e) => {
      p(this, u, e);
    }), this.consumeContext(S, (e) => {
      p(this, c, e);
    });
  }
  connectedCallback() {
    super.connectedCallback(), p(this, s, !0), this._loadCollections();
  }
  disconnectedCallback() {
    super.disconnectedCallback(), p(this, s, !1);
  }
  async _loadCollections(e = !0) {
    e && (this._isLoading = !0), this._errorMessage = null;
    const { data: t, error: i } = await C.getProductCollections();
    if (o(this, s)) {
      if (i) {
        this._errorMessage = i.message, this._isLoading = !1;
        return;
      }
      this._collections = t ?? [], this._isLoading = !1;
    }
  }
  get _filteredCollections() {
    const e = [...this._collections].sort((i, a) => i.name.localeCompare(a.name));
    if (!this._searchTerm.trim())
      return e;
    const t = this._searchTerm.toLowerCase().trim();
    return e.filter(
      (i) => i.name.toLowerCase().includes(t)
    );
  }
  _handleSearchInput(e) {
    this._searchTerm = e.target.value;
  }
  _handleSearchClear() {
    this._searchTerm = "";
  }
  async _handleAddCollection() {
    const t = await o(this, u)?.open(this, f, {
      data: {}
    })?.onSubmit().catch(() => {
    });
    o(this, s) && t?.isCreated && (o(this, c)?.peek("positive", {
      data: { headline: "Collection created", message: "The collection has been created." }
    }), await this._loadCollections(!1));
  }
  async _handleEditCollection(e) {
    const i = await o(this, u)?.open(this, f, {
      data: { collection: e }
    })?.onSubmit().catch(() => {
    });
    o(this, s) && i?.isUpdated && (o(this, c)?.peek("positive", {
      data: { headline: "Collection updated", message: "The collection has been updated." }
    }), await this._loadCollections(!1));
  }
  async _handleDelete(e, t) {
    e.preventDefault(), e.stopPropagation();
    const i = t.productCount > 0 ? ` It is currently assigned to ${t.productCount} product${t.productCount === 1 ? "" : "s"} and will be removed from those products.` : "", a = o(this, u)?.open(this, E, {
      data: {
        headline: "Delete collection",
        content: `Delete "${t.name}"?${i} This action cannot be undone.`,
        confirmLabel: "Delete",
        color: "danger"
      }
    });
    try {
      await a?.onSubmit();
    } catch {
      return;
    }
    if (!o(this, s)) return;
    this._isDeletingCollectionId = t.id;
    const { error: l } = await C.deleteProductCollection(t.id);
    if (o(this, s)) {
      if (this._isDeletingCollectionId = null, l) {
        this._errorMessage = `Failed to delete collection: ${l.message}`, o(this, c)?.peek("danger", {
          data: { headline: "Delete failed", message: l.message || "Could not delete collection." }
        });
        return;
      }
      o(this, c)?.peek("positive", {
        data: { headline: "Collection deleted", message: "The collection has been deleted." }
      }), await this._loadCollections(!1);
    }
  }
  _renderLoadingState() {
    return r`<div class="loading"><uui-loader></uui-loader></div>`;
  }
  _renderErrorState() {
    return r`
      <uui-box>
        <div class="error-banner" role="alert">
          <uui-icon name="icon-alert"></uui-icon>
          <span>${this._errorMessage}</span>
          <uui-button look="secondary" label="Retry" @click=${() => this._loadCollections()}>
            Retry
          </uui-button>
        </div>
      </uui-box>
    `;
  }
  _renderEmptyState() {
    return r`
      <merchello-empty-state
        icon="icon-tag"
        headline="No collections yet"
        message="Create collections to organize and group your products.">
        <uui-button slot="actions" look="primary" color="positive" label="Add collection" @click=${this._handleAddCollection}>
          Add Collection
        </uui-button>
      </merchello-empty-state>
    `;
  }
  _renderNoResultsState() {
    return r`
      <merchello-empty-state
        icon="icon-search"
        headline="No matching collections"
        message="Try a different search term or clear the current filter.">
        <uui-button slot="actions" look="secondary" label="Clear search" @click=${this._handleSearchClear}>
          Clear Search
        </uui-button>
      </merchello-empty-state>
    `;
  }
  _renderCollectionsTable() {
    const e = this._filteredCollections;
    return r`
      <uui-box class="table-box">
        <div class="table-scroll">
          <uui-table class="collection-table">
            <uui-table-head>
              <uui-table-head-cell>Collection</uui-table-head-cell>
              <uui-table-head-cell class="numeric-col">Products</uui-table-head-cell>
              <uui-table-head-cell class="actions-col">Actions</uui-table-head-cell>
            </uui-table-head>
            ${e.map((t) => this._renderCollectionRow(t))}
          </uui-table>
        </div>
      </uui-box>
    `;
  }
  _renderCollectionRow(e) {
    const t = this._isDeletingCollectionId === e.id;
    return r`
      <uui-table-row class="clickable" @click=${() => this._handleEditCollection(e)}>
        <uui-table-cell>
          <span class="collection-name">${e.name}</span>
        </uui-table-cell>
        <uui-table-cell class="numeric-col">${e.productCount}</uui-table-cell>
        <uui-table-cell class="actions-col">
          <div class="actions-cell">
            <uui-button
              look="secondary"
              compact
              label=${`Edit collection ${e.name}`}
              @click=${(i) => {
      i.stopPropagation(), this._handleEditCollection(e);
    }}>
              Edit
            </uui-button>
            <uui-button
              look="secondary"
              color="danger"
              compact
              label=${`Delete collection ${e.name}`}
              ?disabled=${t}
              @click=${(i) => this._handleDelete(i, e)}>
              ${t ? "Deleting..." : "Delete"}
            </uui-button>
          </div>
        </uui-table-cell>
      </uui-table-row>
    `;
  }
  _renderContent() {
    return this._isLoading ? this._renderLoadingState() : this._errorMessage ? this._renderErrorState() : this._collections.length === 0 ? this._renderEmptyState() : this._filteredCollections.length === 0 ? this._renderNoResultsState() : this._renderCollectionsTable();
  }
  render() {
    const e = this._collections.length > 0 && !this._isLoading;
    return r`
      <umb-body-layout header-fit-height main-no-padding>
        <div class="collections-container">
          <uui-box>
            <div class="header-actions">
              <div class="search-box">
                ${e ? r`
                      <uui-input
                        id="search-input"
                        type="search"
                        label="Search collections"
                        placeholder="Search collections"
                        .value=${this._searchTerm}
                        @input=${this._handleSearchInput}>
                        <uui-icon name="icon-search" slot="prepend"></uui-icon>
                        ${this._searchTerm ? r`
                              <uui-button
                                slot="append"
                                compact
                                look="secondary"
                                label="Clear search"
                                @click=${this._handleSearchClear}>
                                <uui-icon name="icon-wrong"></uui-icon>
                              </uui-button>
                            ` : g}
                      </uui-input>
                    ` : g}
              </div>

              <uui-button look="primary" color="positive" label="Add collection" @click=${this._handleAddCollection}>
                Add Collection
              </uui-button>
            </div>

            <p class="helper-text">
              Collections group products for merchandising, filtering, and storefront browsing.
            </p>
          </uui-box>

          ${this._renderContent()}
        </div>
      </umb-body-layout>
    `;
  }
};
u = /* @__PURE__ */ new WeakMap();
c = /* @__PURE__ */ new WeakMap();
s = /* @__PURE__ */ new WeakMap();
n.styles = [
  x`
      :host {
        display: block;
        height: 100%;
        background: var(--uui-color-background);
      }

      .collections-container {
        max-width: 100%;
        padding: var(--uui-size-layout-1);
        display: flex;
        flex-direction: column;
        gap: var(--uui-size-space-4);
      }

      .header-actions {
        display: flex;
        gap: var(--uui-size-space-3);
        align-items: center;
        justify-content: space-between;
        flex-wrap: wrap;
      }

      .search-box {
        flex: 1 1 320px;
        min-width: 240px;
      }

      .search-box uui-input {
        width: 100%;
      }

      .helper-text {
        margin: var(--uui-size-space-3) 0 0;
        color: var(--uui-color-text-alt);
      }

      .table-box {
        --uui-box-default-padding: 0;
        overflow: hidden;
      }

      .table-scroll {
        overflow-x: auto;
      }

      .collection-table {
        width: 100%;
      }

      uui-table-row.clickable {
        cursor: pointer;
      }

      uui-table-row.clickable:hover {
        background: var(--uui-color-surface-emphasis);
      }

      .collection-name {
        color: var(--uui-color-interactive);
        font-weight: 600;
      }

      .numeric-col {
        text-align: right;
      }

      .actions-col {
        text-align: right;
        white-space: nowrap;
      }

      .actions-cell {
        display: inline-flex;
        gap: var(--uui-size-space-2);
        justify-content: flex-end;
      }

      .loading {
        display: flex;
        justify-content: center;
        padding: var(--uui-size-space-6);
      }

      .error-banner {
        display: flex;
        align-items: center;
        gap: var(--uui-size-space-3);
        flex-wrap: wrap;
        padding: var(--uui-size-space-4);
        background: var(--uui-color-danger-standalone);
        color: var(--uui-color-danger-contrast);
        border-radius: var(--uui-border-radius);
      }
    `
];
d([
  h()
], n.prototype, "_collections", 2);
d([
  h()
], n.prototype, "_isLoading", 2);
d([
  h()
], n.prototype, "_errorMessage", 2);
d([
  h()
], n.prototype, "_isDeletingCollectionId", 2);
d([
  h()
], n.prototype, "_searchTerm", 2);
n = d([
  k("merchello-collections-workspace")
], n);
const R = n;
export {
  n as MerchelloCollectionsWorkspaceElement,
  R as default
};
//# sourceMappingURL=collections-workspace.element-C6fDlcT5.js.map
