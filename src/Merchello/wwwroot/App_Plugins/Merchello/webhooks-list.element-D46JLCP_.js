import { LitElement as y, nothing as g, html as n, css as T, state as c, customElement as $ } from "@umbraco-cms/backoffice/external/lit";
import { UmbElementMixin as x } from "@umbraco-cms/backoffice/element-api";
import { UMB_NOTIFICATION_CONTEXT as C } from "@umbraco-cms/backoffice/notification";
import { UMB_MODAL_MANAGER_CONTEXT as z } from "@umbraco-cms/backoffice/modal";
import { M as d } from "./merchello-api-DkRa4ImO.js";
import { g as A } from "./store-settings-OD4RRJ1x.js";
import { c as f, e as E } from "./formatting-DQoM1drN.js";
import { M as S, a as M } from "./webhook-test-modal.token-BJ36MIGK.js";
import "./pagination.element-sDi4Myhy.js";
import "./merchello-empty-state.element-mt97UoA5.js";
var D = Object.defineProperty, L = Object.getOwnPropertyDescriptor, k = (e) => {
  throw TypeError(e);
}, r = (e, t, i, o) => {
  for (var l = o > 1 ? void 0 : o ? L(t, i) : t, b = e.length - 1, _; b >= 0; b--)
    (_ = e[b]) && (l = (o ? _(t, i, l) : _(l)) || l);
  return o && l && D(t, i, l), l;
}, w = (e, t, i) => t.has(e) || k("Cannot " + i), a = (e, t, i) => (w(e, t, "read from private field"), t.get(e)), m = (e, t, i) => t.has(e) ? k("Cannot add the same private member more than once") : t instanceof WeakSet ? t.add(e) : t.set(e, i), v = (e, t, i, o) => (w(e, t, "write to private field"), t.set(e, i), i), p, h, u;
let s = class extends x(y) {
  constructor() {
    super(), this._subscriptions = [], this._categories = [], this._stats = null, this._isLoading = !0, this._errorMessage = null, this._page = 1, this._pageSize = 50, this._totalItems = 0, this._totalPages = 0, this._searchTerm = "", this._activeTab = "all", this._searchDebounceTimer = null, m(this, p), m(this, h), m(this, u, !1), this.consumeContext(C, (e) => {
      v(this, p, e);
    }), this.consumeContext(z, (e) => {
      v(this, h, e);
    });
  }
  connectedCallback() {
    super.connectedCallback(), v(this, u, !0), this._initializeAndLoad();
  }
  disconnectedCallback() {
    super.disconnectedCallback(), v(this, u, !1), this._searchDebounceTimer && clearTimeout(this._searchDebounceTimer);
  }
  async _initializeAndLoad() {
    const e = await A();
    if (!a(this, u)) return;
    this._pageSize = e.defaultPaginationPageSize;
    const { data: t } = await d.getWebhookTopicsByCategory();
    if (!a(this, u)) return;
    t && (this._categories = t);
    const { data: i } = await d.getWebhookStats();
    a(this, u) && (i && (this._stats = i), this._loadSubscriptions());
  }
  async _loadSubscriptions() {
    this._isLoading = !0, this._errorMessage = null;
    const e = {
      page: this._page,
      pageSize: this._pageSize
    };
    this._searchTerm.trim() && (e.searchTerm = this._searchTerm.trim()), this._activeTab === "active" ? e.isActive = !0 : this._activeTab === "inactive" && (e.isActive = !1);
    const { data: t, error: i } = await d.getWebhookSubscriptions(e);
    if (a(this, u)) {
      if (i) {
        this._errorMessage = i.message, this._isLoading = !1;
        return;
      }
      t && (this._subscriptions = t.items, this._totalItems = t.totalItems, this._totalPages = t.totalPages), this._isLoading = !1;
    }
  }
  _handleSearchInput(e) {
    const i = e.target.value;
    this._searchDebounceTimer && clearTimeout(this._searchDebounceTimer), this._searchDebounceTimer = setTimeout(() => {
      this._searchTerm = i, this._page = 1, this._loadSubscriptions();
    }, 300);
  }
  _handleSearchClear() {
    this._searchTerm = "", this._page = 1, this._loadSubscriptions();
  }
  _handleTabChange(e) {
    this._activeTab = e, this._page = 1, this._loadSubscriptions();
  }
  _handlePageChange(e) {
    this._page = e.detail.page, this._loadSubscriptions();
  }
  _getPaginationState() {
    return {
      page: this._page,
      pageSize: this._pageSize,
      totalItems: this._totalItems,
      totalPages: this._totalPages
    };
  }
  async _handleCreateSubscription() {
    if (!a(this, h)) return;
    if ((await a(this, h).open(this, S, {
      data: {
        subscription: void 0,
        topics: this._categories
      }
    }).onSubmit().catch(() => {
    }))?.saved) {
      this._loadSubscriptions();
      const { data: i } = await d.getWebhookStats();
      i && (this._stats = i);
    }
  }
  async _handleEditSubscription(e, t) {
    if (e.preventDefault(), e.stopPropagation(), !a(this, h)) return;
    const { data: i } = await d.getWebhookSubscription(t.id);
    if (!i) return;
    (await a(this, h).open(this, S, {
      data: {
        subscription: i,
        topics: this._categories
      }
    }).onSubmit().catch(() => {
    }))?.saved && this._loadSubscriptions();
  }
  async _handleTestSubscription(e, t) {
    e.preventDefault(), e.stopPropagation(), a(this, h) && a(this, h).open(this, M, {
      data: { subscription: t }
    });
  }
  async _handleToggleActive(e, t) {
    e.preventDefault(), e.stopPropagation();
    const i = this._subscriptions.findIndex((b) => b.id === t.id);
    if (i === -1) return;
    const o = [...this._subscriptions];
    this._subscriptions = [
      ...this._subscriptions.slice(0, i),
      { ...t, isActive: !t.isActive },
      ...this._subscriptions.slice(i + 1)
    ];
    const { error: l } = await d.updateWebhookSubscription(t.id, {
      isActive: !t.isActive
    });
    a(this, u) && l && (this._subscriptions = o, a(this, p)?.peek("danger", {
      data: { headline: "Failed", message: l.message }
    }));
  }
  async _handleDeleteSubscription(e, t) {
    if (e.preventDefault(), e.stopPropagation(), !confirm(`Delete webhook "${t.name}"? This cannot be undone.`))
      return;
    const { error: i } = await d.deleteWebhookSubscription(t.id);
    if (!a(this, u)) return;
    if (i) {
      a(this, p)?.peek("danger", {
        data: { headline: "Failed to delete", message: i.message }
      });
      return;
    }
    a(this, p)?.peek("positive", {
      data: { headline: "Deleted", message: `Webhook "${t.name}" has been deleted.` }
    }), this._loadSubscriptions();
    const { data: o } = await d.getWebhookStats();
    o && (this._stats = o);
  }
  _handleViewDeliveries(e) {
    window.history.pushState({}, "", `section/merchello/workspace/merchello-webhooks/edit/webhooks/${e.id}`), window.dispatchEvent(new PopStateEvent("popstate"));
  }
  _renderStats() {
    return this._stats ? n`
      <div class="stats-cards">
        <div class="stat-card">
          <div class="stat-value">${this._stats.totalSubscriptions}</div>
          <div class="stat-label">Total Subscriptions</div>
        </div>
        <div class="stat-card">
          <div class="stat-value">${this._stats.activeSubscriptions}</div>
          <div class="stat-label">Active</div>
        </div>
        <div class="stat-card">
          <div class="stat-value">${f(this._stats.successRate, 1)}%</div>
          <div class="stat-label">Success Rate</div>
        </div>
        <div class="stat-card">
          <div class="stat-value">${f(this._stats.averageResponseTimeMs, 0)}ms</div>
          <div class="stat-label">Avg Response</div>
        </div>
      </div>
    ` : g;
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
    return this._searchTerm.trim() || this._activeTab !== "all" ? n`
        <merchello-empty-state
          icon="icon-search"
          headline="No webhooks found"
          message="Try adjusting your search or filter.">
        </merchello-empty-state>
      ` : n`
      <merchello-empty-state
        icon="icon-link"
        headline="No webhooks configured"
        message="Create your first webhook subscription to start receiving event notifications.">
        <uui-button
          slot="action"
          look="primary"
          label="Add Webhook"
          @click=${this._handleCreateSubscription}>
          Add Webhook
        </uui-button>
      </merchello-empty-state>
    `;
  }
  _renderSearchAndFilters() {
    return n`
      <div class="toolbar">
        <div class="search-box">
          <uui-input
            type="text"
            placeholder="Search webhooks..."
            .value=${this._searchTerm}
            @input=${this._handleSearchInput}
            label="Search webhooks">
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
                ` : g}
          </uui-input>
        </div>

        <uui-button
          look="primary"
          label="Add Webhook"
          @click=${this._handleCreateSubscription}>
          <uui-icon name="icon-add" slot="icon"></uui-icon>
          Add Webhook
        </uui-button>
      </div>

      <uui-tab-group class="filter-tabs">
        <uui-tab
          label="All"
          ?active=${this._activeTab === "all"}
          @click=${() => this._handleTabChange("all")}>
          All
        </uui-tab>
        <uui-tab
          label="Active"
          ?active=${this._activeTab === "active"}
          @click=${() => this._handleTabChange("active")}>
          Active
        </uui-tab>
        <uui-tab
          label="Inactive"
          ?active=${this._activeTab === "inactive"}
          @click=${() => this._handleTabChange("inactive")}>
          Inactive
        </uui-tab>
      </uui-tab-group>
    `;
  }
  _renderSubscriptionRow(e) {
    return n`
      <uui-table-row class="clickable" @click=${() => this._handleViewDeliveries(e)}>
        <uui-table-cell>
          <div class="subscription-info">
            <span class="subscription-name">${e.name}</span>
            <span class="subscription-url">${e.targetUrl}</span>
          </div>
        </uui-table-cell>
        <uui-table-cell>
          <span class="topic-name">${e.topicDisplayName || e.topic}</span>
        </uui-table-cell>
        <uui-table-cell class="center">
          <uui-toggle
            .checked=${e.isActive}
            @click=${(t) => this._handleToggleActive(t, e)}
            label="${e.isActive ? "Active" : "Inactive"}">
          </uui-toggle>
        </uui-table-cell>
        <uui-table-cell>
          ${e.lastTriggeredUtc ? E(e.lastTriggeredUtc) : "Never"}
        </uui-table-cell>
        <uui-table-cell class="center">
          <div class="stats-inline">
            <span class="stat-success">${e.successCount}</span>
            <span class="stat-separator">/</span>
            <span class="stat-failure">${e.failureCount}</span>
          </div>
        </uui-table-cell>
        <uui-table-cell>
          <div class="actions-cell">
            <uui-button
              look="secondary"
              compact
              label="Test"
              title="Send test webhook"
              @click=${(t) => this._handleTestSubscription(t, e)}>
              <uui-icon name="icon-flash"></uui-icon>
            </uui-button>
            <uui-button
              look="secondary"
              compact
              label="Edit"
              @click=${(t) => this._handleEditSubscription(t, e)}>
              <uui-icon name="icon-edit"></uui-icon>
            </uui-button>
            <uui-button
              look="secondary"
              compact
              color="danger"
              label="Delete"
              @click=${(t) => this._handleDeleteSubscription(t, e)}>
              <uui-icon name="icon-trash"></uui-icon>
            </uui-button>
          </div>
        </uui-table-cell>
      </uui-table-row>
    `;
  }
  _renderSubscriptionsTable() {
    return n`
      <div class="table-container">
        <uui-table class="webhooks-table">
          <uui-table-head>
            <uui-table-head-cell>Name / URL</uui-table-head-cell>
            <uui-table-head-cell>Topic</uui-table-head-cell>
            <uui-table-head-cell class="center">Status</uui-table-head-cell>
            <uui-table-head-cell>Last Triggered</uui-table-head-cell>
            <uui-table-head-cell class="center">Success / Fail</uui-table-head-cell>
            <uui-table-head-cell class="actions-header">Actions</uui-table-head-cell>
          </uui-table-head>
          ${this._subscriptions.map((e) => this._renderSubscriptionRow(e))}
        </uui-table>
      </div>
    `;
  }
  _renderContent() {
    return this._isLoading ? this._renderLoadingState() : this._errorMessage ? this._renderErrorState() : this._subscriptions.length === 0 ? this._renderEmptyState() : this._renderSubscriptionsTable();
  }
  render() {
    return n`
      <umb-body-layout header-fit-height main-no-padding>
        <div class="webhooks-container">
          ${this._renderStats()}
          ${this._renderSearchAndFilters()}
          ${this._renderContent()}

          ${this._subscriptions.length > 0 && !this._isLoading ? n`
                <merchello-pagination
                  .state=${this._getPaginationState()}
                  .disabled=${this._isLoading}
                  @page-change=${this._handlePageChange}>
                </merchello-pagination>
              ` : g}
        </div>
      </umb-body-layout>
    `;
  }
};
p = /* @__PURE__ */ new WeakMap();
h = /* @__PURE__ */ new WeakMap();
u = /* @__PURE__ */ new WeakMap();
s.styles = [
  T`
      :host {
        display: block;
        height: 100%;
        background: var(--uui-color-background);
      }

      .webhooks-container {
        max-width: 100%;
        padding: var(--uui-size-layout-1);
      }

      .stats-cards {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
        gap: var(--uui-size-space-4);
        margin-bottom: var(--uui-size-space-5);
      }

      .stat-card {
        background: var(--uui-color-surface);
        border: 1px solid var(--uui-color-border);
        border-radius: var(--uui-border-radius);
        padding: var(--uui-size-space-4);
        text-align: center;
      }

      .stat-value {
        font-size: var(--uui-type-h3-size);
        font-weight: 700;
        color: var(--uui-color-interactive);
      }

      .stat-label {
        font-size: var(--uui-type-small-size);
        color: var(--uui-color-text-alt);
        margin-top: var(--uui-size-space-1);
      }

      .toolbar {
        display: flex;
        justify-content: space-between;
        align-items: center;
        gap: var(--uui-size-space-4);
        margin-bottom: var(--uui-size-space-4);
      }

      .search-box {
        flex: 1;
        max-width: 400px;
      }

      .search-box uui-input {
        width: 100%;
      }

      .filter-tabs {
        margin-bottom: var(--uui-size-space-4);
      }

      .table-container {
        overflow-x: auto;
        background: var(--uui-color-surface);
        border: 1px solid var(--uui-color-border);
        border-radius: var(--uui-border-radius);
        margin-bottom: var(--uui-size-space-4);
      }

      .webhooks-table {
        width: 100%;
      }

      uui-table-head-cell,
      uui-table-cell {
        white-space: nowrap;
      }

      uui-table-head-cell.center,
      uui-table-cell.center {
        text-align: center;
      }

      uui-table-row.clickable {
        cursor: pointer;
      }

      uui-table-row.clickable:hover {
        background: var(--uui-color-surface-emphasis);
      }

      .subscription-info {
        display: flex;
        flex-direction: column;
        gap: var(--uui-size-space-1);
      }

      .subscription-name {
        font-weight: 500;
        color: var(--uui-color-interactive);
      }

      .subscription-url {
        font-size: var(--uui-type-small-size);
        color: var(--uui-color-text-alt);
        max-width: 300px;
        overflow: hidden;
        text-overflow: ellipsis;
      }

      .topic-name {
        font-weight: 500;
      }

      .stats-inline {
        display: flex;
        gap: var(--uui-size-space-1);
        justify-content: center;
        font-size: var(--uui-type-small-size);
      }

      .stat-success {
        color: var(--uui-color-positive);
        font-weight: 500;
      }

      .stat-separator {
        color: var(--uui-color-text-alt);
      }

      .stat-failure {
        color: var(--uui-color-danger);
        font-weight: 500;
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
    `
];
r([
  c()
], s.prototype, "_subscriptions", 2);
r([
  c()
], s.prototype, "_categories", 2);
r([
  c()
], s.prototype, "_stats", 2);
r([
  c()
], s.prototype, "_isLoading", 2);
r([
  c()
], s.prototype, "_errorMessage", 2);
r([
  c()
], s.prototype, "_page", 2);
r([
  c()
], s.prototype, "_pageSize", 2);
r([
  c()
], s.prototype, "_totalItems", 2);
r([
  c()
], s.prototype, "_totalPages", 2);
r([
  c()
], s.prototype, "_searchTerm", 2);
r([
  c()
], s.prototype, "_activeTab", 2);
s = r([
  $("merchello-webhooks-list")
], s);
const j = s;
export {
  s as MerchelloWebhooksListElement,
  j as default
};
//# sourceMappingURL=webhooks-list.element-D46JLCP_.js.map
