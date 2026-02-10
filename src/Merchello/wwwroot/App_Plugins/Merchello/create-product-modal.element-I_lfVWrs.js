import { html as s, nothing as h, css as f, state as u, customElement as g } from "@umbraco-cms/backoffice/external/lit";
import { UmbModalBaseElement as v } from "@umbraco-cms/backoffice/modal";
import { UMB_NOTIFICATION_CONTEXT as b } from "@umbraco-cms/backoffice/notification";
import { M as p } from "./merchello-api-DFeoGYDY.js";
import { UmbPropertyEditorConfigCollection as T } from "@umbraco-cms/backoffice/property-editor";
import "@umbraco-cms/backoffice/document-type";
var D = Object.defineProperty, w = Object.getOwnPropertyDescriptor, y = (e) => {
  throw TypeError(e);
}, l = (e, t, r, a) => {
  for (var o = a > 1 ? void 0 : a ? w(t, r) : t, d = e.length - 1, c; d >= 0; d--)
    (c = e[d]) && (o = (a ? c(t, r, o) : c(o)) || o);
  return a && o && D(t, r, o), o;
}, _ = (e, t, r) => t.has(e) || y("Cannot " + r), m = (e, t, r) => (_(e, t, "read from private field"), t.get(e)), x = (e, t, r) => t.has(e) ? y("Cannot add the same private member more than once") : t instanceof WeakSet ? t.add(e) : t.set(e, r), P = (e, t, r, a) => (_(e, t, "write to private field"), t.set(e, r), r), n;
let i = class extends v {
  constructor() {
    super(), x(this, n), this._isLoading = !0, this._isSaving = !1, this._productTypes = [], this._taxGroups = [], this._warehouses = [], this._elementTypes = [], this._formData = {
      rootName: "",
      sku: "",
      price: 0,
      productTypeId: "",
      taxGroupId: "",
      warehouseIds: [],
      elementTypeAlias: null
    }, this._errors = {}, this._elementTypePickerConfig = new T([
      { alias: "validationLimit", value: { min: 0, max: 1 } },
      { alias: "onlyPickElementTypes", value: !0 }
    ]), this.consumeContext(b, (e) => {
      P(this, n, e);
    });
  }
  async connectedCallback() {
    super.connectedCallback(), await this._loadLookupData();
  }
  async _loadLookupData() {
    this._isLoading = !0;
    const [e, t, r, a] = await Promise.all([
      p.getProductTypes(),
      p.getTaxGroups(),
      p.getWarehousesList(),
      p.getElementTypes()
    ]);
    if (e.error || t.error || r.error) {
      m(this, n)?.peek("danger", {
        data: {
          headline: "Failed to load data",
          message: "Could not load product types, tax groups, or warehouses. Please try again."
        }
      }), this._isLoading = !1;
      return;
    }
    e.data && (this._productTypes = e.data), t.data && (this._taxGroups = t.data), r.data && (this._warehouses = r.data), a.data && (this._elementTypes = a.data), this._productTypes.length === 1 && (this._formData = { ...this._formData, productTypeId: this._productTypes[0].id }), this._taxGroups.length === 1 && (this._formData = { ...this._formData, taxGroupId: this._taxGroups[0].id }), this._warehouses.length === 1 && (this._formData = { ...this._formData, warehouseIds: [this._warehouses[0].id] }), this._isLoading = !1;
  }
  _validate() {
    const e = {};
    return this._formData.rootName.trim() || (e.rootName = "Product name is required"), this._formData.sku.trim() || (e.sku = "SKU is required"), this._formData.price < 0 && (e.price = "Price must be 0 or greater"), this._formData.productTypeId || (e.productTypeId = "Product type is required"), this._formData.taxGroupId || (e.taxGroupId = "Tax group is required"), this._formData.warehouseIds.length === 0 && (e.warehouseIds = "At least one warehouse is required"), this._errors = e, Object.keys(e).length === 0;
  }
  async _handleSubmit() {
    if (!this._validate())
      return;
    this._isSaving = !0;
    const e = {
      rootName: this._formData.rootName,
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
    }, { data: t, error: r } = await p.createProduct(e);
    if (r) {
      m(this, n)?.peek("danger", {
        data: {
          headline: "Failed to create product",
          message: r.message || "An error occurred while creating the product"
        }
      }), this._isSaving = !1;
      return;
    }
    m(this, n)?.peek("positive", {
      data: {
        headline: "Product created",
        message: `"${this._formData.rootName}" has been created successfully`
      }
    }), this.value = { isCreated: !0, productId: t?.id }, this.modalContext?.submit();
  }
  _handleClose() {
    this.value = { isCreated: !1 }, this.modalContext?.reject();
  }
  _toPropertyValueMap(e) {
    const t = {};
    for (const r of e)
      t[r.alias] = r.value;
    return t;
  }
  _getStringFromPropertyValue(e) {
    return typeof e == "string" ? e : "";
  }
  _getFirstDropdownValue(e) {
    if (Array.isArray(e)) {
      const t = e.find((r) => typeof r == "string");
      return typeof t == "string" ? t : "";
    }
    return typeof e == "string" ? e : "";
  }
  _getElementTypeSelectionKey() {
    const e = this._formData.elementTypeAlias;
    return e ? this._elementTypes.find((r) => r.alias.toLowerCase() === e.toLowerCase())?.key : void 0;
  }
  async _setElementTypeAliasFromSelectionValue(e) {
    const r = this._getFirstDropdownValue(e).split(",").map((o) => o.trim()).filter(Boolean)[0];
    let a = this._elementTypes.find((o) => o.key === r);
    if (r && !a) {
      const { data: o } = await p.getElementTypes();
      o && (this._elementTypes = o, a = o.find((d) => d.key === r));
    }
    this._formData = { ...this._formData, elementTypeAlias: a?.alias ?? null };
  }
  _handleWarehouseToggle(e, t) {
    const r = this._formData.warehouseIds;
    this._formData = t ? { ...this._formData, warehouseIds: [...r, e] } : { ...this._formData, warehouseIds: r.filter((a) => a !== e) }, this._errors.warehouseIds && (this._errors = { ...this._errors, warehouseIds: void 0 });
  }
  _getProductTypePropertyConfig() {
    return [
      {
        alias: "items",
        value: [
          { name: "Select product type...", value: "" },
          ...this._productTypes.map((e) => ({
            name: e.name,
            value: e.id
          }))
        ]
      }
    ];
  }
  _getTaxGroupPropertyConfig() {
    return [
      {
        alias: "items",
        value: [
          { name: "Select tax group...", value: "" },
          ...this._taxGroups.map((e) => ({
            name: e.name,
            value: e.id
          }))
        ]
      }
    ];
  }
  _getDatasetValue() {
    const e = this._getElementTypeSelectionKey();
    return [
      { alias: "rootName", value: this._formData.rootName },
      { alias: "sku", value: this._formData.sku },
      { alias: "price", value: this._formData.price },
      { alias: "productTypeId", value: this._formData.productTypeId ? [this._formData.productTypeId] : [] },
      { alias: "taxGroupId", value: this._formData.taxGroupId ? [this._formData.taxGroupId] : [] },
      { alias: "elementTypeAlias", value: e }
    ];
  }
  _handleDatasetChange(e) {
    const t = e.target, r = this._toPropertyValueMap(t.value ?? []), a = typeof r.price == "number" ? r.price : Number(this._getStringFromPropertyValue(r.price));
    this._formData = {
      ...this._formData,
      rootName: this._getStringFromPropertyValue(r.rootName),
      sku: this._getStringFromPropertyValue(r.sku),
      price: Number.isFinite(a) ? a : 0,
      productTypeId: this._getFirstDropdownValue(r.productTypeId),
      taxGroupId: this._getFirstDropdownValue(r.taxGroupId)
    }, Object.keys(this._errors).length > 0 && (this._errors = {}), this._setElementTypeAliasFromSelectionValue(r.elementTypeAlias);
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
  _renderWarehouseSelector() {
    const e = this._formData.warehouseIds;
    return s`
      <div class="warehouse-toggle-list">
        ${this._warehouses.map((t) => s`
          <div class="toggle-field">
            <uui-toggle
              label="${t.name || "Unnamed Warehouse"}"
              .checked=${e.includes(t.id)}
              @change=${(r) => this._handleWarehouseToggle(t.id, r.target.checked)}>
            </uui-toggle>
            <label>${t.name || "Unnamed Warehouse"}${t.code ? ` (${t.code})` : ""}</label>
          </div>
        `)}
      </div>
    `;
  }
  _renderForm() {
    const e = Object.values(this._errors).filter((t) => !!t);
    return s`
      <div class="form-content">
        ${e.length > 0 ? s`
              <div class="error-summary">
                <strong>Please fix the following before creating the product:</strong>
                ${e.map((t) => s`<div>${t}</div>`)}
              </div>
            ` : h}

        <umb-property-dataset
          .value=${this._getDatasetValue()}
          @change=${this._handleDatasetChange}>
          <umb-property
            alias="rootName"
            label="Product Name"
            description="The name that will be displayed to customers"
            property-editor-ui-alias="Umb.PropertyEditorUi.TextBox"
            .validation=${{ mandatory: !0 }}>
          </umb-property>

          <umb-property
            alias="sku"
            label="SKU"
            description="Stock Keeping Unit - a unique identifier for this product"
            property-editor-ui-alias="Umb.PropertyEditorUi.TextBox"
            .validation=${{ mandatory: !0 }}>
          </umb-property>

          <umb-property
            alias="price"
            label="Price"
            description="The base price for this product"
            property-editor-ui-alias="Umb.PropertyEditorUi.Decimal"
            .config=${[{ alias: "min", value: 0 }, { alias: "step", value: 0.01 }]}
            .validation=${{ mandatory: !0 }}>
          </umb-property>

          <umb-property
            alias="productTypeId"
            label="Product Type"
            description="Categorize this product for reporting and organization"
            property-editor-ui-alias="Umb.PropertyEditorUi.Dropdown"
            .config=${this._getProductTypePropertyConfig()}
            .validation=${{ mandatory: !0 }}>
          </umb-property>

          <umb-property
            alias="taxGroupId"
            label="Tax Group"
            description="The tax rate that applies to this product"
            property-editor-ui-alias="Umb.PropertyEditorUi.Dropdown"
            .config=${this._getTaxGroupPropertyConfig()}
            .validation=${{ mandatory: !0 }}>
          </umb-property>

          <umb-property
            alias="elementTypeAlias"
            label="Element Type"
            description="Optional: select an Element Type to add custom properties to this product"
            property-editor-ui-alias="Umb.PropertyEditorUi.DocumentTypePicker"
            .config=${this._elementTypePickerConfig}>
          </umb-property>

        </umb-property-dataset>

        <umb-property-layout
          label="Warehouses"
          description="Select which warehouses stock this product"
          mandatory
          ?invalid=${!!this._errors.warehouseIds}>
          <div slot="editor">
            ${this._renderWarehouseSelector()}
          </div>
          ${this._errors.warehouseIds ? s`<span class="error-message">${this._errors.warehouseIds}</span>` : h}
        </umb-property-layout>

        ${this._warehouses.length === 0 ? s`<p class="hint">No warehouses available. Create a warehouse first.</p>` : h}
      </div>
    `;
  }
};
n = /* @__PURE__ */ new WeakMap();
i.styles = f`
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

    umb-property uui-input,
    umb-property uui-select,
    umb-property uui-textarea,
    umb-property-layout uui-input,
    umb-property-layout uui-select,
    umb-property-layout uui-textarea {
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
      color: var(--uui-color-text);
      font-weight: normal;
    }

    .hint {
      color: var(--uui-color-text-alt);
      font-style: italic;
      margin: 0;
    }

    .error-summary {
      color: var(--uui-color-danger);
      font-size: var(--uui-type-small-size);
      margin: 0;
      display: flex;
      flex-direction: column;
      gap: var(--uui-size-space-1);
    }

    .error-message {
      color: var(--uui-color-danger);
      display: block;
      font-size: var(--uui-type-small-size);
      margin-top: var(--uui-size-space-1);
    }

    [slot="actions"] {
      display: flex;
      gap: var(--uui-size-space-2);
      justify-content: flex-end;
    }
  `;
l([
  u()
], i.prototype, "_isLoading", 2);
l([
  u()
], i.prototype, "_isSaving", 2);
l([
  u()
], i.prototype, "_productTypes", 2);
l([
  u()
], i.prototype, "_taxGroups", 2);
l([
  u()
], i.prototype, "_warehouses", 2);
l([
  u()
], i.prototype, "_elementTypes", 2);
l([
  u()
], i.prototype, "_formData", 2);
l([
  u()
], i.prototype, "_errors", 2);
i = l([
  g("merchello-create-product-modal")
], i);
const E = i;
export {
  i as MerchelloCreateProductModalElement,
  E as default
};
//# sourceMappingURL=create-product-modal.element-I_lfVWrs.js.map
