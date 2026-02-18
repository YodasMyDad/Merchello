import { LitElement as w, html as n, nothing as b, css as k, state as h, customElement as $ } from "@umbraco-cms/backoffice/external/lit";
import { UmbElementMixin as M } from "@umbraco-cms/backoffice/element-api";
import { UmbModalToken as T, UMB_MODAL_MANAGER_CONTEXT as E, UMB_CONFIRM_MODAL as S } from "@umbraco-cms/backoffice/modal";
import { UMB_NOTIFICATION_CONTEXT as D } from "@umbraco-cms/backoffice/notification";
import { M as f } from "./merchello-api-Dp_zU_yi.js";
import "./merchello-empty-state.element-mt97UoA5.js";
const v = new T("Merchello.Collection.Modal", {
  modal: {
    type: "sidebar",
    size: "medium"
  }
});
var L = Object.defineProperty, A = Object.getOwnPropertyDescriptor, y = (t) => {
  throw TypeError(t);
}, u = (t, e, i, a) => {
  for (var l = a > 1 ? void 0 : a ? A(e, i) : e, _ = t.length - 1, g; _ >= 0; _--)
    (g = t[_]) && (l = (a ? g(e, i, l) : g(l)) || l);
  return a && l && L(e, i, l), l;
}, x = (t, e, i) => e.has(t) || y("Cannot " + i), o = (t, e, i) => (x(t, e, "read from private field"), e.get(t)), p = (t, e, i) => e.has(t) ? y("Cannot add the same private member more than once") : e instanceof WeakSet ? e.add(t) : e.set(t, i), m = (t, e, i, a) => (x(t, e, "write to private field"), e.set(t, i), i), d, c, r, C;
let s = class extends M(w) {
  constructor() {
    super(), this._collections = [], this._isLoading = !0, this._errorMessage = null, this._isDeletingCollectionId = null, this._searchTerm = "", p(this, d), p(this, c), p(this, r, !1), p(this, C, {
      allowSelection: !1,
      hideIcon: !0
    }), this.consumeContext(E, (t) => {
      m(this, d, t);
    }), this.consumeContext(D, (t) => {
      m(this, c, t);
    });
  }
  connectedCallback() {
    super.connectedCallback(), m(this, r, !0), this._loadCollections();
  }
  disconnectedCallback() {
    super.disconnectedCallback(), m(this, r, !1);
  }
  async _loadCollections(t = !0) {
    t && (this._isLoading = !0), this._errorMessage = null;
    const { data: e, error: i } = await f.getProductCollections();
    if (o(this, r)) {
      if (i) {
        this._errorMessage = i.message, this._isLoading = !1;
        return;
      }
      this._collections = e ?? [], this._isLoading = !1;
    }
  }
  get _filteredCollections() {
    const t = [...this._collections].sort((i, a) => i.name.localeCompare(a.name));
    if (!this._searchTerm.trim())
      return t;
    const e = this._searchTerm.toLowerCase().trim();
    return t.filter(
      (i) => i.name.toLowerCase().includes(e)
    );
  }
  _handleSearchInput(t) {
    this._searchTerm = t.target.value;
  }
  _handleSearchClear() {
    this._searchTerm = "";
  }
  get _tableColumns() {
    return [
      { name: "Collection", alias: "collectionName" },
      { name: "Products", alias: "productCount", width: "140px", align: "right" },
      { name: "", alias: "actions", width: "240px", align: "right" }
    ];
  }
  _createTableItems(t) {
    return t.map((e) => {
      const i = this._isDeletingCollectionId === e.id;
      return {
        id: e.id,
        data: [
          {
            columnAlias: "collectionName",
            value: n`
              <button
                type="button"
                class="collection-link"
                @click=${() => this._handleEditCollection(e)}
                aria-label=${`Edit collection ${e.name}`}>
                ${e.name}
              </button>
            `
          },
          {
            columnAlias: "productCount",
            value: e.productCount
          },
          {
            columnAlias: "actions",
            value: n`
              <div class="actions-cell">
                <uui-button
                  look="secondary"
                  compact
                  label=${`Edit collection ${e.name}`}
                  @click=${() => this._handleEditCollection(e)}>
                  Edit
                </uui-button>
                <uui-button
                  look="secondary"
                  color="danger"
                  compact
                  label=${`Delete collection ${e.name}`}
                  ?disabled=${i}
                  @click=${(a) => this._handleDelete(a, e)}>
                  ${i ? "Deleting..." : "Delete"}
                </uui-button>
              </div>
            `
          }
        ]
      };
    });
  }
  async _handleAddCollection() {
    const e = await o(this, d)?.open(this, v, {
      data: {}
    })?.onSubmit().catch(() => {
    });
    o(this, r) && e?.isCreated && (o(this, c)?.peek("positive", {
      data: { headline: "Collection created", message: "The collection has been created." }
    }), await this._loadCollections(!1));
  }
  async _handleEditCollection(t) {
    const i = await o(this, d)?.open(this, v, {
      data: { collection: t }
    })?.onSubmit().catch(() => {
    });
    o(this, r) && i?.isUpdated && (o(this, c)?.peek("positive", {
      data: { headline: "Collection updated", message: "The collection has been updated." }
    }), await this._loadCollections(!1));
  }
  async _handleDelete(t, e) {
    t.preventDefault(), t.stopPropagation();
    const i = e.productCount > 0 ? ` It is currently assigned to ${e.productCount} product${e.productCount === 1 ? "" : "s"} and will be removed from those products.` : "", a = o(this, d)?.open(this, S, {
      data: {
        headline: "Delete collection",
        content: `Delete "${e.name}"?${i} This action cannot be undone.`,
        confirmLabel: "Delete",
        color: "danger"
      }
    });
    try {
      await a?.onSubmit();
    } catch {
      return;
    }
    if (!o(this, r)) return;
    this._isDeletingCollectionId = e.id;
    const { error: l } = await f.deleteProductCollection(e.id);
    if (o(this, r)) {
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
    return n`<div class="loading"><uui-loader></uui-loader></div>`;
  }
  _renderErrorState() {
    return n`
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
    return n`
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
    return n`
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
    const t = this._filteredCollections;
    return n`
      <uui-box class="table-box">
        <umb-table
          .config=${o(this, C)}
          .columns=${this._tableColumns}
          .items=${this._createTableItems(t)}>
        </umb-table>
      </uui-box>
    `;
  }
  _renderContent() {
    return this._isLoading ? this._renderLoadingState() : this._errorMessage ? this._renderErrorState() : this._collections.length === 0 ? this._renderEmptyState() : this._filteredCollections.length === 0 ? this._renderNoResultsState() : this._renderCollectionsTable();
  }
  render() {
    const t = this._collections.length > 0 && !this._isLoading;
    return n`
      <umb-body-layout header-fit-height main-no-padding>
        <div class="collections-container">
          <uui-box>
            <div class="header-actions">
              <div class="search-box">
                ${t ? n`
                      <uui-input
                        id="search-input"
                        type="search"
                        label="Search collections"
                        placeholder="Search collections"
                        .value=${this._searchTerm}
                        @input=${this._handleSearchInput}>
                        <uui-icon name="icon-search" slot="prepend"></uui-icon>
                        ${this._searchTerm ? n`
                              <uui-button
                                slot="append"
                                compact
                                look="secondary"
                                label="Clear search"
                                @click=${this._handleSearchClear}>
                                <uui-icon name="icon-wrong"></uui-icon>
                              </uui-button>
                            ` : b}
                      </uui-input>
                    ` : b}
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
d = /* @__PURE__ */ new WeakMap();
c = /* @__PURE__ */ new WeakMap();
r = /* @__PURE__ */ new WeakMap();
C = /* @__PURE__ */ new WeakMap();
s.styles = [
  k`
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

      .collection-link {
        border: 0;
        background: transparent;
        color: var(--uui-color-interactive);
        cursor: pointer;
        padding: 0;
        font: inherit;
        text-align: left;
        font-weight: 600;
      }

      .collection-link:hover {
        text-decoration: underline;
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
u([
  h()
], s.prototype, "_collections", 2);
u([
  h()
], s.prototype, "_isLoading", 2);
u([
  h()
], s.prototype, "_errorMessage", 2);
u([
  h()
], s.prototype, "_isDeletingCollectionId", 2);
u([
  h()
], s.prototype, "_searchTerm", 2);
s = u([
  $("merchello-collections-workspace")
], s);
const W = s;
export {
  s as MerchelloCollectionsWorkspaceElement,
  W as default
};
//# sourceMappingURL=collections-workspace.element-rnibtzII.js.map
