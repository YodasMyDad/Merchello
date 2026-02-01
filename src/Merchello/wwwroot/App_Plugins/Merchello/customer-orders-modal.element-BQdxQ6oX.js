import { html as r, nothing as s, css as h, state as l, customElement as f } from "@umbraco-cms/backoffice/external/lit";
import { UmbModalToken as y, UmbModalBaseElement as C, UMB_MODAL_MANAGER_CONTEXT as b } from "@umbraco-cms/backoffice/modal";
import { M as g } from "./merchello-api-BM4-Q40x.js";
import { a as x } from "./store-settings-DKmhm5Dt.js";
import { C as O } from "./order.types-_6ggCmi6.js";
import "./order-table.element-DmBpmw_N.js";
import "./merchello-empty-state.element-mt97UoA5.js";
import { n as $, a as M } from "./navigation-COkStlQk.js";
import { a as d } from "./formatting-YtMaawx1.js";
const z = new y("Merchello.GenerateStatement.Modal", {
  modal: {
    type: "dialog",
    size: "small"
  }
});
var L = Object.defineProperty, w = Object.getOwnPropertyDescriptor, p = (e) => {
  throw TypeError(e);
}, c = (e, a, t, o) => {
  for (var i = o > 1 ? void 0 : o ? w(a, t) : a, u = e.length - 1, _; u >= 0; u--)
    (_ = e[u]) && (i = (o ? _(a, t, i) : _(i)) || i);
  return o && i && L(a, t, i), i;
}, v = (e, a, t) => a.has(e) || p("Cannot " + t), E = (e, a, t) => (v(e, a, "read from private field"), a.get(e)), T = (e, a, t) => a.has(e) ? p("Cannot add the same private member more than once") : a instanceof WeakSet ? a.add(e) : a.set(e, t), S = (e, a, t, o) => (v(e, a, "write to private field"), a.set(e, t), t), m;
let n = class extends C {
  constructor() {
    super(), T(this, m), this._orders = [], this._segments = [], this._outstandingBalance = null, this._isLoading = !0, this._errorMessage = null, this.consumeContext(b, (e) => {
      S(this, m, e);
    });
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
    const a = this.data?.hasAccountTerms, t = this.data?.customerId, [o, i, u] = await Promise.all([
      g.getCustomerOrders(e),
      g.getCustomerSegmentBadges(e),
      a && t ? g.getCustomerOutstandingBalance(t) : Promise.resolve({ data: null, error: null })
    ]);
    if (o.error) {
      this._errorMessage = o.error.message, this._isLoading = !1;
      return;
    }
    this._orders = o.data ?? [], this._segments = i.data ?? [], u.data && (this._outstandingBalance = u.data), this._isLoading = !1;
  }
  _handleOrderClick(e) {
    this.value = { navigatedToOrder: !0 }, this.modalContext?.submit(), $(e.detail.orderId);
  }
  _handleClose() {
    this.value = { navigatedToOrder: !1 }, this.modalContext?.reject();
  }
  _handleViewOutstanding() {
    this.value = { navigatedToOrder: !1 }, this.modalContext?.submit(), M();
  }
  async _handleGenerateStatement() {
    const e = this.data?.customerId;
    if (!e) return;
    await E(this, m)?.open(this, z, {
      data: {
        customerId: e,
        customerName: this.data?.customerName ?? "Customer",
        currencyCode: this._outstandingBalance?.currencyCode ?? x()
      }
    })?.onSubmit();
  }
  _renderLoadingState() {
    return r`<div class="loading"><uui-loader></uui-loader></div>`;
  }
  _renderErrorState() {
    return r`
      <div class="error-message">
        <uui-icon name="icon-alert"></uui-icon>
        ${this._errorMessage}
      </div>
    `;
  }
  _renderEmptyState() {
    return r`
      <merchello-empty-state
        icon="icon-receipt-dollar"
        headline="No orders found"
        message="This customer has no orders.">
      </merchello-empty-state>
    `;
  }
  _renderOrdersTable() {
    return r`
      <merchello-order-table
        .orders=${this._orders}
        .columns=${O}
        @order-click=${this._handleOrderClick}
      ></merchello-order-table>
    `;
  }
  _renderSegmentBadges() {
    return this._segments.length === 0 ? s : r`
      <div class="segment-badges">
        ${this._segments.map(
      (e) => r`
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
  _renderAccountSummary() {
    if (!this.data?.hasAccountTerms || !this._outstandingBalance)
      return s;
    const e = this._outstandingBalance, a = e.overdueCount > 0;
    return r`
      <div class="account-summary">
        <div class="account-summary__header">
          <uui-icon name="icon-wallet"></uui-icon>
          <span>Account Customer</span>
        </div>
        <div class="account-summary__stats">
          <div class="account-stat">
            <span class="account-stat__label">Outstanding</span>
            <span class="account-stat__value ${a ? "has-overdue" : ""}">
              ${d(e.totalOutstanding, e.currencyCode)}
            </span>
            ${e.invoiceCount > 0 ? r`<span class="account-stat__detail">${e.invoiceCount} invoice${e.invoiceCount !== 1 ? "s" : ""}</span>` : s}
          </div>
          ${a ? r`
                <div class="account-stat account-stat--overdue">
                  <span class="account-stat__label">Overdue</span>
                  <span class="account-stat__value account-stat__value--danger">
                    ${d(e.totalOverdue, e.currencyCode)}
                  </span>
                  <span class="account-stat__detail">${e.overdueCount} invoice${e.overdueCount !== 1 ? "s" : ""}</span>
                </div>
              ` : s}
          ${e.creditLimit != null ? r`
                <div class="account-stat">
                  <span class="account-stat__label">Credit Limit</span>
                  <span class="account-stat__value">
                    ${d(e.creditLimit, e.currencyCode)}
                  </span>
                  ${e.availableCredit != null ? r`<span class="account-stat__detail ${e.creditLimitExceeded ? "exceeded" : ""}">${e.creditLimitExceeded ? "Exceeded" : `${d(e.availableCredit, e.currencyCode)} available`}</span>` : s}
                </div>
              ` : s}
        </div>
        <div class="account-summary__actions">
          ${e.invoiceCount > 0 ? r`
                <uui-button
                  look="placeholder"
                  class="account-summary__action"
                  @click=${this._handleViewOutstanding}
                >
                  View Outstanding Invoices
                  <uui-icon name="icon-arrow-right"></uui-icon>
                </uui-button>
              ` : s}
          <uui-button
            look="outline"
            class="account-summary__action"
            @click=${this._handleGenerateStatement}
          >
            <uui-icon name="icon-document"></uui-icon>
            Generate Statement
          </uui-button>
        </div>
      </div>
    `;
  }
  _renderContent() {
    return this._isLoading ? this._renderLoadingState() : this._errorMessage ? this._renderErrorState() : this._orders.length === 0 ? this._renderEmptyState() : this._renderOrdersTable();
  }
  render() {
    const e = this.data?.customerName ?? "Customer", a = this._orders.length;
    return r`
      <umb-body-layout headline="Orders for ${e}">
        <div id="main">
          ${this._isLoading ? s : this._renderSegmentBadges()}
          ${this._isLoading ? s : this._renderAccountSummary()}
          ${!this._isLoading && !this._errorMessage && a > 0 ? r`
                <div class="summary">
                  ${a} order${a !== 1 ? "s" : ""} found
                </div>
              ` : s}
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
m = /* @__PURE__ */ new WeakMap();
n.styles = h`
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

    .account-summary {
      background: var(--uui-color-surface-alt);
      border: 1px solid var(--uui-color-border);
      border-radius: var(--uui-border-radius);
      padding: var(--uui-size-space-4);
      margin-bottom: var(--uui-size-space-4);
    }

    .account-summary__header {
      display: flex;
      align-items: center;
      gap: var(--uui-size-space-2);
      font-weight: 600;
      font-size: 0.875rem;
      color: var(--uui-color-text);
      margin-bottom: var(--uui-size-space-3);
    }

    .account-summary__header uui-icon {
      color: var(--uui-color-warning);
    }

    .account-summary__stats {
      display: flex;
      gap: var(--uui-size-space-6);
      flex-wrap: wrap;
    }

    .account-stat {
      display: flex;
      flex-direction: column;
      gap: var(--uui-size-space-1);
    }

    .account-stat__label {
      font-size: 0.75rem;
      color: var(--uui-color-text-alt);
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }

    .account-stat__value {
      font-size: 1.125rem;
      font-weight: 600;
      color: var(--uui-color-text);
    }

    .account-stat__value.has-overdue {
      color: var(--uui-color-warning);
    }

    .account-stat__value--danger {
      color: var(--uui-color-danger);
    }

    .account-stat__detail {
      font-size: 0.75rem;
      color: var(--uui-color-text-alt);
    }

    .account-stat__detail.exceeded {
      color: var(--uui-color-danger);
      font-weight: 600;
    }

    .account-summary__actions {
      display: flex;
      gap: var(--uui-size-space-2);
      margin-top: var(--uui-size-space-3);
    }

    .account-summary__action {
      flex: 1;
    }

    .account-summary__action uui-icon {
      margin-left: var(--uui-size-space-2);
    }

    .account-summary__action uui-icon:first-child {
      margin-left: 0;
      margin-right: var(--uui-size-space-2);
    }
  `;
c([
  l()
], n.prototype, "_orders", 2);
c([
  l()
], n.prototype, "_segments", 2);
c([
  l()
], n.prototype, "_outstandingBalance", 2);
c([
  l()
], n.prototype, "_isLoading", 2);
c([
  l()
], n.prototype, "_errorMessage", 2);
n = c([
  f("merchello-customer-orders-modal")
], n);
const U = n;
export {
  n as MerchelloCustomerOrdersModalElement,
  U as default
};
//# sourceMappingURL=customer-orders-modal.element-BQdxQ6oX.js.map
