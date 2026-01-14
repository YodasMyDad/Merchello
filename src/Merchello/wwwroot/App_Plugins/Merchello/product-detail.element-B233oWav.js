import { LitElement as S, nothing as n, html as o, css as O, property as x, state as c, customElement as E } from "@umbraco-cms/backoffice/external/lit";
import { UmbElementMixin as F } from "@umbraco-cms/backoffice/element-api";
import { UMB_WORKSPACE_CONTEXT as U } from "@umbraco-cms/backoffice/workspace";
import { UmbModalToken as N, UMB_MODAL_MANAGER_CONTEXT as R, UMB_CONFIRM_MODAL as I } from "@umbraco-cms/backoffice/modal";
import { UMB_NOTIFICATION_CONTEXT as j } from "@umbraco-cms/backoffice/notification";
import { M as g } from "./merchello-api-BAKL0aIE.js";
import "@umbraco-cms/backoffice/property";
import { b as B } from "./badge.styles-DUcdl6GY.js";
import { q as L, r as W } from "./navigation-Y0bwD8V1.js";
import { a as C } from "./formatting-CG1-kUla.js";
import { UmbChangeEvent as K } from "@umbraco-cms/backoffice/event";
import "./product-shipping-exclusions.element-C9wmmLsg.js";
import { UmbDataTypeDetailRepository as H } from "@umbraco-cms/backoffice/data-type";
import { UmbPropertyEditorConfigCollection as V } from "@umbraco-cms/backoffice/property-editor";
import "@umbraco-cms/backoffice/tiptap";
var q = Object.defineProperty, Y = Object.getOwnPropertyDescriptor, k = (t, e, i, a) => {
  for (var r = a > 1 ? void 0 : a ? Y(e, i) : e, l = t.length - 1, u; l >= 0; l--)
    (u = t[l]) && (r = (a ? u(e, i, r) : u(r)) || r);
  return a && r && q(e, i, r), r;
};
let y = class extends F(S) {
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
    if (!this.elementType) return n;
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
            ` : n}

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
    return t.length === 0 ? n : t.map((e) => o`
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
y.styles = O`
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
  x({ attribute: !1 })
], y.prototype, "elementType", 2);
k([
  x({ attribute: !1 })
], y.prototype, "values", 2);
k([
  x({ type: String })
], y.prototype, "activeTabId", 2);
k([
  c()
], y.prototype, "_datasetValue", 2);
y = k([
  E("merchello-product-element-properties")
], y);
const A = new N(
  "Merchello.OptionEditor.Modal",
  {
    modal: {
      type: "sidebar",
      size: "medium"
    }
  }
);
var X = Object.defineProperty, J = Object.getOwnPropertyDescriptor, w = (t, e, i, a) => {
  for (var r = a > 1 ? void 0 : a ? J(e, i) : e, l = t.length - 1, u; l >= 0; l--)
    (u = t[l]) && (r = (a ? u(e, i, r) : u(r)) || r);
  return a && r && X(e, i, r), r;
};
let b = class extends F(S) {
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
    this.items = t, this.dispatchEvent(new K());
  }
  render() {
    return o`
      <div class="editable-list-container">
        ${this.items.length > 0 ? o`
              <ul class="item-list">
                ${this.items.map((t, e) => this._renderItem(t, e))}
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
          role=${this.readonly ? n : "button"}
          aria-label=${this.readonly ? n : `Edit "${t}"`}>
          ${t}
        </span>
        ${this.readonly ? n : o`
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
b.styles = O`
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
  x({ type: Array })
], b.prototype, "items", 2);
w([
  x({ type: String })
], b.prototype, "placeholder", 2);
w([
  x({ type: Boolean })
], b.prototype, "readonly", 2);
w([
  c()
], b.prototype, "_newItemValue", 2);
w([
  c()
], b.prototype, "_editingIndex", 2);
w([
  c()
], b.prototype, "_editingValue", 2);
b = w([
  E("merchello-editable-text-list")
], b);
function Q(t, e = {}) {
  const i = {};
  return t.rootName?.trim() || (i.rootName = "Product name is required"), t.taxGroupId || (i.taxGroupId = "Tax group is required"), t.productTypeId || (i.productTypeId = "Product type is required"), !(e.isDigitalProduct ?? t.isDigitalProduct ?? !1) && (!t.warehouseIds || t.warehouseIds.length === 0) && (i.warehouseIds = "At least one warehouse is required for physical products"), {
    isValid: Object.keys(i).length === 0,
    errors: i
  };
}
function Z(t) {
  const e = {};
  return t.sku?.trim() || (e.sku = "SKU is required"), (t.price ?? 0) < 0 && (e.price = "Price must be 0 or greater"), t.costOfGoods !== void 0 && t.costOfGoods < 0 && (e.costOfGoods = "Cost of goods must be 0 or greater"), t.onSale && t.previousPrice !== void 0 && t.previousPrice !== null && t.previousPrice < 0 && (e.previousPrice = "Previous price must be 0 or greater"), {
    isValid: Object.keys(e).length === 0,
    errors: e
  };
}
function tt(t, e) {
  if (!t && !e)
    return null;
  const i = [];
  return t && i.push("Details"), e && i.push("Basic Info"), `Please fix the errors on the ${i.join(" and ")} tab${i.length > 1 ? "s" : ""} before saving`;
}
function et(t, e) {
  if (!t.variantOptionsKey)
    return null;
  const i = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi, a = t.variantOptionsKey.match(i) || [], r = [];
  for (const l of a)
    for (const u of e) {
      const _ = u.values.find((P) => P.id === l);
      if (_) {
        r.push(_.name);
        break;
      }
    }
  return r.length > 0 ? r.join(" / ") : null;
}
function it(t) {
  const e = t.filter((i) => i.isVariant);
  return e.length === 0 ? 0 : e.reduce((i, a) => i * (a.values.length || 1), 1);
}
function at(t) {
  switch (t) {
    case "OutOfStock":
      return "badge-danger";
    case "LowStock":
      return "badge-warning";
    case "InStock":
      return "badge-positive";
    case "Untracked":
    default:
      return "badge-default";
  }
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
var nt = Object.defineProperty, lt = Object.getOwnPropertyDescriptor, z = (t) => {
  throw TypeError(t);
}, p = (t, e, i, a) => {
  for (var r = a > 1 ? void 0 : a ? lt(e, i) : e, l = t.length - 1, u; l >= 0; l--)
    (u = t[l]) && (r = (a ? u(e, i, r) : u(r)) || r);
  return a && r && nt(e, i, r), r;
}, M = (t, e, i) => e.has(t) || z("Cannot " + i), s = (t, e, i) => (M(t, e, "read from private field"), e.get(t)), $ = (t, e, i) => e.has(t) ? z("Cannot add the same private member more than once") : e instanceof WeakSet ? e.add(t) : e.set(t, i), D = (t, e, i, a) => (M(t, e, "write to private field"), e.set(t, i), i), T, h, v, m, f;
let d = class extends F(S) {
  constructor() {
    super(), this._product = null, this._isLoading = !0, this._isSaving = !1, this._errorMessage = null, this._validationAttempted = !1, this._fieldErrors = {}, this._routes = [], this._activePath = "", this._formData = {}, this._variantFormData = {}, this._variantFieldErrors = {}, this._taxGroups = [], this._productTypes = [], this._warehouses = [], this._productViews = [], this._optionSettings = null, this._filterGroups = [], this._assignedFilterIds = [], this._originalAssignedFilterIds = [], this._shippingOptions = [], this._elementType = null, this._elementPropertyValues = {}, this._descriptionEditorConfig = void 0, this._descriptionBlocks = null, $(this, T, new H(this)), $(this, h), $(this, v), $(this, m), $(this, f, !1), this.consumeContext(U, (t) => {
      D(this, h, t), s(this, h) && (this.observe(s(this, h).product, (e) => {
        this._product = e ?? null, e && (this._formData = { ...e }, this._descriptionBlocks = null, this._shippingOptions = e.availableShippingOptions ?? [], e.variants.length === 1 && (this._variantFormData = { ...e.variants[0] }, this._loadAssignedFilters()), e.elementProperties && (this._elementPropertyValues = { ...e.elementProperties })), this._isLoading = !e;
      }, "_product"), this.observe(s(this, h).elementType, (e) => {
        this._elementType = e;
      }, "_elementType"), this.observe(s(this, h).elementPropertyValues, (e) => {
        this._elementPropertyValues = e;
      }, "_elementPropertyValues"), this.observe(s(this, h).filterGroups, (e) => {
        this._filterGroups = e;
      }, "_filterGroups"));
    }), this.consumeContext(R, (t) => {
      D(this, v, t);
    }), this.consumeContext(j, (t) => {
      D(this, m, t);
    });
  }
  connectedCallback() {
    super.connectedCallback(), D(this, f, !0), this._loadReferenceData(), this._createRoutes();
  }
  disconnectedCallback() {
    super.disconnectedCallback(), D(this, f, !1);
  }
  async _loadReferenceData() {
    try {
      s(this, h)?.loadFilterGroups();
      const [t, e, i, a, r, l] = await Promise.all([
        g.getTaxGroups(),
        g.getProductTypes(),
        g.getWarehouses(),
        g.getProductOptionSettings(),
        g.getDescriptionEditorSettings(),
        g.getProductViews()
      ]);
      if (!s(this, f) || (t.data && (this._taxGroups = t.data), e.data && (this._productTypes = e.data), i.data && (this._warehouses = i.data), a.data && (this._optionSettings = a.data), l.data && (this._productViews = l.data), r.data?.dataTypeKey && (await this._loadDataTypeConfig(r.data.dataTypeKey), !s(this, f))))
        return;
      await this._loadAssignedFilters(), await s(this, h)?.loadElementType();
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
    if (!t || s(this, h)?.isNew) return;
    const { data: e } = await g.getFiltersForProduct(t);
    if (s(this, f) && e) {
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
      const { error: e } = await s(this, T).requestByUnique(t);
      if (e) {
        this._setFallbackEditorConfig();
        return;
      }
      this.observe(
        await s(this, T).byUnique(t),
        (i) => {
          if (s(this, f)) {
            if (!i) {
              this._setFallbackEditorConfig();
              return;
            }
            this._descriptionEditorConfig = new V(i.values);
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
    this._descriptionEditorConfig = new V([
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
  _handleToggleChange(t, e) {
    this._formData = { ...this._formData, [t]: e };
  }
  _getTaxGroupOptions() {
    return [
      { name: "Select tax group...", value: "", selected: !this._formData.taxGroupId },
      ...this._taxGroups.map((t) => ({
        name: t.name,
        value: t.id,
        selected: t.id === this._formData.taxGroupId
      }))
    ];
  }
  _getProductTypeOptions() {
    return [
      { name: "Select product type...", value: "", selected: !this._formData.productTypeId },
      ...this._productTypes.map((t) => ({
        name: t.name,
        value: t.id,
        selected: t.id === this._formData.productTypeId
      }))
    ];
  }
  _handleTaxGroupChange(t) {
    const e = t.target;
    this._formData = { ...this._formData, taxGroupId: e.value };
  }
  _handleProductTypeChange(t) {
    const e = t.target;
    this._formData = { ...this._formData, productTypeId: e.value };
  }
  _getViewOptions() {
    return this._productViews.map((t) => ({
      name: t.alias,
      value: t.alias,
      selected: t.alias === this._formData.viewAlias
    }));
  }
  _handleViewChange(t) {
    const e = t.target;
    this._formData = { ...this._formData, viewAlias: e.value };
  }
  async _handleSave() {
    if (this._validateForm()) {
      this._isSaving = !0, this._errorMessage = null;
      try {
        s(this, h)?.isNew ?? !0 ? await this._createProduct() : await this._updateProduct();
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
      taxGroupId: this._formData.taxGroupId || "",
      productTypeId: this._formData.productTypeId || "",
      collectionIds: this._formData.collectionIds,
      warehouseIds: this._formData.warehouseIds,
      rootImages: this._formData.rootImages,
      isDigitalProduct: this._formData.isDigitalProduct || !1,
      defaultVariant: {
        sku: this._variantFormData.sku ?? void 0,
        price: this._variantFormData.price ?? 0,
        costOfGoods: this._variantFormData.costOfGoods ?? 0
      }
    }, { data: e, error: i } = await g.createProduct(t);
    if (i) {
      this._errorMessage = i.message, s(this, m)?.peek("danger", { data: { headline: "Failed to create product", message: i.message } });
      return;
    }
    e && (s(this, h)?.updateProduct(e), s(this, m)?.peek("positive", { data: { headline: "Product created", message: `"${e.rootName}" has been created successfully` } }), this._validationAttempted = !1, this._fieldErrors = {});
  }
  async _updateProduct() {
    if (!this._product?.id) return;
    const t = {
      rootName: this._formData.rootName,
      rootImages: this._formData.rootImages,
      rootUrl: this._formData.rootUrl ?? void 0,
      googleShoppingFeedCategory: this._formData.googleShoppingFeedCategory ?? void 0,
      isDigitalProduct: this._formData.isDigitalProduct,
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
      // Element Type property values
      elementProperties: Object.keys(this._elementPropertyValues).length > 0 ? this._elementPropertyValues : void 0
    }, { data: e, error: i } = await g.updateProduct(this._product.id, t);
    if (i) {
      this._errorMessage = i.message, s(this, m)?.peek("danger", { data: { headline: "Failed to save product", message: i.message } });
      return;
    }
    if (this._isSingleVariant() && this._product.variants[0]) {
      const a = await this._saveVariantData(this._product.id, this._product.variants[0].id);
      if (a) {
        this._errorMessage = a.message, s(this, m)?.peek("danger", { data: { headline: "Failed to save variant data", message: a.message } });
        return;
      }
    }
    this._isSingleVariant() && await this._saveFilterAssignments(), await this._saveShippingExclusions(), e && (await s(this, h)?.reload(), s(this, m)?.peek("positive", { data: { headline: "Product saved", message: "Changes have been saved successfully" } }));
  }
  /** Saves shipping exclusions for all variants (bulk mode) */
  async _saveShippingExclusions() {
    if (!this._product?.id) return;
    const t = this._shippingOptions.filter((a) => a.isExcluded).map((a) => a.id), e = t.length > 0, i = this._shippingOptions.some((a) => a.isPartiallyExcluded || a.excludedVariantCount > 0);
    if (e || i) {
      const { error: a } = await g.updateProductShippingExclusions(this._product.id, t);
      a && s(this, m)?.peek("warning", {
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
    }, { error: a } = await g.updateVariant(t, e, i);
    return a ?? null;
  }
  /**
   * Validates the form and sets field-level errors.
   * Uses validation utility functions for product root and variant validation.
   */
  _validateForm() {
    this._validationAttempted = !0, this._errorMessage = null;
    const t = Q(this._formData, {
      isDigitalProduct: this._formData.isDigitalProduct
    });
    this._fieldErrors = t.errors;
    let e = { isValid: !0, errors: {} };
    this._isSingleVariant() && (e = Z(this._variantFormData)), this._variantFieldErrors = e.errors;
    const i = tt(
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
    const t = this._product?.variants.length ?? 0, e = this._product?.productOptions.length ?? 0, i = this._isSingleVariant(), a = this._getActiveTab(), r = this._getTabHint("details"), l = this._getTabHint("variants"), u = this._getTabHint("options");
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

        ${t > 1 ? o`
              <uui-tab
                label="Variants"
                href="${this._routerPath}/tab/variants"
                ?active=${a === "variants"}>
                Variants (${t})
                ${l ? o`<uui-badge slot="extra" color="warning">!</uui-badge>` : n}
              </uui-tab>
            ` : n}

        <uui-tab
          label="Options"
          class=${i ? "" : "merchello-tab--last"}
          href="${this._routerPath}/tab/options"
          ?active=${a === "options"}>
          Options (${e})
          ${u ? o`<uui-badge slot="extra" color="warning">!</uui-badge>` : n}
        </uui-tab>

        ${i ? o`
              <uui-tab
                label="Filters"
                class="merchello-tab--last"
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
  _renderElementTypeTabs(t) {
    if (!this._elementType) return n;
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
    if (!this._elementType) return n;
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
    this._elementPropertyValues = { ...e }, s(this, h)?.setElementPropertyValues(e);
  }
  _renderDetailsTab() {
    const t = s(this, h)?.isNew ?? !0;
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
              @change=${(e) => this._handleToggleChange("isDigitalProduct", e.target.checked)}>
            </uui-toggle>
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
  // Shipping Tab
  // ============================================
  /**
   * Renders the shipping tab with package configurations.
   * Uses the shared product-packages component.
   */
  _renderShippingTab() {
    const t = this._formData.defaultPackageConfigurations ?? [], e = s(this, h)?.isNew ?? !0;
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
  /**
   * Renders the Description rich text editor using Umbraco's TipTap input component.
   * The editor configuration comes from a DataType that can be customized in Settings > Data Types.
   */
  _renderDescriptionEditor() {
    if (!this._descriptionEditorConfig)
      return o`<uui-loader-bar></uui-loader-bar>`;
    const t = this._getDescriptionMarkup();
    return o`
      <umb-input-tiptap
        .configuration=${this._descriptionEditorConfig}
        .value=${t}
        @change=${this._handleDescriptionChange}>
      </umb-input-tiptap>
    `;
  }
  /**
   * Extracts the markup string from the description field.
   * Handles both new JSON format (RichTextEditorValue) and legacy plain markup.
   */
  _getDescriptionMarkup() {
    const t = this._formData.description;
    if (!t) return "";
    try {
      const e = JSON.parse(t);
      return e.blocks && !this._descriptionBlocks && (this._descriptionBlocks = e.blocks), e.markup || "";
    } catch {
      return t;
    }
  }
  /**
   * Handles changes from the Description rich text editor.
   * Builds the full RichTextEditorValue JSON structure for storage.
   */
  _handleDescriptionChange(t) {
    const a = {
      markup: t.target?.value || "",
      blocks: this._descriptionBlocks
    };
    this._formData = {
      ...this._formData,
      description: JSON.stringify(a)
    };
  }
  _renderMediaPicker() {
    const t = this._formData.rootImages || [], e = t.map((i) => ({ key: i, mediaKey: i }));
    return o`
      <umb-input-rich-media
        .value=${e}
        ?multiple=${!0}
        @change=${this._handleMediaChange}>
      </umb-input-rich-media>
      ${t.length === 0 ? o`
        <div class="empty-media-state">
          <uui-icon name="icon-picture"></uui-icon>
          <p>No images added yet</p>
          <small>Click the button above to add product images</small>
        </div>
      ` : n}
    `;
  }
  _handleMediaChange(t) {
    const a = (t.target?.value || []).map((r) => r.mediaKey).filter(Boolean);
    this._formData = { ...this._formData, rootImages: a };
  }
  _renderSeoTab() {
    const t = this._formData.openGraphImage ? [{ key: this._formData.openGraphImage, mediaKey: this._formData.openGraphImage }] : [];
    return o`
      <div class="tab-content">
        <uui-box headline="Search Engine Optimization">
          <umb-property-layout
            label="Product URL"
            description="The URL path for this product on your storefront">
            <uui-input
              slot="editor"
              .value=${this._formData.rootUrl || ""}
              @input=${(e) => this._handleInputChange("rootUrl", e.target.value)}
              placeholder="/products/my-product">
            </uui-input>
          </umb-property-layout>

          <umb-property-layout
            label="Page Title"
            description="The title shown in browser tabs and search results">
            <uui-input
              slot="editor"
              .value=${this._formData.pageTitle || ""}
              @input=${(e) => this._handleInputChange("pageTitle", e.target.value)}
              placeholder="e.g., Blue T-Shirt | Your Store Name">
            </uui-input>
          </umb-property-layout>

          <umb-property-layout
            label="Meta Description"
            description="The description shown in search results (recommended: 150-160 characters)">
            <uui-textarea
              slot="editor"
              .value=${this._formData.metaDescription || ""}
              @input=${(e) => this._handleInputChange("metaDescription", e.target.value)}
              placeholder="A brief description for search engines...">
            </uui-textarea>
          </umb-property-layout>

          <umb-property-layout
            label="Canonical URL"
            description="Optional URL to indicate the preferred version of this page for SEO">
            <uui-input
              slot="editor"
              .value=${this._formData.canonicalUrl || ""}
              @input=${(e) => this._handleInputChange("canonicalUrl", e.target.value)}
              placeholder="https://example.com/products/blue-t-shirt">
            </uui-input>
          </umb-property-layout>

          <umb-property-layout
            label="Hide from Search Engines"
            description="Adds noindex meta tag to prevent search engines from indexing this page">
            <uui-toggle
              slot="editor"
              .checked=${this._formData.noIndex ?? !1}
              @change=${(e) => this._handleToggleChange("noIndex", e.target.checked)}>
            </uui-toggle>
          </umb-property-layout>
        </uui-box>

        <uui-box headline="Social Sharing">
          <umb-property-layout
            label="Open Graph Image"
            description="Image displayed when this page is shared on social media">
            <div slot="editor">
              <umb-input-rich-media
                .value=${t}
                ?multiple=${!1}
                @change=${this._handleOpenGraphImageChange}>
              </umb-input-rich-media>
              <small style="color: var(--uui-color-text-alt); display: block; margin-top: var(--uui-size-space-2);">Recommended size: 1200×630 pixels</small>
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
    const t = this._formData.pageTitle || this._formData.rootName || "Product Title", e = this._formData.metaDescription || "No meta description set. Add a description to improve search visibility.", i = this._formData.canonicalUrl || "https://yourstore.com/products/product-name", a = this._formatUrlAsBreadcrumb(i), r = 60, l = 160, u = t.length > r, _ = e.length > l, P = u ? t.substring(0, r - 3) + "..." : t, G = _ ? e.substring(0, l - 3) + "..." : e;
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
        <div class="google-preview-title">${P}</div>
        <div class="google-preview-description">${G}</div>
      </div>
      <div class="google-preview-stats">
        <span class="${u ? "stat-warning" : "stat-ok"}">
          Title: ${t.length}/${r} chars ${u ? "(will be truncated)" : ""}
        </span>
        <span class="${_ ? "stat-warning" : "stat-ok"}">
          Description: ${e.length}/${l} chars ${_ ? "(will be truncated)" : ""}
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
  _handleOpenGraphImageChange(t) {
    const i = t.target?.value || [], a = i.length > 0 ? i[0].mediaKey : null;
    this._formData = { ...this._formData, openGraphImage: a };
  }
  _renderWarehouseSelector() {
    const t = this._formData.warehouseIds || [];
    return o`
      <div class="warehouse-toggle-list">
        ${this._warehouses.map(
      (e) => o`
            <div class="toggle-field">
              <uui-toggle
                .checked=${t.includes(e.id)}
                @change=${(i) => this._handleWarehouseToggle(e.id, i.target.checked)}>
              </uui-toggle>
              <label>${e.name} ${e.code ? `(${e.code})` : ""}</label>
            </div>
          `
    )}
        ${this._warehouses.length === 0 ? o`<p class="hint">No warehouses available. Create a warehouse first.</p>` : n}
      </div>
    `;
  }
  _handleWarehouseToggle(t, e) {
    const i = this._formData.warehouseIds || [];
    e ? this._formData = { ...this._formData, warehouseIds: [...i, t] } : this._formData = { ...this._formData, warehouseIds: i.filter((a) => a !== t) };
  }
  _renderVariantsTab() {
    const t = this._product?.variants ?? [];
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
            ${t.map((e) => this._renderVariantRow(e))}
          </uui-table>
        </div>
      </div>
    `;
  }
  _renderVariantRow(t) {
    const e = this._product ? L(this._product.id, t.id) : "", i = this._getVariantOptionDescription(t), a = t.canBeDefault, r = a ? "" : "Cannot set as default: variant is unavailable or out of stock";
    return o`
      <uui-table-row>
        <uui-table-cell>
          <uui-radio
            name="default-variant-${t.productRootId}"
            ?checked=${t.default}
            ?disabled=${!a}
            title=${r}
            @click=${(l) => {
      l.preventDefault(), a && this._handleSetDefaultVariant(t.id);
    }}>
          </uui-radio>
        </uui-table-cell>
        <uui-table-cell>
          <div class="variant-name-cell">
            <a href=${e} class="variant-link">${t.name || "Unnamed"}</a>
            ${i ? o`<span class="variant-options-text">${i}</span>` : n}
          </div>
        </uui-table-cell>
        <uui-table-cell>${t.sku || "—"}</uui-table-cell>
        <uui-table-cell>${C(t.price)}</uui-table-cell>
        <uui-table-cell>
          <span class="badge ${at(t.stockStatus)}">${t.totalStock}</span>
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
    return this._product ? et(t, this._product.productOptions) : null;
  }
  async _handleSetDefaultVariant(t) {
    if (!this._product || this._product.variants.find((r) => r.id === t)?.default) return;
    const i = this._product.id, a = this._product.variants.map((r) => ({
      ...r,
      default: r.id === t
    }));
    this._product = { ...this._product, variants: a };
    try {
      const { error: r } = await g.setDefaultVariant(i, t);
      r ? (s(this, m)?.peek("danger", { data: { headline: "Failed to set default variant", message: r.message } }), await s(this, h)?.reload()) : (s(this, m)?.peek("positive", { data: { headline: "Default variant updated", message: "" } }), await s(this, h)?.reload());
    } catch {
      s(this, m)?.peek("danger", { data: { headline: "Error", message: "An unexpected error occurred" } }), await s(this, h)?.reload();
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
          @stock-settings-change=${this._handleStockSettingsChange}>
        </merchello-variant-stock-display>
      </div>
    `;
  }
  _handleStockSettingsChange(t) {
    const { warehouseId: e, stock: i, reorderPoint: a, trackStock: r } = t.detail, l = (this._variantFormData.warehouseStock ?? []).map((u) => u.warehouseId !== e ? u : {
      ...u,
      ...i !== void 0 && { stock: i },
      ...a !== void 0 && { reorderPoint: a },
      ...r !== void 0 && { trackStock: r }
    });
    this._variantFormData = { ...this._variantFormData, warehouseStock: l };
  }
  _renderOptionsTab() {
    const t = this._formData.productOptions ?? [], e = s(this, h)?.isNew ?? !0, i = it(t), a = this._optionSettings?.maxProductOptions ?? 5, r = t.length >= a;
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
            ${i > 0 ? o`<small class="hint">Will generate ${i} variant${i !== 1 ? "s" : ""}</small>` : n}
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

        ${t.length > 0 ? o` <div class="options-list">${t.map((l) => this._renderOptionCard(l))}</div> ` : e ? n : o`
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
            ${t.optionUiAlias ? o` <span class="badge badge-default">${t.optionUiAlias}</span> ` : n}
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
          ${t.values.length === 0 ? o`<p class="hint">No values added yet</p>` : n}
        </div>
      </uui-box>
    `;
  }
  _renderOptionValue(t, e) {
    const i = t.priceAdjustment !== 0 || t.costAdjustment !== 0;
    return o`
      <div class="option-value-chip">
        ${e === "colour" && t.hexValue ? o` <span class="color-swatch" style="background-color: ${t.hexValue}"></span> ` : n}
        <span>${t.name}</span>
        ${i ? o`
              <span class="adjustments">
                ${t.priceAdjustment !== 0 ? o`<span class="price-adjustment">${t.priceAdjustment > 0 ? "+" : ""}${C(t.priceAdjustment)}</span>` : n}
                ${t.priceAdjustment !== 0 && t.costAdjustment !== 0 ? o`<span class="adjustment-separator">/</span>` : n}
                ${t.costAdjustment !== 0 ? o`<span class="cost-adjustment">${t.costAdjustment > 0 ? "+" : ""}${C(t.costAdjustment)} cost</span>` : n}
              </span>
            ` : n}
      </div>
    `;
  }
  async _addNewOption() {
    if (!s(this, v) || !this._optionSettings) return;
    const e = await s(this, v).open(this, A, {
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
    if (!s(this, v) || !this._optionSettings) return;
    const i = await s(this, v).open(this, A, {
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
        const a = this._formData.productOptions || [], r = a.findIndex((l) => l.id === t.id);
        r !== -1 && (a[r] = i.option, this._formData = { ...this._formData, productOptions: [...a] }, await this._saveOptions());
      }
    }
  }
  async _deleteOption(t) {
    const i = this._formData.productOptions?.find((l) => l.id === t)?.name || "this option", a = s(this, v)?.open(this, I, {
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
    if (!s(this, f)) return;
    const r = (this._formData.productOptions || []).filter((l) => l.id !== t);
    this._formData = { ...this._formData, productOptions: r }, await this._saveOptions();
  }
  /**
   * Confirms with user before saving options that will regenerate variants.
   * Returns true if user confirms or no confirmation needed, false if cancelled.
   */
  async _confirmVariantRegeneration() {
    const e = (this._formData.productOptions || []).filter((r) => r.isVariant), i = this._product?.variants.length ?? 0, a = e.length > 0 ? e.reduce((r, l) => r * (l.values.length || 1), 1) : 1;
    if (i > 0 && e.length > 0) {
      const r = s(this, v)?.open(this, I, {
        data: {
          headline: "Regenerate Variants",
          content: `Saving these options will regenerate all product variants. Current variants: ${i}. New variants to create: ${a}. This will DELETE all existing variants and create new ones. Any variant-specific data (pricing, stock levels, images, SKUs) will need to be re-entered manually.`,
          confirmLabel: "Continue",
          color: "danger"
        }
      });
      try {
        await r?.onSubmit();
      } catch {
        return !1;
      }
      return !!s(this, f);
    }
    if (i > 1 && e.length === 0) {
      const r = s(this, v)?.open(this, I, {
        data: {
          headline: "Remove Variant Options",
          content: `Removing all variant options will collapse this product to a single variant. Current variants: ${i}. After save: 1 variant (default only). ${i - 1} variants will be DELETED. Only the default variant will be kept.`,
          confirmLabel: "Continue",
          color: "danger"
        }
      });
      try {
        await r?.onSubmit();
      } catch {
        return !1;
      }
      return !!s(this, f);
    }
    return !0;
  }
  async _saveOptions() {
    if (!this._product?.id) return;
    if (!await this._confirmVariantRegeneration()) {
      s(this, h)?.reload();
      return;
    }
    try {
      const e = (this._formData.productOptions || []).map((r, l) => ({
        id: r.id,
        name: r.name,
        alias: r.alias ?? void 0,
        sortOrder: l,
        optionTypeAlias: r.optionTypeAlias ?? void 0,
        optionUiAlias: r.optionUiAlias ?? void 0,
        isVariant: r.isVariant,
        values: r.values.map((u, _) => ({
          id: u.id,
          name: u.name,
          sortOrder: _,
          hexValue: u.hexValue ?? void 0,
          mediaKey: u.mediaKey ?? void 0,
          priceAdjustment: u.priceAdjustment,
          costAdjustment: u.costAdjustment,
          skuSuffix: u.skuSuffix ?? void 0
        }))
      }));
      s(this, m)?.peek("default", { data: { headline: "Saving options...", message: "Variants will be regenerated" } });
      const { data: i, error: a } = await g.saveProductOptions(this._product.id, e);
      if (!s(this, f)) return;
      !a && i ? (this._formData = { ...this._formData, productOptions: i }, s(this, m)?.peek("positive", { data: { headline: "Options saved", message: "Variants have been regenerated" } }), s(this, h)?.reload()) : a && (this._errorMessage = "Failed to save options: " + a.message, s(this, m)?.peek("danger", { data: { headline: "Failed to save options", message: a.message } }));
    } catch (e) {
      if (!s(this, f)) return;
      this._errorMessage = e instanceof Error ? e.message : "Failed to save options", s(this, m)?.peek("danger", { data: { headline: "Error", message: "An unexpected error occurred" } });
    }
  }
  /**
   * Renders the Filters tab for assigning filters to the product.
   * Uses the shared product-filters component.
   * Note: Only shown for single-variant products.
   */
  _renderFiltersTab() {
    const t = s(this, h)?.isNew ?? !0;
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
    const { error: e } = await g.assignFiltersToProduct(t, this._assignedFilterIds);
    if (e) {
      s(this, m)?.peek("danger", {
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
    const t = s(this, h)?.isNew ?? !0, e = this._getActiveTab();
    return o`
      <umb-body-layout header-fit-height main-no-padding>
        <!-- Header: back button + icon + name input -->
        <uui-button slot="header" compact href=${W()} label="Back" class="back-button">
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

          ${e === "details" ? this._renderDetailsTab() : n}
          ${e === "basic-info" && this._isSingleVariant() ? this._renderBasicInfoTab() : n}
          ${e === "media" ? this._renderMediaTab() : n}
          ${e === "shipping" ? this._renderShippingTab() : n}
          ${e === "seo" ? this._renderSeoTab() : n}
          ${e === "feed" && this._isSingleVariant() ? this._renderShoppingFeedTab() : n}
          ${e === "stock" && this._isSingleVariant() ? this._renderStockTab() : n}
          ${e === "variants" ? this._renderVariantsTab() : n}
          ${e === "options" ? this._renderOptionsTab() : n}
          ${e === "filters" && this._isSingleVariant() ? this._renderFiltersTab() : n}
          ${this._isContentTab(e) ? this._renderContentTab(e) : n}
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
T = /* @__PURE__ */ new WeakMap();
h = /* @__PURE__ */ new WeakMap();
v = /* @__PURE__ */ new WeakMap();
m = /* @__PURE__ */ new WeakMap();
f = /* @__PURE__ */ new WeakMap();
d.styles = [
  B,
  O`
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

      /* Description editor styling */
      umb-property-dataset {
        display: block;
      }

      umb-property-dataset umb-property {
        --umb-property-layout-description-display: none;
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
], d.prototype, "_variantFormData", 2);
p([
  c()
], d.prototype, "_variantFieldErrors", 2);
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
], d.prototype, "_productViews", 2);
p([
  c()
], d.prototype, "_optionSettings", 2);
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
], d.prototype, "_shippingOptions", 2);
p([
  c()
], d.prototype, "_elementType", 2);
p([
  c()
], d.prototype, "_elementPropertyValues", 2);
p([
  c()
], d.prototype, "_descriptionEditorConfig", 2);
p([
  c()
], d.prototype, "_descriptionBlocks", 2);
d = p([
  E("merchello-product-detail")
], d);
const Dt = d;
export {
  d as MerchelloProductDetailElement,
  Dt as default
};
//# sourceMappingURL=product-detail.element-B233oWav.js.map
