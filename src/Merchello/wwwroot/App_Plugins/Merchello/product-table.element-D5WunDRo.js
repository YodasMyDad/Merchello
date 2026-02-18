import { LitElement as b, nothing as p, html as a, css as m, property as c, state as w, customElement as f } from "@umbraco-cms/backoffice/external/lit";
import { UmbElementMixin as v } from "@umbraco-cms/backoffice/element-api";
import { a as d } from "./formatting-CZRy3TEt.js";
import { f as _ } from "./navigation-CvTcY6zJ.js";
import { b as y } from "./badge.styles-B9Lnx6kD.js";
const x = {
  select: "",
  rootName: "Product",
  sku: "SKU",
  price: "Price",
  purchaseable: "Available",
  variants: "Variants",
  warnings: ""
}, k = [
  "rootName",
  "sku",
  "price",
  "purchaseable",
  "variants"
];
var $ = Object.defineProperty, P = Object.getOwnPropertyDescriptor, g = (e, r, t, n) => {
  for (var i = n > 1 ? void 0 : n ? P(r, t) : r, l = e.length - 1, o; l >= 0; l--)
    (o = e[l]) && (i = (n ? o(r, t, i) : o(i)) || i);
  return n && i && $(r, t, i), i;
};
let h = class extends v(b) {
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
    return !this._isOpen || this.warnings.length === 0 ? p : a`
      <div class="popover">
        <div class="popover-arrow"></div>
        <div class="popover-content">
          <ul class="warning-list">
            ${this.warnings.map(
      (e) => a`
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
    return e === "none" ? p : a`
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
h.styles = m`
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
g([
  c({ type: Array })
], h.prototype, "warnings", 2);
g([
  w()
], h.prototype, "_isOpen", 2);
h = g([
  f("merchello-warning-popover")
], h);
var C = Object.defineProperty, O = Object.getOwnPropertyDescriptor, u = (e, r, t, n) => {
  for (var i = n > 1 ? void 0 : n ? O(r, t) : r, l = e.length - 1, o; l >= 0; l--)
    (o = e[l]) && (i = (n ? o(r, t, i) : o(i)) || i);
  return n && i && C(r, t, i), i;
};
let s = class extends v(b) {
  constructor() {
    super(...arguments), this.products = [], this.columns = [...k], this.selectable = !1, this.selectedIds = [], this.clickable = !0;
  }
  _getEffectiveColumns() {
    const e = [...this.columns];
    return e.includes("rootName") || e.unshift("rootName"), this.selectable && !e.includes("select") && e.unshift("select"), e;
  }
  _handleSelectAll(e) {
    const t = e.target.checked ? this.products.map((n) => n.id) : [];
    this._dispatchSelectionChange(t);
  }
  _handleSelectProduct(e, r) {
    r.stopPropagation();
    const n = r.target.checked ? [...this.selectedIds, e] : this.selectedIds.filter((i) => i !== e);
    this._dispatchSelectionChange(n);
  }
  _dispatchSelectionChange(e) {
    this.dispatchEvent(new CustomEvent("selection-change", {
      detail: { selectedIds: e },
      bubbles: !0,
      composed: !0
    }));
  }
  _isAnchorClick(e) {
    return e.composedPath().find((t) => {
      const n = typeof SVGAElement < "u" && t instanceof SVGAElement;
      return t instanceof HTMLAnchorElement || n;
    }) !== void 0;
  }
  _handleRowClick(e, r) {
    this.clickable && (this._isAnchorClick(e) || this.dispatchEvent(new CustomEvent("product-click", {
      detail: { productId: r.id, product: r },
      bubbles: !0,
      composed: !0
    })));
  }
  _renderHeaderCell(e) {
    return e === "select" ? a`
        <uui-table-head-cell class="checkbox-col">
          <uui-checkbox aria-label="Select all" @change=${this._handleSelectAll}
            ?checked=${this.selectedIds.length === this.products.length && this.products.length > 0}></uui-checkbox>
        </uui-table-head-cell>
      ` : a`<uui-table-head-cell>${x[e]}</uui-table-head-cell>`;
  }
  _renderCell(e, r) {
    switch (r) {
      case "select":
        return a`
          <uui-table-cell class="checkbox-col">
            <uui-checkbox aria-label="Select ${e.rootName}" ?checked=${this.selectedIds.includes(e.id)}
              @change=${(t) => this._handleSelectProduct(e.id, t)}
              @click=${(t) => t.stopPropagation()}></uui-checkbox>
          </uui-table-cell>
        `;
      case "rootName":
        return a`<uui-table-cell class="product-name"><a href=${_(e.productRootId)}>${e.rootName}</a></uui-table-cell>`;
      case "sku":
        return a`<uui-table-cell>${e.sku ?? "-"}</uui-table-cell>`;
      case "price":
        return a`<uui-table-cell>${this._formatPriceRange(e)}</uui-table-cell>`;
      case "purchaseable":
        return a`<uui-table-cell><span class="badge ${e.purchaseStatusCssClass}">${e.purchaseStatusLabel}</span></uui-table-cell>`;
      case "variants":
        return a`<uui-table-cell><span class="badge badge-default">${e.variantCount}</span></uui-table-cell>`;
      case "warnings":
        return this._renderWarningsCell(e);
      default:
        return p;
    }
  }
  _getProductWarnings(e) {
    const r = [];
    return e.isDigitalProduct || (e.hasWarehouse || r.push({
      type: "error",
      message: "No warehouse assigned. This product cannot be fulfilled."
    }), e.hasWarehouse && !e.hasShippingOptions && r.push({
      type: "warning",
      message: "No shipping options configured for assigned warehouses."
    })), r;
  }
  _renderWarningsCell(e) {
    const r = this._getProductWarnings(e);
    return a`
      <uui-table-cell class="warnings-col">
        <merchello-warning-popover .warnings=${r}></merchello-warning-popover>
      </uui-table-cell>
    `;
  }
  _formatPriceRange(e) {
    return e.minPrice != null && e.maxPrice != null && e.minPrice !== e.maxPrice ? `${d(e.minPrice)} - ${d(e.maxPrice)}` : d(e.price);
  }
  _renderRow(e) {
    const r = this._getEffectiveColumns();
    return a`
      <uui-table-row class=${this.clickable ? "clickable" : ""} @click=${(t) => this._handleRowClick(t, e)}>
        ${r.map((t) => this._renderCell(e, t))}
      </uui-table-row>
    `;
  }
  render() {
    const e = this._getEffectiveColumns();
    return a`
      <div class="table-container">
        <uui-table class="product-table">
          <uui-table-head>${e.map((r) => this._renderHeaderCell(r))}</uui-table-head>
          ${this.products.map((r) => this._renderRow(r))}
        </uui-table>
      </div>
    `;
  }
};
s.styles = [
  y,
  m`
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
], s.prototype, "products", 2);
u([
  c({ type: Array })
], s.prototype, "columns", 2);
u([
  c({ type: Boolean })
], s.prototype, "selectable", 2);
u([
  c({ type: Array })
], s.prototype, "selectedIds", 2);
u([
  c({ type: Boolean })
], s.prototype, "clickable", 2);
s = u([
  f("merchello-product-table")
], s);
//# sourceMappingURL=product-table.element-D5WunDRo.js.map
