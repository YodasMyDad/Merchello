import { css as d, LitElement as p, html as l, nothing as g, property as u, customElement as m } from "@umbraco-cms/backoffice/external/lit";
import { UmbElementMixin as f } from "@umbraco-cms/backoffice/element-api";
import { a as v, O as k } from "./order.types-B45a7FtJ.js";
import { c as w, g as _, d as y, a as $, e as C } from "./formatting-CfdJ8lRr.js";
const S = "section/merchello";
function b(e, t) {
  return `${S}/workspace/${e}/${t}`;
}
function E(e, t) {
  history.pushState({}, "", b(e, t));
}
const h = "merchello-order";
function x(e) {
  return b(h, `edit/${e}`);
}
function T(e) {
  E(h, `edit/${e}`);
}
const O = d`
  .badge {
    display: inline-block;
    padding: 2px 8px;
    border-radius: 12px;
    font-size: 0.75rem;
    font-weight: 500;
  }

  /* Payment status badges */
  .badge.paid {
    background: var(--uui-color-positive-standalone);
    color: var(--uui-color-positive-contrast);
  }

  .badge.unpaid {
    background: var(--uui-color-danger-standalone);
    color: var(--uui-color-danger-contrast);
  }

  .badge.partial {
    background: var(--uui-color-warning-standalone);
    color: var(--uui-color-warning-contrast);
  }

  .badge.awaiting {
    background: var(--uui-color-warning-standalone);
    color: var(--uui-color-warning-contrast);
  }

  .badge.refunded,
  .badge.partially-refunded {
    background: var(--uui-color-text-alt);
    color: var(--uui-color-surface);
  }

  /* Fulfillment status badges */
  .badge.fulfilled {
    background: var(--uui-color-positive-standalone);
    color: var(--uui-color-positive-contrast);
  }

  .badge.unfulfilled {
    background: var(--uui-color-warning-standalone);
    color: var(--uui-color-warning-contrast);
  }

  .badge.partially-fulfilled {
    background: var(--uui-color-warning-standalone);
    color: var(--uui-color-warning-contrast);
  }
`;
var R = Object.defineProperty, D = Object.getOwnPropertyDescriptor, i = (e, t, a, c) => {
  for (var r = c > 1 ? void 0 : c ? D(t, a) : t, s = e.length - 1, n; s >= 0; s--)
    (n = e[s]) && (r = (c ? n(t, a, r) : n(r)) || r);
  return c && r && R(t, a, r), r;
};
let o = class extends f(p) {
  constructor() {
    super(...arguments), this.orders = [], this.columns = [...v], this.selectable = !1, this.selectedIds = [], this.clickable = !0;
  }
  /**
   * Ensure invoiceNumber is always in columns and 'select' column is added if selectable.
   */
  _getEffectiveColumns() {
    const e = [...this.columns];
    return e.includes("invoiceNumber") || e.unshift("invoiceNumber"), this.selectable && !e.includes("select") && e.unshift("select"), e;
  }
  _handleSelectAll(e) {
    const a = e.target.checked ? this.orders.map((c) => c.id) : [];
    this._dispatchSelectionChange(a);
  }
  _handleSelectOrder(e, t) {
    t.stopPropagation();
    const c = t.target.checked ? [...this.selectedIds, e] : this.selectedIds.filter((r) => r !== e);
    this._dispatchSelectionChange(c);
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
      ` : l`<uui-table-head-cell>${k[e]}</uui-table-head-cell>`;
  }
  _renderCell(e, t) {
    switch (t) {
      case "select":
        return l`
          <uui-table-cell class="checkbox-col">
            <uui-checkbox
              aria-label="Select order ${e.invoiceNumber || e.id}"
              ?checked=${this.selectedIds.includes(e.id)}
              @change=${(a) => this._handleSelectOrder(e.id, a)}
              @click=${(a) => a.stopPropagation()}
            ></uui-checkbox>
          </uui-table-cell>
        `;
      case "invoiceNumber":
        return l`
          <uui-table-cell class="order-number">
            <a href=${x(e.id)}>
              ${e.invoiceNumber || e.id.substring(0, 8)}
            </a>
          </uui-table-cell>
        `;
      case "date":
        return l`<uui-table-cell>${C(e.dateCreated)}</uui-table-cell>`;
      case "customer":
        return l`<uui-table-cell>${e.customerName}</uui-table-cell>`;
      case "channel":
        return l`<uui-table-cell>${e.channel}</uui-table-cell>`;
      case "total":
        return l`<uui-table-cell>${$(e.total)}</uui-table-cell>`;
      case "paymentStatus":
        return l`
          <uui-table-cell>
            <span class="badge ${y(e.paymentStatus)}">
              ${e.paymentStatusDisplay}
            </span>
          </uui-table-cell>
        `;
      case "fulfillmentStatus":
        return l`
          <uui-table-cell>
            <span class="badge ${_(e.fulfillmentStatus)}">
              ${e.fulfillmentStatus}
            </span>
          </uui-table-cell>
        `;
      case "itemCount":
        return l`<uui-table-cell>${w(e.itemCount)}</uui-table-cell>`;
      case "deliveryMethod":
        return l`<uui-table-cell>${e.deliveryMethod}</uui-table-cell>`;
      default:
        return g;
    }
  }
  _renderRow(e) {
    const t = this._getEffectiveColumns();
    return l`
      <uui-table-row
        class=${this.clickable ? "clickable" : ""}
        @click=${() => this._handleRowClick(e)}
      >
        ${t.map((a) => this._renderCell(e, a))}
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
o.styles = [
  O,
  d`
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
    `
];
i([
  u({ type: Array })
], o.prototype, "orders", 2);
i([
  u({ type: Array })
], o.prototype, "columns", 2);
i([
  u({ type: Boolean })
], o.prototype, "selectable", 2);
i([
  u({ type: Array })
], o.prototype, "selectedIds", 2);
i([
  u({ type: Boolean })
], o.prototype, "clickable", 2);
o = i([
  m("merchello-order-table")
], o);
export {
  T as n
};
//# sourceMappingURL=order-table.element-Yk2QYzH1.js.map
