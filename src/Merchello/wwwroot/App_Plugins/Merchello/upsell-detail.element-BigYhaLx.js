import { LitElement as L, nothing as c, html as l, css as M, property as V, customElement as F, state as v } from "@umbraco-cms/backoffice/external/lit";
import { UmbElementMixin as U } from "@umbraco-cms/backoffice/element-api";
import { UMB_WORKSPACE_CONTEXT as re } from "@umbraco-cms/backoffice/workspace";
import { UMB_NOTIFICATION_CONTEXT as oe } from "@umbraco-cms/backoffice/notification";
import { UMB_MODAL_MANAGER_CONTEXT as D, UmbModalToken as ue, UMB_CONFIRM_MODAL as ne } from "@umbraco-cms/backoffice/modal";
import { d as o, e as h, f as $, a as b, U as _, C, b as ce } from "./upsell.types-ChZp0X_-.js";
import { M as x } from "./merchello-api-Dp_zU_yi.js";
import { c as k, f as W, a as A } from "./formatting-B_f6AiQh.js";
import { L as de, M as pe, N as he } from "./navigation-CvTcY6zJ.js";
import { M as G } from "./product-picker-modal.token-BfbHsSHl.js";
import { M as K } from "./collection-picker-modal.token-DEqocfk-.js";
import { M as q } from "./product-type-picker-modal.token-BIXbr0YK.js";
import { a as Y, M as me } from "./supplier-picker-modal.token-CHapAKSP.js";
import { M as T } from "./filter-picker-modal.token-DlO79hNz.js";
import { M as ge } from "./customer-picker-modal.token-BZSMisS9.js";
var ve = Object.defineProperty, be = Object.getOwnPropertyDescriptor, X = (e) => {
  throw TypeError(e);
}, J = (e, t, a, i) => {
  for (var s = i > 1 ? void 0 : i ? be(t, a) : t, r = e.length - 1, u; r >= 0; r--)
    (u = e[r]) && (s = (i ? u(t, a, s) : u(s)) || s);
  return i && s && ve(t, a, s), s;
}, Q = (e, t, a) => t.has(e) || X("Cannot " + a), I = (e, t, a) => (Q(e, t, "read from private field"), t.get(e)), _e = (e, t, a) => t.has(e) ? X("Cannot add the same private member more than once") : t instanceof WeakSet ? t.add(e) : t.set(e, a), ye = (e, t, a, i) => (Q(e, t, "write to private field"), t.set(e, a), a), y;
const fe = [
  { value: o.ProductTypes, label: "Product types" },
  { value: o.ProductFilters, label: "Product filters" },
  { value: o.Collections, label: "Collections" },
  { value: o.SpecificProducts, label: "Specific products" },
  { value: o.Suppliers, label: "Suppliers" },
  { value: o.MinimumCartValue, label: "Minimum cart value" },
  { value: o.MaximumCartValue, label: "Maximum cart value" },
  { value: o.CartValueBetween, label: "Cart value between" }
];
function $e(e) {
  return fe.map((t) => ({
    name: t.label,
    value: String(t.value),
    selected: t.value === e
  }));
}
let N = class extends U(L) {
  constructor() {
    super(), this.rules = [], _e(this, y), this.consumeContext(D, (e) => {
      ye(this, y, e);
    });
  }
  _dispatchChange() {
    this.dispatchEvent(
      new CustomEvent("rules-change", {
        detail: { rules: this.rules },
        bubbles: !0,
        composed: !0
      })
    );
  }
  _handleAddRule() {
    this.rules = [...this.rules, {
      triggerType: o.ProductTypes,
      triggerIds: [],
      triggerNames: [],
      extractFilterIds: [],
      extractFilterNames: []
    }], this._dispatchChange();
  }
  _handleRemoveRule(e) {
    this.rules = this.rules.filter((t, a) => a !== e), this._dispatchChange();
  }
  _handleUpdateRule(e, t) {
    this.rules = this.rules.map((a, i) => i === e ? { ...a, ...t } : a), this._dispatchChange();
  }
  _handleTypeChange(e, t) {
    this._handleUpdateRule(e, {
      triggerType: t,
      triggerIds: [],
      triggerNames: [],
      value: void 0,
      min: void 0,
      max: void 0,
      extractFilterIds: [],
      extractFilterNames: []
    });
  }
  _needsEntityPicker(e) {
    return [
      o.ProductTypes,
      o.ProductFilters,
      o.Collections,
      o.SpecificProducts,
      o.Suppliers
    ].includes(e);
  }
  _isCartValueTrigger(e) {
    return [
      o.MinimumCartValue,
      o.MaximumCartValue,
      o.CartValueBetween
    ].includes(e);
  }
  _supportsFilterExtraction(e) {
    return [
      o.ProductTypes,
      o.Collections,
      o.SpecificProducts
    ].includes(e);
  }
  _mergeSelections(e, t, a, i) {
    const s = /* @__PURE__ */ new Map();
    return (e ?? []).forEach((r, u) => {
      s.set(r, t?.[u] ?? r);
    }), (a ?? []).forEach((r, u) => {
      s.set(r, i?.[u] ?? r);
    }), {
      ids: [...s.keys()],
      names: [...s.values()]
    };
  }
  async _openPicker(e, t) {
    if (I(this, y))
      switch (t.triggerType) {
        case o.SpecificProducts: {
          const i = await I(this, y).open(this, G, {
            data: { config: { currencySymbol: "", excludeProductIds: t.triggerIds ?? [] } }
          }).onSubmit().catch(() => {
          });
          if (i?.selections?.length) {
            const s = this._mergeSelections(
              t.triggerIds,
              t.triggerNames,
              i.selections.map((r) => r.productId),
              i.selections.map((r) => r.name)
            );
            this._handleUpdateRule(e, {
              triggerIds: s.ids,
              triggerNames: s.names
            });
          }
          break;
        }
        case o.Collections: {
          const i = await I(this, y).open(this, K, {
            data: { excludeIds: t.triggerIds ?? [], multiSelect: !0 }
          }).onSubmit().catch(() => {
          });
          if (i?.selectedIds?.length) {
            const s = this._mergeSelections(
              t.triggerIds,
              t.triggerNames,
              i.selectedIds,
              i.selectedNames
            );
            this._handleUpdateRule(e, {
              triggerIds: s.ids,
              triggerNames: s.names
            });
          }
          break;
        }
        case o.ProductTypes: {
          const i = await I(this, y).open(this, q, {
            data: { excludeIds: t.triggerIds ?? [], multiSelect: !0 }
          }).onSubmit().catch(() => {
          });
          if (i?.selectedIds?.length) {
            const s = this._mergeSelections(
              t.triggerIds,
              t.triggerNames,
              i.selectedIds,
              i.selectedNames
            );
            this._handleUpdateRule(e, {
              triggerIds: s.ids,
              triggerNames: s.names
            });
          }
          break;
        }
        case o.Suppliers: {
          const i = await I(this, y).open(this, Y, {
            data: { excludeIds: t.triggerIds ?? [], multiSelect: !0 }
          }).onSubmit().catch(() => {
          });
          if (i?.selectedIds?.length) {
            const s = this._mergeSelections(
              t.triggerIds,
              t.triggerNames,
              i.selectedIds,
              i.selectedNames
            );
            this._handleUpdateRule(e, {
              triggerIds: s.ids,
              triggerNames: s.names
            });
          }
          break;
        }
        case o.ProductFilters: {
          const i = await I(this, y).open(this, T, {
            data: { excludeFilterIds: t.triggerIds ?? [], multiSelect: !0 }
          }).onSubmit().catch(() => {
          });
          if (i?.selectedFilterIds?.length) {
            const s = this._mergeSelections(
              t.triggerIds,
              t.triggerNames,
              i.selectedFilterIds,
              i.selectedFilterNames
            );
            this._handleUpdateRule(e, {
              triggerIds: s.ids,
              triggerNames: s.names
            });
          }
          break;
        }
      }
  }
  async _openFilterValuePicker(e, t) {
    if (!I(this, y)) return;
    const i = await I(this, y).open(this, T, {
      data: { excludeFilterIds: t.extractFilterIds ?? [], multiSelect: !0 }
    }).onSubmit().catch(() => {
    });
    if (i?.selectedFilterIds?.length) {
      const s = this._mergeSelections(
        t.extractFilterIds,
        t.extractFilterNames,
        i.selectedFilterIds,
        i.selectedFilterNames
      );
      this._handleUpdateRule(e, {
        extractFilterIds: s.ids,
        extractFilterNames: s.names
      });
    }
  }
  _removeItem(e, t, a) {
    this._handleUpdateRule(e, {
      triggerIds: t.triggerIds?.filter((i, s) => s !== a) ?? [],
      triggerNames: t.triggerNames?.filter((i, s) => s !== a) ?? []
    });
  }
  _removeFilter(e, t, a) {
    this._handleUpdateRule(e, {
      extractFilterIds: t.extractFilterIds?.filter((i, s) => s !== a) ?? [],
      extractFilterNames: t.extractFilterNames?.filter((i, s) => s !== a) ?? []
    });
  }
  _handleCartValueChange(e, t, a) {
    if (!a.trim()) {
      this._handleUpdateRule(e, { [t]: void 0 });
      return;
    }
    const i = Number(a);
    !Number.isFinite(i) || i < 0 || this._handleUpdateRule(e, { [t]: i });
  }
  _getPickerLabel(e) {
    switch (e) {
      case o.ProductTypes:
        return "Select product types";
      case o.ProductFilters:
        return "Select filters";
      case o.Collections:
        return "Select collections";
      case o.SpecificProducts:
        return "Select products";
      case o.Suppliers:
        return "Select suppliers";
      default:
        return "Select";
    }
  }
  render() {
    return l`
      ${this.rules.length === 0 ? l`<div class="empty-state">No trigger rules added. Add a rule to define when this upsell should appear.</div>` : c}
      ${this.rules.map((e, t) => this._renderRule(e, t))}
      <uui-button look="placeholder" @click=${this._handleAddRule} label="Add trigger rule">
        <uui-icon name="icon-add"></uui-icon> Add trigger rule
      </uui-button>
    `;
  }
  _renderRule(e, t) {
    return l`
      <div class="rule-card">
        <div class="rule-header">
          <uui-select
            label="Trigger type"
            .options=${$e(e.triggerType)}
            @change=${(a) => this._handleTypeChange(t, a.target.value)}
          ></uui-select>
          <uui-button look="secondary" color="danger" compact label="Remove" @click=${() => this._handleRemoveRule(t)}>
            <uui-icon name="icon-trash"></uui-icon>
          </uui-button>
        </div>

        ${this._needsEntityPicker(e.triggerType) ? l`
            <div class="rule-body">
              <div class="tags">
                ${(e.triggerNames ?? []).length > 0 ? (e.triggerNames ?? []).map((a, i) => l`
                      <uui-tag look="secondary">
                        ${a}
                        <uui-button compact label="Remove" @click=${() => this._removeItem(t, e, i)}>
                          <uui-icon name="icon-wrong"></uui-icon>
                        </uui-button>
                      </uui-tag>
                    `) : l`<span class="empty-selection">No trigger items selected yet.</span>`}
              </div>
              <uui-button look="outline" @click=${() => this._openPicker(t, e)} label=${this._getPickerLabel(e.triggerType)}>
                ${this._getPickerLabel(e.triggerType)}
              </uui-button>
            </div>

            ${this._supportsFilterExtraction(e.triggerType) ? l`
                <div class="filter-extraction">
                  <label>Only match products with these filter values (optional):</label>
                  <div class="tags">
                    ${(e.extractFilterNames ?? []).length > 0 ? (e.extractFilterNames ?? []).map((a, i) => l`
                          <uui-tag look="secondary" color="warning">
                            ${a}
                            <uui-button compact label="Remove" @click=${() => this._removeFilter(t, e, i)}>
                              <uui-icon name="icon-wrong"></uui-icon>
                            </uui-button>
                          </uui-tag>
                        `) : l`<span class="empty-selection">No filter values selected.</span>`}
                  </div>
                  <uui-button look="outline" @click=${() => this._openFilterValuePicker(t, e)} label="Select filter values">
                    Select filter values
                  </uui-button>
                </div>
              ` : c}
          ` : this._isCartValueTrigger(e.triggerType) ? this._renderCartValueRule(e, t) : c}
      </div>
    `;
  }
  _renderCartValueRule(e, t) {
    return l`
      <div class="rule-body cart-value-body">
        ${e.triggerType === o.CartValueBetween ? l`
            <div class="cart-value-grid">
              <uui-input
                type="number"
                step="0.01"
                min="0"
                label="Minimum cart value"
                .value=${e.min != null ? String(e.min) : ""}
                @input=${(a) => this._handleCartValueChange(t, "min", a.target.value)}
              ></uui-input>
              <uui-input
                type="number"
                step="0.01"
                min="0"
                label="Maximum cart value"
                .value=${e.max != null ? String(e.max) : ""}
                @input=${(a) => this._handleCartValueChange(t, "max", a.target.value)}
              ></uui-input>
            </div>
          ` : l`
            <uui-input
              type="number"
              step="0.01"
              min="0"
              label=${e.triggerType === o.MinimumCartValue ? "Minimum cart value" : "Maximum cart value"}
              .value=${e.value != null ? String(e.value) : ""}
              @input=${(a) => this._handleCartValueChange(t, "value", a.target.value)}
            ></uui-input>
          `}
        <div class="cart-value-help">Amount uses store currency.</div>
      </div>
    `;
  }
};
y = /* @__PURE__ */ new WeakMap();
N.styles = M`
    :host {
      display: block;
    }

    .rule-card {
      border: 1px solid var(--uui-color-border);
      border-radius: var(--uui-border-radius);
      padding: var(--uui-size-space-4);
      margin-bottom: var(--uui-size-space-3);
      background: var(--uui-color-surface);
    }

    .rule-header {
      display: flex;
      gap: var(--uui-size-space-3);
      align-items: center;
    }

    .rule-header uui-select {
      flex: 1;
    }

    .rule-body {
      margin-top: var(--uui-size-space-3);
    }

    .empty-state {
      margin-bottom: var(--uui-size-space-3);
      padding: var(--uui-size-space-3);
      border-radius: var(--uui-border-radius);
      background: var(--uui-color-surface-alt);
      color: var(--uui-color-text-alt);
      font-size: var(--uui-type-small-size);
    }

    .tags {
      display: flex;
      flex-wrap: wrap;
      gap: var(--uui-size-space-2);
      margin-bottom: var(--uui-size-space-2);
    }

    .empty-selection {
      color: var(--uui-color-text-alt);
      font-size: var(--uui-type-small-size);
    }

    .filter-extraction {
      margin-top: var(--uui-size-space-4);
      padding-top: var(--uui-size-space-3);
      border-top: 1px dashed var(--uui-color-border);
    }

    .filter-extraction label {
      display: block;
      font-size: 0.85em;
      color: var(--uui-color-text-alt);
      margin-bottom: var(--uui-size-space-2);
    }

    .cart-value-body uui-input {
      width: 100%;
    }

    .cart-value-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: var(--uui-size-space-3);
    }

    .cart-value-help {
      margin-top: var(--uui-size-space-2);
      color: var(--uui-color-text-alt);
      font-size: 0.85em;
    }

    uui-button[look="placeholder"] {
      width: 100%;
    }
  `;
