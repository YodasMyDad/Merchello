import { html as l, nothing as m, repeat as A, css as T, property as z, state as _, customElement as O } from "@umbraco-cms/backoffice/external/lit";
import { UmbLitElement as B } from "@umbraco-cms/backoffice/lit-element";
import { UmbFormControlMixin as R } from "@umbraco-cms/backoffice/validation";
import { UmbChangeEvent as F } from "@umbraco-cms/backoffice/event";
import { UMB_MODAL_MANAGER_CONTEXT as D } from "@umbraco-cms/backoffice/modal";
import { UmbSorterController as W } from "@umbraco-cms/backoffice/sorter";
import { M as q } from "./product-picker-modal.token-BfbHsSHl.js";
import { M as N } from "./merchello-api-DFeoGYDY.js";
import { g as G, b as H } from "./store-settings-BfPYtFfT.js";
import { a as K } from "./formatting-DPh4-DfL.js";
import "./product-image.element-DwGTTyOK.js";
var X = Object.defineProperty, j = Object.getOwnPropertyDescriptor, J = Object.getPrototypeOf, Q = Reflect.set, w = (t) => {
  throw TypeError(t);
}, p = (t, e, i, n) => {
  for (var s = n > 1 ? void 0 : n ? j(e, i) : e, f = t.length - 1, d; f >= 0; f--)
    (d = t[f]) && (s = (n ? d(e, i, s) : d(s)) || s);
  return n && s && X(e, i, s), s;
}, P = (t, e, i) => e.has(t) || w("Cannot " + i), r = (t, e, i) => (P(t, e, "read from private field"), i ? i.call(t) : e.get(t)), g = (t, e, i) => e.has(t) ? w("Cannot add the same private member more than once") : e instanceof WeakSet ? e.add(t) : e.set(t, i), k = (t, e, i, n) => (P(t, e, "write to private field"), e.set(t, i), i), a = (t, e, i) => (P(t, e, "access private method"), i), Y = (t, e, i, n) => ({
  set _(s) {
    k(t, e, s);
  },
  get _() {
    return r(t, e, n);
  }
}), Z = (t, e, i, n) => (Q(J(t), i, n, e), n), I, v, x, c, o, S, b, y, M, $, C, U, E, L;
let u = class extends R(
  B,
  void 0
) {
  constructor() {
    super(), g(this, o), this.readonly = !1, this._selection = [], this._maxItems = 1, this._collectionIds = [], this._productTypeIds = [], this._filterValueIds = [], this._isLoading = !1, g(this, I), g(this, v, !1), g(this, x, 0), g(this, c, new W(this, {
      getUniqueOfElement: (t) => t.getAttribute("data-id"),
      getUniqueOfModel: (t) => t.id,
      identifier: "Merchello.ProductPicker",
      itemSelector: ".product-item",
      containerSelector: ".product-list",
      onChange: ({ model: t }) => {
        this._selection = t, a(this, o, b).call(this);
      }
    })), r(this, c).disable(), this.consumeContext(D, (t) => {
      k(this, I, t);
    });
  }
  connectedCallback() {
    super.connectedCallback(), k(this, v, !0), G();
  }
  disconnectedCallback() {
    super.disconnectedCallback(), k(this, v, !1);
  }
  set config(t) {
    const e = t?.getValueByAlias("maxItems");
    this._maxItems = e === 0 ? 1 / 0 : e ?? 1, this._maxItems === 1 ? r(this, c).disable() : (r(this, c).enable(), r(this, c).setModel(this._selection));
    const i = t?.getValueByAlias("collectionIds");
    this._collectionIds = i ? i.split(",").filter(Boolean) : [];
    const n = t?.getValueByAlias("productTypeIds");
    this._productTypeIds = n ? n.split(",").filter(Boolean) : [];
    const s = t?.getValueByAlias("filterValueIds");
    this._filterValueIds = s ? s.split(",").filter(Boolean) : [];
  }
  set value(t) {
    super.value = t, a(this, o, S).call(this, t);
  }
  get value() {
    return super.value;
  }
  render() {
    const t = this._maxItems !== 1;
    return !t && this._isLoading && this._selection.length === 0 ? l`<uui-loader></uui-loader>` : t ? a(this, o, E).call(this) : a(this, o, U).call(this);
  }
};
I = /* @__PURE__ */ new WeakMap();
v = /* @__PURE__ */ new WeakMap();
x = /* @__PURE__ */ new WeakMap();
c = /* @__PURE__ */ new WeakMap();
o = /* @__PURE__ */ new WeakSet();
S = async function(t) {
  const e = ++Y(this, x)._;
  if (!t) {
    this._selection = [], this._maxItems !== 1 && r(this, c).setModel([]);
    return;
  }
  const i = t.split(",").filter((d) => d.trim());
  if (i.length === 0) {
    this._selection = [], this._maxItems !== 1 && r(this, c).setModel([]);
    return;
  }
  this._isLoading = !0;
  const { data: n, error: s } = await N.getVariantsByIds(i);
  if (!r(this, v) || e !== r(this, x)) return;
  if (this._isLoading = !1, s) {
    this._selection = i.map((d) => ({
      id: d,
      name: "Unknown",
      sku: null,
      price: 0,
      imageUrl: null,
      notFound: !0
    })), this._maxItems !== 1 && r(this, c).setModel(this._selection);
    return;
  }
  const f = i.map((d) => {
    const h = n?.find((V) => V.id === d);
    return h?.found ? {
      id: h.id,
      name: h.name ?? h.rootName ?? "Unknown",
      sku: h.sku ?? null,
      price: h.price ?? 0,
      imageUrl: h.imageUrl ?? null,
      notFound: !1
    } : {
      id: d,
      name: "Product not found",
      sku: null,
      price: 0,
      imageUrl: null,
      notFound: !0
    };
  });
  this._selection = f, this._maxItems !== 1 && r(this, c).setModel(f);
};
b = function() {
  const t = this._selection.length > 0 ? this._selection.map((e) => e.id).join(",") : void 0;
  Z(u.prototype, this, "value", t), this.dispatchEvent(new F());
};
y = async function() {
  if (this.readonly || !r(this, I)) return;
  const t = this._selection.map((s) => s.id), e = await r(this, I).open(this, q, {
    data: {
      config: {
        currencySymbol: H(),
        excludeProductIds: t,
        productTypeId: this._productTypeIds.length === 1 ? this._productTypeIds[0] : void 0,
        productTypeIds: this._productTypeIds.length > 1 ? this._productTypeIds : void 0,
        collectionId: this._collectionIds.length === 1 ? this._collectionIds[0] : void 0,
        collectionIds: this._collectionIds.length > 1 ? this._collectionIds : void 0,
        filterValueIds: this._filterValueIds.length > 0 ? this._filterValueIds : void 0,
        propertyEditorMode: !0,
        showAddons: !1,
        showImages: !0,
        maxItems: this._maxItems === 1 ? 1 : this._maxItems - this._selection.length
      }
    }
  }).onSubmit().catch(() => {
  });
  if (!e || e.selections.length === 0) return;
  const i = e.selections.map((s) => ({
    id: s.productId,
    name: s.name,
    sku: s.sku,
    price: s.price,
    imageUrl: s.imageUrl,
    notFound: !1
  }));
  if (this._maxItems !== 1) {
    const s = [...this._selection, ...i];
    this._selection = this._maxItems === 1 / 0 ? s : s.slice(0, this._maxItems);
  } else
    this._selection = i.slice(0, 1);
  r(this, c).setModel(this._selection), a(this, o, b).call(this);
};
M = function(t) {
  this._selection = this._selection.filter((e) => e.id !== t), r(this, c).setModel(this._selection), a(this, o, b).call(this);
};
$ = function() {
  this._selection = [], r(this, c).setModel([]), a(this, o, b).call(this);
};
C = function(t) {
  return K(t);
};
U = function() {
  const t = this._selection[0];
  return t ? t.notFound ? l`
        <div class="single-select-display not-found">
          <div class="product-info">
            <div class="product-image-placeholder">
              <uui-icon name="icon-alert"></uui-icon>
            </div>
            <div class="product-details">
              <span class="product-name">Product not found</span>
              <span class="product-id">ID: ${t.id}</span>
            </div>
          </div>
          ${this.readonly ? m : l`
                <div class="actions">
                  <uui-button
                    compact
                    look="secondary"
                    label="Change"
                    @click=${a(this, o, y)}>
                    <uui-icon name="icon-edit"></uui-icon>
                  </uui-button>
                  <uui-button
                    compact
                    look="secondary"
                    label="Clear"
                    @click=${a(this, o, $)}>
                    <uui-icon name="icon-trash"></uui-icon>
                  </uui-button>
                </div>
              `}
        </div>
      ` : l`
      <div class="single-select-display">
        <div class="product-info">
          <merchello-product-image
            media-key=${t.imageUrl ?? ""}
            size="medium"
            alt=${t.name}>
          </merchello-product-image>
          <div class="product-details">
            <span class="product-name">${t.name}</span>
            ${t.sku ? l`<span class="product-sku">${t.sku}</span>` : m}
            <span class="product-price">${a(this, o, C).call(this, t.price)}</span>
          </div>
        </div>
        ${this.readonly ? m : l`
              <div class="actions">
                <uui-button
                  compact
                  look="secondary"
                  label="Change"
                  @click=${a(this, o, y)}>
                  <uui-icon name="icon-edit"></uui-icon>
                </uui-button>
                <uui-button
                  compact
                  look="secondary"
                  label="Clear"
                  @click=${a(this, o, $)}>
                  <uui-icon name="icon-trash"></uui-icon>
                </uui-button>
              </div>
            `}
      </div>
    ` : l`
        <uui-button
          look="placeholder"
          label="Select product"
          @click=${a(this, o, y)}
          ?disabled=${this.readonly || this._isLoading}>
          ${this._isLoading ? "Loading..." : "Select a product..."}
        </uui-button>
      `;
};
E = function() {
  const t = !this.readonly && this._selection.length < this._maxItems;
  return l`
      <div class="product-list">
        ${A(
    this._selection,
    (e) => e.id,
    (e) => a(this, o, L).call(this, e)
  )}
      </div>
      ${t ? l`
            <uui-button
              look="placeholder"
              label="Add product"
              @click=${a(this, o, y)}
              ?disabled=${this._isLoading}>
              ${this._isLoading ? "Loading..." : "Add product"}
            </uui-button>
          ` : m}
    `;
};
L = function(t) {
  return t.notFound ? l`
        <div class="product-item not-found" data-id=${t.id}>
          <uui-icon name="icon-navigation" class="drag-handle"></uui-icon>
          <div class="product-image-placeholder">
            <uui-icon name="icon-alert"></uui-icon>
          </div>
          <div class="product-details">
            <span class="product-name">Product not found</span>
            <span class="product-id">ID: ${t.id}</span>
          </div>
          ${this.readonly ? m : l`
                <uui-button
                  compact
                  look="secondary"
                  label="Remove"
                  @click=${() => a(this, o, M).call(this, t.id)}>
                  <uui-icon name="icon-trash"></uui-icon>
                </uui-button>
              `}
        </div>
      ` : l`
      <div class="product-item" data-id=${t.id}>
        <uui-icon name="icon-navigation" class="drag-handle"></uui-icon>
        <merchello-product-image
          media-key=${t.imageUrl ?? ""}
          size="small"
          alt=${t.name}>
        </merchello-product-image>
        <div class="product-details">
          <span class="product-name">${t.name}</span>
          ${t.sku ? l`<span class="product-sku">${t.sku}</span>` : m}
        </div>
        <span class="product-price">${a(this, o, C).call(this, t.price)}</span>
        ${this.readonly ? m : l`
              <uui-button
                compact
                look="secondary"
                label="Remove"
                @click=${() => a(this, o, M).call(this, t.id)}>
                <uui-icon name="icon-trash"></uui-icon>
              </uui-button>
            `}
      </div>
    `;
};
u.styles = T`
    :host {
      display: block;
    }

    .single-select-display {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: var(--uui-size-space-3);
      background: var(--uui-color-surface-alt);
      border-radius: var(--uui-border-radius);
    }

    .single-select-display.not-found {
      background: var(--uui-color-danger-standalone);
    }

    .product-info {
      display: flex;
      align-items: center;
      gap: var(--uui-size-space-3);
    }

    .product-details {
      display: flex;
      flex-direction: column;
      gap: var(--uui-size-space-1);
    }

    .product-name {
      font-weight: 500;
    }

    .product-sku {
      color: var(--uui-color-text-alt);
      font-size: 0.85em;
    }

    .product-id {
      color: var(--uui-color-text-alt);
      font-size: 0.75em;
      font-family: monospace;
    }

    .product-price {
      color: var(--uui-color-positive);
      font-weight: 600;
      font-size: 0.9em;
    }

    .product-image-placeholder {
      width: 40px;
      height: 40px;
      display: flex;
      align-items: center;
      justify-content: center;
      background: var(--uui-color-surface);
      border-radius: var(--uui-border-radius);
      color: var(--uui-color-danger);
    }

    .actions {
      display: flex;
      gap: var(--uui-size-space-1);
    }

    .product-list {
      display: flex;
      flex-direction: column;
      gap: var(--uui-size-space-2);
      margin-bottom: var(--uui-size-space-2);
    }

    .product-item {
      display: flex;
      align-items: center;
      gap: var(--uui-size-space-2);
      padding: var(--uui-size-space-3);
      background: var(--uui-color-surface-alt);
      border-radius: var(--uui-border-radius);
    }

    .product-item.not-found {
      background: var(--uui-color-danger-standalone);
    }

    .product-item .product-details {
      flex: 1;
    }

    .product-item .product-price {
      margin-right: var(--uui-size-space-2);
    }

    .drag-handle {
      cursor: grab;
      color: var(--uui-color-text-alt);
    }

    .drag-handle:active {
      cursor: grabbing;
    }

    uui-button[look="placeholder"] {
      width: 100%;
    }
  `;
p([
  z({ type: Boolean, reflect: !0 })
], u.prototype, "readonly", 2);
p([
  _()
], u.prototype, "_selection", 2);
p([
  _()
], u.prototype, "_maxItems", 2);
p([
  _()
], u.prototype, "_collectionIds", 2);
p([
  _()
], u.prototype, "_productTypeIds", 2);
p([
  _()
], u.prototype, "_filterValueIds", 2);
p([
  _()
], u.prototype, "_isLoading", 2);
u = p([
  O("merchello-property-editor-ui-product-picker")
], u);
const dt = u;
export {
  u as MerchelloPropertyEditorUiProductPickerElement,
  dt as default
};
//# sourceMappingURL=property-editor-ui-product-picker.element-B7tGGItN.js.map
