import { LitElement as P, nothing as l, html as r, css as I, property as D, state as c, customElement as C } from "@umbraco-cms/backoffice/external/lit";
import { UmbElementMixin as E } from "@umbraco-cms/backoffice/element-api";
import { UMB_WORKSPACE_CONTEXT as V } from "@umbraco-cms/backoffice/workspace";
import { UmbModalToken as M, UMB_MODAL_MANAGER_CONTEXT as U } from "@umbraco-cms/backoffice/modal";
import { UMB_NOTIFICATION_CONTEXT as N } from "@umbraco-cms/backoffice/notification";
import { M as m } from "./merchello-api-gshzVGsw.js";
import { b as G } from "./badge.styles-C_lNgH9O.js";
import { c as R, d as F } from "./navigation-DnzDaPpA.js";
import { UmbChangeEvent as L } from "@umbraco-cms/backoffice/event";
import { UmbDataTypeDetailRepository as W } from "@umbraco-cms/backoffice/data-type";
import { UmbPropertyEditorConfigCollection as k } from "@umbraco-cms/backoffice/property-editor";
import "@umbraco-cms/backoffice/tiptap";
const T = new M(
  "Merchello.OptionEditor.Modal",
  {
    modal: {
      type: "sidebar",
      size: "medium"
    }
  }
);
var j = Object.defineProperty, B = Object.getOwnPropertyDescriptor, y = (e, t, i, a) => {
  for (var o = a > 1 ? void 0 : a ? B(t, i) : t, s = e.length - 1, u; s >= 0; s--)
    (u = e[s]) && (o = (a ? u(t, i, o) : u(o)) || o);
  return a && o && j(t, i, o), o;
};
let v = class extends E(P) {
  constructor() {
    super(...arguments), this.items = [], this.placeholder = "Add item...", this.readonly = !1, this._newItemValue = "", this._editingIndex = null, this._editingValue = "";
  }
  /**
   * Handles adding a new item when Enter is pressed or Add button is clicked.
   */
  _handleAddItem() {
    const e = this._newItemValue.trim();
    if (!e || this.readonly) return;
    const t = [...this.items, e];
    this._newItemValue = "", this._dispatchChange(t);
  }
  /**
   * Handles input in the new item field.
   */
  _handleNewItemInput(e) {
    this._newItemValue = e.target.value;
  }
  /**
   * Handles Enter key press in the new item field.
   */
  _handleNewItemKeyDown(e) {
    e.key === "Enter" && (e.preventDefault(), this._handleAddItem());
  }
  /**
   * Handles removing an item by index.
   */
  _handleRemoveItem(e) {
    if (this.readonly) return;
    const t = this.items.filter((i, a) => a !== e);
    this._dispatchChange(t);
  }
  /**
   * Starts editing an item.
   */
  _handleStartEdit(e) {
    this.readonly || (this._editingIndex = e, this._editingValue = this.items[e]);
  }
  /**
   * Handles input in the edit field.
   */
  _handleEditInput(e) {
    this._editingValue = e.target.value;
  }
  /**
   * Saves the edited item.
   */
  _handleSaveEdit() {
    if (this._editingIndex === null) return;
    const e = this._editingValue.trim();
    if (!e)
      this._handleRemoveItem(this._editingIndex);
    else {
      const t = [...this.items];
      t[this._editingIndex] = e, this._dispatchChange(t);
    }
    this._editingIndex = null, this._editingValue = "";
  }
  /**
   * Cancels editing.
   */
  _handleCancelEdit() {
    this._editingIndex = null, this._editingValue = "";
  }
  /**
   * Handles Enter and Escape keys in the edit field.
   */
  _handleEditKeyDown(e) {
    e.key === "Enter" ? (e.preventDefault(), this._handleSaveEdit()) : e.key === "Escape" && (e.preventDefault(), this._handleCancelEdit());
  }
  /**
   * Dispatches a change event with the new items array.
   */
  _dispatchChange(e) {
    this.items = e, this.dispatchEvent(new L());
  }
  render() {
    return r`
      <div class="editable-list-container">
        ${this.items.length > 0 ? r`
              <ul class="item-list">
                ${this.items.map((e, t) => this._renderItem(e, t))}
              </ul>
            ` : l}

        ${this.readonly ? l : r`
              <div class="add-item-row">
                <uui-input
                  type="text"
                  .value=${this._newItemValue}
                  @input=${this._handleNewItemInput}
                  @keydown=${this._handleNewItemKeyDown}
                  placeholder=${this.placeholder}
                  class="add-item-input">
                </uui-input>
                <uui-button
                  compact
                  look="primary"
                  color="positive"
                  @click=${this._handleAddItem}
                  ?disabled=${!this._newItemValue.trim()}
                  label="Add item"
                  aria-label="Add item">
                  <uui-icon name="icon-add"></uui-icon>
                </uui-button>
              </div>
            `}

        ${this.items.length === 0 && this.readonly ? r`<p class="empty-hint">No items added.</p>` : l}
      </div>
    `;
  }
  _renderItem(e, t) {
    return this._editingIndex === t ? r`
        <li class="item-row editing">
          <uui-input
            type="text"
            .value=${this._editingValue}
            @input=${this._handleEditInput}
            @keydown=${this._handleEditKeyDown}
            @blur=${this._handleSaveEdit}
            class="edit-input"
            autofocus>
          </uui-input>
          <div class="item-actions">
            <uui-button
              compact
              look="secondary"
              @click=${this._handleSaveEdit}
              label="Save"
              aria-label="Save changes">
              <uui-icon name="icon-check"></uui-icon>
            </uui-button>
            <uui-button
              compact
              look="secondary"
              @click=${this._handleCancelEdit}
              label="Cancel"
              aria-label="Cancel editing">
              <uui-icon name="icon-wrong"></uui-icon>
            </uui-button>
          </div>
        </li>
      ` : r`
      <li class="item-row">
        <span
          class="item-text ${this.readonly ? "" : "editable"}"
          @click=${() => !this.readonly && this._handleStartEdit(t)}
          @keydown=${(a) => a.key === "Enter" && !this.readonly && this._handleStartEdit(t)}
          tabindex=${this.readonly ? -1 : 0}
          role=${this.readonly ? l : "button"}
          aria-label=${this.readonly ? l : `Edit "${e}"`}>
          ${e}
        </span>
        ${this.readonly ? l : r`
              <div class="item-actions">
                <uui-button
                  compact
                  look="secondary"
                  @click=${() => this._handleStartEdit(t)}
                  label="Edit"
                  aria-label="Edit ${e}">
                  <uui-icon name="icon-edit"></uui-icon>
                </uui-button>
                <uui-button
                  compact
                  look="secondary"
                  color="danger"
                  @click=${() => this._handleRemoveItem(t)}
                  label="Remove"
                  aria-label="Remove ${e}">
                  <uui-icon name="icon-trash"></uui-icon>
                </uui-button>
              </div>
            `}
      </li>
    `;
  }
};
v.styles = I`
    :host {
      display: block;
    }

    .editable-list-container {
      display: flex;
      flex-direction: column;
      gap: var(--uui-size-space-3);
    }

    .item-list {
      list-style: none;
      margin: 0;
      padding: 0;
      display: flex;
      flex-direction: column;
      gap: var(--uui-size-space-2);
    }

    .item-row {
      display: flex;
      align-items: center;
      gap: var(--uui-size-space-3);
      padding: var(--uui-size-space-3);
      background: var(--uui-color-surface);
      border: 1px solid var(--uui-color-border);
      border-radius: var(--uui-border-radius);
      transition: border-color 0.15s ease, box-shadow 0.15s ease;
    }

    .item-row:hover {
      border-color: var(--uui-color-border-emphasis);
    }

    .item-row.editing {
      border-color: var(--uui-color-selected);
      box-shadow: 0 0 0 1px var(--uui-color-selected);
    }

    .item-text {
      flex: 1;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .item-text.editable {
      cursor: pointer;
      padding: var(--uui-size-space-1) var(--uui-size-space-2);
      margin: calc(-1 * var(--uui-size-space-1)) calc(-1 * var(--uui-size-space-2));
      border-radius: var(--uui-border-radius);
      transition: background-color 0.15s ease;
    }

    .item-text.editable:hover,
    .item-text.editable:focus {
      background: var(--uui-color-surface-alt);
      outline: none;
    }

    .edit-input {
      flex: 1;
    }

    .item-actions {
      display: flex;
      gap: var(--uui-size-space-1);
      flex-shrink: 0;
    }

    .add-item-row {
      display: flex;
      gap: var(--uui-size-space-2);
      align-items: center;
    }

    .add-item-input {
      flex: 1;
    }

    .empty-hint {
      margin: 0;
      color: var(--uui-color-text-alt);
      font-size: 0.875rem;
      font-style: italic;
    }
  `;
