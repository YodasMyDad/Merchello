import { LitElement, html, css, nothing, unsafeHTML } from "@umbraco-cms/backoffice/external/lit";
import { customElement, state } from "@umbraco-cms/backoffice/external/lit";
import { marked } from "marked";
import DOMPurify from "dompurify";
import { UmbElementMixin } from "@umbraco-cms/backoffice/element-api";
import { UMB_WORKSPACE_CONTEXT } from "@umbraco-cms/backoffice/workspace";
import { UMB_MODAL_MANAGER_CONTEXT } from "@umbraco-cms/backoffice/modal";
import type { UmbModalManagerContext } from "@umbraco-cms/backoffice/modal";
import type { OrderDetailDto, AddressDto, FulfillmentOrderDto, InvoicePaymentStatus } from "../types/order.types.js";
import type { MerchelloOrderDetailWorkspaceContext } from "../contexts/order-detail-workspace.context.js";
import { MERCHELLO_FULFILLMENT_MODAL } from "../modals/fulfillment-modal.token.js";
import { formatCurrency, formatDateTime } from "@shared/utils/formatting.js";
import { MerchelloApi, type CountryDto } from "@api/merchello-api.js";

// Import the shipments view component
import "./shipments-view.element.js";

// Import the payment panel component
import "./payment-panel.element.js";

@customElement("merchello-order-detail")
export class MerchelloOrderDetailElement extends UmbElementMixin(LitElement) {
  @state() private _order: OrderDetailDto | null = null;
  @state() private _isLoading = true;
  @state() private _activeTab: "details" | "shipments" | "payments" = "details";
  @state() private _newNoteText: string = "";
  @state() private _visibleToCustomer: boolean = false;
  @state() private _isPostingNote: boolean = false;
  @state() private _noteError: string | null = null;

  // Inline editing state
  @state() private _editingSection: 'contact' | 'shipping' | 'billing' | null = null;
  @state() private _editFormData: Partial<AddressDto> = {};
  @state() private _isSavingAddress: boolean = false;
  @state() private _validationErrors: Record<string, string> = {};
  @state() private _countries: CountryDto[] = [];

  #workspaceContext?: MerchelloOrderDetailWorkspaceContext;
  #modalManager?: UmbModalManagerContext;

