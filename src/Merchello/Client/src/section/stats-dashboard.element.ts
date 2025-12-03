import {
  LitElement,
  css,
  html,
  customElement,
  state,
} from "@umbraco-cms/backoffice/external/lit";
import { UmbElementMixin } from "@umbraco-cms/backoffice/element-api";
import { MerchelloApi } from "@api/merchello-api.js";
import { formatCurrency, formatShortDate, formatPercent } from "@shared/utils/formatting.js";
import type { DashboardStatsDto, OrderListItemDto } from "@orders/types/order.types.js";
import { InvoicePaymentStatus } from "@orders/types/order.types.js";

@customElement("merchello-stats-dashboard")
export class MerchelloStatsDashboardElement extends UmbElementMixin(LitElement) {
  @state()
  private _stats: DashboardStatsDto | null = null;

  @state()
  private _recentOrders: OrderListItemDto[] = [];

  @state()
  private _isLoading = true;

  connectedCallback(): void {
    super.connectedCallback();
    this._loadData();
  }

  private async _loadData(): Promise<void> {
    this._isLoading = true;

    // Load both in parallel
    const [statsResult, ordersResult] = await Promise.all([
      MerchelloApi.getDashboardStats(),
      MerchelloApi.getOrders({ pageSize: 15, sortBy: "date", sortDir: "desc" }),
    ]);

    if (statsResult.data) {
      this._stats = statsResult.data;
    }

    if (ordersResult.data) {
      this._recentOrders = ordersResult.data.items;
    }

    this._isLoading = false;
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

  private _getChangeClass(value: number): string {
    if (value > 0) return "positive";
    if (value < 0) return "negative";
    return "neutral";
  }

  private _getOrderHref(id: string): string {
    return `section/merchello/workspace/merchello-order/edit/${id}`;
  }

  render() {
    if (this._isLoading) {
      return html`
        <div class="loading">
          <uui-loader></uui-loader>
        </div>
      `;
    }

    return html`
      <div class="stats-grid">
        <uui-box headline="Orders">
          <div class="stat-value">${this._stats?.ordersThisMonth ?? 0}</div>
          <div class="stat-label">This Month</div>
          <div class="stat-change ${this._getChangeClass(this._stats?.ordersChangePercent ?? 0)}">
            ${formatPercent(this._stats?.ordersChangePercent ?? 0)} from last month
          </div>
        </uui-box>

        <uui-box headline="Revenue">
          <div class="stat-value">${formatCurrency(this._stats?.revenueThisMonth ?? 0)}</div>
          <div class="stat-label">This Month</div>
          <div class="stat-change ${this._getChangeClass(this._stats?.revenueChangePercent ?? 0)}">
            ${formatPercent(this._stats?.revenueChangePercent ?? 0)} from last month
          </div>
        </uui-box>

        <uui-box headline="Products">
          <div class="stat-value">${this._stats?.productCount ?? 0}</div>
          <div class="stat-label">Active Products</div>
          <div class="stat-change ${this._getChangeClass(this._stats?.productCountChange ?? 0)}">
            ${this._stats?.productCountChange !== 0
              ? `${this._stats?.productCountChange! > 0 ? "+" : ""}${this._stats?.productCountChange} this month`
              : "No change"}
          </div>
        </uui-box>

        <uui-box headline="Customers">
          <div class="stat-value">${this._stats?.customerCount ?? 0}</div>
          <div class="stat-label">Unique Customers</div>
          <div class="stat-change ${this._getChangeClass(this._stats?.customerCountChange ?? 0)}">
            ${this._stats?.customerCountChange !== 0
              ? `+${this._stats?.customerCountChange} new this month`
              : "No new customers"}
          </div>
        </uui-box>
      </div>

      <uui-box headline="Recent Orders" class="wide">
        ${this._recentOrders.length === 0
          ? html`<p class="no-data">No orders yet</p>`
          : html`
              <uui-table>
                <uui-table-head>
                  <uui-table-head-cell>Order #</uui-table-head-cell>
                  <uui-table-head-cell>Customer</uui-table-head-cell>
                  <uui-table-head-cell>Date</uui-table-head-cell>
                  <uui-table-head-cell>Payment</uui-table-head-cell>
                  <uui-table-head-cell>Fulfillment</uui-table-head-cell>
                  <uui-table-head-cell>Total</uui-table-head-cell>
                </uui-table-head>
                ${this._recentOrders.map(
                  (order) => html`
                    <uui-table-row>
                      <uui-table-cell>
                        <a href=${this._getOrderHref(order.id)}>#${order.invoiceNumber}</a>
                      </uui-table-cell>
                      <uui-table-cell>${order.customerName}</uui-table-cell>
                      <uui-table-cell>${formatShortDate(order.dateCreated)}</uui-table-cell>
                      <uui-table-cell>
                        <span class="badge ${this._getPaymentStatusBadgeClass(order.paymentStatus)}">${order.paymentStatusDisplay}</span>
                      </uui-table-cell>
                      <uui-table-cell>
                        <span class="badge ${order.fulfillmentStatus.toLowerCase().replace(" ", "-")}">${order.fulfillmentStatus}</span>
                      </uui-table-cell>
                      <uui-table-cell>${formatCurrency(order.total)}</uui-table-cell>
                    </uui-table-row>
                  `
                )}
              </uui-table>
            `}
      </uui-box>
    `;
  }

  static styles = [
    css`
      :host {
        display: block;
        padding: var(--uui-size-layout-1);
      }

      .loading {
        display: flex;
        justify-content: center;
        align-items: center;
        min-height: 300px;
      }

      .stats-grid {
        display: grid;
        grid-template-columns: repeat(4, 1fr);
        gap: var(--uui-size-layout-1);
        margin-bottom: var(--uui-size-layout-1);
      }

      .stat-value {
        font-size: 2.5rem;
        font-weight: bold;
        color: var(--uui-color-text);
        margin-bottom: var(--uui-size-space-2);
      }

      .stat-label {
        font-size: var(--uui-type-small-size);
        color: var(--uui-color-text-alt);
        margin-bottom: var(--uui-size-space-2);
      }

      .stat-change {
        font-size: var(--uui-type-small-size);
      }

      .stat-change.positive {
        color: var(--uui-color-positive);
      }

      .stat-change.negative {
        color: var(--uui-color-danger);
      }

      .stat-change.neutral {
        color: var(--uui-color-text-alt);
      }

      .wide {
        grid-column: span 4;
      }

      uui-table {
        width: 100%;
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
        background: #fff3cd;
        color: #856404;
      }

      .badge.fulfilled {
        background: #d4edda;
        color: #155724;
      }

      .badge.unfulfilled {
        background: #1b264f;
        color: #ffffff;
      }

      .badge.partial {
        background: #cce5ff;
        color: #004085;
      }

      uui-table-cell a {
        color: var(--uui-color-interactive);
        text-decoration: none;
      }

      uui-table-cell a:hover {
        text-decoration: underline;
      }

      .no-data {
        text-align: center;
        color: var(--uui-color-text-alt);
        padding: var(--uui-size-layout-2);
      }
    `,
  ];
}

export default MerchelloStatsDashboardElement;

declare global {
  interface HTMLElementTagNameMap {
    "merchello-stats-dashboard": MerchelloStatsDashboardElement;
  }
}
