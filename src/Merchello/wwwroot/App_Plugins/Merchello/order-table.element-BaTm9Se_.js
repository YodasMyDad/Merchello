import { css as d, LitElement as b, html as a, nothing as h, property as u, customElement as p } from "@umbraco-cms/backoffice/external/lit";
import { UmbElementMixin as g } from "@umbraco-cms/backoffice/element-api";
import { a as m, O as f } from "./order.types-B45a7FtJ.js";
import { c as v, g as k, d as w, a as _, e as y } from "./formatting-CfdJ8lRr.js";
const $ = "/umbraco/section/merchello";
function C(e, t) {
  return `${$}/workspace/${e}/${t}`;
}
const S = "merchello-order";
function E(e) {
  return C(S, `edit/${e}`);
}
const x = d`
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
var O = Object.defineProperty, R = Object.getOwnPropertyDescriptor, i = (e, t, l, c) => {
  for (var r = c > 1 ? void 0 : c ? R(t, l) : t, s = e.length - 1, n; s >= 0; s--)
    (n = e[s]) && (r = (c ? n(t, l, r) : n(r)) || r);
  return c && r && O(t, l, r), r;
};
let o = class extends g(b) {
  constructor() {
    super(...arguments), this.orders = [], this.columns = [...m], this.selectable = !1, this.selectedIds = [], this.clickable = !0;
  }
  /**
   * Ensure invoiceNumber is always in columns and 'select' column is added if selectable.
   */
  _getEffectiveColumns() {
    const e = [...this.columns];
    return e.includes("invoiceNumber") || e.unshift("invoiceNumber"), this.selectable && !e.includes("select") && e.unshift("select"), e;
  }
  _handleSelectAll(e) {
    const l = e.target.checked ? this.orders.map((c) => c.id) : [];
    this._dispatchSelectionChange(l);
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
    return e === "select" ? a`
        <uui-table-head-cell class="checkbox-col">
          <uui-checkbox
            aria-label="Select all orders"
            @change=${this._handleSelectAll}
            ?checked=${this.selectedIds.length === this.orders.length && this.orders.length > 0}
          ></uui-checkbox>
        </uui-table-head-cell>
      ` : a`<uui-table-head-cell>${f[e]}</uui-table-head-cell>`;
  }
  _renderCell(e, t) {
    switch (t) {
      case "select":
        return a`
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
        return a`
          <uui-table-cell class="order-number">
            <a href=${E(e.id)} @click=${(l) => l.stopPropagation()}>
              ${e.invoiceNumber || e.id.substring(0, 8)}
            </a>
          </uui-table-cell>
        `;
      case "date":
        return a`<uui-table-cell>${y(e.dateCreated)}</uui-table-cell>`;
      case "customer":
        return a`<uui-table-cell>${e.customerName}</uui-table-cell>`;
      case "channel":
        return a`<uui-table-cell>${e.channel}</uui-table-cell>`;
      case "total":
        return a`<uui-table-cell>${_(e.total)}</uui-table-cell>`;
      case "paymentStatus":
        return a`
          <uui-table-cell>
            <span class="badge ${w(e.paymentStatus)}">
              ${e.paymentStatusDisplay}
            </span>
          </uui-table-cell>
        `;
      case "fulfillmentStatus":
        return a`
          <uui-table-cell>
            <span class="badge ${k(e.fulfillmentStatus)}">
              ${e.fulfillmentStatus}
            </span>
          </uui-table-cell>
        `;
      case "itemCount":
        return a`<uui-table-cell>${v(e.itemCount)}</uui-table-cell>`;
      case "deliveryMethod":
        return a`<uui-table-cell>${e.deliveryMethod}</uui-table-cell>`;
      default:
        return h;
    }
  }
  _renderRow(e) {
    const t = this._getEffectiveColumns();
    return a`
      <uui-table-row
        class=${this.clickable ? "clickable" : ""}
        @click=${() => this._handleRowClick(e)}
      >
        ${t.map((l) => this._renderCell(e, l))}
      </uui-table-row>
    `;
  }
  render() {
    const e = this._getEffectiveColumns();
    return a`
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
  x,
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
  p("merchello-order-table")
], o);
export {
  E as g
};
//# sourceMappingURL=order-table.element-BaTm9Se_.js.map
