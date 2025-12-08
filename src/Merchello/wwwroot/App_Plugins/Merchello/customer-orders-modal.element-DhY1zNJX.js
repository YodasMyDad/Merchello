import { html as a, nothing as c, css as m, state as u, customElement as h } from "@umbraco-cms/backoffice/external/lit";
import { UmbModalBaseElement as _ } from "@umbraco-cms/backoffice/modal";
import { M as g } from "./merchello-api-DuHTSXU5.js";
import { C as p } from "./order.types-B45a7FtJ.js";
import "./order-table.element-8HPWVnXs.js";
import "./merchello-empty-state.element-mt97UoA5.js";
import { n as v } from "./navigation-D5LqjkTF.js";
var f = Object.defineProperty, C = Object.getOwnPropertyDescriptor, d = (r, e, o, i) => {
  for (var s = i > 1 ? void 0 : i ? C(e, o) : e, n = r.length - 1, l; n >= 0; n--)
    (l = r[n]) && (s = (i ? l(e, o, s) : l(s)) || s);
  return i && s && f(e, o, s), s;
};
let t = class extends _ {
  constructor() {
    super(...arguments), this._orders = [], this._isLoading = !0, this._errorMessage = null;
  }
  connectedCallback() {
    super.connectedCallback(), this._loadOrders();
  }
  async _loadOrders() {
    const r = this.data?.email;
    if (!r) {
      this._errorMessage = "No customer email provided", this._isLoading = !1;
      return;
    }
    this._isLoading = !0, this._errorMessage = null;
    const { data: e, error: o } = await g.getCustomerOrders(r);
    if (o) {
      this._errorMessage = o.message, this._isLoading = !1;
      return;
    }
    this._orders = e ?? [], this._isLoading = !1;
  }
  _handleOrderClick(r) {
    this.value = { navigatedToOrder: !0 }, this.modalContext?.submit(), v(r.detail.orderId);
  }
  _handleClose() {
    this.value = { navigatedToOrder: !1 }, this.modalContext?.reject();
  }
  _renderLoadingState() {
    return a`<div class="loading"><uui-loader></uui-loader></div>`;
  }
  _renderErrorState() {
    return a`
      <div class="error-message">
        <uui-icon name="icon-alert"></uui-icon>
        ${this._errorMessage}
      </div>
    `;
  }
  _renderEmptyState() {
    return a`
      <merchello-empty-state
        icon="icon-receipt-dollar"
        headline="No orders found"
        message="This customer has no orders.">
      </merchello-empty-state>
    `;
  }
  _renderOrdersTable() {
    return a`
      <merchello-order-table
        .orders=${this._orders}
        .columns=${p}
        @order-click=${this._handleOrderClick}
      ></merchello-order-table>
    `;
  }
  _renderContent() {
    return this._isLoading ? this._renderLoadingState() : this._errorMessage ? this._renderErrorState() : this._orders.length === 0 ? this._renderEmptyState() : this._renderOrdersTable();
  }
  render() {
    const r = this.data?.customerName ?? "Customer", e = this._orders.length;
    return a`
      <umb-body-layout headline="Orders for ${r}">
        <div id="main">
          ${!this._isLoading && !this._errorMessage && e > 0 ? a`
                <div class="summary">
                  ${e} order${e !== 1 ? "s" : ""} found
                </div>
              ` : c}
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
t.styles = m`
    #main {
      padding: var(--uui-size-space-4);
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
  `;
d([
  u()
], t.prototype, "_orders", 2);
d([
  u()
], t.prototype, "_isLoading", 2);
d([
  u()
], t.prototype, "_errorMessage", 2);
t = d([
  h("merchello-customer-orders-modal")
], t);
const E = t;
export {
  t as MerchelloCustomerOrdersModalElement,
  E as default
};
//# sourceMappingURL=customer-orders-modal.element-DhY1zNJX.js.map
