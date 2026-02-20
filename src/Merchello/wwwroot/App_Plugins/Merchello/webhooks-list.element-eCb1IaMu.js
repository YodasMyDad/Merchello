import { LitElement as T, nothing as g, html as n, css as w, state as h, customElement as x } from "@umbraco-cms/backoffice/external/lit";
import { UmbElementMixin as $ } from "@umbraco-cms/backoffice/element-api";
import { UMB_NOTIFICATION_CONTEXT as C } from "@umbraco-cms/backoffice/notification";
import { UMB_MODAL_MANAGER_CONTEXT as A, UMB_CONFIRM_MODAL as D } from "@umbraco-cms/backoffice/modal";
import { M as p } from "./merchello-api-B76CV0sD.js";
import { g as M } from "./store-settings-7zNVo6g4.js";
import { b as f, d as z } from "./formatting-MfE1tvkN.js";
import { p as L } from "./navigation-CvTcY6zJ.js";
import { M as S, a as E } from "./webhook-test-modal.token-B-Q2yQZG.js";
import "./pagination.element-sDi4Myhy.js";
import "./merchello-empty-state.element-D2dcD7_8.js";
import { c as P } from "./collection-layout.styles-BLT_S_EA.js";
var O = Object.defineProperty, W = Object.getOwnPropertyDescriptor, y = (e) => {
  throw TypeError(e);
}, r = (e, t, i, o) => {
  for (var l = o > 1 ? void 0 : o ? W(t, i) : t, b = e.length - 1, v; b >= 0; b--)
    (v = e[b]) && (l = (o ? v(t, i, l) : v(l)) || l);
  return o && l && O(t, i, l), l;
}, k = (e, t, i) => t.has(e) || y("Cannot " + i), a = (e, t, i) => (k(e, t, "read from private field"), t.get(e)), m = (e, t, i) => t.has(e) ? y("Cannot add the same private member more than once") : t instanceof WeakSet ? t.add(e) : t.set(e, i), _ = (e, t, i, o) => (k(e, t, "write to private field"), t.set(e, i), i), d, c, u;
let s = class extends $(T) {
  constructor() {
    super(), this._subscriptions = [], this._categories = [], this._stats = null, this._isLoading = !0, this._errorMessage = null, this._page = 1, this._pageSize = 50, this._totalItems = 0, this._totalPages = 0, this._searchTerm = "", this._activeTab = "all", this._searchDebounceTimer = null, m(this, d), m(this, c), m(this, u, !1), this.consumeContext(C, (e) => {
      _(this, d, e);
    }), this.consumeContext(A, (e) => {
      _(this, c, e);
    });
  }
  connectedCallback() {
    super.connectedCallback(), _(this, u, !0), this._initializeAndLoad();
  }
  disconnectedCallback() {
    super.disconnectedCallback(), _(this, u, !1), this._searchDebounceTimer && clearTimeout(this._searchDebounceTimer);
  }
  async _initializeAndLoad() {
    const e = await M();
    if (!a(this, u)) return;
    this._pageSize = e.defaultPaginationPageSize;
    const { data: t } = await p.getWebhookTopicsByCategory();
    a(this, u) && (t && (this._categories = t), await this._refreshStats(), this._loadSubscriptions());
  }
  async _refreshStats() {
    const { data: e } = await p.getWebhookStats();
    a(this, u) && e && (this._stats = e);
  }
  async _loadSubscriptions() {
    this._isLoading = !0, this._errorMessage = null;
    const e = {
      page: this._page,
      pageSize: this._pageSize
    };
    this._searchTerm.trim() && (e.searchTerm = this._searchTerm.trim()), this._activeTab === "active" ? e.isActive = !0 : this._activeTab === "inactive" && (e.isActive = !1);
    const { data: t, error: i } = await p.getWebhookSubscriptions(e);
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
    if (!a(this, c)) return;
    (await a(this, c).open(this, S, {
      data: {
        subscription: void 0,
        topics: this._categories
      }
    }).onSubmit().catch(() => {
    }))?.saved && (this._loadSubscriptions(), await this._refreshStats());
  }
  async _handleEditSubscription(e, t) {
    if (e.preventDefault(), e.stopPropagation(), !a(this, c)) return;
    const { data: i } = await p.getWebhookSubscription(t.id);
    if (!i) return;
    (await a(this, c).open(this, S, {
      data: {
        subscription: i,
        topics: this._categories
      }
    }).onSubmit().catch(() => {
    }))?.saved && this._loadSubscriptions();
  }
  async _handleTestSubscription(e, t) {
    e.preventDefault(), e.stopPropagation(), a(this, c) && a(this, c).open(this, E, {
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
    const { error: l } = await p.updateWebhookSubscription(t.id, {
      isActive: !t.isActive
    });
    a(this, u) && l && (this._subscriptions = o, a(this, d)?.peek("danger", {
      data: { headline: "Failed", message: l.message }
    }));
  }
  async _handleDeleteSubscription(e, t) {
    if (e.preventDefault(), e.stopPropagation(), !a(this, c)) {
      a(this, d)?.peek("warning", {
        data: {
          headline: "Action unavailable",
          message: "Delete confirmation is not available right now. Refresh and try again."
        }
      });
      return;
    }
    const i = a(this, c).open(this, D, {
      data: {
        headline: "Delete webhook",
        content: `Delete "${t.name}"? This action cannot be undone.`,
        confirmLabel: "Delete",
        color: "danger"
      }
    });
    try {
      await i.onSubmit();
    } catch {
      return;
    }
    if (!a(this, u)) return;
    const { error: o } = await p.deleteWebhookSubscription(t.id);
    if (a(this, u)) {
      if (o) {
        a(this, d)?.peek("danger", {
          data: { headline: "Failed to delete", message: o.message }
        });
        return;
      }
      a(this, d)?.peek("positive", {
        data: { headline: "Deleted", message: `Webhook "${t.name}" has been deleted.` }
      }), this._loadSubscriptions(), await this._refreshStats();
    }
  }
  _handleViewDeliveries(e) {
    L(e.id);
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
      <uui-box class="error-box" headline="Could not load webhooks">
        <div class="error-content">
          <p>${this._errorMessage}</p>
          <uui-button look="secondary" label="Retry" @click=${this._loadSubscriptions}>Retry</uui-button>
        </div>
      </uui-box>
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
      <div class="filters">
        <div class="filters-top">
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
          <div class="header-actions">
            <uui-button
              look="primary"
              label="Add Webhook"
              @click=${this._handleCreateSubscription}>
              <uui-icon name="icon-add" slot="icon"></uui-icon>
              Add Webhook
            </uui-button>
          </div>
        </div>

      <uui-tab-group class="tabs">
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
          ${e.lastTriggeredUtc ? z(e.lastTriggeredUtc) : "Never"}
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
        <div class="webhooks-container layout-container">
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
d = /* @__PURE__ */ new WeakMap();
c = /* @__PURE__ */ new WeakMap();
u = /* @__PURE__ */ new WeakMap();
s.styles = [
  P,
  w`
      :host {
        display: block;
        height: 100%;
        background: var(--uui-color-background);
      }

      .stats-cards {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
        gap: var(--uui-size-space-4);
        margin: 0;
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

      .search-box {
        max-width: 400px;
      }

      .table-container {
        overflow-x: auto;
        background: var(--uui-color-surface);
        border: 1px solid var(--uui-color-border);
        border-radius: var(--uui-border-radius);
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

      .error-box {
        margin-bottom: var(--uui-size-space-4);
      }

      .error-content {
        display: flex;
        flex-direction: column;
        align-items: flex-start;
        gap: var(--uui-size-space-3);
        color: var(--uui-color-danger);
      }

      .error-content p {
        margin: 0;
      }
    `
];
r([
  h()
], s.prototype, "_subscriptions", 2);
r([
  h()
], s.prototype, "_categories", 2);
r([
  h()
], s.prototype, "_stats", 2);
r([
  h()
], s.prototype, "_isLoading", 2);
r([
  h()
], s.prototype, "_errorMessage", 2);
r([
  h()
], s.prototype, "_page", 2);
r([
  h()
], s.prototype, "_pageSize", 2);
r([
  h()
], s.prototype, "_totalItems", 2);
r([
  h()
], s.prototype, "_totalPages", 2);
r([
  h()
], s.prototype, "_searchTerm", 2);
r([
  h()
], s.prototype, "_activeTab", 2);
s = r([
  x("merchello-webhooks-list")
], s);
const q = s;
export {
  s as MerchelloWebhooksListElement,
  q as default
};
//# sourceMappingURL=webhooks-list.element-eCb1IaMu.js.map
