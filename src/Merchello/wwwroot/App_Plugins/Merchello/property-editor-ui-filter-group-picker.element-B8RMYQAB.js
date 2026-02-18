import { html as a, nothing as v, repeat as P, css as O, property as U, state as M, customElement as A } from "@umbraco-cms/backoffice/external/lit";
import { UmbLitElement as z } from "@umbraco-cms/backoffice/lit-element";
import { UmbFormControlMixin as R } from "@umbraco-cms/backoffice/validation";
import { UmbChangeEvent as W } from "@umbraco-cms/backoffice/event";
import { UmbModalToken as D, UMB_MODAL_MANAGER_CONTEXT as T } from "@umbraco-cms/backoffice/modal";
import { UmbSorterController as q } from "@umbraco-cms/backoffice/sorter";
import { M as C } from "./merchello-api-B1P1cUX9.js";
const V = new D("Merchello.FilterGroupPicker.Modal", {
  modal: {
    type: "sidebar",
    size: "medium"
  }
});
var B = Object.defineProperty, N = Object.getOwnPropertyDescriptor, H = Object.getPrototypeOf, K = Reflect.set, F = (e) => {
  throw TypeError(e);
}, f = (e, t, i, o) => {
  for (var s = o > 1 ? void 0 : o ? N(t, i) : t, c = e.length - 1, p; c >= 0; c--)
    (p = e[c]) && (s = (o ? p(t, i, s) : p(s)) || s);
  return o && s && B(t, i, s), s;
}, $ = (e, t, i) => t.has(e) || F("Cannot " + i), r = (e, t, i) => ($(e, t, "read from private field"), i ? i.call(e) : t.get(e)), m = (e, t, i) => t.has(e) ? F("Cannot add the same private member more than once") : t instanceof WeakSet ? t.add(e) : t.set(e, i), k = (e, t, i, o) => ($(e, t, "write to private field"), t.set(e, i), i), l = (e, t, i) => ($(e, t, "access private method"), i), X = (e, t, i, o) => ({
  set _(s) {
    k(e, t, s);
  },
  get _() {
    return r(e, t, o);
  }
}), J = (e, t, i, o) => (K(H(e), i, o, t), o), b, h, _, u, n, w, y, g, x, I, E, G, L;
let d = class extends R(
  z,
  void 0
) {
  constructor() {
    super(), m(this, n), this.readonly = !1, this._selection = [], this._maxItems = 1, this._isLoading = !1, this._allFilterGroups = [], m(this, b), m(this, h, !1), m(this, _, 0), m(this, u, new q(this, {
      getUniqueOfElement: (e) => e.getAttribute("data-id"),
      getUniqueOfModel: (e) => e.id,
      identifier: "Merchello.FilterGroupPicker",
      itemSelector: ".filter-group-item",
      containerSelector: ".filter-group-list",
      onChange: ({ model: e }) => {
        this._selection = e, l(this, n, y).call(this);
      }
    })), r(this, u).disable(), this.consumeContext(T, (e) => {
      k(this, b, e);
    });
  }
  connectedCallback() {
    super.connectedCallback(), k(this, h, !0);
  }
  disconnectedCallback() {
    super.disconnectedCallback(), k(this, h, !1);
  }
  set config(e) {
    const t = e?.getValueByAlias("maxItems");
    if (this._maxItems = t === 0 ? 1 / 0 : t ?? 1, this._maxItems === 1) {
      r(this, u).disable();
      return;
    }
    r(this, u).enable(), r(this, u).setModel(this._selection);
  }
  set value(e) {
    super.value = e, l(this, n, w).call(this, e);
  }
  get value() {
    return super.value;
  }
  render() {
    const e = this._maxItems !== 1;
    return !e && this._isLoading && this._selection.length === 0 ? a`<uui-loader></uui-loader>` : e ? l(this, n, G).call(this) : l(this, n, E).call(this);
  }
};
b = /* @__PURE__ */ new WeakMap();
h = /* @__PURE__ */ new WeakMap();
_ = /* @__PURE__ */ new WeakMap();
u = /* @__PURE__ */ new WeakMap();
n = /* @__PURE__ */ new WeakSet();
w = async function(e) {
  const t = ++X(this, _)._;
  if (!e) {
    this._selection = [], this._maxItems !== 1 && r(this, u).setModel([]);
    return;
  }
  const i = e.split(",").filter((s) => s.trim());
  if (i.length === 0) {
    this._selection = [], this._maxItems !== 1 && r(this, u).setModel([]);
    return;
  }
  if (this._allFilterGroups.length === 0) {
    this._isLoading = !0;
    const { data: s } = await C.getFilterGroups();
    if (!r(this, h) || t !== r(this, _)) return;
    this._allFilterGroups = s ?? [], this._isLoading = !1;
  }
  if (t !== r(this, _)) return;
  const o = [];
  for (const s of i) {
    const c = this._allFilterGroups.find((p) => p.id === s);
    c ? o.push({
      id: c.id,
      name: c.name,
      filterCount: c.filters?.length ?? 0,
      notFound: !1
    }) : o.push({
      id: s,
      name: "Filter group not found",
      filterCount: 0,
      notFound: !0
    });
  }
  this._selection = o, this._maxItems !== 1 && r(this, u).setModel(o);
};
y = function() {
  const e = this._selection.length > 0 ? this._selection.map((t) => t.id).join(",") : void 0;
  J(d.prototype, this, "value", e), this.dispatchEvent(new W());
};
g = async function() {
  if (this.readonly || !r(this, b)) return;
  if (this._allFilterGroups.length === 0) {
    this._isLoading = !0;
    const { data: s } = await C.getFilterGroups();
    if (!r(this, h)) return;
    this._allFilterGroups = s ?? [], this._isLoading = !1;
  }
  const e = this._maxItems !== 1, t = this._selection.map((s) => s.id), i = await r(this, b).open(this, V, {
    data: {
      excludeIds: t,
      multiSelect: e
    }
  }).onSubmit().catch(() => {
  });
  if (!i || i.selectedIds.length === 0) return;
  const o = i.selectedIds.map((s, c) => {
    const p = this._allFilterGroups.find((S) => S.id === s);
    return {
      id: s,
      name: i.selectedNames[c] ?? p?.name ?? "Unknown",
      filterCount: p?.filters?.length ?? 0,
      notFound: !1
    };
  });
  if (e) {
    const s = [...this._selection, ...o];
    this._selection = this._maxItems === 1 / 0 ? s : s.slice(0, this._maxItems);
  } else
    this._selection = o.slice(0, 1);
  r(this, u).setModel(this._selection), l(this, n, y).call(this);
};
x = function(e) {
  this._selection = this._selection.filter((t) => t.id !== e), r(this, u).setModel(this._selection), l(this, n, y).call(this);
};
I = function() {
  this._selection = [], r(this, u).setModel([]), l(this, n, y).call(this);
};
E = function() {
  const e = this._selection[0];
  return e ? e.notFound ? a`
        <div class="single-select-display not-found">
          <div class="filter-group-info">
            <uui-icon name="icon-alert"></uui-icon>
            <span class="filter-group-name">${e.name}</span>
            <span class="filter-group-id">ID: ${e.id}</span>
          </div>
          ${this.readonly ? v : a`
                <div class="actions">
                  <uui-button
                    compact
                    look="secondary"
                    label="Change"
                    @click=${l(this, n, g)}>
                    <uui-icon name="icon-edit"></uui-icon>
                  </uui-button>
                  <uui-button
                    compact
                    look="secondary"
                    label="Clear"
                    @click=${l(this, n, I)}>
                    <uui-icon name="icon-trash"></uui-icon>
                  </uui-button>
                </div>
              `}
        </div>
      ` : a`
      <div class="single-select-display">
        <div class="filter-group-info">
          <uui-icon name="icon-filter"></uui-icon>
          <span class="filter-group-name">${e.name}</span>
          <span class="filter-count">(${e.filterCount} filters)</span>
        </div>
        ${this.readonly ? v : a`
              <div class="actions">
                <uui-button
                  compact
                  look="secondary"
                  label="Change"
                  @click=${l(this, n, g)}>
                  <uui-icon name="icon-edit"></uui-icon>
                </uui-button>
                <uui-button
                  compact
                  look="secondary"
                  label="Clear"
                  @click=${l(this, n, I)}>
                  <uui-icon name="icon-trash"></uui-icon>
                </uui-button>
              </div>
            `}
      </div>
    ` : a`
        <uui-button
          look="placeholder"
          label="Select filter group"
          @click=${l(this, n, g)}
          ?disabled=${this.readonly || this._isLoading}>
          ${this._isLoading ? "Loading..." : "Select a filter group..."}
        </uui-button>
      `;
};
G = function() {
  const e = !this.readonly && this._selection.length < this._maxItems;
  return a`
      <div class="filter-group-list">
        ${P(
    this._selection,
    (t) => t.id,
    (t) => l(this, n, L).call(this, t)
  )}
      </div>
      ${e ? a`
            <uui-button
              look="placeholder"
              label="Add filter group"
              @click=${l(this, n, g)}
              ?disabled=${this._isLoading}>
              ${this._isLoading ? "Loading..." : "Add filter group"}
            </uui-button>
          ` : v}
    `;
};
L = function(e) {
  return e.notFound ? a`
        <div class="filter-group-item not-found" data-id=${e.id}>
          <uui-icon name="icon-navigation" class="drag-handle"></uui-icon>
          <uui-icon name="icon-alert"></uui-icon>
          <span class="filter-group-name">${e.name}</span>
          <span class="filter-group-id">ID: ${e.id}</span>
          ${this.readonly ? v : a`
                <uui-button
                  compact
                  look="secondary"
                  label="Remove"
                  @click=${() => l(this, n, x).call(this, e.id)}>
                  <uui-icon name="icon-trash"></uui-icon>
                </uui-button>
              `}
        </div>
      ` : a`
      <div class="filter-group-item" data-id=${e.id}>
        <uui-icon name="icon-navigation" class="drag-handle"></uui-icon>
        <uui-icon name="icon-filter"></uui-icon>
        <span class="filter-group-name">${e.name}</span>
        <span class="filter-count">(${e.filterCount} filters)</span>
        ${this.readonly ? v : a`
              <uui-button
                compact
                look="secondary"
                label="Remove"
                @click=${() => l(this, n, x).call(this, e.id)}>
                <uui-icon name="icon-trash"></uui-icon>
              </uui-button>
            `}
      </div>
    `;
};
d.styles = O`
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

    .filter-group-info {
      display: flex;
      align-items: center;
      gap: var(--uui-size-space-2);
    }

    .filter-group-name {
      font-weight: 500;
    }

    .filter-count {
      color: var(--uui-color-text-alt);
      font-size: 0.9em;
    }

    .actions {
      display: flex;
      gap: var(--uui-size-space-1);
    }

    .filter-group-list {
      display: flex;
      flex-direction: column;
      gap: var(--uui-size-space-2);
      margin-bottom: var(--uui-size-space-2);
    }

    .filter-group-item {
      display: flex;
      align-items: center;
      gap: var(--uui-size-space-2);
      padding: var(--uui-size-space-3);
      background: var(--uui-color-surface-alt);
      border-radius: var(--uui-border-radius);
    }

    .filter-group-item .filter-group-name {
      flex: 1;
    }

    .not-found {
      background: var(--uui-color-danger-standalone);
    }

    .filter-group-id {
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
f([
  U({ type: Boolean, reflect: !0 })
], d.prototype, "readonly", 2);
f([
  M()
], d.prototype, "_selection", 2);
f([
  M()
], d.prototype, "_maxItems", 2);
f([
  M()
], d.prototype, "_isLoading", 2);
f([
  M()
], d.prototype, "_allFilterGroups", 2);
d = f([
  A("merchello-property-editor-ui-filter-group-picker")
], d);
const se = d;
export {
  d as MerchelloPropertyEditorUiFilterGroupPickerElement,
  se as default
};
//# sourceMappingURL=property-editor-ui-filter-group-picker.element-B8RMYQAB.js.map
