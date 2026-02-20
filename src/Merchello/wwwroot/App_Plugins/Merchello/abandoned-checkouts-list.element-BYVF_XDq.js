import { LitElement as A, html as s, nothing as _, css as x, state as u, customElement as R } from "@umbraco-cms/backoffice/external/lit";
import { UmbElementMixin as w } from "@umbraco-cms/backoffice/element-api";
import { UMB_NOTIFICATION_CONTEXT as E } from "@umbraco-cms/backoffice/notification";
import { M as g } from "./merchello-api-B76CV0sD.js";
import { g as L } from "./store-settings-7zNVo6g4.js";
import { d as z, b, c as I } from "./formatting-MfE1tvkN.js";
import "./pagination.element-sDi4Myhy.js";
import "./merchello-empty-state.element-D2dcD7_8.js";
import "./merchello-status-badge.element-DZtAtyQ1.js";
import { c as M } from "./collection-layout.styles-I8XQedsa.js";
var P = Object.defineProperty, B = Object.getOwnPropertyDescriptor, T = (e) => {
  throw TypeError(e);
}, l = (e, t, a, c) => {
  for (var o = c > 1 ? void 0 : c ? B(t, a) : t, C = e.length - 1, k; C >= 0; C--)
    (k = e[C]) && (o = (c ? k(t, a, o) : k(o)) || o);
  return c && o && P(t, a, o), o;
}, S = (e, t, a) => t.has(e) || T("Cannot " + a), i = (e, t, a) => (S(e, t, "read from private field"), t.get(e)), m = (e, t, a) => t.has(e) ? T("Cannot add the same private member more than once") : t instanceof WeakSet ? t.add(e) : t.set(e, a), p = (e, t, a, c) => (S(e, t, "write to private field"), t.set(e, a), a), $ = (e, t, a, c) => ({
  set _(o) {
    p(e, t, o);
  },
  get _() {
    return i(e, t);
  }
}), d, n, h, y, f;
const v = 3, V = 300, D = {
  abandoned: "Abandoned",
  recovered: "Recovered",
  converted: "Converted"
};
let r = class extends w(A) {
  constructor() {
    super(), this._checkouts = [], this._stats = null, this._isLoading = !0, this._isStatsLoading = !1, this._errorMessage = null, this._page = 1, this._pageSize = 50, this._totalItems = 0, this._totalPages = 0, this._activeTab = "all", this._searchTerm = "", this._searchInputValue = "", this._busyActions = /* @__PURE__ */ new Set(), m(this, d), m(this, n, !1), m(this, h, null), m(this, y, 0), m(this, f, 0), this.consumeContext(E, (e) => {
      p(this, d, e);
    });
  }
  connectedCallback() {
    super.connectedCallback(), p(this, n, !0), this._initializeAndLoad();
  }
  disconnectedCallback() {
    super.disconnectedCallback(), p(this, n, !1), i(this, h) && (clearTimeout(i(this, h)), p(this, h, null));
  }
  async _initializeAndLoad() {
    try {
      const e = await L();
      if (!i(this, n)) return;
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
    return t && (e.search = t), this._activeTab !== "all" && (e.status = D[this._activeTab]), e;
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
    const c = this._getActionKey(e, t), o = new Set(this._busyActions);
    a ? o.add(c) : o.delete(c), this._busyActions = o;
  }
  _canResend(e) {
    return e.status === "Abandoned" && !!e.customerEmail && e.recoveryEmailsSent < v;
  }
  _getResendTitle(e) {
    return e.customerEmail ? e.recoveryEmailsSent >= v ? `Maximum ${v} recovery emails already sent` : e.status !== "Abandoned" ? "Recovery email is available only for abandoned checkouts" : "Resend recovery email" : "No customer email available for resend";
  }
  _formatDateTitle(e) {
    const t = new Date(e);
    return Number.isNaN(t.getTime()) ? e : t.toLocaleString();
  }
  _renderDateValue(e) {
    return e ? s`
      <span class="date-value" title=${this._formatDateTitle(e)}>
        ${z(e)}
      </span>
    ` : s`<span class="no-date">-</span>`;
  }
  async _loadStats() {
    this._isStatsLoading = !0;
    const e = ++$(this, f)._, { data: t, error: a } = await g.getAbandonedCheckoutStats();
    if (!(!i(this, n) || e !== i(this, f))) {
      if (a) {
        this._isStatsLoading = !1;
        return;
      }
      this._stats = t ?? null, this._isStatsLoading = !1;
    }
  }
  async _loadCheckouts() {
    this._isLoading = !0, this._errorMessage = null;
    const e = ++$(this, y)._, { data: t, error: a } = await g.getAbandonedCheckouts(this._getQueryParams());
    if (!(!i(this, n) || e !== i(this, y))) {
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
    this._searchInputValue = e.target.value, i(this, h) && clearTimeout(i(this, h)), p(this, h, setTimeout(() => {
      i(this, n) && (this._searchTerm = this._searchInputValue.trim(), this._page = 1, this._loadCheckouts());
    }, V));
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
        const { data: t, error: a } = await g.regenerateRecoveryLink(e.id);
        if (!i(this, n)) return;
        if (a || !t?.recoveryLink) {
          i(this, d)?.peek("danger", {
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
          if (await navigator.clipboard.writeText(t.recoveryLink), !i(this, n)) return;
          i(this, d)?.peek("positive", {
            data: {
              headline: "Recovery link copied",
              message: "The recovery link was copied to your clipboard."
            }
          });
        } catch {
          i(this, d)?.peek("danger", {
            data: {
              headline: "Copy failed",
              message: "Could not copy the recovery link to your clipboard."
            }
          });
        }
      } finally {
        i(this, n) && this._setActionBusy("copy", e.id, !1);
      }
    }
  }
  async _handleResendEmail(e) {
    if (!(!this._canResend(e) || this._isActionBusy("resend", e.id))) {
      this._setActionBusy("resend", e.id, !0);
      try {
        const { data: t, error: a } = await g.resendRecoveryEmail(e.id);
        if (!i(this, n)) return;
        if (a || !t?.success) {
          i(this, d)?.peek("danger", {
            data: {
              headline: "Email send failed",
              message: a?.message || t?.message || "Failed to send recovery email."
            }
          });
          return;
        }
        i(this, d)?.peek("positive", {
          data: {
            headline: "Recovery email sent",
            message: t.message || "Recovery email sent successfully."
          }
        }), await Promise.all([this._loadCheckouts(), this._loadStats()]);
      } finally {
        i(this, n) && this._setActionBusy("resend", e.id, !1);
      }
    }
  }
  _handleRetry() {
    this._loadCheckouts(), this._loadStats();
  }
  _renderStats() {
    return this._isStatsLoading && !this._stats ? s`
        <div class="stats-grid">
          <uui-box><uui-loader-bar></uui-loader-bar></uui-box>
          <uui-box><uui-loader-bar></uui-loader-bar></uui-box>
          <uui-box><uui-loader-bar></uui-loader-bar></uui-box>
          <uui-box><uui-loader-bar></uui-loader-bar></uui-box>
        </div>
      ` : this._stats ? s`
      <div class="stats-grid">
        <uui-box class="stat-card">
          <div class="stat-label">Abandoned</div>
          <div class="stat-value">${b(this._stats.totalAbandoned)}</div>
        </uui-box>
        <uui-box class="stat-card">
          <div class="stat-label">Recovered</div>
          <div class="stat-value">${b(this._stats.totalRecovered)}</div>
          <div class="stat-meta">${b(this._stats.recoveryRate, 1)}% recovery rate</div>
        </uui-box>
        <uui-box class="stat-card">
          <div class="stat-label">Converted</div>
          <div class="stat-value">${b(this._stats.totalConverted)}</div>
          <div class="stat-meta">${b(this._stats.conversionRate, 1)}% conversion rate</div>
        </uui-box>
        <uui-box class="stat-card">
          <div class="stat-label">Value Recovered</div>
          <div class="stat-value">${this._stats.formattedValueRecovered}</div>
        </uui-box>
      </div>
    ` : _;
  }
  _renderFilters() {
    return s`
      <div class="filters">
        <div class="filters-top">
          <div class="search-box">
            <uui-input
              type="search"
              .value=${this._searchInputValue}
              placeholder="Search by customer email..."
              label="Search abandoned checkouts"
              @input=${this._handleSearchInput}
            >
              <uui-icon name="icon-search" slot="prepend"></uui-icon>
              ${this._searchInputValue ? s`
                    <uui-button
                      slot="append"
                      compact
                      look="secondary"
                      label="Clear search"
                      @click=${this._handleSearchClear}
                    >
                      <uui-icon name="icon-wrong"></uui-icon>
                    </uui-button>
                  ` : _}
            </uui-input>
          </div>

          ${this._hasActiveFilters() ? s`
                <uui-button
                  look="secondary"
                  label="Reset filters"
                  @click=${this._handleResetFilters}
                >
                  Reset
                </uui-button>
              ` : _}
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
      </div>
    `;
  }
  _renderErrorState() {
    return s`
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
    return s`
      <div class="loading" role="status" aria-live="polite" aria-label="Loading abandoned checkouts">
        <uui-loader></uui-loader>
      </div>
    `;
  }
  _renderEmptyState() {
    return this._hasActiveFilters() ? s`
        <merchello-empty-state
          icon="icon-search"
          headline="No abandoned checkouts match your filters"
          message="Try a different search term or reset filters."
        >
          <uui-button slot="actions" look="secondary" label="Reset filters" @click=${this._handleResetFilters}>
            Reset filters
          </uui-button>
        </merchello-empty-state>
      ` : s`
      <merchello-empty-state
        icon="icon-shopping-basket-alt-2"
        headline="No abandoned checkouts yet"
        message="Checkouts will appear here when customers leave without completing payment."
      >
      </merchello-empty-state>
    `;
  }
  _renderRow(e) {
    const t = this._canResend(e), a = this._isActionBusy("copy", e.id), c = this._isActionBusy("resend", e.id);
    return s`
      <uui-table-row>
        <uui-table-cell>
          <div class="customer-cell">
            <span class="customer-email">${e.customerEmail || "Guest checkout"}</span>
            ${e.customerName ? s`<span class="customer-name">${e.customerName}</span>` : _}
          </div>
        </uui-table-cell>
        <uui-table-cell>
          <div class="amount-cell">
            <span class="amount-value">${e.formattedTotal}</span>
            <span class="item-count">${I(e.itemCount)}</span>
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
            <span>${e.recoveryEmailsSent} / ${v}</span>
            ${e.recoveryEmailsSent >= v ? s`<span class="email-limit-label">Max reached</span>` : _}
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
          ${e.customerEmail ? s`
                <uui-button
                  compact
                  look="secondary"
                  label="Resend recovery email"
                  title=${this._getResendTitle(e)}
                  ?disabled=${!t || c}
                  @click=${() => this._handleResendEmail(e)}
                >
                  <uui-icon name="icon-message"></uui-icon>
                  ${c ? "Sending..." : "Resend"}
                </uui-button>
              ` : _}
        </uui-table-cell>
      </uui-table-row>
    `;
  }
  _renderTable() {
    return this._checkouts.length === 0 ? this._renderEmptyState() : s`
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
    return s`
      <umb-body-layout header-fit-height main-no-padding>
        <div class="abandoned-checkouts-container layout-container">
          ${this._renderStats()}
          ${this._renderFilters()}
          ${this._renderContent()}
          ${this._totalPages > 1 && !this._errorMessage ? s`
                <merchello-pagination
                  .state=${this._getPaginationState()}
                  .disabled=${this._isLoading}
                  @page-change=${this._handlePageChange}
                ></merchello-pagination>
              ` : _}
        </div>
      </umb-body-layout>
    `;
  }
};
d = /* @__PURE__ */ new WeakMap();
n = /* @__PURE__ */ new WeakMap();
h = /* @__PURE__ */ new WeakMap();
y = /* @__PURE__ */ new WeakMap();
f = /* @__PURE__ */ new WeakMap();
r.styles = [
  M,
  x`
    :host {
      display: block;
      height: 100%;
      background: var(--uui-color-background);
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

    .search-box {
      width: 100%;
      max-width: 460px;
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
  `
];
l([
  u()
], r.prototype, "_checkouts", 2);
l([
  u()
], r.prototype, "_stats", 2);
l([
  u()
], r.prototype, "_isLoading", 2);
l([
  u()
], r.prototype, "_isStatsLoading", 2);
l([
  u()
], r.prototype, "_errorMessage", 2);
l([
  u()
], r.prototype, "_page", 2);
l([
  u()
], r.prototype, "_pageSize", 2);
l([
  u()
], r.prototype, "_totalItems", 2);
l([
  u()
], r.prototype, "_totalPages", 2);
l([
  u()
], r.prototype, "_activeTab", 2);
l([
  u()
], r.prototype, "_searchTerm", 2);
l([
  u()
], r.prototype, "_searchInputValue", 2);
l([
  u()
], r.prototype, "_busyActions", 2);
r = l([
  R("merchello-abandoned-checkouts-list")
], r);
const H = r;
export {
  r as MerchelloAbandonedCheckoutsListElement,
  H as default
};
//# sourceMappingURL=abandoned-checkouts-list.element-BYVF_XDq.js.map
