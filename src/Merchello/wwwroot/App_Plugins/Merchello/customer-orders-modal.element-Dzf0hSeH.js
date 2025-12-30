import { html as s, nothing as m, css as g, state as d, customElement as h } from "@umbraco-cms/backoffice/external/lit";
import { UmbModalBaseElement as _ } from "@umbraco-cms/backoffice/modal";
import { M as c } from "./merchello-api-Z_Hs6xGH.js";
import { C as p } from "./formatting-DRJa6LJv.js";
import "./order-table.element--7qaGB_b.js";
import "./merchello-empty-state.element-mt97UoA5.js";
import { n as v } from "./navigation-m-G5wLvz.js";
var f = Object.defineProperty, b = Object.getOwnPropertyDescriptor, i = (e, r, o, n) => {
  for (var a = n > 1 ? void 0 : n ? b(r, o) : r, l = e.length - 1, u; l >= 0; l--)
    (u = e[l]) && (a = (n ? u(r, o, a) : u(a)) || a);
  return n && a && f(r, o, a), a;
};
let t = class extends _ {
  constructor() {
    super(...arguments), this._orders = [], this._segments = [], this._isLoading = !0, this._errorMessage = null;
  }
  connectedCallback() {
    super.connectedCallback(), this._loadData();
  }
  async _loadData() {
    const e = this.data?.email;
    if (!e) {
      this._errorMessage = "No customer email provided", this._isLoading = !1;
      return;
    }
    this._isLoading = !0, this._errorMessage = null;
    const [r, o] = await Promise.all([
      c.getCustomerOrders(e),
      c.getCustomerSegmentBadges(e)
    ]);
    if (r.error) {
      this._errorMessage = r.error.message, this._isLoading = !1;
      return;
    }
    this._orders = r.data ?? [], this._segments = o.data ?? [], this._isLoading = !1;
  }
  _handleOrderClick(e) {
    this.value = { navigatedToOrder: !0 }, this.modalContext?.submit(), v(e.detail.orderId);
  }
  _handleClose() {
    this.value = { navigatedToOrder: !1 }, this.modalContext?.reject();
  }
  _renderLoadingState() {
    return s`<div class="loading"><uui-loader></uui-loader></div>`;
  }
  _renderErrorState() {
    return s`
      <div class="error-message">
        <uui-icon name="icon-alert"></uui-icon>
        ${this._errorMessage}
      </div>
    `;
  }
  _renderEmptyState() {
    return s`
      <merchello-empty-state
        icon="icon-receipt-dollar"
        headline="No orders found"
        message="This customer has no orders.">
      </merchello-empty-state>
    `;
  }
  _renderOrdersTable() {
    return s`
      <merchello-order-table
        .orders=${this._orders}
        .columns=${p}
        @order-click=${this._handleOrderClick}
      ></merchello-order-table>
    `;
  }
  _renderSegmentBadges() {
    return this._segments.length === 0 ? m : s`
      <div class="segment-badges">
        ${this._segments.map(
      (e) => s`
            <uui-tag
              look="secondary"
              class="segment-badge segment-badge--${e.segmentType.toLowerCase()}"
            >
              ${e.name}
            </uui-tag>
          `
    )}
      </div>
    `;
  }
  _renderContent() {
    return this._isLoading ? this._renderLoadingState() : this._errorMessage ? this._renderErrorState() : this._orders.length === 0 ? this._renderEmptyState() : this._renderOrdersTable();
  }
  render() {
    const e = this.data?.customerName ?? "Customer", r = this._orders.length;
    return s`
      <umb-body-layout headline="Orders for ${e}">
        <div id="main">
          ${this._isLoading ? m : this._renderSegmentBadges()}
          ${!this._isLoading && !this._errorMessage && r > 0 ? s`
                <div class="summary">
                  ${r} order${r !== 1 ? "s" : ""} found
                </div>
              ` : m}
          ${this._renderContent()}
        </div>

        <div slot="actions">
          <uui-button label="Close" look="secondary" @click=${this._handleClose}>
            Close
          </uui-button>
        </div>
      </umb-body-layout>
    `;
  }
};
t.styles = g`
    :host {
      display: block;
    }

    .summary {
      font-size: 0.875rem;
      color: var(--uui-color-text-alt);
      margin-bottom: var(--uui-size-space-4);
    }

    .loading {
      display: flex;
      justify-content: center;
      padding: var(--uui-size-space-6);
    }

    .error-message {
      display: flex;
      align-items: center;
      gap: var(--uui-size-space-2);
      padding: var(--uui-size-space-3);
      background: var(--uui-color-danger-standalone);
      color: var(--uui-color-danger-contrast);
      border-radius: var(--uui-border-radius);
    }

    [slot="actions"] {
      display: flex;
      gap: var(--uui-size-space-2);
      justify-content: flex-end;
    }

    .segment-badges {
      display: flex;
      flex-wrap: wrap;
      gap: var(--uui-size-space-2);
      margin-bottom: var(--uui-size-space-4);
    }

    .segment-badge {
      font-size: 0.75rem;
    }

    .segment-badge--manual {
      --uui-tag-slot-color: var(--uui-color-default-emphasis);
    }

    .segment-badge--automated {
      --uui-tag-slot-color: var(--uui-color-positive-emphasis);
    }
  `;
i([
  d()
], t.prototype, "_orders", 2);
i([
  d()
], t.prototype, "_segments", 2);
i([
  d()
], t.prototype, "_isLoading", 2);
i([
  d()
], t.prototype, "_errorMessage", 2);
t = i([
  h("merchello-customer-orders-modal")
], t);
const S = t;
export {
  t as MerchelloCustomerOrdersModalElement,
  S as default
};
//# sourceMappingURL=customer-orders-modal.element-Dzf0hSeH.js.map
