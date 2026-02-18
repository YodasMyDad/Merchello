import { LitElement as T, html as r, property as w, customElement as A, nothing as b, css as L, state as c } from "@umbraco-cms/backoffice/external/lit";
import { UmbElementMixin as R } from "@umbraco-cms/backoffice/element-api";
import { UMB_NOTIFICATION_CONTEXT as P } from "@umbraco-cms/backoffice/notification";
import { M as C } from "./merchello-api-Dp_zU_yi.js";
import { g as I } from "./store-settings-CHgA9WE7.js";
import { e as M, c as v, d as B } from "./formatting-B_f6AiQh.js";
import "./pagination.element-sDi4Myhy.js";
import "./merchello-empty-state.element-mt97UoA5.js";
import { b as D } from "./badge.styles-C7D4rnJo.js";
var V = Object.defineProperty, O = Object.getOwnPropertyDescriptor, k = (e, t, a, l) => {
  for (var i = l > 1 ? void 0 : l ? O(t, a) : t, p = e.length - 1, _; p >= 0; p--)
    (_ = e[p]) && (i = (l ? _(t, a, i) : _(i)) || i);
  return l && i && V(t, a, i), i;
};
let f = class extends R(T) {
  constructor() {
    super(...arguments), this.cssClass = "", this.label = "";
  }
  render() {
    return r`<span class="badge ${this.cssClass}">${this.label}</span>`;
  }
};
f.styles = [D];
k([
  w({ type: String })
], f.prototype, "cssClass", 2);
k([
  w({ type: String })
], f.prototype, "label", 2);
f = k([
  A("merchello-status-badge")
], f);
var N = Object.defineProperty, F = Object.getOwnPropertyDescriptor, E = (e) => {
  throw TypeError(e);
}, n = (e, t, a, l) => {
  for (var i = l > 1 ? void 0 : l ? F(t, a) : t, p = e.length - 1, _; p >= 0; p--)
    (_ = e[p]) && (i = (l ? _(t, a, i) : _(i)) || i);
  return l && i && N(t, a, i), i;
}, z = (e, t, a) => t.has(e) || E("Cannot " + a), s = (e, t, a) => (z(e, t, "read from private field"), t.get(e)), g = (e, t, a) => t.has(e) ? E("Cannot add the same private member more than once") : t instanceof WeakSet ? t.add(e) : t.set(e, a), m = (e, t, a, l) => (z(e, t, "write to private field"), t.set(e, a), a), S = (e, t, a, l) => ({
  set _(i) {
    m(e, t, i);
  },
  get _() {
    return s(e, t);
  }
}), d, u, h, x, $;
const y = 3, W = 300, U = {
  abandoned: "Abandoned",
  recovered: "Recovered",
  converted: "Converted"
};
let o = class extends R(T) {
  constructor() {
    super(), this._checkouts = [], this._stats = null, this._isLoading = !0, this._isStatsLoading = !1, this._errorMessage = null, this._page = 1, this._pageSize = 50, this._totalItems = 0, this._totalPages = 0, this._activeTab = "all", this._searchTerm = "", this._searchInputValue = "", this._busyActions = /* @__PURE__ */ new Set(), g(this, d), g(this, u, !1), g(this, h, null), g(this, x, 0), g(this, $, 0), this.consumeContext(P, (e) => {
      m(this, d, e);
    });
  }
  connectedCallback() {
    super.connectedCallback(), m(this, u, !0), this._initializeAndLoad();
  }
  disconnectedCallback() {
    super.disconnectedCallback(), m(this, u, !1), s(this, h) && (clearTimeout(s(this, h)), m(this, h, null));
  }
  async _initializeAndLoad() {
    try {
      const e = await I();
      if (!s(this, u)) return;
      this._pageSize = e.defaultPaginationPageSize;
    } catch {
    }
    await Promise.all([this._loadStats(), this._loadCheckouts()]);
  }
  _getQueryParams() {
    const e = {
      page: this._page,
      pageSize: this._pageSize,
      orderBy: "DateAbandoned",
      descending: !0
    }, t = this._searchTerm.trim();
    return t && (e.search = t), this._activeTab !== "all" && (e.status = U[this._activeTab]), e;
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
    return this._activeTab !== "all" || this._searchTerm.trim().length > 0;
  }
  _getActionKey(e, t) {
    return `${e}:${t}`;
  }
  _isActionBusy(e, t) {
    return this._busyActions.has(this._getActionKey(e, t));
  }
  _setActionBusy(e, t, a) {
    const l = this._getActionKey(e, t), i = new Set(this._busyActions);
    a ? i.add(l) : i.delete(l), this._busyActions = i;
  }
  _canResend(e) {
    return e.status === "Abandoned" && !!e.customerEmail && e.recoveryEmailsSent < y;
  }
  _getResendTitle(e) {
    return e.customerEmail ? e.recoveryEmailsSent >= y ? `Maximum ${y} recovery emails already sent` : e.status !== "Abandoned" ? "Recovery email is available only for abandoned checkouts" : "Resend recovery email" : "No customer email available for resend";
  }
  _formatDateTitle(e) {
    const t = new Date(e);
    return Number.isNaN(t.getTime()) ? e : t.toLocaleString();
  }
  _renderDateValue(e) {
    return e ? r`
      <span class="date-value" title=${this._formatDateTitle(e)}>
        ${M(e)}
      </span>
    ` : r`<span class="no-date">-</span>`;
  }
  async _loadStats() {
    this._isStatsLoading = !0;
    const e = ++S(this, $)._, { data: t, error: a } = await C.getAbandonedCheckoutStats();
    if (!(!s(this, u) || e !== s(this, $))) {
      if (a) {
        this._isStatsLoading = !1;
        return;
      }
      this._stats = t ?? null, this._isStatsLoading = !1;
    }
  }
  async _loadCheckouts() {
    this._isLoading = !0, this._errorMessage = null;
    const e = ++S(this, x)._, { data: t, error: a } = await C.getAbandonedCheckouts(this._getQueryParams());
    if (!(!s(this, u) || e !== s(this, x))) {
      if (a) {
        this._errorMessage = a.message || "Unable to load abandoned checkouts.", this._checkouts = [], this._totalItems = 0, this._totalPages = 0, this._isLoading = !1;
        return;
      }
      this._checkouts = t?.items ?? [], this._totalItems = t?.totalItems ?? 0, this._totalPages = t?.totalPages ?? 0, this._isLoading = !1;
    }
  }
  _handleTabClick(e) {
    this._activeTab !== e && (this._activeTab = e, this._page = 1, this._loadCheckouts());
  }
  _handleSearchInput(e) {
    this._searchInputValue = e.target.value, s(this, h) && clearTimeout(s(this, h)), m(this, h, setTimeout(() => {
      s(this, u) && (this._searchTerm = this._searchInputValue.trim(), this._page = 1, this._loadCheckouts());
    }, W));
  }
  _handleSearchClear() {
    !this._searchInputValue && !this._searchTerm || (this._searchInputValue = "", this._searchTerm = "", this._page = 1, this._loadCheckouts());
  }
  _handleResetFilters() {
    this._activeTab = "all", this._searchInputValue = "", this._searchTerm = "", this._page = 1, this._loadCheckouts();
  }
  _handlePageChange(e) {
    this._page !== e.detail.page && (this._page = e.detail.page, this._loadCheckouts());
  }
  async _handleCopyLink(e) {
    if (!this._isActionBusy("copy", e.id)) {
      this._setActionBusy("copy", e.id, !0);
      try {
        const { data: t, error: a } = await C.regenerateRecoveryLink(e.id);
        if (!s(this, u)) return;
        if (a || !t?.recoveryLink) {
          s(this, d)?.peek("danger", {
            data: {
              headline: "Link generation failed",
              message: a?.message || "Failed to generate recovery link."
            }
          });
          return;
        }
        try {
          if (!navigator.clipboard?.writeText)
            throw new Error("Clipboard API unavailable");
          if (await navigator.clipboard.writeText(t.recoveryLink), !s(this, u)) return;
          s(this, d)?.peek("positive", {
            data: {
              headline: "Recovery link copied",
              message: "The recovery link was copied to your clipboard."
            }
          });
        } catch {
          s(this, d)?.peek("danger", {
            data: {
              headline: "Copy failed",
              message: "Could not copy the recovery link to your clipboard."
            }
          });
        }
      } finally {
        s(this, u) && this._setActionBusy("copy", e.id, !1);
      }
    }
  }
  async _handleResendEmail(e) {
    if (!(!this._canResend(e) || this._isActionBusy("resend", e.id))) {
      this._setActionBusy("resend", e.id, !0);
      try {
        const { data: t, error: a } = await C.resendRecoveryEmail(e.id);
        if (!s(this, u)) return;
        if (a || !t?.success) {
          s(this, d)?.peek("danger", {
            data: {
              headline: "Email send failed",
              message: a?.message || t?.message || "Failed to send recovery email."
            }
          });
          return;
        }
        s(this, d)?.peek("positive", {
          data: {
            headline: "Recovery email sent",
            message: t.message || "Recovery email sent successfully."
          }
        }), await Promise.all([this._loadCheckouts(), this._loadStats()]);
      } finally {
        s(this, u) && this._setActionBusy("resend", e.id, !1);
      }
    }
  }
  _handleRetry() {
    this._loadCheckouts(), this._loadStats();
  }
  _renderStats() {
    return this._isStatsLoading && !this._stats ? r`
        <div class="stats-grid">
          <uui-box><uui-loader-bar></uui-loader-bar></uui-box>
          <uui-box><uui-loader-bar></uui-loader-bar></uui-box>
          <uui-box><uui-loader-bar></uui-loader-bar></uui-box>
          <uui-box><uui-loader-bar></uui-loader-bar></uui-box>
        </div>
      ` : this._stats ? r`
      <div class="stats-grid">
        <uui-box class="stat-card">
          <div class="stat-label">Abandoned</div>
          <div class="stat-value">${v(this._stats.totalAbandoned)}</div>
        </uui-box>
        <uui-box class="stat-card">
          <div class="stat-label">Recovered</div>
          <div class="stat-value">${v(this._stats.totalRecovered)}</div>
          <div class="stat-meta">${v(this._stats.recoveryRate, 1)}% recovery rate</div>
        </uui-box>
        <uui-box class="stat-card">
          <div class="stat-label">Converted</div>
          <div class="stat-value">${v(this._stats.totalConverted)}</div>
          <div class="stat-meta">${v(this._stats.conversionRate, 1)}% conversion rate</div>
        </uui-box>
        <uui-box class="stat-card">
          <div class="stat-label">Value Recovered</div>
          <div class="stat-value">${this._stats.formattedValueRecovered}</div>
        </uui-box>
      </div>
    ` : b;
  }
  _renderFilters() {
    return r`
      <div class="filters-row">
        <div class="search-box">
          <uui-input
            type="search"
            .value=${this._searchInputValue}
            placeholder="Search by customer email..."
            label="Search abandoned checkouts"
            @input=${this._handleSearchInput}
          >
            <uui-icon name="icon-search" slot="prepend"></uui-icon>
            ${this._searchInputValue ? r`
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

        <div class="tab-actions">
          <uui-tab-group>
            <uui-tab
              label="All"
              ?active=${this._activeTab === "all"}
              @click=${() => this._handleTabClick("all")}
            >
              All
            </uui-tab>
            <uui-tab
              label="Abandoned"
              ?active=${this._activeTab === "abandoned"}
              @click=${() => this._handleTabClick("abandoned")}
            >
              Abandoned
            </uui-tab>
            <uui-tab
              label="Recovered"
              ?active=${this._activeTab === "recovered"}
              @click=${() => this._handleTabClick("recovered")}
            >
              Recovered
            </uui-tab>
            <uui-tab
              label="Converted"
              ?active=${this._activeTab === "converted"}
              @click=${() => this._handleTabClick("converted")}
            >
              Converted
            </uui-tab>
          </uui-tab-group>

          ${this._hasActiveFilters() ? r`
                <uui-button
                  look="secondary"
                  label="Reset filters"
                  @click=${this._handleResetFilters}
                >
                  Reset
                </uui-button>
              ` : b}
        </div>
      </div>
    `;
  }
  _renderErrorState() {
    return r`
      <div class="error-banner" role="alert">
        <uui-icon name="icon-alert"></uui-icon>
        <span>${this._errorMessage}</span>
        <uui-button
          look="secondary"
          label="Retry loading abandoned checkouts"
          @click=${this._handleRetry}
        >
          Retry
        </uui-button>
      </div>
    `;
  }
  _renderLoadingState() {
    return r`
      <div class="loading" role="status" aria-live="polite" aria-label="Loading abandoned checkouts">
        <uui-loader></uui-loader>
      </div>
    `;
  }
  _renderEmptyState() {
    return this._hasActiveFilters() ? r`
        <merchello-empty-state
          icon="icon-search"
          headline="No abandoned checkouts match your filters"
          message="Try a different search term or reset filters."
        >
          <uui-button slot="actions" look="secondary" label="Reset filters" @click=${this._handleResetFilters}>
            Reset filters
          </uui-button>
        </merchello-empty-state>
      ` : r`
      <merchello-empty-state
        icon="icon-shopping-basket-alt-2"
        headline="No abandoned checkouts yet"
        message="Checkouts will appear here when customers leave without completing payment."
      >
      </merchello-empty-state>
    `;
  }
  _renderRow(e) {
    const t = this._canResend(e), a = this._isActionBusy("copy", e.id), l = this._isActionBusy("resend", e.id);
    return r`
      <uui-table-row>
        <uui-table-cell>
          <div class="customer-cell">
            <span class="customer-email">${e.customerEmail || "Guest checkout"}</span>
            ${e.customerName ? r`<span class="customer-name">${e.customerName}</span>` : b}
          </div>
        </uui-table-cell>
        <uui-table-cell>
          <div class="amount-cell">
            <span class="amount-value">${e.formattedTotal}</span>
            <span class="item-count">${B(e.itemCount)}</span>
          </div>
        </uui-table-cell>
        <uui-table-cell>
          <merchello-status-badge
            .cssClass=${e.statusCssClass}
            .label=${e.statusDisplay}
          ></merchello-status-badge>
        </uui-table-cell>
        <uui-table-cell>${this._renderDateValue(e.dateAbandoned)}</uui-table-cell>
        <uui-table-cell>${this._renderDateValue(e.lastActivityUtc)}</uui-table-cell>
        <uui-table-cell>
          <div class="email-count-cell">
            <span>${e.recoveryEmailsSent} / ${y}</span>
            ${e.recoveryEmailsSent >= y ? r`<span class="email-limit-label">Max reached</span>` : b}
          </div>
        </uui-table-cell>
        <uui-table-cell class="actions-cell">
          <uui-button
            compact
            look="secondary"
            label="Copy recovery link"
            ?disabled=${a}
            @click=${() => this._handleCopyLink(e)}
          >
            <uui-icon name="icon-link"></uui-icon>
            ${a ? "Copying..." : "Copy link"}
          </uui-button>
          ${e.customerEmail ? r`
                <uui-button
                  compact
                  look="secondary"
                  label="Resend recovery email"
                  title=${this._getResendTitle(e)}
                  ?disabled=${!t || l}
                  @click=${() => this._handleResendEmail(e)}
                >
                  <uui-icon name="icon-message"></uui-icon>
                  ${l ? "Sending..." : "Resend"}
                </uui-button>
              ` : b}
        </uui-table-cell>
      </uui-table-row>
    `;
  }
  _renderTable() {
    return this._checkouts.length === 0 ? this._renderEmptyState() : r`
      <div class="table-container">
        <uui-table class="checkouts-table">
          <uui-table-head>
            <uui-table-head-cell>Customer</uui-table-head-cell>
            <uui-table-head-cell>Total</uui-table-head-cell>
            <uui-table-head-cell>Status</uui-table-head-cell>
            <uui-table-head-cell>Date Abandoned</uui-table-head-cell>
            <uui-table-head-cell>Last Activity</uui-table-head-cell>
            <uui-table-head-cell>Emails Sent</uui-table-head-cell>
            <uui-table-head-cell class="actions-header">Actions</uui-table-head-cell>
          </uui-table-head>
          ${this._checkouts.map((e) => this._renderRow(e))}
        </uui-table>
      </div>
    `;
  }
  _renderContent() {
    return this._isLoading ? this._renderLoadingState() : this._errorMessage ? this._renderErrorState() : this._renderTable();
  }
  render() {
    return r`
      <umb-body-layout header-fit-height main-no-padding>
        <div class="abandoned-checkouts-container">
          ${this._renderStats()}
          ${this._renderFilters()}
          ${this._renderContent()}
          ${this._totalPages > 1 && !this._errorMessage ? r`
                <merchello-pagination
                  .state=${this._getPaginationState()}
                  .disabled=${this._isLoading}
                  @page-change=${this._handlePageChange}
                ></merchello-pagination>
              ` : b}
        </div>
      </umb-body-layout>
    `;
  }
};
d = /* @__PURE__ */ new WeakMap();
u = /* @__PURE__ */ new WeakMap();
h = /* @__PURE__ */ new WeakMap();
x = /* @__PURE__ */ new WeakMap();
$ = /* @__PURE__ */ new WeakMap();
o.styles = L`
    :host {
      display: block;
      height: 100%;
      background: var(--uui-color-background);
    }

    .abandoned-checkouts-container {
      max-width: 100%;
      padding: var(--uui-size-layout-1);
      display: flex;
      flex-direction: column;
      gap: var(--uui-size-space-4);
    }

    .stats-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
      gap: var(--uui-size-space-4);
    }

    .stats-grid uui-box {
      --uui-box-default-padding: var(--uui-size-space-4);
    }

    .stat-card {
      display: grid;
      gap: var(--uui-size-space-1);
    }

    .stat-label {
      color: var(--uui-color-text-alt);
      font-size: var(--uui-type-small-size);
    }

    .stat-value {
      color: var(--uui-color-text);
      font-size: 1.75rem;
      font-weight: 700;
      line-height: 1.1;
    }

    .stat-meta {
      color: var(--uui-color-text-alt);
      font-size: var(--uui-type-small-size);
    }

    .filters-row {
      display: flex;
      flex-direction: column;
      gap: var(--uui-size-space-3);
    }

    @media (min-width: 1024px) {
      .filters-row {
        flex-direction: row;
        align-items: flex-end;
        justify-content: space-between;
      }
    }

    .search-box {
      width: 100%;
      max-width: 460px;
    }

    .search-box uui-input {
      width: 100%;
    }

    .tab-actions {
      display: flex;
      align-items: center;
      gap: var(--uui-size-space-2);
      flex-wrap: wrap;
    }

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
      vertical-align: middle;
    }

    .customer-cell,
    .amount-cell,
    .email-count-cell {
      display: flex;
      flex-direction: column;
      gap: var(--uui-size-space-1);
    }

    .customer-email,
    .amount-value {
      font-weight: 600;
      color: var(--uui-color-text);
    }

    .customer-name,
    .item-count,
    .email-limit-label,
    .no-date {
      color: var(--uui-color-text-alt);
      font-size: var(--uui-type-small-size);
    }

    .date-value {
      font-size: var(--uui-type-small-size);
    }

    .email-limit-label {
      color: var(--uui-color-danger);
      font-weight: 600;
    }

    .actions-header {
      text-align: right;
    }

    .actions-cell {
      display: flex;
      justify-content: flex-end;
      gap: var(--uui-size-space-2);
    }

    .loading {
      display: flex;
      justify-content: center;
      padding: var(--uui-size-space-6);
    }

    .error-banner {
      display: flex;
      align-items: center;
      gap: var(--uui-size-space-2);
      padding: var(--uui-size-space-4);
      border-radius: var(--uui-border-radius);
      background: var(--uui-color-danger-standalone);
      color: var(--uui-color-danger-contrast);
    }

    .error-banner span {
      flex: 1;
    }
  `;
n([
  c()
], o.prototype, "_checkouts", 2);
n([
  c()
], o.prototype, "_stats", 2);
n([
  c()
], o.prototype, "_isLoading", 2);
n([
  c()
], o.prototype, "_isStatsLoading", 2);
n([
  c()
], o.prototype, "_errorMessage", 2);
n([
  c()
], o.prototype, "_page", 2);
n([
  c()
], o.prototype, "_pageSize", 2);
n([
  c()
], o.prototype, "_totalItems", 2);
n([
  c()
], o.prototype, "_totalPages", 2);
n([
  c()
], o.prototype, "_activeTab", 2);
n([
  c()
], o.prototype, "_searchTerm", 2);
n([
  c()
], o.prototype, "_searchInputValue", 2);
n([
  c()
], o.prototype, "_busyActions", 2);
o = n([
  A("merchello-abandoned-checkouts-list")
], o);
const Z = o;
export {
  o as MerchelloAbandonedCheckoutsListElement,
  Z as default
};
//# sourceMappingURL=abandoned-checkouts-list.element-Bv2moSUg.js.map
