import { LitElement as y, nothing as o, html as r, css as x, state as v, customElement as P } from "@umbraco-cms/backoffice/external/lit";
import { UmbElementMixin as k } from "@umbraco-cms/backoffice/element-api";
import { UmbModalToken as $, UMB_MODAL_MANAGER_CONTEXT as M } from "@umbraco-cms/backoffice/modal";
import { UMB_NOTIFICATION_CONTEXT as w } from "@umbraco-cms/backoffice/notification";
import { M as p } from "./merchello-api-CZ7Bv6Up.js";
import { M as S } from "./setup-instructions-modal.token-CR5MFRlI.js";
const C = new $("Merchello.ShippingProvider.Config.Modal", {
  modal: {
    type: "sidebar",
    size: "medium"
  }
});
var I = Object.defineProperty, z = Object.getOwnPropertyDescriptor, b = (e) => {
  throw TypeError(e);
}, c = (e, i, s, u) => {
  for (var n = u > 1 ? void 0 : u ? z(i, s) : i, g = e.length - 1, h; g >= 0; g--)
    (h = e[g]) && (n = (u ? h(i, s, n) : h(n)) || n);
  return u && n && I(i, s, n), n;
}, _ = (e, i, s) => i.has(e) || b("Cannot " + s), a = (e, i, s) => (_(e, i, "read from private field"), i.get(e)), f = (e, i, s) => i.has(e) ? b("Cannot add the same private member more than once") : i instanceof WeakSet ? i.add(e) : i.set(e, s), m = (e, i, s, u) => (_(e, i, "write to private field"), i.set(e, s), s), d, l;
let t = class extends k(y) {
  constructor() {
    super(), this._availableProviders = [], this._configuredProviders = [], this._isLoading = !0, this._errorMessage = null, f(this, d), f(this, l), this.consumeContext(M, (e) => {
      m(this, d, e);
    }), this.consumeContext(w, (e) => {
      m(this, l, e);
    });
  }
  connectedCallback() {
    super.connectedCallback(), this._loadProviders();
  }
  async _loadProviders() {
    this._isLoading = !0, this._errorMessage = null;
    try {
      const [e, i] = await Promise.all([
        p.getAvailableShippingProviders(),
        p.getShippingProviders()
      ]);
      if (e.error) {
        this._errorMessage = e.error.message, this._isLoading = !1;
        return;
      }
      if (i.error) {
        this._errorMessage = i.error.message, this._isLoading = !1;
        return;
      }
      this._availableProviders = e.data ?? [], this._configuredProviders = i.data ?? [];
    } catch (e) {
      this._errorMessage = e instanceof Error ? e.message : "Failed to load providers";
    }
    this._isLoading = !1;
  }
  _getUnconfiguredProviders() {
    const e = new Set(this._configuredProviders.map((i) => i.providerKey));
    return this._availableProviders.filter((i) => !e.has(i.key));
  }
  async _openConfigModal(e, i) {
    if (!a(this, d)) return;
    (await a(this, d).open(this, C, {
      data: { provider: e, configuration: i }
    }).onSubmit().catch(() => {
    }))?.saved && await this._loadProviders();
  }
  async _toggleProvider(e) {
    const { error: i } = await p.toggleShippingProvider(e.id, !e.isEnabled);
    if (i) {
      a(this, l)?.peek("danger", {
        data: { headline: "Error", message: i.message }
      });
      return;
    }
    a(this, l)?.peek("positive", {
      data: {
        headline: "Success",
        message: `${e.displayName} ${e.isEnabled ? "hidden from checkout" : "now showing in checkout"}`
      }
    }), await this._loadProviders();
  }
  async _deleteProvider(e) {
    if (!confirm(`Are you sure you want to remove ${e.displayName}?`))
      return;
    const { error: i } = await p.deleteShippingProvider(e.id);
    if (i) {
      a(this, l)?.peek("danger", {
        data: { headline: "Error", message: i.message }
      });
      return;
    }
    a(this, l)?.peek("positive", {
      data: { headline: "Success", message: `${e.displayName} removed` }
    }), await this._loadProviders();
  }
  _openSetupInstructions(e) {
    !a(this, d) || !e.setupInstructions || a(this, d).open(this, S, {
      data: {
        providerName: e.displayName,
        instructions: e.setupInstructions
      }
    });
  }
  _renderConfiguredProvider(e) {
    const i = e.provider;
    return r`
      <div class="provider-card configured">
        <div class="provider-header">
          <div class="provider-info">
            ${i?.icon ? r`<uui-icon name="${i.icon}"></uui-icon>` : r`<uui-icon name="icon-truck"></uui-icon>`}
            <div class="provider-details">
              <span class="provider-name">${e.displayName}</span>
              <span class="provider-key">${e.providerKey}</span>
            </div>
          </div>
          <div class="provider-actions">
            <uui-toggle
              .checked=${e.isEnabled}
              @change=${() => this._toggleProvider(e)}
              label="${e.isEnabled ? "In Checkout" : "Hidden"}"
            ></uui-toggle>
            <uui-button
              look="secondary"
              label="Configure"
              @click=${() => i && this._openConfigModal(i, e)}
            >
              <uui-icon name="icon-settings"></uui-icon>
            </uui-button>
            <uui-button
              look="secondary"
              color="danger"
              label="Remove"
              @click=${() => this._deleteProvider(e)}
            >
              <uui-icon name="icon-trash"></uui-icon>
            </uui-button>
          </div>
        </div>
        ${i?.description ? r`<p class="provider-description">${i.description}</p>` : o}
        <div class="provider-footer">
          <div class="provider-features">
            ${e.isTestMode ? r`<span class="feature-badge test-mode">Test Mode</span>` : r`<span class="feature-badge live-mode">Live</span>`}
            ${i?.supportsRealTimeRates ? r`<span class="feature-badge">Real-Time Rates</span>` : o}
            ${i?.supportsTracking ? r`<span class="feature-badge">Tracking</span>` : o}
            ${i?.supportsLabelGeneration ? r`<span class="feature-badge">Label Generation</span>` : o}
            ${i?.supportsDeliveryDateSelection ? r`<span class="feature-badge">Delivery Date Selection</span>` : o}
            ${i?.supportsInternational ? r`<span class="feature-badge">International</span>` : o}
            ${i?.requiresFullAddress ? r`<span class="feature-badge">Requires Full Address</span>` : o}
          </div>
          ${i?.setupInstructions ? r`
                <uui-button
                  look="secondary"
                  compact
                  label="Setup Instructions"
                  title="Setup Instructions"
                  @click=${() => this._openSetupInstructions(i)}
                >
                  <uui-icon name="icon-help-alt"></uui-icon>
                </uui-button>
              ` : o}
        </div>
      </div>
    `;
  }
  _renderAvailableProvider(e) {
    return r`
      <div class="provider-card available">
        <div class="provider-header">
          <div class="provider-info">
            ${e.icon ? r`<uui-icon name="${e.icon}"></uui-icon>` : r`<uui-icon name="icon-truck"></uui-icon>`}
            <div class="provider-details">
              <span class="provider-name">${e.displayName}</span>
              <span class="provider-key">${e.key}</span>
            </div>
          </div>
          <uui-button
            look="primary"
            label="Install"
            @click=${() => this._openConfigModal(e)}
          >
            Install
          </uui-button>
        </div>
        <div class="provider-footer">
          ${e.description ? r`<p class="provider-description">${e.description}</p>` : o}
          ${e.setupInstructions ? r`
                <uui-button
                  look="secondary"
                  compact
                  label="Setup Instructions"
                  title="Setup Instructions"
                  @click=${() => this._openSetupInstructions(e)}
                >
                  <uui-icon name="icon-help-alt"></uui-icon>
                </uui-button>
              ` : o}
        </div>
      </div>
    `;
  }
  render() {
    if (this._isLoading)
      return r`
        <div class="loading">
          <uui-loader></uui-loader>
          <span>Loading shipping providers...</span>
        </div>
      `;
    if (this._errorMessage)
      return r`
        <uui-box>
          <div class="error">
            <uui-icon name="icon-alert"></uui-icon>
            <span>${this._errorMessage}</span>
            <uui-button look="primary" label="Retry" @click=${this._loadProviders}>
              Retry
            </uui-button>
          </div>
        </uui-box>
      `;
    const e = this._getUnconfiguredProviders();
    return r`
      <uui-box headline="Configured Shipping Providers">
        <p class="section-description">
          These shipping providers are installed and configured.
          Toggle the switch to show or hide a provider from checkout.
        </p>
        ${this._configuredProviders.length === 0 ? r`<p class="no-items">No shipping providers configured yet.</p>` : r`
              <div class="providers-list">
                ${this._configuredProviders.map(
      (i) => this._renderConfiguredProvider(i)
    )}
              </div>
            `}
      </uui-box>

      <uui-box headline="Available Shipping Providers">
        <p class="section-description">
          These shipping providers are available but not yet configured.
          Click "Install" to configure and add a provider.
        </p>
        ${e.length === 0 ? r`<p class="no-items">All available providers have been configured.</p>` : r`
              <div class="providers-list">
                ${e.map(
      (i) => this._renderAvailableProvider(i)
    )}
              </div>
            `}
      </uui-box>
    `;
  }
};
d = /* @__PURE__ */ new WeakMap();
l = /* @__PURE__ */ new WeakMap();
t.styles = x`
    :host {
      display: block;
      padding: var(--uui-size-layout-1);
    }

    uui-box {
      margin-bottom: var(--uui-size-layout-1);
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

    .section-description {
      color: var(--uui-color-text-alt);
      margin-bottom: var(--uui-size-space-4);
    }

    .no-items {
      color: var(--uui-color-text-alt);
      font-style: italic;
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
      padding: var(--uui-size-space-4);
    }

    .provider-card.configured {
      border-left: 3px solid var(--uui-color-positive);
    }

    .provider-card.available {
      border-left: 3px solid var(--uui-color-border-emphasis);
    }

    .provider-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: var(--uui-size-space-4);
    }

    .provider-info {
      display: flex;
      align-items: center;
      gap: var(--uui-size-space-3);
    }

    .provider-info > uui-icon {
      font-size: 1.5rem;
      color: var(--uui-color-text-alt);
    }

    .provider-details {
      display: flex;
      flex-direction: column;
    }

    .provider-name {
      font-weight: 600;
      font-size: 1rem;
    }

    .provider-key {
      font-size: 0.75rem;
      color: var(--uui-color-text-alt);
    }

    .provider-actions {
      display: flex;
      align-items: center;
      gap: var(--uui-size-space-2);
    }

    .provider-description {
      margin: var(--uui-size-space-3) 0 0 0;
      color: var(--uui-color-text-alt);
      font-size: 0.875rem;
      flex: 1;
    }

    .provider-footer {
      display: flex;
      justify-content: space-between;
      align-items: flex-end;
      margin-top: var(--uui-size-space-3);
      gap: var(--uui-size-space-3);
    }

    .provider-features {
      display: flex;
      flex-wrap: wrap;
      gap: var(--uui-size-space-2);
      flex: 1;
    }

    .help-button {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 28px;
      height: 28px;
      padding: 0;
      border: 1px solid var(--uui-color-border);
      border-radius: 50%;
      background: var(--uui-color-surface);
      color: var(--uui-color-text-alt);
      cursor: pointer;
      transition: all 120ms ease;
      flex-shrink: 0;
    }

    .help-button:hover {
      background: var(--uui-color-surface-emphasis);
      color: var(--uui-color-interactive);
      border-color: var(--uui-color-interactive);
    }

    .help-button uui-icon {
      font-size: 16px;
    }

    .feature-badge {
      display: inline-block;
      padding: 2px 8px;
      background: var(--uui-color-surface-alt);
      border-radius: 12px;
      font-size: 0.75rem;
      color: var(--uui-color-text-alt);
    }

    .feature-badge.test-mode {
      background: var(--uui-color-warning-standalone);
      color: var(--uui-color-warning-contrast);
    }

    .feature-badge.live-mode {
      background: var(--uui-color-positive-standalone);
      color: var(--uui-color-positive-contrast);
    }
  `;
c([
  v()
], t.prototype, "_availableProviders", 2);
c([
  v()
], t.prototype, "_configuredProviders", 2);
c([
  v()
], t.prototype, "_isLoading", 2);
c([
  v()
], t.prototype, "_errorMessage", 2);
t = c([
  P("merchello-shipping-providers-list")
], t);
const R = t;
export {
  t as MerchelloShippingProvidersListElement,
  R as default
};
//# sourceMappingURL=shipping-providers-list.element-okLNtaX4.js.map
