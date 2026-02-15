import { LitElement as C, nothing as l, html as o, css as E, property as x, state as c, customElement as F } from "@umbraco-cms/backoffice/external/lit";
import { UmbElementMixin as O } from "@umbraco-cms/backoffice/element-api";
import { UMB_WORKSPACE_CONTEXT as G } from "@umbraco-cms/backoffice/workspace";
import { UmbModalToken as U, UMB_MODAL_MANAGER_CONTEXT as R, UMB_CONFIRM_MODAL as V } from "@umbraco-cms/backoffice/modal";
import { UMB_NOTIFICATION_CONTEXT as L } from "@umbraco-cms/backoffice/notification";
import { M as f } from "./merchello-api-DNSJzonx.js";
import "@umbraco-cms/backoffice/property";
import { b as B } from "./badge.styles-B9Lnx6kD.js";
import { s as j, t as K } from "./navigation-BGhEgega.js";
import { a as I } from "./formatting-YHMza1vS.js";
import { UmbChangeEvent as W } from "@umbraco-cms/backoffice/event";
import "./product-shipping-exclusions.element-DQNv1M84.js";
import { UmbDataTypeDetailRepository as q } from "@umbraco-cms/backoffice/data-type";
import { UmbPropertyEditorConfigCollection as k } from "@umbraco-cms/backoffice/property-editor";
import "@umbraco-cms/backoffice/tiptap";
import "@umbraco-cms/backoffice/document-type";
import "./property-editor-ui-collection-picker.element-ty9vm-_F.js";
import "./property-editor-ui-google-shopping-category-picker.element-CiRS_0XS.js";
var H = Object.defineProperty, J = Object.getOwnPropertyDescriptor, T = (t, e, i, a) => {
  for (var r = a > 1 ? void 0 : a ? J(e, i) : e, n = t.length - 1, u; n >= 0; n--)
    (u = t[n]) && (r = (a ? u(e, i, r) : u(r)) || r);
  return a && r && H(e, i, r), r;
};
let w = class extends O(C) {
  constructor() {
    super(...arguments), this.values = {}, this._datasetValue = [];
  }
  updated(t) {
    super.updated(t), (t.has("values") || t.has("activeTabId") || t.has("elementType")) && this._updateDatasetValue();
  }
  _updateDatasetValue() {
    const t = this._getAllPropertiesForCurrentTab();
    this._datasetValue = t.map((e) => ({
      alias: e.alias,
      value: this.values[e.alias]
    }));
  }
  _getPropertiesForContainer(t) {
    return this.elementType?.properties.filter((e) => e.containerId === t).sort((e, i) => e.sortOrder - i.sortOrder) ?? [];
  }
  _getGroupsInContainer(t) {
    return this.elementType?.containers.filter((e) => e.type === "Group" && e.parentId === t).sort((e, i) => e.sortOrder - i.sortOrder) ?? [];
  }
  _getAllPropertiesForCurrentTab() {
    if (!this.elementType) return [];
    const t = this.activeTabId ?? null, e = this._getPropertiesForContainer(t), a = (t ? this._getGroupsInContainer(t) : []).flatMap((r) => this._getPropertiesForContainer(r.id));
    return [...e, ...a];
  }
  _onPropertyChange(t) {
    const i = t.target.value ?? [], a = {};
    for (const r of i)
      a[r.alias] = r.value;
    this.dispatchEvent(new CustomEvent("values-change", {
      detail: { values: a },
      bubbles: !0,
      composed: !0
    }));
  }
  render() {
    if (!this.elementType) return l;
    const t = this.activeTabId ?? null, e = t ? this._getGroupsInContainer(t) : [], i = this._getPropertiesForContainer(t), a = i.length > 0 || e.length > 0;
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
            ` : l}

            ${e.map((r) => o`
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
  _renderProperties(t) {
    return t.length === 0 ? l : t.map((e) => o`
      <umb-property
        alias=${e.alias}
        label=${e.name}
        description=${e.description ?? ""}
        property-editor-ui-alias=${e.propertyEditorUiAlias}
        .config=${this._getPropertyConfig(e)}
        ?mandatory=${e.mandatory}
        .validation=${{
      mandatory: e.mandatory,
      mandatoryMessage: e.mandatoryMessage ?? void 0
    }}>
      </umb-property>
    `);
  }
  _getPropertyConfig(t) {
    if (t.dataTypeConfiguration && typeof t.dataTypeConfiguration == "object")
      return t.dataTypeConfiguration;
  }
};
w.styles = E`
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
T([
  x({ attribute: !1 })
], w.prototype, "elementType", 2);
T([
  x({ attribute: !1 })
], w.prototype, "values", 2);
T([
  x({ type: String })
], w.prototype, "activeTabId", 2);
T([
  c()
], w.prototype, "_datasetValue", 2);
w = T([
  F("merchello-product-element-properties")
], w);
const A = new U(
  "Merchello.OptionEditor.Modal",
  {
    modal: {
      type: "sidebar",
      size: "medium"
    }
  }
), X = new U("Merchello.VariantBatchUpdate.Modal", {
  modal: {
    type: "dialog",
    size: "large"
  }
});
var Y = Object.defineProperty, Q = Object.getOwnPropertyDescriptor, D = (t, e, i, a) => {
  for (var r = a > 1 ? void 0 : a ? Q(e, i) : e, n = t.length - 1, u; n >= 0; n--)
    (u = t[n]) && (r = (a ? u(e, i, r) : u(r)) || r);
  return a && r && Y(e, i, r), r;
};
let y = class extends O(C) {
  constructor() {
    super(...arguments), this.items = [], this.placeholder = "Add item...", this.readonly = !1, this._newItemValue = "", this._editingIndex = null, this._editingValue = "";
  }
  /**
   * Handles adding a new item when Enter is pressed or Add button is clicked.
   */
  _handleAddItem() {
    const t = this._newItemValue.trim();
    if (!t || this.readonly) return;
    const e = [...this.items, t];
    this._newItemValue = "", this._dispatchChange(e);
  }
  /**
   * Handles input in the new item field.
   */
  _handleNewItemInput(t) {
    this._newItemValue = t.target.value;
  }
  /**
   * Handles Enter key press in the new item field.
   */
  _handleNewItemKeyDown(t) {
    t.key === "Enter" && (t.preventDefault(), this._handleAddItem());
  }
  /**
   * Handles removing an item by index.
   */
  _handleRemoveItem(t) {
    if (this.readonly) return;
    const e = this.items.filter((i, a) => a !== t);
    this._dispatchChange(e);
  }
  /**
   * Starts editing an item.
   */
  _handleStartEdit(t) {
    this.readonly || (this._editingIndex = t, this._editingValue = this.items[t]);
  }
  /**
   * Handles input in the edit field.
   */
  _handleEditInput(t) {
    this._editingValue = t.target.value;
  }
  /**
   * Saves the edited item.
   */
  _handleSaveEdit() {
    if (this._editingIndex === null) return;
    const t = this._editingValue.trim();
    if (!t)
      this._handleRemoveItem(this._editingIndex);
    else {
      const e = [...this.items];
      e[this._editingIndex] = t, this._dispatchChange(e);
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
  _handleEditKeyDown(t) {
    t.key === "Enter" ? (t.preventDefault(), this._handleSaveEdit()) : t.key === "Escape" && (t.preventDefault(), this._handleCancelEdit());
  }
  /**
   * Dispatches a change event with the new items array.
   */
  _dispatchChange(t) {
    this.items = t, this.dispatchEvent(new W());
  }
  render() {
    return o`
      <div class="editable-list-container">
        ${this.items.length > 0 ? o`
              <ul class="item-list">
                ${this.items.map((t, e) => this._renderItem(t, e))}
              </ul>
            ` : l}

        ${this.readonly ? l : o`
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

        ${this.items.length === 0 && this.readonly ? o`<p class="empty-hint">No items added.</p>` : l}
      </div>
    `;
  }
  _renderItem(t, e) {
    return this._editingIndex === e ? o`
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
          @click=${() => !this.readonly && this._handleStartEdit(e)}
          @keydown=${(a) => a.key === "Enter" && !this.readonly && this._handleStartEdit(e)}
          tabindex=${this.readonly ? -1 : 0}
          role=${this.readonly ? l : "button"}
          aria-label=${this.readonly ? l : `Edit "${t}"`}>
          ${t}
        </span>
        ${this.readonly ? l : o`
              <div class="item-actions">
                <uui-button
                  compact
                  look="secondary"
                  @click=${() => this._handleStartEdit(e)}
                  label="Edit"
                  aria-label="Edit ${t}">
                  <uui-icon name="icon-edit"></uui-icon>
                </uui-button>
                <uui-button
                  compact
                  look="secondary"
                  color="danger"
                  @click=${() => this._handleRemoveItem(e)}
                  label="Remove"
                  aria-label="Remove ${t}">
                  <uui-icon name="icon-trash"></uui-icon>
                </uui-button>
              </div>
            `}
      </li>
    `;
  }
};
y.styles = E`
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
D([
  x({ type: Array })
], y.prototype, "items", 2);
D([
  x({ type: String })
], y.prototype, "placeholder", 2);
D([
  x({ type: Boolean })
], y.prototype, "readonly", 2);
D([
  c()
], y.prototype, "_newItemValue", 2);
D([
  c()
], y.prototype, "_editingIndex", 2);
D([
  c()
], y.prototype, "_editingValue", 2);
y = D([
  F("merchello-editable-text-list")
], y);
function Z(t, e = {}) {
  const i = {};
  return t.rootName?.trim() || (i.rootName = "Product name is required"), t.taxGroupId || (i.taxGroupId = "Tax group is required"), t.productTypeId || (i.productTypeId = "Product type is required"), !(e.isDigitalProduct ?? t.isDigitalProduct ?? !1) && (!t.warehouseIds || t.warehouseIds.length === 0) && (i.warehouseIds = "At least one warehouse is required for physical products"), {
    isValid: Object.keys(i).length === 0,
    errors: i
  };
}
function tt(t) {
  const e = {};
  return t.sku?.trim() || (e.sku = "SKU is required"), (t.price ?? 0) < 0 && (e.price = "Price must be 0 or greater"), t.costOfGoods !== void 0 && t.costOfGoods < 0 && (e.costOfGoods = "Cost of goods must be 0 or greater"), t.onSale && t.previousPrice !== void 0 && t.previousPrice !== null && t.previousPrice < 0 && (e.previousPrice = "Previous price must be 0 or greater"), {
    isValid: Object.keys(e).length === 0,
    errors: e
  };
}
function et(t, e) {
  if (!t && !e)
    return null;
  const i = [];
  return t && i.push("Details"), e && i.push("Basic Info"), `Please fix the errors on the ${i.join(" and ")} tab${i.length > 1 ? "s" : ""} before saving`;
}
function it(t, e) {
  if (!t.variantOptionsKey)
    return null;
  const i = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi, a = t.variantOptionsKey.match(i) || [], r = [];
  for (const n of a)
    for (const u of e) {
      const m = u.values.find((v) => v.id === n);
      if (m) {
        r.push(m.name);
        break;
      }
    }
  return r.length > 0 ? r.join(" / ") : null;
}
function at(t) {
  const e = t.filter((i) => i.isVariant);
  return e.length === 0 ? 0 : e.reduce((i, a) => i * (a.values.length || 1), 1);
}
function rt(t) {
  return t.some((e) => !e.sku || e.price === 0);
}
function ot(t, e) {
  return t > 1 && e === 0;
}
function st(t) {
  try {
    const e = new URL(t), i = e.pathname.split("/").filter((a) => a);
    return i.length === 0 ? e.hostname : `${e.hostname} › ${i.join(" › ")}`;
  } catch {
    return t;
  }
}
var nt = Object.defineProperty, lt = Object.getOwnPropertyDescriptor, M = (t) => {
  throw TypeError(t);
}, h = (t, e, i, a) => {
  for (var r = a > 1 ? void 0 : a ? lt(e, i) : e, n = t.length - 1, u; n >= 0; n--)
    (u = t[n]) && (r = (a ? u(e, i, r) : u(r)) || r);
  return a && r && nt(e, i, r), r;
}, z = (t, e, i) => e.has(t) || M("Cannot " + i), s = (t, e, i) => (z(t, e, "read from private field"), e.get(t)), $ = (t, e, i) => e.has(t) ? M("Cannot add the same private member more than once") : e instanceof WeakSet ? e.add(t) : e.set(t, i), P = (t, e, i, a) => (z(t, e, "write to private field"), e.set(t, i), i), S, p, b, g, _;
let d = class extends O(C) {
  constructor() {
    super(), this._product = null, this._isLoading = !0, this._isSaving = !1, this._errorMessage = null, this._validationAttempted = !1, this._fieldErrors = {}, this._routes = [], this._activePath = "", this._formData = {}, this._variantFormData = {}, this._variantFieldErrors = {}, this._selectedVariantIds = [], this._taxGroups = [], this._productTypes = [], this._warehouses = [], this._productViews = [], this._optionSettings = null, this._elementTypes = [], this._filterGroups = [], this._assignedFilterIds = [], this._originalAssignedFilterIds = [], this._shippingOptions = [], this._elementType = null, this._elementPropertyValues = {}, this._descriptionEditorConfig = void 0, this._collectionPickerConfig = new k([
      { alias: "maxItems", value: 0 }
    ]), this._elementTypePickerConfig = new k([
      { alias: "validationLimit", value: { min: 0, max: 1 } },
      { alias: "onlyPickElementTypes", value: !0 }
    ]), $(this, S, new q(this)), $(this, p), $(this, b), $(this, g), $(this, _, !1), this.consumeContext(G, (t) => {
      P(this, p, t), s(this, p) && (this.observe(s(this, p).product, (e) => {
        this._product = e ?? null, e && (this._formData = { ...e }, this._shippingOptions = e.availableShippingOptions ?? [], this._selectedVariantIds = [], e.variants.length === 1 && (this._variantFormData = { ...e.variants[0] }, this._loadAssignedFilters()), e.elementProperties && (this._elementPropertyValues = { ...e.elementProperties })), this._isLoading = !e;
      }, "_product"), this.observe(s(this, p).elementType, (e) => {
        this._elementType = e;
      }, "_elementType"), this.observe(s(this, p).elementPropertyValues, (e) => {
        this._elementPropertyValues = e;
      }, "_elementPropertyValues"), this.observe(s(this, p).filterGroups, (e) => {
        this._filterGroups = e;
      }, "_filterGroups"));
    }), this.consumeContext(R, (t) => {
      P(this, b, t);
    }), this.consumeContext(L, (t) => {
      P(this, g, t);
    });
  }
  connectedCallback() {
    super.connectedCallback(), P(this, _, !0), this._loadReferenceData(), this._createRoutes();
  }
  disconnectedCallback() {
    super.disconnectedCallback(), P(this, _, !1);
  }
  async _loadReferenceData() {
    try {
      s(this, p)?.loadFilterGroups();
      const [
        t,
        e,
        i,
        a,
        r,
        n,
        u
      ] = await Promise.all([
        f.getTaxGroups(),
        f.getProductTypes(),
        f.getWarehouses(),
        f.getProductOptionSettings(),
        f.getDescriptionEditorSettings(),
        f.getProductViews(),
        f.getElementTypes()
      ]);
      if (!s(this, _) || (t.data && (this._taxGroups = t.data), e.data && (this._productTypes = e.data), i.data && (this._warehouses = i.data), a.data && (this._optionSettings = a.data), n.data && (this._productViews = n.data), u.data && (this._elementTypes = u.data), r.data?.dataTypeKey && (await this._loadDataTypeConfig(r.data.dataTypeKey), !s(this, _))))
        return;
      await this._loadAssignedFilters();
    } catch {
    }
  }
  /**
   * Loads filters assigned to the current product variant
   * Note: Filters are assigned to Products (variants), not ProductRoots
   * Only applicable for single-variant products
   */
  async _loadAssignedFilters() {
    if (!this._isSingleVariant()) return;
    const t = this._product?.variants[0]?.id;
    if (!t || s(this, p)?.isNew) return;
    const { data: e } = await f.getFiltersForProduct(t);
    if (s(this, _) && e) {
      const i = e.map((a) => a.id);
      this._assignedFilterIds = i, this._originalAssignedFilterIds = [...i];
    }
  }
  /**
   * Fetches the DataType configuration using Umbraco's DataType repository.
   * This handles authentication automatically through Umbraco's internal mechanisms.
   */
  async _loadDataTypeConfig(t) {
    try {
      const { error: e } = await s(this, S).requestByUnique(t);
      if (e) {
        this._setFallbackEditorConfig();
        return;
      }
      this.observe(
        await s(this, S).byUnique(t),
        (i) => {
          if (s(this, _)) {
            if (!i) {
              this._setFallbackEditorConfig();
              return;
            }
            this._descriptionEditorConfig = new k(i.values);
          }
        },
        "_observeDescriptionDataType"
      );
    } catch {
      this._setFallbackEditorConfig();
    }
  }
  /**
   * Sets a fallback editor configuration if the DataType cannot be loaded.
   */
  _setFallbackEditorConfig() {
    this._descriptionEditorConfig = new k([
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
    const t = () => document.createElement("div");
    this._routes = [
      {
        path: "tab/details",
        component: t
      },
      {
        path: "tab/basic-info",
        component: t
      },
      {
        path: "tab/media",
        component: t
      },
      {
        path: "tab/shipping",
        component: t
      },
      {
        path: "tab/seo",
        component: t
      },
      {
        path: "tab/feed",
        component: t
      },
      {
        path: "tab/stock",
        component: t
      },
      {
        path: "tab/variants",
        component: t
      },
      {
        path: "tab/options",
        component: t
      },
      {
        path: "tab/filters",
        component: t
      },
      // Element Type content tabs (dynamic based on configuration)
      {
        path: "tab/content",
        component: t
      },
      {
        path: "tab/content-:tabId",
        component: t
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
      const t = this._activePath.match(/tab\/content-([a-f0-9-]+)/i);
      if (t) return `content-${t[1]}`;
    }
    return this._activePath.includes("tab/content") ? "content" : "details";
  }
  /**
   * Gets Element Type tabs (containers of type "Tab" at the root level)
   */
  _getElementTypeTabs() {
    return this._elementType ? this._elementType.containers.filter((t) => t.type === "Tab" && !t.parentId).sort((t, e) => t.sortOrder - e.sortOrder) : [];
  }
  /**
   * Checks if the current active tab is a content tab
   */
  _isContentTab(t) {
    return t === "content" || t.startsWith("content-");
  }
  /**
   * Gets the Element Type tab ID from the active tab string
   */
  _getContentTabId(t) {
    if (t !== "content" && t.startsWith("content-"))
      return t.replace("content-", "");
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
  _getTabHint(t) {
    return t === "details" && this._validationAttempted && this._hasDetailsErrors() ? { color: "danger" } : t === "variants" && this._hasVariantWarnings() ? { color: "warning" } : t === "options" && this._hasOptionWarnings() ? { color: "warning" } : null;
  }
  _handleInputChange(t, e) {
    this._formData = { ...this._formData, [t]: e };
  }
  _getCollectionPickerValue() {
    const t = this._formData.collectionIds ?? [];
    return t.length > 0 ? t.join(",") : void 0;
  }
  _toPropertyValueMap(t) {
    const e = {};
    for (const i of t)
      e[i.alias] = i.value;
    return e;
  }
  _getStringFromPropertyValue(t) {
    return typeof t == "string" ? t : "";
  }
  _getFirstDropdownValue(t) {
    if (Array.isArray(t)) {
      const e = t.find((i) => typeof i == "string");
      return typeof e == "string" ? e : "";
    }
    return typeof t == "string" ? t : "";
  }
  _getStringArrayFromPropertyValue(t) {
    return Array.isArray(t) ? t.filter((e) => typeof e == "string").map((e) => e.trim()).filter(Boolean) : typeof t == "string" ? t.split(",").map((e) => e.trim()).filter(Boolean) : [];
  }
  _getMediaKeysFromPropertyValue(t) {
    return Array.isArray(t) ? t.map((e) => {
      if (!e || typeof e != "object") return "";
      const i = e;
      return typeof i.mediaKey == "string" && i.mediaKey ? i.mediaKey : typeof i.key == "string" && i.key ? i.key : "";
    }).filter(Boolean) : [];
  }
  _createMediaPickerValue(t) {
    return t.map((e) => ({ key: e, mediaKey: e }));
  }
  _getDescriptionPropertyValue() {
    const t = this._formData.description;
    if (!t)
      return {
        markup: "",
        blocks: null
      };
    try {
      const e = JSON.parse(t);
      if (typeof e?.markup == "string" || e?.blocks !== void 0)
        return {
          markup: e.markup ?? "",
          blocks: e.blocks ?? null
        };
    } catch {
    }
    return {
      markup: t,
      blocks: null
    };
  }
  _serializeDescriptionPropertyValue(t) {
    if (t == null) return null;
    if (typeof t == "string")
      return JSON.stringify({
        markup: t,
        blocks: null
      });
    if (typeof t == "object") {
      const e = t;
      return typeof e.markup == "string" || e.blocks !== void 0 ? JSON.stringify({
        markup: e.markup ?? "",
        blocks: e.blocks ?? null
      }) : JSON.stringify(t);
    }
    return null;
  }
  _getElementTypeSelectionKey() {
    const t = this._formData.elementTypeAlias;
    return t ? this._elementTypes.find((i) => i.alias.toLowerCase() === t.toLowerCase())?.key : void 0;
  }
  async _setElementTypeAliasFromSelectionValue(t) {
    const i = this._getFirstDropdownValue(t).split(",").map((u) => u.trim()).filter(Boolean)[0];
    let a = this._elementTypes.find((u) => u.key === i);
    if (i && !a) {
      const { data: u } = await f.getElementTypes();
      u && (this._elementTypes = u, a = u.find((m) => m.key === i));
    }
    const r = a?.alias ?? null, n = this._formData.elementTypeAlias ?? null;
    r !== n && (this._formData = { ...this._formData, elementTypeAlias: r }, this._elementPropertyValues = {}, s(this, p)?.setElementPropertyValues({}), await s(this, p)?.loadElementType(r));
  }
  _getProductTypePropertyConfig() {
    return [
      {
        alias: "items",
        value: [
          { name: "Select product type...", value: "" },
          ...this._productTypes.map((t) => ({
            name: t.name,
            value: t.id
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
          ...this._taxGroups.map((t) => ({
            name: t.name,
            value: t.id
          }))
        ]
      }
    ];
  }
  _getViewOptions() {
    const t = this._formData.viewAlias ?? "";
    return [
      { name: "", value: "", selected: t === "" },
      ...this._productViews.map((e) => ({
        name: e.alias,
        value: e.alias,
        selected: e.alias === t
      }))
    ];
  }
  _getDetailsDatasetValue() {
    const t = this._getElementTypeSelectionKey();
    return [
      { alias: "rootName", value: this._formData.rootName ?? "" },
      { alias: "taxGroupId", value: this._formData.taxGroupId ? [this._formData.taxGroupId] : [] },
      { alias: "elementTypeAlias", value: t },
      { alias: "isDigitalProduct", value: this._formData.isDigitalProduct ?? !1 },
      { alias: "description", value: this._getDescriptionPropertyValue() }
    ];
  }
  _getCategorisationDatasetValue() {
    return [
      { alias: "productTypeId", value: this._formData.productTypeId ? [this._formData.productTypeId] : [] },
      { alias: "collectionIds", value: this._getCollectionPickerValue() },
      { alias: "googleShoppingFeedCategory", value: this._formData.googleShoppingFeedCategory ?? "" }
    ];
  }
  _getMediaDatasetValue() {
    return [
      {
        alias: "rootImages",
        value: this._createMediaPickerValue(this._formData.rootImages ?? [])
      }
    ];
  }
  _getSeoDatasetValue() {
    return [
      { alias: "rootUrl", value: this._formData.rootUrl ?? "" },
      { alias: "pageTitle", value: this._formData.pageTitle ?? "" },
      { alias: "metaDescription", value: this._formData.metaDescription ?? "" },
      { alias: "canonicalUrl", value: this._formData.canonicalUrl ?? "" },
      { alias: "noIndex", value: this._formData.noIndex ?? !1 }
    ];
  }
  _getSocialDatasetValue() {
    return [
      {
        alias: "openGraphImage",
        value: this._formData.openGraphImage ? this._createMediaPickerValue([this._formData.openGraphImage]) : []
      }
    ];
  }
  _handleDetailsDatasetChange(t) {
    const e = t.target, i = this._toPropertyValueMap(e.value ?? []);
    this._formData = {
      ...this._formData,
      rootName: this._getStringFromPropertyValue(i.rootName),
      taxGroupId: this._getFirstDropdownValue(i.taxGroupId),
      isDigitalProduct: !!i.isDigitalProduct,
      description: this._serializeDescriptionPropertyValue(i.description)
    }, this._setElementTypeAliasFromSelectionValue(i.elementTypeAlias);
  }
  _handleViewAliasChange(t) {
    const e = t.target.value;
    this._formData = { ...this._formData, viewAlias: e || null };
  }
  _handleCategorisationDatasetChange(t) {
    const e = t.target, i = this._toPropertyValueMap(e.value ?? []);
    this._formData = {
      ...this._formData,
      productTypeId: this._getFirstDropdownValue(i.productTypeId),
      collectionIds: this._getStringArrayFromPropertyValue(i.collectionIds),
      googleShoppingFeedCategory: this._getStringFromPropertyValue(i.googleShoppingFeedCategory) || null
    };
  }
  _handleWarehouseToggle(t, e) {
    const i = this._formData.warehouseIds ?? [], a = i.includes(t), r = e ? a ? i : [...i, t] : i.filter((n) => n !== t);
    if (this._formData = { ...this._formData, warehouseIds: r }, this._fieldErrors.warehouseIds) {
      const { warehouseIds: n, ...u } = this._fieldErrors;
      this._fieldErrors = u;
    }
  }
  _handleMediaDatasetChange(t) {
    const e = t.target, i = this._toPropertyValueMap(e.value ?? []);
    this._formData = {
      ...this._formData,
      rootImages: this._getMediaKeysFromPropertyValue(i.rootImages)
    };
  }
  _handleSeoDatasetChange(t) {
    const e = t.target, i = this._toPropertyValueMap(e.value ?? []);
    this._formData = {
      ...this._formData,
      rootUrl: this._getStringFromPropertyValue(i.rootUrl) || null,
      pageTitle: this._getStringFromPropertyValue(i.pageTitle) || null,
      metaDescription: this._getStringFromPropertyValue(i.metaDescription) || null,
      canonicalUrl: this._getStringFromPropertyValue(i.canonicalUrl) || null,
      noIndex: !!i.noIndex
    };
  }
  _handleSocialDatasetChange(t) {
    const e = t.target, i = this._toPropertyValueMap(e.value ?? []), a = this._getMediaKeysFromPropertyValue(i.openGraphImage)[0] ?? null;
    this._formData = {
      ...this._formData,
      openGraphImage: a
    };
  }
  async _handleSave() {
    if (this._validateForm()) {
      this._isSaving = !0, this._errorMessage = null;
      try {
        s(this, p)?.isNew ?? !0 ? await this._createProduct() : await this._updateProduct();
      } catch (t) {
        this._errorMessage = t instanceof Error ? t.message : "An unexpected error occurred";
      } finally {
        this._isSaving = !1;
      }
    }
  }
  async _createProduct() {
    const t = {
      rootName: this._formData.rootName || "",
      googleShoppingFeedCategory: this._formData.googleShoppingFeedCategory ?? void 0,
      taxGroupId: this._formData.taxGroupId || "",
      productTypeId: this._formData.productTypeId || "",
      collectionIds: this._formData.collectionIds,
      warehouseIds: this._formData.warehouseIds,
      rootImages: this._formData.rootImages,
      isDigitalProduct: this._formData.isDigitalProduct || !1,
      digitalDeliveryMethod: this._formData.digitalDeliveryMethod ?? void 0,
      digitalFileIds: this._formData.digitalFileIds ?? void 0,
      downloadLinkExpiryDays: this._formData.downloadLinkExpiryDays ?? void 0,
      maxDownloadsPerLink: this._formData.maxDownloadsPerLink ?? void 0,
      elementTypeAlias: this._formData.elementTypeAlias ?? void 0,
      elementProperties: Object.keys(this._elementPropertyValues).length > 0 ? this._elementPropertyValues : void 0,
      defaultVariant: {
        sku: this._variantFormData.sku ?? void 0,
        price: this._variantFormData.price ?? 0,
        costOfGoods: this._variantFormData.costOfGoods ?? 0
      }
    }, { data: e, error: i } = await f.createProduct(t);
    if (i) {
      this._errorMessage = i.message, s(this, g)?.peek("danger", { data: { headline: "Failed to create product", message: i.message } });
      return;
    }
    e && (s(this, p)?.updateProduct(e), s(this, g)?.peek("positive", { data: { headline: "Product created", message: `"${e.rootName}" has been created successfully` } }), this._validationAttempted = !1, this._fieldErrors = {});
  }
  async _updateProduct() {
    if (!this._product?.id) return;
    const t = {
      rootName: this._formData.rootName,
      rootImages: this._formData.rootImages,
      rootUrl: this._formData.rootUrl ?? void 0,
      googleShoppingFeedCategory: this._formData.googleShoppingFeedCategory ?? void 0,
      isDigitalProduct: this._formData.isDigitalProduct,
      digitalDeliveryMethod: this._formData.digitalDeliveryMethod ?? void 0,
      digitalFileIds: this._formData.digitalFileIds ?? void 0,
      downloadLinkExpiryDays: this._formData.downloadLinkExpiryDays ?? void 0,
      maxDownloadsPerLink: this._formData.maxDownloadsPerLink ?? void 0,
      taxGroupId: this._formData.taxGroupId,
      productTypeId: this._formData.productTypeId,
      collectionIds: this._formData.collectionIds,
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
      // Element Type selection for custom properties
      elementTypeAlias: this._formData.elementTypeAlias ?? "",
      // Element Type property values
      elementProperties: Object.keys(this._elementPropertyValues).length > 0 ? this._elementPropertyValues : void 0
    }, { data: e, error: i } = await f.updateProduct(this._product.id, t);
    if (i) {
      this._errorMessage = i.message, s(this, g)?.peek("danger", { data: { headline: "Failed to save product", message: i.message } });
      return;
    }
    if (this._isSingleVariant() && this._product.variants[0]) {
      const a = await this._saveVariantData(this._product.id, this._product.variants[0].id);
      if (a) {
        this._errorMessage = a.message, s(this, g)?.peek("danger", { data: { headline: "Failed to save variant data", message: a.message } });
        return;
      }
    }
    this._isSingleVariant() && await this._saveFilterAssignments(), await this._saveShippingExclusions(), e && (await s(this, p)?.reload(), s(this, g)?.peek("positive", { data: { headline: "Product saved", message: "Changes have been saved successfully" } }));
  }
  /** Saves shipping exclusions for all variants (bulk mode) */
  async _saveShippingExclusions() {
    if (!this._product?.id) return;
    const t = this._shippingOptions.filter((a) => a.isExcluded).map((a) => a.id), e = t.length > 0, i = this._shippingOptions.some((a) => a.isPartiallyExcluded || a.excludedVariantCount > 0);
    if (e || i) {
      const { error: a } = await f.updateProductShippingExclusions(this._product.id, t);
      a && s(this, g)?.peek("warning", {
        data: { headline: "Shipping exclusions not saved", message: a.message }
      });
    }
  }
  /**
   * Saves variant data for single-variant products
   */
  async _saveVariantData(t, e) {
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
    }, { error: a } = await f.updateVariant(t, e, i);
    return a ?? null;
  }
  /**
   * Validates the form and sets field-level errors.
   * Uses validation utility functions for product root and variant validation.
   */
  _validateForm() {
    this._validationAttempted = !0, this._errorMessage = null;
    const t = Z(this._formData, {
      isDigitalProduct: this._formData.isDigitalProduct
    });
    this._fieldErrors = t.errors;
    let e = { isValid: !0, errors: {} };
    this._isSingleVariant() && (e = tt(this._variantFormData)), this._variantFieldErrors = e.errors;
    const i = et(
      !t.isValid,
      !e.isValid
    );
    return i && (this._errorMessage = i), t.isValid && e.isValid;
  }
  /**
   * Checks if there are warnings for variants tab.
   * Uses utility function from variant-helpers.
   */
  _hasVariantWarnings() {
    return this._product?.variants ? rt(this._product.variants) : !1;
  }
  /**
   * Checks if there are warnings for options tab.
   * Uses utility function from variant-helpers.
   */
  _hasOptionWarnings() {
    const t = this._product?.variants.length ?? 0, e = this._product?.productOptions.length ?? 0;
    return ot(t, e);
  }
  _renderTabs() {
    const t = this._product?.variants.length ?? 0, e = this._product?.productOptions.length ?? 0, i = this._isSingleVariant(), a = this._getActiveTab(), r = this._getTabHint("details"), n = this._getTabHint("variants"), u = this._getTabHint("options");
    return o`
      <uui-tab-group slot="header">
        <uui-tab
          label="Details"
          href="${this._routerPath}/tab/details"
          ?active=${a === "details"}>
          Details
          ${r ? o`<uui-badge slot="extra" color="danger" attention>!</uui-badge>` : l}
        </uui-tab>

        ${i ? o`
              <uui-tab
                label="Basic Info"
                href="${this._routerPath}/tab/basic-info"
                ?active=${a === "basic-info"}>
                Basic Info
                ${this._validationAttempted && this._hasBasicInfoErrors() ? o`<uui-badge slot="extra" color="danger" attention>!</uui-badge>` : l}
              </uui-tab>
            ` : l}

        <uui-tab
          label="Media"
          href="${this._routerPath}/tab/media"
          ?active=${a === "media"}>
          Media
        </uui-tab>

        ${this._formData.isDigitalProduct ? l : o`
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
            ` : l}

        ${i ? o`
              <uui-tab
                label="Stock"
                href="${this._routerPath}/tab/stock"
                ?active=${a === "stock"}>
                Stock
              </uui-tab>
            ` : l}

        ${t > 1 ? o`
              <uui-tab
                label="Variants"
                href="${this._routerPath}/tab/variants"
                ?active=${a === "variants"}>
                Variants (${t})
                ${n ? o`<uui-badge slot="extra" color="warning">!</uui-badge>` : l}
              </uui-tab>
            ` : l}

        <uui-tab
          label="Options"
          class=${i ? "" : "merchello-tab--last"}
          href="${this._routerPath}/tab/options"
          ?active=${a === "options"}>
          Options (${e})
          ${u ? o`<uui-badge slot="extra" color="warning">!</uui-badge>` : l}
        </uui-tab>

        ${i ? o`
              <uui-tab
                label="Filters"
                class="merchello-tab--last"
                href="${this._routerPath}/tab/filters"
                ?active=${a === "filters"}>
                Filters
              </uui-tab>
            ` : l}

        ${this._renderElementTypeTabs(a)}
      </uui-tab-group>
    `;
  }
  /**
   * Renders the Element Type tabs with visual divider
   */
  _renderElementTypeTabs(t) {
    if (!this._elementType) return l;
    const e = this._getElementTypeTabs();
    return o`
      ${e.length > 0 ? e.map((i, a) => o`
            <uui-tab
              class=${a === 0 ? "element-type-tab element-type-tab--first" : "element-type-tab"}
              label=${i.name ?? "Content"}
              href="${this._routerPath}/tab/content-${i.id}"
              ?active=${t === `content-${i.id}`}>
              ${i.name ?? "Content"}
            </uui-tab>
          `) : o`
            <!-- Single "Content" tab if element type has no tabs defined -->
            <uui-tab
              class="element-type-tab element-type-tab--first"
              label="Content"
              href="${this._routerPath}/tab/content"
              ?active=${t === "content"}>
              Content
            </uui-tab>
          `}
    `;
  }
  /**
   * Renders the content tab with Element Type properties
   */
  _renderContentTab(t) {
    if (!this._elementType) return l;
    const e = this._getContentTabId(t);
    return o`
      <div class="tab-content">
        <merchello-product-element-properties
          .elementType=${this._elementType}
          .values=${this._elementPropertyValues}
          .activeTabId=${e}
          @values-change=${this._onElementPropertiesChange}>
        </merchello-product-element-properties>
      </div>
    `;
  }
  /**
   * Handles property value changes from the element properties component
   */
  _onElementPropertiesChange(t) {
    const { values: e } = t.detail;
    this._elementPropertyValues = { ...e }, s(this, p)?.setElementPropertyValues(e);
  }
  _renderDetailsTab() {
    const t = s(this, p)?.isNew ?? !0;
    return o`
      <div class="tab-content">
        ${t ? o`
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

        ${this._errorMessage ? o`
              <uui-box class="error-box">
                <div class="error-message">
                  <uui-icon name="icon-alert"></uui-icon>
                  <span>${this._errorMessage}</span>
                </div>
              </uui-box>
            ` : l}

        <uui-box headline="Basic Information">
          <umb-property-dataset
            .value=${this._getDetailsDatasetValue()}
            @change=${this._handleDetailsDatasetChange}>
            <umb-property
              alias="rootName"
              label="Product Name"
              description="Customer-facing product name"
              property-editor-ui-alias="Umb.PropertyEditorUi.TextBox"
              .validation=${{ mandatory: !0 }}>
            </umb-property>

            <umb-property
              alias="taxGroupId"
              label="Tax Group"
              description="Tax rate applied to this product"
              property-editor-ui-alias="Umb.PropertyEditorUi.Dropdown"
              .config=${this._getTaxGroupPropertyConfig()}
              .validation=${{ mandatory: !0 }}>
            </umb-property>

            <umb-property-layout
              alias="viewAlias"
              label="Product View"
              description="Select the view template used to render this product on the front-end">
              <div slot="editor" class="view-select-editor">
                <uui-select
                  label="Product View"
                  .options=${this._getViewOptions()}
                  @change=${this._handleViewAliasChange}>
                </uui-select>
                ${this._productViews.length === 0 ? o`<p class="hint">No product views found. Add .cshtml files to ~/Views/Products/.</p>` : l}
              </div>
            </umb-property-layout>

            <umb-property
              alias="elementTypeAlias"
              label="Element Type"
              description="Optional: select an Element Type to add custom properties to this product"
              property-editor-ui-alias="Umb.PropertyEditorUi.DocumentTypePicker"
              .config=${this._elementTypePickerConfig}>
            </umb-property>

            <umb-property
              alias="isDigitalProduct"
              label="Digital Product"
              description="No shipping costs, instant delivery, no warehouse needed"
              property-editor-ui-alias="Umb.PropertyEditorUi.Toggle">
            </umb-property>

            <umb-property
              alias="description"
              label="Description"
              description="Product description for your storefront. Edit the DataType in Settings > Data Types to customize the editor toolbar."
              property-editor-ui-alias="Umb.PropertyEditorUi.Tiptap"
              .config=${this._descriptionEditorConfig}>
            </umb-property>
          </umb-property-dataset>
        </uui-box>

        <uui-box headline="Categorisation">
          <umb-property-dataset
            .value=${this._getCategorisationDatasetValue()}
            @change=${this._handleCategorisationDatasetChange}>
            <umb-property
              alias="productTypeId"
              label="Product Type"
              description="Categorize your product for reporting and organization"
              property-editor-ui-alias="Umb.PropertyEditorUi.Dropdown"
              .config=${this._getProductTypePropertyConfig()}
              .validation=${{ mandatory: !0 }}>
            </umb-property>

            <umb-property
              alias="collectionIds"
              label="Collections"
              description="Assign this product to one or more collections for storefront organization"
              property-editor-ui-alias="Merchello.PropertyEditorUi.CollectionPicker"
              .config=${this._collectionPickerConfig}>
            </umb-property>

            <umb-property
              alias="googleShoppingFeedCategory"
              label="Shopping Category"
              description="Select a shopping taxonomy category for this product"
              property-editor-ui-alias="Merchello.PropertyEditorUi.GoogleShoppingCategoryPicker">
            </umb-property>
          </umb-property-dataset>
        </uui-box>

        ${this._formData.isDigitalProduct ? l : o`
              <uui-box headline="Warehouses">
                <umb-property-layout
                  label="Stock Locations"
                  description="Select which warehouses stock this product"
                  mandatory
                  ?invalid=${!!this._fieldErrors.warehouseIds}>
                  <div slot="editor">
                    ${this._renderWarehouseSelector()}
                  </div>
                  ${this._fieldErrors.warehouseIds ? o`<span class="field-error-message">${this._fieldErrors.warehouseIds}</span>` : l}
                </umb-property-layout>
              </uui-box>
            `}
      </div>
    `;
  }
  _renderWarehouseSelector() {
    const t = this._formData.warehouseIds ?? [];
    return o`
      <div class="warehouse-toggle-list">
        ${this._warehouses.map((e) => {
      const i = e.name || "Unnamed Warehouse";
      return o`
            <div class="toggle-field">
              <uui-toggle
                label="${i}"
                .checked=${t.includes(e.id)}
                @change=${(a) => this._handleWarehouseToggle(e.id, a.target.checked)}>
              </uui-toggle>
              <label>${i}${e.code ? ` (${e.code})` : ""}</label>
            </div>
          `;
    })}
        ${this._warehouses.length === 0 ? o`<p class="hint">No warehouses available. Create a warehouse first.</p>` : l}
      </div>
    `;
  }
  _renderMediaTab() {
    return o`
      <div class="tab-content">
        <uui-box headline="Product Images">
          <umb-property-dataset
            .value=${this._getMediaDatasetValue()}
            @change=${this._handleMediaDatasetChange}>
            <umb-property
              alias="rootImages"
              label="Images"
              description="Add images that will be displayed on your storefront. These images are shared across all variants."
              property-editor-ui-alias="Umb.PropertyEditorUi.MediaPicker"
              .config=${[{ alias: "multiple", value: !0 }]}>
            </umb-property>
          </umb-property-dataset>
        </uui-box>
      </div>
    `;
  }
  // ============================================
  // Shipping Tab
  // ============================================
  /**
   * Renders the shipping tab with package configurations.
   * Uses the shared product-packages component.
   */
  _renderShippingTab() {
    const t = this._formData.defaultPackageConfigurations ?? [], e = s(this, p)?.isNew ?? !0;
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
          <merchello-product-packages
            .packages=${t}
            .editable=${!0}
            .disableAdd=${e}
            @packages-change=${this._handlePackagesChange}>
          </merchello-product-packages>
        </uui-box>

        <merchello-product-shipping-exclusions
          .shippingOptions=${this._shippingOptions}
          .variantMode=${!1}
          .isNewProduct=${e}
          @shipping-exclusions-change=${this._handleShippingExclusionsChange}>
        </merchello-product-shipping-exclusions>
      </div>
    `;
  }
  /** Handles packages change from the shared component */
  _handlePackagesChange(t) {
    this._formData = { ...this._formData, defaultPackageConfigurations: t.detail.packages };
  }
  /** Handles shipping exclusions change from the shared component */
  _handleShippingExclusionsChange(t) {
    this._shippingOptions = this._shippingOptions.map((e) => ({
      ...e,
      isExcluded: t.detail.excludedShippingOptionIds.includes(e.id),
      isPartiallyExcluded: !1
      // When bulk editing, clear partial state
    }));
  }
  _renderSeoTab() {
    return o`
      <div class="tab-content">
        <uui-box headline="Search Engine Optimization">
          <umb-property-dataset
            .value=${this._getSeoDatasetValue()}
            @change=${this._handleSeoDatasetChange}>
            <umb-property
              alias="rootUrl"
              label="Product URL"
              description="The URL path for this product on your storefront"
              property-editor-ui-alias="Umb.PropertyEditorUi.TextBox">
            </umb-property>

            <umb-property
              alias="pageTitle"
              label="Page Title"
              description="The title shown in browser tabs and search results"
              property-editor-ui-alias="Umb.PropertyEditorUi.TextBox">
            </umb-property>

            <umb-property
              alias="metaDescription"
              label="Meta Description"
              description="The description shown in search results (recommended: 150-160 characters)"
              property-editor-ui-alias="Umb.PropertyEditorUi.TextArea">
            </umb-property>

            <umb-property
              alias="canonicalUrl"
              label="Canonical URL"
              description="Optional URL to indicate the preferred version of this page for SEO"
              property-editor-ui-alias="Umb.PropertyEditorUi.TextBox">
            </umb-property>

            <umb-property
              alias="noIndex"
              label="Hide from Search Engines"
              description="Adds noindex meta tag to prevent search engines from indexing this page"
              property-editor-ui-alias="Umb.PropertyEditorUi.Toggle">
            </umb-property>
          </umb-property-dataset>
        </uui-box>

        <uui-box headline="Social Sharing">
          <umb-property-dataset
            .value=${this._getSocialDatasetValue()}
            @change=${this._handleSocialDatasetChange}>
            <umb-property
              alias="openGraphImage"
              label="Open Graph Image"
              description="Image displayed when this page is shared on social media"
              property-editor-ui-alias="Umb.PropertyEditorUi.MediaPicker"
              .config=${[{ alias: "multiple", value: !1 }]}>
            </umb-property>
          </umb-property-dataset>
          <small class="hint">Recommended size: 1200x630 pixels</small>
        </uui-box>

        <uui-box headline="Search Preview">
          <div>${this._renderGoogleSearchPreview()}</div>
        </uui-box>
      </div>
    `;
  }
  _renderGoogleSearchPreview() {
    const t = this._formData.pageTitle || this._formData.rootName || "Product Title", e = this._formData.metaDescription || "No meta description set. Add a description to improve search visibility.", i = this._formData.canonicalUrl || "https://yourstore.com/products/product-name", a = this._formatUrlAsBreadcrumb(i), r = 60, n = 160, u = t.length > r, m = e.length > n, v = u ? t.substring(0, r - 3) + "..." : t, N = m ? e.substring(0, n - 3) + "..." : e;
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
        <div class="google-preview-title">${v}</div>
        <div class="google-preview-description">${N}</div>
      </div>
      <div class="google-preview-stats">
        <span class="${u ? "stat-warning" : "stat-ok"}">
          Title: ${t.length}/${r} chars ${u ? "(will be truncated)" : ""}
        </span>
        <span class="${m ? "stat-warning" : "stat-ok"}">
          Description: ${e.length}/${n} chars ${m ? "(will be truncated)" : ""}
        </span>
      </div>
    `;
  }
  /**
   * Formats a URL as a breadcrumb string for Google Search preview.
   * Uses utility function from variant-helpers.
   */
  _formatUrlAsBreadcrumb(t) {
    return st(t);
  }
  _renderVariantsTab() {
    const t = this._product?.variants ?? [], e = this._selectedVariantIds.length, i = t.length > 0 && e === t.length, a = e > 0 && e < t.length;
    return o`
      <div class="tab-content">
        <div class="section-header">
          <div>
            <h3>Product Variants</h3>
            <p class="section-description">
              Click a row to edit variant details. Select variants, choose fields, and batch update in one save.
            </p>
          </div>
          <uui-button
            look="primary"
            color="positive"
            label="Batch Update"
            @click=${this._openBatchUpdateModal}
            ?disabled=${e === 0}>
            Batch Update (${e})
          </uui-button>
        </div>

        <div class="table-container">
          <uui-table class="data-table">
            <uui-table-head>
              <uui-table-head-cell style="width: 56px;">
                <uui-checkbox
                  label="Select all variants"
                  ?checked=${i}
                  .indeterminate=${a}
                  @change=${(r) => this._handleSelectAllVariants(r.target.checked)}>
                </uui-checkbox>
              </uui-table-head-cell>
              <uui-table-head-cell style="width: 60px;">Default</uui-table-head-cell>
              <uui-table-head-cell>Variant</uui-table-head-cell>
              <uui-table-head-cell>SKU</uui-table-head-cell>
              <uui-table-head-cell>Price</uui-table-head-cell>
              <uui-table-head-cell>Stock</uui-table-head-cell>
              <uui-table-head-cell>Status</uui-table-head-cell>
            </uui-table-head>
            ${t.map(
      (r) => this._renderVariantRow(r, this._selectedVariantIds.includes(r.id))
    )}
          </uui-table>
        </div>
      </div>
    `;
  }
  _handleVariantSelection(t, e) {
    if (e) {
      this._selectedVariantIds.includes(t) || (this._selectedVariantIds = [...this._selectedVariantIds, t]);
      return;
    }
    this._selectedVariantIds = this._selectedVariantIds.filter((i) => i !== t);
  }
  _handleSelectAllVariants(t) {
    if (!t) {
      this._selectedVariantIds = [];
      return;
    }
    this._selectedVariantIds = (this._product?.variants ?? []).map((e) => e.id);
  }
  _getSelectedVariants() {
    if (!this._product) return [];
    const t = new Set(this._selectedVariantIds);
    return this._product.variants.filter((e) => t.has(e.id));
  }
  async _openBatchUpdateModal() {
    if (!this._product || !s(this, b)) return;
    const t = this._getSelectedVariants();
    if (t.length === 0) return;
    const i = await s(this, b).open(this, X, {
      data: {
        productRootId: this._product.id,
        variants: t.map((a) => ({ ...a }))
      }
    }).onSubmit().catch(() => {
    });
    !s(this, _) || !i?.isSaved || (s(this, g)?.peek("positive", {
      data: {
        headline: "Batch update complete",
        message: `${i.updatedCount} variant${i.updatedCount === 1 ? "" : "s"} updated successfully.`
      }
    }), this._selectedVariantIds = [], await s(this, p)?.reload());
  }
  _renderVariantRow(t, e) {
    const i = this._product ? j(this._product.id, t.id) : "", a = this._getVariantOptionDescription(t), r = t.canBeDefault, n = r ? "" : "Cannot set as default: variant is unavailable or out of stock";
    return o`
      <uui-table-row>
        <uui-table-cell>
          <uui-checkbox
            label="Select variant"
            ?checked=${e}
            @change=${(u) => this._handleVariantSelection(t.id, u.target.checked)}
            @click=${(u) => u.stopPropagation()}>
          </uui-checkbox>
        </uui-table-cell>
        <uui-table-cell>
          <uui-radio
            name="default-variant-${t.productRootId}"
            ?checked=${t.default}
            ?disabled=${!r}
            title=${n}
            @click=${(u) => {
      u.preventDefault(), r && this._handleSetDefaultVariant(t.id);
    }}>
          </uui-radio>
        </uui-table-cell>
        <uui-table-cell>
          <div class="variant-name-cell">
            <a href=${i} class="variant-link">${t.name || "Unnamed"}</a>
            ${a ? o`<span class="variant-options-text">${a}</span>` : l}
          </div>
        </uui-table-cell>
        <uui-table-cell>${t.sku || "—"}</uui-table-cell>
        <uui-table-cell>${I(t.price)}</uui-table-cell>
        <uui-table-cell>
          <span class="badge ${t.stockStatusCssClass}" title=${t.stockStatusLabel}>${t.totalStock}</span>
        </uui-table-cell>
        <uui-table-cell>
          <span class="badge ${t.availableForPurchase ? "badge-positive" : "badge-danger"}">
            ${t.availableForPurchase ? "Available" : "Unavailable"}
          </span>
        </uui-table-cell>
      </uui-table-row>
    `;
  }
  /**
   * Parses the variant's option key and returns a human-readable description
   * of the option value combination (e.g., "Red / Large / Cotton").
   * Uses utility function from variant-helpers.
   */
  _getVariantOptionDescription(t) {
    return this._product ? it(t, this._product.productOptions) : null;
  }
  async _handleSetDefaultVariant(t) {
    if (!this._product || this._product.variants.find((r) => r.id === t)?.default) return;
    const i = this._product.id, a = this._product.variants.map((r) => ({
      ...r,
      default: r.id === t
    }));
    this._product = { ...this._product, variants: a };
    try {
      const { error: r } = await f.setDefaultVariant(i, t);
      r ? (s(this, g)?.peek("danger", { data: { headline: "Failed to set default variant", message: r.message } }), await s(this, p)?.reload()) : (s(this, g)?.peek("positive", { data: { headline: "Default variant updated", message: "" } }), await s(this, p)?.reload());
    } catch {
      s(this, g)?.peek("danger", { data: { headline: "Error", message: "An unexpected error occurred" } }), await s(this, p)?.reload();
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
          @variant-change=${(t) => this._variantFormData = t.detail}>
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
          @variant-change=${(t) => this._variantFormData = t.detail}>
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
          .totalAvailableStock=${this._variantFormData.totalStock ?? 0}
          .totalReservedStock=${this._variantFormData.totalReservedStock ?? 0}
          @stock-settings-change=${this._handleStockSettingsChange}>
        </merchello-variant-stock-display>
      </div>
    `;
  }
  _handleStockSettingsChange(t) {
    const { warehouseId: e, stock: i, reorderPoint: a, trackStock: r } = t.detail, n = (this._variantFormData.warehouseStock ?? []).map((u) => u.warehouseId !== e ? u : {
      ...u,
      ...i !== void 0 && { stock: i },
      ...a !== void 0 && { reorderPoint: a },
      ...r !== void 0 && { trackStock: r }
    });
    this._variantFormData = { ...this._variantFormData, warehouseStock: n };
  }
  _renderOptionsTab() {
    const t = this._formData.productOptions ?? [], e = s(this, p)?.isNew ?? !0, i = at(t), a = this._optionSettings?.maxProductOptions ?? 5, r = t.length >= a;
    return o`
      <div class="tab-content">
        ${e ? o`
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
            <h3>Product Options <span class="option-count">${t.length}/${a}</span></h3>
            ${i > 0 ? o`<small class="hint">Will generate ${i} variant${i !== 1 ? "s" : ""}</small>` : l}
          </div>
          <uui-button
            look="primary"
            color="positive"
            label="Add Option"
            ?disabled=${e || r}
            @click=${this._addNewOption}>
            <uui-icon name="icon-add"></uui-icon>
            Add Option
          </uui-button>
        </div>

        ${t.length > 0 ? o` <div class="options-list">${t.map((n) => this._renderOptionCard(n))}</div> ` : e ? l : o`
              <div class="empty-state">
                <uui-icon name="icon-layers"></uui-icon>
                <p>No options configured</p>
                <p class="hint">Use the <strong>Add Option</strong> button above to add options like Size, Color, or Material</p>
              </div>
            `}

      </div>
    `;
  }
  _renderOptionCard(t) {
    return o`
      <uui-box class="option-card">
        <div class="option-header">
          <div class="option-info">
            <strong>${t.name}</strong>
            <span class="badge ${t.isVariant ? "badge-positive" : "badge-default"}">
              ${t.isVariant ? "Generates Variants" : "Add-on"}
            </span>
            ${t.isVariant ? l : o` <span class="badge badge-default">${t.isMultiSelect ? "Multi-select" : "Single-select"}</span> `}
            ${t.isVariant ? l : o` <span class="badge badge-default">${t.isRequired ? "Required" : "Optional"}</span> `}
            ${t.optionUiAlias ? o` <span class="badge badge-default">${t.optionUiAlias}</span> ` : l}
          </div>
          <div class="option-actions">
            <uui-button compact look="secondary" @click=${() => this._editOption(t)} label="Edit option" aria-label="Edit ${t.name}">
              <uui-icon name="icon-edit"></uui-icon>
            </uui-button>
            <uui-button compact look="primary" color="danger" @click=${() => this._deleteOption(t.id)} label="Delete option" aria-label="Delete ${t.name}">
              <uui-icon name="icon-trash"></uui-icon>
            </uui-button>
          </div>
        </div>

        <div class="option-values">
          ${t.values.map((e) => this._renderOptionValue(e, t.optionUiAlias))}
          ${t.values.length === 0 ? o`<p class="hint">No values added yet</p>` : l}
        </div>
      </uui-box>
    `;
  }
  _renderOptionValue(t, e) {
    const i = t.priceAdjustment !== 0 || t.costAdjustment !== 0;
    return o`
      <div class="option-value-chip">
        ${e === "colour" && t.hexValue ? o` <span class="color-swatch" style="background-color: ${t.hexValue}"></span> ` : l}
        <span>${t.name}</span>
        ${i ? o`
              <span class="adjustments">
                ${t.priceAdjustment !== 0 ? o`<span class="price-adjustment">${t.priceAdjustment > 0 ? "+" : ""}${I(t.priceAdjustment)}</span>` : l}
                ${t.priceAdjustment !== 0 && t.costAdjustment !== 0 ? o`<span class="adjustment-separator">/</span>` : l}
                ${t.costAdjustment !== 0 ? o`<span class="cost-adjustment">${t.costAdjustment > 0 ? "+" : ""}${I(t.costAdjustment)} cost</span>` : l}
              </span>
            ` : l}
      </div>
    `;
  }
  async _addNewOption() {
    if (!s(this, b) || !this._optionSettings) return;
    const e = await s(this, b).open(this, A, {
      data: {
        option: void 0,
        settings: this._optionSettings
      }
    }).onSubmit().catch(() => {
    });
    if (e?.isSaved && e.option) {
      const i = this._formData.productOptions || [];
      this._formData = {
        ...this._formData,
        productOptions: [...i, e.option]
      }, await this._saveOptions();
    }
  }
  async _editOption(t) {
    if (!s(this, b) || !this._optionSettings) return;
    const i = await s(this, b).open(this, A, {
      data: {
        option: t,
        settings: this._optionSettings
      }
    }).onSubmit().catch(() => {
    });
    if (i?.isSaved) {
      if (i.isDeleted)
        await this._deleteOption(t.id);
      else if (i.option) {
        const a = [...this._formData.productOptions || []], r = a.findIndex((n) => n.id === t.id);
        r !== -1 && (a[r] = i.option, this._formData = { ...this._formData, productOptions: a }, await this._saveOptions());
      }
    }
  }
  async _deleteOption(t) {
    const i = this._formData.productOptions?.find((n) => n.id === t)?.name || "this option", a = s(this, b)?.open(this, V, {
      data: {
        headline: "Delete Option",
        content: `Are you sure you want to delete "${i}"? This action cannot be undone.`,
        confirmLabel: "Delete",
        color: "danger"
      }
    });
    try {
      await a?.onSubmit();
    } catch {
      return;
    }
    if (!s(this, _)) return;
    const r = (this._formData.productOptions || []).filter((n) => n.id !== t);
    this._formData = { ...this._formData, productOptions: r }, await this._saveOptions();
  }
  /**
   * Checks if the variant structure has changed in a way that requires regeneration.
   * Regeneration is needed when:
   * - Variant options are added or removed
   * - Values are added or removed from variant options
   * - The isVariant flag changed on any option
   *
   * Regeneration is NOT needed for metadata-only changes (name, mediaKey, hexValue, etc.)
   */
  _hasVariantStructureChanged() {
    const t = this._product?.productOptions || [], e = this._formData.productOptions || [], i = t.filter((r) => r.isVariant), a = e.filter((r) => r.isVariant);
    if (i.length !== a.length)
      return !0;
    for (const r of a) {
      const n = i.find((v) => v.id === r.id);
      if (!n || n.isVariant !== r.isVariant || n.values.length !== r.values.length)
        return !0;
      const u = new Set(n.values.map((v) => v.id)), m = new Set(r.values.map((v) => v.id));
      if (u.size !== m.size)
        return !0;
      for (const v of m)
        if (!u.has(v))
          return !0;
    }
    for (const r of i)
      if (!a.some((u) => u.id === r.id))
        return !0;
    return !1;
  }
  /**
   * Confirms with user before saving options that will regenerate variants.
   * Returns true if user confirms or no confirmation needed, false if cancelled.
   */
  async _confirmVariantRegeneration() {
    const t = this._product?.variants.length ?? 0;
    if (!this._hasVariantStructureChanged())
      return !0;
    const i = (this._formData.productOptions || []).filter((r) => r.isVariant), a = i.length > 0 ? i.reduce((r, n) => r * (n.values.length || 1), 1) : 1;
    if (t > 0 && i.length > 0) {
      const r = s(this, b)?.open(this, V, {
        data: {
          headline: "Regenerate Variants",
          content: `Saving these options will regenerate all product variants. Current variants: ${t}. New variants to create: ${a}. This will DELETE all existing variants and create new ones. Any variant-specific data (pricing, stock levels, images, SKUs) will need to be re-entered manually.`,
          confirmLabel: "Continue",
          color: "danger"
        }
      });
      try {
        await r?.onSubmit();
      } catch {
        return !1;
      }
      return !!s(this, _);
    }
    if (t > 1 && i.length === 0) {
      const r = s(this, b)?.open(this, V, {
        data: {
          headline: "Remove Variant Options",
          content: `Removing all variant options will collapse this product to a single variant. Current variants: ${t}. After save: 1 variant (default only). ${t - 1} variants will be DELETED. Only the default variant will be kept.`,
          confirmLabel: "Continue",
          color: "danger"
        }
      });
      try {
        await r?.onSubmit();
      } catch {
        return !1;
      }
      return !!s(this, _);
    }
    return !0;
  }
  async _saveOptions() {
    if (!this._product?.id) return;
    if (!await this._confirmVariantRegeneration()) {
      s(this, p)?.reload();
      return;
    }
    try {
      const e = (this._formData.productOptions || []).map((n, u) => ({
        id: n.id,
        name: n.name,
        alias: n.alias ?? void 0,
        sortOrder: u,
        optionTypeAlias: n.optionTypeAlias ?? void 0,
        optionUiAlias: n.optionUiAlias ?? void 0,
        isVariant: n.isVariant,
        isMultiSelect: n.isVariant ? !1 : n.isMultiSelect ?? !0,
        isRequired: n.isVariant ? !1 : n.isRequired ?? !1,
        values: n.values.map((m, v) => ({
          id: m.id,
          name: m.name,
          sortOrder: v,
          hexValue: m.hexValue ?? void 0,
          mediaKey: m.mediaKey ?? void 0,
          priceAdjustment: m.priceAdjustment,
          costAdjustment: m.costAdjustment,
          skuSuffix: m.skuSuffix ?? void 0,
          weightKg: m.weightKg ?? void 0
        }))
      })), i = this._hasVariantStructureChanged();
      s(this, g)?.peek("default", {
        data: { headline: "Saving options...", message: i ? "Variants will be regenerated" : "" }
      });
      const { data: a, error: r } = await f.saveProductOptions(this._product.id, e);
      if (!s(this, _)) return;
      !r && a ? (this._formData = { ...this._formData, productOptions: a }, s(this, g)?.peek("positive", {
        data: { headline: "Options saved", message: i ? "Variants have been regenerated" : "" }
      }), s(this, p)?.reload()) : r && (this._errorMessage = "Failed to save options: " + r.message, s(this, g)?.peek("danger", { data: { headline: "Failed to save options", message: r.message } }));
    } catch (e) {
      if (!s(this, _)) return;
      this._errorMessage = e instanceof Error ? e.message : "Failed to save options", s(this, g)?.peek("danger", { data: { headline: "Error", message: "An unexpected error occurred" } });
    }
  }
  /**
   * Renders the Filters tab for assigning filters to the product.
   * Uses the shared product-filters component.
   * Note: Only shown for single-variant products.
   */
  _renderFiltersTab() {
    const t = s(this, p)?.isNew ?? !0;
    return o`
      <div class="tab-content">
        <merchello-product-filters
          .filterGroups=${this._filterGroups}
          .assignedFilterIds=${this._assignedFilterIds}
          .isNewProduct=${t}
          @filters-change=${this._handleFiltersChange}>
        </merchello-product-filters>
      </div>
    `;
  }
  /** Handles filter selection changes from the shared component */
  _handleFiltersChange(t) {
    this._assignedFilterIds = t.detail.filterIds;
  }
  /**
   * Checks if filter assignments have changed
   */
  _hasFilterChanges() {
    if (this._assignedFilterIds.length !== this._originalAssignedFilterIds.length) return !0;
    const t = [...this._assignedFilterIds].sort(), e = [...this._originalAssignedFilterIds].sort();
    return t.some((i, a) => i !== e[a]);
  }
  /**
   * Saves filter assignments for the product variant
   * Note: Filters are assigned to Products (variants), not ProductRoots
   * Only applicable for single-variant products
   */
  async _saveFilterAssignments() {
    if (!this._isSingleVariant()) return;
    const t = this._product?.variants[0]?.id;
    if (!t || !this._hasFilterChanges()) return;
    const { error: e } = await f.assignFiltersToProduct(t, this._assignedFilterIds);
    if (e) {
      s(this, g)?.peek("danger", {
        data: { headline: "Failed to save filters", message: e.message }
      });
      return;
    }
    this._originalAssignedFilterIds = [...this._assignedFilterIds];
  }
  /**
   * Handles router slot initialization
   */
  _onRouterInit(t) {
    this._routerPath = t.target.absoluteRouterPath;
  }
  /**
   * Handles router slot path changes
   */
  _onRouterChange(t) {
    this._activePath = t.target.localActiveViewPath || "";
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
    const t = s(this, p)?.isNew ?? !0, e = this._getActiveTab();
    return o`
      <umb-body-layout header-fit-height main-no-padding>
        <!-- Header: back button + icon + name input -->
        <uui-button slot="header" compact href=${K()} label="Back" class="back-button">
          <uui-icon name="icon-arrow-left"></uui-icon>
        </uui-button>

        <div id="header" slot="header">
          <umb-icon name="icon-box"></umb-icon>
          <uui-input
            id="name-input"
            .value=${this._formData.rootName || ""}
            @input=${(i) => this._handleInputChange("rootName", i.target.value)}
            placeholder=${t ? "Enter product name..." : "Product name"}
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

          ${e === "details" ? this._renderDetailsTab() : l}
          ${e === "basic-info" && this._isSingleVariant() ? this._renderBasicInfoTab() : l}
          ${e === "media" ? this._renderMediaTab() : l}
          ${e === "shipping" ? this._renderShippingTab() : l}
          ${e === "seo" ? this._renderSeoTab() : l}
          ${e === "feed" && this._isSingleVariant() ? this._renderShoppingFeedTab() : l}
          ${e === "stock" && this._isSingleVariant() ? this._renderStockTab() : l}
          ${e === "variants" ? this._renderVariantsTab() : l}
          ${e === "options" ? this._renderOptionsTab() : l}
          ${e === "filters" && this._isSingleVariant() ? this._renderFiltersTab() : l}
          ${this._isContentTab(e) ? this._renderContentTab(e) : l}
        </umb-body-layout>

        <!-- Footer with save button -->
        <umb-footer-layout slot="footer">
          <uui-button
            slot="actions"
            look="primary"
            color="positive"
            @click=${this._handleSave}
            ?disabled=${this._isSaving}
            label=${this._isSaving ? "Saving..." : t ? "Create Product" : "Save Changes"}>
            ${this._isSaving ? "Saving..." : t ? "Create Product" : "Save Changes"}
          </uui-button>
        </umb-footer-layout>
      </umb-body-layout>
    `;
  }
};
S = /* @__PURE__ */ new WeakMap();
p = /* @__PURE__ */ new WeakMap();
b = /* @__PURE__ */ new WeakMap();
g = /* @__PURE__ */ new WeakMap();
_ = /* @__PURE__ */ new WeakMap();
d.styles = [
  B,
  E`
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

      /* Element Type tabs (rendered after Merchello tabs) */
      uui-tab.merchello-tab--last {
        border-right: none !important;
      }

      uui-tab.element-type-tab--first {
        position: relative;
        margin-left: 0;
        z-index: 1;
      }

      /* Section divider between Merchello tabs and Element Type tabs */
      uui-tab.element-type-tab--first::before {
        content: "";
        position: absolute;
        left: -1px;
        top: 6px;
        bottom: 6px;
        width: 2px;
        background: repeating-linear-gradient(
          to bottom,
          var(--uui-color-border-emphasis, var(--uui-color-divider-standalone, var(--uui-color-border-standalone))) 0 2px,
          transparent 2px 5px
        );
        pointer-events: none;
        z-index: 2;
      }

      uui-tab.element-type-tab--first::part(button) {
        padding-left: var(--uui-size-space-2);
      }

      uui-tab.element-type-tab--first::part(button)::before {
        content: "CONTENT";
        font-size: var(--uui-type-small-size);
        color: var(--uui-color-text-alt);
        text-transform: uppercase;
        letter-spacing: 0.5px;
        font-weight: 600;
        margin-right: var(--uui-size-space-2);
      }

      /* Hide router slot as we render content inline */
      umb-router-slot {
        display: none;
      }

      /* Box styling - Umbraco pattern */
      uui-box {
        --uui-box-default-padding: var(--uui-size-space-5);
      }

      /* Property adjustments */
      umb-property:first-child {
        padding-top: 0;
      }

      umb-property:last-child {
        padding-bottom: 0;
      }

      umb-property uui-select,
      umb-property uui-input,
      umb-property uui-textarea,
      umb-property-layout uui-select,
      umb-property-layout uui-input,
      umb-property-layout uui-textarea {
        width: 100%;
      }

      .view-select-editor {
        display: flex;
        flex-direction: column;
        gap: var(--uui-size-space-2);
      }

      /* Tab content */
      .tab-content {
        display: flex;
        flex-direction: column;
        gap: var(--uui-size-space-5);
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

      .field-error-message {
        color: var(--uui-color-danger);
        display: block;
        font-size: var(--uui-type-small-size);
        margin-top: var(--uui-size-space-1);
      }

      .hint {
        font-size: 0.875rem;
        color: var(--uui-color-text-alt);
        margin: 0;
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
        align-items: flex-start;
        gap: var(--uui-size-space-3);
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

      .data-table uui-table-cell:first-child,
      .data-table uui-table-head-cell:first-child {
        width: 56px;
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

      .adjustments {
        display: flex;
        align-items: center;
        gap: var(--uui-size-space-1);
        font-size: 0.8125rem;
      }

      .price-adjustment {
        font-weight: 600;
        color: var(--uui-color-positive);
      }

      .cost-adjustment {
        font-weight: 500;
        color: var(--uui-color-text-alt);
        font-style: italic;
      }

      .adjustment-separator {
        color: var(--uui-color-border-standalone);
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

      /* Element Type content styling */
      merchello-product-element-properties umb-property {
        --umb-property-layout-description-display: none;
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
], d.prototype, "_variantFormData", 2);
h([
  c()
], d.prototype, "_variantFieldErrors", 2);
h([
  c()
], d.prototype, "_selectedVariantIds", 2);
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
], d.prototype, "_productViews", 2);
h([
  c()
], d.prototype, "_optionSettings", 2);
h([
  c()
], d.prototype, "_elementTypes", 2);
h([
  c()
], d.prototype, "_filterGroups", 2);
h([
  c()
], d.prototype, "_assignedFilterIds", 2);
h([
  c()
], d.prototype, "_originalAssignedFilterIds", 2);
h([
  c()
], d.prototype, "_shippingOptions", 2);
h([
  c()
], d.prototype, "_elementType", 2);
h([
  c()
], d.prototype, "_elementPropertyValues", 2);
h([
  c()
], d.prototype, "_descriptionEditorConfig", 2);
d = h([
  F("merchello-product-detail")
], d);
const kt = d;
export {
  d as MerchelloProductDetailElement,
  kt as default
};
//# sourceMappingURL=product-detail.element-DngrzsX0.js.map
