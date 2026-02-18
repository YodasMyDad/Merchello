import { LitElement as q, nothing as s, html as a, css as K, state as n, customElement as X, property as se, unsafeHTML as _e } from "@umbraco-cms/backoffice/external/lit";
import { d as ee, p as ke } from "./purify.es-Cuv6u9x0.js";
import { UmbElementMixin as Y } from "@umbraco-cms/backoffice/element-api";
import { UMB_WORKSPACE_CONTEXT as oe } from "@umbraco-cms/backoffice/workspace";
import { UmbModalToken as G, UMB_MODAL_MANAGER_CONTEXT as Z, UMB_CONFIRM_MODAL as ie } from "@umbraco-cms/backoffice/modal";
import { UMB_NOTIFICATION_CONTEXT as ne } from "@umbraco-cms/backoffice/notification";
import { UMB_CURRENT_USER_CONTEXT as xe } from "@umbraco-cms/backoffice/current-user";
import { M as $e } from "./edit-order-modal.token-BUHVPYdq.js";
import { M as Ce, a as we } from "./customer-orders-modal.token-BBooCVRJ.js";
import { b as N, a as h, g as Se } from "./formatting-B_f6AiQh.js";
import { M as g } from "./merchello-api-Dp_zU_yi.js";
import { t as ze } from "./navigation-CvTcY6zJ.js";
import { S as J, P as te } from "./order.types-_o7xLk2Z.js";
import "./line-item-identity.element-DGDuhyV5.js";
const Pe = new G("Merchello.Fulfillment.Modal", {
  modal: {
    type: "sidebar",
    size: "large"
  }
}), Ie = new G("Merchello.CancelInvoice.Modal", {
  modal: {
    type: "sidebar",
    size: "small"
  }
}), Me = new G("Merchello.ShipmentEdit.Modal", {
  modal: {
    type: "sidebar",
    size: "medium"
  }
});
var Ee = Object.defineProperty, De = Object.getOwnPropertyDescriptor, le = (e) => {
  throw TypeError(e);
}, y = (e, i, t, o) => {
  for (var r = o > 1 ? void 0 : o ? De(i, t) : i, l = e.length - 1, p; l >= 0; l--)
    (p = e[l]) && (r = (o ? p(i, t, r) : p(r)) || r);
  return o && r && Ee(i, t, r), r;
}, ue = (e, i, t) => i.has(e) || le("Cannot " + t), d = (e, i, t) => (ue(e, i, "read from private field"), i.get(e)), W = (e, i, t) => i.has(e) ? le("Cannot add the same private member more than once") : i instanceof WeakSet ? i.add(e) : i.set(e, t), B = (e, i, t, o) => (ue(e, i, "write to private field"), i.set(e, t), t), P, E, _, C;
let f = class extends Y(q) {
  constructor() {
    super(), this._invoiceId = null, this._fulfillmentData = null, this._isLoading = !0, this._errorMessage = null, this._expandedShipmentId = null, this._trackingForm = { carrier: "", trackingNumber: "", trackingUrl: "" }, this._isUpdatingStatus = !1, this._hasOutstandingBalance = !1, this._paymentStatusDisplay = "", this._balanceDue = 0, this._currencyCode = "", this._currencySymbol = "", W(this, P), W(this, E), W(this, _), W(this, C, !1), this.consumeContext(oe, (e) => {
      B(this, P, e), d(this, P) && this.observe(d(this, P).order, (i) => {
        this._syncPaymentState(i), i?.id && i.id !== this._invoiceId && (this._invoiceId = i.id, this._loadShipments());
      }, "_observeOrder");
    }), this.consumeContext(Z, (e) => {
      B(this, E, e);
    }), this.consumeContext(ne, (e) => {
      B(this, _, e);
    });
  }
  connectedCallback() {
    super.connectedCallback(), B(this, C, !0);
  }
  disconnectedCallback() {
    super.disconnectedCallback(), B(this, C, !1);
  }
  async _loadShipments() {
    if (!this._invoiceId) return;
    this._isLoading = !0, this._errorMessage = null;
    const { data: e, error: i } = await g.getFulfillmentSummary(this._invoiceId);
    d(this, C) && (i ? this._errorMessage = i.message : this._fulfillmentData = e ?? null, this._isLoading = !1);
  }
  _syncPaymentState(e) {
    const i = e?.balanceDue ?? 0;
    this._hasOutstandingBalance = i > 0, this._paymentStatusDisplay = e?.paymentStatusDisplay ?? "", this._balanceDue = i, this._currencyCode = e?.currencyCode ?? "", this._currencySymbol = e?.currencySymbol ?? "";
  }
  async _handleEditShipment(e) {
    if (!d(this, E)) return;
    (await d(this, E).open(this, Me, {
      data: { shipment: e }
    }).onSubmit().catch(() => {
    }))?.isUpdated && this._loadShipments();
  }
  async _handleDeleteShipment(e) {
    const i = d(this, E)?.open(this, ie, {
      data: {
        headline: "Delete Shipment",
        content: "Are you sure you want to delete this shipment? This will release the items back to unfulfilled.",
        confirmLabel: "Delete",
        color: "danger"
      }
    });
    try {
      await i?.onSubmit();
    } catch {
      return;
    }
    if (!d(this, C)) return;
    const { error: t } = await g.deleteShipment(e.id);
    if (d(this, C)) {
      if (t) {
        d(this, _)?.peek("danger", {
          data: { headline: "Failed to delete", message: t.message }
        });
        return;
      }
      this._loadShipments(), this._invoiceId && d(this, P)?.load(this._invoiceId);
    }
  }
  _toggleMarkAsShippedForm(e) {
    this._expandedShipmentId === e.id ? (this._expandedShipmentId = null, this._trackingForm = { carrier: "", trackingNumber: "", trackingUrl: "" }) : (this._expandedShipmentId = e.id, this._trackingForm = {
      carrier: e.carrier ?? "",
      trackingNumber: e.trackingNumber ?? "",
      trackingUrl: e.trackingUrl ?? ""
    });
  }
  _handleTrackingFormChange(e, i) {
    this._trackingForm = { ...this._trackingForm, [e]: i };
  }
  async _handleMarkAsShipped(e) {
    this._isUpdatingStatus = !0;
    const { error: i } = await g.updateShipmentStatus(e.id, {
      newStatus: J.Shipped,
      carrier: this._trackingForm.carrier || void 0,
      trackingNumber: this._trackingForm.trackingNumber || void 0,
      trackingUrl: this._trackingForm.trackingUrl || void 0
    });
    if (d(this, C)) {
      if (this._isUpdatingStatus = !1, i) {
        d(this, _)?.peek("danger", {
          data: { headline: "Failed to update status", message: i.message }
        });
        return;
      }
      d(this, _)?.peek("positive", {
        data: { headline: "Shipment marked as shipped", message: "Status updated successfully" }
      }), this._expandedShipmentId = null, this._trackingForm = { carrier: "", trackingNumber: "", trackingUrl: "" }, this._loadShipments(), this._invoiceId && d(this, P)?.load(this._invoiceId);
    }
  }
  async _handleMarkAsDelivered(e) {
    this._isUpdatingStatus = !0;
    const { error: i } = await g.updateShipmentStatus(e.id, {
      newStatus: J.Delivered
    });
    if (d(this, C)) {
      if (this._isUpdatingStatus = !1, i) {
        d(this, _)?.peek("danger", {
          data: { headline: "Failed to update status", message: i.message }
        });
        return;
      }
      d(this, _)?.peek("positive", {
        data: { headline: "Shipment marked as delivered", message: "Status updated successfully" }
      }), this._loadShipments(), this._invoiceId && d(this, P)?.load(this._invoiceId);
    }
  }
  async _handleCancelShipment(e) {
    const i = d(this, E)?.open(this, ie, {
      data: {
        headline: "Cancel Shipment",
        content: "Are you sure you want to cancel this shipment? This will release the items back to unfulfilled.",
        confirmLabel: "Cancel Shipment",
        color: "danger"
      }
    });
    try {
      await i?.onSubmit();
    } catch {
      return;
    }
    if (!d(this, C)) return;
    this._isUpdatingStatus = !0;
    const { error: t } = await g.updateShipmentStatus(e.id, {
      newStatus: J.Cancelled
    });
    if (d(this, C)) {
      if (this._isUpdatingStatus = !1, t) {
        d(this, _)?.peek("danger", {
          data: { headline: "Failed to cancel shipment", message: t.message }
        });
        return;
      }
      d(this, _)?.peek("positive", {
        data: { headline: "Shipment cancelled", message: "Items released back to unfulfilled" }
      }), this._loadShipments(), this._invoiceId && d(this, P)?.load(this._invoiceId);
    }
  }
  _renderShipmentCard(e, i) {
    const t = this._getCarrierClass(e.carrier), o = this._expandedShipmentId === e.id;
    return a`
      <div class="shipment-card">
        <div class="shipment-header">
          <div class="header-left">
            <span class="shipment-status-badge ${e.statusCssClass}">${e.statusLabel}</span>
            ${e.carrier ? a`<span class="carrier-badge ${t}">${e.carrier}</span>` : s}
            <span class="shipment-date">Created ${N(e.dateCreated)}</span>
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

        ${this._renderStatusActions(e, o)}

        <div class="shipment-details">
          <div class="detail-row">
            <span class="label">Warehouse:</span>
            <span class="value">${i}</span>
          </div>
          ${e.shippedDate ? a`
                <div class="detail-row">
                  <span class="label">Shipped:</span>
                  <span class="value">${N(e.shippedDate)}</span>
                </div>
              ` : s}
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
              ` : s}
          ${e.actualDeliveryDate ? a`
                <div class="detail-row">
                  <span class="label">Delivered:</span>
                  <span class="value delivered">${N(e.actualDeliveryDate)}</span>
                </div>
              ` : s}
        </div>

        <div class="shipment-items">
          <h4>Items in shipment</h4>
          ${e.lineItems.map(
      (r) => a`
              <div class="item-row">
                <merchello-line-item-identity
                  .mediaKey=${r.imageUrl ?? null}
                  name=${r.productRootName || r.name || ""}
                  .selectedOptions=${r.selectedOptions ?? []}
                  sku=${r.sku || ""}
                  size="medium">
                </merchello-line-item-identity>
                <div class="item-qty">x${r.quantity}</div>
              </div>
            `
    )}
        </div>
      </div>
    `;
  }
  _renderStatusActions(e, i) {
    return !e.canMarkAsShipped && !e.canMarkAsDelivered && !e.canCancel ? s : a`
      <div class="status-actions">
        ${e.canMarkAsShipped ? a`
              <uui-button
                look="primary"
                color="positive"
                compact
                label="Mark as Shipped"
                ?disabled=${this._isUpdatingStatus}
                @click=${() => this._toggleMarkAsShippedForm(e)}
              >
                <uui-icon name="icon-truck"></uui-icon>
                Mark as Shipped
              </uui-button>
            ` : s}
        ${e.canMarkAsDelivered ? a`
              <uui-button
                look="primary"
                color="positive"
                compact
                label="Mark as Delivered"
                ?disabled=${this._isUpdatingStatus}
                @click=${() => this._handleMarkAsDelivered(e)}
              >
                <uui-icon name="icon-check"></uui-icon>
                Mark as Delivered
              </uui-button>
            ` : s}
        ${e.canCancel ? a`
              <uui-button
                look="secondary"
                color="danger"
                compact
                label="Cancel Shipment"
                ?disabled=${this._isUpdatingStatus}
                @click=${() => this._handleCancelShipment(e)}
              >
                Cancel
              </uui-button>
            ` : s}
      </div>

      ${i ? this._renderTrackingForm(e) : s}
    `;
  }
  _renderTrackingForm(e) {
    return a`
      <div class="tracking-form">
        <h4>Add tracking information (optional)</h4>
        <div class="form-row">
          <uui-form-layout-item>
            <uui-label slot="label">Carrier</uui-label>
            <uui-input
              label="Carrier"
              placeholder="e.g., UPS, FedEx, DHL"
              .value=${this._trackingForm.carrier}
              @input=${(i) => this._handleTrackingFormChange("carrier", i.target.value)}
            ></uui-input>
          </uui-form-layout-item>
          <uui-form-layout-item>
            <uui-label slot="label">Tracking Number</uui-label>
            <uui-input
              label="Tracking Number"
              placeholder="Tracking number"
              .value=${this._trackingForm.trackingNumber}
              @input=${(i) => this._handleTrackingFormChange("trackingNumber", i.target.value)}
            ></uui-input>
          </uui-form-layout-item>
          <uui-form-layout-item>
            <uui-label slot="label">Tracking URL</uui-label>
            <uui-input
              label="Tracking URL"
              placeholder="https://..."
              .value=${this._trackingForm.trackingUrl}
              @input=${(i) => this._handleTrackingFormChange("trackingUrl", i.target.value)}
            ></uui-input>
          </uui-form-layout-item>
        </div>
        <div class="form-actions">
          <uui-button
            look="primary"
            color="positive"
            label="Confirm Shipped"
            ?disabled=${this._isUpdatingStatus}
            @click=${() => this._handleMarkAsShipped(e)}
          >
            ${this._isUpdatingStatus ? a`<uui-loader-circle></uui-loader-circle>` : "Confirm Shipped"}
          </uui-button>
          <uui-button
            look="secondary"
            label="Cancel"
            ?disabled=${this._isUpdatingStatus}
            @click=${() => this._toggleMarkAsShippedForm(e)}
          >
            Cancel
          </uui-button>
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
      await navigator.clipboard.writeText(e), d(this, _)?.peek("positive", {
        data: { headline: "Copied", message: "Tracking number copied to clipboard" }
      });
    } catch {
      d(this, _)?.peek("danger", {
        data: { headline: "Copy failed", message: "Unable to copy tracking number" }
      });
    }
  }
  _renderOutstandingPaymentWarning() {
    if (!this._hasOutstandingBalance)
      return s;
    const e = this._paymentStatusDisplay?.trim(), i = h(this._balanceDue, this._currencyCode, this._currencySymbol);
    return a`
      <div class="payment-warning" role="status" aria-live="polite">
        <uui-icon name="icon-alert"></uui-icon>
        <div class="payment-warning-content">
          <strong>Payment outstanding</strong>
          <p>
            ${e ? `${e}.` : "This invoice is not fully paid."}
            Shipping actions are available for this order.
            Outstanding balance: <strong>${i}</strong>.
          </p>
        </div>
      </div>
    `;
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
        <div class="shipments-view">
          ${this._renderOutstandingPaymentWarning()}
          <div class="empty-state">
            <uui-icon name="icon-box"></uui-icon>
            <h3>No shipments yet</h3>
            <p>Use the "Fulfill" button on the Details tab to create shipments for this order.</p>
          </div>
        </div>
      ` : a`
      <div class="shipments-view">
        ${this._renderOutstandingPaymentWarning()}
        <div class="header">
          <h2>Shipments</h2>
          <div class="summary">
            <span class="status-badge ${this._fulfillmentData.overallStatusCssClass}">
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
_ = /* @__PURE__ */ new WeakMap();
C = /* @__PURE__ */ new WeakMap();
f.styles = K`
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

    .payment-warning {
      display: flex;
      gap: var(--uui-size-space-3);
      align-items: flex-start;
      background: var(--uui-color-warning-standalone);
      color: var(--uui-color-warning-contrast);
      border-radius: var(--uui-border-radius);
      padding: var(--uui-size-space-3);
      margin-bottom: var(--uui-size-space-4);
    }

    .payment-warning uui-icon {
      font-size: 1.25rem;
      flex-shrink: 0;
      margin-top: 2px;
    }

    .payment-warning-content strong {
      display: block;
      margin-bottom: var(--uui-size-space-1);
    }

    .payment-warning-content p {
      margin: 0;
      line-height: 1.4;
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
      background: var(--merchello-color-warning-status-background, #8a6500);
      color: #fff;
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

    /* Shipment status badge styles */
    .shipment-status-badge {
      padding: 4px 12px;
      border-radius: 12px;
      font-size: 0.75rem;
      font-weight: 600;
      text-transform: capitalize;
    }

    .shipment-status-badge.preparing {
      background: var(--merchello-color-warning-status-background, #8a6500);
      color: #fff;
    }

    .shipment-status-badge.shipped {
      background: var(--uui-color-current-standalone);
      color: var(--uui-color-current-contrast);
    }

    .shipment-status-badge.delivered {
      background: var(--uui-color-positive-standalone);
      color: var(--uui-color-positive-contrast);
    }

    .shipment-status-badge.cancelled {
      background: var(--uui-color-danger-standalone);
      color: var(--uui-color-danger-contrast);
    }

    .carrier-badge {
      padding: 4px 12px;
      border-radius: 4px;
      font-size: 0.75rem;
      font-weight: 600;
      text-transform: uppercase;
      background: var(--uui-color-text-alt);
      color: #fff;
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

    /* Status actions section */
    .status-actions {
      display: flex;
      gap: var(--uui-size-space-2);
      margin-bottom: var(--uui-size-space-3);
      padding: var(--uui-size-space-3);
      background: var(--uui-color-surface-alt);
      border-radius: var(--uui-border-radius);
    }

    /* Tracking form styles */
    .tracking-form {
      margin-bottom: var(--uui-size-space-3);
      padding: var(--uui-size-space-4);
      background: var(--uui-color-surface-alt);
      border-radius: var(--uui-border-radius);
      border: 1px solid var(--uui-color-border);
    }

    .tracking-form h4 {
      margin: 0 0 var(--uui-size-space-3);
      font-size: 0.875rem;
      font-weight: 600;
      color: var(--uui-color-text);
    }

    .tracking-form .form-row {
      display: grid;
      grid-template-columns: 1fr 1fr 1fr;
      gap: var(--uui-size-space-3);
      margin-bottom: var(--uui-size-space-3);
    }

    .tracking-form .form-actions {
      display: flex;
      gap: var(--uui-size-space-2);
      justify-content: flex-end;
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

    merchello-line-item-identity {
      flex: 1;
      min-width: 0;
    }

    .item-qty {
      font-weight: 600;
      font-size: 0.875rem;
    }

    @media (max-width: 768px) {
      .tracking-form .form-row {
        grid-template-columns: 1fr;
      }
    }
  `;
y([
  n()
], f.prototype, "_invoiceId", 2);
y([
  n()
], f.prototype, "_fulfillmentData", 2);
y([
  n()
], f.prototype, "_isLoading", 2);
y([
  n()
], f.prototype, "_errorMessage", 2);
y([
  n()
], f.prototype, "_expandedShipmentId", 2);
y([
  n()
], f.prototype, "_trackingForm", 2);
y([
  n()
], f.prototype, "_isUpdatingStatus", 2);
y([
  n()
], f.prototype, "_hasOutstandingBalance", 2);
y([
  n()
], f.prototype, "_paymentStatusDisplay", 2);
y([
  n()
], f.prototype, "_balanceDue", 2);
y([
  n()
], f.prototype, "_currencyCode", 2);
y([
  n()
], f.prototype, "_currencySymbol", 2);
f = y([
  X("merchello-shipments-view")
], f);
const Le = new G("Merchello.ManualPayment.Modal", {
  modal: {
    type: "sidebar",
    size: "medium"
  }
}), Ae = new G("Merchello.Refund.Modal", {
  modal: {
    type: "sidebar",
    size: "medium"
  }
});
var Te = Object.defineProperty, Oe = Object.getOwnPropertyDescriptor, de = (e) => {
  throw TypeError(e);
}, R = (e, i, t, o) => {
  for (var r = o > 1 ? void 0 : o ? Oe(i, t) : i, l = e.length - 1, p; l >= 0; l--)
    (p = e[l]) && (r = (o ? p(i, t, r) : p(r)) || r);
  return o && r && Te(i, t, r), r;
}, ce = (e, i, t) => i.has(e) || de("Cannot " + t), T = (e, i, t) => (ce(e, i, "read from private field"), i.get(e)), ae = (e, i, t) => i.has(e) ? de("Cannot add the same private member more than once") : i instanceof WeakSet ? i.add(e) : i.set(e, t), Q = (e, i, t, o) => (ce(e, i, "write to private field"), i.set(e, t), t), D, F;
let M = class extends Y(q) {
  constructor() {
    super(), this.invoiceId = "", this._payments = [], this._status = null, this._isLoading = !0, this._errorMessage = null, ae(this, D), ae(this, F, !1), this.consumeContext(Z, (e) => {
      Q(this, D, e);
    });
  }
  connectedCallback() {
    super.connectedCallback(), Q(this, F, !0), this.invoiceId && this._loadPayments();
  }
  disconnectedCallback() {
    super.disconnectedCallback(), Q(this, F, !1);
  }
  updated(e) {
    e.has("invoiceId") && this.invoiceId && this._loadPayments();
  }
  async _loadPayments() {
    if (this.invoiceId) {
      this._isLoading = !0, this._errorMessage = null;
      try {
        const [e, i] = await Promise.all([
          g.getInvoicePayments(this.invoiceId),
          g.getPaymentStatus(this.invoiceId)
        ]);
        if (!T(this, F)) return;
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
        if (!T(this, F)) return;
        this._errorMessage = e instanceof Error ? e.message : "Failed to load payments";
      }
      this._isLoading = !1;
    }
  }
  async _openManualPaymentModal() {
    if (!T(this, D) || !this._status) return;
    (await T(this, D).open(this, Le, {
      data: {
        invoiceId: this.invoiceId,
        balanceDue: this._status.balanceDue,
        currencyCode: this._status.currencyCode,
        currencySymbol: this._status.currencySymbol
      }
    }).onSubmit().catch(() => {
    }))?.recorded && (await this._loadPayments(), this.dispatchEvent(new CustomEvent("payment-recorded", {
      detail: { invoiceId: this.invoiceId },
      bubbles: !0,
      composed: !0
    })));
  }
  async _openRefundModal(e) {
    if (!T(this, D)) return;
    (await T(this, D).open(this, Ae, {
      data: { payment: e }
    }).onSubmit().catch(() => {
    }))?.refunded && (await this._loadPayments(), this.dispatchEvent(new CustomEvent("refund-processed", {
      detail: { invoiceId: this.invoiceId },
      bubbles: !0,
      composed: !0
    })));
  }
  _renderPayment(e) {
    const i = e.paymentType === te.Refund || e.paymentType === te.PartialRefund;
    return a`
      <div class="payment-item ${i ? "refund" : ""}">
        <div class="payment-main">
          <div class="payment-info">
            <div class="payment-method">
              ${i ? a`<uui-icon name="icon-undo"></uui-icon>` : a`<uui-icon name="icon-credit-card"></uui-icon>`}
              <span>${e.paymentMethod ?? "Payment"}</span>
              ${e.paymentProviderAlias ? a`<span class="provider-badge">${e.paymentProviderAlias}</span>` : s}
            </div>
            <div class="payment-date">${N(e.dateCreated)}</div>
            ${e.transactionId ? a`<div class="transaction-id">ID: ${e.transactionId}</div>` : s}
            ${e.riskScore != null ? a`<div class="risk-score ${e.riskLevel ? `${e.riskLevel}-risk` : "minimal-risk"}">
                  Risk: ${e.riskScore}%
                  ${e.riskScoreSource ? a`<span class="risk-source">(${e.riskScoreSource})</span>` : s}
                </div>` : s}
            ${e.description ? a`<div class="payment-description">${e.description}</div>` : s}
            ${e.refundReason ? a`<div class="refund-reason">Reason: ${e.refundReason}</div>` : s}
          </div>
          <div class="payment-amount ${i ? "negative" : ""}">
            ${i ? "-" : ""}${h(Math.abs(e.amount), e.currencyCode, e.currencySymbol)}
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
                ` : s}
          </div>
        </div>
        ${e.refunds && e.refunds.length > 0 ? a`
              <div class="refunds-list">
                ${e.refunds.map((t) => this._renderPayment(t))}
              </div>
            ` : s}
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
            <div class="status-badges">
              <span class="status-badge ${e?.statusCssClass ?? "unpaid"}">
                ${e?.statusDisplay ?? "Unknown"}
              </span>
              ${e?.maxRiskScore != null ? a`<span class="risk-badge ${e.riskLevel ? `${e.riskLevel}-risk` : "minimal-risk"}">
                    <uui-icon name="icon-alert"></uui-icon>
                    Risk: ${e.maxRiskScore}%
                  </span>` : s}
            </div>
            ${e?.balanceStatusCssClass === "underpaid" ? a`
                <uui-button
                  look="primary"
                  color="positive"
                  label="Record Payment"
                  @click=${this._openManualPaymentModal}
                >
                    <uui-icon name="icon-add"></uui-icon>
                    Record Payment
                  </uui-button>
                ` : s}
          </div>

          ${e ? a`
                <div class="status-details">
                  <div class="status-row">
                    <span>Invoice Total</span>
                    <span>${h(e.invoiceTotal, e.currencyCode, e.currencySymbol)}</span>
                  </div>
                  <div class="status-row">
                    <span>Total Paid</span>
                    <span class="positive">${h(e.totalPaid, e.currencyCode, e.currencySymbol)}</span>
                  </div>
                  ${e.totalRefunded > 0 ? a`
                        <div class="status-row">
                          <span>Total Refunded</span>
                          <span class="negative">-${h(e.totalRefunded, e.currencyCode, e.currencySymbol)}</span>
                        </div>
                      ` : s}
                  <div class="status-row total">
                    <span>${e.balanceStatusLabel || "Balance Due"}</span>
                    <span class="${e.balanceStatusCssClass === "underpaid" ? "negative" : ""}">
                      ${h(e.balanceDue, e.currencyCode, e.currencySymbol)}
                    </span>
                  </div>
                </div>
              ` : s}
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
D = /* @__PURE__ */ new WeakMap();
F = /* @__PURE__ */ new WeakMap();
M.styles = K`
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

    .status-badges {
      display: flex;
      align-items: center;
      gap: var(--uui-size-space-2);
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
      background: var(--merchello-color-warning-status-background, #8a6500);
      color: #fff;
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

    .risk-badge {
      display: inline-flex;
      align-items: center;
      gap: var(--uui-size-space-1);
      padding: 4px 10px;
      border-radius: 12px;
      font-size: 0.75rem;
      font-weight: 500;
    }

    .risk-score {
      display: inline-flex;
      align-items: center;
      gap: var(--uui-size-space-1);
      font-size: 0.75rem;
      padding: 2px 8px;
      border-radius: 8px;
    }

    .risk-source {
      opacity: 0.7;
    }

    .high-risk {
      background: var(--uui-color-danger-standalone);
      color: var(--uui-color-danger-contrast);
    }

    .medium-risk {
      background: var(--uui-color-warning-standalone);
      color: var(--uui-color-warning-contrast);
    }

    .low-risk {
      background: var(--uui-color-default-standalone);
      color: var(--uui-color-default-contrast);
    }

    .minimal-risk {
      background: var(--uui-color-positive-standalone);
      color: var(--uui-color-positive-contrast);
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
R([
  se({ type: String })
], M.prototype, "invoiceId", 2);
R([
  n()
], M.prototype, "_payments", 2);
R([
  n()
], M.prototype, "_status", 2);
R([
  n()
], M.prototype, "_isLoading", 2);
R([
  n()
], M.prototype, "_errorMessage", 2);
M = R([
  X("merchello-payment-panel")
], M);
var Fe = Object.defineProperty, Ne = Object.getOwnPropertyDescriptor, pe = (e) => {
  throw TypeError(e);
}, z = (e, i, t, o) => {
  for (var r = o > 1 ? void 0 : o ? Ne(i, t) : i, l = e.length - 1, p; l >= 0; l--)
    (p = e[l]) && (r = (o ? p(i, t, r) : p(r)) || r);
  return o && r && Fe(i, t, r), r;
}, me = (e, i, t) => i.has(e) || pe("Cannot " + t), O = (e, i, t) => (me(e, i, "read from private field"), i.get(e)), Re = (e, i, t) => i.has(e) ? pe("Cannot add the same private member more than once") : i instanceof WeakSet ? i.add(e) : i.set(e, t), re = (e, i, t, o) => (me(e, i, "write to private field"), i.set(e, t), t), S;
let $ = class extends Y(q) {
  constructor() {
    super(...arguments), this.invoiceId = "", this._providers = [], this._linkInfo = null, this._selectedProvider = "", this._isLoading = !0, this._isGenerating = !1, this._isDeactivating = !1, this._errorMessage = null, this._copySuccess = !1, Re(this, S, !1);
  }
  connectedCallback() {
    super.connectedCallback(), re(this, S, !0), this.invoiceId && this._loadData();
  }
  disconnectedCallback() {
    super.disconnectedCallback(), re(this, S, !1);
  }
  updated(e) {
    e.has("invoiceId") && this.invoiceId && this._loadData();
  }
  async _loadData() {
    if (this.invoiceId) {
      this._isLoading = !0, this._errorMessage = null;
      try {
        const [e, i] = await Promise.all([
          g.getPaymentLinkProviders(),
          g.getPaymentLink(this.invoiceId)
        ]);
        if (!O(this, S)) return;
        if (e.error) {
          this._errorMessage = e.error.message, this._isLoading = !1;
          return;
        }
        this._providers = e.data ?? [], this._providers.length > 0 && !this._selectedProvider && (this._selectedProvider = this._providers[0].alias), i.error ? this._linkInfo = null : this._linkInfo = i.data ?? null;
      } catch (e) {
        if (!O(this, S)) return;
        this._errorMessage = e instanceof Error ? e.message : "Failed to load data";
      }
      this._isLoading = !1;
    }
  }
  async _generateLink() {
    if (!(!this.invoiceId || !this._selectedProvider)) {
      this._isGenerating = !0, this._errorMessage = null;
      try {
        const e = await g.createPaymentLink({
          invoiceId: this.invoiceId,
          providerAlias: this._selectedProvider
        });
        if (!O(this, S)) return;
        e.error ? this._errorMessage = e.error.message : e.data && (this._linkInfo = e.data, this.dispatchEvent(new CustomEvent("payment-link-created", {
          detail: { invoiceId: this.invoiceId, link: e.data },
          bubbles: !0,
          composed: !0
        })));
      } catch (e) {
        if (!O(this, S)) return;
        this._errorMessage = e instanceof Error ? e.message : "Failed to generate link";
      }
      this._isGenerating = !1;
    }
  }
  async _deactivateLink() {
    if (this.invoiceId) {
      this._isDeactivating = !0, this._errorMessage = null;
      try {
        const e = await g.deactivatePaymentLink(this.invoiceId);
        if (!O(this, S)) return;
        e.error ? this._errorMessage = e.error.message : (this._linkInfo = null, this.dispatchEvent(new CustomEvent("payment-link-deactivated", {
          detail: { invoiceId: this.invoiceId },
          bubbles: !0,
          composed: !0
        })));
      } catch (e) {
        if (!O(this, S)) return;
        this._errorMessage = e instanceof Error ? e.message : "Failed to deactivate link";
      }
      this._isDeactivating = !1;
    }
  }
  async _copyLink() {
    if (this._linkInfo?.paymentUrl)
      try {
        await navigator.clipboard.writeText(this._linkInfo.paymentUrl), this._copySuccess = !0, setTimeout(() => {
          this._copySuccess = !1;
        }, 2e3);
      } catch {
        this._errorMessage = "Failed to copy to clipboard";
      }
  }
  _onProviderChange(e) {
    const i = e.target;
    this._selectedProvider = i.value;
  }
  _renderActiveLink() {
    return this._linkInfo?.hasActiveLink ? a`
      <div class="active-link">
        <div class="link-header">
          <span class="link-status active">
            <uui-icon name="icon-check"></uui-icon>
            Active Payment Link
          </span>
          ${this._linkInfo.providerDisplayName ? a`<span class="link-provider">${this._linkInfo.providerDisplayName}</span>` : s}
        </div>

        <div class="link-url-container">
          <uui-input
            label="Payment URL"
            type="text"
            readonly
            class="link-url"
            .value=${this._linkInfo.paymentUrl ?? ""}
          ></uui-input>
          <uui-button
            look="secondary"
            compact
            label=${this._copySuccess ? "Copied payment link" : "Copy payment link"}
            @click=${this._copyLink}
            ?disabled=${!this._linkInfo.paymentUrl}
          >
            ${this._copySuccess ? a`<uui-icon name="icon-check"></uui-icon> Copied!` : a`<uui-icon name="icon-documents"></uui-icon> Copy`}
          </uui-button>
        </div>

        <div class="link-meta">
          ${this._linkInfo.createdBy ? a`<span>Created by ${this._linkInfo.createdBy}</span>` : s}
          ${this._linkInfo.createdAt ? a`<span>${N(this._linkInfo.createdAt)}</span>` : s}
        </div>

        <uui-button
          look="secondary"
          color="danger"
          label="Deactivate payment link"
          @click=${this._deactivateLink}
          ?disabled=${this._isDeactivating}
        >
          ${this._isDeactivating ? a`<uui-loader-bar></uui-loader-bar>` : a`<uui-icon name="icon-delete"></uui-icon> Deactivate Link`}
        </uui-button>
      </div>
    ` : s;
  }
  _renderPaidStatus() {
    return this._linkInfo?.isPaid ? a`
      <div class="paid-status">
        <uui-icon name="icon-check"></uui-icon>
        <span>Payment received ${this._linkInfo.providerDisplayName ? `via ${this._linkInfo.providerDisplayName}` : ""}</span>
        ${this._linkInfo.createdAt ? a`<span class="paid-date">${N(this._linkInfo.createdAt)}</span>` : s}
      </div>
    ` : s;
  }
  _renderGenerator() {
    return this._linkInfo?.hasActiveLink || this._linkInfo?.isPaid ? s : this._providers.length === 0 ? a`
        <div class="no-providers">
          <uui-icon name="icon-info"></uui-icon>
          <span>No payment providers configured that support payment links. Enable Stripe or PayPal to use this feature.</span>
        </div>
      ` : a`
      <div class="generator">
        <div class="generator-row">
          <uui-select
            label="Payment Provider"
            .options=${this._providers.map((e) => ({
      name: e.displayName,
      value: e.alias,
      selected: this._selectedProvider === e.alias
    }))}
            @change=${this._onProviderChange}
            ?disabled=${this._isGenerating}
          ></uui-select>

          <uui-button
            look="primary"
            color="positive"
            label="Generate payment link"
            @click=${this._generateLink}
            ?disabled=${this._isGenerating || !this._selectedProvider}
          >
            ${this._isGenerating ? a`<uui-loader-bar></uui-loader-bar>` : a`<uui-icon name="icon-link"></uui-icon> Generate Link`}
          </uui-button>
        </div>
      </div>
    `;
  }
  render() {
    return this._isLoading ? a`
        <div class="loading">
          <uui-loader></uui-loader>
        </div>
      ` : a`
      <div class="payment-link-panel">
        <h3>Payment Link</h3>

        ${this._errorMessage ? a`
              <div class="error">
                <uui-icon name="icon-alert"></uui-icon>
                <span>${this._errorMessage}</span>
                <uui-button look="secondary" compact label="Dismiss" @click=${() => this._errorMessage = null}>
                  Dismiss
                </uui-button>
              </div>
            ` : s}

        ${this._renderPaidStatus()}
        ${this._renderActiveLink()}
        ${this._renderGenerator()}
      </div>
    `;
  }
};
S = /* @__PURE__ */ new WeakMap();
$.styles = K`
    :host {
      display: block;
    }

    .loading {
      display: flex;
      justify-content: center;
      padding: var(--uui-size-layout-1);
    }

    .payment-link-panel {
      display: flex;
      flex-direction: column;
      gap: var(--uui-size-space-4);
    }

    h3 {
      margin: 0;
      font-size: 1rem;
      font-weight: 600;
    }

    .error {
      display: flex;
      align-items: center;
      gap: var(--uui-size-space-2);
      padding: var(--uui-size-space-3);
      background: var(--uui-color-danger-standalone);
      color: var(--uui-color-danger-contrast);
      border-radius: var(--uui-border-radius);
      font-size: 0.875rem;
    }

    .error span {
      flex: 1;
    }

    .no-providers {
      display: flex;
      align-items: flex-start;
      gap: var(--uui-size-space-2);
      padding: var(--uui-size-space-3);
      background: var(--uui-color-surface-alt);
      border-radius: var(--uui-border-radius);
      color: var(--uui-color-text-alt);
      font-size: 0.875rem;
    }

    .generator {
      display: flex;
      flex-direction: column;
      gap: var(--uui-size-space-3);
    }

    .generator-row {
      display: flex;
      gap: var(--uui-size-space-2);
      align-items: stretch;
    }

    .generator-row uui-select {
      flex: 1;
    }

    .active-link {
      display: flex;
      flex-direction: column;
      gap: var(--uui-size-space-3);
      padding: var(--uui-size-space-4);
      background: var(--uui-color-surface);
      border: 1px solid var(--uui-color-positive);
      border-radius: var(--uui-border-radius);
    }

    .link-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    .link-status {
      display: flex;
      align-items: center;
      gap: var(--uui-size-space-1);
      font-weight: 500;
    }

    .link-status.active {
      color: var(--uui-color-positive);
    }

    .link-provider {
      font-size: 0.875rem;
      padding: 2px 8px;
      background: var(--uui-color-surface-alt);
      border-radius: 8px;
      color: var(--uui-color-text-alt);
    }

    .link-url-container {
      display: flex;
      gap: var(--uui-size-space-2);
    }

    .link-url {
      flex: 1;
      width: 100%;
      --uui-input-background-color: var(--uui-color-surface-alt);
      --uui-input-border-color: var(--uui-color-border);
    }

    .link-meta {
      display: flex;
      gap: var(--uui-size-space-3);
      font-size: 0.75rem;
      color: var(--uui-color-text-alt);
    }

    .paid-status {
      display: flex;
      align-items: center;
      gap: var(--uui-size-space-2);
      padding: var(--uui-size-space-3);
      background: var(--uui-color-positive-standalone);
      color: var(--uui-color-positive-contrast);
      border-radius: var(--uui-border-radius);
    }

    .paid-date {
      margin-left: auto;
      opacity: 0.8;
    }

    .provider-icon {
      display: flex;
      align-items: center;
    }

    .provider-icon :deep(svg) {
      height: 20px;
      width: auto;
    }
  `;
z([
  se({ type: String })
], $.prototype, "invoiceId", 2);
z([
  n()
], $.prototype, "_providers", 2);
z([
  n()
], $.prototype, "_linkInfo", 2);
z([
  n()
], $.prototype, "_selectedProvider", 2);
z([
  n()
], $.prototype, "_isLoading", 2);
z([
  n()
], $.prototype, "_isGenerating", 2);
z([
  n()
], $.prototype, "_isDeactivating", 2);
z([
  n()
], $.prototype, "_errorMessage", 2);
z([
  n()
], $.prototype, "_copySuccess", 2);
$ = z([
  X("merchello-payment-link-panel")
], $);
var Ue = Object.defineProperty, Be = Object.getOwnPropertyDescriptor, he = (e) => {
  throw TypeError(e);
}, v = (e, i, t, o) => {
  for (var r = o > 1 ? void 0 : o ? Be(i, t) : i, l = e.length - 1, p; l >= 0; l--)
    (p = e[l]) && (r = (o ? p(i, t, r) : p(r)) || r);
  return o && r && Ue(i, t, r), r;
}, ve = (e, i, t) => i.has(e) || he("Cannot " + t), u = (e, i, t) => (ve(e, i, "read from private field"), i.get(e)), j = (e, i, t) => i.has(e) ? he("Cannot add the same private member more than once") : i instanceof WeakSet ? i.add(e) : i.set(e, t), V = (e, i, t, o) => (ve(e, i, "write to private field"), i.set(e, t), t), k, b, x, w;
let c = class extends Y(q) {
  constructor() {
    super(), this._order = null, this._isLoading = !0, this._routes = [], this._activePath = "", this._newNoteText = "", this._isVisibleToCustomer = !1, this._isPostingNote = !1, this._noteError = null, this._editingSection = null, this._editFormData = {}, this._isSavingAddress = !1, this._validationErrors = {}, this._countries = [], this._isEditingPurchaseOrder = !1, this._purchaseOrderValue = "", this._isSavingPurchaseOrder = !1, j(this, k), j(this, b), j(this, x), j(this, w, !1), this.consumeContext(oe, (e) => {
      V(this, k, e), u(this, k) && this.observe(u(this, k).order, (i) => {
        this._order = i ?? null, this._isLoading = !i;
      }, "_order");
    }), this.consumeContext(Z, (e) => {
      V(this, b, e);
    }), this.consumeContext(xe, (e) => {
      this.observe(e?.currentUser, (i) => {
        this._currentUser = i;
      }, "_currentUser");
    }), this.consumeContext(ne, (e) => {
      V(this, x, e);
    });
  }
  connectedCallback() {
    super.connectedCallback(), V(this, w, !0), this._createRoutes(), this._loadCountries();
  }
  _createRoutes() {
    const e = () => document.createElement("div");
    this._routes = [
      { path: "tab/details", component: e },
      { path: "tab/shipments", component: e },
      { path: "tab/payments", component: e },
      { path: "", redirectTo: "tab/details" },
      { path: "**", redirectTo: "tab/details" }
    ];
  }
  _getActiveTab() {
    return this._activePath.includes("tab/shipments") ? "shipments" : this._activePath.includes("tab/payments") ? "payments" : "details";
  }
  _onRouterInit(e) {
    this._routerPath = e.target.absoluteRouterPath;
  }
  _onRouterChange(e) {
    this._activePath = e.target.localActiveViewPath || "";
  }
  _getTabHref(e) {
    if (this._routerPath)
      return `${this._routerPath}/tab/${e}`;
  }
  disconnectedCallback() {
    super.disconnectedCallback(), V(this, w, !1);
  }
  async _loadCountries() {
    const { data: e } = await g.getCountries();
    u(this, w) && e && (this._countries = e);
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
    if (!this._order || !u(this, b)) return;
    const e = this._order.id, i = this._order.balanceDue > 0;
    await u(this, b).open(this, Pe, {
      data: {
        invoiceId: e,
        hasOutstandingBalance: i,
        paymentStatusDisplay: this._order.paymentStatusDisplay,
        balanceDue: this._order.balanceDue,
        currencyCode: this._order.currencyCode,
        currencySymbol: this._order.currencySymbol
      }
    }).onSubmit().catch(() => {
    }), u(this, w) && u(this, k)?.load(e);
  }
  async _openEditOrderModal() {
    if (!this._order || !u(this, b)) return;
    const e = this._order.id;
    await u(this, b).open(this, $e, {
      data: { invoiceId: e }
    }).onSubmit().catch(() => {
    }), u(this, w) && u(this, k)?.load(e);
  }
  async _openCancelInvoiceModal() {
    if (!this._order || !u(this, b)) return;
    const i = await u(this, b).open(this, Ie, {
      data: {
        invoiceId: this._order.id,
        invoiceNumber: this._order.invoiceNumber
      }
    }).onSubmit().catch(() => {
    });
    u(this, w) && i?.cancelled && (u(this, x)?.peek("positive", {
      data: {
        headline: "Invoice Cancelled",
        message: i.cancelledOrderCount ? `${i.cancelledOrderCount} order(s) cancelled and stock released.` : "Invoice has been cancelled."
      }
    }), u(this, k)?.load(this._order.id));
  }
  async _openCustomerOrdersModal() {
    if (!this._order || !u(this, b)) return;
    const e = this._order.billingAddress?.email;
    e && u(this, b).open(this, Ce, {
      data: {
        email: e,
        customerName: this._order.billingAddress?.name || "Customer"
      }
    });
  }
  async _openCustomerEditModal() {
    if (!this._order?.customerId || !u(this, b)) return;
    const { data: e, error: i } = await g.getCustomer(this._order.customerId);
    if (i || !e) {
      u(this, x)?.peek("danger", {
        data: { headline: "Error", message: "Could not load customer details" }
      });
      return;
    }
    (await u(this, b).open(this, we, {
      data: { customer: e }
    })?.onSubmit().catch(() => {
    }))?.isUpdated && u(this, x)?.peek("positive", {
      data: { headline: "Customer updated", message: "Customer details have been saved" }
    });
  }
  _formatAddress(e) {
    if (!e) return ["No address"];
    const i = [];
    e.name && i.push(e.name), e.company && i.push(e.company), e.addressOne && i.push(e.addressOne), e.addressTwo && i.push(e.addressTwo);
    const t = [e.townCity, e.countyState].filter(Boolean).join(", ");
    return t && i.push(t), e.postalCode && i.push(e.postalCode), e.country && i.push(e.country), e.phone && i.push(e.phone), i;
  }
  _areAddressesEquivalent(e, i) {
    return !e || !i ? !1 : [
      "name",
      "company",
      "addressOne",
      "addressTwo",
      "townCity",
      "countyState",
      "postalCode",
      "countryCode",
      "country",
      "phone",
      "email"
    ].every((o) => (e[o] ?? "") === (i[o] ?? ""));
  }
  _renderMarkdown(e) {
    ee.setOptions({ breaks: !0, gfm: !0 });
    const i = ee.parse(e), t = ke.sanitize(i);
    return _e(t);
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
      e = await g.updateBillingAddress(this._order.id, i);
    } else if (this._editingSection === "shipping") {
      const i = {
        ...this._order.shippingAddress,
        ...this._editFormData
      };
      e = await g.updateShippingAddress(this._order.id, i);
    } else {
      const i = {
        ...this._order.billingAddress,
        ...this._editFormData
      };
      e = await g.updateBillingAddress(this._order.id, i);
    }
    if (u(this, w)) {
      if (this._isSavingAddress = !1, e.error) {
        u(this, x)?.peek("danger", {
          data: { headline: "Failed to save", message: e.error.message || "Could not save address changes" }
        });
        return;
      }
      u(this, x)?.peek("positive", {
        data: { headline: "Address updated", message: "Changes have been saved successfully" }
      }), this._editingSection = null, this._editFormData = {}, this._validationErrors = {}, u(this, k)?.load(this._order.id);
    }
  }
  _startEditingPurchaseOrder() {
    this._order && (this._purchaseOrderValue = this._order.purchaseOrder || "", this._isEditingPurchaseOrder = !0);
  }
  _cancelEditingPurchaseOrder() {
    this._isEditingPurchaseOrder = !1, this._purchaseOrderValue = "";
  }
  async _savePurchaseOrder() {
    if (!this._order) return;
    this._isSavingPurchaseOrder = !0;
    const { error: e } = await g.updatePurchaseOrder(
      this._order.id,
      this._purchaseOrderValue.trim() || null
    );
    if (u(this, w)) {
      if (this._isSavingPurchaseOrder = !1, e) {
        u(this, x)?.peek("danger", {
          data: { headline: "Failed to save", message: e.message || "Could not save purchase order" }
        });
        return;
      }
      u(this, x)?.peek("positive", {
        data: { headline: "Purchase order updated", message: "Changes have been saved successfully" }
      }), this._isEditingPurchaseOrder = !1, this._purchaseOrderValue = "", u(this, k)?.load(this._order.id);
    }
  }
  _updateFormField(e, i) {
    if (this._editFormData = { ...this._editFormData, [e]: i || null }, this._validationErrors[e]) {
      const { [e]: t, ...o } = this._validationErrors;
      this._validationErrors = o;
    }
  }
  _renderInput(e, i, t, o = "text") {
    const r = !!this._validationErrors[e];
    return a`
      <div class="form-field ${r ? "has-error" : ""}">
        <uui-input
          type=${o}
          label=${i}
          placeholder=${t}
          .value=${this._editFormData[e] || ""}
          @input=${(l) => this._updateFormField(e, l.target.value)}
        ></uui-input>
        ${r ? a`<span class="field-error">${this._validationErrors[e]}</span>` : s}
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
      const t = i.target, o = this._countries.find((r) => r.code === t.value);
      if (this._editFormData = {
        ...this._editFormData,
        countryCode: t.value || null,
        country: o?.name || null
      }, this._validationErrors.countryCode) {
        const { countryCode: r, ...l } = this._validationErrors;
        this._validationErrors = l;
      }
    }}
        ></uui-select>
        ${e ? a`<span class="field-error">${this._validationErrors.countryCode}</span>` : s}
      </div>
    `;
  }
  _renderFulfillmentCard(e) {
    const i = this._order?.canFulfill ?? !1, t = this._order?.currencyCode, o = this._order?.currencySymbol, r = this._getFulfillmentLineItemRows(e.lineItems ?? []);
    return a`
      <div class="card fulfillment-card">
        <div class="fulfillment-header">
          <span class="fulfillment-status-badge ${e.statusCssClass}">
            <uui-icon name="icon-box"></uui-icon>
            ${e.statusLabel}
          </span>
          ${e.fulfilmentProviderName ? a`
            <span class="fulfillment-provider-badge">
              <uui-icon name="icon-server"></uui-icon>
              ${e.fulfilmentProviderName}
              ${e.fulfilmentProviderReference ? a`
                <span class="fulfillment-provider-ref">#${e.fulfilmentProviderReference}</span>
              ` : s}
            </span>
          ` : s}
        </div>
        ${e.fulfilmentErrorMessage ? a`
          <div class="fulfillment-error">
            <uui-icon name="icon-alert"></uui-icon>
            <span>${e.fulfilmentErrorMessage}</span>
            ${e.fulfilmentRetryCount > 0 ? a`
              <span class="fulfillment-retry-count">(${e.fulfilmentRetryCount} retries)</span>
            ` : s}
          </div>
        ` : s}
        <div class="fulfillment-shipping-method">
            <uui-icon name="icon-truck"></uui-icon>
          <div class="fulfillment-shipping-details">
            <span class="fulfillment-shipping-name">${e.deliveryMethod}</span>
            <span class="fulfillment-shipping-cost ${e.shippingCost === 0 ? "free-shipping" : ""}">${e.shippingCost === 0 ? "FREE" : h(e.shippingCost, t, o)}</span>
          </div>
        </div>
        <div class="fulfillment-line-items">
          ${r.map((l) => this._renderFulfillmentLineItem(
      l.item,
      l.isChild,
      t,
      o
    ))}
        </div>
        <div class="fulfillment-footer">
          <div class="fulfillment-actions">
            <uui-button
              look="${i ? "primary" : "secondary"}"
              label="${i ? "Fulfill" : "Fulfilled"}"
              ?disabled=${!i}
              @click=${i ? this._openFulfillmentModal : s}
            >
              ${i ? "Fulfill" : "Fulfilled"}
            </uui-button>
          </div>
        </div>
      </div>
    `;
  }
  _isAddonLineItem(e) {
    return e.isAddon || e.lineItemType === "Addon" || !!e.parentLineItemId || !!e.parentLineItemSku;
  }
  _isCustomLineItem(e) {
    return e.lineItemType === "Custom";
  }
  _getFulfillmentLineItemRows(e) {
    const i = e.filter((m) => this._isAddonLineItem(m)), t = e.filter((m) => !this._isAddonLineItem(m)), o = /* @__PURE__ */ new Map(), r = /* @__PURE__ */ new Map();
    i.forEach((m) => {
      const I = m.parentLineItemId?.trim();
      if (I) {
        const H = o.get(I);
        H ? H.push(m) : o.set(I, [m]);
        return;
      }
      const L = m.parentLineItemSku?.trim();
      if (!L) return;
      const U = r.get(L);
      U ? U.push(m) : r.set(L, [m]);
    });
    const l = [], p = /* @__PURE__ */ new Set();
    return t.forEach((m) => {
      l.push({ item: m, isChild: !1 });
      const I = (m.childLineItems ?? []).filter((A) => this._isAddonLineItem(A)), L = m.id?.trim(), U = m.sku?.trim(), H = L ? o.get(L) ?? [] : [], ge = U ? r.get(U) ?? [] : [];
      [...I, ...H, ...ge].filter((A, fe, be) => be.findIndex((ye) => ye.id === A.id) === fe).forEach((A) => {
        l.push({ item: A, isChild: !0 }), p.add(A.id);
      });
    }), i.forEach((m) => {
      p.has(m.id) || l.push({ item: m, isChild: !1 });
    }), l;
  }
  _resolveFulfillmentMediaKey(e, i) {
    if (i || this._isAddonLineItem(e) || this._isCustomLineItem(e))
      return null;
    const t = e.imageUrl?.trim();
    return t || null;
  }
  _renderFulfillmentLineItem(e, i, t, o) {
    const r = i || this._isAddonLineItem(e), l = this._resolveFulfillmentMediaKey(e, i), p = r ? [] : e.selectedOptions ?? [], m = r ? e.name || e.productRootName || "Add-on" : e.productRootName || e.name || "Unknown item", I = r ? "+" : "";
    return a`
      <div class="fulfillment-line-item ${r ? "is-addon" : ""}">
        <div class="fulfillment-item-main">
          ${r ? a`
            <div class="addon-indicator">
              <span class="addon-connector"></span>
              <span class="addon-badge">Add-on</span>
            </div>
          ` : s}
          <merchello-line-item-identity
            .mediaKey=${l ?? null}
            name=${m}
            .selectedOptions=${p}
            sku=${e.sku || ""}
            size="large">
          </merchello-line-item-identity>
        </div>
        <div class="fulfillment-item-pricing">
          <span class="fulfillment-item-price">${I}${h(e.amount, t, o)}</span>
          <span class="fulfillment-item-multiply">x</span>
          <span class="fulfillment-item-qty">${e.quantity}</span>
        </div>
        <div class="fulfillment-item-total">${I}${h(e.calculatedTotal, t, o)}</div>
      </div>
    `;
  }
  _getDateGroupLabel(e) {
    const i = /* @__PURE__ */ new Date(), t = new Date(i);
    t.setDate(t.getDate() - 1);
    const o = e.toDateString() === i.toDateString(), r = e.toDateString() === t.toDateString();
    return o ? "Today" : r ? "Yesterday" : e.toLocaleDateString(void 0, { weekday: "long", month: "long", day: "numeric" });
  }
  _formatTimeOnly(e) {
    return new Date(e).toLocaleTimeString(void 0, { hour: "2-digit", minute: "2-digit" });
  }
  _groupNotesByDate(e) {
    const i = /* @__PURE__ */ new Map(), t = [...e].sort((o, r) => new Date(r.date).getTime() - new Date(o.date).getTime());
    for (const o of t) {
      const r = new Date(o.date), l = this._getDateGroupLabel(r);
      i.has(l) || i.set(l, []), i.get(l).push(o);
    }
    return i;
  }
  _handlePaymentChange() {
    this._order && u(this, k)?.load(this._order.id);
  }
  async _handlePostNote() {
    if (!this._order || !this._newNoteText.trim()) return;
    this._isPostingNote = !0, this._noteError = null;
    const { error: e } = await g.addInvoiceNote(this._order.id, {
      text: this._newNoteText.trim(),
      isVisibleToCustomer: this._isVisibleToCustomer
    });
    if (u(this, w)) {
      if (this._isPostingNote = !1, e) {
        this._noteError = e.message || "Failed to post note", u(this, x)?.peek("danger", {
          data: { headline: "Failed to post note", message: e.message || "Could not save the note" }
        });
        return;
      }
      u(this, x)?.peek("positive", {
        data: { headline: "Note added", message: "Your note has been posted" }
      }), this._newNoteText = "", this._isVisibleToCustomer = !1, u(this, k)?.load(this._order.id);
    }
  }
  _renderLoadingState() {
    return a`<div class="loading"><uui-loader></uui-loader></div>`;
  }
  _renderNotFoundState() {
    return a`<div class="error">Order not found</div>`;
  }
  /**
   * Renders a source badge for non-web orders (UCP, API, POS, etc.)
   */
  _renderSourceBadge(e) {
    if (!e.source || e.source.type === "web")
      return s;
    const i = e.source.displayName || e.source.sourceName || e.source.type.toUpperCase(), t = `source-${e.source.type}`;
    return a`<span class="badge source ${t}" title="${this._getSourceTooltip(e)}">${i}</span>`;
  }
  /**
   * Gets tooltip text for source badge showing full details
   */
  _getSourceTooltip(e) {
    if (!e.source) return "";
    const i = [];
    return i.push(`Source: ${e.source.displayName || e.source.type}`), e.source.sourceId && i.push(`ID: ${e.source.sourceId}`), e.source.protocolVersion && i.push(`Version: ${e.source.protocolVersion}`), i.join(`
