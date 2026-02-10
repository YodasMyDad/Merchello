import { LitElement as k, unsafeHTML as C, html as o, nothing as d, css as z, state as v, property as T, customElement as E, query as R } from "@umbraco-cms/backoffice/external/lit";
import { UmbElementMixin as L } from "@umbraco-cms/backoffice/element-api";
import { UmbModalToken as M, UMB_MODAL_MANAGER_CONTEXT as N, UMB_CONFIRM_MODAL as D } from "@umbraco-cms/backoffice/modal";
import { UMB_NOTIFICATION_CONTEXT as U } from "@umbraco-cms/backoffice/notification";
import { UmbSorterController as H } from "@umbraco-cms/backoffice/sorter";
import { M as m } from "./merchello-api-BuImeZL2.js";
import { M as B } from "./setup-instructions-modal.token-CR5MFRlI.js";
import { g as F, a as W } from "./brand-icons-Wu7yNU5M.js";
const G = new M("Merchello.PaymentProvider.Config.Modal", {
  modal: {
    type: "sidebar",
    size: "medium"
  }
}), j = new M("Merchello.PaymentMethods.Config.Modal", {
  modal: {
    type: "sidebar",
    size: "small"
  }
}), q = new M("Merchello.TestPaymentProvider.Modal", {
  modal: {
    type: "sidebar",
    size: "medium"
  }
});
var Y = Object.defineProperty, V = Object.getOwnPropertyDescriptor, S = (e) => {
  throw TypeError(e);
}, _ = (e, i, r, a) => {
  for (var s = a > 1 ? void 0 : a ? V(i, r) : i, h = e.length - 1, g; h >= 0; h--)
    (g = e[h]) && (s = (a ? g(i, r, s) : g(s)) || s);
  return a && s && Y(i, r, s), s;
}, I = (e, i, r) => i.has(e) || S("Cannot " + r), x = (e, i, r) => (I(e, i, "read from private field"), i.get(e)), X = (e, i, r) => i.has(e) ? S("Cannot add the same private member more than once") : i instanceof WeakSet ? i.add(e) : i.set(e, r), $ = (e, i, r, a) => (I(e, i, "write to private field"), i.set(e, r), r), f;
const K = {
  US: "🇺🇸",
  NL: "🇳🇱",
  BE: "🇧🇪",
  AT: "🇦🇹",
  PL: "🇵🇱",
  EU: "🇪🇺",
  DE: "🇩🇪",
  FR: "🇫🇷",
  ES: "🇪🇸",
  IT: "🇮🇹",
  GB: "🇬🇧",
  UK: "🇬🇧"
};
let p = class extends L(k) {
  constructor() {
    super(...arguments), this._preview = null, this._isLoading = !0, this._errorMessage = null, this._isCollapsed = !1, this.autoLoad = !0, X(this, f, !1);
  }
  connectedCallback() {
    super.connectedCallback(), $(this, f, !0), this.autoLoad && this.loadPreview();
  }
  disconnectedCallback() {
    super.disconnectedCallback(), $(this, f, !1);
  }
  async loadPreview() {
    this._isLoading = !0, this._errorMessage = null;
    try {
      const e = await m.getCheckoutPaymentPreview();
      if (!x(this, f)) return;
      if (e.error) {
        this._errorMessage = e.error.message, this._isLoading = !1;
        return;
      }
      this._preview = e.data ?? null;
    } catch (e) {
      if (!x(this, f)) return;
      this._errorMessage = e instanceof Error ? e.message : "Failed to load preview";
    }
    this._isLoading = !1;
  }
  _toggleCollapsed() {
    this._isCollapsed = !this._isCollapsed;
  }
  _renderMethodIcon(e) {
    const i = e.iconHtml ?? F(e.methodAlias);
    return i ? o`<span class="method-icon-svg">${C(i)}</span>` : o`<uui-icon name="${e.icon ?? "icon-credit-card"}"></uui-icon>`;
  }
  _renderRegionBadges(e) {
    return !e || e.length === 0 ? d : o`
      ${e.map(
      (i) => o`<span class="region-badge" title="${i.name}">${K[i.code] ?? "🌍"}</span>`
    )}
    `;
  }
  _renderMethod(e, i = !1) {
    return o`
      <div class="method-row ${i ? "outranked" : ""}">
        <div class="method-info">
          ${this._renderMethodIcon(e)}
          <span class="method-name">${e.displayName}</span>
          ${this._renderRegionBadges(e.supportedRegions)}
        </div>
        <div class="method-provider">
          ${i ? o`<span class="outranked-text">outranked by ${e.outrankedBy}</span>` : o`<span class="via-text">via ${e.providerDisplayName}</span>`}
        </div>
      </div>
    `;
  }
  _renderSection(e, i, r = !1) {
    return i.length === 0 ? d : o`
      <div class="preview-section">
        <h4 class="section-title">${e}</h4>
        <div class="methods-list">
          ${i.map((a) => this._renderMethod(a, r))}
        </div>
      </div>
    `;
  }
  _hasAnyMethods() {
    return this._preview ? this._preview.expressMethods.length > 0 || this._preview.standardMethods.length > 0 || this._preview.redirectMethods.length > 0 || this._preview.hiddenMethods.length > 0 : !1;
  }
  render() {
    return this._isLoading ? o`
        <div class="preview-box">
          <div class="preview-header">
            <span class="preview-title">Checkout Preview</span>
          </div>
          <div class="preview-loading">
            <uui-loader-bar></uui-loader-bar>
          </div>
        </div>
      ` : this._errorMessage ? o`
        <div class="preview-box error">
          <div class="preview-header">
            <span class="preview-title">Checkout Preview</span>
          </div>
          <div class="preview-error">
            <uui-icon name="icon-alert"></uui-icon>
            <span>${this._errorMessage}</span>
          </div>
        </div>
      ` : this._hasAnyMethods() ? o`
      <div class="preview-box">
        <div class="preview-header" @click=${this._toggleCollapsed}>
          <div class="header-left">
            <uui-icon name="${this._isCollapsed ? "icon-navigation-right" : "icon-navigation-down"}"></uui-icon>
            <span class="preview-title">Checkout Preview</span>
          </div>
          <span class="preview-subtitle">What customers will see at checkout</span>
        </div>
        ${this._isCollapsed ? d : o`
              <div class="preview-content">
                ${this._renderSection("Express Checkout", this._preview?.expressMethods ?? [])}
                ${this._renderSection("Standard Payment", this._preview?.standardMethods ?? [])}
                ${this._renderSection("Or Pay With", this._preview?.redirectMethods ?? [])}
                ${this._preview?.hiddenMethods.length ? o`
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
    ` : o`
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
f = /* @__PURE__ */ new WeakMap();
p.styles = z`
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

    .region-badge {
      font-size: 0.75rem;
      margin-left: var(--uui-size-space-1);
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
_([
  v()
], p.prototype, "_preview", 2);
_([
  v()
], p.prototype, "_isLoading", 2);
_([
  v()
], p.prototype, "_errorMessage", 2);
_([
  v()
], p.prototype, "_isCollapsed", 2);
_([
  T({ type: Boolean, attribute: "auto-load" })
], p.prototype, "autoLoad", 2);
p = _([
  E("merchello-checkout-payment-preview")
], p);
var J = Object.defineProperty, Q = Object.getOwnPropertyDescriptor, A = (e) => {
  throw TypeError(e);
}, b = (e, i, r, a) => {
  for (var s = a > 1 ? void 0 : a ? Q(i, r) : i, h = e.length - 1, g; h >= 0; h--)
    (g = e[h]) && (s = (a ? g(i, r, s) : g(s)) || s);
  return a && s && J(i, r, s), s;
}, O = (e, i, r) => i.has(e) || A("Cannot " + r), t = (e, i, r) => (O(e, i, "read from private field"), i.get(e)), y = (e, i, r) => i.has(e) ? A("Cannot add the same private member more than once") : i instanceof WeakSet ? i.add(e) : i.set(e, r), w = (e, i, r, a) => (O(e, i, "write to private field"), i.set(e, r), r), n, u, l, P;
let c = class extends L(k) {
  constructor() {
    super(), this._availableProviders = [], this._configuredProviders = [], this._isLoading = !0, this._errorMessage = null, y(this, n), y(this, u), y(this, l, !1), y(this, P, new H(this, {
      getUniqueOfElement: (e) => e.getAttribute("data-provider-id") ?? "",
      getUniqueOfModel: (e) => e.id,
      identifier: "Merchello.PaymentProviders.Sorter",
      itemSelector: ".provider-card.configured",
      containerSelector: ".providers-list.configured",
      onChange: ({ model: e }) => {
        this._configuredProviders = e, this._handleProviderReorder(e.map((i) => i.id));
      }
    })), this.consumeContext(N, (e) => {
      w(this, n, e);
    }), this.consumeContext(U, (e) => {
      w(this, u, e);
    });
  }
  connectedCallback() {
    super.connectedCallback(), w(this, l, !0), this._loadProviders();
  }
  disconnectedCallback() {
    super.disconnectedCallback(), w(this, l, !1);
  }
  async _loadProviders() {
    this._isLoading = !0, this._errorMessage = null;
    try {
      const [e, i] = await Promise.all([
        m.getAvailablePaymentProviders(),
        m.getPaymentProviders()
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
      this._availableProviders = e.data ?? [], this._configuredProviders = i.data ?? [], t(this, P).setModel(this._configuredProviders);
    } catch (e) {
      if (!t(this, l)) return;
      this._errorMessage = e instanceof Error ? e.message : "Failed to load providers";
    }
    this._isLoading = !1, await this._previewElement?.loadPreview();
  }
  async _handleProviderReorder(e) {
    const { error: i } = await m.reorderPaymentProviders(e);
    t(this, l) && (i ? (t(this, u)?.peek("danger", {
      data: { headline: "Reorder failed", message: i.message }
    }), await this._loadProviders()) : await this._previewElement?.loadPreview());
  }
  _getUnconfiguredProviders() {
    const e = new Set(this._configuredProviders.map((i) => i.providerAlias));
    return this._availableProviders.filter((i) => !e.has(i.alias));
  }
  async _openConfigModal(e, i) {
    if (!t(this, n)) return;
    (await t(this, n).open(this, G, {
      data: { provider: e, setting: i }
    }).onSubmit().catch(() => {
    }))?.isSaved && await this._loadProviders();
  }
  async _openMethodsModal(e) {
    if (!t(this, n)) return;
    (await t(this, n).open(this, j, {
      data: { setting: e }
    }).onSubmit().catch(() => {
    }))?.isChanged && await this._previewElement?.loadPreview();
  }
  async _toggleProvider(e) {
    const { error: i } = await m.togglePaymentProvider(e.id, !e.isEnabled);
    if (t(this, l)) {
      if (i) {
        t(this, u)?.peek("danger", {
          data: { headline: "Error", message: i.message }
        });
        return;
      }
      t(this, u)?.peek("positive", {
        data: {
          headline: "Success",
          message: `${e.displayName} ${e.isEnabled ? "hidden from checkout" : "now showing in checkout"}`
        }
      }), await this._loadProviders();
    }
  }
  async _deleteProvider(e) {
    const i = t(this, n)?.open(this, D, {
      data: {
        headline: "Remove Payment Provider",
        content: `Are you sure you want to remove ${e.displayName}? This action cannot be undone.`,
        confirmLabel: "Remove",
        color: "danger"
      }
    });
    try {
      await i?.onSubmit();
    } catch {
      return;
    }
    if (!t(this, l)) return;
    const { error: r } = await m.deletePaymentProvider(e.id);
    if (t(this, l)) {
      if (r) {
        t(this, u)?.peek("danger", {
          data: { headline: "Error", message: r.message }
        });
        return;
      }
      t(this, u)?.peek("positive", {
        data: { headline: "Success", message: `${e.displayName} removed` }
      }), await this._loadProviders();
    }
  }
  _openSetupInstructions(e) {
    !t(this, n) || !e.setupInstructions || t(this, n).open(this, B, {
      data: {
        providerName: e.displayName,
        instructions: e.setupInstructions
      }
    });
  }
  _openTestModal(e) {
    t(this, n) && t(this, n).open(this, q, {
      data: { setting: e }
    });
  }
  _renderProviderIcon(e, i, r) {
    const a = i ?? W(e);
    return a ? o`<span class="provider-icon-svg">${C(a)}</span>` : o`<uui-icon name="${r ?? "icon-credit-card"}"></uui-icon>`;
  }
  _renderConfiguredProvider(e) {
    const i = e.provider;
    return o`
      <div class="provider-card configured" data-provider-id=${e.id}>
        <div class="provider-header">
          <div class="provider-left">
            <div class="provider-drag-handle">
              <uui-icon name="icon-navigation"></uui-icon>
            </div>
            <div class="provider-info">
              ${this._renderProviderIcon(e.providerAlias, i?.iconHtml, i?.icon)}
              <div class="provider-details">
                <span class="provider-name">${e.displayName}</span>
                <span class="provider-alias">${e.providerAlias}</span>
              </div>
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
        ${i?.description ? o`<p class="provider-description">${i.description}</p>` : d}
        ${i?.setupInstructions ? o`
              <div class="provider-footer provider-footer-actions">
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
            ` : d}
      </div>
    `;
  }
  _renderAvailableProvider(e) {
    return o`
      <div class="provider-card available">
        <div class="provider-header">
          <div class="provider-info">
            ${this._renderProviderIcon(e.alias, e.iconHtml, e.icon)}
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
          ${e.description ? o`<p class="provider-description">${e.description}</p>` : d}
          ${e.setupInstructions ? o`
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
    const e = !this._isLoading && !this._errorMessage, i = this._getUnconfiguredProviders();
    return o`
      <umb-body-layout header-fit-height main-no-padding>
      <div class="content">
        ${this._isLoading ? o`<div class="loading">
              <uui-loader></uui-loader>
              <span>Loading payment providers...</span>
            </div>` : this._errorMessage ? o`<uui-box>
                <div class="error">
                  <uui-icon name="icon-alert"></uui-icon>
                  <span>${this._errorMessage}</span>
                  <uui-button look="primary" label="Retry" @click=${this._loadProviders}>
                    Retry
                  </uui-button>
                </div>
              </uui-box>` : d}

        ${e ? o`<merchello-checkout-payment-preview></merchello-checkout-payment-preview>` : d}

        <uui-box headline="Configured Payment Providers" ?hidden=${!e}>
          <p class="section-description">
            These payment providers are installed and configured.
            Toggle the switch to show or hide a provider from checkout.
            Drag to reorder how providers appear.
          </p>
          <!-- Always render container for sorter -->
          <div class="providers-list configured">
            ${e ? this._configuredProviders.length === 0 ? o`<p class="no-items">No payment providers configured yet.</p>` : this._configuredProviders.map((r) => this._renderConfiguredProvider(r)) : d}
          </div>
        </uui-box>

        ${e ? o`<uui-box headline="Available Payment Providers">
              <p class="section-description">
                These payment providers are available but not yet configured.
                Click "Install" to configure and add a provider.
              </p>
              ${i.length === 0 ? o`<p class="no-items">All available providers have been configured.</p>` : o`
                    <div class="providers-list">
                      ${i.map(
      (r) => this._renderAvailableProvider(r)
    )}
                    </div>
                  `}
            </uui-box>` : d}
      </div>
      </umb-body-layout>
    `;
  }
};
n = /* @__PURE__ */ new WeakMap();
u = /* @__PURE__ */ new WeakMap();
l = /* @__PURE__ */ new WeakMap();
P = /* @__PURE__ */ new WeakMap();
c.styles = z`
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

    .provider-drag-handle {
      cursor: grab;
      color: var(--uui-color-text-alt);
      display: flex;
      align-items: center;
      padding-right: var(--uui-size-space-2);
    }

    .provider-drag-handle:active {
      cursor: grabbing;
    }

    .provider-card.--umb-sorter-placeholder {
      visibility: hidden;
      position: relative;
    }

    .provider-card.--umb-sorter-placeholder::after {
      content: "";
      position: absolute;
      inset: 0;
      border: 2px dashed var(--uui-color-divider-emphasis);
      border-radius: var(--uui-border-radius);
      visibility: visible;
      background: var(--uui-color-surface-alt);
    }

    .provider-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    .provider-left {
      display: flex;
      align-items: center;
      gap: var(--uui-size-space-3);
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

    .provider-footer-actions {
      justify-content: flex-end;
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

  `;
b([
  v()
], c.prototype, "_availableProviders", 2);
b([
  v()
], c.prototype, "_configuredProviders", 2);
b([
  v()
], c.prototype, "_isLoading", 2);
b([
  v()
], c.prototype, "_errorMessage", 2);
b([
  R("merchello-checkout-payment-preview")
], c.prototype, "_previewElement", 2);
c = b([
  E("merchello-payment-providers-list")
], c);
const ne = c;
export {
  c as MerchelloPaymentProvidersListElement,
  ne as default
};
//# sourceMappingURL=payment-providers-list.element-bLrmVDXR.js.map
