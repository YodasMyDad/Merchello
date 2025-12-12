import { LitElement as d, html as l, nothing as h, css as b, property as u, customElement as m } from "@umbraco-cms/backoffice/external/lit";
import { UmbElementMixin as p } from "@umbraco-cms/backoffice/element-api";
import { a as f, O as g } from "./order.types-B45a7FtJ.js";
import { c as v, g as _, d as k, a as y, e as C } from "./formatting-Cu4HXsjc.js";
import { g as $ } from "./navigation-D1KCp5wk.js";
import { b as S } from "./badge.styles-C_lNgH9O.js";
var w = Object.defineProperty, E = Object.getOwnPropertyDescriptor, r = (e, t, a, s) => {
  for (var c = s > 1 ? void 0 : s ? E(t, a) : t, o = e.length - 1, n; o >= 0; o--)
    (n = e[o]) && (c = (s ? n(t, a, c) : n(c)) || c);
  return s && c && w(t, a, c), c;
};
let i = class extends p(d) {
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
    const a = e.target.checked ? this.orders.map((s) => s.id) : [];
    this._dispatchSelectionChange(a);
  }
  _handleSelectOrder(e, t) {
    t.stopPropagation();
    const s = t.target.checked ? [...this.selectedIds, e] : this.selectedIds.filter((c) => c !== e);
    this._dispatchSelectionChange(s);
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
      ` : l`<uui-table-head-cell>${g[e]}</uui-table-head-cell>`;
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
            <a href=${$(e.id)}>
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
        return l`<uui-table-cell>${y(e.total)}</uui-table-cell>`;
      case "paymentStatus":
        return l`
          <uui-table-cell>
            <span class="badge ${k(e.paymentStatus)}">
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
        return l`<uui-table-cell>${v(e.itemCount)}</uui-table-cell>`;
      case "deliveryMethod":
        return l`<uui-table-cell>${e.deliveryMethod}</uui-table-cell>`;
      default:
        return h;
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
i.styles = [
  S,
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
r([
  u({ type: Array })
], i.prototype, "orders", 2);
r([
  u({ type: Array })
], i.prototype, "columns", 2);
r([
  u({ type: Boolean })
], i.prototype, "selectable", 2);
r([
  u({ type: Array })
], i.prototype, "selectedIds", 2);
r([
  u({ type: Boolean })
], i.prototype, "clickable", 2);
i = r([
  m("merchello-order-table")
], i);
//# sourceMappingURL=order-table.element-B0dkhTme.js.map