`);
  }
  render() {
    if (this._isLoading)
      return this._renderLoadingState();
    if (!this._order)
      return this._renderNotFoundState();
    const e = this._order, i = this._getActiveTab();
    return a`
      <umb-body-layout header-fit-height main-no-padding>
        <!-- Back button -->
        <uui-button slot="header" compact href=${ze()} label="Back to orders" class="back-button">
          <uui-icon name="icon-arrow-left"></uui-icon>
        </uui-button>

        <!-- Header with order info -->
        <div id="header" slot="header">
          <umb-icon name="icon-receipt"></umb-icon>
          <div class="header-title">
            <h1>${e.invoiceNumber || "Order"}</h1>
            <span class="order-meta">${Se(e.dateCreated)} from ${e.channel}</span>
          </div>
          <span class="badge ${e.paymentStatusCssClass}">${e.paymentStatusDisplay}</span>
          <span class="badge ${e.fulfillmentStatusCssClass}">${e.fulfillmentStatus}</span>
          ${e.isCancelled ? a`<span class="badge cancelled">Cancelled</span>` : s}
          ${this._renderSourceBadge(e)}
        </div>

        <!-- Inner layout with tabs -->
        <umb-body-layout header-fit-height header-no-padding>
          <!-- Tabs in header slot -->
          <uui-tab-group slot="header">
            <uui-tab
              label="Details"
              href=${this._getTabHref("details") ?? s}
              ?active=${i === "details"}
            >
              Details
            </uui-tab>
            <uui-tab
              label="Shipments"
              href=${this._getTabHref("shipments") ?? s}
              ?active=${i === "shipments"}
            >
              Shipments
            </uui-tab>
            <uui-tab
              label="Payments"
              href=${this._getTabHref("payments") ?? s}
              ?active=${i === "payments"}
            >
              Payments
            </uui-tab>
          </uui-tab-group>

          <!-- Hidden router slot for URL tracking -->
          <umb-router-slot
            .routes=${this._routes}
            @init=${this._onRouterInit}
            @change=${this._onRouterChange}
          ></umb-router-slot>

          <!-- Tab Content -->
          <div class="tab-content">
        ${i === "shipments" ? a`<merchello-shipments-view></merchello-shipments-view>` : i === "payments" ? a`
              <div class="payments-content">
                <merchello-payment-link-panel
                  invoiceId=${e.id}
                ></merchello-payment-link-panel>
                <merchello-payment-panel
                  invoiceId=${e.id}
                  @payment-recorded=${this._handlePaymentChange}
                  @refund-processed=${this._handlePaymentChange}
                ></merchello-payment-panel>
              </div>
            ` : a`
        <!-- Main Content -->
        <div class="order-content">
          <!-- Left Column -->
          <div class="main-column">
            <!-- Fulfillment Cards -->
            ${e.orders.map((t) => this._renderFulfillmentCard(t))}

            <!-- Payment Summary -->
            <div class="card payment-card">
              <div class="card-header">
                <uui-checkbox checked disabled label="Payment status" aria-label="Payment status"></uui-checkbox>
                <span>${e.paymentStatusDisplay}</span>
              </div>
              <div class="payment-summary">
                <div class="summary-row">
                  <span>Subtotal</span>
                  <span>${e.itemCount} items</span>
                  <span>${h(e.subTotal, e.currencyCode, e.currencySymbol)}</span>
                </div>
                ${e.discountTotal > 0 ? a`
                  <div class="summary-row discount">
                    <span>Discounts</span>
                    <span></span>
                    <span>-${h(e.discountTotal, e.currencyCode, e.currencySymbol)}</span>
                  </div>
                  ${e.discounts?.map((t) => a`
                    <div class="summary-row discount-detail">
                      <span>${t.name || "Discount"} (-${h(t.amount, e.currencyCode, e.currencySymbol)})</span>
                      <span></span>
                      <span></span>
                    </div>
                  `)}
                ` : s}
                <div class="summary-row">
                  <span>Shipping</span>
                  <span>${e.orders[0]?.deliveryMethod || "Standard"}</span>
                  <span class="${e.shippingCost === 0 ? "free-shipping" : ""}">${e.shippingCost === 0 ? "FREE" : h(e.shippingCost, e.currencyCode, e.currencySymbol)}</span>
                </div>
                ${e.tax > 0 ? a`
                  <div class="summary-row">
                    <span>Tax</span>
                    <span></span>
                    <span>${h(e.tax, e.currencyCode, e.currencySymbol)}</span>
                  </div>
                ` : s}
                <div class="summary-row total">
                  <span>Total</span>
                  <span></span>
                  <span>${h(e.total, e.currencyCode, e.currencySymbol)}</span>
                </div>
                ${e.totalInStoreCurrency != null && e.storeCurrencyCode !== e.currencyCode ? a`
                  <div class="summary-row">
                    <span>Total (Store)</span>
                    <span></span>
                    <span>${h(e.totalInStoreCurrency, e.storeCurrencyCode, e.storeCurrencySymbol)}</span>
                  </div>
                ` : s}
                <div class="summary-row ${e.balanceStatusCssClass}">
                  <span>Paid</span>
                  <span></span>
                  <span>${h(e.amountPaid, e.currencyCode, e.currencySymbol)}</span>
                </div>
                ${e.amountPaidInStoreCurrency != null && e.storeCurrencyCode !== e.currencyCode ? a`
                  <div class="summary-row">
                    <span>Paid (Store)</span>
                    <span></span>
                    <span>${h(e.amountPaidInStoreCurrency, e.storeCurrencyCode, e.storeCurrencySymbol)}</span>
                  </div>
                ` : s}
                ${e.balanceStatusLabel ? a`
                  <div class="summary-row balance ${e.balanceStatusCssClass}">
                    <span>${e.balanceStatusLabel}</span>
                    <span></span>
                    <span>${h(Math.abs(e.balanceDue), e.currencyCode, e.currencySymbol)}</span>
                  </div>
                ` : s}
                ${e.balanceDueInStoreCurrency != null && e.storeCurrencyCode !== e.currencyCode && e.balanceStatusLabel ? a`
                  <div class="summary-row">
                    <span>${e.balanceStatusLabel} (Store)</span>
                    <span></span>
                    <span>${h(Math.abs(e.balanceDueInStoreCurrency ?? 0), e.storeCurrencyCode, e.storeCurrencySymbol)}</span>
                  </div>
                ` : s}
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
                    label="Comment"
                    placeholder="Leave a comment..."
                    .value=${this._newNoteText}
                    @input=${(t) => {
      this._newNoteText = t.target.value, this._noteError = null;
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
                  ${this._noteError ? a`<div class="note-error">${this._noteError}</div>` : s}
                </div>
              </div>
              <div class="timeline-visibility-note">
                <uui-checkbox
                  label="Visible to customer"
                  ?checked=${this._isVisibleToCustomer}
                  @change=${(t) => this._isVisibleToCustomer = t.target.checked}
                >
                  Visible to customer
                </uui-checkbox>
                <span class="visibility-hint">
                  ${this._isVisibleToCustomer ? "Customers can see this new comment." : "Only staff can see this new comment."}
                </span>
              </div>
              <div class="timeline-events-container">
                ${e.notes.length === 0 ? a`<div class="no-notes">No timeline events yet</div>` : Array.from(this._groupNotesByDate(e.notes).entries()).map(
      ([t, o]) => a`
                        <div class="timeline-date-group">
                          <div class="timeline-date-header">${t}</div>
                          <div class="timeline-events">
                            ${o.map(
        (r) => a`
                                <div class="timeline-event ${r.isVisibleToCustomer ? "customer-visible" : ""}">
                                  <div class="timeline-event-dot"></div>
                                  <div class="timeline-event-content">
                                    ${r.isVisibleToCustomer ? a`<span class="customer-badge">Customer visible</span>` : s}
                                    <div class="event-text markdown-content">${this._renderMarkdown(r.text)}</div>
                                    ${r.author ? a`<span class="event-author">by ${r.author}</span>` : s}
                                  </div>
                                  <div class="timeline-event-time">${this._formatTimeOnly(r.date)}</div>
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
            <div class="card sidebar-card">
              <div class="card-header-with-action">
                <h3>Purchase Order</h3>
                ${this._isEditingPurchaseOrder ? s : a`
                  <uui-button look="secondary" compact label="Edit purchase order" @click=${this._startEditingPurchaseOrder}>
                    <uui-icon name="icon-edit"></uui-icon>
                  </uui-button>
                `}
              </div>
              ${this._isEditingPurchaseOrder ? a`
                <div class="edit-form">
                  <uui-input
                    type="text"
                    label="Purchase Order"
                    placeholder="Enter PO number..."
                    .value=${this._purchaseOrderValue}
                    @input=${(t) => this._purchaseOrderValue = t.target.value}
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
            <div class="card sidebar-card">
              <h3>Customer</h3>
              <div class="customer-info">
                <button type="button" class="customer-name-link" @click=${this._openCustomerEditModal}>${e.billingAddress?.name || "Unknown"}</button>
                ${e.billingAddress?.email ? a`<button type="button" class="customer-orders-link" @click=${this._openCustomerOrdersModal}>${e.customerOrderCount} ${e.customerOrderCount === 1 ? "order" : "orders"}</button>` : a`<div class="muted">${e.customerOrderCount} ${e.customerOrderCount === 1 ? "order" : "orders"}</div>`}
              </div>
              <div class="section">
                <div class="section-header">
                  <span class="section-title">Contact information</span>
                  ${this._editingSection !== "contact" ? a`
                    <uui-button look="secondary" compact label="Edit contact" @click=${() => this._startEditing("contact")}>
                      <uui-icon name="icon-edit"></uui-icon>
                    </uui-button>
                  ` : s}
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
                  <span class="section-title">Shipping address</span>
                  ${this._editingSection !== "shipping" ? a`
                    <uui-button look="secondary" compact label="Edit shipping address" @click=${() => this._startEditing("shipping")}>
                      <uui-icon name="icon-edit"></uui-icon>
                    </uui-button>
                  ` : s}
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
                    ${this._formatAddress(e.shippingAddress).map((t) => a`<div>${t}</div>`)}
                  </div>
                  ${this._getGoogleMapsUrl(e.shippingAddress) ? a`<a href=${this._getGoogleMapsUrl(e.shippingAddress)} target="_blank" rel="noopener noreferrer" class="view-map">View map</a>` : s}
                `}
              </div>
              <div class="section">
                <div class="section-header">
                  <span class="section-title">Billing address</span>
                  ${this._editingSection !== "billing" ? a`
                    <uui-button look="secondary" compact label="Edit billing address" @click=${() => this._startEditing("billing")}>
                      <uui-icon name="icon-edit"></uui-icon>
                    </uui-button>
                  ` : s}
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
                  ${this._areAddressesEquivalent(e.billingAddress, e.shippingAddress) ? a`<span class="muted">Same as shipping address</span>` : a`
                        <div class="address">
                          ${this._formatAddress(e.billingAddress).map((t) => a`<div>${t}</div>`)}
                        </div>
                      `}
                `}
              </div>
            </div>
          </div>
        </div>
        `}
          </div>
        </umb-body-layout>

        <!-- Footer -->
        <umb-footer-layout slot="footer">
          ${this._order?.isCancelled ? "" : a`
            <uui-button slot="actions" look="secondary" color="danger" label="Cancel Invoice" @click=${this._openCancelInvoiceModal}>
              Cancel Invoice
            </uui-button>
          `}
          <uui-button slot="actions" look="primary" label="Edit Order" @click=${this._openEditOrderModal}>
            Edit Order
          </uui-button>
        </umb-footer-layout>
      </umb-body-layout>
    `;
  }
};
k = /* @__PURE__ */ new WeakMap();
b = /* @__PURE__ */ new WeakMap();
x = /* @__PURE__ */ new WeakMap();
w = /* @__PURE__ */ new WeakMap();
c.styles = K`
    :host {
      display: block;
      width: 100%;
      height: 100%;
      --uui-tab-background: var(--uui-color-surface);
    }

    /* Hide router slot - used only for URL tracking */
    umb-router-slot {
      display: none;
    }

    /* Header styling */
    .back-button {
      margin-right: var(--uui-size-space-2);
    }

    #header {
      display: flex;
      align-items: center;
      gap: var(--uui-size-space-3);
      flex: 1;
      padding: var(--uui-size-space-4) 0;
    }

    #header umb-icon {
      font-size: 24px;
      color: var(--uui-color-text-alt);
    }

    .header-title {
      flex: 1;
      display: flex;
      flex-direction: column;
      gap: 2px;
    }

    .header-title h1 {
      margin: 0;
      font-size: var(--uui-type-h5-size);
      font-weight: 700;
    }

    .order-meta {
      color: var(--uui-color-text-alt);
      font-size: 0.75rem;
    }

    /* Tab styling */
    uui-tab-group {
      --uui-tab-divider: var(--uui-color-border);
      width: 100%;
    }

    /* Tab content */
    .tab-content {
      padding: var(--uui-size-layout-1);
    }

    .payments-content {
      display: flex;
      flex-direction: column;
      gap: var(--uui-size-layout-1);
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

    .badge.partial,
    .badge.awaiting {
      background: var(--merchello-color-warning-status-background, #8a6500);
      color: #fff;
    }

    .badge.refunded,
    .badge.partially-refunded {
      background: var(--uui-color-text-alt);
      color: var(--uui-color-surface);
    }

    .badge.fulfilled {
      background: var(--uui-color-positive-standalone);
      color: var(--uui-color-positive-contrast);
    }

    .badge.unfulfilled,
    .badge.partially-fulfilled {
      background: var(--merchello-color-warning-status-background, #8a6500);
      color: #fff;
    }

    .badge.cancelled {
      background: var(--uui-color-danger-standalone);
      color: var(--uui-color-danger-contrast);
    }

    /* Source badges for non-web orders */
    .badge.source {
      background: var(--uui-color-current-standalone);
      color: var(--uui-color-current-contrast);
    }

    .badge.source-ucp {
      background: var(--uui-color-current-standalone);
      color: var(--uui-color-current-contrast);
    }

    .badge.source-api {
      background: var(--uui-color-positive-standalone);
      color: var(--uui-color-positive-contrast);
    }

    .badge.source-pos {
      background: var(--merchello-color-warning-status-background, #8a6500);
      color: #fff;
    }

    .badge.source-manual {
      background: var(--uui-color-border-standalone);
      color: var(--uui-color-text);
    }

    .order-content {
      display: grid;
      grid-template-columns: minmax(0, 1fr) minmax(300px, 360px);
      gap: var(--uui-size-space-4);
    }

    @media (max-width: 1024px) {
      .order-content {
        grid-template-columns: 1fr;
      }
    }

    .main-column {
      display: flex;
      flex-direction: column;
      gap: var(--uui-size-space-4);
      min-width: 0;
    }

    .sidebar {
      display: flex;
      flex-direction: column;
      gap: var(--uui-size-space-3);
    }

    .card {
      background: var(--uui-color-surface);
      border: 1px solid var(--uui-color-border);
      border-radius: var(--uui-border-radius);
      padding: var(--uui-size-space-4);
      margin-bottom: 0;
    }

    .card h3 {
      margin: 0 0 var(--uui-size-space-3);
      font-size: 0.9375rem;
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

    .sidebar-card > h3 {
      margin-bottom: var(--uui-size-space-3);
      padding-bottom: var(--uui-size-space-3);
      border-bottom: 1px solid var(--uui-color-border);
    }

    .sidebar-card .card-header-with-action {
      margin-bottom: var(--uui-size-space-3);
      padding-bottom: var(--uui-size-space-3);
      border-bottom: 1px solid var(--uui-color-border);
    }

    /* Fulfillment Card - Shopify-like styling */
    .fulfillment-card {
      padding: 0;
      overflow: hidden;
    }

    .fulfillment-header {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: var(--uui-size-space-2);
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
      background: var(--merchello-color-warning-status-background, #8a6500);
      color: #fff;
    }

    .fulfillment-status-badge uui-icon {
      font-size: 1rem;
    }

    .fulfillment-status-badge.shipped {
      background: var(--uui-color-positive-standalone);
      color: var(--uui-color-positive-contrast);
    }

    .fulfillment-status-badge.cancelled {
      background: var(--uui-color-danger-standalone);
      color: var(--uui-color-danger-contrast);
    }

    .fulfillment-provider-badge {
      display: inline-flex;
      align-items: center;
      gap: var(--uui-size-space-2);
      padding: 4px 10px;
      border-radius: 16px;
      font-size: 0.75rem;
      font-weight: 500;
      background: var(--uui-color-surface-alt);
      color: var(--uui-color-text);
      margin-left: var(--uui-size-space-2);
    }

    .fulfillment-provider-badge uui-icon {
      font-size: 0.875rem;
      color: var(--uui-color-text-alt);
    }

    .fulfillment-provider-ref {
      color: var(--uui-color-text-alt);
      font-family: var(--uui-font-family-monospace, monospace);
    }

    .fulfillment-error {
      display: flex;
      align-items: center;
      gap: var(--uui-size-space-2);
      padding: var(--uui-size-space-3) var(--uui-size-space-4);
      background: var(--uui-color-danger-standalone);
      color: var(--uui-color-danger-contrast);
      font-size: 0.875rem;
    }

    .fulfillment-error uui-icon {
      flex-shrink: 0;
    }

    .fulfillment-retry-count {
      opacity: 0.8;
      font-size: 0.75rem;
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

    .fulfillment-shipping-details {
      display: flex;
      align-items: center;
      justify-content: space-between;
      flex: 1;
      gap: var(--uui-size-space-2);
    }

    .fulfillment-shipping-name {
      flex: 1;
    }

    .fulfillment-shipping-cost {
      font-weight: 600;
      color: var(--uui-color-text);
    }

    .free-shipping {
      color: var(--uui-color-positive);
    }

    .fulfillment-line-items {
      display: flex;
      flex-direction: column;
    }

    .fulfillment-line-item {
      display: grid;
      grid-template-columns: 1fr auto auto;
      gap: var(--uui-size-space-4);
      align-items: center;
      padding: var(--uui-size-space-4);
      border-bottom: 1px solid var(--uui-color-border);
    }

    .fulfillment-item-main {
      display: flex;
      align-items: center;
      gap: var(--uui-size-space-2);
      min-width: 0;
    }

    .fulfillment-line-item.is-addon {
      background: var(--uui-color-surface-alt);
      padding-top: var(--uui-size-space-3);
      padding-bottom: var(--uui-size-space-3);
    }

    .fulfillment-line-item.is-addon .fulfillment-item-main {
      padding-left: var(--uui-size-space-2);
    }

    .fulfillment-line-item:last-child {
      border-bottom: none;
    }

    .fulfillment-line-item merchello-line-item-identity {
      min-width: 0;
    }

    .addon-indicator {
      display: inline-flex;
      align-items: center;
      gap: var(--uui-size-space-1);
      flex-shrink: 0;
    }

    .addon-connector {
      width: 14px;
      height: 1px;
      background: var(--uui-color-border-emphasis);
    }

    .addon-badge {
      display: inline-flex;
      align-items: center;
      height: 18px;
      padding: 0 8px;
      border-radius: 999px;
      background: var(--uui-color-surface);
      border: 1px solid var(--uui-color-border);
      color: var(--uui-color-text-alt);
      font-size: 0.6875rem;
      font-weight: 600;
      letter-spacing: 0.01em;
      text-transform: uppercase;
      line-height: 1;
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
      background: var(--merchello-color-warning-status-background, #8a6500);
      color: #fff;
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
      grid-template-columns: auto 1fr auto;
      gap: var(--uui-size-space-2);
      font-size: 0.875rem;
    }

    .summary-row > span:nth-child(2) {
      text-align: right;
      color: var(--uui-color-text-alt);
    }

    .summary-row > span:last-child {
      text-align: right;
      min-width: 80px;
    }

    .summary-row.total {
      font-weight: 600;
      padding-top: var(--uui-size-space-2);
      border-top: 1px solid var(--uui-color-border);
    }

    .summary-row.discount {
      color: var(--uui-color-positive);
    }

    .summary-row.discount-detail {
      color: var(--uui-color-positive);
      padding-left: var(--uui-size-space-5);
      font-size: 0.8125rem;
    }

    .summary-row.discount-detail > span:first-child {
      color: var(--uui-color-text-alt);
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
      gap: var(--uui-size-space-2);
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
      padding-bottom: var(--uui-size-space-1);
    }

    .customer-name {
      color: var(--uui-color-text);
      font-weight: 500;
    }

    .customer-name-link {
      background: none;
      border: none;
      padding: 0;
      margin: 0;
      font-weight: 600;
      font-size: inherit;
      font-family: inherit;
      color: var(--uui-color-interactive);
      cursor: pointer;
      text-align: left;
    }

    .customer-name-link:hover {
      text-decoration: underline;
      color: var(--uui-color-interactive-emphasis);
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
      margin-top: var(--uui-size-space-4);
      padding-top: var(--uui-size-space-4);
      border-top: 1px solid var(--uui-color-border);
    }

    .section-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: var(--uui-size-space-3);
      font-weight: 500;
      font-size: 0.875rem;
    }

    .section-title {
      font-weight: 600;
      color: var(--uui-color-text);
    }

    .address {
      font-size: 0.875rem;
      line-height: 1.5;
    }

    .address > div + div {
      margin-top: 2px;
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
      padding: var(--uui-size-space-3);
      border: 1px solid var(--uui-color-border);
      border-radius: var(--uui-border-radius);
      background: var(--uui-color-surface-alt);
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
      padding-top: var(--uui-size-space-2);
      border-top: 1px solid var(--uui-color-border);
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

    @media (max-width: 768px) {
      .timeline-visibility-note {
        align-items: flex-start;
        flex-direction: column;
        padding-left: 0;
      }
    }
  `;
