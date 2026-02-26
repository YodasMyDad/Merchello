import { LitElement as h, html as c, nothing as u, css as b, property as n, customElement as p } from "@umbraco-cms/backoffice/external/lit";
import { UmbElementMixin as m } from "@umbraco-cms/backoffice/element-api";
import { a as f, O as v } from "./order.types-_o7xLk2Z.js";
import { c as g, a as k, d as C } from "./formatting-DU6_gkL3.js";
import { g as y } from "./navigation-CvTcY6zJ.js";
import { b as _ } from "./badge.styles-C7D4rnJo.js";
var $ = Object.defineProperty, w = Object.getOwnPropertyDescriptor, r = (e, t, l, a) => {
  for (var i = a > 1 ? void 0 : a ? w(t, l) : t, o = e.length - 1, d; o >= 0; o--)
    (d = e[o]) && (i = (a ? d(t, l, i) : d(i)) || i);
  return a && i && $(t, l, i), i;
};
let s = class extends m(h) {
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
    const l = e.target.checked ? this.orders.map((a) => a.id) : [];
    this._dispatchSelectionChange(l);
  }
  _handleSelectOrder(e, t) {
    t.stopPropagation();
    const a = t.target.checked ? [...this.selectedIds, e] : this.selectedIds.filter((i) => i !== e);
    this._dispatchSelectionChange(a);
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
  _isAnchorClick(e) {
    return e.composedPath().find((l) => {
      const a = typeof SVGAElement < "u" && l instanceof SVGAElement;
      return l instanceof HTMLAnchorElement || a;
    }) !== void 0;
  }
  _handleRowClick(e, t) {
    if (!this.clickable || this._isAnchorClick(e)) return;
    const l = { orderId: t.id, order: t };
    this.dispatchEvent(
      new CustomEvent("order-click", {
        detail: l,
        bubbles: !0,
        composed: !0
      })
    );
  }
  _handleRowKeydown(e, t) {
    this.clickable && (e.key !== "Enter" && e.key !== " " || (e.preventDefault(), this._handleRowClick(e, t)));
  }
  _renderHeaderCell(e) {
    return e === "select" ? c`
        <uui-table-head-cell class="checkbox-col">
          <uui-checkbox
            aria-label="Select all orders"
            @change=${this._handleSelectAll}
            ?checked=${this.selectedIds.length === this.orders.length && this.orders.length > 0}
          ></uui-checkbox>
        </uui-table-head-cell>
      ` : c`<uui-table-head-cell>${v[e]}</uui-table-head-cell>`;
  }
  _renderCell(e, t) {
    switch (t) {
      case "select":
        return c`
          <uui-table-cell class="checkbox-col">
            <uui-checkbox
              aria-label="Select order ${e.invoiceNumber || e.id}"
              ?checked=${this.selectedIds.includes(e.id)}
              @change=${(l) => this._handleSelectOrder(e.id, l)}
              @click=${(l) => l.stopPropagation()}
            ></uui-checkbox>
          </uui-table-cell>
        `;
      case "invoiceNumber":
        return c`
          <uui-table-cell class="order-number ${e.isCancelled ? "cancelled" : ""}">
            <a href=${y(e.id)}>
              ${e.invoiceNumber || e.id.substring(0, 8)}
            </a>
            ${e.isCancelled ? c`<span class="badge cancelled">Cancelled</span>` : u}
            ${e.riskLevel === "high" || e.riskLevel === "medium" ? c`<span class="badge ${e.riskLevel === "high" ? "danger" : "warning"}">
                  <uui-icon name="icon-alert"></uui-icon>
                  ${e.riskLevel === "high" ? "Fraud Risk" : "Risk"}
                </span>` : u}
          </uui-table-cell>
        `;
      case "date":
        return c`<uui-table-cell>${C(e.dateCreated)}</uui-table-cell>`;
      case "customer":
        return c`<uui-table-cell>${e.customerName}</uui-table-cell>`;
      case "channel":
        return c`<uui-table-cell>${e.channel}</uui-table-cell>`;
      case "total":
        return c`
          <uui-table-cell>
            ${k(e.totalInStoreCurrency ?? e.total, e.storeCurrencyCode, e.storeCurrencySymbol)}
            ${e.isMultiCurrency ? c`<span class="currency-indicator">${e.currencyCode}</span>` : u}
          </uui-table-cell>
        `;
      case "paymentStatus":
        return c`
          <uui-table-cell>
            <span class="badge ${e.paymentStatusCssClass}">
              ${e.paymentStatusDisplay}
            </span>
          </uui-table-cell>
        `;
      case "fulfillmentStatus":
        return c`
          <uui-table-cell>
            <span class="badge ${e.fulfillmentStatusCssClass}">
              ${e.fulfillmentStatus}
            </span>
          </uui-table-cell>
        `;
      case "itemCount":
        return c`<uui-table-cell>${g(e.itemCount)}</uui-table-cell>`;
      default:
        return u;
    }
  }
  _renderRow(e) {
    const t = this._getEffectiveColumns();
    return c`
      <uui-table-row
        class=${this.clickable ? "clickable" : ""}
        tabindex=${this.clickable ? "0" : "-1"}
        @click=${(l) => this._handleRowClick(l, e)}
        @keydown=${(l) => this._handleRowKeydown(l, e)}
      >
        ${t.map((l) => this._renderCell(e, l))}
      </uui-table-row>
    `;
  }
  render() {
    const e = this._getEffectiveColumns();
    return c`
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
  _,
  b`
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
    `
];
r([
  n({ type: Array })
], s.prototype, "orders", 2);
r([
  n({ type: Array })
], s.prototype, "columns", 2);
r([
  n({ type: Boolean })
], s.prototype, "selectable", 2);
r([
  n({ type: Array })
], s.prototype, "selectedIds", 2);
r([
  n({ type: Boolean })
], s.prototype, "clickable", 2);
s = r([
  p("merchello-order-table")
], s);
//# sourceMappingURL=order-table.element-9T4-eWGu.js.map
