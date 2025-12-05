import { LitElement, html, css } from "@umbraco-cms/backoffice/external/lit";
import { customElement, state } from "@umbraco-cms/backoffice/external/lit";
import { UmbElementMixin } from "@umbraco-cms/backoffice/element-api";
import { UMB_MODAL_MANAGER_CONTEXT } from "@umbraco-cms/backoffice/modal";
import type { UmbModalManagerContext } from "@umbraco-cms/backoffice/modal";
import type { OrderListItemDto, OrderStatsDto, OrderListParams } from "@orders/types/order.types.js";
import { InvoicePaymentStatus } from "@orders/types/order.types.js";
import { MerchelloApi } from "@api/merchello-api.js";
import { formatCurrency, formatRelativeDate } from "@shared/utils/formatting.js";
import type { PaginationState, PageChangeEventDetail } from "@shared/types/pagination.types.js";
import "@shared/components/pagination.element.js";
import { MERCHELLO_EXPORT_MODAL } from "@orders/modals/export-modal.token.js";

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

  constructor() {
    super();
    this.consumeContext(UMB_MODAL_MANAGER_CONTEXT, (context) => {
      this.#modalManager = context;
    });
  }

  connectedCallback(): void {
    super.connectedCallback();
    this._loadOrders();
    this._loadStats();
  }

  disconnectedCallback(): void {
    super.disconnectedCallback();
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
    }

    const { data, error } = await MerchelloApi.getOrders(params);

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

  private _handleSelectAll(e: CustomEvent): void {
    const checked = (e.target as HTMLInputElement).checked;
    if (checked) {
      this._selectedOrders = new Set(this._orders.map((o) => o.id));
    } else {
      this._selectedOrders = new Set();
    }
    this.requestUpdate();
  }

  private _handleSelectOrder(id: string, e: CustomEvent): void {
    const checked = (e.target as HTMLInputElement).checked;
    if (checked) {
      this._selectedOrders.add(id);
    } else {
      this._selectedOrders.delete(id);
    }
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

    this._isDeleting = false;

    if (error) {
      this._errorMessage = `Failed to delete orders: ${error.message}`;
      return;
    }

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

  private _getPaymentStatusBadgeClass(status: InvoicePaymentStatus): string {
    switch (status) {
      case InvoicePaymentStatus.Paid:
        return "paid";
      case InvoicePaymentStatus.PartiallyPaid:
        return "partial";
      case InvoicePaymentStatus.Refunded:
      case InvoicePaymentStatus.PartiallyRefunded:
        return "refunded";
      case InvoicePaymentStatus.AwaitingPayment:
        return "awaiting";
      default:
        return "unpaid";
    }
  }

  private _getOrderHref(id: string): string {
    // Pattern: section/{sectionPathname}/workspace/{entityType}/{routePath}
    return `section/merchello/workspace/merchello-order/edit/${id}`;
  }

  private _renderLoadingState(): unknown {
    return html`<div class="loading"><uui-loader></uui-loader></div>`;
  }

  private _renderErrorState(): unknown {
    return html`<div class="error">${this._errorMessage}</div>`;
  }

  private _renderEmptyState(): unknown {
    return html`
      <div class="empty-state">
        <uui-icon name="icon-receipt-dollar"></uui-icon>
        <h3>No orders found</h3>
        <p>Orders will appear here once customers place them.</p>
      </div>
    `;
  }

  private _renderOrdersTable(): unknown {
    return html`
      <div class="table-container">
        <uui-table class="orders-table">
          <uui-table-head>
            <uui-table-head-cell class="checkbox-col">
              <uui-checkbox
                aria-label="Select all orders"
                @change=${this._handleSelectAll}
                ?checked=${this._selectedOrders.size === this._orders.length && this._orders.length > 0}
              ></uui-checkbox>
            </uui-table-head-cell>
            <uui-table-head-cell>Order</uui-table-head-cell>
            <uui-table-head-cell>Date</uui-table-head-cell>
            <uui-table-head-cell>Customer</uui-table-head-cell>
            <uui-table-head-cell>Channel</uui-table-head-cell>
            <uui-table-head-cell>Total</uui-table-head-cell>
            <uui-table-head-cell>Payment status</uui-table-head-cell>
            <uui-table-head-cell>Fulfillment status</uui-table-head-cell>
            <uui-table-head-cell>Items</uui-table-head-cell>
            <uui-table-head-cell>Delivery method</uui-table-head-cell>
          </uui-table-head>
          ${this._orders.map(
            (order) => html`
              <uui-table-row>
                <uui-table-cell class="checkbox-col">
                  <uui-checkbox
                    aria-label="Select order ${order.invoiceNumber || order.id}"
                    ?checked=${this._selectedOrders.has(order.id)}
                    @change=${(e: CustomEvent) => this._handleSelectOrder(order.id, e)}
                  ></uui-checkbox>
                </uui-table-cell>
                <uui-table-cell class="order-number">
                  <a href=${this._getOrderHref(order.id)}>${order.invoiceNumber || order.id.substring(0, 8)}</a>
                </uui-table-cell>
                <uui-table-cell>${formatRelativeDate(order.dateCreated)}</uui-table-cell>
                <uui-table-cell>${order.customerName}</uui-table-cell>
                <uui-table-cell>${order.channel}</uui-table-cell>
                <uui-table-cell>${formatCurrency(order.total)}</uui-table-cell>
                <uui-table-cell>
                  <span class="badge ${this._getPaymentStatusBadgeClass(order.paymentStatus)}">${order.paymentStatusDisplay}</span>
                </uui-table-cell>
                <uui-table-cell>
                  <span class="badge ${order.fulfillmentStatus.toLowerCase().replace(" ", "-")}">
                    ${order.fulfillmentStatus}
                  </span>
                </uui-table-cell>
                <uui-table-cell>${order.itemCount} item${order.itemCount !== 1 ? "s" : ""}</uui-table-cell>
                <uui-table-cell>${order.deliveryMethod}</uui-table-cell>
              </uui-table-row>
            `
          )}
        </uui-table>
      </div>

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
      <div class="orders-container">
        <!-- Header -->
        <div class="orders-header">
          <h1>Orders</h1>
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
            <uui-button look="primary" color="positive" label="Create order">Create order</uui-button>
          </div>
        </div>

        <!-- Stats Bar -->
        <div class="stats-bar">
          <div class="stat-item">
            <div class="stat-label">Today</div>
            <div class="stat-value">Orders</div>
            <div class="stat-number">${this._stats?.ordersToday ?? 0}</div>
          </div>
          <div class="stat-item">
            <div class="stat-label">Items ordered</div>
            <div class="stat-number">${this._stats?.itemsOrderedToday ?? 0}</div>
          </div>
          <div class="stat-item">
            <div class="stat-label">Orders fulfilled</div>
            <div class="stat-number">${this._stats?.ordersFulfilledToday ?? 0}</div>
          </div>
          <div class="stat-item">
            <div class="stat-label">Orders delivered</div>
            <div class="stat-number">${this._stats?.ordersDeliveredToday ?? 0}</div>
          </div>
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
          </uui-tab-group>
        </div>

        <!-- Orders Table -->
        ${this._renderOrdersContent()}
      </div>
    `;
  }

  static styles = css`
    :host {
      display: block;
      padding: var(--uui-size-layout-1);
      background: var(--uui-color-background);
    }

    .orders-container {
      max-width: 100%;
    }

    .orders-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: var(--uui-size-space-4);
    }

    .orders-header h1 {
      margin: 0;
      font-size: 1.5rem;
      font-weight: 600;
    }

    .header-actions {
      display: flex;
      gap: var(--uui-size-space-2);
    }

    .stats-bar {
      display: flex;
      gap: var(--uui-size-space-4);
      padding: var(--uui-size-space-4);
      background: var(--uui-color-surface);
      border: 1px solid var(--uui-color-border);
      border-radius: var(--uui-border-radius);
      margin-bottom: var(--uui-size-space-4);
      overflow-x: auto;
    }

    .stat-item {
      flex: 1;
      min-width: 120px;
    }

    .stat-label {
      font-size: 0.75rem;
      color: var(--uui-color-text-alt);
      margin-bottom: var(--uui-size-space-1);
    }

    .stat-value {
      font-size: 0.875rem;
      font-weight: 500;
    }

    .stat-number {
      font-size: 0.875rem;
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

    .table-container {
      overflow-x: auto;
      background: var(--uui-color-surface);
      border: 1px solid var(--uui-color-border);
      border-radius: var(--uui-border-radius);
    }

    .orders-table {
      width: 100%;
    }

    uui-table-head-cell,
    uui-table-cell {
      white-space: nowrap;
    }

    uui-table-row {
      cursor: pointer;
    }

    .checkbox-col {
      width: 40px;
    }

    .order-number a {
      font-weight: 500;
      color: var(--uui-color-interactive);
      text-decoration: none;
    }

    .order-number a:hover {
      text-decoration: underline;
    }

    .badge {
      display: inline-block;
      padding: 2px 8px;
      border-radius: 12px;
      font-size: 0.75rem;
      font-weight: 500;
    }

    .badge.paid {
      background: var(--uui-color-positive-standalone);
      color: var(--uui-color-positive-contrast);
    }

    .badge.unpaid {
      background: var(--uui-color-danger-standalone);
      color: var(--uui-color-danger-contrast);
    }

    .badge.fulfilled {
      background: var(--uui-color-positive-standalone);
      color: var(--uui-color-positive-contrast);
    }

    .badge.unfulfilled {
      background: var(--uui-color-warning-standalone);
      color: var(--uui-color-warning-contrast);
    }

    .badge.partial {
      background: var(--uui-color-warning-standalone);
      color: var(--uui-color-warning-contrast);
    }

    .loading {
      display: flex;
      justify-content: center;
      padding: var(--uui-size-space-6);
    }

    .error {
      padding: var(--uui-size-space-4);
      background: #f8d7da;
      color: #721c24;
      border-radius: var(--uui-border-radius);
    }

    .empty-state {
      text-align: center;
      padding: var(--uui-size-layout-2);
      color: var(--uui-color-text-alt);
    }

    .empty-state uui-icon {
      font-size: 3rem;
      margin-bottom: var(--uui-size-space-4);
    }

    .empty-state h3 {
      margin: 0 0 var(--uui-size-space-2);
      color: var(--uui-color-text);
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