J([
  V({ type: Array })
], N.prototype, "rules", 2);
N = J([
  F("merchello-upsell-trigger-rule-builder")
], N);
var Ce = Object.defineProperty, Ie = Object.getOwnPropertyDescriptor, Z = (e) => {
  throw TypeError(e);
}, j = (e, t, a, i) => {
  for (var s = i > 1 ? void 0 : i ? Ie(t, a) : t, r = e.length - 1, u; r >= 0; r--)
    (u = e[r]) && (s = (i ? u(t, a, s) : u(s)) || s);
  return i && s && Ce(t, a, s), s;
}, ee = (e, t, a) => t.has(e) || Z("Cannot " + a), S = (e, t, a) => (ee(e, t, "read from private field"), t.get(e)), Se = (e, t, a) => t.has(e) ? Z("Cannot add the same private member more than once") : t instanceof WeakSet ? t.add(e) : t.set(e, a), ke = (e, t, a, i) => (ee(e, t, "write to private field"), t.set(e, a), a), f;
const xe = [
  { value: h.ProductTypes, label: "Product types" },
  { value: h.ProductFilters, label: "Product filters" },
  { value: h.Collections, label: "Collections" },
  { value: h.SpecificProducts, label: "Specific products" },
  { value: h.Suppliers, label: "Suppliers" }
];
function Re(e) {
  return xe.map((t) => ({
    name: t.label,
    value: String(t.value),
    selected: t.value === e
  }));
}
let E = class extends U(L) {
  constructor() {
    super(), this.rules = [], Se(this, f), this.consumeContext(D, (e) => {
      ke(this, f, e);
    });
  }
  _dispatchChange() {
    this.dispatchEvent(
      new CustomEvent("rules-change", {
        detail: { rules: this.rules },
        bubbles: !0,
        composed: !0
      })
    );
  }
  _handleAddRule() {
    this.rules = [...this.rules, {
      recommendationType: h.ProductTypes,
      recommendationIds: [],
      recommendationNames: [],
      matchTriggerFilters: !1,
      matchFilterIds: [],
      matchFilterNames: []
    }], this._dispatchChange();
  }
  _handleRemoveRule(e) {
    this.rules = this.rules.filter((t, a) => a !== e), this._dispatchChange();
  }
  _handleUpdateRule(e, t) {
    this.rules = this.rules.map((a, i) => i === e ? { ...a, ...t } : a), this._dispatchChange();
  }
  _handleTypeChange(e, t) {
    this._handleUpdateRule(e, {
      recommendationType: t,
      recommendationIds: [],
      recommendationNames: []
    });
  }
  _mergeSelections(e, t, a, i) {
    const s = /* @__PURE__ */ new Map();
    return (e ?? []).forEach((r, u) => {
      s.set(r, t?.[u] ?? r);
    }), (a ?? []).forEach((r, u) => {
      s.set(r, i?.[u] ?? r);
    }), {
      ids: [...s.keys()],
      names: [...s.values()]
    };
  }
  async _openPicker(e, t) {
    if (S(this, f))
      switch (t.recommendationType) {
        case h.SpecificProducts: {
          const i = await S(this, f).open(this, G, {
            data: { config: { currencySymbol: "", excludeProductIds: t.recommendationIds ?? [] } }
          }).onSubmit().catch(() => {
          });
          if (i?.selections?.length) {
            const s = this._mergeSelections(
              t.recommendationIds,
              t.recommendationNames,
              i.selections.map((r) => r.productId),
              i.selections.map((r) => r.name)
            );
            this._handleUpdateRule(e, {
              recommendationIds: s.ids,
              recommendationNames: s.names
            });
          }
          break;
        }
        case h.Collections: {
          const i = await S(this, f).open(this, K, {
            data: { excludeIds: t.recommendationIds ?? [], multiSelect: !0 }
          }).onSubmit().catch(() => {
          });
          if (i?.selectedIds?.length) {
            const s = this._mergeSelections(
              t.recommendationIds,
              t.recommendationNames,
              i.selectedIds,
              i.selectedNames
            );
            this._handleUpdateRule(e, {
              recommendationIds: s.ids,
              recommendationNames: s.names
            });
          }
          break;
        }
        case h.ProductTypes: {
          const i = await S(this, f).open(this, q, {
            data: { excludeIds: t.recommendationIds ?? [], multiSelect: !0 }
          }).onSubmit().catch(() => {
          });
          if (i?.selectedIds?.length) {
            const s = this._mergeSelections(
              t.recommendationIds,
              t.recommendationNames,
              i.selectedIds,
              i.selectedNames
            );
            this._handleUpdateRule(e, {
              recommendationIds: s.ids,
              recommendationNames: s.names
            });
          }
          break;
        }
        case h.Suppliers: {
          const i = await S(this, f).open(this, Y, {
            data: { excludeIds: t.recommendationIds ?? [], multiSelect: !0 }
          }).onSubmit().catch(() => {
          });
          if (i?.selectedIds?.length) {
            const s = this._mergeSelections(
              t.recommendationIds,
              t.recommendationNames,
              i.selectedIds,
              i.selectedNames
            );
            this._handleUpdateRule(e, {
              recommendationIds: s.ids,
              recommendationNames: s.names
            });
          }
          break;
        }
        case h.ProductFilters: {
          const i = await S(this, f).open(this, T, {
            data: { excludeFilterIds: t.recommendationIds ?? [], multiSelect: !0 }
          }).onSubmit().catch(() => {
          });
          if (i?.selectedFilterIds?.length) {
            const s = this._mergeSelections(
              t.recommendationIds,
              t.recommendationNames,
              i.selectedFilterIds,
              i.selectedFilterNames
            );
            this._handleUpdateRule(e, {
              recommendationIds: s.ids,
              recommendationNames: s.names
            });
          }
          break;
        }
      }
  }
  async _openFilterValuePicker(e, t) {
    if (!S(this, f)) return;
    const i = await S(this, f).open(this, T, {
      data: { excludeFilterIds: t.matchFilterIds ?? [], multiSelect: !0 }
    }).onSubmit().catch(() => {
    });
    if (i?.selectedFilterIds?.length) {
      const s = this._mergeSelections(
        t.matchFilterIds,
        t.matchFilterNames,
        i.selectedFilterIds,
        i.selectedFilterNames
      );
      this._handleUpdateRule(e, {
        matchFilterIds: s.ids,
        matchFilterNames: s.names
      });
    }
  }
  _removeItem(e, t, a) {
    this._handleUpdateRule(e, {
      recommendationIds: t.recommendationIds?.filter((i, s) => s !== a) ?? [],
      recommendationNames: t.recommendationNames?.filter((i, s) => s !== a) ?? []
    });
  }
  _removeFilter(e, t, a) {
    this._handleUpdateRule(e, {
      matchFilterIds: t.matchFilterIds?.filter((i, s) => s !== a) ?? [],
      matchFilterNames: t.matchFilterNames?.filter((i, s) => s !== a) ?? []
    });
  }
  _getPickerLabel(e) {
    switch (e) {
      case h.ProductTypes:
        return "Select product types";
      case h.ProductFilters:
        return "Select filters";
      case h.Collections:
        return "Select collections";
      case h.SpecificProducts:
        return "Select products";
      case h.Suppliers:
        return "Select suppliers";
      default:
        return "Select";
    }
  }
  render() {
    return l`
      ${this.rules.length === 0 ? l`<div class="empty-state">No recommendation rules added. Add rules to define what products to show.</div>` : c}
      ${this.rules.map((e, t) => this._renderRule(e, t))}
      <uui-button look="placeholder" @click=${this._handleAddRule} label="Add recommendation rule">
        <uui-icon name="icon-add"></uui-icon> Add recommendation rule
      </uui-button>
    `;
  }
  _renderRule(e, t) {
    return l`
      <div class="rule-card">
        <div class="rule-header">
          <uui-select
            label="Recommendation type"
            .options=${Re(e.recommendationType)}
            @change=${(a) => this._handleTypeChange(t, a.target.value)}
          ></uui-select>
          <uui-button look="secondary" color="danger" compact label="Remove" @click=${() => this._handleRemoveRule(t)}>
            <uui-icon name="icon-trash"></uui-icon>
          </uui-button>
        </div>

        <div class="rule-body">
          <div class="tags">
            ${(e.recommendationNames ?? []).length > 0 ? (e.recommendationNames ?? []).map((a, i) => l`
                  <uui-tag look="secondary">
                    ${a}
                    <uui-button compact label="Remove" @click=${() => this._removeItem(t, e, i)}>
                      <uui-icon name="icon-wrong"></uui-icon>
                    </uui-button>
                  </uui-tag>
                `) : l`<span class="empty-selection">No recommendation items selected yet.</span>`}
          </div>
          <uui-button look="outline" @click=${() => this._openPicker(t, e)} label=${this._getPickerLabel(e.recommendationType)}>
            ${this._getPickerLabel(e.recommendationType)}
          </uui-button>
        </div>

        <div class="filter-match">
          <uui-toggle
            label="Match trigger filters"
            .checked=${e.matchTriggerFilters}
            @change=${(a) => this._handleUpdateRule(t, { matchTriggerFilters: a.target.checked })}
          >Match trigger filters</uui-toggle>

          ${e.matchTriggerFilters ? l`
              <div class="filter-values">
                <label>Narrow to specific filter values (leave empty to match ALL extracted values):</label>
                <div class="tags">
                  ${(e.matchFilterNames ?? []).length > 0 ? (e.matchFilterNames ?? []).map((a, i) => l`
                        <uui-tag look="secondary" color="warning">
                          ${a}
                          <uui-button compact label="Remove" @click=${() => this._removeFilter(t, e, i)}>
                            <uui-icon name="icon-wrong"></uui-icon>
                          </uui-button>
                        </uui-tag>
                      `) : l`<span class="empty-selection">No filter values selected.</span>`}
                </div>
                <uui-button look="outline" @click=${() => this._openFilterValuePicker(t, e)} label="Select filter values">
                  Select filter values
                </uui-button>
              </div>
            ` : c}
        </div>
      </div>
    `;
  }
};
f = /* @__PURE__ */ new WeakMap();
E.styles = M`
    :host {
      display: block;
    }

    .rule-card {
      border: 1px solid var(--uui-color-border);
      border-radius: var(--uui-border-radius);
      padding: var(--uui-size-space-4);
      margin-bottom: var(--uui-size-space-3);
      background: var(--uui-color-surface);
    }

    .rule-header {
      display: flex;
      gap: var(--uui-size-space-3);
      align-items: center;
    }

    .rule-header uui-select {
      flex: 1;
    }

    .rule-body {
      margin-top: var(--uui-size-space-3);
    }

    .empty-state {
      margin-bottom: var(--uui-size-space-3);
      padding: var(--uui-size-space-3);
      border-radius: var(--uui-border-radius);
      background: var(--uui-color-surface-alt);
      color: var(--uui-color-text-alt);
      font-size: var(--uui-type-small-size);
    }

    .tags {
      display: flex;
      flex-wrap: wrap;
      gap: var(--uui-size-space-2);
      margin-bottom: var(--uui-size-space-2);
    }

    .empty-selection {
      color: var(--uui-color-text-alt);
      font-size: var(--uui-type-small-size);
    }

    .filter-match {
      margin-top: var(--uui-size-space-4);
      padding-top: var(--uui-size-space-3);
      border-top: 1px dashed var(--uui-color-border);
    }

    .filter-values {
      margin-top: var(--uui-size-space-3);
    }

    .filter-values label {
      display: block;
      font-size: 0.85em;
      color: var(--uui-color-text-alt);
      margin-bottom: var(--uui-size-space-2);
    }

    uui-button[look="placeholder"] {
      width: 100%;
    }
  `;
