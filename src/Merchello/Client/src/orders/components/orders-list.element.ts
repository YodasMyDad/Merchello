import { LitElement, html, css } from "@umbraco-cms/backoffice/external/lit";
import { customElement, state } from "@umbraco-cms/backoffice/external/lit";
import { UmbElementMixin } from "@umbraco-cms/backoffice/element-api";
import { UMB_MODAL_MANAGER_CONTEXT, UMB_CONFIRM_MODAL } from "@umbraco-cms/backoffice/modal";
import type { UmbModalManagerContext } from "@umbraco-cms/backoffice/modal";
import { UMB_NOTIFICATION_CONTEXT } from "@umbraco-cms/backoffice/notification";
import type { UmbNotificationContext } from "@umbraco-cms/backoffice/notification";
import type { OrderListItemDto, OrderStatsDto, OrderListParams, OrderColumnKey } from "@orders/types/order.types.js";
import { MerchelloApi } from "@api/merchello-api.js";
import { getStoreSettings } from "@api/store-settings.js";
import type { PaginationState, PageChangeEventDetail } from "@shared/types/pagination.types.js";
import "@shared/components/pagination.element.js";
import "@shared/components/merchello-empty-state.element.js";
import "@orders/components/order-table.element.js";
import type { OrderSelectionChangeEventDetail } from "@orders/components/order-table.element.js";
import type { OrderClickEventDetail } from "@orders/components/order-table.element.js";
import { MERCHELLO_EXPORT_MODAL } from "@orders/modals/export-modal.token.js";
import { MERCHELLO_CREATE_ORDER_MODAL } from "@orders/modals/create-order-modal.token.js";
import { MERCHELLO_EDIT_ORDER_MODAL } from "@orders/modals/edit-order-modal.token.js";
import { navigateToOrderDetail, navigateToOutstandingList } from "@shared/utils/navigation.js";
import { formatCurrency } from "@shared/utils/formatting.js";
import { collectionLayoutStyles } from "@shared/styles/collection-layout.styles.js";

@customElement("merchello-orders-list")
export class MerchelloOrdersListElement extends UmbElementMixin(LitElement) {
  @state() private _orders: OrderListItemDto[] = [];
  @state() private _isLoading = true;
  @state() private _errorMessage: string | null = null;
  @state() private _page: number = 1;
  @state() private _pageSize: number = 50;
  @state() private _totalItems: number = 0;
  @state() private _totalPages: number = 0;
  @state() private _activeTab: string = "all";
  @state() private _selectedOrders: Set<string> = new Set();
  @state() private _stats: OrderStatsDto | null = null;
  @state() private _searchTerm: string = "";
  @state() private _isDeleting: boolean = false;

  private _searchDebounceTimer: ReturnType<typeof setTimeout> | null = null;
  #modalManager?: UmbModalManagerContext;
  #notificationContext?: UmbNotificationContext;
  #isConnected = false;

  constructor() {
    super();
    this.consumeContext(UMB_MODAL_MANAGER_CONTEXT, (context) => {
      this.#modalManager = context;
    });
    this.consumeContext(UMB_NOTIFICATION_CONTEXT, (context) => {
      this.#notificationContext = context;
    });
  }

  override connectedCallback(): void {
    super.connectedCallback();
    this.#isConnected = true;
    this._initializeAndLoad();
  }

