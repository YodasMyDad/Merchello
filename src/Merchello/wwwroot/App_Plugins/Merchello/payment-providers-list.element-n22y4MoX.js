import { LitElement as k, html as r, nothing as n, css as M, state as p, property as I, customElement as C, query as S } from "@umbraco-cms/backoffice/external/lit";
import { UmbElementMixin as $ } from "@umbraco-cms/backoffice/element-api";
import { UmbModalToken as z, UMB_MODAL_MANAGER_CONTEXT as O, UMB_CONFIRM_MODAL as N } from "@umbraco-cms/backoffice/modal";
import { UMB_NOTIFICATION_CONTEXT as R } from "@umbraco-cms/backoffice/notification";
import { M as b } from "./merchello-api-BxVn4Zbt.js";
import { M as D } from "./setup-instructions-modal.token-CR5MFRlI.js";
const U = new z("Merchello.PaymentProvider.Config.Modal", {
  modal: {
    type: "sidebar",
    size: "medium"
  }
}), W = new z("Merchello.TestPaymentProvider.Modal", {
  modal: {
    type: "sidebar",
    size: "medium"
  }
});
var F = Object.defineProperty, B = Object.getOwnPropertyDescriptor, E = (e) => {
  throw TypeError(e);
}, g = (e, i, a, o) => {
  for (var s = o > 1 ? void 0 : o ? B(i, a) : i, v = e.length - 1, h; v >= 0; v--)
    (h = e[v]) && (s = (o ? h(i, a, s) : h(s)) || s);
  return o && s && F(i, a, s), s;
}, L = (e, i, a) => i.has(e) || E("Cannot " + a), x = (e, i, a) => (L(e, i, "read from private field"), i.get(e)), H = (e, i, a) => i.has(e) ? E("Cannot add the same private member more than once") : i instanceof WeakSet ? i.add(e) : i.set(e, a), P = (e, i, a, o) => (L(e, i, "write to private field"), i.set(e, a), a), m;
let c = class extends $(k) {
  constructor() {
    super(...arguments), this._preview = null, this._isLoading = !0, this._errorMessage = null, this._isCollapsed = !1, this.autoLoad = !0, H(this, m, !1);
  }
  connectedCallback() {
    super.connectedCallback(), P(this, m, !0), this.autoLoad && this.loadPreview();
  }
  disconnectedCallback() {
    super.disconnectedCallback(), P(this, m, !1);
  }
  async loadPreview() {
    this._isLoading = !0, this._errorMessage = null;
    try {
      const e = await b.getCheckoutPaymentPreview();
      if (!x(this, m)) return;
      if (e.error) {
        this._errorMessage = e.error.message, this._isLoading = !1;
        return;
      }
      this._preview = e.data ?? null;
    } catch (e) {
      if (!x(this, m)) return;
      this._errorMessage = e instanceof Error ? e.message : "Failed to load preview";
    }
    this._isLoading = !1;
  }
  _toggleCollapsed() {
    this._isCollapsed = !this._isCollapsed;
  }
  _getMethodIcon(e) {
    if (e.icon) return e.icon;
    const i = e.displayName.toLowerCase();
    return i.includes("apple") ? "icon-apple" : i.includes("google") ? "icon-google" : i.includes("paypal") ? "icon-paypal" : i.includes("card") ? "icon-credit-card" : i.includes("link") ? "icon-link" : "icon-credit-card";
  }
  _renderMethod(e, i = !1) {
    return r`
      <div class="method-row ${i ? "outranked" : ""}">
        <div class="method-info">
          <uui-icon name="${this._getMethodIcon(e)}"></uui-icon>
          <span class="method-name">${e.displayName}</span>
        </div>
        <div class="method-provider">
          ${i ? r`<span class="outranked-text">outranked by ${e.outrankedBy}</span>` : r`<span class="via-text">via ${e.providerDisplayName}</span>`}
        </div>
      </div>
    `;
  }
  _renderSection(e, i, a = !1) {
    return i.length === 0 ? n : r`
      <div class="preview-section">
        <h4 class="section-title">${e}</h4>
        <div class="methods-list">
          ${i.map((o) => this._renderMethod(o, a))}
        </div>
      </div>
    `;
  }
  _hasAnyMethods() {
    return this._preview ? this._preview.expressMethods.length > 0 || this._preview.standardMethods.length > 0 || this._preview.hiddenMethods.length > 0 : !1;
  }
  render() {
    return this._isLoading ? r`
        <div class="preview-box">
          <div class="preview-header">
            <span class="preview-title">Checkout Preview</span>
          </div>
          <div class="preview-loading">
            <uui-loader-bar></uui-loader-bar>
          </div>
        </div>
      ` : this._errorMessage ? r`
        <div class="preview-box error">
          <div class="preview-header">
            <span class="preview-title">Checkout Preview</span>
          </div>
          <div class="preview-error">
            <uui-icon name="icon-alert"></uui-icon>
            <span>${this._errorMessage}</span>
          </div>
        </div>
      ` : this._hasAnyMethods() ? r`
      <div class="preview-box">
        <div class="preview-header" @click=${this._toggleCollapsed}>
          <div class="header-left">
            <uui-icon name="${this._isCollapsed ? "icon-navigation-right" : "icon-navigation-down"}"></uui-icon>
            <span class="preview-title">Checkout Preview</span>
          </div>
          <span class="preview-subtitle">What customers will see at checkout</span>
        </div>
        ${this._isCollapsed ? n : r`
              <div class="preview-content">
                ${this._renderSection("Express Checkout", this._preview?.expressMethods ?? [])}
                ${this._renderSection("Standard Payment", this._preview?.standardMethods ?? [])}
                ${this._preview?.hiddenMethods.length ? r`
                      <div class="hidden-section">
                        ${this._renderSection(
      "Hidden (outranked by lower sort order)",
      this._preview?.hiddenMethods ?? [],
      !0
    )}
                      </div>
                    ` : n}
              </div>
            `}
      </div>
    ` : r`
        <div class="preview-box empty">
          <div class="preview-header">
            <span class="preview-title">Checkout Preview</span>
          </div>
          <div class="preview-empty">
            <uui-icon name="icon-info"></uui-icon>
            <span>No payment methods are enabled for checkout.</span>
          </div>
        </div>
      `;
  }
};
m = /* @__PURE__ */ new WeakMap();
c.styles = M`
    :host {
      display: block;
    }

    .preview-box {
      background: var(--uui-color-surface);
      border: 1px solid var(--uui-color-border);
      border-radius: var(--uui-border-radius);
      margin-bottom: var(--uui-size-layout-1);
    }

    .preview-box.error {
      border-color: var(--uui-color-danger);
    }

    .preview-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: var(--uui-size-space-4);
      cursor: pointer;
      user-select: none;
    }

    .preview-header:hover {
      background: var(--uui-color-surface-alt);
    }

    .header-left {
      display: flex;
      align-items: center;
      gap: var(--uui-size-space-2);
    }

    .header-left > uui-icon {
      font-size: 0.875rem;
      color: var(--uui-color-text-alt);
    }

    .preview-title {
      font-weight: 600;
      font-size: 0.9375rem;
    }

    .preview-subtitle {
      font-size: 0.8125rem;
      color: var(--uui-color-text-alt);
    }

    .preview-loading {
      padding: var(--uui-size-space-4);
    }

    .preview-error,
    .preview-empty {
      display: flex;
      align-items: center;
      gap: var(--uui-size-space-3);
      padding: var(--uui-size-space-4);
      color: var(--uui-color-text-alt);
      font-size: 0.875rem;
    }

    .preview-error {
      color: var(--uui-color-danger);
    }

    .preview-content {
      padding: 0 var(--uui-size-space-4) var(--uui-size-space-4);
    }

    .preview-section {
      margin-bottom: var(--uui-size-space-4);
    }

    .preview-section:last-child {
      margin-bottom: 0;
    }

    .section-title {
      font-size: 0.75rem;
      font-weight: 600;
      color: var(--uui-color-text-alt);
      text-transform: uppercase;
      letter-spacing: 0.05em;
      margin: 0 0 var(--uui-size-space-2) 0;
    }

    .methods-list {
      display: flex;
      flex-direction: column;
      gap: var(--uui-size-space-1);
    }

    .method-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: var(--uui-size-space-2) var(--uui-size-space-3);
      background: var(--uui-color-surface-alt);
      border-radius: var(--uui-border-radius);
    }

    .method-row.outranked {
      opacity: 0.6;
    }

    .method-info {
      display: flex;
      align-items: center;
      gap: var(--uui-size-space-2);
    }

    .method-info > uui-icon {
      font-size: 1rem;
      color: var(--uui-color-text-alt);
    }

    .method-name {
      font-size: 0.875rem;
      font-weight: 500;
    }

    .method-provider {
      font-size: 0.75rem;
      color: var(--uui-color-text-alt);
    }

    .via-text {
      color: var(--uui-color-positive);
    }

    .outranked-text {
      font-style: italic;
    }

    .hidden-section {
      border-top: 1px dashed var(--uui-color-border);
      padding-top: var(--uui-size-space-4);
      margin-top: var(--uui-size-space-2);
    }

    .hidden-section .section-title {
      color: var(--uui-color-text-alt);
    }
  `;
