import { LitElement, html, css, nothing } from "@umbraco-cms/backoffice/external/lit";
import { customElement, state } from "@umbraco-cms/backoffice/external/lit";
import { UmbElementMixin } from "@umbraco-cms/backoffice/element-api";
import { UMB_NOTIFICATION_CONTEXT } from "@umbraco-cms/backoffice/notification";
import type { UmbNotificationContext } from "@umbraco-cms/backoffice/notification";
import type {
  AbandonedCheckoutListItemDto,
  AbandonedCheckoutStatsDto,
  AbandonedCheckoutQueryParams,
} from "@abandoned-checkouts/types/abandoned-checkout.types.js";
import { MerchelloApi } from "@api/merchello-api.js";
import { getStoreSettings } from "@api/store-settings.js";
import { formatRelativeDate, formatNumber } from "@shared/utils/formatting.js";
import type { PageChangeEventDetail } from "@shared/types/pagination.types.js";
import "@shared/components/pagination.element.js";
import "@shared/components/merchello-empty-state.element.js";

type FilterTab = "all" | "abandoned" | "recovered" | "converted";

@customElement("merchello-abandoned-checkouts-list")
export class MerchelloAbandonedCheckoutsListElement extends UmbElementMixin(LitElement) {
  @state() private _checkouts: AbandonedCheckoutListItemDto[] = [];
  @state() private _stats: AbandonedCheckoutStatsDto | null = null;
  @state() private _isLoading = true;
  @state() private _errorMessage: string | null = null;
  @state() private _page: number = 1;
  @state() private _pageSize: number = 50;
  @state() private _totalItems: number = 0;
  @state() private _totalPages: number = 0;
  @state() private _activeTab: FilterTab = "all";
  @state() private _searchTerm: string = "";

  #notificationContext?: UmbNotificationContext;
  #isConnected = false;
  #searchDebounceTimer?: number;

