import { html as l, nothing as h, repeat as O, css as A, property as U, state as P, customElement as z } from "@umbraco-cms/backoffice/external/lit";
import { UmbLitElement as R } from "@umbraco-cms/backoffice/lit-element";
import { UmbFormControlMixin as D } from "@umbraco-cms/backoffice/validation";
import { UmbChangeEvent as F } from "@umbraco-cms/backoffice/event";
import { UMB_MODAL_MANAGER_CONTEXT as W } from "@umbraco-cms/backoffice/modal";
import { UmbSorterController as q } from "@umbraco-cms/backoffice/sorter";
import { M as V } from "./product-type-picker-modal.token-BIXbr0YK.js";
import { M as I } from "./merchello-api-BT8AWvQk.js";
var B = Object.defineProperty, N = Object.getOwnPropertyDescriptor, G = Object.getPrototypeOf, H = Reflect.set, C = (e) => {
  throw TypeError(e);
}, _ = (e, t, i, a) => {
  for (var s = a > 1 ? void 0 : a ? N(t, i) : t, r = e.length - 1, d; r >= 0; r--)
    (d = e[r]) && (s = (a ? d(t, i, s) : d(s)) || s);
  return a && s && B(t, i, s), s;
}, x = (e, t, i) => t.has(e) || C("Cannot " + i), c = (e, t, i) => (x(e, t, "read from private field"), i ? i.call(e) : t.get(e)), f = (e, t, i) => t.has(e) ? C("Cannot add the same private member more than once") : t instanceof WeakSet ? t.add(e) : t.set(e, i), k = (e, t, i, a) => (x(e, t, "write to private field"), t.set(e, i), i), o = (e, t, i) => (x(e, t, "access private method"), i), K = (e, t, i, a) => ({
  set _(s) {
    k(e, t, s);
  },
  get _() {
    return c(e, t, a);
  }
}), X = (e, t, i, a) => (H(G(e), i, a, t), a), g, m, y, p, n, T, b, v, $, M, w, E, L;
let u = class extends D(
  R,
  void 0
) {
  constructor() {
    super(), f(this, n), this.readonly = !1, this._selection = [], this._maxItems = 1, this._isLoading = !1, this._allProductTypes = [], f(this, g), f(this, m, !1), f(this, y, 0), f(this, p, new q(this, {
      getUniqueOfElement: (e) => e.getAttribute("data-id"),
      getUniqueOfModel: (e) => e.id,
      identifier: "Merchello.ProductTypePicker",
      itemSelector: ".type-item",
      containerSelector: ".type-list",
      onChange: ({ model: e }) => {
        this._selection = e, o(this, n, b).call(this);
      }
    })), this.consumeContext(W, (e) => {
      k(this, g, e);
    });
  }
  connectedCallback() {
    super.connectedCallback(), k(this, m, !0);
  }
  disconnectedCallback() {
    super.disconnectedCallback(), k(this, m, !1);
  }
  set config(e) {
    const t = e?.getValueByAlias("maxItems");
    this._maxItems = t === 0 ? 1 / 0 : t ?? 1;
  }
  set value(e) {
    super.value = e, o(this, n, T).call(this, e);
  }
  get value() {
    return super.value;
  }
  render() {
    return this._isLoading && this._selection.length === 0 ? l`<uui-loader></uui-loader>` : this._maxItems === 1 ? o(this, n, w).call(this) : o(this, n, E).call(this);
  }
};
g = /* @__PURE__ */ new WeakMap();
m = /* @__PURE__ */ new WeakMap();
y = /* @__PURE__ */ new WeakMap();
p = /* @__PURE__ */ new WeakMap();
n = /* @__PURE__ */ new WeakSet();
T = async function(e) {
  const t = ++K(this, y)._;
  if (!e) {
    this._selection = [], this._maxItems !== 1 && c(this, p).setModel([]);
    return;
  }
  const i = e.split(",").filter((s) => s.trim());
  if (i.length === 0) {
    this._selection = [], this._maxItems !== 1 && c(this, p).setModel([]);
    return;
  }
  if (this._allProductTypes.length === 0) {
    this._isLoading = !0;
    const { data: s } = await I.getProductTypes();
    if (!c(this, m) || t !== c(this, y)) return;
    this._allProductTypes = s ?? [], this._isLoading = !1;
  }
  if (t !== c(this, y)) return;
  const a = [];
  for (const s of i) {
    const r = this._allProductTypes.find((d) => d.id === s);
    r ? a.push({
      id: r.id,
      name: r.name,
      alias: r.alias,
      notFound: !1
    }) : a.push({
      id: s,
      name: "Product type not found",
      alias: null,
      notFound: !0
    });
  }
  this._selection = a, this._maxItems !== 1 && c(this, p).setModel(a);
};
b = function() {
  const e = this._selection.length > 0 ? this._selection.map((t) => t.id).join(",") : void 0;
  X(u.prototype, this, "value", e), this.dispatchEvent(new F());
};
v = async function() {
  if (this.readonly || !c(this, g)) return;
  if (this._allProductTypes.length === 0) {
    this._isLoading = !0;
    const { data: s } = await I.getProductTypes();
    if (!c(this, m)) return;
    this._allProductTypes = s ?? [], this._isLoading = !1;
  }
  const e = this._maxItems !== 1, t = this._selection.map((s) => s.id), i = await c(this, g).open(this, V, {
    data: {
      excludeIds: t,
      multiSelect: e
    }
  }).onSubmit().catch(() => {
  });
  if (!i || i.selectedIds.length === 0) return;
  const a = i.selectedIds.map((s, r) => {
    const d = this._allProductTypes.find((S) => S.id === s);
    return {
      id: s,
      name: i.selectedNames[r] ?? d?.name ?? "Unknown",
      alias: i.selectedAliases?.[r] ?? d?.alias ?? null,
      notFound: !1
    };
  });
  if (e) {
    const s = [...this._selection, ...a];
    this._selection = this._maxItems === 1 / 0 ? s : s.slice(0, this._maxItems);
  } else
    this._selection = a.slice(0, 1);
  c(this, p).setModel(this._selection), o(this, n, b).call(this);
};
$ = function(e) {
  this._selection = this._selection.filter((t) => t.id !== e), c(this, p).setModel(this._selection), o(this, n, b).call(this);
};
M = function() {
  this._selection = [], c(this, p).setModel([]), o(this, n, b).call(this);
};
w = function() {
  const e = this._selection[0];
  return e ? e.notFound ? l`
        <div class="single-select-display not-found">
          <div class="type-info">
            <uui-icon name="icon-alert"></uui-icon>
            <span class="type-name">${e.name}</span>
            <span class="type-id">ID: ${e.id}</span>
          </div>
          ${this.readonly ? h : l`
                <div class="actions">
                  <uui-button
                    compact
                    look="secondary"
                    label="Change"
                    @click=${o(this, n, v)}>
                    <uui-icon name="icon-edit"></uui-icon>
                  </uui-button>
                  <uui-button
                    compact
                    look="secondary"
                    label="Clear"
                    @click=${o(this, n, M)}>
                    <uui-icon name="icon-trash"></uui-icon>
                  </uui-button>
                </div>
              `}
        </div>
      ` : l`
      <div class="single-select-display">
        <div class="type-info">
          <uui-icon name="icon-tags"></uui-icon>
          <span class="type-name">${e.name}</span>
          ${e.alias ? l`<span class="type-alias">(${e.alias})</span>` : h}
        </div>
        ${this.readonly ? h : l`
              <div class="actions">
                <uui-button
                  compact
                  look="secondary"
                  label="Change"
                  @click=${o(this, n, v)}>
                  <uui-icon name="icon-edit"></uui-icon>
                </uui-button>
                <uui-button
                  compact
                  look="secondary"
                  label="Clear"
                  @click=${o(this, n, M)}>
                  <uui-icon name="icon-trash"></uui-icon>
                </uui-button>
              </div>
            `}
      </div>
    ` : l`
        <uui-button
          look="placeholder"
          label="Select product type"
          @click=${o(this, n, v)}
          ?disabled=${this.readonly || this._isLoading}>
          ${this._isLoading ? "Loading..." : "Select a product type..."}
        </uui-button>
      `;
};
E = function() {
  const e = !this.readonly && this._selection.length < this._maxItems;
  return l`
      <div class="type-list">
        ${O(
    this._selection,
    (t) => t.id,
    (t) => o(this, n, L).call(this, t)
  )}
      </div>
      ${e ? l`
            <uui-button
              look="placeholder"
              label="Add product type"
              @click=${o(this, n, v)}
              ?disabled=${this._isLoading}>
              ${this._isLoading ? "Loading..." : "Add product type"}
            </uui-button>
          ` : h}
    `;
};
L = function(e) {
  return e.notFound ? l`
        <div class="type-item not-found" data-id=${e.id}>
          <uui-icon name="icon-navigation" class="drag-handle"></uui-icon>
          <uui-icon name="icon-alert"></uui-icon>
          <span class="type-name">${e.name}</span>
          <span class="type-id">ID: ${e.id}</span>
          ${this.readonly ? h : l`
                <uui-button
                  compact
                  look="secondary"
                  label="Remove"
                  @click=${() => o(this, n, $).call(this, e.id)}>
                  <uui-icon name="icon-trash"></uui-icon>
                </uui-button>
              `}
        </div>
      ` : l`
      <div class="type-item" data-id=${e.id}>
        <uui-icon name="icon-navigation" class="drag-handle"></uui-icon>
        <uui-icon name="icon-tags"></uui-icon>
        <span class="type-name">${e.name}</span>
        ${e.alias ? l`<span class="type-alias">(${e.alias})</span>` : h}
        ${this.readonly ? h : l`
              <uui-button
                compact
                look="secondary"
                label="Remove"
                @click=${() => o(this, n, $).call(this, e.id)}>
                <uui-icon name="icon-trash"></uui-icon>
              </uui-button>
            `}
      </div>
    `;
};
u.styles = A`
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

    .type-info {
      display: flex;
      align-items: center;
      gap: var(--uui-size-space-2);
    }

    .type-name {
      font-weight: 500;
    }

    .type-alias {
      color: var(--uui-color-text-alt);
      font-size: 0.9em;
    }

    .actions {
      display: flex;
      gap: var(--uui-size-space-1);
    }

    .type-list {
      display: flex;
      flex-direction: column;
      gap: var(--uui-size-space-2);
      margin-bottom: var(--uui-size-space-2);
    }

    .type-item {
      display: flex;
      align-items: center;
      gap: var(--uui-size-space-2);
      padding: var(--uui-size-space-3);
      background: var(--uui-color-surface-alt);
      border-radius: var(--uui-border-radius);
    }

    .type-item .type-name {
      flex: 1;
    }

    .not-found {
      background: var(--uui-color-danger-standalone);
    }

    .type-id {
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
_([
  U({ type: Boolean, reflect: !0 })
], u.prototype, "readonly", 2);
_([
  P()
], u.prototype, "_selection", 2);
_([
  P()
], u.prototype, "_maxItems", 2);
_([
  P()
], u.prototype, "_isLoading", 2);
_([
  P()
], u.prototype, "_allProductTypes", 2);
u = _([
  z("merchello-property-editor-ui-product-type-picker")
], u);
const se = u;
export {
  u as MerchelloPropertyEditorUiProductTypePickerElement,
  se as default
};
//# sourceMappingURL=property-editor-ui-product-type-picker.element-0qsB2BK5.js.map
