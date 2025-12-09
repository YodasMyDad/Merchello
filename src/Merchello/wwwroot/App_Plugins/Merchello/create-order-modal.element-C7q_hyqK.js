import { html as r, nothing as u, css as $, state as d, customElement as w } from "@umbraco-cms/backoffice/external/lit";
import { UmbModalBaseElement as k, UMB_MODAL_MANAGER_CONTEXT as z } from "@umbraco-cms/backoffice/modal";
import { UMB_NOTIFICATION_CONTEXT as I } from "@umbraco-cms/backoffice/notification";
import { M as m } from "./merchello-api-C2InYbkz.js";
import { M as F } from "./add-custom-item-modal.token-DNefsEG_.js";
var O = Object.defineProperty, E = Object.getOwnPropertyDescriptor, C = (e) => {
  throw TypeError(e);
}, o = (e, i, s, t) => {
  for (var n = t > 1 ? void 0 : t ? E(i, s) : i, l = e.length - 1, p; l >= 0; l--)
    (p = e[l]) && (n = (t ? p(i, s, n) : p(n)) || n);
  return t && n && O(i, s, n), n;
}, x = (e, i, s) => i.has(e) || C("Cannot " + s), c = (e, i, s) => (x(e, i, "read from private field"), i.get(e)), b = (e, i, s) => i.has(e) ? C("Cannot add the same private member more than once") : i instanceof WeakSet ? i.add(e) : i.set(e, s), y = (e, i, s, t) => (x(e, i, "write to private field"), i.set(e, s), s), g, v, h;
function f() {
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
    countryCode: null
  };
}
let a = class extends k {
  constructor() {
    super(), this._billingAddress = f(), this._shippingAddress = f(), this._useShippingAddress = !1, this._customItems = [], this._customerSearchResults = [], this._selectedCustomer = null, this._isSearchingCustomer = !1, this._showCustomerDropdown = !1, this._isSaving = !1, this._isLoading = !0, this._errorMessage = null, this._taxGroups = [], this._countries = [], this._currencySymbol = "£", this._validationErrors = {}, b(this, g), b(this, v), b(this, h), this.consumeContext(z, (e) => {
      y(this, g, e);
    }), this.consumeContext(I, (e) => {
      y(this, v, e);
    });
  }
  connectedCallback() {
    super.connectedCallback(), this._loadReferenceData();
  }
  disconnectedCallback() {
    super.disconnectedCallback(), c(this, h) && clearTimeout(c(this, h));
  }
  async _loadReferenceData() {
    this._isLoading = !0;
    const [e, i, s] = await Promise.all([
      m.getTaxGroups(),
      m.getCountries(),
      m.getSettings()
    ]);
    this._taxGroups = e.data ?? [], this._countries = i.data ?? [], this._currencySymbol = s.data?.currencySymbol ?? "£", this._isLoading = !1;
  }
  _handleCustomerSearchInput(e) {
    const s = e.target.value.trim();
    if (c(this, h) && clearTimeout(c(this, h)), s.length < 2) {
      this._customerSearchResults = [], this._showCustomerDropdown = !1;
      return;
    }
    y(this, h, setTimeout(async () => {
      this._isSearchingCustomer = !0;
      const t = s.includes("@"), { data: n, error: l } = await m.searchCustomers(
        t ? s : void 0,
        t ? void 0 : s
      );
      if (this._isSearchingCustomer = !1, l) {
        console.error("Customer search error:", l);
        return;
      }
      this._customerSearchResults = n ?? [], this._showCustomerDropdown = this._customerSearchResults.length > 0;
    }, 300));
  }
  _selectCustomer(e) {
    this._selectedCustomer = e, this._showCustomerDropdown = !1, this._billingAddress = { ...e.billingAddress };
  }
  _clearSelectedCustomer() {
    this._selectedCustomer = null, this._customerSearchResults = [];
  }
  _selectPastShippingAddress(e) {
    this._shippingAddress = { ...e };
  }
  _updateBillingField(e, i) {
    if (this._billingAddress = { ...this._billingAddress, [e]: i }, this._validationErrors[`billing.${e}`]) {
      const s = { ...this._validationErrors };
      delete s[`billing.${e}`], this._validationErrors = s;
    }
    this._selectedCustomer && (this._selectedCustomer = null);
  }
  _updateShippingField(e, i) {
    if (this._shippingAddress = { ...this._shippingAddress, [e]: i }, this._validationErrors[`shipping.${e}`]) {
      const s = { ...this._validationErrors };
      delete s[`shipping.${e}`], this._validationErrors = s;
    }
  }
  _toggleShippingAddress() {
    this._useShippingAddress = !this._useShippingAddress, this._useShippingAddress && (this._shippingAddress = f());
  }
  async _openAddCustomItemModal() {
    if (!c(this, g)) return;
    const i = await c(this, g).open(this, F, {
      data: {
        currencySymbol: this._currencySymbol,
        taxGroups: this._taxGroups
      }
    }).onSubmit().catch(() => {
    });
    i?.item && (this._customItems = [
      ...this._customItems,
      {
        ...i.item,
        tempId: `custom-${Date.now()}`
      }
    ]);
  }
  _removeCustomItem(e) {
    this._customItems = this._customItems.filter((i) => i.tempId !== e);
  }
  _validateForm() {
    const e = {};
    return this._billingAddress.name?.trim() || (e["billing.name"] = "Name is required"), this._billingAddress.email?.trim() ? this._isValidEmail(this._billingAddress.email) || (e["billing.email"] = "Please enter a valid email address") : e["billing.email"] = "Email is required", this._billingAddress.addressOne?.trim() || (e["billing.addressOne"] = "Address is required"), this._billingAddress.townCity?.trim() || (e["billing.townCity"] = "Town/City is required"), this._billingAddress.postalCode?.trim() || (e["billing.postalCode"] = "Postal code is required"), this._billingAddress.countryCode || (e["billing.countryCode"] = "Country is required"), this._useShippingAddress && (this._shippingAddress.name?.trim() || (e["shipping.name"] = "Name is required"), this._shippingAddress.addressOne?.trim() || (e["shipping.addressOne"] = "Address is required"), this._shippingAddress.townCity?.trim() || (e["shipping.townCity"] = "Town/City is required"), this._shippingAddress.postalCode?.trim() || (e["shipping.postalCode"] = "Postal code is required"), this._shippingAddress.countryCode || (e["shipping.countryCode"] = "Country is required")), this._validationErrors = e, Object.keys(e).length === 0;
  }
  _isValidEmail(e) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e);
  }
  _getSubtotal() {
    return this._customItems.reduce((e, i) => e + i.price * i.quantity, 0);
  }
  /** Options for country dropdown - uui-select requires .options property */
  _getCountryOptions(e) {
    const i = e === "billing" ? this._billingAddress : this._shippingAddress, s = [
      { name: "Select country...", value: "", selected: !i.countryCode }
    ];
    return this._countries.forEach((t) => {
      s.push({
        name: t.name,
        value: t.code,
        selected: t.code === i.countryCode
      });
    }), s;
  }
  /** Options for past shipping address dropdown */
  get _pastShippingAddressOptions() {
    const e = [
      { name: "Select an address...", value: "", selected: !0 }
    ];
    return this._selectedCustomer && this._selectedCustomer.pastShippingAddresses.forEach((i, s) => {
      e.push({
        name: `${i.addressOne}, ${i.townCity}, ${i.postalCode}`,
        value: s.toString(),
        selected: !1
      });
    }), e;
  }
  async _handleSave() {
    if (!this._validateForm()) {
      c(this, v)?.peek("warning", {
        data: {
          headline: "Validation Error",
          message: "Please fill in all required fields."
        }
      });
      return;
    }
    this._isSaving = !0, this._errorMessage = null;
    const e = {
      billingAddress: this._billingAddress,
      shippingAddress: this._useShippingAddress ? this._shippingAddress : null,
      customItems: this._customItems.map((t) => ({
        name: t.name,
        sku: t.sku,
        price: t.price,
        quantity: t.quantity,
        taxGroupId: t.taxGroupId,
        isPhysicalProduct: t.isPhysicalProduct
      }))
    }, { data: i, error: s } = await m.createDraftOrder(e);
    if (this._isSaving = !1, s) {
      this._errorMessage = s.message;
      return;
    }
    i?.success && i.invoiceId ? (c(this, v)?.peek("positive", {
      data: {
        headline: "Order Created",
        message: `Draft order ${i.invoiceNumber} has been created.`
      }
    }), this.value = { created: !0, invoiceId: i.invoiceId }, this.modalContext?.submit()) : this._errorMessage = i?.errorMessage ?? "Failed to create order";
  }
  _handleCancel() {
    this.modalContext?.reject();
  }
  _renderLoading() {
    return r`
      <div class="loading">
        <uui-loader></uui-loader>
        <span>Loading...</span>
      </div>
    `;
  }
  _renderAddressField(e, i, s, t = "text", n = !1) {
    const p = (e === "billing" ? this._billingAddress : this._shippingAddress)[i] ?? "", _ = this._validationErrors[`${e}.${i}`], S = e === "billing" ? this._updateBillingField : this._updateShippingField;
    return r`
      <div class="form-field ${_ ? "has-error" : ""}">
        <label>${s}${n ? r`<span class="required">*</span>` : u}</label>
        <uui-input
          type=${t}
          .value=${p}
          @input=${(A) => S.call(this, i, A.target.value || null)}
        ></uui-input>
        ${_ ? r`<span class="error-text">${_}</span>` : u}
      </div>
    `;
  }
  _renderCountrySelect(e) {
    const i = this._validationErrors[`${e}.countryCode`], s = e === "billing" ? this._updateBillingField : this._updateShippingField;
    return r`
      <div class="form-field ${i ? "has-error" : ""}">
        <label>Country<span class="required">*</span></label>
        <uui-select
          .options=${this._getCountryOptions(e)}
          @change=${(t) => {
      const n = t.target, l = this._countries.find((p) => p.code === n.value);
      s.call(this, "countryCode", n.value || null), s.call(this, "country", l?.name ?? null);
    }}
        ></uui-select>
        ${i ? r`<span class="error-text">${i}</span>` : u}
      </div>
    `;
  }
  _renderBillingAddressForm() {
    return r`
      <div class="address-section">
        <h3>Billing Address</h3>

        <!-- Customer Search -->
        <div class="customer-search-wrapper">
          <div class="form-field">
            <label>Search existing customer</label>
            <div class="search-input-wrapper">
              <uui-input
                type="text"
                placeholder="Search by email or name..."
                @input=${this._handleCustomerSearchInput}
                @focus=${() => {
      this._customerSearchResults.length > 0 && (this._showCustomerDropdown = !0);
    }}
              >
                ${this._isSearchingCustomer ? r`<uui-loader-circle slot="append"></uui-loader-circle>` : r`<uui-icon slot="prepend" name="icon-search"></uui-icon>`}
              </uui-input>
            </div>
          </div>

          ${this._showCustomerDropdown ? r`
            <div class="customer-dropdown">
              ${this._customerSearchResults.map((e) => r`
                <button
                  class="customer-option"
                  @click=${() => this._selectCustomer(e)}
                >
                  <div class="customer-info">
                    <span class="customer-name">${e.name}</span>
                    <span class="customer-email">${e.email}</span>
                  </div>
                </button>
              `)}
            </div>
          ` : u}

          ${this._selectedCustomer ? r`
            <div class="selected-customer">
              <span>Selected: <strong>${this._selectedCustomer.name}</strong> (${this._selectedCustomer.email})</span>
              <uui-button compact look="secondary" @click=${this._clearSelectedCustomer}>
                <uui-icon name="icon-delete"></uui-icon>
              </uui-button>
            </div>
          ` : u}
        </div>

        <div class="address-grid">
          ${this._renderAddressField("billing", "name", "Name", "text", !0)}
          ${this._renderAddressField("billing", "email", "Email", "email", !0)}
          ${this._renderAddressField("billing", "phone", "Phone", "tel")}
          ${this._renderAddressField("billing", "company", "Company")}
          ${this._renderAddressField("billing", "addressOne", "Address Line 1", "text", !0)}
          ${this._renderAddressField("billing", "addressTwo", "Address Line 2")}
          ${this._renderAddressField("billing", "townCity", "Town/City", "text", !0)}
          ${this._renderAddressField("billing", "countyState", "County/State")}
          ${this._renderAddressField("billing", "postalCode", "Postal Code", "text", !0)}
          ${this._renderCountrySelect("billing")}
        </div>
      </div>
    `;
  }
  _renderShippingAddressForm() {
    return r`
      <div class="address-section">
        <div class="section-header-with-toggle">
          <h3>Shipping Address</h3>
          <uui-checkbox
            .checked=${this._useShippingAddress}
            @change=${this._toggleShippingAddress}
          >
            Ship to different address
          </uui-checkbox>
        </div>

        ${this._useShippingAddress ? r`
          <!-- Past shipping addresses dropdown -->
          ${this._selectedCustomer && this._selectedCustomer.pastShippingAddresses.length > 0 ? r`
            <div class="form-field">
              <label>Use a past shipping address</label>
              <uui-select
                .options=${this._pastShippingAddressOptions}
                @change=${(e) => {
      const i = parseInt(e.target.value);
      !isNaN(i) && this._selectedCustomer && this._selectPastShippingAddress(this._selectedCustomer.pastShippingAddresses[i]);
    }}
              ></uui-select>
            </div>
          ` : u}

          <div class="address-grid">
            ${this._renderAddressField("shipping", "name", "Name", "text", !0)}
            ${this._renderAddressField("shipping", "phone", "Phone", "tel")}
            ${this._renderAddressField("shipping", "company", "Company")}
            ${this._renderAddressField("shipping", "addressOne", "Address Line 1", "text", !0)}
            ${this._renderAddressField("shipping", "addressTwo", "Address Line 2")}
            ${this._renderAddressField("shipping", "townCity", "Town/City", "text", !0)}
            ${this._renderAddressField("shipping", "countyState", "County/State")}
            ${this._renderAddressField("shipping", "postalCode", "Postal Code", "text", !0)}
            ${this._renderCountrySelect("shipping")}
          </div>
        ` : u}
      </div>
    `;
  }
  _renderCustomItem(e) {
    const i = e.taxGroupId ? this._taxGroups.find((t) => t.id === e.taxGroupId) : null, s = i ? `${i.name} (${i.taxPercentage}%)` : "Not taxable";
    return r`
      <div class="line-item">
        <div class="line-item-product">
          <div class="line-item-image">
            <div class="placeholder-image custom"><uui-icon name="icon-add"></uui-icon></div>
          </div>
          <div class="line-item-details">
            <div class="line-item-name">${e.name}</div>
            <div class="line-item-sku">${e.sku ?? "Custom item"} · ${s}</div>
          </div>
        </div>
        <div class="line-item-price">${this._currencySymbol}${e.price.toFixed(2)}</div>
        <div class="line-item-quantity">${e.quantity}</div>
        <div class="line-item-total">${this._currencySymbol}${(e.price * e.quantity).toFixed(2)}</div>
        <div class="line-item-actions">
          <uui-button
            look="secondary"
            compact
            @click=${() => this._removeCustomItem(e.tempId)}
            title="Remove item"
          >
            <uui-icon name="icon-delete"></uui-icon>
          </uui-button>
        </div>
      </div>
    `;
  }
  _renderItemsSection() {
    return r`
      <div class="items-section">
        <h3>Items</h3>

        ${this._customItems.length > 0 ? r`
          <div class="items-table">
            <div class="items-header">
              <div class="header-cell product">Product</div>
              <div class="header-cell price">Price</div>
              <div class="header-cell quantity">Qty</div>
              <div class="header-cell total">Total</div>
              <div class="header-cell actions"></div>
            </div>
            <div class="items-list">
              ${this._customItems.map((e) => this._renderCustomItem(e))}
            </div>
          </div>
        ` : r`
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
      </div>
    `;
  }
  _renderSummary() {
    const e = this._getSubtotal();
    return r`
      <div class="summary-section">
        <h3>Order Summary</h3>

        <div class="summary-row">
          <span>Subtotal</span>
          <span>${this._currencySymbol}${e.toFixed(2)}</span>
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
          <span>${this._currencySymbol}${e.toFixed(2)}</span>
        </div>

        <p class="summary-note">
          Shipping and tax will be calculated after the order is created.
          You can edit the order to adjust these values.
        </p>
      </div>
    `;
  }
  render() {
    return this._isLoading ? r`<umb-body-layout headline="Create Order">${this._renderLoading()}</umb-body-layout>` : r`
      <umb-body-layout headline="Create Order">
        <div id="main">
          ${this._renderBillingAddressForm()}
          ${this._renderShippingAddressForm()}
          ${this._renderItemsSection()}
          ${this._renderSummary()}

          ${this._errorMessage ? r`
            <div class="error-message">
              <uui-icon name="icon-alert"></uui-icon>
              ${this._errorMessage}
            </div>
          ` : u}
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
            ${this._isSaving ? r`<uui-loader-circle></uui-loader-circle>` : "Create Order"}
          </uui-button>
        </div>
      </umb-body-layout>
    `;
  }
};
g = /* @__PURE__ */ new WeakMap();
v = /* @__PURE__ */ new WeakMap();
h = /* @__PURE__ */ new WeakMap();
a.styles = $`
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

    /* Address Section */
    .address-section {
      background: var(--uui-color-surface);
      border: 1px solid var(--uui-color-border);
      border-radius: var(--uui-border-radius);
      padding: var(--uui-size-space-4);
    }

    .section-header-with-toggle {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: var(--uui-size-space-4);
    }

    .section-header-with-toggle h3 {
      margin: 0;
    }

    .address-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: var(--uui-size-space-4);
    }

    .form-field {
      display: flex;
      flex-direction: column;
      gap: var(--uui-size-space-1);
    }

    .form-field label {
      font-size: 0.875rem;
      font-weight: 500;
    }

    .form-field .required {
      color: var(--uui-color-danger);
      margin-left: 2px;
    }

    .form-field.has-error uui-input,
    .form-field.has-error uui-select {
      --uui-input-border-color: var(--uui-color-danger);
    }

    .error-text {
      font-size: 0.75rem;
      color: var(--uui-color-danger);
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

    /* Items Section */
    .items-section {
      background: var(--uui-color-surface);
      border: 1px solid var(--uui-color-border);
      border-radius: var(--uui-border-radius);
      padding: var(--uui-size-space-4);
    }

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

    /* Summary Section */
    .summary-section {
      background: var(--uui-color-surface);
      border: 1px solid var(--uui-color-border);
      border-radius: var(--uui-border-radius);
      padding: var(--uui-size-space-4);
    }

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
o([
  d()
], a.prototype, "_billingAddress", 2);
o([
  d()
], a.prototype, "_shippingAddress", 2);
o([
  d()
], a.prototype, "_useShippingAddress", 2);
o([
  d()
], a.prototype, "_customItems", 2);
o([
  d()
], a.prototype, "_customerSearchResults", 2);
o([
  d()
], a.prototype, "_selectedCustomer", 2);
o([
  d()
], a.prototype, "_isSearchingCustomer", 2);
o([
  d()
], a.prototype, "_showCustomerDropdown", 2);
o([
  d()
], a.prototype, "_isSaving", 2);
o([
  d()
], a.prototype, "_isLoading", 2);
o([
  d()
], a.prototype, "_errorMessage", 2);
o([
  d()
], a.prototype, "_taxGroups", 2);
o([
  d()
], a.prototype, "_countries", 2);
o([
  d()
], a.prototype, "_currencySymbol", 2);
o([
  d()
], a.prototype, "_validationErrors", 2);
a = o([
  w("merchello-create-order-modal")
], a);
const L = a;
export {
  a as MerchelloCreateOrderModalElement,
  L as default
};
//# sourceMappingURL=create-order-modal.element-C7q_hyqK.js.map
