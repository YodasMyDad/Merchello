import { LitElement, html, css, nothing } from "@umbraco-cms/backoffice/external/lit";
import { customElement, state } from "@umbraco-cms/backoffice/external/lit";
import { UmbElementMixin } from "@umbraco-cms/backoffice/element-api";
import { UMB_WORKSPACE_CONTEXT } from "@umbraco-cms/backoffice/workspace";
import { UMB_MODAL_MANAGER_CONTEXT } from "@umbraco-cms/backoffice/modal";
import type { UmbModalManagerContext } from "@umbraco-cms/backoffice/modal";
import type { OrderDetailDto, AddressDto, FulfillmentOrderDto, InvoicePaymentStatus } from "../types/order.types.js";
import type { MerchelloOrderDetailWorkspaceContext } from "../contexts/order-detail-workspace.context.js";
import { MERCHELLO_FULFILLMENT_MODAL } from "../modals/fulfillment-modal.token.js";
import { formatCurrency, formatDateTime } from "@shared/utils/formatting.js";

// Import the shipments view component
import "./shipments-view.element.js";

// Import the payment panel component
import "./payment-panel.element.js";

@customElement("merchello-order-detail")
export class MerchelloOrderDetailElement extends UmbElementMixin(LitElement) {
  @state() private _order: OrderDetailDto | null = null;
  @state() private _isLoading = true;
  @state() private _activeTab: "details" | "shipments" | "payments" = "details";

  #workspaceContext?: MerchelloOrderDetailWorkspaceContext;
  #modalManager?: UmbModalManagerContext;

