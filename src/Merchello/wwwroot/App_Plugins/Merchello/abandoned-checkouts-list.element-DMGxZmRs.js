import { LitElement as C, nothing as p, html as s, css as w, state as n, customElement as $ } from "@umbraco-cms/backoffice/external/lit";
import { UmbElementMixin as x } from "@umbraco-cms/backoffice/element-api";
import { UMB_NOTIFICATION_CONTEXT as T } from "@umbraco-cms/backoffice/notification";
import { M as b } from "./merchello-api-BAKL0aIE.js";
import { g as R } from "./store-settings-BZqgqZ5a.js";
import { c as f, i as z } from "./formatting-CG1-kUla.js";
import "./pagination.element-sDi4Myhy.js";
import "./merchello-empty-state.element-mt97UoA5.js";
var S = Object.defineProperty, A = Object.getOwnPropertyDescriptor, y = (e) => {
  throw TypeError(e);
}, o = (e, a, t, l) => {
  for (var u = l > 1 ? void 0 : l ? A(a, t) : a, v = e.length - 1, m; v >= 0; v--)
    (m = e[v]) && (u = (l ? m(a, t, u) : m(u)) || u);
  return l && u && S(a, t, u), u;
}, k = (e, a, t) => a.has(e) || y("Cannot " + t), r = (e, a, t) => (k(e, a, "read from private field"), a.get(e)), _ = (e, a, t) => a.has(e) ? y("Cannot add the same private member more than once") : a instanceof WeakSet ? a.add(e) : a.set(e, t), g = (e, a, t, l) => (k(e, a, "write to private field"), a.set(e, t), t), c, d, h;
let i = class extends x(C) {
  constructor() {
    super(), this._checkouts = [], this._stats = null, this._isLoading = !0, this._errorMessage = null, this._page = 1, this._pageSize = 50, this._totalItems = 0, this._totalPages = 0, this._activeTab = "all", this._searchTerm = "", _(this, c), _(this, d, !1), _(this, h), this.consumeContext(T, (e) => {
      g(this, c, e);
    });
  }
  connectedCallback() {
    super.connectedCallback(), g(this, d, !0), this._initializeAndLoad();
  }
  disconnectedCallback() {
    super.disconnectedCallback(), g(this, d, !1), r(this, h) && clearTimeout(r(this, h));
  }
  async _initializeAndLoad() {
    const e = await R();
    r(this, d) && (this._pageSize = e.defaultPaginationPageSize, this._loadStats(), this._loadCheckouts());
  }
  async _loadStats() {
    const { data: e, error: a } = await b.getAbandonedCheckoutStats();
    r(this, d) && (a || e && (this._stats = e));
  }
  async _loadCheckouts() {
    this._isLoading = !0, this._errorMessage = null;
    const e = {
      page: this._page,
      pageSize: this._pageSize,
      orderBy: "DateAbandoned",
      descending: !0
    };
    this._searchTerm.trim() && (e.search = this._searchTerm.trim()), this._activeTab !== "all" && (e.status = this._activeTab.charAt(0).toUpperCase() + this._activeTab.slice(1));
    const { data: a, error: t } = await b.getAbandonedCheckouts(e);
    if (r(this, d)) {
      if (t) {
        this._errorMessage = t.message, this._isLoading = !1;
        return;
      }
      a && (this._checkouts = a.items, this._totalItems = a.totalItems, this._totalPages = a.totalPages), this._isLoading = !1;
    }
  }
  _handleTabClick(e) {
    this._activeTab = e, this._page = 1, this._loadCheckouts();
  }
  _handleSearchInput(e) {
    const a = e.target.value;
    r(this, h) && clearTimeout(r(this, h)), g(this, h, window.setTimeout(() => {
      this._searchTerm = a, this._page = 1, this._loadCheckouts();
    }, 300));
  }
  _handlePageChange(e) {
    this._page = e.detail.page, this._loadCheckouts();
  }
  async _handleCopyLink(e, a) {
    a.stopPropagation();
    const { data: t, error: l } = await b.regenerateRecoveryLink(e.id);
    if (l) {
      r(this, c)?.peek("danger", {
        data: {
          headline: "Error",
          message: "Failed to generate recovery link."
        }
      });
      return;
    }
    if (t?.recoveryLink)
      try {
        await navigator.clipboard.writeText(t.recoveryLink), r(this, c)?.peek("positive", {
          data: {
            headline: "Link Copied",
            message: "Recovery link copied to clipboard."
          }
        });
      } catch {
        r(this, c)?.peek("danger", {
          data: {
            headline: "Error",
            message: "Failed to copy link to clipboard."
          }
        });
      }
  }
  async _handleResendEmail(e, a) {
    a.stopPropagation();
    const { data: t, error: l } = await b.resendRecoveryEmail(e.id);
    if (l) {
      r(this, c)?.peek("danger", {
        data: {
          headline: "Error",
          message: l.message || "Failed to send recovery email."
        }
      });
      return;
    }
    t?.success && (r(this, c)?.peek("positive", {
      data: {
        headline: "Email Sent",
        message: t.message || "Recovery email sent successfully."
      }
    }), this._loadCheckouts());
  }
  _renderStats() {
    return this._stats ? s`
      <div class="stats-grid">
        <uui-box class="stat-card">
          <div class="stat-value">${this._stats.totalAbandoned}</div>
          <div class="stat-label">Total Abandoned</div>
        </uui-box>
        <uui-box class="stat-card">
          <div class="stat-value">${f(this._stats.recoveryRate, 1)}%</div>
          <div class="stat-label">Recovery Rate</div>
        </uui-box>
        <uui-box class="stat-card">
          <div class="stat-value">${f(this._stats.conversionRate, 1)}%</div>
          <div class="stat-label">Conversion Rate</div>
        </uui-box>
        <uui-box class="stat-card">
          <div class="stat-value">${this._stats.formattedValueRecovered}</div>
          <div class="stat-label">Value Recovered</div>
        </uui-box>
      </div>
    ` : p;
  }
  _renderFilterRow() {
    return s`
      <div class="filter-row">
        <uui-tab-group>
          <uui-tab
            label="All"
            ?active=${this._activeTab === "all"}
            @click=${() => this._handleTabClick("all")}>
            All
          </uui-tab>
          <uui-tab
            label="Abandoned"
            ?active=${this._activeTab === "abandoned"}
            @click=${() => this._handleTabClick("abandoned")}>
            Abandoned
          </uui-tab>
          <uui-tab
            label="Recovered"
            ?active=${this._activeTab === "recovered"}
            @click=${() => this._handleTabClick("recovered")}>
            Recovered
          </uui-tab>
          <uui-tab
            label="Converted"
            ?active=${this._activeTab === "converted"}
            @click=${() => this._handleTabClick("converted")}>
            Converted
          </uui-tab>
        </uui-tab-group>
        <uui-input
          type="search"
          placeholder="Search by email..."
          @input=${this._handleSearchInput}
          label="Search abandoned checkouts">
          <uui-icon name="icon-search" slot="prepend"></uui-icon>
        </uui-input>
      </div>
    `;
  }
  _renderTable() {
    return this._checkouts.length === 0 ? s`
        <merchello-empty-state
          icon="icon-shopping-basket-alt-2"
          headline="No Abandoned Checkouts"
          message="No abandoned checkouts found matching your criteria.">
        </merchello-empty-state>
      ` : s`
      <div class="table-container">
        <uui-table class="checkouts-table">
          <uui-table-head>
            <uui-table-head-cell>Customer</uui-table-head-cell>
            <uui-table-head-cell>Total</uui-table-head-cell>
            <uui-table-head-cell>Status</uui-table-head-cell>
            <uui-table-head-cell>Abandoned</uui-table-head-cell>
            <uui-table-head-cell>Emails Sent</uui-table-head-cell>
            <uui-table-head-cell>Actions</uui-table-head-cell>
          </uui-table-head>
          ${this._checkouts.map((e) => this._renderRow(e))}
        </uui-table>
      </div>
    `;
  }
  _renderRow(e) {
    const a = e.statusDisplay === "Abandoned" && e.customerEmail;
    return s`
      <uui-table-row>
        <uui-table-cell>
          <span class="customer-email">${e.customerEmail || "Guest"}</span>
          ${e.customerName ? s`<br><span class="customer-name">${e.customerName}</span>` : p}
        </uui-table-cell>
        <uui-table-cell>
          <span class="amount">${e.formattedTotal}</span>
          <br><span class="item-count">${e.itemCount} item${e.itemCount !== 1 ? "s" : ""}</span>
        </uui-table-cell>
        <uui-table-cell>
          <span class="badge ${e.statusCssClass}">${e.statusDisplay}</span>
        </uui-table-cell>
        <uui-table-cell>
          ${e.dateAbandoned ? s`<span class="date">${z(e.dateAbandoned)}</span>` : s`<span class="no-date">-</span>`}
        </uui-table-cell>
        <uui-table-cell>
          <span class="emails-sent">${e.recoveryEmailsSent} of 3</span>
        </uui-table-cell>
        <uui-table-cell class="actions-cell">
          <uui-button
            compact
            look="secondary"
            label="Copy Recovery Link"
            title="Copy Recovery Link"
            @click=${(t) => this._handleCopyLink(e, t)}>
            <uui-icon name="icon-link"></uui-icon>
          </uui-button>
          ${a ? s`
                <uui-button
                  compact
                  look="secondary"
                  label="Resend Email"
                  title="Resend Recovery Email"
                  @click=${(t) => this._handleResendEmail(e, t)}>
                  <uui-icon name="icon-message"></uui-icon>
                </uui-button>
              ` : p}
        </uui-table-cell>
      </uui-table-row>
    `;
  }
  render() {
    return s`
      <div class="abandoned-checkouts-list">
        ${this._renderStats()}
        ${this._renderFilterRow()}

        ${this._errorMessage ? s`<div class="error-banner">${this._errorMessage}</div>` : p}

        ${this._isLoading ? s`<div class="loading" role="status" aria-label="Loading abandoned checkouts"><uui-loader></uui-loader></div>` : this._renderTable()}

        ${this._totalPages > 1 ? s`
              <merchello-pagination
                .page=${this._page}
                .pageSize=${this._pageSize}
                .totalItems=${this._totalItems}
                .totalPages=${this._totalPages}
                @page-change=${this._handlePageChange}>
              </merchello-pagination>
            ` : p}
      </div>
    `;
  }
};
c = /* @__PURE__ */ new WeakMap();
d = /* @__PURE__ */ new WeakMap();
h = /* @__PURE__ */ new WeakMap();
i.styles = w`
    :host {
      display: block;
      padding: var(--uui-size-space-5);
    }

    .abandoned-checkouts-list {
      display: flex;
      flex-direction: column;
      gap: var(--uui-size-space-4);
    }

    /* Stats Grid */
    .stats-grid {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: var(--uui-size-space-4);
    }

    @media (max-width: 1200px) {
      .stats-grid {
        grid-template-columns: repeat(2, 1fr);
      }
    }

    @media (max-width: 600px) {
      .stats-grid {
        grid-template-columns: 1fr;
      }
    }

    .stat-card {
      text-align: center;
      padding: var(--uui-size-space-4);
    }

    .stat-value {
      font-size: 2rem;
      font-weight: 700;
      color: var(--uui-color-text);
    }

    .stat-label {
      font-size: 0.875rem;
      color: var(--uui-color-text-alt);
      margin-top: var(--uui-size-space-1);
    }

    /* Filter Row */
    .filter-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: var(--uui-size-space-4);
      flex-wrap: wrap;
    }

    uui-input[type="search"] {
      width: 280px;
    }

    /* Table */
    .table-container {
      overflow-x: auto;
      background: var(--uui-color-surface);
      border: 1px solid var(--uui-color-border);
      border-radius: var(--uui-border-radius);
    }

    .checkouts-table {
      width: 100%;
    }

    uui-table-head-cell,
    uui-table-cell {
      white-space: nowrap;
    }

    .customer-email {
      font-weight: 600;
    }

    .customer-name {
      font-size: 0.875rem;
      color: var(--uui-color-text-alt);
    }

    .amount {
      font-weight: 600;
    }

    .item-count {
      font-size: 0.75rem;
      color: var(--uui-color-text-alt);
    }

    .date {
      font-size: 0.875rem;
    }

    .no-date {
      color: var(--uui-color-text-alt);
    }

    .emails-sent {
      font-size: 0.875rem;
    }

    .actions-cell {
      display: flex;
      gap: var(--uui-size-space-2);
    }

    /* Badges */
    .badge {
      display: inline-block;
      padding: 2px 8px;
      font-size: 0.6875rem;
      font-weight: 600;
      text-transform: uppercase;
      border-radius: var(--uui-border-radius);
    }

    .badge-default {
      background: var(--uui-color-surface-alt);
      color: var(--uui-color-text-alt);
    }

    .badge-warning {
      background: var(--uui-color-warning);
      color: var(--uui-color-warning-contrast);
    }

    .badge-info {
      background: var(--uui-color-current);
      color: var(--uui-color-current-contrast);
    }

    .badge-positive {
      background: var(--uui-color-positive);
      color: var(--uui-color-positive-contrast);
    }

    .badge-danger {
      background: var(--uui-color-danger);
      color: var(--uui-color-danger-contrast);
    }

    /* Error */
    .error-banner {
      padding: var(--uui-size-space-3);
      background: var(--uui-color-danger-standalone);
      color: var(--uui-color-danger-contrast);
      border-radius: var(--uui-border-radius);
    }

    /* Loading */
    .loading {
      display: flex;
      justify-content: center;
      padding: var(--uui-size-space-6);
    }
  `;
o([
  n()
], i.prototype, "_checkouts", 2);
o([
  n()
], i.prototype, "_stats", 2);
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
], i.prototype, "_searchTerm", 2);
i = o([
  $("merchello-abandoned-checkouts-list")
], i);
const O = i;
export {
  i as MerchelloAbandonedCheckoutsListElement,
  O as default
};
//# sourceMappingURL=abandoned-checkouts-list.element-DMGxZmRs.js.map
