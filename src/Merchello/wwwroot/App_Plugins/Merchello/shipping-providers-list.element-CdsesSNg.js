import { LitElement as x, unsafeHTML as M, html as s, nothing as c, css as C, state as g, customElement as w } from "@umbraco-cms/backoffice/external/lit";
import { UmbElementMixin as I } from "@umbraco-cms/backoffice/element-api";
import { UmbModalToken as y, UMB_MODAL_MANAGER_CONTEXT as S, UMB_CONFIRM_MODAL as $ } from "@umbraco-cms/backoffice/modal";
import { UMB_NOTIFICATION_CONTEXT as E } from "@umbraco-cms/backoffice/notification";
import { M as v } from "./merchello-api-B76CV0sD.js";
import { M as L } from "./setup-instructions-modal.token-CR5MFRlI.js";
import { c as T } from "./collection-layout.styles-I8XQedsa.js";
const N = new y("Merchello.ShippingProvider.Config.Modal", {
  modal: {
    type: "sidebar",
    size: "medium"
  }
}), O = new y("Merchello.TestShippingProvider.Modal", {
  modal: {
    type: "sidebar",
    size: "medium"
  }
}), b = {
  "flat-rate": '<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/><circle cx="7" cy="7" r="1.5" fill="currentColor"/></svg>',
  truck: '<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M16 16V4H1v12h15zM16 8h4l3 3v5h-7V8z" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/><circle cx="5.5" cy="18.5" r="2.5" stroke="currentColor" stroke-width="1.5"/><circle cx="18.5" cy="18.5" r="2.5" stroke="currentColor" stroke-width="1.5"/></svg>'
};
function z(e) {
  const i = e.toLowerCase();
  return i === "flat-rate" || i.includes("flat") ? b["flat-rate"] : b.truck;
}
var R = Object.defineProperty, A = Object.getOwnPropertyDescriptor, P = (e) => {
  throw TypeError(e);
}, p = (e, i, r, a) => {
  for (var l = a > 1 ? void 0 : a ? A(i, r) : i, f = e.length - 1, m; f >= 0; f--)
    (m = e[f]) && (l = (a ? m(i, r, l) : m(l)) || l);
  return a && l && R(i, r, l), l;
}, k = (e, i, r) => i.has(e) || P("Cannot " + r), o = (e, i, r) => (k(e, i, "read from private field"), i.get(e)), _ = (e, i, r) => i.has(e) ? P("Cannot add the same private member more than once") : i instanceof WeakSet ? i.add(e) : i.set(e, r), h = (e, i, r, a) => (k(e, i, "write to private field"), i.set(e, r), r), t, u, n;
let d = class extends I(x) {
  constructor() {
    super(), this._availableProviders = [], this._configuredProviders = [], this._isLoading = !0, this._errorMessage = null, _(this, t), _(this, u), _(this, n, !1), this.consumeContext(S, (e) => {
      h(this, t, e);
    }), this.consumeContext(E, (e) => {
      h(this, u, e);
    });
  }
  connectedCallback() {
    super.connectedCallback(), h(this, n, !0), this._loadProviders();
  }
  disconnectedCallback() {
    super.disconnectedCallback(), h(this, n, !1);
  }
  async _loadProviders() {
    this._isLoading = !0, this._errorMessage = null;
    try {
      const [e, i] = await Promise.all([
        v.getAvailableShippingProviders(),
        v.getShippingProviders()
      ]);
      if (!o(this, n)) return;
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
      if (!o(this, n)) return;
      this._errorMessage = e instanceof Error ? e.message : "Failed to load providers";
    }
    this._isLoading = !1;
  }
  _getUnconfiguredProviders() {
    const e = new Set(this._configuredProviders.map((i) => i.providerKey));
    return this._availableProviders.filter(
      (i) => !e.has(i.key) && i.configCapabilities?.requiresGlobalConfig
    );
  }
  _getBuiltInProviders() {
    return this._availableProviders.filter((e) => !e.configCapabilities?.requiresGlobalConfig);
  }
  async _openConfigModal(e, i) {
    if (!o(this, t)) return;
    (await o(this, t).open(this, N, {
      data: { provider: e, configuration: i }
    }).onSubmit().catch(() => {
    }))?.isSaved && await this._loadProviders();
  }
  _openTestModal(e) {
    o(this, t) && o(this, t).open(this, O, {
      data: { configuration: e }
    });
  }
  async _toggleProvider(e) {
    const { error: i } = await v.toggleShippingProvider(e.id, !e.isEnabled);
    if (o(this, n)) {
      if (i) {
        o(this, u)?.peek("danger", {
          data: { headline: "Error", message: i.message }
        });
        return;
      }
      o(this, u)?.peek("positive", {
        data: {
          headline: "Success",
          message: `${e.displayName} ${e.isEnabled ? "disabled" : "enabled"}`
        }
      }), await this._loadProviders();
    }
  }
  async _deleteProvider(e) {
    const i = o(this, t)?.open(this, $, {
      data: {
        headline: "Remove Shipping Provider",
        content: `Remove ${e.displayName} from shipping providers.`,
        confirmLabel: "Remove",
        color: "danger"
      }
    });
    try {
      await i?.onSubmit();
    } catch {
      return;
    }
    if (!o(this, n)) return;
    const { error: r } = await v.deleteShippingProvider(e.id);
    if (o(this, n)) {
      if (r) {
        o(this, u)?.peek("danger", {
          data: { headline: "Error", message: r.message }
        });
        return;
      }
      o(this, u)?.peek("positive", {
        data: { headline: "Success", message: `${e.displayName} removed` }
      }), await this._loadProviders();
    }
  }
  _openSetupInstructions(e) {
    !o(this, t) || !e.setupInstructions || o(this, t).open(this, L, {
      data: {
        providerName: e.displayName,
        instructions: e.setupInstructions
      }
    });
  }
  _renderProviderIcon(e, i, r) {
    const a = i ?? z(e);
    return a ? s`<span class="provider-icon-svg">${M(a)}</span>` : s`<uui-icon name="${r ?? "icon-truck"}"></uui-icon>`;
  }
  _renderConfiguredProvider(e) {
    const i = e.provider;
    return s`
      <div class="provider-card configured">
        <div class="provider-header">
          <div class="provider-info">
            ${this._renderProviderIcon(e.providerKey, i?.iconSvg, i?.icon)}
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
              label="Test"
              title="Test this provider with sample data"
              @click=${() => this._openTestModal(e)}
            >
              <uui-icon name="icon-lab"></uui-icon>
            </uui-button>
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
        ${i?.description ? s`<p class="provider-description">${i.description}</p>` : c}
        ${i?.setupInstructions ? s`
              <div class="provider-footer">
                <div></div>
                <uui-button
                  look="secondary"
                  compact
                  label="Setup Instructions"
                  title="Setup Instructions"
                  @click=${() => this._openSetupInstructions(i)}
                >
                  <uui-icon name="icon-help-alt"></uui-icon>
                </uui-button>
              </div>
            ` : c}
      </div>
    `;
  }
  _renderBuiltInProvider(e) {
    return s`
      <div class="provider-card built-in">
        <div class="provider-header">
          <div class="provider-info">
            ${this._renderProviderIcon(e.key, e.iconSvg, e.icon)}
            <div class="provider-details">
              <span class="provider-name">${e.displayName}</span>
              <span class="provider-key">${e.key}</span>
            </div>
          </div>
        </div>
        ${e.description ? s`<p class="provider-description">${e.description}</p>` : c}
      </div>
    `;
  }
  _renderAvailableProvider(e) {
    return s`
      <div class="provider-card available">
        <div class="provider-header">
          <div class="provider-info">
            ${this._renderProviderIcon(e.key, e.iconSvg, e.icon)}
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
          ${e.description ? s`<p class="provider-description">${e.description}</p>` : c}
          ${e.setupInstructions ? s`
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
      return s`
        <umb-body-layout header-fit-height main-no-padding>
          <div class="content layout-container">
            <div class="loading">
              <uui-loader></uui-loader>
              <span>Loading shipping providers...</span>
            </div>
          </div>
        </umb-body-layout>
      `;
    if (this._errorMessage)
      return s`
        <umb-body-layout header-fit-height main-no-padding>
          <div class="content layout-container">
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
    const e = this._getUnconfiguredProviders(), i = this._getBuiltInProviders();
    return s`
      <umb-body-layout header-fit-height main-no-padding>
      <div class="content layout-container">
      <!-- Built-in Providers (always available, no config needed) -->
      ${i.length > 0 ? s`
            <uui-box headline="Built-in Providers">
              <p class="section-description">
                These providers are built-in and always available. No configuration required.
                Add shipping methods using these providers in your <strong>Warehouses</strong>.
              </p>
              <div class="providers-list">
                ${i.map((r) => this._renderBuiltInProvider(r))}
              </div>
            </uui-box>
          ` : c}

      <!-- Configured Third-Party Providers -->
      <uui-box headline="Configured Shipping Providers">
        <p class="section-description">
          These shipping providers are installed and configured.
          Toggle the switch to enable or disable a provider.
        </p>
        ${this._configuredProviders.length === 0 ? s`<p class="no-items">No third-party shipping providers configured yet.</p>` : s`
              <div class="providers-list">
                ${this._configuredProviders.map(
      (r) => this._renderConfiguredProvider(r)
    )}
              </div>
            `}
      </uui-box>

      <!-- Available Third-Party Providers -->
      ${e.length > 0 ? s`
            <uui-box headline="Available Shipping Providers">
              <p class="section-description">
                These shipping providers require API credentials. Click "Install" to configure.
              </p>
              <div class="providers-list">
                ${e.map(
      (r) => this._renderAvailableProvider(r)
    )}
              </div>
            </uui-box>
          ` : c}
      </div>
      </umb-body-layout>
    `;
  }
};
t = /* @__PURE__ */ new WeakMap();
u = /* @__PURE__ */ new WeakMap();
n = /* @__PURE__ */ new WeakMap();
d.styles = [
  T,
  C`
    :host {
      display: block;
      height: 100%;
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
  `
];
p([
  g()
], d.prototype, "_availableProviders", 2);
p([
  g()
], d.prototype, "_configuredProviders", 2);
p([
  g()
], d.prototype, "_isLoading", 2);
p([
  g()
], d.prototype, "_errorMessage", 2);
d = p([
  w("merchello-shipping-providers-list")
], d);
const j = d;
export {
  d as MerchelloShippingProvidersListElement,
  j as default
};
//# sourceMappingURL=shipping-providers-list.element-CdsesSNg.js.map
