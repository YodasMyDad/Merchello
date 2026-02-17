import { LitElement as $, html as c, nothing as w, css as P, state as n, customElement as C } from "@umbraco-cms/backoffice/external/lit";
import { UmbElementMixin as x } from "@umbraco-cms/backoffice/element-api";
import { UmbModalToken as T, UMB_MODAL_MANAGER_CONTEXT as k } from "@umbraco-cms/backoffice/modal";
import { UMB_NOTIFICATION_CONTEXT as D } from "@umbraco-cms/backoffice/notification";
import { M as m } from "./merchello-api-B3w7Bp8a.js";
import { g as E } from "./store-settings-Dx1zaCtS.js";
import { e as M } from "./formatting-C7zDJOqJ.js";
import { h as v, i as _ } from "./navigation-CvTcY6zJ.js";
import "./merchello-empty-state.element-mt97UoA5.js";
import "./pagination.element-sDi4Myhy.js";
const S = new T("Merchello.ProductFeed.Validation.Modal", {
  modal: {
    type: "sidebar",
    size: "large"
  }
});
var L = Object.defineProperty, z = Object.getOwnPropertyDescriptor, y = (e) => {
  throw TypeError(e);
}, s = (e, t, a, l) => {
  for (var o = l > 1 ? void 0 : l ? z(t, a) : t, u = e.length - 1, b; u >= 0; u--)
    (b = e[u]) && (o = (l ? b(t, a, o) : b(o)) || o);
  return l && o && L(t, a, o), o;
}, F = (e, t, a) => t.has(e) || y("Cannot " + a), r = (e, t, a) => (F(e, t, "read from private field"), t.get(e)), f = (e, t, a) => t.has(e) ? y("Cannot add the same private member more than once") : t instanceof WeakSet ? t.add(e) : t.set(e, a), g = (e, t, a, l) => (F(e, t, "write to private field"), t.set(e, a), a), d, p, h;
let i = class extends x($) {
  constructor() {
    super(), this._feeds = [], this._isLoading = !0, this._errorMessage = null, this._search = "", this._filterTab = "all", this._page = 1, this._pageSize = 25, this._isRebuildingId = null, this._isDeletingId = null, this._searchDebounceTimer = null, f(this, d), f(this, p), f(this, h, !1), this.consumeContext(D, (e) => {
      g(this, d, e);
    }), this.consumeContext(k, (e) => {
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
    const e = await E();
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
    const { data: a, error: l } = await m.rebuildProductFeed(e.id);
    if (r(this, h)) {
      if (this._isRebuildingId = null, l || !a) {
        r(this, d)?.peek("danger", {
          data: {
            headline: "Rebuild failed",
            message: l?.message ?? "Unable to rebuild feed."
          }
        });
        return;
      }
      a.success ? r(this, d)?.peek("positive", {
        data: {
          headline: "Feed rebuilt",
          message: `${a.productItemCount} products and ${a.promotionCount} promotions generated.`
        }
      }) : r(this, d)?.peek("warning", {
        data: {
          headline: "Rebuild completed with error",
          message: a.error ?? "Feed rebuild failed."
        }
      }), await this._loadFeeds();
    }
  }
  async _deleteFeed(e, t) {
    if (t.preventDefault(), t.stopPropagation(), !confirm(`Delete feed "${e.name}"? This cannot be undone.`))
      return;
    this._isDeletingId = e.id;
    const { error: a } = await m.deleteProductFeed(e.id);
    if (r(this, h)) {
      if (this._isDeletingId = null, a) {
        r(this, d)?.peek("danger", {
          data: {
            headline: "Delete failed",
            message: a.message
          }
        });
        return;
      }
      r(this, d)?.peek("positive", {
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
    return c`<div class="loading"><uui-loader></uui-loader></div>`;
  }
  _renderError() {
    return c`
      <div class="error-banner">
        <uui-icon name="icon-alert"></uui-icon>
        <span>${this._errorMessage}</span>
      </div>
    `;
  }
  _renderEmpty() {
    return this._search.trim().length > 0 || this._filterTab !== "all" ? c`
        <merchello-empty-state
          icon="icon-search"
          headline="No matching feeds"
          message="Try adjusting your search or filters.">
        </merchello-empty-state>
      ` : c`
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
    const t = this._isRebuildingId === e.id, a = this._isDeletingId === e.id, l = this._getFeedHealthStatus(e), o = this._getFeedEndpointPath(e);
    return c`
      <uui-table-row class="clickable" href=${_(e.id)}>
        <uui-table-cell>
          <div class="feed-name-block">
            <a class="feed-name" href=${_(e.id)}>${e.name}</a>
            <span class="feed-slug">${o}</span>
            <span class="feed-slug-hint">Token required</span>
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
          ${e.lastGeneratedUtc ? M(e.lastGeneratedUtc) : "Never"}
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
              ?disabled=${a}
              @click=${(u) => this._deleteFeed(e, u)}
              label="Delete">
              <uui-icon name=${a ? "icon-hourglass" : "icon-trash"}></uui-icon>
            </uui-button>
          </div>
        </uui-table-cell>
      </uui-table-row>
    `;
  }
  _renderTable() {
    const e = this._getPagedFeeds();
    return e.length === 0 ? this._renderEmpty() : c`
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
    return c`
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

          ${!this._isLoading && e.totalItems > 0 ? c`
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
d = /* @__PURE__ */ new WeakMap();
p = /* @__PURE__ */ new WeakMap();
h = /* @__PURE__ */ new WeakMap();
i.styles = P`
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

    .feed-slug-hint {
      color: var(--uui-color-text-alt);
      font-size: var(--uui-type-small-size);
      text-transform: uppercase;
      letter-spacing: 0.04em;
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
], i.prototype, "_feeds", 2);
s([
  n()
], i.prototype, "_isLoading", 2);
s([
  n()
], i.prototype, "_errorMessage", 2);
s([
  n()
], i.prototype, "_search", 2);
s([
  n()
], i.prototype, "_filterTab", 2);
s([
  n()
], i.prototype, "_page", 2);
s([
  n()
], i.prototype, "_pageSize", 2);
s([
  n()
], i.prototype, "_isRebuildingId", 2);
s([
  n()
], i.prototype, "_isDeletingId", 2);
i = s([
  C("merchello-product-feeds-list")
], i);
const V = i;
export {
  i as MerchelloProductFeedsListElement,
  V as default
};
//# sourceMappingURL=product-feeds-list.element-BuVaR-3j.js.map
