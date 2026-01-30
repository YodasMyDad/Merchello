import { html as t, nothing as p, css as w, state as a, customElement as x } from "@umbraco-cms/backoffice/external/lit";
import { UmbModalBaseElement as F } from "@umbraco-cms/backoffice/modal";
import { UMB_NOTIFICATION_CONTEXT as E } from "@umbraco-cms/backoffice/notification";
import { M as g } from "./merchello-api-LENiBVrz.js";
import { a as m } from "./formatting-CeWY__1B.js";
var O = Object.defineProperty, k = Object.getOwnPropertyDescriptor, f = (e) => {
  throw TypeError(e);
}, d = (e, i, s, n) => {
  for (var o = n > 1 ? void 0 : n ? k(i, s) : i, l = e.length - 1, u; l >= 0; l--)
    (u = e[l]) && (o = (n ? u(i, s, o) : u(o)) || o);
  return n && o && O(i, s, o), o;
}, C = (e, i, s) => i.has(e) || f("Cannot " + s), h = (e, i, s) => (C(e, i, "read from private field"), i.get(e)), b = (e, i, s) => i.has(e) ? f("Cannot add the same private member more than once") : i instanceof WeakSet ? i.add(e) : i.set(e, s), v = (e, i, s, n) => (C(e, i, "write to private field"), i.set(e, s), s), _, c;
function y() {
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
let r = class extends F {
  constructor() {
    super(), this._billingAddress = y(), this._shippingAddress = y(), this._useShippingAddress = !1, this._customerSearchResults = [], this._selectedCustomer = null, this._isSearchingCustomer = !1, this._showCustomerDropdown = !1, this._creditWarning = null, this._isSaving = !1, this._isLoading = !0, this._errorMessage = null, this._countries = [], this._validationErrors = {}, b(this, _), b(this, c), this.consumeContext(E, (e) => {
      v(this, _, e);
    });
  }
  connectedCallback() {
    super.connectedCallback(), this._loadReferenceData();
  }
  disconnectedCallback() {
    super.disconnectedCallback(), h(this, c) && clearTimeout(h(this, c));
  }
  async _loadReferenceData() {
    this._isLoading = !0;
    const { data: e } = await g.getCountries();
    this._countries = e ?? [], this._isLoading = !1;
  }
  _handleCustomerSearchInput(e) {
    const s = e.target.value.trim();
    if (h(this, c) && clearTimeout(h(this, c)), s.length < 2) {
      this._customerSearchResults = [], this._showCustomerDropdown = !1;
      return;
    }
    v(this, c, setTimeout(async () => {
      this._isSearchingCustomer = !0;
      const n = s.includes("@"), { data: o, error: l } = await g.searchCustomers(
        n ? s : void 0,
        n ? void 0 : s
      );
      this._isSearchingCustomer = !1, !l && (this._customerSearchResults = o ?? [], this._showCustomerDropdown = this._customerSearchResults.length > 0);
    }, 300));
  }
  async _selectCustomer(e) {
    if (this._selectedCustomer = e, this._showCustomerDropdown = !1, this._creditWarning = null, this._billingAddress = { ...e.billingAddress }, e.hasAccountTerms && e.customerId && e.creditLimit != null) {
      const { data: i, error: s } = await g.getCustomerOutstandingBalance(e.customerId);
      !s && i && (i.creditWarningLevel === "exceeded" ? this._creditWarning = {
        type: "danger",
        message: `Credit limit exceeded: ${m(i.totalOutstanding, i.currencyCode)} outstanding exceeds ${m(e.creditLimit, i.currencyCode)} limit`,
        outstanding: i.totalOutstanding,
        creditLimit: e.creditLimit,
        currencyCode: i.currencyCode
      } : i.creditWarningLevel === "warning" && (this._creditWarning = {
        type: "warning",
        message: `Customer has ${m(i.totalOutstanding, i.currencyCode)} outstanding of ${m(e.creditLimit, i.currencyCode)} limit (${Math.round(i.creditUtilizationPercent ?? 0)}% utilized)`,
        outstanding: i.totalOutstanding,
        creditLimit: e.creditLimit,
        currencyCode: i.currencyCode
      }));
    }
  }
  _clearSelectedCustomer() {
    this._selectedCustomer = null, this._customerSearchResults = [], this._creditWarning = null;
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
    this._useShippingAddress = !this._useShippingAddress, this._useShippingAddress && (this._shippingAddress = y());
  }
  _validateForm() {
    const e = {};
    return this._billingAddress.name?.trim() || (e["billing.name"] = "Name is required"), this._billingAddress.email?.trim() ? this._isValidEmail(this._billingAddress.email) || (e["billing.email"] = "Please enter a valid email address") : e["billing.email"] = "Email is required", this._billingAddress.addressOne?.trim() || (e["billing.addressOne"] = "Address is required"), this._billingAddress.townCity?.trim() || (e["billing.townCity"] = "Town/City is required"), this._billingAddress.postalCode?.trim() || (e["billing.postalCode"] = "Postal code is required"), this._billingAddress.countryCode || (e["billing.countryCode"] = "Country is required"), this._useShippingAddress && (this._shippingAddress.name?.trim() || (e["shipping.name"] = "Name is required"), this._shippingAddress.addressOne?.trim() || (e["shipping.addressOne"] = "Address is required"), this._shippingAddress.townCity?.trim() || (e["shipping.townCity"] = "Town/City is required"), this._shippingAddress.postalCode?.trim() || (e["shipping.postalCode"] = "Postal code is required"), this._shippingAddress.countryCode || (e["shipping.countryCode"] = "Country is required")), this._validationErrors = e, Object.keys(e).length === 0;
  }
  _isValidEmail(e) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e);
  }
  /** Options for country dropdown - uui-select requires .options property */
  _getCountryOptions(e) {
    const i = e === "billing" ? this._billingAddress : this._shippingAddress, s = [
      { name: "Select country...", value: "", selected: !i.countryCode }
    ];
    return this._countries.forEach((n) => {
      s.push({
        name: n.name,
        value: n.code,
        selected: n.code === i.countryCode
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
      h(this, _)?.peek("warning", {
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
      customItems: []
      // Items are added in the edit modal
    }, { data: i, error: s } = await g.createDraftOrder(e);
    if (this._isSaving = !1, s) {
      this._errorMessage = s.message;
      return;
    }
    i?.isSuccessful && i.invoiceId ? (this.value = {
      isCreated: !0,
      invoiceId: i.invoiceId,
      shouldOpenEdit: !0
    }, this.modalContext?.submit()) : this._errorMessage = i?.errorMessage ?? "Failed to create order";
  }
  _handleCancel() {
    this.modalContext?.reject();
  }
  _renderLoading() {
    return t`
      <div class="loading">
        <uui-loader></uui-loader>
        <span>Loading...</span>
      </div>
    `;
  }
  _renderAddressField(e, i, s, n = "text", o = !1) {
    const u = (e === "billing" ? this._billingAddress : this._shippingAddress)[i] ?? "", A = this._validationErrors[`${e}.${i}`], $ = e === "billing" ? this._updateBillingField : this._updateShippingField;
    return t`
      <umb-property-layout
        label=${s}
        ?mandatory=${o}
        ?invalid=${!!A}>
        <uui-input
          slot="editor"
          type=${n}
          .value=${u}
          @input=${(S) => $.call(this, i, S.target.value || null)}>
        </uui-input>
      </umb-property-layout>
    `;
  }
  _renderCountrySelect(e) {
    const i = this._validationErrors[`${e}.countryCode`], s = e === "billing" ? this._updateBillingField : this._updateShippingField;
    return t`
      <umb-property-layout
        label="Country"
        ?mandatory=${!0}
        ?invalid=${!!i}>
        <uui-select
          slot="editor"
          .options=${this._getCountryOptions(e)}
          @change=${(n) => {
      const o = n.target, l = this._countries.find((u) => u.code === o.value);
      s.call(this, "countryCode", o.value || null), s.call(this, "country", l?.name ?? null);
    }}>
        </uui-select>
      </umb-property-layout>
    `;
  }
  _renderBillingAddressForm() {
    return t`
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
      this._customerSearchResults.length > 0 && (this._showCustomerDropdown = !0);
    }}>
                ${this._isSearchingCustomer ? t`<uui-loader-circle slot="append"></uui-loader-circle>` : t`<uui-icon slot="prepend" name="icon-search"></uui-icon>`}
              </uui-input>
            </div>
          </umb-property-layout>

          ${this._showCustomerDropdown ? t`
            <div class="customer-dropdown">
              ${this._customerSearchResults.map((e) => t`
                <button
                  class="customer-option"
                  @click=${() => this._selectCustomer(e)}>
                  <div class="customer-info">
                    <span class="customer-name">${e.name}</span>
                    <span class="customer-email">${e.email}</span>
                  </div>
                </button>
              `)}
            </div>
          ` : p}

          ${this._selectedCustomer ? t`
            <div class="selected-customer">
              <span>Selected: <strong>${this._selectedCustomer.name}</strong> (${this._selectedCustomer.email})</span>
              <uui-button compact look="secondary" @click=${this._clearSelectedCustomer}>
                <uui-icon name="icon-delete"></uui-icon>
              </uui-button>
            </div>
          ` : p}

          ${this._creditWarning ? t`
            <div class="credit-warning credit-warning--${this._creditWarning.type}">
              <uui-icon name="icon-alert"></uui-icon>
              <span>${this._creditWarning.message}</span>
            </div>
          ` : p}
        </div>

        <div class="address-fields">
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
      </uui-box>
    `;
  }
  _renderShippingAddressForm() {
    return t`
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

        ${this._useShippingAddress ? t`
          <!-- Past shipping addresses dropdown -->
          ${this._selectedCustomer && this._selectedCustomer.pastShippingAddresses.length > 0 ? t`
            <umb-property-layout
              label="Use a past shipping address"
              description="Select from customer's previous shipping addresses">
              <uui-select
                slot="editor"
                .options=${this._pastShippingAddressOptions}
                @change=${(e) => {
      const i = parseInt(e.target.value);
      !isNaN(i) && this._selectedCustomer && this._selectPastShippingAddress(this._selectedCustomer.pastShippingAddresses[i]);
    }}>
              </uui-select>
            </umb-property-layout>
          ` : p}

          <div class="address-fields">
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
        ` : p}
      </uui-box>
    `;
  }
  render() {
    return this._isLoading ? t`<umb-body-layout headline="Create Order">${this._renderLoading()}</umb-body-layout>` : t`
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

          ${this._errorMessage ? t`
            <div class="error-message">
              <uui-icon name="icon-alert"></uui-icon>
              ${this._errorMessage}
            </div>
          ` : p}
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
            ${this._isSaving ? t`<uui-loader-circle></uui-loader-circle>` : "Create & Edit"}
          </uui-button>
        </div>
      </umb-body-layout>
    `;
  }
};
_ = /* @__PURE__ */ new WeakMap();
c = /* @__PURE__ */ new WeakMap();
r.styles = w`
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
d([
  a()
], r.prototype, "_billingAddress", 2);
d([
  a()
], r.prototype, "_shippingAddress", 2);
d([
  a()
], r.prototype, "_useShippingAddress", 2);
d([
  a()
], r.prototype, "_customerSearchResults", 2);
d([
  a()
], r.prototype, "_selectedCustomer", 2);
d([
  a()
], r.prototype, "_isSearchingCustomer", 2);
d([
  a()
], r.prototype, "_showCustomerDropdown", 2);
d([
  a()
], r.prototype, "_creditWarning", 2);
d([
  a()
], r.prototype, "_isSaving", 2);
d([
  a()
], r.prototype, "_isLoading", 2);
d([
  a()
], r.prototype, "_errorMessage", 2);
d([
  a()
], r.prototype, "_countries", 2);
d([
  a()
], r.prototype, "_validationErrors", 2);
r = d([
  x("merchello-create-order-modal")
], r);
const W = r;
export {
  r as MerchelloCreateOrderModalElement,
  W as default
};
//# sourceMappingURL=create-order-modal.element-BsZeoTzH.js.map
