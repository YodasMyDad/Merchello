import { LitElement, html, css, nothing } from "@umbraco-cms/backoffice/external/lit";
import { customElement, state } from "@umbraco-cms/backoffice/external/lit";
import { UmbElementMixin } from "@umbraco-cms/backoffice/element-api";
import { UMB_NOTIFICATION_CONTEXT } from "@umbraco-cms/backoffice/notification";
import { UMB_MODAL_MANAGER_CONTEXT } from "@umbraco-cms/backoffice/modal";
import type { UmbNotificationContext } from "@umbraco-cms/backoffice/notification";
import type { UmbModalManagerContext } from "@umbraco-cms/backoffice/modal";
import type {
  WebhookSubscriptionDetailDto,
  OutboundDeliveryDto,
  OutboundDeliveryQueryParams,
} from "@webhooks/types/webhooks.types.js";
import { OutboundDeliveryStatus } from "@webhooks/types/webhooks.types.js";
import type { PaginationState, PageChangeEventDetail } from "@shared/types/pagination.types.js";
import { MerchelloApi } from "@api/merchello-api.js";
import { getStoreSettings } from "@api/store-settings.js";
import { formatRelativeDate } from "@shared/utils/formatting.js";
import { UMB_WORKSPACE_CONTEXT } from "@umbraco-cms/backoffice/workspace";
import type { MerchelloWebhooksWorkspaceContext } from "@webhooks/contexts/webhooks-workspace.context.js";
import { MERCHELLO_WEBHOOK_SUBSCRIPTION_MODAL } from "@webhooks/modals/webhook-subscription-modal.token.js";
import { MERCHELLO_WEBHOOK_TEST_MODAL } from "@webhooks/modals/webhook-test-modal.token.js";
import { MERCHELLO_DELIVERY_DETAIL_MODAL } from "@webhooks/modals/delivery-detail-modal.token.js";
import { MERCHELLO_WEBHOOK_INTEGRATION_GUIDE_MODAL } from "@webhooks/modals/webhook-integration-guide-modal.token.js";
import "@shared/components/pagination.element.js";
import "@shared/components/merchello-empty-state.element.js";

type FilterTab = "all" | "succeeded" | "failed" | "pending";

@customElement("merchello-webhook-detail")
export class MerchelloWebhookDetailElement extends UmbElementMixin(LitElement) {
  @state() private _subscription: WebhookSubscriptionDetailDto | null = null;
  @state() private _deliveries: OutboundDeliveryDto[] = [];
  @state() private _isLoading = true;
  @state() private _isLoadingDeliveries = false;
  @state() private _errorMessage: string | null = null;
  @state() private _page = 1;
  @state() private _pageSize = 20;
  @state() private _totalItems = 0;
  @state() private _totalPages = 0;
  @state() private _activeTab: FilterTab = "all";
  @state() private _showSecret = false;

  #workspaceContext?: MerchelloWebhooksWorkspaceContext;
  #notificationContext?: UmbNotificationContext;
  #modalManager?: UmbModalManagerContext;
  #isConnected = false;

  constructor() {
    super();
    this.consumeContext(UMB_WORKSPACE_CONTEXT, (context) => {
      this.#workspaceContext = context as MerchelloWebhooksWorkspaceContext;
      if (!this.#workspaceContext) return;
      this.observe(this.#workspaceContext.subscription, (subscription) => {
        this._subscription = subscription ?? null;
        if (subscription) {
          this._loadDeliveries();
        }
      }, '_subscription');
    });
    this.consumeContext(UMB_NOTIFICATION_CONTEXT, (context) => {
      this.#notificationContext = context;
    });
    this.consumeContext(UMB_MODAL_MANAGER_CONTEXT, (context) => {
      this.#modalManager = context;
    });
  }

  override connectedCallback(): void {
    super.connectedCallback();
    this.#isConnected = true;
    this._initializeSettings();
  }

