import { LitElement, html, css, nothing } from "@umbraco-cms/backoffice/external/lit";
import { customElement, state } from "@umbraco-cms/backoffice/external/lit";
import { UmbElementMixin } from "@umbraco-cms/backoffice/element-api";
import { UMB_NOTIFICATION_CONTEXT } from "@umbraco-cms/backoffice/notification";
import { UMB_MODAL_MANAGER_CONTEXT } from "@umbraco-cms/backoffice/modal";
import type { UmbNotificationContext } from "@umbraco-cms/backoffice/notification";
import type { UmbModalManagerContext } from "@umbraco-cms/backoffice/modal";
import type {
  WebhookSubscriptionDto,
  WebhookSubscriptionQueryParams,
  WebhookTopicCategoryDto,
  WebhookStatsDto,
} from "@webhooks/types/webhooks.types.js";
import type { PaginationState, PageChangeEventDetail } from "@shared/types/pagination.types.js";
import { MerchelloApi } from "@api/merchello-api.js";
import { getStoreSettings } from "@api/store-settings.js";
import { formatRelativeDate, formatNumber } from "@shared/utils/formatting.js";
import { MERCHELLO_WEBHOOK_SUBSCRIPTION_MODAL } from "@webhooks/modals/webhook-subscription-modal.token.js";
import { MERCHELLO_WEBHOOK_TEST_MODAL } from "@webhooks/modals/webhook-test-modal.token.js";
import "@shared/components/pagination.element.js";
import "@shared/components/merchello-empty-state.element.js";

type FilterTab = "all" | "active" | "inactive";

@customElement("merchello-webhooks-list")
export class MerchelloWebhooksListElement extends UmbElementMixin(LitElement) {
  @state() private _subscriptions: WebhookSubscriptionDto[] = [];
  @state() private _categories: WebhookTopicCategoryDto[] = [];
  @state() private _stats: WebhookStatsDto | null = null;
  @state() private _isLoading = true;
  @state() private _errorMessage: string | null = null;
  @state() private _page = 1;
  @state() private _pageSize = 50;
  @state() private _totalItems = 0;
  @state() private _totalPages = 0;
  @state() private _searchTerm = "";
  @state() private _activeTab: FilterTab = "all";

  private _searchDebounceTimer: ReturnType<typeof setTimeout> | null = null;
  #notificationContext?: UmbNotificationContext;
  #modalManager?: UmbModalManagerContext;
  #isConnected = false;

  constructor() {
    super();
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
    this._initializeAndLoad();
  }

  override disconnectedCallback(): void {
    super.disconnectedCallback();
    this.#isConnected = false;
    if (this._searchDebounceTimer) {
      clearTimeout(this._searchDebounceTimer);
    }
  }

