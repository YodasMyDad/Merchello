import { LitElement, html, css } from "@umbraco-cms/backoffice/external/lit";
import { customElement, state } from "@umbraco-cms/backoffice/external/lit";
import { UmbElementMixin } from "@umbraco-cms/backoffice/element-api";
import type { OrderListItemDto, OrderStatsDto, OrderListParams } from "../types/order.types.js";
import { InvoicePaymentStatus } from "../types/order.types.js";
import { MerchelloApi } from "@api/merchello-api.js";
import { formatCurrency, formatRelativeDate } from "@shared/utils/formatting.js";
import type { PaginationState, PageChangeEventDetail } from "@shared/types/pagination.types.js";
import "@shared/components/pagination.element.js";

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

  private _handleSelectAll(e: Event): void {
    const checkbox = e.target as HTMLInputElement;
    if (checkbox.checked) {
      this._selectedOrders = new Set(this._orders.map((o) => o.id));
    } else {
      this._selectedOrders = new Set();
    }
    this.requestUpdate();
  }

  private _handleSelectOrder(id: string, e: Event): void {
    const checkbox = e.target as HTMLInputElement;
    if (checkbox.checked) {
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
        <table class="orders-table">
          <thead>
            <tr>
              <th class="checkbox-col">
                <input
                  type="checkbox"
                  @change=${this._handleSelectAll}
                  .checked=${this._selectedOrders.size === this._orders.length && this._orders.length > 0}
                />
              </th>
              <th>Order</th>
              <th>Date</th>
              <th>Customer</th>
              <th>Channel</th>
              <th>Total</th>
              <th>Payment status</th>
              <th>Fulfillment status</th>
              <th>Items</th>
              <th>Delivery method</th>
            </tr>
          </thead>
          <tbody>
            ${this._orders.map(
              (order) => html`
                <tr>
                  <td class="checkbox-col">
                    <input
                      type="checkbox"
                      .checked=${this._selectedOrders.has(order.id)}
                      @change=${(e: Event) => this._handleSelectOrder(order.id, e)}
                    />
                  </td>
                  <td class="order-number">
                    <a href=${this._getOrderHref(order.id)}>${order.invoiceNumber || order.id.substring(0, 8)}</a>
                  </td>
                  <td>${formatRelativeDate(order.dateCreated)}</td>
                  <td>${order.customerName}</td>
                  <td>${order.channel}</td>
                  <td>${formatCurrency(order.total)}</td>
                  <td>
                    <span class="badge ${this._getPaymentStatusBadgeClass(order.paymentStatus)}">${order.paymentStatusDisplay}</span>
                  </td>
                  <td>
                    <span class="badge ${order.fulfillmentStatus.toLowerCase().replace(" ", "-")}">
                      ${order.fulfillmentStatus}
                    </span>
                  </td>
                  <td>${order.itemCount} item${order.itemCount !== 1 ? "s" : ""}</td>
                  <td>${order.deliveryMethod}</td>
                </tr>
              `
            )}
          </tbody>
        </table>
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
            <uui-button look="secondary" label="Export">Export</uui-button>
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
            <svg class="search-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="11" cy="11" r="8"></circle>
              <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
            </svg>
            <input
              type="text"
              placeholder="Search orders by invoice #, name, postcode, or email..."
              .value=${this._searchTerm}
              @input=${this._handleSearchInput}
            />
            ${this._searchTerm
              ? html`
                  <button class="search-clear" @click=${this._handleSearchClear} aria-label="Clear search">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <line x1="18" y1="6" x2="6" y2="18"></line>
                      <line x1="6" y1="6" x2="18" y2="18"></line>
                    </svg>
                  </button>
                `
              : ""}
          </div>

          <!-- Tabs -->
          <div class="tabs">
            <button
              class="tab ${this._activeTab === "all" ? "active" : ""}"
              @click=${() => this._handleTabClick("all")}
            >
              All
            </button>
            <button
              class="tab ${this._activeTab === "unfulfilled" ? "active" : ""}"
              @click=${() => this._handleTabClick("unfulfilled")}
            >
              Unfulfilled
            </button>
            <button
              class="tab ${this._activeTab === "unpaid" ? "active" : ""}"
              @click=${() => this._handleTabClick("unpaid")}
            >
              Unpaid
            </button>
          </div>
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
      position: relative;
      flex: 1;
      max-width: 400px;
    }

    .search-box input {
      width: 100%;
      padding: var(--uui-size-space-2) var(--uui-size-space-3);
      padding-left: 36px;
      padding-right: 36px;
      border: 1px solid var(--uui-color-border);
      border-radius: var(--uui-border-radius);
      font-size: 0.875rem;
      background: var(--uui-color-surface);
      color: var(--uui-color-text);
    }

    .search-box input:focus {
      outline: none;
      border-color: var(--uui-color-interactive);
      box-shadow: 0 0 0 1px var(--uui-color-interactive);
    }

    .search-box input::placeholder {
      color: var(--uui-color-text-alt);
    }

    .search-icon {
      position: absolute;
      left: 10px;
      top: 50%;
      transform: translateY(-50%);
      width: 18px;
      height: 18px;
      color: var(--uui-color-text-alt);
      pointer-events: none;
    }

    .search-clear {
      position: absolute;
      right: 6px;
      top: 50%;
      transform: translateY(-50%);
      display: flex;
      align-items: center;
      justify-content: center;
      width: 24px;
      height: 24px;
      padding: 0;
      border: none;
      background: transparent;
      color: var(--uui-color-text-alt);
      cursor: pointer;
      border-radius: 50%;
      transition: all 120ms ease;
    }

    .search-clear:hover {
      background: var(--uui-color-surface-emphasis);
      color: var(--uui-color-text);
    }

    .search-clear svg {
      width: 14px;
      height: 14px;
    }

    .tabs {
      display: flex;
      gap: var(--uui-size-space-1);
      border-bottom: 1px solid var(--uui-color-border);
    }

    .tab {
      padding: var(--uui-size-space-2) var(--uui-size-space-4);
      border: none;
      background: none;
      cursor: pointer;
      font-size: 0.875rem;
      color: var(--uui-color-text-alt);
      border-bottom: 2px solid transparent;
      transition: all 0.2s;
    }

    .tab:hover {
      color: var(--uui-color-text);
    }

    .tab.active {
      color: var(--uui-color-text);
      border-bottom-color: var(--uui-color-current);
    }

    .tab.add-tab {
      font-size: 1rem;
    }

    .table-container {
      overflow-x: auto;
      background: var(--uui-color-surface);
      border: 1px solid var(--uui-color-border);
      border-radius: var(--uui-border-radius);
    }

    .orders-table {
      width: 100%;
      border-collapse: collapse;
      font-size: 0.875rem;
    }

    .orders-table th,
    .orders-table td {
      padding: var(--uui-size-space-3);
      text-align: left;
      border-bottom: 1px solid var(--uui-color-border);
      white-space: nowrap;
    }

    .orders-table th {
      font-weight: 500;
      color: var(--uui-color-text-alt);
      background: var(--uui-color-surface-alt);
    }

    .orders-table tbody tr {
      cursor: pointer;
      transition: background 0.2s;
    }

    .orders-table tbody tr:hover {
      background: var(--uui-color-surface-emphasis);
    }

    .checkbox-col {
      width: 40px;
    }

    .order-number {
      font-weight: 500;
      color: var(--uui-color-interactive);
    }

    .badge {
      display: inline-block;
      padding: 2px 8px;
      border-radius: 12px;
      font-size: 0.75rem;
      font-weight: 500;
    }

    .badge.paid {
      background: #d4edda;
      color: #155724;
    }

    .badge.unpaid {
      background: #f8d7da;
      color: #721c24;
    }

    .badge.fulfilled {
      background: #d4edda;
      color: #155724;
    }

    .badge.unfulfilled {
      background: #fff3cd;
      color: #856404;
    }

    .badge.partial {
      background: #cce5ff;
      color: #004085;
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
