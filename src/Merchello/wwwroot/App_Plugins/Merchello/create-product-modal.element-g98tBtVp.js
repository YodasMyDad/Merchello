import { html as s, nothing as d, css as g, state as n, customElement as f } from "@umbraco-cms/backoffice/external/lit";
import { UmbModalBaseElement as v } from "@umbraco-cms/backoffice/modal";
import { UMB_NOTIFICATION_CONTEXT as T } from "@umbraco-cms/backoffice/notification";
import { M as p } from "./merchello-api-BuImeZL2.js";
import "@umbraco-cms/backoffice/document-type";
var b = Object.defineProperty, $ = Object.getOwnPropertyDescriptor, _ = (e) => {
  throw TypeError(e);
}, u = (e, t, a, r) => {
  for (var i = r > 1 ? void 0 : r ? $(t, a) : t, l = e.length - 1, c; l >= 0; l--)
    (c = e[l]) && (i = (r ? c(t, a, i) : c(i)) || i);
  return r && i && b(t, a, i), i;
}, y = (e, t, a) => t.has(e) || _("Cannot " + a), m = (e, t, a) => (y(e, t, "read from private field"), t.get(e)), I = (e, t, a) => t.has(e) ? _("Cannot add the same private member more than once") : t instanceof WeakSet ? t.add(e) : t.set(e, a), w = (e, t, a, r) => (y(e, t, "write to private field"), t.set(e, a), a), h;
let o = class extends v {
  constructor() {
    super(), I(this, h), this._isLoading = !0, this._isSaving = !1, this._productTypes = [], this._taxGroups = [], this._warehouses = [], this._elementTypes = [], this._formData = {
      name: "",
      sku: "",
      price: 0,
      productTypeId: "",
      taxGroupId: "",
      warehouseIds: [],
      elementTypeAlias: null
    }, this._errors = {}, this.consumeContext(T, (e) => {
      w(this, h, e);
    });
  }
  async connectedCallback() {
    super.connectedCallback(), await this._loadLookupData();
  }
  async _loadLookupData() {
    this._isLoading = !0;
    const [e, t, a, r] = await Promise.all([
      p.getProductTypes(),
      p.getTaxGroups(),
      p.getWarehousesList(),
      p.getElementTypes()
    ]);
    if (e.error || t.error || a.error) {
      m(this, h)?.peek("danger", {
        data: {
          headline: "Failed to load data",
          message: "Could not load product types, tax groups, or warehouses. Please try again."
        }
      }), this._isLoading = !1;
      return;
    }
    e.data && (this._productTypes = e.data), t.data && (this._taxGroups = t.data), a.data && (this._warehouses = a.data), r.data && (this._elementTypes = r.data), this._productTypes.length === 1 && (this._formData = { ...this._formData, productTypeId: this._productTypes[0].id }), this._taxGroups.length === 1 && (this._formData = { ...this._formData, taxGroupId: this._taxGroups[0].id }), this._warehouses.length === 1 && (this._formData = { ...this._formData, warehouseIds: [this._warehouses[0].id] }), this._isLoading = !1;
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
      elementTypeAlias: this._formData.elementTypeAlias,
      defaultVariant: {
        sku: this._formData.sku,
        price: this._formData.price,
        costOfGoods: 0
      }
    }, { data: t, error: a } = await p.createProduct(e);
    if (a) {
      m(this, h)?.peek("danger", {
        data: {
          headline: "Failed to create product",
          message: a.message || "An error occurred while creating the product"
        }
      }), this._isSaving = !1;
      return;
    }
    m(this, h)?.peek("positive", {
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
    const a = this._formData.warehouseIds || [];
    t ? this._formData = { ...this._formData, warehouseIds: [...a, e] } : this._formData = { ...this._formData, warehouseIds: a.filter((r) => r !== e) }, this._errors.warehouseIds && (this._errors = { ...this._errors, warehouseIds: void 0 });
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
  _getElementTypeSelection() {
    const e = this._formData.elementTypeAlias;
    if (!e) return [];
    const t = this._elementTypes.find((a) => a.alias.toLowerCase() === e.toLowerCase());
    return t ? [t.key] : [];
  }
  async _handleElementTypeChange(e) {
    const r = (e.target.selection ?? [])[0];
    let i = this._elementTypes.find((l) => l.key === r);
    if (r && !i) {
      const { data: l } = await p.getElementTypes();
      l && (this._elementTypes = l, i = l.find((c) => c.key === r));
    }
    this._formData = { ...this._formData, elementTypeAlias: i?.alias ?? null };
  }
  render() {
    return s`
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
    return s`
      <div class="loading-container">
        <uui-loader-bar></uui-loader-bar>
      </div>
    `;
  }
  _renderForm() {
    return s`
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
          ${this._errors.name ? s`<span class="error-message">${this._errors.name}</span>` : d}
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
          ${this._errors.sku ? s`<span class="error-message">${this._errors.sku}</span>` : d}
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
          ${this._errors.price ? s`<span class="error-message">${this._errors.price}</span>` : d}
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
          ${this._errors.productTypeId ? s`<span class="error-message">${this._errors.productTypeId}</span>` : d}
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
          ${this._errors.taxGroupId ? s`<span class="error-message">${this._errors.taxGroupId}</span>` : d}
        </umb-property-layout>

        <umb-property-layout
          label="Element Type"
          description="Optional: select an Element Type to add custom properties to this product">
          <umb-input-document-type
            slot="editor"
            .selection=${this._getElementTypeSelection()}
            .max=${1}
            .elementTypesOnly=${!0}
            @change=${this._handleElementTypeChange}>
          </umb-input-document-type>
        </umb-property-layout>

        <umb-property-layout
          label="Warehouses"
          description="Select which warehouses stock this product"
          mandatory
          ?invalid=${!!this._errors.warehouseIds}>
          <div slot="editor">
            ${this._renderWarehouseSelector()}
          </div>
          ${this._errors.warehouseIds ? s`<span class="error-message">${this._errors.warehouseIds}</span>` : d}
        </umb-property-layout>
      </div>
    `;
  }
  _renderWarehouseSelector() {
    const e = this._formData.warehouseIds || [];
    return s`
      <div class="warehouse-toggle-list">
        ${this._warehouses.map(
      (t) => s`
            <div class="toggle-field">
              <uui-toggle
                label="${t.name || "Unnamed Warehouse"}"
                .checked=${e.includes(t.id)}
                @change=${(a) => this._handleWarehouseToggle(t.id, a.target.checked)}>
              </uui-toggle>
              <label>${t.name || "Unnamed Warehouse"} ${t.code ? `(${t.code})` : ""}</label>
            </div>
          `
    )}
        ${this._warehouses.length === 0 ? s`<p class="hint">No warehouses available. Create a warehouse first.</p>` : d}
      </div>
    `;
  }
};
h = /* @__PURE__ */ new WeakMap();
o.styles = g`
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
u([
  n()
], o.prototype, "_isLoading", 2);
u([
  n()
], o.prototype, "_isSaving", 2);
u([
  n()
], o.prototype, "_productTypes", 2);
u([
  n()
], o.prototype, "_taxGroups", 2);
u([
  n()
], o.prototype, "_warehouses", 2);
u([
  n()
], o.prototype, "_elementTypes", 2);
u([
  n()
], o.prototype, "_formData", 2);
u([
  n()
], o.prototype, "_errors", 2);
o = u([
  f("merchello-create-product-modal")
], o);
const G = o;
export {
  o as MerchelloCreateProductModalElement,
  G as default
};
//# sourceMappingURL=create-product-modal.element-g98tBtVp.js.map
