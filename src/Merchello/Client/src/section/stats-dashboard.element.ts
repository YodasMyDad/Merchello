import {
  LitElement,
  css,
  html,
  customElement,
  state,
} from "@umbraco-cms/backoffice/external/lit";
import { UmbElementMixin } from "@umbraco-cms/backoffice/element-api";
import { MerchelloApi } from "@api/merchello-api.js";
import { formatCurrency, formatPercent } from "@shared/utils/formatting.js";
import type { DashboardStatsDto, OrderListItemDto, OrderColumnKey } from "@orders/types/order.types.js";
import "@orders/components/order-table.element.js";

@customElement("merchello-stats-dashboard")
export class MerchelloStatsDashboardElement extends UmbElementMixin(LitElement) {
  @state()
  private _stats: DashboardStatsDto | null = null;

  @state()
  private _recentOrders: OrderListItemDto[] = [];

  @state()
  private _isLoading = true;

  #isConnected = false;

  connectedCallback(): void {
    super.connectedCallback();
    this.#isConnected = true;
    this._loadData();
  }

  disconnectedCallback(): void {
    super.disconnectedCallback();
    this.#isConnected = false;
  }

  private async _loadData(): Promise<void> {
    this._isLoading = true;

    // Load both in parallel
    const [statsResult, ordersResult] = await Promise.all([
      MerchelloApi.getDashboardStats(),
      MerchelloApi.getOrders({ pageSize: 15, sortBy: "date", sortDir: "desc" }),
    ]);

    // Prevent state updates if component was disconnected during async operation
    if (!this.#isConnected) return;

    if (statsResult.data) {
      this._stats = statsResult.data;
    }

    if (ordersResult.data) {
      this._recentOrders = ordersResult.data.items;
    }

    this._isLoading = false;
  }

  /** Columns for the dashboard recent orders table */
  private _recentOrderColumns: OrderColumnKey[] = [
    "invoiceNumber",
    "customer",
    "date",
    "paymentStatus",
    "fulfillmentStatus",
    "total",
  ];

  private _getChangeClass(value: number): string {
    if (value > 0) return "positive";
    if (value < 0) return "negative";
    return "neutral";
  }

  render() {
    if (this._isLoading) {
      return html`
        <umb-body-layout header-fit-height main-no-padding>
          <div class="content">
            <div class="loading">
              <uui-loader></uui-loader>
            </div>
          </div>
        </umb-body-layout>
      `;
    }

    return html`
      <umb-body-layout header-fit-height main-no-padding>
      <div class="content">
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
              <merchello-order-table
                .orders=${this._recentOrders}
                .columns=${this._recentOrderColumns}
              ></merchello-order-table>
            `}
      </uui-box>
      </div>
      </umb-body-layout>
    `;
  }

  static styles = [
    css`
      :host {
        display: block;
        height: 100%;
      }

      .content {
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
