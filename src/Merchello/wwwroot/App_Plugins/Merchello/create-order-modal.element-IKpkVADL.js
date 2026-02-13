import { html as d, nothing as h, css as x, state as l, customElement as R } from "@umbraco-cms/backoffice/external/lit";
import { UmbModalBaseElement as F } from "@umbraco-cms/backoffice/modal";
import { UMB_NOTIFICATION_CONTEXT as O } from "@umbraco-cms/backoffice/notification";
import { M as _ } from "./merchello-api-DNSJzonx.js";
import { a as C } from "./formatting-YHMza1vS.js";
var E = Object.defineProperty, z = Object.getOwnPropertyDescriptor, $ = (e) => {
  throw TypeError(e);
}, a = (e, i, s, r) => {
  for (var t = r > 1 ? void 0 : r ? z(i, s) : i, u = e.length - 1, o; u >= 0; u--)
    (o = e[u]) && (t = (r ? o(i, s, t) : o(t)) || t);
  return r && t && E(i, s, t), t;
}, k = (e, i, s) => i.has(e) || $("Cannot " + s), p = (e, i, s) => (k(e, i, "read from private field"), i.get(e)), A = (e, i, s) => i.has(e) ? $("Cannot add the same private member more than once") : i instanceof WeakSet ? i.add(e) : i.set(e, s), S = (e, i, s, r) => (k(e, i, "write to private field"), i.set(e, s), s), v, m, b, y;
function w() {
  return {
    name: null,
    email: null,
    phone: null,
    company: null,
    addressOne: null,
    addressTwo: null,
    townCity: null,
    countyState: null,
    regionCode: null,
    postalCode: null,
    country: null,
    countryCode: null
  };
}
let n = class extends F {
  constructor() {
    super(), this._billingAddress = w(), this._shippingAddress = w(), this._useShippingAddress = !1, this._customerSearchResults = [], this._selectedCustomer = null, this._isSearchingCustomer = !1, this._showCustomerDropdown = !1, this._creditWarning = null, this._isSaving = !1, this._isLoading = !0, this._errorMessage = null, this._countries = [], this._billingRegions = [], this._shippingRegions = [], this._isLoadingBillingRegions = !1, this._isLoadingShippingRegions = !1, this._addressLookupConfig = null, this._billingAddressSuggestions = [], this._shippingAddressSuggestions = [], this._isSearchingBillingAddress = !1, this._isSearchingShippingAddress = !1, this._showBillingAddressDropdown = !1, this._showShippingAddressDropdown = !1, this._validationErrors = {}, A(this, v), A(this, m), A(this, b), A(this, y), this.consumeContext(O, (e) => {
      S(this, v, e);
    });
  }
  connectedCallback() {
    super.connectedCallback(), this._loadReferenceData();
  }
  disconnectedCallback() {
    super.disconnectedCallback(), p(this, m) && clearTimeout(p(this, m)), p(this, b) && clearTimeout(p(this, b)), p(this, y) && clearTimeout(p(this, y));
  }
  async _loadReferenceData() {
    this._isLoading = !0;
    const [e, i] = await Promise.all([
      _.getCountries(),
      _.getOrderAddressLookupConfig()
    ]);
    this._countries = e.data ?? [], this._addressLookupConfig = i.data ?? null, this._isLoading = !1;
  }
  async _loadRegions(e, i) {
    e === "billing" ? (this._isLoadingBillingRegions = !0, this._billingRegions = []) : (this._isLoadingShippingRegions = !0, this._shippingRegions = []);
    const { data: s } = await _.getLocalityRegions(i);
    e === "billing" ? (this._billingRegions = s ?? [], this._isLoadingBillingRegions = !1) : (this._shippingRegions = s ?? [], this._isLoadingShippingRegions = !1);
  }
  _handleCustomerSearchInput(e) {
    const s = e.target.value.trim();
    if (p(this, m) && clearTimeout(p(this, m)), s.length < 2) {
      this._customerSearchResults = [], this._showCustomerDropdown = !1;
      return;
    }
    S(this, m, setTimeout(async () => {
      this._isSearchingCustomer = !0;
      const r = s.includes("@"), { data: t, error: u } = await _.searchCustomers(
        r ? s : void 0,
        r ? void 0 : s
      );
      this._isSearchingCustomer = !1, !u && (this._customerSearchResults = t ?? [], this._showCustomerDropdown = this._customerSearchResults.length > 0);
    }, 300));
  }
  async _selectCustomer(e) {
    if (this._selectedCustomer = e, this._showCustomerDropdown = !1, this._creditWarning = null, this._billingAddress = { ...e.billingAddress }, e.billingAddress.countryCode && this._loadRegions("billing", e.billingAddress.countryCode), e.hasAccountTerms && e.customerId && e.creditLimit != null) {
      const { data: i, error: s } = await _.getCustomerOutstandingBalance(e.customerId);
      !s && i && (i.creditWarningLevel === "exceeded" ? this._creditWarning = {
        type: "danger",
        message: `Credit limit exceeded: ${C(i.totalOutstanding, i.currencyCode)} outstanding exceeds ${C(e.creditLimit, i.currencyCode)} limit`,
        outstanding: i.totalOutstanding,
        creditLimit: e.creditLimit,
        currencyCode: i.currencyCode
      } : i.creditWarningLevel === "warning" && (this._creditWarning = {
        type: "warning",
        message: `Customer has ${C(i.totalOutstanding, i.currencyCode)} outstanding of ${C(e.creditLimit, i.currencyCode)} limit (${Math.round(i.creditUtilizationPercent ?? 0)}% utilized)`,
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
    this._shippingAddress = { ...e }, e.countryCode && this._loadRegions("shipping", e.countryCode);
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
    this._useShippingAddress = !this._useShippingAddress, this._useShippingAddress && (this._shippingAddress = w());
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
    return this._countries.forEach((r) => {
      s.push({
        name: r.name,
        value: r.code,
        selected: r.code === i.countryCode
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
      p(this, v)?.peek("warning", {
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
    }, { data: i, error: s } = await _.createManualOrder(e);
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
    return d`
      <div class="loading">
        <uui-loader></uui-loader>
        <span>Loading...</span>
      </div>
    `;
  }
  _renderAddressField(e, i, s, r = "text", t = !1) {
    const o = (e === "billing" ? this._billingAddress : this._shippingAddress)[i] ?? "", c = this._validationErrors[`${e}.${i}`], g = e === "billing" ? this._updateBillingField : this._updateShippingField;
    return d`
      <umb-property-layout
        label=${s}
        ?mandatory=${t}
        ?invalid=${!!c}>
        <uui-input
          slot="editor"
          type=${r}
          .value=${o}
          @input=${(f) => g.call(this, i, f.target.value || null)}>
        </uui-input>
      </umb-property-layout>
    `;
  }
  _renderCountrySelect(e) {
    const i = this._validationErrors[`${e}.countryCode`], s = e === "billing" ? this._updateBillingField : this._updateShippingField;
    return d`
      <umb-property-layout
        label="Country"
        ?mandatory=${!0}
        ?invalid=${!!i}>
        <uui-select
          slot="editor"
          .options=${this._getCountryOptions(e)}
          @change=${(r) => {
      const t = r.target, u = this._countries.find((o) => o.code === t.value);
      s.call(this, "countryCode", t.value || null), s.call(this, "country", u?.name ?? null), s.call(this, "countyState", null), s.call(this, "regionCode", null), e === "billing" ? this._billingRegions = [] : this._shippingRegions = [], t.value && this._loadRegions(e, t.value);
    }}>
        </uui-select>
      </umb-property-layout>
    `;
  }
  _renderRegionSelect(e) {
    const i = e === "billing" ? this._billingAddress : this._shippingAddress, s = e === "billing" ? this._billingRegions : this._shippingRegions, r = e === "billing" ? this._isLoadingBillingRegions : this._isLoadingShippingRegions, t = e === "billing" ? this._updateBillingField : this._updateShippingField, u = !!i.countryCode;
    if (r)
      return d`
        <umb-property-layout label="County/State">
          <div slot="editor" class="region-loading">
            <uui-loader-circle></uui-loader-circle>
            <span>Loading regions...</span>
          </div>
        </umb-property-layout>
      `;
    if (u && s.length > 0) {
      const o = [
        { name: "Select region...", value: "", selected: !i.regionCode }
      ];
      return s.forEach((c) => {
        o.push({
          name: c.name,
          value: c.regionCode,
          selected: c.regionCode === i.regionCode
        });
      }), d`
        <umb-property-layout label="County/State">
          <uui-select
            slot="editor"
            .options=${o}
            @change=${(c) => {
        const g = c.target, f = s.find((L) => L.regionCode === g.value);
        t.call(this, "regionCode", g.value || null), t.call(this, "countyState", (f?.name ?? g.value) || null);
      }}>
          </uui-select>
        </umb-property-layout>
      `;
    }
    return this._renderAddressField(e, "countyState", "County/State");
  }
  _isAddressLookupAvailable(e) {
    if (!this._addressLookupConfig?.isEnabled) return !1;
    const s = (e === "billing" ? this._billingAddress : this._shippingAddress).countryCode;
    if (!s) return !1;
    const r = this._addressLookupConfig.supportedCountries;
    return r && r.length > 0 ? r.some((t) => t.toUpperCase() === s.toUpperCase()) : !0;
  }
  _handleAddressLookupInput(e, i) {
    const r = i.target.value.trim(), t = e === "billing" ? p(this, b) : p(this, y);
    t && clearTimeout(t);
    const u = this._addressLookupConfig?.minQueryLength ?? 3;
    if (r.length < u) {
      e === "billing" ? (this._billingAddressSuggestions = [], this._showBillingAddressDropdown = !1) : (this._shippingAddressSuggestions = [], this._showShippingAddressDropdown = !1);
      return;
    }
    const o = e === "billing" ? this._billingAddress : this._shippingAddress, c = setTimeout(async () => {
      e === "billing" ? this._isSearchingBillingAddress = !0 : this._isSearchingShippingAddress = !0;
      const { data: g, error: f } = await _.getOrderAddressLookupSuggestions({
        query: r,
        countryCode: o.countryCode ?? void 0,
        limit: this._addressLookupConfig?.maxSuggestions ?? 10
      });
      e === "billing" ? this._isSearchingBillingAddress = !1 : this._isSearchingShippingAddress = !1, !(f || !g?.success) && (e === "billing" ? (this._billingAddressSuggestions = g.suggestions ?? [], this._showBillingAddressDropdown = this._billingAddressSuggestions.length > 0) : (this._shippingAddressSuggestions = g.suggestions ?? [], this._showShippingAddressDropdown = this._shippingAddressSuggestions.length > 0));
    }, 300);
    e === "billing" ? S(this, b, c) : S(this, y, c);
  }
  async _selectAddressSuggestion(e, i) {
    const s = e === "billing" ? this._billingAddress : this._shippingAddress, r = e === "billing" ? this._updateBillingField : this._updateShippingField;
    e === "billing" ? (this._showBillingAddressDropdown = !1, this._billingAddressSuggestions = []) : (this._showShippingAddressDropdown = !1, this._shippingAddressSuggestions = []);
    const { data: t, error: u } = await _.resolveOrderAddressLookup({
      id: i.id,
      countryCode: s.countryCode ?? void 0
    });
    if (u || !t?.success || !t.address) {
      p(this, v)?.peek("warning", {
        data: {
          headline: "Address Lookup Error",
          message: t?.errorMessage ?? "Failed to resolve address"
        }
      });
      return;
    }
    const o = t.address;
    o.company && r.call(this, "company", o.company), o.addressOne && r.call(this, "addressOne", o.addressOne), o.addressTwo && r.call(this, "addressTwo", o.addressTwo), o.townCity && r.call(this, "townCity", o.townCity), o.countyState && r.call(this, "countyState", o.countyState), o.regionCode && r.call(this, "regionCode", o.regionCode), o.postalCode && r.call(this, "postalCode", o.postalCode), o.countryCode && o.regionCode && await this._loadRegions(e, o.countryCode);
  }
  _renderAddressLookup(e) {
    if (!this._isAddressLookupAvailable(e))
      return h;
    const i = e === "billing" ? this._billingAddressSuggestions : this._shippingAddressSuggestions, s = e === "billing" ? this._isSearchingBillingAddress : this._isSearchingShippingAddress, r = e === "billing" ? this._showBillingAddressDropdown : this._showShippingAddressDropdown;
    return d`
      <div class="address-lookup-wrapper">
        <umb-property-layout
          label="Find address"
          description="Start typing to search for an address">
          <div slot="editor" class="search-input-wrapper">
            <uui-input
              type="text"
              placeholder="Start typing address..."
              @input=${(t) => this._handleAddressLookupInput(e, t)}
              @focus=${() => {
      i.length > 0 && (e === "billing" ? this._showBillingAddressDropdown = !0 : this._showShippingAddressDropdown = !0);
    }}>
              ${s ? d`<uui-loader-circle slot="append"></uui-loader-circle>` : d`<uui-icon slot="prepend" name="icon-search"></uui-icon>`}
            </uui-input>
          </div>
        </umb-property-layout>

        ${r ? d`
          <div class="address-lookup-dropdown">
            ${i.map((t) => d`
              <button
                class="address-suggestion"
                @click=${() => this._selectAddressSuggestion(e, t)}>
                <div class="suggestion-info">
                  <span class="suggestion-label">${t.label}</span>
                  ${t.description ? d`
                    <span class="suggestion-description">${t.description}</span>
                  ` : h}
                </div>
              </button>
            `)}
          </div>
        ` : h}
      </div>
    `;
  }
  _renderBillingAddressForm() {
    return d`
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
                ${this._isSearchingCustomer ? d`<uui-loader-circle slot="append"></uui-loader-circle>` : d`<uui-icon slot="prepend" name="icon-search"></uui-icon>`}
              </uui-input>
            </div>
          </umb-property-layout>

          ${this._showCustomerDropdown ? d`
            <div class="customer-dropdown">
              ${this._customerSearchResults.map((e) => d`
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
          ` : h}

          ${this._selectedCustomer ? d`
            <div class="selected-customer">
              <span>Selected: <strong>${this._selectedCustomer.name}</strong> (${this._selectedCustomer.email})</span>
              <uui-button compact look="secondary" label="Clear customer" @click=${this._clearSelectedCustomer}>
                <uui-icon name="icon-delete"></uui-icon>
              </uui-button>
            </div>
          ` : h}

          ${this._creditWarning ? d`
            <div class="credit-warning credit-warning--${this._creditWarning.type}">
              <uui-icon name="icon-alert"></uui-icon>
              <span>${this._creditWarning.message}</span>
            </div>
          ` : h}
        </div>

        <div class="address-fields">
          ${this._renderAddressField("billing", "name", "Name", "text", !0)}
          ${this._renderAddressField("billing", "email", "Email", "email", !0)}
          ${this._renderAddressField("billing", "phone", "Phone", "tel")}
          ${this._renderAddressField("billing", "company", "Company")}
          ${this._renderAddressLookup("billing")}
          ${this._renderAddressField("billing", "addressOne", "Address Line 1", "text", !0)}
          ${this._renderAddressField("billing", "addressTwo", "Address Line 2")}
          ${this._renderAddressField("billing", "townCity", "Town/City", "text", !0)}
          ${this._renderRegionSelect("billing")}
          ${this._renderAddressField("billing", "postalCode", "Postal Code", "text", !0)}
          ${this._renderCountrySelect("billing")}
        </div>
      </uui-box>
    `;
  }
  _renderShippingAddressForm() {
    return d`
      <uui-box headline="Shipping Address">
        <umb-property-layout
          label="Ship to different address"
          description="Enable to enter a separate shipping address">
          <uui-toggle
            slot="editor"
            label="Ship to different address"
            .checked=${this._useShippingAddress}
            @change=${this._toggleShippingAddress}>
          </uui-toggle>
        </umb-property-layout>

        ${this._useShippingAddress ? d`
          <!-- Past shipping addresses dropdown -->
          ${this._selectedCustomer && this._selectedCustomer.pastShippingAddresses.length > 0 ? d`
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
          ` : h}

          <div class="address-fields">
            ${this._renderAddressField("shipping", "name", "Name", "text", !0)}
            ${this._renderAddressField("shipping", "phone", "Phone", "tel")}
            ${this._renderAddressField("shipping", "company", "Company")}
            ${this._renderAddressLookup("shipping")}
            ${this._renderAddressField("shipping", "addressOne", "Address Line 1", "text", !0)}
            ${this._renderAddressField("shipping", "addressTwo", "Address Line 2")}
            ${this._renderAddressField("shipping", "townCity", "Town/City", "text", !0)}
            ${this._renderRegionSelect("shipping")}
            ${this._renderAddressField("shipping", "postalCode", "Postal Code", "text", !0)}
            ${this._renderCountrySelect("shipping")}
          </div>
        ` : h}
      </uui-box>
    `;
  }
  render() {
    return this._isLoading ? d`<umb-body-layout headline="Create Order">${this._renderLoading()}</umb-body-layout>` : d`
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

          ${this._errorMessage ? d`
            <div class="error-message">
              <uui-icon name="icon-alert"></uui-icon>
              ${this._errorMessage}
            </div>
          ` : h}
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
            ${this._isSaving ? d`<uui-loader-circle></uui-loader-circle>` : "Create & Edit"}
          </uui-button>
        </div>
      </umb-body-layout>
    `;
  }
};
v = /* @__PURE__ */ new WeakMap();
m = /* @__PURE__ */ new WeakMap();
b = /* @__PURE__ */ new WeakMap();
y = /* @__PURE__ */ new WeakMap();
n.styles = x`
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

    /* Address Lookup */
    .address-lookup-wrapper {
      position: relative;
    }

    .address-lookup-dropdown {
      position: absolute;
      top: 100%;
      left: 0;
      right: 0;
      background: var(--uui-color-surface);
      border: 1px solid var(--uui-color-border);
      border-radius: var(--uui-border-radius);
      box-shadow: var(--uui-shadow-depth-3);
      z-index: 100;
      max-height: 250px;
      overflow-y: auto;
    }

    .address-suggestion {
      display: block;
      width: 100%;
      padding: var(--uui-size-space-3);
      background: none;
      border: none;
      border-bottom: 1px solid var(--uui-color-border);
      cursor: pointer;
      text-align: left;
    }

    .address-suggestion:last-child {
      border-bottom: none;
    }

    .address-suggestion:hover {
      background: var(--uui-color-surface-alt);
    }

    .suggestion-info {
      display: flex;
      flex-direction: column;
      gap: 2px;
    }

    .suggestion-label {
      font-weight: 500;
    }

    .suggestion-description {
      font-size: 0.875rem;
      color: var(--uui-color-text-alt);
    }

    /* Region Loading */
    .region-loading {
      display: flex;
      align-items: center;
      gap: var(--uui-size-space-2);
      color: var(--uui-color-text-alt);
      font-size: 0.875rem;
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
a([
  l()
], n.prototype, "_billingAddress", 2);
a([
  l()
], n.prototype, "_shippingAddress", 2);
a([
  l()
], n.prototype, "_useShippingAddress", 2);
a([
  l()
], n.prototype, "_customerSearchResults", 2);
a([
  l()
], n.prototype, "_selectedCustomer", 2);
a([
  l()
], n.prototype, "_isSearchingCustomer", 2);
a([
  l()
], n.prototype, "_showCustomerDropdown", 2);
a([
  l()
], n.prototype, "_creditWarning", 2);
a([
  l()
], n.prototype, "_isSaving", 2);
a([
  l()
], n.prototype, "_isLoading", 2);
a([
  l()
], n.prototype, "_errorMessage", 2);
a([
  l()
], n.prototype, "_countries", 2);
a([
  l()
], n.prototype, "_billingRegions", 2);
a([
  l()
], n.prototype, "_shippingRegions", 2);
a([
  l()
], n.prototype, "_isLoadingBillingRegions", 2);
a([
  l()
], n.prototype, "_isLoadingShippingRegions", 2);
a([
  l()
], n.prototype, "_addressLookupConfig", 2);
a([
  l()
], n.prototype, "_billingAddressSuggestions", 2);
a([
  l()
], n.prototype, "_shippingAddressSuggestions", 2);
a([
  l()
], n.prototype, "_isSearchingBillingAddress", 2);
a([
  l()
], n.prototype, "_isSearchingShippingAddress", 2);
a([
  l()
], n.prototype, "_showBillingAddressDropdown", 2);
a([
  l()
], n.prototype, "_showShippingAddressDropdown", 2);
a([
  l()
], n.prototype, "_validationErrors", 2);
n = a([
  R("merchello-create-order-modal")
], n);
const W = n;
export {
  n as MerchelloCreateOrderModalElement,
  W as default
};
//# sourceMappingURL=create-order-modal.element-IKpkVADL.js.map
