import { LitElement as T, nothing as D, html as o, css as x, property as y, customElement as w, state as r } from "@umbraco-cms/backoffice/external/lit";
import { UmbElementMixin as M } from "@umbraco-cms/backoffice/element-api";
import { UmbModalToken as E, UMB_MODAL_MANAGER_CONTEXT as z, UMB_CONFIRM_MODAL as L } from "@umbraco-cms/backoffice/modal";
import { UMB_NOTIFICATION_CONTEXT as I } from "@umbraco-cms/backoffice/notification";
import { c as k, b as C, D as m, d as f } from "./discount.types-Du4rtOaW.js";
import { M as S } from "./merchello-api-BM4-Q40x.js";
import { g as O } from "./store-settings-DKmhm5Dt.js";
import "./pagination.element-sDi4Myhy.js";
import "./merchello-empty-state.element-mt97UoA5.js";
import { a as U, e as B } from "./formatting-YtMaawx1.js";
import { f as N, h as F, i as R } from "./navigation-COkStlQk.js";
import { b as G } from "./badge.styles-DUcdl6GY.js";
var V = Object.defineProperty, W = Object.getOwnPropertyDescriptor, g = (e, t, a, s) => {
  for (var i = s > 1 ? void 0 : s ? W(t, a) : t, u = e.length - 1, d; u >= 0; u--)
    (d = e[u]) && (i = (s ? d(t, a, i) : d(i)) || i);
  return s && i && V(t, a, i), i;
};
let p = class extends M(T) {
  constructor() {
    super(...arguments), this.discounts = [], this.selectable = !1, this.selectedIds = [], this.clickable = !0;
  }
  _handleSelectAll(e) {
    const a = e.target.checked ? this.discounts.map((s) => s.id) : [];
    this._dispatchSelectionChange(a);
  }
  _handleSelectDiscount(e, t) {
    t.stopPropagation();
    const s = t.target.checked ? [...this.selectedIds, e] : this.selectedIds.filter((i) => i !== e);
    this._dispatchSelectionChange(s);
  }
  _dispatchSelectionChange(e) {
    const t = { selectedIds: e };
    this.dispatchEvent(
      new CustomEvent("selection-change", {
        detail: t,
        bubbles: !0,
        composed: !0
      })
    );
  }
  _handleRowClick(e) {
    if (!this.clickable) return;
    const t = { discountId: e.id, discount: e };
    this.dispatchEvent(
      new CustomEvent("discount-click", {
        detail: t,
        bubbles: !0,
        composed: !0
      })
    );
  }
  _getCategoryLabel(e) {
    return {
      [m.AmountOffProducts]: "Products",
      [m.AmountOffOrder]: "Order",
      [m.BuyXGetY]: "Buy X Get Y",
      [m.FreeShipping]: "Free Shipping"
    }[e] || "Unknown";
  }
  _getMethodIcon(e) {
    return e === k.Automatic ? "icon-bolt" : "icon-receipt-dollar";
  }
  _formatValue(e) {
    switch (e.valueType) {
      case C.Percentage:
        return `${e.value}%`;
      case C.FixedAmount:
        return U(e.value);
      case C.Free:
        return "Free";
      default:
        return String(e.value);
    }
  }
  _formatUsage(e) {
    return e.totalUsageLimit ? `${e.currentUsageCount} / ${e.totalUsageLimit}` : `${e.currentUsageCount}`;
  }
  render() {
    return o`
      <uui-table>
        <uui-table-head>
          ${this.selectable ? o`
                <uui-table-head-cell class="checkbox-col">
                  <uui-checkbox
                    aria-label="Select all discounts"
                    @change=${this._handleSelectAll}
                    ?checked=${this.selectedIds.length === this.discounts.length && this.discounts.length > 0}
                  ></uui-checkbox>
                </uui-table-head-cell>
              ` : D}
          <uui-table-head-cell>Name</uui-table-head-cell>
          <uui-table-head-cell>Type</uui-table-head-cell>
          <uui-table-head-cell>Method</uui-table-head-cell>
          <uui-table-head-cell>Value</uui-table-head-cell>
          <uui-table-head-cell>Status</uui-table-head-cell>
          <uui-table-head-cell>Usage</uui-table-head-cell>
          <uui-table-head-cell>Created</uui-table-head-cell>
        </uui-table-head>

        ${this.discounts.map(
      (e) => o`
            <uui-table-row
              class="${this.clickable ? "clickable" : ""}"
              @click=${() => this._handleRowClick(e)}
            >
              ${this.selectable ? o`
                    <uui-table-cell class="checkbox-col">
                      <uui-checkbox
                        aria-label="Select discount ${e.name}"
                        ?checked=${this.selectedIds.includes(e.id)}
                        @change=${(t) => this._handleSelectDiscount(e.id, t)}
                        @click=${(t) => t.stopPropagation()}
                      ></uui-checkbox>
                    </uui-table-cell>
                  ` : D}

              <uui-table-cell class="name-cell">
                <a href=${N(e.id)} @click=${(t) => t.stopPropagation()}>
                  ${e.name}
                </a>
                ${e.code ? o`<span class="code">${e.code}</span>` : D}
              </uui-table-cell>

              <uui-table-cell>
                ${this._getCategoryLabel(e.category)}
              </uui-table-cell>

              <uui-table-cell class="method-cell">
                <uui-icon name="${this._getMethodIcon(e.method)}"></uui-icon>
                ${e.method === k.Automatic ? "Auto" : "Code"}
              </uui-table-cell>

              <uui-table-cell class="value-cell">
                ${this._formatValue(e)}
              </uui-table-cell>

              <uui-table-cell>
                <span class="badge ${e.statusColor}">
                  ${e.statusLabel}
                </span>
              </uui-table-cell>

              <uui-table-cell>
                ${this._formatUsage(e)}
              </uui-table-cell>

              <uui-table-cell>
                ${B(e.dateCreated)}
              </uui-table-cell>
            </uui-table-row>
          `
    )}
      </uui-table>
    `;
  }
};
p.styles = [
  G,
  x`
      :host {
        display: block;
      }

      uui-table {
        width: 100%;
      }

      uui-table-row.clickable {
        cursor: pointer;
      }

      uui-table-row.clickable:hover {
        background: var(--uui-color-surface-emphasis);
      }

      .checkbox-col {
        width: 40px;
      }

      .name-cell {
        font-weight: 500;
      }

      .name-cell a {
        color: inherit;
        text-decoration: none;
      }

      .name-cell a:hover {
        text-decoration: underline;
        color: var(--uui-color-interactive);
      }

      .code {
        display: inline-block;
        margin-left: var(--uui-size-space-2);
        padding: 2px 6px;
        background: var(--uui-color-surface-alt);
        border-radius: var(--uui-border-radius);
        font-size: var(--uui-type-small-size);
        font-family: monospace;
        color: var(--uui-color-text-alt);
      }

      .method-cell {
        display: flex;
        align-items: center;
        gap: var(--uui-size-space-1);
      }

      .value-cell {
        font-weight: 600;
      }
    `
];
g([
  y({ type: Array })
], p.prototype, "discounts", 2);
g([
  y({ type: Boolean })
], p.prototype, "selectable", 2);
g([
  y({ type: Array })
], p.prototype, "selectedIds", 2);
g([
  y({ type: Boolean })
], p.prototype, "clickable", 2);
p = g([
  w("merchello-discount-table")
], p);
const X = new E("Merchello.SelectDiscountType.Modal", {
  modal: {
    type: "dialog",
    size: "medium"
  }
});
var j = Object.defineProperty, H = Object.getOwnPropertyDescriptor, A = (e) => {
  throw TypeError(e);
}, c = (e, t, a, s) => {
  for (var i = s > 1 ? void 0 : s ? H(t, a) : t, u = e.length - 1, d; u >= 0; u--)
    (d = e[u]) && (i = (s ? d(t, a, i) : d(i)) || i);
  return s && i && j(t, a, i), i;
}, P = (e, t, a) => t.has(e) || A("Cannot " + a), n = (e, t, a) => (P(e, t, "read from private field"), t.get(e)), $ = (e, t, a) => t.has(e) ? A("Cannot add the same private member more than once") : t instanceof WeakSet ? t.add(e) : t.set(e, a), v = (e, t, a, s) => (P(e, t, "write to private field"), t.set(e, a), a), b, _, h;
let l = class extends M(T) {
  constructor() {
    super(), this._discounts = [], this._isLoading = !0, this._errorMessage = null, this._page = 1, this._pageSize = 50, this._totalItems = 0, this._totalPages = 0, this._activeTab = "all", this._selectedDiscounts = /* @__PURE__ */ new Set(), this._searchTerm = "", this._isDeleting = !1, this._searchDebounceTimer = null, $(this, b), $(this, _), $(this, h, !1), this.consumeContext(z, (e) => {
      v(this, b, e);
    }), this.consumeContext(I, (e) => {
      v(this, _, e);
    });
  }
  connectedCallback() {
    super.connectedCallback(), v(this, h, !0), this._initializeAndLoad();
  }
  async _initializeAndLoad() {
    const e = await O();
    n(this, h) && (this._pageSize = e.defaultPaginationPageSize, this._loadDiscounts());
  }
  disconnectedCallback() {
    super.disconnectedCallback(), v(this, h, !1), this._searchDebounceTimer && clearTimeout(this._searchDebounceTimer);
  }
  async _loadDiscounts() {
    this._isLoading = !0, this._errorMessage = null;
    const e = {
      page: this._page,
      pageSize: this._pageSize,
      sortBy: "dateCreated",
      sortDir: "desc"
    };
    this._searchTerm.trim() && (e.search = this._searchTerm.trim()), this._activeTab === "active" ? e.status = f.Active : this._activeTab === "scheduled" ? e.status = f.Scheduled : this._activeTab === "expired" ? e.status = f.Expired : this._activeTab === "draft" && (e.status = f.Draft);
    const { data: t, error: a } = await S.getDiscounts(e);
    if (n(this, h)) {
      if (a) {
        this._errorMessage = a.message, this._isLoading = !1;
        return;
      }
      t && (this._discounts = t.items, this._totalItems = t.totalItems, this._totalPages = t.totalPages), this._isLoading = !1;
    }
  }
  _handleTabClick(e) {
    this._activeTab = e, this._page = 1, this._loadDiscounts();
  }
  _handleSearchInput(e) {
    const a = e.target.value;
    this._searchDebounceTimer && clearTimeout(this._searchDebounceTimer), this._searchDebounceTimer = setTimeout(() => {
      this._searchTerm = a, this._page = 1, this._loadDiscounts();
    }, 300);
  }
  _handleSearchClear() {
    this._searchTerm = "", this._page = 1, this._loadDiscounts();
  }
  _handlePageChange(e) {
    this._page = e.detail.page, this._loadDiscounts();
  }
  _getPaginationState() {
    return {
      page: this._page,
      pageSize: this._pageSize,
      totalItems: this._totalItems,
      totalPages: this._totalPages
    };
  }
  _handleSelectionChange(e) {
    this._selectedDiscounts = new Set(e.detail.selectedIds), this.requestUpdate();
  }
  async _handleDeleteSelected() {
    const e = this._selectedDiscounts.size;
    if (e === 0) return;
    const t = n(this, b)?.open(this, L, {
      data: {
        headline: "Delete Discounts",
        content: `Are you sure you want to delete ${e} discount${e !== 1 ? "s" : ""}? This action cannot be undone.`,
        confirmLabel: "Delete",
        color: "danger"
      }
    });
    try {
      await t?.onSubmit();
    } catch {
      return;
    }
    if (!n(this, h)) return;
    this._isDeleting = !0;
    const a = Array.from(this._selectedDiscounts);
    let s = 0, i = 0;
    for (const u of a) {
      const { error: d } = await S.deleteDiscount(u);
      if (!n(this, h)) return;
      d ? i++ : s++;
    }
    this._isDeleting = !1, i > 0 ? n(this, _)?.peek("warning", {
      data: { headline: "Partial success", message: `Deleted ${s} of ${e} discounts` }
    }) : n(this, _)?.peek("positive", {
      data: { headline: "Discounts deleted", message: `${e} discount${e !== 1 ? "s" : ""} deleted successfully` }
    }), this._selectedDiscounts = /* @__PURE__ */ new Set(), this._loadDiscounts();
  }
  async _handleCreateDiscount() {
    if (!n(this, b)) return;
    const t = await n(this, b).open(this, X, {
      data: {}
    }).onSubmit().catch(() => {
    });
    n(this, h) && t?.selectedCategory !== void 0 && F(t.selectedCategory);
  }
  _handleDiscountClick(e) {
    R(e.detail.discountId);
  }
  _renderLoadingState() {
    return o`<div class="loading"><uui-loader></uui-loader></div>`;
  }
  _renderErrorState() {
    return o`<div class="error">${this._errorMessage}</div>`;
  }
  _renderEmptyState() {
    return o`
      <merchello-empty-state
        icon="icon-tag"
        headline="No discounts found"
        message="Create your first discount to offer promotions to your customers.">
        <uui-button
          slot="actions"
          look="primary"
          color="positive"
          label="Create discount"
          @click=${this._handleCreateDiscount}
        >
          Create discount
        </uui-button>
      </merchello-empty-state>
    `;
  }
  _renderDiscountsTable() {
    return o`
      <merchello-discount-table
        .discounts=${this._discounts}
        .selectable=${!0}
        .selectedIds=${Array.from(this._selectedDiscounts)}
        @selection-change=${this._handleSelectionChange}
        @discount-click=${this._handleDiscountClick}
      ></merchello-discount-table>

      <!-- Pagination -->
      <merchello-pagination
        .state=${this._getPaginationState()}
        .disabled=${this._isLoading}
        @page-change=${this._handlePageChange}
      ></merchello-pagination>
    `;
  }
  _renderDiscountsContent() {
    return this._isLoading ? this._renderLoadingState() : this._errorMessage ? this._renderErrorState() : this._discounts.length === 0 ? this._renderEmptyState() : this._renderDiscountsTable();
  }
  render() {
    return o`
      <umb-body-layout header-fit-height main-no-padding>
      <div class="discounts-container">
        <!-- Header Actions -->
        <div class="header-actions">
          ${this._selectedDiscounts.size > 0 ? o`
                <uui-button
                  look="primary"
                  color="danger"
                  label="Delete"
                  ?disabled=${this._isDeleting}
                  @click=${this._handleDeleteSelected}
                >
                  ${this._isDeleting ? "Deleting..." : `Delete (${this._selectedDiscounts.size})`}
                </uui-button>
              ` : ""}
          <uui-button look="primary" color="positive" label="Create discount" @click=${this._handleCreateDiscount}>
            Create discount
          </uui-button>
        </div>

        <!-- Search and Tabs Row -->
        <div class="search-tabs-row">
          <!-- Search Box -->
          <div class="search-box">
            <uui-input
              type="text"
              placeholder="Search discounts by name or code..."
              .value=${this._searchTerm}
              @input=${this._handleSearchInput}
              label="Search discounts"
            >
              <uui-icon name="icon-search" slot="prepend"></uui-icon>
              ${this._searchTerm ? o`
                    <uui-button
                      slot="append"
                      compact
                      look="secondary"
                      label="Clear search"
                      @click=${this._handleSearchClear}
                    >
                      <uui-icon name="icon-wrong"></uui-icon>
                    </uui-button>
                  ` : ""}
            </uui-input>
          </div>

          <!-- Tabs -->
          <uui-tab-group>
            <uui-tab
              label="All"
              ?active=${this._activeTab === "all"}
              @click=${() => this._handleTabClick("all")}
            >
              All
            </uui-tab>
            <uui-tab
              label="Active"
              ?active=${this._activeTab === "active"}
              @click=${() => this._handleTabClick("active")}
            >
              Active
            </uui-tab>
            <uui-tab
              label="Scheduled"
              ?active=${this._activeTab === "scheduled"}
              @click=${() => this._handleTabClick("scheduled")}
            >
              Scheduled
            </uui-tab>
            <uui-tab
              label="Expired"
              ?active=${this._activeTab === "expired"}
              @click=${() => this._handleTabClick("expired")}
            >
              Expired
            </uui-tab>
            <uui-tab
              label="Draft"
              ?active=${this._activeTab === "draft"}
              @click=${() => this._handleTabClick("draft")}
            >
              Draft
            </uui-tab>
          </uui-tab-group>
        </div>

        <!-- Discounts Table -->
        ${this._renderDiscountsContent()}
      </div>
      </umb-body-layout>
    `;
  }
};
b = /* @__PURE__ */ new WeakMap();
_ = /* @__PURE__ */ new WeakMap();
h = /* @__PURE__ */ new WeakMap();
l.styles = x`
    :host {
      display: block;
      height: 100%;
      background: var(--uui-color-background);
    }

    .discounts-container {
      max-width: 100%;
      padding: var(--uui-size-layout-1);
    }

    .header-actions {
      display: flex;
      gap: var(--uui-size-space-2);
      align-items: center;
      justify-content: flex-end;
      margin-bottom: var(--uui-size-space-4);
    }

    .search-tabs-row {
      display: flex;
      flex-direction: column;
      gap: var(--uui-size-space-3);
      margin-bottom: var(--uui-size-space-4);
    }

    @media (min-width: 768px) {
      .search-tabs-row {
        flex-direction: row;
        align-items: flex-end;
        justify-content: space-between;
      }
    }

    .search-box {
      flex: 1;
      max-width: 400px;
    }

    .search-box uui-input {
      width: 100%;
    }

    .search-box uui-icon[slot="prepend"] {
      color: var(--uui-color-text-alt);
    }

    .loading {
      display: flex;
      justify-content: center;
      padding: var(--uui-size-space-6);
    }

    .error {
      padding: var(--uui-size-space-4);
      background: var(--uui-color-danger-standalone);
      color: var(--uui-color-danger-contrast);
      border-radius: var(--uui-border-radius);
    }

    merchello-pagination {
      padding: var(--uui-size-space-3);
      border-top: 1px solid var(--uui-color-border);
    }
  `;
c([
  r()
], l.prototype, "_discounts", 2);
c([
  r()
], l.prototype, "_isLoading", 2);
c([
  r()
], l.prototype, "_errorMessage", 2);
c([
  r()
], l.prototype, "_page", 2);
c([
  r()
], l.prototype, "_pageSize", 2);
c([
  r()
], l.prototype, "_totalItems", 2);
c([
  r()
], l.prototype, "_totalPages", 2);
c([
  r()
], l.prototype, "_activeTab", 2);
c([
  r()
], l.prototype, "_selectedDiscounts", 2);
c([
  r()
], l.prototype, "_searchTerm", 2);
c([
  r()
], l.prototype, "_isDeleting", 2);
l = c([
  w("merchello-discounts-list")
], l);
const oe = l;
export {
  l as MerchelloDiscountsListElement,
  oe as default
};
//# sourceMappingURL=discounts-list.element-CaJ4GOCA.js.map
