import { LitElement as x, html as c, css as T, state as r, customElement as O } from "@umbraco-cms/backoffice/external/lit";
import { UmbElementMixin as C } from "@umbraco-cms/backoffice/element-api";
import { UmbModalToken as b, UMB_MODAL_MANAGER_CONTEXT as S } from "@umbraco-cms/backoffice/modal";
import { UMB_NOTIFICATION_CONTEXT as $ } from "@umbraco-cms/backoffice/notification";
import { M as g } from "./merchello-api-CCwReUh_.js";
import "./pagination.element-sDi4Myhy.js";
import "./merchello-empty-state.element-mt97UoA5.js";
import "./order-table.element-V7O--GAY.js";
import { n as k } from "./navigation-m-idaC9i.js";
const w = new b("Merchello.Export.Modal", {
  modal: {
    type: "sidebar",
    size: "medium"
  }
}), M = new b("Merchello.CreateOrder.Modal", {
  modal: {
    type: "sidebar",
    size: "large"
  }
});
var z = Object.defineProperty, D = Object.getOwnPropertyDescriptor, f = (e) => {
  throw TypeError(e);
}, s = (e, t, i, l) => {
  for (var d = l > 1 ? void 0 : l ? D(t, i) : t, _ = e.length - 1, m; _ >= 0; _--)
    (m = e[_]) && (d = (l ? m(t, i, d) : m(d)) || d);
  return l && d && z(t, i, d), d;
}, y = (e, t, i) => t.has(e) || f("Cannot " + i), o = (e, t, i) => (y(e, t, "read from private field"), t.get(e)), v = (e, t, i) => t.has(e) ? f("Cannot add the same private member more than once") : t instanceof WeakSet ? t.add(e) : t.set(e, i), p = (e, t, i, l) => (y(e, t, "write to private field"), t.set(e, i), i), u, h, n;
let a = class extends C(x) {
  constructor() {
    super(), this._orders = [], this._isLoading = !0, this._errorMessage = null, this._page = 1, this._pageSize = 50, this._totalItems = 0, this._totalPages = 0, this._activeTab = "all", this._selectedOrders = /* @__PURE__ */ new Set(), this._stats = null, this._searchTerm = "", this._isDeleting = !1, this._searchDebounceTimer = null, v(this, u), v(this, h), v(this, n, !1), this._tableColumns = [
      "select",
      "invoiceNumber",
      "date",
      "customer",
      "channel",
      "total",
      "paymentStatus",
      "fulfillmentStatus",
      "itemCount",
      "deliveryMethod"
    ], this.consumeContext(S, (e) => {
      p(this, u, e);
    }), this.consumeContext($, (e) => {
      p(this, h, e);
    });
  }
  connectedCallback() {
    super.connectedCallback(), p(this, n, !0), this._loadOrders(), this._loadStats();
  }
  disconnectedCallback() {
    super.disconnectedCallback(), p(this, n, !1), this._searchDebounceTimer && clearTimeout(this._searchDebounceTimer);
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
    if (o(this, n)) {
      if (i) {
        this._errorMessage = i.message, this._isLoading = !1;
        return;
      }
      t && (this._orders = t.items, this._totalItems = t.totalItems, this._totalPages = t.totalPages), this._isLoading = !1;
    }
  }
  async _loadStats() {
    const { data: e } = await g.getOrderStats();
    o(this, n) && e && (this._stats = e);
  }
  _handleTabClick(e) {
    this._activeTab = e, this._page = 1, this._loadOrders();
  }
  _handleSearchInput(e) {
    const i = e.target.value;
    this._searchDebounceTimer && clearTimeout(this._searchDebounceTimer), this._searchDebounceTimer = setTimeout(() => {
      this._searchTerm = i, this._page = 1, this._loadOrders();
    }, 300);
  }
  _handleSearchClear() {
    this._searchTerm = "", this._page = 1, this._loadOrders();
  }
  _handlePageChange(e) {
    this._page = e.detail.page, this._loadOrders();
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
  async _handleDeleteSelected() {
    const e = this._selectedOrders.size;
    if (e === 0 || !confirm(
      `Are you sure you want to delete ${e} order${e !== 1 ? "s" : ""}? This action cannot be undone.`
    )) return;
    this._isDeleting = !0;
    const i = Array.from(this._selectedOrders), { error: l } = await g.deleteOrders(i);
    if (o(this, n)) {
      if (this._isDeleting = !1, l) {
        this._errorMessage = `Failed to delete orders: ${l.message}`, o(this, h)?.peek("danger", {
          data: { headline: "Failed to delete", message: l.message || "Could not delete orders" }
        });
        return;
      }
      o(this, h)?.peek("positive", {
        data: { headline: "Orders deleted", message: `${e} order${e !== 1 ? "s" : ""} deleted successfully` }
      }), this._selectedOrders = /* @__PURE__ */ new Set(), this._loadOrders(), this._loadStats();
    }
  }
  async _handleExport() {
    o(this, u) && o(this, u).open(this, w, {
      data: {}
    });
  }
  async _handleCreateOrder() {
    if (!o(this, u)) return;
    const t = await o(this, u).open(this, M, {
      data: {}
    }).onSubmit().catch(() => {
    });
    o(this, n) && t?.isCreated && t.invoiceId && k(t.invoiceId);
  }
  _renderLoadingState() {
    return c`<div class="loading"><uui-loader></uui-loader></div>`;
  }
  _renderErrorState() {
    return c`<div class="error">${this._errorMessage}</div>`;
  }
  _renderEmptyState() {
    return c`
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
        .selectedIds=${Array.from(this._selectedOrders)}
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
      <div class="orders-container">
        <!-- Header Actions -->
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
          <uui-box>
            <div class="stat-content">
              <div class="stat-icon stat-icon--delivered">
                <uui-icon name="icon-truck"></uui-icon>
              </div>
              <div class="stat-details">
                <div class="stat-number">${this._stats?.ordersDeliveredToday ?? 0}</div>
                <div class="stat-label">Orders Delivered</div>
              </div>
            </div>
          </uui-box>
        </div>

        <!-- Search and Tabs Row -->
        <div class="search-tabs-row">
          <!-- Search Box -->
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
n = /* @__PURE__ */ new WeakMap();
a.styles = T`
    :host {
      display: block;
      height: 100%;
      background: var(--uui-color-background);
    }

    .orders-container {
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

    .stats-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: var(--uui-size-space-5);
      margin-bottom: var(--uui-size-space-5);
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
      background: rgba(59, 130, 246, 0.15);
      color: #3b82f6;
    }

    .stat-icon--items {
      background: rgba(168, 85, 247, 0.15);
      color: #a855f7;
    }

    .stat-icon--fulfilled {
      background: rgba(34, 197, 94, 0.15);
      color: #22c55e;
    }

    .stat-icon--delivered {
      background: rgba(249, 115, 22, 0.15);
      color: #f97316;
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
s([
  r()
], a.prototype, "_orders", 2);
s([
  r()
], a.prototype, "_isLoading", 2);
s([
  r()
], a.prototype, "_errorMessage", 2);
s([
  r()
], a.prototype, "_page", 2);
s([
  r()
], a.prototype, "_pageSize", 2);
s([
  r()
], a.prototype, "_totalItems", 2);
s([
  r()
], a.prototype, "_totalPages", 2);
s([
  r()
], a.prototype, "_activeTab", 2);
s([
  r()
], a.prototype, "_selectedOrders", 2);
s([
  r()
], a.prototype, "_stats", 2);
s([
  r()
], a.prototype, "_searchTerm", 2);
s([
  r()
], a.prototype, "_isDeleting", 2);
a = s([
  O("merchello-orders-list")
], a);
const B = a;
export {
  a as MerchelloOrdersListElement,
  B as default
};
//# sourceMappingURL=orders-list.element-CPchHrtN.js.map
