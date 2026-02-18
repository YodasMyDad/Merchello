import { LitElement as $, html as d, nothing as w, css as P, state as n, customElement as C } from "@umbraco-cms/backoffice/external/lit";
import { UmbElementMixin as T } from "@umbraco-cms/backoffice/element-api";
import { UmbModalToken as x, UMB_MODAL_MANAGER_CONTEXT as D } from "@umbraco-cms/backoffice/modal";
import { UMB_NOTIFICATION_CONTEXT as E } from "@umbraco-cms/backoffice/notification";
import { M as m } from "./merchello-api-COnU_HX2.js";
import { g as M } from "./store-settings-BKyRkVmT.js";
import { e as k } from "./formatting-CZRy3TEt.js";
import { h as v, i as _ } from "./navigation-CvTcY6zJ.js";
import "./merchello-empty-state.element-mt97UoA5.js";
import "./pagination.element-sDi4Myhy.js";
const S = new x("Merchello.ProductFeed.Validation.Modal", {
  modal: {
    type: "sidebar",
    size: "large"
  }
});
var L = Object.defineProperty, z = Object.getOwnPropertyDescriptor, y = (e) => {
  throw TypeError(e);
}, s = (e, t, i, l) => {
  for (var o = l > 1 ? void 0 : l ? z(t, i) : t, u = e.length - 1, b; u >= 0; u--)
    (b = e[u]) && (o = (l ? b(t, i, o) : b(o)) || o);
  return l && o && L(t, i, o), o;
}, F = (e, t, i) => t.has(e) || y("Cannot " + i), r = (e, t, i) => (F(e, t, "read from private field"), t.get(e)), f = (e, t, i) => t.has(e) ? y("Cannot add the same private member more than once") : t instanceof WeakSet ? t.add(e) : t.set(e, i), g = (e, t, i, l) => (F(e, t, "write to private field"), t.set(e, i), i), c, p, h;
let a = class extends T($) {
  constructor() {
    super(), this._feeds = [], this._isLoading = !0, this._errorMessage = null, this._search = "", this._filterTab = "all", this._page = 1, this._pageSize = 25, this._isRebuildingId = null, this._isDeletingId = null, this._searchDebounceTimer = null, f(this, c), f(this, p), f(this, h, !1), this.consumeContext(E, (e) => {
      g(this, c, e);
    }), this.consumeContext(D, (e) => {
      g(this, p, e);
    });
  }
  connectedCallback() {
    super.connectedCallback(), g(this, h, !0), this._initialize();
  }
  disconnectedCallback() {
    super.disconnectedCallback(), g(this, h, !1), this._searchDebounceTimer && (clearTimeout(this._searchDebounceTimer), this._searchDebounceTimer = null);
  }
  async _initialize() {
    const e = await M();
    r(this, h) && (this._pageSize = e.defaultPaginationPageSize, await this._loadFeeds());
  }
  async _loadFeeds() {
    this._isLoading = !0, this._errorMessage = null;
    const { data: e, error: t } = await m.getProductFeeds();
    if (r(this, h)) {
      if (t) {
        this._errorMessage = t.message, this._isLoading = !1;
        return;
      }
      this._feeds = e ?? [], this._isLoading = !1;
    }
  }
  _onSearchInput(e) {
    const t = e.target.value;
    this._searchDebounceTimer && clearTimeout(this._searchDebounceTimer), this._searchDebounceTimer = setTimeout(() => {
      this._search = t, this._page = 1;
    }, 250);
  }
  _setFilter(e) {
    this._filterTab = e, this._page = 1;
  }
  _onPageChange(e) {
    this._page = e.detail.page;
  }
  _getFilteredFeeds() {
    const e = this._search.trim().toLowerCase();
    return this._feeds.filter((t) => this._filterTab === "enabled" && !t.isEnabled || this._filterTab === "disabled" && t.isEnabled ? !1 : e ? t.name.toLowerCase().includes(e) || t.slug.toLowerCase().includes(e) || t.countryCode.toLowerCase().includes(e) || t.currencyCode.toLowerCase().includes(e) : !0);
  }
  _getPagedFeeds() {
    const e = this._getFilteredFeeds(), t = (this._page - 1) * this._pageSize;
    return e.slice(t, t + this._pageSize);
  }
  _getPaginationState() {
    const e = this._getFilteredFeeds().length, t = Math.max(1, Math.ceil(e / this._pageSize));
    return this._page > t && (this._page = t), {
      page: this._page,
      pageSize: this._pageSize,
      totalItems: e,
      totalPages: t
    };
  }
  async _rebuildFeed(e, t) {
    t.preventDefault(), t.stopPropagation(), this._isRebuildingId = e.id;
    const { data: i, error: l } = await m.rebuildProductFeed(e.id);
    if (r(this, h)) {
      if (this._isRebuildingId = null, l || !i) {
        r(this, c)?.peek("danger", {
          data: {
            headline: "Rebuild failed",
            message: l?.message ?? "Unable to rebuild feed."
          }
        });
        return;
      }
      i.success ? r(this, c)?.peek("positive", {
        data: {
          headline: "Feed rebuilt",
          message: `${i.productItemCount} products and ${i.promotionCount} promotions generated.`
        }
      }) : r(this, c)?.peek("warning", {
        data: {
          headline: "Rebuild completed with error",
          message: i.error ?? "Feed rebuild failed."
        }
      }), await this._loadFeeds();
    }
  }
  async _deleteFeed(e, t) {
    if (t.preventDefault(), t.stopPropagation(), !confirm(`Delete feed "${e.name}"? This cannot be undone.`))
      return;
    this._isDeletingId = e.id;
    const { error: i } = await m.deleteProductFeed(e.id);
    if (r(this, h)) {
      if (this._isDeletingId = null, i) {
        r(this, c)?.peek("danger", {
          data: {
            headline: "Delete failed",
            message: i.message
          }
        });
        return;
      }
      r(this, c)?.peek("positive", {
        data: {
          headline: "Feed deleted",
          message: `"${e.name}" was deleted.`
        }
      }), await this._loadFeeds();
    }
  }
  async _validateFeed(e, t) {
    if (t.preventDefault(), t.stopPropagation(), !r(this, p))
      return;
    await r(this, p).open(this, S, {
      data: {
        feedId: e.id,
        feedName: e.name
      }
    }).onSubmit().catch(() => {
    });
  }
  _renderLoading() {
    return d`<div class="loading"><uui-loader></uui-loader></div>`;
  }
  _renderError() {
    return d`
      <div class="error-banner">
        <uui-icon name="icon-alert"></uui-icon>
        <span>${this._errorMessage}</span>
      </div>
    `;
  }
  _renderEmpty() {
    return this._search.trim().length > 0 || this._filterTab !== "all" ? d`
        <merchello-empty-state
          icon="icon-search"
          headline="No matching feeds"
          message="Try adjusting your search or filters.">
        </merchello-empty-state>
      ` : d`
      <merchello-empty-state
        icon="icon-rss"
        headline="No product feeds created"
        message="Create a feed to publish Google Shopping product and promotion XML.">
        <uui-button slot="action" look="primary" color="positive" href=${v()}>
          Create Feed
        </uui-button>
      </merchello-empty-state>
    `;
  }
  _getFeedEndpointPath(e) {
    return `/api/merchello/feeds/${e.slug}.xml`;
  }
  _getFeedHealthStatus(e) {
    return e.lastGenerationError ? {
      label: "Error",
      color: "danger",
      title: e.lastGenerationError
    } : e.lastGeneratedUtc ? {
      label: "Healthy",
      color: "positive",
      title: "Last generation completed without recorded errors."
    } : {
      label: "Not Generated",
      color: "default",
      title: "No generation run has completed yet."
    };
  }
  _renderFeedRow(e) {
    const t = this._isRebuildingId === e.id, i = this._isDeletingId === e.id, l = this._getFeedHealthStatus(e), o = this._getFeedEndpointPath(e);
    return d`
      <uui-table-row class="clickable" href=${_(e.id)}>
        <uui-table-cell>
          <div class="feed-name-block">
            <a class="feed-name" href=${_(e.id)}>${e.name}</a>
            <span class="feed-slug">${o}</span>
          </div>
        </uui-table-cell>
        <uui-table-cell>${e.countryCode}</uui-table-cell>
        <uui-table-cell>${e.currencyCode}</uui-table-cell>
        <uui-table-cell>${e.languageCode}</uui-table-cell>
        <uui-table-cell>
          <uui-tag color=${e.isEnabled ? "positive" : "default"}>
            ${e.isEnabled ? "Enabled" : "Disabled"}
          </uui-tag>
        </uui-table-cell>
        <uui-table-cell>
          ${e.lastGeneratedUtc ? k(e.lastGeneratedUtc) : "Never"}
        </uui-table-cell>
        <uui-table-cell>
          <div class="snapshot-tags">
            <uui-tag
              color=${e.hasProductSnapshot ? "positive" : "default"}
              title="Products XML snapshot">
              ${e.hasProductSnapshot ? "Products Ready" : "Products Missing"}
            </uui-tag>
            <uui-tag
              color=${e.hasPromotionsSnapshot ? "positive" : "default"}
              title="Promotions XML snapshot">
              ${e.hasPromotionsSnapshot ? "Promotions Ready" : "Promotions Missing"}
            </uui-tag>
          </div>
        </uui-table-cell>
        <uui-table-cell>
          <uui-tag color=${l.color} title=${l.title}>
            ${l.label}
          </uui-tag>
        </uui-table-cell>
        <uui-table-cell>
          <div class="actions">
            <uui-button
              compact
              look="secondary"
              href=${_(e.id)}
              label="Edit">
              <uui-icon name="icon-edit"></uui-icon>
            </uui-button>
            <uui-button
              compact
              look="secondary"
              ?disabled=${t}
              @click=${(u) => this._rebuildFeed(e, u)}
              label="Rebuild">
              <uui-icon name=${t ? "icon-hourglass" : "icon-sync"}></uui-icon>
            </uui-button>
            <uui-button
              compact
              look="secondary"
              @click=${(u) => this._validateFeed(e, u)}
              label="Validate">
              <uui-icon name="icon-search"></uui-icon>
            </uui-button>
            <uui-button
              compact
              look="secondary"
              color="danger"
              ?disabled=${i}
              @click=${(u) => this._deleteFeed(e, u)}
              label="Delete">
              <uui-icon name=${i ? "icon-hourglass" : "icon-trash"}></uui-icon>
            </uui-button>
          </div>
        </uui-table-cell>
      </uui-table-row>
    `;
  }
  _renderTable() {
    const e = this._getPagedFeeds();
    return e.length === 0 ? this._renderEmpty() : d`
      <div class="table-wrap">
        <uui-table>
          <uui-table-head>
            <uui-table-head-cell>Name</uui-table-head-cell>
            <uui-table-head-cell>Country</uui-table-head-cell>
            <uui-table-head-cell>Currency</uui-table-head-cell>
            <uui-table-head-cell>Lang</uui-table-head-cell>
            <uui-table-head-cell>Status</uui-table-head-cell>
            <uui-table-head-cell>Last Generated</uui-table-head-cell>
            <uui-table-head-cell>Snapshots</uui-table-head-cell>
            <uui-table-head-cell>Health</uui-table-head-cell>
            <uui-table-head-cell>Actions</uui-table-head-cell>
          </uui-table-head>
          ${e.map((t) => this._renderFeedRow(t))}
        </uui-table>
      </div>
    `;
  }
  render() {
    const e = this._getPaginationState();
    return d`
      <umb-body-layout header-fit-height main-no-padding>
        <div class="container">
          <div class="toolbar">
            <uui-input
              class="search"
              type="text"
              placeholder="Search by name, slug, country, or currency"
              @input=${this._onSearchInput}>
              <uui-icon slot="prepend" name="icon-search"></uui-icon>
            </uui-input>
            <uui-button look="primary" color="positive" href=${v()}>
              <uui-icon name="icon-add" slot="icon"></uui-icon>
              Create Feed
            </uui-button>
          </div>

          <uui-tab-group class="tabs">
            <uui-tab
              label="All"
              ?active=${this._filterTab === "all"}
              @click=${() => this._setFilter("all")}>
              All
            </uui-tab>
            <uui-tab
              label="Enabled"
              ?active=${this._filterTab === "enabled"}
              @click=${() => this._setFilter("enabled")}>
              Enabled
            </uui-tab>
            <uui-tab
              label="Disabled"
              ?active=${this._filterTab === "disabled"}
              @click=${() => this._setFilter("disabled")}>
              Disabled
            </uui-tab>
          </uui-tab-group>

          ${this._isLoading ? this._renderLoading() : this._errorMessage ? this._renderError() : this._renderTable()}

          ${!this._isLoading && e.totalItems > 0 ? d`
                <merchello-pagination
                  .state=${e}
                  @page-change=${this._onPageChange}>
                </merchello-pagination>
              ` : w}
        </div>
      </umb-body-layout>
    `;
  }
};
c = /* @__PURE__ */ new WeakMap();
p = /* @__PURE__ */ new WeakMap();
h = /* @__PURE__ */ new WeakMap();
a.styles = P`
    :host {
      display: block;
      height: 100%;
      background: var(--uui-color-background);
    }

    .container {
      max-width: 100%;
      padding: var(--uui-size-layout-1);
    }

    .toolbar {
      display: flex;
      align-items: center;
      gap: var(--uui-size-space-3);
      margin-bottom: var(--uui-size-space-4);
    }

    .search {
      flex: 1;
      max-width: 520px;
    }

    .tabs {
      margin-bottom: var(--uui-size-space-4);
    }

    .table-wrap {
      background: var(--uui-color-surface);
      border: 1px solid var(--uui-color-border);
      border-radius: var(--uui-border-radius);
      overflow-x: auto;
      margin-bottom: var(--uui-size-space-4);
    }

    uui-table {
      width: 100%;
    }

    uui-table-head-cell,
    uui-table-cell {
      white-space: nowrap;
      vertical-align: middle;
    }

    .feed-name-block {
      display: flex;
      flex-direction: column;
      gap: 2px;
    }

    .feed-name {
      color: var(--uui-color-interactive);
      font-weight: 600;
      text-decoration: none;
    }

    .feed-slug {
      font-family: var(--uui-font-monospace);
      font-size: var(--uui-type-small-size);
      color: var(--uui-color-text-alt);
    }

    .snapshot-tags {
      display: flex;
      align-items: center;
      gap: var(--uui-size-space-1);
      flex-wrap: wrap;
    }

    .snapshot-tags uui-tag {
      white-space: nowrap;
    }

    .actions {
      display: flex;
      gap: 4px;
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

    @media (max-width: 900px) {
      .toolbar {
        flex-direction: column;
        align-items: stretch;
      }

      .search {
        max-width: none;
      }
    }
  `;
s([
  n()
], a.prototype, "_feeds", 2);
s([
  n()
], a.prototype, "_isLoading", 2);
s([
  n()
], a.prototype, "_errorMessage", 2);
s([
  n()
], a.prototype, "_search", 2);
s([
  n()
], a.prototype, "_filterTab", 2);
s([
  n()
], a.prototype, "_page", 2);
s([
  n()
], a.prototype, "_pageSize", 2);
s([
  n()
], a.prototype, "_isRebuildingId", 2);
s([
  n()
], a.prototype, "_isDeletingId", 2);
a = s([
  C("merchello-product-feeds-list")
], a);
const V = a;
export {
  a as MerchelloProductFeedsListElement,
  V as default
};
//# sourceMappingURL=product-feeds-list.element-AFiPqB7I.js.map