j([
  V({ type: Array })
], E.prototype, "rules", 2);
E = j([
  F("merchello-upsell-recommendation-rule-builder")
], E);
var we = Object.defineProperty, Pe = Object.getOwnPropertyDescriptor, te = (e) => {
  throw TypeError(e);
}, ie = (e, t, a, i) => {
  for (var s = i > 1 ? void 0 : i ? Pe(t, a) : t, r = e.length - 1, u; r >= 0; r--)
    (u = e[r]) && (s = (i ? u(t, a, s) : u(s)) || s);
  return i && s && we(t, a, s), s;
}, ae = (e, t, a) => t.has(e) || te("Cannot " + a), O = (e, t, a) => (ae(e, t, "read from private field"), t.get(e)), Te = (e, t, a) => t.has(e) ? te("Cannot add the same private member more than once") : t instanceof WeakSet ? t.add(e) : t.set(e, a), Ne = (e, t, a, i) => (ae(e, t, "write to private field"), t.set(e, a), a), R;
const Ee = [
  { value: $.AllCustomers, label: "Everyone" },
  { value: $.CustomerSegments, label: "Customer segments" },
  { value: $.SpecificCustomers, label: "Specific customers" }
];
function ze(e) {
  return Ee.map((t) => ({
    name: t.label,
    value: String(t.value),
    selected: t.value === e
  }));
}
let z = class extends U(L) {
  constructor() {
    super(), this.rules = [], Te(this, R), this.consumeContext(D, (e) => {
      Ne(this, R, e);
    });
  }
  _dispatchChange() {
    this.dispatchEvent(
      new CustomEvent("rules-change", {
        detail: { rules: this.rules },
        bubbles: !0,
        composed: !0
      })
    );
  }
  _handleAddRule() {
    this.rules = [...this.rules, {
      eligibilityType: $.AllCustomers,
      eligibilityIds: [],
      eligibilityNames: []
    }], this._dispatchChange();
  }
  _handleRemoveRule(e) {
    this.rules = this.rules.filter((t, a) => a !== e), this._dispatchChange();
  }
  _handleUpdateRule(e, t) {
    this.rules = this.rules.map((a, i) => i === e ? { ...a, ...t } : a), this._dispatchChange();
  }
  _handleTypeChange(e, t) {
    this._handleUpdateRule(e, {
      eligibilityType: t,
      eligibilityIds: [],
      eligibilityNames: []
    });
  }
  _needsPicker(e) {
    return e === $.CustomerSegments || e === $.SpecificCustomers;
  }
  _mergeSelections(e, t, a, i) {
    const s = /* @__PURE__ */ new Map();
    return (e ?? []).forEach((r, u) => {
      s.set(r, t?.[u] ?? r);
    }), (a ?? []).forEach((r, u) => {
      s.set(r, i?.[u] ?? r);
    }), {
      ids: [...s.keys()],
      names: [...s.values()]
    };
  }
  async _openPicker(e, t) {
    if (O(this, R)) {
      if (t.eligibilityType === $.CustomerSegments) {
        const i = await O(this, R).open(this, me, {
          data: { excludeIds: t.eligibilityIds ?? [], multiSelect: !0 }
        }).onSubmit().catch(() => {
        });
        if (i?.selectedIds?.length) {
          const s = this._mergeSelections(
            t.eligibilityIds,
            t.eligibilityNames,
            i.selectedIds,
            i.selectedNames
          );
          this._handleUpdateRule(e, {
            eligibilityIds: s.ids,
            eligibilityNames: s.names
          });
        }
      } else if (t.eligibilityType === $.SpecificCustomers) {
        const i = await O(this, R).open(this, ge, {
          data: { excludeCustomerIds: t.eligibilityIds ?? [], multiSelect: !0 }
        }).onSubmit().catch(() => {
        });
        if (i?.selectedCustomerIds?.length) {
          const s = await Promise.all(i.selectedCustomerIds.map(async (u) => {
            const { data: P } = await x.getCustomer(u);
            return P && ([P.firstName, P.lastName].filter(Boolean).join(" ") || P.email) || u;
          })), r = this._mergeSelections(
            t.eligibilityIds,
            t.eligibilityNames,
            i.selectedCustomerIds,
            s
          );
          this._handleUpdateRule(e, {
            eligibilityIds: r.ids,
            eligibilityNames: r.names
          });
        }
      }
    }
  }
  _removeItem(e, t, a) {
    this._handleUpdateRule(e, {
      eligibilityIds: t.eligibilityIds?.filter((i, s) => s !== a) ?? [],
      eligibilityNames: t.eligibilityNames?.filter((i, s) => s !== a) ?? []
    });
  }
  _getPickerLabel(e) {
    switch (e) {
      case $.CustomerSegments:
        return "Select segments";
      case $.SpecificCustomers:
        return "Select customers";
      default:
        return "Select";
    }
  }
  render() {
    return l`
      ${this.rules.length === 0 ? l`<div class="empty-state">No eligibility rules added. This upsell is available to everyone.</div>` : c}
      ${this.rules.map((e, t) => this._renderRule(e, t))}
      <uui-button look="placeholder" @click=${this._handleAddRule} label="Add eligibility rule">
        <uui-icon name="icon-add"></uui-icon> Add eligibility rule
      </uui-button>
    `;
  }
  _renderRule(e, t) {
    return l`
      <div class="rule-card">
        <div class="rule-header">
          <uui-select
            label="Eligibility type"
            .options=${ze(e.eligibilityType)}
            @change=${(a) => this._handleTypeChange(t, a.target.value)}
          ></uui-select>
          <uui-button look="secondary" color="danger" compact label="Remove" @click=${() => this._handleRemoveRule(t)}>
            <uui-icon name="icon-trash"></uui-icon>
          </uui-button>
        </div>

        ${this._needsPicker(e.eligibilityType) ? l`
            <div class="rule-body">
              <div class="tags">
                ${(e.eligibilityNames ?? []).length > 0 ? (e.eligibilityNames ?? []).map((a, i) => l`
                      <uui-tag look="secondary">
                        ${a}
                        <uui-button compact label="Remove" @click=${() => this._removeItem(t, e, i)}>
                          <uui-icon name="icon-wrong"></uui-icon>
                        </uui-button>
                      </uui-tag>
                    `) : l`<span class="empty-selection">No items selected yet.</span>`}
              </div>
              <uui-button look="outline" @click=${() => this._openPicker(t, e)} label=${this._getPickerLabel(e.eligibilityType)}>
                ${this._getPickerLabel(e.eligibilityType)}
              </uui-button>
            </div>
          ` : c}
      </div>
    `;
  }
};
R = /* @__PURE__ */ new WeakMap();
z.styles = M`
    :host {
      display: block;
    }

    .rule-card {
      border: 1px solid var(--uui-color-border);
      border-radius: var(--uui-border-radius);
      padding: var(--uui-size-space-4);
      margin-bottom: var(--uui-size-space-3);
      background: var(--uui-color-surface);
    }

    .rule-header {
      display: flex;
      gap: var(--uui-size-space-3);
      align-items: center;
    }

    .rule-header uui-select {
      flex: 1;
    }

    .rule-body {
      margin-top: var(--uui-size-space-3);
    }

    .empty-state {
      margin-bottom: var(--uui-size-space-3);
      padding: var(--uui-size-space-3);
      border-radius: var(--uui-border-radius);
      background: var(--uui-color-surface-alt);
      color: var(--uui-color-text-alt);
      font-size: var(--uui-type-small-size);
    }

    .tags {
      display: flex;
      flex-wrap: wrap;
      gap: var(--uui-size-space-2);
      margin-bottom: var(--uui-size-space-2);
    }

    .empty-selection {
      color: var(--uui-color-text-alt);
      font-size: var(--uui-type-small-size);
    }

    uui-button[look="placeholder"] {
      width: 100%;
    }
  `;
