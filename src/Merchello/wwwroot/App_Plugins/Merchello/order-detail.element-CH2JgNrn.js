import { LitElement as V, nothing as s, html as a, css as G, state as n, customElement as B, property as Z, unsafeHTML as de } from "@umbraco-cms/backoffice/external/lit";
import { d as X, p as ce } from "./purify.es-Cuv6u9x0.js";
import { UmbElementMixin as j } from "@umbraco-cms/backoffice/element-api";
import { UMB_WORKSPACE_CONTEXT as ee } from "@umbraco-cms/backoffice/workspace";
import { UmbModalToken as F, UMB_MODAL_MANAGER_CONTEXT as q, UMB_CONFIRM_MODAL as Y } from "@umbraco-cms/backoffice/modal";
import { UMB_NOTIFICATION_CONTEXT as ie } from "@umbraco-cms/backoffice/notification";
import { UMB_CURRENT_USER_CONTEXT as pe } from "@umbraco-cms/backoffice/current-user";
import { M as he } from "./edit-order-modal.token-BUHVPYdq.js";
import { M as me, a as ve } from "./customer-orders-modal.token-BBooCVRJ.js";
import { S as H, b as L, P as K, a as p, j as ge, k as fe } from "./formatting-nNQcXJwZ.js";
import { M as m } from "./merchello-api-658q9849.js";
import { p as be } from "./navigation-Y0bwD8V1.js";
import "./line-item-identity.element-DTtPHFdM.js";
const _e = new F("Merchello.Fulfillment.Modal", {
  modal: {
    type: "sidebar",
    size: "large"
  }
}), ye = new F("Merchello.CancelInvoice.Modal", {
  modal: {
    type: "sidebar",
    size: "small"
  }
}), ke = new F("Merchello.ShipmentEdit.Modal", {
  modal: {
    type: "sidebar",
    size: "medium"
  }
});
var $e = Object.defineProperty, xe = Object.getOwnPropertyDescriptor, te = (e) => {
  throw TypeError(e);
}, P = (e, i, t, o) => {
  for (var r = o > 1 ? void 0 : o ? xe(i, t) : i, u = e.length - 1, v; u >= 0; u--)
    (v = e[u]) && (r = (o ? v(i, t, r) : v(r)) || r);
  return o && r && $e(i, t, r), r;
}, ae = (e, i, t) => i.has(e) || te("Cannot " + t), d = (e, i, t) => (ae(e, i, "read from private field"), i.get(e)), U = (e, i, t) => i.has(e) ? te("Cannot add the same private member more than once") : i instanceof WeakSet ? i.add(e) : i.set(e, t), T = (e, i, t, o) => (ae(e, i, "write to private field"), i.set(e, t), t), S, M, $, y;
let w = class extends j(V) {
  constructor() {
    super(), this._invoiceId = null, this._fulfillmentData = null, this._isLoading = !0, this._errorMessage = null, this._expandedShipmentId = null, this._trackingForm = { carrier: "", trackingNumber: "", trackingUrl: "" }, this._isUpdatingStatus = !1, U(this, S), U(this, M), U(this, $), U(this, y, !1), this.consumeContext(ee, (e) => {
      T(this, S, e), d(this, S) && this.observe(d(this, S).order, (i) => {
        i?.id && i.id !== this._invoiceId && (this._invoiceId = i.id, this._loadShipments());
      }, "_observeOrder");
    }), this.consumeContext(q, (e) => {
      T(this, M, e);
    }), this.consumeContext(ie, (e) => {
      T(this, $, e);
    });
  }
  connectedCallback() {
    super.connectedCallback(), T(this, y, !0);
  }
  disconnectedCallback() {
    super.disconnectedCallback(), T(this, y, !1);
  }
  async _loadShipments() {
    if (!this._invoiceId) return;
    this._isLoading = !0, this._errorMessage = null;
    const { data: e, error: i } = await m.getFulfillmentSummary(this._invoiceId);
    d(this, y) && (i ? this._errorMessage = i.message : this._fulfillmentData = e ?? null, this._isLoading = !1);
  }
  async _handleEditShipment(e) {
    if (!d(this, M)) return;
    (await d(this, M).open(this, ke, {
      data: { shipment: e }
    }).onSubmit().catch(() => {
    }))?.isUpdated && this._loadShipments();
  }
  async _handleDeleteShipment(e) {
    const i = d(this, M)?.open(this, Y, {
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
    if (!d(this, y)) return;
    const { error: t } = await m.deleteShipment(e.id);
    if (d(this, y)) {
      if (t) {
        d(this, $)?.peek("danger", {
          data: { headline: "Failed to delete", message: t.message }
        });
        return;
      }
      this._loadShipments(), this._invoiceId && d(this, S)?.load(this._invoiceId);
    }
  }
  _toggleMarkAsShippedForm(e) {
    this._expandedShipmentId === e ? (this._expandedShipmentId = null, this._trackingForm = { carrier: "", trackingNumber: "", trackingUrl: "" }) : (this._expandedShipmentId = e, this._trackingForm = { carrier: "", trackingNumber: "", trackingUrl: "" });
  }
  _handleTrackingFormChange(e, i) {
    this._trackingForm = { ...this._trackingForm, [e]: i };
  }
  async _handleMarkAsShipped(e) {
    this._isUpdatingStatus = !0;
    const { error: i } = await m.updateShipmentStatus(e.id, {
      newStatus: H.Shipped,
      carrier: this._trackingForm.carrier || void 0,
      trackingNumber: this._trackingForm.trackingNumber || void 0,
      trackingUrl: this._trackingForm.trackingUrl || void 0
    });
    if (d(this, y)) {
      if (this._isUpdatingStatus = !1, i) {
        d(this, $)?.peek("danger", {
          data: { headline: "Failed to update status", message: i.message }
        });
        return;
      }
      d(this, $)?.peek("positive", {
        data: { headline: "Shipment marked as shipped", message: "Status updated successfully" }
      }), this._expandedShipmentId = null, this._trackingForm = { carrier: "", trackingNumber: "", trackingUrl: "" }, this._loadShipments(), this._invoiceId && d(this, S)?.load(this._invoiceId);
    }
  }
  async _handleMarkAsDelivered(e) {
    this._isUpdatingStatus = !0;
    const { error: i } = await m.updateShipmentStatus(e.id, {
      newStatus: H.Delivered
    });
    if (d(this, y)) {
      if (this._isUpdatingStatus = !1, i) {
        d(this, $)?.peek("danger", {
          data: { headline: "Failed to update status", message: i.message }
        });
        return;
      }
      d(this, $)?.peek("positive", {
        data: { headline: "Shipment marked as delivered", message: "Status updated successfully" }
      }), this._loadShipments(), this._invoiceId && d(this, S)?.load(this._invoiceId);
    }
  }
  async _handleCancelShipment(e) {
    const i = d(this, M)?.open(this, Y, {
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
    if (!d(this, y)) return;
    this._isUpdatingStatus = !0;
    const { error: t } = await m.updateShipmentStatus(e.id, {
      newStatus: H.Cancelled
    });
    if (d(this, y)) {
      if (this._isUpdatingStatus = !1, t) {
        d(this, $)?.peek("danger", {
          data: { headline: "Failed to cancel shipment", message: t.message }
        });
        return;
      }
      d(this, $)?.peek("positive", {
        data: { headline: "Shipment cancelled", message: "Items released back to unfulfilled" }
      }), this._loadShipments(), this._invoiceId && d(this, S)?.load(this._invoiceId);
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
            <span class="shipment-date">Created ${L(e.dateCreated)}</span>
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
                  <span class="value">${L(e.shippedDate)}</span>
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
                  <span class="value delivered">${L(e.actualDeliveryDate)}</span>
                </div>
              ` : s}
        </div>

        <div class="shipment-items">
          <h4>Items in shipment</h4>
          ${e.lineItems.map(
      (r) => a`
              <div class="item-row">
                <merchello-line-item-identity
                  media-key=${r.imageUrl || s}
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
                compact
                label="Mark as Shipped"
                ?disabled=${this._isUpdatingStatus}
                @click=${() => this._toggleMarkAsShippedForm(e.id)}
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
              placeholder="e.g., UPS, FedEx, DHL"
              .value=${this._trackingForm.carrier}
              @input=${(i) => this._handleTrackingFormChange("carrier", i.target.value)}
            ></uui-input>
          </uui-form-layout-item>
          <uui-form-layout-item>
            <uui-label slot="label">Tracking Number</uui-label>
            <uui-input
              placeholder="Tracking number"
              .value=${this._trackingForm.trackingNumber}
              @input=${(i) => this._handleTrackingFormChange("trackingNumber", i.target.value)}
            ></uui-input>
          </uui-form-layout-item>
          <uui-form-layout-item>
            <uui-label slot="label">Tracking URL</uui-label>
            <uui-input
              placeholder="https://..."
              .value=${this._trackingForm.trackingUrl}
              @input=${(i) => this._handleTrackingFormChange("trackingUrl", i.target.value)}
            ></uui-input>
          </uui-form-layout-item>
        </div>
        <div class="form-actions">
          <uui-button
            look="primary"
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
            @click=${() => this._toggleMarkAsShippedForm(e.id)}
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
      await navigator.clipboard.writeText(e);
    } catch {
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
S = /* @__PURE__ */ new WeakMap();
M = /* @__PURE__ */ new WeakMap();
$ = /* @__PURE__ */ new WeakMap();
y = /* @__PURE__ */ new WeakMap();
w.styles = G`
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

    /* Shipment status badge styles */
    .shipment-status-badge {
      padding: 4px 12px;
      border-radius: 12px;
      font-size: 0.75rem;
      font-weight: 600;
      text-transform: capitalize;
    }

    .shipment-status-badge.preparing {
      background: var(--uui-color-warning-standalone);
      color: var(--uui-color-warning-contrast);
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
P([
  n()
], w.prototype, "_invoiceId", 2);
P([
  n()
], w.prototype, "_fulfillmentData", 2);
P([
  n()
], w.prototype, "_isLoading", 2);
P([
  n()
], w.prototype, "_errorMessage", 2);
P([
  n()
], w.prototype, "_expandedShipmentId", 2);
P([
  n()
], w.prototype, "_trackingForm", 2);
P([
  n()
], w.prototype, "_isUpdatingStatus", 2);
w = P([
  B("merchello-shipments-view")
], w);
const we = new F("Merchello.ManualPayment.Modal", {
  modal: {
    type: "sidebar",
    size: "medium"
  }
}), Ce = new F("Merchello.Refund.Modal", {
  modal: {
    type: "sidebar",
    size: "medium"
  }
});
var Se = Object.defineProperty, ze = Object.getOwnPropertyDescriptor, re = (e) => {
  throw TypeError(e);
}, O = (e, i, t, o) => {
  for (var r = o > 1 ? void 0 : o ? ze(i, t) : i, u = e.length - 1, v; u >= 0; u--)
    (v = e[u]) && (r = (o ? v(i, t, r) : v(r)) || r);
  return o && r && Se(i, t, r), r;
}, se = (e, i, t) => i.has(e) || re("Cannot " + t), E = (e, i, t) => (se(e, i, "read from private field"), i.get(e)), J = (e, i, t) => i.has(e) ? re("Cannot add the same private member more than once") : i instanceof WeakSet ? i.add(e) : i.set(e, t), W = (e, i, t, o) => (se(e, i, "write to private field"), i.set(e, t), t), I, A;
let z = class extends j(V) {
  constructor() {
    super(), this.invoiceId = "", this._payments = [], this._status = null, this._isLoading = !0, this._errorMessage = null, J(this, I), J(this, A, !1), this.consumeContext(q, (e) => {
      W(this, I, e);
    });
  }
  connectedCallback() {
    super.connectedCallback(), W(this, A, !0), this.invoiceId && this._loadPayments();
  }
  disconnectedCallback() {
    super.disconnectedCallback(), W(this, A, !1);
  }
  updated(e) {
    e.has("invoiceId") && this.invoiceId && this._loadPayments();
  }
  async _loadPayments() {
    if (this.invoiceId) {
      this._isLoading = !0, this._errorMessage = null;
      try {
        const [e, i] = await Promise.all([
          m.getInvoicePayments(this.invoiceId),
          m.getPaymentStatus(this.invoiceId)
        ]);
        if (!E(this, A)) return;
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
        if (!E(this, A)) return;
        this._errorMessage = e instanceof Error ? e.message : "Failed to load payments";
      }
      this._isLoading = !1;
    }
  }
  async _openManualPaymentModal() {
    if (!E(this, I) || !this._status) return;
    (await E(this, I).open(this, we, {
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
    if (!E(this, I)) return;
    (await E(this, I).open(this, Ce, {
      data: { payment: e }
    }).onSubmit().catch(() => {
    }))?.refunded && (await this._loadPayments(), this.dispatchEvent(new CustomEvent("refund-processed", {
      detail: { invoiceId: this.invoiceId },
      bubbles: !0,
      composed: !0
    })));
  }
  _renderPayment(e) {
    const i = e.paymentType === K.Refund || e.paymentType === K.PartialRefund;
    return a`
      <div class="payment-item ${i ? "refund" : ""}">
        <div class="payment-main">
          <div class="payment-info">
            <div class="payment-method">
              ${i ? a`<uui-icon name="icon-undo"></uui-icon>` : a`<uui-icon name="icon-credit-card"></uui-icon>`}
              <span>${e.paymentMethod ?? "Payment"}</span>
              ${e.paymentProviderAlias ? a`<span class="provider-badge">${e.paymentProviderAlias}</span>` : s}
            </div>
            <div class="payment-date">${L(e.dateCreated)}</div>
            ${e.transactionId ? a`<div class="transaction-id">ID: ${e.transactionId}</div>` : s}
            ${e.riskScore != null ? a`<div class="risk-score ${e.riskLevel ? `${e.riskLevel}-risk` : "minimal-risk"}">
                  Risk: ${e.riskScore}%
                  ${e.riskScoreSource ? a`<span class="risk-source">(${e.riskScoreSource})</span>` : s}
                </div>` : s}
            ${e.description ? a`<div class="payment-description">${e.description}</div>` : s}
            ${e.refundReason ? a`<div class="refund-reason">Reason: ${e.refundReason}</div>` : s}
          </div>
          <div class="payment-amount ${i ? "negative" : ""}">
            ${i ? "-" : ""}${p(Math.abs(e.amount), e.currencyCode, e.currencySymbol)}
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
              <span class="status-badge ${e ? ge(e.status) : "unpaid"}">
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
                    <span>${p(e.invoiceTotal, e.currencyCode, e.currencySymbol)}</span>
                  </div>
                  <div class="status-row">
                    <span>Total Paid</span>
                    <span class="positive">${p(e.totalPaid, e.currencyCode, e.currencySymbol)}</span>
                  </div>
                  ${e.totalRefunded > 0 ? a`
                        <div class="status-row">
                          <span>Total Refunded</span>
                          <span class="negative">-${p(e.totalRefunded, e.currencyCode, e.currencySymbol)}</span>
                        </div>
                      ` : s}
                  <div class="status-row total">
                    <span>${e.balanceStatusLabel || "Balance Due"}</span>
                    <span class="${e.balanceStatusCssClass === "underpaid" ? "negative" : ""}">
                      ${p(e.balanceDue, e.currencyCode, e.currencySymbol)}
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
I = /* @__PURE__ */ new WeakMap();
A = /* @__PURE__ */ new WeakMap();
z.styles = G`
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
      background: #f97316;
      color: white;
    }

    .low-risk {
      background: var(--uui-color-warning-standalone);
      color: var(--uui-color-warning-contrast);
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
O([
  Z({ type: String })
], z.prototype, "invoiceId", 2);
O([
  n()
], z.prototype, "_payments", 2);
O([
  n()
], z.prototype, "_status", 2);
O([
  n()
], z.prototype, "_isLoading", 2);
O([
  n()
], z.prototype, "_errorMessage", 2);
z = O([
  B("merchello-payment-panel")
], z);
var Pe = Object.defineProperty, Me = Object.getOwnPropertyDescriptor, oe = (e) => {
  throw TypeError(e);
}, C = (e, i, t, o) => {
  for (var r = o > 1 ? void 0 : o ? Me(i, t) : i, u = e.length - 1, v; u >= 0; u--)
    (v = e[u]) && (r = (o ? v(i, t, r) : v(r)) || r);
  return o && r && Pe(i, t, r), r;
}, ne = (e, i, t) => i.has(e) || oe("Cannot " + t), D = (e, i, t) => (ne(e, i, "read from private field"), i.get(e)), Ie = (e, i, t) => i.has(e) ? oe("Cannot add the same private member more than once") : i instanceof WeakSet ? i.add(e) : i.set(e, t), Q = (e, i, t, o) => (ne(e, i, "write to private field"), i.set(e, t), t), x;
let _ = class extends j(V) {
  constructor() {
    super(...arguments), this.invoiceId = "", this._providers = [], this._linkInfo = null, this._selectedProvider = "", this._isLoading = !0, this._isGenerating = !1, this._isDeactivating = !1, this._errorMessage = null, this._copySuccess = !1, Ie(this, x, !1);
  }
  connectedCallback() {
    super.connectedCallback(), Q(this, x, !0), this.invoiceId && this._loadData();
  }
  disconnectedCallback() {
    super.disconnectedCallback(), Q(this, x, !1);
  }
  updated(e) {
    e.has("invoiceId") && this.invoiceId && this._loadData();
  }
  async _loadData() {
    if (this.invoiceId) {
      this._isLoading = !0, this._errorMessage = null;
      try {
        const [e, i] = await Promise.all([
          m.getPaymentLinkProviders(),
          m.getPaymentLink(this.invoiceId)
        ]);
        if (!D(this, x)) return;
        if (e.error) {
          this._errorMessage = e.error.message, this._isLoading = !1;
          return;
        }
        this._providers = e.data ?? [], this._providers.length > 0 && !this._selectedProvider && (this._selectedProvider = this._providers[0].alias), i.error ? this._linkInfo = null : this._linkInfo = i.data ?? null;
      } catch (e) {
        if (!D(this, x)) return;
        this._errorMessage = e instanceof Error ? e.message : "Failed to load data";
      }
      this._isLoading = !1;
    }
  }
  async _generateLink() {
    if (!(!this.invoiceId || !this._selectedProvider)) {
      this._isGenerating = !0, this._errorMessage = null;
      try {
        const e = await m.createPaymentLink({
          invoiceId: this.invoiceId,
          providerAlias: this._selectedProvider
        });
        if (!D(this, x)) return;
        e.error ? this._errorMessage = e.error.message : e.data && (this._linkInfo = e.data, this.dispatchEvent(new CustomEvent("payment-link-created", {
          detail: { invoiceId: this.invoiceId, link: e.data },
          bubbles: !0,
          composed: !0
        })));
      } catch (e) {
        if (!D(this, x)) return;
        this._errorMessage = e instanceof Error ? e.message : "Failed to generate link";
      }
      this._isGenerating = !1;
    }
  }
  async _deactivateLink() {
    if (this.invoiceId) {
      this._isDeactivating = !0, this._errorMessage = null;
      try {
        const e = await m.deactivatePaymentLink(this.invoiceId);
        if (!D(this, x)) return;
        e.error ? this._errorMessage = e.error.message : (this._linkInfo = null, this.dispatchEvent(new CustomEvent("payment-link-deactivated", {
          detail: { invoiceId: this.invoiceId },
          bubbles: !0,
          composed: !0
        })));
      } catch (e) {
        if (!D(this, x)) return;
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
          <input
            type="text"
            readonly
            class="link-url"
            .value=${this._linkInfo.paymentUrl ?? ""}
          />
          <uui-button
            look="secondary"
            compact
            @click=${this._copyLink}
            ?disabled=${!this._linkInfo.paymentUrl}
          >
            ${this._copySuccess ? a`<uui-icon name="icon-check"></uui-icon> Copied!` : a`<uui-icon name="icon-documents"></uui-icon> Copy`}
          </uui-button>
        </div>

        <div class="link-meta">
          ${this._linkInfo.createdBy ? a`<span>Created by ${this._linkInfo.createdBy}</span>` : s}
          ${this._linkInfo.createdAt ? a`<span>${L(this._linkInfo.createdAt)}</span>` : s}
        </div>

        <uui-button
          look="secondary"
          color="danger"
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
        ${this._linkInfo.createdAt ? a`<span class="paid-date">${L(this._linkInfo.createdAt)}</span>` : s}
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
                <uui-button look="secondary" compact @click=${() => this._errorMessage = null}>
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
x = /* @__PURE__ */ new WeakMap();
_.styles = G`
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
      padding: var(--uui-size-space-2) var(--uui-size-space-3);
      border: 1px solid var(--uui-color-border);
      border-radius: var(--uui-border-radius);
      font-family: monospace;
      font-size: 0.875rem;
      background: var(--uui-color-surface-alt);
      color: var(--uui-color-text);
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
C([
  Z({ type: String })
], _.prototype, "invoiceId", 2);
C([
  n()
], _.prototype, "_providers", 2);
C([
  n()
], _.prototype, "_linkInfo", 2);
C([
  n()
], _.prototype, "_selectedProvider", 2);
C([
  n()
], _.prototype, "_isLoading", 2);
C([
  n()
], _.prototype, "_isGenerating", 2);
C([
  n()
], _.prototype, "_isDeactivating", 2);
C([
  n()
], _.prototype, "_errorMessage", 2);
C([
  n()
], _.prototype, "_copySuccess", 2);
_ = C([
  B("merchello-payment-link-panel")
], _);
var Ee = Object.defineProperty, De = Object.getOwnPropertyDescriptor, le = (e) => {
  throw TypeError(e);
}, h = (e, i, t, o) => {
  for (var r = o > 1 ? void 0 : o ? De(i, t) : i, u = e.length - 1, v; u >= 0; u--)
    (v = e[u]) && (r = (o ? v(i, t, r) : v(r)) || r);
  return o && r && Ee(i, t, r), r;
}, ue = (e, i, t) => i.has(e) || le("Cannot " + t), l = (e, i, t) => (ue(e, i, "read from private field"), i.get(e)), R = (e, i, t) => i.has(e) ? le("Cannot add the same private member more than once") : i instanceof WeakSet ? i.add(e) : i.set(e, t), N = (e, i, t, o) => (ue(e, i, "write to private field"), i.set(e, t), t), f, g, b, k;
let c = class extends j(V) {
  constructor() {
    super(), this._order = null, this._isLoading = !0, this._routes = [], this._activePath = "", this._newNoteText = "", this._isVisibleToCustomer = !1, this._isPostingNote = !1, this._noteError = null, this._editingSection = null, this._editFormData = {}, this._isSavingAddress = !1, this._validationErrors = {}, this._countries = [], this._isEditingPurchaseOrder = !1, this._purchaseOrderValue = "", this._isSavingPurchaseOrder = !1, R(this, f), R(this, g), R(this, b), R(this, k, !1), this.consumeContext(ee, (e) => {
      N(this, f, e), l(this, f) && this.observe(l(this, f).order, (i) => {
        this._order = i ?? null, this._isLoading = !i;
      }, "_order");
    }), this.consumeContext(q, (e) => {
      N(this, g, e);
    }), this.consumeContext(pe, (e) => {
      this.observe(e?.currentUser, (i) => {
        this._currentUser = i;
      }, "_currentUser");
    }), this.consumeContext(ie, (e) => {
      N(this, b, e);
    }), this._loadCountries();
  }
  connectedCallback() {
    super.connectedCallback(), N(this, k, !0), this._createRoutes();
  }
  _createRoutes() {
    const e = () => document.createElement("div");
    this._routes = [
      { path: "tab/details", component: e },
      { path: "tab/shipments", component: e },
      { path: "tab/payments", component: e },
      { path: "", redirectTo: "tab/details" }
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
  disconnectedCallback() {
    super.disconnectedCallback(), N(this, k, !1);
  }
  async _loadCountries() {
    const { data: e } = await m.getCountries();
    l(this, k) && e && (this._countries = e);
  }
  _getGravatarUrl(e, i = 40) {
    return e ? `https://www.gravatar.com/avatar/${this._simpleHash(e.toLowerCase().trim())}?d=mp&s=${i}` : null;
  }
  _simpleHash(e) {
    let i = 3735928559, t = 1103547991;
    for (let r = 0; r < e.length; r++) {
      const u = e.charCodeAt(r);
      i = Math.imul(i ^ u, 2654435761), t = Math.imul(t ^ u, 1597334677);
    }
    return i = Math.imul(i ^ i >>> 16, 2246822507), i ^= Math.imul(t ^ t >>> 13, 3266489909), t = Math.imul(t ^ t >>> 16, 2246822507), t ^= Math.imul(i ^ i >>> 13, 3266489909), (4294967296 * (2097151 & t) + (i >>> 0)).toString(16).padStart(32, "0");
  }
  async _openFulfillmentModal() {
    if (!this._order || !l(this, g)) return;
    const e = this._order.id;
    await l(this, g).open(this, _e, {
      data: { invoiceId: e }
    }).onSubmit().catch(() => {
    }), l(this, k) && l(this, f)?.load(e);
  }
  async _openEditOrderModal() {
    if (!this._order || !l(this, g)) return;
    const e = this._order.id;
    await l(this, g).open(this, he, {
      data: { invoiceId: e }
    }).onSubmit().catch(() => {
    }), l(this, k) && l(this, f)?.load(e);
  }
  async _openCancelInvoiceModal() {
    if (!this._order || !l(this, g)) return;
    const i = await l(this, g).open(this, ye, {
      data: {
        invoiceId: this._order.id,
        invoiceNumber: this._order.invoiceNumber
      }
    }).onSubmit().catch(() => {
    });
    l(this, k) && i?.cancelled && (l(this, b)?.peek("positive", {
      data: {
        headline: "Invoice Cancelled",
        message: i.cancelledOrderCount ? `${i.cancelledOrderCount} order(s) cancelled and stock released.` : "Invoice has been cancelled."
      }
    }), l(this, f)?.load(this._order.id));
  }
  async _openCustomerOrdersModal() {
    if (!this._order || !l(this, g)) return;
    const e = this._order.billingAddress?.email;
    e && l(this, g).open(this, me, {
      data: {
        email: e,
        customerName: this._order.billingAddress?.name || "Customer"
      }
    });
  }
  async _openCustomerEditModal() {
    if (!this._order?.customerId || !l(this, g)) return;
    const { data: e, error: i } = await m.getCustomer(this._order.customerId);
    if (i || !e) {
      l(this, b)?.peek("danger", {
        data: { headline: "Error", message: "Could not load customer details" }
      });
      return;
    }
    (await l(this, g).open(this, ve, {
      data: { customer: e }
    })?.onSubmit().catch(() => {
    }))?.isUpdated && l(this, b)?.peek("positive", {
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
  _renderMarkdown(e) {
    X.setOptions({ breaks: !0, gfm: !0 });
    const i = X.parse(e), t = ce.sanitize(i);
    return de(t);
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
      e = await m.updateBillingAddress(this._order.id, i);
    } else if (this._editingSection === "shipping") {
      const i = {
        ...this._order.shippingAddress,
        ...this._editFormData
      };
      e = await m.updateShippingAddress(this._order.id, i);
    } else {
      const i = {
        ...this._order.billingAddress,
        ...this._editFormData
      };
      e = await m.updateBillingAddress(this._order.id, i);
    }
    if (l(this, k)) {
      if (this._isSavingAddress = !1, e.error) {
        l(this, b)?.peek("danger", {
          data: { headline: "Failed to save", message: e.error.message || "Could not save address changes" }
        });
        return;
      }
      l(this, b)?.peek("positive", {
        data: { headline: "Address updated", message: "Changes have been saved successfully" }
      }), this._editingSection = null, this._editFormData = {}, this._validationErrors = {}, l(this, f)?.load(this._order.id);
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
    const { error: e } = await m.updatePurchaseOrder(
      this._order.id,
      this._purchaseOrderValue.trim() || null
    );
    if (l(this, k)) {
      if (this._isSavingPurchaseOrder = !1, e) {
        l(this, b)?.peek("danger", {
          data: { headline: "Failed to save", message: e.message || "Could not save purchase order" }
        });
        return;
      }
      l(this, b)?.peek("positive", {
        data: { headline: "Purchase order updated", message: "Changes have been saved successfully" }
      }), this._isEditingPurchaseOrder = !1, this._purchaseOrderValue = "", l(this, f)?.load(this._order.id);
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
          @input=${(u) => this._updateFormField(e, u.target.value)}
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
        const { countryCode: r, ...u } = this._validationErrors;
        this._validationErrors = u;
      }
    }}
        ></uui-select>
        ${e ? a`<span class="field-error">${this._validationErrors.countryCode}</span>` : s}
      </div>
    `;
  }
  _renderFulfillmentCard(e) {
    const i = this._order?.canFulfill ?? !1, t = this._order?.currencyCode, o = this._order?.currencySymbol;
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
            <span class="fulfillment-shipping-cost">${p(e.shippingCost, t, o)}</span>
          </div>
        </div>
        <div class="fulfillment-line-items">
          ${e.lineItems.map(
      (r) => a`
              <div class="fulfillment-line-item">
                <merchello-line-item-identity
                  media-key=${r.imageUrl || s}
                  name=${r.productRootName || r.name || ""}
                  .selectedOptions=${r.selectedOptions ?? []}
                  sku=${r.sku || ""}
                  size="large">
                </merchello-line-item-identity>
                <div class="fulfillment-item-pricing">
                  <span class="fulfillment-item-price">${p(r.amount, t, o)}</span>
                  <span class="fulfillment-item-multiply">×</span>
                  <span class="fulfillment-item-qty">${r.quantity}</span>
                </div>
                <div class="fulfillment-item-total">${p(r.calculatedTotal, t, o)}</div>
              </div>
            `
    )}
        </div>
        <div class="fulfillment-footer">
          <div class="fulfillment-actions">
            <uui-button
              look="${i ? "primary" : "secondary"}"
              label="${i ? "Fulfil" : "Fulfilled"}"
              ?disabled=${!i}
              @click=${i ? this._openFulfillmentModal : s}
            >
              ${i ? "Fulfil" : "Fulfilled"}
            </uui-button>
          </div>
        </div>
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
      const r = new Date(o.date), u = this._getDateGroupLabel(r);
      i.has(u) || i.set(u, []), i.get(u).push(o);
    }
    return i;
  }
  _handlePaymentChange() {
    this._order && l(this, f)?.load(this._order.id);
  }
  async _handlePostNote() {
    if (!this._order || !this._newNoteText.trim()) return;
    this._isPostingNote = !0, this._noteError = null;
    const { error: e } = await m.addInvoiceNote(this._order.id, {
      text: this._newNoteText.trim(),
      isVisibleToCustomer: this._isVisibleToCustomer
    });
    if (l(this, k)) {
      if (this._isPostingNote = !1, e) {
        this._noteError = e.message || "Failed to post note", l(this, b)?.peek("danger", {
          data: { headline: "Failed to post note", message: e.message || "Could not save the note" }
        });
        return;
      }
      l(this, b)?.peek("positive", {
        data: { headline: "Note added", message: "Your note has been posted" }
      }), this._newNoteText = "", this._isVisibleToCustomer = !1, l(this, f)?.load(this._order.id);
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
        <uui-button slot="header" compact href=${be()} label="Back to orders" class="back-button">
          <uui-icon name="icon-arrow-left"></uui-icon>
        </uui-button>

        <!-- Header with order info -->
        <div id="header" slot="header">
          <umb-icon name="icon-receipt"></umb-icon>
          <div class="header-title">
            <h1>${e.invoiceNumber || "Order"}</h1>
            <span class="order-meta">${fe(e.dateCreated)} from ${e.channel}</span>
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
              href="${this._routerPath}/tab/details"
              ?active=${i === "details"}
            >
              Details
            </uui-tab>
            <uui-tab
              label="Shipments"
              href="${this._routerPath}/tab/shipments"
              ?active=${i === "shipments"}
            >
              Shipments
            </uui-tab>
            <uui-tab
              label="Payments"
              href="${this._routerPath}/tab/payments"
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
                <uui-checkbox checked disabled aria-label="Payment status"></uui-checkbox>
                <span>${e.paymentStatusDisplay}</span>
              </div>
              <div class="payment-summary">
                <div class="summary-row">
                  <span>Subtotal</span>
                  <span>${e.itemCount} items</span>
                  <span>${p(e.subTotal, e.currencyCode, e.currencySymbol)}</span>
                </div>
                ${e.discountTotal > 0 ? a`
                  <div class="summary-row discount">
                    <span>Discounts</span>
                    <span></span>
                    <span>-${p(e.discountTotal, e.currencyCode, e.currencySymbol)}</span>
                  </div>
                  ${e.discounts?.map((t) => a`
                    <div class="summary-row discount-detail">
                      <span>${t.name || "Discount"} (-${p(t.amount, e.currencyCode, e.currencySymbol)})</span>
                      <span></span>
                      <span></span>
                    </div>
                  `)}
                ` : s}
                <div class="summary-row">
                  <span>Shipping</span>
                  <span>${e.orders[0]?.deliveryMethod || "Standard"}</span>
                  <span>${p(e.shippingCost, e.currencyCode, e.currencySymbol)}</span>
                </div>
                ${e.tax > 0 ? a`
                  <div class="summary-row">
                    <span>Tax</span>
                    <span></span>
                    <span>${p(e.tax, e.currencyCode, e.currencySymbol)}</span>
                  </div>
                ` : s}
                <div class="summary-row total">
                  <span>Total</span>
                  <span></span>
                  <span>${p(e.total, e.currencyCode, e.currencySymbol)}</span>
                </div>
                ${e.totalInStoreCurrency != null && e.storeCurrencyCode !== e.currencyCode ? a`
                  <div class="summary-row">
                    <span>Total (Store)</span>
                    <span></span>
                    <span>${p(e.totalInStoreCurrency, e.storeCurrencyCode, e.storeCurrencySymbol)}</span>
                  </div>
                ` : s}
                <div class="summary-row ${e.balanceStatusCssClass}">
                  <span>Paid</span>
                  <span></span>
                  <span>${p(e.amountPaid, e.currencyCode, e.currencySymbol)}</span>
                </div>
                ${e.amountPaidInStoreCurrency != null && e.storeCurrencyCode !== e.currencyCode ? a`
                  <div class="summary-row">
                    <span>Paid (Store)</span>
                    <span></span>
                    <span>${p(e.amountPaidInStoreCurrency, e.storeCurrencyCode, e.storeCurrencySymbol)}</span>
                  </div>
                ` : s}
                ${e.balanceStatusLabel ? a`
                  <div class="summary-row balance ${e.balanceStatusCssClass}">
                    <span>${e.balanceStatusLabel}</span>
                    <span></span>
                    <span>${p(Math.abs(e.balanceDue), e.currencyCode, e.currencySymbol)}</span>
                  </div>
                ` : s}
                ${e.balanceDueInStoreCurrency != null && e.storeCurrencyCode !== e.currencyCode && e.balanceStatusLabel ? a`
                  <div class="summary-row">
                    <span>${e.balanceStatusLabel} (Store)</span>
                    <span></span>
                    <span>${p(Math.abs(e.balanceDueInStoreCurrency ?? 0), e.storeCurrencyCode, e.storeCurrencySymbol)}</span>
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
                  ?checked=${this._isVisibleToCustomer}
                  @change=${(t) => this._isVisibleToCustomer = t.target.checked}
                >
                  Visible to customer
                </uui-checkbox>
                <span class="visibility-hint">Only you and other staff can see comments</span>
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
            <div class="card">
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
            <div class="card">
              <h3>Customer</h3>
              <div class="customer-info">
                <button type="button" class="customer-name-link" @click=${this._openCustomerEditModal}>${e.billingAddress?.name || "Unknown"}</button>
                ${e.billingAddress?.email ? a`<button type="button" class="customer-orders-link" @click=${this._openCustomerOrdersModal}>${e.customerOrderCount} ${e.customerOrderCount === 1 ? "order" : "orders"}</button>` : a`<div class="muted">${e.customerOrderCount} ${e.customerOrderCount === 1 ? "order" : "orders"}</div>`}
              </div>
              <div class="section">
                <div class="section-header">
                  <span>Contact information</span>
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
                  <span>Shipping address</span>
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
                  <span>Billing address</span>
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
                  ${e.billingAddress === e.shippingAddress ? a`<span class="muted">Same as shipping address</span>` : a`
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
f = /* @__PURE__ */ new WeakMap();
g = /* @__PURE__ */ new WeakMap();
b = /* @__PURE__ */ new WeakMap();
k = /* @__PURE__ */ new WeakMap();
c.styles = G`
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

    .badge.fulfilled {
      background: var(--uui-color-positive-standalone);
      color: var(--uui-color-positive-contrast);
    }

    .badge.unfulfilled {
      background: var(--uui-color-warning-standalone);
      color: var(--uui-color-warning-contrast);
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
      background: #7c3aed; /* Purple for AI/UCP agents */
      color: white;
    }

    .badge.source-api {
      background: #0891b2; /* Cyan for API */
      color: white;
    }

    .badge.source-pos {
      background: #ea580c; /* Orange for POS */
      color: white;
    }

    .badge.source-draft {
      background: var(--uui-color-border-standalone);
      color: var(--uui-color-text);
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

    .fulfillment-line-item:last-child {
      border-bottom: none;
    }

    .fulfillment-line-item merchello-line-item-identity {
      min-width: 0;
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
h([
  n()
], c.prototype, "_order", 2);
h([
  n()
], c.prototype, "_isLoading", 2);
h([
  n()
], c.prototype, "_routes", 2);
h([
  n()
], c.prototype, "_routerPath", 2);
h([
  n()
], c.prototype, "_activePath", 2);
h([
  n()
], c.prototype, "_newNoteText", 2);
h([
  n()
], c.prototype, "_isVisibleToCustomer", 2);
h([
  n()
], c.prototype, "_isPostingNote", 2);
h([
  n()
], c.prototype, "_noteError", 2);
h([
  n()
], c.prototype, "_currentUser", 2);
h([
  n()
], c.prototype, "_editingSection", 2);
h([
  n()
], c.prototype, "_editFormData", 2);
h([
  n()
], c.prototype, "_isSavingAddress", 2);
h([
  n()
], c.prototype, "_validationErrors", 2);
h([
  n()
], c.prototype, "_countries", 2);
h([
  n()
], c.prototype, "_isEditingPurchaseOrder", 2);
h([
  n()
], c.prototype, "_purchaseOrderValue", 2);
h([
  n()
], c.prototype, "_isSavingPurchaseOrder", 2);
c = h([
  B("merchello-order-detail")
], c);
const We = c;
export {
  c as MerchelloOrderDetailElement,
  We as default
};
//# sourceMappingURL=order-detail.element-CH2JgNrn.js.map
