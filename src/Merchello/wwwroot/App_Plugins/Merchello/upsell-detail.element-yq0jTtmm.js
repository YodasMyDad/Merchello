import { LitElement as N, html as l, nothing as n, css as L, property as G, customElement as F, state as b } from "@umbraco-cms/backoffice/external/lit";
import { UmbElementMixin as M } from "@umbraco-cms/backoffice/element-api";
import { UMB_WORKSPACE_CONTEXT as re } from "@umbraco-cms/backoffice/workspace";
import { UMB_NOTIFICATION_CONTEXT as oe } from "@umbraco-cms/backoffice/notification";
import { UMB_MODAL_MANAGER_CONTEXT as D, UMB_CONFIRM_MODAL as ue } from "@umbraco-cms/backoffice/modal";
import { d as r, e as d, f as I, a as v, U as _, C as $, b as ne } from "./upsell.types-ChZp0X_-.js";
import { M as P } from "./merchello-api-LENiBVrz.js";
import { c as k, f as B, a as U } from "./formatting-DJZ9lKiF.js";
import { B as ce, C as de, D as pe } from "./navigation-COkStlQk.js";
import { M as H } from "./product-picker-modal.token-BfbHsSHl.js";
import { M as W } from "./collection-picker-modal.token-DEqocfk-.js";
import { M as K } from "./product-type-picker-modal.token-BIXbr0YK.js";
import { a as V, M as he } from "./supplier-picker-modal.token-CHapAKSP.js";
import { M as q } from "./filter-picker-modal.token-DlO79hNz.js";
import { M as Y } from "./filter-group-picker-modal.token-3WABoY0F.js";
import { M as me } from "./customer-picker-modal.token-BZSMisS9.js";
var ge = Object.defineProperty, be = Object.getOwnPropertyDescriptor, X = (e) => {
  throw TypeError(e);
}, J = (e, t, a, i) => {
  for (var s = i > 1 ? void 0 : i ? be(t, a) : t, p = e.length - 1, h; p >= 0; p--)
    (h = e[p]) && (s = (i ? h(t, a, s) : h(s)) || s);
  return i && s && ge(t, a, s), s;
}, Q = (e, t, a) => t.has(e) || X("Cannot " + a), C = (e, t, a) => (Q(e, t, "read from private field"), t.get(e)), ve = (e, t, a) => t.has(e) ? X("Cannot add the same private member more than once") : t instanceof WeakSet ? t.add(e) : t.set(e, a), _e = (e, t, a, i) => (Q(e, t, "write to private field"), t.set(e, a), a), y;
const ye = [
  { value: r.ProductTypes, label: "Product types" },
  { value: r.ProductFilters, label: "Product filters" },
  { value: r.Collections, label: "Collections" },
  { value: r.SpecificProducts, label: "Specific products" },
  { value: r.Suppliers, label: "Suppliers" },
  { value: r.MinimumCartValue, label: "Minimum cart value" },
  { value: r.MaximumCartValue, label: "Maximum cart value" },
  { value: r.CartValueBetween, label: "Cart value between" }
];
function fe(e) {
  return ye.map((t) => ({
    name: t.label,
    value: String(t.value),
    selected: t.value === e
  }));
}
let x = class extends M(N) {
  constructor() {
    super(), this.rules = [], ve(this, y), this.consumeContext(D, (e) => {
      _e(this, y, e);
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
      triggerType: r.ProductTypes,
      triggerIds: [],
      triggerNames: [],
      extractFilterGroupIds: [],
      extractFilterGroupNames: []
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
      extractFilterGroupIds: [],
      extractFilterGroupNames: []
    });
  }
  _needsEntityPicker(e) {
    return [
      r.ProductTypes,
      r.ProductFilters,
      r.Collections,
      r.SpecificProducts,
      r.Suppliers
    ].includes(e);
  }
  _supportsFilterExtraction(e) {
    return [
      r.ProductTypes,
      r.Collections,
      r.SpecificProducts
    ].includes(e);
  }
  async _openPicker(e, t) {
    if (C(this, y))
      switch (t.triggerType) {
        case r.SpecificProducts: {
          const i = await C(this, y).open(this, H, {
            data: { config: { currencySymbol: "", excludeProductIds: t.triggerIds ?? [] } }
          }).onSubmit().catch(() => {
          });
          i?.selections?.length && this._handleUpdateRule(e, {
            triggerIds: [...t.triggerIds ?? [], ...i.selections.map((s) => s.productId)],
            triggerNames: [...t.triggerNames ?? [], ...i.selections.map((s) => s.name)]
          });
          break;
        }
        case r.Collections: {
          const i = await C(this, y).open(this, W, {
            data: { excludeIds: t.triggerIds ?? [], multiSelect: !0 }
          }).onSubmit().catch(() => {
          });
          i?.selectedIds?.length && this._handleUpdateRule(e, {
            triggerIds: [...t.triggerIds ?? [], ...i.selectedIds],
            triggerNames: [...t.triggerNames ?? [], ...i.selectedNames]
          });
          break;
        }
        case r.ProductTypes: {
          const i = await C(this, y).open(this, K, {
            data: { excludeIds: t.triggerIds ?? [], multiSelect: !0 }
          }).onSubmit().catch(() => {
          });
          i?.selectedIds?.length && this._handleUpdateRule(e, {
            triggerIds: [...t.triggerIds ?? [], ...i.selectedIds],
            triggerNames: [...t.triggerNames ?? [], ...i.selectedNames]
          });
          break;
        }
        case r.Suppliers: {
          const i = await C(this, y).open(this, V, {
            data: { excludeIds: t.triggerIds ?? [], multiSelect: !0 }
          }).onSubmit().catch(() => {
          });
          i?.selectedIds?.length && this._handleUpdateRule(e, {
            triggerIds: [...t.triggerIds ?? [], ...i.selectedIds],
            triggerNames: [...t.triggerNames ?? [], ...i.selectedNames]
          });
          break;
        }
        case r.ProductFilters: {
          const i = await C(this, y).open(this, q, {
            data: { excludeFilterIds: t.triggerIds ?? [], multiSelect: !0 }
          }).onSubmit().catch(() => {
          });
          i?.selectedFilterIds?.length && this._handleUpdateRule(e, {
            triggerIds: [...t.triggerIds ?? [], ...i.selectedFilterIds],
            triggerNames: [...t.triggerNames ?? [], ...i.selectedFilterNames]
          });
          break;
        }
      }
  }
  async _openFilterGroupPicker(e, t) {
    if (!C(this, y)) return;
    const i = await C(this, y).open(this, Y, {
      data: { excludeIds: t.extractFilterGroupIds ?? [], multiSelect: !0 }
    }).onSubmit().catch(() => {
    });
    i?.selectedIds?.length && this._handleUpdateRule(e, {
      extractFilterGroupIds: [...t.extractFilterGroupIds ?? [], ...i.selectedIds],
      extractFilterGroupNames: [...t.extractFilterGroupNames ?? [], ...i.selectedNames]
    });
  }
  _removeItem(e, t, a) {
    this._handleUpdateRule(e, {
      triggerIds: t.triggerIds?.filter((i, s) => s !== a) ?? [],
      triggerNames: t.triggerNames?.filter((i, s) => s !== a) ?? []
    });
  }
  _removeFilterGroup(e, t, a) {
    this._handleUpdateRule(e, {
      extractFilterGroupIds: t.extractFilterGroupIds?.filter((i, s) => s !== a) ?? [],
      extractFilterGroupNames: t.extractFilterGroupNames?.filter((i, s) => s !== a) ?? []
    });
  }
  _getPickerLabel(e) {
    switch (e) {
      case r.ProductTypes:
        return "Select product types";
      case r.ProductFilters:
        return "Select filters";
      case r.Collections:
        return "Select collections";
      case r.SpecificProducts:
        return "Select products";
      case r.Suppliers:
        return "Select suppliers";
      default:
        return "Select";
    }
  }
  render() {
    return l`
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
            .options=${fe(e.triggerType)}
            @change=${(a) => this._handleTypeChange(t, a.target.value)}
          ></uui-select>
          <uui-button look="secondary" color="danger" compact label="Remove" @click=${() => this._handleRemoveRule(t)}>
            <uui-icon name="icon-trash"></uui-icon>
          </uui-button>
        </div>

        ${this._needsEntityPicker(e.triggerType) ? l`
            <div class="rule-body">
              <div class="tags">
                ${(e.triggerNames ?? []).map((a, i) => l`
                  <uui-tag look="secondary">
                    ${a}
                    <uui-button compact label="Remove" @click=${() => this._removeItem(t, e, i)}>
                      <uui-icon name="icon-wrong"></uui-icon>
                    </uui-button>
                  </uui-tag>
                `)}
              </div>
              <uui-button look="outline" @click=${() => this._openPicker(t, e)} label=${this._getPickerLabel(e.triggerType)}>
                ${this._getPickerLabel(e.triggerType)}
              </uui-button>
            </div>

            ${this._supportsFilterExtraction(e.triggerType) ? l`
                <div class="filter-extraction">
                  <label>Extract filter values from these groups (for filter matching):</label>
                  <div class="tags">
                    ${(e.extractFilterGroupNames ?? []).map((a, i) => l`
                      <uui-tag look="secondary" color="warning">
                        ${a}
                        <uui-button compact label="Remove" @click=${() => this._removeFilterGroup(t, e, i)}>
                          <uui-icon name="icon-wrong"></uui-icon>
                        </uui-button>
                      </uui-tag>
                    `)}
                  </div>
                  <uui-button look="outline" @click=${() => this._openFilterGroupPicker(t, e)} label="Select filter groups">
                    Select filter groups
                  </uui-button>
                </div>
              ` : n}
          ` : n}
      </div>
    `;
  }
};
y = /* @__PURE__ */ new WeakMap();
x.styles = L`
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

    .tags {
      display: flex;
      flex-wrap: wrap;
      gap: var(--uui-size-space-2);
      margin-bottom: var(--uui-size-space-2);
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

    uui-button[look="placeholder"] {
      width: 100%;
    }
  `;
