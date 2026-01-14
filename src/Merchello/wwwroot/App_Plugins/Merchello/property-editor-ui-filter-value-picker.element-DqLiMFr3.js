import { html as r, nothing as m, repeat as U, css as z, property as R, state as b, customElement as V } from "@umbraco-cms/backoffice/external/lit";
import { UmbLitElement as W } from "@umbraco-cms/backoffice/lit-element";
import { UmbFormControlMixin as D } from "@umbraco-cms/backoffice/validation";
import { UmbChangeEvent as B } from "@umbraco-cms/backoffice/event";
import { UMB_MODAL_MANAGER_CONTEXT as q } from "@umbraco-cms/backoffice/modal";
import { UmbSorterController as T } from "@umbraco-cms/backoffice/sorter";
import { M as H } from "./filter-picker-modal.token-DlO79hNz.js";
import { M as E } from "./merchello-api-BAKL0aIE.js";
var K = Object.defineProperty, X = Object.getOwnPropertyDescriptor, J = Object.getPrototypeOf, Q = Reflect.set, L = (e) => {
  throw TypeError(e);
}, p = (e, t, i, n) => {
  for (var s = n > 1 ? void 0 : n ? X(t, i) : t, u = e.length - 1, h; u >= 0; u--)
    (h = e[u]) && (s = (n ? h(t, i, s) : h(s)) || s);
  return n && s && K(t, i, s), s;
}, M = (e, t, i) => t.has(e) || L("Cannot " + i), a = (e, t, i) => (M(e, t, "read from private field"), i ? i.call(e) : t.get(e)), _ = (e, t, i) => t.has(e) ? L("Cannot add the same private member more than once") : t instanceof WeakSet ? t.add(e) : t.set(e, i), k = (e, t, i, n) => (M(e, t, "write to private field"), t.set(e, i), i), l = (e, t, i) => (M(e, t, "access private method"), i), Y = (e, t, i, n) => ({
  set _(s) {
    k(e, t, s);
  },
  get _() {
    return a(e, t, n);
  }
}), Z = (e, t, i, n) => (Q(J(e), i, n, t), n), y, f, g, d, o, S, F, x, v, $, C, w, G, P, O;
let c = class extends D(
  W,
  void 0
) {
  constructor() {
    super(), _(this, o), this.readonly = !1, this._selection = [], this._maxItems = 1 / 0, this._isLoading = !1, this._allFilterGroups = [], _(this, y), _(this, f, !1), _(this, g, 0), _(this, d, new T(this, {
      getUniqueOfElement: (e) => e.getAttribute("data-id"),
      getUniqueOfModel: (e) => e.id,
      identifier: "Merchello.FilterValuePicker",
      itemSelector: ".filter-item",
      containerSelector: ".filter-list",
      onChange: ({ model: e }) => {
        this._selection = e, l(this, o, x).call(this);
      }
    })), this.consumeContext(q, (e) => {
      k(this, y, e);
    });
  }
  connectedCallback() {
    super.connectedCallback(), k(this, f, !0);
  }
  disconnectedCallback() {
    super.disconnectedCallback(), k(this, f, !1);
  }
  set config(e) {
    const t = e?.getValueByAlias("maxItems");
    this._maxItems = t === 0 ? 1 / 0 : t ?? 1 / 0, this._filterGroupId = e?.getValueByAlias("filterGroupId");
  }
  set value(e) {
    super.value = e, l(this, o, S).call(this, e);
  }
  get value() {
    return super.value;
  }
  render() {
    return this._isLoading && this._selection.length === 0 ? r`<uui-loader></uui-loader>` : this._maxItems === 1 ? l(this, o, G).call(this) : l(this, o, P).call(this);
  }
};
y = /* @__PURE__ */ new WeakMap();
f = /* @__PURE__ */ new WeakMap();
g = /* @__PURE__ */ new WeakMap();
d = /* @__PURE__ */ new WeakMap();
o = /* @__PURE__ */ new WeakSet();
S = async function(e) {
  const t = ++Y(this, g)._;
  if (!e) {
    this._selection = [], this._maxItems !== 1 && a(this, d).setModel([]);
    return;
  }
  const i = e.split(",").filter((s) => s.trim());
  if (i.length === 0) {
    this._selection = [], this._maxItems !== 1 && a(this, d).setModel([]);
    return;
  }
  if (this._allFilterGroups.length === 0) {
    this._isLoading = !0;
    const { data: s } = await E.getFilterGroups();
    if (!a(this, f) || t !== a(this, g)) return;
    this._allFilterGroups = s ?? [], this._isLoading = !1;
  }
  if (t !== a(this, g)) return;
  const n = [];
  for (const s of i) {
    const u = l(this, o, F).call(this, s);
    u ? n.push(u) : n.push({
      id: s,
      name: "Filter not found",
      groupName: "",
      hexColour: null,
      notFound: !0
    });
  }
  this._selection = n, this._maxItems !== 1 && a(this, d).setModel(n);
};
F = function(e) {
  for (const t of this._allFilterGroups) {
    const i = t.filters.find((n) => n.id === e);
    if (i)
      return {
        id: i.id,
        name: i.name,
        groupName: t.name,
        hexColour: i.hexColour,
        notFound: !1
      };
  }
  return null;
};
x = function() {
  const e = this._selection.length > 0 ? this._selection.map((t) => t.id).join(",") : void 0;
  Z(c.prototype, this, "value", e), this.dispatchEvent(new B());
};
v = async function() {
  if (this.readonly || !a(this, y)) return;
  if (this._allFilterGroups.length === 0) {
    this._isLoading = !0;
    const { data: s } = await E.getFilterGroups();
    if (!a(this, f)) return;
    this._allFilterGroups = s ?? [], this._isLoading = !1;
  }
  const e = this._maxItems !== 1, t = this._selection.map((s) => s.id), i = await a(this, y).open(this, H, {
    data: {
      excludeFilterIds: t,
      multiSelect: e,
      filterGroupId: this._filterGroupId
    }
  }).onSubmit().catch(() => {
  });
  if (!i || i.selectedFilterIds.length === 0) return;
  const n = i.selectedFilterIds.map((s, u) => {
    const h = l(this, o, F).call(this, s), I = i.selectedFilterNames[u] ?? "", [A, N] = I.includes(": ") ? I.split(": ", 2) : ["", I];
    return {
      id: s,
      name: h?.name ?? N,
      groupName: h?.groupName ?? A,
      hexColour: h?.hexColour ?? null,
      notFound: !1
    };
  });
  if (e) {
    const s = [...this._selection, ...n];
    this._selection = this._maxItems === 1 / 0 ? s : s.slice(0, this._maxItems);
  } else
    this._selection = n.slice(0, 1);
  a(this, d).setModel(this._selection), l(this, o, x).call(this);
};
$ = function(e) {
  this._selection = this._selection.filter((t) => t.id !== e), a(this, d).setModel(this._selection), l(this, o, x).call(this);
};
C = function() {
  this._selection = [], a(this, d).setModel([]), l(this, o, x).call(this);
};
w = function(e) {
  return e ? r`
      <span
        class="color-swatch"
        style="background-color: ${e};">
      </span>
    ` : m;
};
G = function() {
  const e = this._selection[0];
  return e ? e.notFound ? r`
        <div class="single-select-display not-found">
          <div class="filter-info">
            <uui-icon name="icon-alert"></uui-icon>
            <span class="filter-name">${e.name}</span>
            <span class="filter-id">ID: ${e.id}</span>
          </div>
          ${this.readonly ? m : r`
                <div class="actions">
                  <uui-button
                    compact
                    look="secondary"
                    label="Change"
                    @click=${l(this, o, v)}>
                    <uui-icon name="icon-edit"></uui-icon>
                  </uui-button>
                  <uui-button
                    compact
                    look="secondary"
                    label="Clear"
                    @click=${l(this, o, C)}>
                    <uui-icon name="icon-trash"></uui-icon>
                  </uui-button>
                </div>
              `}
        </div>
      ` : r`
      <div class="single-select-display">
        <div class="filter-info">
          ${l(this, o, w).call(this, e.hexColour)}
          <span class="filter-name">${e.name}</span>
          <span class="group-name">(${e.groupName})</span>
        </div>
        ${this.readonly ? m : r`
              <div class="actions">
                <uui-button
                  compact
                  look="secondary"
                  label="Change"
                  @click=${l(this, o, v)}>
                  <uui-icon name="icon-edit"></uui-icon>
                </uui-button>
                <uui-button
                  compact
                  look="secondary"
                  label="Clear"
                  @click=${l(this, o, C)}>
                  <uui-icon name="icon-trash"></uui-icon>
                </uui-button>
              </div>
            `}
      </div>
    ` : r`
        <uui-button
          look="placeholder"
          label="Select filter"
          @click=${l(this, o, v)}
          ?disabled=${this.readonly || this._isLoading}>
          ${this._isLoading ? "Loading..." : "Select a filter..."}
        </uui-button>
      `;
};
P = function() {
  const e = !this.readonly && this._selection.length < this._maxItems;
  return r`
      <div class="filter-list">
        ${U(
    this._selection,
    (t) => t.id,
    (t) => l(this, o, O).call(this, t)
  )}
      </div>
      ${e ? r`
            <uui-button
              look="placeholder"
              label="Add filter"
              @click=${l(this, o, v)}
              ?disabled=${this._isLoading}>
              ${this._isLoading ? "Loading..." : "Add filter"}
            </uui-button>
          ` : m}
    `;
};
O = function(e) {
  return e.notFound ? r`
        <div class="filter-item not-found" data-id=${e.id}>
          <uui-icon name="icon-navigation" class="drag-handle"></uui-icon>
          <uui-icon name="icon-alert"></uui-icon>
          <span class="filter-name">${e.name}</span>
          <span class="filter-id">ID: ${e.id}</span>
          ${this.readonly ? m : r`
                <uui-button
                  compact
                  look="secondary"
                  label="Remove"
                  @click=${() => l(this, o, $).call(this, e.id)}>
                  <uui-icon name="icon-trash"></uui-icon>
                </uui-button>
              `}
        </div>
      ` : r`
      <div class="filter-item" data-id=${e.id}>
        <uui-icon name="icon-navigation" class="drag-handle"></uui-icon>
        ${l(this, o, w).call(this, e.hexColour)}
        <span class="filter-name">${e.name}</span>
        <span class="group-name">(${e.groupName})</span>
        ${this.readonly ? m : r`
              <uui-button
                compact
                look="secondary"
                label="Remove"
                @click=${() => l(this, o, $).call(this, e.id)}>
                <uui-icon name="icon-trash"></uui-icon>
              </uui-button>
            `}
      </div>
    `;
};
c.styles = z`
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

    .filter-info {
      display: flex;
      align-items: center;
      gap: var(--uui-size-space-2);
    }

    .filter-name {
      font-weight: 500;
    }

    .group-name {
      color: var(--uui-color-text-alt);
      font-size: 0.9em;
    }

    .color-swatch {
      display: inline-block;
      width: 16px;
      height: 16px;
      border-radius: 2px;
      border: 1px solid var(--uui-color-border);
    }

    .actions {
      display: flex;
      gap: var(--uui-size-space-1);
    }

    .filter-list {
      display: flex;
      flex-direction: column;
      gap: var(--uui-size-space-2);
      margin-bottom: var(--uui-size-space-2);
    }

    .filter-item {
      display: flex;
      align-items: center;
      gap: var(--uui-size-space-2);
      padding: var(--uui-size-space-3);
      background: var(--uui-color-surface-alt);
      border-radius: var(--uui-border-radius);
    }

    .filter-item .filter-name {
      flex: 1;
    }

    .not-found {
      background: var(--uui-color-danger-standalone);
    }

    .filter-id {
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
p([
  R({ type: Boolean, reflect: !0 })
], c.prototype, "readonly", 2);
p([
  b()
], c.prototype, "_selection", 2);
p([
  b()
], c.prototype, "_maxItems", 2);
p([
  b()
], c.prototype, "_filterGroupId", 2);
p([
  b()
], c.prototype, "_isLoading", 2);
p([
  b()
], c.prototype, "_allFilterGroups", 2);
c = p([
  V("merchello-property-editor-ui-filter-value-picker")
], c);
const ae = c;
export {
  c as MerchelloPropertyEditorUiFilterValuePickerElement,
  ae as default
};
//# sourceMappingURL=property-editor-ui-filter-value-picker.element-DqLiMFr3.js.map
