import { LitElement as k, html as s, nothing as _, css as y, state as n, customElement as C } from "@umbraco-cms/backoffice/external/lit";
import { UmbElementMixin as $ } from "@umbraco-cms/backoffice/element-api";
import { UmbModalToken as x, UMB_MODAL_MANAGER_CONTEXT as T } from "@umbraco-cms/backoffice/modal";
import { UMB_NOTIFICATION_CONTEXT as w } from "@umbraco-cms/backoffice/notification";
import { M as I } from "./merchello-api-CZxVATce.js";
import { g as S } from "./store-settings-NbnwiIWs.js";
import { a as z, i as M } from "./formatting-CCoXf2dp.js";
import { n as O } from "./navigation-CgHIQALx.js";
import "./pagination.element-sDi4Myhy.js";
import "./merchello-empty-state.element-mt97UoA5.js";
const A = new x("Merchello.MarkAsPaid.Modal", {
  modal: {
    type: "sidebar",
    size: "medium"
  }
});
var D = Object.defineProperty, P = Object.getOwnPropertyDescriptor, m = (e) => {
  throw TypeError(e);
}, o = (e, t, a, r) => {
  for (var c = r > 1 ? void 0 : r ? P(t, a) : t, g = e.length - 1, v; g >= 0; g--)
    (v = e[g]) && (c = (r ? v(t, a, c) : v(c)) || c);
  return r && c && D(t, a, c), c;
}, f = (e, t, a) => t.has(e) || m("Cannot " + a), d = (e, t, a) => (f(e, t, "read from private field"), t.get(e)), b = (e, t, a) => t.has(e) ? m("Cannot add the same private member more than once") : t instanceof WeakSet ? t.add(e) : t.set(e, a), u = (e, t, a, r) => (f(e, t, "write to private field"), t.set(e, a), a), h, p, l;
let i = class extends $(k) {
  constructor() {
    super(), this._invoices = [], this._isLoading = !0, this._errorMessage = null, this._page = 1, this._pageSize = 50, this._totalItems = 0, this._totalPages = 0, this._activeTab = "all", this._accountCustomersOnly = !0, this._selectedInvoices = /* @__PURE__ */ new Set(), this._currencyCode = "USD", b(this, h), b(this, p), b(this, l, !1), this.consumeContext(T, (e) => {
      u(this, h, e);
    }), this.consumeContext(w, (e) => {
      u(this, p, e);
    });
  }
  connectedCallback() {
    super.connectedCallback(), u(this, l, !0), this._initializeAndLoad();
  }
  disconnectedCallback() {
    super.disconnectedCallback(), u(this, l, !1);
  }
  async _initializeAndLoad() {
    const e = await S();
    d(this, l) && (this._pageSize = e.defaultPaginationPageSize, this._currencyCode = e.currencyCode, this._loadInvoices());
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
    const { data: t, error: a } = await I.getOutstandingInvoices(e);
    if (d(this, l)) {
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
    O(e.id);
  }
  async _handleMarkAsPaid() {
    if (this._selectedInvoices.size === 0) return;
    const e = this._invoices.filter(
      (a) => this._selectedInvoices.has(a.id)
    ), t = await d(this, h)?.open(this, A, {
      data: {
        invoices: e,
        currencyCode: this._currencyCode
      }
    })?.onSubmit();
    t?.changed && (d(this, p)?.peek("positive", {
      data: {
        headline: "Payments Recorded",
        message: `Successfully marked ${t.successCount} invoice${t.successCount === 1 ? "" : "s"} as paid.`
      }
    }), this._selectedInvoices = /* @__PURE__ */ new Set(), this._loadInvoices());
  }
  _renderTabs() {
    return s`
      <div class="tabs">
        <button
          class="tab ${this._activeTab === "all" ? "active" : ""}"
          @click=${() => this._handleTabClick("all")}>
          All Outstanding
        </button>
        <button
          class="tab ${this._activeTab === "overdue" ? "active" : ""}"
          @click=${() => this._handleTabClick("overdue")}>
          Overdue
        </button>
        <button
          class="tab ${this._activeTab === "dueThisWeek" ? "active" : ""}"
          @click=${() => this._handleTabClick("dueThisWeek")}>
          Due This Week
        </button>
        <button
          class="tab ${this._activeTab === "dueThisMonth" ? "active" : ""}"
          @click=${() => this._handleTabClick("dueThisMonth")}>
          Due This Month
        </button>
      </div>
    `;
  }
  _renderToolbar() {
    const e = this._selectedInvoices.size > 0;
    return s`
      <div class="toolbar">
        <div class="toolbar-left">
          <label class="account-toggle">
            <uui-toggle
              .checked=${this._accountCustomersOnly}
              @change=${this._handleAccountToggle}
              label="Account customers only">
            </uui-toggle>
            <span>Account customers only</span>
          </label>
        </div>
        <div class="toolbar-right">
          ${e ? s`
                <span class="selection-count">${this._selectedInvoices.size} selected</span>
                <uui-button
                  look="primary"
                  color="positive"
                  @click=${this._handleMarkAsPaid}>
                  Mark as Paid
                </uui-button>
              ` : _}
        </div>
      </div>
    `;
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
        <table>
          <thead>
            <tr>
              <th class="checkbox-col">
                <uui-checkbox
                  .checked=${e}
                  @change=${this._handleSelectAll}
                  label="Select all outstanding invoices">
                </uui-checkbox>
              </th>
              <th>Invoice</th>
              <th>Customer</th>
              <th>Amount</th>
              <th>Due Date</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            ${this._invoices.map((t) => this._renderRow(t))}
          </tbody>
        </table>
      </div>
    `;
  }
  _renderRow(e) {
    const t = this._selectedInvoices.has(e.id), a = e.balanceDue ?? e.total;
    return s`
      <tr
        class="${t ? "selected" : ""} ${e.isOverdue ? "overdue" : ""}"
        tabindex="0"
        role="row"
        @click=${() => this._handleRowClick(e)}
        @keydown=${(r) => {
      (r.key === "Enter" || r.key === " ") && (r.preventDefault(), this._handleRowClick(e));
    }}>
        <td class="checkbox-col" @click=${(r) => r.stopPropagation()}>
          <uui-checkbox
            .checked=${t}
            @change=${() => this._handleSelectInvoice(e.id)}
            label="Select ${e.invoiceNumber}">
          </uui-checkbox>
        </td>
        <td>
          <span class="invoice-number">${e.invoiceNumber}</span>
        </td>
        <td>
          <span class="customer-name">${e.customerName}</span>
        </td>
        <td>
          <span class="amount">${z(a, this._currencyCode)}</span>
        </td>
        <td>
          ${e.dueDate ? s`<span class="due-date ${e.isOverdue ? "overdue" : ""}">${M(e.dueDate)}</span>` : s`<span class="no-due-date">-</span>`}
        </td>
        <td>
          ${e.isOverdue ? s`<span class="badge badge-danger">Overdue</span>` : e.daysUntilDue != null && e.daysUntilDue <= 7 ? s`<span class="badge badge-warning">Due Soon</span>` : s`<span class="badge badge-default">Unpaid</span>`}
        </td>
      </tr>
    `;
  }
  render() {
    return s`
      <div class="outstanding-list">
        ${this._renderTabs()}
        ${this._renderToolbar()}

        ${this._errorMessage ? s`<div class="error-banner">${this._errorMessage}</div>` : _}

        ${this._isLoading ? s`<div class="loading" role="status" aria-label="Loading outstanding invoices"><uui-loader></uui-loader></div>` : this._renderTable()}

        ${this._totalPages > 1 ? s`
              <merchello-pagination
                .page=${this._page}
                .pageSize=${this._pageSize}
                .totalItems=${this._totalItems}
                .totalPages=${this._totalPages}
                @page-change=${this._handlePageChange}>
              </merchello-pagination>
            ` : _}
      </div>
    `;
  }
};
h = /* @__PURE__ */ new WeakMap();
p = /* @__PURE__ */ new WeakMap();
l = /* @__PURE__ */ new WeakMap();
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

    .tabs {
      display: flex;
      gap: var(--uui-size-space-2);
      border-bottom: 1px solid var(--uui-color-border);
      padding-bottom: var(--uui-size-space-2);
    }

    .tab {
      padding: var(--uui-size-space-2) var(--uui-size-space-4);
      background: transparent;
      border: none;
      cursor: pointer;
      font-size: 0.875rem;
      color: var(--uui-color-text-alt);
      border-radius: var(--uui-border-radius);
      transition: all 0.15s ease;
    }

    .tab:hover {
      background: var(--uui-color-surface-alt);
      color: var(--uui-color-text);
    }

    .tab.active {
      background: var(--uui-color-current);
      color: var(--uui-color-current-contrast);
    }

    .toolbar {
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: var(--uui-size-space-4);
    }

    .toolbar-left,
    .toolbar-right {
      display: flex;
      align-items: center;
      gap: var(--uui-size-space-3);
    }

    .account-toggle {
      display: flex;
      align-items: center;
      gap: var(--uui-size-space-2);
      font-size: 0.875rem;
      cursor: pointer;
    }

    .selection-count {
      font-size: 0.875rem;
      color: var(--uui-color-text-alt);
    }

    .table-container {
      overflow-x: auto;
    }

    table {
      width: 100%;
      border-collapse: collapse;
    }

    th,
    td {
      padding: var(--uui-size-space-3) var(--uui-size-space-4);
      text-align: left;
      border-bottom: 1px solid var(--uui-color-border);
    }

    th {
      font-weight: 600;
      font-size: 0.75rem;
      text-transform: uppercase;
      color: var(--uui-color-text-alt);
      background: var(--uui-color-surface-alt);
    }

    .checkbox-col {
      width: 40px;
    }

    tr {
      cursor: pointer;
      transition: background 0.15s ease;
    }

    tr:hover {
      background: var(--uui-color-surface-alt);
    }

    tr:focus-visible {
      outline: 2px solid var(--uui-color-current);
      outline-offset: -2px;
    }

    tr.selected {
      background: color-mix(in srgb, var(--uui-color-current) 10%, transparent);
    }

    tr.overdue {
      background: color-mix(in srgb, var(--uui-color-danger) 5%, transparent);
    }

    tr.overdue:hover {
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
o([
  n()
], i.prototype, "_invoices", 2);
o([
  n()
], i.prototype, "_isLoading", 2);
o([
  n()
], i.prototype, "_errorMessage", 2);
o([
  n()
], i.prototype, "_page", 2);
o([
  n()
], i.prototype, "_pageSize", 2);
o([
  n()
], i.prototype, "_totalItems", 2);
o([
  n()
], i.prototype, "_totalPages", 2);
o([
  n()
], i.prototype, "_activeTab", 2);
o([
  n()
], i.prototype, "_accountCustomersOnly", 2);
o([
  n()
], i.prototype, "_selectedInvoices", 2);
o([
  n()
], i.prototype, "_currencyCode", 2);
i = o([
  C("merchello-outstanding-list")
], i);
const F = i;
export {
  i as MerchelloOutstandingListElement,
  F as default
};
//# sourceMappingURL=outstanding-list.element-dcH8HKN4.js.map
