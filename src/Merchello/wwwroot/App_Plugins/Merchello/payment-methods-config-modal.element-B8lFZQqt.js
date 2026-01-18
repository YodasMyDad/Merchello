import { unsafeHTML as x, html as s, nothing as c, css as C, state as h, customElement as E } from "@umbraco-cms/backoffice/external/lit";
import { UmbModalToken as w, UmbModalBaseElement as $, UMB_MODAL_MANAGER_CONTEXT as k } from "@umbraco-cms/backoffice/modal";
import { UMB_NOTIFICATION_CONTEXT as S } from "@umbraco-cms/backoffice/notification";
import { UmbSorterController as z } from "@umbraco-cms/backoffice/sorter";
import { M as f } from "./merchello-api-BAKL0aIE.js";
import { g as P } from "./brand-icons-AsNEBTKB.js";
const T = new w("Merchello.PaymentMethod.Edit.Modal", {
  modal: {
    type: "sidebar",
    size: "medium"
  }
});
var A = Object.defineProperty, L = Object.getOwnPropertyDescriptor, M = (e) => {
  throw TypeError(e);
}, l = (e, t, i, a) => {
  for (var r = a > 1 ? void 0 : a ? L(t, i) : t, v = e.length - 1, _; v >= 0; v--)
    (_ = e[v]) && (r = (a ? _(t, i, r) : _(r)) || r);
  return a && r && A(t, i, r), r;
}, y = (e, t, i) => t.has(e) || M("Cannot " + i), n = (e, t, i) => (y(e, t, "read from private field"), t.get(e)), p = (e, t, i) => t.has(e) ? M("Cannot add the same private member more than once") : t instanceof WeakSet ? t.add(e) : t.set(e, i), g = (e, t, i, a) => (y(e, t, "write to private field"), t.set(e, i), i), d, m, u, b;
const O = {
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
let o = class extends $ {
  constructor() {
    super(), this._methods = [], this._isLoading = !0, this._isSaving = !1, this._errorMessage = null, this._hasChanges = !1, p(this, d, !1), p(this, m), p(this, u), p(this, b, new z(this, {
      getUniqueOfElement: (e) => e.getAttribute("data-method-alias") ?? "",
      getUniqueOfModel: (e) => e.methodAlias,
      identifier: "Merchello.PaymentMethods.Sorter",
      itemSelector: ".method-row",
      containerSelector: ".methods-list",
      onChange: ({ model: e }) => {
        this._methods = e, this._handleMethodReorder(e.map((t) => t.methodAlias));
      }
    })), this.consumeContext(S, (e) => {
      g(this, m, e);
    }), this.consumeContext(k, (e) => {
      g(this, u, e);
    });
  }
  connectedCallback() {
    super.connectedCallback(), g(this, d, !0), this._loadMethods();
  }
  disconnectedCallback() {
    super.disconnectedCallback(), g(this, d, !1);
  }
  async _loadMethods() {
    this._isLoading = !0, this._errorMessage = null;
    const e = this.data?.setting;
    if (!e) {
      this._errorMessage = "No provider specified", this._isLoading = !1;
      return;
    }
    const { data: t, error: i } = await f.getPaymentProviderMethods(e.id);
    if (n(this, d)) {
      if (i) {
        this._errorMessage = i.message, this._isLoading = !1;
        return;
      }
      this._methods = t ?? [], n(this, b).setModel(this._methods), this._isLoading = !1;
    }
  }
  async _handleMethodReorder(e) {
    const t = this.data?.setting;
    if (!t) return;
    const { error: i } = await f.reorderPaymentMethods(t.id, e);
    n(this, d) && (i ? (n(this, m)?.peek("danger", {
      data: { headline: "Reorder failed", message: i.message }
    }), await this._loadMethods()) : this._hasChanges = !0);
  }
  async _handleToggle(e) {
    const t = this.data?.setting;
    if (!t) return;
    this._isSaving = !0, this._errorMessage = null;
    const { data: i, error: a } = await f.updatePaymentMethodSetting(
      t.id,
      e.methodAlias,
      { isEnabled: !e.isEnabled }
    );
    if (n(this, d)) {
      if (a) {
        this._errorMessage = a.message, this._isSaving = !1;
        return;
      }
      this._methods = i ?? this._methods, this._hasChanges = !0, this._isSaving = !1;
    }
  }
  _handleClose() {
    this.value = { isChanged: this._hasChanges }, this.modalContext?.submit();
  }
  async _openEditModal(e) {
    const t = this.data?.setting;
    if (!t || !n(this, u)) return;
    (await n(this, u).open(this, T, {
      data: {
        providerSettingId: t.id,
        method: e
      }
    }).onSubmit().catch(() => null))?.isChanged && (this._hasChanges = !0, await this._loadMethods());
  }
  _renderMethodIcon(e) {
    const t = e.iconHtml ?? P(e.methodAlias);
    return t ? s`<span class="method-icon">${x(t)}</span>` : s`<uui-icon name="${e.icon ?? "icon-credit-card"}"></uui-icon>`;
  }
  _renderRegionBadges(e) {
    return !e || e.length === 0 ? c : s`
      ${e.map(
      (t) => s`
          <span class="region-badge" title="${t.name}">
            ${O[t.code] ?? "🌍"} ${t.code}
          </span>
        `
    )}
    `;
  }
  _renderMethod(e) {
    return s`
      <div class="method-row" data-method-alias=${e.methodAlias}>
        <div class="method-left">
          <div class="method-drag-handle">
            <uui-icon name="icon-navigation"></uui-icon>
          </div>
          <div class="method-info">
            ${this._renderMethodIcon(e)}
            <div class="method-details">
              <span class="method-name">${e.displayName}</span>
              ${e.isExpressCheckout ? s`<span class="express-badge">Express</span>` : c}
              ${this._renderRegionBadges(e.supportedRegions)}
            </div>
          </div>
        </div>
        <div class="method-actions">
          <uui-button
            compact
            label="Edit"
            look="secondary"
            @click=${(t) => {
      t.stopPropagation(), this._openEditModal(e);
    }}
          >
            <uui-icon name="icon-edit"></uui-icon>
          </uui-button>
          <uui-toggle
            .checked=${e.isEnabled}
            ?disabled=${this._isSaving}
            @change=${() => this._handleToggle(e)}
            label="${e.isEnabled ? "Enabled" : "Disabled"}"
          ></uui-toggle>
        </div>
      </div>
    `;
  }
  render() {
    const e = this.data?.setting;
    return s`
      <umb-body-layout headline="Payment Methods - ${e?.displayName ?? "Provider"}">
        <div id="main">
          ${this._isLoading ? s`
                <div class="loading">
                  <uui-loader></uui-loader>
                  <span>Loading methods...</span>
                </div>
              ` : s`
                ${this._errorMessage ? s`
                      <div class="error-message">
                        <uui-icon name="icon-alert"></uui-icon>
                        ${this._errorMessage}
                      </div>
                    ` : c}

                <p class="description">
                  Enable or disable individual payment methods for this provider.
                  Drag to reorder. Click Edit to customize display name, icon, and styling.
                </p>

                <div class="methods-list">
                  ${this._methods.map((t) => this._renderMethod(t))}
                </div>

                ${this._methods.length === 0 ? s`<p class="no-methods">This provider has no configurable methods.</p>` : c}
              `}
        </div>

        <div slot="actions">
          <uui-button
            label="Close"
            look="primary"
            @click=${this._handleClose}
            ?disabled=${this._isSaving}
          >
            ${this._isSaving ? s`<uui-loader-circle></uui-loader-circle>` : c}
            Close
          </uui-button>
        </div>
      </umb-body-layout>
    `;
  }
};
d = /* @__PURE__ */ new WeakMap();
m = /* @__PURE__ */ new WeakMap();
u = /* @__PURE__ */ new WeakMap();
b = /* @__PURE__ */ new WeakMap();
o.styles = C`
    :host {
      display: block;
    }

    .loading {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: var(--uui-size-layout-2);
      gap: var(--uui-size-space-4);
    }

    .error-message {
      display: flex;
      align-items: center;
      gap: var(--uui-size-space-2);
      padding: var(--uui-size-space-3);
      background: var(--uui-color-danger-standalone);
      color: var(--uui-color-danger-contrast);
      border-radius: var(--uui-border-radius);
      margin-bottom: var(--uui-size-space-4);
    }

    .description {
      color: var(--uui-color-text-alt);
      margin: 0 0 var(--uui-size-space-5) 0;
    }

    .methods-list {
      display: flex;
      flex-direction: column;
      gap: var(--uui-size-space-3);
    }

    .method-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: var(--uui-size-space-3) var(--uui-size-space-4);
      background: var(--uui-color-surface);
      border: 1px solid var(--uui-color-border);
      border-radius: var(--uui-border-radius);
    }

    .method-left {
      display: flex;
      align-items: center;
      gap: var(--uui-size-space-3);
    }

    .method-drag-handle {
      cursor: grab;
      color: var(--uui-color-text-alt);
      display: flex;
      align-items: center;
      padding-right: var(--uui-size-space-2);
    }

    .method-drag-handle:active {
      cursor: grabbing;
    }

    .method-row.--umb-sorter-placeholder {
      visibility: hidden;
      position: relative;
    }

    .method-row.--umb-sorter-placeholder::after {
      content: "";
      position: absolute;
      inset: 0;
      border: 2px dashed var(--uui-color-divider-emphasis);
      border-radius: var(--uui-border-radius);
      visibility: visible;
      background: var(--uui-color-surface-alt);
    }

    .method-info {
      display: flex;
      align-items: center;
      gap: var(--uui-size-space-3);
    }

    .method-info > uui-icon {
      font-size: 1.25rem;
      color: var(--uui-color-text-alt);
    }

    .method-icon {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 24px;
      height: 24px;
    }

    .method-icon svg {
      width: 100%;
      height: 100%;
    }

    .method-details {
      display: flex;
      align-items: center;
      gap: var(--uui-size-space-2);
    }

    .method-name {
      font-weight: 500;
    }

    .express-badge {
      display: inline-block;
      padding: 2px 6px;
      background: var(--uui-color-positive-standalone);
      color: var(--uui-color-positive-contrast);
      border-radius: 10px;
      font-size: 0.625rem;
      font-weight: 600;
      text-transform: uppercase;
    }

    .region-badge {
      display: inline-block;
      padding: 2px 6px;
      background: var(--uui-color-surface-alt);
      color: var(--uui-color-text);
      border-radius: 10px;
      font-size: 0.625rem;
      font-weight: 500;
    }

    .method-actions {
      display: flex;
      align-items: center;
      gap: var(--uui-size-space-3);
    }

    .method-actions uui-button {
      --uui-button-height: 28px;
    }

    .no-methods {
      color: var(--uui-color-text-alt);
      font-style: italic;
      text-align: center;
      padding: var(--uui-size-space-4);
    }

    [slot="actions"] {
      display: flex;
      justify-content: flex-end;
    }
  `;
l([
  h()
], o.prototype, "_methods", 2);
l([
  h()
], o.prototype, "_isLoading", 2);
l([
  h()
], o.prototype, "_isSaving", 2);
l([
  h()
], o.prototype, "_errorMessage", 2);
l([
  h()
], o.prototype, "_hasChanges", 2);
o = l([
  E("merchello-payment-methods-config-modal")
], o);
const G = o;
export {
  o as MerchelloPaymentMethodsConfigModalElement,
  G as default
};
//# sourceMappingURL=payment-methods-config-modal.element-B8lFZQqt.js.map
