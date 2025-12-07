import { LitElement as b, nothing as w, html as n, css as f, property as y, customElement as x, state as l } from "@umbraco-cms/backoffice/external/lit";
import { UmbElementMixin as O } from "@umbraco-cms/backoffice/element-api";
import { UmbModalToken as T, UMB_MODAL_MANAGER_CONTEXT as C } from "@umbraco-cms/backoffice/modal";
import { M as g } from "./merchello-api-ADr5A_m-.js";
import "./merchello-empty-state.element-mt97UoA5.js";
import { g as z } from "./order-table.element-BaTm9Se_.js";
function P(e) {
  if (e.totalItems === 0)
    return "0 items";
  const t = (e.page - 1) * e.pageSize + 1, a = Math.min(e.page * e.pageSize, e.totalItems);
  return `${t}-${a} of ${e.totalItems}`;
}
function m(e) {
  return e.page > 1;
}
function v(e) {
  return e.page < e.totalPages;
}
var E = Object.defineProperty, M = Object.getOwnPropertyDescriptor, _ = (e, t, a, r) => {
  for (var s = r > 1 ? void 0 : r ? M(t, a) : t, d = e.length - 1, c; d >= 0; d--)
    (c = e[d]) && (s = (r ? c(t, a, s) : c(s)) || s);
  return r && s && E(t, a, s), s;
};
let h = class extends O(b) {
  constructor() {
    super(...arguments), this.state = {
      page: 1,
      pageSize: 50,
      totalItems: 0,
      totalPages: 0
    }, this.disabled = !1;
  }
  _handlePrevious() {
    m(this.state) && !this.disabled && this._dispatchPageChange(this.state.page - 1);
  }
  _handleNext() {
    v(this.state) && !this.disabled && this._dispatchPageChange(this.state.page + 1);
  }
  _dispatchPageChange(e) {
    const t = { page: e };
    this.dispatchEvent(
      new CustomEvent("page-change", {
        detail: t,
        bubbles: !0,
        composed: !0
      })
    );
  }
  render() {
    if (this.state.totalItems === 0)
      return w;
    const e = m(this.state), t = v(this.state);
    return n`
      <div class="pagination">
        <span class="pagination-info">${P(this.state)}</span>
        <div class="pagination-controls">
          <uui-button
            look="secondary"
            compact
            ?disabled=${!e || this.disabled}
            @click=${this._handlePrevious}
            label="Previous page"
            title="Previous page"
          >
            <uui-icon name="icon-navigation-left"></uui-icon>
          </uui-button>
          <span class="pagination-page">${this.state.page} / ${this.state.totalPages}</span>
          <uui-button
            look="secondary"
            compact
            ?disabled=${!t || this.disabled}
            @click=${this._handleNext}
            label="Next page"
            title="Next page"
          >
            <uui-icon name="icon-navigation-right"></uui-icon>
          </uui-button>
        </div>
      </div>
    `;
  }
};
h.styles = f`
    :host {
      display: block;
    }

    .pagination {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: var(--uui-size-space-4);
      padding: var(--uui-size-space-3) 0;
    }

    .pagination-info {
      color: var(--uui-color-text-alt);
      font-size: var(--uui-type-small-size);
    }

    .pagination-controls {
      display: flex;
      align-items: center;
      gap: var(--uui-size-space-2);
    }

    .pagination-page {
      font-size: var(--uui-type-small-size);
      color: var(--uui-color-text);
      min-width: 60px;
      text-align: center;
    }

    .pagination-button {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 32px;
      height: 32px;
      padding: 0;
      border: 1px solid var(--uui-color-border);
      border-radius: var(--uui-border-radius);
      background: var(--uui-color-surface);
      color: var(--uui-color-text);
      cursor: pointer;
      transition: all 120ms ease;
    }

    .pagination-button:hover:not(:disabled) {
      background: var(--uui-color-surface-emphasis);
      border-color: var(--uui-color-border-emphasis);
    }

    .pagination-button:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }

    .pagination-button svg {
      width: 16px;
      height: 16px;
    }
  `;