  override disconnectedCallback(): void {
    super.disconnectedCallback();
    this.#isConnected = false;
  }

  private async _initializeSettings(): Promise<void> {
    const settings = await getStoreSettings();
    if (!this.#isConnected) return;
    this._pageSize = Math.min(settings.defaultPaginationPageSize, 20);
    this._isLoading = false;
  }

  private async _loadDeliveries(): Promise<void> {
    if (!this._subscription) return;

    this._isLoadingDeliveries = true;
    this._errorMessage = null;

    const params: OutboundDeliveryQueryParams = {
      page: this._page,
      pageSize: this._pageSize,
    };

    if (this._activeTab === "succeeded") {
      params.status = OutboundDeliveryStatus.Succeeded;
    } else if (this._activeTab === "failed") {
      params.status = OutboundDeliveryStatus.Failed;
    } else if (this._activeTab === "pending") {
      params.status = OutboundDeliveryStatus.Pending;
    }

    const { data, error } = await MerchelloApi.getWebhookDeliveries(this._subscription.id, params);

    if (!this.#isConnected) return;

    if (error) {
      this._errorMessage = error.message;
      this._isLoadingDeliveries = false;
      return;
    }

    if (data) {
      this._deliveries = data.items;
      this._totalItems = data.totalItems;
      this._totalPages = data.totalPages;
    }

    this._isLoadingDeliveries = false;
  }

  private _handleTabChange(tab: FilterTab): void {
    this._activeTab = tab;
    this._page = 1;
    this._loadDeliveries();
  }

  private _handlePageChange(e: CustomEvent<PageChangeEventDetail>): void {
    this._page = e.detail.page;
    this._loadDeliveries();
  }

  private _getPaginationState(): PaginationState {
    return {
      page: this._page,
      pageSize: this._pageSize,
      totalItems: this._totalItems,
      totalPages: this._totalPages,
    };
  }

  private _handleBack(): void {
    window.history.pushState({}, "", "section/merchello/workspace/merchello-webhooks/edit/webhooks");
    window.dispatchEvent(new PopStateEvent("popstate"));
  }

  private async _handleEdit(): Promise<void> {
    if (!this.#modalManager || !this._subscription) return;

    // Load topics for the modal
    const { data: categories } = await MerchelloApi.getWebhookTopicsByCategory();

    const modal = this.#modalManager.open(this, MERCHELLO_WEBHOOK_SUBSCRIPTION_MODAL, {
      data: {
        subscription: this._subscription,
        topics: categories ?? [],
      },
    });

    const result = await modal.onSubmit().catch(() => undefined);
    if (result?.saved) {
      this.#workspaceContext?.reloadSubscription();
    }
  }

  private async _handleTest(): Promise<void> {
    if (!this.#modalManager || !this._subscription) return;

    this.#modalManager.open(this, MERCHELLO_WEBHOOK_TEST_MODAL, {
      data: { subscription: this._subscription },
    });
  }

