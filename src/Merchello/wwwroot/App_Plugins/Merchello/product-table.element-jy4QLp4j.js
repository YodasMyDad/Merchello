import { LitElement as m, nothing as g, html as s, css as f, property as c, state as _, customElement as v } from "@umbraco-cms/backoffice/external/lit";
import { UmbElementMixin as w } from "@umbraco-cms/backoffice/element-api";
import { a as p } from "./formatting-B_f6AiQh.js";
import { f as y } from "./navigation-CvTcY6zJ.js";
import { b as x } from "./badge.styles-B9Lnx6kD.js";
const S = {
  select: "",
  rootName: "Product",
  sku: "SKU",
  price: "Price",
  purchaseable: "Available",
  variants: "Variants",
  warnings: ""
}, $ = [
  "rootName",
  "sku",
  "price",
  "purchaseable",
  "variants"
];
var k = Object.defineProperty, C = Object.getOwnPropertyDescriptor, b = (e, t, r, n) => {
  for (var i = n > 1 ? void 0 : n ? C(t, r) : t, a = e.length - 1, l; a >= 0; a--)
    (l = e[a]) && (i = (n ? l(t, r, i) : l(i)) || i);
  return n && i && k(t, r, i), i;
};
let d = class extends w(m) {
  constructor() {
    super(...arguments), this.warnings = [], this._isOpen = !1;
  }
  _getSeverity() {
    return this.warnings.length === 0 ? "none" : this.warnings.some((e) => e.type === "error") ? "error" : "warning";
  }
  _getIcon() {
    return this._getSeverity() === "error" ? "icon-delete" : "icon-alert";
  }
  _handleMouseEnter() {
    this._isOpen = !0;
  }
  _handleMouseLeave() {
    this._isOpen = !1;
  }
  _handleClick() {
    this._isOpen = !this._isOpen;
  }
  _handleKeyDown(e) {
    e.key === "Enter" || e.key === " " ? (e.preventDefault(), this._isOpen = !this._isOpen) : e.key === "Escape" && (this._isOpen = !1);
  }
  _renderPopover() {
    return !this._isOpen || this.warnings.length === 0 ? g : s`
      <div class="popover">
        <div class="popover-arrow"></div>
        <div class="popover-content">
          <ul class="warning-list">
            ${this.warnings.map(
      (e) => s`
                <li class="warning-item ${e.type}">
                  <uui-icon name="${e.type === "error" ? "icon-delete" : "icon-alert"}"></uui-icon>
                  <span>${e.message}</span>
                </li>
              `
    )}
          </ul>
        </div>
      </div>
    `;
  }
  render() {
    const e = this._getSeverity();
    return e === "none" ? g : s`
      <div
        class="warning-trigger ${e}"
        tabindex="0"
        role="button"
        aria-label="${this.warnings.length} issue${this.warnings.length > 1 ? "s" : ""}"
        aria-expanded="${this._isOpen}"
        @mouseenter=${this._handleMouseEnter}
        @mouseleave=${this._handleMouseLeave}
        @click=${this._handleClick}
        @keydown=${this._handleKeyDown}>
        <uui-icon name="${this._getIcon()}"></uui-icon>
        ${this._renderPopover()}
      </div>
    `;
  }
};
d.styles = f`
    :host {
      display: inline-block;
      position: relative;
    }

    .warning-trigger {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 24px;
      height: 24px;
      border-radius: 50%;
      cursor: pointer;
      position: relative;
      transition: transform 0.15s ease;
    }

    .warning-trigger:hover {
      transform: scale(1.1);
    }

    .warning-trigger:focus {
      outline: 2px solid var(--uui-color-focus);
      outline-offset: 2px;
    }

    .warning-trigger.error {
      background: var(--uui-color-danger-standalone);
      color: var(--uui-color-danger-contrast);
    }

    .warning-trigger.warning {
      background: var(--uui-color-warning-standalone);
      color: var(--uui-color-warning-contrast);
    }

    .warning-trigger uui-icon {
      font-size: 0.875rem;
    }

    .popover {
      position: absolute;
      bottom: calc(100% + 8px);
      left: 50%;
      transform: translateX(-50%);
      z-index: 1000;
      min-width: 220px;
      max-width: 300px;
    }

    .popover-arrow {
      position: absolute;
      bottom: -6px;
      left: 50%;
      transform: translateX(-50%);
      width: 0;
      height: 0;
      border-left: 6px solid transparent;
      border-right: 6px solid transparent;
      border-top: 6px solid var(--uui-color-surface);
    }

    .popover-content {
      background: var(--uui-color-surface);
      border: 1px solid var(--uui-color-border);
      border-radius: var(--uui-border-radius);
      box-shadow: var(--uui-shadow-depth-3);
      padding: var(--uui-size-space-3);
    }

    .warning-list {
      list-style: none;
      margin: 0;
      padding: 0;
      display: flex;
      flex-direction: column;
      gap: var(--uui-size-space-2);
    }

    .warning-item {
      display: flex;
      align-items: flex-start;
      gap: var(--uui-size-space-2);
      font-size: 0.8125rem;
      line-height: 1.4;
    }

    .warning-item uui-icon {
      flex-shrink: 0;
      margin-top: 2px;
    }

    .warning-item.error uui-icon {
      color: var(--uui-color-danger);
    }

    .warning-item.warning uui-icon {
      color: var(--uui-color-warning);
    }

    .warning-item span {
      color: var(--uui-color-text);
    }
  `;