  private async _initializeAndLoad(): Promise<void> {
    const settings = await getStoreSettings();
    if (!this.#isConnected) return;
    this._pageSize = settings.defaultPaginationPageSize;
    this._loadOrders();
    this._loadStats();
  }

  override disconnectedCallback(): void {
    super.disconnectedCallback();
    this.#isConnected = false;
    if (this._searchDebounceTimer) {
      clearTimeout(this._searchDebounceTimer);
    }
  }

  private async _loadOrders(): Promise<void> {
    this._isLoading = true;
    this._errorMessage = null;

    const params: OrderListParams = {
      page: this._page,
      pageSize: this._pageSize,
      sortBy: "date",
      sortDir: "desc",
    };

    // Apply search filter
    if (this._searchTerm.trim()) {
      params.search = this._searchTerm.trim();
    }

    // Apply tab filters
    if (this._activeTab === "unfulfilled") {
      params.fulfillmentStatus = "unfulfilled";
    } else if (this._activeTab === "unpaid") {
      params.paymentStatus = "unpaid";
    } else if (this._activeTab === "cancelled") {
      params.cancellationStatus = "cancelled";
    }

    const { data, error } = await MerchelloApi.getOrders(params);

    if (!this.#isConnected) return;

    if (error) {
      this._errorMessage = error.message;
      this._isLoading = false;
      return;
    }

    if (data) {
      this._orders = data.items;
      this._totalItems = data.totalItems;
      this._totalPages = data.totalPages;
      const visibleIds = new Set(data.items.map((order) => order.id));
      this._selectedOrders = new Set(
        Array.from(this._selectedOrders).filter((id) => visibleIds.has(id)),
      );
    }

    this._isLoading = false;
  }

  private async _loadStats(): Promise<void> {
    const { data } = await MerchelloApi.getOrderStats();
    if (!this.#isConnected) return;
    if (data) {
      this._stats = data;
    }
  }

  private _handleTabClick(tab: string): void {
    this._activeTab = tab;
    this._page = 1;
    this._selectedOrders = new Set();
    this._loadOrders();
  }

  private _handleSearchInput(e: Event): void {
    const input = e.target as HTMLInputElement;
    const value = input.value;

    // Debounce search to avoid excessive API calls
    if (this._searchDebounceTimer) {
      clearTimeout(this._searchDebounceTimer);
    }

    this._searchDebounceTimer = setTimeout(() => {
      this._searchTerm = value;
      this._page = 1;
      this._loadOrders();
    }, 300);
  }

  private _handleSearchClear(): void {
    this._searchTerm = "";
    this._page = 1;
    this._selectedOrders = new Set();
    this._loadOrders();
  }

  private _handlePageChange(e: CustomEvent<PageChangeEventDetail>): void {
    this._page = e.detail.page;
    this._selectedOrders = new Set();
    this._loadOrders();
  }

  private _getPaginationState(): PaginationState {
    return {
      page: this._page,
      pageSize: this._pageSize,
      totalItems: this._totalItems,
      totalPages: this._totalPages,
    };
  }

  private _handleSelectionChange(e: CustomEvent<OrderSelectionChangeEventDetail>): void {
    this._selectedOrders = new Set(e.detail.selectedIds);
    this.requestUpdate();
  }

  private _handleOrderClick(e: CustomEvent<OrderClickEventDetail>): void {
    navigateToOrderDetail(e.detail.orderId);
  }

  private _hasActiveFilters(): boolean {
    return this._activeTab !== "all" || this._searchTerm.trim().length > 0;
  }

  private _handleOutstandingClick(): void {
    navigateToOutstandingList();
  }

  private async _handleDeleteSelected(): Promise<void> {
    const count = this._selectedOrders.size;
    if (count === 0) return;

    const modalContext = this.#modalManager?.open(this, UMB_CONFIRM_MODAL, {
      data: {
        headline: "Delete Orders",
        content: `Are you sure you want to delete ${count} order${count !== 1 ? "s" : ""}? This action cannot be undone.`,
        confirmLabel: "Delete",
        color: "danger",
      },
    });

    try {
      await modalContext?.onSubmit();
    } catch {
      return; // User cancelled
    }
    if (!this.#isConnected) return; // Component disconnected while modal was open

    this._isDeleting = true;

    const ids = Array.from(this._selectedOrders);
    const { error } = await MerchelloApi.deleteOrders(ids);

    if (!this.#isConnected) return;

    this._isDeleting = false;

    if (error) {
      this._errorMessage = `Failed to delete orders: ${error.message}`;
      this.#notificationContext?.peek("danger", {
        data: { headline: "Failed to delete", message: error.message || "Could not delete orders" }
      });
      return;
    }

    this.#notificationContext?.peek("positive", {
      data: { headline: "Orders deleted", message: `${count} order${count !== 1 ? "s" : ""} deleted successfully` }
    });