  private _handleIntegrationGuide(): void {
    if (!this.#modalManager || !this._subscription) return;

    this.#modalManager.open(this, MERCHELLO_WEBHOOK_INTEGRATION_GUIDE_MODAL, {
      data: { authType: this._subscription.authTypeDisplay },
    });
  }

  private async _handleDelete(): Promise<void> {
    if (!this._subscription) return;

    if (!confirm(`Delete webhook "${this._subscription.name}"? This cannot be undone.`)) {
      return;
    }

    const { error } = await MerchelloApi.deleteWebhookSubscription(this._subscription.id);

    if (error) {
      this.#notificationContext?.peek("danger", {
        data: { headline: "Failed to delete", message: error.message },
      });
      return;
    }

    this.#notificationContext?.peek("positive", {
      data: { headline: "Deleted", message: `Webhook "${this._subscription.name}" has been deleted.` },
    });
    this._handleBack();
  }

  private async _handleViewDelivery(delivery: OutboundDeliveryDto): Promise<void> {
    if (!this.#modalManager) return;

    const modal = this.#modalManager.open(this, MERCHELLO_DELIVERY_DETAIL_MODAL, {
      data: { deliveryId: delivery.id },
    });

    const result = await modal.onSubmit().catch(() => undefined);
    if (result?.retried) {
      this._loadDeliveries();
    }
  }

  private async _handleRetryDelivery(e: Event, delivery: OutboundDeliveryDto): Promise<void> {
    e.stopPropagation();

    const { error } = await MerchelloApi.retryDelivery(delivery.id);

    if (error) {
      this.#notificationContext?.peek("danger", {
        data: { headline: "Failed to retry", message: error.message },
      });
      return;
    }

    this.#notificationContext?.peek("positive", {
      data: { headline: "Retry queued", message: "The delivery has been queued for retry." },
    });
    this._loadDeliveries();
  }

  private _renderHeader(): unknown {
    if (!this._subscription) return nothing;

    return html`
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
          <span class="status-badge ${this._subscription.isActive ? 'active' : 'inactive'}">
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
    `;
  }

  private _renderSubscriptionInfo(): unknown {
    if (!this._subscription) return nothing;

    const sub = this._subscription;

    return html`
      <div class="info-section">
        <uui-box headline="Subscription Details">
          <div class="info-grid">
            <div class="info-item">
              <span class="info-label">Topic</span>
              <span class="info-value">${sub.topicDisplayName || sub.topic}</span>
            </div>
            <div class="info-item">
              <span class="info-label">Target URL</span>
              <span class="info-value url">${sub.targetUrl}</span>
            </div>
            <div class="info-item">
              <span class="info-label">Authentication</span>
              <span class="info-value">${sub.authTypeDisplay}</span>
            </div>
            <div class="info-item">
              <span class="info-label">Timeout</span>
              <span class="info-value">${sub.timeoutSeconds} seconds</span>
            </div>
            <div class="info-item">
              <span class="info-label">Created</span>
              <span class="info-value">${formatRelativeDate(sub.dateCreated)}</span>
            </div>
            ${sub.secret
              ? html`
                  <div class="info-item secret-item">
                    <span class="info-label">HMAC Secret</span>
                    <div class="secret-value">
                      <code>${this._showSecret ? sub.secret : "••••••••••••••••"}</code>
                      <uui-button
                        look="secondary"
                        compact
                        label=${this._showSecret ? "Hide" : "Show"}
                        @click=${() => (this._showSecret = !this._showSecret)}>
                        <uui-icon name=${this._showSecret ? "icon-eye" : "icon-eye-slash"}></uui-icon>
                      </uui-button>
                      <uui-button
                        look="secondary"
                        compact
                        label="Copy"
                        @click=${() => navigator.clipboard.writeText(sub.secret ?? "")}>
                        <uui-icon name="icon-documents"></uui-icon>
                      </uui-button>
                    </div>
                  </div>
                `
              : nothing}
          </div>
        </uui-box>

        <div class="stats-cards">
          <div class="stat-card">
            <div class="stat-value success">${sub.successCount}</div>
            <div class="stat-label">Successful</div>
          </div>
          <div class="stat-card">
            <div class="stat-value failure">${sub.failureCount}</div>
            <div class="stat-label">Failed</div>
          </div>
          <div class="stat-card">
            <div class="stat-value">${sub.lastTriggeredUtc ? formatRelativeDate(sub.lastTriggeredUtc) : "Never"}</div>
            <div class="stat-label">Last Triggered</div>
          </div>
        </div>
      </div>
    `;
  }

  private _renderDeliveriesTable(): unknown {
    if (this._isLoadingDeliveries) {
      return html`<div class="loading"><uui-loader></uui-loader></div>`;
    }

    if (this._deliveries.length === 0) {
      return html`
        <merchello-empty-state
          icon="icon-inbox"
          headline="No deliveries found"
          message=${this._activeTab === "all"
            ? "This webhook hasn't been triggered yet."
            : `No ${this._activeTab} deliveries found.`}>
        </merchello-empty-state>
      `;
    }

    return html`
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
          ${this._deliveries.map((delivery) => this._renderDeliveryRow(delivery))}
        </uui-table>
      </div>
    `;
  }

  private _renderDeliveryRow(delivery: OutboundDeliveryDto): unknown {
    const canRetry =
      delivery.status === OutboundDeliveryStatus.Failed ||
      delivery.status === OutboundDeliveryStatus.Abandoned;

    return html`
      <uui-table-row class="clickable" @click=${() => this._handleViewDelivery(delivery)}>
        <uui-table-cell>${formatRelativeDate(delivery.dateCreated)}</uui-table-cell>
        <uui-table-cell class="center">
          <span class="badge ${delivery.statusCssClass}">
            ${delivery.statusDisplay}
          </span>
        </uui-table-cell>
        <uui-table-cell class="center">
          ${delivery.responseStatusCode !== null
            ? html`<span class="status-code status-code-${Math.floor(delivery.responseStatusCode / 100)}">${delivery.responseStatusCode}</span>`
            : "—"}
        </uui-table-cell>
        <uui-table-cell class="center">${delivery.durationMs}ms</uui-table-cell>
        <uui-table-cell class="center">#${delivery.attemptNumber}</uui-table-cell>
        <uui-table-cell>
          <div class="actions-cell">
            <uui-button
              look="secondary"
              compact
              label="View"
              @click=${(e: Event) => {
                e.stopPropagation();
                this._handleViewDelivery(delivery);
              }}>
              <uui-icon name="icon-eye"></uui-icon>
            </uui-button>
            ${canRetry
              ? html`
                  <uui-button
                    look="secondary"
                    compact
                    label="Retry"
                    @click=${(e: Event) => this._handleRetryDelivery(e, delivery)}>
                    <uui-icon name="icon-refresh"></uui-icon>
                  </uui-button>
                `
              : nothing}
          </div>
        </uui-table-cell>
      </uui-table-row>
    `;
  }

  override render() {
    if (this._isLoading || !this._subscription) {
      return html`<div class="loading"><uui-loader></uui-loader></div>`;
    }

    return html`
      <umb-body-layout header-fit-height main-no-padding>
        <div class="detail-container">
          ${this._renderHeader()}
          ${this._errorMessage
            ? html`<div class="error-banner"><uui-icon name="icon-alert"></uui-icon> ${this._errorMessage}</div>`
            : nothing}
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

            ${this._deliveries.length > 0 && !this._isLoadingDeliveries
              ? html`
                  <merchello-pagination
                    .state=${this._getPaginationState()}
                    .disabled=${this._isLoadingDeliveries}
                    @page-change=${this._handlePageChange}>
                  </merchello-pagination>
                `
              : nothing}
          </div>
        </div>
      </umb-body-layout>
    `;
  }

  static override readonly styles = [
    css`
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
        background: var(--uui-color-warning-standalone);
        color: var(--uui-color-warning-contrast);
      }

      .badge-default {
        background: var(--uui-color-default);
        color: var(--uui-color-text-alt);
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

      .error-banner {
        display: flex;
        align-items: center;
        gap: var(--uui-size-space-2);
        padding: var(--uui-size-space-3);
        background: var(--uui-color-danger-standalone);
        color: var(--uui-color-danger-contrast);
        border-radius: var(--uui-border-radius);
        margin-bottom: var(--uui-size-space-4);
      }
    `,
  ];
}

export default MerchelloWebhookDetailElement;

declare global {
  interface HTMLElementTagNameMap {
    "merchello-webhook-detail": MerchelloWebhookDetailElement;
  }
}
