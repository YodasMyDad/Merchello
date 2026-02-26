import { unsafeHTML as E, html as a, nothing as l, css as k, state as _, customElement as $ } from "@umbraco-cms/backoffice/external/lit";
import { UmbModalToken as S, UmbModalBaseElement as z, UMB_MODAL_MANAGER_CONTEXT as L } from "@umbraco-cms/backoffice/modal";
import { UMB_NOTIFICATION_CONTEXT as T } from "@umbraco-cms/backoffice/notification";
import { UmbSorterController as A } from "@umbraco-cms/backoffice/sorter";
import { M as y } from "./merchello-api-NdGX4WPd.js";
import { g as P } from "./brand-icons-vhzlavjm.js";
import { m as O } from "./modal-layout.styles-C2OaUji5.js";
const R = new S("Merchello.PaymentMethod.Edit.Modal", {
  modal: {
    type: "sidebar",
    size: "medium"
  }
});
var D = Object.defineProperty, I = Object.getOwnPropertyDescriptor, w = (e) => {
  throw TypeError(e);
}, g = (e, i, t, r) => {
  for (var u = r > 1 ? void 0 : r ? I(i, t) : i, b = e.length - 1, M; b >= 0; b--)
    (M = e[b]) && (u = (r ? M(i, t, u) : M(u)) || u);
  return r && u && D(i, t, u), u;
}, C = (e, i, t) => i.has(e) || w("Cannot " + t), s = (e, i, t) => (C(e, i, "read from private field"), i.get(e)), c = (e, i, t) => i.has(e) ? w("Cannot add the same private member more than once") : i instanceof WeakSet ? i.add(e) : i.set(e, t), o = (e, i, t, r) => (C(e, i, "write to private field"), i.set(e, t), t), h, f, m, v, p, n, x;
let d = class extends z {
  constructor() {
    super(), this._methods = [], this._isLoading = !0, this._isSaving = !1, this._errorMessage = null, this._hasChanges = !1, c(this, h, !1), c(this, f), c(this, m), c(this, v, !1), c(this, p, null), c(this, n), c(this, x, new A(this, {
      getUniqueOfElement: (e) => e.getAttribute("data-method-alias") ?? "",
      getUniqueOfModel: (e) => e.methodAlias,
      identifier: "Merchello.PaymentMethods.Sorter",
      itemSelector: ".method-row",
      containerSelector: ".methods-list",
      onChange: ({ model: e }) => {
        this._methods = e, this._queueMethodReorder(e.map((i) => i.methodAlias));
      }
    })), this.consumeContext(T, (e) => {
      o(this, f, e);
    }), this.consumeContext(L, (e) => {
      o(this, m, e);
    });
  }
  connectedCallback() {
    super.connectedCallback(), o(this, h, !0), this._loadMethods();
  }
  disconnectedCallback() {
    super.disconnectedCallback(), o(this, h, !1), s(this, n) !== void 0 && (window.clearTimeout(s(this, n)), o(this, n, void 0));
  }
  async _loadMethods() {
    this._isLoading = !0, this._errorMessage = null;
    const e = this.data?.setting;
    if (!e) {
      this._errorMessage = "No provider specified", this._isLoading = !1;
      return;
    }
    const { data: i, error: t } = await y.getPaymentProviderMethods(e.id);
    if (s(this, h)) {
      if (t) {
        this._errorMessage = t.message, this._isLoading = !1;
        return;
      }
      this._methods = i ?? [], s(this, x).setModel(this._methods), this._isLoading = !1;
    }
  }
  _queueMethodReorder(e) {
    o(this, p, [...new Set(e)]), s(this, n) !== void 0 && window.clearTimeout(s(this, n)), o(this, n, window.setTimeout(() => {
      o(this, n, void 0), this._flushMethodReorderQueue();
    }, 200));
  }
  async _flushMethodReorderQueue() {
    if (s(this, v)) return;
    const e = this.data?.setting;
    if (e) {
      o(this, v, !0);
      try {
        for (; s(this, p) && s(this, h); ) {
          const i = s(this, p);
          o(this, p, null);
          const { error: t } = await y.reorderPaymentMethods(e.id, i);
          if (!s(this, h)) return;
          if (t) {
            s(this, f)?.peek("danger", {
              data: { headline: "Reorder failed", message: t.message }
            }), o(this, p, null), await this._loadMethods();
            break;
          }
          this._hasChanges = !0;
        }
      } finally {
        o(this, v, !1);
      }
    }
  }
  async _handleToggle(e) {
    const i = this.data?.setting;
    if (!i) return;
    this._isSaving = !0, this._errorMessage = null;
    const { data: t, error: r } = await y.updatePaymentMethodSetting(
      i.id,
      e.methodAlias,
      { isEnabled: !e.isEnabled }
    );
    if (s(this, h)) {
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
  async _openEditModal(e) {
    const i = this.data?.setting;
    if (!i || !s(this, m)) return;
    (await s(this, m).open(this, R, {
      data: {
        providerSettingId: i.id,
        method: e
      }
    }).onSubmit().catch(() => null))?.isChanged && (this._hasChanges = !0, await this._loadMethods());
  }
  _renderMethodIcon(e) {
    const i = e.iconHtml ?? P(e.methodAlias);
    return i ? a`<span class="method-icon">${E(i)}</span>` : a`<uui-icon name="${e.icon ?? "icon-credit-card"}"></uui-icon>`;
  }
  _renderRegionBadges(e) {
    return !e || e.length === 0 ? l : a`
      ${e.map(
      (i) => a`
          <span class="region-badge" title="${i.name}">
            ${i.code}
          </span>
        `
    )}
    `;
  }
  _renderMethod(e) {
    return a`
      <div class="method-row" data-method-alias=${e.methodAlias}>
        <div class="method-left">
          <div class="method-drag-handle">
            <uui-icon name="icon-navigation"></uui-icon>
          </div>
          <div class="method-info">
            ${this._renderMethodIcon(e)}
            <div class="method-details">
              <span class="method-name">${e.displayName}</span>
              ${e.isExpressCheckout ? a`<span class="express-badge">Express</span>` : l}
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
    return a`
      <umb-body-layout headline="Payment Methods - ${e?.displayName ?? "Provider"}">
        <div id="main">
          ${this._isLoading ? a`
                <div class="loading">
                  <uui-loader></uui-loader>
                  <span>Loading methods...</span>
                </div>
              ` : l}

          ${!this._isLoading && this._errorMessage ? a`
                <div class="error-message">
                  <uui-icon name="icon-alert"></uui-icon>
                  ${this._errorMessage}
                </div>
              ` : l}

          ${this._isLoading ? l : a`
                <p class="description">
                  Enable or disable individual payment methods for this provider.
                  Drag to reorder. Click Edit to customize display name, icon, and styling.
                </p>
              `}

          <!-- Always render container for sorter -->
          <div class="methods-list">
            ${!this._isLoading && !this._errorMessage ? this._methods.map((i) => this._renderMethod(i)) : l}
          </div>

          ${!this._isLoading && !this._errorMessage && this._methods.length === 0 ? a`<p class="no-methods">This provider has no configurable methods.</p>` : l}
        </div>

        <div slot="actions">
          <uui-button
            label="Close"
            look="primary"
            @click=${this._handleClose}
            ?disabled=${this._isSaving}
          >
            ${this._isSaving ? a`<uui-loader-circle></uui-loader-circle>` : l}
            Close
          </uui-button>
        </div>
      </umb-body-layout>
    `;
  }
};
h = /* @__PURE__ */ new WeakMap();
f = /* @__PURE__ */ new WeakMap();
m = /* @__PURE__ */ new WeakMap();
v = /* @__PURE__ */ new WeakMap();
p = /* @__PURE__ */ new WeakMap();
n = /* @__PURE__ */ new WeakMap();
x = /* @__PURE__ */ new WeakMap();
d.styles = [
  O,
  k`
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
  `
];
g([
  _()
], d.prototype, "_methods", 2);
g([
  _()
], d.prototype, "_isLoading", 2);
g([
  _()
], d.prototype, "_isSaving", 2);
g([
  _()
], d.prototype, "_errorMessage", 2);
g([
  _()
], d.prototype, "_hasChanges", 2);
d = g([
  $("merchello-payment-methods-config-modal")
], d);
const F = d;
export {
  d as MerchelloPaymentMethodsConfigModalElement,
  F as default
};
//# sourceMappingURL=payment-methods-config-modal.element-M1xWhgKI.js.map
