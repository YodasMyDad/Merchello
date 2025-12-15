import { LitElement as P, nothing as n, html as o, css as C, property as $, state as c, customElement as I } from "@umbraco-cms/backoffice/external/lit";
import { UmbElementMixin as S } from "@umbraco-cms/backoffice/element-api";
import { UMB_WORKSPACE_CONTEXT as M } from "@umbraco-cms/backoffice/workspace";
import { UmbModalToken as G, UMB_MODAL_MANAGER_CONTEXT as U } from "@umbraco-cms/backoffice/modal";
import { UMB_NOTIFICATION_CONTEXT as N } from "@umbraco-cms/backoffice/notification";
import { M as m } from "./merchello-api-Bc5VtWiv.js";
import "@umbraco-cms/backoffice/property";
import { b as R } from "./badge.styles-C_lNgH9O.js";
import { c as L, d as B } from "./navigation-D1KCp5wk.js";
import { UmbChangeEvent as W } from "@umbraco-cms/backoffice/event";
import "./variant-stock-display.element-D7hBvtXE.js";
import { UmbDataTypeDetailRepository as j } from "@umbraco-cms/backoffice/data-type";
import { UmbPropertyEditorConfigCollection as F } from "@umbraco-cms/backoffice/property-editor";
import "@umbraco-cms/backoffice/tiptap";
var K = Object.defineProperty, H = Object.getOwnPropertyDescriptor, k = (e, t, i, a) => {
  for (var r = a > 1 ? void 0 : a ? H(t, i) : t, s = e.length - 1, u; s >= 0; s--)
    (u = e[s]) && (r = (a ? u(t, i, r) : u(r)) || r);
  return a && r && K(t, i, r), r;
};
let y = class extends S(P) {
  constructor() {
    super(...arguments), this.values = {}, this._datasetValue = [];
  }
  updated(e) {
    super.updated(e), (e.has("values") || e.has("activeTabId") || e.has("elementType")) && this._updateDatasetValue();
  }
  _updateDatasetValue() {
    const e = this._getAllPropertiesForCurrentTab();
    this._datasetValue = e.map((t) => ({
      alias: t.alias,
      value: this.values[t.alias]
    }));
  }
  _getPropertiesForContainer(e) {
    return this.elementType?.properties.filter((t) => t.containerId === e).sort((t, i) => t.sortOrder - i.sortOrder) ?? [];
  }
  _getGroupsInContainer(e) {
    return this.elementType?.containers.filter((t) => t.type === "Group" && t.parentId === e).sort((t, i) => t.sortOrder - i.sortOrder) ?? [];
  }
  _getAllPropertiesForCurrentTab() {
    if (!this.elementType) return [];
    const e = this.activeTabId ?? null, t = this._getPropertiesForContainer(e), a = (e ? this._getGroupsInContainer(e) : []).flatMap((r) => this._getPropertiesForContainer(r.id));
    return [...t, ...a];
  }
  _onPropertyChange(e) {
    const t = e.target;
    t.alias && this.dispatchEvent(new CustomEvent("property-change", {
      detail: { alias: t.alias, value: t.value },
      bubbles: !0,
      composed: !0
    }));
  }
  render() {
    if (!this.elementType) return n;
    const e = this.activeTabId ?? null, t = e ? this._getGroupsInContainer(e) : [], i = this._getPropertiesForContainer(e), a = i.length > 0 || t.length > 0;
    return o`
      <div class="element-properties">
        ${a ? o`
          <umb-property-dataset
            .value=${this._datasetValue}
            @change=${this._onPropertyChange}>
            ${i.length > 0 ? o`
              <uui-box>
                ${this._renderProperties(i)}
              </uui-box>
            ` : n}

            ${t.map((r) => o`
              <uui-box headline=${r.name ?? ""}>
                ${this._renderProperties(this._getPropertiesForContainer(r.id))}
              </uui-box>
            `)}
          </umb-property-dataset>
        ` : o`
          <div class="empty-state">
            <p>No properties configured for this tab.</p>
          </div>
        `}
      </div>
    `;
  }
  _renderProperties(e) {
    return e.length === 0 ? n : e.map((t) => o`
      <umb-property
        alias=${t.alias}
        label=${t.name}
        description=${t.description ?? ""}
        property-editor-ui-alias=${t.propertyEditorUiAlias}
        .config=${this._getPropertyConfig(t)}
        ?mandatory=${t.mandatory}
        .validation=${{
      mandatory: t.mandatory,
      mandatoryMessage: t.mandatoryMessage ?? void 0
    }}>
      </umb-property>
    `);
  }
  _getPropertyConfig(e) {
    if (e.dataTypeConfiguration && typeof e.dataTypeConfiguration == "object")
      return e.dataTypeConfiguration;
  }
};
y.styles = C`
    :host {
      display: block;
    }

    .element-properties {
      display: flex;
      flex-direction: column;
      gap: var(--uui-size-space-5);
    }

    uui-box {
      --uui-box-default-padding: var(--uui-size-space-5);
    }

    .empty-state {
      padding: var(--uui-size-layout-2);
      text-align: center;
      color: var(--uui-color-text-alt);
    }

    .empty-state p {
      margin: 0;
    }
  `;
