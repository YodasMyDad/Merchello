import { LitElement as z, nothing as v, html as o, css as T, state as n, customElement as x } from "@umbraco-cms/backoffice/external/lit";
import { UmbElementMixin as S } from "@umbraco-cms/backoffice/element-api";
import { UMB_NOTIFICATION_CONTEXT as C } from "@umbraco-cms/backoffice/notification";
import { UmbModalToken as w, UMB_MODAL_MANAGER_CONTEXT as M, UMB_CONFIRM_MODAL as E } from "@umbraco-cms/backoffice/modal";
import { O as b } from "./webhooks.types-BKPXEUdT.js";
import { M as _ } from "./merchello-api-NdGX4WPd.js";
import { g as L } from "./store-settings-DgxY_Kcz.js";
import { d as k } from "./formatting-DU6_gkL3.js";
import { H as I } from "./navigation-CvTcY6zJ.js";
import { UMB_WORKSPACE_CONTEXT as O } from "@umbraco-cms/backoffice/workspace";
import { M as A, a as P } from "./webhook-test-modal.token-B-Q2yQZG.js";
import "./pagination.element-sDi4Myhy.js";
import "./merchello-empty-state.element-D2dcD7_8.js";
function R(e) {
  switch (e) {
    case "succeeded":
      return [b.Succeeded];
    case "failed":
      return [b.Failed, b.Abandoned];
    case "pending":
      return [b.Pending, b.Retrying];
    default:
      return;
  }
}
const W = new w("Merchello.Webhook.Delivery.Modal", {
  modal: {
    type: "sidebar",
    size: "large"
  }
}), B = new w("Merchello.WebhookIntegrationGuide.Modal", {
  modal: {
    type: "sidebar",
    size: "medium"
  }
});
var N = Object.defineProperty, H = Object.getOwnPropertyDescriptor, D = (e) => {
  throw TypeError(e);
}, r = (e, i, a, d) => {
  for (var p = d > 1 ? void 0 : d ? H(i, a) : i, m = e.length - 1, y; m >= 0; m--)
    (y = e[m]) && (p = (d ? y(i, a, p) : y(p)) || p);
  return d && p && N(i, a, p), p;
}, $ = (e, i, a) => i.has(e) || D("Cannot " + a), t = (e, i, a) => ($(e, i, "read from private field"), i.get(e)), f = (e, i, a) => i.has(e) ? D("Cannot add the same private member more than once") : i instanceof WeakSet ? i.add(e) : i.set(e, a), g = (e, i, a, d) => ($(e, i, "write to private field"), i.set(e, a), a), h, u, l, c;
let s = class extends S(z) {
  constructor() {
    super(), this._subscription = null, this._deliveries = [], this._isLoading = !0, this._isLoadingDeliveries = !1, this._errorMessage = null, this._page = 1, this._pageSize = 20, this._totalItems = 0, this._totalPages = 0, this._activeTab = "all", this._showSecret = !1, this._workspaceIsLoading = !1, this._workspaceError = null, f(this, h), f(this, u), f(this, l), f(this, c, !1), this.consumeContext(O, (e) => {
      g(this, h, e), t(this, h) && (this.observe(t(this, h).subscription, (i) => {
        this._subscription = i ?? null, i ? this._loadDeliveries() : (this._deliveries = [], this._totalItems = 0, this._totalPages = 0);
      }, "_subscription"), this.observe(t(this, h).isLoading, (i) => {
        this._workspaceIsLoading = i ?? !1;
      }, "_workspaceIsLoading"), this.observe(t(this, h).loadError, (i) => {
        this._workspaceError = i ?? null;
      }, "_workspaceError"));
    }), this.consumeContext(C, (e) => {
      g(this, u, e);
    }), this.consumeContext(M, (e) => {
      g(this, l, e);
    });
  }
  connectedCallback() {
    super.connectedCallback(), g(this, c, !0), this._initializeSettings();
  }
  disconnectedCallback() {
    super.disconnectedCallback(), g(this, c, !1);
  }
  async _initializeSettings() {
    try {
      const e = await L();
      if (!t(this, c)) return;
      this._pageSize = Math.min(e.defaultPaginationPageSize, 20);
    } catch {
      if (!t(this, c)) return;
      this._errorMessage = "Failed to load settings.";
    } finally {
      if (!t(this, c)) return;
      this._isLoading = !1;
    }
  }
  async _loadDeliveries() {
    if (!this._subscription) return;
    this._isLoadingDeliveries = !0, this._errorMessage = null;
    const e = {
      page: this._page,
      pageSize: this._pageSize
    }, i = R(this._activeTab);
    i && i.length > 0 && (e.statuses = i);
    const { data: a, error: d } = await _.getWebhookDeliveries(this._subscription.id, e);
    if (t(this, c)) {
      if (d) {
        this._errorMessage = d.message, this._isLoadingDeliveries = !1;
        return;
      }
      a && (this._deliveries = a.items, this._totalItems = a.totalItems, this._totalPages = a.totalPages), this._isLoadingDeliveries = !1;
    }
  }
  _handleTabChange(e) {
    this._activeTab = e, this._page = 1, this._loadDeliveries();
  }
  _handlePageChange(e) {
    this._page = e.detail.page, this._loadDeliveries();
  }
  _getPaginationState() {
    return {
      page: this._page,
      pageSize: this._pageSize,
      totalItems: this._totalItems,
      totalPages: this._totalPages
    };
  }
  _handleBack() {
    I();
  }
  async _handleEdit() {
    if (!t(this, l) || !this._subscription) return;
    const { data: e } = await _.getWebhookTopicsByCategory();
    (await t(this, l).open(this, A, {
      data: {
        subscription: this._subscription,
        topics: e ?? []
      }
    }).onSubmit().catch(() => {
    }))?.saved && t(this, h)?.reloadSubscription();
  }
  async _handleTest() {
    !t(this, l) || !this._subscription || t(this, l).open(this, P, {
      data: { subscription: this._subscription }
    });
  }
  _handleIntegrationGuide() {
    !t(this, l) || !this._subscription || t(this, l).open(this, B, {
      data: { authType: this._subscription.authTypeDisplay }
    });
  }
  async _handleDelete() {
    if (!this._subscription) return;
    if (!t(this, l)) {
      t(this, u)?.peek("warning", {
        data: {
          headline: "Action unavailable",
          message: "Delete confirmation is not available right now. Refresh and try again."
        }
      });
      return;
    }
    const e = t(this, l).open(this, E, {
      data: {
        headline: "Delete webhook",
        content: `Delete "${this._subscription.name}"? This action cannot be undone.`,
        confirmLabel: "Delete",
        color: "danger"
      }
    });
    try {
      await e.onSubmit();
    } catch {
      return;
    }
    if (!t(this, c)) return;
    const { error: i } = await _.deleteWebhookSubscription(this._subscription.id);
    if (i) {
      t(this, u)?.peek("danger", {
        data: { headline: "Failed to delete", message: i.message }
      });
      return;
    }
    t(this, u)?.peek("positive", {
      data: { headline: "Deleted", message: `Webhook "${this._subscription.name}" has been deleted.` }
    }), this._handleBack();
  }
  _toggleSecretVisibility() {
    this._showSecret = !this._showSecret;
  }
  async _copySecret(e) {
    try {
      await navigator.clipboard.writeText(e), t(this, u)?.peek("positive", {
        data: { headline: "Copied", message: "HMAC secret copied to clipboard." }
      });
    } catch {
      t(this, u)?.peek("warning", {
        data: { headline: "Copy failed", message: "Clipboard access is unavailable in this browser context." }
      });
    }
  }
  async _handleViewDelivery(e) {
    if (!t(this, l)) return;
    (await t(this, l).open(this, W, {
      data: { deliveryId: e.id }
    }).onSubmit().catch(() => {
    }))?.retried && this._loadDeliveries();
  }
  async _handleRetryDelivery(e, i) {
    e.stopPropagation();
    const { error: a } = await _.retryDelivery(i.id);
    if (a) {
      t(this, u)?.peek("danger", {
        data: { headline: "Failed to retry", message: a.message }
      });
      return;
    }
    t(this, u)?.peek("positive", {
      data: { headline: "Retry queued", message: "The delivery has been queued for retry." }
    }), this._loadDeliveries();
  }
  _renderHeader() {
    return this._subscription ? o`
      <div class="header">
        <uui-button
          look="secondary"
          compact
          label="Back"
          @click=${this._handleBack}>
          <uui-icon name="icon-arrow-left"></uui-icon>
          Back
        </uui-button>

        <div class="header-info">
          <h1>${this._subscription.name}</h1>
          <span class="status-badge ${this._subscription.isActive ? "active" : "inactive"}">
            ${this._subscription.isActive ? "Active" : "Inactive"}
          </span>
        </div>

        <div class="header-actions">
          <uui-button look="secondary" label="Integration Guide" @click=${this._handleIntegrationGuide}>
            <uui-icon name="icon-book-alt" slot="icon"></uui-icon>
            Integration Guide
          </uui-button>
          <uui-button look="secondary" label="Test" @click=${this._handleTest}>
            <uui-icon name="icon-flash" slot="icon"></uui-icon>
            Test
          </uui-button>
          <uui-button look="secondary" label="Edit" @click=${this._handleEdit}>
            <uui-icon name="icon-edit" slot="icon"></uui-icon>
            Edit
          </uui-button>
          <uui-button look="secondary" color="danger" label="Delete" @click=${this._handleDelete}>
            <uui-icon name="icon-trash" slot="icon"></uui-icon>
            Delete
          </uui-button>
        </div>
      </div>
    ` : v;
  }
  _renderSubscriptionInfo() {
    if (!this._subscription) return v;
    const e = this._subscription;
    return o`
      <div class="info-section">
        <uui-box headline="Subscription Details">
          <div class="info-grid">
            <div class="info-item">
              <span class="info-label">Topic</span>
              <span class="info-value">${e.topicDisplayName || e.topic}</span>
            </div>
            <div class="info-item">
              <span class="info-label">Target URL</span>
              <span class="info-value url">${e.targetUrl}</span>
            </div>
            <div class="info-item">
              <span class="info-label">Authentication</span>
              <span class="info-value">${e.authTypeDisplay}</span>
            </div>
            <div class="info-item">
              <span class="info-label">Timeout</span>
              <span class="info-value">${e.timeoutSeconds} seconds</span>
            </div>
            <div class="info-item">
              <span class="info-label">Created</span>
              <span class="info-value">${k(e.dateCreated)}</span>
            </div>
            ${e.secret ? o`
                  <div class="info-item secret-item">
                    <span class="info-label">HMAC Secret</span>
                    <div class="secret-value">
                      <code>${this._showSecret ? e.secret : "****************"}</code>
                      <uui-button
                        look="secondary"
                        compact
                        label=${this._showSecret ? "Hide" : "Show"}
                        @click=${this._toggleSecretVisibility}>
                        <uui-icon name=${this._showSecret ? "icon-eye" : "icon-eye-slash"}></uui-icon>
                      </uui-button>
                      <uui-button
                        look="secondary"
                        compact
                        label="Copy"
                        @click=${() => this._copySecret(e.secret ?? "")}>
                        <uui-icon name="icon-documents"></uui-icon>
                      </uui-button>
                    </div>
                  </div>
                ` : v}
          </div>
        </uui-box>

        <div class="stats-cards">
          <div class="stat-card">
            <div class="stat-value success">${e.successCount}</div>
            <div class="stat-label">Successful</div>
          </div>
          <div class="stat-card">
            <div class="stat-value failure">${e.failureCount}</div>
            <div class="stat-label">Failed</div>
          </div>
          <div class="stat-card">
            <div class="stat-value">${e.lastTriggeredUtc ? k(e.lastTriggeredUtc) : "Never"}</div>
            <div class="stat-label">Last Triggered</div>
          </div>
        </div>
      </div>
    `;
  }
  _renderDeliveriesTable() {
    return this._isLoadingDeliveries ? o`<div class="loading"><uui-loader></uui-loader></div>` : this._deliveries.length === 0 ? o`
        <merchello-empty-state
          icon="icon-inbox"
          headline="No deliveries found"
          message=${this._activeTab === "all" ? "This webhook hasn't been triggered yet." : `No ${this._activeTab} deliveries found.`}>
        </merchello-empty-state>
      ` : o`
      <div class="table-container">
        <uui-table class="deliveries-table">
          <uui-table-head>
            <uui-table-head-cell>Date</uui-table-head-cell>
            <uui-table-head-cell class="center">Status</uui-table-head-cell>
            <uui-table-head-cell class="center">Response</uui-table-head-cell>
            <uui-table-head-cell class="center">Duration</uui-table-head-cell>
            <uui-table-head-cell class="center">Attempt</uui-table-head-cell>
            <uui-table-head-cell class="actions-header">Actions</uui-table-head-cell>
          </uui-table-head>
          ${this._deliveries.map((e) => this._renderDeliveryRow(e))}
        </uui-table>
      </div>
    `;
  }
  _renderDeliveryRow(e) {
    const i = e.status === b.Failed || e.status === b.Abandoned;
    return o`
      <uui-table-row class="clickable" @click=${() => this._handleViewDelivery(e)}>
        <uui-table-cell>${k(e.dateCreated)}</uui-table-cell>
        <uui-table-cell class="center">
          <span class="badge ${e.statusCssClass}">
            ${e.statusDisplay}
          </span>
        </uui-table-cell>
        <uui-table-cell class="center">
          ${e.responseStatusCode !== null ? o`<span class="status-code status-code-${Math.floor(e.responseStatusCode / 100)}">${e.responseStatusCode}</span>` : "-"}
        </uui-table-cell>
        <uui-table-cell class="center">${e.durationMs}ms</uui-table-cell>
        <uui-table-cell class="center">#${e.attemptNumber}</uui-table-cell>
        <uui-table-cell>
          <div class="actions-cell">
            <uui-button
              look="secondary"
              compact
              label="View"
              @click=${(a) => {
      a.stopPropagation(), this._handleViewDelivery(e);
    }}>
              <uui-icon name="icon-eye"></uui-icon>
            </uui-button>
            ${i ? o`
                  <uui-button
                    look="secondary"
                    compact
                    label="Retry"
                    @click=${(a) => this._handleRetryDelivery(a, e)}>
                    <uui-icon name="icon-refresh"></uui-icon>
                  </uui-button>
                ` : v}
          </div>
        </uui-table-cell>
      </uui-table-row>
    `;
  }
  render() {
    return this._isLoading || this._workspaceIsLoading ? o`<div class="loading"><uui-loader></uui-loader></div>` : this._workspaceError ? o`
        <umb-body-layout header-fit-height main-no-padding>
          <div class="detail-container">
            <merchello-empty-state
              icon="icon-alert"
              headline="Unable to load webhook"
              message=${this._workspaceError}>
              <uui-button slot="action" look="secondary" label="Back to Webhooks" @click=${this._handleBack}>
                Back to Webhooks
              </uui-button>
            </merchello-empty-state>
          </div>
        </umb-body-layout>
      ` : this._subscription ? o`
      <umb-body-layout header-fit-height main-no-padding>
          <div class="detail-container">
          ${this._renderHeader()}
          ${this._errorMessage ? o`
                <uui-box class="error-box" headline="Could not load delivery history">
                  <div class="error-content">
                    <p>${this._errorMessage}</p>
                    <uui-button look="secondary" label="Retry" @click=${this._loadDeliveries}>Retry</uui-button>
                  </div>
                </uui-box>
              ` : v}
          ${this._renderSubscriptionInfo()}

          <div class="deliveries-section">
            <h2>Delivery History</h2>

            <uui-tab-group class="filter-tabs">
              <uui-tab
                label="All"
                ?active=${this._activeTab === "all"}
                @click=${() => this._handleTabChange("all")}>
                All
              </uui-tab>
              <uui-tab
                label="Succeeded"
                ?active=${this._activeTab === "succeeded"}
                @click=${() => this._handleTabChange("succeeded")}>
                Succeeded
              </uui-tab>
              <uui-tab
                label="Failed"
                ?active=${this._activeTab === "failed"}
                @click=${() => this._handleTabChange("failed")}>
                Failed
              </uui-tab>
              <uui-tab
                label="Pending"
                ?active=${this._activeTab === "pending"}
                @click=${() => this._handleTabChange("pending")}>
                Pending
              </uui-tab>
            </uui-tab-group>

            ${this._renderDeliveriesTable()}

            ${this._deliveries.length > 0 && !this._isLoadingDeliveries ? o`
                  <merchello-pagination
                    .state=${this._getPaginationState()}
                    .disabled=${this._isLoadingDeliveries}
                    @page-change=${this._handlePageChange}>
                  </merchello-pagination>
                ` : v}
          </div>
        </div>
      </umb-body-layout>
    ` : o`
        <umb-body-layout header-fit-height main-no-padding>
          <div class="detail-container">
            <merchello-empty-state
              icon="icon-alert"
              headline="Webhook not found"
              message="The requested webhook subscription could not be found.">
              <uui-button slot="action" look="secondary" label="Back to Webhooks" @click=${this._handleBack}>
                Back to Webhooks
              </uui-button>
            </merchello-empty-state>
          </div>
        </umb-body-layout>
      `;
  }
};
h = /* @__PURE__ */ new WeakMap();
u = /* @__PURE__ */ new WeakMap();
l = /* @__PURE__ */ new WeakMap();
c = /* @__PURE__ */ new WeakMap();
s.styles = [
  T`
      :host {
        display: block;
        height: 100%;
        background: var(--uui-color-background);
      }

      .detail-container {
        max-width: 100%;
        padding: var(--uui-size-layout-1);
      }

      .header {
        display: flex;
        align-items: center;
        gap: var(--uui-size-space-4);
        margin-bottom: var(--uui-size-space-5);
      }

      .header-info {
        flex: 1;
        display: flex;
        align-items: center;
        gap: var(--uui-size-space-3);
      }

      .header-info h1 {
        margin: 0;
        font-size: var(--uui-type-h4-size);
        font-weight: 700;
      }

      .header-actions {
        display: flex;
        gap: var(--uui-size-space-2);
      }

      .status-badge {
        padding: var(--uui-size-space-1) var(--uui-size-space-2);
        border-radius: var(--uui-border-radius);
        font-size: var(--uui-type-small-size);
        font-weight: 600;
      }

      .status-badge.active {
        background: var(--uui-color-positive-standalone);
        color: var(--uui-color-positive-contrast);
      }

      .status-badge.inactive {
        background: var(--uui-color-default);
        color: var(--uui-color-text-alt);
      }

      .info-section {
        display: flex;
        flex-direction: column;
        gap: var(--uui-size-space-4);
        margin-bottom: var(--uui-size-space-5);
      }

      .info-grid {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
        gap: var(--uui-size-space-4);
      }

      .info-item {
        display: flex;
        flex-direction: column;
        gap: var(--uui-size-space-1);
      }

      .info-label {
        font-size: var(--uui-type-small-size);
        color: var(--uui-color-text-alt);
        font-weight: 600;
      }

      .info-value {
        color: var(--uui-color-text);
      }

      .info-value.url {
        word-break: break-all;
        font-family: monospace;
        font-size: 0.875rem;
      }

      .secret-item {
        grid-column: 1 / -1;
      }

      .secret-value {
        display: flex;
        align-items: center;
        gap: var(--uui-size-space-2);
      }

      .secret-value code {
        background: var(--uui-color-surface-alt);
        padding: var(--uui-size-space-1) var(--uui-size-space-2);
        border-radius: var(--uui-border-radius);
        font-family: monospace;
        font-size: 0.875rem;
      }

      .stats-cards {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
        gap: var(--uui-size-space-4);
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
      }

      .stat-value.success {
        color: var(--uui-color-positive);
      }

      .stat-value.failure {
        color: var(--uui-color-danger);
      }

      .stat-label {
        font-size: var(--uui-type-small-size);
        color: var(--uui-color-text-alt);
        margin-top: var(--uui-size-space-1);
      }

      .deliveries-section h2 {
        margin: 0 0 var(--uui-size-space-3) 0;
        font-size: var(--uui-type-h5-size);
        font-weight: 600;
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

      .deliveries-table {
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

      .badge {
        display: inline-block;
        padding: var(--uui-size-space-1) var(--uui-size-space-2);
        border-radius: var(--uui-border-radius);
        font-size: var(--uui-type-small-size);
        font-weight: 500;
      }

      .badge-positive {
        background: var(--uui-color-positive-standalone);
        color: var(--uui-color-positive-contrast);
      }

      .badge-danger {
        background: var(--uui-color-danger-standalone);
        color: var(--uui-color-danger-contrast);
      }

      .badge-warning {
        background: var(--merchello-color-warning-status-background, #8a6500);
        color: #fff;
      }

      .badge-default {
        background: var(--uui-color-text-alt);
        color: #fff;
      }

      .status-code {
        font-family: monospace;
        font-weight: 500;
      }

      .status-code-2 {
        color: var(--uui-color-positive);
      }

      .status-code-4,
      .status-code-5 {
        color: var(--uui-color-danger);
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

      @media (max-width: 1000px) {
        .header {
          flex-wrap: wrap;
        }

        .header-actions {
          width: 100%;
          flex-wrap: wrap;
        }
      }
    `
];
r([
  n()
], s.prototype, "_subscription", 2);
r([
  n()
], s.prototype, "_deliveries", 2);
r([
  n()
], s.prototype, "_isLoading", 2);
r([
  n()
], s.prototype, "_isLoadingDeliveries", 2);
r([
  n()
], s.prototype, "_errorMessage", 2);
r([
  n()
], s.prototype, "_page", 2);
r([
  n()
], s.prototype, "_pageSize", 2);
r([
  n()
], s.prototype, "_totalItems", 2);
r([
  n()
], s.prototype, "_totalPages", 2);
r([
  n()
], s.prototype, "_activeTab", 2);
r([
  n()
], s.prototype, "_showSecret", 2);
r([
  n()
], s.prototype, "_workspaceIsLoading", 2);
r([
  n()
], s.prototype, "_workspaceError", 2);
s = r([
  x("merchello-webhook-detail")
], s);
const ie = s;
export {
  s as MerchelloWebhookDetailElement,
  ie as default
};
//# sourceMappingURL=webhook-detail.element-BWLfKkCk.js.map
