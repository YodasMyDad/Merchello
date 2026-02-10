import { html as l, nothing as h, css as f, state as p, customElement as g } from "@umbraco-cms/backoffice/external/lit";
import { UmbModalBaseElement as v } from "@umbraco-cms/backoffice/modal";
import { UMB_NOTIFICATION_CONTEXT as T } from "@umbraco-cms/backoffice/notification";
import { M as u } from "./merchello-api-DHA5uhZX.js";
import { UmbPropertyEditorConfigCollection as b } from "@umbraco-cms/backoffice/property-editor";
import "@umbraco-cms/backoffice/document-type";
var D = Object.defineProperty, w = Object.getOwnPropertyDescriptor, y = (e) => {
  throw TypeError(e);
}, s = (e, t, r, a) => {
  for (var i = a > 1 ? void 0 : a ? w(t, r) : t, d = e.length - 1, m; d >= 0; d--)
    (m = e[d]) && (i = (a ? m(t, r, i) : m(i)) || i);
  return a && i && D(t, r, i), i;
}, _ = (e, t, r) => t.has(e) || y("Cannot " + r), c = (e, t, r) => (_(e, t, "read from private field"), t.get(e)), P = (e, t, r) => t.has(e) ? y("Cannot add the same private member more than once") : t instanceof WeakSet ? t.add(e) : t.set(e, r), x = (e, t, r, a) => (_(e, t, "write to private field"), t.set(e, r), r), n;
let o = class extends v {
  constructor() {
    super(), P(this, n), this._isLoading = !0, this._isSaving = !1, this._productTypes = [], this._taxGroups = [], this._warehouses = [], this._elementTypes = [], this._formData = {
      rootName: "",
      sku: "",
      price: 0,
      productTypeId: "",
      taxGroupId: "",
      warehouseIds: [],
      elementTypeAlias: null
    }, this._errors = {}, this._elementTypePickerConfig = new b([
      { alias: "validationLimit", value: { min: 0, max: 1 } },
      { alias: "onlyPickElementTypes", value: !0 }
    ]), this.consumeContext(T, (e) => {
      x(this, n, e);
    });
  }
  async connectedCallback() {
    super.connectedCallback(), await this._loadLookupData();
  }
  async _loadLookupData() {
    this._isLoading = !0;
    const [e, t, r, a] = await Promise.all([
      u.getProductTypes(),
      u.getTaxGroups(),
      u.getWarehousesList(),
      u.getElementTypes()
    ]);
    if (e.error || t.error || r.error) {
      c(this, n)?.peek("danger", {
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
    }, { data: t, error: r } = await u.createProduct(e);
    if (r) {
      c(this, n)?.peek("danger", {
        data: {
          headline: "Failed to create product",
          message: r.message || "An error occurred while creating the product"
        }
      }), this._isSaving = !1;
      return;
    }
    c(this, n)?.peek("positive", {
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
  _getStringArrayFromPropertyValue(e) {
    return Array.isArray(e) ? e.filter((t) => typeof t == "string").map((t) => t.trim()).filter(Boolean) : typeof e == "string" ? e.split(",").map((t) => t.trim()).filter(Boolean) : [];
  }
  _getElementTypeSelectionKey() {
    const e = this._formData.elementTypeAlias;
    return e ? this._elementTypes.find((r) => r.alias.toLowerCase() === e.toLowerCase())?.key : void 0;
  }
  async _setElementTypeAliasFromSelectionValue(e) {
    const r = this._getFirstDropdownValue(e).split(",").map((i) => i.trim()).filter(Boolean)[0];
    let a = this._elementTypes.find((i) => i.key === r);
    if (r && !a) {
      const { data: i } = await u.getElementTypes();
      i && (this._elementTypes = i, a = i.find((d) => d.key === r));
    }
    this._formData = { ...this._formData, elementTypeAlias: a?.alias ?? null };
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
  _getWarehousePropertyConfig() {
    return [
      {
        alias: "items",
        value: this._warehouses.map((e) => ({
          name: e.name || "Unnamed Warehouse",
          value: e.id
        }))
      },
      {
        alias: "multiple",
        value: !0
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
      { alias: "warehouseIds", value: this._formData.warehouseIds },
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
      taxGroupId: this._getFirstDropdownValue(r.taxGroupId),
      warehouseIds: this._getStringArrayFromPropertyValue(r.warehouseIds)
    }, Object.keys(this._errors).length > 0 && (this._errors = {}), this._setElementTypeAliasFromSelectionValue(r.elementTypeAlias);
  }
  render() {
    return l`
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
    return l`
      <div class="loading-container">
        <uui-loader-bar></uui-loader-bar>
      </div>
    `;
  }
  _renderForm() {
    const e = Object.values(this._errors).filter((t) => !!t);
    return l`
      <div class="form-content">
        ${e.length > 0 ? l`
              <div class="error-summary">
                <strong>Please fix the following before creating the product:</strong>
                ${e.map((t) => l`<div>${t}</div>`)}
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

          <umb-property
            alias="warehouseIds"
            label="Warehouses"
            description="Select which warehouses stock this product"
            property-editor-ui-alias="Umb.PropertyEditorUi.Dropdown"
            .config=${this._getWarehousePropertyConfig()}
            .validation=${{ mandatory: !0 }}>
          </umb-property>
        </umb-property-dataset>

        ${this._warehouses.length === 0 ? l`<p class="hint">No warehouses available. Create a warehouse first.</p>` : h}
      </div>
    `;
  }
};
n = /* @__PURE__ */ new WeakMap();
o.styles = f`
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
    umb-property uui-textarea {
      width: 100%;
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

    [slot="actions"] {
      display: flex;
      gap: var(--uui-size-space-2);
      justify-content: flex-end;
    }
  `;
s([
  p()
], o.prototype, "_isLoading", 2);
s([
  p()
], o.prototype, "_isSaving", 2);
s([
  p()
], o.prototype, "_productTypes", 2);
s([
  p()
], o.prototype, "_taxGroups", 2);
s([
  p()
], o.prototype, "_warehouses", 2);
s([
  p()
], o.prototype, "_elementTypes", 2);
s([
  p()
], o.prototype, "_formData", 2);
s([
  p()
], o.prototype, "_errors", 2);
o = s([
  g("merchello-create-product-modal")
], o);
const G = o;
export {
  o as MerchelloCreateProductModalElement,
  G as default
};
//# sourceMappingURL=create-product-modal.element-qZvR-2dN.js.map