k([
  $({ attribute: !1 })
], y.prototype, "elementType", 2);
k([
  $({ attribute: !1 })
], y.prototype, "values", 2);
k([
  $({ type: String })
], y.prototype, "activeTabId", 2);
k([
  c()
], y.prototype, "_datasetValue", 2);
y = k([
  I("merchello-product-element-properties")
], y);
const E = new G(
  "Merchello.OptionEditor.Modal",
  {
    modal: {
      type: "sidebar",
      size: "medium"
    }
  }
);
var q = Object.defineProperty, Y = Object.getOwnPropertyDescriptor, w = (e, t, i, a) => {
  for (var r = a > 1 ? void 0 : a ? Y(t, i) : t, s = e.length - 1, u; s >= 0; s--)
    (u = e[s]) && (r = (a ? u(t, i, r) : u(r)) || r);
  return a && r && q(t, i, r), r;
};
let f = class extends S(P) {
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
    this.items = e, this.dispatchEvent(new W());
  }
  render() {
    return o`
      <div class="editable-list-container">
        ${this.items.length > 0 ? o`
              <ul class="item-list">
                ${this.items.map((e, t) => this._renderItem(e, t))}
              </ul>
            ` : n}

        ${this.readonly ? n : o`
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

        ${this.items.length === 0 && this.readonly ? o`<p class="empty-hint">No items added.</p>` : n}
      </div>
    `;
  }
  _renderItem(e, t) {
    return this._editingIndex === t ? o`
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
      ` : o`
      <li class="item-row">
        <span
          class="item-text ${this.readonly ? "" : "editable"}"
          @click=${() => !this.readonly && this._handleStartEdit(t)}
          @keydown=${(a) => a.key === "Enter" && !this.readonly && this._handleStartEdit(t)}
          tabindex=${this.readonly ? -1 : 0}
          role=${this.readonly ? n : "button"}
          aria-label=${this.readonly ? n : `Edit "${e}"`}>
          ${e}
        </span>
        ${this.readonly ? n : o`
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
f.styles = C`
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
w([
  $({ type: Array })
], f.prototype, "items", 2);
w([
  $({ type: String })
], f.prototype, "placeholder", 2);
w([
  $({ type: Boolean })
], f.prototype, "readonly", 2);
w([
  c()
], f.prototype, "_newItemValue", 2);
w([
  c()
], f.prototype, "_editingIndex", 2);
w([
  c()
], f.prototype, "_editingValue", 2);
f = w([
  I("merchello-editable-text-list")
], f);
var X = Object.defineProperty, J = Object.getOwnPropertyDescriptor, O = (e) => {
  throw TypeError(e);
}, p = (e, t, i, a) => {
  for (var r = a > 1 ? void 0 : a ? J(t, i) : t, s = e.length - 1, u; s >= 0; s--)
    (u = e[s]) && (r = (a ? u(t, i, r) : u(r)) || r);
  return a && r && X(t, i, r), r;
}, V = (e, t, i) => t.has(e) || O("Cannot " + i), l = (e, t, i) => (V(e, t, "read from private field"), t.get(e)), x = (e, t, i) => t.has(e) ? O("Cannot add the same private member more than once") : t instanceof WeakSet ? t.add(e) : t.set(e, i), D = (e, t, i, a) => (V(e, t, "write to private field"), t.set(e, i), i), T, h, _, g, v;
let d = class extends S(P) {
  constructor() {
    super(), this._product = null, this._isLoading = !0, this._isSaving = !1, this._errorMessage = null, this._optionSettings = null, this._validationAttempted = !1, this._fieldErrors = {}, this._routes = [], this._activePath = "", this._formData = {}, this._taxGroups = [], this._productTypes = [], this._warehouses = [], this._filterGroups = [], this._assignedFilterIds = [], this._originalAssignedFilterIds = [], this._elementType = null, this._elementPropertyValues = {}, this._productViews = [], this._descriptionEditorConfig = void 0, this._variantFormData = {}, this._variantFieldErrors = {}, x(this, T, new j(this)), x(this, h), x(this, _), x(this, g), x(this, v, !1), this.consumeContext(M, (e) => {
      D(this, h, e), l(this, h) && (this.observe(l(this, h).product, (t) => {
        this._product = t ?? null, t && (this._formData = { ...t }, t.variants.length === 1 && (this._variantFormData = { ...t.variants[0] }, this._loadAssignedFilters()), t.elementProperties && (this._elementPropertyValues = { ...t.elementProperties })), this._isLoading = !t;
      }), this.observe(l(this, h).elementType, (t) => {
        this._elementType = t;
      }), this.observe(l(this, h).elementPropertyValues, (t) => {
        this._elementPropertyValues = t;
      }));
    }), this.consumeContext(U, (e) => {
      D(this, _, e);
    }), this.consumeContext(N, (e) => {
      D(this, g, e);
    });
  }
  connectedCallback() {
    super.connectedCallback(), D(this, v, !0), this._loadReferenceData(), this._createRoutes();
  }
  disconnectedCallback() {
    super.disconnectedCallback(), D(this, v, !1);
  }
  async _loadReferenceData() {
    try {
      const [e, t, i, a, r, s, u] = await Promise.all([
        m.getTaxGroups(),
        m.getProductTypes(),
        m.getWarehouses(),
        m.getProductOptionSettings(),
        m.getDescriptionEditorSettings(),
        m.getFilterGroups(),
        m.getProductViews()
      ]);
      if (!l(this, v) || (e.data && (this._taxGroups = e.data), t.data && (this._productTypes = t.data), i.data && (this._warehouses = i.data), a.data && (this._optionSettings = a.data), s.data && (this._filterGroups = s.data), u.data && (this._productViews = u.data), r.data?.dataTypeKey && (await this._loadDataTypeConfig(r.data.dataTypeKey), !l(this, v))))
        return;
      await this._loadAssignedFilters(), await l(this, h)?.loadElementType();
    } catch (e) {
      console.error("Failed to load reference data:", e);
    }
  }
  /**
   * Loads filters assigned to the current product variant
   * Note: Filters are assigned to Products (variants), not ProductRoots
   * Only applicable for single-variant products
   */
  async _loadAssignedFilters() {
    if (!this._isSingleVariant()) return;
    const e = this._product?.variants[0]?.id;
    if (!e || l(this, h)?.isNew) return;
    const { data: t } = await m.getFiltersForProduct(e);
    if (l(this, v) && t) {
      const i = t.map((a) => a.id);
      this._assignedFilterIds = i, this._originalAssignedFilterIds = [...i];
    }
  }
  /**
   * Fetches the DataType configuration using Umbraco's DataType repository.
   * This handles authentication automatically through Umbraco's internal mechanisms.
   */
  async _loadDataTypeConfig(e) {
    try {
      console.log("[Merchello] Loading DataType config for:", e);
      const { data: t, error: i } = await l(this, T).requestByUnique(e);
      if (i) {
        console.error("[Merchello] Error requesting DataType:", i), this._setFallbackEditorConfig();
        return;
      }
      console.log("[Merchello] DataType request result:", t), this.observe(
        await l(this, T).byUnique(e),
        (a) => {
          if (console.log("[Merchello] DataType observed:", a), !l(this, v)) return;
          if (!a) {
            console.warn("[Merchello] DataType not found, using fallback config"), this._setFallbackEditorConfig();
            return;
          }
          console.log("[Merchello] DataType values:", a.values), console.log("[Merchello] DataType values detail:", JSON.stringify(a.values, null, 2));
          const r = a.values?.some((u) => u.alias === "extensions"), s = a.values?.some((u) => u.alias === "toolbar");
          console.log("[Merchello] Has extensions:", r, "Has toolbar:", s), r || console.warn("[Merchello] DataType is missing 'extensions' config. Delete it in Settings > Data Types and restart to recreate."), this._descriptionEditorConfig = new F(a.values);
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
    console.log("[Merchello] Using fallback TipTap configuration"), this._descriptionEditorConfig = new F([
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
        path: "tab/basic-info",
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
        path: "tab/feed",
        component: e
      },
      {
        path: "tab/stock",
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
        path: "tab/filters",
        component: e
      },
      // Element Type content tabs (dynamic based on configuration)
      {
        path: "tab/content",
        component: e
      },
      {
        path: "tab/content-:tabId",
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
    if (this._activePath.includes("tab/basic-info")) return "basic-info";
    if (this._activePath.includes("tab/media")) return "media";
    if (this._activePath.includes("tab/shipping")) return "shipping";
    if (this._activePath.includes("tab/seo")) return "seo";
    if (this._activePath.includes("tab/feed")) return "feed";
    if (this._activePath.includes("tab/stock")) return "stock";
    if (this._activePath.includes("tab/variants")) return "variants";
    if (this._activePath.includes("tab/options")) return "options";
    if (this._activePath.includes("tab/filters")) return "filters";
    if (this._activePath.includes("tab/content-")) {
      const e = this._activePath.match(/tab\/content-([a-f0-9-]+)/i);
      if (e) return `content-${e[1]}`;
    }
    return this._activePath.includes("tab/content") ? "content" : "details";
  }
  /**
   * Gets Element Type tabs (containers of type "Tab" at the root level)
   */
  _getElementTypeTabs() {
    return this._elementType ? this._elementType.containers.filter((e) => e.type === "Tab" && !e.parentId).sort((e, t) => e.sortOrder - t.sortOrder) : [];
  }
  /**
   * Checks if the current active tab is a content tab
   */
  _isContentTab(e) {
    return e === "content" || e.startsWith("content-");
  }
  /**
   * Gets the Element Type tab ID from the active tab string
   */
  _getContentTabId(e) {
    if (e !== "content" && e.startsWith("content-"))
      return e.replace("content-", "");
  }
  /**
   * Checks if there are validation errors on the details tab
   */
  _hasDetailsErrors() {
    return !!(this._fieldErrors.rootName || this._fieldErrors.taxGroupId || this._fieldErrors.productTypeId || this._fieldErrors.warehouseIds);
  }
  /**
   * Checks if this product has only one variant (simple product)
   * Single-variant products show merged tabs instead of the Variants tab
   */
  _isSingleVariant() {
    return (this._product?.variants.length ?? 0) === 1;
  }
  /**
   * Checks if there are validation errors on the basic info tab (single-variant mode)
   */
  _hasBasicInfoErrors() {
    return !!(this._variantFieldErrors.sku || this._variantFieldErrors.price);
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
  _getViewOptions() {
    return this._productViews.map((e) => ({
      name: e.alias,
      value: e.alias,
      selected: e.alias === this._formData.viewAlias
    }));
  }
  _handleViewChange(e) {
    const t = e.target;
    this._formData = { ...this._formData, viewAlias: t.value };
  }
  async _handleSave() {
    if (this._validateForm()) {
      this._isSaving = !0, this._errorMessage = null;
      try {
        l(this, h)?.isNew ?? !0 ? await this._createProduct() : await this._updateProduct();
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
        sku: this._variantFormData.sku ?? void 0,
        price: this._variantFormData.price ?? 0,
        costOfGoods: this._variantFormData.costOfGoods ?? 0
      }
    }, { data: t, error: i } = await m.createProduct(e);
    if (i) {
      this._errorMessage = i.message, l(this, g)?.peek("danger", { data: { headline: "Failed to create product", message: i.message } });
      return;
    }
    t && (l(this, h)?.updateProduct(t), l(this, g)?.peek("positive", { data: { headline: "Product created", message: `"${t.rootName}" has been created successfully` } }), this._validationAttempted = !1, this._fieldErrors = {});
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
      defaultPackageConfigurations: this._formData.defaultPackageConfigurations,
      // View alias for front-end rendering
      viewAlias: this._formData.viewAlias,
      // Element Type property values
      elementProperties: Object.keys(this._elementPropertyValues).length > 0 ? this._elementPropertyValues : void 0
    }, { data: t, error: i } = await m.updateProduct(this._product.id, e);
    if (i) {
      this._errorMessage = i.message, l(this, g)?.peek("danger", { data: { headline: "Failed to save product", message: i.message } });
      return;
    }
    if (this._isSingleVariant() && this._product.variants[0]) {
      const a = await this._saveVariantData(this._product.id, this._product.variants[0].id);
      if (a) {
        this._errorMessage = a.message, l(this, g)?.peek("danger", { data: { headline: "Failed to save variant data", message: a.message } });
        return;
      }
    }
    this._isSingleVariant() && await this._saveFilterAssignments(), t && (await l(this, h)?.reload(), l(this, g)?.peek("positive", { data: { headline: "Product saved", message: "Changes have been saved successfully" } }));
  }
  /**
   * Saves variant data for single-variant products
   */
  async _saveVariantData(e, t) {
    const i = {
      sku: this._variantFormData.sku ?? void 0,
      gtin: this._variantFormData.gtin ?? void 0,
      supplierSku: this._variantFormData.supplierSku ?? void 0,
      price: this._variantFormData.price,
      costOfGoods: this._variantFormData.costOfGoods,
      onSale: this._variantFormData.onSale,
      previousPrice: this._variantFormData.previousPrice ?? void 0,
      availableForPurchase: this._variantFormData.availableForPurchase,
      canPurchase: this._variantFormData.canPurchase,
      url: this._variantFormData.url ?? void 0,
      hsCode: this._variantFormData.hsCode ?? void 0,
      // Shopping feed
      shoppingFeedTitle: this._variantFormData.shoppingFeedTitle ?? void 0,
      shoppingFeedDescription: this._variantFormData.shoppingFeedDescription ?? void 0,
      shoppingFeedColour: this._variantFormData.shoppingFeedColour ?? void 0,
      shoppingFeedMaterial: this._variantFormData.shoppingFeedMaterial ?? void 0,
      shoppingFeedSize: this._variantFormData.shoppingFeedSize ?? void 0,
      removeFromFeed: this._variantFormData.removeFromFeed,
      // Warehouse stock settings
      warehouseStock: this._variantFormData.warehouseStock?.map((r) => ({
        warehouseId: r.warehouseId,
        stock: r.stock,
        reorderPoint: r.reorderPoint,
        trackStock: r.trackStock
      }))
    }, { error: a } = await m.updateVariant(e, t, i);
    return a ?? null;
  }
  /**
   * Validates the form and sets field-level errors
   */
  _validateForm() {
    this._validationAttempted = !0, this._fieldErrors = {}, this._variantFieldErrors = {}, this._errorMessage = null, this._formData.rootName?.trim() || (this._fieldErrors.rootName = "Product name is required"), this._formData.taxGroupId || (this._fieldErrors.taxGroupId = "Tax group is required"), this._formData.productTypeId || (this._fieldErrors.productTypeId = "Product type is required"), !this._formData.isDigitalProduct && (!this._formData.warehouseIds || this._formData.warehouseIds.length === 0) && (this._fieldErrors.warehouseIds = "At least one warehouse is required for physical products"), this._isSingleVariant() && (this._variantFormData.sku?.trim() || (this._variantFieldErrors.sku = "SKU is required"), (this._variantFormData.price ?? 0) < 0 && (this._variantFieldErrors.price = "Price must be 0 or greater"));
    const e = Object.keys(this._fieldErrors).length > 0, t = Object.keys(this._variantFieldErrors).length > 0;
    if (e || t) {
      const i = [];
      e && i.push("Details"), t && i.push("Basic Info"), this._errorMessage = `Please fix the errors on the ${i.join(" and ")} tab${i.length > 1 ? "s" : ""} before saving`;
    }
    return !e && !t;
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
    const e = this._product?.variants.length ?? 0, t = this._product?.productOptions.length ?? 0, i = this._isSingleVariant(), a = this._getActiveTab(), r = this._getTabHint("details"), s = this._getTabHint("variants"), u = this._getTabHint("options");
    return o`
      <uui-tab-group slot="header">
        <uui-tab
          label="Details"
          href="${this._routerPath}/tab/details"
          ?active=${a === "details"}>
          Details
          ${r ? o`<uui-badge slot="extra" color="danger" attention>!</uui-badge>` : n}
        </uui-tab>

        ${i ? o`
              <uui-tab
                label="Basic Info"
                href="${this._routerPath}/tab/basic-info"
                ?active=${a === "basic-info"}>
                Basic Info
                ${this._validationAttempted && this._hasBasicInfoErrors() ? o`<uui-badge slot="extra" color="danger" attention>!</uui-badge>` : n}
              </uui-tab>
            ` : n}

        <uui-tab
          label="Media"
          href="${this._routerPath}/tab/media"
          ?active=${a === "media"}>
          Media
        </uui-tab>

        ${this._formData.isDigitalProduct ? n : o`
              <uui-tab
                label="Shipping"
                href="${this._routerPath}/tab/shipping"
                ?active=${a === "shipping"}>
                Shipping
              </uui-tab>
            `}

        <uui-tab
          label="SEO"
          href="${this._routerPath}/tab/seo"
          ?active=${a === "seo"}>
          SEO
        </uui-tab>

        ${i ? o`
              <uui-tab
                label="Shopping Feed"
                href="${this._routerPath}/tab/feed"
                ?active=${a === "feed"}>
                Shopping Feed
              </uui-tab>
            ` : n}

        ${i ? o`
              <uui-tab
                label="Stock"
                href="${this._routerPath}/tab/stock"
                ?active=${a === "stock"}>
                Stock
              </uui-tab>
            ` : n}

        ${e > 1 ? o`
              <uui-tab
                label="Variants"
                href="${this._routerPath}/tab/variants"
                ?active=${a === "variants"}>
                Variants (${e})
                ${s ? o`<uui-badge slot="extra" color="warning">!</uui-badge>` : n}
              </uui-tab>
            ` : n}

        <uui-tab
          label="Options"
          href="${this._routerPath}/tab/options"
          ?active=${a === "options"}>
          Options (${t})
          ${u ? o`<uui-badge slot="extra" color="warning">!</uui-badge>` : n}
        </uui-tab>

        ${i ? o`
              <uui-tab
                label="Filters"
                href="${this._routerPath}/tab/filters"
                ?active=${a === "filters"}>
                Filters
              </uui-tab>
            ` : n}

        ${this._renderElementTypeTabs(a)}
      </uui-tab-group>
    `;
  }
  /**
   * Renders the Element Type tabs with visual divider
   */
  _renderElementTypeTabs(e) {
    if (!this._elementType) return n;
    const t = this._getElementTypeTabs();
    return o`
      <!-- Visual Divider between Merchello tabs and Element Type tabs -->
      <div class="tab-section-divider" title="Content Properties">
        <span class="divider-line"></span>
        <span class="divider-label">Content</span>
      </div>

      ${t.length > 0 ? t.map((i) => o`
            <uui-tab
              label=${i.name ?? "Content"}
              href="${this._routerPath}/tab/content-${i.id}"
              ?active=${e === `content-${i.id}`}>
              ${i.name ?? "Content"}
            </uui-tab>
          `) : o`
            <!-- Single "Content" tab if element type has no tabs defined -->
            <uui-tab
              label="Content"
              href="${this._routerPath}/tab/content"
              ?active=${e === "content"}>
              Content
            </uui-tab>
          `}
    `;
  }
  /**
   * Renders the content tab with Element Type properties
   */
  _renderContentTab(e) {
    if (!this._elementType) return n;
    const t = this._getContentTabId(e);
    return o`
      <div class="tab-content">
        <merchello-product-element-properties
          .elementType=${this._elementType}
          .values=${this._elementPropertyValues}
          .activeTabId=${t}
          @property-change=${this._onElementPropertyChange}>
        </merchello-product-element-properties>
      </div>
    `;
  }
  /**
   * Handles property value changes from the element properties component
   */
  _onElementPropertyChange(e) {
    const { alias: t, value: i } = e.detail;
    this._elementPropertyValues = { ...this._elementPropertyValues, [t]: i }, l(this, h)?.setElementPropertyValue(t, i);
  }
  _renderDetailsTab() {
    const e = l(this, h)?.isNew ?? !0;
    return o`
      <div class="tab-content">
        ${e ? o`
              <uui-box class="info-banner">
                <div class="info-content">
                  <uui-icon name="icon-lightbulb"></uui-icon>
                  <div>
                    <strong>Getting Started</strong>
                    <p>Fill in the basic product information below. You can add variants and options after creating the product.</p>
                  </div>
                </div>
              </uui-box>
            ` : n}

        ${this._errorMessage ? o`
              <uui-box class="error-box">
                <div class="error-message">
                  <uui-icon name="icon-alert"></uui-icon>
                  <span>${this._errorMessage}</span>
                </div>
              </uui-box>
            ` : n}

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
            label="Product View"
            description="Select the view template used to render this product on the front-end">
            ${this._productViews.length > 0 ? o`
                  <uui-select
                    slot="editor"
                    .options=${this._getViewOptions()}
                    @change=${this._handleViewChange}>
                  </uui-select>
                ` : o`
                  <div slot="editor" style="color: var(--uui-color-text-alt); font-style: italic;">
                    No views found. Add .cshtml files to ~/Views/Products/
                  </div>
                `}
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

        ${this._formData.isDigitalProduct ? n : o`
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
    return o`
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
    const e = this._formData.defaultPackageConfigurations ?? [], t = l(this, h)?.isNew ?? !0;
    return o`
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
          ${e.length > 0 ? o`
                <div class="packages-list">
                  ${e.map((i, a) => this._renderPackageCard(i, a))}
                </div>
              ` : o`
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
    return o`
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
    return this._descriptionEditorConfig ? o`
      <umb-input-tiptap
        .configuration=${this._descriptionEditorConfig}
        .value=${this._formData.description || ""}
        @change=${this._handleDescriptionChange}>
      </umb-input-tiptap>
    ` : o`<uui-loader-bar></uui-loader-bar>`;
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
    return o`
      <umb-input-rich-media
        .value=${t}
        ?multiple=${!0}
        @change=${this._handleMediaChange}>
      </umb-input-rich-media>
      ${e.length === 0 ? o`
        <div class="empty-media-state">
          <uui-icon name="icon-picture"></uui-icon>
          <p>No images added yet</p>
          <small>Click the button above to add product images</small>
        </div>
      ` : n}
    `;
  }
  _handleMediaChange(e) {
    const a = (e.target?.value || []).map((r) => r.mediaKey).filter(Boolean);
    this._formData = { ...this._formData, rootImages: a };
  }
  _renderSeoTab() {
    const e = this._formData.openGraphImage ? [{ key: this._formData.openGraphImage, mediaKey: this._formData.openGraphImage }] : [];
    return o`
      <div class="tab-content">
        <uui-box headline="Search Engine Optimization">
          <umb-property-layout
            label="Product URL"
            description="The URL path for this product on your storefront">
            <uui-input
              slot="editor"
              .value=${this._formData.rootUrl || ""}
              @input=${(t) => this._handleInputChange("rootUrl", t.target.value)}
              placeholder="/products/my-product">
            </uui-input>
          </umb-property-layout>

          ${this._isSingleVariant() ? o`
                <umb-property-layout
                  label="Variant URL Slug"
                  description="Custom URL path for this variant">
                  <uui-input
                    slot="editor"
                    .value=${this._variantFormData.url || ""}
                    @input=${(t) => this._variantFormData = { ...this._variantFormData, url: t.target.value }}
                    placeholder="/products/my-product/default">
                  </uui-input>
                </umb-property-layout>
              ` : n}

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
              ${this._formData.openGraphImage ? n : o`
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
    const e = this._formData.pageTitle || this._formData.rootName || "Product Title", t = this._formData.metaDescription || "No meta description set. Add a description to improve search visibility.", i = this._formData.canonicalUrl || "https://yourstore.com/products/product-name", a = this._formatUrlAsBreadcrumb(i), r = 60, s = 160, u = e.length > r, b = t.length > s, z = u ? e.substring(0, r - 3) + "..." : e, A = b ? t.substring(0, s - 3) + "..." : t;
    return o`
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
          Title: ${e.length}/${r} chars ${u ? "(will be truncated)" : ""}
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
    return o`
      <div class="warehouse-toggle-list">
        ${this._warehouses.map(
      (t) => o`
            <div class="toggle-field">
              <uui-toggle
                .checked=${e.includes(t.id)}
                @change=${(i) => this._handleWarehouseToggle(t.id, i.target.checked)}>
              </uui-toggle>
              <label>${t.name} ${t.code ? `(${t.code})` : ""}</label>
            </div>
          `
    )}
        ${this._warehouses.length === 0 ? o`<p class="hint">No warehouses available. Create a warehouse first.</p>` : n}
      </div>
    `;
  }
  _handleWarehouseToggle(e, t) {
    const i = this._formData.warehouseIds || [];
    t ? this._formData = { ...this._formData, warehouseIds: [...i, e] } : this._formData = { ...this._formData, warehouseIds: i.filter((a) => a !== e) };
  }
  _renderVariantsTab() {
    const e = this._product?.variants ?? [];
    return o`
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
    const t = this._product ? L(this._product.id, e.id) : "", i = this._getVariantOptionDescription(e);
    return o`
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
            ${i ? o`<span class="variant-options-text">${i}</span>` : n}
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
    for (const r of i)
      for (const s of this._product.productOptions) {
        const u = s.values.find((b) => b.id === r);
        if (u) {
          a.push(u.name);
          break;
        }
      }
    return a.length > 0 ? a.join(" / ") : null;
  }
  async _handleSetDefaultVariant(e) {
    if (!this._product || this._product.variants.find((r) => r.id === e)?.default) return;
    const i = this._product.id;
    console.log("Setting default variant:", { productRootId: i, variantId: e });
    const a = this._product.variants.map((r) => ({
      ...r,
      default: r.id === e
    }));
    this._product = { ...this._product, variants: a };
    try {
      const { error: r } = await m.setDefaultVariant(i, e);
      console.log("API response:", { error: r }), r ? (console.error("Failed to set default variant:", r), l(this, g)?.peek("danger", { data: { headline: "Failed to set default variant", message: r.message } }), await l(this, h)?.reload()) : (l(this, g)?.peek("positive", { data: { headline: "Default variant updated", message: "" } }), await l(this, h)?.reload(), console.log("After reload, variants:", this._product?.variants.map((s) => ({ id: s.id, name: s.name, default: s.default }))));
    } catch (r) {
      console.error("Failed to set default variant:", r), l(this, g)?.peek("danger", { data: { headline: "Error", message: "An unexpected error occurred" } }), await l(this, h)?.reload();
    }
  }
  /**
   * Renders the Basic Info tab for single-variant products using shared component
   */
  _renderBasicInfoTab() {
    return o`
      <div class="tab-content">
        <merchello-variant-basic-info
          .formData=${this._variantFormData}
          .fieldErrors=${this._variantFieldErrors}
          @variant-change=${(e) => this._variantFormData = e.detail}>
        </merchello-variant-basic-info>
      </div>
    `;
  }
  /**
   * Renders the Shopping Feed tab for single-variant products using shared component
   */
  _renderShoppingFeedTab() {
    return o`
      <div class="tab-content">
        <merchello-variant-feed-settings
          .formData=${this._variantFormData}
          @variant-change=${(e) => this._variantFormData = e.detail}>
        </merchello-variant-feed-settings>
      </div>
    `;
  }
  /**
   * Renders the Stock tab for single-variant products using shared component
   */
  _renderStockTab() {
    return o`
      <div class="tab-content">
        <merchello-variant-stock-display
          .warehouseStock=${this._variantFormData.warehouseStock ?? []}
          @stock-settings-change=${this._handleStockSettingsChange}>
        </merchello-variant-stock-display>
      </div>
    `;
  }
  _handleStockSettingsChange(e) {
    const { warehouseId: t, stock: i, reorderPoint: a, trackStock: r } = e.detail, s = (this._variantFormData.warehouseStock ?? []).map((u) => u.warehouseId !== t ? u : {
      ...u,
      ...i !== void 0 && { stock: i },
      ...a !== void 0 && { reorderPoint: a },
      ...r !== void 0 && { trackStock: r }
    });
    this._variantFormData = { ...this._variantFormData, warehouseStock: s };
  }
  _renderOptionsTab() {
    const e = this._formData.productOptions ?? [], t = l(this, h)?.isNew ?? !0, i = e.filter((u) => u.isVariant), a = i.reduce((u, b) => u * (b.values.length || 1), i.length > 0 ? 1 : 0), r = this._optionSettings?.maxProductOptions ?? 5, s = e.length >= r;
    return o`
      <div class="tab-content">
        ${t ? o`
              <uui-box class="info-banner warning">
                <div class="info-content">
                  <uui-icon name="icon-alert"></uui-icon>
                  <div>
                    <strong>Save Required</strong>
                    <p>You must save the product before adding options.</p>
                  </div>
                </div>
              </uui-box>
            ` : o`
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
            <h3>Product Options <span class="option-count">${e.length}/${r}</span></h3>
            ${a > 0 ? o`<small class="hint">Will generate ${a} variant${a !== 1 ? "s" : ""}</small>` : n}
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

        ${e.length > 0 ? o` <div class="options-list">${e.map((u) => this._renderOptionCard(u))}</div> ` : t ? n : o`
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
    return o`
      <uui-box class="option-card">
        <div class="option-header">
          <div class="option-info">
            <strong>${e.name}</strong>
            <span class="badge ${e.isVariant ? "badge-positive" : "badge-default"}">
              ${e.isVariant ? "Generates Variants" : "Add-on"}
            </span>
            ${e.optionUiAlias ? o` <span class="badge badge-default">${e.optionUiAlias}</span> ` : n}
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
          ${e.values.length === 0 ? o`<p class="hint">No values added yet</p>` : n}
        </div>
      </uui-box>
    `;
  }
  _renderOptionValue(e, t) {
    return o`
      <div class="option-value-chip">
        ${t === "colour" && e.hexValue ? o` <span class="color-swatch" style="background-color: ${e.hexValue}"></span> ` : n}
        <span>${e.name}</span>
        ${e.priceAdjustment !== 0 ? o`
              <span class="price-adjustment">
                ${e.priceAdjustment > 0 ? "+" : ""}$${e.priceAdjustment.toFixed(2)}
              </span>
            ` : n}
      </div>
    `;
  }
  async _addNewOption() {
    if (!l(this, _) || !this._optionSettings) return;
    const t = await l(this, _).open(this, E, {
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
    if (!l(this, _) || !this._optionSettings) return;
    const i = await l(this, _).open(this, E, {
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
        const a = this._formData.productOptions || [], r = a.findIndex((s) => s.id === e.id);
        r !== -1 && (a[r] = i.option, this._formData = { ...this._formData, productOptions: [...a] }, await this._saveOptions());
      }
    }
  }
  async _deleteOption(e) {
    const i = this._formData.productOptions?.find((s) => s.id === e)?.name || "this option";
    if (!confirm(`Are you sure you want to delete "${i}"? This action cannot be undone.`)) return;
    const r = (this._formData.productOptions || []).filter((s) => s.id !== e);
    this._formData = { ...this._formData, productOptions: r }, await this._saveOptions();
  }
  /**
   * Confirms with user before saving options that will regenerate variants.
   * Returns true if user confirms or no confirmation needed, false if cancelled.
   */
  _confirmVariantRegeneration() {
    const t = (this._formData.productOptions || []).filter((r) => r.isVariant), i = this._product?.variants.length ?? 0, a = t.length > 0 ? t.reduce((r, s) => r * (s.values.length || 1), 1) : 1;
    if (i > 0 && t.length > 0) {
      const r = `⚠️ WARNING: Saving these options will regenerate all product variants.

Current variants: ${i}
New variants to create: ${a}

This will DELETE all existing variants and create new ones.
Any variant-specific data (pricing, stock levels, images, SKUs) will need to be re-entered manually.

Are you sure you want to continue?`;
      return confirm(r);
    }
    if (i > 1 && t.length === 0) {
      const r = `⚠️ WARNING: Removing all variant options will collapse this product to a single variant.

Current variants: ${i}
After save: 1 variant (default only)

${i - 1} variants will be DELETED.
Only the default variant will be kept.

Are you sure you want to continue?`;
      return confirm(r);
    }
    return !0;
  }
  async _saveOptions() {
    if (this._product?.id) {
      if (!this._confirmVariantRegeneration()) {
        l(this, h)?.reload();
        return;
      }
      try {
        const e = (this._formData.productOptions || []).map((a, r) => ({
          id: a.id,
          name: a.name,
          alias: a.alias ?? void 0,
          sortOrder: r,
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
        l(this, g)?.peek("default", { data: { headline: "Saving options...", message: "Variants will be regenerated" } });
        const { data: t, error: i } = await m.saveProductOptions(this._product.id, e);
        if (!l(this, v)) return;
        !i && t ? (this._formData = { ...this._formData, productOptions: t }, l(this, g)?.peek("positive", { data: { headline: "Options saved", message: "Variants have been regenerated" } }), l(this, h)?.reload()) : i && (console.error("Failed to save options:", i), this._errorMessage = "Failed to save options: " + i.message, l(this, g)?.peek("danger", { data: { headline: "Failed to save options", message: i.message } }));
      } catch (e) {
        if (!l(this, v)) return;
        console.error("Failed to save options:", e), this._errorMessage = e instanceof Error ? e.message : "Failed to save options", l(this, g)?.peek("danger", { data: { headline: "Error", message: "An unexpected error occurred" } });
      }
    }
  }
  /**
   * Renders the Filters tab for assigning filters to the product
   */
  _renderFiltersTab() {
    if (l(this, h)?.isNew ?? !0)
      return o`
        <div class="tab-content">
          <uui-box class="info-banner warning">
            <div class="info-content">
              <uui-icon name="icon-alert"></uui-icon>
              <div>
                <strong>Save Required</strong>
                <p>You must save the product before assigning filters.</p>
              </div>
            </div>
          </uui-box>
        </div>
      `;
    if (this._filterGroups.length === 0)
      return o`
        <div class="tab-content">
          <uui-box class="info-banner">
            <div class="info-content">
              <uui-icon name="icon-info"></uui-icon>
              <div>
                <strong>No Filter Groups</strong>
                <p>No filter groups have been created yet. Go to <a href="/section/merchello/workspace/merchello-filters">Filters</a> to create filter groups and filter values.</p>
              </div>
            </div>
          </uui-box>
        </div>
      `;
    const t = this._assignedFilterIds.length;
    return o`
      <div class="tab-content">
        <uui-box class="info-banner">
          <div class="info-content">
            <uui-icon name="icon-info"></uui-icon>
            <div>
              <strong>Assign Filters</strong>
              <p>Select the filters that apply to this product. Filters help customers find products on your storefront. ${t > 0 ? `${t} filter${t > 1 ? "s" : ""} assigned.` : ""}</p>
            </div>
          </div>
        </uui-box>

        ${this._filterGroups.map((i) => this._renderFilterGroupSection(i))}
      </div>
    `;
  }
  /**
   * Renders a filter group section with checkboxes for each filter
   */
  _renderFilterGroupSection(e) {
    return !e.filters || e.filters.length === 0 ? n : o`
      <uui-box headline=${e.name}>
        <div class="filter-checkbox-list">
          ${e.filters.map((t) => {
      const i = this._assignedFilterIds.includes(t.id);
      return o`
              <div class="filter-checkbox-item">
                <uui-checkbox
                  label=${t.name}
                  ?checked=${i}
                  @change=${(a) => this._handleFilterToggle(t.id, a.target.checked)}>
                  ${t.hexColour ? o`<span class="filter-color-swatch" style="background: ${t.hexColour}"></span>` : n}
                  ${t.name}
                </uui-checkbox>
              </div>
            `;
    })}
        </div>
      </uui-box>
    `;
  }
  /**
   * Handles filter checkbox toggle
   */
  _handleFilterToggle(e, t) {
    t ? this._assignedFilterIds = [...this._assignedFilterIds, e] : this._assignedFilterIds = this._assignedFilterIds.filter((i) => i !== e);
  }
  /**
   * Checks if filter assignments have changed
   */
  _hasFilterChanges() {
    if (this._assignedFilterIds.length !== this._originalAssignedFilterIds.length) return !0;
    const e = [...this._assignedFilterIds].sort(), t = [...this._originalAssignedFilterIds].sort();
    return e.some((i, a) => i !== t[a]);
  }
  /**
   * Saves filter assignments for the product variant
   * Note: Filters are assigned to Products (variants), not ProductRoots
   * Only applicable for single-variant products
   */
  async _saveFilterAssignments() {
    if (!this._isSingleVariant()) return;
    const e = this._product?.variants[0]?.id;
    if (!e || !this._hasFilterChanges()) return;
    const { error: t } = await m.assignFiltersToProduct(e, this._assignedFilterIds);
    if (t) {
      l(this, g)?.peek("danger", {
        data: { headline: "Failed to save filters", message: t.message }
      });
      return;
    }
    this._originalAssignedFilterIds = [...this._assignedFilterIds];
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
      return o`
        <umb-body-layout header-fit-height>
          <div class="loading">
            <uui-loader></uui-loader>
          </div>
        </umb-body-layout>
      `;
    const e = l(this, h)?.isNew ?? !0, t = this._getActiveTab();
    return o`
      <umb-body-layout header-fit-height main-no-padding>
        <!-- Header: back button + icon + name input -->
        <uui-button slot="header" compact href=${B()} label="Back" class="back-button">
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

          ${t === "details" ? this._renderDetailsTab() : n}
          ${t === "basic-info" && this._isSingleVariant() ? this._renderBasicInfoTab() : n}
          ${t === "media" ? this._renderMediaTab() : n}
          ${t === "shipping" ? this._renderShippingTab() : n}
          ${t === "seo" ? this._renderSeoTab() : n}
          ${t === "feed" && this._isSingleVariant() ? this._renderShoppingFeedTab() : n}
          ${t === "stock" && this._isSingleVariant() ? this._renderStockTab() : n}
          ${t === "variants" ? this._renderVariantsTab() : n}
          ${t === "options" ? this._renderOptionsTab() : n}
          ${t === "filters" && this._isSingleVariant() ? this._renderFiltersTab() : n}
          ${this._isContentTab(t) ? this._renderContentTab(t) : n}
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
T = /* @__PURE__ */ new WeakMap();
h = /* @__PURE__ */ new WeakMap();
_ = /* @__PURE__ */ new WeakMap();
g = /* @__PURE__ */ new WeakMap();
v = /* @__PURE__ */ new WeakMap();
d.styles = [
  R,
  C`
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

      /* Fix badge overflow on tabs */
      uui-tab {
        overflow: visible;
      }

      uui-tab::part(button) {
        overflow: visible;
      }

      /* Tab Section Divider - separates Merchello tabs from Element Type tabs */
      .tab-section-divider {
        display: flex;
        align-items: center;
        padding: 0 var(--uui-size-space-4);
        height: 100%;
        gap: var(--uui-size-space-2);
      }

      .tab-section-divider .divider-line {
        width: 1px;
        height: 24px;
        background-color: var(--uui-color-border-standalone);
      }

      .tab-section-divider .divider-label {
        font-size: var(--uui-type-small-size);
        color: var(--uui-color-text-alt);
        text-transform: uppercase;
        letter-spacing: 0.5px;
        font-weight: 600;
        white-space: nowrap;
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

      /* Filter checkbox list */
      .filter-checkbox-list {
        display: flex;
        flex-direction: column;
        gap: var(--uui-size-space-3);
      }

      .filter-checkbox-item {
        display: flex;
        align-items: center;
      }

      .filter-checkbox-item uui-checkbox {
        display: flex;
        align-items: center;
        gap: var(--uui-size-space-2);
      }

      .filter-color-swatch {
        display: inline-block;
        width: 16px;
        height: 16px;
        border-radius: var(--uui-border-radius);
        border: 1px solid var(--uui-color-border);
        margin-right: var(--uui-size-space-1);
        vertical-align: middle;
      }
    `
];
p([
  c()
], d.prototype, "_product", 2);
p([
  c()
], d.prototype, "_isLoading", 2);
p([
  c()
], d.prototype, "_isSaving", 2);
p([
  c()
], d.prototype, "_errorMessage", 2);
p([
  c()
], d.prototype, "_optionSettings", 2);
p([
  c()
], d.prototype, "_validationAttempted", 2);
p([
  c()
], d.prototype, "_fieldErrors", 2);
p([
  c()
], d.prototype, "_routes", 2);
p([
  c()
], d.prototype, "_routerPath", 2);
p([
  c()
], d.prototype, "_activePath", 2);
p([
  c()
], d.prototype, "_formData", 2);
p([
  c()
], d.prototype, "_taxGroups", 2);
p([
  c()
], d.prototype, "_productTypes", 2);
p([
  c()
], d.prototype, "_warehouses", 2);
p([
  c()
], d.prototype, "_filterGroups", 2);
p([
  c()
], d.prototype, "_assignedFilterIds", 2);
p([
  c()
], d.prototype, "_originalAssignedFilterIds", 2);
p([
  c()
], d.prototype, "_elementType", 2);
p([
  c()
], d.prototype, "_elementPropertyValues", 2);
p([
  c()
], d.prototype, "_productViews", 2);
p([
  c()
], d.prototype, "_descriptionEditorConfig", 2);
p([
  c()
], d.prototype, "_variantFormData", 2);
p([
  c()
], d.prototype, "_variantFieldErrors", 2);
d = p([
  I("merchello-product-detail")
], d);
const pe = d;
export {
  d as MerchelloProductDetailElement,
  pe as default
};
//# sourceMappingURL=product-detail.element-mIF3nh1A.js.map
