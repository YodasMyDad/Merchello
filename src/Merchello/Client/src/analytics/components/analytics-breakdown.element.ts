import {
  LitElement,
  html,
  css,
  customElement,
  property,
} from "@umbraco-cms/backoffice/external/lit";
import { UmbElementMixin } from "@umbraco-cms/backoffice/element-api";
import type { SalesBreakdownDto } from "../types/analytics.types.js";

interface BreakdownRow {
  label: string;
  value: number;
  change: number;
  isNegative?: boolean;
  isBold?: boolean;
}

@customElement("merchello-analytics-breakdown")
export class MerchelloAnalyticsBreakdown extends UmbElementMixin(LitElement) {
  @property({ type: Object })
  data: SalesBreakdownDto | null = null;

  @property({ type: String })
  currencySymbol = "$";

  @property({ type: Boolean })
  isLoading = false;

  private _getRows(): BreakdownRow[] {
    if (!this.data) return [];

    return [
      { label: "Gross sales", value: this.data.grossSales, change: this.data.grossSalesChange },
      { label: "Discounts", value: this.data.discounts, change: this.data.discountsChange, isNegative: true },
      { label: "Returns", value: this.data.returns, change: this.data.returnsChange, isNegative: true },
      { label: "Net sales", value: this.data.netSales, change: this.data.netSalesChange, isBold: true },
      { label: "Shipping charges", value: this.data.shippingCharges, change: this.data.shippingChargesChange },
      { label: "Return fees", value: this.data.returnFees, change: this.data.returnFeesChange },
      { label: "Taxes", value: this.data.taxes, change: this.data.taxesChange },
      { label: "Total sales", value: this.data.totalSales, change: this.data.totalSalesChange, isBold: true },
    ];
  }

  private _formatCurrency(value: number, isNegative?: boolean): string {
    const absValue = Math.abs(value);
    const formatted = absValue.toLocaleString(undefined, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
    const prefix = isNegative && value > 0 ? "-" : "";
    return `${prefix}${this.currencySymbol}${formatted}`;
  }

  private _renderChangeIndicator(change: number): unknown {
    if (change === 0) {
      return html`<span class="change neutral">—</span>`;
    }

    const isPositive = change > 0;
    return html`
      <span class="change ${isPositive ? "positive" : "negative"}">
        ${isPositive ? "↑" : "↓"} ${Math.abs(change)}%
      </span>
    `;
  }

  private _renderRow(row: BreakdownRow): unknown {
    return html`
      <uui-table-row>
        <uui-table-cell class="${row.isBold ? "bold" : ""}">
          ${row.label}
        </uui-table-cell>
        <uui-table-cell class="value-cell ${row.isBold ? "bold" : ""}">
          ${this._formatCurrency(row.value, row.isNegative)}
        </uui-table-cell>
        <uui-table-cell class="change-cell">
          ${this._renderChangeIndicator(row.change)}
        </uui-table-cell>
      </uui-table-row>
    `;
  }

  override render() {
    return html`
      <uui-box headline="Total sales breakdown">
        ${this.isLoading
          ? html`
              <div class="loading">
                <uui-loader></uui-loader>
              </div>
            `
          : !this.data
            ? html`<div class="empty">No data available</div>`
            : html`
                <uui-table class="breakdown-table">
                  ${this._getRows().map((row) => this._renderRow(row))}
                </uui-table>
              `}
      </uui-box>
    `;
  }

  static override styles = css`
    :host {
      display: block;
    }

    uui-box {
      --uui-box-default-padding: 0;
    }

    .loading,
    .empty {
      display: flex;
      align-items: center;
      justify-content: center;
      padding: var(--uui-size-space-5);
      color: var(--uui-color-text-alt);
    }

    .breakdown-table {
      width: 100%;
    }

    uui-table-row {
      border-bottom: 1px solid var(--uui-color-border);
    }

    uui-table-row:last-child {
      border-bottom: none;
    }

    uui-table-cell {
      padding: var(--uui-size-space-3) var(--uui-size-space-4);
      font-size: var(--uui-type-small-size);
    }

    uui-table-cell.bold {
      font-weight: 600;
    }

    .value-cell {
      text-align: right;
      font-variant-numeric: tabular-nums;
    }

    .change-cell {
      text-align: right;
      width: 80px;
    }

    .change {
      font-size: var(--uui-type-small-size);
      font-weight: 500;
      padding: 1px 4px;
      border-radius: 3px;
      white-space: nowrap;
    }

    .change.positive {
      color: #16a34a;
      background: rgba(22, 163, 74, 0.1);
    }

    .change.negative {
      color: #dc2626;
      background: rgba(220, 38, 38, 0.1);
    }

    .change.neutral {
      color: var(--uui-color-text-alt);
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    "merchello-analytics-breakdown": MerchelloAnalyticsBreakdown;
  }
}

export default MerchelloAnalyticsBreakdown;
