import { html, css } from "@umbraco-cms/backoffice/external/lit";
import { customElement, state } from "@umbraco-cms/backoffice/external/lit";
import { UmbModalBaseElement } from "@umbraco-cms/backoffice/modal";
import { MerchelloApi } from "@api/merchello-api.js";
import { formatShortDate } from "@shared/utils/formatting.js";
import type { ShipmentEditModalData, ShipmentEditModalValue } from "./shipment-edit-modal.token.js";
import type { UpdateShipmentRequest } from "../types/order.types.js";

@customElement("merchello-shipment-edit-modal")
export class MerchelloShipmentEditModalElement extends UmbModalBaseElement<
  ShipmentEditModalData,
  ShipmentEditModalValue
> {
  @state() private _carrier: string = "";
  @state() private _trackingNumber: string = "";
  @state() private _trackingUrl: string = "";
  @state() private _actualDeliveryDate: string = "";
  @state() private _isSaving: boolean = false;
  @state() private _errorMessage: string | null = null;

  connectedCallback(): void {
    super.connectedCallback();
    const shipment = this.data?.shipment;
    if (shipment) {
      this._carrier = shipment.carrier || "";
      this._trackingNumber = shipment.trackingNumber || "";
      this._trackingUrl = shipment.trackingUrl || "";
      this._actualDeliveryDate = shipment.actualDeliveryDate
        ? shipment.actualDeliveryDate.split("T")[0]
        : "";
    }
  }

  private async _handleSave(): Promise<void> {
    if (!this.data?.shipment) return;

    this._isSaving = true;
    this._errorMessage = null;

    try {
      const request: UpdateShipmentRequest = {
        carrier: this._carrier || undefined,
        trackingNumber: this._trackingNumber || undefined,
        trackingUrl: this._trackingUrl || undefined,
        actualDeliveryDate: this._actualDeliveryDate || undefined,
      };

      const { error } = await MerchelloApi.updateShipment(this.data.shipment.id, request);
      if (error) {
        this._errorMessage = error.message;
        return;
      }
      this.modalContext?.setValue({ updated: true });
      this.modalContext?.submit();
    } catch (e) {
      this._errorMessage = e instanceof Error ? e.message : "Failed to update shipment";
    } finally {
      this._isSaving = false;
    }
  }

  private _handleClose(): void {
    this.modalContext?.reject();
  }

  render() {
    const shipment = this.data?.shipment;
    if (!shipment) return html`<div class="error">No shipment data</div>`;

    return html`
      <umb-body-layout headline="Edit Shipment">
        <div id="main">
          <div class="shipment-summary">
            <div class="summary-row">
              <span class="label">Created:</span>
              <span>${formatShortDate(shipment.dateCreated)}</span>
            </div>
            <div class="summary-row">
              <span class="label">Items:</span>
              <span>${shipment.lineItems.length} item${shipment.lineItems.length !== 1 ? "s" : ""}</span>
            </div>
          </div>

          ${this._errorMessage
            ? html`<div class="error-message"><uui-icon name="icon-alert"></uui-icon> ${this._errorMessage}</div>`
            : ""}

          <div class="form-group">
            <label for="carrier">Carrier</label>
            <uui-input
              id="carrier"
              placeholder="e.g., UPS, FedEx, DHL"
              .value=${this._carrier}
              @input=${(e: Event) => (this._carrier = (e.target as HTMLInputElement).value)}
            ></uui-input>
          </div>

          <div class="form-group">
            <label for="tracking-number">Tracking Number</label>
            <uui-input
              id="tracking-number"
              placeholder="Enter tracking number"
              .value=${this._trackingNumber}
              @input=${(e: Event) => (this._trackingNumber = (e.target as HTMLInputElement).value)}
            ></uui-input>
          </div>

          <div class="form-group">
            <label for="tracking-url">Tracking URL</label>
            <uui-input
              id="tracking-url"
              placeholder="https://..."
              .value=${this._trackingUrl}
              @input=${(e: Event) => (this._trackingUrl = (e.target as HTMLInputElement).value)}
            ></uui-input>
          </div>

          <div class="form-group">
            <label for="delivery-date">Actual Delivery Date</label>
            <uui-input
              id="delivery-date"
              type="date"
              .value=${this._actualDeliveryDate}
              @input=${(e: Event) => (this._actualDeliveryDate = (e.target as HTMLInputElement).value)}
            ></uui-input>
            <small class="help-text">Set this when the shipment has been delivered</small>
          </div>

          <div class="items-section">
            <h3>Items in this shipment</h3>
            ${shipment.lineItems.map(
              (item) => html`
                <div class="item-row">
                  <div class="item-image">
                    ${item.imageUrl
                      ? html`<img src="${item.imageUrl}" alt="${item.name}" />`
                      : html`<div class="placeholder-image"></div>`}
                  </div>
                  <div class="item-info">
                    <div class="item-name">${item.name || "Unknown item"}</div>
                    ${item.sku ? html`<div class="item-sku">${item.sku}</div>` : ""}
                  </div>
                  <div class="item-qty">x${item.quantity}</div>
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
            ${this._isSaving ? html`<uui-loader-circle></uui-loader-circle>` : "Save Changes"}
          </uui-button>
        </div>
      </umb-body-layout>
    `;
  }

  static styles = css`
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
}

export default MerchelloShipmentEditModalElement;

declare global {
  interface HTMLElementTagNameMap {
    "merchello-shipment-edit-modal": MerchelloShipmentEditModalElement;
  }
}
