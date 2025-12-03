import { LitElement as P, nothing as o, html as t, css as E, state as u, customElement as T, property as V } from "@umbraco-cms/backoffice/external/lit";
import { UmbElementMixin as L } from "@umbraco-cms/backoffice/element-api";
import { UMB_WORKSPACE_CONTEXT as U } from "@umbraco-cms/backoffice/workspace";
import { UmbModalToken as C, UMB_MODAL_MANAGER_CONTEXT as D } from "@umbraco-cms/backoffice/modal";
import { b as S, a as l, d as I } from "./formatting-Cgl2aCEX.js";
import { M as k } from "./merchello-api-BlCaCKcg.js";
import { I as f, P as A } from "./order.types-FU1fblt8.js";
const X = new C("Merchello.Fulfillment.Modal", {
  modal: {
    type: "sidebar",
    size: "large"
  }
}), K = new C("Merchello.ShipmentEdit.Modal", {
  modal: {
    type: "sidebar",
    size: "small"
  }
});
var Y = Object.defineProperty, J = Object.getOwnPropertyDescriptor, B = (e) => {
  throw TypeError(e);
}, $ = (e, a, i, r) => {
  for (var s = r > 1 ? void 0 : r ? J(a, i) : a, n = e.length - 1, d; n >= 0; n--)
    (d = e[n]) && (s = (r ? d(a, i, s) : d(s)) || s);
  return r && s && Y(a, i, s), s;
}, W = (e, a, i) => a.has(e) || B("Cannot " + i), w = (e, a, i) => (W(e, a, "read from private field"), i ? i.call(e) : a.get(e)), R = (e, a, i) => a.has(e) ? B("Cannot add the same private member more than once") : a instanceof WeakSet ? a.add(e) : a.set(e, i), O = (e, a, i, r) => (W(e, a, "write to private field"), a.set(e, i), i), y, _;
let v = class extends L(P) {
  constructor() {
    super(), this._invoiceId = null, this._fulfillmentData = null, this._isLoading = !0, this._errorMessage = null, R(this, y), R(this, _), this.consumeContext(U, (e) => {
      O(this, y, e), this.observe(w(this, y).order, (a) => {
        a?.id && a.id !== this._invoiceId && (this._invoiceId = a.id, this._loadShipments());
      });
    }), this.consumeContext(D, (e) => {
      O(this, _, e);
    });
  }
  async _loadShipments() {
    if (!this._invoiceId) return;
    this._isLoading = !0, this._errorMessage = null;
    const { data: e, error: a } = await k.getFulfillmentSummary(this._invoiceId);
    a ? this._errorMessage = a.message : this._fulfillmentData = e ?? null, this._isLoading = !1;
  }
  async _handleEditShipment(e) {
    if (!w(this, _)) return;
    (await w(this, _).open(this, K, {
      data: { shipment: e }
    }).onSubmit().catch(() => {
    }))?.updated && this._loadShipments();
  }
  async _handleDeleteShipment(e) {
    if (!confirm(
      "Are you sure you want to delete this shipment? This will release the items back to unfulfilled."
    )) return;
    const { error: i } = await k.deleteShipment(e.id);
    if (i) {
      alert(i.message);
      return;
    }
    this._loadShipments(), this._invoiceId && w(this, y)?.load(this._invoiceId);
  }
  _renderShipmentCard(e, a) {
    const i = this._getCarrierClass(e.carrier);
    return t`
      <div class="shipment-card">
        <div class="shipment-header">
          <div class="header-left">
            ${e.carrier ? t`<span class="carrier-badge ${i}">${e.carrier}</span>` : t`<span class="carrier-badge">No carrier</span>`}
            <span class="shipment-date">Created ${S(e.dateCreated)}</span>
          </div>
          <div class="header-right">
            <uui-button look="secondary" compact label="Edit" @click=${() => this._handleEditShipment(e)}>
              <uui-icon name="icon-edit"></uui-icon>
              Edit
            </uui-button>
            <uui-button
              look="secondary"
              compact
              label="Delete"
              color="danger"
              @click=${() => this._handleDeleteShipment(e)}
            >
              <uui-icon name="icon-delete"></uui-icon>
            </uui-button>
          </div>
        </div>

        <div class="shipment-details">
          <div class="detail-row">
            <span class="label">Warehouse:</span>
            <span class="value">${a}</span>
          </div>
          ${e.trackingNumber ? t`
                <div class="detail-row">
                  <span class="label">Tracking:</span>
                  <span class="value tracking-value">
                    ${e.trackingUrl ? t`<a href="${e.trackingUrl}" target="_blank" rel="noopener"
                          >${e.trackingNumber}</a
                        >` : e.trackingNumber}
                    <button
                      class="copy-btn"
                      title="Copy tracking number"
                      @click=${() => this._copyToClipboard(e.trackingNumber)}
                    >
                      <uui-icon name="icon-documents"></uui-icon>
                    </button>
                  </span>
                </div>
              ` : o}
          ${e.actualDeliveryDate ? t`
                <div class="detail-row">
                  <span class="label">Delivered:</span>
                  <span class="value delivered">${S(e.actualDeliveryDate)}</span>
                </div>
              ` : o}
        </div>

        <div class="shipment-items">
          <h4>Items in shipment</h4>
          ${e.lineItems.map(
      (r) => t`
              <div class="item-row">
                <div class="item-image">
                  ${r.imageUrl ? t`<img src="${r.imageUrl}" alt="${r.name}" />` : t`<div class="placeholder-image"></div>`}
                </div>
                <div class="item-info">
                  <div class="item-name">${r.name || "Unknown item"}</div>
                  ${r.sku ? t`<div class="item-sku">${r.sku}</div>` : o}
                </div>
                <div class="item-qty">x${r.quantity}</div>
              </div>
            `
    )}
        </div>
      </div>
    `;
  }
  _getCarrierClass(e) {
    if (!e) return "";
    const a = e.toLowerCase();
    return a.includes("ups") ? "ups" : a.includes("fedex") ? "fedex" : a.includes("dhl") ? "dhl" : a.includes("usps") ? "usps" : a.includes("royal mail") ? "royalmail" : "";
  }
  async _copyToClipboard(e) {
    try {
      await navigator.clipboard.writeText(e);
    } catch (a) {
      console.error("Failed to copy to clipboard", a);
    }
  }
  render() {
    if (this._isLoading)
      return t`<div class="loading"><uui-loader></uui-loader></div>`;
    if (this._errorMessage)
      return t`
        <div class="error">
          <uui-icon name="icon-alert"></uui-icon>
          ${this._errorMessage}
        </div>
      `;
    if (!this._fulfillmentData)
      return t`<div class="empty">No order data available</div>`;
    const e = [];
    for (const a of this._fulfillmentData.orders)
      for (const i of a.shipments)
        e.push({ shipment: i, warehouseName: a.warehouseName });
    return e.length === 0 ? t`
        <div class="empty-state">
          <uui-icon name="icon-box"></uui-icon>
          <h3>No shipments yet</h3>
          <p>Use the "Fulfil" button on the Details tab to create shipments for this order.</p>
        </div>
      ` : t`
      <div class="shipments-view">
        <div class="header">
          <h2>Shipments</h2>
          <div class="summary">
            <span class="status-badge ${this._fulfillmentData.overallStatus.toLowerCase()}">
              ${this._fulfillmentData.overallStatus}
            </span>
            <span class="count">${e.length} shipment${e.length !== 1 ? "s" : ""}</span>
          </div>
        </div>

        <div class="shipments-list">
          ${e.map(({ shipment: a, warehouseName: i }) => this._renderShipmentCard(a, i))}
        </div>
      </div>
    `;
  }
};
y = /* @__PURE__ */ new WeakMap();
_ = /* @__PURE__ */ new WeakMap();
v.styles = E`
    :host {
      display: block;
      padding: var(--uui-size-layout-1);
    }

    .loading {
      display: flex;
      justify-content: center;
      padding: var(--uui-size-layout-2);
    }

    .error {
      display: flex;
      align-items: center;
      gap: var(--uui-size-space-2);
      padding: var(--uui-size-space-4);
      background: #f8d7da;
      color: #721c24;
      border-radius: var(--uui-border-radius);
    }

    .empty-state {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: var(--uui-size-layout-4);
      text-align: center;
      color: var(--uui-color-text-alt);
    }

    .empty-state uui-icon {
      font-size: 48px;
      margin-bottom: var(--uui-size-space-4);
      opacity: 0.5;
    }

    .empty-state h3 {
      margin: 0 0 var(--uui-size-space-2);
      font-size: 1.25rem;
    }

    .empty-state p {
      margin: 0;
      max-width: 400px;
    }

    .header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: var(--uui-size-space-4);
    }

    .header h2 {
      margin: 0;
      font-size: 1.25rem;
      font-weight: 600;
    }

    .summary {
      display: flex;
      align-items: center;
      gap: var(--uui-size-space-3);
    }

    .status-badge {
      padding: 4px 12px;
      border-radius: 12px;
      font-size: 0.75rem;
      font-weight: 500;
      text-transform: capitalize;
    }

    .status-badge.fulfilled {
      background: #d4edda;
      color: #155724;
    }

    .status-badge.partial {
      background: #fff3cd;
      color: #856404;
    }

    .status-badge.unfulfilled {
      background: #f8d7da;
      color: #721c24;
    }

    .count {
      color: var(--uui-color-text-alt);
      font-size: 0.875rem;
    }

    .shipments-list {
      display: flex;
      flex-direction: column;
      gap: var(--uui-size-space-4);
    }

    .shipment-card {
      background: var(--uui-color-surface);
      border: 1px solid var(--uui-color-border);
      border-radius: var(--uui-border-radius);
      padding: var(--uui-size-space-4);
    }

    .shipment-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: var(--uui-size-space-3);
      padding-bottom: var(--uui-size-space-3);
      border-bottom: 1px solid var(--uui-color-border);
    }

    .header-left {
      display: flex;
      align-items: center;
      gap: var(--uui-size-space-3);
    }

    .header-right {
      display: flex;
      gap: var(--uui-size-space-2);
    }

    .carrier-badge {
      padding: 4px 12px;
      border-radius: 4px;
      font-size: 0.75rem;
      font-weight: 600;
      text-transform: uppercase;
      background: var(--uui-color-surface-alt);
      color: var(--uui-color-text);
    }

    .carrier-badge.ups {
      background: #351c15;
      color: #ffb500;
    }

    .carrier-badge.fedex {
      background: #4d148c;
      color: #ff6600;
    }

    .carrier-badge.dhl {
      background: #ffcc00;
      color: #d40511;
    }

    .carrier-badge.usps {
      background: #004b87;
      color: white;
    }

    .carrier-badge.royalmail {
      background: #e4002b;
      color: white;
    }

    .shipment-date {
      font-size: 0.875rem;
      color: var(--uui-color-text-alt);
    }

    .shipment-details {
      margin-bottom: var(--uui-size-space-3);
    }

    .detail-row {
      display: flex;
      gap: var(--uui-size-space-2);
      padding: var(--uui-size-space-1) 0;
      font-size: 0.875rem;
    }

    .detail-row .label {
      color: var(--uui-color-text-alt);
      min-width: 80px;
    }

    .detail-row .value {
      font-weight: 500;
    }

    .tracking-value {
      display: flex;
      align-items: center;
      gap: var(--uui-size-space-2);
    }

    .tracking-value a {
      color: var(--uui-color-interactive);
    }

    .copy-btn {
      background: none;
      border: none;
      padding: 2px;
      cursor: pointer;
      color: var(--uui-color-text-alt);
      opacity: 0.6;
    }

    .copy-btn:hover {
      opacity: 1;
    }

    .delivered {
      color: #155724;
    }

    .shipment-items {
      background: var(--uui-color-surface-alt);
      border-radius: var(--uui-border-radius);
      padding: var(--uui-size-space-3);
    }

    .shipment-items h4 {
      margin: 0 0 var(--uui-size-space-2);
      font-size: 0.75rem;
      font-weight: 600;
      text-transform: uppercase;
      color: var(--uui-color-text-alt);
    }

    .item-row {
      display: flex;
      align-items: center;
      gap: var(--uui-size-space-3);
      padding: var(--uui-size-space-2) 0;
    }

    .item-row:not(:last-child) {
      border-bottom: 1px solid var(--uui-color-border);
    }

    .item-image img,
    .placeholder-image {
      width: 40px;
      height: 40px;
      border-radius: var(--uui-border-radius);
      object-fit: cover;
    }

    .placeholder-image {
      background: var(--uui-color-surface);
    }

    .item-info {
      flex: 1;
    }

    .item-name {
      font-weight: 500;
      font-size: 0.875rem;
    }

    .item-sku {
      font-size: 0.75rem;
      color: var(--uui-color-text-alt);
    }

    .item-qty {
      font-weight: 600;
      font-size: 0.875rem;
    }
  `;