  constructor() {
    super();
    this.consumeContext(UMB_WORKSPACE_CONTEXT, (context) => {
      this.#workspaceContext = context as MerchelloOrderDetailWorkspaceContext;
      if (this.#workspaceContext) {
        this.observe(this.#workspaceContext.order, (order) => {
          this._order = order ?? null;
          this._isLoading = !order;
        });
      }
    });
    this.consumeContext(UMB_MODAL_MANAGER_CONTEXT, (context) => {
      this.#modalManager = context;
    });
    this._loadCountries();
  }

  private async _loadCountries(): Promise<void> {
    const { data } = await MerchelloApi.getCountries();
    if (data) {
      this._countries = data;
    }
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

  private _renderMarkdown(text: string): unknown {
    marked.setOptions({ breaks: true, gfm: true });
    const parsed = marked.parse(text) as string;
    const sanitized = DOMPurify.sanitize(parsed);
    return unsafeHTML(sanitized);
  }

  private _getGoogleMapsUrl(address: AddressDto | null): string {
    if (!address) return '';
    const parts = [address.townCity, address.postalCode, address.country].filter(Boolean);
    if (parts.length === 0) return '';
    const query = encodeURIComponent(parts.join(', '));
    return `https://www.google.com/maps/search/?api=1&query=${query}`;
  }

  private _startEditing(section: 'contact' | 'shipping' | 'billing'): void {
    if (!this._order) return;

    if (section === 'contact') {
      this._editFormData = { email: this._order.billingAddress?.email || '' };
    } else if (section === 'shipping') {
      this._editFormData = this._order.shippingAddress ? { ...this._order.shippingAddress } : {};
    } else if (section === 'billing') {
      this._editFormData = this._order.billingAddress ? { ...this._order.billingAddress } : {};
    }
    this._editingSection = section;
    this._validationErrors = {};
  }

  private _cancelEditing(): void {
    this._editingSection = null;
    this._editFormData = {};
    this._validationErrors = {};
  }

  private _validateEmail(email: string | null | undefined): boolean {
    if (!email) return true; // Email is optional
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  private _validateAddress(): boolean {
    const errors: Record<string, string> = {};
    const data = this._editFormData;

    if (this._editingSection === 'contact') {
      if (data.email && !this._validateEmail(data.email)) {
        errors.email = 'Please enter a valid email address';
      }
    } else {
      // Address validation for shipping/billing
      if (!data.name?.trim()) {
        errors.name = 'Name is required';
      }
      if (!data.addressOne?.trim()) {
        errors.addressOne = 'Address is required';
      }
      if (!data.townCity?.trim()) {
        errors.townCity = 'Town/City is required';
      }
      if (!data.postalCode?.trim()) {
        errors.postalCode = 'Postal code is required';
      }
      if (!data.countryCode) {
        errors.countryCode = 'Country is required';
      }
    }

    this._validationErrors = errors;
    return Object.keys(errors).length === 0;
  }

  private async _saveEditing(): Promise<void> {
    if (!this._order || !this._editingSection) return;

    if (!this._validateAddress()) {
      return;
    }

    this._isSavingAddress = true;

    let result: { data?: AddressDto; error?: Error };

    if (this._editingSection === 'contact') {
      // Update only email on billing address
      const updatedAddress: AddressDto = {
        ...this._order.billingAddress,
        email: this._editFormData.email || null,
      } as AddressDto;
      result = await MerchelloApi.updateBillingAddress(this._order.id, updatedAddress);
    } else if (this._editingSection === 'shipping') {
      result = await MerchelloApi.updateShippingAddress(this._order.id, this._editFormData as AddressDto);
    } else {
      result = await MerchelloApi.updateBillingAddress(this._order.id, this._editFormData as AddressDto);
    }

    this._isSavingAddress = false;

    if (result.error) {
      console.error('Failed to save address:', result.error);
      return;
    }

    // Reload order data and close edit mode
    this._editingSection = null;
    this._editFormData = {};
    this._validationErrors = {};
    this.#workspaceContext?.load(this._order.id);
  }

  private _updateFormField(field: keyof AddressDto, value: string): void {
    this._editFormData = { ...this._editFormData, [field]: value || null };
    // Clear validation error for this field when user types
    if (this._validationErrors[field]) {
      const { [field]: _, ...rest } = this._validationErrors;
      this._validationErrors = rest;
    }
  }

  private _renderInput(field: keyof AddressDto, label: string, placeholder: string, type: string = 'text'): unknown {
    const hasError = !!this._validationErrors[field];
    return html`
      <div class="form-field ${hasError ? 'has-error' : ''}">
        <uui-input
          type=${type}
          label=${label}
          placeholder=${placeholder}
          .value=${(this._editFormData[field] as string) || ''}
          @input=${(e: Event) => this._updateFormField(field, (e.target as HTMLInputElement).value)}
        ></uui-input>
        ${hasError ? html`<span class="field-error">${this._validationErrors[field]}</span>` : nothing}
      </div>
    `;
  }

  private _renderCountrySelect(): unknown {
    const hasError = !!this._validationErrors.countryCode;
    return html`
      <div class="form-field ${hasError ? 'has-error' : ''}">
        <uui-select
          label="Country"
          placeholder="Select country"
          .value=${this._editFormData.countryCode || ''}
          @change=${(e: Event) => {
            const select = e.target as HTMLSelectElement;
            const selectedCountry = this._countries.find(c => c.code === select.value);
            this._editFormData = {
              ...this._editFormData,
              countryCode: select.value || null,
              country: selectedCountry?.name || null
            };
            if (this._validationErrors.countryCode) {
              const { countryCode: _, ...rest } = this._validationErrors;
              this._validationErrors = rest;
            }
          }}
        >
          <option value="">Select country...</option>
          ${this._countries.map(c => html`
            <option value=${c.code} ?selected=${this._editFormData.countryCode === c.code}>${c.name}</option>
          `)}
        </uui-select>
        ${hasError ? html`<span class="field-error">${this._validationErrors.countryCode}</span>` : nothing}
      </div>
    `;
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

  private async _handlePostNote(): Promise<void> {
    if (!this._order || !this._newNoteText.trim()) return;

    this._isPostingNote = true;
    this._noteError = null;

    const { error } = await MerchelloApi.addInvoiceNote(this._order.id, {
      text: this._newNoteText.trim(),
      visibleToCustomer: this._visibleToCustomer,
    });

    this._isPostingNote = false;

    if (error) {
      this._noteError = error.message || "Failed to post note";
      console.error("Failed to post note:", error);
      return;
    }

    // Clear form and reload order
    this._newNoteText = "";
    this._visibleToCustomer = false;
    this.#workspaceContext?.load(this._order.id);
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
                <textarea
                  placeholder="Leave a comment..."
                  .value=${this._newNoteText}
                  @input=${(e: Event) => {
                    this._newNoteText = (e.target as HTMLTextAreaElement).value;
                    this._noteError = null;
                  }}
                  rows="2"
                ></textarea>
                <div class="timeline-actions">
                  <label class="customer-visible-checkbox">
                    <input
                      type="checkbox"
                      .checked=${this._visibleToCustomer}
                      @change=${(e: Event) => this._visibleToCustomer = (e.target as HTMLInputElement).checked}
                    />
                    Visible to customer
                  </label>
                  <uui-button
                    look="primary"
                    label="Post"
                    ?disabled=${!this._newNoteText.trim() || this._isPostingNote}
                    @click=${this._handlePostNote}
                  >
                    ${this._isPostingNote ? "Posting..." : "Post"}
                  </uui-button>
                </div>
                ${this._noteError ? html`<div class="note-error">${this._noteError}</div>` : nothing}
              </div>
              <div class="timeline-events">
                ${order.notes.length === 0
                  ? html`<div class="no-notes">No timeline events yet</div>`
                  : [...order.notes]
                      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                      .map(
                        (note) => html`
                          <div class="timeline-event ${note.visibleToCustomer ? 'customer-visible' : ''}">
                            ${note.visibleToCustomer ? html`<span class="customer-badge">Customer visible</span>` : nothing}
                            <div class="event-time">${formatDateTime(note.date)}</div>
                            <div class="event-text markdown-content">${this._renderMarkdown(note.text)}</div>
                            ${note.author ? html`<div class="event-author">by ${note.author}</div>` : nothing}
                          </div>
                        `
                      )}
              </div>
            </div>
          </div>

          <!-- Right Column (Sidebar) -->
          <div class="sidebar">
            <!-- Customer -->
            <div class="card">
              <h3>Customer</h3>
              <div class="customer-info">
                <a href="#" class="customer-name">${order.billingAddress?.name || "Unknown"}</a>
                <div class="muted">1 order</div>
              </div>
              <div class="section">
                <div class="section-header">
                  <span>Contact information</span>
                  ${this._editingSection !== 'contact' ? html`
                    <button class="edit-btn" title="Edit" @click=${() => this._startEditing('contact')}>
                      <uui-icon name="icon-edit"></uui-icon>
                    </button>
                  ` : nothing}
                </div>
                ${this._editingSection === 'contact' ? html`
                  <div class="edit-form">
                    ${this._renderInput('email', 'Email', 'Email address', 'email')}
                    <div class="edit-actions">
                      <uui-button look="secondary" label="Cancel" @click=${this._cancelEditing} ?disabled=${this._isSavingAddress}>Cancel</uui-button>
                      <uui-button look="primary" label="Save" @click=${this._saveEditing} ?disabled=${this._isSavingAddress}>
                        ${this._isSavingAddress ? 'Saving...' : 'Save'}
                      </uui-button>
                    </div>
                  </div>
                ` : html`
                  ${order.billingAddress?.email
                    ? html`<a href="mailto:${order.billingAddress.email}">${order.billingAddress.email}</a>`
                    : html`<span class="muted">No email</span>`}
                `}
              </div>
              <div class="section">
                <div class="section-header">
                  <span>Shipping address</span>
                  ${this._editingSection !== 'shipping' ? html`
                    <button class="edit-btn" title="Edit" @click=${() => this._startEditing('shipping')}>
                      <uui-icon name="icon-edit"></uui-icon>
                    </button>
                  ` : nothing}
                </div>
                ${this._editingSection === 'shipping' ? html`
                  <div class="edit-form">
                    ${this._renderInput('name', 'Name', 'Name')}
                    ${this._renderInput('company', 'Company', 'Company')}
                    ${this._renderInput('addressOne', 'Address Line 1', 'Address Line 1')}
                    ${this._renderInput('addressTwo', 'Address Line 2', 'Address Line 2')}
                    ${this._renderInput('townCity', 'Town/City', 'Town/City')}
                    ${this._renderInput('countyState', 'County/State', 'County/State')}
                    ${this._renderInput('postalCode', 'Postal Code', 'Postal Code')}
                    ${this._renderCountrySelect()}
                    ${this._renderInput('phone', 'Phone', 'Phone', 'tel')}
                    <div class="edit-actions">
                      <uui-button look="secondary" label="Cancel" @click=${this._cancelEditing} ?disabled=${this._isSavingAddress}>Cancel</uui-button>
                      <uui-button look="primary" label="Save" @click=${this._saveEditing} ?disabled=${this._isSavingAddress}>
                        ${this._isSavingAddress ? 'Saving...' : 'Save'}
                      </uui-button>
                    </div>
                  </div>
                ` : html`
                  <div class="address">
                    ${this._formatAddress(order.shippingAddress).map((line) => html`<div>${line}</div>`)}
                  </div>
                  ${this._getGoogleMapsUrl(order.shippingAddress)
                    ? html`<a href=${this._getGoogleMapsUrl(order.shippingAddress)} target="_blank" rel="noopener noreferrer" class="view-map">View map</a>`
                    : nothing}
                `}
              </div>
              <div class="section">
                <div class="section-header">
                  <span>Billing address</span>
                  ${this._editingSection !== 'billing' ? html`
                    <button class="edit-btn" title="Edit" @click=${() => this._startEditing('billing')}>
                      <uui-icon name="icon-edit"></uui-icon>
                    </button>
                  ` : nothing}
                </div>
                ${this._editingSection === 'billing' ? html`
                  <div class="edit-form">
                    ${this._renderInput('name', 'Name', 'Name')}
                    ${this._renderInput('company', 'Company', 'Company')}
                    ${this._renderInput('addressOne', 'Address Line 1', 'Address Line 1')}
                    ${this._renderInput('addressTwo', 'Address Line 2', 'Address Line 2')}
                    ${this._renderInput('townCity', 'Town/City', 'Town/City')}
                    ${this._renderInput('countyState', 'County/State', 'County/State')}
                    ${this._renderInput('postalCode', 'Postal Code', 'Postal Code')}
                    ${this._renderCountrySelect()}
                    ${this._renderInput('phone', 'Phone', 'Phone', 'tel')}
                    <div class="edit-actions">
                      <uui-button look="secondary" label="Cancel" @click=${this._cancelEditing} ?disabled=${this._isSavingAddress}>Cancel</uui-button>
                      <uui-button look="primary" label="Save" @click=${this._saveEditing} ?disabled=${this._isSavingAddress}>
                        ${this._isSavingAddress ? 'Saving...' : 'Save'}
                      </uui-button>
                    </div>
                  </div>
                ` : html`
                  ${order.billingAddress === order.shippingAddress
                    ? html`<span class="muted">Same as shipping address</span>`
                    : html`
                        <div class="address">
                          ${this._formatAddress(order.billingAddress).map((line) => html`<div>${line}</div>`)}
                        </div>
                      `}
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

    .timeline-input textarea {
      width: 100%;
      padding: var(--uui-size-space-2);
      border: 1px solid var(--uui-color-border);
      border-radius: var(--uui-border-radius);
      margin-bottom: var(--uui-size-space-2);
      box-sizing: border-box;
      resize: vertical;
      font-family: inherit;
      font-size: inherit;
    }

    .timeline-actions {
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: var(--uui-size-space-2);
    }

    .customer-visible-checkbox {
      display: flex;
      align-items: center;
      gap: var(--uui-size-space-1);
      font-size: 0.875rem;
      color: var(--uui-color-text-alt);
      cursor: pointer;
    }

    .customer-visible-checkbox input {
      cursor: pointer;
    }

    .note-error {
      color: #dc3545;
      font-size: 0.875rem;
      margin-top: var(--uui-size-space-2);
    }

    .timeline-events {
      border-top: 1px solid var(--uui-color-border);
      padding-top: var(--uui-size-space-3);
    }

    .timeline-event {
      padding: var(--uui-size-space-2) 0;
      border-bottom: 1px solid var(--uui-color-border);
    }

    .timeline-event.customer-visible {
      background: #e8f4fd;
      border-left: 3px solid #0078d4;
      padding-left: var(--uui-size-space-3);
      margin-left: calc(-1 * var(--uui-size-space-2));
      padding-right: var(--uui-size-space-2);
    }

    .customer-badge {
      display: inline-block;
      font-size: 0.7rem;
      font-weight: 500;
      color: #0078d4;
      background: #cce5ff;
      padding: 2px 6px;
      border-radius: 10px;
      margin-bottom: var(--uui-size-space-1);
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
}

export default MerchelloOrderDetailElement;

declare global {
  interface HTMLElementTagNameMap {
    "merchello-order-detail": MerchelloOrderDetailElement;
  }
}