  private async _initializeAndLoad(): Promise<void> {
    const settings = await getStoreSettings();
    if (!this.#isConnected) return;
    this._pageSize = settings.defaultPaginationPageSize;

    // Load topics for create modal
    const { data: categories } = await MerchelloApi.getWebhookTopicsByCategory();
    if (!this.#isConnected) return;
    if (categories) {
      this._categories = categories;
    }

    // Load stats
    const { data: stats } = await MerchelloApi.getWebhookStats();
    if (!this.#isConnected) return;
    if (stats) {
      this._stats = stats;
    }

    this._loadSubscriptions();
  }

  private async _loadSubscriptions(): Promise<void> {
    this._isLoading = true;
    this._errorMessage = null;

    const params: WebhookSubscriptionQueryParams = {
      page: this._page,
      pageSize: this._pageSize,
    };

    if (this._searchTerm.trim()) {
      params.searchTerm = this._searchTerm.trim();
    }

    if (this._activeTab === "active") {
      params.isActive = true;
    } else if (this._activeTab === "inactive") {
      params.isActive = false;
    }

    const { data, error } = await MerchelloApi.getWebhookSubscriptions(params);

    if (!this.#isConnected) return;

    if (error) {
      this._errorMessage = error.message;
      this._isLoading = false;
      return;
    }

    if (data) {
      this._subscriptions = data.items;
      this._totalItems = data.totalItems;
      this._totalPages = data.totalPages;
    }

    this._isLoading = false;
  }

  private _handleSearchInput(e: Event): void {
    const input = e.target as HTMLInputElement;
    const value = input.value;

    if (this._searchDebounceTimer) {
      clearTimeout(this._searchDebounceTimer);
    }

    this._searchDebounceTimer = setTimeout(() => {
      this._searchTerm = value;
      this._page = 1;
      this._loadSubscriptions();
    }, 300);
  }

  private _handleSearchClear(): void {
    this._searchTerm = "";
    this._page = 1;
    this._loadSubscriptions();
  }

  private _handleTabChange(tab: FilterTab): void {
    this._activeTab = tab;
    this._page = 1;
    this._loadSubscriptions();
  }

  private _handlePageChange(e: CustomEvent<PageChangeEventDetail>): void {
    this._page = e.detail.page;
    this._loadSubscriptions();
  }

  private _getPaginationState(): PaginationState {
    return {
      page: this._page,
      pageSize: this._pageSize,
      totalItems: this._totalItems,
      totalPages: this._totalPages,
    };
  }

  private async _handleCreateSubscription(): Promise<void> {
    if (!this.#modalManager) return;

    const modal = this.#modalManager.open(this, MERCHELLO_WEBHOOK_SUBSCRIPTION_MODAL, {
      data: {
        subscription: undefined,
        topics: this._categories,
      },
    });

    const result = await modal.onSubmit().catch(() => undefined);
    if (result?.saved) {
      this._loadSubscriptions();
      // Refresh stats
      const { data: stats } = await MerchelloApi.getWebhookStats();
      if (stats) this._stats = stats;
    }
  }

  private async _handleEditSubscription(e: Event, subscription: WebhookSubscriptionDto): Promise<void> {
    e.preventDefault();
    e.stopPropagation();
    if (!this.#modalManager) return;

    // Fetch full details
    const { data: detail } = await MerchelloApi.getWebhookSubscription(subscription.id);
    if (!detail) return;

    const modal = this.#modalManager.open(this, MERCHELLO_WEBHOOK_SUBSCRIPTION_MODAL, {
      data: {
        subscription: detail,
        topics: this._categories,
      },
    });

    const result = await modal.onSubmit().catch(() => undefined);
    if (result?.saved) {
      this._loadSubscriptions();
    }
  }

  private async _handleTestSubscription(e: Event, subscription: WebhookSubscriptionDto): Promise<void> {
    e.preventDefault();
    e.stopPropagation();
    if (!this.#modalManager) return;

    this.#modalManager.open(this, MERCHELLO_WEBHOOK_TEST_MODAL, {
      data: { subscription },
    });
  }

  private async _handleToggleActive(e: Event, subscription: WebhookSubscriptionDto): Promise<void> {
    e.preventDefault();
    e.stopPropagation();

    // Optimistically update UI
    const idx = this._subscriptions.findIndex((item) => item.id === subscription.id);
    if (idx === -1) return;

    const originalSubscriptions = [...this._subscriptions];
    this._subscriptions = [
      ...this._subscriptions.slice(0, idx),
      { ...subscription, isActive: !subscription.isActive },
      ...this._subscriptions.slice(idx + 1),
    ];

    const { error } = await MerchelloApi.updateWebhookSubscription(subscription.id, {
      isActive: !subscription.isActive,
    });

    if (!this.#isConnected) return;

    if (error) {
      // Revert on error
      this._subscriptions = originalSubscriptions;
      this.#notificationContext?.peek("danger", {
        data: { headline: "Failed", message: error.message },
      });
    }
  }

  private async _handleDeleteSubscription(e: Event, subscription: WebhookSubscriptionDto): Promise<void> {
    e.preventDefault();
    e.stopPropagation();

    if (!confirm(`Delete webhook "${subscription.name}"? This cannot be undone.`)) {
      return;
    }

    const { error } = await MerchelloApi.deleteWebhookSubscription(subscription.id);

    if (!this.#isConnected) return;

    if (error) {
      this.#notificationContext?.peek("danger", {
        data: { headline: "Failed to delete", message: error.message },
      });
      return;
    }

