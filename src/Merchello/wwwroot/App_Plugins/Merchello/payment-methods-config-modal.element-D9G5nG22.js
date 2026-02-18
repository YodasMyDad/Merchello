import { unsafeHTML as x, html as s, nothing as r, css as C, state as u, customElement as w } from "@umbraco-cms/backoffice/external/lit";
import { UmbModalToken as E, UmbModalBaseElement as $, UMB_MODAL_MANAGER_CONTEXT as k } from "@umbraco-cms/backoffice/modal";
import { UMB_NOTIFICATION_CONTEXT as z } from "@umbraco-cms/backoffice/notification";
import { UmbSorterController as S } from "@umbraco-cms/backoffice/sorter";
import { M as f } from "./merchello-api-B1P1cUX9.js";
import { g as L } from "./brand-icons-vhzlavjm.js";
const P = new E("Merchello.PaymentMethod.Edit.Modal", {
  modal: {
    type: "sidebar",
    size: "medium"
  }
});
var A = Object.defineProperty, T = Object.getOwnPropertyDescriptor, M = (e) => {
  throw TypeError(e);
}, c = (e, i, t, a) => {
  for (var n = a > 1 ? void 0 : a ? T(i, t) : i, v = e.length - 1, _; v >= 0; v--)
    (_ = e[v]) && (n = (a ? _(i, t, n) : _(n)) || n);
  return a && n && A(i, t, n), n;
}, y = (e, i, t) => i.has(e) || M("Cannot " + t), d = (e, i, t) => (y(e, i, "read from private field"), i.get(e)), g = (e, i, t) => i.has(e) ? M("Cannot add the same private member more than once") : i instanceof WeakSet ? i.add(e) : i.set(e, t), p = (e, i, t, a) => (y(e, i, "write to private field"), i.set(e, t), t), l, m, h, b;
let o = class extends $ {
  constructor() {
    super(), this._methods = [], this._isLoading = !0, this._isSaving = !1, this._errorMessage = null, this._hasChanges = !1, g(this, l, !1), g(this, m), g(this, h), g(this, b, new S(this, {
      getUniqueOfElement: (e) => e.getAttribute("data-method-alias") ?? "",
      getUniqueOfModel: (e) => e.methodAlias,
      identifier: "Merchello.PaymentMethods.Sorter",
      itemSelector: ".method-row",
      containerSelector: ".methods-list",
      onChange: ({ model: e }) => {
        this._methods = e, this._handleMethodReorder(e.map((i) => i.methodAlias));
      }
    })), this.consumeContext(z, (e) => {
      p(this, m, e);
    }), this.consumeContext(k, (e) => {
      p(this, h, e);
    });
  }
  connectedCallback() {
    super.connectedCallback(), p(this, l, !0), this._loadMethods();
  }
  disconnectedCallback() {
    super.disconnectedCallback(), p(this, l, !1);
  }
  async _loadMethods() {
    this._isLoading = !0, this._errorMessage = null;
    const e = this.data?.setting;
    if (!e) {
      this._errorMessage = "No provider specified", this._isLoading = !1;
      return;
    }
    const { data: i, error: t } = await f.getPaymentProviderMethods(e.id);
    if (d(this, l)) {
      if (t) {
        this._errorMessage = t.message, this._isLoading = !1;
        return;
      }
      this._methods = i ?? [], d(this, b).setModel(this._methods), this._isLoading = !1;
    }
  }
  async _handleMethodReorder(e) {
    const i = this.data?.setting;
    if (!i) return;
    const { error: t } = await f.reorderPaymentMethods(i.id, e);
    d(this, l) && (t ? (d(this, m)?.peek("danger", {
      data: { headline: "Reorder failed", message: t.message }
    }), await this._loadMethods()) : this._hasChanges = !0);
  }
  async _handleToggle(e) {
    const i = this.data?.setting;
    if (!i) return;
    this._isSaving = !0, this._errorMessage = null;
    const { data: t, error: a } = await f.updatePaymentMethodSetting(
      i.id,
      e.methodAlias,
      { isEnabled: !e.isEnabled }
    );
    if (d(this, l)) {
      if (a) {
        this._errorMessage = a.message, this._isSaving = !1;
        return;
      }
      this._methods = t ?? this._methods, this._hasChanges = !0, this._isSaving = !1;
    }
  }
  _handleClose() {
    this.value = { isChanged: this._hasChanges }, this.modalContext?.submit();
  }
  async _openEditModal(e) {
    const i = this.data?.setting;
    if (!i || !d(this, h)) return;
    (await d(this, h).open(this, P, {
      data: {
        providerSettingId: i.id,
        method: e
      }
    }).onSubmit().catch(() => null))?.isChanged && (this._hasChanges = !0, await this._loadMethods());
  }
  _renderMethodIcon(e) {
    const i = e.iconHtml ?? L(e.methodAlias);
    return i ? s`<span class="method-icon">${x(i)}</span>` : s`<uui-icon name="${e.icon ?? "icon-credit-card"}"></uui-icon>`;
  }
  _renderRegionBadges(e) {
    return !e || e.length === 0 ? r : s`
      ${e.map(
      (i) => s`
          <span class="region-badge" title="${i.name}">
            ${i.code}
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
              ${e.isExpressCheckout ? s`<span class="express-badge">Express</span>` : r}
              ${this._renderRegionBadges(e.supportedRegions)}
            </div>
          </div>
        </div>
        <div class="method-actions">
          <uui-button
            compact
            label="Edit"
            look="secondary"
            @click=${(i) => {
      i.stopPropagation(), this._openEditModal(e);
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
              ` : r}

          ${!this._isLoading && this._errorMessage ? s`
                <div class="error-message">
                  <uui-icon name="icon-alert"></uui-icon>
                  ${this._errorMessage}
                </div>
              ` : r}

          ${this._isLoading ? r : s`
                <p class="description">
                  Enable or disable individual payment methods for this provider.
                  Drag to reorder. Click Edit to customize display name, icon, and styling.
                </p>
              `}

          <!-- Always render container for sorter -->
          <div class="methods-list">
            ${!this._isLoading && !this._errorMessage ? this._methods.map((i) => this._renderMethod(i)) : r}
          </div>

          ${!this._isLoading && !this._errorMessage && this._methods.length === 0 ? s`<p class="no-methods">This provider has no configurable methods.</p>` : r}
        </div>

        <div slot="actions">
          <uui-button
            label="Close"
            look="primary"
            @click=${this._handleClose}
            ?disabled=${this._isSaving}
          >
            ${this._isSaving ? s`<uui-loader-circle></uui-loader-circle>` : r}
            Close
          </uui-button>
        </div>
      </umb-body-layout>
    `;
  }
};
l = /* @__PURE__ */ new WeakMap();
m = /* @__PURE__ */ new WeakMap();
h = /* @__PURE__ */ new WeakMap();
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
c([
  u()
], o.prototype, "_methods", 2);
c([
  u()
], o.prototype, "_isLoading", 2);
c([
  u()
], o.prototype, "_isSaving", 2);
c([
  u()
], o.prototype, "_errorMessage", 2);
c([
  u()
], o.prototype, "_hasChanges", 2);
o = c([
  w("merchello-payment-methods-config-modal")
], o);
const B = o;
export {
  o as MerchelloPaymentMethodsConfigModalElement,
  B as default
};
//# sourceMappingURL=payment-methods-config-modal.element-D9G5nG22.js.map