  constructor() {
    super();
    this.consumeContext(UMB_NOTIFICATION_CONTEXT, (context) => {
      this.#notificationContext = context;
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
    if (this.#searchDebounceTimer) {
      clearTimeout(this.#searchDebounceTimer);
    }
  }

  private async _initializeAndLoad(): Promise<void> {
    const settings = await getStoreSettings();
    if (!this.#isConnected) return;
    this._pageSize = settings.defaultPaginationPageSize;
    this._loadStats();
    this._loadCheckouts();
  }

  private async _loadStats(): Promise<void> {
    const { data, error } = await MerchelloApi.getAbandonedCheckoutStats();
    if (!this.#isConnected) return;
    if (error) {
      return;
    }
    if (data) {
      this._stats = data;
    }
  }

  private async _loadCheckouts(): Promise<void> {
    this._isLoading = true;
    this._errorMessage = null;

    const params: AbandonedCheckoutQueryParams = {
      page: this._page,
      pageSize: this._pageSize,
      orderBy: "DateAbandoned",
      descending: true,
    };

    // Apply search filter
    if (this._searchTerm.trim()) {
      params.search = this._searchTerm.trim();
    }

    // Apply tab-specific status filter
    if (this._activeTab !== "all") {
      // Convert tab to proper status casing
      params.status = this._activeTab.charAt(0).toUpperCase() + this._activeTab.slice(1) as AbandonedCheckoutQueryParams["status"];
    }

    const { data, error } = await MerchelloApi.getAbandonedCheckouts(params);

    if (!this.#isConnected) return;

    if (error) {
      this._errorMessage = error.message;
      this._isLoading = false;
      return;
    }

    if (data) {
      this._checkouts = data.items;
      this._totalItems = data.totalItems;
      this._totalPages = data.totalPages;
    }

    this._isLoading = false;
  }

  private _handleTabClick(tab: FilterTab): void {
    this._activeTab = tab;
    this._page = 1;
    this._loadCheckouts();
  }

  private _handleSearchInput(e: Event): void {
    const value = (e.target as HTMLInputElement).value;
    if (this.#searchDebounceTimer) {
      clearTimeout(this.#searchDebounceTimer);
    }
    this.#searchDebounceTimer = window.setTimeout(() => {
      this._searchTerm = value;
      this._page = 1;
      this._loadCheckouts();
    }, 300);
  }

  private _handlePageChange(e: CustomEvent<PageChangeEventDetail>): void {
    this._page = e.detail.page;
    this._loadCheckouts();
  }

  private async _handleCopyLink(checkout: AbandonedCheckoutListItemDto, e: Event): Promise<void> {
    e.stopPropagation();

    const { data, error } = await MerchelloApi.regenerateRecoveryLink(checkout.id);

    if (error) {
      this.#notificationContext?.peek("danger", {
        data: {
          headline: "Error",
          message: "Failed to generate recovery link.",
        },
      });
      return;
    }

    if (data?.recoveryLink) {
      try {
        await navigator.clipboard.writeText(data.recoveryLink);
        this.#notificationContext?.peek("positive", {
          data: {
            headline: "Link Copied",
            message: "Recovery link copied to clipboard.",
          },
        });
      } catch {
        this.#notificationContext?.peek("danger", {
          data: {
            headline: "Error",
            message: "Failed to copy link to clipboard.",
          },
        });
      }
    }
  }

  private async _handleResendEmail(checkout: AbandonedCheckoutListItemDto, e: Event): Promise<void> {
    e.stopPropagation();

    const { data, error } = await MerchelloApi.resendRecoveryEmail(checkout.id);

    if (error) {
      this.#notificationContext?.peek("danger", {
        data: {
          headline: "Error",
          message: error.message || "Failed to send recovery email.",
        },
      });
      return;
    }

    if (data?.success) {
      this.#notificationContext?.peek("positive", {
        data: {
          headline: "Email Sent",
          message: data.message || "Recovery email sent successfully.",
        },
      });
      // Reload to update the emails sent count
      this._loadCheckouts();
    }
  }

  private _renderStats() {
    if (!this._stats) return nothing;

    return html`
      <div class="stats-grid">
        <uui-box class="stat-card">
          <div class="stat-value">${this._stats.totalAbandoned}</div>
          <div class="stat-label">Total Abandoned</div>
        </uui-box>
        <uui-box class="stat-card">
          <div class="stat-value">${formatNumber(this._stats.recoveryRate, 1)}%</div>
          <div class="stat-label">Recovery Rate</div>
        </uui-box>
        <uui-box class="stat-card">
          <div class="stat-value">${formatNumber(this._stats.conversionRate, 1)}%</div>
          <div class="stat-label">Conversion Rate</div>
        </uui-box>
        <uui-box class="stat-card">
          <div class="stat-value">${this._stats.formattedValueRecovered}</div>
          <div class="stat-label">Value Recovered</div>
        </uui-box>
      </div>
    `;
  }

  private _renderFilterRow() {
    return html`
      <div class="filter-row">
        <uui-tab-group>
          <uui-tab
            label="All"
            ?active=${this._activeTab === "all"}
            @click=${() => this._handleTabClick("all")}>
            All
          </uui-tab>
          <uui-tab
            label="Abandoned"
            ?active=${this._activeTab === "abandoned"}
            @click=${() => this._handleTabClick("abandoned")}>
            Abandoned
          </uui-tab>
          <uui-tab
            label="Recovered"
            ?active=${this._activeTab === "recovered"}
            @click=${() => this._handleTabClick("recovered")}>
            Recovered
          </uui-tab>
          <uui-tab
            label="Converted"
            ?active=${this._activeTab === "converted"}
            @click=${() => this._handleTabClick("converted")}>
            Converted
          </uui-tab>
        </uui-tab-group>
        <uui-input
          type="search"
          placeholder="Search by email..."
          @input=${this._handleSearchInput}
          label="Search abandoned checkouts">
          <uui-icon name="icon-search" slot="prepend"></uui-icon>
        </uui-input>
      </div>
    `;
  }

  private _renderTable() {
    if (this._checkouts.length === 0) {
      return html`
        <merchello-empty-state
          icon="icon-shopping-basket-alt-2"
          headline="No Abandoned Checkouts"
          message="No abandoned checkouts found matching your criteria.">
        </merchello-empty-state>
      `;
    }

    return html`
      <div class="table-container">
        <uui-table class="checkouts-table">
          <uui-table-head>
            <uui-table-head-cell>Customer</uui-table-head-cell>
            <uui-table-head-cell>Total</uui-table-head-cell>
            <uui-table-head-cell>Status</uui-table-head-cell>
            <uui-table-head-cell>Abandoned</uui-table-head-cell>
            <uui-table-head-cell>Emails Sent</uui-table-head-cell>
            <uui-table-head-cell>Actions</uui-table-head-cell>
          </uui-table-head>
          ${this._checkouts.map((checkout) => this._renderRow(checkout))}
        </uui-table>
      </div>
    `;
  }

  private _renderRow(checkout: AbandonedCheckoutListItemDto) {
    const canResend = checkout.statusDisplay === "Abandoned" && checkout.customerEmail;

    return html`
      <uui-table-row>
        <uui-table-cell>
          <span class="customer-email">${checkout.customerEmail || "Guest"}</span>
          ${checkout.customerName ? html`<br><span class="customer-name">${checkout.customerName}</span>` : nothing}
        </uui-table-cell>
        <uui-table-cell>
          <span class="amount">${checkout.formattedTotal}</span>
          <br><span class="item-count">${checkout.itemCount} item${checkout.itemCount !== 1 ? "s" : ""}</span>
        </uui-table-cell>
        <uui-table-cell>
          <span class="badge ${checkout.statusCssClass}">${checkout.statusDisplay}</span>
        </uui-table-cell>
        <uui-table-cell>
          ${checkout.dateAbandoned
            ? html`<span class="date">${formatRelativeDate(checkout.dateAbandoned)}</span>`
            : html`<span class="no-date">-</span>`}
        </uui-table-cell>
        <uui-table-cell>
          <span class="emails-sent">${checkout.recoveryEmailsSent} of 3</span>
        </uui-table-cell>
        <uui-table-cell class="actions-cell">
          <uui-button
            compact
            look="secondary"
            label="Copy Recovery Link"
            title="Copy Recovery Link"
            @click=${(e: Event) => this._handleCopyLink(checkout, e)}>
            <uui-icon name="icon-link"></uui-icon>
          </uui-button>
          ${canResend
            ? html`
                <uui-button
                  compact
                  look="secondary"
                  label="Resend Email"
                  title="Resend Recovery Email"
                  @click=${(e: Event) => this._handleResendEmail(checkout, e)}>
                  <uui-icon name="icon-message"></uui-icon>
                </uui-button>
              `
            : nothing}
        </uui-table-cell>
      </uui-table-row>
    `;
  }

  override render() {
    return html`
      <div class="abandoned-checkouts-list">
        ${this._renderStats()}
        ${this._renderFilterRow()}

        ${this._errorMessage
          ? html`<div class="error-banner">${this._errorMessage}</div>`
          : nothing}

        ${this._isLoading
          ? html`<div class="loading" role="status" aria-label="Loading abandoned checkouts"><uui-loader></uui-loader></div>`
          : this._renderTable()}

        ${this._totalPages > 1
          ? html`
              <merchello-pagination
                .page=${this._page}
                .pageSize=${this._pageSize}
                .totalItems=${this._totalItems}
                .totalPages=${this._totalPages}
                @page-change=${this._handlePageChange}>
              </merchello-pagination>
            `
          : nothing}
      </div>
    `;
  }

  static override readonly styles = css`
    :host {
      display: block;
      padding: var(--uui-size-space-5);
    }

    .abandoned-checkouts-list {
      display: flex;
      flex-direction: column;
      gap: var(--uui-size-space-4);
    }

    /* Stats Grid */
    .stats-grid {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: var(--uui-size-space-4);
    }

    @media (max-width: 1200px) {
      .stats-grid {
        grid-template-columns: repeat(2, 1fr);
      }
    }

    @media (max-width: 600px) {
      .stats-grid {
        grid-template-columns: 1fr;
      }
    }

    .stat-card {
      text-align: center;
      padding: var(--uui-size-space-4);
    }

    .stat-value {
      font-size: 2rem;
      font-weight: 700;
      color: var(--uui-color-text);
    }

    .stat-label {
      font-size: 0.875rem;
      color: var(--uui-color-text-alt);
      margin-top: var(--uui-size-space-1);
    }

    /* Filter Row */
    .filter-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: var(--uui-size-space-4);
      flex-wrap: wrap;
    }

    uui-input[type="search"] {
      width: 280px;
    }

    /* Table */
    .table-container {
      overflow-x: auto;
      background: var(--uui-color-surface);
      border: 1px solid var(--uui-color-border);
      border-radius: var(--uui-border-radius);
    }

    .checkouts-table {
      width: 100%;
    }

    uui-table-head-cell,
    uui-table-cell {
      white-space: nowrap;
    }

    .customer-email {
      font-weight: 600;
    }

    .customer-name {
      font-size: 0.875rem;
      color: var(--uui-color-text-alt);
    }

    .amount {
      font-weight: 600;
    }

    .item-count {
      font-size: 0.75rem;
      color: var(--uui-color-text-alt);
    }

    .date {
      font-size: 0.875rem;
    }

    .no-date {
      color: var(--uui-color-text-alt);
    }

    .emails-sent {
      font-size: 0.875rem;
    }

    .actions-cell {
      display: flex;
      gap: var(--uui-size-space-2);
    }

    /* Badges */
    .badge {
      display: inline-block;
      padding: 2px 8px;
      font-size: 0.6875rem;
      font-weight: 600;
      text-transform: uppercase;
      border-radius: var(--uui-border-radius);
    }

    .badge-default {
      background: var(--uui-color-surface-alt);
      color: var(--uui-color-text-alt);
    }

    .badge-warning {
      background: var(--uui-color-warning);
      color: var(--uui-color-warning-contrast);
    }

    .badge-info {
      background: var(--uui-color-current);
      color: var(--uui-color-current-contrast);
    }

    .badge-positive {
      background: var(--uui-color-positive);
      color: var(--uui-color-positive-contrast);
    }

    .badge-danger {
      background: var(--uui-color-danger);
      color: var(--uui-color-danger-contrast);
    }

    /* Error */
    .error-banner {
      padding: var(--uui-size-space-3);
      background: var(--uui-color-danger-standalone);
      color: var(--uui-color-danger-contrast);
      border-radius: var(--uui-border-radius);
    }

    /* Loading */
    .loading {
      display: flex;
      justify-content: center;
      padding: var(--uui-size-space-6);
    }
  `;
}

export default MerchelloAbandonedCheckoutsListElement;

declare global {
  interface HTMLElementTagNameMap {
    "merchello-abandoned-checkouts-list": MerchelloAbandonedCheckoutsListElement;
  }
}