    // Clear selection and reload
    this._selectedOrders = new Set();
    this._loadOrders();
    this._loadStats();
  }

  private async _handleExport(): Promise<void> {
    if (!this.#modalManager) return;

    this.#modalManager.open(this, MERCHELLO_EXPORT_MODAL, {
      data: {},
    });
  }

  private async _handleCreateOrder(): Promise<void> {
    if (!this.#modalManager) return;

    const modal = this.#modalManager.open(this, MERCHELLO_CREATE_ORDER_MODAL, {
      data: {},
    });

    const result = await modal.onSubmit().catch(() => undefined);
    if (!this.#isConnected) return;

    if (result?.isCreated && result.invoiceId) {
      // Refresh the list to show the new order
      this._loadOrders();
      this._loadStats();

      if (result.shouldOpenEdit) {
        // Open the edit modal to add products, discounts, etc.
        const editModal = this.#modalManager.open(this, MERCHELLO_EDIT_ORDER_MODAL, {
          data: { invoiceId: result.invoiceId },
        });

        await editModal.onSubmit().catch(() => undefined);
        if (!this.#isConnected) return;

        // Refresh again after editing
        this._loadOrders();
        this._loadStats();
      } else {
        // Navigate to the order detail (legacy behavior)
        navigateToOrderDetail(result.invoiceId);
      }
    }
  }

  /** Columns to show in the order table */
  private _tableColumns: OrderColumnKey[] = [
    "select",
    "invoiceNumber",
    "date",
    "customer",
    "channel",
    "total",
    "paymentStatus",
    "fulfillmentStatus",
    "itemCount",
  ];

  private _renderLoadingState(): unknown {
    return html`<div class="loading"><uui-loader></uui-loader></div>`;
  }

  private _renderErrorState(): unknown {
    return html`
      <div class="error">
        <uui-icon name="icon-alert"></uui-icon>
        <span>${this._errorMessage}</span>
        <uui-button
          look="secondary"
          label="Retry loading orders"
          @click=${() => this._loadOrders()}
        >
          Retry
        </uui-button>
      </div>
    `;
  }

  private _renderEmptyState(): unknown {
    if (this._hasActiveFilters()) {
      return html`
        <merchello-empty-state
          icon="icon-search"
          headline="No orders match your filters"
          message="Try a different search term or clear filters.">
        </merchello-empty-state>
      `;
    }

    return html`
      <merchello-empty-state
        icon="icon-receipt-dollar"
        headline="No orders found"
        message="Orders will appear here once customers place them.">
      </merchello-empty-state>
    `;
  }

  private _renderOrdersTable(): unknown {
    return html`
      <merchello-order-table
        .orders=${this._orders}
        .columns=${this._tableColumns}
        .selectable=${true}
        .clickable=${true}
        .selectedIds=${Array.from(this._selectedOrders)}
        @order-click=${this._handleOrderClick}
        @selection-change=${this._handleSelectionChange}
      ></merchello-order-table>

      <!-- Pagination -->
      <merchello-pagination
        .state=${this._getPaginationState()}
        .disabled=${this._isLoading}
        @page-change=${this._handlePageChange}
      ></merchello-pagination>
    `;
  }

  private _renderOrdersContent(): unknown {
    if (this._isLoading) {
      return this._renderLoadingState();
    }
    if (this._errorMessage) {
      return this._renderErrorState();
    }
    if (this._orders.length === 0) {
      return this._renderEmptyState();
    }
    return this._renderOrdersTable();
  }

  override render() {
    return html`
      <umb-body-layout header-fit-height main-no-padding>
      <div class="orders-container layout-container">
        <!-- Stats Grid -->
        <div class="stats-grid">
          <uui-box>
            <div class="stat-content">
              <div class="stat-icon stat-icon--orders">
                <uui-icon name="icon-receipt-dollar"></uui-icon>
              </div>
              <div class="stat-details">
                <div class="stat-number">${this._stats?.ordersToday ?? 0}</div>
                <div class="stat-label">Orders Today</div>
              </div>
            </div>
          </uui-box>
          <uui-box>
            <div class="stat-content">
              <div class="stat-icon stat-icon--items">
                <uui-icon name="icon-box"></uui-icon>
              </div>
              <div class="stat-details">
                <div class="stat-number">${this._stats?.itemsOrderedToday ?? 0}</div>
                <div class="stat-label">Items Ordered</div>
              </div>
            </div>
          </uui-box>
          <uui-box>
            <div class="stat-content">
              <div class="stat-icon stat-icon--fulfilled">
                <uui-icon name="icon-check"></uui-icon>
              </div>
              <div class="stat-details">
                <div class="stat-number">${this._stats?.ordersFulfilledToday ?? 0}</div>
                <div class="stat-label">Orders Fulfilled</div>
              </div>
            </div>
          </uui-box>
          <uui-box class="stat-box--outstanding">
            <button
              type="button"
              class="stat-button"
              aria-label="View outstanding invoices"
              @click=${this._handleOutstandingClick}
            >
              <div class="stat-content stat-content--clickable">
                <div class="stat-icon stat-icon--outstanding">
                  <uui-icon name="icon-timer"></uui-icon>
                </div>
                <div class="stat-details">
                  <div class="stat-number">${formatCurrency(this._stats?.totalOutstandingValue ?? 0, this._stats?.currencyCode ?? "USD")}</div>
                  <div class="stat-label">Outstanding${this._stats?.outstandingInvoiceCount ? ` (${this._stats.outstandingInvoiceCount})` : ""}</div>
                  ${this._stats?.overdueInvoiceCount ? html`<div class="stat-overdue">${this._stats.overdueInvoiceCount} overdue</div>` : ""}
                </div>
              </div>
            </button>
          </uui-box>
        </div>

        <!-- Search and Tabs Row -->
        <div class="filters">
          <div class="filters-top">
            <div class="search-box">
              <uui-input
                type="text"
                placeholder="Search orders by invoice #, name, postcode, or email..."
                .value=${this._searchTerm}
                @input=${this._handleSearchInput}
                label="Search orders"
              >
                <uui-icon name="icon-search" slot="prepend"></uui-icon>
                ${this._searchTerm
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
                  : ""}
              </uui-input>
            </div>
            <div class="header-actions">
              ${this._selectedOrders.size > 0
                ? html`
                    <uui-button
                      look="primary"
                      color="danger"
                      label="Delete"
                      ?disabled=${this._isDeleting}
                      @click=${this._handleDeleteSelected}
                    >
                      ${this._isDeleting ? "Deleting..." : `Delete (${this._selectedOrders.size})`}
                    </uui-button>
                  `
                : ""}
              <uui-button look="secondary" label="Export" @click=${this._handleExport}>Export</uui-button>
              <uui-button look="primary" color="positive" label="Create order" @click=${this._handleCreateOrder}>Create order</uui-button>
            </div>
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
              label="Unfulfilled"
              ?active=${this._activeTab === "unfulfilled"}
              @click=${() => this._handleTabClick("unfulfilled")}
            >
              Unfulfilled
            </uui-tab>
            <uui-tab
              label="Unpaid"
              ?active=${this._activeTab === "unpaid"}
              @click=${() => this._handleTabClick("unpaid")}
            >
              Unpaid
            </uui-tab>
            <uui-tab
              label="Cancelled"
              ?active=${this._activeTab === "cancelled"}
              @click=${() => this._handleTabClick("cancelled")}
            >
              Cancelled
            </uui-tab>
          </uui-tab-group>
        </div>

        <!-- Orders Table -->
        ${this._renderOrdersContent()}
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
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: var(--uui-size-space-5);
      margin: 0;
    }

    .stats-grid uui-box {
      --uui-box-default-padding: var(--uui-size-space-4);
    }

    .stat-content {
      display: flex;
      align-items: center;
      gap: var(--uui-size-space-4);
    }

    .stat-icon {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 48px;
      height: 48px;
      border-radius: 12px;
      flex-shrink: 0;
    }

    .stat-icon uui-icon {
      font-size: 24px;
    }

    .stat-icon--orders {
      background: var(--uui-color-current-standalone);
      color: var(--uui-color-current-contrast);
    }

    .stat-icon--items {
      background: var(--uui-color-default-standalone);
      color: var(--uui-color-default-contrast);
    }

    .stat-icon--fulfilled {
      background: var(--uui-color-positive-standalone);
      color: var(--uui-color-positive-contrast);
    }

    .stat-icon--outstanding {
      background: var(--uui-color-warning-standalone);
      color: var(--uui-color-warning-contrast);
    }

    .stat-box--outstanding {
      --uui-box-default-padding: 0;
    }

    .stat-button {
      width: 100%;
      border: 0;
      background: transparent;
      padding: var(--uui-size-space-4);
      border-radius: inherit;
      text-align: left;
      cursor: pointer;
      transition: transform 0.15s ease, box-shadow 0.15s ease;
      color: inherit;
      font: inherit;
    }

    .stat-button:hover,
    .stat-button:focus-visible {
      transform: translateY(-2px);
      box-shadow: 0 4px 8px rgba(0, 0, 0, 0.08);
      outline: none;
    }

    .stat-content--clickable {
      position: relative;
    }

    .stat-overdue {
      font-size: 0.75rem;
      color: var(--uui-color-danger);
      font-weight: 600;
    }

    .stat-details {
      display: flex;
      flex-direction: column;
      gap: var(--uui-size-space-1);
    }

    .stat-number {
      font-size: 2rem;
      font-weight: 700;
      color: var(--uui-color-text);
      line-height: 1;
    }

    .stat-label {
      font-size: var(--uui-type-small-size);
      color: var(--uui-color-text-alt);
    }

    .search-box uui-icon[slot="prepend"] {
      color: var(--uui-color-text-alt);
    }

    .loading {
      display: flex;
      justify-content: center;
      padding: var(--uui-size-space-6);
    }

    .error {
      display: flex;
      align-items: center;
      gap: var(--uui-size-space-2);
      padding: var(--uui-size-space-4);
      background: var(--uui-color-danger-standalone);
      color: var(--uui-color-danger-contrast);
      border-radius: var(--uui-border-radius);
    }

    .error span {
      flex: 1;
    }

    merchello-pagination {
      padding: var(--uui-size-space-3);
      border-top: 1px solid var(--uui-color-border);
    }
  `,
  ];
}

export default MerchelloOrdersListElement;

declare global {
  interface HTMLElementTagNameMap {
    "merchello-orders-list": MerchelloOrdersListElement;
  }
}