v([
  n()
], c.prototype, "_order", 2);
v([
  n()
], c.prototype, "_isLoading", 2);
v([
  n()
], c.prototype, "_routes", 2);
v([
  n()
], c.prototype, "_routerPath", 2);
v([
  n()
], c.prototype, "_activePath", 2);
v([
  n()
], c.prototype, "_newNoteText", 2);
v([
  n()
], c.prototype, "_isVisibleToCustomer", 2);
v([
  n()
], c.prototype, "_isPostingNote", 2);
v([
  n()
], c.prototype, "_noteError", 2);
v([
  n()
], c.prototype, "_currentUser", 2);
v([
  n()
], c.prototype, "_editingSection", 2);
v([
  n()
], c.prototype, "_editFormData", 2);
v([
  n()
], c.prototype, "_isSavingAddress", 2);
v([
  n()
], c.prototype, "_validationErrors", 2);
v([
  n()
], c.prototype, "_countries", 2);
v([
  n()
], c.prototype, "_isEditingPurchaseOrder", 2);
v([
  n()
], c.prototype, "_purchaseOrderValue", 2);
v([
  n()
], c.prototype, "_isSavingPurchaseOrder", 2);
c = v([
  X("merchello-order-detail")
], c);
const ai = c;
export {
  c as MerchelloOrderDetailElement,
  ai as default
};
//# sourceMappingURL=order-detail.element-BQV2vd8U.js.map
