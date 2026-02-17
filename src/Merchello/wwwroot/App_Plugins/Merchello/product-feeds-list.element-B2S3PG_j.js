import { LitElement as w, html as r, nothing as x, css as $, state as n, customElement as F } from "@umbraco-cms/backoffice/external/lit";
import { UmbElementMixin as k } from "@umbraco-cms/backoffice/element-api";
import { UMB_NOTIFICATION_CONTEXT as C } from "@umbraco-cms/backoffice/notification";
import { M as g } from "./merchello-api-DVoMavUk.js";
import { g as T } from "./store-settings-K64Q2coM.js";
import { e as D } from "./formatting-C1GHFA0J.js";
import { h as _, i as b } from "./navigation-CvTcY6zJ.js";
import "./merchello-empty-state.element-mt97UoA5.js";
import "./pagination.element-sDi4Myhy.js";
var P = Object.defineProperty, z = Object.getOwnPropertyDescriptor, v = (e) => {
  throw TypeError(e);
}, l = (e, t, i, s) => {
  for (var d = s > 1 ? void 0 : s ? z(t, i) : t, h = e.length - 1, p; h >= 0; h--)
    (p = e[h]) && (d = (s ? p(t, i, d) : p(d)) || d);
  return s && d && P(t, i, d), d;
}, y = (e, t, i) => t.has(e) || v("Cannot " + i), o = (e, t, i) => (y(e, t, "read from private field"), t.get(e)), f = (e, t, i) => t.has(e) ? v("Cannot add the same private member more than once") : t instanceof WeakSet ? t.add(e) : t.set(e, i), m = (e, t, i, s) => (y(e, t, "write to private field"), t.set(e, i), i), u, c;
let a = class extends k(w) {
  constructor() {
    super(), this._feeds = [], this._isLoading = !0, this._errorMessage = null, this._search = "", this._filterTab = "all", this._page = 1, this._pageSize = 25, this._isRebuildingId = null, this._isDeletingId = null, this._searchDebounceTimer = null, f(this, u), f(this, c, !1), this.consumeContext(C, (e) => {
      m(this, u, e);
    });
  }
  connectedCallback() {
    super.connectedCallback(), m(this, c, !0), this._initialize();
  }
  disconnectedCallback() {
    super.disconnectedCallback(), m(this, c, !1), this._searchDebounceTimer && (clearTimeout(this._searchDebounceTimer), this._searchDebounceTimer = null);
  }
  async _initialize() {
    const e = await T();
    o(this, c) && (this._pageSize = e.defaultPaginationPageSize, await this._loadFeeds());
  }
  async _loadFeeds() {
    this._isLoading = !0, this._errorMessage = null;
    const { data: e, error: t } = await g.getProductFeeds();
    if (o(this, c)) {
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
    const { data: i, error: s } = await g.rebuildProductFeed(e.id);
    if (o(this, c)) {
      if (this._isRebuildingId = null, s || !i) {
        o(this, u)?.peek("danger", {
          data: {
            headline: "Rebuild failed",
            message: s?.message ?? "Unable to rebuild feed."
          }
        });
        return;
      }
      i.success ? o(this, u)?.peek("positive", {
        data: {
          headline: "Feed rebuilt",
          message: `${i.productItemCount} products and ${i.promotionCount} promotions generated.`
        }
      }) : o(this, u)?.peek("warning", {
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
    const { error: i } = await g.deleteProductFeed(e.id);
    if (o(this, c)) {
      if (this._isDeletingId = null, i) {
        o(this, u)?.peek("danger", {
          data: {
            headline: "Delete failed",
            message: i.message
          }
        });
        return;
      }
      o(this, u)?.peek("positive", {
        data: {
          headline: "Feed deleted",
          message: `"${e.name}" was deleted.`
        }
      }), await this._loadFeeds();
    }
  }
  _renderLoading() {
    return r`<div class="loading"><uui-loader></uui-loader></div>`;
  }
  _renderError() {
    return r`
      <div class="error-banner">
        <uui-icon name="icon-alert"></uui-icon>
        <span>${this._errorMessage}</span>
      </div>
    `;
  }
  _renderEmpty() {
    return this._search.trim().length > 0 || this._filterTab !== "all" ? r`
        <merchello-empty-state
          icon="icon-search"
          headline="No matching feeds"
          message="Try adjusting your search or filters.">
        </merchello-empty-state>
      ` : r`
      <merchello-empty-state
        icon="icon-rss"
        headline="No product feeds created"
        message="Create a feed to publish Google Shopping product and promotion XML.">
        <uui-button slot="action" look="primary" color="positive" href=${_()}>
          Create Feed
        </uui-button>
      </merchello-empty-state>
    `;
  }
  _renderFeedRow(e) {
    const t = this._isRebuildingId === e.id, i = this._isDeletingId === e.id;
    return r`
      <uui-table-row class="clickable" href=${b(e.id)}>
        <uui-table-cell>
          <div class="feed-name-block">
            <a class="feed-name" href=${b(e.id)}>${e.name}</a>
            <span class="feed-slug">/${e.slug}.xml</span>
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
          ${e.lastGeneratedUtc ? D(e.lastGeneratedUtc) : "Never"}
        </uui-table-cell>
        <uui-table-cell>
          <span class="snapshot-status ${e.hasProductSnapshot ? "ok" : "missing"}">P</span>
          <span class="snapshot-status ${e.hasPromotionsSnapshot ? "ok" : "missing"}">R</span>
        </uui-table-cell>
        <uui-table-cell>
          ${e.lastGenerationError ? r`<span class="error-text" title=${e.lastGenerationError}>Error</span>` : r`<span class="ok-text">OK</span>`}
        </uui-table-cell>
        <uui-table-cell>
          <div class="actions">
            <uui-button
              compact
              look="secondary"
              href=${b(e.id)}
              label="Edit">
              <uui-icon name="icon-edit"></uui-icon>
            </uui-button>
            <uui-button
              compact
              look="secondary"
              ?disabled=${t}
              @click=${(s) => this._rebuildFeed(e, s)}
              label="Rebuild">
              <uui-icon name=${t ? "icon-hourglass" : "icon-sync"}></uui-icon>
            </uui-button>
            <uui-button
              compact
              look="secondary"
              color="danger"
              ?disabled=${i}
              @click=${(s) => this._deleteFeed(e, s)}
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
    return e.length === 0 ? this._renderEmpty() : r`
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
    return r`
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
            <uui-button look="primary" color="positive" href=${_()}>
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

          ${!this._isLoading && e.totalItems > 0 ? r`
                <merchello-pagination
                  .state=${e}
                  @page-change=${this._onPageChange}>
                </merchello-pagination>
              ` : x}
        </div>
      </umb-body-layout>
    `;
  }
};
u = /* @__PURE__ */ new WeakMap();
c = /* @__PURE__ */ new WeakMap();
a.styles = $`
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

    .snapshot-status {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 22px;
      height: 22px;
      border-radius: 50%;
      font-size: 11px;
      font-weight: 700;
      margin-right: 6px;
    }

    .snapshot-status.ok {
      background: color-mix(in srgb, var(--uui-color-positive) 20%, white);
      color: var(--uui-color-positive-emphasis);
    }

    .snapshot-status.missing {
      background: color-mix(in srgb, var(--uui-color-danger) 12%, white);
      color: var(--uui-color-danger-emphasis);
    }

    .ok-text {
      color: var(--uui-color-positive-emphasis);
      font-weight: 600;
    }

    .error-text {
      color: var(--uui-color-danger-emphasis);
      font-weight: 600;
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
l([
  n()
], a.prototype, "_feeds", 2);
l([
  n()
], a.prototype, "_isLoading", 2);
l([
  n()
], a.prototype, "_errorMessage", 2);
l([
  n()
], a.prototype, "_search", 2);
l([
  n()
], a.prototype, "_filterTab", 2);
l([
  n()
], a.prototype, "_page", 2);
l([
  n()
], a.prototype, "_pageSize", 2);
l([
  n()
], a.prototype, "_isRebuildingId", 2);
l([
  n()
], a.prototype, "_isDeletingId", 2);
a = l([
  F("merchello-product-feeds-list")
], a);
const A = a;
export {
  a as MerchelloProductFeedsListElement,
  A as default
};
//# sourceMappingURL=product-feeds-list.element-B2S3PG_j.js.map
