import { html as a, nothing as g, repeat as A, css as U, property as z, state as k, customElement as R } from "@umbraco-cms/backoffice/external/lit";
import { UmbLitElement as F } from "@umbraco-cms/backoffice/lit-element";
import { UmbFormControlMixin as W } from "@umbraco-cms/backoffice/validation";
import { UmbChangeEvent as D } from "@umbraco-cms/backoffice/event";
import { UMB_MODAL_MANAGER_CONTEXT as q } from "@umbraco-cms/backoffice/modal";
import { UmbSorterController as N } from "@umbraco-cms/backoffice/sorter";
import { M as T } from "./collection-picker-modal.token-DEqocfk-.js";
import { M as $ } from "./merchello-api-DNSJzonx.js";
var V = Object.defineProperty, B = Object.getOwnPropertyDescriptor, G = Object.getPrototypeOf, H = Reflect.set, w = (t) => {
  throw TypeError(t);
}, m = (t, e, i, n) => {
  for (var o = n > 1 ? void 0 : n ? B(e, i) : e, u = t.length - 1, h; u >= 0; u--)
    (h = t[u]) && (o = (n ? h(e, i, o) : h(o)) || o);
  return n && o && V(e, i, o), o;
}, I = (t, e, i) => e.has(t) || w("Cannot " + i), l = (t, e, i) => (I(t, e, "read from private field"), i ? i.call(t) : e.get(t)), f = (t, e, i) => e.has(t) ? w("Cannot add the same private member more than once") : e instanceof WeakSet ? e.add(t) : e.set(t, i), b = (t, e, i, n) => (I(t, e, "write to private field"), e.set(t, i), i), c = (t, e, i) => (I(t, e, "access private method"), i), K = (t, e, i, n) => ({
  set _(o) {
    b(t, e, o);
  },
  get _() {
    return l(t, e, n);
  }
}), X = (t, e, i, n) => (H(G(t), i, n, e), n), C, p, _, r, s, L, y, v, M, x, E, S, P;
let d = class extends W(
  F,
  void 0
) {
  constructor() {
    super(), f(this, s), this.readonly = !1, this._selection = [], this._maxItems = 1, this._isLoading = !1, this._allCollections = [], f(this, C), f(this, p, !1), f(this, _, 0), f(this, r, new N(this, {
      getUniqueOfElement: (t) => t.getAttribute("data-id"),
      getUniqueOfModel: (t) => t.id,
      identifier: "Merchello.CollectionPicker",
      itemSelector: ".collection-item",
      containerSelector: ".collection-list",
      onChange: ({ model: t }) => {
        this._selection = t, c(this, s, y).call(this);
      }
    })), l(this, r).disable(), this.consumeContext(q, (t) => {
      b(this, C, t);
    });
  }
  connectedCallback() {
    super.connectedCallback(), b(this, p, !0);
  }
  disconnectedCallback() {
    super.disconnectedCallback(), b(this, p, !1);
  }
  set config(t) {
    const e = t?.getValueByAlias("maxItems");
    if (this._maxItems = e === 0 ? 1 / 0 : e ?? 1, this._maxItems === 1) {
      l(this, r).disable();
      return;
    }
    l(this, r).enable(), l(this, r).setModel(this._selection);
  }
  set value(t) {
    super.value = t, c(this, s, L).call(this, t);
  }
  get value() {
    return super.value;
  }
  render() {
    const t = this._maxItems !== 1;
    return !t && this._isLoading && this._selection.length === 0 ? a`<uui-loader></uui-loader>` : t ? c(this, s, S).call(this) : c(this, s, E).call(this);
  }
};
C = /* @__PURE__ */ new WeakMap();
p = /* @__PURE__ */ new WeakMap();
_ = /* @__PURE__ */ new WeakMap();
r = /* @__PURE__ */ new WeakMap();
s = /* @__PURE__ */ new WeakSet();
L = async function(t) {
  const e = ++K(this, _)._;
  if (!t) {
    this._selection = [], this._maxItems !== 1 && l(this, r).setModel([]);
    return;
  }
  const i = t.split(",").filter((o) => o.trim());
  if (i.length === 0) {
    this._selection = [], this._maxItems !== 1 && l(this, r).setModel([]);
    return;
  }
  if (this._allCollections.length === 0) {
    this._isLoading = !0;
    const { data: o } = await $.getProductCollections();
    if (!l(this, p) || e !== l(this, _)) return;
    this._allCollections = o ?? [], this._isLoading = !1;
  }
  if (e !== l(this, _)) return;
  const n = [];
  for (const o of i) {
    const u = this._allCollections.find((h) => h.id === o);
    u ? n.push({
      id: u.id,
      name: u.name,
      productCount: u.productCount,
      notFound: !1
    }) : n.push({
      id: o,
      name: "Collection not found",
      productCount: 0,
      notFound: !0
    });
  }
  this._selection = n, this._maxItems !== 1 && l(this, r).setModel(n);
};
y = function() {
  const t = this._selection.length > 0 ? this._selection.map((e) => e.id).join(",") : void 0;
  X(d.prototype, this, "value", t), this.dispatchEvent(new D());
};
v = async function() {
  if (this.readonly || !l(this, C)) return;
  if (this._allCollections.length === 0) {
    this._isLoading = !0;
    const { data: o } = await $.getProductCollections();
    if (!l(this, p)) return;
    this._allCollections = o ?? [], this._isLoading = !1;
  }
  const t = this._maxItems !== 1, e = this._selection.map((o) => o.id), i = await l(this, C).open(this, T, {
    data: {
      excludeIds: e,
      multiSelect: t
    }
  }).onSubmit().catch(() => {
  });
  if (!i || i.selectedIds.length === 0) return;
  const n = i.selectedIds.map((o, u) => {
    const h = this._allCollections.find((O) => O.id === o);
    return {
      id: o,
      name: i.selectedNames[u] ?? h?.name ?? "Unknown",
      productCount: i.selectedCounts?.[u] ?? h?.productCount ?? 0,
      notFound: !1
    };
  });
  if (t) {
    const o = [...this._selection, ...n];
    this._selection = this._maxItems === 1 / 0 ? o : o.slice(0, this._maxItems);
  } else
    this._selection = n.slice(0, 1);
  l(this, r).setModel(this._selection), c(this, s, y).call(this);
};
M = function(t) {
  this._selection = this._selection.filter((e) => e.id !== t), l(this, r).setModel(this._selection), c(this, s, y).call(this);
};
x = function() {
  this._selection = [], l(this, r).setModel([]), c(this, s, y).call(this);
};
E = function() {
  const t = this._selection[0];
  return t ? t.notFound ? a`
        <div class="single-select-display not-found">
          <div class="collection-info">
            <uui-icon name="icon-alert"></uui-icon>
            <span class="collection-name">${t.name}</span>
            <span class="collection-id">ID: ${t.id}</span>
          </div>
          ${this.readonly ? g : a`
                <div class="actions">
                  <uui-button
                    compact
                    look="secondary"
                    label="Change"
                    @click=${c(this, s, v)}>
                    <uui-icon name="icon-edit"></uui-icon>
                  </uui-button>
                  <uui-button
                    compact
                    look="secondary"
                    label="Clear"
                    @click=${c(this, s, x)}>
                    <uui-icon name="icon-trash"></uui-icon>
                  </uui-button>
                </div>
              `}
        </div>
      ` : a`
      <div class="single-select-display">
        <div class="collection-info">
          <uui-icon name="icon-folder"></uui-icon>
          <span class="collection-name">${t.name}</span>
          <span class="product-count">(${t.productCount} products)</span>
        </div>
        ${this.readonly ? g : a`
              <div class="actions">
                <uui-button
                  compact
                  look="secondary"
                  label="Change"
                  @click=${c(this, s, v)}>
                  <uui-icon name="icon-edit"></uui-icon>
                </uui-button>
                <uui-button
                  compact
                  look="secondary"
                  label="Clear"
                  @click=${c(this, s, x)}>
                  <uui-icon name="icon-trash"></uui-icon>
                </uui-button>
              </div>
            `}
      </div>
    ` : a`
        <uui-button
          look="placeholder"
          label="Select collection"
          @click=${c(this, s, v)}
          ?disabled=${this.readonly || this._isLoading}>
          ${this._isLoading ? "Loading..." : "Select a collection..."}
        </uui-button>
      `;
};
S = function() {
  const t = !this.readonly && this._selection.length < this._maxItems;
  return a`
      <div class="collection-list">
        ${A(
    this._selection,
    (e) => e.id,
    (e) => c(this, s, P).call(this, e)
  )}
      </div>
      ${t ? a`
            <uui-button
              look="placeholder"
              label="Add collection"
              @click=${c(this, s, v)}
              ?disabled=${this._isLoading}>
              ${this._isLoading ? "Loading..." : "Add collection"}
            </uui-button>
          ` : g}
    `;
};
P = function(t) {
  return t.notFound ? a`
        <div class="collection-item not-found" data-id=${t.id}>
          <uui-icon name="icon-navigation" class="drag-handle"></uui-icon>
          <uui-icon name="icon-alert"></uui-icon>
          <span class="collection-name">${t.name}</span>
          <span class="collection-id">ID: ${t.id}</span>
          ${this.readonly ? g : a`
                <uui-button
                  compact
                  look="secondary"
                  label="Remove"
                  @click=${() => c(this, s, M).call(this, t.id)}>
                  <uui-icon name="icon-trash"></uui-icon>
                </uui-button>
              `}
        </div>
      ` : a`
      <div class="collection-item" data-id=${t.id}>
        <uui-icon name="icon-navigation" class="drag-handle"></uui-icon>
        <uui-icon name="icon-folder"></uui-icon>
        <span class="collection-name">${t.name}</span>
        <span class="product-count">(${t.productCount} products)</span>
        ${this.readonly ? g : a`
              <uui-button
                compact
                look="secondary"
                label="Remove"
                @click=${() => c(this, s, M).call(this, t.id)}>
                <uui-icon name="icon-trash"></uui-icon>
              </uui-button>
            `}
      </div>
    `;
};
d.styles = U`
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

    .collection-info {
      display: flex;
      align-items: center;
      gap: var(--uui-size-space-2);
    }

    .collection-name {
      font-weight: 500;
    }

    .product-count {
      color: var(--uui-color-text-alt);
      font-size: 0.9em;
    }

    .actions {
      display: flex;
      gap: var(--uui-size-space-1);
    }

    .collection-list {
      display: flex;
      flex-direction: column;
      gap: var(--uui-size-space-2);
      margin-bottom: var(--uui-size-space-2);
    }

    .collection-item {
      display: flex;
      align-items: center;
      gap: var(--uui-size-space-2);
      padding: var(--uui-size-space-3);
      background: var(--uui-color-surface-alt);
      border-radius: var(--uui-border-radius);
    }

    .collection-item .collection-name {
      flex: 1;
    }

    .not-found {
      background: var(--uui-color-danger-standalone);
    }

    .collection-id {
      color: var(--uui-color-text-alt);
      font-size: 0.75em;
      font-family: monospace;
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
m([
  z({ type: Boolean, reflect: !0 })
], d.prototype, "readonly", 2);
m([
  k()
], d.prototype, "_selection", 2);
m([
  k()
], d.prototype, "_maxItems", 2);
m([
  k()
], d.prototype, "_isLoading", 2);
m([
  k()
], d.prototype, "_allCollections", 2);
d = m([
  R("merchello-property-editor-ui-collection-picker")
], d);
const ot = d;
export {
  d as MerchelloPropertyEditorUiCollectionPickerElement,
  ot as default
};
//# sourceMappingURL=property-editor-ui-collection-picker.element-ty9vm-_F.js.map
