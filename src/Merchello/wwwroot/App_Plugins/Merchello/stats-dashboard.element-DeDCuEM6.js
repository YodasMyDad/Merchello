import { LitElement as _, html as n, css as C, state as c, customElement as f } from "@umbraco-cms/backoffice/external/lit";
import { UmbElementMixin as b } from "@umbraco-cms/backoffice/element-api";
import { M as h } from "./merchello-api-BxVn4Zbt.js";
import { f as v, a as y } from "./formatting-BerPqESs.js";
import "./order-table.element-DbvgzOl4.js";
var x = Object.defineProperty, $ = Object.getOwnPropertyDescriptor, m = (t) => {
  throw TypeError(t);
}, l = (t, e, s, r) => {
  for (var a = r > 1 ? void 0 : r ? $(e, s) : e, d = t.length - 1, u; d >= 0; d--)
    (u = t[d]) && (a = (r ? u(e, s, a) : u(a)) || a);
  return r && a && x(e, s, a), a;
}, p = (t, e, s) => e.has(t) || m("Cannot " + s), O = (t, e, s) => (p(t, e, "read from private field"), e.get(t)), z = (t, e, s) => e.has(t) ? m("Cannot add the same private member more than once") : e instanceof WeakSet ? e.add(t) : e.set(t, s), g = (t, e, s, r) => (p(t, e, "write to private field"), e.set(t, s), s), o;
let i = class extends b(_) {
  constructor() {
    super(...arguments), this._stats = null, this._recentOrders = [], this._isLoading = !0, z(this, o, !1), this._recentOrderColumns = [
      "invoiceNumber",
      "customer",
      "date",
      "paymentStatus",
      "fulfillmentStatus",
      "total"
    ];
  }
  connectedCallback() {
    super.connectedCallback(), g(this, o, !0), this._loadData();
  }
  disconnectedCallback() {
    super.disconnectedCallback(), g(this, o, !1);
  }
  async _loadData() {
    this._isLoading = !0;
    const [t, e] = await Promise.all([
      h.getDashboardStats(),
      h.getOrders({ pageSize: 15, sortBy: "date", sortDir: "desc" })
    ]);
    O(this, o) && (t.data && (this._stats = t.data), e.data && (this._recentOrders = e.data.items), this._isLoading = !1);
  }
  _getChangeClass(t) {
    return t > 0 ? "positive" : t < 0 ? "negative" : "neutral";
  }
  render() {
    return this._isLoading ? n`
        <umb-body-layout header-fit-height main-no-padding>
          <div class="content">
            <div class="loading">
              <uui-loader></uui-loader>
            </div>
          </div>
        </umb-body-layout>
      ` : n`
      <umb-body-layout header-fit-height main-no-padding>
      <div class="content">
      <div class="stats-grid">
        <uui-box headline="Orders">
          <div class="stat-value">${this._stats?.ordersThisMonth ?? 0}</div>
          <div class="stat-label">This Month</div>
          <div class="stat-change ${this._getChangeClass(this._stats?.ordersChangePercent ?? 0)}">
            ${v(this._stats?.ordersChangePercent ?? 0)} from last month
          </div>
        </uui-box>

        <uui-box headline="Revenue">
          <div class="stat-value">${y(this._stats?.revenueThisMonth ?? 0)}</div>
          <div class="stat-label">This Month</div>
          <div class="stat-change ${this._getChangeClass(this._stats?.revenueChangePercent ?? 0)}">
            ${v(this._stats?.revenueChangePercent ?? 0)} from last month
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
        ${this._recentOrders.length === 0 ? n`<p class="no-data">No orders yet</p>` : n`
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

      .no-data {
        text-align: center;
        color: var(--uui-color-text-alt);
        padding: var(--uui-size-layout-2);
      }
    `
];
l([
  c()
], i.prototype, "_stats", 2);
l([
  c()
], i.prototype, "_recentOrders", 2);
l([
  c()
], i.prototype, "_isLoading", 2);
i = l([
  f("merchello-stats-dashboard")
], i);
const E = i;
export {
  i as MerchelloStatsDashboardElement,
  E as default
};
//# sourceMappingURL=stats-dashboard.element-DeDCuEM6.js.map
