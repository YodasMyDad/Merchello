import { LitElement, html, css, nothing } from "@umbraco-cms/backoffice/external/lit";
import { customElement, state } from "@umbraco-cms/backoffice/external/lit";
import { UmbElementMixin } from "@umbraco-cms/backoffice/element-api";
import { UMB_WORKSPACE_CONTEXT } from "@umbraco-cms/backoffice/workspace";
import { UMB_MODAL_MANAGER_CONTEXT } from "@umbraco-cms/backoffice/modal";
import type { UmbModalManagerContext } from "@umbraco-cms/backoffice/modal";
import { MerchelloApi } from "@api/merchello-api.js";
import { formatShortDate } from "@shared/utils/formatting.js";
import type { FulfillmentSummaryDto, ShipmentDetailDto } from "@orders/types/order.types.js";
import type { MerchelloOrderDetailWorkspaceContext } from "@orders/contexts/order-detail-workspace.context.js";
import { MERCHELLO_SHIPMENT_EDIT_MODAL } from "@orders/modals/shipment-edit-modal.token.js";

@customElement("merchello-shipments-view")
export class MerchelloShipmentsViewElement extends UmbElementMixin(LitElement) {
  @state() private _invoiceId: string | null = null;
  @state() private _fulfillmentData: FulfillmentSummaryDto | null = null;
  @state() private _isLoading: boolean = true;
  @state() private _errorMessage: string | null = null;

  #workspaceContext?: MerchelloOrderDetailWorkspaceContext;
  #modalManager?: UmbModalManagerContext;
  #isConnected = false;

