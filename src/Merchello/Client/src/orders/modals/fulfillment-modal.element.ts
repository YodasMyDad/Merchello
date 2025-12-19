import { html, css, nothing } from "@umbraco-cms/backoffice/external/lit";
import { customElement, state } from "@umbraco-cms/backoffice/external/lit";
import { UmbModalBaseElement, UMB_MODAL_MANAGER_CONTEXT, UMB_CONFIRM_MODAL } from "@umbraco-cms/backoffice/modal";
import type { UmbModalManagerContext } from "@umbraco-cms/backoffice/modal";
import { MerchelloApi } from "@api/merchello-api.js";
import { formatShortDate } from "@shared/utils/formatting.js";
import type {
  FulfillmentSummaryDto,
  OrderFulfillmentDto,
  FulfillmentLineItemDto,
  CreateShipmentDto,
  ShipmentDetailDto,
} from "@orders/types/order.types.js";
import type { FulfillmentModalData, FulfillmentModalValue } from "./fulfillment-modal.token.js";

// Import shared components
import "@shared/components/product-image.element.js";

interface SelectedItem {
  lineItemId: string;
  quantity: number;
  maxQuantity: number;
  name: string;
  sku: string | null;
}

interface OrderTrackingInfo {
  carrier: string;
  trackingNumber: string;
  trackingUrl: string;
}

@customElement("merchello-fulfillment-modal")
export class MerchelloFulfillmentModalElement extends UmbModalBaseElement<
  FulfillmentModalData,
  FulfillmentModalValue
