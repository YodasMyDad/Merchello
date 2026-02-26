import { LitElement as C, html as c, css as T, state as o, customElement as S } from "@umbraco-cms/backoffice/external/lit";
import { UmbElementMixin as x } from "@umbraco-cms/backoffice/element-api";
import { UmbModalToken as f, UMB_MODAL_MANAGER_CONTEXT as k, UMB_CONFIRM_MODAL as $ } from "@umbraco-cms/backoffice/modal";
import { UMB_NOTIFICATION_CONTEXT as w } from "@umbraco-cms/backoffice/notification";
import { M as g } from "./merchello-api-NdGX4WPd.js";
import { g as M } from "./store-settings-DgxY_Kcz.js";
import "./pagination.element-sDi4Myhy.js";
import "./merchello-empty-state.element-D2dcD7_8.js";
import "./order-table.element-Bufxswlh.js";
import { M as D } from "./edit-order-modal.token-BUHVPYdq.js";
import { n as b, a as E } from "./navigation-CvTcY6zJ.js";
import { a as z } from "./formatting-DU6_gkL3.js";
import { c as L } from "./collection-layout.styles-I8XQedsa.js";
const I = new f("Merchello.Export.Modal", {
  modal: {
    type: "sidebar",
    size: "medium"
  }
}), A = new f("Merchello.CreateOrder.Modal", {
  modal: {
    type: "sidebar",
    size: "large"
  }
});
var P = Object.defineProperty, R = Object.getOwnPropertyDescriptor, y = (e) => {
  throw TypeError(e);
}, r = (e, t, i, n) => {
  for (var l = n > 1 ? void 0 : n ? R(t, i) : t, _ = e.length - 1, m; _ >= 0; _--)
    (m = e[_]) && (l = (n ? m(t, i, l) : m(l)) || l);
  return n && l && P(t, i, l), l;
}, O = (e, t, i) => t.has(e) || y("Cannot " + i), s = (e, t, i) => (O(e, t, "read from private field"), t.get(e)), v = (e, t, i) => t.has(e) ? y("Cannot add the same private member more than once") : t instanceof WeakSet ? t.add(e) : t.set(e, i), p = (e, t, i, n) => (O(e, t, "write to private field"), t.set(e, i), i), u, h, d;
let a = class extends x(C) {
  constructor() {
    super(), this._orders = [], this._isLoading = !0, this._errorMessage = null, this._page = 1, this._pageSize = 50, this._totalItems = 0, this._totalPages = 0, this._activeTab = "all", this._selectedOrders = /* @__PURE__ */ new Set(), this._stats = null, this._searchTerm = "", this._isDeleting = !1, this._searchDebounceTimer = null, v(this, u), v(this, h), v(this, d, !1), this._tableColumns = [
      "select",
      "invoiceNumber",
      "date",
      "customer",
      "channel",
      "total",
      "paymentStatus",
      "fulfillmentStatus",
      "itemCount"
    ], this.consumeContext(k, (e) => {
      p(this, u, e);
    }), this.consumeContext(w, (e) => {
      p(this, h, e);
    });
  }
  connectedCallback() {
    super.connectedCallback(), p(this, d, !0), this._initializeAndLoad();
  }
  async _initializeAndLoad() {
    const e = await M();
    s(this, d) && (this._pageSize = e.defaultPaginationPageSize, this._loadOrders(), this._loadStats());
  }
  disconnectedCallback() {
    super.disconnectedCallback(), p(this, d, !1), this._searchDebounceTimer && clearTimeout(this._searchDebounceTimer);
  }
  async _loadOrders() {
    this._isLoading = !0, this._errorMessage = null;
    const e = {
      page: this._page,
      pageSize: this._pageSize,
      sortBy: "date",
      sortDir: "desc"
    };
    this._searchTerm.trim() && (e.search = this._searchTerm.trim()), this._activeTab === "unfulfilled" ? e.fulfillmentStatus = "unfulfilled" : this._activeTab === "unpaid" ? e.paymentStatus = "unpaid" : this._activeTab === "cancelled" && (e.cancellationStatus = "cancelled");
    const { data: t, error: i } = await g.getOrders(e);
    if (s(this, d)) {
      if (i) {
        this._errorMessage = i.message, this._isLoading = !1;
        return;
      }
      if (t) {
        this._orders = t.items, this._totalItems = t.totalItems, this._totalPages = t.totalPages;
        const n = new Set(t.items.map((l) => l.id));
        this._selectedOrders = new Set(
          Array.from(this._selectedOrders).filter((l) => n.has(l))
        );
      }
      this._isLoading = !1;
    }
  }
  async _loadStats() {
    const { data: e } = await g.getOrderStats();
    s(this, d) && e && (this._stats = e);
  }
  _handleTabClick(e) {
    this._activeTab = e, this._page = 1, this._selectedOrders = /* @__PURE__ */ new Set(), this._loadOrders();
  }
  _handleSearchInput(e) {
    const i = e.target.value;
    this._searchDebounceTimer && clearTimeout(this._searchDebounceTimer), this._searchDebounceTimer = setTimeout(() => {
      this._searchTerm = i, this._page = 1, this._loadOrders();
    }, 300);
  }
  _handleSearchClear() {
    this._searchTerm = "", this._page = 1, this._selectedOrders = /* @__PURE__ */ new Set(), this._loadOrders();
  }
  _handlePageChange(e) {
    this._page = e.detail.page, this._selectedOrders = /* @__PURE__ */ new Set(), this._loadOrders();
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
    this._selectedOrders = new Set(e.detail.selectedIds), this.requestUpdate();
  }
  _handleOrderClick(e) {
    b(e.detail.orderId);
  }
  _hasActiveFilters() {
    return this._activeTab !== "all" || this._searchTerm.trim().length > 0;
  }
  _handleOutstandingClick() {
    E();
  }
  async _handleDeleteSelected() {
    const e = this._selectedOrders.size;
    if (e === 0) return;
    const t = s(this, u)?.open(this, $, {
      data: {
        headline: "Delete Orders",
        content: `Are you sure you want to delete ${e} order${e !== 1 ? "s" : ""}? This action cannot be undone.`,
        confirmLabel: "Delete",
        color: "danger"
      }
    });
    try {
      await t?.onSubmit();
    } catch {
      return;
    }
    if (!s(this, d)) return;
    this._isDeleting = !0;
    const i = Array.from(this._selectedOrders), { error: n } = await g.deleteOrders(i);
    if (s(this, d)) {
      if (this._isDeleting = !1, n) {
        this._errorMessage = `Failed to delete orders: ${n.message}`, s(this, h)?.peek("danger", {
          data: { headline: "Failed to delete", message: n.message || "Could not delete orders" }
        });
        return;
      }
      s(this, h)?.peek("positive", {
        data: { headline: "Orders deleted", message: `${e} order${e !== 1 ? "s" : ""} deleted successfully` }
      }), this._selectedOrders = /* @__PURE__ */ new Set(), this._loadOrders(), this._loadStats();
    }
  }
  async _handleExport() {
    s(this, u) && s(this, u).open(this, I, {
      data: {}
    });
  }
  async _handleCreateOrder() {
    if (!s(this, u)) return;
    const t = await s(this, u).open(this, A, {
      data: {}
    }).onSubmit().catch(() => {
    });
    if (s(this, d) && t?.isCreated && t.invoiceId)
      if (this._loadOrders(), this._loadStats(), t.shouldOpenEdit) {
        if (await s(this, u).open(this, D, {
          data: { invoiceId: t.invoiceId }
        }).onSubmit().catch(() => {
        }), !s(this, d)) return;
        this._loadOrders(), this._loadStats();
      } else
        b(t.invoiceId);
  }
  _renderLoadingState() {
    return c`<div class="loading"><uui-loader></uui-loader></div>`;
  }
  _renderErrorState() {
    return c`
      <div class="error">
        <uui-icon name="icon-alert"></uui-icon>
        <span>${this._errorMessage}</span>
        <uui-button
          look="secondary"
          label="Retry loading orders"
          @click=${() => this._loadOrders()}
        >
          Retry
        </uui-button>
      </div>
    `;
  }
  _renderEmptyState() {
    return this._hasActiveFilters() ? c`
        <merchello-empty-state
          icon="icon-search"
          headline="No orders match your filters"
          message="Try a different search term or clear filters.">
        </merchello-empty-state>
      ` : c`
      <merchello-empty-state
        icon="icon-receipt-dollar"
        headline="No orders found"
        message="Orders will appear here once customers place them.">
      </merchello-empty-state>
    `;
  }
  _renderOrdersTable() {
    return c`
      <merchello-order-table
        .orders=${this._orders}
        .columns=${this._tableColumns}
        .selectable=${!0}
        .clickable=${!0}
        .selectedIds=${Array.from(this._selectedOrders)}
        @order-click=${this._handleOrderClick}
        @selection-change=${this._handleSelectionChange}
      ></merchello-order-table>

      <!-- Pagination -->
      <merchello-pagination
        .state=${this._getPaginationState()}
        .disabled=${this._isLoading}
        @page-change=${this._handlePageChange}
      ></merchello-pagination>
    `;
  }
  _renderOrdersContent() {
    return this._isLoading ? this._renderLoadingState() : this._errorMessage ? this._renderErrorState() : this._orders.length === 0 ? this._renderEmptyState() : this._renderOrdersTable();
  }
  render() {
    return c`
      <umb-body-layout header-fit-height main-no-padding>
      <div class="orders-container layout-container">
        <!-- Stats Grid -->
        <div class="stats-grid">
          <uui-box>
            <div class="stat-content">
              <div class="stat-icon stat-icon--orders">
                <uui-icon name="icon-receipt-dollar"></uui-icon>
              </div>
              <div class="stat-details">
                <div class="stat-number">${this._stats?.ordersToday ?? 0}</div>
                <div class="stat-label">Orders Today</div>
              </div>
            </div>
          </uui-box>
          <uui-box>
            <div class="stat-content">
              <div class="stat-icon stat-icon--items">
                <uui-icon name="icon-box"></uui-icon>
              </div>
              <div class="stat-details">
                <div class="stat-number">${this._stats?.itemsOrderedToday ?? 0}</div>
                <div class="stat-label">Items Ordered</div>
              </div>
            </div>
          </uui-box>
          <uui-box>
            <div class="stat-content">
              <div class="stat-icon stat-icon--fulfilled">
                <uui-icon name="icon-check"></uui-icon>
              </div>
              <div class="stat-details">
                <div class="stat-number">${this._stats?.ordersFulfilledToday ?? 0}</div>
                <div class="stat-label">Orders Fulfilled</div>
              </div>
            </div>
          </uui-box>
          <uui-box class="stat-box--outstanding">
            <button
              type="button"
              class="stat-button"
              aria-label="View outstanding invoices"
              @click=${this._handleOutstandingClick}
            >
              <div class="stat-content stat-content--clickable">
                <div class="stat-icon stat-icon--outstanding">
                  <uui-icon name="icon-timer"></uui-icon>
                </div>
                <div class="stat-details">
                  <div class="stat-number">${z(this._stats?.totalOutstandingValue ?? 0, this._stats?.currencyCode ?? "USD")}</div>
                  <div class="stat-label">Outstanding${this._stats?.outstandingInvoiceCount ? ` (${this._stats.outstandingInvoiceCount})` : ""}</div>
                  ${this._stats?.overdueInvoiceCount ? c`<div class="stat-overdue">${this._stats.overdueInvoiceCount} overdue</div>` : ""}
                </div>
              </div>
            </button>
          </uui-box>
        </div>

        <!-- Search and Tabs Row -->
        <div class="filters">
          <div class="filters-top">
            <div class="search-box">
              <uui-input
                type="text"
                placeholder="Search orders by invoice #, name, postcode, or email..."
                .value=${this._searchTerm}
                @input=${this._handleSearchInput}
                label="Search orders"
              >
                <uui-icon name="icon-search" slot="prepend"></uui-icon>
                ${this._searchTerm ? c`
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
            <div class="header-actions">
              ${this._selectedOrders.size > 0 ? c`
                    <uui-button
                      look="primary"
                      color="danger"
                      label="Delete"
                      ?disabled=${this._isDeleting}
                      @click=${this._handleDeleteSelected}
                    >
                      ${this._isDeleting ? "Deleting..." : `Delete (${this._selectedOrders.size})`}
                    </uui-button>
                  ` : ""}
              <uui-button look="secondary" label="Export" @click=${this._handleExport}>Export</uui-button>
              <uui-button look="primary" color="positive" label="Create order" @click=${this._handleCreateOrder}>Create order</uui-button>
            </div>
          </div>

          <uui-tab-group class="tabs">
            <uui-tab
              label="All"
              ?active=${this._activeTab === "all"}
              @click=${() => this._handleTabClick("all")}
            >
              All
            </uui-tab>
            <uui-tab
              label="Unfulfilled"
              ?active=${this._activeTab === "unfulfilled"}
              @click=${() => this._handleTabClick("unfulfilled")}
            >
              Unfulfilled
            </uui-tab>
            <uui-tab
              label="Unpaid"
              ?active=${this._activeTab === "unpaid"}
              @click=${() => this._handleTabClick("unpaid")}
            >
              Unpaid
            </uui-tab>
            <uui-tab
              label="Cancelled"
              ?active=${this._activeTab === "cancelled"}
              @click=${() => this._handleTabClick("cancelled")}
            >
              Cancelled
            </uui-tab>
          </uui-tab-group>
        </div>

        <!-- Orders Table -->
        ${this._renderOrdersContent()}
      </div>
      </umb-body-layout>
    `;
  }
};
u = /* @__PURE__ */ new WeakMap();
h = /* @__PURE__ */ new WeakMap();
d = /* @__PURE__ */ new WeakMap();
a.styles = [
  L,
  T`
    :host {
      display: block;
      height: 100%;
      background: var(--uui-color-background);
    }

    .stats-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: var(--uui-size-space-5);
      margin: 0;
    }

    .stats-grid uui-box {
      --uui-box-default-padding: var(--uui-size-space-4);
    }

    .stat-content {
      display: flex;
      align-items: center;
      gap: var(--uui-size-space-4);
    }

    .stat-icon {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 48px;
      height: 48px;
      border-radius: 12px;
      flex-shrink: 0;
    }

    .stat-icon uui-icon {
      font-size: 24px;
    }

    .stat-icon--orders {
      background: var(--uui-color-current-standalone);
      color: var(--uui-color-current-contrast);
    }

    .stat-icon--items {
      background: var(--uui-color-default-standalone);
      color: var(--uui-color-default-contrast);
    }

    .stat-icon--fulfilled {
      background: var(--uui-color-positive-standalone);
      color: var(--uui-color-positive-contrast);
    }

    .stat-icon--outstanding {
      background: var(--uui-color-warning-standalone);
      color: var(--uui-color-warning-contrast);
    }

    .stat-box--outstanding {
      --uui-box-default-padding: 0;
    }

    .stat-button {
      width: 100%;
      border: 0;
      background: transparent;
      padding: var(--uui-size-space-4);
      border-radius: inherit;
      text-align: left;
      cursor: pointer;
      transition: transform 0.15s ease, box-shadow 0.15s ease;
      color: inherit;
      font: inherit;
    }

    .stat-button:hover,
    .stat-button:focus-visible {
      transform: translateY(-2px);
      box-shadow: 0 4px 8px rgba(0, 0, 0, 0.08);
      outline: none;
    }

    .stat-content--clickable {
      position: relative;
    }

    .stat-overdue {
      font-size: 0.75rem;
      color: var(--uui-color-danger);
      font-weight: 600;
    }

    .stat-details {
      display: flex;
      flex-direction: column;
      gap: var(--uui-size-space-1);
    }

    .stat-number {
      font-size: 2rem;
      font-weight: 700;
      color: var(--uui-color-text);
      line-height: 1;
    }

    .stat-label {
      font-size: var(--uui-type-small-size);
      color: var(--uui-color-text-alt);
    }

    .search-box uui-icon[slot="prepend"] {
      margin-left: 2px;
      color: var(--uui-color-text-alt);
    }

    .loading {
      display: flex;
      justify-content: center;
      padding: var(--uui-size-space-6);
    }

    .error {
      display: flex;
      align-items: center;
      gap: var(--uui-size-space-2);
      padding: var(--uui-size-space-4);
      background: var(--uui-color-danger-standalone);
      color: var(--uui-color-danger-contrast);
      border-radius: var(--uui-border-radius);
    }

    .error span {
      flex: 1;
    }

    merchello-pagination {
      padding: var(--uui-size-space-3);
      border-top: 1px solid var(--uui-color-border);
    }
  `
];
r([
  o()
], a.prototype, "_orders", 2);
r([
  o()
], a.prototype, "_isLoading", 2);
r([
  o()
], a.prototype, "_errorMessage", 2);
r([
  o()
], a.prototype, "_page", 2);
r([
  o()
], a.prototype, "_pageSize", 2);
r([
  o()
], a.prototype, "_totalItems", 2);
r([
  o()
], a.prototype, "_totalPages", 2);
r([
  o()
], a.prototype, "_activeTab", 2);
r([
  o()
], a.prototype, "_selectedOrders", 2);
r([
  o()
], a.prototype, "_stats", 2);
r([
  o()
], a.prototype, "_searchTerm", 2);
r([
  o()
], a.prototype, "_isDeleting", 2);
a = r([
  S("merchello-orders-list")
], a);
const K = a;
export {
  a as MerchelloOrdersListElement,
  K as default
};
//# sourceMappingURL=orders-list.element-d1rckPWM.js.map
