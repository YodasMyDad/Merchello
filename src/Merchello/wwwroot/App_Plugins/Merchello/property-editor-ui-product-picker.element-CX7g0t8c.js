import { html as r, nothing as m, repeat as A, css as T, property as z, state as _, customElement as O } from "@umbraco-cms/backoffice/external/lit";
import { UmbLitElement as B } from "@umbraco-cms/backoffice/lit-element";
import { UmbFormControlMixin as F } from "@umbraco-cms/backoffice/validation";
import { UmbChangeEvent as R } from "@umbraco-cms/backoffice/event";
import { UMB_MODAL_MANAGER_CONTEXT as D } from "@umbraco-cms/backoffice/modal";
import { UmbSorterController as W } from "@umbraco-cms/backoffice/sorter";
import { M as q } from "./product-picker-modal.token-BfbHsSHl.js";
import { M as N } from "./merchello-api-EmrUndo3.js";
import "./product-image.element-D7HwAIKr.js";
var G = Object.defineProperty, H = Object.getOwnPropertyDescriptor, K = Object.getPrototypeOf, X = Reflect.set, C = (t) => {
  throw TypeError(t);
}, p = (t, e, i, n) => {
  for (var o = n > 1 ? void 0 : n ? H(e, i) : e, f = t.length - 1, u; f >= 0; f--)
    (u = t[f]) && (o = (n ? u(e, i, o) : u(o)) || o);
  return n && o && G(e, i, o), o;
}, P = (t, e, i) => e.has(t) || C("Cannot " + i), l = (t, e, i) => (P(t, e, "read from private field"), i ? i.call(t) : e.get(t)), v = (t, e, i) => e.has(t) ? C("Cannot add the same private member more than once") : e instanceof WeakSet ? e.add(t) : e.set(t, i), b = (t, e, i, n) => (P(t, e, "write to private field"), e.set(t, i), i), a = (t, e, i) => (P(t, e, "access private method"), i), j = (t, e, i, n) => ({
  set _(o) {
    b(t, e, o);
  },
  get _() {
    return l(t, e, n);
  }
}), J = (t, e, i, n) => (X(K(t), i, n, e), n), I, g, x, d, s, U, k, y, $, M, w, E, S, L;
let c = class extends F(
  B,
  void 0
) {
  constructor() {
    super(), v(this, s), this.readonly = !1, this._selection = [], this._maxItems = 1, this._collectionIds = [], this._productTypeIds = [], this._filterValueIds = [], this._isLoading = !1, v(this, I), v(this, g, !1), v(this, x, 0), v(this, d, new W(this, {
      getUniqueOfElement: (t) => t.getAttribute("data-id"),
      getUniqueOfModel: (t) => t.id,
      identifier: "Merchello.ProductPicker",
      itemSelector: ".product-item",
      containerSelector: ".product-list",
      onChange: ({ model: t }) => {
        this._selection = t, a(this, s, k).call(this);
      }
    })), this.consumeContext(D, (t) => {
      b(this, I, t);
    });
  }
  connectedCallback() {
    super.connectedCallback(), b(this, g, !0);
  }
  disconnectedCallback() {
    super.disconnectedCallback(), b(this, g, !1);
  }
  set config(t) {
    const e = t?.getValueByAlias("maxItems");
    this._maxItems = e === 0 ? 1 / 0 : e ?? 1;
    const i = t?.getValueByAlias("collectionIds");
    this._collectionIds = i ? i.split(",").filter(Boolean) : [];
    const n = t?.getValueByAlias("productTypeIds");
    this._productTypeIds = n ? n.split(",").filter(Boolean) : [];
    const o = t?.getValueByAlias("filterValueIds");
    this._filterValueIds = o ? o.split(",").filter(Boolean) : [];
  }
  set value(t) {
    super.value = t, a(this, s, U).call(this, t);
  }
  get value() {
    return super.value;
  }
  render() {
    return this._isLoading && this._selection.length === 0 ? r`<uui-loader></uui-loader>` : this._maxItems === 1 ? a(this, s, E).call(this) : a(this, s, S).call(this);
  }
};
I = /* @__PURE__ */ new WeakMap();
g = /* @__PURE__ */ new WeakMap();
x = /* @__PURE__ */ new WeakMap();
d = /* @__PURE__ */ new WeakMap();
s = /* @__PURE__ */ new WeakSet();
U = async function(t) {
  const e = ++j(this, x)._;
  if (!t) {
    this._selection = [], this._maxItems !== 1 && l(this, d).setModel([]);
    return;
  }
  const i = t.split(",").filter((u) => u.trim());
  if (i.length === 0) {
    this._selection = [], this._maxItems !== 1 && l(this, d).setModel([]);
    return;
  }
  this._isLoading = !0;
  const { data: n, error: o } = await N.getVariantsByIds(i);
  if (!l(this, g) || e !== l(this, x)) return;
  if (this._isLoading = !1, o) {
    console.error("Failed to load product variants:", o), this._selection = i.map((u) => ({
      id: u,
      name: "Unknown",
      sku: null,
      price: 0,
      imageUrl: null,
      notFound: !0
    })), this._maxItems !== 1 && l(this, d).setModel(this._selection);
    return;
  }
  const f = i.map((u) => {
    const h = n?.find((V) => V.id === u);
    return h?.found ? {
      id: h.id,
      name: h.name ?? h.rootName ?? "Unknown",
      sku: h.sku ?? null,
      price: h.price ?? 0,
      imageUrl: h.imageUrl ?? null,
      notFound: !1
    } : {
      id: u,
      name: "Product not found",
      sku: null,
      price: 0,
      imageUrl: null,
      notFound: !0
    };
  });
  this._selection = f, this._maxItems !== 1 && l(this, d).setModel(f);
};
k = function() {
  const t = this._selection.length > 0 ? this._selection.map((e) => e.id).join(",") : void 0;
  J(c.prototype, this, "value", t), this.dispatchEvent(new R());
};
y = async function() {
  if (this.readonly || !l(this, I)) return;
  const t = this._selection.map((o) => o.id), e = await l(this, I).open(this, q, {
    data: {
      config: {
        currencySymbol: "£",
        // TODO: Get from store settings
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
  const i = e.selections.map((o) => ({
    id: o.productId,
    name: o.name,
    sku: o.sku,
    price: o.price,
    imageUrl: o.imageUrl,
    notFound: !1
  }));
  if (this._maxItems !== 1) {
    const o = [...this._selection, ...i];
    this._selection = this._maxItems === 1 / 0 ? o : o.slice(0, this._maxItems);
  } else
    this._selection = i.slice(0, 1);
  l(this, d).setModel(this._selection), a(this, s, k).call(this);
};
$ = function(t) {
  this._selection = this._selection.filter((e) => e.id !== t), l(this, d).setModel(this._selection), a(this, s, k).call(this);
};
M = function() {
  this._selection = [], l(this, d).setModel([]), a(this, s, k).call(this);
};
w = function(t) {
  return `£${t.toFixed(2)}`;
};
E = function() {
  const t = this._selection[0];
  return t ? t.notFound ? r`
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
          ${this.readonly ? m : r`
                <div class="actions">
                  <uui-button
                    compact
                    look="secondary"
                    label="Change"
                    @click=${a(this, s, y)}>
                    <uui-icon name="icon-edit"></uui-icon>
                  </uui-button>
                  <uui-button
                    compact
                    look="secondary"
                    label="Clear"
                    @click=${a(this, s, M)}>
                    <uui-icon name="icon-trash"></uui-icon>
                  </uui-button>
                </div>
              `}
        </div>
      ` : r`
      <div class="single-select-display">
        <div class="product-info">
          <merchello-product-image
            media-key=${t.imageUrl ?? ""}
            size="medium"
            alt=${t.name}>
          </merchello-product-image>
          <div class="product-details">
            <span class="product-name">${t.name}</span>
            ${t.sku ? r`<span class="product-sku">${t.sku}</span>` : m}
            <span class="product-price">${a(this, s, w).call(this, t.price)}</span>
          </div>
        </div>
        ${this.readonly ? m : r`
              <div class="actions">
                <uui-button
                  compact
                  look="secondary"
                  label="Change"
                  @click=${a(this, s, y)}>
                  <uui-icon name="icon-edit"></uui-icon>
                </uui-button>
                <uui-button
                  compact
                  look="secondary"
                  label="Clear"
                  @click=${a(this, s, M)}>
                  <uui-icon name="icon-trash"></uui-icon>
                </uui-button>
              </div>
            `}
      </div>
    ` : r`
        <uui-button
          look="placeholder"
          label="Select product"
          @click=${a(this, s, y)}
          ?disabled=${this.readonly || this._isLoading}>
          ${this._isLoading ? "Loading..." : "Select a product..."}
        </uui-button>
      `;
};
S = function() {
  const t = !this.readonly && this._selection.length < this._maxItems;
  return r`
      <div class="product-list">
        ${A(
    this._selection,
    (e) => e.id,
    (e) => a(this, s, L).call(this, e)
  )}
      </div>
      ${t ? r`
            <uui-button
              look="placeholder"
              label="Add product"
              @click=${a(this, s, y)}
              ?disabled=${this._isLoading}>
              ${this._isLoading ? "Loading..." : "Add product"}
            </uui-button>
          ` : m}
    `;
};
L = function(t) {
  return t.notFound ? r`
        <div class="product-item not-found" data-id=${t.id}>
          <uui-icon name="icon-navigation" class="drag-handle"></uui-icon>
          <div class="product-image-placeholder">
            <uui-icon name="icon-alert"></uui-icon>
          </div>
          <div class="product-details">
            <span class="product-name">Product not found</span>
            <span class="product-id">ID: ${t.id}</span>
          </div>
          ${this.readonly ? m : r`
                <uui-button
                  compact
                  look="secondary"
                  label="Remove"
                  @click=${() => a(this, s, $).call(this, t.id)}>
                  <uui-icon name="icon-trash"></uui-icon>
                </uui-button>
              `}
        </div>
      ` : r`
      <div class="product-item" data-id=${t.id}>
        <uui-icon name="icon-navigation" class="drag-handle"></uui-icon>
        <merchello-product-image
          media-key=${t.imageUrl ?? ""}
          size="small"
          alt=${t.name}>
        </merchello-product-image>
        <div class="product-details">
          <span class="product-name">${t.name}</span>
          ${t.sku ? r`<span class="product-sku">${t.sku}</span>` : m}
        </div>
        <span class="product-price">${a(this, s, w).call(this, t.price)}</span>
        ${this.readonly ? m : r`
              <uui-button
                compact
                look="secondary"
                label="Remove"
                @click=${() => a(this, s, $).call(this, t.id)}>
                <uui-icon name="icon-trash"></uui-icon>
              </uui-button>
            `}
      </div>
    `;
};
c.styles = T`
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
], c.prototype, "readonly", 2);
p([
  _()
], c.prototype, "_selection", 2);
p([
  _()
], c.prototype, "_maxItems", 2);
p([
  _()
], c.prototype, "_collectionIds", 2);
p([
  _()
], c.prototype, "_productTypeIds", 2);
p([
  _()
], c.prototype, "_filterValueIds", 2);
p([
  _()
], c.prototype, "_isLoading", 2);
c = p([
  O("merchello-property-editor-ui-product-picker")
], c);
const nt = c;
export {
  c as MerchelloPropertyEditorUiProductPickerElement,
  nt as default
};
//# sourceMappingURL=property-editor-ui-product-picker.element-CX7g0t8c.js.map
