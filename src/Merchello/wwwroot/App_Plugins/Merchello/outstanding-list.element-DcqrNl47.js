import { LitElement as k, html as s, nothing as b, css as y, state as r, customElement as w } from "@umbraco-cms/backoffice/external/lit";
import { UmbElementMixin as C } from "@umbraco-cms/backoffice/element-api";
import { UmbModalToken as $, UMB_MODAL_MANAGER_CONTEXT as T } from "@umbraco-cms/backoffice/modal";
import { UMB_NOTIFICATION_CONTEXT as I } from "@umbraco-cms/backoffice/notification";
import { M as S } from "./merchello-api-LENiBVrz.js";
import { g as M } from "./store-settings-Biy0PIJu.js";
import { a as x, e as O } from "./formatting-CeWY__1B.js";
import { n as A } from "./navigation-COkStlQk.js";
import "./pagination.element-sDi4Myhy.js";
import "./merchello-empty-state.element-mt97UoA5.js";
const D = new $("Merchello.MarkAsPaid.Modal", {
  modal: {
    type: "sidebar",
    size: "medium"
  }
});
var z = Object.defineProperty, P = Object.getOwnPropertyDescriptor, m = (e) => {
  throw TypeError(e);
}, l = (e, t, a, o) => {
  for (var c = o > 1 ? void 0 : o ? P(t, a) : t, g = e.length - 1, _; g >= 0; g--)
    (_ = e[g]) && (c = (o ? _(t, a, c) : _(c)) || c);
  return o && c && z(t, a, c), c;
}, f = (e, t, a) => t.has(e) || m("Cannot " + a), u = (e, t, a) => (f(e, t, "read from private field"), t.get(e)), v = (e, t, a) => t.has(e) ? m("Cannot add the same private member more than once") : t instanceof WeakSet ? t.add(e) : t.set(e, a), d = (e, t, a, o) => (f(e, t, "write to private field"), t.set(e, a), a), h, p, n;
let i = class extends C(k) {
  constructor() {
    super(), this._invoices = [], this._isLoading = !0, this._errorMessage = null, this._page = 1, this._pageSize = 50, this._totalItems = 0, this._totalPages = 0, this._activeTab = "all", this._accountCustomersOnly = !0, this._selectedInvoices = /* @__PURE__ */ new Set(), this._currencyCode = "USD", v(this, h), v(this, p), v(this, n, !1), this.consumeContext(T, (e) => {
      d(this, h, e);
    }), this.consumeContext(I, (e) => {
      d(this, p, e);
    });
  }
  connectedCallback() {
    super.connectedCallback(), d(this, n, !0), this._initializeAndLoad();
  }
  disconnectedCallback() {
    super.disconnectedCallback(), d(this, n, !1);
  }
  async _initializeAndLoad() {
    const e = await M();
    u(this, n) && (this._pageSize = e.defaultPaginationPageSize, this._currencyCode = e.currencyCode, this._loadInvoices());
  }
  async _loadInvoices() {
    this._isLoading = !0, this._errorMessage = null;
    const e = {
      page: this._page,
      pageSize: this._pageSize,
      accountCustomersOnly: this._accountCustomersOnly,
      sortBy: "dueDate",
      sortDir: "asc"
    };
    this._activeTab === "overdue" ? e.overdueOnly = !0 : this._activeTab === "dueThisWeek" ? e.dueWithinDays = 7 : this._activeTab === "dueThisMonth" && (e.dueWithinDays = 30);
    const { data: t, error: a } = await S.getOutstandingInvoices(e);
    if (u(this, n)) {
      if (a) {
        this._errorMessage = a.message, this._isLoading = !1;
        return;
      }
      t && (this._invoices = t.items, this._totalItems = t.totalItems, this._totalPages = t.totalPages), this._isLoading = !1;
    }
  }
  _handleTabClick(e) {
    this._activeTab = e, this._page = 1, this._selectedInvoices = /* @__PURE__ */ new Set(), this._loadInvoices();
  }
  _handleAccountToggle() {
    this._accountCustomersOnly = !this._accountCustomersOnly, this._page = 1, this._selectedInvoices = /* @__PURE__ */ new Set(), this._loadInvoices();
  }
  _handlePageChange(e) {
    this._page = e.detail.page, this._loadInvoices();
  }
  _handleSelectAll(e) {
    e.target.checked ? this._selectedInvoices = new Set(this._invoices.map((a) => a.id)) : this._selectedInvoices = /* @__PURE__ */ new Set(), this.requestUpdate();
  }
  _handleSelectInvoice(e) {
    const t = new Set(this._selectedInvoices);
    t.has(e) ? t.delete(e) : t.add(e), this._selectedInvoices = t;
  }
  _handleRowClick(e) {
    A(e.id);
  }
  async _handleMarkAsPaid() {
    if (this._selectedInvoices.size === 0) return;
    const e = this._invoices.filter(
      (o) => this._selectedInvoices.has(o.id)
    ), t = e.reduce(
      (o, c) => o + (c.balanceDue ?? c.total),
      0
    ), a = await u(this, h)?.open(this, D, {
      data: {
        invoices: e,
        currencyCode: this._currencyCode,
        totalBalanceDue: t
      }
    })?.onSubmit();
    a?.changed && (u(this, p)?.peek("positive", {
      data: {
        headline: "Payments Recorded",
        message: `Successfully marked ${a.successCount} invoice${a.successCount === 1 ? "" : "s"} as paid.`
      }
    }), this._selectedInvoices = /* @__PURE__ */ new Set(), this._loadInvoices());
  }
  _renderFilterRow() {
    return s`
      <div class="filter-row">
        <label class="account-toggle">
          <uui-toggle
            .checked=${this._accountCustomersOnly}
            @change=${this._handleAccountToggle}
            label="Account customers only">
          </uui-toggle>
          <span>Account customers only</span>
        </label>
        <uui-tab-group>
          <uui-tab
            label="All Outstanding"
            ?active=${this._activeTab === "all"}
            @click=${() => this._handleTabClick("all")}>
            All Outstanding
          </uui-tab>
          <uui-tab
            label="Overdue"
            ?active=${this._activeTab === "overdue"}
            @click=${() => this._handleTabClick("overdue")}>
            Overdue
          </uui-tab>
          <uui-tab
            label="Due This Week"
            ?active=${this._activeTab === "dueThisWeek"}
            @click=${() => this._handleTabClick("dueThisWeek")}>
            Due This Week
          </uui-tab>
          <uui-tab
            label="Due This Month"
            ?active=${this._activeTab === "dueThisMonth"}
            @click=${() => this._handleTabClick("dueThisMonth")}>
            Due This Month
          </uui-tab>
        </uui-tab-group>
      </div>
    `;
  }
  _renderActionBar() {
    return this._selectedInvoices.size > 0 ? s`
      <div class="action-bar">
        <span class="selection-count">${this._selectedInvoices.size} selected</span>
        <uui-button
          look="primary"
          color="positive"
          @click=${this._handleMarkAsPaid}>
          Mark as Paid
        </uui-button>
      </div>
    ` : b;
  }
  _renderTable() {
    if (this._invoices.length === 0)
      return s`
        <merchello-empty-state
          icon="icon-check"
          headline="No Outstanding Invoices"
          message="All invoices have been paid.">
        </merchello-empty-state>
      `;
    const e = this._invoices.length > 0 && this._invoices.every((t) => this._selectedInvoices.has(t.id));
    return s`
      <div class="table-container">
        <uui-table class="outstanding-table">
          <uui-table-head>
            <uui-table-head-cell class="checkbox-col">
              <uui-checkbox
                .checked=${e}
                @change=${this._handleSelectAll}
                label="Select all outstanding invoices">
              </uui-checkbox>
            </uui-table-head-cell>
            <uui-table-head-cell>Invoice</uui-table-head-cell>
            <uui-table-head-cell>Customer</uui-table-head-cell>
            <uui-table-head-cell>Amount</uui-table-head-cell>
            <uui-table-head-cell>Due Date</uui-table-head-cell>
            <uui-table-head-cell>Status</uui-table-head-cell>
          </uui-table-head>
          ${this._invoices.map((t) => this._renderRow(t))}
        </uui-table>
      </div>
    `;
  }
  _renderRow(e) {
    const t = this._selectedInvoices.has(e.id), a = e.balanceDue ?? e.total;
    return s`
      <uui-table-row
        class="clickable ${t ? "selected" : ""} ${e.isOverdue ? "overdue" : ""}"
        @click=${() => this._handleRowClick(e)}>
        <uui-table-cell class="checkbox-col" @click=${(o) => o.stopPropagation()}>
          <uui-checkbox
            .checked=${t}
            @change=${() => this._handleSelectInvoice(e.id)}
            label="Select ${e.invoiceNumber}">
          </uui-checkbox>
        </uui-table-cell>
        <uui-table-cell>
          <span class="invoice-number">${e.invoiceNumber}</span>
        </uui-table-cell>
        <uui-table-cell>
          <span class="customer-name">${e.customerName}</span>
        </uui-table-cell>
        <uui-table-cell>
          <span class="amount">${x(a, this._currencyCode)}</span>
        </uui-table-cell>
        <uui-table-cell>
          ${e.dueDate ? s`<span class="due-date ${e.isOverdue ? "overdue" : ""}">${O(e.dueDate)}</span>` : s`<span class="no-due-date">-</span>`}
        </uui-table-cell>
        <uui-table-cell>
          ${e.isOverdue ? s`<span class="badge badge-danger">Overdue</span>` : e.daysUntilDue != null && e.daysUntilDue <= 7 ? s`<span class="badge badge-warning">Due Soon</span>` : s`<span class="badge badge-default">Unpaid</span>`}
        </uui-table-cell>
      </uui-table-row>
    `;
  }
  render() {
    return s`
      <div class="outstanding-list">
        ${this._renderFilterRow()}
        ${this._renderActionBar()}

        ${this._errorMessage ? s`<div class="error-banner">${this._errorMessage}</div>` : b}

        ${this._isLoading ? s`<div class="loading" role="status" aria-label="Loading outstanding invoices"><uui-loader></uui-loader></div>` : this._renderTable()}

        ${this._totalPages > 1 ? s`
              <merchello-pagination
                .page=${this._page}
                .pageSize=${this._pageSize}
                .totalItems=${this._totalItems}
                .totalPages=${this._totalPages}
                @page-change=${this._handlePageChange}>
              </merchello-pagination>
            ` : b}
      </div>
    `;
  }
};
h = /* @__PURE__ */ new WeakMap();
p = /* @__PURE__ */ new WeakMap();
n = /* @__PURE__ */ new WeakMap();
i.styles = y`
    :host {
      display: block;
      padding: var(--uui-size-space-5);
    }

    .outstanding-list {
      display: flex;
      flex-direction: column;
      gap: var(--uui-size-space-4);
    }

    .filter-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: var(--uui-size-space-4);
    }

    .account-toggle {
      display: flex;
      align-items: center;
      gap: var(--uui-size-space-2);
      font-size: 0.875rem;
      cursor: pointer;
    }

    .action-bar {
      display: flex;
      align-items: center;
      gap: var(--uui-size-space-3);
    }

    .selection-count {
      font-size: 0.875rem;
      color: var(--uui-color-text-alt);
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

    uui-table-row.selected {
      background: color-mix(in srgb, var(--uui-color-current) 10%, transparent);
    }

    uui-table-row.overdue {
      background: color-mix(in srgb, var(--uui-color-danger) 5%, transparent);
    }

    uui-table-row.overdue:hover {
      background: color-mix(in srgb, var(--uui-color-danger) 10%, transparent);
    }

    .invoice-number {
      font-weight: 600;
    }

    .customer-name {
      color: var(--uui-color-text-alt);
    }

    .amount {
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
      font-size: 0.6875rem;
      font-weight: 600;
      text-transform: uppercase;
      border-radius: var(--uui-border-radius);
    }

    .badge-danger {
      background: var(--uui-color-danger);
      color: var(--uui-color-danger-contrast);
    }

    .badge-warning {
      background: var(--uui-color-warning);
      color: var(--uui-color-warning-contrast);
    }

    .badge-default {
      background: var(--uui-color-surface-alt);
      color: var(--uui-color-text-alt);
    }

    .error-banner {
      padding: var(--uui-size-space-3);
      background: var(--uui-color-danger-standalone);
      color: var(--uui-color-danger-contrast);
      border-radius: var(--uui-border-radius);
    }

    .loading {
      display: flex;
      justify-content: center;
      padding: var(--uui-size-space-6);
    }
  `;
l([
  r()
], i.prototype, "_invoices", 2);
l([
  r()
], i.prototype, "_isLoading", 2);
l([
  r()
], i.prototype, "_errorMessage", 2);
l([
  r()
], i.prototype, "_page", 2);
l([
  r()
], i.prototype, "_pageSize", 2);
l([
  r()
], i.prototype, "_totalItems", 2);
l([
  r()
], i.prototype, "_totalPages", 2);
l([
  r()
], i.prototype, "_activeTab", 2);
l([
  r()
], i.prototype, "_accountCustomersOnly", 2);
l([
  r()
], i.prototype, "_selectedInvoices", 2);
l([
  r()
], i.prototype, "_currencyCode", 2);
i = l([
  w("merchello-outstanding-list")
], i);
const q = i;
export {
  i as MerchelloOutstandingListElement,
  q as default
};
//# sourceMappingURL=outstanding-list.element-DcqrNl47.js.map
