import { LitElement, html, css } from "@umbraco-cms/backoffice/external/lit";
import { customElement, state } from "@umbraco-cms/backoffice/external/lit";
import { UmbElementMixin } from "@umbraco-cms/backoffice/element-api";
import { UMB_MODAL_MANAGER_CONTEXT } from "@umbraco-cms/backoffice/modal";
import type { UmbModalManagerContext } from "@umbraco-cms/backoffice/modal";
import { UMB_NOTIFICATION_CONTEXT } from "@umbraco-cms/backoffice/notification";
import type { UmbNotificationContext } from "@umbraco-cms/backoffice/notification";
import type { OrderListItemDto, OrderStatsDto, OrderListParams, OrderColumnKey } from "@orders/types/order.types.js";
import { MerchelloApi } from "@api/merchello-api.js";
import type { PaginationState, PageChangeEventDetail } from "@shared/types/pagination.types.js";
import "@shared/components/pagination.element.js";
import "@shared/components/merchello-empty-state.element.js";
import "./order-table.element.js";
import type { OrderSelectionChangeEventDetail } from "./order-table.element.js";
import { MERCHELLO_EXPORT_MODAL } from "@orders/modals/export-modal.token.js";
import { MERCHELLO_CREATE_ORDER_MODAL } from "@orders/modals/create-order-modal.token.js";
import { navigateToOrderDetail } from "@shared/utils/navigation.js";

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

  connectedCallback(): void {
    super.connectedCallback();
    this.#isConnected = true;
    this._loadOrders();
    this._loadStats();
  }

  disconnectedCallback(): void {
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
    this._loadOrders();
  }

  private _handlePageChange(e: CustomEvent<PageChangeEventDetail>): void {
    this._page = e.detail.page;
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

  private async _handleDeleteSelected(): Promise<void> {
    const count = this._selectedOrders.size;
    if (count === 0) return;

    const confirmed = confirm(
      `Are you sure you want to delete ${count} order${count !== 1 ? "s" : ""}? This action cannot be undone.`
    );

    if (!confirmed) return;

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
      // Navigate to the new order using SPA routing
      navigateToOrderDetail(result.invoiceId);
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
    "deliveryMethod",
  ];

  private _renderLoadingState(): unknown {
    return html`<div class="loading"><uui-loader></uui-loader></div>`;
  }

  private _renderErrorState(): unknown {
    return html`<div class="error">${this._errorMessage}</div>`;
  }

  private _renderEmptyState(): unknown {
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
        .selectedIds=${Array.from(this._selectedOrders)}
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

  render() {
    return html`
      <umb-body-layout header-fit-height main-no-padding>
      <div class="orders-container">
        <!-- Header Actions -->
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
          <uui-box>
            <div class="stat-content">
              <div class="stat-icon stat-icon--delivered">
                <uui-icon name="icon-truck"></uui-icon>
              </div>
              <div class="stat-details">
                <div class="stat-number">${this._stats?.ordersDeliveredToday ?? 0}</div>
                <div class="stat-label">Orders Delivered</div>
              </div>
            </div>
          </uui-box>
        </div>

        <!-- Search and Tabs Row -->
        <div class="search-tabs-row">
          <!-- Search Box -->
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

          <!-- Tabs -->
          <uui-tab-group>
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

  static styles = css`
    :host {
      display: block;
      height: 100%;
      background: var(--uui-color-background);
    }

    .orders-container {
      max-width: 100%;
      padding: var(--uui-size-layout-1);
    }

    .header-actions {
      display: flex;
      gap: var(--uui-size-space-2);
      align-items: center;
      justify-content: flex-end;
      margin-bottom: var(--uui-size-space-4);
    }

    .stats-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: var(--uui-size-space-5);
      margin-bottom: var(--uui-size-space-5);
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
      background: rgba(59, 130, 246, 0.15);
      color: #3b82f6;
    }

    .stat-icon--items {
      background: rgba(168, 85, 247, 0.15);
      color: #a855f7;
    }

    .stat-icon--fulfilled {
      background: rgba(34, 197, 94, 0.15);
      color: #22c55e;
    }

    .stat-icon--delivered {
      background: rgba(249, 115, 22, 0.15);
      color: #f97316;
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

    .search-tabs-row {
      display: flex;
      flex-direction: column;
      gap: var(--uui-size-space-3);
      margin-bottom: var(--uui-size-space-4);
    }

    @media (min-width: 768px) {
      .search-tabs-row {
        flex-direction: row;
        align-items: flex-end;
        justify-content: space-between;
      }
    }

    .search-box {
      flex: 1;
      max-width: 400px;
    }

    .search-box uui-input {
      width: 100%;
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
      padding: var(--uui-size-space-4);
      background: var(--uui-color-danger-standalone);
      color: var(--uui-color-danger-contrast);
      border-radius: var(--uui-border-radius);
    }

    merchello-pagination {
      padding: var(--uui-size-space-3);
      border-top: 1px solid var(--uui-color-border);
    }
  `;
}

export default MerchelloOrdersListElement;

declare global {
  interface HTMLElementTagNameMap {
    "merchello-orders-list": MerchelloOrdersListElement;
  }
}
