import { LitElement, html, css } from "@umbraco-cms/backoffice/external/lit";
import { customElement, state } from "@umbraco-cms/backoffice/external/lit";
import { UmbElementMixin } from "@umbraco-cms/backoffice/element-api";
import type { OrderListItemDto } from "./types.js";
import { MerchelloApi } from "../api/merchello-api.js";

@customElement("merchello-orders-list")
export class MerchelloOrdersListElement extends UmbElementMixin(LitElement) {
  @state() private _orders: OrderListItemDto[] = [];
  @state() private _loading = true;
  @state() private _error: string | null = null;
  @state() private _page = 1;
  @state() private _pageSize = 50;
  @state() private _totalItems = 0;
  @state() private _totalPages = 0;
  @state() private _activeTab = "all";
  @state() private _selectedOrders: Set<string> = new Set();

  connectedCallback(): void {
    super.connectedCallback();
    this._loadOrders();
  }

  private async _loadOrders(): Promise<void> {
    this._loading = true;
    this._error = null;

    const params: Record<string, unknown> = {
      page: this._page,
      pageSize: this._pageSize,
      sortBy: "date",
      sortDir: "desc",
    };

    // Apply tab filters
    if (this._activeTab === "unfulfilled") {
      params.fulfillmentStatus = "unfulfilled";
    } else if (this._activeTab === "unpaid") {
      params.paymentStatus = "unpaid";
    }

    const { data, error } = await MerchelloApi.getOrders(params as any);

    if (error) {
      this._error = error.message;
      this._loading = false;
      return;
    }

    if (data) {
      this._orders = data.items;
      this._totalItems = data.totalItems;
      this._totalPages = data.totalPages;
    }

    this._loading = false;
  }

  private _handleTabClick(tab: string): void {
    this._activeTab = tab;
    this._page = 1;
    this._loadOrders();
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

  private _formatDate(dateString: string): string {
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - date.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 0) {
      return `Today at ${date.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })}`;
    } else if (diffDays === 1) {
      return `Yesterday at ${date.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })}`;
    } else if (diffDays < 7) {
      return `${date.toLocaleDateString("en-US", { weekday: "long" })} at ${date.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })}`;
    } else {
      return date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
    }
  }

  private _formatCurrency(amount: number): string {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(amount);
  }

  private _getOrderHref(id: string): string {
    // Pattern: section/{sectionPathname}/workspace/{entityType}/{routePath}
    return `section/merchello/workspace/merchello-order/edit/${id}`;
  }

  render() {
    return html`
      <div class="orders-container">
        <!-- Header -->
        <div class="orders-header">
          <h1>Orders</h1>
          <div class="header-actions">
            <uui-button look="secondary" label="Export">Export</uui-button>
            <uui-button look="secondary" label="More actions">More actions</uui-button>
            <uui-button look="primary" color="positive" label="Create order">Create order</uui-button>
          </div>
        </div>

        <!-- Stats Bar -->
        <div class="stats-bar">
          <div class="stat-item">
            <div class="stat-label">Today</div>
            <div class="stat-value">Orders</div>
            <div class="stat-number">0 --</div>
          </div>
          <div class="stat-item">
            <div class="stat-label">Items ordered</div>
            <div class="stat-number">0 --</div>
          </div>
          <div class="stat-item">
            <div class="stat-label">Returns</div>
            <div class="stat-number">US$0 --</div>
          </div>
          <div class="stat-item">
            <div class="stat-label">Orders fulfilled</div>
            <div class="stat-number">0 --</div>
          </div>
          <div class="stat-item">
            <div class="stat-label">Orders delivered</div>
            <div class="stat-number">0 --</div>
          </div>
          <div class="stat-item">
            <div class="stat-label">Order to fulfillment time</div>
            <div class="stat-number">0 --</div>
          </div>
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
          <button
            class="tab ${this._activeTab === "open" ? "active" : ""}"
            @click=${() => this._handleTabClick("open")}
          >
            Open
          </button>
          <button
            class="tab ${this._activeTab === "archived" ? "active" : ""}"
            @click=${() => this._handleTabClick("archived")}
          >
            Archived
          </button>
          <button class="tab add-tab">+</button>
        </div>

        <!-- Orders Table -->
        ${this._loading
          ? html`<div class="loading"><uui-loader></uui-loader></div>`
          : this._error
            ? html`<div class="error">${this._error}</div>`
            : this._orders.length === 0
              ? html`<div class="empty-state">
                  <uui-icon name="icon-receipt-dollar"></uui-icon>
                  <h3>No orders found</h3>
                  <p>Orders will appear here once customers place them.</p>
                </div>`
              : html`
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
                          <th>Delivery status</th>
                          <th>Delivery method</th>
                          <th>Tags</th>
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
                              <td>${this._formatDate(order.dateCreated)}</td>
                              <td>${order.customerName}</td>
                              <td>${order.channel}</td>
                              <td>${this._formatCurrency(order.total)}</td>
                              <td>
                                <span class="badge ${order.paymentStatus.toLowerCase()}">${order.paymentStatus}</span>
                              </td>
                              <td>
                                <span class="badge ${order.fulfillmentStatus.toLowerCase().replace(" ", "-")}">
                                  ${order.fulfillmentStatus}
                                </span>
                              </td>
                              <td>${order.itemCount} item${order.itemCount !== 1 ? "s" : ""}</td>
                              <td>${order.deliveryStatus || "--"}</td>
                              <td>${order.deliveryMethod}</td>
                              <td>${order.tags.length > 0 ? order.tags.join(", ") : "--"}</td>
                            </tr>
                          `
                        )}
                      </tbody>
                    </table>
                  </div>

                  <!-- Pagination -->
                  <div class="pagination">
                    <span>
                      ${(this._page - 1) * this._pageSize + 1}-${Math.min(this._page * this._pageSize, this._totalItems)} of ${this._totalItems}
                    </span>
                    <div class="pagination-controls">
                      <button
                        ?disabled=${this._page === 1}
                        @click=${() => {
                          this._page--;
                          this._loadOrders();
                        }}
                      >
                        &lt;
                      </button>
                      <button
                        ?disabled=${this._page >= this._totalPages}
                        @click=${() => {
                          this._page++;
                          this._loadOrders();
                        }}
                      >
                        &gt;
                      </button>
                    </div>
                  </div>
                `}
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

    .tabs {
      display: flex;
      gap: var(--uui-size-space-1);
      border-bottom: 1px solid var(--uui-color-border);
      margin-bottom: var(--uui-size-space-4);
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

    .pagination {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: var(--uui-size-space-3);
      border-top: 1px solid var(--uui-color-border);
      font-size: 0.875rem;
    }

    .pagination-controls {
      display: flex;
      gap: var(--uui-size-space-2);
    }

    .pagination-controls button {
      padding: var(--uui-size-space-2) var(--uui-size-space-3);
      border: 1px solid var(--uui-color-border);
      background: var(--uui-color-surface);
      border-radius: var(--uui-border-radius);
      cursor: pointer;
    }

    .pagination-controls button:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }
  `;
}

export default MerchelloOrdersListElement;

declare global {
  interface HTMLElementTagNameMap {
    "merchello-orders-list": MerchelloOrdersListElement;
  }
}
