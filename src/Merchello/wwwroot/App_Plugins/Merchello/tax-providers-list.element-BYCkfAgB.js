import { LitElement as z, nothing as h, html as a, css as M, state as g, customElement as k } from "@umbraco-cms/backoffice/external/lit";
import { UmbElementMixin as C } from "@umbraco-cms/backoffice/element-api";
import { UmbModalToken as y, UMB_MODAL_MANAGER_CONTEXT as T } from "@umbraco-cms/backoffice/modal";
import { UMB_NOTIFICATION_CONTEXT as w } from "@umbraco-cms/backoffice/notification";
import { M as b } from "./merchello-api-D-qg1PlO.js";
const A = new y("Merchello.TaxProviderConfig.Modal", {
  modal: {
    type: "sidebar",
    size: "large"
  }
}), E = new y("Merchello.TestTaxProvider.Modal", {
  modal: {
    type: "sidebar",
    size: "medium"
  }
});
var P = Object.defineProperty, $ = Object.getOwnPropertyDescriptor, _ = (e) => {
  throw TypeError(e);
}, p = (e, i, r, u) => {
  for (var t = u > 1 ? void 0 : u ? $(i, r) : i, v = e.length - 1, m; v >= 0; v--)
    (m = e[v]) && (t = (u ? m(i, r, t) : m(t)) || t);
  return u && t && P(i, r, t), t;
}, x = (e, i, r) => i.has(e) || _("Cannot " + r), o = (e, i, r) => (x(e, i, "read from private field"), i.get(e)), f = (e, i, r) => i.has(e) ? _("Cannot add the same private member more than once") : i instanceof WeakSet ? i.add(e) : i.set(e, r), l = (e, i, r, u) => (x(e, i, "write to private field"), i.set(e, r), r), s, d, n;
let c = class extends C(z) {
  constructor() {
    super(), this._providers = [], this._isLoading = !0, this._errorMessage = null, f(this, s), f(this, d), f(this, n, !1), this.consumeContext(T, (e) => {
      l(this, s, e);
    }), this.consumeContext(w, (e) => {
      l(this, d, e);
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
      const { data: e, error: i } = await b.getTaxProviders();
      if (!o(this, n)) return;
      if (i) {
        this._errorMessage = i.message, this._isLoading = !1;
        return;
      }
      this._providers = e ?? [];
    } catch (e) {
      if (!o(this, n)) return;
      this._errorMessage = e instanceof Error ? e.message : "Failed to load providers";
    }
    this._isLoading = !1;
  }
  async _activateProvider(e) {
    if (e.isActive) return;
    const { error: i } = await b.activateTaxProvider(e.alias);
    if (o(this, n)) {
      if (i) {
        o(this, d)?.peek("danger", {
          data: { headline: "Error", message: i.message }
        });
        return;
      }
      o(this, d)?.peek("positive", {
        data: {
          headline: "Success",
          message: `${e.displayName} is now the active tax provider`
        }
      }), await this._loadData();
    }
  }
  _openConfigModal(e) {
    if (!o(this, s)) return;
    o(this, s).open(this, A, {
      data: { provider: e }
    }).onSubmit().then((r) => {
      r?.isSaved && this._loadData();
    }).catch(() => {
    });
  }
  _openTestModal(e) {
    o(this, s) && o(this, s).open(this, E, {
      data: { provider: e }
    });
  }
  _renderProvider(e) {
    return a`
      <div class="provider-card ${e.isActive ? "active" : ""}">
        <div class="provider-main">
          <div class="provider-info">
            <div class="provider-icon">
              ${e.icon ? a`<uui-icon name="${e.icon}"></uui-icon>` : a`<uui-icon name="icon-calculator"></uui-icon>`}
            </div>
            <div class="provider-details">
              <span class="provider-name">${e.displayName}</span>
              <span class="provider-alias">${e.alias}</span>
              ${e.description ? a`<p class="provider-description">${e.description}</p>` : h}
            </div>
          </div>

          <div class="provider-actions">
            ${e.isActive ? a`<span class="active-badge"><uui-icon name="icon-check"></uui-icon> Active</span>` : a`
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
            ${e.supportsRealTimeCalculation ? a`<span class="feature-badge"><uui-icon name="icon-cloud"></uui-icon> Real-time Calculation</span>` : a`<span class="feature-badge"><uui-icon name="icon-calculator"></uui-icon> Manual Rates</span>`}
            ${e.requiresApiCredentials ? a`<span class="feature-badge"><uui-icon name="icon-key"></uui-icon> API Credentials Required</span>` : h}
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
                    ${this._providers.map((e) => this._renderProvider(e))}
                  </div>
                `}
          </uui-box>
        </div>
      </umb-body-layout>
    `;
  }
};
s = /* @__PURE__ */ new WeakMap();
d = /* @__PURE__ */ new WeakMap();
n = /* @__PURE__ */ new WeakMap();
c.styles = M`
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
], c.prototype, "_providers", 2);
p([
  g()
], c.prototype, "_isLoading", 2);
p([
  g()
], c.prototype, "_errorMessage", 2);
c = p([
  k("merchello-tax-providers-list")
], c);
const S = c;
export {
  c as MerchelloTaxProvidersListElement,
  S as default
};
//# sourceMappingURL=tax-providers-list.element-BYCkfAgB.js.map