$([
  u()
], v.prototype, "_invoiceId", 2);
$([
  u()
], v.prototype, "_fulfillmentData", 2);
$([
  u()
], v.prototype, "_isLoading", 2);
$([
  u()
], v.prototype, "_errorMessage", 2);
v = $([
  T("merchello-shipments-view")
], v);
const Q = new C("Merchello.ManualPayment.Modal", {
  modal: {
    type: "sidebar",
    size: "small"
  }
}), Z = new C("Merchello.Refund.Modal", {
  modal: {
    type: "sidebar",
    size: "small"
  }
});
var ee = Object.defineProperty, ae = Object.getOwnPropertyDescriptor, H = (e) => {
  throw TypeError(e);
}, g = (e, a, i, r) => {
  for (var s = r > 1 ? void 0 : r ? ae(a, i) : a, n = e.length - 1, d; n >= 0; n--)
    (d = e[n]) && (s = (r ? d(a, i, s) : d(s)) || s);
  return r && s && ee(a, i, s), s;
}, j = (e, a, i) => a.has(e) || H("Cannot " + i), z = (e, a, i) => (j(e, a, "read from private field"), a.get(e)), ie = (e, a, i) => a.has(e) ? H("Cannot add the same private member more than once") : a instanceof WeakSet ? a.add(e) : a.set(e, i), te = (e, a, i, r) => (j(e, a, "write to private field"), a.set(e, i), i), p;
let c = class extends L(P) {
  constructor() {
    super(), this.invoiceId = "", this._payments = [], this._status = null, this._isLoading = !0, this._errorMessage = null, ie(this, p), this.consumeContext(D, (e) => {
      te(this, p, e);
    });
  }
  connectedCallback() {
    super.connectedCallback(), this.invoiceId && this._loadPayments();
  }
  updated(e) {
    e.has("invoiceId") && this.invoiceId && this._loadPayments();
  }
  async _loadPayments() {
    if (this.invoiceId) {
      this._isLoading = !0, this._errorMessage = null;
      try {
        const [e, a] = await Promise.all([
          k.getInvoicePayments(this.invoiceId),
          k.getPaymentStatus(this.invoiceId)
        ]);
        if (e.error) {
          this._errorMessage = e.error.message, this._isLoading = !1;
          return;
        }
        if (a.error) {
          this._errorMessage = a.error.message, this._isLoading = !1;
          return;
        }
        this._payments = e.data ?? [], this._status = a.data ?? null;
      } catch (e) {
        this._errorMessage = e instanceof Error ? e.message : "Failed to load payments";
      }
      this._isLoading = !1;
    }
  }
  async _openManualPaymentModal() {
    if (!z(this, p) || !this._status) return;
    (await z(this, p).open(this, Q, {
      data: {
        invoiceId: this.invoiceId,
        balanceDue: this._status.balanceDue
      }
    }).onSubmit().catch(() => {
    }))?.recorded && (await this._loadPayments(), this.dispatchEvent(new CustomEvent("payment-recorded", {
      detail: { invoiceId: this.invoiceId },
      bubbles: !0,
      composed: !0
    })));
  }
  async _openRefundModal(e) {
    if (!z(this, p)) return;
    (await z(this, p).open(this, Z, {
      data: { payment: e }
    }).onSubmit().catch(() => {
    }))?.refunded && (await this._loadPayments(), this.dispatchEvent(new CustomEvent("refund-processed", {
      detail: { invoiceId: this.invoiceId },
      bubbles: !0,
      composed: !0
    })));
  }
  _getStatusBadgeClass(e) {
    switch (e) {
      case f.Paid:
        return "paid";
      case f.PartiallyPaid:
        return "partial";
      case f.Refunded:
      case f.PartiallyRefunded:
        return "refunded";
      case f.AwaitingPayment:
        return "awaiting";
      default:
        return "unpaid";
    }
  }
  _renderPayment(e) {
    const a = e.paymentType === A.Refund || e.paymentType === A.PartialRefund;
    return t`
      <div class="payment-item ${a ? "refund" : ""}">
        <div class="payment-main">
          <div class="payment-info">
            <div class="payment-method">
              ${a ? t`<uui-icon name="icon-undo"></uui-icon>` : t`<uui-icon name="icon-credit-card"></uui-icon>`}
              <span>${e.paymentMethod ?? "Payment"}</span>
              ${e.paymentProviderAlias ? t`<span class="provider-badge">${e.paymentProviderAlias}</span>` : o}
            </div>
            <div class="payment-date">${S(e.dateCreated)}</div>
            ${e.transactionId ? t`<div class="transaction-id">ID: ${e.transactionId}</div>` : o}
            ${e.description ? t`<div class="payment-description">${e.description}</div>` : o}
            ${e.refundReason ? t`<div class="refund-reason">Reason: ${e.refundReason}</div>` : o}
          </div>
          <div class="payment-amount ${a ? "negative" : ""}">
            ${a ? "-" : ""}${l(Math.abs(e.amount))}
          </div>
          <div class="payment-actions">
            ${!a && e.refundableAmount > 0 ? t`
                  <uui-button
                    look="secondary"
                    label="Refund"
                    @click=${() => this._openRefundModal(e)}
                  >
                    Refund
                  </uui-button>
                ` : o}
          </div>
        </div>
        ${e.refunds && e.refunds.length > 0 ? t`
              <div class="refunds-list">
                ${e.refunds.map((i) => this._renderPayment(i))}
              </div>
            ` : o}
      </div>
    `;
  }
  render() {
    if (this._isLoading)
      return t`
        <div class="loading">
          <uui-loader></uui-loader>
        </div>
      `;
    if (this._errorMessage)
      return t`
        <div class="error">
          <uui-icon name="icon-alert"></uui-icon>
          <span>${this._errorMessage}</span>
        </div>
      `;
    const e = this._status;
    return t`
      <div class="payment-panel">
        <!-- Payment Status Summary -->
        <div class="status-summary">
          <div class="status-header">
            <span class="status-badge ${e ? this._getStatusBadgeClass(e.status) : "unpaid"}">
              ${e?.statusDisplay ?? "Unknown"}
            </span>
            ${e && e.balanceDue > 0 ? t`
                  <uui-button
                    look="primary"
                    label="Record Payment"
                    @click=${this._openManualPaymentModal}
                  >
                    <uui-icon name="icon-add"></uui-icon>
                    Record Payment
                  </uui-button>
                ` : o}
          </div>

          ${e ? t`
                <div class="status-details">
                  <div class="status-row">
                    <span>Invoice Total</span>
                    <span>${l(e.invoiceTotal)}</span>
                  </div>
                  <div class="status-row">
                    <span>Total Paid</span>
                    <span class="positive">${l(e.totalPaid)}</span>
                  </div>
                  ${e.totalRefunded > 0 ? t`
                        <div class="status-row">
                          <span>Total Refunded</span>
                          <span class="negative">-${l(e.totalRefunded)}</span>
                        </div>
                      ` : o}
                  <div class="status-row total">
                    <span>Balance Due</span>
                    <span class="${e.balanceDue > 0 ? "negative" : ""}">
                      ${l(e.balanceDue)}
                    </span>
                  </div>
                </div>
              ` : o}
        </div>

        <!-- Payments List -->
        <div class="payments-section">
          <h3>Payment History</h3>
          ${this._payments.length === 0 ? t`<p class="no-payments">No payments recorded yet.</p>` : t`
                <div class="payments-list">
                  ${this._payments.map((a) => this._renderPayment(a))}
                </div>
              `}
        </div>
      </div>
    `;
  }
};
p = /* @__PURE__ */ new WeakMap();
c.styles = E`
    :host {
      display: block;
    }

    .loading {
      display: flex;
      justify-content: center;
      padding: var(--uui-size-layout-1);
    }

    .error {
      display: flex;
      align-items: center;
      gap: var(--uui-size-space-2);
      padding: var(--uui-size-space-4);
      background: var(--uui-color-danger-standalone);
      color: var(--uui-color-danger-contrast);
      border-radius: var(--uui-border-radius);
    }

    .payment-panel {
      display: flex;
      flex-direction: column;
      gap: var(--uui-size-space-5);
    }

    .status-summary {
      background: var(--uui-color-surface);
      border: 1px solid var(--uui-color-border);
      border-radius: var(--uui-border-radius);
      padding: var(--uui-size-space-4);
    }

    .status-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: var(--uui-size-space-4);
    }

    .status-badge {
      display: inline-block;
      padding: 4px 12px;
      border-radius: 12px;
      font-size: 0.875rem;
      font-weight: 500;
    }

    .status-badge.paid {
      background: #d4edda;
      color: #155724;
    }

    .status-badge.partial {
      background: #fff3cd;
      color: #856404;
    }

    .status-badge.unpaid {
      background: #f8d7da;
      color: #721c24;
    }

    .status-badge.awaiting {
      background: #cce5ff;
      color: #004085;
    }

    .status-badge.refunded {
      background: #e2e3e5;
      color: #383d41;
    }

    .status-details {
      display: flex;
      flex-direction: column;
      gap: var(--uui-size-space-2);
    }

    .status-row {
      display: flex;
      justify-content: space-between;
      font-size: 0.875rem;
    }

    .status-row.total {
      padding-top: var(--uui-size-space-2);
      border-top: 1px solid var(--uui-color-border);
      font-weight: 600;
    }

    .positive {
      color: var(--uui-color-positive);
    }

    .negative {
      color: var(--uui-color-danger);
    }

    .payments-section h3 {
      margin: 0 0 var(--uui-size-space-3) 0;
      font-size: 1rem;
      font-weight: 600;
    }

    .no-payments {
      color: var(--uui-color-text-alt);
      font-style: italic;
    }

    .payments-list {
      display: flex;
      flex-direction: column;
      gap: var(--uui-size-space-3);
    }

    .payment-item {
      background: var(--uui-color-surface);
      border: 1px solid var(--uui-color-border);
      border-radius: var(--uui-border-radius);
      padding: var(--uui-size-space-3);
    }

    .payment-item.refund {
      background: var(--uui-color-surface-alt);
      border-left: 3px solid var(--uui-color-warning);
    }

    .payment-main {
      display: grid;
      grid-template-columns: 1fr auto auto;
      gap: var(--uui-size-space-3);
      align-items: start;
    }

    .payment-info {
      display: flex;
      flex-direction: column;
      gap: var(--uui-size-space-1);
    }

    .payment-method {
      display: flex;
      align-items: center;
      gap: var(--uui-size-space-2);
      font-weight: 500;
    }

    .provider-badge {
      font-size: 0.75rem;
      padding: 1px 6px;
      background: var(--uui-color-surface-alt);
      border-radius: 8px;
      color: var(--uui-color-text-alt);
    }

    .payment-date,
    .transaction-id,
    .payment-description,
    .refund-reason {
      font-size: 0.75rem;
      color: var(--uui-color-text-alt);
    }

    .refund-reason {
      font-style: italic;
    }

    .payment-amount {
      font-weight: 600;
      font-size: 1rem;
    }

    .payment-amount.negative {
      color: var(--uui-color-danger);
    }

    .refunds-list {
      margin-top: var(--uui-size-space-3);
      padding-left: var(--uui-size-space-4);
      border-left: 2px solid var(--uui-color-border);
    }

    .refunds-list .payment-item {
      margin-bottom: var(--uui-size-space-2);
    }

    .refunds-list .payment-item:last-child {
      margin-bottom: 0;
    }
  `;
