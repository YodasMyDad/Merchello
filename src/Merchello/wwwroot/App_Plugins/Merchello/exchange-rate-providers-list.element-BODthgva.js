import { LitElement as z, html as t, nothing as m, css as R, state as l, customElement as w } from "@umbraco-cms/backoffice/external/lit";
import { UmbElementMixin as E } from "@umbraco-cms/backoffice/element-api";
import { UmbModalToken as _, UMB_MODAL_MANAGER_CONTEXT as k } from "@umbraco-cms/backoffice/modal";
import { UMB_NOTIFICATION_CONTEXT as C } from "@umbraco-cms/backoffice/notification";
import { M as v } from "./merchello-api-B2ha_6NF.js";
import { b as M } from "./store-settings-BtulKSil.js";
const $ = new _("Merchello.ExchangeRateProvider.Config.Modal", {
  modal: {
    type: "sidebar",
    size: "medium"
  }
}), A = new _("Merchello.TestExchangeRateProvider.Modal", {
  modal: {
    type: "sidebar",
    size: "medium"
  }
});
var P = Object.defineProperty, L = Object.getOwnPropertyDescriptor, x = (e) => {
  throw TypeError(e);
}, d = (e, i, a, p) => {
  for (var n = p > 1 ? void 0 : p ? L(i, a) : i, g = e.length - 1, f; g >= 0; g--)
    (f = e[g]) && (n = (p ? f(i, a, n) : f(n)) || n);
  return p && n && P(i, a, n), n;
}, y = (e, i, a) => i.has(e) || x("Cannot " + a), s = (e, i, a) => (y(e, i, "read from private field"), i.get(e)), b = (e, i, a) => i.has(e) ? x("Cannot add the same private member more than once") : i instanceof WeakSet ? i.add(e) : i.set(e, a), h = (e, i, a, p) => (y(e, i, "write to private field"), i.set(e, a), a), c, u, o;
let r = class extends E(z) {
  constructor() {
    super(), this._providers = [], this._snapshot = null, this._isLoading = !0, this._isRefreshing = !1, this._errorMessage = null, this._storeCurrency = "USD", b(this, c), b(this, u), b(this, o, !1), this.consumeContext(k, (e) => {
      h(this, c, e);
    }), this.consumeContext(C, (e) => {
      h(this, u, e);
    });
  }
  connectedCallback() {
    super.connectedCallback(), h(this, o, !0), this._loadData();
  }
  disconnectedCallback() {
    super.disconnectedCallback(), h(this, o, !1);
  }
  async _loadData() {
    this._isLoading = !0, this._errorMessage = null;
    try {
      const e = await M();
      e && (this._storeCurrency = e.currencyCode);
      const [i, a] = await Promise.all([
        v.getExchangeRateProviders(),
        v.getExchangeRateSnapshot()
      ]);
      if (!s(this, o)) return;
      if (i.error) {
        this._errorMessage = i.error.message, this._isLoading = !1;
        return;
      }
      this._providers = i.data ?? [], this._snapshot = a.data ?? null;
    } catch (e) {
      if (!s(this, o)) return;
      this._errorMessage = e instanceof Error ? e.message : "Failed to load providers";
    }
    this._isLoading = !1;
  }
  async _activateProvider(e) {
    if (e.isActive) return;
    const { error: i } = await v.activateExchangeRateProvider(e.alias);
    if (s(this, o)) {
      if (i) {
        s(this, u)?.peek("danger", {
          data: { headline: "Error", message: i.message }
        });
        return;
      }
      s(this, u)?.peek("positive", {
        data: {
          headline: "Success",
          message: `${e.displayName} is now the active exchange rate provider`
        }
      }), await this._loadData();
    }
  }
  async _refreshRates() {
    this._isRefreshing = !0;
    const { error: e } = await v.refreshExchangeRates();
    if (s(this, o)) {
      if (this._isRefreshing = !1, e) {
        s(this, u)?.peek("danger", {
          data: { headline: "Error", message: e.message }
        });
        return;
      }
      s(this, u)?.peek("positive", {
        data: { headline: "Success", message: "Exchange rates refreshed" }
      }), await this._loadData();
    }
  }
  _openConfigModal(e) {
    if (!s(this, c)) return;
    s(this, c).open(this, $, {
      data: { provider: e }
    }).onSubmit().then((a) => {
      a?.isSaved && this._loadData();
    }).catch(() => {
    });
  }
  _openTestModal(e) {
    s(this, c) && s(this, c).open(this, A, {
      data: { provider: e }
    });
  }
  _formatDate(e) {
    return e ? new Date(e).toLocaleString() : "Never";
  }
  _getActiveProvider() {
    return this._providers.find((e) => e.isActive);
  }
  _renderStatusBox() {
    const e = this._getActiveProvider(), i = this._snapshot?.rates ? Object.keys(this._snapshot.rates).length : 0, a = this._formatDate(this._snapshot?.lastFetchedAt ?? this._snapshot?.timestampUtc);
    return t`
      <uui-box>
        <div class="status-header">
          <div class="status-title">
            <uui-icon name="icon-globe"></uui-icon>
            <span>Exchange Rate Status</span>
          </div>
          <uui-button
            look="primary"
            label="Refresh Rates"
            ?disabled=${this._isRefreshing || !e}
            @click=${this._refreshRates}
          >
            ${this._isRefreshing ? t`<uui-loader-circle></uui-loader-circle>` : t`<uui-icon name="icon-sync"></uui-icon>`}
            ${this._isRefreshing ? "Refreshing..." : "Refresh Now"}
          </uui-button>
        </div>

        <div class="status-grid">
          <div class="status-card">
            <div class="status-card-icon">
              <uui-icon name="icon-server-alt"></uui-icon>
            </div>
            <div class="status-card-content">
              <span class="status-card-label">Active Provider</span>
              <span class="status-card-value">${e?.displayName ?? "None configured"}</span>
            </div>
          </div>

          <div class="status-card">
            <div class="status-card-icon">
              <uui-icon name="icon-coins-dollar-alt"></uui-icon>
            </div>
            <div class="status-card-content">
              <span class="status-card-label">Base Currency</span>
              <span class="status-card-value">${this._snapshot?.baseCurrency ?? this._storeCurrency}</span>
            </div>
          </div>

          <div class="status-card">
            <div class="status-card-icon">
              <uui-icon name="icon-axis-rotation"></uui-icon>
            </div>
            <div class="status-card-content">
              <span class="status-card-label">Available Rates</span>
              <span class="status-card-value">${i} <span class="status-card-unit">currencies</span></span>
            </div>
          </div>

          <div class="status-card">
            <div class="status-card-icon">
              <uui-icon name="icon-time"></uui-icon>
            </div>
            <div class="status-card-content">
              <span class="status-card-label">Last Updated</span>
              <span class="status-card-value small">${a}</span>
            </div>
          </div>
        </div>
      </uui-box>
    `;
  }
  _renderProvider(e) {
    return t`
      <div class="provider-card ${e.isActive ? "active" : ""}">
        <div class="provider-main">
          <div class="provider-info">
            <div class="provider-icon">
              ${e.icon ? t`<uui-icon name="${e.icon}"></uui-icon>` : t`<uui-icon name="icon-globe"></uui-icon>`}
            </div>
            <div class="provider-details">
              <span class="provider-name">${e.displayName}</span>
              <span class="provider-alias">${e.alias}</span>
              ${e.description ? t`<p class="provider-description">${e.description}</p>` : m}
            </div>
          </div>

          <div class="provider-actions">
            ${e.isActive ? t`<span class="active-badge"><uui-icon name="icon-check"></uui-icon> Active</span>` : t`
                  <uui-button
                    look="secondary"
                    label="Set Active"
                    @click=${() => this._activateProvider(e)}
                  >
                    Set Active
                  </uui-button>
                `}
            <uui-button
              look="secondary"
              compact
              label="Test"
              title="Test this provider"
              @click=${() => this._openTestModal(e)}
            >
              <uui-icon name="icon-lab"></uui-icon>
            </uui-button>
            <uui-button
              look="secondary"
              compact
              label="Configure"
              title="Configure this provider"
              @click=${() => this._openConfigModal(e)}
            >
              <uui-icon name="icon-settings"></uui-icon>
            </uui-button>
          </div>
        </div>

        <div class="provider-footer">
          <div class="provider-features">
            ${e.supportsHistoricalRates ? t`<span class="feature-badge"><uui-icon name="icon-calendar"></uui-icon> Historical Rates</span>` : m}
            ${e.lastFetchedAt ? t`<span class="feature-badge"><uui-icon name="icon-time"></uui-icon> Last fetch: ${this._formatDate(e.lastFetchedAt)}</span>` : m}
          </div>
        </div>
      </div>
    `;
  }
  render() {
    return this._isLoading ? t`
        <umb-body-layout header-fit-height main-no-padding>
          <div class="content">
            <div class="loading">
              <uui-loader></uui-loader>
              <span>Loading exchange rate providers...</span>
            </div>
          </div>
        </umb-body-layout>
      ` : this._errorMessage ? t`
        <umb-body-layout header-fit-height main-no-padding>
          <div class="content">
            <uui-box>
              <div class="error">
                <uui-icon name="icon-alert"></uui-icon>
                <span>${this._errorMessage}</span>
                <uui-button look="primary" label="Retry" @click=${this._loadData}>
                  Retry
                </uui-button>
              </div>
            </uui-box>
          </div>
        </umb-body-layout>
      ` : t`
      <umb-body-layout header-fit-height main-no-padding>
        <div class="content">
          ${this._renderStatusBox()}

          <uui-box headline="Available Providers">
            <p class="section-description">
              Select which exchange rate provider to use for currency conversions.
              Only one provider can be active at a time.
            </p>
            ${this._providers.length === 0 ? t`
                  <div class="empty-state">
                    <uui-icon name="icon-globe"></uui-icon>
                    <p>No exchange rate providers discovered.</p>
                    <p class="empty-hint">Exchange rate providers are discovered automatically from installed packages.</p>
                  </div>
                ` : t`
                  <div class="providers-list">
                    ${this._providers.map((e) => this._renderProvider(e))}
                  </div>
                `}
          </uui-box>
        </div>
      </umb-body-layout>
    `;
  }
};
c = /* @__PURE__ */ new WeakMap();
u = /* @__PURE__ */ new WeakMap();
o = /* @__PURE__ */ new WeakMap();
r.styles = R`
    :host {
      display: block;
      height: 100%;
    }

    .content {
      padding: var(--uui-size-layout-1);
      display: flex;
      flex-direction: column;
      gap: var(--uui-size-layout-1);
    }

    .loading {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: var(--uui-size-layout-2);
      gap: var(--uui-size-space-4);
    }

    .error {
      display: flex;
      align-items: center;
      gap: var(--uui-size-space-3);
      padding: var(--uui-size-space-4);
      background: var(--uui-color-danger-standalone);
      color: var(--uui-color-danger-contrast);
      border-radius: var(--uui-border-radius);
    }

    /* Status Box */
    .status-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: var(--uui-size-space-5);
      padding-bottom: var(--uui-size-space-4);
      border-bottom: 1px solid var(--uui-color-border);
    }

    .status-title {
      display: flex;
      align-items: center;
      gap: var(--uui-size-space-3);
      font-size: 1.1rem;
      font-weight: 600;
    }

    .status-title uui-icon {
      font-size: 1.25rem;
      color: var(--uui-color-interactive);
    }

    .status-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: var(--uui-size-space-4);
    }

    .status-card {
      display: flex;
      align-items: flex-start;
      gap: var(--uui-size-space-3);
      padding: var(--uui-size-space-4);
      background: var(--uui-color-surface-alt);
      border-radius: var(--uui-border-radius);
    }

    .status-card-icon {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 40px;
      height: 40px;
      background: var(--uui-color-surface);
      border-radius: var(--uui-border-radius);
      flex-shrink: 0;
    }

    .status-card-icon uui-icon {
      font-size: 1.25rem;
      color: var(--uui-color-interactive);
    }

    .status-card-content {
      display: flex;
      flex-direction: column;
      gap: 2px;
      min-width: 0;
    }

    .status-card-label {
      font-size: 0.75rem;
      font-weight: 600;
      color: var(--uui-color-text-alt);
      text-transform: uppercase;
      letter-spacing: 0.025em;
    }

    .status-card-value {
      font-size: 1.125rem;
      font-weight: 700;
      color: var(--uui-color-text);
    }

    .status-card-value.small {
      font-size: 0.875rem;
      font-weight: 600;
    }

    .status-card-unit {
      font-size: 0.75rem;
      font-weight: 400;
      color: var(--uui-color-text-alt);
    }

    /* Provider Cards */
    .section-description {
      color: var(--uui-color-text-alt);
      margin-bottom: var(--uui-size-space-4);
    }

    .empty-state {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: var(--uui-size-layout-2);
      text-align: center;
      color: var(--uui-color-text-alt);
    }

    .empty-state uui-icon {
      font-size: 3rem;
      margin-bottom: var(--uui-size-space-4);
      opacity: 0.5;
    }

    .empty-state p {
      margin: 0;
    }

    .empty-hint {
      font-size: 0.875rem;
      margin-top: var(--uui-size-space-2) !important;
    }

    .providers-list {
      display: flex;
      flex-direction: column;
      gap: var(--uui-size-space-4);
    }

    .provider-card {
      background: var(--uui-color-surface);
      border: 1px solid var(--uui-color-border);
      border-radius: var(--uui-border-radius);
      padding: var(--uui-size-space-5);
      transition: border-color 120ms ease, box-shadow 120ms ease;
    }

    .provider-card:hover {
      border-color: var(--uui-color-border-emphasis);
    }

    .provider-card.active {
      border-left: 4px solid var(--uui-color-positive);
      background: linear-gradient(90deg, var(--uui-color-positive-standalone) 0%, var(--uui-color-surface) 100px);
    }

    .provider-main {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      gap: var(--uui-size-space-4);
    }

    .provider-info {
      display: flex;
      gap: var(--uui-size-space-4);
      flex: 1;
      min-width: 0;
    }

    .provider-icon {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 48px;
      height: 48px;
      background: var(--uui-color-surface-alt);
      border-radius: var(--uui-border-radius);
      flex-shrink: 0;
    }

    .provider-icon uui-icon {
      font-size: 1.5rem;
      color: var(--uui-color-text-alt);
    }

    .provider-card.active .provider-icon {
      background: var(--uui-color-positive-standalone);
    }

    .provider-card.active .provider-icon uui-icon {
      color: var(--uui-color-positive-contrast);
    }

    .provider-details {
      display: flex;
      flex-direction: column;
      gap: var(--uui-size-space-1);
      min-width: 0;
    }

    .provider-name {
      font-weight: 700;
      font-size: 1.1rem;
    }

    .provider-alias {
      font-size: 0.75rem;
      color: var(--uui-color-text-alt);
      font-family: monospace;
    }

    .provider-description {
      margin: var(--uui-size-space-2) 0 0 0;
      color: var(--uui-color-text-alt);
      font-size: 0.875rem;
      line-height: 1.4;
    }

    .provider-actions {
      display: flex;
      align-items: center;
      gap: var(--uui-size-space-2);
      flex-shrink: 0;
    }

    .active-badge {
      display: inline-flex;
      align-items: center;
      gap: var(--uui-size-space-2);
      padding: var(--uui-size-space-2) var(--uui-size-space-4);
      background: var(--uui-color-positive-standalone);
      color: var(--uui-color-positive-contrast);
      border-radius: var(--uui-border-radius);
      font-size: 0.875rem;
      font-weight: 600;
    }

    .active-badge uui-icon {
      font-size: 0.875rem;
    }

    .provider-footer {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-top: var(--uui-size-space-4);
      padding-top: var(--uui-size-space-3);
      border-top: 1px solid var(--uui-color-border);
    }

    .provider-features {
      display: flex;
      flex-wrap: wrap;
      gap: var(--uui-size-space-3);
    }

    .feature-badge {
      display: inline-flex;
      align-items: center;
      gap: var(--uui-size-space-2);
      padding: var(--uui-size-space-1) var(--uui-size-space-3);
      background: var(--uui-color-surface-alt);
      border-radius: 100px;
      font-size: 0.75rem;
      color: var(--uui-color-text-alt);
    }

    .feature-badge uui-icon {
      font-size: 0.75rem;
    }
  `;
d([
  l()
], r.prototype, "_providers", 2);
d([
  l()
], r.prototype, "_snapshot", 2);
d([
  l()
], r.prototype, "_isLoading", 2);
d([
  l()
], r.prototype, "_isRefreshing", 2);
d([
  l()
], r.prototype, "_errorMessage", 2);
d([
  l()
], r.prototype, "_storeCurrency", 2);
r = d([
  w("merchello-exchange-rate-providers-list")
], r);
const j = r;
export {
  r as MerchelloExchangeRateProvidersListElement,
  j as default
};
//# sourceMappingURL=exchange-rate-providers-list.element-BODthgva.js.map
