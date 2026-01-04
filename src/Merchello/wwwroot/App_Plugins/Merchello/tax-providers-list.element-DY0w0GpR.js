import { LitElement as z, html as a, nothing as h, css as M, state as g, customElement as C } from "@umbraco-cms/backoffice/external/lit";
import { UmbElementMixin as k } from "@umbraco-cms/backoffice/element-api";
import { UmbModalToken as x, UMB_MODAL_MANAGER_CONTEXT as w } from "@umbraco-cms/backoffice/modal";
import { UMB_NOTIFICATION_CONTEXT as T } from "@umbraco-cms/backoffice/notification";
import { M as b } from "./merchello-api-Rt7qKkDA.js";
const A = new x("Merchello.TaxProviderConfig.Modal", {
  modal: {
    type: "sidebar",
    size: "medium"
  }
}), P = new x("Merchello.TestTaxProvider.Modal", {
  modal: {
    type: "sidebar",
    size: "medium"
  }
});
var $ = Object.defineProperty, E = Object.getOwnPropertyDescriptor, y = (i) => {
  throw TypeError(i);
}, p = (i, e, t, c) => {
  for (var s = c > 1 ? void 0 : c ? E(e, t) : e, v = i.length - 1, m; v >= 0; v--)
    (m = i[v]) && (s = (c ? m(e, t, s) : m(s)) || s);
  return c && s && $(e, t, s), s;
}, _ = (i, e, t) => e.has(i) || y("Cannot " + t), r = (i, e, t) => (_(i, e, "read from private field"), e.get(i)), f = (i, e, t) => e.has(i) ? y("Cannot add the same private member more than once") : e instanceof WeakSet ? e.add(i) : e.set(i, t), l = (i, e, t, c) => (_(i, e, "write to private field"), e.set(i, t), t), o, d, n;
let u = class extends k(z) {
  constructor() {
    super(), this._providers = [], this._isLoading = !0, this._errorMessage = null, f(this, o), f(this, d), f(this, n, !1), this.consumeContext(w, (i) => {
      l(this, o, i);
    }), this.consumeContext(T, (i) => {
      l(this, d, i);
    });
  }
  connectedCallback() {
    super.connectedCallback(), l(this, n, !0), this._loadData();
  }
  disconnectedCallback() {
    super.disconnectedCallback(), l(this, n, !1);
  }
  async _loadData() {
    this._isLoading = !0, this._errorMessage = null;
    try {
      const { data: i, error: e } = await b.getTaxProviders();
      if (!r(this, n)) return;
      if (e) {
        this._errorMessage = e.message, this._isLoading = !1;
        return;
      }
      this._providers = i ?? [];
    } catch (i) {
      if (!r(this, n)) return;
      this._errorMessage = i instanceof Error ? i.message : "Failed to load providers";
    }
    this._isLoading = !1;
  }
  async _activateProvider(i) {
    if (i.isActive) return;
    const { error: e } = await b.activateTaxProvider(i.alias);
    if (r(this, n)) {
      if (e) {
        r(this, d)?.peek("danger", {
          data: { headline: "Error", message: e.message }
        });
        return;
      }
      r(this, d)?.peek("positive", {
        data: {
          headline: "Success",
          message: `${i.displayName} is now the active tax provider`
        }
      }), await this._loadData();
    }
  }
  _openConfigModal(i) {
    if (!r(this, o)) return;
    r(this, o).open(this, A, {
      data: { provider: i }
    }).onSubmit().then((t) => {
      t?.isSaved && this._loadData();
    }).catch(() => {
    });
  }
  _openTestModal(i) {
    r(this, o) && r(this, o).open(this, P, {
      data: { provider: i }
    });
  }
  _getActiveProvider() {
    return this._providers.find((i) => i.isActive);
  }
  _renderStatusBox() {
    const i = this._getActiveProvider();
    return a`
      <uui-box>
        <div class="status-header">
          <div class="status-title">
            <uui-icon name="icon-calculator"></uui-icon>
            <span>Tax Calculation Status</span>
          </div>
        </div>

        <div class="status-grid">
          <div class="status-card">
            <div class="status-card-icon">
              <uui-icon name="icon-server-alt"></uui-icon>
            </div>
            <div class="status-card-content">
              <span class="status-card-label">Active Provider</span>
              <span class="status-card-value">${i?.displayName ?? "None configured"}</span>
            </div>
          </div>

          <div class="status-card">
            <div class="status-card-icon">
              <uui-icon name="icon-cloud"></uui-icon>
            </div>
            <div class="status-card-content">
              <span class="status-card-label">Calculation Type</span>
              <span class="status-card-value">${i?.supportsRealTimeCalculation ? "Real-time API" : "Manual Rates"}</span>
            </div>
          </div>

          <div class="status-card">
            <div class="status-card-icon">
              <uui-icon name="icon-key"></uui-icon>
            </div>
            <div class="status-card-content">
              <span class="status-card-label">API Credentials</span>
              <span class="status-card-value">${i?.requiresApiCredentials ? "Required" : "Not Required"}</span>
            </div>
          </div>
        </div>
      </uui-box>
    `;
  }
  _renderProvider(i) {
    return a`
      <div class="provider-card ${i.isActive ? "active" : ""}">
        <div class="provider-main">
          <div class="provider-info">
            <div class="provider-icon">
              ${i.icon ? a`<uui-icon name="${i.icon}"></uui-icon>` : a`<uui-icon name="icon-calculator"></uui-icon>`}
            </div>
            <div class="provider-details">
              <span class="provider-name">${i.displayName}</span>
              <span class="provider-alias">${i.alias}</span>
              ${i.description ? a`<p class="provider-description">${i.description}</p>` : h}
            </div>
          </div>

          <div class="provider-actions">
            ${i.isActive ? a`<span class="active-badge"><uui-icon name="icon-check"></uui-icon> Active</span>` : a`
                  <uui-button
                    look="secondary"
                    label="Set Active"
                    @click=${() => this._activateProvider(i)}
                  >
                    Set Active
                  </uui-button>
                `}
            <uui-button
              look="secondary"
              compact
              label="Test"
              title="Test this provider"
              @click=${() => this._openTestModal(i)}
            >
              <uui-icon name="icon-lab"></uui-icon>
            </uui-button>
            <uui-button
              look="secondary"
              compact
              label="Configure"
              title="Configure this provider"
              @click=${() => this._openConfigModal(i)}
            >
              <uui-icon name="icon-settings"></uui-icon>
            </uui-button>
          </div>
        </div>

        <div class="provider-footer">
          <div class="provider-features">
            ${i.supportsRealTimeCalculation ? a`<span class="feature-badge"><uui-icon name="icon-cloud"></uui-icon> Real-time Calculation</span>` : a`<span class="feature-badge"><uui-icon name="icon-calculator"></uui-icon> Manual Rates</span>`}
            ${i.requiresApiCredentials ? a`<span class="feature-badge"><uui-icon name="icon-key"></uui-icon> API Credentials Required</span>` : h}
          </div>
        </div>
      </div>
    `;
  }
  render() {
    return this._isLoading ? a`
        <umb-body-layout header-fit-height main-no-padding>
          <div class="content">
            <div class="loading">
              <uui-loader></uui-loader>
              <span>Loading tax providers...</span>
            </div>
          </div>
        </umb-body-layout>
      ` : this._errorMessage ? a`
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
      ` : a`
      <umb-body-layout header-fit-height main-no-padding>
        <div class="content">
          ${this._renderStatusBox()}

          <uui-box headline="Available Providers">
            <p class="section-description">
              Select which tax provider to use for tax calculations.
              Only one provider can be active at a time.
            </p>
            ${this._providers.length === 0 ? a`
                  <div class="empty-state">
                    <uui-icon name="icon-calculator"></uui-icon>
                    <p>No tax providers discovered.</p>
                    <p class="empty-hint">Tax providers are discovered automatically from installed packages.</p>
                  </div>
                ` : a`
                  <div class="providers-list">
                    ${this._providers.map((i) => this._renderProvider(i))}
                  </div>
                `}
          </uui-box>
        </div>
      </umb-body-layout>
    `;
  }
};
o = /* @__PURE__ */ new WeakMap();
d = /* @__PURE__ */ new WeakMap();
n = /* @__PURE__ */ new WeakMap();
u.styles = M`
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
p([
  g()
], u.prototype, "_providers", 2);
p([
  g()
], u.prototype, "_isLoading", 2);
p([
  g()
], u.prototype, "_errorMessage", 2);
u = p([
  C("merchello-tax-providers-list")
], u);
const N = u;
export {
  u as MerchelloTaxProvidersListElement,
  N as default
};
//# sourceMappingURL=tax-providers-list.element-DY0w0GpR.js.map
