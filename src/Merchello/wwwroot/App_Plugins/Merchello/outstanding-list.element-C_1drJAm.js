import { LitElement as S, nothing as m, html as r, css as w, state as n, customElement as T } from "@umbraco-cms/backoffice/external/lit";
import { UmbElementMixin as C } from "@umbraco-cms/backoffice/element-api";
import { UmbModalToken as x, UMB_MODAL_MANAGER_CONTEXT as $ } from "@umbraco-cms/backoffice/modal";
import { UMB_NOTIFICATION_CONTEXT as M } from "@umbraco-cms/backoffice/notification";
import { M as O } from "./merchello-api-B76CV0sD.js";
import { g as A } from "./store-settings-7zNVo6g4.js";
import { a as f, d as D } from "./formatting-MfE1tvkN.js";
import { n as y, g as P } from "./navigation-CvTcY6zJ.js";
import "./pagination.element-sDi4Myhy.js";
import "./merchello-empty-state.element-D2dcD7_8.js";
import { c as z } from "./collection-layout.styles-I8XQedsa.js";
const E = new x("Merchello.MarkAsPaid.Modal", {
  modal: {
    type: "sidebar",
    size: "medium"
  }
});
var L = Object.defineProperty, U = Object.getOwnPropertyDescriptor, k = (e) => {
  throw TypeError(e);
}, o = (e, t, a, i) => {
  for (var u = i > 1 ? void 0 : i ? U(t, a) : t, b = e.length - 1, v; b >= 0; b--)
    (v = e[b]) && (u = (i ? v(t, a, u) : v(u)) || u);
  return i && u && L(t, a, u), u;
}, I = (e, t, a) => t.has(e) || k("Cannot " + a), l = (e, t, a) => (I(e, t, "read from private field"), t.get(e)), p = (e, t, a) => t.has(e) ? k("Cannot add the same private member more than once") : t instanceof WeakSet ? t.add(e) : t.set(e, a), d = (e, t, a, i) => (I(e, t, "write to private field"), t.set(e, a), a), _, g, h, c;
let s = class extends C(S) {
  constructor() {
    super(), this._invoices = [], this._isLoading = !0, this._errorMessage = null, this._page = 1, this._pageSize = 50, this._totalItems = 0, this._totalPages = 0, this._activeTab = "all", this._accountCustomersOnly = !0, this._selectedInvoiceIds = /* @__PURE__ */ new Set(), this._currencyCode = "USD", this._searchTerm = "", this._pendingSearchTerm = "", p(this, _), p(this, g), p(this, h, !1), p(this, c, null), this.consumeContext($, (e) => {
      d(this, _, e);
    }), this.consumeContext(M, (e) => {
      d(this, g, e);
    });
  }
  connectedCallback() {
    super.connectedCallback(), d(this, h, !0), this._initializeAndLoad();
  }
  disconnectedCallback() {
    super.disconnectedCallback(), d(this, h, !1), l(this, c) && clearTimeout(l(this, c));
  }
  async _initializeAndLoad() {
    const e = await A();
    l(this, h) && (this._pageSize = e.defaultPaginationPageSize, this._currencyCode = e.currencyCode, this._loadInvoices());
  }
  _buildQueryParams() {
    const e = {
      page: this._page,
      pageSize: this._pageSize,
      accountCustomersOnly: this._accountCustomersOnly,
      sortBy: "dueDate",
      sortDir: "asc"
    }, t = this._searchTerm.trim();
    return t.length > 0 && (e.search = t), this._activeTab === "overdue" ? e.overdueOnly = !0 : this._activeTab === "dueThisWeek" ? (e.overdueOnly = !1, e.dueWithinDays = 7) : this._activeTab === "dueThisMonth" && (e.overdueOnly = !1, e.dueWithinDays = 30), e;
  }
  async _loadInvoices() {
    this._isLoading = !0, this._errorMessage = null;
    const { data: e, error: t } = await O.getOutstandingInvoices(this._buildQueryParams());
    if (l(this, h)) {
      if (t) {
        this._errorMessage = t.message, this._isLoading = !1;
        return;
      }
      if (e) {
        this._invoices = e.items, this._totalItems = e.totalItems, this._totalPages = e.totalPages;
        const a = new Set(e.items.map((i) => i.id));
        this._selectedInvoiceIds = new Set(
          Array.from(this._selectedInvoiceIds).filter((i) => a.has(i))
        );
      }
      this._isLoading = !1;
    }
  }
  _getPaginationState() {
    return {
      page: this._page,
      pageSize: this._pageSize,
      totalItems: this._totalItems,
      totalPages: this._totalPages
    };
  }
  _hasActiveFilters() {
    return this._activeTab !== "all" || this._searchTerm.trim().length > 0 || !this._accountCustomersOnly;
  }
  _isInteractiveClick(e) {
    const t = /* @__PURE__ */ new Set(["BUTTON", "UUI-BUTTON", "INPUT", "UUI-CHECKBOX"]);
    return e.composedPath().some((a) => a instanceof HTMLElement && t.has(a.tagName));
  }
  _isAnchorClick(e) {
    return e.composedPath().some((t) => t instanceof HTMLElement && t.tagName === "A");
  }
  _handleTabClick(e) {
    this._activeTab !== e && (this._activeTab = e, this._page = 1, this._selectedInvoiceIds = /* @__PURE__ */ new Set(), this._loadInvoices());
  }
  _handleAccountToggle(e) {
    const t = !!e.target.checked;
    this._accountCustomersOnly !== t && (this._accountCustomersOnly = t, this._page = 1, this._selectedInvoiceIds = /* @__PURE__ */ new Set(), this._loadInvoices());
  }
  _handleSearchInput(e) {
    this._pendingSearchTerm = e.target.value, l(this, c) && clearTimeout(l(this, c)), d(this, c, setTimeout(() => {
      this._searchTerm = this._pendingSearchTerm, this._page = 1, this._selectedInvoiceIds = /* @__PURE__ */ new Set(), this._loadInvoices();
    }, 300));
  }
  _handleSearchClear() {
    l(this, c) && (clearTimeout(l(this, c)), d(this, c, null)), this._pendingSearchTerm = "", this._searchTerm = "", this._page = 1, this._selectedInvoiceIds = /* @__PURE__ */ new Set(), this._loadInvoices();
  }
  _handlePageChange(e) {
    this._page = e.detail.page, this._selectedInvoiceIds = /* @__PURE__ */ new Set(), this._loadInvoices();
  }
  _handleRetry() {
    this._loadInvoices();
  }
  _handleSelectAll(e) {
    const t = !!e.target.checked;
    this._selectedInvoiceIds = t ? new Set(this._invoices.map((a) => a.id)) : /* @__PURE__ */ new Set();
  }
  _handleSelectInvoice(e, t) {
    t.stopPropagation();
    const a = !!t.target.checked, i = new Set(this._selectedInvoiceIds);
    a ? i.add(e) : i.delete(e), this._selectedInvoiceIds = i;
  }
  _handleRowClick(e, t) {
    this._isAnchorClick(e) || this._isInteractiveClick(e) || y(t.id);
  }
  _handleRowKeyDown(e, t) {
    e.key !== "Enter" && e.key !== " " || (e.preventDefault(), y(t.id));
  }
  _getSelectedInvoices() {
    return this._invoices.filter((e) => this._selectedInvoiceIds.has(e.id));
  }
  _getSelectedTotal() {
    return this._getSelectedInvoices().reduce(
      (e, t) => e + (t.balanceDue ?? t.total),
      0
    );
  }
  async _handleMarkAsPaid() {
    if (this._selectedInvoiceIds.size === 0) return;
    const e = this._getSelectedInvoices(), t = this._getSelectedTotal(), a = await l(this, _)?.open(this, E, {
      data: {
        invoices: e,
        currencyCode: this._currencyCode,
        totalBalanceDue: t
      }
    })?.onSubmit();
    a?.changed && (l(this, g)?.peek("positive", {
      data: {
        headline: "Payments recorded",
        message: `Successfully marked ${a.successCount} invoice${a.successCount === 1 ? "" : "s"} as paid.`
      }
    }), this._selectedInvoiceIds = /* @__PURE__ */ new Set(), this._loadInvoices());
  }
  _renderFilterSection() {
    return r`
      <div class="filters">
        <div class="filters-top">
          <div class="search-box">
            <uui-input
              type="text"
              .value=${this._pendingSearchTerm}
              placeholder="Search by invoice number, customer name, or email..."
              label="Search outstanding invoices"
              @input=${this._handleSearchInput}
            >
              <uui-icon name="icon-search" slot="prepend"></uui-icon>
              ${this._pendingSearchTerm ? r`
                    <uui-button
                      slot="append"
                      compact
                      look="secondary"
                      label="Clear search"
                      @click=${this._handleSearchClear}
                    >
                      <uui-icon name="icon-wrong"></uui-icon>
                    </uui-button>
                  ` : m}
            </uui-input>
          </div>

          <uui-toggle
            label="Account customers only"
            .checked=${this._accountCustomersOnly}
            @change=${this._handleAccountToggle}
          >
            Account customers only
          </uui-toggle>
        </div>

        <uui-tab-group class="tabs">
          <uui-tab
            label="All outstanding"
            ?active=${this._activeTab === "all"}
            @click=${() => this._handleTabClick("all")}
          >
            All outstanding
          </uui-tab>
          <uui-tab
            label="Overdue"
            ?active=${this._activeTab === "overdue"}
            @click=${() => this._handleTabClick("overdue")}
          >
            Overdue
          </uui-tab>
          <uui-tab
            label="Due this week"
            ?active=${this._activeTab === "dueThisWeek"}
            @click=${() => this._handleTabClick("dueThisWeek")}
          >
            Due this week
          </uui-tab>
          <uui-tab
            label="Due this month"
            ?active=${this._activeTab === "dueThisMonth"}
            @click=${() => this._handleTabClick("dueThisMonth")}
          >
            Due this month
          </uui-tab>
        </uui-tab-group>
      </div>
    `;
  }
  _renderSelectionBar() {
    return this._selectedInvoiceIds.size === 0 ? m : r`
      <div class="selection-bar">
        <div class="selection-meta">
          <span class="selection-count">${this._selectedInvoiceIds.size} selected</span>
          <span class="selection-total"
            >${f(this._getSelectedTotal(), this._currencyCode)} total</span
          >
        </div>
        <uui-button
          look="primary"
          color="positive"
          label="Mark selected invoices as paid"
          @click=${this._handleMarkAsPaid}
        >
          Mark as paid
        </uui-button>
      </div>
    `;
  }
  _renderErrorState() {
    return r`
      <div class="error-state" role="alert">
        <uui-icon name="icon-alert"></uui-icon>
        <span>${this._errorMessage}</span>
        <uui-button look="secondary" label="Retry loading outstanding invoices" @click=${this._handleRetry}>
          Retry
        </uui-button>
      </div>
    `;
  }
  _renderEmptyState() {
    return this._hasActiveFilters() ? r`
        <merchello-empty-state
          icon="icon-search"
          headline="No invoices match these filters"
          message="Try changing search or filters to find outstanding invoices."
        ></merchello-empty-state>
      ` : r`
      <merchello-empty-state
        icon="icon-check"
        headline="No outstanding invoices"
        message="All invoices are currently paid."
      ></merchello-empty-state>
    `;
  }
  _renderStatus(e) {
    return e.isOverdue ? r`<span class="badge badge-danger">Overdue</span>` : e.daysUntilDue != null && e.daysUntilDue >= 0 && e.daysUntilDue <= 7 ? r`<span class="badge badge-warning">Due soon</span>` : r`<span class="badge badge-default">Unpaid</span>`;
  }
  _renderRow(e) {
    const t = this._selectedInvoiceIds.has(e.id), a = e.balanceDue ?? e.total;
    return r`
      <uui-table-row
        class="clickable ${t ? "selected" : ""} ${e.isOverdue ? "overdue" : ""}"
        tabindex="0"
        @click=${(i) => this._handleRowClick(i, e)}
        @keydown=${(i) => this._handleRowKeyDown(i, e)}
      >
        <uui-table-cell class="checkbox-col" @click=${(i) => i.stopPropagation()}>
          <uui-checkbox
            aria-label="Select invoice ${e.invoiceNumber || e.id}"
            ?checked=${t}
            @change=${(i) => this._handleSelectInvoice(e.id, i)}
          ></uui-checkbox>
        </uui-table-cell>
        <uui-table-cell>
          <a class="invoice-link" href=${P(e.id)}>
            ${e.invoiceNumber || e.id}
          </a>
        </uui-table-cell>
        <uui-table-cell>${e.customerName || "Unknown customer"}</uui-table-cell>
        <uui-table-cell class="amount-cell">
          ${f(a, this._currencyCode)}
        </uui-table-cell>
        <uui-table-cell>
          ${e.dueDate ? r`<span class=${e.isOverdue ? "due-date overdue" : "due-date"}
                >${D(e.dueDate)}</span
              >` : r`<span class="no-due-date">No due date</span>`}
        </uui-table-cell>
        <uui-table-cell>${this._renderStatus(e)}</uui-table-cell>
      </uui-table-row>
    `;
  }
  _renderTable() {
    const e = this._invoices.length > 0 && this._invoices.every((a) => this._selectedInvoiceIds.has(a.id)), t = this._selectedInvoiceIds.size > 0 && !e;
    return r`
      <div class="table-container">
        <uui-table class="outstanding-table">
          <uui-table-head>
            <uui-table-head-cell class="checkbox-col">
              <uui-checkbox
                aria-label="Select all outstanding invoices"
                ?checked=${e}
                .indeterminate=${t}
                @change=${this._handleSelectAll}
              ></uui-checkbox>
            </uui-table-head-cell>
            <uui-table-head-cell>Invoice</uui-table-head-cell>
            <uui-table-head-cell>Customer</uui-table-head-cell>
            <uui-table-head-cell>Amount due</uui-table-head-cell>
            <uui-table-head-cell>Due date</uui-table-head-cell>
            <uui-table-head-cell>Status</uui-table-head-cell>
          </uui-table-head>
          ${this._invoices.map((a) => this._renderRow(a))}
        </uui-table>
      </div>
    `;
  }
  _renderContent() {
    return this._isLoading ? r`
        <div class="loading" role="status" aria-label="Loading outstanding invoices">
          <uui-loader></uui-loader>
        </div>
      ` : this._errorMessage ? this._renderErrorState() : this._invoices.length === 0 ? this._renderEmptyState() : this._renderTable();
  }
  render() {
    return r`
      <umb-body-layout header-fit-height main-no-padding>
        <div class="outstanding-container layout-container">
          ${this._renderFilterSection()} ${this._renderSelectionBar()} ${this._renderContent()}

          <merchello-pagination
            .state=${this._getPaginationState()}
            .disabled=${this._isLoading}
            @page-change=${this._handlePageChange}
          ></merchello-pagination>
        </div>
      </umb-body-layout>
    `;
  }
};
_ = /* @__PURE__ */ new WeakMap();
g = /* @__PURE__ */ new WeakMap();
h = /* @__PURE__ */ new WeakMap();
c = /* @__PURE__ */ new WeakMap();
s.styles = [
  z,
  w`
    :host {
      display: block;
      height: 100%;
      background: var(--uui-color-background);
    }

    .filters {
      display: flex;
      flex-direction: column;
      gap: var(--uui-size-space-3);
      margin-bottom: var(--uui-size-space-1);
    }

    .filters-top {
      display: flex;
      flex-wrap: wrap;
      align-items: flex-end;
      justify-content: space-between;
      gap: var(--uui-size-space-3);
    }

    .search-box {
      flex: 1;
      min-width: 260px;
      max-width: 520px;
    }

    .search-box uui-input {
      width: 100%;
    }

    .tabs {
      align-self: flex-start;
    }

    .selection-bar {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      justify-content: space-between;
      gap: var(--uui-size-space-3);
      padding: var(--uui-size-space-3);
      background: var(--uui-color-surface);
      border: 1px solid var(--uui-color-border);
      border-radius: var(--uui-border-radius);
    }

    .selection-meta {
      display: flex;
      gap: var(--uui-size-space-3);
      align-items: center;
      font-size: 0.875rem;
    }

    .selection-count {
      font-weight: 600;
      color: var(--uui-color-text);
    }

    .selection-total {
      color: var(--uui-color-text-alt);
    }

    .loading {
      display: flex;
      justify-content: center;
      padding: var(--uui-size-space-6);
    }

    .error-state {
      display: flex;
      gap: var(--uui-size-space-3);
      align-items: center;
      padding: var(--uui-size-space-3);
      border-radius: var(--uui-border-radius);
      background: var(--uui-color-danger-standalone);
      color: var(--uui-color-danger-contrast);
    }

    .error-state span {
      flex: 1;
    }

    .table-container {
      overflow-x: auto;
      background: var(--uui-color-surface);
      border: 1px solid var(--uui-color-border);
      border-radius: var(--uui-border-radius);
    }

    .outstanding-table {
      width: 100%;
    }

    uui-table-head-cell,
    uui-table-cell {
      white-space: nowrap;
    }

    .checkbox-col {
      width: 40px;
    }

    uui-table-row.clickable {
      cursor: pointer;
    }

    uui-table-row.clickable:hover {
      background: var(--uui-color-surface-emphasis);
    }

    uui-table-row.clickable:focus-visible {
      outline: 2px solid var(--uui-color-interactive);
      outline-offset: -2px;
    }

    uui-table-row.selected {
      background: color-mix(in srgb, var(--uui-color-current) 10%, transparent);
    }

    uui-table-row.overdue {
      background: color-mix(in srgb, var(--uui-color-danger) 5%, transparent);
    }

    uui-table-row.overdue:hover {
      background: color-mix(in srgb, var(--uui-color-danger) 10%, transparent);
    }

    .invoice-link {
      color: var(--uui-color-interactive);
      text-decoration: none;
      font-weight: 600;
    }

    .invoice-link:hover {
      text-decoration: underline;
    }

    .amount-cell {
      font-weight: 600;
    }

    .due-date {
      font-size: 0.875rem;
    }

    .due-date.overdue {
      color: var(--uui-color-danger);
      font-weight: 600;
    }

    .no-due-date {
      color: var(--uui-color-text-alt);
    }

    .badge {
      display: inline-block;
      padding: 2px 8px;
      border-radius: 12px;
      font-size: 0.75rem;
      font-weight: 600;
      text-transform: uppercase;
    }

    .badge-danger {
      background: var(--uui-color-danger-standalone);
      color: var(--uui-color-danger-contrast);
    }

    .badge-warning {
      background: var(--merchello-color-warning-status-background, #8a6500);
      color: #fff;
    }

    .badge-default {
      background: var(--uui-color-text-alt);
      color: #fff;
    }
  `
];
o([
  n()
], s.prototype, "_invoices", 2);
o([
  n()
], s.prototype, "_isLoading", 2);
o([
  n()
], s.prototype, "_errorMessage", 2);
o([
  n()
], s.prototype, "_page", 2);
o([
  n()
], s.prototype, "_pageSize", 2);
o([
  n()
], s.prototype, "_totalItems", 2);
o([
  n()
], s.prototype, "_totalPages", 2);
o([
  n()
], s.prototype, "_activeTab", 2);
o([
  n()
], s.prototype, "_accountCustomersOnly", 2);
o([
  n()
], s.prototype, "_selectedInvoiceIds", 2);
o([
  n()
], s.prototype, "_currencyCode", 2);
o([
  n()
], s.prototype, "_searchTerm", 2);
o([
  n()
], s.prototype, "_pendingSearchTerm", 2);
s = o([
  T("merchello-outstanding-list")
], s);
const q = s;
export {
  s as MerchelloOutstandingListElement,
  q as default
};
//# sourceMappingURL=outstanding-list.element-C_1drJAm.js.map