y([
  D({ type: Array })
], v.prototype, "items", 2);
y([
  D({ type: String })
], v.prototype, "placeholder", 2);
y([
  D({ type: Boolean })
], v.prototype, "readonly", 2);
y([
  c()
], v.prototype, "_newItemValue", 2);
y([
  c()
], v.prototype, "_editingIndex", 2);
y([
  c()
], v.prototype, "_editingValue", 2);
v = y([
  C("merchello-editable-text-list")
], v);
var H = Object.defineProperty, K = Object.getOwnPropertyDescriptor, S = (e) => {
  throw TypeError(e);
}, h = (e, t, i, a) => {
  for (var o = a > 1 ? void 0 : a ? K(t, i) : t, s = e.length - 1, u; s >= 0; s--)
    (u = e[s]) && (o = (a ? u(t, i, o) : u(o)) || o);
  return a && o && H(t, i, o), o;
}, O = (e, t, i) => t.has(e) || S("Cannot " + i), n = (e, t, i) => (O(e, t, "read from private field"), t.get(e)), w = (e, t, i) => t.has(e) ? S("Cannot add the same private member more than once") : t instanceof WeakSet ? t.add(e) : t.set(e, i), x = (e, t, i, a) => (O(e, t, "write to private field"), t.set(e, i), i), $, p, _, g, f;
let d = class extends E(P) {
  constructor() {
    super(), this._product = null, this._isLoading = !0, this._isSaving = !1, this._errorMessage = null, this._optionSettings = null, this._validationAttempted = !1, this._fieldErrors = {}, this._routes = [], this._activePath = "", this._formData = {}, this._taxGroups = [], this._productTypes = [], this._warehouses = [], this._descriptionEditorConfig = void 0, w(this, $, new W(this)), w(this, p), w(this, _), w(this, g), w(this, f, !1), this.consumeContext(V, (e) => {
      x(this, p, e), n(this, p) && this.observe(n(this, p).product, (t) => {
        this._product = t ?? null, t && (this._formData = { ...t }), this._isLoading = !t;
      });
    }), this.consumeContext(U, (e) => {
      x(this, _, e);
    }), this.consumeContext(N, (e) => {
      x(this, g, e);
    });
  }
  connectedCallback() {
    super.connectedCallback(), x(this, f, !0), this._loadReferenceData(), this._createRoutes();
  }
  disconnectedCallback() {
    super.disconnectedCallback(), x(this, f, !1);
  }
  async _loadReferenceData() {
    try {
      const [e, t, i, a, o] = await Promise.all([
        m.getTaxGroups(),
        m.getProductTypes(),
        m.getWarehouses(),
        m.getProductOptionSettings(),
        m.getDescriptionEditorSettings()
      ]);
      if (!n(this, f) || (e.data && (this._taxGroups = e.data), t.data && (this._productTypes = t.data), i.data && (this._warehouses = i.data), a.data && (this._optionSettings = a.data), o.data?.dataTypeKey && (await this._loadDataTypeConfig(o.data.dataTypeKey), !n(this, f))))
        return;
    } catch (e) {
      console.error("Failed to load reference data:", e);
    }
  }
  /**
   * Fetches the DataType configuration using Umbraco's DataType repository.
   * This handles authentication automatically through Umbraco's internal mechanisms.
   */
  async _loadDataTypeConfig(e) {
    try {
      console.log("[Merchello] Loading DataType config for:", e);
      const { data: t, error: i } = await n(this, $).requestByUnique(e);
      if (i) {
        console.error("[Merchello] Error requesting DataType:", i), this._setFallbackEditorConfig();
        return;
      }
      console.log("[Merchello] DataType request result:", t), this.observe(
        await n(this, $).byUnique(e),
        (a) => {
          if (console.log("[Merchello] DataType observed:", a), !n(this, f)) return;
          if (!a) {
            console.warn("[Merchello] DataType not found, using fallback config"), this._setFallbackEditorConfig();
            return;
          }
          console.log("[Merchello] DataType values:", a.values), console.log("[Merchello] DataType values detail:", JSON.stringify(a.values, null, 2));
          const o = a.values?.some((u) => u.alias === "extensions"), s = a.values?.some((u) => u.alias === "toolbar");
          console.log("[Merchello] Has extensions:", o, "Has toolbar:", s), o || console.warn("[Merchello] DataType is missing 'extensions' config. Delete it in Settings > Data Types and restart to recreate."), this._descriptionEditorConfig = new k(a.values);
        },
        "_observeDescriptionDataType"
      );
    } catch (t) {
      console.error("[Merchello] Failed to load DataType configuration:", t), this._setFallbackEditorConfig();
    }
  }
  /**
   * Sets a fallback editor configuration if the DataType cannot be loaded.
   */
  _setFallbackEditorConfig() {
    console.log("[Merchello] Using fallback TipTap configuration"), this._descriptionEditorConfig = new k([
      {
        alias: "toolbar",
        value: [
          [
            ["Umb.Tiptap.Toolbar.Bold", "Umb.Tiptap.Toolbar.Italic", "Umb.Tiptap.Toolbar.Underline"],
            ["Umb.Tiptap.Toolbar.BulletList", "Umb.Tiptap.Toolbar.OrderedList"],
            ["Umb.Tiptap.Toolbar.Link", "Umb.Tiptap.Toolbar.Unlink"]
          ]
        ]
      },
      {
        alias: "extensions",
        value: [
          "Umb.Tiptap.RichTextEssentials",
          "Umb.Tiptap.Bold",
          "Umb.Tiptap.Italic",
          "Umb.Tiptap.Underline",
          "Umb.Tiptap.Link",
          "Umb.Tiptap.BulletList",
          "Umb.Tiptap.OrderedList"
        ]
      }
    ]);
  }
  /**
   * Creates routes for tab navigation.
   * The router-slot is hidden via CSS - we use it purely for URL tracking.
   * Content is rendered inline based on _getActiveTab().
   */
  _createRoutes() {
    const e = () => document.createElement("div");
    this._routes = [
      {
        path: "tab/details",
        component: e
      },
      {
        path: "tab/media",
        component: e
      },
      {
        path: "tab/shipping",
        component: e
      },
      {
        path: "tab/seo",
        component: e
      },
      {
        path: "tab/variants",
        component: e
      },
      {
        path: "tab/options",
        component: e
      },
      {
        path: "",
        redirectTo: "tab/details"
      }
    ];
  }
  /**
   * Gets the currently active tab based on the route path
   */
  _getActiveTab() {
    return this._activePath.includes("tab/media") ? "media" : this._activePath.includes("tab/shipping") ? "shipping" : this._activePath.includes("tab/seo") ? "seo" : this._activePath.includes("tab/variants") ? "variants" : this._activePath.includes("tab/options") ? "options" : "details";
  }
  /**
   * Checks if there are validation errors on the details tab
   */
  _hasDetailsErrors() {
    return !!(this._fieldErrors.rootName || this._fieldErrors.taxGroupId || this._fieldErrors.productTypeId || this._fieldErrors.warehouseIds);
  }
  /**
   * Gets validation hint for a specific tab
   */
  _getTabHint(e) {
    return e === "details" && this._validationAttempted && this._hasDetailsErrors() ? { color: "danger" } : e === "variants" && this._hasVariantWarnings() ? { color: "warning" } : e === "options" && this._hasOptionWarnings() ? { color: "warning" } : null;
  }
  _handleInputChange(e, t) {
    this._formData = { ...this._formData, [e]: t };
  }
  _handleToggleChange(e, t) {
    this._formData = { ...this._formData, [e]: t };
  }
  _getTaxGroupOptions() {
    return [
      { name: "Select tax group...", value: "", selected: !this._formData.taxGroupId },
      ...this._taxGroups.map((e) => ({
        name: e.name,
        value: e.id,
        selected: e.id === this._formData.taxGroupId
      }))
    ];
  }
  _getProductTypeOptions() {
    return [
      { name: "Select product type...", value: "", selected: !this._formData.productTypeId },
      ...this._productTypes.map((e) => ({
        name: e.name,
        value: e.id,
        selected: e.id === this._formData.productTypeId
      }))
    ];
  }
  _handleTaxGroupChange(e) {
    const t = e.target;
    this._formData = { ...this._formData, taxGroupId: t.value };
  }
  _handleProductTypeChange(e) {
    const t = e.target;
    this._formData = { ...this._formData, productTypeId: t.value };
  }
  async _handleSave() {
    if (this._validateForm()) {
      this._isSaving = !0, this._errorMessage = null;
      try {
        n(this, p)?.isNew ?? !0 ? await this._createProduct() : await this._updateProduct();
      } catch (e) {
        this._errorMessage = e instanceof Error ? e.message : "An unexpected error occurred", console.error("Save failed:", e);
      } finally {
        this._isSaving = !1;
      }
    }
  }
  async _createProduct() {
    const e = {
      rootName: this._formData.rootName || "",
      taxGroupId: this._formData.taxGroupId || "",
      productTypeId: this._formData.productTypeId || "",
      categoryIds: this._formData.categoryIds,
      warehouseIds: this._formData.warehouseIds,
      rootImages: this._formData.rootImages,
      isDigitalProduct: this._formData.isDigitalProduct || !1,
      defaultVariant: {
        price: 0,
        costOfGoods: 0
      }
    }, { data: t, error: i } = await m.createProduct(e);
    if (i) {
      this._errorMessage = i.message, n(this, g)?.peek("danger", { data: { headline: "Failed to create product", message: i.message } });
      return;
    }
    t && (n(this, p)?.updateProduct(t), n(this, g)?.peek("positive", { data: { headline: "Product created", message: `"${t.rootName}" has been created successfully` } }), this._validationAttempted = !1, this._fieldErrors = {});
  }
  async _updateProduct() {
    if (!this._product?.id) return;
    const e = {
      rootName: this._formData.rootName,
      rootImages: this._formData.rootImages,
      rootUrl: this._formData.rootUrl ?? void 0,
      sellingPoints: this._formData.sellingPoints,
      videos: this._formData.videos,
      googleShoppingFeedCategory: this._formData.googleShoppingFeedCategory ?? void 0,
      isDigitalProduct: this._formData.isDigitalProduct,
      taxGroupId: this._formData.taxGroupId,
      productTypeId: this._formData.productTypeId,
      categoryIds: this._formData.categoryIds,
      warehouseIds: this._formData.warehouseIds,
      description: this._formData.description ?? void 0,
      metaDescription: this._formData.metaDescription ?? void 0,
      pageTitle: this._formData.pageTitle ?? void 0,
      noIndex: this._formData.noIndex,
      openGraphImage: this._formData.openGraphImage ?? void 0,
      canonicalUrl: this._formData.canonicalUrl ?? void 0,
      defaultPackageConfigurations: this._formData.defaultPackageConfigurations
    }, { data: t, error: i } = await m.updateProduct(this._product.id, e);
    if (i) {
      this._errorMessage = i.message, n(this, g)?.peek("danger", { data: { headline: "Failed to save product", message: i.message } });
      return;
    }
    t && (n(this, p)?.updateProduct(t), n(this, g)?.peek("positive", { data: { headline: "Product saved", message: "Changes have been saved successfully" } }));
  }
  /**
   * Validates the form and sets field-level errors
   */
  _validateForm() {
    this._validationAttempted = !0, this._fieldErrors = {}, this._errorMessage = null, this._formData.rootName?.trim() || (this._fieldErrors.rootName = "Product name is required"), this._formData.taxGroupId || (this._fieldErrors.taxGroupId = "Tax group is required"), this._formData.productTypeId || (this._fieldErrors.productTypeId = "Product type is required"), !this._formData.isDigitalProduct && (!this._formData.warehouseIds || this._formData.warehouseIds.length === 0) && (this._fieldErrors.warehouseIds = "At least one warehouse is required for physical products");
    const e = Object.keys(this._fieldErrors).length > 0;
    return e && (this._errorMessage = "Please fix the errors below before saving"), !e;
  }
  /**
   * Checks if there are warnings for variants tab
   */
  _hasVariantWarnings() {
    return this._product?.variants ? this._product.variants.some((e) => !e.sku || e.price === 0) : !1;
  }
  /**
   * Checks if there are warnings for options tab
   */
  _hasOptionWarnings() {
    const e = this._product?.variants.length ?? 0, t = this._product?.productOptions.length ?? 0;
    return e > 1 && t === 0;
  }
  _renderTabs() {
    const e = this._product?.variants.length ?? 0, t = this._product?.productOptions.length ?? 0, i = this._getActiveTab(), a = this._getTabHint("details"), o = this._getTabHint("variants"), s = this._getTabHint("options");
    return r`
      <uui-tab-group slot="header">
        <uui-tab
          label="Details"
          href="${this._routerPath}/tab/details"
          ?active=${i === "details"}>
          Details
          ${a ? r`<uui-badge slot="extra" color="danger" attention>!</uui-badge>` : l}
        </uui-tab>

        <uui-tab
          label="Media"
          href="${this._routerPath}/tab/media"
          ?active=${i === "media"}>
          Media
        </uui-tab>

        ${this._formData.isDigitalProduct ? l : r`
              <uui-tab
                label="Shipping"
                href="${this._routerPath}/tab/shipping"
                ?active=${i === "shipping"}>
                Shipping
              </uui-tab>
            `}

        <uui-tab
          label="SEO"
          href="${this._routerPath}/tab/seo"
          ?active=${i === "seo"}>
          SEO
        </uui-tab>

        ${e > 1 ? r`
              <uui-tab
                label="Variants"
                href="${this._routerPath}/tab/variants"
                ?active=${i === "variants"}>
                Variants (${e})
                ${o ? r`<uui-badge slot="extra" color="warning">!</uui-badge>` : l}
              </uui-tab>
            ` : l}

        <uui-tab
          label="Options"
          href="${this._routerPath}/tab/options"
          ?active=${i === "options"}>
          Options (${t})
          ${s ? r`<uui-badge slot="extra" color="warning">!</uui-badge>` : l}
        </uui-tab>
      </uui-tab-group>
    `;
  }
  _renderDetailsTab() {
    const e = n(this, p)?.isNew ?? !0;
    return r`
      <div class="tab-content">
        ${e ? r`
              <uui-box class="info-banner">
                <div class="info-content">
                  <uui-icon name="icon-lightbulb"></uui-icon>
                  <div>
                    <strong>Getting Started</strong>
                    <p>Fill in the basic product information below. You can add variants and options after creating the product.</p>
                  </div>
                </div>
              </uui-box>
            ` : l}

        ${this._errorMessage ? r`
              <uui-box class="error-box">
                <div class="error-message">
                  <uui-icon name="icon-alert"></uui-icon>
                  <span>${this._errorMessage}</span>
                </div>
              </uui-box>
            ` : l}

        <uui-box headline="Basic Information">
          <umb-property-layout
            label="Product Type"
            description="Categorize your product for reporting and organization"
            ?mandatory=${!0}
            ?invalid=${!!this._fieldErrors.productTypeId}>
            <uui-select
              slot="editor"
              .options=${this._getProductTypeOptions()}
              @change=${this._handleProductTypeChange}>
            </uui-select>
          </umb-property-layout>

          <umb-property-layout
            label="Tax Group"
            description="Tax rate applied to this product"
            ?mandatory=${!0}
            ?invalid=${!!this._fieldErrors.taxGroupId}>
            <uui-select
              slot="editor"
              .options=${this._getTaxGroupOptions()}
              @change=${this._handleTaxGroupChange}>
            </uui-select>
          </umb-property-layout>

          <umb-property-layout
            label="Digital Product"
            description="No shipping costs, instant delivery, no warehouse needed">
            <uui-toggle
              slot="editor"
              .checked=${this._formData.isDigitalProduct ?? !1}
              @change=${(t) => this._handleToggleChange("isDigitalProduct", t.target.checked)}>
            </uui-toggle>
          </umb-property-layout>

          <umb-property-layout
            label="Selling Points"
            description="Key features or benefits to display on your storefront">
            <merchello-editable-text-list
              slot="editor"
              .items=${this._formData.sellingPoints || []}
              @change=${this._handleSellingPointsChange}
              placeholder="e.g., Free shipping, 30-day returns">
            </merchello-editable-text-list>
          </umb-property-layout>

          <umb-property-layout
            label="Description"
            description="Product description for your storefront. Edit the DataType in Settings > Data Types to customize the editor toolbar.">
            <div slot="editor">
              ${this._renderDescriptionEditor()}
            </div>
          </umb-property-layout>
        </uui-box>

        ${this._formData.isDigitalProduct ? l : r`
              <uui-box headline="Warehouses">
                <umb-property-layout
                  label="Stock Locations"
                  description="Select which warehouses stock this product"
                  ?mandatory=${!0}
                  ?invalid=${!!this._fieldErrors.warehouseIds}>
                  <div slot="editor">
                    ${this._renderWarehouseSelector()}
                  </div>
                </umb-property-layout>
              </uui-box>
            `}
      </div>
    `;
  }
  _renderMediaTab() {
    return r`
      <div class="tab-content">
        <uui-box headline="Product Images">
          <umb-property-layout
            label="Images"
            description="Add images that will be displayed on your storefront. These images are shared across all variants.">
            <div slot="editor">
              ${this._renderMediaPicker()}
            </div>
          </umb-property-layout>
        </uui-box>
      </div>
    `;
  }
  // ============================================
  // Shipping Tab - Package Management
  // ============================================
  /**
   * Add a new package configuration
   */
  _addPackage() {
    const e = [...this._formData.defaultPackageConfigurations ?? []];
    e.push({ weight: 0, lengthCm: null, widthCm: null, heightCm: null }), this._formData = { ...this._formData, defaultPackageConfigurations: e };
  }
  /**
   * Remove a package by index
   */
  _removePackage(e) {
    const t = [...this._formData.defaultPackageConfigurations ?? []];
    t.splice(e, 1), this._formData = { ...this._formData, defaultPackageConfigurations: t };
  }
  /**
   * Update a package field
   */
  _updatePackage(e, t, i) {
    const a = [...this._formData.defaultPackageConfigurations ?? []];
    a[e] = { ...a[e], [t]: i }, this._formData = { ...this._formData, defaultPackageConfigurations: a };
  }
  _renderShippingTab() {
    const e = this._formData.defaultPackageConfigurations ?? [], t = n(this, p)?.isNew ?? !0;
    return r`
      <div class="tab-content">
        <uui-box class="info-banner">
          <div class="info-content">
            <uui-icon name="icon-info"></uui-icon>
            <div>
              <strong>Default Shipping Packages</strong>
              <p>Define the default package configurations for this product. These are used for shipping rate calculations and can be overridden at the variant level.</p>
            </div>
          </div>
        </uui-box>

        <uui-box headline="Package Configurations">
          ${e.length > 0 ? r`
                <div class="packages-list">
                  ${e.map((i, a) => this._renderPackageCard(i, a))}
                </div>
              ` : r`
                <div class="empty-state">
                  <uui-icon name="icon-box"></uui-icon>
                  <p>No packages configured</p>
                  <p class="hint">Add a package to enable shipping rate calculations with carriers like FedEx, UPS, and DHL</p>
                </div>
              `}

          <uui-button
            look="placeholder"
            class="add-package-button"
            ?disabled=${t}
            @click=${() => this._addPackage()}>
            <uui-icon name="icon-add"></uui-icon>
            Add Package
          </uui-button>
        </uui-box>
      </div>
    `;
  }
  _renderPackageCard(e, t) {
    return r`
      <div class="package-card">
        <div class="package-header">
          <span class="package-number">Package ${t + 1}</span>
          <uui-button
            compact
            look="secondary"
            color="danger"
            label="Remove package"
            @click=${() => this._removePackage(t)}>
            <uui-icon name="icon-trash"></uui-icon>
          </uui-button>
        </div>
        <div class="package-fields">
          <div class="field-group">
            <label>Weight (kg) *</label>
            <uui-input
              type="number"
              step="0.01"
              min="0"
              .value=${String(e.weight ?? "")}
              @input=${(i) => this._updatePackage(t, "weight", parseFloat(i.target.value) || 0)}
              placeholder="0.50">
            </uui-input>
          </div>
          <div class="field-group">
            <label>Length (cm)</label>
            <uui-input
              type="number"
              step="0.1"
              min="0"
              .value=${String(e.lengthCm ?? "")}
              @input=${(i) => this._updatePackage(t, "lengthCm", parseFloat(i.target.value) || null)}
              placeholder="20">
            </uui-input>
          </div>
          <div class="field-group">
            <label>Width (cm)</label>
            <uui-input
              type="number"
              step="0.1"
              min="0"
              .value=${String(e.widthCm ?? "")}
              @input=${(i) => this._updatePackage(t, "widthCm", parseFloat(i.target.value) || null)}
              placeholder="15">
            </uui-input>
          </div>
          <div class="field-group">
            <label>Height (cm)</label>
            <uui-input
              type="number"
              step="0.1"
              min="0"
              .value=${String(e.heightCm ?? "")}
              @input=${(i) => this._updatePackage(t, "heightCm", parseFloat(i.target.value) || null)}
              placeholder="10">
            </uui-input>
          </div>
        </div>
      </div>
    `;
  }
  /**
   * Renders the Description rich text editor using Umbraco's TipTap input component.
   * The editor configuration comes from a DataType that can be customized in Settings > Data Types.
   */
  _renderDescriptionEditor() {
    return this._descriptionEditorConfig ? r`
      <umb-input-tiptap
        .configuration=${this._descriptionEditorConfig}
        .value=${this._formData.description || ""}
        @change=${this._handleDescriptionChange}>
      </umb-input-tiptap>
    ` : r`<uui-loader-bar></uui-loader-bar>`;
  }
  /**
   * Handles changes from the Description rich text editor.
   * Extracts the markup value and updates the form data.
   */
  _handleDescriptionChange(e) {
    const i = e.target?.value || "";
    this._formData = {
      ...this._formData,
      description: i
    };
  }
  _renderMediaPicker() {
    const e = this._formData.rootImages || [], t = e.map((i) => ({ key: i, mediaKey: i }));
    return r`
      <umb-input-rich-media
        .value=${t}
        ?multiple=${!0}
        @change=${this._handleMediaChange}>
      </umb-input-rich-media>
      ${e.length === 0 ? r`
        <div class="empty-media-state">
          <uui-icon name="icon-picture"></uui-icon>
          <p>No images added yet</p>
          <small>Click the button above to add product images</small>
        </div>
      ` : l}
    `;
  }
  _handleMediaChange(e) {
    const a = (e.target?.value || []).map((o) => o.mediaKey).filter(Boolean);
    this._formData = { ...this._formData, rootImages: a };
  }
  _renderSeoTab() {
    const e = this._formData.openGraphImage ? [{ key: this._formData.openGraphImage, mediaKey: this._formData.openGraphImage }] : [];
    return r`
      <div class="tab-content">
        <uui-box headline="Search Engine Optimization">
          <umb-property-layout
            label="Page Title"
            description="The title shown in browser tabs and search results">
            <uui-input
              slot="editor"
              .value=${this._formData.pageTitle || ""}
              @input=${(t) => this._handleInputChange("pageTitle", t.target.value)}
              placeholder="e.g., Blue T-Shirt | Your Store Name">
            </uui-input>
          </umb-property-layout>

          <umb-property-layout
            label="Meta Description"
            description="The description shown in search results (recommended: 150-160 characters)">
            <uui-textarea
              slot="editor"
              .value=${this._formData.metaDescription || ""}
              @input=${(t) => this._handleInputChange("metaDescription", t.target.value)}
              placeholder="A brief description for search engines...">
            </uui-textarea>
          </umb-property-layout>

          <umb-property-layout
            label="Canonical URL"
            description="Optional URL to indicate the preferred version of this page for SEO">
            <uui-input
              slot="editor"
              .value=${this._formData.canonicalUrl || ""}
              @input=${(t) => this._handleInputChange("canonicalUrl", t.target.value)}
              placeholder="https://example.com/products/blue-t-shirt">
            </uui-input>
          </umb-property-layout>

          <umb-property-layout
            label="Hide from Search Engines"
            description="Adds noindex meta tag to prevent search engines from indexing this page">
            <uui-toggle
              slot="editor"
              .checked=${this._formData.noIndex ?? !1}
              @change=${(t) => this._handleToggleChange("noIndex", t.target.checked)}>
            </uui-toggle>
          </umb-property-layout>
        </uui-box>

        <uui-box headline="Social Sharing">
          <umb-property-layout
            label="Open Graph Image"
            description="Image displayed when this page is shared on social media">
            <div slot="editor">
              <umb-input-rich-media
                .value=${e}
                ?multiple=${!1}
                @change=${this._handleOpenGraphImageChange}>
              </umb-input-rich-media>
              ${this._formData.openGraphImage ? l : r`
                    <div class="empty-media-state small">
                      <uui-icon name="icon-share-alt"></uui-icon>
                      <p>No image selected</p>
                      <small>Recommended size: 1200×630 pixels</small>
                    </div>
                  `}
            </div>
          </umb-property-layout>
        </uui-box>

        <uui-box headline="Search Preview">
          <umb-property-layout
            label="Google Search Result"
            description="Preview how this product may appear in Google search results">
            <div slot="editor">
              ${this._renderGoogleSearchPreview()}
            </div>
          </umb-property-layout>
        </uui-box>
      </div>
    `;
  }
  _renderGoogleSearchPreview() {
    const e = this._formData.pageTitle || this._formData.rootName || "Product Title", t = this._formData.metaDescription || "No meta description set. Add a description to improve search visibility.", i = this._formData.canonicalUrl || "https://yourstore.com/products/product-name", a = this._formatUrlAsBreadcrumb(i), o = 60, s = 160, u = e.length > o, b = t.length > s, z = u ? e.substring(0, o - 3) + "..." : e, A = b ? t.substring(0, s - 3) + "..." : t;
    return r`
      <div class="google-preview">
        <div class="google-preview-header">
          <div class="google-preview-favicon">
            <uui-icon name="icon-globe"></uui-icon>
          </div>
          <div class="google-preview-site">
            <div class="google-preview-site-name">Your Store</div>
            <div class="google-preview-url">${a}</div>
          </div>
        </div>
        <div class="google-preview-title">${z}</div>
        <div class="google-preview-description">${A}</div>
      </div>
      <div class="google-preview-stats">
        <span class="${u ? "stat-warning" : "stat-ok"}">
          Title: ${e.length}/${o} chars ${u ? "(will be truncated)" : ""}
        </span>
        <span class="${b ? "stat-warning" : "stat-ok"}">
          Description: ${t.length}/${s} chars ${b ? "(will be truncated)" : ""}
        </span>
      </div>
    `;
  }
  _formatUrlAsBreadcrumb(e) {
    try {
      const t = new URL(e), i = t.pathname.split("/").filter((a) => a);
      return i.length === 0 ? t.hostname : `${t.hostname} › ${i.join(" › ")}`;
    } catch {
      return e;
    }
  }
  _handleOpenGraphImageChange(e) {
    const i = e.target?.value || [], a = i.length > 0 ? i[0].mediaKey : null;
    this._formData = { ...this._formData, openGraphImage: a };
  }
  _renderWarehouseSelector() {
    const e = this._formData.warehouseIds || [];
    return r`
      <div class="warehouse-toggle-list">
        ${this._warehouses.map(
      (t) => r`
            <div class="toggle-field">
              <uui-toggle
                .checked=${e.includes(t.id)}
                @change=${(i) => this._handleWarehouseToggle(t.id, i.target.checked)}>
              </uui-toggle>
              <label>${t.name} ${t.code ? `(${t.code})` : ""}</label>
            </div>
          `
    )}
        ${this._warehouses.length === 0 ? r`<p class="hint">No warehouses available. Create a warehouse first.</p>` : l}
      </div>
    `;
  }
  _handleWarehouseToggle(e, t) {
    const i = this._formData.warehouseIds || [];
    t ? this._formData = { ...this._formData, warehouseIds: [...i, e] } : this._formData = { ...this._formData, warehouseIds: i.filter((a) => a !== e) };
  }
  _renderVariantsTab() {
    const e = this._product?.variants ?? [];
    return r`
      <div class="tab-content">
        <div class="section-header">
          <h3>Product Variants</h3>
          <p class="section-description">
            Click a row to edit variant details. Select a variant as the default using the radio button.
          </p>
        </div>

        <div class="table-container">
          <uui-table class="data-table">
            <uui-table-head>
              <uui-table-head-cell style="width: 60px;">Default</uui-table-head-cell>
              <uui-table-head-cell>Variant</uui-table-head-cell>
              <uui-table-head-cell>SKU</uui-table-head-cell>
              <uui-table-head-cell>Price</uui-table-head-cell>
              <uui-table-head-cell>Stock</uui-table-head-cell>
              <uui-table-head-cell>Status</uui-table-head-cell>
            </uui-table-head>
            ${e.map((t) => this._renderVariantRow(t))}
          </uui-table>
        </div>
      </div>
    `;
  }
  _renderVariantRow(e) {
    const t = this._product ? R(this._product.id, e.id) : "", i = this._getVariantOptionDescription(e);
    return r`
      <uui-table-row>
        <uui-table-cell>
          <uui-radio
            name="default-variant-${e.productRootId}"
            ?checked=${e.default}
            @click=${(a) => {
      a.preventDefault(), this._handleSetDefaultVariant(e.id);
    }}>
          </uui-radio>
        </uui-table-cell>
        <uui-table-cell>
          <div class="variant-name-cell">
            <a href=${t} class="variant-link">${e.name || "Unnamed"}</a>
            ${i ? r`<span class="variant-options-text">${i}</span>` : l}
          </div>
        </uui-table-cell>
        <uui-table-cell>${e.sku || "—"}</uui-table-cell>
        <uui-table-cell>$${e.price.toFixed(2)}</uui-table-cell>
        <uui-table-cell>
          <span class="badge ${this._getStockBadgeClass(e.totalStock)}">${e.totalStock}</span>
        </uui-table-cell>
        <uui-table-cell>
          <span class="badge ${e.availableForPurchase ? "badge-positive" : "badge-danger"}">
            ${e.availableForPurchase ? "Available" : "Unavailable"}
          </span>
        </uui-table-cell>
      </uui-table-row>
    `;
  }
  _getStockBadgeClass(e) {
    return e === 0 ? "badge-danger" : e < 10 ? "badge-warning" : "badge-positive";
  }
  /**
   * Parses the variant's option key and returns a human-readable description
   * of the option value combination (e.g., "Red / Large / Cotton")
   */
  _getVariantOptionDescription(e) {
    if (!e.variantOptionsKey || !this._product) return null;
    const t = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi, i = e.variantOptionsKey.match(t) || [], a = [];
    for (const o of i)
      for (const s of this._product.productOptions) {
        const u = s.values.find((b) => b.id === o);
        if (u) {
          a.push(u.name);
          break;
        }
      }
    return a.length > 0 ? a.join(" / ") : null;
  }
  async _handleSetDefaultVariant(e) {
    if (!this._product || this._product.variants.find((o) => o.id === e)?.default) return;
    const i = this._product.id;
    console.log("Setting default variant:", { productRootId: i, variantId: e });
    const a = this._product.variants.map((o) => ({
      ...o,
      default: o.id === e
    }));
    this._product = { ...this._product, variants: a };
    try {
      const { error: o } = await m.setDefaultVariant(i, e);
      console.log("API response:", { error: o }), o ? (console.error("Failed to set default variant:", o), n(this, g)?.peek("danger", { data: { headline: "Failed to set default variant", message: o.message } }), await n(this, p)?.reload()) : (n(this, g)?.peek("positive", { data: { headline: "Default variant updated", message: "" } }), await n(this, p)?.reload(), console.log("After reload, variants:", this._product?.variants.map((s) => ({ id: s.id, name: s.name, default: s.default }))));
    } catch (o) {
      console.error("Failed to set default variant:", o), n(this, g)?.peek("danger", { data: { headline: "Error", message: "An unexpected error occurred" } }), await n(this, p)?.reload();
    }
  }
  _renderOptionsTab() {
    const e = this._formData.productOptions ?? [], t = n(this, p)?.isNew ?? !0, i = e.filter((u) => u.isVariant), a = i.reduce((u, b) => u * (b.values.length || 1), i.length > 0 ? 1 : 0), o = this._optionSettings?.maxProductOptions ?? 5, s = e.length >= o;
    return r`
      <div class="tab-content">
        ${t ? r`
              <uui-box class="info-banner warning">
                <div class="info-content">
                  <uui-icon name="icon-alert"></uui-icon>
                  <div>
                    <strong>Save Required</strong>
                    <p>You must save the product before adding options.</p>
                  </div>
                </div>
              </uui-box>
            ` : r`
              <uui-box class="info-banner">
                <div class="info-content">
                  <uui-icon name="icon-lightbulb"></uui-icon>
                  <div>
                    <strong>About Product Options</strong>
                    <p>Options with "Generates Variants" create all combinations (e.g., 3 sizes × 4 colors = 12 variants). Options without this are add-ons that modify price.</p>
                  </div>
                </div>
              </uui-box>
            `}

        <div class="section-header">
          <div>
            <h3>Product Options <span class="option-count">${e.length}/${o}</span></h3>
            ${a > 0 ? r`<small class="hint">Will generate ${a} variant${a !== 1 ? "s" : ""}</small>` : l}
          </div>
          <uui-button
            look="primary"
            color="positive"
            label="Add Option"
            ?disabled=${t || s}
            @click=${this._addNewOption}>
            <uui-icon name="icon-add"></uui-icon>
            Add Option
          </uui-button>
        </div>

        ${e.length > 0 ? r` <div class="options-list">${e.map((u) => this._renderOptionCard(u))}</div> ` : t ? l : r`
              <div class="empty-state">
                <uui-icon name="icon-layers"></uui-icon>
                <p>No options configured</p>
                <p class="hint">Use the <strong>Add Option</strong> button above to add options like Size, Color, or Material</p>
              </div>
            `}

      </div>
    `;
  }
  _renderOptionCard(e) {
    return r`
      <uui-box class="option-card">
        <div class="option-header">
          <div class="option-info">
            <strong>${e.name}</strong>
            <span class="badge ${e.isVariant ? "badge-positive" : "badge-default"}">
              ${e.isVariant ? "Generates Variants" : "Add-on"}
            </span>
            ${e.optionUiAlias ? r` <span class="badge badge-default">${e.optionUiAlias}</span> ` : l}
          </div>
          <div class="option-actions">
            <uui-button compact look="secondary" @click=${() => this._editOption(e)} label="Edit option" aria-label="Edit ${e.name}">
              <uui-icon name="icon-edit"></uui-icon>
            </uui-button>
            <uui-button compact look="primary" color="danger" @click=${() => this._deleteOption(e.id)} label="Delete option" aria-label="Delete ${e.name}">
              <uui-icon name="icon-trash"></uui-icon>
            </uui-button>
          </div>
        </div>

        <div class="option-values">
          ${e.values.map((t) => this._renderOptionValue(t, e.optionUiAlias))}
          ${e.values.length === 0 ? r`<p class="hint">No values added yet</p>` : l}
        </div>
      </uui-box>
    `;
  }
  _renderOptionValue(e, t) {
    return r`
      <div class="option-value-chip">
        ${t === "colour" && e.hexValue ? r` <span class="color-swatch" style="background-color: ${e.hexValue}"></span> ` : l}
        <span>${e.name}</span>
        ${e.priceAdjustment !== 0 ? r`
              <span class="price-adjustment">
                ${e.priceAdjustment > 0 ? "+" : ""}$${e.priceAdjustment.toFixed(2)}
              </span>
            ` : l}
      </div>
    `;
  }
  async _addNewOption() {
    if (!n(this, _) || !this._optionSettings) return;
    const t = await n(this, _).open(this, T, {
      data: {
        option: void 0,
        settings: this._optionSettings
      }
    }).onSubmit().catch(() => {
    });
    if (t?.saved && t.option) {
      const i = this._formData.productOptions || [];
      this._formData = {
        ...this._formData,
        productOptions: [...i, t.option]
      }, await this._saveOptions();
    }
  }
  async _editOption(e) {
    if (!n(this, _) || !this._optionSettings) return;
    const i = await n(this, _).open(this, T, {
      data: {
        option: e,
        settings: this._optionSettings
      }
    }).onSubmit().catch(() => {
    });
    if (i?.saved) {
      if (i.deleted)
        await this._deleteOption(e.id);
      else if (i.option) {
        const a = this._formData.productOptions || [], o = a.findIndex((s) => s.id === e.id);
        o !== -1 && (a[o] = i.option, this._formData = { ...this._formData, productOptions: [...a] }, await this._saveOptions());
      }
    }
  }
  async _deleteOption(e) {
    const i = this._formData.productOptions?.find((s) => s.id === e)?.name || "this option";
    if (!confirm(`Are you sure you want to delete "${i}"? This action cannot be undone.`)) return;
    const o = (this._formData.productOptions || []).filter((s) => s.id !== e);
    this._formData = { ...this._formData, productOptions: o }, await this._saveOptions();
  }
  /**
   * Confirms with user before saving options that will regenerate variants.
   * Returns true if user confirms or no confirmation needed, false if cancelled.
   */
  _confirmVariantRegeneration() {
    const t = (this._formData.productOptions || []).filter((o) => o.isVariant), i = this._product?.variants.length ?? 0, a = t.length > 0 ? t.reduce((o, s) => o * (s.values.length || 1), 1) : 1;
    if (i > 0 && t.length > 0) {
      const o = `⚠️ WARNING: Saving these options will regenerate all product variants.

Current variants: ${i}
New variants to create: ${a}

This will DELETE all existing variants and create new ones.
Any variant-specific data (pricing, stock levels, images, SKUs) will need to be re-entered manually.

Are you sure you want to continue?`;
      return confirm(o);
    }
    if (i > 1 && t.length === 0) {
      const o = `⚠️ WARNING: Removing all variant options will collapse this product to a single variant.

Current variants: ${i}
After save: 1 variant (default only)

${i - 1} variants will be DELETED.
Only the default variant will be kept.

Are you sure you want to continue?`;
      return confirm(o);
    }
    return !0;
  }
  async _saveOptions() {
    if (this._product?.id) {
      if (!this._confirmVariantRegeneration()) {
        n(this, p)?.reload();
        return;
      }
      try {
        const e = (this._formData.productOptions || []).map((a, o) => ({
          id: a.id,
          name: a.name,
          alias: a.alias ?? void 0,
          sortOrder: o,
          optionTypeAlias: a.optionTypeAlias ?? void 0,
          optionUiAlias: a.optionUiAlias ?? void 0,
          isVariant: a.isVariant,
          values: a.values.map((s, u) => ({
            id: s.id,
            name: s.name,
            sortOrder: u,
            hexValue: s.hexValue ?? void 0,
            mediaKey: s.mediaKey ?? void 0,
            priceAdjustment: s.priceAdjustment,
            costAdjustment: s.costAdjustment,
            skuSuffix: s.skuSuffix ?? void 0
          }))
        }));
        n(this, g)?.peek("default", { data: { headline: "Saving options...", message: "Variants will be regenerated" } });
        const { data: t, error: i } = await m.saveProductOptions(this._product.id, e);
        if (!n(this, f)) return;
        !i && t ? (this._formData = { ...this._formData, productOptions: t }, n(this, g)?.peek("positive", { data: { headline: "Options saved", message: "Variants have been regenerated" } }), n(this, p)?.reload()) : i && (console.error("Failed to save options:", i), this._errorMessage = "Failed to save options: " + i.message, n(this, g)?.peek("danger", { data: { headline: "Failed to save options", message: i.message } }));
      } catch (e) {
        if (!n(this, f)) return;
        console.error("Failed to save options:", e), this._errorMessage = e instanceof Error ? e.message : "Failed to save options", n(this, g)?.peek("danger", { data: { headline: "Error", message: "An unexpected error occurred" } });
      }
    }
  }
  /**
   * Handles selling points change from the editable text list.
   */
  _handleSellingPointsChange(e) {
    const i = e.target?.items || [];
    this._formData = { ...this._formData, sellingPoints: i };
  }
  /**
   * Handles router slot initialization
   */
  _onRouterInit(e) {
    this._routerPath = e.target.absoluteRouterPath;
  }
  /**
   * Handles router slot path changes
   */
  _onRouterChange(e) {
    this._activePath = e.target.localActiveViewPath || "";
  }
  render() {
    if (this._isLoading)
      return r`
        <umb-body-layout header-fit-height>
          <div class="loading">
            <uui-loader></uui-loader>
          </div>
        </umb-body-layout>
      `;
    const e = n(this, p)?.isNew ?? !0, t = this._getActiveTab();
    return r`
      <umb-body-layout header-fit-height main-no-padding>
        <!-- Header: back button + icon + name input -->
        <uui-button slot="header" compact href=${F()} label="Back" class="back-button">
          <uui-icon name="icon-arrow-left"></uui-icon>
        </uui-button>

        <div id="header" slot="header">
          <umb-icon name="icon-box"></umb-icon>
          <uui-input
            id="name-input"
            .value=${this._formData.rootName || ""}
            @input=${(i) => this._handleInputChange("rootName", i.target.value)}
            placeholder=${e ? "Enter product name..." : "Product name"}
            ?invalid=${!!this._fieldErrors.rootName}
            aria-label="Product name"
            aria-required="true">
          </uui-input>
        </div>

        <!-- Inner body layout for tabs + content -->
        <umb-body-layout header-fit-height header-no-padding>
          ${this._renderTabs()}

          <umb-router-slot
            .routes=${this._routes}
            @init=${this._onRouterInit}
            @change=${this._onRouterChange}>
          </umb-router-slot>

          ${t === "details" ? this._renderDetailsTab() : l}
          ${t === "media" ? this._renderMediaTab() : l}
          ${t === "shipping" ? this._renderShippingTab() : l}
          ${t === "seo" ? this._renderSeoTab() : l}
          ${t === "variants" ? this._renderVariantsTab() : l}
          ${t === "options" ? this._renderOptionsTab() : l}
        </umb-body-layout>

        <!-- Footer with save button -->
        <umb-footer-layout slot="footer">
          <uui-button
            slot="actions"
            look="primary"
            color="positive"
            @click=${this._handleSave}
            ?disabled=${this._isSaving}
            label=${this._isSaving ? "Saving..." : e ? "Create Product" : "Save Changes"}>
            ${this._isSaving ? "Saving..." : e ? "Create Product" : "Save Changes"}
          </uui-button>
        </umb-footer-layout>
      </umb-body-layout>
    `;
  }
};
$ = /* @__PURE__ */ new WeakMap();
p = /* @__PURE__ */ new WeakMap();
_ = /* @__PURE__ */ new WeakMap();
g = /* @__PURE__ */ new WeakMap();
f = /* @__PURE__ */ new WeakMap();
d.styles = [
  G,
  I`
      :host {
        display: block;
        width: 100%;
        height: 100%;
        --uui-tab-background: var(--uui-color-surface);
      }

      /* Header layout */
      #header {
        display: flex;
        align-items: center;
        gap: var(--uui-size-space-3);
        flex: 1;
        padding: var(--uui-size-space-4) 0;
      }

      #header umb-icon {
        font-size: 24px;
        color: var(--uui-color-text-alt);
      }

      #name-input {
        flex: 1 1 auto;
        --uui-input-border-color: transparent;
        --uui-input-background-color: transparent;
        font-size: var(--uui-type-h5-size);
        font-weight: 700;
      }

      #name-input:hover,
      #name-input:focus-within {
        --uui-input-border-color: var(--uui-color-border);
        --uui-input-background-color: var(--uui-color-surface);
      }

      .back-button {
        margin-right: var(--uui-size-space-2);
      }

      /* Loading state */
      .loading {
        display: flex;
        justify-content: center;
        align-items: center;
        min-height: 400px;
      }

      /* Tab styling - Umbraco pattern */
      uui-tab-group {
        --uui-tab-divider: var(--uui-color-border);
        width: 100%;
      }

      /* Hide router slot as we render content inline */
      umb-router-slot {
        display: none;
      }

      /* Box styling - Umbraco pattern */
      uui-box {
        --uui-box-default-padding: var(--uui-size-space-5);
      }

      /* Property layout adjustments */
      umb-property-layout:first-child {
        padding-top: 0;
      }

      umb-property-layout:last-child {
        padding-bottom: 0;
      }

      umb-property-layout uui-select,
      umb-property-layout uui-input {
        width: 100%;
      }

      /* Tab content */
      .tab-content {
        display: flex;
        flex-direction: column;
        gap: var(--uui-size-space-5);
      }

      /* Warehouse toggle list */
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
        font-size: 0.875rem;
        color: var(--uui-color-text-alt);
        margin: 0;
      }

      /* Empty media state */
      .empty-media-state {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        padding: var(--uui-size-space-6);
        margin-top: var(--uui-size-space-3);
        background: var(--uui-color-surface);
        border: 2px dashed var(--uui-color-border);
        border-radius: var(--uui-border-radius);
        color: var(--uui-color-text-alt);
        text-align: center;
      }

      .empty-media-state uui-icon {
        font-size: 48px;
        opacity: 0.5;
        margin-bottom: var(--uui-size-space-2);
      }

      .empty-media-state p {
        margin: 0 0 var(--uui-size-space-1) 0;
        font-weight: 500;
      }

      .empty-media-state small {
        font-size: 0.875rem;
        color: var(--uui-color-text-alt);
      }

      .empty-media-state.small {
        padding: var(--uui-size-space-4);
      }

      .empty-media-state.small uui-icon {
        font-size: 32px;
      }

      /* Info and error banners */
      .error-box {
        background: var(--uui-color-danger-surface);
        border-left: 3px solid var(--uui-color-danger);
      }

      .info-banner {
        background: var(--uui-color-surface);
        border-left: 3px solid var(--uui-color-selected);
      }

      .info-banner.warning {
        background: var(--uui-color-warning-surface);
        border-left-color: var(--uui-color-warning);
      }

      .info-content {
        display: flex;
        gap: var(--uui-size-space-3);
        padding: var(--uui-size-space-3);
      }

      .info-content uui-icon {
        font-size: 24px;
        flex-shrink: 0;
      }

      .info-content strong {
        display: block;
        margin-bottom: var(--uui-size-space-1);
      }

      .info-content p {
        margin: 0;
        color: var(--uui-color-text-alt);
      }

      .error-message {
        display: flex;
        align-items: center;
        gap: var(--uui-size-space-2);
        color: var(--uui-color-danger);
        padding: var(--uui-size-space-3);
      }

      /* Section headers */
      .section-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: var(--uui-size-space-3);
      }

      .section-header h3 {
        margin: 0;
        font-size: 1.25rem;
      }

      .option-count {
        font-size: 0.875rem;
        font-weight: normal;
        color: var(--uui-color-text-alt);
        margin-left: var(--uui-size-space-2);
      }

      .section-description {
        color: var(--uui-color-text-alt);
        margin: var(--uui-size-space-2) 0;
      }

      /* Table styles */
      .table-container {
        overflow-x: auto;
      }

      .data-table {
        width: 100%;
      }

      .variant-name-cell {
        display: flex;
        flex-direction: column;
        gap: var(--uui-size-space-1);
      }

      .variant-link {
        font-weight: 500;
        color: var(--uui-color-interactive);
        text-decoration: none;
      }

      .variant-link:hover {
        text-decoration: underline;
        color: var(--uui-color-interactive-emphasis);
      }

      .variant-options-text {
        font-size: 0.8125rem;
        color: var(--uui-color-text-alt);
      }

      /* Options */
      .options-list {
        display: flex;
        flex-direction: column;
        gap: var(--uui-size-space-3);
      }

      .option-card {
        background: var(--uui-color-surface);
      }

      .option-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: var(--uui-size-space-3);
        border-bottom: 1px solid var(--uui-color-border);
      }

      .option-info {
        display: flex;
        align-items: center;
        gap: var(--uui-size-space-2);
        flex-wrap: wrap;
      }

      .option-actions {
        display: flex;
        gap: var(--uui-size-space-2);
      }

      .option-values {
        display: flex;
        flex-wrap: wrap;
        gap: var(--uui-size-space-2);
        padding: var(--uui-size-space-3);
        min-height: 60px;
        align-items: center;
      }

      .option-value-chip {
        display: flex;
        align-items: center;
        gap: var(--uui-size-space-1);
        padding: var(--uui-size-space-2) var(--uui-size-space-3);
        background: var(--uui-color-surface-alt);
        border-radius: var(--uui-border-radius);
        font-size: 0.875rem;
      }

      .color-swatch {
        width: 16px;
        height: 16px;
        border-radius: 50%;
        border: 1px solid var(--uui-color-border);
      }

      .price-adjustment {
        font-weight: 600;
        color: var(--uui-color-positive);
      }

      /* Empty state for options */
      .empty-state {
        text-align: center;
        padding: var(--uui-size-space-6);
        color: var(--uui-color-text-alt);
      }

      .empty-state uui-icon {
        font-size: 48px;
        opacity: 0.5;
        margin-bottom: var(--uui-size-space-3);
      }

      .empty-state p {
        margin: var(--uui-size-space-2) 0;
      }

      .empty-state strong {
        color: var(--uui-color-text);
      }

      /* Google Search Preview - Updated 2024/2025 styling */
      .google-preview {
        font-family: Arial, sans-serif;
        max-width: 600px;
        padding: var(--uui-size-space-4);
        background: #fff;
        border: 1px solid var(--uui-color-border);
        border-radius: var(--uui-border-radius);
      }

      .google-preview-header {
        display: flex;
        align-items: center;
        gap: 12px;
        margin-bottom: 4px;
      }

      .google-preview-favicon {
        width: 28px;
        height: 28px;
        border-radius: 50%;
        background: #f1f3f4;
        display: flex;
        align-items: center;
        justify-content: center;
        flex-shrink: 0;
      }

      .google-preview-favicon uui-icon {
        font-size: 16px;
        color: #5f6368;
      }

      .google-preview-site {
        display: flex;
        flex-direction: column;
        min-width: 0;
      }

      .google-preview-site-name {
        font-size: 14px;
        color: #202124;
        line-height: 1.3;
      }

      .google-preview-url {
        font-size: 12px;
        color: #4d5156;
        line-height: 1.3;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }

      .google-preview-title {
        font-size: 20px;
        color: #1a0dab;
        line-height: 1.3;
        margin-bottom: 4px;
        word-wrap: break-word;
      }

      .google-preview-title:hover {
        text-decoration: underline;
        cursor: pointer;
      }

      .google-preview-description {
        font-size: 14px;
        color: #4d5156;
        line-height: 1.58;
        word-wrap: break-word;
      }

      .google-preview-stats {
        display: flex;
        gap: var(--uui-size-space-4);
        margin-top: var(--uui-size-space-3);
        font-size: 12px;
        flex-wrap: wrap;
      }

      .google-preview-stats .stat-ok {
        color: var(--uui-color-positive);
      }

      .google-preview-stats .stat-warning {
        color: var(--uui-color-warning);
      }

      /* Description editor styling */
      umb-property-dataset {
        display: block;
      }

      umb-property-dataset umb-property {
        --umb-property-layout-description-display: none;
      }

      /* Package cards */
      .packages-list {
        display: flex;
        flex-direction: column;
        gap: var(--uui-size-space-4);
        margin-bottom: var(--uui-size-space-4);
      }

      .package-card {
        background: var(--uui-color-surface-alt);
        border: 1px solid var(--uui-color-border);
        border-radius: var(--uui-border-radius);
        padding: var(--uui-size-space-4);
      }

      .package-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: var(--uui-size-space-3);
      }

      .package-number {
        font-weight: 600;
        color: var(--uui-color-text);
      }

      .package-fields {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
        gap: var(--uui-size-space-3);
      }

      .field-group {
        display: flex;
        flex-direction: column;
        gap: var(--uui-size-space-1);
      }

      .field-group label {
        font-size: 0.75rem;
        font-weight: 500;
        color: var(--uui-color-text-alt);
      }

      .field-group uui-input {
        width: 100%;
      }

      .add-package-button {
        width: 100%;
      }
    `
];
h([
  c()
], d.prototype, "_product", 2);
h([
  c()
], d.prototype, "_isLoading", 2);
h([
  c()
], d.prototype, "_isSaving", 2);
h([
  c()
], d.prototype, "_errorMessage", 2);
h([
  c()
], d.prototype, "_optionSettings", 2);
h([
  c()
], d.prototype, "_validationAttempted", 2);
h([
  c()
], d.prototype, "_fieldErrors", 2);
h([
  c()
], d.prototype, "_routes", 2);
h([
  c()
], d.prototype, "_routerPath", 2);
h([
  c()
], d.prototype, "_activePath", 2);
h([
  c()
], d.prototype, "_formData", 2);
h([
  c()
], d.prototype, "_taxGroups", 2);
h([
  c()
], d.prototype, "_productTypes", 2);
h([
  c()
], d.prototype, "_warehouses", 2);
h([
  c()
], d.prototype, "_descriptionEditorConfig", 2);
d = h([
  C("merchello-product-detail")
], d);
const se = d;
export {
  d as MerchelloProductDetailElement,
  se as default
};
//# sourceMappingURL=product-detail.element-My7hBwkE.js.map
