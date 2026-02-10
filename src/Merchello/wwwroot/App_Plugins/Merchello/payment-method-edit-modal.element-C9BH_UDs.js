import { html as a, unsafeHTML as p, nothing as n, css as m, state as c, customElement as g } from "@umbraco-cms/backoffice/external/lit";
import { UmbModalBaseElement as C } from "@umbraco-cms/backoffice/modal";
import { UMB_NOTIFICATION_CONTEXT as y } from "@umbraco-cms/backoffice/notification";
import { M as f } from "./merchello-api-BuImeZL2.js";
import { g as b } from "./brand-icons-Wu7yNU5M.js";
var x = Object.defineProperty, k = Object.getOwnPropertyDescriptor, v = (e) => {
  throw TypeError(e);
}, d = (e, o, r, t) => {
  for (var i = t > 1 ? void 0 : t ? k(o, r) : o, l = e.length - 1, h; l >= 0; l--)
    (h = e[l]) && (i = (t ? h(o, r, i) : h(i)) || i);
  return t && i && x(o, r, i), i;
}, _ = (e, o, r) => o.has(e) || v("Cannot " + r), w = (e, o, r) => (_(e, o, "read from private field"), o.get(e)), S = (e, o, r) => o.has(e) ? v("Cannot add the same private member more than once") : o instanceof WeakSet ? o.add(e) : o.set(e, r), $ = (e, o, r, t) => (_(e, o, "write to private field"), o.set(e, r), r), u;
let s = class extends C {
  constructor() {
    super(), this._displayNameOverride = "", this._iconMediaKey = null, this._backgroundColor = "", this._borderColor = "", this._textColor = "", this._useSelectedColors = !1, this._selectedBackgroundColor = "", this._selectedBorderColor = "", this._selectedTextColor = "", this._isSaving = !1, this._errorMessage = null, S(this, u), this.consumeContext(y, (e) => {
      $(this, u, e);
    });
  }
  connectedCallback() {
    super.connectedCallback(), this._initializeFromMethod();
  }
  _initializeFromMethod() {
    const e = this.data?.method;
    if (!e) return;
    this._displayNameOverride = e.displayNameOverride ?? "", this._iconMediaKey = e.iconMediaKey ?? null;
    const o = e.checkoutStyleOverride;
    if (o) {
      this._backgroundColor = o.backgroundColor ?? "", this._borderColor = o.borderColor ?? "", this._textColor = o.textColor ?? "";
      const r = o.selectedBackgroundColor || o.selectedBorderColor || o.selectedTextColor;
      this._useSelectedColors = !!r, r && (this._selectedBackgroundColor = o.selectedBackgroundColor ?? "", this._selectedBorderColor = o.selectedBorderColor ?? "", this._selectedTextColor = o.selectedTextColor ?? "");
    }
  }
  _handleDisplayNameChange(e) {
    const o = e.target;
    this._displayNameOverride = o.value;
  }
  _handleMediaChange(e) {
    const r = e.target?.value || [];
    this._iconMediaKey = r.length > 0 && r[0].mediaKey || null;
  }
  _clearIcon() {
    this._iconMediaKey = null;
  }
  _handleColorChange(e, o) {
    const t = o.target.value || "";
    switch (e) {
      case "backgroundColor":
        this._backgroundColor = t;
        break;
      case "borderColor":
        this._borderColor = t;
        break;
      case "textColor":
        this._textColor = t;
        break;
      case "selectedBackgroundColor":
        this._selectedBackgroundColor = t;
        break;
      case "selectedBorderColor":
        this._selectedBorderColor = t;
        break;
      case "selectedTextColor":
        this._selectedTextColor = t;
        break;
    }
  }
  _toggleUseSelectedColors() {
    this._useSelectedColors = !this._useSelectedColors, this._useSelectedColors || (this._selectedBackgroundColor = "", this._selectedBorderColor = "", this._selectedTextColor = "");
  }
  _resetToDefaults() {
    this._displayNameOverride = "", this._iconMediaKey = null, this._backgroundColor = "", this._borderColor = "", this._textColor = "", this._useSelectedColors = !1, this._selectedBackgroundColor = "", this._selectedBorderColor = "", this._selectedTextColor = "";
  }
  async _handleSave() {
    const { providerSettingId: e, method: o } = this.data ?? {};
    if (!e || !o) return;
    this._isSaving = !0, this._errorMessage = null;
    const r = {
      displayNameOverride: this._displayNameOverride || null
    };
    if (this._iconMediaKey ? r.iconMediaKey = this._iconMediaKey : o.iconMediaKey && (r.clearIcon = !0), this._backgroundColor || this._borderColor || this._textColor || this._selectedBackgroundColor || this._selectedBorderColor || this._selectedTextColor) {
      const l = {};
      this._backgroundColor && (l.backgroundColor = this._backgroundColor), this._borderColor && (l.borderColor = this._borderColor), this._textColor && (l.textColor = this._textColor), this._useSelectedColors && (this._selectedBackgroundColor && (l.selectedBackgroundColor = this._selectedBackgroundColor), this._selectedBorderColor && (l.selectedBorderColor = this._selectedBorderColor), this._selectedTextColor && (l.selectedTextColor = this._selectedTextColor)), r.checkoutStyleOverride = l;
    } else o.checkoutStyleOverride && (r.clearCheckoutStyle = !0);
    const { error: i } = await f.updatePaymentMethodSetting(
      e,
      o.methodAlias,
      r
    );
    if (i) {
      this._errorMessage = i.message, this._isSaving = !1;
      return;
    }
    w(this, u)?.peek("positive", {
      data: { headline: "Saved", message: "Payment method settings updated" }
    }), this.value = { isChanged: !0 }, this.modalContext?.submit();
  }
  _handleCancel() {
    this.value = { isChanged: !1 }, this.modalContext?.reject();
  }
  _getPreviewDisplayName() {
    const e = this.data?.method;
    return this._displayNameOverride || e?.defaultDisplayName || e?.displayName || "Payment Method";
  }
  _renderPreview() {
    const e = this.data?.method, o = this._backgroundColor || "var(--uui-color-surface)", r = this._borderColor || "var(--uui-color-border)", t = this._textColor || "var(--uui-color-text)";
    let i = n;
    if (this._iconMediaKey && e?.iconMediaUrl)
      i = a`<img src="${e.iconMediaUrl}" alt="${this._getPreviewDisplayName()}" />`;
    else if (e?.iconHtml)
      i = p(e.iconHtml);
    else {
      const l = b(e?.methodAlias ?? "");
      l ? i = p(l) : i = a`<uui-icon name="${e?.icon ?? "icon-credit-card"}"></uui-icon>`;
    }
    return a`
      <uui-box headline="Checkout Preview">
        <div class="checkout-preview">
          <div
            class="preview-method"
            style="
              background-color: ${o};
              border-color: ${r};
              color: ${t};
            "
          >
            <span class="preview-method-icon">${i}</span>
            <span class="preview-method-name">${this._getPreviewDisplayName()}</span>
            <span class="preview-radio"></span>
          </div>
          <p class="preview-hint">Shows how this method appears at checkout</p>
        </div>
      </uui-box>
    `;
  }
  _renderDisplaySection() {
    const e = this.data?.method, o = this._iconMediaKey ? [{ key: this._iconMediaKey, mediaKey: this._iconMediaKey }] : [];
    return a`
      <uui-box headline="Display">
        <div class="form-section">
          <div class="form-row">
            <label>Display Name</label>
            <uui-input
              label="Display name"
              .value=${this._displayNameOverride}
              placeholder="${e?.defaultDisplayName ?? "Enter display name"}"
              @input=${this._handleDisplayNameChange}
            ></uui-input>
            <span class="hint">
              Leave empty to use: "${e?.defaultDisplayName ?? "default"}"
            </span>
          </div>

          <div class="form-row">
            <label>Custom Icon</label>
            <umb-input-rich-media
              .value=${o}
              ?multiple=${!1}
              @change=${this._handleMediaChange}
            ></umb-input-rich-media>
            ${this._iconMediaKey ? a`
                  <uui-button
                    label="Remove icon"
                    look="placeholder"
                    compact
                    @click=${this._clearIcon}
                  >
                    <uui-icon name="icon-trash"></uui-icon> Remove custom icon
                  </uui-button>
                ` : n}
            <span class="hint">64x64px recommended. PNG or uploaded SVG.</span>
          </div>
        </div>
      </uui-box>
    `;
  }
  _renderColorPicker(e, o, r) {
    return a`
      <div class="color-field">
        <label>${e}</label>
        <div class="color-picker-row">
          <uui-color-picker
            label="${e}"
            .value=${o}
            @change=${(t) => this._handleColorChange(r, t)}
          ></uui-color-picker>
          ${o ? a`
                <div class="color-preview">
                  <span class="color-swatch" style="background-color: ${o}"></span>
                  <span class="color-value">${o}</span>
                </div>
              ` : n}
        </div>
      </div>
    `;
  }
  _renderStyleSection() {
    return a`
      <uui-box headline="Checkout Styling">
        <div class="form-section">
          <div class="color-row">
            ${this._renderColorPicker("Background Color", this._backgroundColor, "backgroundColor")}
            ${this._renderColorPicker("Border Color", this._borderColor, "borderColor")}
          </div>

          <div class="color-row">
            ${this._renderColorPicker("Text Color", this._textColor, "textColor")}
          </div>

          <div class="selected-toggle">
            <uui-checkbox
              label="Use different colors when selected"
              ?checked=${this._useSelectedColors}
              @change=${this._toggleUseSelectedColors}
            >
              Use different colors when selected
            </uui-checkbox>
          </div>

          ${this._useSelectedColors ? a`
                <div class="selected-colors">
                  <div class="color-row">
                    ${this._renderColorPicker(
      "Selected Background",
      this._selectedBackgroundColor,
      "selectedBackgroundColor"
    )}
                    ${this._renderColorPicker(
      "Selected Border",
      this._selectedBorderColor,
      "selectedBorderColor"
    )}
                  </div>
                  <div class="color-row">
                    ${this._renderColorPicker(
      "Selected Text",
      this._selectedTextColor,
      "selectedTextColor"
    )}
                  </div>
                </div>
              ` : n}

          <div class="reset-section">
            <uui-button
              label="Reset to Provider Defaults"
              look="secondary"
              @click=${this._resetToDefaults}
            >
              <uui-icon name="icon-undo"></uui-icon>
              Reset to Provider Defaults
            </uui-button>
          </div>
        </div>
      </uui-box>
    `;
  }
  render() {
    const e = this.data?.method;
    return a`
      <umb-body-layout headline="Edit Payment Method">
        <div id="main">
          ${this._errorMessage ? a`
                <div class="error-message">
                  <uui-icon name="icon-alert"></uui-icon>
                  ${this._errorMessage}
                </div>
              ` : n}

          <p class="method-info">
            <strong>${e?.displayName}</strong>
            ${e?.isExpressCheckout ? a`<span class="express-badge">Express</span>` : n}
          </p>

          ${this._renderPreview()}
          ${this._renderDisplaySection()}
          ${this._renderStyleSection()}
        </div>

        <div slot="actions">
          <uui-button
            label="Cancel"
            look="secondary"
            @click=${this._handleCancel}
            ?disabled=${this._isSaving}
          >
            Cancel
          </uui-button>
          <uui-button
            label="Save"
            look="primary"
            color="positive"
            @click=${this._handleSave}
            ?disabled=${this._isSaving}
          >
            ${this._isSaving ? a`<uui-loader-circle></uui-loader-circle>` : n}
            Save
          </uui-button>
        </div>
      </umb-body-layout>
    `;
  }
};
u = /* @__PURE__ */ new WeakMap();
s.styles = m`
    :host {
      display: block;
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

    .method-info {
      margin: 0 0 var(--uui-size-space-4) 0;
      display: flex;
      align-items: center;
      gap: var(--uui-size-space-2);
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

    uui-box {
      margin-bottom: var(--uui-size-space-5);
    }

    /* Checkout Preview */
    .checkout-preview {
      padding: var(--uui-size-space-4);
    }

    .preview-method {
      display: flex;
      align-items: center;
      gap: var(--uui-size-space-3);
      padding: var(--uui-size-space-4);
      border: 2px solid var(--uui-color-border);
      border-radius: var(--uui-border-radius);
      background: var(--uui-color-surface);
      max-width: 300px;
      margin: 0 auto;
    }

    .preview-method-icon {
      width: 24px;
      height: 24px;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .preview-method-icon img,
    .preview-method-icon svg {
      max-width: 100%;
      max-height: 100%;
    }

    .preview-method-name {
      flex: 1;
      font-weight: 500;
    }

    .preview-radio {
      width: 18px;
      height: 18px;
      border: 2px solid currentColor;
      border-radius: 50%;
      opacity: 0.6;
    }

    .preview-hint {
      text-align: center;
      margin-top: var(--uui-size-space-3);
      font-size: 0.875rem;
      color: var(--uui-color-text-alt);
    }

    /* Form sections */
    .form-section {
      display: flex;
      flex-direction: column;
      gap: var(--uui-size-space-4);
    }

    .form-row {
      display: flex;
      flex-direction: column;
      gap: var(--uui-size-space-2);
    }

    .form-row label {
      font-weight: 500;
    }

    .hint {
      font-size: 0.75rem;
      color: var(--uui-color-text-alt);
    }

    /* Color picker */
    .color-row {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: var(--uui-size-space-4);
    }

    @media (max-width: 600px) {
      .color-row {
        grid-template-columns: 1fr;
      }
    }

    .color-field {
      display: flex;
      flex-direction: column;
      gap: var(--uui-size-space-2);
    }

    .color-field label {
      font-weight: 500;
      font-size: 0.875rem;
    }

    .color-picker-row {
      display: flex;
      flex-direction: column;
      gap: var(--uui-size-space-2);
    }

    .color-preview {
      display: flex;
      align-items: center;
      gap: var(--uui-size-space-2);
    }

    .color-swatch {
      width: 20px;
      height: 20px;
      border-radius: var(--uui-border-radius);
      border: 1px solid var(--uui-color-border);
    }

    .color-value {
      font-family: monospace;
      font-size: 0.75rem;
      color: var(--uui-color-text-alt);
    }

    /* Selected toggle */
    .selected-toggle {
      margin-top: var(--uui-size-space-4);
      padding-top: var(--uui-size-space-4);
      border-top: 1px solid var(--uui-color-border);
    }

    .selected-colors {
      margin-top: var(--uui-size-space-4);
      padding: var(--uui-size-space-4);
      background: var(--uui-color-surface-alt);
      border-radius: var(--uui-border-radius);
      display: flex;
      flex-direction: column;
      gap: var(--uui-size-space-4);
    }

    /* Reset button */
    .reset-section {
      display: flex;
      justify-content: flex-end;
      margin-top: var(--uui-size-space-4);
      padding-top: var(--uui-size-space-4);
      border-top: 1px solid var(--uui-color-border);
    }

    /* Actions */
    [slot="actions"] {
      display: flex;
      justify-content: flex-end;
      gap: var(--uui-size-space-3);
    }
  `;
d([
  c()
], s.prototype, "_displayNameOverride", 2);
d([
  c()
], s.prototype, "_iconMediaKey", 2);
d([
  c()
], s.prototype, "_backgroundColor", 2);
d([
  c()
], s.prototype, "_borderColor", 2);
d([
  c()
], s.prototype, "_textColor", 2);
d([
  c()
], s.prototype, "_useSelectedColors", 2);
d([
  c()
], s.prototype, "_selectedBackgroundColor", 2);
d([
  c()
], s.prototype, "_selectedBorderColor", 2);
d([
  c()
], s.prototype, "_selectedTextColor", 2);
d([
  c()
], s.prototype, "_isSaving", 2);
d([
  c()
], s.prototype, "_errorMessage", 2);
s = d([
  g("merchello-payment-method-edit-modal")
], s);
const T = s;
export {
  s as MerchelloPaymentMethodEditModalElement,
  T as default
};
//# sourceMappingURL=payment-method-edit-modal.element-C9BH_UDs.js.map