g([
  V({ type: String })
], c.prototype, "invoiceId", 2);
g([
  u()
], c.prototype, "_payments", 2);
g([
  u()
], c.prototype, "_status", 2);
g([
  u()
], c.prototype, "_isLoading", 2);
g([
  u()
], c.prototype, "_errorMessage", 2);
c = g([
  T("merchello-payment-panel")
], c);
var se = Object.defineProperty, re = Object.getOwnPropertyDescriptor, q = (e) => {
  throw TypeError(e);
}, M = (e, a, i, r) => {
  for (var s = r > 1 ? void 0 : r ? re(a, i) : a, n = e.length - 1, d; n >= 0; n--)
    (d = e[n]) && (s = (r ? d(a, i, s) : d(s)) || s);
  return r && s && se(a, i, s), s;
}, G = (e, a, i) => a.has(e) || q("Cannot " + i), b = (e, a, i) => (G(e, a, "read from private field"), i ? i.call(e) : a.get(e)), N = (e, a, i) => a.has(e) ? q("Cannot add the same private member more than once") : a instanceof WeakSet ? a.add(e) : a.set(e, i), F = (e, a, i, r) => (G(e, a, "write to private field"), a.set(e, i), i), h, x;
let m = class extends L(P) {
  constructor() {
    super(), this._order = null, this._isLoading = !0, this._activeTab = "details", N(this, h), N(this, x), this.consumeContext(U, (e) => {
      F(this, h, e), this.observe(b(this, h).order, (a) => {
        this._order = a ?? null, this._isLoading = !a;
      });
    }), this.consumeContext(D, (e) => {
      F(this, x, e);
    });
  }
  async _openFulfillmentModal() {
    if (!this._order || !b(this, x)) return;
    await b(this, x).open(this, X, {
      data: { invoiceId: this._order.id }
    }).onSubmit().catch(() => {
    }), b(this, h)?.load(this._order.id);
  }
  _getPaymentStatusBadgeClass(e) {
    switch (e) {
      case 30:
        return "paid";
      case 20:
        return "partial";
      case 50:
      // Refunded
      case 40:
        return "refunded";
      case 10:
        return "awaiting";
      default:
        return "unpaid";
    }
  }
  _formatAddress(e) {
    if (!e) return ["No address"];
    const a = [];
    e.name && a.push(e.name), e.addressOne && a.push(e.addressOne), e.addressTwo && a.push(e.addressTwo);
    const i = [e.townCity, e.countyState, e.postalCode].filter(Boolean).join(" ");
    return i && a.push(i), e.country && a.push(e.country), e.phone && a.push(e.phone), a;
  }
  _renderFulfillmentCard(e) {
    const a = this._getStatusLabel(e.status), i = this._order?.fulfillmentStatus === "Fulfilled", r = e.status >= 50 ? "shipped" : "unfulfilled";
    return t`
      <div class="card fulfillment-card">
        <div class="card-header">
          <span class="status-badge ${r}">${a}</span>
          <span class="shipping-method">${e.deliveryMethod}</span>
        </div>
        <div class="line-items">
          ${e.lineItems.map(
      (s) => t`
              <div class="line-item">
                <div class="item-image">
                  ${s.imageUrl ? t`<img src="${s.imageUrl}" alt="${s.name}" />` : t`<div class="placeholder-image"></div>`}
                </div>
                <div class="item-details">
                  <div class="item-name">${s.name}</div>
                  <div class="item-sku">${s.sku}</div>
                </div>
                <div class="item-price">${l(s.amount)} x ${s.quantity}</div>
                <div class="item-total">${l(s.amount * s.quantity)}</div>
              </div>
            `
    )}
        </div>
        <div class="card-footer">
          <uui-button
            look="${i ? "secondary" : "primary"}"
            label="${i ? "Fulfilled" : "Fulfil"}"
            ?disabled=${i}
            @click=${i ? o : this._openFulfillmentModal}
          >
            ${i ? "Fulfilled" : "Fulfil"}
          </uui-button>
        </div>
      </div>
    `;
  }
  _getStatusLabel(e) {
    return {
      0: "Pending",
      10: "Awaiting Stock",
      20: "Ready to Fulfill",
      30: "Processing",
      40: "Partially Shipped",
      50: "Shipped",
      60: "Completed",
      70: "Cancelled",
      80: "On Hold"
    }[e] || "Unknown";
  }
  _handleTabClick(e) {
    this._activeTab = e;
  }
  _handlePaymentChange() {
    this._order && b(this, h)?.load(this._order.id);
  }
  _renderLoadingState() {
    return t`<div class="loading"><uui-loader></uui-loader></div>`;
  }
  _renderNotFoundState() {
    return t`<div class="error">Order not found</div>`;
  }
  render() {
    if (this._isLoading)
      return this._renderLoadingState();
    if (!this._order)
      return this._renderNotFoundState();
    const e = this._order;
    return t`
      <div class="order-detail">
        <!-- Header -->
        <div class="order-header">
          <div class="header-left">
            <h1>${e.invoiceNumber || "Order"}</h1>
            <span class="badge ${this._getPaymentStatusBadgeClass(e.paymentStatus)}">${e.paymentStatusDisplay}</span>
            <span class="badge ${e.fulfillmentStatus.toLowerCase().replace(" ", "-")}">${e.fulfillmentStatus}</span>
          </div>
          <div class="header-right">
            <uui-button look="secondary" label="Refund">Refund</uui-button>
            <uui-button look="secondary" label="Edit">Edit</uui-button>
            <uui-button look="secondary" label="More actions">More actions</uui-button>
          </div>
        </div>
        <div class="order-meta">
          ${I(e.dateCreated)} from ${e.channel}
        </div>

        <!-- Tabs -->
        <div class="tabs">
          <button
            class="tab ${this._activeTab === "details" ? "active" : ""}"
            @click=${() => this._handleTabClick("details")}
          >
            Details
          </button>
          <button
            class="tab ${this._activeTab === "shipments" ? "active" : ""}"
            @click=${() => this._handleTabClick("shipments")}
          >
            Shipments
          </button>
          <button
            class="tab ${this._activeTab === "payments" ? "active" : ""}"
            @click=${() => this._handleTabClick("payments")}
          >
            Payments
          </button>
        </div>

        <!-- Tab Content -->
        ${this._activeTab === "shipments" ? t`<merchello-shipments-view></merchello-shipments-view>` : this._activeTab === "payments" ? t`
              <merchello-payment-panel
                invoiceId=${e.id}
                @payment-recorded=${this._handlePaymentChange}
                @refund-processed=${this._handlePaymentChange}
              ></merchello-payment-panel>
            ` : t`
        <!-- Main Content -->
        <div class="order-content">
          <!-- Left Column -->
          <div class="main-column">
            <!-- Fulfillment Cards -->
            ${e.orders.map((a) => this._renderFulfillmentCard(a))}

            <!-- Payment Summary -->
            <div class="card payment-card">
              <div class="card-header">
                <input type="checkbox" checked disabled />
                <span>${e.paymentStatusDisplay}</span>
              </div>
              <div class="payment-summary">
                <div class="summary-row">
                  <span>Subtotal</span>
                  <span>${e.orders.reduce((a, i) => a + i.lineItems.reduce((r, s) => r + s.quantity, 0), 0)} items</span>
                  <span>${l(e.subTotal)}</span>
                </div>
                <div class="summary-row">
                  <span>Shipping</span>
                  <span>${e.orders[0]?.deliveryMethod || "Standard"}</span>
                  <span>${l(e.shippingCost)}</span>
                </div>
                <div class="summary-row total">
                  <span>Total</span>
                  <span></span>
                  <span>${l(e.total)}</span>
                </div>
                <div class="summary-row">
                  <span>Paid</span>
                  <span></span>
                  <span>${l(e.amountPaid)}</span>
                </div>
              </div>
            </div>

            <!-- Timeline -->
            <div class="card timeline-card">
              <h3>Timeline</h3>
              <div class="timeline-input">
                <input type="text" placeholder="Leave a comment..." />
                <div class="timeline-actions">
                  <button title="Emoji">:-)</button>
                  <button title="Mention">@</button>
                  <button title="Tag">#</button>
                  <button title="Link">/</button>
                  <button disabled>Post</button>
                </div>
                <div class="timeline-note">Only you and other staff can see comments</div>
              </div>
              <div class="timeline-events">
                ${e.notes.length === 0 ? t`<div class="no-notes">No timeline events yet</div>` : e.notes.map(
      (a) => t`
                        <div class="timeline-event">
                          <div class="event-time">${I(a.date)}</div>
                          <div class="event-text">${a.text}</div>
                          ${a.author ? t`<div class="event-author">by ${a.author}</div>` : o}
                        </div>
                      `
    )}
              </div>
            </div>
          </div>

          <!-- Right Column (Sidebar) -->
          <div class="sidebar">
            <!-- Notes -->
            <div class="card">
              <div class="card-header-with-action">
                <h3>Notes</h3>
                <button class="edit-btn" title="Edit">
                  <uui-icon name="icon-edit"></uui-icon>
                </button>
              </div>
              <p class="muted">No notes from customer</p>
            </div>

            <!-- Customer -->
            <div class="card">
              <div class="card-header-with-action">
                <h3>Customer</h3>
                <button class="close-btn" title="Close">&times;</button>
              </div>
              <div class="customer-info">
                <a href="#" class="customer-name">${e.billingAddress?.name || "Unknown"}</a>
                <div class="muted">1 order</div>
              </div>
              <div class="section">
                <div class="section-header">
                  <span>Contact information</span>
                  <button class="edit-btn" title="Edit">
                    <uui-icon name="icon-edit"></uui-icon>
                  </button>
                </div>
                ${e.billingAddress?.email ? t`<a href="mailto:${e.billingAddress.email}">${e.billingAddress.email}</a>` : t`<span class="muted">No email</span>`}
              </div>
              <div class="section">
                <div class="section-header">
                  <span>Shipping address</span>
                  <button class="edit-btn" title="Edit">
                    <uui-icon name="icon-edit"></uui-icon>
                  </button>
                </div>
                <div class="address">
                  ${this._formatAddress(e.shippingAddress).map((a) => t`<div>${a}</div>`)}
                </div>
                <a href="#" class="view-map">View map</a>
              </div>
              <div class="section">
                <div class="section-header">
                  <span>Billing address</span>
                  <button class="edit-btn" title="Edit">
                    <uui-icon name="icon-edit"></uui-icon>
                  </button>
                </div>
                ${e.billingAddress === e.shippingAddress ? t`<span class="muted">Same as shipping address</span>` : t`
                      <div class="address">
                        ${this._formatAddress(e.billingAddress).map((a) => t`<div>${a}</div>`)}
                      </div>
                    `}
              </div>
            </div>

            <!-- Tags -->
            <div class="card">
              <div class="card-header-with-action">
                <h3>Tags</h3>
                <button class="edit-btn" title="Edit">
                  <uui-icon name="icon-edit"></uui-icon>
                </button>
              </div>
              <input type="text" placeholder="Add tags..." class="tags-input" />
            </div>
          </div>
        </div>
        `}
      </div>
    `;
  }
};
h = /* @__PURE__ */ new WeakMap();
x = /* @__PURE__ */ new WeakMap();
m.styles = E`
    :host {
      display: block;
      padding: var(--uui-size-layout-1);
      background: var(--uui-color-background);
    }

    .loading {
      display: flex;
      justify-content: center;
      padding: var(--uui-size-layout-2);
    }

    .error {
      padding: var(--uui-size-space-4);
      background: #f8d7da;
      color: #721c24;
      border-radius: var(--uui-border-radius);
    }

    .order-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: var(--uui-size-space-2);
    }

    .header-left {
      display: flex;
      align-items: center;
      gap: var(--uui-size-space-2);
    }

    .header-left h1 {
      margin: 0;
      font-size: 1.25rem;
      font-weight: 600;
    }

    .header-right {
      display: flex;
      gap: var(--uui-size-space-2);
    }

    .order-meta {
      color: var(--uui-color-text-alt);
      font-size: 0.875rem;
      margin-bottom: var(--uui-size-space-4);
    }

    .tabs {
      display: flex;
      gap: var(--uui-size-space-1);
      border-bottom: 1px solid var(--uui-color-border);
      margin-bottom: var(--uui-size-space-4);
    }

    .tab {
      padding: var(--uui-size-space-2) var(--uui-size-space-4);
      border: none;
      background: none;
      cursor: pointer;
      font-size: 0.875rem;
      color: var(--uui-color-text-alt);
      border-bottom: 2px solid transparent;
      transition: all 0.2s;
    }

    .tab:hover {
      color: var(--uui-color-text);
    }

    .tab.active {
      color: var(--uui-color-text);
      border-bottom-color: var(--uui-color-current);
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
      background: #f8d7da;
      color: #721c24;
    }

    .badge.fulfilled {
      background: #d4edda;
      color: #155724;
    }

    .badge.unfulfilled {
      background: #fff3cd;
      color: #856404;
    }

    .order-content {
      display: grid;
      grid-template-columns: 1fr 350px;
      gap: var(--uui-size-space-4);
    }

    @media (max-width: 1024px) {
      .order-content {
        grid-template-columns: 1fr;
      }
    }

    .card {
      background: var(--uui-color-surface);
      border: 1px solid var(--uui-color-border);
      border-radius: var(--uui-border-radius);
      padding: var(--uui-size-space-4);
      margin-bottom: var(--uui-size-space-4);
    }

    .card h3 {
      margin: 0 0 var(--uui-size-space-3);
      font-size: 0.875rem;
      font-weight: 600;
    }

    .card-header {
      display: flex;
      align-items: center;
      gap: var(--uui-size-space-2);
      margin-bottom: var(--uui-size-space-3);
    }

    .card-header-with-action {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: var(--uui-size-space-3);
    }

    .card-header-with-action h3 {
      margin: 0;
    }

    .card-footer {
      margin-top: var(--uui-size-space-3);
      padding-top: var(--uui-size-space-3);
      border-top: 1px solid var(--uui-color-border);
    }

    .status-badge {
      padding: 2px 8px;
      border-radius: 12px;
      font-size: 0.75rem;
      font-weight: 500;
      background: #fff3cd;
      color: #856404;
    }

    .status-badge.shipped {
      background: #d4edda;
      color: #155724;
    }

    .shipping-method {
      font-size: 0.875rem;
      color: var(--uui-color-text-alt);
    }

    .line-items {
      display: flex;
      flex-direction: column;
      gap: var(--uui-size-space-3);
    }

    .line-item {
      display: grid;
      grid-template-columns: 50px 1fr auto auto;
      gap: var(--uui-size-space-3);
      align-items: center;
    }

    .item-image img,
    .placeholder-image {
      width: 50px;
      height: 50px;
      border-radius: var(--uui-border-radius);
      object-fit: cover;
    }

    .placeholder-image {
      background: var(--uui-color-surface-alt);
    }

    .item-name {
      font-weight: 500;
    }

    .item-sku {
      font-size: 0.75rem;
      color: var(--uui-color-text-alt);
    }

    .item-price,
    .item-total {
      font-size: 0.875rem;
    }

    .payment-summary {
      display: flex;
      flex-direction: column;
      gap: var(--uui-size-space-2);
    }

    .summary-row {
      display: grid;
      grid-template-columns: 1fr 1fr auto;
      gap: var(--uui-size-space-2);
      font-size: 0.875rem;
    }

    .summary-row.total {
      font-weight: 600;
      padding-top: var(--uui-size-space-2);
      border-top: 1px solid var(--uui-color-border);
    }

    .timeline-input {
      margin-bottom: var(--uui-size-space-4);
    }

    .timeline-input input {
      width: 100%;
      padding: var(--uui-size-space-2);
      border: 1px solid var(--uui-color-border);
      border-radius: var(--uui-border-radius);
      margin-bottom: var(--uui-size-space-2);
    }

    .timeline-actions {
      display: flex;
      gap: var(--uui-size-space-2);
    }

    .timeline-actions button {
      padding: var(--uui-size-space-1) var(--uui-size-space-2);
      border: none;
      background: none;
      cursor: pointer;
      color: var(--uui-color-text-alt);
    }

    .timeline-actions button:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }

    .timeline-note {
      font-size: 0.75rem;
      color: var(--uui-color-text-alt);
      margin-top: var(--uui-size-space-1);
    }

    .timeline-events {
      border-top: 1px solid var(--uui-color-border);
      padding-top: var(--uui-size-space-3);
    }

    .timeline-event {
      padding: var(--uui-size-space-2) 0;
      border-bottom: 1px solid var(--uui-color-border);
    }

    .event-time {
      font-size: 0.75rem;
      color: var(--uui-color-text-alt);
    }

    .no-notes {
      color: var(--uui-color-text-alt);
      font-style: italic;
    }

    .sidebar .card {
      margin-bottom: var(--uui-size-space-3);
    }

    .muted {
      color: var(--uui-color-text-alt);
      font-size: 0.875rem;
    }

    .customer-name {
      color: var(--uui-color-interactive);
      text-decoration: none;
      font-weight: 500;
    }

    .section {
      margin-top: var(--uui-size-space-3);
      padding-top: var(--uui-size-space-3);
      border-top: 1px solid var(--uui-color-border);
    }

    .section-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: var(--uui-size-space-2);
      font-weight: 500;
      font-size: 0.875rem;
    }

    .address {
      font-size: 0.875rem;
      line-height: 1.5;
    }

    .view-map {
      display: inline-block;
      margin-top: var(--uui-size-space-2);
      color: var(--uui-color-interactive);
      font-size: 0.875rem;
    }

    .edit-btn,
    .close-btn {
      background: none;
      border: none;
      cursor: pointer;
      padding: var(--uui-size-space-1);
      color: var(--uui-color-text-alt);
    }

    .tags-input {
      width: 100%;
      padding: var(--uui-size-space-2);
      border: 1px solid var(--uui-color-border);
      border-radius: var(--uui-border-radius);
    }
  `;
M([
  u()
], m.prototype, "_order", 2);
M([
  u()
], m.prototype, "_isLoading", 2);
M([
  u()
], m.prototype, "_activeTab", 2);
m = M([
  T("merchello-order-detail")
], m);
const ve = m;
export {
  m as MerchelloOrderDetailElement,
  ve as default
};
//# sourceMappingURL=order-detail.element-DkhwdvvR.js.map