  constructor() {
    super();
    this.consumeContext(UMB_WORKSPACE_CONTEXT, (context) => {
      this.#workspaceContext = context as MerchelloOrderDetailWorkspaceContext;
      this.observe(this.#workspaceContext.order, (order) => {
        this._order = order ?? null;
        this._isLoading = !order;
      });
    });
    this.consumeContext(UMB_MODAL_MANAGER_CONTEXT, (context) => {
      this.#modalManager = context;
    });
  }

  private async _openFulfillmentModal(): Promise<void> {
    if (!this._order || !this.#modalManager) return;

    const modal = this.#modalManager.open(this, MERCHELLO_FULFILLMENT_MODAL, {
      data: { invoiceId: this._order.id },
    });

    // Wait for modal to close (submit or reject)
    await modal.onSubmit().catch(() => undefined);

    // Always refresh the order data when modal closes to ensure status is up to date
    this.#workspaceContext?.load(this._order.id);
  }


  private _getPaymentStatusBadgeClass(status: InvoicePaymentStatus): string {
    switch (status) {
      case 30: // Paid
        return "paid";
      case 20: // PartiallyPaid
        return "partial";
      case 50: // Refunded
      case 40: // PartiallyRefunded
        return "refunded";
      case 10: // AwaitingPayment
        return "awaiting";
      default:
        return "unpaid";
    }
  }

  private _formatAddress(address: AddressDto | null): string[] {
    if (!address) return ["No address"];
    const lines: string[] = [];
    if (address.name) lines.push(address.name);
    if (address.addressOne) lines.push(address.addressOne);
    if (address.addressTwo) lines.push(address.addressTwo);
    const cityLine = [address.townCity, address.countyState, address.postalCode].filter(Boolean).join(" ");
    if (cityLine) lines.push(cityLine);
    if (address.country) lines.push(address.country);
    if (address.phone) lines.push(address.phone);
    return lines;
  }

  private _renderFulfillmentCard(fulfillmentOrder: FulfillmentOrderDto): unknown {
    const statusLabel = this._getStatusLabel(fulfillmentOrder.status);
    const isFulfilled = this._order?.fulfillmentStatus === "Fulfilled";
    const statusClass = fulfillmentOrder.status >= 50 ? "shipped" : "unfulfilled";

    return html`
      <div class="card fulfillment-card">
        <div class="card-header">
          <span class="status-badge ${statusClass}">${statusLabel}</span>
          <span class="shipping-method">${fulfillmentOrder.deliveryMethod}</span>
        </div>
        <div class="line-items">
          ${fulfillmentOrder.lineItems.map(
            (item) => html`
              <div class="line-item">
                <div class="item-image">
                  ${item.imageUrl
                    ? html`<img src="${item.imageUrl}" alt="${item.name}" />`
                    : html`<div class="placeholder-image"></div>`}
                </div>
                <div class="item-details">
                  <div class="item-name">${item.name}</div>
                  <div class="item-sku">${item.sku}</div>
                </div>
                <div class="item-price">${formatCurrency(item.amount)} x ${item.quantity}</div>
                <div class="item-total">${formatCurrency(item.amount * item.quantity)}</div>
              </div>
            `
          )}
        </div>
        <div class="card-footer">
          <uui-button
            look="${isFulfilled ? 'secondary' : 'primary'}"
            label="${isFulfilled ? 'Fulfilled' : 'Fulfil'}"
            ?disabled=${isFulfilled}
            @click=${isFulfilled ? nothing : this._openFulfillmentModal}
          >
            ${isFulfilled ? "Fulfilled" : "Fulfil"}
          </uui-button>
        </div>
      </div>
    `;
  }

  private _getStatusLabel(status: number): string {
    const statusMap: Record<number, string> = {
      0: "Pending",
      10: "Awaiting Stock",
      20: "Ready to Fulfill",
      30: "Processing",
      40: "Partially Shipped",
      50: "Shipped",
      60: "Completed",
      70: "Cancelled",
      80: "On Hold",
    };
    return statusMap[status] || "Unknown";
  }

  private _handleTabClick(tab: "details" | "shipments" | "payments"): void {
    this._activeTab = tab;
  }

  private _handlePaymentChange(): void {
    // Reload order data when payment changes
    if (this._order) {
      this.#workspaceContext?.load(this._order.id);
    }
  }

  private _renderLoadingState(): unknown {
    return html`<div class="loading"><uui-loader></uui-loader></div>`;
  }

  private _renderNotFoundState(): unknown {
    return html`<div class="error">Order not found</div>`;
  }

  render() {
    if (this._isLoading) {
      return this._renderLoadingState();
    }

    if (!this._order) {
      return this._renderNotFoundState();
    }

    const order = this._order;

    return html`
      <div class="order-detail">
        <!-- Header -->
        <div class="order-header">
          <div class="header-left">
            <h1>${order.invoiceNumber || "Order"}</h1>
            <span class="badge ${this._getPaymentStatusBadgeClass(order.paymentStatus)}">${order.paymentStatusDisplay}</span>
            <span class="badge ${order.fulfillmentStatus.toLowerCase().replace(" ", "-")}">${order.fulfillmentStatus}</span>
          </div>
          <div class="header-right">
            <uui-button look="secondary" label="Refund">Refund</uui-button>
            <uui-button look="secondary" label="Edit">Edit</uui-button>
            <uui-button look="secondary" label="More actions">More actions</uui-button>
          </div>
        </div>
        <div class="order-meta">
          ${formatDateTime(order.dateCreated)} from ${order.channel}
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
        ${this._activeTab === "shipments"
          ? html`<merchello-shipments-view></merchello-shipments-view>`
          : this._activeTab === "payments"
          ? html`
              <merchello-payment-panel
                invoiceId=${order.id}
                @payment-recorded=${this._handlePaymentChange}
                @refund-processed=${this._handlePaymentChange}
              ></merchello-payment-panel>
            `
          : html`
        <!-- Main Content -->
        <div class="order-content">
          <!-- Left Column -->
          <div class="main-column">
            <!-- Fulfillment Cards -->
            ${order.orders.map((fo) => this._renderFulfillmentCard(fo))}

            <!-- Payment Summary -->
            <div class="card payment-card">
              <div class="card-header">
                <input type="checkbox" checked disabled />
                <span>${order.paymentStatusDisplay}</span>
              </div>
              <div class="payment-summary">
                <div class="summary-row">
                  <span>Subtotal</span>
                  <span>${order.orders.reduce((sum, o) => sum + o.lineItems.reduce((s, li) => s + li.quantity, 0), 0)} items</span>
                  <span>${formatCurrency(order.subTotal)}</span>
                </div>
                <div class="summary-row">
                  <span>Shipping</span>
                  <span>${order.orders[0]?.deliveryMethod || "Standard"}</span>
                  <span>${formatCurrency(order.shippingCost)}</span>
                </div>
                <div class="summary-row total">
                  <span>Total</span>
                  <span></span>
                  <span>${formatCurrency(order.total)}</span>
                </div>
                <div class="summary-row">
                  <span>Paid</span>
                  <span></span>
                  <span>${formatCurrency(order.amountPaid)}</span>
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
                ${order.notes.length === 0
                  ? html`<div class="no-notes">No timeline events yet</div>`
                  : order.notes.map(
                      (note) => html`
                        <div class="timeline-event">
                          <div class="event-time">${formatDateTime(note.date)}</div>
                          <div class="event-text">${note.text}</div>
                          ${note.author ? html`<div class="event-author">by ${note.author}</div>` : nothing}
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
                <a href="#" class="customer-name">${order.billingAddress?.name || "Unknown"}</a>
                <div class="muted">1 order</div>
              </div>
              <div class="section">
                <div class="section-header">
                  <span>Contact information</span>
                  <button class="edit-btn" title="Edit">
                    <uui-icon name="icon-edit"></uui-icon>
                  </button>
                </div>
                ${order.billingAddress?.email
                  ? html`<a href="mailto:${order.billingAddress.email}">${order.billingAddress.email}</a>`
                  : html`<span class="muted">No email</span>`}
              </div>
              <div class="section">
                <div class="section-header">
                  <span>Shipping address</span>
                  <button class="edit-btn" title="Edit">
                    <uui-icon name="icon-edit"></uui-icon>
                  </button>
                </div>
                <div class="address">
                  ${this._formatAddress(order.shippingAddress).map((line) => html`<div>${line}</div>`)}
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
                ${order.billingAddress === order.shippingAddress
                  ? html`<span class="muted">Same as shipping address</span>`
                  : html`
                      <div class="address">
                        ${this._formatAddress(order.billingAddress).map((line) => html`<div>${line}</div>`)}
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

  static styles = css`
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
}

export default MerchelloOrderDetailElement;

declare global {
  interface HTMLElementTagNameMap {
    "merchello-order-detail": MerchelloOrderDetailElement;
  }
}
