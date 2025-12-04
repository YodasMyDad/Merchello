import { LitElement as m, html as l, css as v, state as c, customElement as p } from "@umbraco-cms/backoffice/external/lit";
import { UmbElementMixin as f } from "@umbraco-cms/backoffice/element-api";
import { M as h } from "./merchello-api-eSCXsudl.js";
import { f as g, a as b, b as _ } from "./formatting-c8l-daf7.js";
import { I as i } from "./order.types-DjkMLpgj.js";
var C = Object.defineProperty, y = Object.getOwnPropertyDescriptor, r = (t, e, o, u) => {
  for (var a = u > 1 ? void 0 : u ? y(e, o) : e, n = t.length - 1, d; n >= 0; n--)
    (d = t[n]) && (a = (u ? d(e, o, a) : d(a)) || a);
  return u && a && C(e, o, a), a;
};
let s = class extends f(m) {
  constructor() {
    super(...arguments), this._stats = null, this._recentOrders = [], this._isLoading = !0;
  }
  connectedCallback() {
    super.connectedCallback(), this._loadData();
  }
  async _loadData() {
    this._isLoading = !0;
    const [t, e] = await Promise.all([
      h.getDashboardStats(),
      h.getOrders({ pageSize: 15, sortBy: "date", sortDir: "desc" })
    ]);
    t.data && (this._stats = t.data), e.data && (this._recentOrders = e.data.items), this._isLoading = !1;
  }
  _getPaymentStatusBadgeClass(t) {
    switch (t) {
      case i.Paid:
        return "paid";
      case i.PartiallyPaid:
        return "partial";
      case i.Refunded:
      case i.PartiallyRefunded:
        return "refunded";
      case i.AwaitingPayment:
        return "awaiting";
      default:
        return "unpaid";
    }
  }
  _getChangeClass(t) {
    return t > 0 ? "positive" : t < 0 ? "negative" : "neutral";
  }
  _getOrderHref(t) {
    return `section/merchello/workspace/merchello-order/edit/${t}`;
  }
  render() {
    return this._isLoading ? l`
        <div class="loading">
          <uui-loader></uui-loader>
        </div>
      ` : l`
      <div class="stats-grid">
        <uui-box headline="Orders">
          <div class="stat-value">${this._stats?.ordersThisMonth ?? 0}</div>
          <div class="stat-label">This Month</div>
          <div class="stat-change ${this._getChangeClass(this._stats?.ordersChangePercent ?? 0)}">
            ${g(this._stats?.ordersChangePercent ?? 0)} from last month
          </div>
        </uui-box>

        <uui-box headline="Revenue">
          <div class="stat-value">${b(this._stats?.revenueThisMonth ?? 0)}</div>
          <div class="stat-label">This Month</div>
          <div class="stat-change ${this._getChangeClass(this._stats?.revenueChangePercent ?? 0)}">
            ${g(this._stats?.revenueChangePercent ?? 0)} from last month
          </div>
        </uui-box>

        <uui-box headline="Products">
          <div class="stat-value">${this._stats?.productCount ?? 0}</div>
          <div class="stat-label">Active Products</div>
          <div class="stat-change ${this._getChangeClass(this._stats?.productCountChange ?? 0)}">
            ${this._stats?.productCountChange !== 0 ? `${this._stats?.productCountChange > 0 ? "+" : ""}${this._stats?.productCountChange} this month` : "No change"}
          </div>
        </uui-box>

        <uui-box headline="Customers">
          <div class="stat-value">${this._stats?.customerCount ?? 0}</div>
          <div class="stat-label">Unique Customers</div>
          <div class="stat-change ${this._getChangeClass(this._stats?.customerCountChange ?? 0)}">
            ${this._stats?.customerCountChange !== 0 ? `+${this._stats?.customerCountChange} new this month` : "No new customers"}
          </div>
        </uui-box>
      </div>

      <uui-box headline="Recent Orders" class="wide">
        ${this._recentOrders.length === 0 ? l`<p class="no-data">No orders yet</p>` : l`
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
      (t) => l`
                    <uui-table-row>
                      <uui-table-cell>
                        <a href=${this._getOrderHref(t.id)}>#${t.invoiceNumber}</a>
                      </uui-table-cell>
                      <uui-table-cell>${t.customerName}</uui-table-cell>
                      <uui-table-cell>${_(t.dateCreated)}</uui-table-cell>
                      <uui-table-cell>
                        <span class="badge ${this._getPaymentStatusBadgeClass(t.paymentStatus)}">${t.paymentStatusDisplay}</span>
                      </uui-table-cell>
                      <uui-table-cell>
                        <span class="badge ${t.fulfillmentStatus.toLowerCase().replace(" ", "-")}">${t.fulfillmentStatus}</span>
                      </uui-table-cell>
                      <uui-table-cell>${b(t.total)}</uui-table-cell>
                    </uui-table-row>
                  `
    )}
              </uui-table>
            `}
      </uui-box>
    `;
  }
};
s.styles = [
  v`
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
    `
];
r([
  c()
], s.prototype, "_stats", 2);
r([
  c()
], s.prototype, "_recentOrders", 2);
r([
  c()
], s.prototype, "_isLoading", 2);
s = r([
  p("merchello-stats-dashboard")
], s);
const z = s;
export {
  s as MerchelloStatsDashboardElement,
  z as default
};
//# sourceMappingURL=stats-dashboard.element-V85lD_Wz.js.map
