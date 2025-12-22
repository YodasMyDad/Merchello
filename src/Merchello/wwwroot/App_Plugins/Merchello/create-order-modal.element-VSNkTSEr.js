import { html as r, nothing as g, css as w, state as l, customElement as I } from "@umbraco-cms/backoffice/external/lit";
import { UmbModalBaseElement as P, UMB_MODAL_MANAGER_CONTEXT as k } from "@umbraco-cms/backoffice/modal";
import { UMB_NOTIFICATION_CONTEXT as E } from "@umbraco-cms/backoffice/notification";
import { M as _ } from "./merchello-api-s-9cx0Ue.js";
import { M } from "./add-custom-item-modal.token-Ced0pQA6.js";
import { M as O } from "./product-picker-modal.token-BfbHsSHl.js";
import { c as h } from "./formatting-BzzWJIvp.js";
var z = Object.defineProperty, F = Object.getOwnPropertyDescriptor, C = (e) => {
  throw TypeError(e);
}, n = (e, i, t, s) => {
  for (var d = s > 1 ? void 0 : s ? F(i, t) : i, a = e.length - 1, c; a >= 0; a--)
    (c = e[a]) && (d = (s ? c(i, t, d) : c(d)) || d);
  return s && d && z(i, t, d), d;
}, x = (e, i, t) => i.has(e) || C("Cannot " + t), u = (e, i, t) => (x(e, i, "read from private field"), i.get(e)), y = (e, i, t) => i.has(e) ? C("Cannot add the same private member more than once") : i instanceof WeakSet ? i.add(e) : i.set(e, t), b = (e, i, t, s) => (x(e, i, "write to private field"), i.set(e, t), t), p, v, m;
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
let o = class extends P {
  constructor() {
    super(), this._billingAddress = f(), this._shippingAddress = f(), this._useShippingAddress = !1, this._customItems = [], this._pendingProducts = [], this._customerSearchResults = [], this._selectedCustomer = null, this._isSearchingCustomer = !1, this._showCustomerDropdown = !1, this._isSaving = !1, this._isLoading = !0, this._errorMessage = null, this._taxGroups = [], this._countries = [], this._currencySymbol = "£", this._validationErrors = {}, y(this, p), y(this, v), y(this, m), this.consumeContext(k, (e) => {
      b(this, p, e);
    }), this.consumeContext(E, (e) => {
      b(this, v, e);
    });
  }
  connectedCallback() {
    super.connectedCallback(), this._loadReferenceData();
  }
  disconnectedCallback() {
    super.disconnectedCallback(), u(this, m) && clearTimeout(u(this, m));
  }
  async _loadReferenceData() {
    this._isLoading = !0;
    const [e, i, t] = await Promise.all([
      _.getTaxGroups(),
      _.getCountries(),
      _.getSettings()
    ]);
    this._taxGroups = e.data ?? [], this._countries = i.data ?? [], this._currencySymbol = t.data?.currencySymbol ?? "£", this._isLoading = !1;
  }
  _handleCustomerSearchInput(e) {
    const t = e.target.value.trim();
    if (u(this, m) && clearTimeout(u(this, m)), t.length < 2) {
      this._customerSearchResults = [], this._showCustomerDropdown = !1;
      return;
    }
    b(this, m, setTimeout(async () => {
      this._isSearchingCustomer = !0;
      const s = t.includes("@"), { data: d, error: a } = await _.searchCustomers(
        s ? t : void 0,
        s ? void 0 : t
      );
      if (this._isSearchingCustomer = !1, a) {
        console.error("Customer search error:", a);
        return;
      }
      this._customerSearchResults = d ?? [], this._showCustomerDropdown = this._customerSearchResults.length > 0;
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
      const t = { ...this._validationErrors };
      delete t[`billing.${e}`], this._validationErrors = t;
    }
    this._selectedCustomer && (this._selectedCustomer = null);
  }
  _updateShippingField(e, i) {
    if (this._shippingAddress = { ...this._shippingAddress, [e]: i }, this._validationErrors[`shipping.${e}`]) {
      const t = { ...this._validationErrors };
      delete t[`shipping.${e}`], this._validationErrors = t;
    }
  }
  _toggleShippingAddress() {
    this._useShippingAddress = !this._useShippingAddress, this._useShippingAddress && (this._shippingAddress = f());
  }
  async _openAddCustomItemModal() {
    if (!u(this, p)) return;
    const i = await u(this, p).open(this, M, {
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
  async _openProductPickerModal() {
    if (!u(this, p)) return;
    const e = this._useShippingAddress ? this._shippingAddress : this._billingAddress, i = this._pendingProducts.map((d) => d.productId), s = await u(this, p).open(this, O, {
      data: {
        config: {
          currencySymbol: this._currencySymbol,
          shippingAddress: e.countryCode ? {
            countryCode: e.countryCode,
            stateCode: e.countyState ?? void 0
          } : null,
          excludeProductIds: i
        }
      }
    }).onSubmit().catch(() => {
    });
    if (s?.selections?.length) {
      const d = s.selections.map((a) => ({
        tempId: `product-${Date.now()}-${a.productId}`,
        productId: a.productId,
        productRootId: a.productRootId,
        name: a.name,
        sku: a.sku,
        price: a.price,
        quantity: 1,
        // Always add as qty 1
        imageUrl: a.imageUrl,
        warehouseId: a.warehouseId,
        warehouseName: a.warehouseName
      }));
      this._pendingProducts = [...this._pendingProducts, ...d];
    }
  }
  _removePendingProduct(e) {
    this._pendingProducts = this._pendingProducts.filter((i) => i.tempId !== e);
  }
  _updatePendingProductQuantity(e, i) {
    this._pendingProducts = this._pendingProducts.map(
      (t) => t.tempId === e ? { ...t, quantity: Math.max(1, i) } : t
    );
  }
  _validateForm() {
    const e = {};
    return this._billingAddress.name?.trim() || (e["billing.name"] = "Name is required"), this._billingAddress.email?.trim() ? this._isValidEmail(this._billingAddress.email) || (e["billing.email"] = "Please enter a valid email address") : e["billing.email"] = "Email is required", this._billingAddress.addressOne?.trim() || (e["billing.addressOne"] = "Address is required"), this._billingAddress.townCity?.trim() || (e["billing.townCity"] = "Town/City is required"), this._billingAddress.postalCode?.trim() || (e["billing.postalCode"] = "Postal code is required"), this._billingAddress.countryCode || (e["billing.countryCode"] = "Country is required"), this._useShippingAddress && (this._shippingAddress.name?.trim() || (e["shipping.name"] = "Name is required"), this._shippingAddress.addressOne?.trim() || (e["shipping.addressOne"] = "Address is required"), this._shippingAddress.townCity?.trim() || (e["shipping.townCity"] = "Town/City is required"), this._shippingAddress.postalCode?.trim() || (e["shipping.postalCode"] = "Postal code is required"), this._shippingAddress.countryCode || (e["shipping.countryCode"] = "Country is required")), this._validationErrors = e, Object.keys(e).length === 0;
  }
  _isValidEmail(e) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e);
  }
  _getSubtotal() {
    const e = this._customItems.reduce((t, s) => t + s.price * s.quantity, 0), i = this._pendingProducts.reduce((t, s) => t + s.price * s.quantity, 0);
    return e + i;
  }
  /** Options for country dropdown - uui-select requires .options property */
  _getCountryOptions(e) {
    const i = e === "billing" ? this._billingAddress : this._shippingAddress, t = [
      { name: "Select country...", value: "", selected: !i.countryCode }
    ];
    return this._countries.forEach((s) => {
      t.push({
        name: s.name,
        value: s.code,
        selected: s.code === i.countryCode
      });
    }), t;
  }
  /** Options for past shipping address dropdown */
  get _pastShippingAddressOptions() {
    const e = [
      { name: "Select an address...", value: "", selected: !0 }
    ];
    return this._selectedCustomer && this._selectedCustomer.pastShippingAddresses.forEach((i, t) => {
      e.push({
        name: `${i.addressOne}, ${i.townCity}, ${i.postalCode}`,
        value: t.toString(),
        selected: !1
      });
    }), e;
  }
  async _handleSave() {
    if (!this._validateForm()) {
      u(this, v)?.peek("warning", {
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
      customItems: this._customItems.map((s) => ({
        name: s.name,
        sku: s.sku,
        price: s.price,
        quantity: s.quantity,
        taxGroupId: s.taxGroupId,
        isPhysicalProduct: s.isPhysicalProduct
      }))
    }, { data: i, error: t } = await _.createDraftOrder(e);
    if (this._isSaving = !1, t) {
      this._errorMessage = t.message;
      return;
    }
    i?.isSuccessful && i.invoiceId ? (u(this, v)?.peek("positive", {
      data: {
        headline: "Order Created",
        message: `Draft order ${i.invoiceNumber} has been created.`
      }
    }), this.value = { isCreated: !0, invoiceId: i.invoiceId }, this.modalContext?.submit()) : this._errorMessage = i?.errorMessage ?? "Failed to create order";
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
  _renderAddressField(e, i, t, s = "text", d = !1) {
    const c = (e === "billing" ? this._billingAddress : this._shippingAddress)[i] ?? "", $ = this._validationErrors[`${e}.${i}`], S = e === "billing" ? this._updateBillingField : this._updateShippingField;
    return r`
      <umb-property-layout
        label=${t}
        ?mandatory=${d}
        ?invalid=${!!$}>
        <uui-input
          slot="editor"
          type=${s}
          .value=${c}
          @input=${(A) => S.call(this, i, A.target.value || null)}>
        </uui-input>
      </umb-property-layout>
    `;
  }
  _renderCountrySelect(e) {
    const i = this._validationErrors[`${e}.countryCode`], t = e === "billing" ? this._updateBillingField : this._updateShippingField;
    return r`
      <umb-property-layout
        label="Country"
        ?mandatory=${!0}
        ?invalid=${!!i}>
        <uui-select
          slot="editor"
          .options=${this._getCountryOptions(e)}
          @change=${(s) => {
      const d = s.target, a = this._countries.find((c) => c.code === d.value);
      t.call(this, "countryCode", d.value || null), t.call(this, "country", a?.name ?? null);
    }}>
        </uui-select>
      </umb-property-layout>
    `;
  }
  _renderBillingAddressForm() {
    return r`
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
                ${this._isSearchingCustomer ? r`<uui-loader-circle slot="append"></uui-loader-circle>` : r`<uui-icon slot="prepend" name="icon-search"></uui-icon>`}
              </uui-input>
            </div>
          </umb-property-layout>

          ${this._showCustomerDropdown ? r`
            <div class="customer-dropdown">
              ${this._customerSearchResults.map((e) => r`
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
          ` : g}

          ${this._selectedCustomer ? r`
            <div class="selected-customer">
              <span>Selected: <strong>${this._selectedCustomer.name}</strong> (${this._selectedCustomer.email})</span>
              <uui-button compact look="secondary" @click=${this._clearSelectedCustomer}>
                <uui-icon name="icon-delete"></uui-icon>
              </uui-button>
            </div>
          ` : g}
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
    return r`
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

        ${this._useShippingAddress ? r`
          <!-- Past shipping addresses dropdown -->
          ${this._selectedCustomer && this._selectedCustomer.pastShippingAddresses.length > 0 ? r`
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
          ` : g}

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
        ` : g}
      </uui-box>
    `;
  }
  _renderCustomItem(e) {
    const i = e.taxGroupId ? this._taxGroups.find((s) => s.id === e.taxGroupId) : null, t = i ? `${i.name} (${i.taxPercentage}%)` : "Not taxable";
    return r`
      <div class="line-item">
        <div class="line-item-product">
          <div class="line-item-image">
            <div class="placeholder-image custom"><uui-icon name="icon-add"></uui-icon></div>
          </div>
          <div class="line-item-details">
            <div class="line-item-name">${e.name}</div>
            <div class="line-item-sku">${e.sku ?? "Custom item"} · ${t}</div>
          </div>
        </div>
        <div class="line-item-price">${this._currencySymbol}${h(e.price, 2)}</div>
        <div class="line-item-quantity">${e.quantity}</div>
        <div class="line-item-total">${this._currencySymbol}${h(e.price * e.quantity, 2)}</div>
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
  _renderPendingProduct(e) {
    return r`
      <div class="line-item pending-product">
        <div class="line-item-product">
          <div class="line-item-image">
            ${e.imageUrl ? r`<img src=${e.imageUrl} alt=${e.name} />` : r`<div class="placeholder-image product"><uui-icon name="icon-box"></uui-icon></div>`}
          </div>
          <div class="line-item-details">
            <div class="line-item-name">${e.name}</div>
            <div class="line-item-sku">${e.sku ?? "No SKU"}</div>
            <div class="warehouse-info">
              <uui-icon name="icon-home"></uui-icon>
              ${e.warehouseName || "Default warehouse"}
            </div>
          </div>
        </div>
        <div class="line-item-price">${this._currencySymbol}${h(e.price, 2)}</div>
        <div class="line-item-quantity">
          <uui-input
            type="number"
            .value=${e.quantity.toString()}
            @input=${(i) => this._updatePendingProductQuantity(e.tempId, parseInt(i.target.value) || 1)}
            min="1"
          ></uui-input>
        </div>
        <div class="line-item-total">${this._currencySymbol}${h(e.price * e.quantity, 2)}</div>
        <div class="line-item-actions">
          <uui-button
            look="secondary"
            compact
            @click=${() => this._removePendingProduct(e.tempId)}
            title="Remove product"
          >
            <uui-icon name="icon-delete"></uui-icon>
          </uui-button>
        </div>
      </div>
    `;
  }
  _renderItemsSection() {
    const e = this._customItems.length > 0 || this._pendingProducts.length > 0;
    return r`
      <uui-box headline="Items">
        ${e ? r`
          <div class="items-table">
            <div class="items-header">
              <div class="header-cell product">Product</div>
              <div class="header-cell price">Price</div>
              <div class="header-cell quantity">Qty</div>
              <div class="header-cell total">Total</div>
              <div class="header-cell actions"></div>
            </div>
            <div class="items-list">
              ${this._pendingProducts.map((i) => this._renderPendingProduct(i))}
              ${this._customItems.map((i) => this._renderCustomItem(i))}
            </div>
          </div>
        ` : r`
          <div class="empty-items">
            <p>No items added yet. Add products or custom items below.</p>
          </div>
        `}

        <div class="add-items-actions">
          <uui-button look="secondary" @click=${this._openProductPickerModal}>
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
  _renderSummary() {
    const e = this._getSubtotal();
    return r`
      <uui-box headline="Order Summary">
        <div class="summary-row">
          <span>Subtotal</span>
          <span>${this._currencySymbol}${h(e, 2)}</span>
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
          <span>${this._currencySymbol}${h(e, 2)}</span>
        </div>

        <p class="summary-note">
          Shipping and tax will be calculated after the order is created.
          You can edit the order to adjust these values.
        </p>
      </uui-box>
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
          ` : g}
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
p = /* @__PURE__ */ new WeakMap();
v = /* @__PURE__ */ new WeakMap();
m = /* @__PURE__ */ new WeakMap();
o.styles = w`
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

    .placeholder-image.product {
      background: var(--uui-color-surface-alt);
      color: var(--uui-color-text-alt);
    }

    .line-item-image img {
      width: 100%;
      height: 100%;
      object-fit: cover;
      border-radius: var(--uui-border-radius);
    }

    .warehouse-info {
      display: flex;
      align-items: center;
      gap: 4px;
      font-size: 0.75rem;
      color: var(--uui-color-text-alt);
      margin-top: 2px;
    }

    .warehouse-info uui-icon {
      font-size: 0.75rem;
    }

    .line-item-quantity uui-input {
      width: 60px;
      text-align: right;
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
n([
  l()
], o.prototype, "_billingAddress", 2);
n([
  l()
], o.prototype, "_shippingAddress", 2);
n([
  l()
], o.prototype, "_useShippingAddress", 2);
n([
  l()
], o.prototype, "_customItems", 2);
n([
  l()
], o.prototype, "_pendingProducts", 2);
n([
  l()
], o.prototype, "_customerSearchResults", 2);
n([
  l()
], o.prototype, "_selectedCustomer", 2);
n([
  l()
], o.prototype, "_isSearchingCustomer", 2);
n([
  l()
], o.prototype, "_showCustomerDropdown", 2);
n([
  l()
], o.prototype, "_isSaving", 2);
n([
  l()
], o.prototype, "_isLoading", 2);
n([
  l()
], o.prototype, "_errorMessage", 2);
n([
  l()
], o.prototype, "_taxGroups", 2);
n([
  l()
], o.prototype, "_countries", 2);
n([
  l()
], o.prototype, "_currencySymbol", 2);
n([
  l()
], o.prototype, "_validationErrors", 2);
o = n([
  I("merchello-create-order-modal")
], o);
const U = o;
export {
  o as MerchelloCreateOrderModalElement,
  U as default
};
//# sourceMappingURL=create-order-modal.element-VSNkTSEr.js.map
