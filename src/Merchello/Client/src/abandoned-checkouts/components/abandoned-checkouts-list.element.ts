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
import { formatRelativeDate, formatNumber, formatItemCount } from "@shared/utils/formatting.js";
import type { PaginationState, PageChangeEventDetail } from "@shared/types/pagination.types.js";
import "@shared/components/pagination.element.js";
import "@shared/components/merchello-empty-state.element.js";
import "@shared/components/merchello-status-badge.element.js";
import { collectionLayoutStyles } from "@shared/styles/collection-layout.styles.js";

type FilterTab = "all" | "abandoned" | "recovered" | "converted";
type RowAction = "copy" | "resend";

const MAX_RECOVERY_EMAILS = 3;
const SEARCH_DEBOUNCE_MS = 300;
const TAB_TO_STATUS: Record<Exclude<FilterTab, "all">, AbandonedCheckoutQueryParams["status"]> = {
  abandoned: "Abandoned",
  recovered: "Recovered",
  converted: "Converted",
};

@customElement("merchello-abandoned-checkouts-list")
export class MerchelloAbandonedCheckoutsListElement extends UmbElementMixin(LitElement) {
  @state() private _checkouts: AbandonedCheckoutListItemDto[] = [];
  @state() private _stats: AbandonedCheckoutStatsDto | null = null;
  @state() private _isLoading = true;
  @state() private _isStatsLoading = false;
  @state() private _errorMessage: string | null = null;
  @state() private _page = 1;
  @state() private _pageSize = 50;
  @state() private _totalItems = 0;
  @state() private _totalPages = 0;
  @state() private _activeTab: FilterTab = "all";
  @state() private _searchTerm = "";
  @state() private _searchInputValue = "";
  @state() private _busyActions = new Set<string>();