_([
  y({ type: Object })
], h.prototype, "state", 2);
_([
  y({ type: Boolean })
], h.prototype, "disabled", 2);
h = _([
  x("merchello-pagination")
], h);
const D = new T("Merchello.Export.Modal", {
  modal: {
    type: "sidebar",
    size: "small"
  }
}), k = new T("Merchello.CreateOrder.Modal", {
  modal: {
    type: "sidebar",
    size: "large"
  }
});
var L = Object.defineProperty, I = Object.getOwnPropertyDescriptor, $ = (e) => {
  throw TypeError(e);
}, o = (e, t, a, r) => {
  for (var s = r > 1 ? void 0 : r ? I(t, a) : t, d = e.length - 1, c; d >= 0; d--)
    (c = e[d]) && (s = (r ? c(t, a, s) : c(s)) || s);
  return r && s && L(t, a, s), s;
}, S = (e, t, a) => t.has(e) || $("Cannot " + a), p = (e, t, a) => (S(e, t, "read from private field"), t.get(e)), A = (e, t, a) => t.has(e) ? $("Cannot add the same private member more than once") : t instanceof WeakSet ? t.add(e) : t.set(e, a), N = (e, t, a, r) => (S(e, t, "write to private field"), t.set(e, a), a), u;
let i = class extends O(b) {
  constructor() {
    super(), this._orders = [], this._isLoading = !0, this._errorMessage = null, this._page = 1, this._pageSize = 50, this._totalItems = 0, this._totalPages = 0, this._activeTab = "all", this._selectedOrders = /* @__PURE__ */ new Set(), this._stats = null, this._searchTerm = "", this._isDeleting = !1, this._searchDebounceTimer = null, A(this, u), this._tableColumns = [
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
    ], this.consumeContext(C, (e) => {
      N(this, u, e);
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
    const { data: t, error: a } = await g.getOrders(e);
    if (a) {
      this._errorMessage = a.message, this._isLoading = !1;
      return;
    }
    t && (this._orders = t.items, this._totalItems = t.totalItems, this._totalPages = t.totalPages), this._isLoading = !1;
  }
  async _loadStats() {
    const { data: e } = await g.getOrderStats();
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
    const a = Array.from(this._selectedOrders), { error: r } = await g.deleteOrders(a);
    if (this._isDeleting = !1, r) {
      this._errorMessage = `Failed to delete orders: ${r.message}`;
      return;
    }
    this._selectedOrders = /* @__PURE__ */ new Set(), this._loadOrders(), this._loadStats();
  }
  async _handleExport() {
    p(this, u) && p(this, u).open(this, D, {
      data: {}
    });
  }
  async _handleCreateOrder() {
    if (!p(this, u)) return;
    const t = await p(this, u).open(this, k, {
      data: {}
    }).onSubmit().catch(() => {
    });
    t?.created && t.invoiceId && (window.location.href = z(t.invoiceId));
  }
  _renderLoadingState() {
    return n`<div class="loading"><uui-loader></uui-loader></div>`;
  }
  _renderErrorState() {
    return n`<div class="error">${this._errorMessage}</div>`;
  }
  _renderEmptyState() {
    return n`
      <merchello-empty-state
        icon="icon-receipt-dollar"
        headline="No orders found"
        message="Orders will appear here once customers place them.">
      </merchello-empty-state>
    `;
  }
  _renderOrdersTable() {
    return n`
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
    return n`
      <umb-body-layout header-fit-height main-no-padding>
      <div class="orders-container">
        <!-- Header Actions -->
        <div class="header-actions">
          ${this._selectedOrders.size > 0 ? n`
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
              ${this._searchTerm ? n`
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
u = /* @__PURE__ */ new WeakMap();
i.styles = f`
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
      background: #f8d7da;
      color: #721c24;
      border-radius: var(--uui-border-radius);
    }

    merchello-pagination {
      padding: var(--uui-size-space-3);
      border-top: 1px solid var(--uui-color-border);
    }
  `;
o([
  l()
], i.prototype, "_orders", 2);
o([
  l()
], i.prototype, "_isLoading", 2);
o([
  l()
], i.prototype, "_errorMessage", 2);
o([
  l()
], i.prototype, "_page", 2);
o([
  l()
], i.prototype, "_pageSize", 2);
o([
  l()
], i.prototype, "_totalItems", 2);
o([
  l()
], i.prototype, "_totalPages", 2);
o([
  l()
], i.prototype, "_activeTab", 2);
o([
  l()
], i.prototype, "_selectedOrders", 2);
o([
  l()
], i.prototype, "_stats", 2);
o([
  l()
], i.prototype, "_searchTerm", 2);
o([
  l()
], i.prototype, "_isDeleting", 2);
i = o([
  x("merchello-orders-list")
], i);
const F = i;
export {
  i as MerchelloOrdersListElement,
  F as default
};
//# sourceMappingURL=orders-list.element-UASs8Q14.js.map
