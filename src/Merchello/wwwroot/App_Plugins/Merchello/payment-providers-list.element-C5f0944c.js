import { LitElement as E, unsafeHTML as L, html as t, nothing as l, css as S, state as g, property as D, customElement as I, query as H } from "@umbraco-cms/backoffice/external/lit";
import { UmbElementMixin as O } from "@umbraco-cms/backoffice/element-api";
import { UmbModalToken as $, UMB_MODAL_MANAGER_CONTEXT as U, UMB_CONFIRM_MODAL as W } from "@umbraco-cms/backoffice/modal";
import { UMB_NOTIFICATION_CONTEXT as B } from "@umbraco-cms/backoffice/notification";
import { UmbSorterController as F } from "@umbraco-cms/backoffice/sorter";
import { M as b } from "./merchello-api-B76CV0sD.js";
import { M as j } from "./setup-instructions-modal.token-CR5MFRlI.js";
import { g as q, a as G } from "./brand-icons-vhzlavjm.js";
import { c as Y } from "./collection-layout.styles-BLT_S_EA.js";
const Q = new $("Merchello.PaymentProvider.Config.Modal", {
  modal: {
    type: "sidebar",
    size: "medium"
  }
}), V = new $("Merchello.PaymentMethods.Config.Modal", {
  modal: {
    type: "sidebar",
    size: "large"
  }
}), X = new $("Merchello.TestPaymentProvider.Modal", {
  modal: {
    type: "sidebar",
    size: "medium"
  }
});
var J = Object.defineProperty, K = Object.getOwnPropertyDescriptor, T = (e) => {
  throw TypeError(e);
}, P = (e, i, r, a) => {
  for (var s = a > 1 ? void 0 : a ? K(i, r) : i, m = e.length - 1, f; m >= 0; m--)
    (f = e[m]) && (s = (a ? f(i, r, s) : f(s)) || s);
  return a && s && J(i, r, s), s;
}, R = (e, i, r) => i.has(e) || T("Cannot " + r), C = (e, i, r) => (R(e, i, "read from private field"), i.get(e)), Z = (e, i, r) => i.has(e) ? T("Cannot add the same private member more than once") : i instanceof WeakSet ? i.add(e) : i.set(e, r), z = (e, i, r, a) => (R(e, i, "write to private field"), i.set(e, r), r), w;
let h = class extends O(E) {
  constructor() {
    super(...arguments), this._preview = null, this._isLoading = !0, this._errorMessage = null, this._isCollapsed = !1, this.autoLoad = !0, Z(this, w, !1);
  }
  connectedCallback() {
    super.connectedCallback(), z(this, w, !0), this.autoLoad && this.loadPreview();
  }
  disconnectedCallback() {
    super.disconnectedCallback(), z(this, w, !1);
  }
  async loadPreview() {
    this._isLoading = !0, this._errorMessage = null;
    try {
      const e = await b.getCheckoutPaymentPreview();
      if (!C(this, w)) return;
      if (e.error) {
        this._errorMessage = e.error.message, this._isLoading = !1;
        return;
      }
      this._preview = e.data ?? null;
    } catch (e) {
      if (!C(this, w)) return;
      this._errorMessage = e instanceof Error ? e.message : "Failed to load preview";
    }
    this._isLoading = !1;
  }
  _toggleCollapsed() {
    this._isCollapsed = !this._isCollapsed;
  }
  _renderMethodIcon(e) {
    const i = e.iconHtml ?? q(e.methodAlias);
    return i ? t`<span class="method-icon-svg">${L(i)}</span>` : t`<uui-icon name="${e.icon ?? "icon-credit-card"}"></uui-icon>`;
  }
  _renderRegionBadges(e) {
    return !e || e.length === 0 ? l : t`
      ${e.map(
      (i) => t`<span class="region-badge" title="${i.name}">${i.code}</span>`
    )}
    `;
  }
  _renderMethod(e, i = !1) {
    return t`
      <div class="method-row ${i ? "outranked" : ""}">
        <div class="method-info">
          ${this._renderMethodIcon(e)}
          <span class="method-name">${e.displayName}</span>
          ${this._renderRegionBadges(e.supportedRegions)}
        </div>
        <div class="method-provider">
          ${i ? t`<span class="outranked-text">outranked by ${e.outrankedBy}</span>` : t`<span class="via-text">via ${e.providerDisplayName}</span>`}
        </div>
      </div>
    `;
  }
  _renderSection(e, i, r = !1) {
    return i.length === 0 ? l : t`
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
    return this._isLoading ? t`
        <div class="preview-box">
          <div class="preview-header">
            <span class="preview-title">Checkout Preview</span>
          </div>
          <div class="preview-loading">
            <uui-loader-bar></uui-loader-bar>
          </div>
        </div>
      ` : this._errorMessage ? t`
        <div class="preview-box error">
          <div class="preview-header">
            <span class="preview-title">Checkout Preview</span>
          </div>
          <div class="preview-error">
            <uui-icon name="icon-alert"></uui-icon>
            <span>${this._errorMessage}</span>
          </div>
        </div>
      ` : this._hasAnyMethods() ? t`
      <div class="preview-box">
        <div class="preview-header" @click=${this._toggleCollapsed}>
          <div class="header-left">
            <uui-icon name="${this._isCollapsed ? "icon-navigation-right" : "icon-navigation-down"}"></uui-icon>
            <span class="preview-title">Checkout Preview</span>
          </div>
          <span class="preview-subtitle">What customers will see at checkout</span>
        </div>
        ${this._isCollapsed ? l : t`
              <div class="preview-content">
                ${this._renderSection("Express Checkout", this._preview?.expressMethods ?? [])}
                ${this._renderSection("Standard Payment", this._preview?.standardMethods ?? [])}
                ${this._renderSection("Or Pay With", this._preview?.redirectMethods ?? [])}
                ${this._preview?.hiddenMethods.length ? t`
                      <div class="hidden-section">
                        ${this._renderSection(
      "Hidden (outranked by lower sort order)",
      this._preview?.hiddenMethods ?? [],
      !0
    )}
                      </div>
                    ` : l}
              </div>
            `}
      </div>
    ` : t`
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
w = /* @__PURE__ */ new WeakMap();
h.styles = S`
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
P([
  g()
], h.prototype, "_preview", 2);
P([
  g()
], h.prototype, "_isLoading", 2);
P([
  g()
], h.prototype, "_errorMessage", 2);
P([
  g()
], h.prototype, "_isCollapsed", 2);
P([
  D({ type: Boolean, attribute: "auto-load" })
], h.prototype, "autoLoad", 2);
h = P([
  I("merchello-checkout-payment-preview")
], h);
var ee = Object.defineProperty, ie = Object.getOwnPropertyDescriptor, A = (e) => {
  throw TypeError(e);
}, M = (e, i, r, a) => {
  for (var s = a > 1 ? void 0 : a ? ie(i, r) : i, m = e.length - 1, f; m >= 0; m--)
    (f = e[m]) && (s = (a ? f(i, r, s) : f(s)) || s);
  return a && s && ee(i, r, s), s;
}, N = (e, i, r) => i.has(e) || A("Cannot " + r), o = (e, i, r) => (N(e, i, "read from private field"), i.get(e)), _ = (e, i, r) => i.has(e) ? A("Cannot add the same private member more than once") : i instanceof WeakSet ? i.add(e) : i.set(e, r), n = (e, i, r, a) => (N(e, i, "write to private field"), i.set(e, r), r), d, v, c, x, y, u, k;
let p = class extends O(E) {
  constructor() {
    super(), this._availableProviders = [], this._configuredProviders = [], this._isLoading = !0, this._errorMessage = null, _(this, d), _(this, v), _(this, c, !1), _(this, x, !1), _(this, y, null), _(this, u), _(this, k, new F(this, {
      getUniqueOfElement: (e) => e.getAttribute("data-provider-id") ?? "",
      getUniqueOfModel: (e) => e.id,
      identifier: "Merchello.PaymentProviders.Sorter",
      itemSelector: ".provider-card.configured",
      containerSelector: ".providers-list.configured",
      onChange: ({ model: e }) => {
        this._configuredProviders = e, this._queueProviderReorder(e.map((i) => i.id));
      }
    })), this.consumeContext(U, (e) => {
      n(this, d, e);
    }), this.consumeContext(B, (e) => {
      n(this, v, e);
    });
  }
  connectedCallback() {
    super.connectedCallback(), n(this, c, !0), this._loadProviders();
  }
  disconnectedCallback() {
    super.disconnectedCallback(), n(this, c, !1), o(this, u) !== void 0 && (window.clearTimeout(o(this, u)), n(this, u, void 0));
  }
  async _loadProviders() {
    this._isLoading = !0, this._errorMessage = null;
    try {
      const [e, i] = await Promise.all([
        b.getAvailablePaymentProviders(),
        b.getPaymentProviders()
      ]);
      if (!o(this, c)) return;
      if (e.error) {
        this._errorMessage = e.error.message, this._isLoading = !1;
        return;
      }
      if (i.error) {
        this._errorMessage = i.error.message, this._isLoading = !1;
        return;
      }
      this._availableProviders = e.data ?? [], this._configuredProviders = i.data ?? [], o(this, k).setModel(this._configuredProviders);
    } catch (e) {
      if (!o(this, c)) return;
      this._errorMessage = e instanceof Error ? e.message : "Failed to load providers";
    }
    this._isLoading = !1, await this._previewElement?.loadPreview();
  }
  _queueProviderReorder(e) {
    n(this, y, [...new Set(e)]), o(this, u) !== void 0 && window.clearTimeout(o(this, u)), n(this, u, window.setTimeout(() => {
      n(this, u, void 0), this._flushProviderReorderQueue();
    }, 200));
  }
  async _flushProviderReorderQueue() {
    if (!o(this, x)) {
      n(this, x, !0);
      try {
        for (; o(this, y) && o(this, c); ) {
          const e = o(this, y);
          n(this, y, null);
          const { error: i } = await b.reorderPaymentProviders(e);
          if (!o(this, c)) return;
          if (i) {
            o(this, v)?.peek("danger", {
              data: { headline: "Reorder failed", message: i.message }
            }), n(this, y, null), await this._loadProviders();
            break;
          }
          await this._previewElement?.loadPreview();
        }
      } finally {
        n(this, x, !1);
      }
    }
  }
  _getUnconfiguredProviders() {
    const e = new Set(this._configuredProviders.map((i) => i.providerAlias));
    return this._availableProviders.filter((i) => !e.has(i.alias));
  }
  async _openConfigModal(e, i) {
    if (!o(this, d)) return;
    (await o(this, d).open(this, Q, {
      data: { provider: e, setting: i }
    }).onSubmit().catch(() => {
    }))?.isSaved && await this._loadProviders();
  }
  async _openMethodsModal(e) {
    if (!o(this, d)) return;
    (await o(this, d).open(this, V, {
      data: { setting: e }
    }).onSubmit().catch(() => {
    }))?.isChanged && await this._previewElement?.loadPreview();
  }
  async _toggleProvider(e) {
    const { error: i } = await b.togglePaymentProvider(e.id, !e.isEnabled);
    if (o(this, c)) {
      if (i) {
        o(this, v)?.peek("danger", {
          data: { headline: "Error", message: i.message }
        });
        return;
      }
      o(this, v)?.peek("positive", {
        data: {
          headline: "Success",
          message: `${e.displayName} ${e.isEnabled ? "hidden from checkout" : "now showing in checkout"}`
        }
      }), await this._loadProviders();
    }
  }
  async _deleteProvider(e) {
    const i = o(this, d)?.open(this, W, {
      data: {
        headline: "Remove Payment Provider",
        content: `Remove ${e.displayName} from payment providers. This action cannot be undone.`,
        confirmLabel: "Remove",
        color: "danger"
      }
    });
    try {
      await i?.onSubmit();
    } catch {
      return;
    }
    if (!o(this, c)) return;
    const { error: r } = await b.deletePaymentProvider(e.id);
    if (o(this, c)) {
      if (r) {
        o(this, v)?.peek("danger", {
          data: { headline: "Error", message: r.message }
        });
        return;
      }
      o(this, v)?.peek("positive", {
        data: { headline: "Success", message: `${e.displayName} removed` }
      }), await this._loadProviders();
    }
  }
  _openSetupInstructions(e) {
    !o(this, d) || !e.setupInstructions || o(this, d).open(this, j, {
      data: {
        providerName: e.displayName,
        instructions: e.setupInstructions
      }
    });
  }
  _openTestModal(e) {
    o(this, d) && o(this, d).open(this, X, {
      data: { setting: e }
    });
  }
  _renderProviderIcon(e, i, r) {
    const a = i ?? G(e);
    return a ? t`<span class="provider-icon-svg">${L(a)}</span>` : t`<uui-icon name="${r ?? "icon-credit-card"}"></uui-icon>`;
  }
  _renderConfiguredProvider(e) {
    const i = e.provider;
    return t`
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
        ${i?.description ? t`<p class="provider-description">${i.description}</p>` : l}
        ${i?.setupInstructions ? t`
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
            ` : l}
      </div>
    `;
  }
  _renderAvailableProvider(e) {
    return t`
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
          ${e.description ? t`<p class="provider-description">${e.description}</p>` : l}
          ${e.setupInstructions ? t`
                <uui-button
                  look="secondary"
                  compact
                  label="Setup Instructions"
                  title="Setup Instructions"
                  @click=${() => this._openSetupInstructions(e)}
                >
                  <uui-icon name="icon-help-alt"></uui-icon>
                </uui-button>
              ` : l}
        </div>
      </div>
    `;
  }
  render() {
    const e = !this._isLoading && !this._errorMessage, i = this._getUnconfiguredProviders();
    return t`
      <umb-body-layout header-fit-height main-no-padding>
      <div class="content layout-container">
        ${this._isLoading ? t`<div class="loading">
              <uui-loader></uui-loader>
              <span>Loading payment providers...</span>
            </div>` : this._errorMessage ? t`<uui-box>
                <div class="error">
                  <uui-icon name="icon-alert"></uui-icon>
                  <span>${this._errorMessage}</span>
                  <uui-button look="primary" label="Retry" @click=${this._loadProviders}>
                    Retry
                  </uui-button>
                </div>
              </uui-box>` : l}

        ${e ? t`<merchello-checkout-payment-preview></merchello-checkout-payment-preview>` : l}

        <uui-box headline="Configured Payment Providers" ?hidden=${!e}>
          <p class="section-description">
            These payment providers are installed and configured.
            Toggle the switch to show or hide a provider from checkout.
            Drag to reorder how providers appear.
          </p>
          <!-- Always render container for sorter -->
          <div class="providers-list configured">
            ${e ? this._configuredProviders.length === 0 ? t`<p class="no-items">No payment providers configured yet.</p>` : this._configuredProviders.map((r) => this._renderConfiguredProvider(r)) : l}
          </div>
        </uui-box>

        ${e ? t`<uui-box headline="Available Payment Providers">
              <p class="section-description">
                These payment providers are available but not yet configured.
                Click "Install" to configure and add a provider.
              </p>
              ${i.length === 0 ? t`<p class="no-items">All available providers have been configured.</p>` : t`
                    <div class="providers-list">
                      ${i.map(
      (r) => this._renderAvailableProvider(r)
    )}
                    </div>
                  `}
            </uui-box>` : l}
      </div>
      </umb-body-layout>
    `;
  }
};
d = /* @__PURE__ */ new WeakMap();
v = /* @__PURE__ */ new WeakMap();
c = /* @__PURE__ */ new WeakMap();
x = /* @__PURE__ */ new WeakMap();
y = /* @__PURE__ */ new WeakMap();
u = /* @__PURE__ */ new WeakMap();
k = /* @__PURE__ */ new WeakMap();
p.styles = [
  Y,
  S`
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

  `
];
M([
  g()
], p.prototype, "_availableProviders", 2);
M([
  g()
], p.prototype, "_configuredProviders", 2);
M([
  g()
], p.prototype, "_isLoading", 2);
M([
  g()
], p.prototype, "_errorMessage", 2);
M([
  H("merchello-checkout-payment-preview")
], p.prototype, "_previewElement", 2);
p = M([
  I("merchello-payment-providers-list")
], p);
const ue = p;
export {
  p as MerchelloPaymentProvidersListElement,
  ue as default
};
//# sourceMappingURL=payment-providers-list.element-C5f0944c.js.map
