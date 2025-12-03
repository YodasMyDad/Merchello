import { html as r, css as d, state as l, customElement as m } from "@umbraco-cms/backoffice/external/lit";
import { UmbModalBaseElement as p } from "@umbraco-cms/backoffice/modal";
import { M as v } from "./merchello-api-BlCaCKcg.js";
import { b as h } from "./formatting-Cgl2aCEX.js";
var g = Object.defineProperty, b = Object.getOwnPropertyDescriptor, s = (i, e, u, o) => {
  for (var t = o > 1 ? void 0 : o ? b(e, u) : e, n = i.length - 1, c; n >= 0; n--)
    (c = i[n]) && (t = (o ? c(e, u, t) : c(t)) || t);
  return o && t && g(e, u, t), t;
};
let a = class extends p {
  constructor() {
    super(...arguments), this._carrier = "", this._trackingNumber = "", this._trackingUrl = "", this._actualDeliveryDate = "", this._isSaving = !1, this._errorMessage = null;
  }
  connectedCallback() {
    super.connectedCallback();
    const i = this.data?.shipment;
    i && (this._carrier = i.carrier || "", this._trackingNumber = i.trackingNumber || "", this._trackingUrl = i.trackingUrl || "", this._actualDeliveryDate = i.actualDeliveryDate ? i.actualDeliveryDate.split("T")[0] : "");
  }
  async _handleSave() {
    if (this.data?.shipment) {
      this._isSaving = !0, this._errorMessage = null;
      try {
        const i = {
          carrier: this._carrier || void 0,
          trackingNumber: this._trackingNumber || void 0,
          trackingUrl: this._trackingUrl || void 0,
          actualDeliveryDate: this._actualDeliveryDate || void 0
        }, { error: e } = await v.updateShipment(this.data.shipment.id, i);
        if (e) {
          this._errorMessage = e.message;
          return;
        }
        this.modalContext?.setValue({ updated: !0 }), this.modalContext?.submit();
      } catch (i) {
        this._errorMessage = i instanceof Error ? i.message : "Failed to update shipment";
      } finally {
        this._isSaving = !1;
      }
    }
  }
  _handleClose() {
    this.modalContext?.reject();
  }
  render() {
    const i = this.data?.shipment;
    return i ? r`
      <umb-body-layout headline="Edit Shipment">
        <div id="main">
          <div class="shipment-summary">
            <div class="summary-row">
              <span class="label">Created:</span>
              <span>${h(i.dateCreated)}</span>
            </div>
            <div class="summary-row">
              <span class="label">Items:</span>
              <span>${i.lineItems.length} item${i.lineItems.length !== 1 ? "s" : ""}</span>
            </div>
          </div>

          ${this._errorMessage ? r`<div class="error-message"><uui-icon name="icon-alert"></uui-icon> ${this._errorMessage}</div>` : ""}

          <div class="form-group">
            <label for="carrier">Carrier</label>
            <uui-input
              id="carrier"
              placeholder="e.g., UPS, FedEx, DHL"
              .value=${this._carrier}
              @input=${(e) => this._carrier = e.target.value}
            ></uui-input>
          </div>

          <div class="form-group">
            <label for="tracking-number">Tracking Number</label>
            <uui-input
              id="tracking-number"
              placeholder="Enter tracking number"
              .value=${this._trackingNumber}
              @input=${(e) => this._trackingNumber = e.target.value}
            ></uui-input>
          </div>

          <div class="form-group">
            <label for="tracking-url">Tracking URL</label>
            <uui-input
              id="tracking-url"
              placeholder="https://..."
              .value=${this._trackingUrl}
              @input=${(e) => this._trackingUrl = e.target.value}
            ></uui-input>
          </div>

          <div class="form-group">
            <label for="delivery-date">Actual Delivery Date</label>
            <uui-input
              id="delivery-date"
              type="date"
              .value=${this._actualDeliveryDate}
              @input=${(e) => this._actualDeliveryDate = e.target.value}
            ></uui-input>
            <small class="help-text">Set this when the shipment has been delivered</small>
          </div>

          <div class="items-section">
            <h3>Items in this shipment</h3>
            ${i.lineItems.map(
      (e) => r`
                <div class="item-row">
                  <div class="item-image">
                    ${e.imageUrl ? r`<img src="${e.imageUrl}" alt="${e.name}" />` : r`<div class="placeholder-image"></div>`}
                  </div>
                  <div class="item-info">
                    <div class="item-name">${e.name || "Unknown item"}</div>
                    ${e.sku ? r`<div class="item-sku">${e.sku}</div>` : ""}
                  </div>
                  <div class="item-qty">x${e.quantity}</div>
                </div>
              `
    )}
          </div>
        </div>

        <div slot="actions">
          <uui-button label="Cancel" @click=${this._handleClose}>Cancel</uui-button>
          <uui-button
            look="primary"
            color="positive"
            label="Save Changes"
            ?disabled=${this._isSaving}
            @click=${this._handleSave}
          >
            ${this._isSaving ? r`<uui-loader-circle></uui-loader-circle>` : "Save Changes"}
          </uui-button>
        </div>
      </umb-body-layout>
    ` : r`<div class="error">No shipment data</div>`;
  }
};
a.styles = d`
    :host {
      display: block;
    }

    #main {
      padding: var(--uui-size-space-4);
    }

    .shipment-summary {
      background: var(--uui-color-surface-alt);
      padding: var(--uui-size-space-3);
      border-radius: var(--uui-border-radius);
      margin-bottom: var(--uui-size-space-4);
    }

    .summary-row {
      display: flex;
      gap: var(--uui-size-space-2);
      font-size: 0.875rem;
    }

    .summary-row .label {
      color: var(--uui-color-text-alt);
    }

    .error-message {
      display: flex;
      align-items: center;
      gap: var(--uui-size-space-2);
      padding: var(--uui-size-space-3);
      background: #f8d7da;
      color: #721c24;
      border-radius: var(--uui-border-radius);
      margin-bottom: var(--uui-size-space-4);
      font-size: 0.875rem;
    }

    .form-group {
      margin-bottom: var(--uui-size-space-4);
    }

    .form-group label {
      display: block;
      margin-bottom: var(--uui-size-space-1);
      font-weight: 500;
      font-size: 0.875rem;
    }

    .form-group uui-input {
      width: 100%;
    }

    .help-text {
      display: block;
      margin-top: var(--uui-size-space-1);
      color: var(--uui-color-text-alt);
      font-size: 0.75rem;
    }

    .items-section {
      margin-top: var(--uui-size-space-5);
      padding-top: var(--uui-size-space-4);
      border-top: 1px solid var(--uui-color-border);
    }

    .items-section h3 {
      margin: 0 0 var(--uui-size-space-3);
      font-size: 0.875rem;
      font-weight: 600;
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
      width: 32px;
      height: 32px;
      border-radius: var(--uui-border-radius);
      object-fit: cover;
    }

    .placeholder-image {
      background: var(--uui-color-surface-alt);
    }

    .item-info {
      flex: 1;
    }

    .item-name {
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

    [slot="actions"] {
      display: flex;
      gap: var(--uui-size-space-2);
      justify-content: flex-end;
    }
  `;
s([
  l()
], a.prototype, "_carrier", 2);
s([
  l()
], a.prototype, "_trackingNumber", 2);
s([
  l()
], a.prototype, "_trackingUrl", 2);
s([
  l()
], a.prototype, "_actualDeliveryDate", 2);
s([
  l()
], a.prototype, "_isSaving", 2);
s([
  l()
], a.prototype, "_errorMessage", 2);
a = s([
  m("merchello-shipment-edit-modal")
], a);
const $ = a;
export {
  a as MerchelloShipmentEditModalElement,
  $ as default
};
//# sourceMappingURL=shipment-edit-modal.element-DX9i22aZ.js.map
