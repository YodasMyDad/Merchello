import { LitElement, html, css, nothing } from "@umbraco-cms/backoffice/external/lit";
import { customElement, state } from "@umbraco-cms/backoffice/external/lit";
import { UmbElementMixin } from "@umbraco-cms/backoffice/element-api";
import { UMB_WORKSPACE_CONTEXT } from "@umbraco-cms/backoffice/workspace";
import { UMB_MODAL_MANAGER_CONTEXT, UMB_CONFIRM_MODAL } from "@umbraco-cms/backoffice/modal";
import type { UmbModalManagerContext } from "@umbraco-cms/backoffice/modal";
import { UMB_NOTIFICATION_CONTEXT } from "@umbraco-cms/backoffice/notification";
import type { UmbNotificationContext } from "@umbraco-cms/backoffice/notification";
import { MerchelloApi } from "@api/merchello-api.js";
import { formatCurrency, formatShortDate } from "@shared/utils/formatting.js";
import type { FulfillmentSummaryDto, OrderDetailDto, ShipmentDetailDto } from "@orders/types/order.types.js";
import { ShipmentStatus } from "@orders/types/order.types.js";
import type { MerchelloOrdersWorkspaceContext } from "@orders/contexts/orders-workspace.context.js";
import { MERCHELLO_SHIPMENT_EDIT_MODAL } from "@orders/modals/shipment-edit-modal.token.js";

// Import shared components
import "@shared/components/line-item-identity.element.js";

/** Tracking info for the inline Mark as Shipped form */
interface TrackingFormData {
  carrier: string;
  trackingNumber: string;
  trackingUrl: string;
}

@customElement("merchello-shipments-view")
export class MerchelloShipmentsViewElement extends UmbElementMixin(LitElement) {
  @state() private _invoiceId: string | null = null;
  @state() private _fulfillmentData: FulfillmentSummaryDto | null = null;
  @state() private _isLoading: boolean = true;
  @state() private _errorMessage: string | null = null;
  /** Shipment ID currently showing the Mark as Shipped inline form */
  @state() private _expandedShipmentId: string | null = null;
  /** Tracking form data for the expanded shipment */
  @state() private _trackingForm: TrackingFormData = { carrier: "", trackingNumber: "", trackingUrl: "" };
  /** Whether a status update is in progress */
  @state() private _isUpdatingStatus: boolean = false;
  @state() private _hasOutstandingBalance: boolean = false;
  @state() private _paymentStatusDisplay: string = "";
  @state() private _balanceDue: number = 0;
  @state() private _currencyCode: string = "";
  @state() private _currencySymbol: string = "";

  #workspaceContext?: MerchelloOrdersWorkspaceContext;
  #modalManager?: UmbModalManagerContext;
  #notificationContext?: UmbNotificationContext;
  #isConnected = false;

  constructor() {
    super();
    this.consumeContext(UMB_WORKSPACE_CONTEXT, (context) => {
      this.#workspaceContext = context as MerchelloOrdersWorkspaceContext;
      if (!this.#workspaceContext) return;
      this.observe(this.#workspaceContext.order, (order) => {
        this._syncPaymentState(order);
        if (order?.id && order.id !== this._invoiceId) {
          this._invoiceId = order.id;
          this._loadShipments();
        }
      }, '_observeOrder');
    });
    this.consumeContext(UMB_MODAL_MANAGER_CONTEXT, (context) => {
      this.#modalManager = context;
    });
    this.consumeContext(UMB_NOTIFICATION_CONTEXT, (context) => {
      this.#notificationContext = context;
    });
  }

  override connectedCallback(): void {
    super.connectedCallback();
    this.#isConnected = true;
  }

  override disconnectedCallback(): void {
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

  private _syncPaymentState(order: OrderDetailDto | undefined): void {
    const balanceDue = order?.balanceDue ?? 0;
    this._hasOutstandingBalance = balanceDue > 0;
    this._paymentStatusDisplay = order?.paymentStatusDisplay ?? "";
    this._balanceDue = balanceDue;
    this._currencyCode = order?.currencyCode ?? "";
    this._currencySymbol = order?.currencySymbol ?? "";
  }

  private async _handleEditShipment(shipment: ShipmentDetailDto): Promise<void> {
    if (!this.#modalManager) return;

    const modal = this.#modalManager.open(this, MERCHELLO_SHIPMENT_EDIT_MODAL, {
      data: { shipment },
    });

    const result = await modal.onSubmit().catch(() => undefined);
    if (result?.isUpdated) {
      this._loadShipments();
    }
  }