  constructor() {
    super();
    this.consumeContext(UMB_WORKSPACE_CONTEXT, (context) => {
      this.#workspaceContext = context as MerchelloOrderDetailWorkspaceContext;
      this.observe(this.#workspaceContext.order, (order) => {
        if (order?.id && order.id !== this._invoiceId) {
          this._invoiceId = order.id;
          this._loadShipments();
        }
      });
    });
    this.consumeContext(UMB_MODAL_MANAGER_CONTEXT, (context) => {
      this.#modalManager = context;
    });
  }

  connectedCallback(): void {
    super.connectedCallback();
    this.#isConnected = true;
  }

  disconnectedCallback(): void {
    super.disconnectedCallback();
    this.#isConnected = false;
  }

  private async _loadShipments(): Promise<void> {
    if (!this._invoiceId) return;

    this._isLoading = true;
    this._errorMessage = null;

    const { data, error } = await MerchelloApi.getFulfillmentSummary(this._invoiceId);

    // Prevent state updates if component was disconnected during async operation
    if (!this.#isConnected) return;

    if (error) {
      this._errorMessage = error.message;
    } else {
      this._fulfillmentData = data ?? null;
    }

    this._isLoading = false;
  }

  private async _handleEditShipment(shipment: ShipmentDetailDto): Promise<void> {
    if (!this.#modalManager) return;

    const modal = this.#modalManager.open(this, MERCHELLO_SHIPMENT_EDIT_MODAL, {
      data: { shipment },
    });

    const result = await modal.onSubmit().catch(() => undefined);
    if (result?.updated) {
      this._loadShipments();
    }
  }

  private async _handleDeleteShipment(shipment: ShipmentDetailDto): Promise<void> {
    const confirmed = confirm(
      `Are you sure you want to delete this shipment? This will release the items back to unfulfilled.`
    );
    if (!confirmed) return;

    const { error } = await MerchelloApi.deleteShipment(shipment.id);

    // Prevent state updates if component was disconnected during async operation
    if (!this.#isConnected) return;

    if (error) {
      alert(error.message);
      return;
    }

    this._loadShipments();
    // Reload the main order data too
    if (this._invoiceId) {
      this.#workspaceContext?.load(this._invoiceId);
    }
  }

  private _renderShipmentCard(shipment: ShipmentDetailDto, orderWarehouse: string): unknown {
    const carrierBadgeClass = this._getCarrierClass(shipment.carrier);

    return html`
      <div class="shipment-card">
        <div class="shipment-header">
          <div class="header-left">
            ${shipment.carrier
              ? html`<span class="carrier-badge ${carrierBadgeClass}">${shipment.carrier}</span>`
              : html`<span class="carrier-badge">No carrier</span>`}
            <span class="shipment-date">Created ${formatShortDate(shipment.dateCreated)}</span>
          </div>
          <div class="header-right">
            <uui-button look="secondary" compact label="Edit" @click=${() => this._handleEditShipment(shipment)}>
              <uui-icon name="icon-edit"></uui-icon>
              Edit
            </uui-button>
            <uui-button
              look="secondary"
              compact
              label="Delete"
              color="danger"
              @click=${() => this._handleDeleteShipment(shipment)}
            >
              <uui-icon name="icon-delete"></uui-icon>
            </uui-button>
          </div>
        </div>

        <div class="shipment-details">
          <div class="detail-row">
            <span class="label">Warehouse:</span>
            <span class="value">${orderWarehouse}</span>
          </div>
          ${shipment.trackingNumber
            ? html`
                <div class="detail-row">
                  <span class="label">Tracking:</span>
                  <span class="value tracking-value">
                    ${shipment.trackingUrl
                      ? html`<a href="${shipment.trackingUrl}" target="_blank" rel="noopener"
                          >${shipment.trackingNumber}</a
                        >`
                      : shipment.trackingNumber}
                    <uui-button
                      look="secondary"
                      compact
                      label="Copy tracking number"
                      title="Copy tracking number"
                      @click=${() => this._copyToClipboard(shipment.trackingNumber!)}
                    >
                      <uui-icon name="icon-documents"></uui-icon>
                    </uui-button>
                  </span>
                </div>
              `
            : nothing}
          ${shipment.actualDeliveryDate
            ? html`
                <div class="detail-row">
                  <span class="label">Delivered:</span>
                  <span class="value delivered">${formatShortDate(shipment.actualDeliveryDate)}</span>
                </div>
              `
            : nothing}
        </div>

        <div class="shipment-items">
          <h4>Items in shipment</h4>
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
                  ${item.sku ? html`<div class="item-sku">${item.sku}</div>` : nothing}
                </div>
                <div class="item-qty">x${item.quantity}</div>
              </div>
            `
          )}
        </div>
      </div>
    `;
  }

  private _getCarrierClass(carrier: string | null): string {
    if (!carrier) return "";
    const lower = carrier.toLowerCase();
    if (lower.includes("ups")) return "ups";
    if (lower.includes("fedex")) return "fedex";
    if (lower.includes("dhl")) return "dhl";
    if (lower.includes("usps")) return "usps";
    if (lower.includes("royal mail")) return "royalmail";
    return "";
  }

  private async _copyToClipboard(text: string): Promise<void> {
    try {
      await navigator.clipboard.writeText(text);
    } catch (e) {
      console.error("Failed to copy to clipboard", e);
    }
  }

  render() {
    if (this._isLoading) {
      return html`<div class="loading"><uui-loader></uui-loader></div>`;
    }

    if (this._errorMessage) {
      return html`
        <div class="error">
          <uui-icon name="icon-alert"></uui-icon>
          ${this._errorMessage}
        </div>
      `;
    }

    if (!this._fulfillmentData) {
      return html`<div class="empty">No order data available</div>`;
    }

    const allShipments: { shipment: ShipmentDetailDto; warehouseName: string }[] = [];
    for (const order of this._fulfillmentData.orders) {
      for (const shipment of order.shipments) {
        allShipments.push({ shipment, warehouseName: order.warehouseName });
      }
    }

    if (allShipments.length === 0) {
      return html`
        <div class="empty-state">
          <uui-icon name="icon-box"></uui-icon>
          <h3>No shipments yet</h3>
          <p>Use the "Fulfil" button on the Details tab to create shipments for this order.</p>
        </div>
      `;
    }

    return html`
      <div class="shipments-view">
        <div class="header">
          <h2>Shipments</h2>
          <div class="summary">
            <span class="status-badge ${this._fulfillmentData.overallStatus.toLowerCase()}">
              ${this._fulfillmentData.overallStatus}
            </span>
            <span class="count">${allShipments.length} shipment${allShipments.length !== 1 ? "s" : ""}</span>
          </div>
        </div>

        <div class="shipments-list">
          ${allShipments.map(({ shipment, warehouseName }) => this._renderShipmentCard(shipment, warehouseName))}
        </div>
      </div>
    `;
  }

  static styles = css`
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
}

export default MerchelloShipmentsViewElement;

declare global {
  interface HTMLElementTagNameMap {
    "merchello-shipments-view": MerchelloShipmentsViewElement;
  }
}
