import { html, css, nothing } from "@umbraco-cms/backoffice/external/lit";
import { customElement, state } from "@umbraco-cms/backoffice/external/lit";
import { UmbModalBaseElement } from "@umbraco-cms/backoffice/modal";
import { UMB_NOTIFICATION_CONTEXT } from "@umbraco-cms/backoffice/notification";
import type { UmbNotificationContext } from "@umbraco-cms/backoffice/notification";
import { MerchelloApi } from "@api/merchello-api.js";
import type { CountryDto } from "@api/merchello-api.js";
import type {
  AddressDto,
  CustomerLookupResultDto,
} from "@orders/types/order.types.js";
import { formatCurrency } from "@shared/utils/formatting.js";
import type { CreateOrderModalData, CreateOrderModalValue } from "./create-order-modal.token.js";

function createEmptyAddress(): AddressDto {
  return {
    name: null,
    email: null,
    phone: null,
    company: null,
    addressOne: null,
    addressTwo: null,
    townCity: null,
    countyState: null,
    postalCode: null,
    country: null,
    countryCode: null,
  };
}

@customElement("merchello-create-order-modal")
export class MerchelloCreateOrderModalElement extends UmbModalBaseElement<
  CreateOrderModalData,
  CreateOrderModalValue
> {
  @state() private _billingAddress: AddressDto = createEmptyAddress();
  @state() private _shippingAddress: AddressDto = createEmptyAddress();
  @state() private _useShippingAddress: boolean = false;

  // Customer search state
  @state() private _customerSearchResults: CustomerLookupResultDto[] = [];
  @state() private _selectedCustomer: CustomerLookupResultDto | null = null;
  @state() private _isSearchingCustomer: boolean = false;
  @state() private _showCustomerDropdown: boolean = false;

  // Credit warning state
  @state() private _creditWarning: {
    type: "warning" | "danger";
    message: string;
    outstanding: number;
    creditLimit: number;
    currencyCode: string;
  } | null = null;

  // Loading state
  @state() private _isSaving: boolean = false;
  @state() private _isLoading: boolean = true;
  @state() private _errorMessage: string | null = null;

  // Reference data
  @state() private _countries: CountryDto[] = [];

  // Validation
  @state() private _validationErrors: Record<string, string> = {};

  #notificationContext?: UmbNotificationContext;
  #customerSearchDebounceTimer?: ReturnType<typeof setTimeout>;

  constructor() {
    super();
    this.consumeContext(UMB_NOTIFICATION_CONTEXT, (context) => {
      this.#notificationContext = context;
    });
  }

  override connectedCallback(): void {
    super.connectedCallback();
    this._loadReferenceData();
  }

  override disconnectedCallback(): void {
    super.disconnectedCallback();
    if (this.#customerSearchDebounceTimer) {
      clearTimeout(this.#customerSearchDebounceTimer);
    }
  }

  private async _loadReferenceData(): Promise<void> {
    this._isLoading = true;

    const { data } = await MerchelloApi.getCountries();
    this._countries = data ?? [];

    this._isLoading = false;
  }

  private _handleCustomerSearchInput(e: Event): void {
    const input = e.target as HTMLInputElement;
    const searchValue = input.value.trim();

    // Clear previous debounce timer
    if (this.#customerSearchDebounceTimer) {
      clearTimeout(this.#customerSearchDebounceTimer);
    }

    if (searchValue.length < 2) {
      this._customerSearchResults = [];
      this._showCustomerDropdown = false;
      return;
    }

    // Debounce the search (300ms)
    this.#customerSearchDebounceTimer = setTimeout(async () => {
      this._isSearchingCustomer = true;

      // Determine if search is email or name
      const isEmail = searchValue.includes("@");
      const { data, error } = await MerchelloApi.searchCustomers(
        isEmail ? searchValue : undefined,
        isEmail ? undefined : searchValue
      );

      this._isSearchingCustomer = false;

      if (error) {
        return;
      }

      this._customerSearchResults = data ?? [];
      this._showCustomerDropdown = this._customerSearchResults.length > 0;
    }, 300);
  }

  private async _selectCustomer(customer: CustomerLookupResultDto): Promise<void> {
    this._selectedCustomer = customer;
    this._showCustomerDropdown = false;
    this._creditWarning = null;

    // Populate billing address from customer
    this._billingAddress = { ...customer.billingAddress };

    // Check credit status if customer has account terms
    if (customer.hasAccountTerms && customer.customerId && customer.creditLimit != null) {
      const { data, error } = await MerchelloApi.getCustomerOutstandingBalance(customer.customerId);

      if (!error && data) {
        if (data.creditWarningLevel === "exceeded") {
          this._creditWarning = {
            type: "danger",
            message: `Credit limit exceeded: ${formatCurrency(data.totalOutstanding, data.currencyCode)} outstanding exceeds ${formatCurrency(customer.creditLimit, data.currencyCode)} limit`,
            outstanding: data.totalOutstanding,
            creditLimit: customer.creditLimit,
            currencyCode: data.currencyCode,
          };
        } else if (data.creditWarningLevel === "warning") {
          this._creditWarning = {
            type: "warning",
            message: `Customer has ${formatCurrency(data.totalOutstanding, data.currencyCode)} outstanding of ${formatCurrency(customer.creditLimit, data.currencyCode)} limit (${Math.round(data.creditUtilizationPercent ?? 0)}% utilized)`,
            outstanding: data.totalOutstanding,
            creditLimit: customer.creditLimit,
            currencyCode: data.currencyCode,
          };
        }
      }
    }
  }

  private _clearSelectedCustomer(): void {
    this._selectedCustomer = null;
    this._customerSearchResults = [];
    this._creditWarning = null;
  }

  private _selectPastShippingAddress(address: AddressDto): void {
    this._shippingAddress = { ...address };
  }

  private _updateBillingField(field: keyof AddressDto, value: string | null): void {
    this._billingAddress = { ...this._billingAddress, [field]: value };
    // Clear validation error for this field
    if (this._validationErrors[`billing.${field}`]) {
      const errors = { ...this._validationErrors };
      delete errors[`billing.${field}`];
      this._validationErrors = errors;
    }
    // If customer was selected and billing info changed, clear customer selection
    if (this._selectedCustomer) {
      this._selectedCustomer = null;
    }
  }

  private _updateShippingField(field: keyof AddressDto, value: string | null): void {
    this._shippingAddress = { ...this._shippingAddress, [field]: value };
    // Clear validation error for this field
    if (this._validationErrors[`shipping.${field}`]) {
      const errors = { ...this._validationErrors };
      delete errors[`shipping.${field}`];
      this._validationErrors = errors;
    }
  }

  private _toggleShippingAddress(): void {
    this._useShippingAddress = !this._useShippingAddress;
    if (this._useShippingAddress) {
      // Initialize shipping address
      this._shippingAddress = createEmptyAddress();
    }
  }

  private _validateForm(): boolean {
    const errors: Record<string, string> = {};

    // Billing address validation
    if (!this._billingAddress.name?.trim()) {
      errors["billing.name"] = "Name is required";
    }
    if (!this._billingAddress.email?.trim()) {
      errors["billing.email"] = "Email is required";
    } else if (!this._isValidEmail(this._billingAddress.email)) {
      errors["billing.email"] = "Please enter a valid email address";
    }
    if (!this._billingAddress.addressOne?.trim()) {
      errors["billing.addressOne"] = "Address is required";
    }
    if (!this._billingAddress.townCity?.trim()) {
      errors["billing.townCity"] = "Town/City is required";
    }
    if (!this._billingAddress.postalCode?.trim()) {
      errors["billing.postalCode"] = "Postal code is required";
    }
    if (!this._billingAddress.countryCode) {
      errors["billing.countryCode"] = "Country is required";
    }

    // Shipping address validation (only if using separate shipping)
    if (this._useShippingAddress) {
      if (!this._shippingAddress.name?.trim()) {
        errors["shipping.name"] = "Name is required";
      }
      if (!this._shippingAddress.addressOne?.trim()) {
        errors["shipping.addressOne"] = "Address is required";
      }
      if (!this._shippingAddress.townCity?.trim()) {
        errors["shipping.townCity"] = "Town/City is required";
      }
      if (!this._shippingAddress.postalCode?.trim()) {
        errors["shipping.postalCode"] = "Postal code is required";
      }
      if (!this._shippingAddress.countryCode) {
        errors["shipping.countryCode"] = "Country is required";
      }
    }

    this._validationErrors = errors;
    return Object.keys(errors).length === 0;
  }

  private _isValidEmail(email: string): boolean {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  }

  /** Options for country dropdown - uui-select requires .options property */
  private _getCountryOptions(prefix: "billing" | "shipping"): Array<{ name: string; value: string; selected?: boolean }> {
    const address = prefix === "billing" ? this._billingAddress : this._shippingAddress;
    const options: Array<{ name: string; value: string; selected?: boolean }> = [
      { name: "Select country...", value: "", selected: !address.countryCode }
    ];

    this._countries.forEach(c => {
      options.push({
        name: c.name,
        value: c.code,
        selected: c.code === address.countryCode
      });
    });

    return options;
  }

  /** Options for past shipping address dropdown */
  private get _pastShippingAddressOptions(): Array<{ name: string; value: string; selected?: boolean }> {
    const options: Array<{ name: string; value: string; selected?: boolean }> = [
      { name: "Select an address...", value: "", selected: true }
    ];

    if (this._selectedCustomer) {
      this._selectedCustomer.pastShippingAddresses.forEach((addr, i) => {
        options.push({
          name: `${addr.addressOne}, ${addr.townCity}, ${addr.postalCode}`,
          value: i.toString(),
          selected: false
        });
      });
    }

    return options;
  }

  private async _handleSave(): Promise<void> {
    if (!this._validateForm()) {
      this.#notificationContext?.peek("warning", {
        data: {
          headline: "Validation Error",
          message: "Please fill in all required fields.",
        },
      });
      return;
    }

    this._isSaving = true;
    this._errorMessage = null;

    const request = {
      billingAddress: this._billingAddress,
      shippingAddress: this._useShippingAddress ? this._shippingAddress : null,
      customItems: [], // Items are added in the edit modal
    };

    const { data, error } = await MerchelloApi.createDraftOrder(request);

    this._isSaving = false;

    if (error) {
      this._errorMessage = error.message;
      return;
    }

    if (data?.isSuccessful && data.invoiceId) {
      // Return shouldOpenEdit so the orders list opens the edit modal
      this.value = {
        isCreated: true,
        invoiceId: data.invoiceId,
        shouldOpenEdit: true,
      };
      this.modalContext?.submit();
    } else {
      this._errorMessage = data?.errorMessage ?? "Failed to create order";
    }
  }

  private _handleCancel(): void {
    this.modalContext?.reject();
  }

  private _renderLoading() {
    return html`
      <div class="loading">
        <uui-loader></uui-loader>
        <span>Loading...</span>
      </div>
    `;
  }

  private _renderAddressField(
    prefix: "billing" | "shipping",
    field: keyof AddressDto,
    label: string,
    type: string = "text",
    required: boolean = false
  ) {
    const address = prefix === "billing" ? this._billingAddress : this._shippingAddress;
    const value = address[field] ?? "";
    const error = this._validationErrors[`${prefix}.${field}`];
    const updateFn = prefix === "billing" ? this._updateBillingField : this._updateShippingField;

    return html`
      <umb-property-layout
        label=${label}
        ?mandatory=${required}
        ?invalid=${!!error}>
        <uui-input
          slot="editor"
          type=${type}
          .value=${value}
          @input=${(e: Event) => updateFn.call(this, field, (e.target as HTMLInputElement).value || null)}>
        </uui-input>
      </umb-property-layout>
    `;
  }

  private _renderCountrySelect(prefix: "billing" | "shipping") {
    const error = this._validationErrors[`${prefix}.countryCode`];
    const updateFn = prefix === "billing" ? this._updateBillingField : this._updateShippingField;

    return html`
      <umb-property-layout
        label="Country"
        ?mandatory=${true}
        ?invalid=${!!error}>
        <uui-select
          slot="editor"
          .options=${this._getCountryOptions(prefix)}
          @change=${(e: Event) => {
            const select = e.target as HTMLSelectElement;
            const country = this._countries.find((c) => c.code === select.value);
            updateFn.call(this, "countryCode", select.value || null);
            updateFn.call(this, "country", country?.name ?? null);
          }}>
        </uui-select>
      </umb-property-layout>
    `;
  }

  private _renderBillingAddressForm() {
    return html`
      <uui-box headline="Billing Address">
        <!-- Customer Search -->
        <div class="customer-search-wrapper">
          <umb-property-layout
            label="Search existing customer"
            description="Search by email or name to auto-fill customer details">
            <div slot="editor" class="search-input-wrapper">
              <uui-input
                type="text"
                placeholder="Search by email or name..."
                @input=${this._handleCustomerSearchInput}
                @focus=${() => {
                  if (this._customerSearchResults.length > 0) {
                    this._showCustomerDropdown = true;
                  }
                }}>
                ${this._isSearchingCustomer
                  ? html`<uui-loader-circle slot="append"></uui-loader-circle>`
                  : html`<uui-icon slot="prepend" name="icon-search"></uui-icon>`}
              </uui-input>
            </div>
          </umb-property-layout>

          ${this._showCustomerDropdown ? html`
            <div class="customer-dropdown">
              ${this._customerSearchResults.map((customer) => html`
                <button
                  class="customer-option"
                  @click=${() => this._selectCustomer(customer)}>
                  <div class="customer-info">
                    <span class="customer-name">${customer.name}</span>
                    <span class="customer-email">${customer.email}</span>
                  </div>
                </button>
              `)}
            </div>
          ` : nothing}

          ${this._selectedCustomer ? html`
            <div class="selected-customer">
              <span>Selected: <strong>${this._selectedCustomer.name}</strong> (${this._selectedCustomer.email})</span>
              <uui-button compact look="secondary" @click=${this._clearSelectedCustomer}>
                <uui-icon name="icon-delete"></uui-icon>
              </uui-button>
            </div>
          ` : nothing}

          ${this._creditWarning ? html`
            <div class="credit-warning credit-warning--${this._creditWarning.type}">
              <uui-icon name="icon-alert"></uui-icon>
              <span>${this._creditWarning.message}</span>
            </div>
          ` : nothing}
        </div>

        <div class="address-fields">
          ${this._renderAddressField("billing", "name", "Name", "text", true)}
          ${this._renderAddressField("billing", "email", "Email", "email", true)}
          ${this._renderAddressField("billing", "phone", "Phone", "tel")}
          ${this._renderAddressField("billing", "company", "Company")}
          ${this._renderAddressField("billing", "addressOne", "Address Line 1", "text", true)}
          ${this._renderAddressField("billing", "addressTwo", "Address Line 2")}
          ${this._renderAddressField("billing", "townCity", "Town/City", "text", true)}
          ${this._renderAddressField("billing", "countyState", "County/State")}
          ${this._renderAddressField("billing", "postalCode", "Postal Code", "text", true)}
          ${this._renderCountrySelect("billing")}
        </div>
      </uui-box>
    `;
  }

  private _renderShippingAddressForm() {
    return html`
      <uui-box headline="Shipping Address">
        <umb-property-layout
          label="Ship to different address"
          description="Enable to enter a separate shipping address">
          <uui-toggle
            slot="editor"
            .checked=${this._useShippingAddress}
            @change=${this._toggleShippingAddress}>
          </uui-toggle>
        </umb-property-layout>

        ${this._useShippingAddress ? html`
          <!-- Past shipping addresses dropdown -->
          ${this._selectedCustomer && this._selectedCustomer.pastShippingAddresses.length > 0 ? html`
            <umb-property-layout
              label="Use a past shipping address"
              description="Select from customer's previous shipping addresses">
              <uui-select
                slot="editor"
                .options=${this._pastShippingAddressOptions}
                @change=${(e: Event) => {
                  const index = parseInt((e.target as HTMLSelectElement).value);
                  if (!isNaN(index) && this._selectedCustomer) {
                    this._selectPastShippingAddress(this._selectedCustomer.pastShippingAddresses[index]);
                  }
                }}>
              </uui-select>
            </umb-property-layout>
          ` : nothing}

          <div class="address-fields">
            ${this._renderAddressField("shipping", "name", "Name", "text", true)}
            ${this._renderAddressField("shipping", "phone", "Phone", "tel")}
            ${this._renderAddressField("shipping", "company", "Company")}
            ${this._renderAddressField("shipping", "addressOne", "Address Line 1", "text", true)}
            ${this._renderAddressField("shipping", "addressTwo", "Address Line 2")}
            ${this._renderAddressField("shipping", "townCity", "Town/City", "text", true)}
            ${this._renderAddressField("shipping", "countyState", "County/State")}
            ${this._renderAddressField("shipping", "postalCode", "Postal Code", "text", true)}
            ${this._renderCountrySelect("shipping")}
          </div>
        ` : nothing}
      </uui-box>
    `;
  }

  override render() {
    if (this._isLoading) {
      return html`<umb-body-layout headline="Create Order">${this._renderLoading()}</umb-body-layout>`;
    }

    return html`
      <umb-body-layout headline="Create Order">
        <div id="main">
          <!-- Info banner -->
          <div class="info-banner">
            <uui-icon name="icon-info"></uui-icon>
            <div>
              <strong>Quick start</strong>
              <p>Enter customer details and click Create. You'll then be able to add products, discounts, and configure shipping in the full order editor.</p>
            </div>
          </div>

          ${this._renderBillingAddressForm()}
          ${this._renderShippingAddressForm()}

          ${this._errorMessage ? html`
            <div class="error-message">
              <uui-icon name="icon-alert"></uui-icon>
              ${this._errorMessage}
            </div>
          ` : nothing}
        </div>

        <div slot="actions">
          <uui-button
            label="Cancel"
            look="secondary"
            @click=${this._handleCancel}
            ?disabled=${this._isSaving}
          >
            Cancel
          </uui-button>
          <uui-button
            label="Create & Edit"
            look="primary"
            @click=${this._handleSave}
            ?disabled=${this._isSaving}
          >
            ${this._isSaving ? html`<uui-loader-circle></uui-loader-circle>` : "Create & Edit"}
          </uui-button>
        </div>
      </umb-body-layout>
    `;
  }

  static override readonly styles = css`
    :host {
      display: block;
    }

    #main {
      display: flex;
      flex-direction: column;
      gap: var(--uui-size-space-5);
    }

    .loading {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: var(--uui-size-layout-2);
      gap: var(--uui-size-space-3);
      color: var(--uui-color-text-alt);
    }

    h3 {
      margin: 0 0 var(--uui-size-space-4) 0;
      font-size: 1rem;
      font-weight: 600;
    }

    /* Box styling */
    uui-box {
      --uui-box-default-padding: var(--uui-size-space-5);
    }

    /* Property layout adjustments for modal context */
    umb-property-layout {
      --umb-property-layout-label-width: 180px;
    }

    umb-property-layout:first-child {
      padding-top: 0;
    }

    umb-property-layout:last-child {
      padding-bottom: 0;
    }

    umb-property-layout uui-input,
    umb-property-layout uui-select {
      width: 100%;
    }

    /* Address Fields Container */
    .address-fields {
      display: flex;
      flex-direction: column;
    }

    /* Customer Search */
    .customer-search-wrapper {
      position: relative;
      margin-bottom: var(--uui-size-space-4);
    }

    .search-input-wrapper {
      position: relative;
    }

    .customer-dropdown {
      position: absolute;
      top: 100%;
      left: 0;
      right: 0;
      background: var(--uui-color-surface);
      border: 1px solid var(--uui-color-border);
      border-radius: var(--uui-border-radius);
      box-shadow: var(--uui-shadow-depth-3);
      z-index: 100;
      max-height: 200px;
      overflow-y: auto;
    }

    .customer-option {
      display: block;
      width: 100%;
      padding: var(--uui-size-space-3);
      background: none;
      border: none;
      border-bottom: 1px solid var(--uui-color-border);
      cursor: pointer;
      text-align: left;
    }

    .customer-option:last-child {
      border-bottom: none;
    }

    .customer-option:hover {
      background: var(--uui-color-surface-alt);
    }

    .customer-info {
      display: flex;
      flex-direction: column;
      gap: 2px;
    }

    .customer-name {
      font-weight: 500;
    }

    .customer-email {
      font-size: 0.875rem;
      color: var(--uui-color-text-alt);
    }

    .selected-customer {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: var(--uui-size-space-3);
      background: var(--uui-color-surface-alt);
      border-radius: var(--uui-border-radius);
      margin-top: var(--uui-size-space-2);
    }

    /* Info Banner */
    .info-banner {
      display: flex;
      gap: var(--uui-size-space-3);
      padding: var(--uui-size-space-4);
      background: var(--uui-color-surface-alt);
      border: 1px solid var(--uui-color-border);
      border-radius: var(--uui-border-radius);
      border-left: 3px solid var(--uui-color-current);
    }

    .info-banner uui-icon {
      color: var(--uui-color-current);
      flex-shrink: 0;
      font-size: 1.25rem;
    }

    .info-banner strong {
      display: block;
      margin-bottom: var(--uui-size-space-1);
    }

    .info-banner p {
      margin: 0;
      font-size: 0.875rem;
      color: var(--uui-color-text-alt);
    }

    /* Error Message */
    .error-message {
      display: flex;
      align-items: center;
      gap: var(--uui-size-space-2);
      padding: var(--uui-size-space-3);
      background: var(--uui-color-danger-standalone);
      color: var(--uui-color-danger-contrast);
      border-radius: var(--uui-border-radius);
    }

    [slot="actions"] {
      display: flex;
      gap: var(--uui-size-space-2);
      justify-content: flex-end;
    }

    /* Credit Warning Banners */
    .credit-warning {
      display: flex;
      align-items: center;
      gap: var(--uui-size-space-3);
      padding: var(--uui-size-space-3) var(--uui-size-space-4);
      border-radius: var(--uui-border-radius);
      margin-top: var(--uui-size-space-3);
      font-size: 0.875rem;
    }

    .credit-warning uui-icon {
      flex-shrink: 0;
    }

    .credit-warning--warning {
      background: #fef3c7;
      border: 1px solid #f59e0b;
      color: #92400e;
    }

    .credit-warning--warning uui-icon {
      color: #f59e0b;
    }

    .credit-warning--danger {
      background: #fee2e2;
      border: 1px solid #ef4444;
      color: #991b1b;
    }

    .credit-warning--danger uui-icon {
      color: #ef4444;
    }
  `;
}

export default MerchelloCreateOrderModalElement;

declare global {
  interface HTMLElementTagNameMap {
    "merchello-create-order-modal": MerchelloCreateOrderModalElement;
  }
}
