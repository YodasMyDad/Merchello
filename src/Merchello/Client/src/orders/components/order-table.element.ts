import { LitElement, html, css, nothing } from "@umbraco-cms/backoffice/external/lit";
import { customElement, property } from "@umbraco-cms/backoffice/external/lit";
import { UmbElementMixin } from "@umbraco-cms/backoffice/element-api";
import type {
  OrderListItemDto,
  OrderColumnKey,
  OrderClickEventDetail,
  OrderSelectionChangeEventDetail,
} from "@orders/types/order.types.js";
import { ORDER_COLUMN_LABELS, DEFAULT_ORDER_COLUMNS } from "@orders/types/order.types.js";
import {
  formatCurrency,
  formatRelativeDate,
  formatItemCount,
} from "@shared/utils/formatting.js";
import { getOrderDetailHref } from "@shared/utils/navigation.js";
import { badgeStyles } from "@shared/styles/badge.styles.js";

// Re-export event types for backwards compatibility
export type { OrderClickEventDetail, OrderSelectionChangeEventDetail } from "@orders/types/order.types.js";

/**
 * Reusable order table component with configurable columns.
 *
 * @fires order-click - Dispatched when an order row is clicked. Detail contains { orderId, order }
 * @fires selection-change - Dispatched when selection changes. Detail contains { selectedIds }
 *
 * @example
 * ```html
 * <merchello-order-table
 *   .orders=${this._orders}
 *   .columns=${['invoiceNumber', 'date', 'total', 'paymentStatus', 'fulfillmentStatus']}
 *   @order-click=${(e) => this._handleOrderClick(e.detail)}>
 * </merchello-order-table>
 * ```
 */
@customElement("merchello-order-table")
export class MerchelloOrderTableElement extends UmbElementMixin(LitElement) {
  /**
   * Array of orders to display.
   */
  @property({ type: Array })
  orders: OrderListItemDto[] = [];

  /**
   * Columns to display. 'invoiceNumber' is always included.
   */
  @property({ type: Array })
  columns: OrderColumnKey[] = [...DEFAULT_ORDER_COLUMNS];

  /**
   * Enable row selection with checkboxes.
   */
  @property({ type: Boolean })
  selectable = false;

  /**
   * Currently selected order IDs.
   */
  @property({ type: Array })
  selectedIds: string[] = [];

  /**
   * Make rows clickable (navigates to order detail).
   */
  @property({ type: Boolean })
  clickable = true;

  /**
   * Ensure invoiceNumber is always in columns and 'select' column is added if selectable.
   */
  private _getEffectiveColumns(): OrderColumnKey[] {
    const cols = [...this.columns];

    // Ensure invoiceNumber is always present
    if (!cols.includes("invoiceNumber")) {
      cols.unshift("invoiceNumber");
    }

    // Add select column if selectable
    if (this.selectable && !cols.includes("select")) {
      cols.unshift("select");
    }

    return cols;
  }

  private _handleSelectAll(e: Event): void {
    const checked = (e.target as HTMLInputElement).checked;
    const newSelection = checked ? this.orders.map((o) => o.id) : [];
    this._dispatchSelectionChange(newSelection);
  }

  private _handleSelectOrder(id: string, e: Event): void {
    e.stopPropagation();
    const checked = (e.target as HTMLInputElement).checked;
    const newSelection = checked
      ? [...this.selectedIds, id]
      : this.selectedIds.filter((selectedId) => selectedId !== id);
    this._dispatchSelectionChange(newSelection);
  }

  private _dispatchSelectionChange(selectedIds: string[]): void {
    const detail: OrderSelectionChangeEventDetail = { selectedIds };
    this.dispatchEvent(
      new CustomEvent("selection-change", {
        detail,
        bubbles: true,
        composed: true,
      })
    );
  }

  private _isAnchorClick(e: Event): boolean {
    const anchor = e
      .composedPath()
      .find(($elem): $elem is HTMLAnchorElement | SVGAElement => {
        const isSvgAnchor = typeof SVGAElement !== "undefined" && $elem instanceof SVGAElement;
        return $elem instanceof HTMLAnchorElement || isSvgAnchor;
      });

    return anchor !== undefined;
  }

  private _handleRowClick(e: Event, order: OrderListItemDto): void {
    if (!this.clickable) return;
    if (this._isAnchorClick(e)) return;

    const detail: OrderClickEventDetail = { orderId: order.id, order };
    this.dispatchEvent(
      new CustomEvent("order-click", {
        detail,
        bubbles: true,
        composed: true,
      })
    );
  }

  private _handleRowKeydown(e: KeyboardEvent, order: OrderListItemDto): void {
    if (!this.clickable) return;
    if (e.key !== "Enter" && e.key !== " ") return;
    e.preventDefault();
    this._handleRowClick(e, order);
  }

  private _renderHeaderCell(column: OrderColumnKey): unknown {
    if (column === "select") {
      return html`
        <uui-table-head-cell class="checkbox-col">
          <uui-checkbox
            aria-label="Select all orders"
            @change=${this._handleSelectAll}
            ?checked=${this.selectedIds.length === this.orders.length && this.orders.length > 0}
          ></uui-checkbox>
        </uui-table-head-cell>
      `;
    }
    return html`<uui-table-head-cell>${ORDER_COLUMN_LABELS[column]}</uui-table-head-cell>`;
  }

