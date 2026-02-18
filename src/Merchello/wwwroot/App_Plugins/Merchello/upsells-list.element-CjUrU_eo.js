import { LitElement as T, nothing as C, html as u, css as D, state as n, customElement as A } from "@umbraco-cms/backoffice/external/lit";
import { UmbElementMixin as M } from "@umbraco-cms/backoffice/element-api";
import { UmbModalToken as z, UMB_MODAL_MANAGER_CONTEXT as L, UMB_CONFIRM_MODAL as R } from "@umbraco-cms/backoffice/modal";
import { UMB_NOTIFICATION_CONTEXT as P } from "@umbraco-cms/backoffice/notification";
import { c as B, a as g, C as f, b } from "./upsell.types-ChZp0X_-.js";
import { M as v } from "./merchello-api-Dp_zU_yi.js";
import { g as E } from "./store-settings-CHgA9WE7.js";
import "./pagination.element-sDi4Myhy.js";
import "./merchello-empty-state.element-D2dcD7_8.js";
import { s as U } from "./navigation-CvTcY6zJ.js";
import { c as x, a as I } from "./formatting-B_f6AiQh.js";
const O = new z("Merchello.CreateUpsell.Modal", {
  modal: {
    type: "dialog",
    size: "medium"
  }
});
var N = Object.defineProperty, W = Object.getOwnPropertyDescriptor, w = (e) => {
  throw TypeError(e);
}, o = (e, i, t, s) => {
  for (var r = s > 1 ? void 0 : s ? W(i, t) : i, _ = e.length - 1, $; _ >= 0; _--)
    ($ = e[_]) && (r = (s ? $(i, t, r) : $(r)) || r);
  return s && r && N(i, t, r), r;
}, S = (e, i, t) => i.has(e) || w("Cannot " + t), a = (e, i, t) => (S(e, i, "read from private field"), i.get(e)), m = (e, i, t) => i.has(e) ? w("Cannot add the same private member more than once") : i instanceof WeakSet ? i.add(e) : i.set(e, t), d = (e, i, t, s) => (S(e, i, "write to private field"), i.set(e, t), t), p, h, c, y, k;
let l = class extends M(T) {
  constructor() {
    super(), this._upsells = [], this._isLoading = !0, this._errorMessage = null, this._page = 1, this._pageSize = 50, this._totalItems = 0, this._totalPages = 0, this._activeTab = "all", this._selectedUpsells = /* @__PURE__ */ new Set(), this._searchTerm = "", this._isDeleting = !1, this._isBulkActionRunning = !1, this._searchDebounceTimer = null, m(this, p), m(this, h), m(this, c, !1), m(this, y), m(this, k), this.consumeContext(L, (e) => {
      d(this, p, e);
    }), this.consumeContext(P, (e) => {
      d(this, h, e);
    });
  }
  connectedCallback() {
    super.connectedCallback(), d(this, c, !0), this._initializeAndLoad();
  }
  async _initializeAndLoad() {
    const e = await E();
    a(this, c) && (this._pageSize = e.defaultPaginationPageSize, d(this, y, e.currencyCode), d(this, k, e.currencySymbol), this._loadUpsells());
  }
  disconnectedCallback() {
    super.disconnectedCallback(), d(this, c, !1), this._searchDebounceTimer && clearTimeout(this._searchDebounceTimer);
  }
  async _loadUpsells() {
    this._isLoading = !0, this._errorMessage = null;
    const e = {
      page: this._page,
      pageSize: this._pageSize,
      orderBy: B.DateCreated,
      descending: !0
    };
    this._searchTerm.trim() && (e.search = this._searchTerm.trim()), this._activeTab === "active" ? e.status = b.Active : this._activeTab === "scheduled" ? e.status = b.Scheduled : this._activeTab === "expired" ? e.status = b.Expired : this._activeTab === "draft" ? e.status = b.Draft : this._activeTab === "disabled" && (e.status = b.Disabled);
    const { data: i, error: t } = await v.getUpsells(e);
    if (a(this, c)) {
      if (t) {
        this._errorMessage = t.message, this._isLoading = !1;
        return;
      }
      i && (this._upsells = i.items, this._totalItems = i.totalItems, this._totalPages = i.totalPages), this._isLoading = !1;
    }
  }
  _handleTabClick(e) {
    this._activeTab = e, this._page = 1, this._loadUpsells();
  }
  _handleSearchInput(e) {
    const i = e.target.value;
    this._searchDebounceTimer && clearTimeout(this._searchDebounceTimer), this._searchDebounceTimer = setTimeout(() => {
      this._searchTerm = i, this._page = 1, this._loadUpsells();
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
  _handleCheckboxChange(e, i) {
    const t = new Set(this._selectedUpsells);
    i ? t.add(e) : t.delete(e), this._selectedUpsells = t;
  }
  _handleSelectAll(e) {
    e ? this._selectedUpsells = new Set(this._upsells.map((i) => i.id)) : this._selectedUpsells = /* @__PURE__ */ new Set();
  }
  async _handleDeleteSelected() {
    const e = this._selectedUpsells.size;
    if (e === 0) return;
    const i = a(this, p)?.open(this, R, {
      data: {
        headline: "Delete Upsells",
        content: `Delete ${e} upsell${e !== 1 ? "s" : ""} permanently. This action cannot be undone.`,
        confirmLabel: "Delete",
        color: "danger"
      }
    });
    try {
      await i?.onSubmit();
    } catch {
      return;
    }
    if (!a(this, c)) return;
    this._isDeleting = !0;
    let t = 0, s = 0;
    for (const r of this._selectedUpsells) {
      const { error: _ } = await v.deleteUpsell(r);
      if (!a(this, c)) {
        this._isDeleting = !1;
        return;
      }
      _ ? s++ : t++;
    }
    this._isDeleting = !1, s > 0 ? a(this, h)?.peek("warning", {
      data: { headline: "Partial success", message: `Deleted ${t} of ${e} upsells` }
    }) : a(this, h)?.peek("positive", {
      data: { headline: "Upsells deleted", message: `${e} upsell${e !== 1 ? "s" : ""} deleted successfully` }
    }), this._selectedUpsells = /* @__PURE__ */ new Set(), this._loadUpsells();
  }
  async _handleActivateSelected() {
    const e = this._selectedUpsells.size;
    if (e === 0 || this._isBulkActionRunning) return;
    this._isBulkActionRunning = !0;
    let i = 0, t = 0;
    for (const s of this._selectedUpsells) {
      const { error: r } = await v.activateUpsell(s);
      if (!a(this, c)) {
        this._isBulkActionRunning = !1;
        return;
      }
      r ? t++ : i++;
    }
    this._isBulkActionRunning = !1, t > 0 ? a(this, h)?.peek("warning", {
      data: { headline: "Partial success", message: `Activated ${i} of ${e} upsells` }
    }) : a(this, h)?.peek("positive", {
      data: { headline: "Upsells activated", message: `${e} upsell${e !== 1 ? "s" : ""} activated` }
    }), this._selectedUpsells = /* @__PURE__ */ new Set(), this._loadUpsells();
  }
  async _handleDeactivateSelected() {
    const e = this._selectedUpsells.size;
    if (e === 0 || this._isBulkActionRunning) return;
    this._isBulkActionRunning = !0;
    let i = 0, t = 0;
    for (const s of this._selectedUpsells) {
      const { error: r } = await v.deactivateUpsell(s);
      if (!a(this, c)) {
        this._isBulkActionRunning = !1;
        return;
      }
      r ? t++ : i++;
    }
    this._isBulkActionRunning = !1, t > 0 ? a(this, h)?.peek("warning", {
      data: { headline: "Partial success", message: `Deactivated ${i} of ${e} upsells` }
    }) : a(this, h)?.peek("positive", {
      data: { headline: "Upsells deactivated", message: `${e} upsell${e !== 1 ? "s" : ""} deactivated` }
    }), this._selectedUpsells = /* @__PURE__ */ new Set(), this._loadUpsells();
  }
  async _handleCreateUpsell() {
    if (!a(this, p)) return;
    const i = await a(this, p).open(this, O, {
      data: {}
    }).onSubmit().catch(() => {
    });
    a(this, c) && i?.id && U(i.id);
  }
  _getDisplayLocationIcons(e) {
    const i = [];
    return e & g.Checkout && i.push("icon-credit-card"), e & g.Basket && i.push("icon-shopping-basket"), e & g.ProductPage && i.push("icon-box"), e & g.Email && i.push("icon-mailbox"), e & g.Confirmation && i.push("icon-check"), i;
  }
  _getDisplayLocationIconLabel(e) {
    switch (e) {
      case "icon-credit-card":
        return "Checkout";
      case "icon-shopping-basket":
        return "Basket";
      case "icon-box":
        return "Product page";
      case "icon-mailbox":
        return "Email";
      case "icon-check":
        return "Confirmation";
      default:
        return "Display location";
    }
  }
  _getCheckoutModeLabel(e) {
    switch (e) {
      case f.Inline:
        return "Inline";
      case f.Interstitial:
        return "Interstitial";
      case f.OrderBump:
        return "Order Bump";
      case f.PostPurchase:
        return "Post Purchase";
      default:
        return e;
    }
  }
  _formatCtr(e, i) {
    return e === 0 ? "0%" : `${x(i / e * 100, 1)}%`;
  }
  _renderTable() {
    const e = this._upsells.length > 0 && this._upsells.every((t) => this._selectedUpsells.has(t.id)), i = this._selectedUpsells.size > 0 && !e;
    return u`
      <div class="table-wrapper">
        <uui-table>
          <uui-table-head>
            <uui-table-head-cell style="width: 40px;">
              <uui-checkbox
                aria-label="Select all"
                .checked=${e}
                .indeterminate=${i}
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
      (t) => u`
              <uui-table-row
                @click=${() => this._handleRowClick(t)}
                style="cursor: pointer;"
              >
                <uui-table-cell @click=${(s) => s.stopPropagation()}>
                  <uui-checkbox
                    aria-label=${`Select ${t.name?.trim() || t.id}`}
                    .checked=${this._selectedUpsells.has(t.id)}
                    @change=${(s) => this._handleCheckboxChange(t.id, s.target.checked)}
                  ></uui-checkbox>
                </uui-table-cell>
                <uui-table-cell>
                  <div class="name-cell">
                    <strong>${t.name}</strong>
                    ${t.heading ? u`<small class="heading-preview">${t.heading}</small>` : C}
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
        (s) => u`<uui-icon
                            name=${s}
                            title=${this._getDisplayLocationIconLabel(s)}
                          ></uui-icon>`
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
                <uui-table-cell style="text-align: right;">${I(t.totalRevenue, a(this, y), a(this, k))}</uui-table-cell>
              </uui-table-row>
            `
    )}
        </uui-table>
      </div>

      <merchello-pagination
        .state=${this._getPaginationState()}
        .disabled=${this._isLoading}
        @page-change=${this._handlePageChange}
      ></merchello-pagination>
    `;
  }
  _renderErrorState() {
    return u`
      <uui-box headline="Could not load upsells">
        <p class="error-message">${this._errorMessage}</p>
        <uui-button look="secondary" label="Retry" @click=${() => this._loadUpsells()}>Retry</uui-button>
      </uui-box>
    `;
  }
  _renderContent() {
    return this._isLoading ? u`<div class="loading"><uui-loader></uui-loader></div>` : this._errorMessage ? this._renderErrorState() : this._upsells.length === 0 ? u`
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
    return u`
      <umb-body-layout header-fit-height main-no-padding>
        <div class="upsells-container">
          <div class="header-actions">
            ${this._selectedUpsells.size > 0 ? u`
                  <uui-button
                    look="primary"
                    color="positive"
                    label="Activate"
                    ?disabled=${this._isBulkActionRunning || this._isDeleting}
                    @click=${this._handleActivateSelected}
                  >
                    ${this._isBulkActionRunning ? "Applying..." : `Activate (${this._selectedUpsells.size})`}
                  </uui-button>
                  <uui-button
                    look="secondary"
                    label="Deactivate"
                    ?disabled=${this._isBulkActionRunning || this._isDeleting}
                    @click=${this._handleDeactivateSelected}
                  >
                    ${this._isBulkActionRunning ? "Applying..." : `Deactivate (${this._selectedUpsells.size})`}
                  </uui-button>
                  <uui-button
                    look="primary"
                    color="danger"
                    label="Delete"
                    ?disabled=${this._isDeleting || this._isBulkActionRunning}
                    @click=${this._handleDeleteSelected}
                  >
                    ${this._isDeleting ? "Deleting..." : `Delete (${this._selectedUpsells.size})`}
                  </uui-button>
                ` : C}
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
                ${this._searchTerm ? u`
                      <uui-button slot="append" compact look="secondary" label="Clear search" @click=${this._handleSearchClear}>
                        <uui-icon name="icon-wrong"></uui-icon>
                      </uui-button>
                    ` : C}
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
c = /* @__PURE__ */ new WeakMap();
y = /* @__PURE__ */ new WeakMap();
k = /* @__PURE__ */ new WeakMap();
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
      flex-wrap: wrap;
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

    .table-wrapper {
      overflow-x: auto;
      border: 1px solid var(--uui-color-border);
      border-radius: var(--uui-border-radius);
      background: var(--uui-color-surface);
    }

    uui-table {
      min-width: 980px;
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

    .error-message {
      margin: 0 0 var(--uui-size-space-3) 0;
      color: var(--uui-color-danger);
    }

    merchello-pagination {
      padding: var(--uui-size-space-3);
      border-top: 1px solid var(--uui-color-border);
    }
  `;
o([
  n()
], l.prototype, "_upsells", 2);
o([
  n()
], l.prototype, "_isLoading", 2);
o([
  n()
], l.prototype, "_errorMessage", 2);
o([
  n()
], l.prototype, "_page", 2);
o([
  n()
], l.prototype, "_pageSize", 2);
o([
  n()
], l.prototype, "_totalItems", 2);
o([
  n()
], l.prototype, "_totalPages", 2);
o([
  n()
], l.prototype, "_activeTab", 2);
o([
  n()
], l.prototype, "_selectedUpsells", 2);
o([
  n()
], l.prototype, "_searchTerm", 2);
o([
  n()
], l.prototype, "_isDeleting", 2);
o([
  n()
], l.prototype, "_isBulkActionRunning", 2);
l = o([
  A("merchello-upsells-list")
], l);
const Z = l;
export {
  l as MerchelloUpsellsListElement,
  Z as default
};
//# sourceMappingURL=upsells-list.element-CjUrU_eo.js.map