> {
  @state() private _summary: FulfillmentSummaryDto | null = null;
  @state() private _isLoading: boolean = true;
  @state() private _errorMessage: string | null = null;
  @state() private _isCreating: boolean = false;
  @state() private _shipmentsCreated: number = 0;

  // Selection state per order (orderId -> Map of lineItemId -> SelectedItem)
  @state() private _selectedItems: Map<string, Map<string, SelectedItem>> = new Map();

  // Per-order tracking info
  @state() private _orderTrackingInfo: Map<string, OrderTrackingInfo> = new Map();

  // Collapsible state
  @state() private _expandedOrders: Set<string> = new Set();
  @state() private _existingShipmentsExpanded: boolean = false;

  #isConnected = false;
  #modalManager?: UmbModalManagerContext;

  constructor() {
    super();
    this.consumeContext(UMB_MODAL_MANAGER_CONTEXT, (context) => {
      this.#modalManager = context;
    });
  }

  connectedCallback(): void {
    super.connectedCallback();
    this.#isConnected = true;
    this._loadFulfillmentSummary();
  }

  disconnectedCallback(): void {
    super.disconnectedCallback();
    this.#isConnected = false;
  }

  private async _loadFulfillmentSummary(): Promise<void> {
    this._isLoading = true;
    this._errorMessage = null;

    const { data, error } = await MerchelloApi.getFulfillmentSummary(this.data!.invoiceId);

    // Prevent state updates if component was disconnected during async operation
    if (!this.#isConnected) return;

    if (error) {
      this._errorMessage = error.message;
      this._isLoading = false;
      return;
    }

    this._summary = data ?? null;
    this._isLoading = false;

    // Initialize state for orders with remaining items
    if (this._summary) {
      const newTrackingInfo = new Map<string, OrderTrackingInfo>();
      const newExpanded = new Set<string>();
      const newSelectedItems = new Map<string, Map<string, SelectedItem>>();

      for (const order of this._summary.orders) {
        const hasRemainingItems = order.lineItems.some((li) => li.remainingQuantity > 0);
        if (hasRemainingItems) {
          newTrackingInfo.set(order.orderId, {
            carrier: "",
            trackingNumber: "",
            trackingUrl: "",
          });
          newExpanded.add(order.orderId);

          // Pre-select all remaining items by default
          const orderSelections = new Map<string, SelectedItem>();
          for (const item of order.lineItems) {
            if (item.remainingQuantity > 0) {
              orderSelections.set(item.id, {
                lineItemId: item.id,
                quantity: item.remainingQuantity,
                maxQuantity: item.remainingQuantity,
                name: item.name ?? "Unknown",
                sku: item.sku,
              });
            }
          }
          newSelectedItems.set(order.orderId, orderSelections);
        }
      }

      this._orderTrackingInfo = newTrackingInfo;
      this._expandedOrders = newExpanded;
      this._selectedItems = newSelectedItems;
    }
  }

  private _toggleOrderExpanded(orderId: string): void {
    const newExpanded = new Set(this._expandedOrders);
    if (newExpanded.has(orderId)) {
      newExpanded.delete(orderId);
    } else {
      newExpanded.add(orderId);
    }
    this._expandedOrders = newExpanded;
  }

  private _updateOrderTracking(
    orderId: string,
    field: keyof OrderTrackingInfo,
    value: string
  ): void {
    const current = this._orderTrackingInfo.get(orderId);
    if (!current) return;

    const updated = { ...current, [field]: value };
    const newMap = new Map(this._orderTrackingInfo);
    newMap.set(orderId, updated);
    this._orderTrackingInfo = newMap;
  }

  private _toggleItemSelection(orderId: string, item: FulfillmentLineItemDto): void {
    const orderSelections = this._selectedItems.get(orderId) ?? new Map();

    if (orderSelections.has(item.id)) {
      orderSelections.delete(item.id);
    } else {
      orderSelections.set(item.id, {
        lineItemId: item.id,
        quantity: item.remainingQuantity,
        maxQuantity: item.remainingQuantity,
        name: item.name ?? "Unknown",
        sku: item.sku,
      });
    }

    this._selectedItems.set(orderId, orderSelections);
    this._selectedItems = new Map(this._selectedItems); // Trigger reactivity
  }

  private _updateItemQuantity(orderId: string, lineItemId: string, quantity: number): void {
    const orderSelections = this._selectedItems.get(orderId);
    if (!orderSelections) return;

    const item = orderSelections.get(lineItemId);
    if (!item) return;

    const clampedQuantity = Math.max(1, Math.min(quantity, item.maxQuantity));
    orderSelections.set(lineItemId, { ...item, quantity: clampedQuantity });

    this._selectedItems = new Map(this._selectedItems); // Trigger reactivity
  }

  private _selectAllItems(orderId: string): void {
    const order = this._summary?.orders.find((o) => o.orderId === orderId);
    if (!order) return;

    const orderSelections = new Map<string, SelectedItem>();
    for (const item of order.lineItems) {
      if (item.remainingQuantity > 0) {
        orderSelections.set(item.id, {
          lineItemId: item.id,
          quantity: item.remainingQuantity,
          maxQuantity: item.remainingQuantity,
          name: item.name ?? "Unknown",
          sku: item.sku,
        });
      }
    }

    this._selectedItems.set(orderId, orderSelections);
    this._selectedItems = new Map(this._selectedItems);
  }

  private _clearSelection(orderId: string): void {
    this._selectedItems.set(orderId, new Map());
    this._selectedItems = new Map(this._selectedItems);
  }

  private _getSelectedCount(orderId: string): number {
    return this._selectedItems.get(orderId)?.size ?? 0;
  }

  private _getTotalSelectedQuantity(orderId: string): number {
    const orderSelections = this._selectedItems.get(orderId);
    if (!orderSelections) return 0;
    return Array.from(orderSelections.values()).reduce((sum, item) => sum + item.quantity, 0);
  }

  private _getOrdersWithRemainingItems(): OrderFulfillmentDto[] {
    if (!this._summary) return [];
    return this._summary.orders.filter((order) =>
      order.lineItems.some((li) => li.remainingQuantity > 0)
    );
  }

  private _getOrdersWithSelections(): OrderFulfillmentDto[] {
    return this._getOrdersWithRemainingItems().filter(
      (order) => this._getSelectedCount(order.orderId) > 0
    );
  }

  private _getTotalItemsToShip(): number {
    let total = 0;
    for (const order of this._getOrdersWithSelections()) {
      total += this._getTotalSelectedQuantity(order.orderId);
    }
    return total;
  }

  private _getAllExistingShipments(): { shipment: ShipmentDetailDto; warehouseName: string }[] {
    if (!this._summary) return [];
    const shipments: { shipment: ShipmentDetailDto; warehouseName: string }[] = [];
    for (const order of this._summary.orders) {
      for (const shipment of order.shipments) {
        shipments.push({ shipment, warehouseName: order.warehouseName });
      }
    }
    return shipments;
  }

  private async _createAllShipments(): Promise<void> {
    const ordersToShip = this._getOrdersWithSelections();
    if (ordersToShip.length === 0) return;

    this._isCreating = true;
    this._errorMessage = null;

    let successCount = 0;
    const errors: string[] = [];

    for (const order of ordersToShip) {
      // Check connection status before each iteration
      if (!this.#isConnected) return;

      const trackingInfo = this._orderTrackingInfo.get(order.orderId);
      const orderSelections = this._selectedItems.get(order.orderId);

      if (!orderSelections || orderSelections.size === 0) continue;

      // Build line items from selections
      const lineItems: Record<string, number> = {};
      for (const [lineItemId, item] of orderSelections) {
        lineItems[lineItemId] = item.quantity;
      }

      const request: CreateShipmentDto = {
        lineItems,
        carrier: trackingInfo?.carrier || undefined,
        trackingNumber: trackingInfo?.trackingNumber || undefined,
        trackingUrl: trackingInfo?.trackingUrl || undefined,
      };

      const { error } = await MerchelloApi.createShipment(order.orderId, request);

      if (error) {
        errors.push(`${order.warehouseName}: ${error.message}`);
      } else {
        successCount++;
      }
    }

    // Prevent state updates if component was disconnected during async operation
    if (!this.#isConnected) return;

    this._isCreating = false;
    this._shipmentsCreated += successCount;

    if (errors.length > 0) {
      this._errorMessage = `Some shipments failed: ${errors.join("; ")}`;
    }

    // Reload to show updated state
    await this._loadFulfillmentSummary();
  }

  private async _deleteShipment(shipmentId: string): Promise<void> {
    const modalContext = this.#modalManager?.open(this, UMB_CONFIRM_MODAL, {
      data: {
        headline: "Delete Shipment",
        content: "Are you sure you want to delete this shipment? Items will be released back to unfulfilled.",
        confirmLabel: "Delete",
        color: "danger",
      },
    });

    const result = await modalContext?.onSubmit().catch(() => undefined);
    if (!result) return; // User cancelled
    if (!this.#isConnected) return; // Component disconnected while modal was open

    const { error } = await MerchelloApi.deleteShipment(shipmentId);

    // Prevent state updates if component was disconnected during async operation
    if (!this.#isConnected) return;

    if (error) {
      this._errorMessage = error.message;
      return;
    }

    // Reload the summary
    await this._loadFulfillmentSummary();
  }

  private _handleClose(): void {
    this.modalContext?.setValue({ shipmentsCreated: this._shipmentsCreated });
    this.modalContext?.submit();
  }


  private _renderShipmentCard(order: OrderFulfillmentDto): unknown {
    const remainingItems = order.lineItems.filter((li) => li.remainingQuantity > 0);
    if (remainingItems.length === 0) return nothing;

    const isExpanded = this._expandedOrders.has(order.orderId);
    const trackingInfo = this._orderTrackingInfo.get(order.orderId);
    const orderSelections = this._selectedItems.get(order.orderId) ?? new Map();
    const selectedCount = this._getSelectedCount(order.orderId);
    const totalSelected = this._getTotalSelectedQuantity(order.orderId);
    const totalRemaining = remainingItems.reduce((sum, li) => sum + li.remainingQuantity, 0);

    return html`
      <div class="shipment-card ${selectedCount > 0 ? "has-selection" : ""}">
        <div
          class="shipment-header"
          @click=${() => this._toggleOrderExpanded(order.orderId)}
        >
          <div class="header-info">
            <uui-icon name="${isExpanded ? "icon-navigation-down" : "icon-navigation-right"}"></uui-icon>
            <span class="warehouse-name">${order.warehouseName}</span>
            <span class="item-count">
              ${selectedCount > 0
                ? `${totalSelected} of ${totalRemaining} selected`
                : `${totalRemaining} item${totalRemaining !== 1 ? "s" : ""} to ship`}
            </span>
          </div>
          <div class="header-meta">
            <span class="delivery-method">${order.deliveryMethod}</span>
          </div>
        </div>

        ${isExpanded
          ? html`
              <div class="shipment-content">
                <div class="items-section">
                  <div class="items-header">
                    <h4>Items to ship</h4>
                    <div class="selection-actions">
                      <uui-button
                        look="secondary"
                        compact
                        label="Select All"
                        @click=${() => this._selectAllItems(order.orderId)}
                      >
                        Select All
                      </uui-button>
                      ${selectedCount > 0
                        ? html`
                            <uui-button
                              look="secondary"
                              compact
                              label="Clear"
                              @click=${() => this._clearSelection(order.orderId)}
                            >
                              Clear
                            </uui-button>
                          `
                        : nothing}
                    </div>
                  </div>
                  <div class="items-list">
                    ${remainingItems.map((item) => this._renderLineItem(order.orderId, item, orderSelections))}
                  </div>
                </div>

                ${selectedCount > 0
                  ? html`
                      <div class="tracking-section">
                        <h4>Tracking Information (optional)</h4>
                        <div class="tracking-fields">
                          <umb-property-layout label="Carrier">
                            <uui-input
                              slot="editor"
                              type="text"
                              placeholder="e.g., UPS, FedEx, DHL"
                              .value=${trackingInfo?.carrier ?? ""}
                              @input=${(e: Event) =>
                                this._updateOrderTracking(
                                  order.orderId,
                                  "carrier",
                                  (e.target as HTMLInputElement).value
                                )}>
                            </uui-input>
                          </umb-property-layout>
                          <umb-property-layout label="Tracking Number">
                            <uui-input
                              slot="editor"
                              type="text"
                              placeholder="e.g., 1Z999AA10123456784"
                              .value=${trackingInfo?.trackingNumber ?? ""}
                              @input=${(e: Event) =>
                                this._updateOrderTracking(
                                  order.orderId,
                                  "trackingNumber",
                                  (e.target as HTMLInputElement).value
                                )}>
                            </uui-input>
                          </umb-property-layout>
                          <umb-property-layout label="Tracking URL">
                            <uui-input
                              slot="editor"
                              type="text"
                              placeholder="https://..."
                              .value=${trackingInfo?.trackingUrl ?? ""}
                              @input=${(e: Event) =>
                                this._updateOrderTracking(
                                  order.orderId,
                                  "trackingUrl",
                                  (e.target as HTMLInputElement).value
                                )}>
                            </uui-input>
                          </umb-property-layout>
                        </div>
                      </div>
                    `
                  : nothing}
              </div>
            `
          : nothing}
      </div>
    `;
  }

  private _renderLineItem(
    orderId: string,
    item: FulfillmentLineItemDto,
    orderSelections: Map<string, SelectedItem>
  ): unknown {
    const isSelected = orderSelections.has(item.id);
    const selectedItem = orderSelections.get(item.id);

    return html`
      <div class="item-row ${isSelected ? "selected" : ""}">
        <uui-checkbox
          ?checked=${isSelected}
          @change=${() => this._toggleItemSelection(orderId, item)}
          aria-label="Select ${item.name || 'item'}"
        ></uui-checkbox>
        <div class="item-image">
          <merchello-product-image
            media-key=${item.imageUrl || nothing}
            size="medium"
            alt=${item.name || ""}>
          </merchello-product-image>
        </div>
        <div class="item-details">
          <div class="item-name">${item.name || "Unknown item"}</div>
          <div class="item-sku">${item.sku || "No SKU"}</div>
        </div>
        <div class="item-quantity">
          ${isSelected
            ? html`
                <uui-input
                  type="number"
                  min="1"
                  max="${item.remainingQuantity}"
                  .value=${String(selectedItem?.quantity ?? item.remainingQuantity)}
                  @input=${(e: Event) =>
                    this._updateItemQuantity(
                      orderId,
                      item.id,
                      parseInt((e.target as HTMLInputElement).value) || 1
                    )}
                  @click=${(e: Event) => e.stopPropagation()}
                  label="Quantity"
                ></uui-input>
                <span class="qty-label">/ ${item.remainingQuantity}</span>
              `
            : html`<span class="qty-available">${item.remainingQuantity} available</span>`}
        </div>
      </div>
    `;
  }

  private _renderExistingShipmentsSection(): unknown {
    const existingShipments = this._getAllExistingShipments();
    if (existingShipments.length === 0) return nothing;

    return html`
      <div class="existing-shipments-section">
        <div
          class="section-header"
          @click=${() => (this._existingShipmentsExpanded = !this._existingShipmentsExpanded)}
        >
          <uui-icon
            name="${this._existingShipmentsExpanded ? "icon-navigation-down" : "icon-navigation-right"}"
          ></uui-icon>
          <span>Existing Shipments (${existingShipments.length})</span>
        </div>

        ${this._existingShipmentsExpanded
          ? html`
              <div class="existing-shipments-list">
                ${existingShipments.map(
                  ({ shipment, warehouseName }) => html`
                    <div class="existing-shipment-card">
                      <div class="existing-shipment-header">
                        <span class="carrier">${shipment.carrier || "No carrier"}</span>
                        ${shipment.trackingNumber
                          ? html`<span class="tracking">${shipment.trackingNumber}</span>`
                          : nothing}
                        <span class="date">${formatShortDate(shipment.dateCreated)}</span>
                      </div>
                      <div class="existing-shipment-meta">
                        <span class="warehouse">${warehouseName}</span>
                        <span class="item-count">
                          ${shipment.lineItems.reduce((sum, li) => sum + li.quantity, 0)} items
                        </span>
                      </div>
                      <div class="existing-shipment-actions">
                        ${shipment.trackingUrl
                          ? html`
                              <a href="${shipment.trackingUrl}" target="_blank" class="track-link">
                                Track
                              </a>
                            `
                          : nothing}
                        <uui-button
                          look="secondary"
                          color="danger"
                          compact
                          label="Delete"
                          @click=${() => this._deleteShipment(shipment.id)}
                        >
                          Delete
                        </uui-button>
                      </div>
                    </div>
                  `
                )}
              </div>
            `
          : nothing}
      </div>
    `;
  }

  private _renderLoadingState(): unknown {
    return html`
      <div class="loading">
        <uui-loader></uui-loader>
      </div>
    `;
  }

  private _renderErrorState(): unknown {
    return html`
      <div class="error">
        <uui-icon name="icon-alert"></uui-icon>
        ${this._errorMessage}
        <uui-button look="secondary" @click=${this._loadFulfillmentSummary}>
          Retry
        </uui-button>
      </div>
    `;
  }

  private _renderAllFulfilledState(): unknown {
    return html`
      <div class="all-fulfilled">
        <uui-icon name="icon-check"></uui-icon>
        <h3>All items fulfilled</h3>
        <p>All items in this order have been shipped.</p>
      </div>
    `;
  }

  private _renderMainContent(): unknown {
    if (this._isLoading) {
      return this._renderLoadingState();
    }
    if (this._errorMessage) {
      return this._renderErrorState();
    }
    if (!this._summary) {
      return html`<div class="empty-message">No order data available</div>`;
    }

    const ordersWithRemaining = this._getOrdersWithRemainingItems();
    const hasItemsToShip = ordersWithRemaining.length > 0;

    return html`
      <div class="status-bar">
        <span class="status-label">Overall Status:</span>
        <span class="status-badge ${this._summary.overallStatus.toLowerCase()}">
          ${this._summary.overallStatus}
        </span>
      </div>

      ${hasItemsToShip
        ? html`
            <div class="shipments-to-create">
              <h3>Shipments to Create</h3>
              <p class="description">
                Select the items to include in each shipment. Items are pre-selected by default.
              </p>
              <div class="shipment-cards">
                ${ordersWithRemaining.map((order) => this._renderShipmentCard(order))}
              </div>
            </div>
          `
        : this._renderAllFulfilledState()}

      ${this._renderExistingShipmentsSection()}
    `;
  }

  render() {
    const ordersWithSelections = this._getOrdersWithSelections();
    const totalItemsToShip = this._getTotalItemsToShip();
    const hasSelections = ordersWithSelections.length > 0;

    return html`
      <umb-body-layout headline="Fulfil Order ${this._summary?.invoiceNumber ?? ""}">
        <div id="main">
          ${this._renderMainContent()}
        </div>

        <div slot="actions">
          ${hasSelections
            ? html`
                <uui-button
                  look="primary"
                  label="Create Shipments"
                  ?disabled=${this._isCreating}
                  @click=${this._createAllShipments}
                >
                  ${this._isCreating
                    ? "Creating..."
                    : `Create ${ordersWithSelections.length} Shipment${ordersWithSelections.length !== 1 ? "s" : ""} (${totalItemsToShip} items)`}
                </uui-button>
              `
            : nothing}
          <uui-button look="secondary" label="Close" @click=${this._handleClose}>
            Close
          </uui-button>
        </div>
      </umb-body-layout>
    `;
  }

  static styles = css`
    :host {
      display: block;
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
      margin-bottom: var(--uui-size-space-4);
    }

    .status-bar {
      display: flex;
      align-items: center;
      gap: var(--uui-size-space-2);
      margin-bottom: var(--uui-size-space-4);
      padding: var(--uui-size-space-3);
      background: var(--uui-color-surface);
      border-radius: var(--uui-border-radius);
    }

    .status-label {
      font-weight: 500;
    }

    .status-badge {
      display: inline-block;
      padding: 2px 8px;
      border-radius: 12px;
      font-size: 0.75rem;
      font-weight: 500;
    }

    .status-badge.unfulfilled {
      background: var(--uui-color-warning-standalone);
      color: var(--uui-color-warning-contrast);
    }

    .status-badge.partial {
      background: var(--uui-color-default-standalone);
      color: var(--uui-color-default-contrast);
    }

    .status-badge.fulfilled {
      background: var(--uui-color-positive-standalone);
      color: var(--uui-color-positive-contrast);
    }

    .shipments-to-create h3 {
      margin: 0 0 var(--uui-size-space-2);
      font-size: 1rem;
      font-weight: 600;
    }

    .shipments-to-create .description {
      margin: 0 0 var(--uui-size-space-4);
      color: var(--uui-color-text-alt);
      font-size: 0.875rem;
    }

    .shipment-cards {
      display: flex;
      flex-direction: column;
      gap: var(--uui-size-space-3);
    }

    .shipment-card {
      background: var(--uui-color-surface);
      border: 1px solid var(--uui-color-border);
      border-radius: var(--uui-border-radius);
      overflow: hidden;
    }

    .shipment-card.has-selection {
      border-color: var(--uui-color-positive);
    }

    .shipment-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: var(--uui-size-space-3) var(--uui-size-space-4);
      background: var(--uui-color-surface-alt);
      cursor: pointer;
    }

    .shipment-header:hover {
      background: var(--uui-color-surface-emphasis);
    }

    .header-info {
      display: flex;
      align-items: center;
      gap: var(--uui-size-space-2);
    }

    .warehouse-name {
      font-weight: 600;
    }

    .item-count {
      color: var(--uui-color-text-alt);
      font-size: 0.875rem;
    }

    .header-meta {
      display: flex;
      align-items: center;
      gap: var(--uui-size-space-2);
    }

    .delivery-method {
      font-size: 0.875rem;
      color: var(--uui-color-text-alt);
    }

    .shipment-content {
      padding: var(--uui-size-space-4);
    }

    .items-section {
      margin-bottom: var(--uui-size-space-4);
    }

    .items-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: var(--uui-size-space-2);
    }

    .items-header h4,
    .tracking-section h4 {
      margin: 0;
      font-size: 0.75rem;
      font-weight: 600;
      text-transform: uppercase;
      color: var(--uui-color-text-alt);
    }

    .selection-actions {
      display: flex;
      gap: var(--uui-size-space-2);
    }

    .items-list {
      display: flex;
      flex-direction: column;
      gap: var(--uui-size-space-2);
      background: var(--uui-color-surface-alt);
      border-radius: var(--uui-border-radius);
      padding: var(--uui-size-space-2);
    }

    .item-row {
      display: grid;
      grid-template-columns: auto 40px 1fr auto;
      align-items: center;
      gap: var(--uui-size-space-3);
      padding: var(--uui-size-space-2);
      border-radius: var(--uui-border-radius);
    }

    .item-row.selected {
      background: var(--uui-color-selected);
      color: var(--uui-color-selected-contrast, #fff);
    }

    .item-row.selected .item-sku {
      color: var(--uui-color-selected-contrast, #fff);
      opacity: 0.8;
    }

    .item-row.selected .qty-label {
      color: var(--uui-color-selected-contrast, #fff);
      opacity: 0.8;
    }

    .item-row input[type="checkbox"] {
      width: 18px;
      height: 18px;
      cursor: pointer;
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

    .item-details {
      flex: 1;
      min-width: 0;
    }

    .item-name {
      font-weight: 500;
      font-size: 0.875rem;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .item-sku {
      font-size: 0.75rem;
      color: var(--uui-color-text-alt);
    }

    .item-quantity {
      display: flex;
      align-items: center;
      gap: var(--uui-size-space-2);
    }

    .item-quantity input[type="number"] {
      width: 60px;
      padding: var(--uui-size-space-1);
      border: 1px solid var(--uui-color-border);
      border-radius: var(--uui-border-radius);
      text-align: center;
    }

    .qty-label {
      font-size: 0.75rem;
      color: var(--uui-color-text-alt);
    }

    .qty-available {
      font-size: 0.875rem;
      color: var(--uui-color-text-alt);
    }

    .tracking-section {
      padding-top: var(--uui-size-space-4);
      border-top: 1px solid var(--uui-color-border);
    }

    .tracking-section h4 {
      margin-bottom: var(--uui-size-space-2);
    }

    .tracking-fields {
      background: var(--uui-color-surface-alt);
      border-radius: var(--uui-border-radius);
      padding: var(--uui-size-space-3);
    }

    .tracking-fields umb-property-layout {
      --umb-property-layout-label-width: 140px;
    }

    .tracking-fields umb-property-layout:first-child {
      padding-top: 0;
    }

    .tracking-fields umb-property-layout:last-child {
      padding-bottom: 0;
    }

    .tracking-fields umb-property-layout uui-input {
      width: 100%;
    }

    .all-fulfilled {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: var(--uui-size-layout-4);
      text-align: center;
      background: var(--uui-color-surface);
      border-radius: var(--uui-border-radius);
    }

    .all-fulfilled uui-icon {
      font-size: 48px;
      color: #155724;
      margin-bottom: var(--uui-size-space-4);
    }

    .all-fulfilled h3 {
      margin: 0 0 var(--uui-size-space-2);
      font-size: 1.25rem;
      color: #155724;
    }

    .all-fulfilled p {
      margin: 0;
      color: var(--uui-color-text-alt);
    }

    .existing-shipments-section {
      margin-top: var(--uui-size-space-4);
      border-top: 1px solid var(--uui-color-border);
      padding-top: var(--uui-size-space-4);
    }

    .existing-shipments-section .section-header {
      display: flex;
      align-items: center;
      gap: var(--uui-size-space-2);
      cursor: pointer;
      font-weight: 500;
      padding: var(--uui-size-space-2);
      border-radius: var(--uui-border-radius);
    }

    .existing-shipments-section .section-header:hover {
      background: var(--uui-color-surface-alt);
    }

    .existing-shipments-list {
      display: flex;
      flex-direction: column;
      gap: var(--uui-size-space-2);
      margin-top: var(--uui-size-space-3);
    }

    .existing-shipment-card {
      padding: var(--uui-size-space-3);
      background: var(--uui-color-surface);
      border: 1px solid var(--uui-color-border);
      border-radius: var(--uui-border-radius);
    }

    .existing-shipment-header {
      display: flex;
      align-items: center;
      gap: var(--uui-size-space-2);
      margin-bottom: var(--uui-size-space-2);
    }

    .existing-shipment-header .carrier {
      font-weight: 600;
    }

    .existing-shipment-header .tracking {
      font-family: monospace;
      font-size: 0.875rem;
      background: var(--uui-color-surface-alt);
      padding: 2px 6px;
      border-radius: var(--uui-border-radius);
    }

    .existing-shipment-header .date {
      margin-left: auto;
      font-size: 0.75rem;
      color: var(--uui-color-text-alt);
    }

    .existing-shipment-meta {
      display: flex;
      gap: var(--uui-size-space-3);
      font-size: 0.875rem;
      color: var(--uui-color-text-alt);
      margin-bottom: var(--uui-size-space-2);
    }

    .existing-shipment-actions {
      display: flex;
      gap: var(--uui-size-space-2);
    }

    .track-link {
      font-size: 0.875rem;
      color: var(--uui-color-interactive);
    }

    .empty-message {
      padding: var(--uui-size-space-4);
      text-align: center;
      color: var(--uui-color-text-alt);
      font-style: italic;
    }
  `;
}

export default MerchelloFulfillmentModalElement;

declare global {
  interface HTMLElementTagNameMap {
    "merchello-fulfillment-modal": MerchelloFulfillmentModalElement;
  }
}
