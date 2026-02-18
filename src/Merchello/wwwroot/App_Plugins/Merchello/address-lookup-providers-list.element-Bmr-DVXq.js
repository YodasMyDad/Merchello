import { LitElement as k, unsafeHTML as z, html as a, nothing as g, css as w, state as v, customElement as M } from "@umbraco-cms/backoffice/external/lit";
import { UmbElementMixin as A } from "@umbraco-cms/backoffice/element-api";
import { UmbModalToken as _, UMB_MODAL_MANAGER_CONTEXT as D } from "@umbraco-cms/backoffice/modal";
import { UMB_NOTIFICATION_CONTEXT as P } from "@umbraco-cms/backoffice/notification";
import { M as f } from "./merchello-api-COnU_HX2.js";
const $ = new _("Merchello.AddressLookupProvider.Config.Modal", {
  modal: {
    type: "sidebar",
    size: "medium"
  }
}), C = new _("Merchello.AddressLookupProvider.Test.Modal", {
  modal: {
    type: "sidebar",
    size: "medium"
  }
});
var L = Object.defineProperty, E = Object.getOwnPropertyDescriptor, y = (i) => {
  throw TypeError(i);
}, l = (i, e, t, d) => {
  for (var n = d > 1 ? void 0 : d ? E(e, t) : e, m = i.length - 1, h; m >= 0; m--)
    (h = i[m]) && (n = (d ? h(e, t, n) : h(n)) || n);
  return d && n && L(e, t, n), n;
}, x = (i, e, t) => e.has(i) || y("Cannot " + t), s = (i, e, t) => (x(i, e, "read from private field"), e.get(i)), b = (i, e, t) => e.has(i) ? y("Cannot add the same private member more than once") : e instanceof WeakSet ? e.add(i) : e.set(i, t), p = (i, e, t, d) => (x(i, e, "write to private field"), e.set(i, t), t), u, c, r;
let o = class extends A(k) {
  constructor() {
    super(), this._providers = [], this._isLoading = !0, this._isDeactivating = !1, this._errorMessage = null, b(this, u), b(this, c), b(this, r, !1), this.consumeContext(D, (i) => {
      p(this, u, i);
    }), this.consumeContext(P, (i) => {
      p(this, c, i);
    });
  }
  connectedCallback() {
    super.connectedCallback(), p(this, r, !0), this._loadData();
  }
  disconnectedCallback() {
    super.disconnectedCallback(), p(this, r, !1);
  }
  async _loadData() {
    this._isLoading = !0, this._errorMessage = null;
    try {
      const { data: i, error: e } = await f.getAddressLookupProviders();
      if (!s(this, r)) return;
      if (e) {
        this._errorMessage = e.message, this._isLoading = !1;
        return;
      }
      this._providers = i ?? [];
    } catch (i) {
      if (!s(this, r)) return;
      this._errorMessage = i instanceof Error ? i.message : "Failed to load providers";
    }
    this._isLoading = !1;
  }
  async _activateProvider(i) {
    if (i.isActive) return;
    const { error: e } = await f.activateAddressLookupProvider(i.alias);
    if (s(this, r)) {
      if (e) {
        s(this, c)?.peek("danger", {
          data: { headline: "Error", message: e.message }
        });
        return;
      }
      s(this, c)?.peek("positive", {
        data: {
          headline: "Success",
          message: `${i.displayName} is now the active address lookup provider`
        }
      }), await this._loadData();
    }
  }
  async _deactivateProviders() {
    if (this._isDeactivating) return;
    this._isDeactivating = !0;
    const { error: i } = await f.deactivateAddressLookupProviders();
    if (s(this, r)) {
      if (this._isDeactivating = !1, i) {
        s(this, c)?.peek("danger", {
          data: { headline: "Error", message: i.message }
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
  _openConfigModal(i) {
    if (!s(this, u)) return;
    s(this, u).open(this, $, {
      data: { provider: i }
    }).onSubmit().then((t) => {
      t?.isSaved && this._loadData();
    }).catch(() => {
    });
  }
  _openTestModal(i) {
    s(this, u) && s(this, u).open(this, C, {
      data: { provider: i }
    });
  }
  _getActiveProvider() {
    return this._providers.find((i) => i.isActive);
  }
  _formatSupportedCountries(i) {
    if (!i) return "—";
    const e = i.supportedCountries;
    return !e || e.length === 0 || e.some((t) => t === "*") ? "All countries" : e.join(", ");
  }
  _renderProviderIcon(i) {
    return i.iconSvg ? a`<span class="provider-icon-svg">${z(i.iconSvg)}</span>` : a`<uui-icon name="${i.icon ?? "icon-map-location"}"></uui-icon>`;
  }
  _renderStatusBox() {
    const i = this._getActiveProvider();
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
            ?disabled=${!i || this._isDeactivating}
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
              <span class="status-card-value">${i?.displayName ?? "None configured"}</span>
            </div>
          </div>

          <div class="status-card">
            <div class="status-card-icon">
              <uui-icon name="icon-globe"></uui-icon>
            </div>
            <div class="status-card-content">
              <span class="status-card-label">Coverage</span>
              <span class="status-card-value small">${this._formatSupportedCountries(i)}</span>
            </div>
          </div>

          <div class="status-card">
            <div class="status-card-icon">
              <uui-icon name="icon-check"></uui-icon>
            </div>
            <div class="status-card-content">
              <span class="status-card-label">Checkout Status</span>
              <span class="status-card-value">${i ? "Enabled" : "Disabled"}</span>
            </div>
          </div>
        </div>

        <p class="status-hint">
          Only one provider can be active at a time. Disable to fall back to manual address entry only.
        </p>
      </uui-box>
    `;
  }
  _renderProvider(i) {
    return a`
      <div class="provider-card ${i.isActive ? "active" : ""}">
        <div class="provider-main">
          <div class="provider-info">
            <div class="provider-icon">
              ${this._renderProviderIcon(i)}
            </div>
            <div class="provider-details">
              <span class="provider-name">${i.displayName}</span>
              <span class="provider-alias">${i.alias}</span>
              ${i.description ? a`<p class="provider-description">${i.description}</p>` : g}
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
            ${i.isActive ? a`
                  <uui-button
                    look="secondary"
                    compact
                    label="Disable"
                    @click=${this._deactivateProviders}
                    ?disabled=${this._isDeactivating}
                  >
                    <uui-icon name="icon-remove"></uui-icon>
                  </uui-button>
                ` : g}
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

        ${i.setupInstructions ? a`<p class="provider-setup">${i.setupInstructions}</p>` : g}
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
                    ${this._providers.map((i) => this._renderProvider(i))}
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

    .provider-setup {
      margin: var(--uui-size-space-4) 0 0 0;
      font-size: 0.8125rem;
      color: var(--uui-color-text-alt);
    }
  `;
l([
  v()
], o.prototype, "_providers", 2);
l([
  v()
], o.prototype, "_isLoading", 2);
l([
  v()
], o.prototype, "_isDeactivating", 2);
l([
  v()
], o.prototype, "_errorMessage", 2);
o = l([
  M("merchello-address-lookup-providers-list")
], o);
const R = o;
export {
  o as MerchelloAddressLookupProvidersListElement,
  R as default
};
//# sourceMappingURL=address-lookup-providers-list.element-Bmr-DVXq.js.map
