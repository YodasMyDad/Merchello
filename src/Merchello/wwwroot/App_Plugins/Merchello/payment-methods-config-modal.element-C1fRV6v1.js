import { html as t, nothing as c, css as f, state as l, customElement as y } from "@umbraco-cms/backoffice/external/lit";
import { UmbModalBaseElement as b } from "@umbraco-cms/backoffice/modal";
import { M as p } from "./merchello-api-Z_Hs6xGH.js";
import { g as x } from "./brand-icons-Dfynzp_2.js";
var M = Object.defineProperty, C = Object.getOwnPropertyDescriptor, m = (e) => {
  throw TypeError(e);
}, d = (e, s, i, r) => {
  for (var o = r > 1 ? void 0 : r ? C(s, i) : s, u = e.length - 1, h; u >= 0; u--)
    (h = e[u]) && (o = (r ? h(s, i, o) : h(o)) || o);
  return r && o && M(s, i, o), o;
}, _ = (e, s, i) => s.has(e) || m("Cannot " + i), g = (e, s, i) => (_(e, s, "read from private field"), s.get(e)), $ = (e, s, i) => s.has(e) ? m("Cannot add the same private member more than once") : s instanceof WeakSet ? s.add(e) : s.set(e, i), v = (e, s, i, r) => (_(e, s, "write to private field"), s.set(e, i), i), n;
let a = class extends b {
  constructor() {
    super(...arguments), this._methods = [], this._isLoading = !0, this._isSaving = !1, this._errorMessage = null, this._hasChanges = !1, $(this, n, !1);
  }
  connectedCallback() {
    super.connectedCallback(), v(this, n, !0), this._loadMethods();
  }
  disconnectedCallback() {
    super.disconnectedCallback(), v(this, n, !1);
  }
  async _loadMethods() {
    this._isLoading = !0, this._errorMessage = null;
    const e = this.data?.setting;
    if (!e) {
      this._errorMessage = "No provider specified", this._isLoading = !1;
      return;
    }
    const { data: s, error: i } = await p.getPaymentProviderMethods(e.id);
    if (g(this, n)) {
      if (i) {
        this._errorMessage = i.message, this._isLoading = !1;
        return;
      }
      this._methods = s ?? [], this._isLoading = !1;
    }
  }
  async _handleToggle(e) {
    const s = this.data?.setting;
    if (!s) return;
    this._isSaving = !0, this._errorMessage = null;
    const { data: i, error: r } = await p.updatePaymentMethodSetting(
      s.id,
      e.methodAlias,
      { isEnabled: !e.isEnabled }
    );
    if (g(this, n)) {
      if (r) {
        this._errorMessage = r.message, this._isSaving = !1;
        return;
      }
      this._methods = i ?? this._methods, this._hasChanges = !0, this._isSaving = !1;
    }
  }
  _handleClose() {
    this.value = { isChanged: this._hasChanges }, this.modalContext?.submit();
  }
  _renderMethodIcon(e) {
    const s = x(e.methodAlias);
    return s ? t`<span class="method-icon" .innerHTML=${s}></span>` : t`<uui-icon name="${e.icon ?? "icon-credit-card"}"></uui-icon>`;
  }
  _renderMethod(e) {
    return t`
      <div class="method-row">
        <div class="method-info">
          ${this._renderMethodIcon(e)}
          <div class="method-details">
            <span class="method-name">${e.displayName}</span>
            ${e.isExpressCheckout ? t`<span class="express-badge">Express</span>` : c}
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
    return t`
      <umb-body-layout headline="Payment Methods - ${e?.displayName ?? "Provider"}">
        <div id="main">
          ${this._isLoading ? t`
                <div class="loading">
                  <uui-loader></uui-loader>
                  <span>Loading methods...</span>
                </div>
              ` : t`
                ${this._errorMessage ? t`
                      <div class="error-message">
                        <uui-icon name="icon-alert"></uui-icon>
                        ${this._errorMessage}
                      </div>
                    ` : c}

                <p class="description">
                  Enable or disable individual payment methods for this provider.
                  Disabled methods will not appear at checkout.
                </p>

                <div class="methods-list">
                  ${this._methods.map((s) => this._renderMethod(s))}
                </div>

                ${this._methods.length === 0 ? t`<p class="no-methods">This provider has no configurable methods.</p>` : c}
              `}
        </div>

        <div slot="actions">
          <uui-button
            label="Close"
            look="primary"
            @click=${this._handleClose}
            ?disabled=${this._isSaving}
          >
            ${this._isSaving ? t`<uui-loader-circle></uui-loader-circle>` : c}
            Close
          </uui-button>
        </div>
      </umb-body-layout>
    `;
  }
};
n = /* @__PURE__ */ new WeakMap();
a.styles = f`
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
  l()
], a.prototype, "_methods", 2);
d([
  l()
], a.prototype, "_isLoading", 2);
d([
  l()
], a.prototype, "_isSaving", 2);
d([
  l()
], a.prototype, "_errorMessage", 2);
d([
  l()
], a.prototype, "_hasChanges", 2);
a = d([
  y("merchello-payment-methods-config-modal")
], a);
const S = a;
export {
  a as MerchelloPaymentMethodsConfigModalElement,
  S as default
};
//# sourceMappingURL=payment-methods-config-modal.element-C1fRV6v1.js.map
