import { html as l, nothing as v, repeat as P, css as O, property as U, state as M, customElement as A } from "@umbraco-cms/backoffice/external/lit";
import { UmbLitElement as R } from "@umbraco-cms/backoffice/lit-element";
import { UmbFormControlMixin as z } from "@umbraco-cms/backoffice/validation";
import { UmbChangeEvent as W } from "@umbraco-cms/backoffice/event";
import { UMB_MODAL_MANAGER_CONTEXT as D } from "@umbraco-cms/backoffice/modal";
import { UmbSorterController as q } from "@umbraco-cms/backoffice/sorter";
import { M as T } from "./filter-group-picker-modal.token-3WABoY0F.js";
import { M as I } from "./merchello-api-LENiBVrz.js";
var V = Object.defineProperty, B = Object.getOwnPropertyDescriptor, N = Object.getPrototypeOf, H = Reflect.set, F = (e) => {
  throw TypeError(e);
}, f = (e, t, i, o) => {
  for (var s = o > 1 ? void 0 : o ? B(t, i) : t, u = e.length - 1, d; u >= 0; u--)
    (d = e[u]) && (s = (o ? d(t, i, s) : d(s)) || s);
  return o && s && V(t, i, s), s;
}, C = (e, t, i) => t.has(e) || F("Cannot " + i), a = (e, t, i) => (C(e, t, "read from private field"), i ? i.call(e) : t.get(e)), m = (e, t, i) => t.has(e) ? F("Cannot add the same private member more than once") : t instanceof WeakSet ? t.add(e) : t.set(e, i), k = (e, t, i, o) => (C(e, t, "write to private field"), t.set(e, i), i), r = (e, t, i) => (C(e, t, "access private method"), i), K = (e, t, i, o) => ({
  set _(s) {
    k(e, t, s);
  },
  get _() {
    return a(e, t, o);
  }
}), X = (e, t, i, o) => (H(N(e), i, o, t), o), y, h, _, p, n, w, b, g, x, $, E, L, G;
let c = class extends z(
  R,
  void 0
) {
  constructor() {
    super(), m(this, n), this.readonly = !1, this._selection = [], this._maxItems = 1, this._isLoading = !1, this._allFilterGroups = [], m(this, y), m(this, h, !1), m(this, _, 0), m(this, p, new q(this, {
      getUniqueOfElement: (e) => e.getAttribute("data-id"),
      getUniqueOfModel: (e) => e.id,
      identifier: "Merchello.FilterGroupPicker",
      itemSelector: ".filter-group-item",
      containerSelector: ".filter-group-list",
      onChange: ({ model: e }) => {
        this._selection = e, r(this, n, b).call(this);
      }
    })), this.consumeContext(D, (e) => {
      k(this, y, e);
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
    this._maxItems = t === 0 ? 1 / 0 : t ?? 1;
  }
  set value(e) {
    super.value = e, r(this, n, w).call(this, e);
  }
  get value() {
    return super.value;
  }
  render() {
    return this._isLoading && this._selection.length === 0 ? l`<uui-loader></uui-loader>` : this._maxItems === 1 ? r(this, n, E).call(this) : r(this, n, L).call(this);
  }
};
y = /* @__PURE__ */ new WeakMap();
h = /* @__PURE__ */ new WeakMap();
_ = /* @__PURE__ */ new WeakMap();
p = /* @__PURE__ */ new WeakMap();
n = /* @__PURE__ */ new WeakSet();
w = async function(e) {
  const t = ++K(this, _)._;
  if (!e) {
    this._selection = [], this._maxItems !== 1 && a(this, p).setModel([]);
    return;
  }
  const i = e.split(",").filter((s) => s.trim());
  if (i.length === 0) {
    this._selection = [], this._maxItems !== 1 && a(this, p).setModel([]);
    return;
  }
  if (this._allFilterGroups.length === 0) {
    this._isLoading = !0;
    const { data: s } = await I.getFilterGroups();
    if (!a(this, h) || t !== a(this, _)) return;
    this._allFilterGroups = s ?? [], this._isLoading = !1;
  }
  if (t !== a(this, _)) return;
  const o = [];
  for (const s of i) {
    const u = this._allFilterGroups.find((d) => d.id === s);
    u ? o.push({
      id: u.id,
      name: u.name,
      filterCount: u.filters?.length ?? 0,
      notFound: !1
    }) : o.push({
      id: s,
      name: "Filter group not found",
      filterCount: 0,
      notFound: !0
    });
  }
  this._selection = o, this._maxItems !== 1 && a(this, p).setModel(o);
};
b = function() {
  const e = this._selection.length > 0 ? this._selection.map((t) => t.id).join(",") : void 0;
  X(c.prototype, this, "value", e), this.dispatchEvent(new W());
};
g = async function() {
  if (this.readonly || !a(this, y)) return;
  if (this._allFilterGroups.length === 0) {
    this._isLoading = !0;
    const { data: s } = await I.getFilterGroups();
    if (!a(this, h)) return;
    this._allFilterGroups = s ?? [], this._isLoading = !1;
  }
  const e = this._maxItems !== 1, t = this._selection.map((s) => s.id), i = await a(this, y).open(this, T, {
    data: {
      excludeIds: t,
      multiSelect: e
    }
  }).onSubmit().catch(() => {
  });
  if (!i || i.selectedIds.length === 0) return;
  const o = i.selectedIds.map((s, u) => {
    const d = this._allFilterGroups.find((S) => S.id === s);
    return {
      id: s,
      name: i.selectedNames[u] ?? d?.name ?? "Unknown",
      filterCount: d?.filters?.length ?? 0,
      notFound: !1
    };
  });
  if (e) {
    const s = [...this._selection, ...o];
    this._selection = this._maxItems === 1 / 0 ? s : s.slice(0, this._maxItems);
  } else
    this._selection = o.slice(0, 1);
  a(this, p).setModel(this._selection), r(this, n, b).call(this);
};
x = function(e) {
  this._selection = this._selection.filter((t) => t.id !== e), a(this, p).setModel(this._selection), r(this, n, b).call(this);
};
$ = function() {
  this._selection = [], a(this, p).setModel([]), r(this, n, b).call(this);
};
E = function() {
  const e = this._selection[0];
  return e ? e.notFound ? l`
        <div class="single-select-display not-found">
          <div class="filter-group-info">
            <uui-icon name="icon-alert"></uui-icon>
            <span class="filter-group-name">${e.name}</span>
            <span class="filter-group-id">ID: ${e.id}</span>
          </div>
          ${this.readonly ? v : l`
                <div class="actions">
                  <uui-button
                    compact
                    look="secondary"
                    label="Change"
                    @click=${r(this, n, g)}>
                    <uui-icon name="icon-edit"></uui-icon>
                  </uui-button>
                  <uui-button
                    compact
                    look="secondary"
                    label="Clear"
                    @click=${r(this, n, $)}>
                    <uui-icon name="icon-trash"></uui-icon>
                  </uui-button>
                </div>
              `}
        </div>
      ` : l`
      <div class="single-select-display">
        <div class="filter-group-info">
          <uui-icon name="icon-filter"></uui-icon>
          <span class="filter-group-name">${e.name}</span>
          <span class="filter-count">(${e.filterCount} filters)</span>
        </div>
        ${this.readonly ? v : l`
              <div class="actions">
                <uui-button
                  compact
                  look="secondary"
                  label="Change"
                  @click=${r(this, n, g)}>
                  <uui-icon name="icon-edit"></uui-icon>
                </uui-button>
                <uui-button
                  compact
                  look="secondary"
                  label="Clear"
                  @click=${r(this, n, $)}>
                  <uui-icon name="icon-trash"></uui-icon>
                </uui-button>
              </div>
            `}
      </div>
    ` : l`
        <uui-button
          look="placeholder"
          label="Select filter group"
          @click=${r(this, n, g)}
          ?disabled=${this.readonly || this._isLoading}>
          ${this._isLoading ? "Loading..." : "Select a filter group..."}
        </uui-button>
      `;
};
L = function() {
  const e = !this.readonly && this._selection.length < this._maxItems;
  return l`
      <div class="filter-group-list">
        ${P(
    this._selection,
    (t) => t.id,
    (t) => r(this, n, G).call(this, t)
  )}
      </div>
      ${e ? l`
            <uui-button
              look="placeholder"
              label="Add filter group"
              @click=${r(this, n, g)}
              ?disabled=${this._isLoading}>
              ${this._isLoading ? "Loading..." : "Add filter group"}
            </uui-button>
          ` : v}
    `;
};
G = function(e) {
  return e.notFound ? l`
        <div class="filter-group-item not-found" data-id=${e.id}>
          <uui-icon name="icon-navigation" class="drag-handle"></uui-icon>
          <uui-icon name="icon-alert"></uui-icon>
          <span class="filter-group-name">${e.name}</span>
          <span class="filter-group-id">ID: ${e.id}</span>
          ${this.readonly ? v : l`
                <uui-button
                  compact
                  look="secondary"
                  label="Remove"
                  @click=${() => r(this, n, x).call(this, e.id)}>
                  <uui-icon name="icon-trash"></uui-icon>
                </uui-button>
              `}
        </div>
      ` : l`
      <div class="filter-group-item" data-id=${e.id}>
        <uui-icon name="icon-navigation" class="drag-handle"></uui-icon>
        <uui-icon name="icon-filter"></uui-icon>
        <span class="filter-group-name">${e.name}</span>
        <span class="filter-count">(${e.filterCount} filters)</span>
        ${this.readonly ? v : l`
              <uui-button
                compact
                look="secondary"
                label="Remove"
                @click=${() => r(this, n, x).call(this, e.id)}>
                <uui-icon name="icon-trash"></uui-icon>
              </uui-button>
            `}
      </div>
    `;
};
c.styles = O`
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
], c.prototype, "readonly", 2);
f([
  M()
], c.prototype, "_selection", 2);
f([
  M()
], c.prototype, "_maxItems", 2);
f([
  M()
], c.prototype, "_isLoading", 2);
f([
  M()
], c.prototype, "_allFilterGroups", 2);
c = f([
  A("merchello-property-editor-ui-filter-group-picker")
], c);
const se = c;
export {
  c as MerchelloPropertyEditorUiFilterGroupPickerElement,
  se as default
};
//# sourceMappingURL=property-editor-ui-filter-group-picker.element-B0lRciAt.js.map
