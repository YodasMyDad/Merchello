import { LitElement as C, html as r, nothing as b, css as y, state as o, customElement as S } from "@umbraco-cms/backoffice/external/lit";
import { UmbElementMixin as T } from "@umbraco-cms/backoffice/element-api";
import { UMB_MODAL_MANAGER_CONTEXT as w } from "@umbraco-cms/backoffice/modal";
import { UMB_NOTIFICATION_CONTEXT as x } from "@umbraco-cms/backoffice/notification";
import { M as E } from "./merchello-api-COnU_HX2.js";
import { g as M } from "./store-settings-BKyRkVmT.js";
import { M as L, a as k } from "./customer-orders-modal.token-BBooCVRJ.js";
import "./pagination.element-sDi4Myhy.js";
import "./merchello-empty-state.element-mt97UoA5.js";
var O = Object.defineProperty, z = Object.getOwnPropertyDescriptor, f = (e) => {
  throw TypeError(e);
}, s = (e, t, a, l) => {
  for (var n = l > 1 ? void 0 : l ? z(t, a) : t, p = e.length - 1, _; p >= 0; p--)
    (_ = e[p]) && (n = (l ? _(t, a, n) : _(n)) || n);
  return l && n && O(t, a, n), n;
}, v = (e, t, a) => t.has(e) || f("Cannot " + a), c = (e, t, a) => (v(e, t, "read from private field"), t.get(e)), g = (e, t, a) => t.has(e) ? f("Cannot add the same private member more than once") : t instanceof WeakSet ? t.add(e) : t.set(e, a), d = (e, t, a, l) => (v(e, t, "write to private field"), t.set(e, a), a), h, m, u;
let i = class extends T(C) {
  constructor() {
    super(), this._customers = [], this._isLoading = !0, this._errorMessage = null, this._page = 1, this._pageSize = 50, this._totalItems = 0, this._totalPages = 0, this._searchTerm = "", this._searchDebounceTimer = null, g(this, h), g(this, m), g(this, u, !1), this.consumeContext(w, (e) => {
      d(this, h, e);
    }), this.consumeContext(x, (e) => {
      d(this, m, e);
    });
  }
  connectedCallback() {
    super.connectedCallback(), d(this, u, !0), this._initializeAndLoad();
  }
  async _initializeAndLoad() {
    const e = await M();
    c(this, u) && (this._pageSize = e.defaultPaginationPageSize, this._loadCustomers());
  }
  disconnectedCallback() {
    super.disconnectedCallback(), d(this, u, !1), this._searchDebounceTimer && clearTimeout(this._searchDebounceTimer);
  }
  async _loadCustomers() {
    this._isLoading = !0, this._errorMessage = null;
    const e = {
      page: this._page,
      pageSize: this._pageSize
    };
    this._searchTerm.trim() && (e.search = this._searchTerm.trim());
    const { data: t, error: a } = await E.getCustomers(e);
    if (c(this, u)) {
      if (a) {
        this._errorMessage = a.message, this._isLoading = !1;
        return;
      }
      t && (this._customers = t.items, this._totalItems = t.totalItems, this._totalPages = t.totalPages), this._isLoading = !1;
    }
  }
  _handleSearchInput(e) {
    const a = e.target.value;
    this._searchDebounceTimer && clearTimeout(this._searchDebounceTimer), this._searchDebounceTimer = setTimeout(() => {
      this._searchTerm = a, this._page = 1, this._loadCustomers();
    }, 300);
  }
  _handleSearchClear() {
    this._searchTerm = "", this._page = 1, this._loadCustomers();
  }
  _handlePageChange(e) {
    this._page = e.detail.page, this._loadCustomers();
  }
  _getPaginationState() {
    return {
      page: this._page,
      pageSize: this._pageSize,
      totalItems: this._totalItems,
      totalPages: this._totalPages
    };
  }
  async _handleViewOrders(e) {
    if (!e.email) return;
    const t = [e.firstName, e.lastName].filter(Boolean).join(" ") || e.email;
    c(this, h)?.open(this, L, {
      data: {
        email: e.email,
        customerName: t,
        customerId: e.id,
        hasAccountTerms: e.hasAccountTerms
      }
    });
  }
  async _handleEditCustomer(e, t) {
    e.preventDefault(), e.stopPropagation();
    const l = await c(this, h)?.open(this, k, {
      data: { customer: t }
    })?.onSubmit().catch(() => {
    });
    c(this, u) && l?.isUpdated && (c(this, m)?.peek("positive", {
      data: { headline: "Customer updated", message: "Customer details have been updated" }
    }), this._loadCustomers());
  }
  _formatDate(e) {
    return new Date(e).toLocaleDateString(void 0, {
      year: "numeric",
      month: "short",
      day: "numeric"
    });
  }
  _getCustomerName(e) {
    return [e.firstName, e.lastName].filter(Boolean).join(" ") || "—";
  }
  _renderLoadingState() {
    return r`<div class="loading"><uui-loader></uui-loader></div>`;
  }
  _renderErrorState() {
    return r`
      <div class="error-banner">
        <uui-icon name="icon-alert"></uui-icon>
        <span>${this._errorMessage}</span>
      </div>
    `;
  }
  _renderEmptyState() {
    return this._searchTerm.trim() ? r`
        <merchello-empty-state
          icon="icon-search"
          headline="No customers found"
          message="Try adjusting your search term.">
        </merchello-empty-state>
      ` : r`
      <merchello-empty-state
        icon="icon-users"
        headline="No customers yet"
        message="Customers are automatically created when orders are placed.">
      </merchello-empty-state>
    `;
  }
  _renderSearchBox() {
    return r`
      <div class="search-box">
        <uui-input
          type="text"
          placeholder="Search by name or email..."
          .value=${this._searchTerm}
          @input=${this._handleSearchInput}
          label="Search customers"
        >
          <uui-icon name="icon-search" slot="prepend"></uui-icon>
          ${this._searchTerm ? r`
                <uui-button
                  slot="append"
                  compact
                  look="secondary"
                  label="Clear search"
                  @click=${this._handleSearchClear}
                >
                  <uui-icon name="icon-wrong"></uui-icon>
                </uui-button>
              ` : b}
        </uui-input>
      </div>
    `;
  }
  _renderCustomerRow(e) {
    return r`
      <uui-table-row class="clickable" @click=${() => this._handleViewOrders(e)}>
        <uui-table-cell>
          <div class="customer-info">
            <span class="customer-name">${this._getCustomerName(e)}</span>
          </div>
        </uui-table-cell>
        <uui-table-cell>${e.email}</uui-table-cell>
        <uui-table-cell class="center">${e.orderCount}</uui-table-cell>
        <uui-table-cell>${this._formatDate(e.dateCreated)}</uui-table-cell>
        <uui-table-cell>
          <div class="actions-cell">
            <uui-button
              look="secondary"
              compact
              label="Edit"
              @click=${(t) => this._handleEditCustomer(t, e)}>
              <uui-icon name="icon-edit"></uui-icon>
            </uui-button>
            <uui-button
              look="secondary"
              compact
              label="View Orders"
              @click=${(t) => {
      t.stopPropagation(), this._handleViewOrders(e);
    }}>
              <uui-icon name="icon-receipt-dollar"></uui-icon>
            </uui-button>
          </div>
        </uui-table-cell>
      </uui-table-row>
    `;
  }
  _renderCustomersTable() {
    return r`
      <div class="table-container">
        <uui-table class="customers-table">
          <uui-table-head>
            <uui-table-head-cell>Name</uui-table-head-cell>
            <uui-table-head-cell>Email</uui-table-head-cell>
            <uui-table-head-cell class="center">Orders</uui-table-head-cell>
            <uui-table-head-cell>Created</uui-table-head-cell>
            <uui-table-head-cell class="actions-header">Actions</uui-table-head-cell>
          </uui-table-head>
          ${this._customers.map((e) => this._renderCustomerRow(e))}
        </uui-table>
      </div>
    `;
  }
  _renderContent() {
    return this._isLoading ? this._renderLoadingState() : this._errorMessage ? this._renderErrorState() : this._customers.length === 0 ? this._renderEmptyState() : this._renderCustomersTable();
  }
  render() {
    return r`
      <umb-body-layout header-fit-height main-no-padding>
        <div class="customers-container">
          <!-- Search Box -->
          ${this._renderSearchBox()}

          <!-- Content -->
          ${this._renderContent()}

          <!-- Pagination -->
          ${this._customers.length > 0 && !this._isLoading ? r`
                <merchello-pagination
                  .state=${this._getPaginationState()}
                  .disabled=${this._isLoading}
                  @page-change=${this._handlePageChange}>
                </merchello-pagination>
              ` : b}
        </div>
      </umb-body-layout>
    `;
  }
};
h = /* @__PURE__ */ new WeakMap();
m = /* @__PURE__ */ new WeakMap();
u = /* @__PURE__ */ new WeakMap();
i.styles = [
  y`
      :host {
        display: block;
        height: 100%;
        background: var(--uui-color-background);
      }

      .customers-container {
        max-width: 100%;
        padding: var(--uui-size-layout-1);
      }

      .search-box {
        margin-bottom: var(--uui-size-space-4);
      }

      .search-box uui-input {
        width: 100%;
        max-width: 400px;
      }

      .table-container {
        overflow-x: auto;
        background: var(--uui-color-surface);
        border: 1px solid var(--uui-color-border);
        border-radius: var(--uui-border-radius);
        margin-bottom: var(--uui-size-space-4);
      }

      .customers-table {
        width: 100%;
      }

      uui-table-head-cell,
      uui-table-cell {
        white-space: nowrap;
      }

      uui-table-head-cell.center,
      uui-table-cell.center {
        text-align: center;
      }

      uui-table-row.clickable {
        cursor: pointer;
      }

      uui-table-row.clickable:hover {
        background: var(--uui-color-surface-emphasis);
      }

      .customer-info {
        display: flex;
        flex-direction: column;
        gap: var(--uui-size-space-1);
      }

      .customer-name {
        font-weight: 500;
        color: var(--uui-color-interactive);
      }

      .actions-header {
        text-align: right;
      }

      .actions-cell {
        display: flex;
        gap: var(--uui-size-space-1);
        justify-content: flex-end;
      }

      .loading {
        display: flex;
        justify-content: center;
        padding: var(--uui-size-space-6);
      }

      .error-banner {
        display: flex;
        gap: var(--uui-size-space-3);
        align-items: center;
        padding: var(--uui-size-space-4);
        background: var(--uui-color-danger-standalone);
        color: var(--uui-color-danger-contrast);
        border-radius: var(--uui-border-radius);
        margin-bottom: var(--uui-size-space-4);
      }
    `
];
s([
  o()
], i.prototype, "_customers", 2);
s([
  o()
], i.prototype, "_isLoading", 2);
s([
  o()
], i.prototype, "_errorMessage", 2);
s([
  o()
], i.prototype, "_page", 2);
s([
  o()
], i.prototype, "_pageSize", 2);
s([
  o()
], i.prototype, "_totalItems", 2);
s([
  o()
], i.prototype, "_totalPages", 2);
s([
  o()
], i.prototype, "_searchTerm", 2);
i = s([
  S("merchello-customers-list")
], i);
const V = i;
export {
  i as MerchelloCustomersListElement,
  V as default
};
//# sourceMappingURL=customers-list.element-BARxsIs5.js.map
