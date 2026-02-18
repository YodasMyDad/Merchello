import { LitElement as w, nothing as $, html as o, css as D, state as c, customElement as M } from "@umbraco-cms/backoffice/external/lit";
import { UmbElementMixin as z } from "@umbraco-cms/backoffice/element-api";
import { UmbModalToken as L, UMB_MODAL_MANAGER_CONTEXT as P, UMB_CONFIRM_MODAL as A } from "@umbraco-cms/backoffice/modal";
import { UMB_NOTIFICATION_CONTEXT as I } from "@umbraco-cms/backoffice/notification";
import { c as E, a as b, C as v, b as g } from "./upsell.types-ChZp0X_-.js";
import { M as f } from "./merchello-api-COnU_HX2.js";
import { g as O } from "./store-settings-BKyRkVmT.js";
import "./pagination.element-sDi4Myhy.js";
import "./merchello-empty-state.element-mt97UoA5.js";
import { s as U } from "./navigation-CvTcY6zJ.js";
import { c as x, a as R } from "./formatting-CZRy3TEt.js";
const N = new L("Merchello.CreateUpsell.Modal", {
  modal: {
    type: "dialog",
    size: "medium"
  }
});
var B = Object.defineProperty, W = Object.getOwnPropertyDescriptor, T = (e) => {
  throw TypeError(e);
}, s = (e, t, i, n) => {
  for (var u = n > 1 ? void 0 : n ? W(t, i) : t, _ = e.length - 1, k; _ >= 0; _--)
    (k = e[_]) && (u = (n ? k(t, i, u) : k(u)) || u);
  return n && u && B(t, i, u), u;
}, S = (e, t, i) => t.has(e) || T("Cannot " + i), a = (e, t, i) => (S(e, t, "read from private field"), t.get(e)), m = (e, t, i) => t.has(e) ? T("Cannot add the same private member more than once") : t instanceof WeakSet ? t.add(e) : t.set(e, i), d = (e, t, i, n) => (S(e, t, "write to private field"), t.set(e, i), i), p, h, r, y, C;
let l = class extends z(w) {
  constructor() {
    super(), this._upsells = [], this._isLoading = !0, this._errorMessage = null, this._page = 1, this._pageSize = 50, this._totalItems = 0, this._totalPages = 0, this._activeTab = "all", this._selectedUpsells = /* @__PURE__ */ new Set(), this._searchTerm = "", this._isDeleting = !1, this._searchDebounceTimer = null, m(this, p), m(this, h), m(this, r, !1), m(this, y), m(this, C), this.consumeContext(P, (e) => {
      d(this, p, e);
    }), this.consumeContext(I, (e) => {
      d(this, h, e);
    });
  }
  connectedCallback() {
    super.connectedCallback(), d(this, r, !0), this._initializeAndLoad();
  }
  async _initializeAndLoad() {
    const e = await O();
    a(this, r) && (this._pageSize = e.defaultPaginationPageSize, d(this, y, e.currencyCode), d(this, C, e.currencySymbol), this._loadUpsells());
  }
  disconnectedCallback() {
    super.disconnectedCallback(), d(this, r, !1), this._searchDebounceTimer && clearTimeout(this._searchDebounceTimer);
  }
  async _loadUpsells() {
    this._isLoading = !0, this._errorMessage = null;
    const e = {
      page: this._page,
      pageSize: this._pageSize,
      orderBy: E.DateCreated,
      descending: !0
    };
    this._searchTerm.trim() && (e.search = this._searchTerm.trim()), this._activeTab === "active" ? e.status = g.Active : this._activeTab === "scheduled" ? e.status = g.Scheduled : this._activeTab === "expired" ? e.status = g.Expired : this._activeTab === "draft" ? e.status = g.Draft : this._activeTab === "disabled" && (e.status = g.Disabled);
    const { data: t, error: i } = await f.getUpsells(e);
    if (a(this, r)) {
      if (i) {
        this._errorMessage = i.message, this._isLoading = !1;
        return;
      }
      t && (this._upsells = t.items, this._totalItems = t.totalItems, this._totalPages = t.totalPages), this._isLoading = !1;
    }
  }
  _handleTabClick(e) {
    this._activeTab = e, this._page = 1, this._loadUpsells();
  }
  _handleSearchInput(e) {
    const t = e.target.value;
    this._searchDebounceTimer && clearTimeout(this._searchDebounceTimer), this._searchDebounceTimer = setTimeout(() => {
      this._searchTerm = t, this._page = 1, this._loadUpsells();
    }, 300);
  }
  _handleSearchClear() {
    this._searchTerm = "", this._page = 1, this._loadUpsells();
  }
  _handlePageChange(e) {
    this._page = e.detail.page, this._loadUpsells();
  }
  _getPaginationState() {
    return {
      page: this._page,
      pageSize: this._pageSize,
      totalItems: this._totalItems,
      totalPages: this._totalPages
    };
  }
  _handleRowClick(e) {
    U(e.id);
  }
  _handleCheckboxChange(e, t) {
    const i = new Set(this._selectedUpsells);
    t ? i.add(e) : i.delete(e), this._selectedUpsells = i;
  }
  _handleSelectAll(e) {
    e ? this._selectedUpsells = new Set(this._upsells.map((t) => t.id)) : this._selectedUpsells = /* @__PURE__ */ new Set();
  }
  async _handleDeleteSelected() {
    const e = this._selectedUpsells.size;
    if (e === 0) return;
    const t = a(this, p)?.open(this, A, {
      data: {
        headline: "Delete Upsells",
        content: `Are you sure you want to delete ${e} upsell${e !== 1 ? "s" : ""}? This action cannot be undone.`,
        confirmLabel: "Delete",
        color: "danger"
      }
    });
    try {
      await t?.onSubmit();
    } catch {
      return;
    }
    if (!a(this, r)) return;
    this._isDeleting = !0;
    let i = 0, n = 0;
    for (const u of this._selectedUpsells) {
      const { error: _ } = await f.deleteUpsell(u);
      if (!a(this, r)) return;
      _ ? n++ : i++;
    }
    this._isDeleting = !1, n > 0 ? a(this, h)?.peek("warning", {
      data: { headline: "Partial success", message: `Deleted ${i} of ${e} upsells` }
    }) : a(this, h)?.peek("positive", {
      data: { headline: "Upsells deleted", message: `${e} upsell${e !== 1 ? "s" : ""} deleted successfully` }
    }), this._selectedUpsells = /* @__PURE__ */ new Set(), this._loadUpsells();
  }
  async _handleActivateSelected() {
    for (const e of this._selectedUpsells)
      if (await f.activateUpsell(e), !a(this, r)) return;
    a(this, h)?.peek("positive", {
      data: { headline: "Upsells activated", message: `${this._selectedUpsells.size} upsell(s) activated` }
    }), this._selectedUpsells = /* @__PURE__ */ new Set(), this._loadUpsells();
  }
  async _handleDeactivateSelected() {
    for (const e of this._selectedUpsells)
      if (await f.deactivateUpsell(e), !a(this, r)) return;
    a(this, h)?.peek("positive", {
      data: { headline: "Upsells deactivated", message: `${this._selectedUpsells.size} upsell(s) deactivated` }
    }), this._selectedUpsells = /* @__PURE__ */ new Set(), this._loadUpsells();
  }
  async _handleCreateUpsell() {
    if (!a(this, p)) return;
    const t = await a(this, p).open(this, N, {
      data: {}
    }).onSubmit().catch(() => {
    });
    a(this, r) && t?.id && U(t.id);
  }
  _getDisplayLocationIcons(e) {
    const t = [];
    return e & b.Checkout && t.push("icon-credit-card"), e & b.Basket && t.push("icon-shopping-basket"), e & b.ProductPage && t.push("icon-box"), e & b.Email && t.push("icon-mailbox"), e & b.Confirmation && t.push("icon-check"), t;
  }
  _getCheckoutModeLabel(e) {
    switch (e) {
      case v.Inline:
        return "Inline";
      case v.Interstitial:
        return "Interstitial";
      case v.OrderBump:
        return "Order Bump";
      case v.PostPurchase:
        return "Post Purchase";
      default:
        return e;
    }
  }
  _formatCtr(e, t) {
    return e === 0 ? "0%" : `${x(t / e * 100, 1)}%`;
  }
  _renderTable() {
    const e = this._upsells.length > 0 && this._upsells.every((t) => this._selectedUpsells.has(t.id));
    return o`
      <uui-table>
        <uui-table-head>
          <uui-table-head-cell style="width: 40px;">
            <uui-checkbox
              aria-label="Select all"
              .checked=${e}
              @change=${(t) => this._handleSelectAll(t.target.checked)}
            ></uui-checkbox>
          </uui-table-head-cell>
          <uui-table-head-cell>Name</uui-table-head-cell>
          <uui-table-head-cell>Status</uui-table-head-cell>
          <uui-table-head-cell>Display</uui-table-head-cell>
          <uui-table-head-cell>Rules</uui-table-head-cell>
          <uui-table-head-cell style="text-align: right;">Impressions</uui-table-head-cell>
          <uui-table-head-cell style="text-align: right;">CTR</uui-table-head-cell>
          <uui-table-head-cell style="text-align: right;">Conversions</uui-table-head-cell>
          <uui-table-head-cell style="text-align: right;">Revenue</uui-table-head-cell>
        </uui-table-head>

        ${this._upsells.map(
      (t) => o`
            <uui-table-row
              @click=${() => this._handleRowClick(t)}
              style="cursor: pointer;"
            >
              <uui-table-cell @click=${(i) => i.stopPropagation()}>
                <uui-checkbox
                  aria-label="Select ${t.name}"
                  .checked=${this._selectedUpsells.has(t.id)}
                  @change=${(i) => this._handleCheckboxChange(t.id, i.target.checked)}
                ></uui-checkbox>
              </uui-table-cell>
              <uui-table-cell>
                <div class="name-cell">
                  <strong>${t.name}</strong>
                  ${t.heading ? o`<small class="heading-preview">${t.heading}</small>` : $}
                </div>
              </uui-table-cell>
              <uui-table-cell>
                <uui-tag look="secondary" color=${t.statusColor}>${t.statusLabel}</uui-tag>
              </uui-table-cell>
              <uui-table-cell>
                <div class="display-cell">
                  <span class="checkout-mode-label">${this._getCheckoutModeLabel(t.checkoutMode)}</span>
                  <div class="display-icons">
                    ${this._getDisplayLocationIcons(t.displayLocation).map(
        (i) => o`<uui-icon name=${i}></uui-icon>`
      )}
                  </div>
                </div>
              </uui-table-cell>
              <uui-table-cell>
                <span class="rules-summary">
                  ${t.triggerRuleCount} trigger${t.triggerRuleCount !== 1 ? "s" : ""}
                  &rarr;
                  ${t.recommendationRuleCount} rec${t.recommendationRuleCount !== 1 ? "s" : ""}
                </span>
              </uui-table-cell>
              <uui-table-cell style="text-align: right;">${x(t.totalImpressions)}</uui-table-cell>
              <uui-table-cell style="text-align: right;">${this._formatCtr(t.totalImpressions, t.totalClicks)}</uui-table-cell>
              <uui-table-cell style="text-align: right;">${x(t.totalConversions)}</uui-table-cell>
              <uui-table-cell style="text-align: right;">${R(t.totalRevenue, a(this, y), a(this, C))}</uui-table-cell>
            </uui-table-row>
          `
    )}
      </uui-table>

      <merchello-pagination
        .state=${this._getPaginationState()}
        .disabled=${this._isLoading}
        @page-change=${this._handlePageChange}
      ></merchello-pagination>
    `;
  }
  _renderContent() {
    return this._isLoading ? o`<div class="loading"><uui-loader></uui-loader></div>` : this._errorMessage ? o`<div class="error">${this._errorMessage}</div>` : this._upsells.length === 0 ? o`
        <merchello-empty-state
          icon="icon-trending-up"
          headline="No upsells found"
          message="Create your first upsell rule to recommend products to your customers.">
          <uui-button
            slot="actions"
            look="primary"
            color="positive"
            label="Create upsell"
            @click=${this._handleCreateUpsell}
          >Create upsell</uui-button>
        </merchello-empty-state>
      ` : this._renderTable();
  }
  render() {
    return o`
      <umb-body-layout header-fit-height main-no-padding>
        <div class="upsells-container">
          <div class="header-actions">
            ${this._selectedUpsells.size > 0 ? o`
                  <uui-button look="primary" color="positive" label="Activate" @click=${this._handleActivateSelected}>
                    Activate (${this._selectedUpsells.size})
                  </uui-button>
                  <uui-button look="secondary" label="Deactivate" @click=${this._handleDeactivateSelected}>
                    Deactivate (${this._selectedUpsells.size})
                  </uui-button>
                  <uui-button
                    look="primary"
                    color="danger"
                    label="Delete"
                    ?disabled=${this._isDeleting}
                    @click=${this._handleDeleteSelected}
                  >
                    ${this._isDeleting ? "Deleting..." : `Delete (${this._selectedUpsells.size})`}
                  </uui-button>
                ` : $}
            <uui-button look="primary" color="positive" label="Create upsell" @click=${this._handleCreateUpsell}>
              Create upsell
            </uui-button>
          </div>

          <div class="search-tabs-row">
            <div class="search-box">
              <uui-input
                type="text"
                placeholder="Search upsells by name..."
                .value=${this._searchTerm}
                @input=${this._handleSearchInput}
                label="Search upsells"
              >
                <uui-icon name="icon-search" slot="prepend"></uui-icon>
                ${this._searchTerm ? o`
                      <uui-button slot="append" compact look="secondary" label="Clear search" @click=${this._handleSearchClear}>
                        <uui-icon name="icon-wrong"></uui-icon>
                      </uui-button>
                    ` : $}
              </uui-input>
            </div>

            <uui-tab-group>
              <uui-tab label="All" ?active=${this._activeTab === "all"} @click=${() => this._handleTabClick("all")}>All</uui-tab>
              <uui-tab label="Active" ?active=${this._activeTab === "active"} @click=${() => this._handleTabClick("active")}>Active</uui-tab>
              <uui-tab label="Scheduled" ?active=${this._activeTab === "scheduled"} @click=${() => this._handleTabClick("scheduled")}>Scheduled</uui-tab>
              <uui-tab label="Draft" ?active=${this._activeTab === "draft"} @click=${() => this._handleTabClick("draft")}>Draft</uui-tab>
              <uui-tab label="Disabled" ?active=${this._activeTab === "disabled"} @click=${() => this._handleTabClick("disabled")}>Disabled</uui-tab>
              <uui-tab label="Expired" ?active=${this._activeTab === "expired"} @click=${() => this._handleTabClick("expired")}>Expired</uui-tab>
            </uui-tab-group>
          </div>

          ${this._renderContent()}
        </div>
      </umb-body-layout>
    `;
  }
};
p = /* @__PURE__ */ new WeakMap();
h = /* @__PURE__ */ new WeakMap();
r = /* @__PURE__ */ new WeakMap();
y = /* @__PURE__ */ new WeakMap();
C = /* @__PURE__ */ new WeakMap();
l.styles = D`
    :host {
      display: block;
      height: 100%;
      background: var(--uui-color-background);
    }

    .upsells-container {
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

    .name-cell {
      display: flex;
      flex-direction: column;
      gap: 2px;
    }

    .heading-preview {
      color: var(--uui-color-text-alt);
      font-size: 0.85em;
    }

    .display-cell {
      display: flex;
      flex-direction: column;
      gap: 2px;
    }

    .checkout-mode-label {
      font-size: 0.85em;
      font-weight: 600;
    }

    .display-icons {
      display: flex;
      gap: var(--uui-size-space-2);
      color: var(--uui-color-text-alt);
    }

    .rules-summary {
      font-size: 0.9em;
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
s([
  c()
], l.prototype, "_upsells", 2);
s([
  c()
], l.prototype, "_isLoading", 2);
s([
  c()
], l.prototype, "_errorMessage", 2);
s([
  c()
], l.prototype, "_page", 2);
s([
  c()
], l.prototype, "_pageSize", 2);
s([
  c()
], l.prototype, "_totalItems", 2);
s([
  c()
], l.prototype, "_totalPages", 2);
s([
  c()
], l.prototype, "_activeTab", 2);
s([
  c()
], l.prototype, "_selectedUpsells", 2);
s([
  c()
], l.prototype, "_searchTerm", 2);
s([
  c()
], l.prototype, "_isDeleting", 2);
l = s([
  M("merchello-upsells-list")
], l);
const Z = l;
export {
  l as MerchelloUpsellsListElement,
  Z as default
};
//# sourceMappingURL=upsells-list.element-Dv7b1gbz.js.map
