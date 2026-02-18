import { LitElement as $, nothing as D, html as o, css as k, property as v, customElement as T, state as n } from "@umbraco-cms/backoffice/external/lit";
import { UmbElementMixin as x } from "@umbraco-cms/backoffice/element-api";
import { UmbModalToken as M, UMB_MODAL_MANAGER_CONTEXT as E, UMB_CONFIRM_MODAL as I } from "@umbraco-cms/backoffice/modal";
import { UMB_NOTIFICATION_CONTEXT as P } from "@umbraco-cms/backoffice/notification";
import { D as C, a as m } from "./discount.types-DX82Q6oV.js";
import { M as S } from "./merchello-api-B1P1cUX9.js";
import { g as z } from "./store-settings-BBNVgcWv.js";
import "./pagination.element-sDi4Myhy.js";
import "./merchello-empty-state.element-D2dcD7_8.js";
import { e as L } from "./formatting-BoIk_URG.js";
import { j as O, k as U, l as N } from "./navigation-CvTcY6zJ.js";
import { b as R } from "./badge.styles-C7D4rnJo.js";
var B = Object.defineProperty, j = Object.getOwnPropertyDescriptor, g = (e, i, t, a) => {
  for (var s = a > 1 ? void 0 : a ? j(i, t) : i, r = e.length - 1, d; r >= 0; r--)
    (d = e[r]) && (s = (a ? d(i, t, s) : d(s)) || s);
  return a && s && B(i, t, s), s;
};
let p = class extends x($) {
  constructor() {
    super(...arguments), this.discounts = [], this.selectable = !1, this.selectedIds = [], this.clickable = !0;
  }
  _getSelectedDiscountCount() {
    if (this.discounts.length === 0 || this.selectedIds.length === 0) return 0;
    const e = new Set(this.selectedIds);
    return this.discounts.reduce((i, t) => i + (e.has(t.id) ? 1 : 0), 0);
  }
  _isAllDiscountsSelected() {
    return this.discounts.length > 0 && this._getSelectedDiscountCount() === this.discounts.length;
  }
  _isPartiallySelected() {
    const e = this._getSelectedDiscountCount();
    return e > 0 && e < this.discounts.length;
  }
  _handleSelectAll(e) {
    const t = e.target.checked ? this.discounts.map((a) => a.id) : [];
    this._dispatchSelectionChange(t);
  }
  _handleSelectDiscount(e, i) {
    i.stopPropagation();
    const t = i.target.checked, a = this.selectedIds.includes(e), s = t ? a ? this.selectedIds : [...this.selectedIds, e] : this.selectedIds.filter((r) => r !== e);
    this._dispatchSelectionChange(s);
  }
  _dispatchSelectionChange(e) {
    const i = { selectedIds: [...new Set(e)] };
    this.dispatchEvent(
      new CustomEvent("selection-change", {
        detail: i,
        bubbles: !0,
        composed: !0
      })
    );
  }
  _isAnchorClick(e) {
    return e.composedPath().find((t) => {
      const a = typeof SVGAElement < "u" && t instanceof SVGAElement;
      return t instanceof HTMLAnchorElement || a;
    }) !== void 0;
  }
  _handleRowClick(e, i) {
    if (!this.clickable || this._isAnchorClick(e)) return;
    const t = { discountId: i.id, discount: i };
    this.dispatchEvent(
      new CustomEvent("discount-click", {
        detail: t,
        bubbles: !0,
        composed: !0
      })
    );
  }
  _getMethodIcon(e) {
    return e === C.Automatic ? "icon-bolt" : "icon-receipt-dollar";
  }
  _formatUsage(e) {
    return e.totalUsageLimit ? `${e.currentUsageCount} / ${e.totalUsageLimit}` : `${e.currentUsageCount}`;
  }
  render() {
    const e = this._isAllDiscountsSelected(), i = this._isPartiallySelected();
    return o`
      <uui-table>
        <uui-table-head>
          ${this.selectable ? o`
                <uui-table-head-cell class="checkbox-col">
                  <uui-checkbox
                    aria-label="Select all discounts"
                    @change=${this._handleSelectAll}
                    ?checked=${e}
                    ?indeterminate=${i}
                    ?disabled=${this.discounts.length === 0}
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
      (t) => o`
            <uui-table-row
              class="${this.clickable ? "clickable" : ""}"
              @click=${(a) => this._handleRowClick(a, t)}
            >
              ${this.selectable ? o`
                    <uui-table-cell class="checkbox-col">
                      <uui-checkbox
                        aria-label="Select discount ${t.name || t.id}"
                        ?checked=${this.selectedIds.includes(t.id)}
                        @change=${(a) => this._handleSelectDiscount(t.id, a)}
                        @click=${(a) => a.stopPropagation()}
                      ></uui-checkbox>
                    </uui-table-cell>
                  ` : D}

              <uui-table-cell class="name-cell">
                <a href=${O(t.id)}>
                  ${t.name}
                </a>
                ${t.code ? o`<span class="code">${t.code}</span>` : D}
              </uui-table-cell>

              <uui-table-cell>
                ${t.categoryLabel}
              </uui-table-cell>

              <uui-table-cell class="method-cell">
                <uui-icon name="${this._getMethodIcon(t.method)}"></uui-icon>
                ${t.method === C.Automatic ? "Auto" : "Code"}
              </uui-table-cell>

              <uui-table-cell class="value-cell">
                ${t.formattedValue}
              </uui-table-cell>

              <uui-table-cell>
                <span class="badge ${t.statusColor}">
                  ${t.statusLabel}
                </span>
              </uui-table-cell>

              <uui-table-cell>
                ${this._formatUsage(t)}
              </uui-table-cell>

              <uui-table-cell>
                ${L(t.dateCreated)}
              </uui-table-cell>
            </uui-table-row>
          `
    )}
      </uui-table>
    `;
  }
};
p.styles = [
  R,
  k`
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
  v({ type: Array })
], p.prototype, "discounts", 2);
g([
  v({ type: Boolean })
], p.prototype, "selectable", 2);
g([
  v({ type: Array })
], p.prototype, "selectedIds", 2);
g([
  v({ type: Boolean })
], p.prototype, "clickable", 2);
p = g([
  T("merchello-discount-table")
], p);
const G = new M("Merchello.SelectDiscountType.Modal", {
  modal: {
    type: "dialog",
    size: "medium"
  }
});
var H = Object.defineProperty, V = Object.getOwnPropertyDescriptor, w = (e) => {
  throw TypeError(e);
}, c = (e, i, t, a) => {
  for (var s = a > 1 ? void 0 : a ? V(i, t) : i, r = e.length - 1, d; r >= 0; r--)
    (d = e[r]) && (s = (a ? d(i, t, s) : d(s)) || s);
  return a && s && H(i, t, s), s;
}, A = (e, i, t) => i.has(e) || w("Cannot " + t), u = (e, i, t) => (A(e, i, "read from private field"), i.get(e)), y = (e, i, t) => i.has(e) ? w("Cannot add the same private member more than once") : i instanceof WeakSet ? i.add(e) : i.set(e, t), f = (e, i, t, a) => (A(e, i, "write to private field"), i.set(e, t), t), _, b, h;
let l = class extends x($) {
  constructor() {
    super(), this._discounts = [], this._isLoading = !0, this._errorMessage = null, this._page = 1, this._pageSize = 50, this._totalItems = 0, this._totalPages = 0, this._activeTab = "all", this._selectedDiscounts = /* @__PURE__ */ new Set(), this._searchTerm = "", this._isDeleting = !1, this._searchDebounceTimer = null, y(this, _), y(this, b), y(this, h, !1), this.consumeContext(E, (e) => {
      f(this, _, e);
    }), this.consumeContext(P, (e) => {
      f(this, b, e);
    });
  }
  connectedCallback() {
    super.connectedCallback(), f(this, h, !0), this._initializeAndLoad();
  }
  async _initializeAndLoad() {
    const e = await z();
    u(this, h) && (this._pageSize = e.defaultPaginationPageSize, this._loadDiscounts());
  }
  disconnectedCallback() {
    super.disconnectedCallback(), f(this, h, !1), this._searchDebounceTimer && clearTimeout(this._searchDebounceTimer);
  }
  async _loadDiscounts() {
    this._isLoading = !0, this._errorMessage = null;
    const e = {
      page: this._page,
      pageSize: this._pageSize,
      sortBy: "dateCreated",
      sortDir: "desc"
    };
    this._searchTerm.trim() && (e.search = this._searchTerm.trim()), this._activeTab === "active" ? e.status = m.Active : this._activeTab === "scheduled" ? e.status = m.Scheduled : this._activeTab === "expired" ? e.status = m.Expired : this._activeTab === "draft" && (e.status = m.Draft);
    const { data: i, error: t } = await S.getDiscounts(e);
    if (u(this, h)) {
      if (t) {
        this._errorMessage = t.message, this._isLoading = !1;
        return;
      }
      i && (this._discounts = i.items, this._totalItems = i.totalItems, this._totalPages = i.totalPages), this._isLoading = !1;
    }
  }
  _handleTabClick(e) {
    this._activeTab = e, this._page = 1, this._loadDiscounts();
  }
  _handleSearchInput(e) {
    const t = e.target.value;
    this._searchDebounceTimer && clearTimeout(this._searchDebounceTimer), this._searchDebounceTimer = setTimeout(() => {
      this._searchTerm = t, this._page = 1, this._loadDiscounts();
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
    const i = u(this, _)?.open(this, I, {
      data: {
        headline: "Delete selected discounts",
        content: `Delete ${e} discount${e !== 1 ? "s" : ""}. This action cannot be undone.`,
        confirmLabel: "Delete",
        color: "danger"
      }
    });
    try {
      await i?.onSubmit();
    } catch {
      return;
    }
    if (!u(this, h)) return;
    this._isDeleting = !0;
    const t = Array.from(this._selectedDiscounts);
    let a = 0, s = 0;
    for (const r of t) {
      const { error: d } = await S.deleteDiscount(r);
      if (!u(this, h)) return;
      d ? s++ : a++;
    }
    this._isDeleting = !1, s > 0 ? u(this, b)?.peek("warning", {
      data: { headline: "Partial success", message: `Deleted ${a} of ${e} discounts` }
    }) : u(this, b)?.peek("positive", {
      data: { headline: "Discounts deleted", message: `${e} discount${e !== 1 ? "s" : ""} deleted successfully` }
    }), this._selectedDiscounts = /* @__PURE__ */ new Set(), this._loadDiscounts();
  }
  async _handleCreateDiscount() {
    if (!u(this, _)) return;
    const i = await u(this, _).open(this, G, {
      data: {}
    }).onSubmit().catch(() => {
    });
    u(this, h) && i?.selectedCategory !== void 0 && U(i.selectedCategory);
  }
  _handleDiscountClick(e) {
    N(e.detail.discountId);
  }
  _renderLoadingState() {
    return o`<div class="loading"><uui-loader></uui-loader></div>`;
  }
  _renderErrorState() {
    return o`
      <uui-box class="error-box" headline="Could not load discounts">
        <div class="error-content">
          <p>${this._errorMessage}</p>
          <uui-button look="secondary" label="Retry" @click=${this._loadDiscounts}>Retry</uui-button>
        </div>
      </uui-box>
    `;
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
_ = /* @__PURE__ */ new WeakMap();
b = /* @__PURE__ */ new WeakMap();
h = /* @__PURE__ */ new WeakMap();
l.styles = k`
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

    .error-box {
      margin-bottom: var(--uui-size-space-4);
    }

    .error-content {
      display: flex;
      flex-direction: column;
      align-items: flex-start;
      gap: var(--uui-size-space-3);
      color: var(--uui-color-danger);
    }

    .error-content p {
      margin: 0;
    }

    merchello-pagination {
      padding: var(--uui-size-space-3);
      border-top: 1px solid var(--uui-color-border);
    }
  `;
c([
  n()
], l.prototype, "_discounts", 2);
c([
  n()
], l.prototype, "_isLoading", 2);
c([
  n()
], l.prototype, "_errorMessage", 2);
c([
  n()
], l.prototype, "_page", 2);
c([
  n()
], l.prototype, "_pageSize", 2);
c([
  n()
], l.prototype, "_totalItems", 2);
c([
  n()
], l.prototype, "_totalPages", 2);
c([
  n()
], l.prototype, "_activeTab", 2);
c([
  n()
], l.prototype, "_selectedDiscounts", 2);
c([
  n()
], l.prototype, "_searchTerm", 2);
c([
  n()
], l.prototype, "_isDeleting", 2);
l = c([
  T("merchello-discounts-list")
], l);
const ae = l;
export {
  l as MerchelloDiscountsListElement,
  ae as default
};
//# sourceMappingURL=discounts-list.element-BY1KMGOv.js.map
