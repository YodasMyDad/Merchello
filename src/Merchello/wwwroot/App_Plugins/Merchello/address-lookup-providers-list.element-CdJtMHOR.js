import { LitElement as k, unsafeHTML as z, html as a, nothing as p, css as w, state as g, customElement as A } from "@umbraco-cms/backoffice/external/lit";
import { UmbElementMixin as M } from "@umbraco-cms/backoffice/element-api";
import { UmbModalToken as _, UMB_MODAL_MANAGER_CONTEXT as C } from "@umbraco-cms/backoffice/modal";
import { UMB_NOTIFICATION_CONTEXT as D } from "@umbraco-cms/backoffice/notification";
import { M as h } from "./merchello-api-DkRa4ImO.js";
const $ = new _("Merchello.AddressLookupProvider.Config.Modal", {
  modal: {
    type: "sidebar",
    size: "medium"
  }
}), P = new _("Merchello.AddressLookupProvider.Test.Modal", {
  modal: {
    type: "sidebar",
    size: "medium"
  }
});
var L = Object.defineProperty, S = Object.getOwnPropertyDescriptor, y = (e) => {
  throw TypeError(e);
}, l = (e, i, t, d) => {
  for (var n = d > 1 ? void 0 : d ? S(i, t) : i, m = e.length - 1, f; m >= 0; m--)
    (f = e[m]) && (n = (d ? f(i, t, n) : f(n)) || n);
  return d && n && L(i, t, n), n;
}, x = (e, i, t) => i.has(e) || y("Cannot " + t), s = (e, i, t) => (x(e, i, "read from private field"), i.get(e)), b = (e, i, t) => i.has(e) ? y("Cannot add the same private member more than once") : i instanceof WeakSet ? i.add(e) : i.set(e, t), v = (e, i, t, d) => (x(e, i, "write to private field"), i.set(e, t), t), u, c, r;
let o = class extends M(k) {
  constructor() {
    super(), this._providers = [], this._isLoading = !0, this._isDeactivating = !1, this._errorMessage = null, b(this, u), b(this, c), b(this, r, !1), this.consumeContext(C, (e) => {
      v(this, u, e);
    }), this.consumeContext(D, (e) => {
      v(this, c, e);
    });
  }
  connectedCallback() {
    super.connectedCallback(), v(this, r, !0), this._loadData();
  }
  disconnectedCallback() {
    super.disconnectedCallback(), v(this, r, !1);
  }
  async _loadData() {
    this._isLoading = !0, this._errorMessage = null;
    try {
      const { data: e, error: i } = await h.getAddressLookupProviders();
      if (!s(this, r)) return;
      if (i) {
        this._errorMessage = i.message, this._isLoading = !1;
        return;
      }
      this._providers = e ?? [];
    } catch (e) {
      if (!s(this, r)) return;
      this._errorMessage = e instanceof Error ? e.message : "Failed to load providers";
    }
    this._isLoading = !1;
  }
  async _activateProvider(e) {
    if (e.isActive) return;
    const { error: i } = await h.activateAddressLookupProvider(e.alias);
    if (s(this, r)) {
      if (i) {
        s(this, c)?.peek("danger", {
          data: { headline: "Error", message: i.message }
        });
        return;
      }
      s(this, c)?.peek("positive", {
        data: {
          headline: "Success",
          message: `${e.displayName} is now the active address lookup provider`
        }
      }), await this._loadData();
    }
  }
  async _deactivateProviders() {
    if (this._isDeactivating) return;
    this._isDeactivating = !0;
    const { error: e } = await h.deactivateAddressLookupProviders();
    if (s(this, r)) {
      if (this._isDeactivating = !1, e) {
        s(this, c)?.peek("danger", {
          data: { headline: "Error", message: e.message }
        });
        return;
      }
      s(this, c)?.peek("positive", {
        data: {
          headline: "Disabled",
          message: "Address lookup has been disabled for checkout."
        }
      }), await this._loadData();
    }
  }
  _openConfigModal(e) {
    if (!s(this, u)) return;
    s(this, u).open(this, $, {
      data: { provider: e }
    }).onSubmit().then((t) => {
      t?.isSaved && this._loadData();
    }).catch(() => {
    });
  }
  _openTestModal(e) {
    s(this, u) && s(this, u).open(this, P, {
      data: { provider: e }
    });
  }
  _getActiveProvider() {
    return this._providers.find((e) => e.isActive);
  }
  _formatSupportedCountries(e) {
    if (!e) return "—";
    const i = e.supportedCountries;
    return !i || i.length === 0 || i.some((t) => t === "*") ? "All countries" : i.join(", ");
  }
  _renderProviderIcon(e) {
    return e.iconSvg ? a`<span class="provider-icon-svg">${z(e.iconSvg)}</span>` : a`<uui-icon name="${e.icon ?? "icon-map-location"}"></uui-icon>`;
  }
  _renderStatusBox() {
    const e = this._getActiveProvider();
    return a`
      <uui-box>
        <div class="status-header">
          <div class="status-title">
            <uui-icon name="icon-map-location"></uui-icon>
            <span>Address Lookup Status</span>
          </div>
          <uui-button
            look="secondary"
            label="Disable"
            ?disabled=${!e || this._isDeactivating}
            @click=${this._deactivateProviders}
          >
            ${this._isDeactivating ? a`<uui-loader-circle></uui-loader-circle>` : a`<uui-icon name="icon-remove"></uui-icon>`}
            ${this._isDeactivating ? "Disabling..." : "Disable"}
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
              <uui-icon name="icon-globe"></uui-icon>
            </div>
            <div class="status-card-content">
              <span class="status-card-label">Coverage</span>
              <span class="status-card-value small">${this._formatSupportedCountries(e)}</span>
            </div>
          </div>

          <div class="status-card">
            <div class="status-card-icon">
              <uui-icon name="icon-check"></uui-icon>
            </div>
            <div class="status-card-content">
              <span class="status-card-label">Checkout Status</span>
              <span class="status-card-value">${e ? "Enabled" : "Disabled"}</span>
            </div>
          </div>
        </div>

        <p class="status-hint">
          Only one provider can be active at a time. Disable to fall back to manual address entry only.
        </p>
      </uui-box>
    `;
  }
  _renderProvider(e) {
    const i = Object.values(e.configuration ?? {}).some((t) => t);
    return a`
      <div class="provider-card ${e.isActive ? "active" : ""}">
        <div class="provider-main">
          <div class="provider-info">
            <div class="provider-icon">
              ${this._renderProviderIcon(e)}
            </div>
            <div class="provider-details">
              <span class="provider-name">${e.displayName}</span>
              <span class="provider-alias">${e.alias}</span>
              ${e.description ? a`<p class="provider-description">${e.description}</p>` : p}
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
            ${e.isActive ? a`
                  <uui-button
                    look="secondary"
                    compact
                    label="Disable"
                    @click=${this._deactivateProviders}
                    ?disabled=${this._isDeactivating}
                  >
                    <uui-icon name="icon-remove"></uui-icon>
                  </uui-button>
                ` : p}
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
            <span class="feature-badge">${this._formatSupportedCountries(e)}</span>
            ${e.requiresApiCredentials ? a`<span class="feature-badge">Requires credentials</span>` : a`<span class="feature-badge">No credentials required</span>`}
            ${e.requiresApiCredentials && !i ? a`<span class="feature-badge warning">Setup required</span>` : p}
          </div>
          ${e.setupInstructions ? a`<p class="provider-setup">${e.setupInstructions}</p>` : p}
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
              <span>Loading address lookup providers...</span>
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
              Select which address lookup provider to use in checkout. If none are active, customers
              will enter addresses manually.
            </p>
            ${this._providers.length === 0 ? a`
                  <div class="empty-state">
                    <uui-icon name="icon-map-location"></uui-icon>
                    <p>No address lookup providers discovered.</p>
                    <p class="empty-hint">Providers are discovered automatically from installed packages.</p>
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
u = /* @__PURE__ */ new WeakMap();
c = /* @__PURE__ */ new WeakMap();
r = /* @__PURE__ */ new WeakMap();
o.styles = w`
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
      gap: var(--uui-size-space-3);
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

    .status-hint {
      margin-top: var(--uui-size-space-4);
      color: var(--uui-color-text-alt);
      font-size: 0.875rem;
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

    .provider-icon uui-icon,
    .provider-icon-svg {
      font-size: 1.5rem;
      color: var(--uui-color-text-alt);
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

    .provider-card.active .provider-icon uui-icon,
    .provider-card.active .provider-icon-svg {
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
      flex-wrap: wrap;
      justify-content: flex-end;
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
      flex-direction: column;
      gap: var(--uui-size-space-3);
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

    .feature-badge.warning {
      background: var(--uui-color-warning-standalone);
      color: var(--uui-color-warning-contrast);
    }

    .provider-setup {
      margin: 0;
      font-size: 0.8125rem;
      color: var(--uui-color-text-alt);
    }
  `;
l([
  g()
], o.prototype, "_providers", 2);
l([
  g()
], o.prototype, "_isLoading", 2);
l([
  g()
], o.prototype, "_isDeactivating", 2);
l([
  g()
], o.prototype, "_errorMessage", 2);
o = l([
  A("merchello-address-lookup-providers-list")
], o);
const I = o;
export {
  o as MerchelloAddressLookupProvidersListElement,
  I as default
};
//# sourceMappingURL=address-lookup-providers-list.element-CdJtMHOR.js.map
