import { LitElement as b, html as l, nothing as d, css as h, property as u, customElement as p } from "@umbraco-cms/backoffice/external/lit";
import { UmbElementMixin as m } from "@umbraco-cms/backoffice/element-api";
import { a as f, O as v } from "./order.types-_6ggCmi6.js";
import { d as C, a as g, e as y } from "./formatting-YtMaawx1.js";
import { g as _ } from "./navigation-COkStlQk.js";
import { b as $ } from "./badge.styles-DUcdl6GY.js";
var k = Object.defineProperty, x = Object.getOwnPropertyDescriptor, i = (e, t, c, r) => {
  for (var a = r > 1 ? void 0 : r ? x(t, c) : t, n = e.length - 1, o; n >= 0; n--)
    (o = e[n]) && (a = (r ? o(t, c, a) : o(a)) || a);
  return r && a && k(t, c, a), a;
};
let s = class extends m(b) {
  constructor() {
    super(...arguments), this.orders = [], this.columns = [...f], this.selectable = !1, this.selectedIds = [], this.clickable = !0;
  }
  /**
   * Ensure invoiceNumber is always in columns and 'select' column is added if selectable.
   */
  _getEffectiveColumns() {
    const e = [...this.columns];
    return e.includes("invoiceNumber") || e.unshift("invoiceNumber"), this.selectable && !e.includes("select") && e.unshift("select"), e;
  }
  _handleSelectAll(e) {
    const c = e.target.checked ? this.orders.map((r) => r.id) : [];
    this._dispatchSelectionChange(c);
  }
  _handleSelectOrder(e, t) {
    t.stopPropagation();
    const r = t.target.checked ? [...this.selectedIds, e] : this.selectedIds.filter((a) => a !== e);
    this._dispatchSelectionChange(r);
  }
  _dispatchSelectionChange(e) {
    const t = { selectedIds: e };
    this.dispatchEvent(
      new CustomEvent("selection-change", {
        detail: t,
        bubbles: !0,
        composed: !0
      })
    );
  }
  _handleRowClick(e) {
    if (!this.clickable) return;
    const t = { orderId: e.id, order: e };
    this.dispatchEvent(
      new CustomEvent("order-click", {
        detail: t,
        bubbles: !0,
        composed: !0
      })
    );
  }
  _renderHeaderCell(e) {
    return e === "select" ? l`
        <uui-table-head-cell class="checkbox-col">
          <uui-checkbox
            aria-label="Select all orders"
            @change=${this._handleSelectAll}
            ?checked=${this.selectedIds.length === this.orders.length && this.orders.length > 0}
          ></uui-checkbox>
        </uui-table-head-cell>
      ` : l`<uui-table-head-cell>${v[e]}</uui-table-head-cell>`;
  }
  _renderCell(e, t) {
    switch (t) {
      case "select":
        return l`
          <uui-table-cell class="checkbox-col">
            <uui-checkbox
              aria-label="Select order ${e.invoiceNumber || e.id}"
              ?checked=${this.selectedIds.includes(e.id)}
              @change=${(c) => this._handleSelectOrder(e.id, c)}
              @click=${(c) => c.stopPropagation()}
            ></uui-checkbox>
          </uui-table-cell>
        `;
      case "invoiceNumber":
        return l`
          <uui-table-cell class="order-number ${e.isCancelled ? "cancelled" : ""}">
            <a href=${_(e.id)}>
              ${e.invoiceNumber || e.id.substring(0, 8)}
            </a>
            ${e.isCancelled ? l`<span class="badge cancelled">Cancelled</span>` : d}
          </uui-table-cell>
        `;
      case "date":
        return l`<uui-table-cell>${y(e.dateCreated)}</uui-table-cell>`;
      case "customer":
        return l`<uui-table-cell>${e.customerName}</uui-table-cell>`;
      case "channel":
        return l`<uui-table-cell>${e.channel}</uui-table-cell>`;
      case "total":
        return l`
          <uui-table-cell>
            ${g(e.totalInStoreCurrency ?? e.total, e.storeCurrencyCode, e.storeCurrencySymbol)}
            ${e.isMultiCurrency ? l`<span class="currency-indicator">${e.currencyCode}</span>` : d}
          </uui-table-cell>
        `;
      case "paymentStatus":
        return l`
          <uui-table-cell>
            <span class="badge ${e.paymentStatusCssClass}">
              ${e.paymentStatusDisplay}
            </span>
          </uui-table-cell>
        `;
      case "fulfillmentStatus":
        return l`
          <uui-table-cell>
            <span class="badge ${e.fulfillmentStatusCssClass}">
              ${e.fulfillmentStatus}
            </span>
          </uui-table-cell>
        `;
      case "itemCount":
        return l`<uui-table-cell>${C(e.itemCount)}</uui-table-cell>`;
      case "deliveryMethod":
        return l`<uui-table-cell>${e.deliveryMethod}</uui-table-cell>`;
      default:
        return d;
    }
  }
  _renderRow(e) {
    const t = this._getEffectiveColumns();
    return l`
      <uui-table-row
        class=${this.clickable ? "clickable" : ""}
        @click=${() => this._handleRowClick(e)}
      >
        ${t.map((c) => this._renderCell(e, c))}
      </uui-table-row>
    `;
  }
  render() {
    const e = this._getEffectiveColumns();
    return l`
      <div class="table-container">
        <uui-table class="order-table">
          <uui-table-head>
            ${e.map((t) => this._renderHeaderCell(t))}
          </uui-table-head>
          ${this.orders.map((t) => this._renderRow(t))}
        </uui-table>
      </div>
    `;
  }
};
s.styles = [
  $,
  h`
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

      .order-number.cancelled a {
        text-decoration: line-through;
        color: var(--uui-color-text-alt);
      }

      .order-number.cancelled {
        display: flex;
        align-items: center;
        gap: var(--uui-size-space-2);
      }

      .currency-indicator {
        margin-left: var(--uui-size-space-2);
        padding: 1px 6px;
        border: 1px solid var(--uui-color-border);
        border-radius: 999px;
        font-size: 0.7rem;
        color: var(--uui-color-text-alt);
      }
    `
];
i([
  u({ type: Array })
], s.prototype, "orders", 2);
i([
  u({ type: Array })
], s.prototype, "columns", 2);
i([
  u({ type: Boolean })
], s.prototype, "selectable", 2);
i([
  u({ type: Array })
], s.prototype, "selectedIds", 2);
i([
  u({ type: Boolean })
], s.prototype, "clickable", 2);
s = i([
  p("merchello-order-table")
], s);
//# sourceMappingURL=order-table.element-DmBpmw_N.js.map