  #notificationContext?: UmbNotificationContext;
  #isConnected = false;
  #searchDebounceTimer: ReturnType<typeof setTimeout> | null = null;
  #loadRequestToken = 0;
  #statsRequestToken = 0;

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
      this.#searchDebounceTimer = null;
    }
  }

  private async _initializeAndLoad(): Promise<void> {
    try {
      const settings = await getStoreSettings();
      if (!this.#isConnected) return;
      this._pageSize = settings.defaultPaginationPageSize;
    } catch {
      // Keep defaults if settings are unavailable.
    }

    await Promise.all([this._loadStats(), this._loadCheckouts()]);
  }

  private _getQueryParams(): AbandonedCheckoutQueryParams {
    const params: AbandonedCheckoutQueryParams = {
      page: this._page,
      pageSize: this._pageSize,
      orderBy: "DateAbandoned",
      descending: true,
    };

    const search = this._searchTerm.trim();
    if (search) {
      params.search = search;
    }

    if (this._activeTab !== "all") {
      params.status = TAB_TO_STATUS[this._activeTab];
    }

    return params;
  }

  private _getPaginationState(): PaginationState {
    return {
      page: this._page,
      pageSize: this._pageSize,
      totalItems: this._totalItems,
      totalPages: this._totalPages,
    };
  }

  private _hasActiveFilters(): boolean {
    return this._activeTab !== "all" || this._searchTerm.trim().length > 0;
  }

  private _getActionKey(action: RowAction, checkoutId: string): string {
    return `${action}:${checkoutId}`;
  }

  private _isActionBusy(action: RowAction, checkoutId: string): boolean {
    return this._busyActions.has(this._getActionKey(action, checkoutId));
  }

  private _setActionBusy(action: RowAction, checkoutId: string, isBusy: boolean): void {
    const key = this._getActionKey(action, checkoutId);
    const next = new Set(this._busyActions);

    if (isBusy) {
      next.add(key);
    } else {
      next.delete(key);
    }

    this._busyActions = next;
  }

  private _canResend(checkout: AbandonedCheckoutListItemDto): boolean {
    return checkout.status === "Abandoned" &&
      !!checkout.customerEmail &&
      checkout.recoveryEmailsSent < MAX_RECOVERY_EMAILS;
  }

  private _getResendTitle(checkout: AbandonedCheckoutListItemDto): string {
    if (!checkout.customerEmail) {
      return "No customer email available for resend";
    }

    if (checkout.recoveryEmailsSent >= MAX_RECOVERY_EMAILS) {
      return `Maximum ${MAX_RECOVERY_EMAILS} recovery emails already sent`;
    }

    if (checkout.status !== "Abandoned") {
      return "Recovery email is available only for abandoned checkouts";
    }

    return "Resend recovery email";
  }

  private _formatDateTitle(dateString: string): string {
    const date = new Date(dateString);
    return Number.isNaN(date.getTime()) ? dateString : date.toLocaleString();
  }

  private _renderDateValue(dateString: string | null): unknown {
    if (!dateString) {
      return html`<span class="no-date">-</span>`;
    }

    return html`
      <span class="date-value" title=${this._formatDateTitle(dateString)}>
        ${formatRelativeDate(dateString)}
      </span>
    `;
  }

  private async _loadStats(): Promise<void> {
    this._isStatsLoading = true;
    const requestToken = ++this.#statsRequestToken;

    const { data, error } = await MerchelloApi.getAbandonedCheckoutStats();
    if (!this.#isConnected || requestToken !== this.#statsRequestToken) return;

    if (error) {
      this._isStatsLoading = false;
      return;
    }

    this._stats = data ?? null;
    this._isStatsLoading = false;
  }

  private async _loadCheckouts(): Promise<void> {
    this._isLoading = true;
    this._errorMessage = null;
    const requestToken = ++this.#loadRequestToken;

    const { data, error } = await MerchelloApi.getAbandonedCheckouts(this._getQueryParams());
    if (!this.#isConnected || requestToken !== this.#loadRequestToken) return;

    if (error) {
      this._errorMessage = error.message || "Unable to load abandoned checkouts.";
      this._checkouts = [];
      this._totalItems = 0;
      this._totalPages = 0;
      this._isLoading = false;
      return;
    }

    this._checkouts = data?.items ?? [];
    this._totalItems = data?.totalItems ?? 0;
    this._totalPages = data?.totalPages ?? 0;
    this._isLoading = false;
  }

  private _handleTabClick(tab: FilterTab): void {
    if (this._activeTab === tab) return;
    this._activeTab = tab;
    this._page = 1;
    this._loadCheckouts();
  }

  private _handleSearchInput(event: Event): void {
    this._searchInputValue = (event.target as HTMLInputElement).value;

    if (this.#searchDebounceTimer) {
      clearTimeout(this.#searchDebounceTimer);
    }

    this.#searchDebounceTimer = setTimeout(() => {
      if (!this.#isConnected) return;
      this._searchTerm = this._searchInputValue.trim();
      this._page = 1;
      this._loadCheckouts();
    }, SEARCH_DEBOUNCE_MS);
  }

  private _handleSearchClear(): void {
    if (!this._searchInputValue && !this._searchTerm) return;
    this._searchInputValue = "";
    this._searchTerm = "";
    this._page = 1;
    this._loadCheckouts();
  }

  private _handleResetFilters(): void {
    this._activeTab = "all";
    this._searchInputValue = "";
    this._searchTerm = "";
    this._page = 1;
    this._loadCheckouts();
  }

  private _handlePageChange(event: CustomEvent<PageChangeEventDetail>): void {
    if (this._page === event.detail.page) return;
    this._page = event.detail.page;
    this._loadCheckouts();
  }

  private async _handleCopyLink(checkout: AbandonedCheckoutListItemDto): Promise<void> {
    if (this._isActionBusy("copy", checkout.id)) return;
    this._setActionBusy("copy", checkout.id, true);

    try {
      const { data, error } = await MerchelloApi.regenerateRecoveryLink(checkout.id);
      if (!this.#isConnected) return;

      if (error || !data?.recoveryLink) {
        this.#notificationContext?.peek("danger", {
          data: {
            headline: "Link generation failed",
            message: error?.message || "Failed to generate recovery link.",
          },
        });
        return;
      }

      try {
        if (!navigator.clipboard?.writeText) {
          throw new Error("Clipboard API unavailable");
        }
        await navigator.clipboard.writeText(data.recoveryLink);
        if (!this.#isConnected) return;
        this.#notificationContext?.peek("positive", {
          data: {
            headline: "Recovery link copied",
            message: "The recovery link was copied to your clipboard.",
          },
        });
      } catch {
        this.#notificationContext?.peek("danger", {
          data: {
            headline: "Copy failed",
            message: "Could not copy the recovery link to your clipboard.",
          },
        });
      }
    } finally {
      if (this.#isConnected) {
        this._setActionBusy("copy", checkout.id, false);
      }
    }
  }

  private async _handleResendEmail(checkout: AbandonedCheckoutListItemDto): Promise<void> {
    if (!this._canResend(checkout) || this._isActionBusy("resend", checkout.id)) return;
    this._setActionBusy("resend", checkout.id, true);

    try {
      const { data, error } = await MerchelloApi.resendRecoveryEmail(checkout.id);
      if (!this.#isConnected) return;

      if (error || !data?.success) {
        this.#notificationContext?.peek("danger", {
          data: {
            headline: "Email send failed",
            message: error?.message || data?.message || "Failed to send recovery email.",
          },
        });
        return;
      }

      this.#notificationContext?.peek("positive", {
        data: {
          headline: "Recovery email sent",
          message: data.message || "Recovery email sent successfully.",
        },
      });

      await Promise.all([this._loadCheckouts(), this._loadStats()]);
    } finally {
      if (this.#isConnected) {
        this._setActionBusy("resend", checkout.id, false);
      }
    }
  }

  private _handleRetry(): void {
    this._loadCheckouts();
    this._loadStats();
  }

  private _renderStats(): unknown {
    if (this._isStatsLoading && !this._stats) {
      return html`
        <div class="stats-grid">
          <uui-box><uui-loader-bar></uui-loader-bar></uui-box>
          <uui-box><uui-loader-bar></uui-loader-bar></uui-box>
          <uui-box><uui-loader-bar></uui-loader-bar></uui-box>
          <uui-box><uui-loader-bar></uui-loader-bar></uui-box>
        </div>
      `;
    }

    if (!this._stats) {
      return nothing;
    }

    return html`
      <div class="stats-grid">
        <uui-box class="stat-card">
          <div class="stat-label">Abandoned</div>
          <div class="stat-value">${formatNumber(this._stats.totalAbandoned)}</div>
        </uui-box>
        <uui-box class="stat-card">
          <div class="stat-label">Recovered</div>
          <div class="stat-value">${formatNumber(this._stats.totalRecovered)}</div>
          <div class="stat-meta">${formatNumber(this._stats.recoveryRate, 1)}% recovery rate</div>
        </uui-box>
        <uui-box class="stat-card">
          <div class="stat-label">Converted</div>
          <div class="stat-value">${formatNumber(this._stats.totalConverted)}</div>
          <div class="stat-meta">${formatNumber(this._stats.conversionRate, 1)}% conversion rate</div>
        </uui-box>
        <uui-box class="stat-card">
          <div class="stat-label">Value Recovered</div>
          <div class="stat-value">${this._stats.formattedValueRecovered}</div>
        </uui-box>
      </div>
    `;
  }

  private _renderFilters(): unknown {
    return html`
      <div class="filters">
        <div class="filters-top">
          <div class="search-box">
            <uui-input
              type="search"
              .value=${this._searchInputValue}
              placeholder="Search by customer email..."
              label="Search abandoned checkouts"
              @input=${this._handleSearchInput}
            >
              <uui-icon name="icon-search" slot="prepend"></uui-icon>
              ${this._searchInputValue
                ? html`
                    <uui-button
                      slot="append"
                      compact
                      look="secondary"
                      label="Clear search"
                      @click=${this._handleSearchClear}
                    >
                      <uui-icon name="icon-wrong"></uui-icon>
                    </uui-button>
                  `
                : nothing}
            </uui-input>
          </div>

          ${this._hasActiveFilters()
            ? html`
                <uui-button
                  look="secondary"
                  label="Reset filters"
                  @click=${this._handleResetFilters}
                >
                  Reset
                </uui-button>
              `
            : nothing}
        </div>

        <uui-tab-group class="tabs">
          <uui-tab
            label="All"
            ?active=${this._activeTab === "all"}
            @click=${() => this._handleTabClick("all")}
          >
            All
          </uui-tab>
          <uui-tab
            label="Abandoned"
            ?active=${this._activeTab === "abandoned"}
            @click=${() => this._handleTabClick("abandoned")}
          >
            Abandoned
          </uui-tab>
          <uui-tab
            label="Recovered"
            ?active=${this._activeTab === "recovered"}
            @click=${() => this._handleTabClick("recovered")}
          >
            Recovered
          </uui-tab>
          <uui-tab
            label="Converted"
            ?active=${this._activeTab === "converted"}
            @click=${() => this._handleTabClick("converted")}
          >
            Converted
          </uui-tab>
        </uui-tab-group>
      </div>
    `;
  }

  private _renderErrorState(): unknown {
    return html`
      <div class="error-banner" role="alert">
        <uui-icon name="icon-alert"></uui-icon>
        <span>${this._errorMessage}</span>
        <uui-button
          look="secondary"
          label="Retry loading abandoned checkouts"
          @click=${this._handleRetry}
        >
          Retry
        </uui-button>
      </div>
    `;
  }

  private _renderLoadingState(): unknown {
    return html`
      <div class="loading" role="status" aria-live="polite" aria-label="Loading abandoned checkouts">
        <uui-loader></uui-loader>
      </div>
    `;
  }

  private _renderEmptyState(): unknown {
    if (this._hasActiveFilters()) {
      return html`
        <merchello-empty-state
          icon="icon-search"
          headline="No abandoned checkouts match your filters"
          message="Try a different search term or reset filters."
        >
          <uui-button slot="actions" look="secondary" label="Reset filters" @click=${this._handleResetFilters}>
            Reset filters
          </uui-button>
        </merchello-empty-state>
      `;
    }

    return html`
      <merchello-empty-state
        icon="icon-shopping-basket-alt-2"
        headline="No abandoned checkouts yet"
        message="Checkouts will appear here when customers leave without completing payment."
      >
      </merchello-empty-state>
    `;
  }

  private _renderRow(checkout: AbandonedCheckoutListItemDto): unknown {
    const canResend = this._canResend(checkout);
    const isCopyBusy = this._isActionBusy("copy", checkout.id);
    const isResendBusy = this._isActionBusy("resend", checkout.id);

    return html`
      <uui-table-row>
        <uui-table-cell>
          <div class="customer-cell">
            <span class="customer-email">${checkout.customerEmail || "Guest checkout"}</span>
            ${checkout.customerName
              ? html`<span class="customer-name">${checkout.customerName}</span>`
              : nothing}
          </div>
        </uui-table-cell>
        <uui-table-cell>
          <div class="amount-cell">
            <span class="amount-value">${checkout.formattedTotal}</span>
            <span class="item-count">${formatItemCount(checkout.itemCount)}</span>
          </div>
        </uui-table-cell>
        <uui-table-cell>
          <merchello-status-badge
            .cssClass=${checkout.statusCssClass}
            .label=${checkout.statusDisplay}
          ></merchello-status-badge>
        </uui-table-cell>
        <uui-table-cell>${this._renderDateValue(checkout.dateAbandoned)}</uui-table-cell>
        <uui-table-cell>${this._renderDateValue(checkout.lastActivityUtc)}</uui-table-cell>
        <uui-table-cell>
          <div class="email-count-cell">
            <span>${checkout.recoveryEmailsSent} / ${MAX_RECOVERY_EMAILS}</span>
            ${checkout.recoveryEmailsSent >= MAX_RECOVERY_EMAILS
              ? html`<span class="email-limit-label">Max reached</span>`
              : nothing}
          </div>
        </uui-table-cell>
        <uui-table-cell class="actions-cell">
          <uui-button
            compact
            look="secondary"
            label="Copy recovery link"
            ?disabled=${isCopyBusy}
            @click=${() => this._handleCopyLink(checkout)}
          >
            <uui-icon name="icon-link"></uui-icon>
            ${isCopyBusy ? "Copying..." : "Copy link"}
          </uui-button>
          ${checkout.customerEmail
            ? html`
                <uui-button
                  compact
                  look="secondary"
                  label="Resend recovery email"
                  title=${this._getResendTitle(checkout)}
                  ?disabled=${!canResend || isResendBusy}
                  @click=${() => this._handleResendEmail(checkout)}
                >
                  <uui-icon name="icon-message"></uui-icon>
                  ${isResendBusy ? "Sending..." : "Resend"}
                </uui-button>
              `
            : nothing}
        </uui-table-cell>
      </uui-table-row>
    `;
  }

  private _renderTable(): unknown {
    if (this._checkouts.length === 0) {
      return this._renderEmptyState();
    }

    return html`
      <div class="table-container">
        <uui-table class="checkouts-table">
          <uui-table-head>
            <uui-table-head-cell>Customer</uui-table-head-cell>
            <uui-table-head-cell>Total</uui-table-head-cell>
            <uui-table-head-cell>Status</uui-table-head-cell>
            <uui-table-head-cell>Date Abandoned</uui-table-head-cell>
            <uui-table-head-cell>Last Activity</uui-table-head-cell>
            <uui-table-head-cell>Emails Sent</uui-table-head-cell>
            <uui-table-head-cell class="actions-header">Actions</uui-table-head-cell>
          </uui-table-head>
          ${this._checkouts.map((checkout) => this._renderRow(checkout))}
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
    return this._renderTable();
  }

  override render() {
    return html`
      <umb-body-layout header-fit-height main-no-padding>
        <div class="abandoned-checkouts-container layout-container">
          ${this._renderStats()}
          ${this._renderFilters()}
          ${this._renderContent()}
          ${this._totalPages > 1 && !this._errorMessage
            ? html`
                <merchello-pagination
                  .state=${this._getPaginationState()}
                  .disabled=${this._isLoading}
                  @page-change=${this._handlePageChange}
                ></merchello-pagination>
              `
            : nothing}
        </div>
      </umb-body-layout>
    `;
  }

  static override readonly styles = [
    collectionLayoutStyles,
    css`
    :host {
      display: block;
      height: 100%;
      background: var(--uui-color-background);
    }

    .stats-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
      gap: var(--uui-size-space-4);
    }

    .stats-grid uui-box {
      --uui-box-default-padding: var(--uui-size-space-4);
    }

    .stat-card {
      display: grid;
      gap: var(--uui-size-space-1);
    }

    .stat-label {
      color: var(--uui-color-text-alt);
      font-size: var(--uui-type-small-size);
    }

    .stat-value {
      color: var(--uui-color-text);
      font-size: 1.75rem;
      font-weight: 700;
      line-height: 1.1;
    }

    .stat-meta {
      color: var(--uui-color-text-alt);
      font-size: var(--uui-type-small-size);
    }

    .search-box {
      width: 100%;
      max-width: 460px;
    }

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
      vertical-align: middle;
    }

    .customer-cell,
    .amount-cell,
    .email-count-cell {
      display: flex;
      flex-direction: column;
      gap: var(--uui-size-space-1);
    }

    .customer-email,
    .amount-value {
      font-weight: 600;
      color: var(--uui-color-text);
    }

    .customer-name,
    .item-count,
    .email-limit-label,
    .no-date {
      color: var(--uui-color-text-alt);
      font-size: var(--uui-type-small-size);
    }

    .date-value {
      font-size: var(--uui-type-small-size);
    }

    .email-limit-label {
      color: var(--uui-color-danger);
      font-weight: 600;
    }

    .actions-header {
      text-align: right;
    }

    .actions-cell {
      display: flex;
      justify-content: flex-end;
      gap: var(--uui-size-space-2);
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
      padding: var(--uui-size-space-4);
      border-radius: var(--uui-border-radius);
      background: var(--uui-color-danger-standalone);
      color: var(--uui-color-danger-contrast);
    }

    .error-banner span {
      flex: 1;
    }
  `,
  ];
}

export default MerchelloAbandonedCheckoutsListElement;

declare global {
  interface HTMLElementTagNameMap {
    "merchello-abandoned-checkouts-list": MerchelloAbandonedCheckoutsListElement;
  }
}