b([
  c({ type: Array })
], d.prototype, "warnings", 2);
b([
  _()
], d.prototype, "_isOpen", 2);
d = b([
  v("merchello-warning-popover")
], d);
var P = Object.defineProperty, O = Object.getOwnPropertyDescriptor, u = (e, t, r, n) => {
  for (var i = n > 1 ? void 0 : n ? O(t, r) : t, a = e.length - 1, l; a >= 0; a--)
    (l = e[a]) && (i = (n ? l(t, r, i) : l(i)) || i);
  return n && i && P(t, r, i), i;
};
let o = class extends w(m) {
  constructor() {
    super(...arguments), this.products = [], this.columns = [...$], this.selectable = !1, this.selectedIds = [], this.clickable = !0;
  }
  _getEffectiveColumns() {
    const e = [...this.columns];
    return e.includes("rootName") || e.unshift("rootName"), this.selectable && !e.includes("select") && e.unshift("select"), e;
  }
  _handleSelectAll(e) {
    const t = e.target.checked, r = this.products.map((h) => h.id), n = new Set(r), i = this._getSelectedIdSet(), a = t ? /* @__PURE__ */ new Set([...i, ...r]) : new Set([...i].filter((h) => !n.has(h))), l = Array.from(a);
    this._dispatchSelectionChange(l);
  }
  _handleSelectProduct(e, t) {
    t.stopPropagation();
    const r = t.target.checked, n = this._getSelectedIdSet();
    r ? n.add(e) : n.delete(e);
    const i = Array.from(n);
    this._dispatchSelectionChange(i);
  }
  _dispatchSelectionChange(e) {
    const t = Array.from(new Set(e));
    this.dispatchEvent(new CustomEvent("selection-change", {
      detail: { selectedIds: t },
      bubbles: !0,
      composed: !0
    }));
  }
  _getSelectedIdSet() {
    return new Set(this.selectedIds);
  }
  _getVisibleSelectedCount() {
    const e = this._getSelectedIdSet();
    return this.products.filter((t) => e.has(t.id)).length;
  }
  _isAnchorClick(e) {
    return e.composedPath().find((r) => {
      const n = typeof SVGAElement < "u" && r instanceof SVGAElement;
      return r instanceof HTMLAnchorElement || n;
    }) !== void 0;
  }
  _handleRowClick(e, t) {
    this.clickable && (this._isAnchorClick(e) || this.dispatchEvent(new CustomEvent("product-click", {
      detail: { productId: t.productRootId, product: t },
      bubbles: !0,
      composed: !0
    })));
  }
  _renderHeaderCell(e) {
    if (e === "select") {
      const t = this._getVisibleSelectedCount(), r = this.products.length > 0 && t === this.products.length, n = t > 0 && t < this.products.length;
      return s`
        <uui-table-head-cell class="checkbox-col">
          <uui-checkbox
            aria-label="Select all products"
            .indeterminate=${n}
            ?checked=${r}
            @change=${this._handleSelectAll}>
          </uui-checkbox>
        </uui-table-head-cell>
      `;
    }
    return s`<uui-table-head-cell>${S[e]}</uui-table-head-cell>`;
  }
  _renderCell(e, t) {
    switch (t) {
      case "select":
        return s`
          <uui-table-cell class="checkbox-col">
            <uui-checkbox
              aria-label="Select ${e.rootName || e.id}"
              ?checked=${this.selectedIds.includes(e.id)}
              @change=${(r) => this._handleSelectProduct(e.id, r)}
              @click=${(r) => r.stopPropagation()}></uui-checkbox>
          </uui-table-cell>
        `;
      case "rootName":
        return s`<uui-table-cell class="product-name"><a href=${y(e.productRootId)}>${e.rootName}</a></uui-table-cell>`;
      case "sku":
        return s`<uui-table-cell>${e.sku ?? "-"}</uui-table-cell>`;
      case "price":
        return s`<uui-table-cell>${this._formatPriceRange(e)}</uui-table-cell>`;
      case "purchaseable":
        return s`<uui-table-cell><span class="badge ${e.purchaseStatusCssClass}">${e.purchaseStatusLabel}</span></uui-table-cell>`;
      case "variants":
        return s`<uui-table-cell><span class="badge badge-default">${e.variantCount}</span></uui-table-cell>`;
      case "warnings":
        return this._renderWarningsCell(e);
      default:
        return g;
    }
  }
  _getProductWarnings(e) {
    const t = [];
    return e.isDigitalProduct || (e.hasWarehouse || t.push({
      type: "error",
      message: "No warehouse assigned. This product cannot be fulfilled."
    }), e.hasWarehouse && !e.hasShippingOptions && t.push({
      type: "warning",
      message: "No shipping options configured for assigned warehouses."
    })), t;
  }
  _renderWarningsCell(e) {
    const t = this._getProductWarnings(e);
    return s`
      <uui-table-cell class="warnings-col">
        <merchello-warning-popover .warnings=${t}></merchello-warning-popover>
      </uui-table-cell>
    `;
  }
  _formatPriceRange(e) {
    return e.minPrice != null && e.maxPrice != null && e.minPrice !== e.maxPrice ? `${p(e.minPrice)} - ${p(e.maxPrice)}` : p(e.price);
  }
  _renderRow(e) {
    const t = this._getEffectiveColumns();
    return s`
      <uui-table-row class=${this.clickable ? "clickable" : ""} @click=${(r) => this._handleRowClick(r, e)}>
        ${t.map((r) => this._renderCell(e, r))}
      </uui-table-row>
    `;
  }
  render() {
    const e = this._getEffectiveColumns();
    return s`
      <div class="table-container">
        <uui-table class="product-table">
          <uui-table-head>${e.map((t) => this._renderHeaderCell(t))}</uui-table-head>
          ${this.products.map((t) => this._renderRow(t))}
        </uui-table>
      </div>
    `;
  }
};
o.styles = [
  x,
  f`
      :host { display: block; }
      .table-container { overflow-x: auto; background: var(--uui-color-surface); border: 1px solid var(--uui-color-border); border-radius: var(--uui-border-radius); }
      .product-table { width: 100%; }
      uui-table-head-cell, uui-table-cell { white-space: nowrap; }
      uui-table-row.clickable { cursor: pointer; }
      uui-table-row.clickable:hover { background: var(--uui-color-surface-emphasis); }
      .checkbox-col { width: 40px; }
      .warnings-col { width: 40px; text-align: center; }
      .product-name a { font-weight: 500; color: var(--uui-color-interactive); text-decoration: none; }
      .product-name a:hover { text-decoration: underline; }
    `
];
u([
  c({ type: Array })
], o.prototype, "products", 2);
u([
  c({ type: Array })
], o.prototype, "columns", 2);
u([
  c({ type: Boolean })
], o.prototype, "selectable", 2);
u([
  c({ type: Array })
], o.prototype, "selectedIds", 2);
u([
  c({ type: Boolean })
], o.prototype, "clickable", 2);
o = u([
  v("merchello-product-table")
], o);
//# sourceMappingURL=product-table.element-jy4QLp4j.js.map