  private _renderCell(order: OrderListItemDto, column: OrderColumnKey): unknown {
    switch (column) {
      case "select":
        return html`
          <uui-table-cell class="checkbox-col">
            <uui-checkbox
              aria-label="Select order ${order.invoiceNumber || order.id}"
              ?checked=${this.selectedIds.includes(order.id)}
              @change=${(e: Event) => this._handleSelectOrder(order.id, e)}
              @click=${(e: Event) => e.stopPropagation()}
            ></uui-checkbox>
          </uui-table-cell>
        `;

      case "invoiceNumber":
        return html`
          <uui-table-cell class="order-number ${order.isCancelled ? 'cancelled' : ''}">
            <a href=${getOrderDetailHref(order.id)}>
              ${order.invoiceNumber || order.id.substring(0, 8)}
            </a>
            ${order.isCancelled ? html`<span class="badge cancelled">Cancelled</span>` : nothing}
            ${order.riskLevel === 'high' || order.riskLevel === 'medium'
              ? html`<span class="badge ${order.riskLevel === 'high' ? 'danger' : 'warning'}">
                  <uui-icon name="icon-alert"></uui-icon>
                  ${order.riskLevel === 'high' ? 'Fraud Risk' : 'Risk'}
                </span>`
              : nothing}
          </uui-table-cell>
        `;

      case "date":
        return html`<uui-table-cell>${formatRelativeDate(order.dateCreated)}</uui-table-cell>`;

      case "customer":
        return html`<uui-table-cell>${order.customerName}</uui-table-cell>`;

      case "channel":
        return html`<uui-table-cell>${order.channel}</uui-table-cell>`;

      case "total":
        return html`
          <uui-table-cell>
            ${formatCurrency(order.totalInStoreCurrency ?? order.total, order.storeCurrencyCode, order.storeCurrencySymbol)}
            ${order.isMultiCurrency
              ? html`<span class="currency-indicator">${order.currencyCode}</span>`
              : nothing}
          </uui-table-cell>
        `;

      case "paymentStatus":
        return html`
          <uui-table-cell>
            <span class="badge ${order.paymentStatusCssClass}">
              ${order.paymentStatusDisplay}
            </span>
          </uui-table-cell>
        `;

      case "fulfillmentStatus":
        return html`
          <uui-table-cell>
            <span class="badge ${order.fulfillmentStatusCssClass}">
              ${order.fulfillmentStatus}
            </span>
          </uui-table-cell>
        `;

      case "itemCount":
        return html`<uui-table-cell>${formatItemCount(order.itemCount)}</uui-table-cell>`;

      default:
        return nothing;
    }
  }

  private _renderRow(order: OrderListItemDto): unknown {
    const cols = this._getEffectiveColumns();
    return html`
      <uui-table-row
        class=${this.clickable ? "clickable" : ""}
        tabindex=${this.clickable ? "0" : "-1"}
        @click=${(e: Event) => this._handleRowClick(e, order)}
        @keydown=${(e: KeyboardEvent) => this._handleRowKeydown(e, order)}
      >
        ${cols.map((col) => this._renderCell(order, col))}
      </uui-table-row>
    `;
  }

  override render() {
    const cols = this._getEffectiveColumns();

    return html`
      <div class="table-container">
        <uui-table class="order-table">
          <uui-table-head>
            ${cols.map((col) => this._renderHeaderCell(col))}
          </uui-table-head>
          ${this.orders.map((order) => this._renderRow(order))}
        </uui-table>
      </div>
    `;
  }

  static override readonly styles = [
    badgeStyles,
    css`
      :host {
        display: block;
      }

      .table-container {
        overflow-x: auto;
        background: var(--uui-color-surface);
        border: 1px solid var(--uui-color-border);
        border-radius: var(--uui-border-radius);
      }

      .order-table {
        width: 100%;
      }

      uui-table-head-cell,
      uui-table-cell {
        white-space: nowrap;
      }

      uui-table-row.clickable {
        cursor: pointer;
      }

      uui-table-row.clickable:hover {
        background: var(--uui-color-surface-emphasis);
      }

      uui-table-row.clickable:focus-visible {
        outline: 2px solid var(--uui-color-interactive);
        outline-offset: -2px;
      }

      .checkbox-col {
        width: 40px;
      }

      .order-number {
        display: flex;
        align-items: center;
        gap: var(--uui-size-space-2);
      }

      .order-number a {
        font-weight: 500;
        color: var(--uui-color-interactive);
        text-decoration: none;
      }

      .order-number a:hover {
        text-decoration: underline;
      }

      .order-number.cancelled a {
        text-decoration: line-through;
        color: var(--uui-color-text-alt);
      }

      .currency-indicator {
        margin-left: var(--uui-size-space-2);
        padding: 1px 6px;
        border: 1px solid var(--uui-color-border);
        border-radius: 999px;
        font-size: 0.7rem;
        color: var(--uui-color-text-alt);
      }
    `,
  ];
}

declare global {
  interface HTMLElementTagNameMap {
    "merchello-order-table": MerchelloOrderTableElement;
  }
}
