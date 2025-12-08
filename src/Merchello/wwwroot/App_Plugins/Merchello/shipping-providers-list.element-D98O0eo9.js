import { LitElement as P, nothing as d, html as r, css as $, state as g, customElement as k } from "@umbraco-cms/backoffice/external/lit";
import { UmbElementMixin as x } from "@umbraco-cms/backoffice/element-api";
import { UmbModalToken as C, UMB_MODAL_MANAGER_CONTEXT as M } from "@umbraco-cms/backoffice/modal";
import { UMB_NOTIFICATION_CONTEXT as I } from "@umbraco-cms/backoffice/notification";
import { M as v } from "./merchello-api-DuHTSXU5.js";
import { M as S } from "./setup-instructions-modal.token-CR5MFRlI.js";
const w = new C("Merchello.ShippingProvider.Config.Modal", {
  modal: {
    type: "sidebar",
    size: "medium"
  }
});
var z = Object.defineProperty, E = Object.getOwnPropertyDescriptor, _ = (i) => {
  throw TypeError(i);
}, p = (i, e, s, c) => {
  for (var n = c > 1 ? void 0 : c ? E(e, s) : e, m = i.length - 1, f; m >= 0; m--)
    (f = i[m]) && (n = (c ? f(e, s, n) : f(n)) || n);
  return c && n && z(e, s, n), n;
}, y = (i, e, s) => e.has(i) || _("Cannot " + s), o = (i, e, s) => (y(i, e, "read from private field"), e.get(i)), b = (i, e, s) => e.has(i) ? _("Cannot add the same private member more than once") : e instanceof WeakSet ? e.add(i) : e.set(i, s), h = (i, e, s, c) => (y(i, e, "write to private field"), e.set(i, s), s), l, u, a;
let t = class extends x(P) {
  constructor() {
    super(), this._availableProviders = [], this._configuredProviders = [], this._isLoading = !0, this._errorMessage = null, b(this, l), b(this, u), b(this, a, !1), this.consumeContext(M, (i) => {
      h(this, l, i);
    }), this.consumeContext(I, (i) => {
      h(this, u, i);
    });
  }
  connectedCallback() {
    super.connectedCallback(), h(this, a, !0), this._loadProviders();
  }
  disconnectedCallback() {
    super.disconnectedCallback(), h(this, a, !1);
  }
  async _loadProviders() {
    this._isLoading = !0, this._errorMessage = null;
    try {
      const [i, e] = await Promise.all([
        v.getAvailableShippingProviders(),
        v.getShippingProviders()
      ]);
      if (!o(this, a)) return;
      if (i.error) {
        this._errorMessage = i.error.message, this._isLoading = !1;
        return;
      }
      if (e.error) {
        this._errorMessage = e.error.message, this._isLoading = !1;
        return;
      }
      this._availableProviders = i.data ?? [], this._configuredProviders = e.data ?? [];
    } catch (i) {
      if (!o(this, a)) return;
      this._errorMessage = i instanceof Error ? i.message : "Failed to load providers";
    }
    this._isLoading = !1;
  }
  _getUnconfiguredProviders() {
    const i = new Set(this._configuredProviders.map((e) => e.providerKey));
    return this._availableProviders.filter(
      (e) => !i.has(e.key) && e.configCapabilities?.requiresGlobalConfig
    );
  }
  _getBuiltInProviders() {
    return this._availableProviders.filter((i) => !i.configCapabilities?.requiresGlobalConfig);
  }
  async _openConfigModal(i, e) {
    if (!o(this, l)) return;
    (await o(this, l).open(this, w, {
      data: { provider: i, configuration: e }
    }).onSubmit().catch(() => {
    }))?.saved && await this._loadProviders();
  }
  async _toggleProvider(i) {
    const { error: e } = await v.toggleShippingProvider(i.id, !i.isEnabled);
    if (o(this, a)) {
      if (e) {
        o(this, u)?.peek("danger", {
          data: { headline: "Error", message: e.message }
        });
        return;
      }
      o(this, u)?.peek("positive", {
        data: {
          headline: "Success",
          message: `${i.displayName} ${i.isEnabled ? "disabled" : "enabled"}`
        }
      }), await this._loadProviders();
    }
  }
  async _deleteProvider(i) {
    if (!confirm(`Are you sure you want to remove ${i.displayName}?`))
      return;
    const { error: e } = await v.deleteShippingProvider(i.id);
    if (o(this, a)) {
      if (e) {
        o(this, u)?.peek("danger", {
          data: { headline: "Error", message: e.message }
        });
        return;
      }
      o(this, u)?.peek("positive", {
        data: { headline: "Success", message: `${i.displayName} removed` }
      }), await this._loadProviders();
    }
  }
  _openSetupInstructions(i) {
    !o(this, l) || !i.setupInstructions || o(this, l).open(this, S, {
      data: {
        providerName: i.displayName,
        instructions: i.setupInstructions
      }
    });
  }
  _renderConfiguredProvider(i) {
    const e = i.provider;
    return r`
      <div class="provider-card configured">
        <div class="provider-header">
          <div class="provider-info">
            ${e?.icon ? r`<uui-icon name="${e.icon}"></uui-icon>` : r`<uui-icon name="icon-truck"></uui-icon>`}
            <div class="provider-details">
              <span class="provider-name">${i.displayName}</span>
              <span class="provider-key">${i.providerKey}</span>
            </div>
          </div>
          <div class="provider-actions">
            <uui-toggle
              .checked=${i.isEnabled}
              @change=${() => this._toggleProvider(i)}
              label="${i.isEnabled ? "Enabled" : "Disabled"}"
            ></uui-toggle>
            <uui-button
              look="secondary"
              label="Configure"
              @click=${() => e && this._openConfigModal(e, i)}
            >
              <uui-icon name="icon-settings"></uui-icon>
            </uui-button>
            <uui-button
              look="secondary"
              color="danger"
              label="Remove"
              @click=${() => this._deleteProvider(i)}
            >
              <uui-icon name="icon-trash"></uui-icon>
            </uui-button>
          </div>
        </div>
        ${e?.description ? r`<p class="provider-description">${e.description}</p>` : d}
        ${e?.setupInstructions ? r`
              <div class="provider-footer">
                <uui-button
                  look="secondary"
                  compact
                  label="Setup Instructions"
                  title="Setup Instructions"
                  @click=${() => this._openSetupInstructions(e)}
                >
                  <uui-icon name="icon-help-alt"></uui-icon>
                  Setup Instructions
                </uui-button>
              </div>
            ` : d}
      </div>
    `;
  }
  _renderBuiltInProvider(i) {
    return r`
      <div class="provider-card built-in">
        <div class="provider-header">
          <div class="provider-info">
            ${i.icon ? r`<uui-icon name="${i.icon}"></uui-icon>` : r`<uui-icon name="icon-truck"></uui-icon>`}
            <div class="provider-details">
              <span class="provider-name">${i.displayName}</span>
              <span class="provider-key">${i.key}</span>
            </div>
          </div>
          <span class="built-in-badge">
            <uui-icon name="icon-check"></uui-icon>
            Always Available
          </span>
        </div>
        ${i.description ? r`<p class="provider-description">${i.description}</p>` : d}
      </div>
    `;
  }
  _renderAvailableProvider(i) {
    return r`
      <div class="provider-card available">
        <div class="provider-header">
          <div class="provider-info">
            ${i.icon ? r`<uui-icon name="${i.icon}"></uui-icon>` : r`<uui-icon name="icon-truck"></uui-icon>`}
            <div class="provider-details">
              <span class="provider-name">${i.displayName}</span>
              <span class="provider-key">${i.key}</span>
            </div>
          </div>
          <uui-button
            look="primary"
            label="Install"
            @click=${() => this._openConfigModal(i)}
          >
            Install
          </uui-button>
        </div>
        <div class="provider-footer">
          ${i.description ? r`<p class="provider-description">${i.description}</p>` : d}
          ${i.setupInstructions ? r`
                <uui-button
                  look="secondary"
                  compact
                  label="Setup Instructions"
                  title="Setup Instructions"
                  @click=${() => this._openSetupInstructions(i)}
                >
                  <uui-icon name="icon-help-alt"></uui-icon>
                </uui-button>
              ` : d}
        </div>
      </div>
    `;
  }
  render() {
    if (this._isLoading)
      return r`
        <umb-body-layout header-fit-height main-no-padding>
          <div class="content">
            <div class="loading">
              <uui-loader></uui-loader>
              <span>Loading shipping providers...</span>
            </div>
          </div>
        </umb-body-layout>
      `;
    if (this._errorMessage)
      return r`
        <umb-body-layout header-fit-height main-no-padding>
          <div class="content">
            <uui-box>
              <div class="error">
                <uui-icon name="icon-alert"></uui-icon>
                <span>${this._errorMessage}</span>
                <uui-button look="primary" label="Retry" @click=${this._loadProviders}>
                  Retry
                </uui-button>
              </div>
            </uui-box>
          </div>
        </umb-body-layout>
      `;
    const i = this._getUnconfiguredProviders(), e = this._getBuiltInProviders();
    return r`
      <umb-body-layout header-fit-height main-no-padding>
      <div class="content">
      <!-- Built-in Providers (always available, no config needed) -->
      ${e.length > 0 ? r`
            <uui-box headline="Built-in Providers">
              <p class="section-description">
                These providers are built-in and always available. No configuration required.
                Add shipping methods using these providers in your <strong>Warehouses</strong>.
              </p>
              <div class="providers-list">
                ${e.map((s) => this._renderBuiltInProvider(s))}
              </div>
            </uui-box>
          ` : d}

      <!-- Configured Third-Party Providers -->
      <uui-box headline="Configured Shipping Providers">
        <p class="section-description">
          These shipping providers are installed and configured.
          Toggle the switch to enable or disable a provider.
        </p>
        ${this._configuredProviders.length === 0 ? r`<p class="no-items">No third-party shipping providers configured yet.</p>` : r`
              <div class="providers-list">
                ${this._configuredProviders.map(
      (s) => this._renderConfiguredProvider(s)
    )}
              </div>
            `}
      </uui-box>

      <!-- Available Third-Party Providers -->
      ${i.length > 0 ? r`
            <uui-box headline="Available Shipping Providers">
              <p class="section-description">
                These shipping providers require API credentials. Click "Install" to configure.
              </p>
              <div class="providers-list">
                ${i.map(
      (s) => this._renderAvailableProvider(s)
    )}
              </div>
            </uui-box>
          ` : d}
      </div>
      </umb-body-layout>
    `;
  }
};
l = /* @__PURE__ */ new WeakMap();
u = /* @__PURE__ */ new WeakMap();
a = /* @__PURE__ */ new WeakMap();
t.styles = $`
    :host {
      display: block;
      height: 100%;
    }

    .content {
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

    .provider-card.built-in {
      border-left: 3px solid var(--uui-color-positive);
      background: var(--uui-color-surface-alt);
    }

    .built-in-badge {
      display: inline-flex;
      align-items: center;
      gap: var(--uui-size-space-2);
      padding: var(--uui-size-space-2) var(--uui-size-space-3);
      background: var(--uui-color-positive-standalone);
      color: var(--uui-color-positive-contrast);
      border-radius: var(--uui-border-radius);
      font-size: 0.75rem;
      font-weight: 600;
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
p([
  g()
], t.prototype, "_availableProviders", 2);
p([
  g()
], t.prototype, "_configuredProviders", 2);
p([
  g()
], t.prototype, "_isLoading", 2);
p([
  g()
], t.prototype, "_errorMessage", 2);
t = p([
  k("merchello-shipping-providers-list")
], t);
const B = t;
export {
  t as MerchelloShippingProvidersListElement,
  B as default
};
//# sourceMappingURL=shipping-providers-list.element-D98O0eo9.js.map
