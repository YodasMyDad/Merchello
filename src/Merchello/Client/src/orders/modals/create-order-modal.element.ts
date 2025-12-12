import { html, css, nothing } from "@umbraco-cms/backoffice/external/lit";
import { customElement, state } from "@umbraco-cms/backoffice/external/lit";
import { UmbModalBaseElement } from "@umbraco-cms/backoffice/modal";
import { UMB_MODAL_MANAGER_CONTEXT } from "@umbraco-cms/backoffice/modal";
import type { UmbModalManagerContext } from "@umbraco-cms/backoffice/modal";
import { UMB_NOTIFICATION_CONTEXT } from "@umbraco-cms/backoffice/notification";
import type { UmbNotificationContext } from "@umbraco-cms/backoffice/notification";
import { MerchelloApi } from "@api/merchello-api.js";
import type { CountryDto } from "@api/merchello-api.js";
import type {
  AddressDto,
  AddCustomItemDto,
  TaxGroupDto,
  CustomerLookupResultDto,
} from "@orders/types/order.types.js";
import type { CreateOrderModalData, CreateOrderModalValue } from "./create-order-modal.token.js";
import { MERCHELLO_ADD_CUSTOM_ITEM_MODAL } from "./add-custom-item-modal.token.js";

interface PendingCustomItem extends AddCustomItemDto {
  tempId: string;
}

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
  @state() private _customItems: PendingCustomItem[] = [];

  // Customer search state
  @state() private _customerSearchResults: CustomerLookupResultDto[] = [];
  @state() private _selectedCustomer: CustomerLookupResultDto | null = null;
  @state() private _isSearchingCustomer: boolean = false;
  @state() private _showCustomerDropdown: boolean = false;

  // Loading state
  @state() private _isSaving: boolean = false;
  @state() private _isLoading: boolean = true;
  @state() private _errorMessage: string | null = null;

  // Reference data
  @state() private _taxGroups: TaxGroupDto[] = [];
  @state() private _countries: CountryDto[] = [];
  @state() private _currencySymbol: string = "£";

  // Validation
  @state() private _validationErrors: Record<string, string> = {};

  #modalManager?: UmbModalManagerContext;
  #notificationContext?: UmbNotificationContext;
  #customerSearchDebounceTimer?: ReturnType<typeof setTimeout>;

  constructor() {
    super();
    this.consumeContext(UMB_MODAL_MANAGER_CONTEXT, (context) => {
      this.#modalManager = context;
    });
    this.consumeContext(UMB_NOTIFICATION_CONTEXT, (context) => {
      this.#notificationContext = context;
    });
  }

  connectedCallback(): void {
    super.connectedCallback();
    this._loadReferenceData();
  }

  disconnectedCallback(): void {
    super.disconnectedCallback();
    if (this.#customerSearchDebounceTimer) {
      clearTimeout(this.#customerSearchDebounceTimer);
    }
  }

  private async _loadReferenceData(): Promise<void> {
    this._isLoading = true;

    const [taxGroupsResult, countriesResult, settingsResult] = await Promise.all([
      MerchelloApi.getTaxGroups(),
      MerchelloApi.getCountries(),
      MerchelloApi.getSettings(),
    ]);

    this._taxGroups = taxGroupsResult.data ?? [];
    this._countries = countriesResult.data ?? [];
    this._currencySymbol = settingsResult.data?.currencySymbol ?? "£";

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
        console.error("Customer search error:", error);
        return;
      }

      this._customerSearchResults = data ?? [];
      this._showCustomerDropdown = this._customerSearchResults.length > 0;
    }, 300);
  }

  private _selectCustomer(customer: CustomerLookupResultDto): void {
    this._selectedCustomer = customer;
    this._showCustomerDropdown = false;

    // Populate billing address from customer
    this._billingAddress = { ...customer.billingAddress };
  }

  private _clearSelectedCustomer(): void {
    this._selectedCustomer = null;
    this._customerSearchResults = [];
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

  private async _openAddCustomItemModal(): Promise<void> {
    if (!this.#modalManager) return;

    const modal = this.#modalManager.open(this, MERCHELLO_ADD_CUSTOM_ITEM_MODAL, {
      data: {
        currencySymbol: this._currencySymbol,
        taxGroups: this._taxGroups,
      },
    });

    const result = await modal.onSubmit().catch(() => undefined);
    if (result?.item) {
      this._customItems = [
        ...this._customItems,
        {
          ...result.item,
          tempId: `custom-${Date.now()}`,
        },
      ];
    }
  }

  private _removeCustomItem(tempId: string): void {
    this._customItems = this._customItems.filter((item) => item.tempId !== tempId);
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

  private _getSubtotal(): number {
    return this._customItems.reduce((sum, item) => sum + item.price * item.quantity, 0);
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
      customItems: this._customItems.map((item) => ({
        name: item.name,
        sku: item.sku,
        price: item.price,
        quantity: item.quantity,
        taxGroupId: item.taxGroupId,
        isPhysicalProduct: item.isPhysicalProduct,
      })),
    };

    const { data, error } = await MerchelloApi.createDraftOrder(request);

    this._isSaving = false;

    if (error) {
      this._errorMessage = error.message;
      return;
    }

    if (data?.success && data.invoiceId) {
      this.#notificationContext?.peek("positive", {
        data: {
          headline: "Order Created",
          message: `Draft order ${data.invoiceNumber} has been created.`,
        },
      });

      this.value = { created: true, invoiceId: data.invoiceId };
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

  private _renderCustomItem(item: PendingCustomItem) {
    const taxGroup = item.taxGroupId
      ? this._taxGroups.find((tg) => tg.id === item.taxGroupId)
      : null;
    const taxInfo = taxGroup ? `${taxGroup.name} (${taxGroup.taxPercentage}%)` : "Not taxable";

    return html`
      <div class="line-item">
        <div class="line-item-product">
          <div class="line-item-image">
            <div class="placeholder-image custom"><uui-icon name="icon-add"></uui-icon></div>
          </div>
          <div class="line-item-details">
            <div class="line-item-name">${item.name}</div>
            <div class="line-item-sku">${item.sku ?? "Custom item"} · ${taxInfo}</div>
          </div>
        </div>
        <div class="line-item-price">${this._currencySymbol}${item.price.toFixed(2)}</div>
        <div class="line-item-quantity">${item.quantity}</div>
        <div class="line-item-total">${this._currencySymbol}${(item.price * item.quantity).toFixed(2)}</div>
        <div class="line-item-actions">
          <uui-button
            look="secondary"
            compact
            @click=${() => this._removeCustomItem(item.tempId)}
            title="Remove item"
          >
            <uui-icon name="icon-delete"></uui-icon>
          </uui-button>
        </div>
      </div>
    `;
  }

  private _renderItemsSection() {
    return html`
      <uui-box headline="Items">
        ${this._customItems.length > 0 ? html`
          <div class="items-table">
            <div class="items-header">
              <div class="header-cell product">Product</div>
              <div class="header-cell price">Price</div>
              <div class="header-cell quantity">Qty</div>
              <div class="header-cell total">Total</div>
              <div class="header-cell actions"></div>
            </div>
            <div class="items-list">
              ${this._customItems.map((item) => this._renderCustomItem(item))}
            </div>
          </div>
        ` : html`
          <div class="empty-items">
            <p>No items added yet. Add products or custom items below.</p>
          </div>
        `}

        <div class="add-items-actions">
          <uui-button look="secondary" disabled>
            <uui-icon name="icon-add"></uui-icon>
            Add product
          </uui-button>
          <uui-button look="secondary" @click=${this._openAddCustomItemModal}>
            <uui-icon name="icon-add"></uui-icon>
            Add custom item
          </uui-button>
        </div>
      </uui-box>
    `;
  }

  private _renderSummary() {
    const subtotal = this._getSubtotal();

    return html`
      <uui-box headline="Order Summary">
        <div class="summary-row">
          <span>Subtotal</span>
          <span>${this._currencySymbol}${subtotal.toFixed(2)}</span>
        </div>

        <div class="summary-row muted">
          <span>Shipping</span>
          <span>Calculated after save</span>
        </div>

        <div class="summary-row muted">
          <span>Tax</span>
          <span>Calculated after save</span>
        </div>

        <div class="summary-row total">
          <span>Total</span>
          <span>${this._currencySymbol}${subtotal.toFixed(2)}</span>
        </div>

        <p class="summary-note">
          Shipping and tax will be calculated after the order is created.
          You can edit the order to adjust these values.
        </p>
      </uui-box>
    `;
  }

  render() {
    if (this._isLoading) {
      return html`<umb-body-layout headline="Create Order">${this._renderLoading()}</umb-body-layout>`;
    }

    return html`
      <umb-body-layout headline="Create Order">
        <div id="main">
          ${this._renderBillingAddressForm()}
          ${this._renderShippingAddressForm()}
          ${this._renderItemsSection()}
          ${this._renderSummary()}

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
            label="Create Order"
            look="primary"
            @click=${this._handleSave}
            ?disabled=${this._isSaving}
          >
            ${this._isSaving ? html`<uui-loader-circle></uui-loader-circle>` : "Create Order"}
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

    /* Items Table */
    .items-table {
      border: 1px solid var(--uui-color-border);
      border-radius: var(--uui-border-radius);
      overflow: hidden;
      margin-bottom: var(--uui-size-space-4);
    }

    .items-header {
      display: grid;
      grid-template-columns: minmax(150px, 2fr) 80px 60px 80px 40px;
      gap: var(--uui-size-space-3);
      padding: var(--uui-size-space-3) var(--uui-size-space-4);
      background: var(--uui-color-surface-alt);
      border-bottom: 1px solid var(--uui-color-border);
      font-size: 0.75rem;
      font-weight: 600;
      text-transform: uppercase;
      color: var(--uui-color-text-alt);
    }

    .header-cell.price,
    .header-cell.quantity,
    .header-cell.total {
      text-align: right;
    }

    .items-list {
      display: flex;
      flex-direction: column;
    }

    .line-item {
      display: grid;
      grid-template-columns: minmax(150px, 2fr) 80px 60px 80px 40px;
      gap: var(--uui-size-space-3);
      padding: var(--uui-size-space-3) var(--uui-size-space-4);
      align-items: center;
      border-bottom: 1px solid var(--uui-color-border);
    }

    .line-item:last-child {
      border-bottom: none;
    }

    .line-item-product {
      display: flex;
      gap: var(--uui-size-space-3);
      align-items: center;
      min-width: 0;
    }

    .line-item-image {
      width: 36px;
      height: 36px;
      flex-shrink: 0;
    }

    .placeholder-image {
      width: 100%;
      height: 100%;
      display: flex;
      align-items: center;
      justify-content: center;
      background: var(--uui-color-surface-alt);
      border-radius: var(--uui-border-radius);
      color: var(--uui-color-text-alt);
    }

    .placeholder-image.custom {
      background: var(--uui-color-positive-emphasis);
      color: white;
    }

    .line-item-details {
      display: flex;
      flex-direction: column;
      gap: 2px;
      min-width: 0;
    }

    .line-item-name {
      font-weight: 500;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .line-item-sku {
      font-size: 0.75rem;
      color: var(--uui-color-text-alt);
    }

    .line-item-price,
    .line-item-quantity,
    .line-item-total {
      text-align: right;
    }

    .line-item-total {
      font-weight: 500;
    }

    .line-item-actions {
      display: flex;
      justify-content: flex-end;
    }

    .empty-items {
      text-align: center;
      padding: var(--uui-size-space-5);
      color: var(--uui-color-text-alt);
    }

    .empty-items p {
      margin: 0;
    }

    .add-items-actions {
      display: flex;
      gap: var(--uui-size-space-2);
    }

    /* Summary Rows */
    .summary-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: var(--uui-size-space-2) 0;
    }

    .summary-row.muted {
      color: var(--uui-color-text-alt);
      font-size: 0.875rem;
    }

    .summary-row.total {
      border-top: 1px solid var(--uui-color-border);
      margin-top: var(--uui-size-space-2);
      padding-top: var(--uui-size-space-3);
      font-weight: 600;
    }

    .summary-note {
      font-size: 0.75rem;
      color: var(--uui-color-text-alt);
      margin: var(--uui-size-space-3) 0 0 0;
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
  `;
}

export default MerchelloCreateOrderModalElement;

declare global {
  interface HTMLElementTagNameMap {
    "merchello-create-order-modal": MerchelloCreateOrderModalElement;
  }
}
