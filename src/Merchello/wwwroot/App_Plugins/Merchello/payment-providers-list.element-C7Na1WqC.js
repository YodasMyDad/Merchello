import { LitElement as k, html as r, nothing as d, css as C, state as p, property as T, customElement as $, query as S } from "@umbraco-cms/backoffice/external/lit";
import { UmbElementMixin as z } from "@umbraco-cms/backoffice/element-api";
import { UmbModalToken as x, UMB_MODAL_MANAGER_CONTEXT as O, UMB_CONFIRM_MODAL as N } from "@umbraco-cms/backoffice/modal";
import { UMB_NOTIFICATION_CONTEXT as R } from "@umbraco-cms/backoffice/notification";
import { M as b } from "./merchello-api-Z_Hs6xGH.js";
import { M as D } from "./setup-instructions-modal.token-CR5MFRlI.js";
import { g as H, a as U } from "./brand-icons-Dfynzp_2.js";
const F = new x("Merchello.PaymentProvider.Config.Modal", {
  modal: {
    type: "sidebar",
    size: "medium"
  }
}), W = new x("Merchello.PaymentMethods.Config.Modal", {
  modal: {
    type: "sidebar",
    size: "small"
  }
}), B = new x("Merchello.TestPaymentProvider.Modal", {
  modal: {
    type: "sidebar",
    size: "medium"
  }
});
var G = Object.defineProperty, j = Object.getOwnPropertyDescriptor, E = (e) => {
  throw TypeError(e);
}, f = (e, i, t, o) => {
  for (var s = o > 1 ? void 0 : o ? j(i, t) : i, v = e.length - 1, h; v >= 0; v--)
    (h = e[v]) && (s = (o ? h(i, t, s) : h(s)) || s);
  return o && s && G(i, t, s), s;
}, L = (e, i, t) => i.has(e) || E("Cannot " + t), P = (e, i, t) => (L(e, i, "read from private field"), i.get(e)), Y = (e, i, t) => i.has(e) ? E("Cannot add the same private member more than once") : i instanceof WeakSet ? i.add(e) : i.set(e, t), M = (e, i, t, o) => (L(e, i, "write to private field"), i.set(e, t), t), m;
let c = class extends z(k) {
  constructor() {
    super(...arguments), this._preview = null, this._isLoading = !0, this._errorMessage = null, this._isCollapsed = !1, this.autoLoad = !0, Y(this, m, !1);
  }
  connectedCallback() {
    super.connectedCallback(), M(this, m, !0), this.autoLoad && this.loadPreview();
  }
  disconnectedCallback() {
    super.disconnectedCallback(), M(this, m, !1);
  }
  async loadPreview() {
    this._isLoading = !0, this._errorMessage = null;
    try {
      const e = await b.getCheckoutPaymentPreview();
      if (!P(this, m)) return;
      if (e.error) {
        this._errorMessage = e.error.message, this._isLoading = !1;
        return;
      }
      this._preview = e.data ?? null;
    } catch (e) {
      if (!P(this, m)) return;
      this._errorMessage = e instanceof Error ? e.message : "Failed to load preview";
    }
    this._isLoading = !1;
  }
  _toggleCollapsed() {
    this._isCollapsed = !this._isCollapsed;
  }
  _renderMethodIcon(e) {
    const i = H(e.methodAlias);
    return i ? r`<span class="method-icon-svg" .innerHTML=${i}></span>` : r`<uui-icon name="${e.icon ?? "icon-credit-card"}"></uui-icon>`;
  }
  _renderMethod(e, i = !1) {
    return r`
      <div class="method-row ${i ? "outranked" : ""}">
        <div class="method-info">
          ${this._renderMethodIcon(e)}
          <span class="method-name">${e.displayName}</span>
        </div>
        <div class="method-provider">
          ${i ? r`<span class="outranked-text">outranked by ${e.outrankedBy}</span>` : r`<span class="via-text">via ${e.providerDisplayName}</span>`}
        </div>
      </div>
    `;
  }
  _renderSection(e, i, t = !1) {
    return i.length === 0 ? d : r`
      <div class="preview-section">
        <h4 class="section-title">${e}</h4>
        <div class="methods-list">
          ${i.map((o) => this._renderMethod(o, t))}
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
        ${this._isCollapsed ? d : r`
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
                    ` : d}
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
c.styles = C`
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

    .method-icon-svg {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 20px;
      height: 20px;
    }

    .method-icon-svg svg {
      width: 100%;
      height: 100%;
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
f([
  p()
], c.prototype, "_preview", 2);
f([
  p()
], c.prototype, "_isLoading", 2);
f([
  p()
], c.prototype, "_errorMessage", 2);
f([
  p()
], c.prototype, "_isCollapsed", 2);
f([
  T({ type: Boolean, attribute: "auto-load" })
], c.prototype, "autoLoad", 2);
c = f([
  $("merchello-checkout-payment-preview")
], c);
var V = Object.defineProperty, X = Object.getOwnPropertyDescriptor, I = (e) => {
  throw TypeError(e);
}, _ = (e, i, t, o) => {
  for (var s = o > 1 ? void 0 : o ? X(i, t) : i, v = e.length - 1, h; v >= 0; v--)
    (h = e[v]) && (s = (o ? h(i, t, s) : h(s)) || s);
  return o && s && V(i, t, s), s;
}, A = (e, i, t) => i.has(e) || I("Cannot " + t), a = (e, i, t) => (A(e, i, "read from private field"), i.get(e)), w = (e, i, t) => i.has(e) ? I("Cannot add the same private member more than once") : i instanceof WeakSet ? i.add(e) : i.set(e, t), y = (e, i, t, o) => (A(e, i, "write to private field"), i.set(e, t), t), n, g, l;
let u = class extends z(k) {
  constructor() {
    super(), this._availableProviders = [], this._configuredProviders = [], this._isLoading = !0, this._errorMessage = null, w(this, n), w(this, g), w(this, l, !1), this.consumeContext(O, (e) => {
      y(this, n, e);
    }), this.consumeContext(R, (e) => {
      y(this, g, e);
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
      if (!a(this, l)) return;
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
      if (!a(this, l)) return;
      this._errorMessage = e instanceof Error ? e.message : "Failed to load providers";
    }
    this._isLoading = !1, await this._previewElement?.loadPreview();
  }
  _getUnconfiguredProviders() {
    const e = new Set(this._configuredProviders.map((i) => i.providerAlias));
    return this._availableProviders.filter((i) => !e.has(i.alias));
  }
  async _openConfigModal(e, i) {
    if (!a(this, n)) return;
    (await a(this, n).open(this, F, {
      data: { provider: e, setting: i }
    }).onSubmit().catch(() => {
    }))?.isSaved && await this._loadProviders();
  }
  async _openMethodsModal(e) {
    if (!a(this, n)) return;
    (await a(this, n).open(this, W, {
      data: { setting: e }
    }).onSubmit().catch(() => {
    }))?.isChanged && await this._previewElement?.loadPreview();
  }
  async _toggleProvider(e) {
    const { error: i } = await b.togglePaymentProvider(e.id, !e.isEnabled);
    if (a(this, l)) {
      if (i) {
        a(this, g)?.peek("danger", {
          data: { headline: "Error", message: i.message }
        });
        return;
      }
      a(this, g)?.peek("positive", {
        data: {
          headline: "Success",
          message: `${e.displayName} ${e.isEnabled ? "hidden from checkout" : "now showing in checkout"}`
        }
      }), await this._loadProviders();
    }
  }
  async _deleteProvider(e) {
    if (!await a(this, n)?.open(this, N, {
      data: {
        headline: "Remove Payment Provider",
        content: `Are you sure you want to remove ${e.displayName}? This action cannot be undone.`,
        confirmLabel: "Remove",
        color: "danger"
      }
    })?.onSubmit().catch(() => {
    }) || !a(this, l)) return;
    const { error: o } = await b.deletePaymentProvider(e.id);
    if (a(this, l)) {
      if (o) {
        a(this, g)?.peek("danger", {
          data: { headline: "Error", message: o.message }
        });
        return;
      }
      a(this, g)?.peek("positive", {
        data: { headline: "Success", message: `${e.displayName} removed` }
      }), await this._loadProviders();
    }
  }
  _openSetupInstructions(e) {
    !a(this, n) || !e.setupInstructions || a(this, n).open(this, D, {
      data: {
        providerName: e.displayName,
        instructions: e.setupInstructions
      }
    });
  }
  _openTestModal(e) {
    a(this, n) && a(this, n).open(this, B, {
      data: { setting: e }
    });
  }
  _renderProviderIcon(e, i) {
    const t = U(e);
    return t ? r`<span class="provider-icon-svg" .innerHTML=${t}></span>` : r`<uui-icon name="${i ?? "icon-credit-card"}"></uui-icon>`;
  }
  _renderConfiguredProvider(e) {
    const i = e.provider;
    return r`
      <div class="provider-card configured">
        <div class="provider-header">
          <div class="provider-info">
            ${this._renderProviderIcon(e.providerAlias, i?.icon)}
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
              label="Methods"
              title="Configure payment methods"
              @click=${() => this._openMethodsModal(e)}
            >
              <uui-icon name="icon-list"></uui-icon>
            </uui-button>
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
        ${i?.description ? r`<p class="provider-description">${i.description}</p>` : d}
        <div class="provider-footer">
          <div class="provider-features">
            ${e.isTestMode ? r`<span class="feature-badge test-mode">Test Mode</span>` : r`<span class="feature-badge live-mode">Live</span>`}
            ${i?.supportsRefunds ? r`<span class="feature-badge">Refunds</span>` : d}
            ${i?.supportsPartialRefunds ? r`<span class="feature-badge">Partial Refunds</span>` : d}
            ${i?.usesRedirectCheckout ? r`<span class="feature-badge">Redirect Checkout</span>` : d}
            ${i?.supportsAuthAndCapture ? r`<span class="feature-badge">Auth & Capture</span>` : d}
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
              ` : d}
        </div>
      </div>
    `;
  }
  _renderAvailableProvider(e) {
    return r`
      <div class="provider-card available">
        <div class="provider-header">
          <div class="provider-info">
            ${this._renderProviderIcon(e.alias, e.icon)}
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
          ${e.description ? r`<p class="provider-description">${e.description}</p>` : d}
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
n = /* @__PURE__ */ new WeakMap();
g = /* @__PURE__ */ new WeakMap();
l = /* @__PURE__ */ new WeakMap();
u.styles = C`
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
  $("merchello-payment-providers-list")
], u);
const re = u;
export {
  u as MerchelloPaymentProvidersListElement,
  re as default
};
//# sourceMappingURL=payment-providers-list.element-C7Na1WqC.js.map