g([
  p()
], c.prototype, "_preview", 2);
g([
  p()
], c.prototype, "_isLoading", 2);
g([
  p()
], c.prototype, "_errorMessage", 2);
g([
  p()
], c.prototype, "_isCollapsed", 2);
g([
  I({ type: Boolean, attribute: "auto-load" })
], c.prototype, "autoLoad", 2);
c = g([
  C("merchello-checkout-payment-preview")
], c);
var G = Object.defineProperty, j = Object.getOwnPropertyDescriptor, A = (e) => {
  throw TypeError(e);
}, _ = (e, i, a, o) => {
  for (var s = o > 1 ? void 0 : o ? j(i, a) : i, v = e.length - 1, h; v >= 0; v--)
    (h = e[v]) && (s = (o ? h(i, a, s) : h(s)) || s);
  return o && s && G(i, a, s), s;
}, T = (e, i, a) => i.has(e) || A("Cannot " + a), t = (e, i, a) => (T(e, i, "read from private field"), i.get(e)), w = (e, i, a) => i.has(e) ? A("Cannot add the same private member more than once") : i instanceof WeakSet ? i.add(e) : i.set(e, a), y = (e, i, a, o) => (T(e, i, "write to private field"), i.set(e, a), a), d, f, l;
let u = class extends $(k) {
  constructor() {
    super(), this._availableProviders = [], this._configuredProviders = [], this._isLoading = !0, this._errorMessage = null, w(this, d), w(this, f), w(this, l, !1), this.consumeContext(O, (e) => {
      y(this, d, e);
    }), this.consumeContext(R, (e) => {
      y(this, f, e);
    });
  }
  connectedCallback() {
    super.connectedCallback(), y(this, l, !0), this._loadProviders();
  }
  disconnectedCallback() {
    super.disconnectedCallback(), y(this, l, !1);
  }
  async _loadProviders() {
    this._isLoading = !0, this._errorMessage = null;
    try {
      const [e, i] = await Promise.all([
        b.getAvailablePaymentProviders(),
        b.getPaymentProviders()
      ]);
      if (!t(this, l)) return;
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
      if (!t(this, l)) return;
      this._errorMessage = e instanceof Error ? e.message : "Failed to load providers";
    }
    this._isLoading = !1, await this._previewElement?.loadPreview();
  }
  _getUnconfiguredProviders() {
    const e = new Set(this._configuredProviders.map((i) => i.providerAlias));
    return this._availableProviders.filter((i) => !e.has(i.alias));
  }
  async _openConfigModal(e, i) {
    if (!t(this, d)) return;
    (await t(this, d).open(this, U, {
      data: { provider: e, setting: i }
    }).onSubmit().catch(() => {
    }))?.isSaved && await this._loadProviders();
  }
  async _toggleProvider(e) {
    const { error: i } = await b.togglePaymentProvider(e.id, !e.isEnabled);
    if (t(this, l)) {
      if (i) {
        t(this, f)?.peek("danger", {
          data: { headline: "Error", message: i.message }
        });
        return;
      }
      t(this, f)?.peek("positive", {
        data: {
          headline: "Success",
          message: `${e.displayName} ${e.isEnabled ? "hidden from checkout" : "now showing in checkout"}`
        }
      }), await this._loadProviders();
    }
  }
  async _deleteProvider(e) {
    if (!await t(this, d)?.open(this, N, {
      data: {
        headline: "Remove Payment Provider",
        content: `Are you sure you want to remove ${e.displayName}? This action cannot be undone.`,
        confirmLabel: "Remove",
        color: "danger"
      }
    })?.onSubmit().catch(() => {
    }) || !t(this, l)) return;
    const { error: o } = await b.deletePaymentProvider(e.id);
    if (t(this, l)) {
      if (o) {
        t(this, f)?.peek("danger", {
          data: { headline: "Error", message: o.message }
        });
        return;
      }
      t(this, f)?.peek("positive", {
        data: { headline: "Success", message: `${e.displayName} removed` }
      }), await this._loadProviders();
    }
  }
  _openSetupInstructions(e) {
    !t(this, d) || !e.setupInstructions || t(this, d).open(this, D, {
      data: {
        providerName: e.displayName,
        instructions: e.setupInstructions
      }
    });
  }
  _openTestModal(e) {
    t(this, d) && t(this, d).open(this, W, {
      data: { setting: e }
    });
  }
  _renderConfiguredProvider(e) {
    const i = e.provider;
    return r`
      <div class="provider-card configured">
        <div class="provider-header">
          <div class="provider-info">
            ${i?.icon ? r`<uui-icon name="${i.icon}"></uui-icon>` : r`<uui-icon name="icon-credit-card"></uui-icon>`}
            <div class="provider-details">
              <span class="provider-name">${e.displayName}</span>
              <span class="provider-alias">${e.providerAlias}</span>
            </div>
          </div>
          <div class="provider-actions">
            <uui-toggle
              .checked=${e.isEnabled}
              @change=${() => this._toggleProvider(e)}
              label="${e.isEnabled ? "In Checkout" : "Hide From Checkout"}"
            ></uui-toggle>
            <uui-button
              look="secondary"
              label="Test"
              title="Test this provider configuration"
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
        ${i?.description ? r`<p class="provider-description">${i.description}</p>` : n}
        <div class="provider-footer">
          <div class="provider-features">
            ${e.isTestMode ? r`<span class="feature-badge test-mode">Test Mode</span>` : r`<span class="feature-badge live-mode">Live</span>`}
            ${i?.supportsRefunds ? r`<span class="feature-badge">Refunds</span>` : n}
            ${i?.supportsPartialRefunds ? r`<span class="feature-badge">Partial Refunds</span>` : n}
            ${i?.usesRedirectCheckout ? r`<span class="feature-badge">Redirect Checkout</span>` : n}
            ${i?.supportsAuthAndCapture ? r`<span class="feature-badge">Auth & Capture</span>` : n}
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
              ` : n}
        </div>
      </div>
    `;
  }
  _renderAvailableProvider(e) {
    return r`
      <div class="provider-card available">
        <div class="provider-header">
          <div class="provider-info">
            ${e.icon ? r`<uui-icon name="${e.icon}"></uui-icon>` : r`<uui-icon name="icon-credit-card"></uui-icon>`}
            <div class="provider-details">
              <span class="provider-name">${e.displayName}</span>
              <span class="provider-alias">${e.alias}</span>
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
          ${e.description ? r`<p class="provider-description">${e.description}</p>` : n}
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
              ` : n}
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
              <span>Loading payment providers...</span>
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
    const e = this._getUnconfiguredProviders();
    return r`
      <umb-body-layout header-fit-height main-no-padding>
      <div class="content">
      <merchello-checkout-payment-preview></merchello-checkout-payment-preview>
      <uui-box headline="Configured Payment Providers">
        <p class="section-description">
          These payment providers are installed and configured.
          Toggle the switch to show or hide a provider from checkout.
        </p>
        ${this._configuredProviders.length === 0 ? r`<p class="no-items">No payment providers configured yet.</p>` : r`
              <div class="providers-list">
                ${this._configuredProviders.map(
      (i) => this._renderConfiguredProvider(i)
    )}
              </div>
            `}
      </uui-box>

      <uui-box headline="Available Payment Providers">
        <p class="section-description">
          These payment providers are available but not yet configured.
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
      </div>
      </umb-body-layout>
    `;
  }
};
d = /* @__PURE__ */ new WeakMap();
f = /* @__PURE__ */ new WeakMap();
l = /* @__PURE__ */ new WeakMap();
u.styles = M`
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

    .provider-alias {
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
_([
  p()
], u.prototype, "_availableProviders", 2);
_([
  p()
], u.prototype, "_configuredProviders", 2);
_([
  p()
], u.prototype, "_isLoading", 2);
_([
  p()
], u.prototype, "_errorMessage", 2);
_([
  S("merchello-checkout-payment-preview")
], u.prototype, "_previewElement", 2);
u = _([
  C("merchello-payment-providers-list")
], u);
const Q = u;
export {
  u as MerchelloPaymentProvidersListElement,
  Q as default
};
//# sourceMappingURL=payment-providers-list.element-n22y4MoX.js.map