  private async _handleDeleteShipment(shipment: ShipmentDetailDto): Promise<void> {
    const modalContext = this.#modalManager?.open(this, UMB_CONFIRM_MODAL, {
      data: {
        headline: "Delete Shipment",
        content: "Are you sure you want to delete this shipment? This will release the items back to unfulfilled.",
        confirmLabel: "Delete",
        color: "danger",
      },
    });

    try {
      await modalContext?.onSubmit();
    } catch {
      return; // User cancelled
    }
    if (!this.#isConnected) return; // Component disconnected while modal was open

    const { error } = await MerchelloApi.deleteShipment(shipment.id);

    // Prevent state updates if component was disconnected during async operation
    if (!this.#isConnected) return;

    if (error) {
      this.#notificationContext?.peek("danger", {
        data: { headline: "Failed to delete", message: error.message },
      });
      return;
    }

    this._loadShipments();
    // Reload the main order data too
    if (this._invoiceId) {
      this.#workspaceContext?.load(this._invoiceId);
    }
  }

  private _toggleMarkAsShippedForm(shipment: ShipmentDetailDto): void {
    if (this._expandedShipmentId === shipment.id) {
      this._expandedShipmentId = null;
      this._trackingForm = { carrier: "", trackingNumber: "", trackingUrl: "" };
    } else {
      this._expandedShipmentId = shipment.id;
      // Pre-populate with existing tracking data
      this._trackingForm = {
        carrier: shipment.carrier ?? "",
        trackingNumber: shipment.trackingNumber ?? "",
        trackingUrl: shipment.trackingUrl ?? "",
      };
    }
  }

  private _handleTrackingFormChange(field: keyof TrackingFormData, value: string): void {
    this._trackingForm = { ...this._trackingForm, [field]: value };
  }

  private async _handleMarkAsShipped(shipment: ShipmentDetailDto): Promise<void> {
    this._isUpdatingStatus = true;

    const { error } = await MerchelloApi.updateShipmentStatus(shipment.id, {
      newStatus: ShipmentStatus.Shipped,
      carrier: this._trackingForm.carrier || undefined,
      trackingNumber: this._trackingForm.trackingNumber || undefined,
      trackingUrl: this._trackingForm.trackingUrl || undefined,
    });

    if (!this.#isConnected) return;

    this._isUpdatingStatus = false;

    if (error) {
      this.#notificationContext?.peek("danger", {
        data: { headline: "Failed to update status", message: error.message },
      });
      return;
    }

    this.#notificationContext?.peek("positive", {
      data: { headline: "Shipment marked as shipped", message: "Status updated successfully" },
    });

    this._expandedShipmentId = null;
    this._trackingForm = { carrier: "", trackingNumber: "", trackingUrl: "" };
    this._loadShipments();

    if (this._invoiceId) {
      this.#workspaceContext?.load(this._invoiceId);
    }
  }

  private async _handleMarkAsDelivered(shipment: ShipmentDetailDto): Promise<void> {
    this._isUpdatingStatus = true;

    const { error } = await MerchelloApi.updateShipmentStatus(shipment.id, {
      newStatus: ShipmentStatus.Delivered,
    });

    if (!this.#isConnected) return;

    this._isUpdatingStatus = false;

    if (error) {
      this.#notificationContext?.peek("danger", {
        data: { headline: "Failed to update status", message: error.message },
      });
      return;
    }

    this.#notificationContext?.peek("positive", {
      data: { headline: "Shipment marked as delivered", message: "Status updated successfully" },
    });

    this._loadShipments();

    if (this._invoiceId) {
      this.#workspaceContext?.load(this._invoiceId);
    }
  }

  private async _handleCancelShipment(shipment: ShipmentDetailDto): Promise<void> {
    const modalContext = this.#modalManager?.open(this, UMB_CONFIRM_MODAL, {
      data: {
        headline: "Cancel Shipment",
        content: "Are you sure you want to cancel this shipment? This will release the items back to unfulfilled.",
        confirmLabel: "Cancel Shipment",
        color: "danger",
      },
    });

    try {
      await modalContext?.onSubmit();
    } catch {
      return; // User cancelled
    }
    if (!this.#isConnected) return;

    this._isUpdatingStatus = true;

    const { error } = await MerchelloApi.updateShipmentStatus(shipment.id, {
      newStatus: ShipmentStatus.Cancelled,
    });

    if (!this.#isConnected) return;

    this._isUpdatingStatus = false;

    if (error) {
      this.#notificationContext?.peek("danger", {
        data: { headline: "Failed to cancel shipment", message: error.message },
      });
      return;
    }

    this.#notificationContext?.peek("positive", {
      data: { headline: "Shipment cancelled", message: "Items released back to unfulfilled" },
    });

    this._loadShipments();

    if (this._invoiceId) {
      this.#workspaceContext?.load(this._invoiceId);
    }
  }

  private _renderShipmentCard(shipment: ShipmentDetailDto, orderWarehouse: string): unknown {
    const carrierBadgeClass = this._getCarrierClass(shipment.carrier);
    const isExpanded = this._expandedShipmentId === shipment.id;

    return html`
      <div class="shipment-card">
        <div class="shipment-header">
          <div class="header-left">
            <span class="shipment-status-badge ${shipment.statusCssClass}">${shipment.statusLabel}</span>
            ${shipment.carrier
              ? html`<span class="carrier-badge ${carrierBadgeClass}">${shipment.carrier}</span>`
              : nothing}
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

        ${this._renderStatusActions(shipment, isExpanded)}

        <div class="shipment-details">
          <div class="detail-row">
            <span class="label">Warehouse:</span>
            <span class="value">${orderWarehouse}</span>
          </div>
          ${shipment.shippedDate
            ? html`
                <div class="detail-row">
                  <span class="label">Shipped:</span>
                  <span class="value">${formatShortDate(shipment.shippedDate)}</span>
                </div>
              `
            : nothing}
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
                <merchello-line-item-identity
                  .mediaKey=${item.imageUrl ?? null}
                  name=${item.productRootName || item.name || ""}
                  .selectedOptions=${item.selectedOptions ?? []}
                  sku=${item.sku || ""}
                  size="medium">
                </merchello-line-item-identity>
                <div class="item-qty">x${item.quantity}</div>
              </div>
            `
          )}
        </div>
      </div>
    `;
  }

  private _renderStatusActions(shipment: ShipmentDetailDto, isExpanded: boolean): unknown {
    // Don't show actions for terminal states
    if (!shipment.canMarkAsShipped && !shipment.canMarkAsDelivered && !shipment.canCancel) {
      return nothing;
    }

    return html`
      <div class="status-actions">
        ${shipment.canMarkAsShipped
          ? html`
              <uui-button
                look="primary"
                color="positive"
                compact
                label="Mark as Shipped"
                ?disabled=${this._isUpdatingStatus}
                @click=${() => this._toggleMarkAsShippedForm(shipment)}
              >
                <uui-icon name="icon-truck"></uui-icon>
                Mark as Shipped
              </uui-button>
            `
          : nothing}
        ${shipment.canMarkAsDelivered
          ? html`
              <uui-button
                look="primary"
                color="positive"
                compact
                label="Mark as Delivered"
                ?disabled=${this._isUpdatingStatus}
                @click=${() => this._handleMarkAsDelivered(shipment)}
              >
                <uui-icon name="icon-check"></uui-icon>
                Mark as Delivered
              </uui-button>
            `
          : nothing}
        ${shipment.canCancel
          ? html`
              <uui-button
                look="secondary"
                color="danger"
                compact
                label="Cancel Shipment"
                ?disabled=${this._isUpdatingStatus}
                @click=${() => this._handleCancelShipment(shipment)}
              >
                Cancel
              </uui-button>
            `
          : nothing}
      </div>

      ${isExpanded ? this._renderTrackingForm(shipment) : nothing}
    `;
  }

  private _renderTrackingForm(shipment: ShipmentDetailDto): unknown {
    return html`
      <div class="tracking-form">
        <h4>Add tracking information (optional)</h4>
        <div class="form-row">
          <uui-form-layout-item>
            <uui-label slot="label">Carrier</uui-label>
            <uui-input
              label="Carrier"
              placeholder="e.g., UPS, FedEx, DHL"
              .value=${this._trackingForm.carrier}
              @input=${(e: InputEvent) =>
                this._handleTrackingFormChange("carrier", (e.target as HTMLInputElement).value)}
            ></uui-input>
          </uui-form-layout-item>
          <uui-form-layout-item>
            <uui-label slot="label">Tracking Number</uui-label>
            <uui-input
              label="Tracking Number"
              placeholder="Tracking number"
              .value=${this._trackingForm.trackingNumber}
              @input=${(e: InputEvent) =>
                this._handleTrackingFormChange("trackingNumber", (e.target as HTMLInputElement).value)}
            ></uui-input>
          </uui-form-layout-item>
          <uui-form-layout-item>
            <uui-label slot="label">Tracking URL</uui-label>
            <uui-input
              label="Tracking URL"
              placeholder="https://..."
              .value=${this._trackingForm.trackingUrl}
              @input=${(e: InputEvent) =>
                this._handleTrackingFormChange("trackingUrl", (e.target as HTMLInputElement).value)}
            ></uui-input>
          </uui-form-layout-item>
        </div>
        <div class="form-actions">
          <uui-button
            look="primary"
            color="positive"
            label="Confirm Shipped"
            ?disabled=${this._isUpdatingStatus}
            @click=${() => this._handleMarkAsShipped(shipment)}
          >
            ${this._isUpdatingStatus ? html`<uui-loader-circle></uui-loader-circle>` : "Confirm Shipped"}
          </uui-button>
          <uui-button
            look="secondary"
            label="Cancel"
            ?disabled=${this._isUpdatingStatus}
            @click=${() => this._toggleMarkAsShippedForm(shipment)}
          >
            Cancel
          </uui-button>
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
      this.#notificationContext?.peek("positive", {
        data: { headline: "Copied", message: "Tracking number copied to clipboard" },
      });
    } catch {
      this.#notificationContext?.peek("danger", {
        data: { headline: "Copy failed", message: "Unable to copy tracking number" },
      });
    }
  }

  private _renderOutstandingPaymentWarning(): unknown {
    if (!this._hasOutstandingBalance) {
      return nothing;
    }

    const paymentStatus = this._paymentStatusDisplay?.trim();
    const formattedBalanceDue = formatCurrency(this._balanceDue, this._currencyCode, this._currencySymbol);

    return html`
      <div class="payment-warning" role="status" aria-live="polite">
        <uui-icon name="icon-alert"></uui-icon>
        <div class="payment-warning-content">
          <strong>Payment outstanding</strong>
          <p>
            ${paymentStatus ? `${paymentStatus}.` : "This invoice is not fully paid."}
            Shipping actions are available for this order.
            Outstanding balance: <strong>${formattedBalanceDue}</strong>.
          </p>
        </div>
      </div>
    `;
  }

  override render() {
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
        <div class="shipments-view">
          ${this._renderOutstandingPaymentWarning()}
          <div class="empty-state">
            <uui-icon name="icon-box"></uui-icon>
            <h3>No shipments yet</h3>
            <p>Use the "Fulfill" button on the Details tab to create shipments for this order.</p>
          </div>
        </div>
      `;
    }

    return html`
      <div class="shipments-view">
        ${this._renderOutstandingPaymentWarning()}
        <div class="header">
          <h2>Shipments</h2>
          <div class="summary">
            <span class="status-badge ${this._fulfillmentData.overallStatusCssClass}">
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

  static override readonly styles = css`
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
      color: #fff;
      --uui-icon-color: #fff;
      border-radius: var(--uui-border-radius);
      padding: var(--uui-size-space-3);
      margin-bottom: var(--uui-size-space-4);
    }

    .payment-warning uui-icon {
      font-size: 1.25rem;
      flex-shrink: 0;
      margin-top: 2px;
      color: inherit;
    }

    .payment-warning-content strong {
      display: block;
      margin-bottom: var(--uui-size-space-1);
      color: inherit;
    }

    .payment-warning-content p {
      margin: 0;
      line-height: 1.4;
      color: inherit;
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
}

export default MerchelloShipmentsViewElement;

declare global {
  interface HTMLElementTagNameMap {
    "merchello-shipments-view": MerchelloShipmentsViewElement;
  }
}
