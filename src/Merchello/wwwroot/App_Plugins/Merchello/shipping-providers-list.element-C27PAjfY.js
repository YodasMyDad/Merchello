import { LitElement as y, nothing as c, html as r, css as P, state as v, customElement as x } from "@umbraco-cms/backoffice/external/lit";
import { UmbElementMixin as $ } from "@umbraco-cms/backoffice/element-api";
import { UmbModalToken as M, UMB_MODAL_MANAGER_CONTEXT as k } from "@umbraco-cms/backoffice/modal";
import { UMB_NOTIFICATION_CONTEXT as S } from "@umbraco-cms/backoffice/notification";
import { M as p } from "./merchello-api-CzSx3Q3Y.js";
import { M as C } from "./setup-instructions-modal.token-CR5MFRlI.js";
const E = new M("Merchello.ShippingProvider.Config.Modal", {
  modal: {
    type: "sidebar",
    size: "medium"
  }
});
var I = Object.defineProperty, z = Object.getOwnPropertyDescriptor, _ = (e) => {
  throw TypeError(e);
}, u = (e, i, s, l) => {
  for (var t = l > 1 ? void 0 : l ? z(i, s) : i, g = e.length - 1, h; g >= 0; g--)
    (h = e[g]) && (t = (l ? h(i, s, t) : h(t)) || t);
  return l && t && I(i, s, t), t;
}, b = (e, i, s) => i.has(e) || _("Cannot " + s), o = (e, i, s) => (b(e, i, "read from private field"), i.get(e)), m = (e, i, s) => i.has(e) ? _("Cannot add the same private member more than once") : i instanceof WeakSet ? i.add(e) : i.set(e, s), f = (e, i, s, l) => (b(e, i, "write to private field"), i.set(e, s), s), n, d;
let a = class extends $(y) {
  constructor() {
    super(), this._availableProviders = [], this._configuredProviders = [], this._isLoading = !0, this._errorMessage = null, m(this, n), m(this, d), this.consumeContext(k, (e) => {
      f(this, n, e);
    }), this.consumeContext(S, (e) => {
      f(this, d, e);
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
    if (!o(this, n)) return;
    (await o(this, n).open(this, E, {
      data: { provider: e, configuration: i }
    }).onSubmit().catch(() => {
    }))?.saved && await this._loadProviders();
  }
  async _toggleProvider(e) {
    const { error: i } = await p.toggleShippingProvider(e.id, !e.isEnabled);
    if (i) {
      o(this, d)?.peek("danger", {
        data: { headline: "Error", message: i.message }
      });
      return;
    }
    o(this, d)?.peek("positive", {
      data: {
        headline: "Success",
        message: `${e.displayName} ${e.isEnabled ? "disabled" : "enabled"}`
      }
    }), await this._loadProviders();
  }
  async _deleteProvider(e) {
    if (!confirm(`Are you sure you want to remove ${e.displayName}?`))
      return;
    const { error: i } = await p.deleteShippingProvider(e.id);
    if (i) {
      o(this, d)?.peek("danger", {
        data: { headline: "Error", message: i.message }
      });
      return;
    }
    o(this, d)?.peek("positive", {
      data: { headline: "Success", message: `${e.displayName} removed` }
    }), await this._loadProviders();
  }
  _openSetupInstructions(e) {
    !o(this, n) || !e.setupInstructions || o(this, n).open(this, C, {
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
              label="${e.isEnabled ? "Enabled" : "Disabled"}"
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
        ${i?.description ? r`<p class="provider-description">${i.description}</p>` : c}
        ${i?.setupInstructions ? r`
              <div class="provider-footer">
                <uui-button
                  look="secondary"
                  compact
                  label="Setup Instructions"
                  title="Setup Instructions"
                  @click=${() => this._openSetupInstructions(i)}
                >
                  <uui-icon name="icon-help-alt"></uui-icon>
                  Setup Instructions
                </uui-button>
              </div>
            ` : c}
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
          ${e.description ? r`<p class="provider-description">${e.description}</p>` : c}
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
              ` : c}
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
          Toggle the switch to enable or disable a provider.
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
n = /* @__PURE__ */ new WeakMap();
d = /* @__PURE__ */ new WeakMap();
a.styles = P`
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
      justify-content: flex-start;
      align-items: center;
      margin-top: var(--uui-size-space-3);
      gap: var(--uui-size-space-3);
    }
  `;
u([
  v()
], a.prototype, "_availableProviders", 2);
u([
  v()
], a.prototype, "_configuredProviders", 2);
u([
  v()
], a.prototype, "_isLoading", 2);
u([
  v()
], a.prototype, "_errorMessage", 2);
a = u([
  x("merchello-shipping-providers-list")
], a);
const R = a;
export {
  a as MerchelloShippingProvidersListElement,
  R as default
};
//# sourceMappingURL=shipping-providers-list.element-C27PAjfY.js.map