J([
  G({ type: Array })
], x.prototype, "rules", 2);
x = J([
  F("merchello-upsell-trigger-rule-builder")
], x);
var Ie = Object.defineProperty, $e = Object.getOwnPropertyDescriptor, Z = (e) => {
  throw TypeError(e);
}, j = (e, t, a, i) => {
  for (var s = i > 1 ? void 0 : i ? $e(t, a) : t, p = e.length - 1, h; p >= 0; p--)
    (h = e[p]) && (s = (i ? h(t, a, s) : h(s)) || s);
  return i && s && Ie(t, a, s), s;
}, ee = (e, t, a) => t.has(e) || Z("Cannot " + a), R = (e, t, a) => (ee(e, t, "read from private field"), t.get(e)), Ce = (e, t, a) => t.has(e) ? Z("Cannot add the same private member more than once") : t instanceof WeakSet ? t.add(e) : t.set(e, a), Re = (e, t, a, i) => (ee(e, t, "write to private field"), t.set(e, a), a), f;
const ke = [
  { value: d.ProductTypes, label: "Product types" },
  { value: d.ProductFilters, label: "Product filters" },
  { value: d.Collections, label: "Collections" },
  { value: d.SpecificProducts, label: "Specific products" },
  { value: d.Suppliers, label: "Suppliers" }
];
function Pe(e) {
  return ke.map((t) => ({
    name: t.label,
    value: String(t.value),
    selected: t.value === e
  }));
}
let T = class extends M(N) {
  constructor() {
    super(), this.rules = [], Ce(this, f), this.consumeContext(D, (e) => {
      Re(this, f, e);
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
      recommendationType: d.ProductTypes,
      recommendationIds: [],
      recommendationNames: [],
      matchTriggerFilters: !1,
      matchFilterGroupIds: [],
      matchFilterGroupNames: []
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
  async _openPicker(e, t) {
    if (R(this, f))
      switch (t.recommendationType) {
        case d.SpecificProducts: {
          const i = await R(this, f).open(this, H, {
            data: { config: { currencySymbol: "", excludeProductIds: t.recommendationIds ?? [] } }
          }).onSubmit().catch(() => {
          });
          i?.selections?.length && this._handleUpdateRule(e, {
            recommendationIds: [...t.recommendationIds ?? [], ...i.selections.map((s) => s.productId)],
            recommendationNames: [...t.recommendationNames ?? [], ...i.selections.map((s) => s.name)]
          });
          break;
        }
        case d.Collections: {
          const i = await R(this, f).open(this, W, {
            data: { excludeIds: t.recommendationIds ?? [], multiSelect: !0 }
          }).onSubmit().catch(() => {
          });
          i?.selectedIds?.length && this._handleUpdateRule(e, {
            recommendationIds: [...t.recommendationIds ?? [], ...i.selectedIds],
            recommendationNames: [...t.recommendationNames ?? [], ...i.selectedNames]
          });
          break;
        }
        case d.ProductTypes: {
          const i = await R(this, f).open(this, K, {
            data: { excludeIds: t.recommendationIds ?? [], multiSelect: !0 }
          }).onSubmit().catch(() => {
          });
          i?.selectedIds?.length && this._handleUpdateRule(e, {
            recommendationIds: [...t.recommendationIds ?? [], ...i.selectedIds],
            recommendationNames: [...t.recommendationNames ?? [], ...i.selectedNames]
          });
          break;
        }
        case d.Suppliers: {
          const i = await R(this, f).open(this, V, {
            data: { excludeIds: t.recommendationIds ?? [], multiSelect: !0 }
          }).onSubmit().catch(() => {
          });
          i?.selectedIds?.length && this._handleUpdateRule(e, {
            recommendationIds: [...t.recommendationIds ?? [], ...i.selectedIds],
            recommendationNames: [...t.recommendationNames ?? [], ...i.selectedNames]
          });
          break;
        }
        case d.ProductFilters: {
          const i = await R(this, f).open(this, q, {
            data: { excludeFilterIds: t.recommendationIds ?? [], multiSelect: !0 }
          }).onSubmit().catch(() => {
          });
          i?.selectedFilterIds?.length && this._handleUpdateRule(e, {
            recommendationIds: [...t.recommendationIds ?? [], ...i.selectedFilterIds],
            recommendationNames: [...t.recommendationNames ?? [], ...i.selectedFilterNames]
          });
          break;
        }
      }
  }
  async _openFilterGroupPicker(e, t) {
    if (!R(this, f)) return;
    const i = await R(this, f).open(this, Y, {
      data: { excludeIds: t.matchFilterGroupIds ?? [], multiSelect: !0 }
    }).onSubmit().catch(() => {
    });
    i?.selectedIds?.length && this._handleUpdateRule(e, {
      matchFilterGroupIds: [...t.matchFilterGroupIds ?? [], ...i.selectedIds],
      matchFilterGroupNames: [...t.matchFilterGroupNames ?? [], ...i.selectedNames]
    });
  }
  _removeItem(e, t, a) {
    this._handleUpdateRule(e, {
      recommendationIds: t.recommendationIds?.filter((i, s) => s !== a) ?? [],
      recommendationNames: t.recommendationNames?.filter((i, s) => s !== a) ?? []
    });
  }
  _removeFilterGroup(e, t, a) {
    this._handleUpdateRule(e, {
      matchFilterGroupIds: t.matchFilterGroupIds?.filter((i, s) => s !== a) ?? [],
      matchFilterGroupNames: t.matchFilterGroupNames?.filter((i, s) => s !== a) ?? []
    });
  }
  _getPickerLabel(e) {
    switch (e) {
      case d.ProductTypes:
        return "Select product types";
      case d.ProductFilters:
        return "Select filters";
      case d.Collections:
        return "Select collections";
      case d.SpecificProducts:
        return "Select products";
      case d.Suppliers:
        return "Select suppliers";
      default:
        return "Select";
    }
  }
  render() {
    return l`
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
            .options=${Pe(e.recommendationType)}
            @change=${(a) => this._handleTypeChange(t, a.target.value)}
          ></uui-select>
          <uui-button look="secondary" color="danger" compact label="Remove" @click=${() => this._handleRemoveRule(t)}>
            <uui-icon name="icon-trash"></uui-icon>
          </uui-button>
        </div>

        <div class="rule-body">
          <div class="tags">
            ${(e.recommendationNames ?? []).map((a, i) => l`
              <uui-tag look="secondary">
                ${a}
                <uui-button compact label="Remove" @click=${() => this._removeItem(t, e, i)}>
                  <uui-icon name="icon-wrong"></uui-icon>
                </uui-button>
              </uui-tag>
            `)}
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
              <div class="filter-groups">
                <label>Narrow to specific filter groups (leave empty to match ALL extracted groups):</label>
                <div class="tags">
                  ${(e.matchFilterGroupNames ?? []).map((a, i) => l`
                    <uui-tag look="secondary" color="warning">
                      ${a}
                      <uui-button compact label="Remove" @click=${() => this._removeFilterGroup(t, e, i)}>
                        <uui-icon name="icon-wrong"></uui-icon>
                      </uui-button>
                    </uui-tag>
                  `)}
                </div>
                <uui-button look="outline" @click=${() => this._openFilterGroupPicker(t, e)} label="Select filter groups">
                  Select filter groups
                </uui-button>
              </div>
            ` : n}
        </div>
      </div>
    `;
  }
};
f = /* @__PURE__ */ new WeakMap();
T.styles = L`
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

    .tags {
      display: flex;
      flex-wrap: wrap;
      gap: var(--uui-size-space-2);
      margin-bottom: var(--uui-size-space-2);
    }

    .filter-match {
      margin-top: var(--uui-size-space-4);
      padding-top: var(--uui-size-space-3);
      border-top: 1px dashed var(--uui-color-border);
    }

    .filter-groups {
      margin-top: var(--uui-size-space-3);
    }

    .filter-groups label {
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
  G({ type: Array })
], T.prototype, "rules", 2);
T = j([
  F("merchello-upsell-recommendation-rule-builder")
], T);
var we = Object.defineProperty, Se = Object.getOwnPropertyDescriptor, te = (e) => {
  throw TypeError(e);
}, ie = (e, t, a, i) => {
  for (var s = i > 1 ? void 0 : i ? Se(t, a) : t, p = e.length - 1, h; p >= 0; p--)
    (h = e[p]) && (s = (i ? h(t, a, s) : h(s)) || s);
  return i && s && we(t, a, s), s;
}, ae = (e, t, a) => t.has(e) || te("Cannot " + a), A = (e, t, a) => (ae(e, t, "read from private field"), t.get(e)), xe = (e, t, a) => t.has(e) ? te("Cannot add the same private member more than once") : t instanceof WeakSet ? t.add(e) : t.set(e, a), Te = (e, t, a, i) => (ae(e, t, "write to private field"), t.set(e, a), a), w;
const Ee = [
  { value: I.AllCustomers, label: "Everyone" },
  { value: I.CustomerSegments, label: "Customer segments" },
  { value: I.SpecificCustomers, label: "Specific customers" }
];
function Ne(e) {
  return Ee.map((t) => ({
    name: t.label,
    value: String(t.value),
    selected: t.value === e
  }));
}
let E = class extends M(N) {
  constructor() {
    super(), this.rules = [], xe(this, w), this.consumeContext(D, (e) => {
      Te(this, w, e);
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
      eligibilityType: I.AllCustomers,
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
    return e === I.CustomerSegments || e === I.SpecificCustomers;
  }
  async _openPicker(e, t) {
    if (A(this, w)) {
      if (t.eligibilityType === I.CustomerSegments) {
        const i = await A(this, w).open(this, he, {
          data: { excludeIds: t.eligibilityIds ?? [], multiSelect: !0 }
        }).onSubmit().catch(() => {
        });
        i?.selectedIds?.length && this._handleUpdateRule(e, {
          eligibilityIds: [...t.eligibilityIds ?? [], ...i.selectedIds],
          eligibilityNames: [...t.eligibilityNames ?? [], ...i.selectedNames]
        });
      } else if (t.eligibilityType === I.SpecificCustomers) {
        const i = await A(this, w).open(this, me, {
          data: { excludeCustomerIds: t.eligibilityIds ?? [], multiSelect: !0 }
        }).onSubmit().catch(() => {
        });
        i?.selectedCustomerIds?.length && this._handleUpdateRule(e, {
          eligibilityIds: [...t.eligibilityIds ?? [], ...i.selectedCustomerIds]
        });
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
      case I.CustomerSegments:
        return "Select segments";
      case I.SpecificCustomers:
        return "Select customers";
      default:
        return "Select";
    }
  }
  render() {
    return l`
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
            .options=${Ne(e.eligibilityType)}
            @change=${(a) => this._handleTypeChange(t, a.target.value)}
          ></uui-select>
          <uui-button look="secondary" color="danger" compact label="Remove" @click=${() => this._handleRemoveRule(t)}>
            <uui-icon name="icon-trash"></uui-icon>
          </uui-button>
        </div>

        ${this._needsPicker(e.eligibilityType) ? l`
            <div class="rule-body">
              <div class="tags">
                ${(e.eligibilityNames ?? []).map((a, i) => l`
                  <uui-tag look="secondary">
                    ${a}
                    <uui-button compact label="Remove" @click=${() => this._removeItem(t, e, i)}>
                      <uui-icon name="icon-wrong"></uui-icon>
                    </uui-button>
                  </uui-tag>
                `)}
              </div>
              <uui-button look="outline" @click=${() => this._openPicker(t, e)} label=${this._getPickerLabel(e.eligibilityType)}>
                ${this._getPickerLabel(e.eligibilityType)}
              </uui-button>
            </div>
          ` : n}
      </div>
    `;
  }
};
w = /* @__PURE__ */ new WeakMap();
E.styles = L`
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

    .tags {
      display: flex;
      flex-wrap: wrap;
      gap: var(--uui-size-space-2);
      margin-bottom: var(--uui-size-space-2);
    }

    uui-button[look="placeholder"] {
      width: 100%;
    }
  `;
ie([
  G({ type: Array })
], E.prototype, "rules", 2);
E = ie([
  F("merchello-upsell-eligibility-rule-builder")
], E);
var Le = Object.defineProperty, Fe = Object.getOwnPropertyDescriptor, se = (e) => {
  throw TypeError(e);
}, m = (e, t, a, i) => {
  for (var s = i > 1 ? void 0 : i ? Fe(t, a) : t, p = e.length - 1, h; p >= 0; p--)
    (h = e[p]) && (s = (i ? h(t, a, s) : h(s)) || s);
  return i && s && Le(t, a, s), s;
}, le = (e, t, a) => t.has(e) || se("Cannot " + a), o = (e, t, a) => (le(e, t, "read from private field"), t.get(e)), z = (e, t, a) => t.has(e) ? se("Cannot add the same private member more than once") : t instanceof WeakSet ? t.add(e) : t.set(e, a), O = (e, t, a, i) => (le(e, t, "write to private field"), t.set(e, a), a), c, g, S;
let u = class extends M(N) {
  constructor() {
    super(), this._isNew = !0, this._isLoading = !0, this._isSaving = !1, this._validationErrors = /* @__PURE__ */ new Map(), this._triggerRules = [], this._recommendationRules = [], this._eligibilityRules = [], this._performanceLoading = !1, this._routes = [], this._activePath = "", z(this, c), z(this, g), z(this, S), this._initRoutes(), this.consumeContext(re, (e) => {
      O(this, c, e), o(this, c) && (this._isNew = o(this, c).isNew, this.observe(o(this, c).upsell, (t) => {
        this._upsell = t, this._triggerRules = t?.triggerRules ?? [], this._recommendationRules = t?.recommendationRules ?? [], this._eligibilityRules = t?.eligibilityRules ?? [], this._isLoading = !1;
      }, "_upsell"), this.observe(o(this, c).isLoading, (t) => {
        this._isLoading = t;
      }, "_isLoading"), this.observe(o(this, c).isSaving, (t) => {
        this._isSaving = t;
      }, "_isSaving"));
    }), this.consumeContext(oe, (e) => {
      O(this, g, e);
    }), this.consumeContext(D, (e) => {
      O(this, S, e);
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
    o(this, c)?.updateUpsell(a), this._validationErrors.delete(e), this.requestUpdate();
  }
  _validate() {
    return this._validationErrors.clear(), this._upsell?.name?.trim() || this._validationErrors.set("name", "Name is required"), this._upsell?.heading?.trim() || this._validationErrors.set("heading", "Heading is required"), this.requestUpdate(), this._validationErrors.size === 0;
  }
  async _handleSave() {
    if (!this._upsell || !this._validate()) {
      o(this, g)?.peek("warning", {
        data: { headline: "Validation failed", message: "Please fix the errors before saving" }
      });
      return;
    }
    if (o(this, c)?.setIsSaving(!0), this._isNew) {
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
        triggerRules: this._triggerRules.map((i) => ({
          triggerType: i.triggerType,
          triggerIds: i.triggerIds,
          extractFilterGroupIds: i.extractFilterGroupIds
        })),
        recommendationRules: this._recommendationRules.map((i) => ({
          recommendationType: i.recommendationType,
          recommendationIds: i.recommendationIds,
          matchTriggerFilters: i.matchTriggerFilters,
          matchFilterGroupIds: i.matchFilterGroupIds
        })),
        eligibilityRules: this._eligibilityRules.map((i) => ({
          eligibilityType: i.eligibilityType,
          eligibilityIds: i.eligibilityIds
        }))
      }, { data: t, error: a } = await P.createUpsell(e);
      if (o(this, c)?.setIsSaving(!1), a) {
        o(this, g)?.peek("danger", {
          data: { headline: "Failed to create upsell", message: a.message }
        });
        return;
      }
      t && (o(this, c)?.updateUpsell(t), this._isNew = !1, o(this, g)?.peek("positive", {
        data: { headline: "Upsell created", message: `${t.name} has been created` }
      }), ce(t.id));
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
        triggerRules: this._triggerRules.map((i) => ({
          triggerType: i.triggerType,
          triggerIds: i.triggerIds,
          extractFilterGroupIds: i.extractFilterGroupIds
        })),
        recommendationRules: this._recommendationRules.map((i) => ({
          recommendationType: i.recommendationType,
          recommendationIds: i.recommendationIds,
          matchTriggerFilters: i.matchTriggerFilters,
          matchFilterGroupIds: i.matchFilterGroupIds
        })),
        eligibilityRules: this._eligibilityRules.map((i) => ({
          eligibilityType: i.eligibilityType,
          eligibilityIds: i.eligibilityIds
        }))
      }, { data: t, error: a } = await P.updateUpsell(this._upsell.id, e);
      if (o(this, c)?.setIsSaving(!1), a) {
        o(this, g)?.peek("danger", {
          data: { headline: "Failed to update upsell", message: a.message }
        });
        return;
      }
      t && (o(this, c)?.updateUpsell(t), o(this, g)?.peek("positive", {
        data: { headline: "Upsell saved", message: `${t.name} has been updated` }
      }));
    }
  }
  async _handleDelete() {
    if (!this._upsell?.id) return;
    const e = o(this, S)?.open(this, ue, {
      data: {
        headline: "Delete Upsell",
        content: `Are you sure you want to delete "${this._upsell.name}"? This action cannot be undone.`,
        confirmLabel: "Delete",
        color: "danger"
      }
    });
    try {
      await e?.onSubmit();
    } catch {
      return;
    }
    const { error: t } = await P.deleteUpsell(this._upsell.id);
    if (t) {
      o(this, g)?.peek("danger", {
        data: { headline: "Failed to delete upsell", message: t.message }
      });
      return;
    }
    o(this, g)?.peek("positive", {
      data: { headline: "Upsell deleted", message: `${this._upsell.name} has been deleted` }
    }), de();
  }
  async _handleActivate() {
    if (!this._upsell?.id) return;
    const { data: e, error: t } = await P.activateUpsell(this._upsell.id);
    if (t) {
      o(this, g)?.peek("danger", {
        data: { headline: "Failed to activate upsell", message: t.message }
      });
      return;
    }
    e && (o(this, c)?.updateUpsell(e), o(this, g)?.peek("positive", {
      data: { headline: "Upsell activated", message: `${e.name} is now active` }
    }));
  }
  async _handleDeactivate() {
    if (!this._upsell?.id) return;
    const { data: e, error: t } = await P.deactivateUpsell(this._upsell.id);
    if (t) {
      o(this, g)?.peek("danger", {
        data: { headline: "Failed to deactivate upsell", message: t.message }
      });
      return;
    }
    e && (o(this, c)?.updateUpsell(e), o(this, g)?.peek("positive", {
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
    const e = this._upsell?.displayLocation ?? v.Checkout;
    return l`
      <uui-box headline="Display Locations">
        <p class="rule-description">Choose where this upsell should appear.</p>
        <div class="checkbox-group">
          <uui-checkbox
            label="Checkout"
            .checked=${!!(e & v.Checkout)}
            @change=${(t) => this._toggleDisplayLocation(v.Checkout, t.target.checked)}
          >Checkout</uui-checkbox>
          <uui-checkbox
            label="Basket"
            .checked=${!!(e & v.Basket)}
            @change=${(t) => this._toggleDisplayLocation(v.Basket, t.target.checked)}
          >Basket</uui-checkbox>
          <uui-checkbox
            label="Product Page"
            .checked=${!!(e & v.ProductPage)}
            @change=${(t) => this._toggleDisplayLocation(v.ProductPage, t.target.checked)}
          >Product Page</uui-checkbox>
          <uui-checkbox
            label="Email"
            .checked=${!!(e & v.Email)}
            @change=${(t) => this._toggleDisplayLocation(v.Email, t.target.checked)}
          >Email</uui-checkbox>
          <uui-checkbox
            label="Confirmation"
            .checked=${!!(e & v.Confirmation)}
            @change=${(t) => this._toggleDisplayLocation(v.Confirmation, t.target.checked)}
          >Confirmation</uui-checkbox>
        </div>
      </uui-box>

      ${e & v.Checkout ? l`
          <uui-box headline="Checkout Mode">
            <umb-property-layout label="Display mode" description="How the upsell appears during checkout">
              <uui-select
                slot="editor"
                label="Checkout mode"
                .options=${[
      { name: "Inline", value: $.Inline, selected: this._upsell?.checkoutMode === $.Inline },
      { name: "Interstitial", value: $.Interstitial, selected: this._upsell?.checkoutMode === $.Interstitial },
      { name: "Order Bump", value: $.OrderBump, selected: this._upsell?.checkoutMode === $.OrderBump },
      { name: "Post-Purchase", value: $.PostPurchase, selected: this._upsell?.checkoutMode === $.PostPurchase }
    ]}
                @change=${(t) => this._handleInputChange("checkoutMode", t.target.value)}
              ></uui-select>
            </umb-property-layout>
          </uui-box>
        ` : n}

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
    const { data: e, error: t } = await P.getUpsellPerformance(this._upsell.id);
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
          <div class="stat-label">CTR: ${B(e.clickThroughRate)}</div>
        </uui-box>
        <uui-box headline="Conversions">
          <div class="stat-value">${k(e.totalConversions)}</div>
          <div class="stat-label">Rate: ${B(e.conversionRate)}</div>
        </uui-box>
        <uui-box headline="Revenue">
          <div class="stat-value">${U(e.totalRevenue)}</div>
          <div class="stat-label">Avg: ${U(e.averageOrderValue)}</div>
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
          ` : n}
          ${e.lastConversion ? l`
            <div class="metric-row">
              <span class="metric-label">Last conversion</span>
              <span class="metric-value">${new Date(e.lastConversion).toLocaleDateString()}</span>
            </div>
          ` : n}
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
                      <td>${U(t.revenue)}</td>
                    </tr>
                  `
    )}
              </tbody>
            </table>
          </div>
        </uui-box>
      ` : n}
    `;
  }
  _renderTabs() {
    const e = this._getActiveTab();
    return l`
      <uui-tab-group slot="header">
        <uui-tab label="Details" href="${this._routerPath}/tab/details" ?active=${e === "details"}>Details</uui-tab>
        <uui-tab label="Rules" href="${this._routerPath}/tab/rules" ?active=${e === "rules"}>Rules</uui-tab>
        <uui-tab label="Display" href="${this._routerPath}/tab/display" ?active=${e === "display"}>Display</uui-tab>
        <uui-tab label="Eligibility" href="${this._routerPath}/tab/eligibility" ?active=${e === "eligibility"}>Eligibility</uui-tab>
        <uui-tab label="Schedule" href="${this._routerPath}/tab/schedule" ?active=${e === "schedule"}>Schedule</uui-tab>
        ${this._isNew ? n : l`<uui-tab label="Performance" href="${this._routerPath}/tab/performance" ?active=${e === "performance"}>Performance</uui-tab>`}
      </uui-tab-group>
    `;
  }
  _renderActiveTabContent() {
    const e = this._getActiveTab();
    return l`
      ${e === "details" ? this._renderDetailsTab() : n}
      ${e === "rules" ? this._renderRulesTab() : n}
      ${e === "display" ? this._renderDisplayTab() : n}
      ${e === "eligibility" ? this._renderEligibilityTab() : n}
      ${e === "schedule" ? this._renderScheduleTab() : n}
      ${e === "performance" && !this._isNew ? this._renderPerformanceTab() : n}
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
        <uui-button slot="header" compact href=${pe()} label="Back to Upsells" class="back-button">
          <uui-icon name="icon-arrow-left"></uui-icon>
        </uui-button>

        <div id="header" slot="header">
          <umb-icon name="icon-trending-up"></umb-icon>
          <span class="headline">${this._getHeadline()}</span>
          ${!this._isNew && this._upsell ? l`<uui-tag look="secondary" color=${t}>${e}</uui-tag>` : n}
        </div>

        ${this._isNew ? n : l`
              <div slot="header" class="header-actions">
                ${this._upsell?.status === ne.Active ? l`<uui-button look="secondary" color="warning" label="Deactivate" @click=${this._handleDeactivate}>Deactivate</uui-button>` : l`<uui-button look="secondary" color="positive" label="Activate" @click=${this._handleActivate}>Activate</uui-button>`}
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
c = /* @__PURE__ */ new WeakMap();
g = /* @__PURE__ */ new WeakMap();
S = /* @__PURE__ */ new WeakMap();
u.styles = L`
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
  `;
m([
  b()
], u.prototype, "_upsell", 2);
m([
  b()
], u.prototype, "_isNew", 2);
m([
  b()
], u.prototype, "_isLoading", 2);
m([
  b()
], u.prototype, "_isSaving", 2);
m([
  b()
], u.prototype, "_validationErrors", 2);
m([
  b()
], u.prototype, "_triggerRules", 2);
m([
  b()
], u.prototype, "_recommendationRules", 2);
m([
  b()
], u.prototype, "_eligibilityRules", 2);
m([
  b()
], u.prototype, "_performance", 2);
m([
  b()
], u.prototype, "_performanceLoading", 2);
m([
  b()
], u.prototype, "_performanceError", 2);
m([
  b()
], u.prototype, "_routes", 2);
m([
  b()
], u.prototype, "_routerPath", 2);
m([
  b()
], u.prototype, "_activePath", 2);
u = m([
  F("merchello-upsell-detail")
], u);
const Qe = u;
export {
  u as MerchelloUpsellDetailElement,
  Qe as default
};
//# sourceMappingURL=upsell-detail.element-yq0jTtmm.js.map
