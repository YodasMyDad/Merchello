import { LitElement as N, nothing as o, html as a, css as F, state as n, customElement as R, property as Q, unsafeHTML as Z } from "@umbraco-cms/backoffice/external/lit";
import { d as q, p as ee } from "./purify.es-Cuv6u9x0.js";
import { UmbElementMixin as U } from "@umbraco-cms/backoffice/element-api";
import { UMB_WORKSPACE_CONTEXT as W } from "@umbraco-cms/backoffice/workspace";
import { UmbModalToken as z, UMB_MODAL_MANAGER_CONTEXT as j } from "@umbraco-cms/backoffice/modal";
import { UMB_CURRENT_USER_CONTEXT as ie } from "@umbraco-cms/backoffice/current-user";
import { b as I, a as p, h as te } from "./formatting-33NafgjJ.js";
import { M as h } from "./merchello-api-C2InYbkz.js";
import { I as S, P as B } from "./order.types-B45a7FtJ.js";
const ae = new z("Merchello.Fulfillment.Modal", {
  modal: {
    type: "sidebar",
    size: "large"
  }
}), re = new z("Merchello.EditOrder.Modal", {
  modal: {
    type: "sidebar",
    size: "large"
  }
}), se = new z("Merchello.CustomerOrders.Modal", {
  modal: {
    type: "sidebar",
    size: "large"
  }
}), oe = new z("Merchello.ShipmentEdit.Modal", {
  modal: {
    type: "sidebar",
    size: "medium"
  }
});
var ne = Object.defineProperty, le = Object.getOwnPropertyDescriptor, G = (e) => {
  throw TypeError(e);
}, M = (e, i, t, s) => {
  for (var r = s > 1 ? void 0 : s ? le(i, t) : i, l = e.length - 1, m; l >= 0; l--)
    (m = e[l]) && (r = (s ? m(i, t, r) : m(r)) || r);
  return s && r && ne(i, t, r), r;
}, V = (e, i, t) => i.has(e) || G("Cannot " + t), x = (e, i, t) => (V(e, i, "read from private field"), t ? t.call(e) : i.get(e)), T = (e, i, t) => i.has(e) ? G("Cannot add the same private member more than once") : i instanceof WeakSet ? i.add(e) : i.set(e, t), D = (e, i, t, s) => (V(e, i, "write to private field"), i.set(e, t), t), P, E, $;
let y = class extends U(N) {
  constructor() {
    super(), this._invoiceId = null, this._fulfillmentData = null, this._isLoading = !0, this._errorMessage = null, T(this, P), T(this, E), T(this, $, !1), this.consumeContext(W, (e) => {
      D(this, P, e), this.observe(x(this, P).order, (i) => {
        i?.id && i.id !== this._invoiceId && (this._invoiceId = i.id, this._loadShipments());
      });
    }), this.consumeContext(j, (e) => {
      D(this, E, e);
    });
  }
  connectedCallback() {
    super.connectedCallback(), D(this, $, !0);
  }
  disconnectedCallback() {
    super.disconnectedCallback(), D(this, $, !1);
  }
  async _loadShipments() {
    if (!this._invoiceId) return;
    this._isLoading = !0, this._errorMessage = null;
    const { data: e, error: i } = await h.getFulfillmentSummary(this._invoiceId);
    x(this, $) && (i ? this._errorMessage = i.message : this._fulfillmentData = e ?? null, this._isLoading = !1);
  }
  async _handleEditShipment(e) {
    if (!x(this, E)) return;
    (await x(this, E).open(this, oe, {
      data: { shipment: e }
    }).onSubmit().catch(() => {
    }))?.updated && this._loadShipments();
  }
  async _handleDeleteShipment(e) {
    if (!confirm(
      "Are you sure you want to delete this shipment? This will release the items back to unfulfilled."
    )) return;
    const { error: t } = await h.deleteShipment(e.id);
    if (x(this, $)) {
      if (t) {
        alert(t.message);
        return;
      }
      this._loadShipments(), this._invoiceId && x(this, P)?.load(this._invoiceId);
    }
  }
  _renderShipmentCard(e, i) {
    const t = this._getCarrierClass(e.carrier);
    return a`
      <div class="shipment-card">
        <div class="shipment-header">
          <div class="header-left">
            ${e.carrier ? a`<span class="carrier-badge ${t}">${e.carrier}</span>` : a`<span class="carrier-badge">No carrier</span>`}
            <span class="shipment-date">Created ${I(e.dateCreated)}</span>
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
            <span class="value">${i}</span>
          </div>
          ${e.trackingNumber ? a`
                <div class="detail-row">
                  <span class="label">Tracking:</span>
                  <span class="value tracking-value">
                    ${e.trackingUrl ? a`<a href="${e.trackingUrl}" target="_blank" rel="noopener"
                          >${e.trackingNumber}</a
                        >` : e.trackingNumber}
                    <uui-button
                      look="secondary"
                      compact
                      label="Copy tracking number"
                      title="Copy tracking number"
                      @click=${() => this._copyToClipboard(e.trackingNumber)}
                    >
                      <uui-icon name="icon-documents"></uui-icon>
                    </uui-button>
                  </span>
                </div>
              ` : o}
          ${e.actualDeliveryDate ? a`
                <div class="detail-row">
                  <span class="label">Delivered:</span>
                  <span class="value delivered">${I(e.actualDeliveryDate)}</span>
                </div>
              ` : o}
        </div>

        <div class="shipment-items">
          <h4>Items in shipment</h4>
          ${e.lineItems.map(
      (s) => a`
              <div class="item-row">
                <div class="item-image">
                  ${s.imageUrl ? a`<img src="${s.imageUrl}" alt="${s.name}" />` : a`<div class="placeholder-image"></div>`}
                </div>
                <div class="item-info">
                  <div class="item-name">${s.name || "Unknown item"}</div>
                  ${s.sku ? a`<div class="item-sku">${s.sku}</div>` : o}
                </div>
                <div class="item-qty">x${s.quantity}</div>
              </div>
            `
    )}
        </div>
      </div>
    `;
  }
  _getCarrierClass(e) {
    if (!e) return "";
    const i = e.toLowerCase();
    return i.includes("ups") ? "ups" : i.includes("fedex") ? "fedex" : i.includes("dhl") ? "dhl" : i.includes("usps") ? "usps" : i.includes("royal mail") ? "royalmail" : "";
  }
  async _copyToClipboard(e) {
    try {
      await navigator.clipboard.writeText(e);
    } catch (i) {
      console.error("Failed to copy to clipboard", i);
    }
  }
  render() {
    if (this._isLoading)
      return a`<div class="loading"><uui-loader></uui-loader></div>`;
    if (this._errorMessage)
      return a`
        <div class="error">
          <uui-icon name="icon-alert"></uui-icon>
          ${this._errorMessage}
        </div>
      `;
    if (!this._fulfillmentData)
      return a`<div class="empty">No order data available</div>`;
    const e = [];
    for (const i of this._fulfillmentData.orders)
      for (const t of i.shipments)
        e.push({ shipment: t, warehouseName: i.warehouseName });
    return e.length === 0 ? a`
        <div class="empty-state">
          <uui-icon name="icon-box"></uui-icon>
          <h3>No shipments yet</h3>
          <p>Use the "Fulfil" button on the Details tab to create shipments for this order.</p>
        </div>
      ` : a`
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
          ${e.map(({ shipment: i, warehouseName: t }) => this._renderShipmentCard(i, t))}
        </div>
      </div>
    `;
  }
};
P = /* @__PURE__ */ new WeakMap();
E = /* @__PURE__ */ new WeakMap();
$ = /* @__PURE__ */ new WeakMap();
y.styles = F`
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
      background: var(--uui-color-danger-standalone);
      color: var(--uui-color-danger-contrast);
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
      background: var(--uui-color-positive-standalone);
      color: var(--uui-color-positive-contrast);
    }

    .status-badge.partial {
      background: var(--uui-color-warning-standalone);
      color: var(--uui-color-warning-contrast);
    }

    .status-badge.unfulfilled {
      background: var(--uui-color-danger-standalone);
      color: var(--uui-color-danger-contrast);
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
      color: var(--uui-color-positive);
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
M([
  n()
], y.prototype, "_invoiceId", 2);
M([
  n()
], y.prototype, "_fulfillmentData", 2);
M([
  n()
], y.prototype, "_isLoading", 2);
M([
  n()
], y.prototype, "_errorMessage", 2);
y = M([
  R("merchello-shipments-view")
], y);
const de = new z("Merchello.ManualPayment.Modal", {
  modal: {
    type: "sidebar",
    size: "medium"
  }
}), ue = new z("Merchello.Refund.Modal", {
  modal: {
    type: "sidebar",
    size: "medium"
  }
});
var ce = Object.defineProperty, pe = Object.getOwnPropertyDescriptor, X = (e) => {
  throw TypeError(e);
}, C = (e, i, t, s) => {
  for (var r = s > 1 ? void 0 : s ? pe(i, t) : i, l = e.length - 1, m; l >= 0; l--)
    (m = e[l]) && (r = (s ? m(i, t, r) : m(r)) || r);
  return s && r && ce(i, t, r), r;
}, Y = (e, i, t) => i.has(e) || X("Cannot " + t), w = (e, i, t) => (Y(e, i, "read from private field"), i.get(e)), H = (e, i, t) => i.has(e) ? X("Cannot add the same private member more than once") : i instanceof WeakSet ? i.add(e) : i.set(e, t), A = (e, i, t, s) => (Y(e, i, "write to private field"), i.set(e, t), t), _, k;
let b = class extends U(N) {
  constructor() {
    super(), this.invoiceId = "", this._payments = [], this._status = null, this._isLoading = !0, this._errorMessage = null, H(this, _), H(this, k, !1), this.consumeContext(j, (e) => {
      A(this, _, e);
    });
  }
  connectedCallback() {
    super.connectedCallback(), A(this, k, !0), this.invoiceId && this._loadPayments();
  }
  disconnectedCallback() {
    super.disconnectedCallback(), A(this, k, !1);
  }
  updated(e) {
    e.has("invoiceId") && this.invoiceId && this._loadPayments();
  }
  async _loadPayments() {
    if (this.invoiceId) {
      this._isLoading = !0, this._errorMessage = null;
      try {
        const [e, i] = await Promise.all([
          h.getInvoicePayments(this.invoiceId),
          h.getPaymentStatus(this.invoiceId)
        ]);
        if (!w(this, k)) return;
        if (e.error) {
          this._errorMessage = e.error.message, this._isLoading = !1;
          return;
        }
        if (i.error) {
          this._errorMessage = i.error.message, this._isLoading = !1;
          return;
        }
        this._payments = e.data ?? [], this._status = i.data ?? null;
      } catch (e) {
        if (!w(this, k)) return;
        this._errorMessage = e instanceof Error ? e.message : "Failed to load payments";
      }
      this._isLoading = !1;
    }
  }
  async _openManualPaymentModal() {
    if (!w(this, _) || !this._status) return;
    (await w(this, _).open(this, de, {
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
    if (!w(this, _)) return;
    (await w(this, _).open(this, ue, {
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
      case S.Paid:
        return "paid";
      case S.PartiallyPaid:
        return "partial";
      case S.Refunded:
      case S.PartiallyRefunded:
        return "refunded";
      case S.AwaitingPayment:
        return "awaiting";
      default:
        return "unpaid";
    }
  }
  _renderPayment(e) {
    const i = e.paymentType === B.Refund || e.paymentType === B.PartialRefund;
    return a`
      <div class="payment-item ${i ? "refund" : ""}">
        <div class="payment-main">
          <div class="payment-info">
            <div class="payment-method">
              ${i ? a`<uui-icon name="icon-undo"></uui-icon>` : a`<uui-icon name="icon-credit-card"></uui-icon>`}
              <span>${e.paymentMethod ?? "Payment"}</span>
              ${e.paymentProviderAlias ? a`<span class="provider-badge">${e.paymentProviderAlias}</span>` : o}
            </div>
            <div class="payment-date">${I(e.dateCreated)}</div>
            ${e.transactionId ? a`<div class="transaction-id">ID: ${e.transactionId}</div>` : o}
            ${e.description ? a`<div class="payment-description">${e.description}</div>` : o}
            ${e.refundReason ? a`<div class="refund-reason">Reason: ${e.refundReason}</div>` : o}
          </div>
          <div class="payment-amount ${i ? "negative" : ""}">
            ${i ? "-" : ""}${p(Math.abs(e.amount))}
          </div>
          <div class="payment-actions">
            ${!i && e.refundableAmount > 0 ? a`
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
        ${e.refunds && e.refunds.length > 0 ? a`
              <div class="refunds-list">
                ${e.refunds.map((t) => this._renderPayment(t))}
              </div>
            ` : o}
      </div>
    `;
  }
  render() {
    if (this._isLoading)
      return a`
        <div class="loading">
          <uui-loader></uui-loader>
        </div>
      `;
    if (this._errorMessage)
      return a`
        <div class="error">
          <uui-icon name="icon-alert"></uui-icon>
          <span>${this._errorMessage}</span>
        </div>
      `;
    const e = this._status;
    return a`
      <div class="payment-panel">
        <!-- Payment Status Summary -->
        <div class="status-summary">
          <div class="status-header">
            <span class="status-badge ${e ? this._getStatusBadgeClass(e.status) : "unpaid"}">
              ${e?.statusDisplay ?? "Unknown"}
            </span>
            ${e && e.balanceDue > 0 ? a`
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

          ${e ? a`
                <div class="status-details">
                  <div class="status-row">
                    <span>Invoice Total</span>
                    <span>${p(e.invoiceTotal)}</span>
                  </div>
                  <div class="status-row">
                    <span>Total Paid</span>
                    <span class="positive">${p(e.totalPaid)}</span>
                  </div>
                  ${e.totalRefunded > 0 ? a`
                        <div class="status-row">
                          <span>Total Refunded</span>
                          <span class="negative">-${p(e.totalRefunded)}</span>
                        </div>
                      ` : o}
                  <div class="status-row total">
                    <span>Balance Due</span>
                    <span class="${e.balanceDue > 0 ? "negative" : ""}">
                      ${p(e.balanceDue)}
                    </span>
                  </div>
                </div>
              ` : o}
        </div>

        <!-- Payments List -->
        <div class="payments-section">
          <h3>Payment History</h3>
          ${this._payments.length === 0 ? a`<p class="no-payments">No payments recorded yet.</p>` : a`
                <div class="payments-list">
                  ${this._payments.map((i) => this._renderPayment(i))}
                </div>
              `}
        </div>
      </div>
    `;
  }
};
_ = /* @__PURE__ */ new WeakMap();
k = /* @__PURE__ */ new WeakMap();
b.styles = F`
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
      background: var(--uui-color-positive-standalone);
      color: var(--uui-color-positive-contrast);
    }

    .status-badge.partial {
      background: var(--uui-color-warning-standalone);
      color: var(--uui-color-warning-contrast);
    }

    .status-badge.unpaid {
      background: var(--uui-color-danger-standalone);
      color: var(--uui-color-danger-contrast);
    }

    .status-badge.awaiting {
      background: var(--uui-color-default-standalone);
      color: var(--uui-color-default-contrast);
    }

    .status-badge.refunded {
      background: var(--uui-color-surface-alt);
      color: var(--uui-color-text);
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
C([
  Q({ type: String })
], b.prototype, "invoiceId", 2);
C([
  n()
], b.prototype, "_payments", 2);
C([
  n()
], b.prototype, "_status", 2);
C([
  n()
], b.prototype, "_isLoading", 2);
C([
  n()
], b.prototype, "_errorMessage", 2);
b = C([
  R("merchello-payment-panel")
], b);
var me = Object.defineProperty, ve = Object.getOwnPropertyDescriptor, K = (e) => {
  throw TypeError(e);
}, c = (e, i, t, s) => {
  for (var r = s > 1 ? void 0 : s ? ve(i, t) : i, l = e.length - 1, m; l >= 0; l--)
    (m = e[l]) && (r = (s ? m(i, t, r) : m(r)) || r);
  return s && r && me(i, t, r), r;
}, J = (e, i, t) => i.has(e) || K("Cannot " + t), u = (e, i, t) => (J(e, i, "read from private field"), i.get(e)), L = (e, i, t) => i.has(e) ? K("Cannot add the same private member more than once") : i instanceof WeakSet ? i.add(e) : i.set(e, t), O = (e, i, t, s) => (J(e, i, "write to private field"), i.set(e, t), t), v, g, f;
let d = class extends U(N) {
  constructor() {
    super(), this._order = null, this._isLoading = !0, this._activeTab = "details", this._newNoteText = "", this._visibleToCustomer = !1, this._isPostingNote = !1, this._noteError = null, this._editingSection = null, this._editFormData = {}, this._isSavingAddress = !1, this._validationErrors = {}, this._countries = [], this._editingPurchaseOrder = !1, this._purchaseOrderValue = "", this._isSavingPurchaseOrder = !1, L(this, v), L(this, g), L(this, f, !1), this.consumeContext(W, (e) => {
      O(this, v, e), u(this, v) && this.observe(u(this, v).order, (i) => {
        this._order = i ?? null, this._isLoading = !i;
      });
    }), this.consumeContext(j, (e) => {
      O(this, g, e);
    }), this.consumeContext(ie, (e) => {
      this.observe(e?.currentUser, (i) => {
        this._currentUser = i;
      });
    }), this._loadCountries();
  }
  connectedCallback() {
    super.connectedCallback(), O(this, f, !0);
  }
  disconnectedCallback() {
    super.disconnectedCallback(), O(this, f, !1);
  }
  async _loadCountries() {
    const { data: e } = await h.getCountries();
    u(this, f) && e && (this._countries = e);
  }
  _getGravatarUrl(e, i = 40) {
    return e ? `https://www.gravatar.com/avatar/${this._simpleHash(e.toLowerCase().trim())}?d=mp&s=${i}` : null;
  }
  _simpleHash(e) {
    let i = 3735928559, t = 1103547991;
    for (let r = 0; r < e.length; r++) {
      const l = e.charCodeAt(r);
      i = Math.imul(i ^ l, 2654435761), t = Math.imul(t ^ l, 1597334677);
    }
    return i = Math.imul(i ^ i >>> 16, 2246822507), i ^= Math.imul(t ^ t >>> 13, 3266489909), t = Math.imul(t ^ t >>> 16, 2246822507), t ^= Math.imul(i ^ i >>> 13, 3266489909), (4294967296 * (2097151 & t) + (i >>> 0)).toString(16).padStart(32, "0");
  }
  async _openFulfillmentModal() {
    if (!this._order || !u(this, g)) return;
    await u(this, g).open(this, ae, {
      data: { invoiceId: this._order.id }
    }).onSubmit().catch(() => {
    }), u(this, v)?.load(this._order.id);
  }
  async _openEditOrderModal() {
    if (!this._order || !u(this, g)) return;
    await u(this, g).open(this, re, {
      data: { invoiceId: this._order.id }
    }).onSubmit().catch(() => {
    }), u(this, v)?.load(this._order.id);
  }
  async _openCustomerOrdersModal() {
    if (!this._order || !u(this, g)) return;
    const e = this._order.billingAddress?.email;
    e && u(this, g).open(this, se, {
      data: {
        email: e,
        customerName: this._order.billingAddress?.name || "Customer"
      }
    });
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
    const i = [];
    e.name && i.push(e.name), e.company && i.push(e.company), e.addressOne && i.push(e.addressOne), e.addressTwo && i.push(e.addressTwo);
    const t = [e.townCity, e.countyState, e.postalCode].filter(Boolean).join(" ");
    return t && i.push(t), e.country && i.push(e.country), e.phone && i.push(e.phone), i;
  }
  _renderMarkdown(e) {
    q.setOptions({ breaks: !0, gfm: !0 });
    const i = q.parse(e), t = ee.sanitize(i);
    return Z(t);
  }
  _getGoogleMapsUrl(e) {
    if (!e) return "";
    const i = [e.townCity, e.postalCode, e.country].filter(Boolean);
    return i.length === 0 ? "" : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(i.join(", "))}`;
  }
  _startEditing(e) {
    this._order && (e === "contact" ? this._editFormData = { email: this._order.billingAddress?.email || "" } : e === "shipping" ? this._editFormData = this._order.shippingAddress ? { ...this._order.shippingAddress } : {} : e === "billing" && (this._editFormData = this._order.billingAddress ? { ...this._order.billingAddress } : {}), this._editingSection = e, this._validationErrors = {});
  }
  _cancelEditing() {
    this._editingSection = null, this._editFormData = {}, this._validationErrors = {};
  }
  _validateEmail(e) {
    return e ? /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e) : !0;
  }
  _validateAddress() {
    const e = {}, i = this._editFormData;
    return this._editingSection === "contact" ? i.email && !this._validateEmail(i.email) && (e.email = "Please enter a valid email address") : (i.name?.trim() || (e.name = "Name is required"), i.addressOne?.trim() || (e.addressOne = "Address is required"), i.townCity?.trim() || (e.townCity = "Town/City is required"), i.postalCode?.trim() || (e.postalCode = "Postal code is required"), i.countryCode || (e.countryCode = "Country is required")), this._validationErrors = e, Object.keys(e).length === 0;
  }
  async _saveEditing() {
    if (!this._order || !this._editingSection || !this._validateAddress())
      return;
    this._isSavingAddress = !0;
    let e;
    if (this._editingSection === "contact") {
      const i = {
        ...this._order.billingAddress,
        email: this._editFormData.email || null
      };
      e = await h.updateBillingAddress(this._order.id, i);
    } else if (this._editingSection === "shipping") {
      const i = {
        ...this._order.shippingAddress,
        ...this._editFormData
      };
      e = await h.updateShippingAddress(this._order.id, i);
    } else {
      const i = {
        ...this._order.billingAddress,
        ...this._editFormData
      };
      e = await h.updateBillingAddress(this._order.id, i);
    }
    if (u(this, f)) {
      if (this._isSavingAddress = !1, e.error) {
        console.error("Failed to save address:", e.error);
        return;
      }
      this._editingSection = null, this._editFormData = {}, this._validationErrors = {}, u(this, v)?.load(this._order.id);
    }
  }
  _startEditingPurchaseOrder() {
    this._order && (this._purchaseOrderValue = this._order.purchaseOrder || "", this._editingPurchaseOrder = !0);
  }
  _cancelEditingPurchaseOrder() {
    this._editingPurchaseOrder = !1, this._purchaseOrderValue = "";
  }
  async _savePurchaseOrder() {
    if (!this._order) return;
    this._isSavingPurchaseOrder = !0;
    const { error: e } = await h.updatePurchaseOrder(
      this._order.id,
      this._purchaseOrderValue.trim() || null
    );
    if (u(this, f)) {
      if (this._isSavingPurchaseOrder = !1, e) {
        console.error("Failed to save purchase order:", e);
        return;
      }
      this._editingPurchaseOrder = !1, this._purchaseOrderValue = "", u(this, v)?.load(this._order.id);
    }
  }
  _updateFormField(e, i) {
    if (this._editFormData = { ...this._editFormData, [e]: i || null }, this._validationErrors[e]) {
      const { [e]: t, ...s } = this._validationErrors;
      this._validationErrors = s;
    }
  }
  _renderInput(e, i, t, s = "text") {
    const r = !!this._validationErrors[e];
    return a`
      <div class="form-field ${r ? "has-error" : ""}">
        <uui-input
          type=${s}
          label=${i}
          placeholder=${t}
          .value=${this._editFormData[e] || ""}
          @input=${(l) => this._updateFormField(e, l.target.value)}
        ></uui-input>
        ${r ? a`<span class="field-error">${this._validationErrors[e]}</span>` : o}
      </div>
    `;
  }
  _getCountryOptions() {
    return [
      { name: "Select country...", value: "", selected: !this._editFormData.countryCode },
      ...this._countries.map((e) => ({
        name: e.name,
        value: e.code,
        selected: this._editFormData.countryCode === e.code
      }))
    ];
  }
  _renderCountrySelect() {
    const e = !!this._validationErrors.countryCode;
    return a`
      <div class="form-field ${e ? "has-error" : ""}">
        <uui-select
          label="Country"
          placeholder="Select country"
          .options=${this._getCountryOptions()}
          @change=${(i) => {
      const t = i.target, s = this._countries.find((r) => r.code === t.value);
      if (this._editFormData = {
        ...this._editFormData,
        countryCode: t.value || null,
        country: s?.name || null
      }, this._validationErrors.countryCode) {
        const { countryCode: r, ...l } = this._validationErrors;
        this._validationErrors = l;
      }
    }}
        ></uui-select>
        ${e ? a`<span class="field-error">${this._validationErrors.countryCode}</span>` : o}
      </div>
    `;
  }
  _renderFulfillmentCard(e) {
    const i = this._getStatusLabel(e.status), t = this._order?.fulfillmentStatus === "Fulfilled", s = e.status >= 50 ? "shipped" : "unfulfilled";
    return a`
      <div class="card fulfillment-card">
        <div class="fulfillment-header">
          <span class="fulfillment-status-badge ${s}">
            <uui-icon name="icon-box"></uui-icon>
            ${i}
          </span>
        </div>
        <div class="fulfillment-shipping-method">
          <uui-icon name="icon-truck"></uui-icon>
          <span>${e.deliveryMethod}</span>
        </div>
        <div class="fulfillment-line-items">
          ${e.lineItems.map(
      (r) => a`
              <div class="fulfillment-line-item">
                <div class="fulfillment-item-image">
                  ${r.imageUrl ? a`<img src="${r.imageUrl}" alt="${r.name}" />` : a`<div class="fulfillment-placeholder-image"></div>`}
                </div>
                <div class="fulfillment-item-details">
                  <div class="fulfillment-item-name">${r.name}</div>
                  <div class="fulfillment-item-variant">${r.sku || ""}</div>
                </div>
                <div class="fulfillment-item-pricing">
                  <span class="fulfillment-item-price">${p(r.amount)}</span>
                  <span class="fulfillment-item-multiply">×</span>
                  <span class="fulfillment-item-qty">${r.quantity}</span>
                </div>
                <div class="fulfillment-item-total">${p(r.amount * r.quantity)}</div>
              </div>
            `
    )}
        </div>
        <div class="fulfillment-footer">
          <div class="fulfillment-actions">
            <uui-button
              look="${t ? "secondary" : "primary"}"
              label="${t ? "Fulfilled" : "Fulfil"}"
              ?disabled=${t}
              @click=${t ? o : this._openFulfillmentModal}
            >
              ${t ? "Fulfilled" : "Fulfil"}
            </uui-button>
            <uui-button look="outline" label="Create shipping label">
              Create shipping label
            </uui-button>
          </div>
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
  _getDateGroupLabel(e) {
    const i = /* @__PURE__ */ new Date(), t = new Date(i);
    t.setDate(t.getDate() - 1);
    const s = e.toDateString() === i.toDateString(), r = e.toDateString() === t.toDateString();
    return s ? "Today" : r ? "Yesterday" : e.toLocaleDateString(void 0, { weekday: "long", month: "long", day: "numeric" });
  }
  _formatTimeOnly(e) {
    return new Date(e).toLocaleTimeString(void 0, { hour: "2-digit", minute: "2-digit" });
  }
  _groupNotesByDate(e) {
    const i = /* @__PURE__ */ new Map(), t = [...e].sort((s, r) => new Date(r.date).getTime() - new Date(s.date).getTime());
    for (const s of t) {
      const r = new Date(s.date), l = this._getDateGroupLabel(r);
      i.has(l) || i.set(l, []), i.get(l).push(s);
    }
    return i;
  }
  _handleTabClick(e) {
    this._activeTab = e;
  }
  _handlePaymentChange() {
    this._order && u(this, v)?.load(this._order.id);
  }
  async _handlePostNote() {
    if (!this._order || !this._newNoteText.trim()) return;
    this._isPostingNote = !0, this._noteError = null;
    const { error: e } = await h.addInvoiceNote(this._order.id, {
      text: this._newNoteText.trim(),
      visibleToCustomer: this._visibleToCustomer
    });
    if (u(this, f)) {
      if (this._isPostingNote = !1, e) {
        this._noteError = e.message || "Failed to post note", console.error("Failed to post note:", e);
        return;
      }
      this._newNoteText = "", this._visibleToCustomer = !1, u(this, v)?.load(this._order.id);
    }
  }
  _renderLoadingState() {
    return a`<div class="loading"><uui-loader></uui-loader></div>`;
  }
  _renderNotFoundState() {
    return a`<div class="error">Order not found</div>`;
  }
  render() {
    if (this._isLoading)
      return this._renderLoadingState();
    if (!this._order)
      return this._renderNotFoundState();
    const e = this._order;
    return a`
      <umb-body-layout header-fit-height main-no-padding>
      <div class="order-detail">
        <!-- Header -->
        <div class="order-header">
          <div class="header-left">
            <h1>${e.invoiceNumber || "Order"}</h1>
            <span class="badge ${this._getPaymentStatusBadgeClass(e.paymentStatus)}">${e.paymentStatusDisplay}</span>
            <span class="badge ${e.fulfillmentStatus.toLowerCase().replace(" ", "-")}">${e.fulfillmentStatus}</span>
          </div>
          <div class="header-right">
            <uui-button look="primary" label="Edit" @click=${this._openEditOrderModal}>Edit</uui-button>
          </div>
        </div>
        <div class="order-meta">
          ${te(e.dateCreated)} from ${e.channel}
        </div>

        <!-- Tabs -->
        <uui-tab-group>
          <uui-tab
            label="Details"
            ?active=${this._activeTab === "details"}
            @click=${() => this._handleTabClick("details")}
          >
            Details
          </uui-tab>
          <uui-tab
            label="Shipments"
            ?active=${this._activeTab === "shipments"}
            @click=${() => this._handleTabClick("shipments")}
          >
            Shipments
          </uui-tab>
          <uui-tab
            label="Payments"
            ?active=${this._activeTab === "payments"}
            @click=${() => this._handleTabClick("payments")}
          >
            Payments
          </uui-tab>
        </uui-tab-group>

        <!-- Tab Content -->
        ${this._activeTab === "shipments" ? a`<merchello-shipments-view></merchello-shipments-view>` : this._activeTab === "payments" ? a`
              <merchello-payment-panel
                invoiceId=${e.id}
                @payment-recorded=${this._handlePaymentChange}
                @refund-processed=${this._handlePaymentChange}
              ></merchello-payment-panel>
            ` : a`
        <!-- Main Content -->
        <div class="order-content">
          <!-- Left Column -->
          <div class="main-column">
            <!-- Fulfillment Cards -->
            ${e.orders.map((i) => this._renderFulfillmentCard(i))}

            <!-- Payment Summary -->
            <div class="card payment-card">
              <div class="card-header">
                <uui-checkbox checked disabled aria-label="Payment status"></uui-checkbox>
                <span>${e.paymentStatusDisplay}</span>
              </div>
              <div class="payment-summary">
                <div class="summary-row">
                  <span>Subtotal</span>
                  <span>${e.orders.reduce((i, t) => i + t.lineItems.reduce((s, r) => s + r.quantity, 0), 0)} items</span>
                  <span>${p(e.subTotal)}</span>
                </div>
                ${e.discountTotal > 0 ? a`
                  <div class="summary-row discount">
                    <span>Discounts</span>
                    <span></span>
                    <span>-${p(e.discountTotal)}</span>
                  </div>
                ` : o}
                <div class="summary-row">
                  <span>Shipping</span>
                  <span>${e.orders[0]?.deliveryMethod || "Standard"}</span>
                  <span>${p(e.shippingCost)}</span>
                </div>
                ${e.tax > 0 ? a`
                  <div class="summary-row">
                    <span>Tax</span>
                    <span></span>
                    <span>${p(e.tax)}</span>
                  </div>
                ` : o}
                <div class="summary-row total">
                  <span>Total</span>
                  <span></span>
                  <span>${p(e.total)}</span>
                </div>
                <div class="summary-row ${e.amountPaid > e.total ? "overpaid" : e.amountPaid < e.total ? "underpaid" : ""}">
                  <span>Paid</span>
                  <span></span>
                  <span>${p(e.amountPaid)}</span>
                </div>
                ${e.balanceDue !== 0 ? a`
                  <div class="summary-row balance ${e.balanceDue > 0 ? "underpaid" : "overpaid"}">
                    <span>${e.balanceDue > 0 ? "Balance Due" : "Credit Due"}</span>
                    <span></span>
                    <span>${e.balanceDue > 0 ? p(e.balanceDue) : p(Math.abs(e.balanceDue))}</span>
                  </div>
                ` : o}
              </div>
            </div>

            <!-- Timeline -->
            <div class="card timeline-card">
              <h3>Timeline</h3>
              <div class="timeline-comment-box">
                <div class="timeline-avatar">
                  ${this._currentUser?.email ? a`<img src="${this._getGravatarUrl(this._currentUser.email)}" alt="Avatar" />` : a`<uui-icon name="icon-user"></uui-icon>`}
                </div>
                <div class="timeline-input-wrapper">
                  <uui-textarea
                    placeholder="Leave a comment..."
                    .value=${this._newNoteText}
                    @input=${(i) => {
      this._newNoteText = i.target.value, this._noteError = null;
    }}
                  ></uui-textarea>
                  <div class="timeline-toolbar">
                    <uui-button
                      look="primary"
                      label="Post"
                      ?disabled=${!this._newNoteText.trim() || this._isPostingNote}
                      @click=${this._handlePostNote}
                    >
                      ${this._isPostingNote ? "Posting..." : "Post"}
                    </uui-button>
                  </div>
                  ${this._noteError ? a`<div class="note-error">${this._noteError}</div>` : o}
                </div>
              </div>
              <div class="timeline-visibility-note">
                <uui-checkbox
                  ?checked=${this._visibleToCustomer}
                  @change=${(i) => this._visibleToCustomer = i.target.checked}
                >
                  Visible to customer
                </uui-checkbox>
                <span class="visibility-hint">Only you and other staff can see comments</span>
              </div>
              <div class="timeline-events-container">
                ${e.notes.length === 0 ? a`<div class="no-notes">No timeline events yet</div>` : Array.from(this._groupNotesByDate(e.notes).entries()).map(
      ([i, t]) => a`
                        <div class="timeline-date-group">
                          <div class="timeline-date-header">${i}</div>
                          <div class="timeline-events">
                            ${t.map(
        (s) => a`
                                <div class="timeline-event ${s.visibleToCustomer ? "customer-visible" : ""}">
                                  <div class="timeline-event-dot"></div>
                                  <div class="timeline-event-content">
                                    ${s.visibleToCustomer ? a`<span class="customer-badge">Customer visible</span>` : o}
                                    <div class="event-text markdown-content">${this._renderMarkdown(s.text)}</div>
                                    ${s.author ? a`<span class="event-author">by ${s.author}</span>` : o}
                                  </div>
                                  <div class="timeline-event-time">${this._formatTimeOnly(s.date)}</div>
                                </div>
                              `
      )}
                          </div>
                        </div>
                      `
    )}
              </div>
            </div>
          </div>

          <!-- Right Column (Sidebar) -->
          <div class="sidebar">
            <!-- Purchase Order -->
            <div class="card">
              <div class="card-header-with-action">
                <h3>Purchase Order</h3>
                ${this._editingPurchaseOrder ? o : a`
                  <uui-button look="secondary" compact label="Edit purchase order" @click=${this._startEditingPurchaseOrder}>
                    <uui-icon name="icon-edit"></uui-icon>
                  </uui-button>
                `}
              </div>
              ${this._editingPurchaseOrder ? a`
                <div class="edit-form">
                  <uui-input
                    type="text"
                    label="Purchase Order"
                    placeholder="Enter PO number..."
                    .value=${this._purchaseOrderValue}
                    @input=${(i) => this._purchaseOrderValue = i.target.value}
                  ></uui-input>
                  <div class="edit-actions">
                    <uui-button look="secondary" label="Cancel" @click=${this._cancelEditingPurchaseOrder} ?disabled=${this._isSavingPurchaseOrder}>Cancel</uui-button>
                    <uui-button look="primary" label="Save" @click=${this._savePurchaseOrder} ?disabled=${this._isSavingPurchaseOrder}>
                      ${this._isSavingPurchaseOrder ? "Saving..." : "Save"}
                    </uui-button>
                  </div>
                </div>
              ` : a`
                <div class="purchase-order-value">
                  ${e.purchaseOrder ? a`<span>${e.purchaseOrder}</span>` : a`<span class="muted">No PO number</span>`}
                </div>
              `}
            </div>

            <!-- Customer -->
            <div class="card">
              <h3>Customer</h3>
              <div class="customer-info">
                <div class="customer-name">${e.billingAddress?.name || "Unknown"}</div>
                ${e.billingAddress?.email ? a`<button type="button" class="customer-orders-link" @click=${this._openCustomerOrdersModal}>${e.customerOrderCount} ${e.customerOrderCount === 1 ? "order" : "orders"}</button>` : a`<div class="muted">${e.customerOrderCount} ${e.customerOrderCount === 1 ? "order" : "orders"}</div>`}
              </div>
              <div class="section">
                <div class="section-header">
                  <span>Contact information</span>
                  ${this._editingSection !== "contact" ? a`
                    <uui-button look="secondary" compact label="Edit contact" @click=${() => this._startEditing("contact")}>
                      <uui-icon name="icon-edit"></uui-icon>
                    </uui-button>
                  ` : o}
                </div>
                ${this._editingSection === "contact" ? a`
                  <div class="edit-form">
                    ${this._renderInput("email", "Email", "Email address", "email")}
                    <div class="edit-actions">
                      <uui-button look="secondary" label="Cancel" @click=${this._cancelEditing} ?disabled=${this._isSavingAddress}>Cancel</uui-button>
                      <uui-button look="primary" label="Save" @click=${this._saveEditing} ?disabled=${this._isSavingAddress}>
                        ${this._isSavingAddress ? "Saving..." : "Save"}
                      </uui-button>
                    </div>
                  </div>
                ` : a`
                  ${e.billingAddress?.email ? a`<a href="mailto:${e.billingAddress.email}">${e.billingAddress.email}</a>` : a`<span class="muted">No email</span>`}
                `}
              </div>
              <div class="section">
                <div class="section-header">
                  <span>Shipping address</span>
                  ${this._editingSection !== "shipping" ? a`
                    <uui-button look="secondary" compact label="Edit shipping address" @click=${() => this._startEditing("shipping")}>
                      <uui-icon name="icon-edit"></uui-icon>
                    </uui-button>
                  ` : o}
                </div>
                ${this._editingSection === "shipping" ? a`
                  <div class="edit-form">
                    ${this._renderInput("name", "Name", "Name")}
                    ${this._renderInput("company", "Company", "Company")}
                    ${this._renderInput("addressOne", "Address Line 1", "Address Line 1")}
                    ${this._renderInput("addressTwo", "Address Line 2", "Address Line 2")}
                    ${this._renderInput("townCity", "Town/City", "Town/City")}
                    ${this._renderInput("countyState", "County/State", "County/State")}
                    ${this._renderInput("postalCode", "Postal Code", "Postal Code")}
                    ${this._renderCountrySelect()}
                    ${this._renderInput("phone", "Phone", "Phone", "tel")}
                    <div class="edit-actions">
                      <uui-button look="secondary" label="Cancel" @click=${this._cancelEditing} ?disabled=${this._isSavingAddress}>Cancel</uui-button>
                      <uui-button look="primary" label="Save" @click=${this._saveEditing} ?disabled=${this._isSavingAddress}>
                        ${this._isSavingAddress ? "Saving..." : "Save"}
                      </uui-button>
                    </div>
                  </div>
                ` : a`
                  <div class="address">
                    ${this._formatAddress(e.shippingAddress).map((i) => a`<div>${i}</div>`)}
                  </div>
                  ${this._getGoogleMapsUrl(e.shippingAddress) ? a`<a href=${this._getGoogleMapsUrl(e.shippingAddress)} target="_blank" rel="noopener noreferrer" class="view-map">View map</a>` : o}
                `}
              </div>
              <div class="section">
                <div class="section-header">
                  <span>Billing address</span>
                  ${this._editingSection !== "billing" ? a`
                    <uui-button look="secondary" compact label="Edit billing address" @click=${() => this._startEditing("billing")}>
                      <uui-icon name="icon-edit"></uui-icon>
                    </uui-button>
                  ` : o}
                </div>
                ${this._editingSection === "billing" ? a`
                  <div class="edit-form">
                    ${this._renderInput("name", "Name", "Name")}
                    ${this._renderInput("company", "Company", "Company")}
                    ${this._renderInput("addressOne", "Address Line 1", "Address Line 1")}
                    ${this._renderInput("addressTwo", "Address Line 2", "Address Line 2")}
                    ${this._renderInput("townCity", "Town/City", "Town/City")}
                    ${this._renderInput("countyState", "County/State", "County/State")}
                    ${this._renderInput("postalCode", "Postal Code", "Postal Code")}
                    ${this._renderCountrySelect()}
                    ${this._renderInput("phone", "Phone", "Phone", "tel")}
                    <div class="edit-actions">
                      <uui-button look="secondary" label="Cancel" @click=${this._cancelEditing} ?disabled=${this._isSavingAddress}>Cancel</uui-button>
                      <uui-button look="primary" label="Save" @click=${this._saveEditing} ?disabled=${this._isSavingAddress}>
                        ${this._isSavingAddress ? "Saving..." : "Save"}
                      </uui-button>
                    </div>
                  </div>
                ` : a`
                  ${e.billingAddress === e.shippingAddress ? a`<span class="muted">Same as shipping address</span>` : a`
                        <div class="address">
                          ${this._formatAddress(e.billingAddress).map((i) => a`<div>${i}</div>`)}
                        </div>
                      `}
                `}
              </div>
            </div>

            <!-- Tags -->
            <div class="card">
              <div class="card-header-with-action">
                <h3>Tags</h3>
                <uui-button look="secondary" compact label="Edit tags">
                  <uui-icon name="icon-edit"></uui-icon>
                </uui-button>
              </div>
              <uui-input type="text" placeholder="Add tags..." label="Tags"></uui-input>
            </div>
          </div>
        </div>
        `}
      </div>
      </umb-body-layout>
    `;
  }
};
v = /* @__PURE__ */ new WeakMap();
g = /* @__PURE__ */ new WeakMap();
f = /* @__PURE__ */ new WeakMap();
d.styles = F`
    :host {
      display: block;
      height: 100%;
      background: var(--uui-color-background);
    }

    .order-detail {
      padding: var(--uui-size-layout-1);
    }

    .loading {
      display: flex;
      justify-content: center;
      padding: var(--uui-size-layout-2);
    }

    .error {
      padding: var(--uui-size-space-4);
      background: var(--uui-color-danger-standalone);
      color: var(--uui-color-danger-contrast);
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

    uui-tab-group {
      margin-bottom: var(--uui-size-space-4);
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
      background: var(--uui-color-danger-standalone);
      color: var(--uui-color-danger-contrast);
    }

    .badge.fulfilled {
      background: var(--uui-color-positive-standalone);
      color: var(--uui-color-positive-contrast);
    }

    .badge.unfulfilled {
      background: var(--uui-color-warning-standalone);
      color: var(--uui-color-warning-contrast);
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

    /* Fulfillment Card - Shopify-like styling */
    .fulfillment-card {
      padding: 0;
      overflow: hidden;
    }

    .fulfillment-header {
      padding: var(--uui-size-space-4);
      border-bottom: 1px solid var(--uui-color-border);
    }

    .fulfillment-status-badge {
      display: inline-flex;
      align-items: center;
      gap: var(--uui-size-space-2);
      padding: 6px 12px;
      border-radius: 20px;
      font-size: 0.8125rem;
      font-weight: 600;
      background: var(--uui-color-warning-standalone);
      color: var(--uui-color-warning-contrast);
    }

    .fulfillment-status-badge uui-icon {
      font-size: 1rem;
    }

    .fulfillment-status-badge.shipped {
      background: var(--uui-color-positive-standalone);
      color: var(--uui-color-positive-contrast);
    }

    .fulfillment-shipping-method {
      display: flex;
      align-items: center;
      gap: var(--uui-size-space-2);
      padding: var(--uui-size-space-3) var(--uui-size-space-4);
      border-bottom: 1px solid var(--uui-color-border);
      font-size: 0.875rem;
      color: var(--uui-color-text);
    }

    .fulfillment-shipping-method uui-icon {
      color: var(--uui-color-text-alt);
    }

    .fulfillment-line-items {
      display: flex;
      flex-direction: column;
    }

    .fulfillment-line-item {
      display: grid;
      grid-template-columns: 56px 1fr auto auto;
      gap: var(--uui-size-space-4);
      align-items: center;
      padding: var(--uui-size-space-4);
      border-bottom: 1px solid var(--uui-color-border);
    }

    .fulfillment-line-item:last-child {
      border-bottom: none;
    }

    .fulfillment-item-image img,
    .fulfillment-placeholder-image {
      width: 56px;
      height: 56px;
      border-radius: 8px;
      object-fit: cover;
      border: 1px solid var(--uui-color-border);
    }

    .fulfillment-placeholder-image {
      background: var(--uui-color-surface-alt);
    }

    .fulfillment-item-details {
      display: flex;
      flex-direction: column;
      gap: 2px;
      min-width: 0;
    }

    .fulfillment-item-name {
      font-weight: 500;
      font-size: 0.875rem;
      color: var(--uui-color-text);
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .fulfillment-item-variant {
      font-size: 0.8125rem;
      color: var(--uui-color-text-alt);
    }

    .fulfillment-item-pricing {
      display: flex;
      align-items: center;
      gap: var(--uui-size-space-2);
      font-size: 0.875rem;
      color: var(--uui-color-text-alt);
      white-space: nowrap;
    }

    .fulfillment-item-multiply {
      color: var(--uui-color-text-alt);
    }

    .fulfillment-item-qty {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      min-width: 24px;
      height: 24px;
      padding: 0 6px;
      background: var(--uui-color-surface-alt);
      border-radius: 4px;
      font-size: 0.8125rem;
      font-weight: 500;
    }

    .fulfillment-item-total {
      font-size: 0.875rem;
      font-weight: 500;
      color: var(--uui-color-text);
      text-align: right;
      white-space: nowrap;
    }

    .fulfillment-footer {
      padding: var(--uui-size-space-4);
      border-top: 1px solid var(--uui-color-border);
      background: var(--uui-color-surface);
    }

    .fulfillment-actions {
      display: flex;
      justify-content: flex-end;
      gap: var(--uui-size-space-3);
    }

    .fulfillment-actions uui-button-group {
      display: flex;
    }

    /* Legacy styles for backward compatibility */
    .status-badge {
      padding: 2px 8px;
      border-radius: 12px;
      font-size: 0.75rem;
      font-weight: 500;
      background: var(--uui-color-warning-standalone);
      color: var(--uui-color-warning-contrast);
    }

    .status-badge.shipped {
      background: var(--uui-color-positive-standalone);
      color: var(--uui-color-positive-contrast);
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

    .summary-row.discount {
      color: var(--uui-color-positive);
    }

    .summary-row.underpaid {
      color: var(--uui-color-danger);
    }

    .summary-row.overpaid {
      color: var(--uui-color-warning);
    }

    .summary-row.balance {
      font-weight: 600;
      padding-top: var(--uui-size-space-2);
      border-top: 1px dashed var(--uui-color-border);
    }

    /* Timeline - Shopify-like styling */
    .timeline-card {
      padding: var(--uui-size-space-4);
    }

    .timeline-comment-box {
      display: flex;
      gap: var(--uui-size-space-3);
      margin-bottom: var(--uui-size-space-3);
    }

    .timeline-avatar {
      width: 40px;
      height: 40px;
      border-radius: 50%;
      background: var(--uui-color-surface-alt);
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
      color: var(--uui-color-text-alt);
      overflow: hidden;
    }

    .timeline-avatar img {
      width: 100%;
      height: 100%;
      object-fit: cover;
    }

    .timeline-avatar uui-icon {
      font-size: 1.25rem;
    }

    .timeline-input-wrapper {
      flex: 1;
      border: 1px solid var(--uui-color-border);
      border-radius: var(--uui-border-radius);
      overflow: hidden;
    }

    .timeline-input-wrapper uui-textarea {
      --uui-textarea-border-color: transparent;
      --uui-textarea-border-color-focus: transparent;
    }

    .timeline-input-wrapper textarea {
      width: 100%;
      padding: var(--uui-size-space-3);
      border: none;
      box-sizing: border-box;
      resize: none;
      font-family: inherit;
      font-size: 0.875rem;
      min-height: 60px;
    }

    .timeline-input-wrapper textarea:focus {
      outline: none;
    }

    .timeline-toolbar {
      display: flex;
      justify-content: flex-end;
      align-items: center;
      padding: var(--uui-size-space-2) var(--uui-size-space-3);
      background: var(--uui-color-surface);
      border-top: 1px solid var(--uui-color-border);
    }

    .note-error {
      color: var(--uui-color-danger);
      font-size: 0.875rem;
      padding: var(--uui-size-space-2) var(--uui-size-space-3);
    }

    .timeline-visibility-note {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: var(--uui-size-space-4);
      padding-left: 52px; /* Align with input (40px avatar + 12px gap) */
    }

    .customer-visible-checkbox {
      display: flex;
      align-items: center;
      gap: var(--uui-size-space-2);
      font-size: 0.8125rem;
      color: var(--uui-color-text);
      cursor: pointer;
    }

    .customer-visible-checkbox input {
      cursor: pointer;
    }

    .visibility-hint {
      font-size: 0.8125rem;
      color: var(--uui-color-text-alt);
    }

    .timeline-events-container {
      border-top: 1px solid var(--uui-color-border);
      padding-top: var(--uui-size-space-4);
    }

    .timeline-date-group {
      margin-bottom: var(--uui-size-space-4);
    }

    .timeline-date-header {
      font-size: 0.8125rem;
      font-weight: 500;
      color: var(--uui-color-text-alt);
      margin-bottom: var(--uui-size-space-3);
    }

    .timeline-events {
      position: relative;
      padding-left: var(--uui-size-space-5);
    }

    .timeline-events::before {
      content: '';
      position: absolute;
      left: 5px;
      top: 8px;
      bottom: 8px;
      width: 1px;
      background: var(--uui-color-border);
    }

    .timeline-event {
      display: grid;
      grid-template-columns: 1fr auto;
      gap: var(--uui-size-space-3);
      padding: var(--uui-size-space-2) 0;
      position: relative;
    }

    .timeline-event-dot {
      position: absolute;
      left: calc(-1 * var(--uui-size-space-5) + 2px);
      top: 10px;
      width: 8px;
      height: 8px;
      border-radius: 50%;
      background: var(--uui-color-text-alt);
    }

    .timeline-event.customer-visible .timeline-event-dot {
      background: var(--uui-color-current);
    }

    .timeline-event-content {
      display: flex;
      flex-direction: column;
      gap: 4px;
    }

    .customer-badge {
      display: inline-block;
      font-size: 0.7rem;
      font-weight: 500;
      color: var(--uui-color-current-contrast);
      background: var(--uui-color-current-standalone);
      padding: 2px 8px;
      border-radius: 10px;
      width: fit-content;
    }

    .event-text {
      font-size: 0.875rem;
      color: var(--uui-color-text);
      line-height: 1.5;
    }

    .event-author {
      font-size: 0.75rem;
      color: var(--uui-color-text-alt);
    }

    .timeline-event-time {
      font-size: 0.8125rem;
      color: var(--uui-color-text-alt);
      white-space: nowrap;
    }

    .no-notes {
      color: var(--uui-color-text-alt);
      font-style: italic;
      padding: var(--uui-size-space-2);
    }

    .sidebar .card {
      margin-bottom: var(--uui-size-space-3);
    }

    .muted {
      color: var(--uui-color-text-alt);
      font-size: 0.875rem;
    }

    .purchase-order-value {
      font-size: 0.875rem;
    }

    .customer-info {
      display: flex;
      flex-direction: column;
      gap: var(--uui-size-space-1);
    }

    .customer-name {
      color: var(--uui-color-text);
      font-weight: 500;
    }

    .customer-orders-link {
      display: inline-block;
      background: none;
      border: none;
      padding: 0;
      margin: 0;
      color: var(--uui-color-text-alt);
      font-size: 0.875rem;
      font-family: inherit;
      text-decoration: none;
      cursor: pointer;
      text-align: left;
    }

    .customer-orders-link:hover {
      color: var(--uui-color-interactive);
      text-decoration: underline;
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

    .edit-btn {
      background: none;
      border: none;
      cursor: pointer;
      padding: var(--uui-size-space-1);
      color: var(--uui-color-text-alt);
    }

    .edit-btn:hover {
      color: var(--uui-color-interactive);
    }

    .edit-form {
      display: flex;
      flex-direction: column;
      gap: var(--uui-size-space-2);
    }

    .edit-form uui-input,
    .edit-form uui-select {
      width: 100%;
    }

    .form-field {
      display: flex;
      flex-direction: column;
      gap: 4px;
    }

    .form-field.has-error uui-input,
    .form-field.has-error uui-select {
      --uui-input-border-color: #dc3545;
    }

    .field-error {
      color: #dc3545;
      font-size: 0.75rem;
    }

    .edit-actions {
      display: flex;
      gap: var(--uui-size-space-2);
      justify-content: flex-end;
      margin-top: var(--uui-size-space-2);
    }

    .tags-input {
      width: 100%;
      padding: var(--uui-size-space-2);
      border: 1px solid var(--uui-color-border);
      border-radius: var(--uui-border-radius);
      box-sizing: border-box;
    }

    /* Markdown content styles for timeline notes */
    .markdown-content {
      line-height: 1.5;
    }

    .markdown-content p {
      margin: 0 0 var(--uui-size-space-2) 0;
    }

    .markdown-content p:last-child {
      margin-bottom: 0;
    }

    .markdown-content ul,
    .markdown-content ol {
      margin: var(--uui-size-space-2) 0;
      padding-left: var(--uui-size-space-5);
    }

    .markdown-content li {
      margin: var(--uui-size-space-1) 0;
    }

    .markdown-content code {
      background: var(--uui-color-surface-alt);
      padding: 1px 4px;
      border-radius: 3px;
      font-family: monospace;
      font-size: 0.875em;
    }

    .markdown-content pre {
      background: var(--uui-color-surface-alt);
      padding: var(--uui-size-space-2);
      border-radius: var(--uui-border-radius);
      overflow-x: auto;
      margin: var(--uui-size-space-2) 0;
    }

    .markdown-content pre code {
      background: none;
      padding: 0;
    }

    .markdown-content a {
      color: var(--uui-color-interactive);
    }

    .markdown-content strong {
      font-weight: 600;
    }

    .markdown-content blockquote {
      border-left: 3px solid var(--uui-color-border-emphasis);
      margin: var(--uui-size-space-2) 0;
      padding-left: var(--uui-size-space-3);
      color: var(--uui-color-text-alt);
    }
  `;
c([
  n()
], d.prototype, "_order", 2);
c([
  n()
], d.prototype, "_isLoading", 2);
c([
  n()
], d.prototype, "_activeTab", 2);
c([
  n()
], d.prototype, "_newNoteText", 2);
c([
  n()
], d.prototype, "_visibleToCustomer", 2);
c([
  n()
], d.prototype, "_isPostingNote", 2);
c([
  n()
], d.prototype, "_noteError", 2);
c([
  n()
], d.prototype, "_currentUser", 2);
c([
  n()
], d.prototype, "_editingSection", 2);
c([
  n()
], d.prototype, "_editFormData", 2);
c([
  n()
], d.prototype, "_isSavingAddress", 2);
c([
  n()
], d.prototype, "_validationErrors", 2);
c([
  n()
], d.prototype, "_countries", 2);
c([
  n()
], d.prototype, "_editingPurchaseOrder", 2);
c([
  n()
], d.prototype, "_purchaseOrderValue", 2);
c([
  n()
], d.prototype, "_isSavingPurchaseOrder", 2);
d = c([
  R("merchello-order-detail")
], d);
const ke = d;
export {
  d as MerchelloOrderDetailElement,
  ke as default
};
//# sourceMappingURL=order-detail.element-B67boCZM.js.map
