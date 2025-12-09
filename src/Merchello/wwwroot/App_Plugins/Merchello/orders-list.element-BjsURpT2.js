import { LitElement as g, html as d, css as b, state as s, customElement as f } from "@umbraco-cms/backoffice/external/lit";
import { UmbElementMixin as y } from "@umbraco-cms/backoffice/element-api";
import { UmbModalToken as _, UMB_MODAL_MANAGER_CONTEXT as O } from "@umbraco-cms/backoffice/modal";
import { M as p } from "./merchello-api-C2InYbkz.js";
import "./pagination.element-sDi4Myhy.js";
import "./merchello-empty-state.element-mt97UoA5.js";
import "./order-table.element-DEwc7IIr.js";
import { n as T } from "./navigation-Cp3wi1pC.js";
const S = new _("Merchello.Export.Modal", {
  modal: {
    type: "sidebar",
    size: "medium"
  }
}), x = new _("Merchello.CreateOrder.Modal", {
  modal: {
    type: "sidebar",
    size: "large"
  }
});
var C = Object.defineProperty, $ = Object.getOwnPropertyDescriptor, m = (e) => {
  throw TypeError(e);
}, i = (e, t, a, o) => {
  for (var l = o > 1 ? void 0 : o ? $(t, a) : t, u = e.length - 1, h; u >= 0; u--)
    (h = e[u]) && (l = (o ? h(t, a, l) : h(l)) || l);
  return o && l && C(t, a, l), l;
}, v = (e, t, a) => t.has(e) || m("Cannot " + a), c = (e, t, a) => (v(e, t, "read from private field"), t.get(e)), w = (e, t, a) => t.has(e) ? m("Cannot add the same private member more than once") : t instanceof WeakSet ? t.add(e) : t.set(e, a), M = (e, t, a, o) => (v(e, t, "write to private field"), t.set(e, a), a), n;
let r = class extends y(g) {
  constructor() {
    super(), this._orders = [], this._isLoading = !0, this._errorMessage = null, this._page = 1, this._pageSize = 50, this._totalItems = 0, this._totalPages = 0, this._activeTab = "all", this._selectedOrders = /* @__PURE__ */ new Set(), this._stats = null, this._searchTerm = "", this._isDeleting = !1, this._searchDebounceTimer = null, w(this, n), this._tableColumns = [
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
    ], this.consumeContext(O, (e) => {
      M(this, n, e);
    });
  }
  connectedCallback() {
    super.connectedCallback(), this._loadOrders(), this._loadStats();
  }
  disconnectedCallback() {
    super.disconnectedCallback(), this._searchDebounceTimer && clearTimeout(this._searchDebounceTimer);
  }
  async _loadOrders() {
    this._isLoading = !0, this._errorMessage = null;
    const e = {
      page: this._page,
      pageSize: this._pageSize,
      sortBy: "date",
      sortDir: "desc"
    };
    this._searchTerm.trim() && (e.search = this._searchTerm.trim()), this._activeTab === "unfulfilled" ? e.fulfillmentStatus = "unfulfilled" : this._activeTab === "unpaid" && (e.paymentStatus = "unpaid");
    const { data: t, error: a } = await p.getOrders(e);
    if (a) {
      this._errorMessage = a.message, this._isLoading = !1;
      return;
    }
    t && (this._orders = t.items, this._totalItems = t.totalItems, this._totalPages = t.totalPages), this._isLoading = !1;
  }
  async _loadStats() {
    const { data: e } = await p.getOrderStats();
    e && (this._stats = e);
  }
  _handleTabClick(e) {
    this._activeTab = e, this._page = 1, this._loadOrders();
  }
  _handleSearchInput(e) {
    const a = e.target.value;
    this._searchDebounceTimer && clearTimeout(this._searchDebounceTimer), this._searchDebounceTimer = setTimeout(() => {
      this._searchTerm = a, this._page = 1, this._loadOrders();
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
    const a = Array.from(this._selectedOrders), { error: o } = await p.deleteOrders(a);
    if (this._isDeleting = !1, o) {
      this._errorMessage = `Failed to delete orders: ${o.message}`;
      return;
    }
    this._selectedOrders = /* @__PURE__ */ new Set(), this._loadOrders(), this._loadStats();
  }
  async _handleExport() {
    c(this, n) && c(this, n).open(this, S, {
      data: {}
    });
  }
  async _handleCreateOrder() {
    if (!c(this, n)) return;
    const t = await c(this, n).open(this, x, {
      data: {}
    }).onSubmit().catch(() => {
    });
    t?.created && t.invoiceId && T(t.invoiceId);
  }
  _renderLoadingState() {
    return d`<div class="loading"><uui-loader></uui-loader></div>`;
  }
  _renderErrorState() {
    return d`<div class="error">${this._errorMessage}</div>`;
  }
  _renderEmptyState() {
    return d`
      <merchello-empty-state
        icon="icon-receipt-dollar"
        headline="No orders found"
        message="Orders will appear here once customers place them.">
      </merchello-empty-state>
    `;
  }
  _renderOrdersTable() {
    return d`
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
    return d`
      <umb-body-layout header-fit-height main-no-padding>
      <div class="orders-container">
        <!-- Header Actions -->
        <div class="header-actions">
          ${this._selectedOrders.size > 0 ? d`
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

        <!-- Stats Bar -->
        <div class="stats-bar">
          <div class="stat-item">
            <div class="stat-label">Today</div>
            <div class="stat-value">Orders</div>
            <div class="stat-number">${this._stats?.ordersToday ?? 0}</div>
          </div>
          <div class="stat-item">
            <div class="stat-label">Items ordered</div>
            <div class="stat-number">${this._stats?.itemsOrderedToday ?? 0}</div>
          </div>
          <div class="stat-item">
            <div class="stat-label">Orders fulfilled</div>
            <div class="stat-number">${this._stats?.ordersFulfilledToday ?? 0}</div>
          </div>
          <div class="stat-item">
            <div class="stat-label">Orders delivered</div>
            <div class="stat-number">${this._stats?.ordersDeliveredToday ?? 0}</div>
          </div>
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
              ${this._searchTerm ? d`
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
          </uui-tab-group>
        </div>

        <!-- Orders Table -->
        ${this._renderOrdersContent()}
      </div>
      </umb-body-layout>
    `;
  }
};
n = /* @__PURE__ */ new WeakMap();
r.styles = b`
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

    .stats-bar {
      display: flex;
      gap: var(--uui-size-space-4);
      padding: var(--uui-size-space-4);
      background: var(--uui-color-surface);
      border: 1px solid var(--uui-color-border);
      border-radius: var(--uui-border-radius);
      margin-bottom: var(--uui-size-space-4);
      overflow-x: auto;
    }

    .stat-item {
      flex: 1;
      min-width: 120px;
    }

    .stat-label {
      font-size: 0.75rem;
      color: var(--uui-color-text-alt);
      margin-bottom: var(--uui-size-space-1);
    }

    .stat-value {
      font-size: 0.875rem;
      font-weight: 500;
    }

    .stat-number {
      font-size: 0.875rem;
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
i([
  s()
], r.prototype, "_orders", 2);
i([
  s()
], r.prototype, "_isLoading", 2);
i([
  s()
], r.prototype, "_errorMessage", 2);
i([
  s()
], r.prototype, "_page", 2);
i([
  s()
], r.prototype, "_pageSize", 2);
i([
  s()
], r.prototype, "_totalItems", 2);
i([
  s()
], r.prototype, "_totalPages", 2);
i([
  s()
], r.prototype, "_activeTab", 2);
i([
  s()
], r.prototype, "_selectedOrders", 2);
i([
  s()
], r.prototype, "_stats", 2);
i([
  s()
], r.prototype, "_searchTerm", 2);
i([
  s()
], r.prototype, "_isDeleting", 2);
r = i([
  f("merchello-orders-list")
], r);
const R = r;
export {
  r as MerchelloOrdersListElement,
  R as default
};
//# sourceMappingURL=orders-list.element-BjsURpT2.js.map