    this.#notificationContext?.peek("positive", {
      data: { headline: "Deleted", message: `Webhook "${subscription.name}" has been deleted.` },
    });
    this._loadSubscriptions();
    // Refresh stats
    const { data: stats } = await MerchelloApi.getWebhookStats();
    if (stats) this._stats = stats;
  }

  private _handleViewDeliveries(subscription: WebhookSubscriptionDto): void {
    // Navigate to detail view
    window.history.pushState({}, "", `section/merchello/workspace/merchello-webhooks/edit/webhooks/${subscription.id}`);
    window.dispatchEvent(new PopStateEvent("popstate"));
  }

  private _renderStats(): unknown {
    if (!this._stats) return nothing;

    return html`
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
          <div class="stat-value">${formatNumber(this._stats.successRate, 1)}%</div>
          <div class="stat-label">Success Rate</div>
        </div>
        <div class="stat-card">
          <div class="stat-value">${formatNumber(this._stats.averageResponseTimeMs, 0)}ms</div>
          <div class="stat-label">Avg Response</div>
        </div>
      </div>
    `;
  }

  private _renderLoadingState(): unknown {
    return html`<div class="loading"><uui-loader></uui-loader></div>`;
  }

  private _renderErrorState(): unknown {
    return html`
      <div class="error-banner">
        <uui-icon name="icon-alert"></uui-icon>
        <span>${this._errorMessage}</span>
      </div>
    `;
  }

  private _renderEmptyState(): unknown {
    if (this._searchTerm.trim() || this._activeTab !== "all") {
      return html`
        <merchello-empty-state
          icon="icon-search"
          headline="No webhooks found"
          message="Try adjusting your search or filter.">
        </merchello-empty-state>
      `;
    }

    return html`
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

  private _renderSearchAndFilters(): unknown {
    return html`
      <div class="toolbar">
        <div class="search-box">
          <uui-input
            type="text"
            placeholder="Search webhooks..."
            .value=${this._searchTerm}
            @input=${this._handleSearchInput}
            label="Search webhooks">
            <uui-icon name="icon-search" slot="prepend"></uui-icon>
            ${this._searchTerm
              ? html`
                  <uui-button
                    slot="append"
                    compact
                    look="secondary"
                    label="Clear search"
                    @click=${this._handleSearchClear}>
                    <uui-icon name="icon-wrong"></uui-icon>
                  </uui-button>
                `
              : nothing}
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

  private _renderSubscriptionRow(subscription: WebhookSubscriptionDto): unknown {
    return html`
      <uui-table-row class="clickable" @click=${() => this._handleViewDeliveries(subscription)}>
        <uui-table-cell>
          <div class="subscription-info">
            <span class="subscription-name">${subscription.name}</span>
            <span class="subscription-url">${subscription.targetUrl}</span>
          </div>
        </uui-table-cell>
        <uui-table-cell>
          <span class="topic-name">${subscription.topicDisplayName || subscription.topic}</span>
        </uui-table-cell>
        <uui-table-cell class="center">
          <uui-toggle
            .checked=${subscription.isActive}
            @click=${(e: Event) => this._handleToggleActive(e, subscription)}
            label="${subscription.isActive ? 'Active' : 'Inactive'}">
          </uui-toggle>
        </uui-table-cell>
        <uui-table-cell>
          ${subscription.lastTriggeredUtc ? formatRelativeDate(subscription.lastTriggeredUtc) : "Never"}
        </uui-table-cell>
        <uui-table-cell class="center">
          <div class="stats-inline">
            <span class="stat-success">${subscription.successCount}</span>
            <span class="stat-separator">/</span>
            <span class="stat-failure">${subscription.failureCount}</span>
          </div>
        </uui-table-cell>
        <uui-table-cell>
          <div class="actions-cell">
            <uui-button
              look="secondary"
              compact
              label="Test"
              title="Send test webhook"
              @click=${(e: Event) => this._handleTestSubscription(e, subscription)}>
              <uui-icon name="icon-flash"></uui-icon>
            </uui-button>
            <uui-button
              look="secondary"
              compact
              label="Edit"
              @click=${(e: Event) => this._handleEditSubscription(e, subscription)}>
              <uui-icon name="icon-edit"></uui-icon>
            </uui-button>
            <uui-button
              look="secondary"
              compact
              color="danger"
              label="Delete"
              @click=${(e: Event) => this._handleDeleteSubscription(e, subscription)}>
              <uui-icon name="icon-trash"></uui-icon>
            </uui-button>
          </div>
        </uui-table-cell>
      </uui-table-row>
    `;
  }

  private _renderSubscriptionsTable(): unknown {
    return html`
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
          ${this._subscriptions.map((subscription) => this._renderSubscriptionRow(subscription))}
        </uui-table>
      </div>
    `;
  }

  private _renderContent(): unknown {
    if (this._isLoading) {
      return this._renderLoadingState();
    }
    if (this._errorMessage) {
      return this._renderErrorState();
    }
    if (this._subscriptions.length === 0) {
      return this._renderEmptyState();
    }
    return this._renderSubscriptionsTable();
  }

  override render() {
    return html`
      <umb-body-layout header-fit-height main-no-padding>
        <div class="webhooks-container">
          ${this._renderStats()}
          ${this._renderSearchAndFilters()}
          ${this._renderContent()}

          ${this._subscriptions.length > 0 && !this._isLoading
            ? html`
                <merchello-pagination
                  .state=${this._getPaginationState()}
                  .disabled=${this._isLoading}
                  @page-change=${this._handlePageChange}>
                </merchello-pagination>
              `
            : nothing}
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
    `,
  ];
}

export default MerchelloWebhooksListElement;

declare global {
  interface HTMLElementTagNameMap {
    "merchello-webhooks-list": MerchelloWebhooksListElement;
  }
}
