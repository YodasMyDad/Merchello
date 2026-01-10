import { unsafeHTML as M, html as s, nothing as l, css as x, state as h, customElement as C } from "@umbraco-cms/backoffice/external/lit";
import { UmbModalBaseElement as w } from "@umbraco-cms/backoffice/modal";
import { UMB_NOTIFICATION_CONTEXT as $ } from "@umbraco-cms/backoffice/notification";
import { UmbSorterController as E } from "@umbraco-cms/backoffice/sorter";
import { M as m } from "./merchello-api-D-qg1PlO.js";
import { g as S } from "./brand-icons-AsNEBTKB.js";
var k = Object.defineProperty, z = Object.getOwnPropertyDescriptor, b = (e) => {
  throw TypeError(e);
}, d = (e, i, t, r) => {
  for (var o = r > 1 ? void 0 : r ? z(i, t) : i, p = e.length - 1, g; p >= 0; p--)
    (g = e[p]) && (o = (r ? g(i, t, o) : g(o)) || o);
  return r && o && k(i, t, o), o;
}, y = (e, i, t) => i.has(e) || b("Cannot " + t), c = (e, i, t) => (y(e, i, "read from private field"), i.get(e)), v = (e, i, t) => i.has(e) ? b("Cannot add the same private member more than once") : i instanceof WeakSet ? i.add(e) : i.set(e, t), f = (e, i, t, r) => (y(e, i, "write to private field"), i.set(e, t), t), n, u, _;
const P = {
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
let a = class extends w {
  constructor() {
    super(), this._methods = [], this._isLoading = !0, this._isSaving = !1, this._errorMessage = null, this._hasChanges = !1, v(this, n, !1), v(this, u), v(this, _, new E(this, {
      getUniqueOfElement: (e) => e.getAttribute("data-method-alias") ?? "",
      getUniqueOfModel: (e) => e.methodAlias,
      identifier: "Merchello.PaymentMethods.Sorter",
      itemSelector: ".method-row",
      containerSelector: ".methods-list",
      onChange: ({ model: e }) => {
        this._methods = e, this._handleMethodReorder(e.map((i) => i.methodAlias));
      }
    })), this.consumeContext($, (e) => {
      f(this, u, e);
    });
  }
  connectedCallback() {
    super.connectedCallback(), f(this, n, !0), this._loadMethods();
  }
  disconnectedCallback() {
    super.disconnectedCallback(), f(this, n, !1);
  }
  async _loadMethods() {
    this._isLoading = !0, this._errorMessage = null;
    const e = this.data?.setting;
    if (!e) {
      this._errorMessage = "No provider specified", this._isLoading = !1;
      return;
    }
    const { data: i, error: t } = await m.getPaymentProviderMethods(e.id);
    if (c(this, n)) {
      if (t) {
        this._errorMessage = t.message, this._isLoading = !1;
        return;
      }
      this._methods = i ?? [], c(this, _).setModel(this._methods), this._isLoading = !1;
    }
  }
  async _handleMethodReorder(e) {
    const i = this.data?.setting;
    if (!i) return;
    const { error: t } = await m.reorderPaymentMethods(i.id, e);
    c(this, n) && (t ? (c(this, u)?.peek("danger", {
      data: { headline: "Reorder failed", message: t.message }
    }), await this._loadMethods()) : this._hasChanges = !0);
  }
  async _handleToggle(e) {
    const i = this.data?.setting;
    if (!i) return;
    this._isSaving = !0, this._errorMessage = null;
    const { data: t, error: r } = await m.updatePaymentMethodSetting(
      i.id,
      e.methodAlias,
      { isEnabled: !e.isEnabled }
    );
    if (c(this, n)) {
      if (r) {
        this._errorMessage = r.message, this._isSaving = !1;
        return;
      }
      this._methods = t ?? this._methods, this._hasChanges = !0, this._isSaving = !1;
    }
  }
  _handleClose() {
    this.value = { isChanged: this._hasChanges }, this.modalContext?.submit();
  }
  _renderMethodIcon(e) {
    const i = e.iconHtml ?? S(e.methodAlias);
    return i ? s`<span class="method-icon">${M(i)}</span>` : s`<uui-icon name="${e.icon ?? "icon-credit-card"}"></uui-icon>`;
  }
  _renderRegionBadges(e) {
    return !e || e.length === 0 ? l : s`
      ${e.map(
      (i) => s`
          <span class="region-badge" title="${i.name}">
            ${P[i.code] ?? "🌍"} ${i.code}
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
              ${e.isExpressCheckout ? s`<span class="express-badge">Express</span>` : l}
              ${this._renderRegionBadges(e.supportedRegions)}
            </div>
          </div>
        </div>
        <uui-toggle
          .checked=${e.isEnabled}
          ?disabled=${this._isSaving}
          @change=${() => this._handleToggle(e)}
          label="${e.isEnabled ? "Enabled" : "Disabled"}"
        ></uui-toggle>
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
                    ` : l}

                <p class="description">
                  Enable or disable individual payment methods for this provider.
                  Disabled methods will not appear at checkout.
                  Drag to reorder methods.
                </p>

                <div class="methods-list">
                  ${this._methods.map((i) => this._renderMethod(i))}
                </div>

                ${this._methods.length === 0 ? s`<p class="no-methods">This provider has no configurable methods.</p>` : l}
              `}
        </div>

        <div slot="actions">
          <uui-button
            label="Close"
            look="primary"
            @click=${this._handleClose}
            ?disabled=${this._isSaving}
          >
            ${this._isSaving ? s`<uui-loader-circle></uui-loader-circle>` : l}
            Close
          </uui-button>
        </div>
      </umb-body-layout>
    `;
  }
};
n = /* @__PURE__ */ new WeakMap();
u = /* @__PURE__ */ new WeakMap();
_ = /* @__PURE__ */ new WeakMap();
a.styles = x`
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
d([
  h()
], a.prototype, "_methods", 2);
d([
  h()
], a.prototype, "_isLoading", 2);
d([
  h()
], a.prototype, "_isSaving", 2);
d([
  h()
], a.prototype, "_errorMessage", 2);
d([
  h()
], a.prototype, "_hasChanges", 2);
a = d([
  C("merchello-payment-methods-config-modal")
], a);
const R = a;
export {
  a as MerchelloPaymentMethodsConfigModalElement,
  R as default
};
//# sourceMappingURL=payment-methods-config-modal.element-D-x2FRvV.js.map
