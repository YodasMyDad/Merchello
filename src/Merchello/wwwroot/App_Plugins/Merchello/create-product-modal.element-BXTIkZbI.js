import { html as a, nothing as d, css as f, state as l, customElement as y } from "@umbraco-cms/backoffice/external/lit";
import { UmbModalBaseElement as v } from "@umbraco-cms/backoffice/modal";
import { UMB_NOTIFICATION_CONTEXT as b } from "@umbraco-cms/backoffice/notification";
import { M as p } from "./merchello-api-DkRa4ImO.js";
var I = Object.defineProperty, $ = Object.getOwnPropertyDescriptor, m = (e) => {
  throw TypeError(e);
}, o = (e, t, r, i) => {
  for (var u = i > 1 ? void 0 : i ? $(t, r) : t, h = e.length - 1, c; h >= 0; h--)
    (c = e[h]) && (u = (i ? c(t, r, u) : c(u)) || u);
  return i && u && I(t, r, u), u;
}, g = (e, t, r) => t.has(e) || m("Cannot " + r), _ = (e, t, r) => (g(e, t, "read from private field"), t.get(e)), w = (e, t, r) => t.has(e) ? m("Cannot add the same private member more than once") : t instanceof WeakSet ? t.add(e) : t.set(e, r), x = (e, t, r, i) => (g(e, t, "write to private field"), t.set(e, r), r), n;
let s = class extends v {
  constructor() {
    super(), w(this, n), this._isLoading = !0, this._isSaving = !1, this._productTypes = [], this._taxGroups = [], this._warehouses = [], this._formData = {
      name: "",
      sku: "",
      price: 0,
      productTypeId: "",
      taxGroupId: "",
      warehouseIds: []
    }, this._errors = {}, this.consumeContext(b, (e) => {
      x(this, n, e);
    });
  }
  async connectedCallback() {
    super.connectedCallback(), await this._loadLookupData();
  }
  async _loadLookupData() {
    this._isLoading = !0;
    const [e, t, r] = await Promise.all([
      p.getProductTypes(),
      p.getTaxGroups(),
      p.getWarehousesList()
    ]);
    if (e.error || t.error || r.error) {
      _(this, n)?.peek("danger", {
        data: {
          headline: "Failed to load data",
          message: "Could not load product types, tax groups, or warehouses. Please try again."
        }
      }), this._isLoading = !1;
      return;
    }
    e.data && (this._productTypes = e.data), t.data && (this._taxGroups = t.data), r.data && (this._warehouses = r.data), this._productTypes.length === 1 && (this._formData = { ...this._formData, productTypeId: this._productTypes[0].id }), this._taxGroups.length === 1 && (this._formData = { ...this._formData, taxGroupId: this._taxGroups[0].id }), this._warehouses.length === 1 && (this._formData = { ...this._formData, warehouseIds: [this._warehouses[0].id] }), this._isLoading = !1;
  }
  _validate() {
    const e = {};
    return this._formData.name.trim() || (e.name = "Product name is required"), this._formData.sku.trim() || (e.sku = "SKU is required"), this._formData.price < 0 && (e.price = "Price must be 0 or greater"), this._formData.productTypeId || (e.productTypeId = "Product type is required"), this._formData.taxGroupId || (e.taxGroupId = "Tax group is required"), this._formData.warehouseIds.length === 0 && (e.warehouseIds = "At least one warehouse is required"), this._errors = e, Object.keys(e).length === 0;
  }
  async _handleSubmit() {
    if (!this._validate())
      return;
    this._isSaving = !0;
    const e = {
      rootName: this._formData.name,
      productTypeId: this._formData.productTypeId,
      taxGroupId: this._formData.taxGroupId,
      warehouseIds: this._formData.warehouseIds,
      isDigitalProduct: !1,
      defaultVariant: {
        sku: this._formData.sku,
        price: this._formData.price,
        costOfGoods: 0
      }
    }, { data: t, error: r } = await p.createProduct(e);
    if (r) {
      _(this, n)?.peek("danger", {
        data: {
          headline: "Failed to create product",
          message: r.message || "An error occurred while creating the product"
        }
      }), this._isSaving = !1;
      return;
    }
    _(this, n)?.peek("positive", {
      data: {
        headline: "Product created",
        message: `"${this._formData.name}" has been created successfully`
      }
    }), this.value = { isCreated: !0, productId: t?.id }, this.modalContext?.submit();
  }
  _handleClose() {
    this.value = { isCreated: !1 }, this.modalContext?.reject();
  }
  _handleInputChange(e, t) {
    this._formData = { ...this._formData, [e]: t }, this._errors[e] && (this._errors = { ...this._errors, [e]: void 0 });
  }
  _handleWarehouseToggle(e, t) {
    const r = this._formData.warehouseIds || [];
    t ? this._formData = { ...this._formData, warehouseIds: [...r, e] } : this._formData = { ...this._formData, warehouseIds: r.filter((i) => i !== e) }, this._errors.warehouseIds && (this._errors = { ...this._errors, warehouseIds: void 0 });
  }
  _getProductTypeOptions() {
    return [{ name: "Select product type...", value: "" }].concat(
      this._productTypes.map((t) => ({
        name: t.name,
        value: t.id,
        selected: t.id === this._formData.productTypeId
      }))
    );
  }
  _getTaxGroupOptions() {
    return [{ name: "Select tax group...", value: "" }].concat(
      this._taxGroups.map((t) => ({
        name: t.name,
        value: t.id,
        selected: t.id === this._formData.taxGroupId
      }))
    );
  }
  render() {
    return a`
      <umb-body-layout headline="Add Product">
        ${this._isLoading ? this._renderLoading() : this._renderForm()}
        <div slot="actions">
          <uui-button look="secondary" label="Cancel" @click=${this._handleClose} ?disabled=${this._isSaving}>
            Cancel
          </uui-button>
          <uui-button
            look="primary"
            color="positive"
            label="Create Product"
            @click=${this._handleSubmit}
            ?disabled=${this._isLoading || this._isSaving}
            .state=${this._isSaving ? "waiting" : void 0}>
            ${this._isSaving ? "Creating..." : "Create Product"}
          </uui-button>
        </div>
      </umb-body-layout>
    `;
  }
  _renderLoading() {
    return a`
      <div class="loading-container">
        <uui-loader-bar></uui-loader-bar>
      </div>
    `;
  }
  _renderForm() {
    return a`
      <div class="form-content">
        <umb-property-layout
          label="Product Name"
          description="The name that will be displayed to customers"
          mandatory
          ?invalid=${!!this._errors.name}>
          <uui-input
            slot="editor"
            label="Product name"
            .value=${this._formData.name}
            @input=${(e) => this._handleInputChange("name", e.target.value)}
            placeholder="Enter product name"
            ?invalid=${!!this._errors.name}>
          </uui-input>
          ${this._errors.name ? a`<span class="error-message">${this._errors.name}</span>` : d}
        </umb-property-layout>

        <umb-property-layout
          label="SKU"
          description="Stock Keeping Unit - a unique identifier for this product"
          mandatory
          ?invalid=${!!this._errors.sku}>
          <uui-input
            slot="editor"
            label="SKU"
            .value=${this._formData.sku}
            @input=${(e) => this._handleInputChange("sku", e.target.value)}
            placeholder="e.g., PROD-001"
            ?invalid=${!!this._errors.sku}>
          </uui-input>
          ${this._errors.sku ? a`<span class="error-message">${this._errors.sku}</span>` : d}
        </umb-property-layout>

        <umb-property-layout
          label="Price"
          description="The base price for this product"
          mandatory
          ?invalid=${!!this._errors.price}>
          <uui-input
            slot="editor"
            label="Price"
            type="number"
            min="0"
            step="0.01"
            .value=${this._formData.price.toString()}
            @input=${(e) => this._handleInputChange("price", parseFloat(e.target.value) || 0)}
            placeholder="0.00"
            ?invalid=${!!this._errors.price}>
          </uui-input>
          ${this._errors.price ? a`<span class="error-message">${this._errors.price}</span>` : d}
        </umb-property-layout>

        <umb-property-layout
          label="Product Type"
          description="Categorize this product for reporting and organization"
          mandatory
          ?invalid=${!!this._errors.productTypeId}>
          <uui-select
            slot="editor"
            label="Product type"
            .options=${this._getProductTypeOptions()}
            @change=${(e) => this._handleInputChange("productTypeId", e.target.value)}>
          </uui-select>
          ${this._errors.productTypeId ? a`<span class="error-message">${this._errors.productTypeId}</span>` : d}
        </umb-property-layout>

        <umb-property-layout
          label="Tax Group"
          description="The tax rate that applies to this product"
          mandatory
          ?invalid=${!!this._errors.taxGroupId}>
          <uui-select
            slot="editor"
            label="Tax group"
            .options=${this._getTaxGroupOptions()}
            @change=${(e) => this._handleInputChange("taxGroupId", e.target.value)}>
          </uui-select>
          ${this._errors.taxGroupId ? a`<span class="error-message">${this._errors.taxGroupId}</span>` : d}
        </umb-property-layout>

        <umb-property-layout
          label="Warehouses"
          description="Select which warehouses stock this product"
          mandatory
          ?invalid=${!!this._errors.warehouseIds}>
          <div slot="editor">
            ${this._renderWarehouseSelector()}
          </div>
          ${this._errors.warehouseIds ? a`<span class="error-message">${this._errors.warehouseIds}</span>` : d}
        </umb-property-layout>
      </div>
    `;
  }
  _renderWarehouseSelector() {
    const e = this._formData.warehouseIds || [];
    return a`
      <div class="warehouse-toggle-list">
        ${this._warehouses.map(
      (t) => a`
            <div class="toggle-field">
              <uui-toggle
                label="${t.name || "Unnamed Warehouse"}"
                .checked=${e.includes(t.id)}
                @change=${(r) => this._handleWarehouseToggle(t.id, r.target.checked)}>
              </uui-toggle>
              <label>${t.name || "Unnamed Warehouse"} ${t.code ? `(${t.code})` : ""}</label>
            </div>
          `
    )}
        ${this._warehouses.length === 0 ? a`<p class="hint">No warehouses available. Create a warehouse first.</p>` : d}
      </div>
    `;
  }
};
n = /* @__PURE__ */ new WeakMap();
s.styles = f`
    :host {
      display: block;
    }

    .loading-container {
      padding: var(--uui-size-layout-2);
    }

    .form-content {
      display: flex;
      flex-direction: column;
      gap: var(--uui-size-space-5);
      padding: var(--uui-size-layout-1);
    }

    uui-input {
      width: 100%;
    }

    uui-select {
      width: 100%;
    }

    .warehouse-toggle-list {
      display: flex;
      flex-direction: column;
      gap: var(--uui-size-space-4);
    }

    .warehouse-toggle-list .toggle-field {
      display: flex;
      align-items: center;
      gap: var(--uui-size-space-3);
    }

    .warehouse-toggle-list label {
      font-weight: normal;
      color: var(--uui-color-text);
    }

    .hint {
      color: var(--uui-color-text-alt);
      font-style: italic;
      margin: 0;
    }

    .error-message {
      color: var(--uui-color-danger);
      font-size: var(--uui-type-small-size);
      margin-top: var(--uui-size-space-1);
      display: block;
    }

    [slot="actions"] {
      display: flex;
      gap: var(--uui-size-space-2);
      justify-content: flex-end;
    }
  `;
o([
  l()
], s.prototype, "_isLoading", 2);
o([
  l()
], s.prototype, "_isSaving", 2);
o([
  l()
], s.prototype, "_productTypes", 2);
o([
  l()
], s.prototype, "_taxGroups", 2);
o([
  l()
], s.prototype, "_warehouses", 2);
o([
  l()
], s.prototype, "_formData", 2);
o([
  l()
], s.prototype, "_errors", 2);
s = o([
  y("merchello-create-product-modal")
], s);
const P = s;
export {
  s as MerchelloCreateProductModalElement,
  P as default
};
//# sourceMappingURL=create-product-modal.element-BXTIkZbI.js.map
