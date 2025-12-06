import { LitElement as _, html as r, css as C, state as h, customElement as y } from "@umbraco-cms/backoffice/external/lit";
import { UmbElementMixin as $ } from "@umbraco-cms/backoffice/element-api";
import { M as v } from "./merchello-api-CzSx3Q3Y.js";
import { f as g, a as p, b as x } from "./formatting-CH1NCLNK.js";
import { I as u } from "./order.types-DjkMLpgj.js";
var w = Object.defineProperty, P = Object.getOwnPropertyDescriptor, m = (t) => {
  throw TypeError(t);
}, n = (t, e, a, l) => {
  for (var s = l > 1 ? void 0 : l ? P(e, a) : e, d = t.length - 1, c; d >= 0; d--)
    (c = t[d]) && (s = (l ? c(e, a, s) : c(s)) || s);
  return l && s && w(e, a, s), s;
}, f = (t, e, a) => e.has(t) || m("Cannot " + a), O = (t, e, a) => (f(t, e, "read from private field"), e.get(t)), S = (t, e, a) => e.has(t) ? m("Cannot add the same private member more than once") : e instanceof WeakSet ? e.add(t) : e.set(t, a), b = (t, e, a, l) => (f(t, e, "write to private field"), e.set(t, a), a), o;
let i = class extends $(_) {
  constructor() {
    super(...arguments), this._stats = null, this._recentOrders = [], this._isLoading = !0, S(this, o, !1);
  }
  connectedCallback() {
    super.connectedCallback(), b(this, o, !0), this._loadData();
  }
  disconnectedCallback() {
    super.disconnectedCallback(), b(this, o, !1);
  }
  async _loadData() {
    this._isLoading = !0;
    const [t, e] = await Promise.all([
      v.getDashboardStats(),
      v.getOrders({ pageSize: 15, sortBy: "date", sortDir: "desc" })
    ]);
    O(this, o) && (t.data && (this._stats = t.data), e.data && (this._recentOrders = e.data.items), this._isLoading = !1);
  }
  _getPaymentStatusBadgeClass(t) {
    switch (t) {
      case u.Paid:
        return "paid";
      case u.PartiallyPaid:
        return "partial";
      case u.Refunded:
      case u.PartiallyRefunded:
        return "refunded";
      case u.AwaitingPayment:
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
    return this._isLoading ? r`
        <umb-body-layout header-fit-height main-no-padding>
          <div class="content">
            <div class="loading">
              <uui-loader></uui-loader>
            </div>
          </div>
        </umb-body-layout>
      ` : r`
      <umb-body-layout header-fit-height main-no-padding>
      <div class="content">
      <div class="stats-grid">
        <uui-box headline="Orders">
          <div class="stat-value">${this._stats?.ordersThisMonth ?? 0}</div>
          <div class="stat-label">This Month</div>
          <div class="stat-change ${this._getChangeClass(this._stats?.ordersChangePercent ?? 0)}">
            ${g(this._stats?.ordersChangePercent ?? 0)} from last month
          </div>
        </uui-box>

        <uui-box headline="Revenue">
          <div class="stat-value">${p(this._stats?.revenueThisMonth ?? 0)}</div>
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
        ${this._recentOrders.length === 0 ? r`<p class="no-data">No orders yet</p>` : r`
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
      (t) => r`
                    <uui-table-row>
                      <uui-table-cell>
                        <a href=${this._getOrderHref(t.id)}>#${t.invoiceNumber}</a>
                      </uui-table-cell>
                      <uui-table-cell>${t.customerName}</uui-table-cell>
                      <uui-table-cell>${x(t.dateCreated)}</uui-table-cell>
                      <uui-table-cell>
                        <span class="badge ${this._getPaymentStatusBadgeClass(t.paymentStatus)}">${t.paymentStatusDisplay}</span>
                      </uui-table-cell>
                      <uui-table-cell>
                        <span class="badge ${t.fulfillmentStatus.toLowerCase().replace(" ", "-")}">${t.fulfillmentStatus}</span>
                      </uui-table-cell>
                      <uui-table-cell>${p(t.total)}</uui-table-cell>
                    </uui-table-row>
                  `
    )}
              </uui-table>
            `}
      </uui-box>
      </div>
      </umb-body-layout>
    `;
  }
};
o = /* @__PURE__ */ new WeakMap();
i.styles = [
  C`
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
        background: var(--uui-color-positive-standalone);
        color: var(--uui-color-positive-contrast);
      }

      .badge.unpaid {
        background: var(--uui-color-warning-standalone);
        color: var(--uui-color-warning-contrast);
      }

      .badge.fulfilled {
        background: var(--uui-color-positive-standalone);
        color: var(--uui-color-positive-contrast);
      }

      .badge.unfulfilled {
        background: var(--uui-color-default-standalone);
        color: var(--uui-color-default-contrast);
      }

      .badge.partial {
        background: var(--uui-color-warning-standalone);
        color: var(--uui-color-warning-contrast);
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
n([
  h()
], i.prototype, "_stats", 2);
n([
  h()
], i.prototype, "_recentOrders", 2);
n([
  h()
], i.prototype, "_isLoading", 2);
i = n([
  y("merchello-stats-dashboard")
], i);
const L = i;
export {
  i as MerchelloStatsDashboardElement,
  L as default
};
//# sourceMappingURL=stats-dashboard.element-kzsdhlps.js.map