ie([
  V({ type: Array })
], z.prototype, "rules", 2);
z = ie([
  F("merchello-upsell-eligibility-rule-builder")
], z);
const Le = new ue("Merchello.UpsellStyle.Modal", {
  modal: {
    type: "dialog",
    size: "large"
  }
});
var Me = Object.defineProperty, Fe = Object.getOwnPropertyDescriptor, se = (e) => {
  throw TypeError(e);
}, m = (e, t, a, i) => {
  for (var s = i > 1 ? void 0 : i ? Fe(t, a) : t, r = e.length - 1, u; r >= 0; r--)
    (u = e[r]) && (s = (i ? u(t, a, s) : u(s)) || s);
  return i && s && Me(t, a, s), s;
}, le = (e, t, a) => t.has(e) || se("Cannot " + a), n = (e, t, a) => (le(e, t, "read from private field"), t.get(e)), B = (e, t, a) => t.has(e) ? se("Cannot add the same private member more than once") : t instanceof WeakSet ? t.add(e) : t.set(e, a), H = (e, t, a, i) => (le(e, t, "write to private field"), t.set(e, a), a), p, g, w;
let d = class extends U(L) {
  constructor() {
    super(), this._isNew = !0, this._isLoading = !0, this._isSaving = !1, this._validationErrors = /* @__PURE__ */ new Map(), this._triggerRules = [], this._recommendationRules = [], this._eligibilityRules = [], this._performanceLoading = !1, this._routes = [], this._activePath = "", B(this, p), B(this, g), B(this, w), this._initRoutes(), this.consumeContext(re, (e) => {
      H(this, p, e), n(this, p) && (this._isNew = n(this, p).isNew, this.observe(n(this, p).upsell, (t) => {
        this._upsell = t, this._triggerRules = t?.triggerRules ?? [], this._recommendationRules = t?.recommendationRules ?? [], this._eligibilityRules = t?.eligibilityRules ?? [], this._isLoading = !1;
      }, "_upsell"), this.observe(n(this, p).isLoading, (t) => {
        this._isLoading = t;
      }, "_isLoading"), this.observe(n(this, p).isSaving, (t) => {
        this._isSaving = t;
      }, "_isSaving"));
    }), this.consumeContext(oe, (e) => {
      H(this, g, e);
    }), this.consumeContext(D, (e) => {
      H(this, w, e);
    });
  }
  _initRoutes() {
    const e = () => document.createElement("div");
    this._routes = [
      { path: "tab/details", component: e },
      { path: "tab/rules", component: e },
      { path: "tab/display", component: e },
      { path: "tab/eligibility", component: e },
      { path: "tab/schedule", component: e },
      { path: "tab/performance", component: e },
      { path: "", redirectTo: "tab/details" }
    ];
  }
  _getActiveTab() {
    return this._activePath.includes("tab/rules") ? "rules" : this._activePath.includes("tab/display") ? "display" : this._activePath.includes("tab/eligibility") ? "eligibility" : this._activePath.includes("tab/schedule") ? "schedule" : this._activePath.includes("tab/performance") ? "performance" : "details";
  }
  _onRouterInit(e) {
    this._routerPath = e.target.absoluteRouterPath;
  }
  _onRouterChange(e) {
    this._activePath = e.target.localActiveViewPath || "";
  }
  _getHeadline() {
    return this._isNew ? "Create upsell" : this._upsell?.name ?? "Edit upsell";
  }
  _handleInputChange(e, t) {
    if (!this._upsell) return;
    const a = { ...this._upsell, [e]: t };
    n(this, p)?.updateUpsell(a), this._validationErrors.delete(e), this.requestUpdate();
  }
  _validate() {
    return this._validationErrors.clear(), this._upsell?.name?.trim() || this._validationErrors.set("name", "Name is required"), this._upsell?.heading?.trim() || this._validationErrors.set("heading", "Heading is required"), this.requestUpdate(), this._validationErrors.size === 0;
  }
  async _handleSave() {
    if (!this._upsell || !this._validate()) {
      n(this, g)?.peek("warning", {
        data: { headline: "Validation failed", message: "Please fix the errors before saving" }
      });
      return;
    }
    if (n(this, p)?.setIsSaving(!0), this._isNew) {
      const e = {
        name: this._upsell.name,
        description: this._upsell.description,
        heading: this._upsell.heading,
        message: this._upsell.message,
        displayLocation: this._upsell.displayLocation,
        checkoutMode: this._upsell.checkoutMode,
        sortBy: this._upsell.sortBy,
        maxProducts: this._upsell.maxProducts,
        suppressIfInCart: this._upsell.suppressIfInCart,
        priority: this._upsell.priority,
        startsAt: this._upsell.startsAt,
        endsAt: this._upsell.endsAt,
        timezone: this._upsell.timezone,
        displayStyles: this._upsell.displayStyles,
        triggerRules: this._triggerRules.map((i) => ({
          triggerType: i.triggerType,
          triggerIds: i.triggerIds,
          value: i.value,
          min: i.min,
          max: i.max,
          extractFilterIds: i.extractFilterIds
        })),
        recommendationRules: this._recommendationRules.map((i) => ({
          recommendationType: i.recommendationType,
          recommendationIds: i.recommendationIds,
          matchTriggerFilters: i.matchTriggerFilters,
          matchFilterIds: i.matchFilterIds
        })),
        eligibilityRules: this._eligibilityRules.map((i) => ({
          eligibilityType: i.eligibilityType,
          eligibilityIds: i.eligibilityIds
        }))
      }, { data: t, error: a } = await x.createUpsell(e);
      if (n(this, p)?.setIsSaving(!1), a) {
        n(this, g)?.peek("danger", {
          data: { headline: "Failed to create upsell", message: a.message }
        });
        return;
      }
      t && (n(this, p)?.updateUpsell(t), this._isNew = !1, n(this, g)?.peek("positive", {
        data: { headline: "Upsell created", message: `${t.name} has been created` }
      }), de(t.id));
    } else {
      const e = {
        name: this._upsell.name,
        description: this._upsell.description,
        heading: this._upsell.heading,
        message: this._upsell.message,
        displayLocation: this._upsell.displayLocation,
        checkoutMode: this._upsell.checkoutMode,
        sortBy: this._upsell.sortBy,
        maxProducts: this._upsell.maxProducts,
        suppressIfInCart: this._upsell.suppressIfInCart,
        priority: this._upsell.priority,
        startsAt: this._upsell.startsAt,
        endsAt: this._upsell.endsAt,
        timezone: this._upsell.timezone,
        displayStyles: this._upsell.displayStyles ?? null,
        clearDisplayStyles: !this._upsell.displayStyles,
        triggerRules: this._triggerRules.map((i) => ({
          triggerType: i.triggerType,
          triggerIds: i.triggerIds,
          value: i.value,
          min: i.min,
          max: i.max,
          extractFilterIds: i.extractFilterIds
        })),
        recommendationRules: this._recommendationRules.map((i) => ({
          recommendationType: i.recommendationType,
          recommendationIds: i.recommendationIds,
          matchTriggerFilters: i.matchTriggerFilters,
          matchFilterIds: i.matchFilterIds
        })),
        eligibilityRules: this._eligibilityRules.map((i) => ({
          eligibilityType: i.eligibilityType,
          eligibilityIds: i.eligibilityIds
        }))
      }, { data: t, error: a } = await x.updateUpsell(this._upsell.id, e);
      if (n(this, p)?.setIsSaving(!1), a) {
        n(this, g)?.peek("danger", {
          data: { headline: "Failed to update upsell", message: a.message }
        });
        return;
      }
      t && (n(this, p)?.updateUpsell(t), n(this, g)?.peek("positive", {
        data: { headline: "Upsell saved", message: `${t.name} has been updated` }
      }));
    }
  }
  async _handleDelete() {
    if (!this._upsell?.id) return;
    const e = n(this, w)?.open(this, ne, {
      data: {
        headline: "Delete Upsell",
        content: `Delete "${this._upsell.name}" permanently. This action cannot be undone.`,
        confirmLabel: "Delete",
        color: "danger"
      }
    });
    try {
      await e?.onSubmit();
    } catch {
      return;
    }
    const { error: t } = await x.deleteUpsell(this._upsell.id);
    if (t) {
      n(this, g)?.peek("danger", {
        data: { headline: "Failed to delete upsell", message: t.message }
      });
      return;
    }
    n(this, g)?.peek("positive", {
      data: { headline: "Upsell deleted", message: `${this._upsell.name} has been deleted` }
    }), pe();
  }
  async _handleActivate() {
    if (!this._upsell?.id) return;
    const { data: e, error: t } = await x.activateUpsell(this._upsell.id);
    if (t) {
      n(this, g)?.peek("danger", {
        data: { headline: "Failed to activate upsell", message: t.message }
      });
      return;
    }
    e && (n(this, p)?.updateUpsell(e), n(this, g)?.peek("positive", {
      data: { headline: "Upsell activated", message: `${e.name} is now active` }
    }));
  }
  async _handleDeactivate() {
    if (!this._upsell?.id) return;
    const { data: e, error: t } = await x.deactivateUpsell(this._upsell.id);
    if (t) {
      n(this, g)?.peek("danger", {
        data: { headline: "Failed to deactivate upsell", message: t.message }
      });
      return;
    }
    e && (n(this, p)?.updateUpsell(e), n(this, g)?.peek("positive", {
      data: { headline: "Upsell deactivated", message: `${e.name} has been disabled` }
    }));
  }
  _handleTriggerRulesChange(e) {
    this._triggerRules = e.detail.rules;
  }
  _handleRecommendationRulesChange(e) {
    this._recommendationRules = e.detail.rules;
  }
  _handleEligibilityRulesChange(e) {
    this._eligibilityRules = e.detail.rules;
  }
  // ============================================
  // Tab Renderers
  // ============================================
  _renderDetailsTab() {
    return l`
      <uui-box headline="Basic Information">
        <div class="form-grid">
          <umb-property-layout
            label="Name"
            description="Internal name for this upsell rule"
            ?mandatory=${!0}
            ?invalid=${this._validationErrors.has("name")}>
            <uui-input
              slot="editor"
              .value=${this._upsell?.name ?? ""}
              @input=${(e) => this._handleInputChange("name", e.target.value)}
              label="Name"
              placeholder="e.g. Bed to Pillow Upsell"
            ></uui-input>
          </umb-property-layout>

          <umb-property-layout label="Description" description="Internal notes about this upsell rule">
            <uui-textarea
              slot="editor"
              .value=${this._upsell?.description ?? ""}
              @input=${(e) => this._handleInputChange("description", e.target.value || null)}
              label="Description"
              placeholder="Optional internal description"
            ></uui-textarea>
          </umb-property-layout>
        </div>
      </uui-box>

      <uui-box headline="Customer-Facing Content">
        <div class="form-grid">
          <umb-property-layout
            label="Heading"
            description="Customer-facing heading shown with recommendations"
            ?mandatory=${!0}
            ?invalid=${this._validationErrors.has("heading")}>
            <uui-input
              slot="editor"
              .value=${this._upsell?.heading ?? ""}
              @input=${(e) => this._handleInputChange("heading", e.target.value)}
              label="Heading"
              placeholder="e.g. Complete your bedroom"
            ></uui-input>
          </umb-property-layout>

          <umb-property-layout label="Message" description="Optional customer-facing message">
            <uui-textarea
              slot="editor"
              .value=${this._upsell?.message ?? ""}
              @input=${(e) => this._handleInputChange("message", e.target.value || null)}
              label="Message"
              placeholder="e.g. Don't forget your pillows!"
            ></uui-textarea>
          </umb-property-layout>

          <umb-property-layout label="Priority" description="Lower number = higher priority (default 1000)">
            <uui-input
              slot="editor"
              type="number"
              .value=${String(this._upsell?.priority ?? 1e3)}
              @input=${(e) => this._handleInputChange("priority", parseInt(e.target.value) || 1e3)}
              label="Priority"
            ></uui-input>
          </umb-property-layout>
        </div>
      </uui-box>
    `;
  }
  _renderRulesTab() {
    return l`
      <uui-box headline="WHEN basket contains (Trigger Rules)">
        <p class="rule-description">Define what must be in the customer's basket for this upsell to activate. Multiple triggers use OR logic.</p>
        <merchello-upsell-trigger-rule-builder
          .rules=${this._triggerRules}
          @rules-change=${this._handleTriggerRulesChange}
        ></merchello-upsell-trigger-rule-builder>
      </uui-box>

      <uui-box headline="THEN recommend (Recommendation Rules)">
        <p class="rule-description">Define which products to recommend when triggers match. Products from all rules form a combined pool.</p>
        <merchello-upsell-recommendation-rule-builder
          .rules=${this._recommendationRules}
          @rules-change=${this._handleRecommendationRulesChange}
        ></merchello-upsell-recommendation-rule-builder>
      </uui-box>
    `;
  }
  _renderDisplayTab() {
    const e = this._upsell?.displayLocation ?? b.Checkout;
    return l`
      <uui-box headline="Display Locations">
        <p class="rule-description">Choose where this upsell should appear.</p>
        <div class="checkbox-group">
          <uui-checkbox
            label="Checkout"
            .checked=${!!(e & b.Checkout)}
            @change=${(t) => this._toggleDisplayLocation(b.Checkout, t.target.checked)}
          >Checkout</uui-checkbox>
          <uui-checkbox
            label="Basket"
            .checked=${!!(e & b.Basket)}
            @change=${(t) => this._toggleDisplayLocation(b.Basket, t.target.checked)}
          >Basket</uui-checkbox>
          <uui-checkbox
            label="Product Page"
            .checked=${!!(e & b.ProductPage)}
            @change=${(t) => this._toggleDisplayLocation(b.ProductPage, t.target.checked)}
          >Product Page</uui-checkbox>
          <uui-checkbox
            label="Email"
            .checked=${!!(e & b.Email)}
            @change=${(t) => this._toggleDisplayLocation(b.Email, t.target.checked)}
          >Email</uui-checkbox>
          <uui-checkbox
            label="Confirmation"
            .checked=${!!(e & b.Confirmation)}
            @change=${(t) => this._toggleDisplayLocation(b.Confirmation, t.target.checked)}
          >Confirmation</uui-checkbox>
        </div>
      </uui-box>

      ${e & b.Checkout ? l`
          <uui-box headline="Checkout Mode">
            <umb-property-layout label="Display mode" description="How the upsell appears during checkout">
              <uui-select
                slot="editor"
                label="Checkout mode"
                .options=${[
      { name: "Inline", value: C.Inline, selected: this._upsell?.checkoutMode === C.Inline },
      { name: "Interstitial", value: C.Interstitial, selected: this._upsell?.checkoutMode === C.Interstitial },
      { name: "Order Bump", value: C.OrderBump, selected: this._upsell?.checkoutMode === C.OrderBump },
      { name: "Post-Purchase", value: C.PostPurchase, selected: this._upsell?.checkoutMode === C.PostPurchase }
    ]}
                @change=${(t) => this._handleInputChange("checkoutMode", t.target.value)}
              ></uui-select>
            </umb-property-layout>
          </uui-box>
        ` : c}

      <uui-box headline="Style Customization">
        <div class="style-config">
          <p class="rule-description">
            Customize colors, borders, and backgrounds for each upsell surface and element.
            Default storefront styles are used when no overrides are set.
          </p>
          <div class="style-actions">
            <uui-button look="secondary" label="Customize styles" @click=${this._openStyleModal}>
              Customize styles
            </uui-button>
            ${this._countStyledSurfaces(this._upsell?.displayStyles) > 0 ? l`<uui-tag look="secondary" color="positive">
                  ${this._countStyledSurfaces(this._upsell?.displayStyles)} surfaces customized
                </uui-tag>` : l`<uui-tag look="secondary">Using defaults</uui-tag>`}
          </div>
        </div>
      </uui-box>

      <uui-box headline="Product Display">
        <div class="form-grid">
          <umb-property-layout label="Sort by" description="How recommended products are ordered">
            <uui-select
              slot="editor"
              label="Sort by"
              .options=${[
      { name: "Best Seller", value: _.BestSeller, selected: this._upsell?.sortBy === _.BestSeller },
      { name: "Price: Low to High", value: _.PriceLowToHigh, selected: this._upsell?.sortBy === _.PriceLowToHigh },
      { name: "Price: High to Low", value: _.PriceHighToLow, selected: this._upsell?.sortBy === _.PriceHighToLow },
      { name: "Name", value: _.Name, selected: this._upsell?.sortBy === _.Name },
      { name: "Date Added", value: _.DateAdded, selected: this._upsell?.sortBy === _.DateAdded },
      { name: "Random", value: _.Random, selected: this._upsell?.sortBy === _.Random }
    ]}
              @change=${(t) => this._handleInputChange("sortBy", t.target.value)}
            ></uui-select>
          </umb-property-layout>

          <umb-property-layout label="Max products" description="Maximum products to show (default 4)">
            <uui-input
              slot="editor"
              type="number"
              .value=${String(this._upsell?.maxProducts ?? 4)}
              @input=${(t) => this._handleInputChange("maxProducts", parseInt(t.target.value) || 4)}
              label="Max products"
              min="1"
              max="20"
            ></uui-input>
          </umb-property-layout>

          <umb-property-layout label="Suppress if in cart" description="Don't show products already in the basket">
            <uui-toggle
              slot="editor"
              .checked=${this._upsell?.suppressIfInCart ?? !0}
              @change=${(t) => this._handleInputChange("suppressIfInCart", t.target.checked)}
              label="Suppress if in cart"
            ></uui-toggle>
          </umb-property-layout>
        </div>
      </uui-box>
    `;
  }
  _toggleDisplayLocation(e, t) {
    const a = this._upsell?.displayLocation ?? 0, i = t ? a | e : a & ~e;
    this._handleInputChange("displayLocation", i);
  }
  _countStyledSurfaces(e) {
    return e ? [
      "checkoutInline",
      "checkoutInterstitial",
      "postPurchase",
      "basket",
      "productPage",
      "email",
      "confirmation"
    ].filter((a) => !!e[a]).length : 0;
  }
  async _openStyleModal() {
    if (!n(this, w) || !this._upsell) return;
    const t = await n(this, w).open(this, Le, {
      data: {
        styles: this._upsell.displayStyles,
        heading: this._upsell.heading,
        message: this._upsell.message
      }
    }).onSubmit().catch(() => {
    });
    t && this._handleInputChange("displayStyles", t.styles ?? void 0);
  }
  _renderEligibilityTab() {
    return l`
      <uui-box headline="Eligibility">
        <p class="rule-description">Choose who can see this upsell.</p>
        <merchello-upsell-eligibility-rule-builder
          .rules=${this._eligibilityRules}
          @rules-change=${this._handleEligibilityRulesChange}
        ></merchello-upsell-eligibility-rule-builder>
      </uui-box>
    `;
  }
  _renderScheduleTab() {
    return l`
      <uui-box headline="Schedule">
        <div class="form-grid">
          <umb-property-layout label="Starts at" description="When this upsell becomes active">
            <uui-input
              slot="editor"
              type="datetime-local"
              .value=${this._upsell?.startsAt ? this._upsell.startsAt.substring(0, 16) : ""}
              @input=${(e) => {
      const t = e.target.value;
      this._handleInputChange("startsAt", t ? new Date(t).toISOString() : null);
    }}
              label="Starts at"
            ></uui-input>
          </umb-property-layout>

          <umb-property-layout label="Ends at" description="When this upsell expires (optional)">
            <uui-input
              slot="editor"
              type="datetime-local"
              .value=${this._upsell?.endsAt ? this._upsell.endsAt.substring(0, 16) : ""}
              @input=${(e) => {
      const t = e.target.value;
      this._handleInputChange("endsAt", t ? new Date(t).toISOString() : null);
    }}
              label="Ends at"
            ></uui-input>
          </umb-property-layout>

          <umb-property-layout label="Timezone" description="Timezone for display purposes">
            <uui-input
              slot="editor"
              .value=${this._upsell?.timezone ?? ""}
              @input=${(e) => this._handleInputChange("timezone", e.target.value || null)}
              label="Timezone"
              placeholder="e.g. Europe/London"
            ></uui-input>
          </umb-property-layout>
        </div>
      </uui-box>
    `;
  }
  async _loadPerformance() {
    if (!this._upsell?.id || this._performanceLoading) return;
    this._performanceLoading = !0, this._performanceError = void 0;
    const { data: e, error: t } = await x.getUpsellPerformance(this._upsell.id);
    if (this._performanceLoading = !1, t) {
      this._performanceError = t.message;
      return;
    }
    this._performance = e ?? void 0;
  }
  _renderPerformanceTab() {
    if (!this._performance && !this._performanceLoading && !this._performanceError && this._upsell?.id && this._loadPerformance(), this._performanceLoading)
      return l`<div class="loading"><uui-loader></uui-loader></div>`;
    if (this._performanceError)
      return l`
        <uui-box headline="Performance">
          <p style="color: var(--uui-color-danger)">${this._performanceError}</p>
          <uui-button look="secondary" label="Retry" @click=${this._loadPerformance}>Retry</uui-button>
        </uui-box>
      `;
    const e = this._performance;
    return !e || e.totalImpressions === 0 && e.totalClicks === 0 && e.totalConversions === 0 ? l`
        <uui-box headline="Performance">
          <p class="rule-description">No analytics data recorded yet. Performance metrics will appear here once the upsell has been active and customers have interacted with it.</p>
        </uui-box>
      ` : l`
      <div class="perf-stats-grid">
        <uui-box headline="Impressions">
          <div class="stat-value">${k(e.totalImpressions)}</div>
          <div class="stat-label">Total views</div>
        </uui-box>
        <uui-box headline="Clicks">
          <div class="stat-value">${k(e.totalClicks)}</div>
          <div class="stat-label">CTR: ${W(e.clickThroughRate)}</div>
        </uui-box>
        <uui-box headline="Conversions">
          <div class="stat-value">${k(e.totalConversions)}</div>
          <div class="stat-label">Rate: ${W(e.conversionRate)}</div>
        </uui-box>
        <uui-box headline="Revenue">
          <div class="stat-value">${A(e.totalRevenue)}</div>
          <div class="stat-label">Avg: ${A(e.averageOrderValue)}</div>
        </uui-box>
      </div>

      <uui-box headline="Additional Metrics">
        <div class="metrics-list">
          <div class="metric-row">
            <span class="metric-label">Unique customers</span>
            <span class="metric-value">${k(e.uniqueCustomersCount)}</span>
          </div>
          ${e.firstImpression ? l`
            <div class="metric-row">
              <span class="metric-label">First impression</span>
              <span class="metric-value">${new Date(e.firstImpression).toLocaleDateString()}</span>
            </div>
          ` : c}
          ${e.lastConversion ? l`
            <div class="metric-row">
              <span class="metric-label">Last conversion</span>
              <span class="metric-value">${new Date(e.lastConversion).toLocaleDateString()}</span>
            </div>
          ` : c}
        </div>
      </uui-box>

      ${e.eventsByDate.length > 0 ? l`
        <uui-box headline="Daily Breakdown">
          <div class="events-table-wrapper">
            <table class="events-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Impressions</th>
                  <th>Clicks</th>
                  <th>Conversions</th>
                  <th>Revenue</th>
                </tr>
              </thead>
              <tbody>
                ${e.eventsByDate.map(
      (t) => l`
                    <tr>
                      <td>${new Date(t.date).toLocaleDateString()}</td>
                      <td>${k(t.impressions)}</td>
                      <td>${k(t.clicks)}</td>
                      <td>${k(t.conversions)}</td>
                      <td>${A(t.revenue)}</td>
                    </tr>
                  `
    )}
              </tbody>
            </table>
          </div>
        </uui-box>
      ` : c}
    `;
  }
  _renderTabs() {
    const e = this._getActiveTab(), t = this._routerPath ? `${this._routerPath}/tab` : "tab";
    return l`
      <uui-tab-group slot="header">
        <uui-tab label="Details" href="${t}/details" ?active=${e === "details"}>Details</uui-tab>
        <uui-tab label="Rules" href="${t}/rules" ?active=${e === "rules"}>Rules</uui-tab>
        <uui-tab label="Display" href="${t}/display" ?active=${e === "display"}>Display</uui-tab>
        <uui-tab label="Eligibility" href="${t}/eligibility" ?active=${e === "eligibility"}>Eligibility</uui-tab>
        <uui-tab label="Schedule" href="${t}/schedule" ?active=${e === "schedule"}>Schedule</uui-tab>
        ${this._isNew ? c : l`<uui-tab label="Performance" href="${t}/performance" ?active=${e === "performance"}>Performance</uui-tab>`}
      </uui-tab-group>
    `;
  }
  _renderActiveTabContent() {
    const e = this._getActiveTab();
    return l`
      ${e === "details" ? this._renderDetailsTab() : c}
      ${e === "rules" ? this._renderRulesTab() : c}
      ${e === "display" ? this._renderDisplayTab() : c}
      ${e === "eligibility" ? this._renderEligibilityTab() : c}
      ${e === "schedule" ? this._renderScheduleTab() : c}
      ${e === "performance" && !this._isNew ? this._renderPerformanceTab() : c}
    `;
  }
  render() {
    if (this._isLoading)
      return l`
        <umb-body-layout>
          <div class="loading"><uui-loader></uui-loader></div>
        </umb-body-layout>
      `;
    const e = this._upsell?.statusLabel ?? "", t = this._upsell?.statusColor ?? "default";
    return l`
      <umb-body-layout header-fit-height main-no-padding>
        <uui-button slot="header" compact href=${he()} label="Back to Upsells" class="back-button">
          <uui-icon name="icon-arrow-left"></uui-icon>
        </uui-button>

        <div id="header" slot="header">
          <umb-icon name="icon-trending-up"></umb-icon>
          <span class="headline">${this._getHeadline()}</span>
          ${!this._isNew && this._upsell ? l`<uui-tag look="secondary" color=${t}>${e}</uui-tag>` : c}
        </div>

        ${this._isNew ? c : l`
              <div slot="header" class="header-actions">
                ${this._upsell?.status === ce.Active ? l`<uui-button look="secondary" label="Deactivate" @click=${this._handleDeactivate}>Deactivate</uui-button>` : l`<uui-button look="secondary" color="positive" label="Activate" @click=${this._handleActivate}>Activate</uui-button>`}
                <uui-button look="secondary" color="danger" label="Delete" @click=${this._handleDelete}>Delete</uui-button>
              </div>
            `}

        <umb-body-layout header-fit-height header-no-padding>
          ${this._renderTabs()}

          <umb-router-slot
            .routes=${this._routes}
            @init=${this._onRouterInit}
            @change=${this._onRouterChange}>
          </umb-router-slot>

          <div class="detail-layout">
            <div class="main-content">
              <div class="tab-content">
                ${this._renderActiveTabContent()}
              </div>
            </div>
          </div>
        </umb-body-layout>

        <umb-footer-layout slot="footer">
          <uui-button
            slot="actions"
            look="primary"
            color="positive"
            label=${this._isNew ? "Create" : "Save"}
            ?disabled=${this._isSaving}
            @click=${this._handleSave}
          >
            ${this._isSaving ? this._isNew ? "Creating..." : "Saving..." : this._isNew ? "Create" : "Save"}
          </uui-button>
        </umb-footer-layout>
      </umb-body-layout>
    `;
  }
};
p = /* @__PURE__ */ new WeakMap();
g = /* @__PURE__ */ new WeakMap();
w = /* @__PURE__ */ new WeakMap();
d.styles = M`
    :host {
      display: block;
      height: 100%;
      --uui-tab-background: var(--uui-color-surface);
    }

    .back-button {
      margin-right: var(--uui-size-space-2);
    }

    umb-router-slot {
      display: none;
    }

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

    .headline {
      font-size: var(--uui-type-h4-size);
      font-weight: 700;
    }

    .header-actions {
      display: flex;
      gap: var(--uui-size-space-2);
      align-items: center;
      padding: var(--uui-size-space-4) 0;
      flex-wrap: wrap;
    }

    .detail-layout {
      display: flex;
      gap: var(--uui-size-layout-1);
      padding: var(--uui-size-layout-1);
    }

    .main-content {
      flex: 1;
      min-width: 0;
    }

    .tab-content {
      display: flex;
      flex-direction: column;
      gap: var(--uui-size-space-5);
    }

    .form-grid {
      display: flex;
      flex-direction: column;
      gap: var(--uui-size-space-4);
    }

    .checkbox-group {
      display: flex;
      flex-wrap: wrap;
      gap: var(--uui-size-space-4);
    }

    .style-config {
      display: flex;
      flex-direction: column;
      gap: var(--uui-size-space-3);
    }

    .style-actions {
      display: flex;
      align-items: center;
      gap: var(--uui-size-space-3);
    }

    .rule-description {
      color: var(--uui-color-text-alt);
      font-size: 0.9em;
      margin-top: 0;
      margin-bottom: var(--uui-size-space-4);
    }

    uui-input,
    uui-textarea,
    uui-select {
      width: 100%;
    }

    .loading {
      display: flex;
      justify-content: center;
      padding: var(--uui-size-space-6);
    }

    .perf-stats-grid {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: var(--uui-size-layout-1);
    }

    .stat-value {
      font-size: 2rem;
      font-weight: bold;
      color: var(--uui-color-text);
      margin-bottom: var(--uui-size-space-1);
    }

    .stat-label {
      font-size: var(--uui-type-small-size);
      color: var(--uui-color-text-alt);
    }

    .metrics-list {
      display: flex;
      flex-direction: column;
      gap: var(--uui-size-space-3);
    }

    .metric-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: var(--uui-size-space-2) 0;
      border-bottom: 1px solid var(--uui-color-border);
    }

    .metric-row:last-child {
      border-bottom: none;
    }

    .metric-label {
      color: var(--uui-color-text-alt);
      font-size: var(--uui-type-small-size);
    }

    .metric-value {
      font-weight: 600;
    }

    .events-table-wrapper {
      overflow-x: auto;
    }

    .events-table {
      width: 100%;
      border-collapse: collapse;
      font-size: var(--uui-type-small-size);
    }

    .events-table th,
    .events-table td {
      padding: var(--uui-size-space-3) var(--uui-size-space-4);
      text-align: left;
      border-bottom: 1px solid var(--uui-color-border);
    }

    .events-table th {
      font-weight: 600;
      color: var(--uui-color-text-alt);
      white-space: nowrap;
    }

    .events-table tbody tr:hover {
      background: var(--uui-color-surface-alt);
    }

    @media (max-width: 1024px) {
      .perf-stats-grid {
        grid-template-columns: repeat(2, minmax(0, 1fr));
      }
    }

    @media (max-width: 768px) {
      #header {
        padding: var(--uui-size-space-3) 0;
      }

      .detail-layout {
        padding: var(--uui-size-space-3);
      }

      .style-actions {
        flex-wrap: wrap;
      }

      .checkbox-group {
        flex-direction: column;
        gap: var(--uui-size-space-3);
      }

      .perf-stats-grid {
        grid-template-columns: 1fr;
      }

      .events-table th,
      .events-table td {
        padding: var(--uui-size-space-2) var(--uui-size-space-3);
      }
    }
  `;
m([
  v()
], d.prototype, "_upsell", 2);
m([
  v()
], d.prototype, "_isNew", 2);
m([
  v()
], d.prototype, "_isLoading", 2);
m([
  v()
], d.prototype, "_isSaving", 2);
m([
  v()
], d.prototype, "_validationErrors", 2);
m([
  v()
], d.prototype, "_triggerRules", 2);
m([
  v()
], d.prototype, "_recommendationRules", 2);
m([
  v()
], d.prototype, "_eligibilityRules", 2);
m([
  v()
], d.prototype, "_performance", 2);
m([
  v()
], d.prototype, "_performanceLoading", 2);
m([
  v()
], d.prototype, "_performanceError", 2);
m([
  v()
], d.prototype, "_routes", 2);
m([
  v()
], d.prototype, "_routerPath", 2);
m([
  v()
], d.prototype, "_activePath", 2);
d = m([
  F("merchello-upsell-detail")
], d);
const Ze = d;
export {
  d as MerchelloUpsellDetailElement,
  Ze as default
};
//# sourceMappingURL=upsell-detail.element-BigYhaLx.js.map
