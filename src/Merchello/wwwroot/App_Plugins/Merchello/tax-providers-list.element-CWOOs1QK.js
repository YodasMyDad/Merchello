import { LitElement as C, unsafeHTML as z, html as a, nothing as x, css as M, state as m, customElement as k } from "@umbraco-cms/backoffice/external/lit";
import { UmbElementMixin as T } from "@umbraco-cms/backoffice/element-api";
import { UmbModalToken as b, UMB_MODAL_MANAGER_CONTEXT as P } from "@umbraco-cms/backoffice/modal";
import { UMB_NOTIFICATION_CONTEXT as A } from "@umbraco-cms/backoffice/notification";
import { M as y } from "./merchello-api-BM4-Q40x.js";
const L = new b("Merchello.TaxProviderConfig.Modal", {
  modal: {
    type: "sidebar",
    size: "large"
  }
}), E = new b("Merchello.TestTaxProvider.Modal", {
  modal: {
    type: "sidebar",
    size: "medium"
  }
}), d = {
  // Avalara cloud logo (brand teal/green)
  avalara: '<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="M19.35 10.04A7.49 7.49 0 0 0 12 4C9.11 4 6.6 5.64 5.35 8.04A5.994 5.994 0 0 0 0 14c0 3.31 2.69 6 6 6h13c2.76 0 5-2.24 5-5 0-2.64-2.05-4.78-4.65-4.96z" fill="#66B245"/><path d="M10.5 16l-3-3 1.06-1.06L10.5 13.88l4.94-4.94L16.5 10l-6 6z" fill="white"/></svg>',
  // Generic calculator icon (default fallback)
  calculator: '<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><rect x="4" y="2" width="16" height="20" rx="2" stroke="currentColor" stroke-width="1.5"/><rect x="7" y="5" width="10" height="4" rx="1" fill="currentColor" opacity="0.3"/><circle cx="8.5" cy="12.5" r="1" fill="currentColor"/><circle cx="12" cy="12.5" r="1" fill="currentColor"/><circle cx="15.5" cy="12.5" r="1" fill="currentColor"/><circle cx="8.5" cy="16" r="1" fill="currentColor"/><circle cx="12" cy="16" r="1" fill="currentColor"/><circle cx="15.5" cy="16" r="1" fill="currentColor"/><circle cx="8.5" cy="19.5" r="1" fill="currentColor"/><rect x="11" y="18.5" width="5.5" height="2" rx="1" fill="currentColor"/></svg>'
};
function O(e) {
  const i = e.toLowerCase();
  return d[i] ? d[i] : i.includes("avalara") ? d.avalara : d.calculator;
}
var $ = Object.defineProperty, R = Object.getOwnPropertyDescriptor, _ = (e) => {
  throw TypeError(e);
}, v = (e, i, r, o) => {
  for (var s = o > 1 ? void 0 : o ? R(i, r) : i, g = e.length - 1, h; g >= 0; g--)
    (h = e[g]) && (s = (o ? h(i, r, s) : h(s)) || s);
  return o && s && $(i, r, s), s;
}, w = (e, i, r) => i.has(e) || _("Cannot " + r), t = (e, i, r) => (w(e, i, "read from private field"), i.get(e)), f = (e, i, r) => i.has(e) ? _("Cannot add the same private member more than once") : i instanceof WeakSet ? i.add(e) : i.set(e, r), p = (e, i, r, o) => (w(e, i, "write to private field"), i.set(e, r), r), n, u, c;
let l = class extends T(C) {
  constructor() {
    super(), this._providers = [], this._isLoading = !0, this._errorMessage = null, f(this, n), f(this, u), f(this, c, !1), this.consumeContext(P, (e) => {
      p(this, n, e);
    }), this.consumeContext(A, (e) => {
      p(this, u, e);
    });
  }
  connectedCallback() {
    super.connectedCallback(), p(this, c, !0), this._loadData();
  }
  disconnectedCallback() {
    super.disconnectedCallback(), p(this, c, !1);
  }
  async _loadData() {
    this._isLoading = !0, this._errorMessage = null;
    try {
      const { data: e, error: i } = await y.getTaxProviders();
      if (!t(this, c)) return;
      if (i) {
        this._errorMessage = i.message, this._isLoading = !1;
        return;
      }
      this._providers = e ?? [];
    } catch (e) {
      if (!t(this, c)) return;
      this._errorMessage = e instanceof Error ? e.message : "Failed to load providers";
    }
    this._isLoading = !1;
  }
  async _activateProvider(e) {
    if (e.isActive) return;
    const { error: i } = await y.activateTaxProvider(e.alias);
    if (t(this, c)) {
      if (i) {
        t(this, u)?.peek("danger", {
          data: { headline: "Error", message: i.message }
        });
        return;
      }
      t(this, u)?.peek("positive", {
        data: {
          headline: "Success",
          message: `${e.displayName} is now the active tax provider`
        }
      }), await this._loadData();
    }
  }
  _openConfigModal(e) {
    if (!t(this, n)) return;
    t(this, n).open(this, L, {
      data: { provider: e }
    }).onSubmit().then((r) => {
      r?.isSaved && this._loadData();
    }).catch(() => {
    });
  }
  _openTestModal(e) {
    t(this, n) && t(this, n).open(this, E, {
      data: { provider: e }
    });
  }
  _renderProviderIcon(e, i, r) {
    const o = i ?? O(e);
    return o ? a`<span class="provider-icon-svg">${z(o)}</span>` : a`<uui-icon name="${r ?? "icon-calculator"}"></uui-icon>`;
  }
  _renderProvider(e) {
    return a`
      <div class="provider-card ${e.isActive ? "active" : ""}">
        <div class="provider-main">
          <div class="provider-info">
            <div class="provider-icon">
              ${this._renderProviderIcon(e.alias, e.iconSvg, e.icon)}
            </div>
            <div class="provider-details">
              <span class="provider-name">${e.displayName}</span>
              <span class="provider-alias">${e.alias}</span>
              ${e.description ? a`<p class="provider-description">${e.description}</p>` : x}
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
            ${e.requiresApiCredentials ? a`<span class="feature-badge"><uui-icon name="icon-key"></uui-icon> API Credentials Required</span>` : x}
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
n = /* @__PURE__ */ new WeakMap();
u = /* @__PURE__ */ new WeakMap();
c = /* @__PURE__ */ new WeakMap();
l.styles = M`
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

    .provider-icon-svg {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 24px;
      height: 24px;
    }

    .provider-icon-svg svg {
      width: 100%;
      height: 100%;
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
v([
  m()
], l.prototype, "_providers", 2);
v([
  m()
], l.prototype, "_isLoading", 2);
v([
  m()
], l.prototype, "_errorMessage", 2);
l = v([
  k("merchello-tax-providers-list")
], l);
const X = l;
export {
  l as MerchelloTaxProvidersListElement,
  X as default
};
//# sourceMappingURL=tax-providers-list.element-CWOOs1QK.js.map
