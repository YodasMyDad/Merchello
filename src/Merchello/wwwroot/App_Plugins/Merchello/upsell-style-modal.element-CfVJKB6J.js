import { html as s, css as h, state as v, customElement as b } from "@umbraco-cms/backoffice/external/lit";
import { UmbModalBaseElement as m } from "@umbraco-cms/backoffice/modal";
import { m as y } from "./modal-layout.styles-C2OaUji5.js";
var f = Object.defineProperty, g = Object.getOwnPropertyDescriptor, u = (e, t, i, r) => {
  for (var o = r > 1 ? void 0 : r ? g(t, i) : t, a = e.length - 1, l; a >= 0; a--)
    (l = e[a]) && (o = (r ? l(t, i, o) : l(o)) || o);
  return r && o && f(t, i, o), o;
};
const c = [
  { key: "checkoutInline", label: "Checkout Inline", description: "Collapsed/expandable inline checkout offers." },
  { key: "checkoutInterstitial", label: "Checkout Interstitial", description: "Interstitial offer step before checkout form." },
  { key: "postPurchase", label: "Post-Purchase", description: "Offer page shown after payment before confirmation." },
  { key: "basket", label: "Basket", description: "Basket/cart recommendation surfaces." },
  { key: "productPage", label: "Product Page", description: "Recommendations shown on product detail pages." },
  { key: "confirmation", label: "Confirmation", description: "Recommendations shown on order confirmation." },
  { key: "email", label: "Email", description: "Transactional email recommendation blocks." }
], p = [
  { key: "container", label: "Container" },
  { key: "heading", label: "Heading" },
  { key: "message", label: "Message" },
  { key: "productCard", label: "Product Card" },
  { key: "productName", label: "Product Name" },
  { key: "productDescription", label: "Product Description" },
  { key: "productPrice", label: "Price" },
  { key: "badge", label: "Badge" },
  { key: "button", label: "Primary Button" },
  { key: "secondaryButton", label: "Secondary Button" },
  { key: "variantSelector", label: "Variant Selector" },
  { key: "statusText", label: "Status Text" }
], w = [
  { value: "", label: "Default" },
  { value: "none", label: "None" },
  { value: "solid", label: "Solid" },
  { value: "dashed", label: "Dashed" },
  { value: "dotted", label: "Dotted" },
  { value: "double", label: "Double" }
];
let d = class extends m {
  constructor() {
    super(...arguments), this._styles = {}, this._activeSurface = "checkoutInline", this._previewAddedState = !1;
  }
  connectedCallback() {
    super.connectedCallback(), this._styles = this._cloneStyles(this.data?.styles);
  }
  _cloneStyles(e) {
    return e ? JSON.parse(JSON.stringify(e)) : {};
  }
  _getSurfaceStyle(e) {
    return this._styles[e] ?? {};
  }
  _getElementStyle(e, t) {
    return this._getSurfaceStyle(e)[t] ?? {};
  }
  _setElementStyle(e, t, i) {
    const r = { ...this._styles }, o = { ...this._getSurfaceStyle(e) }, a = { ...this._getElementStyle(e, t) }, l = i(a);
    this._isElementStyleEmpty(l) ? delete o[t] : o[t] = l, this._isSurfaceStyleEmpty(o) ? delete r[e] : r[e] = o, this._styles = r;
  }
  _handleColorChange(e, t, i, r) {
    const a = r.target.value?.trim() ?? "";
    this._setElementStyle(e, t, (l) => ({
      ...l,
      [i]: a || void 0
    }));
  }
  _handleBorderStyleChange(e, t, i) {
    const o = i.target.value?.trim() ?? "";
    this._setElementStyle(e, t, (a) => ({
      ...a,
      borderStyle: o || void 0
    }));
  }
  _handleNumberChange(e, t, i, r) {
    const a = r.target.value?.trim();
    if (!a) {
      this._setElementStyle(e, t, (n) => ({
        ...n,
        [i]: void 0
      }));
      return;
    }
    const l = Number(a);
    !Number.isFinite(l) || l < 0 || this._setElementStyle(e, t, (n) => ({
      ...n,
      [i]: Math.round(l)
    }));
  }
  _clearElement(e, t) {
    this._setElementStyle(e, t, () => ({}));
  }
  _clearSurface(e) {
    const t = { ...this._styles };
    delete t[e], this._styles = t;
  }
  _resetAllStyles() {
    this._styles = {}, this._previewAddedState = !1;
  }
  _handleCancel() {
    this.modalContext?.reject();
  }
  _handleSave() {
    const e = this._normalizeStyles(this._styles);
    this.value = {
      styles: e ?? void 0
    }, this.modalContext?.submit();
  }
  _normalizeStyles(e) {
    const t = {};
    for (const i of c) {
      const r = e[i.key];
      if (!r) continue;
      const o = {};
      for (const a of p) {
        const l = r[a.key];
        if (!l) continue;
        const n = {
          textColor: l.textColor?.trim() || void 0,
          backgroundColor: l.backgroundColor?.trim() || void 0,
          borderColor: l.borderColor?.trim() || void 0,
          borderStyle: l.borderStyle?.trim() || void 0,
          borderWidth: l.borderWidth,
          borderRadius: l.borderRadius
        };
        this._isElementStyleEmpty(n) || (o[a.key] = n);
      }
      this._isSurfaceStyleEmpty(o) || (t[i.key] = o);
    }
    return this._isDisplayStylesEmpty(t) ? void 0 : t;
  }
  _isElementStyleEmpty(e) {
    return !e.textColor && !e.backgroundColor && !e.borderColor && !e.borderStyle && e.borderWidth == null && e.borderRadius == null;
  }
  _isSurfaceStyleEmpty(e) {
    return p.every((t) => !e[t.key]);
  }
  _isDisplayStylesEmpty(e) {
    return c.every((t) => !e[t.key]);
  }
  _toInlineStyle(e) {
    if (!e) return "";
    const t = [];
    return e.textColor && t.push(`color: ${e.textColor}`), e.backgroundColor && t.push(`background-color: ${e.backgroundColor}`), e.borderColor && t.push(`border-color: ${e.borderColor}`), e.borderStyle && t.push(`border-style: ${e.borderStyle}`), e.borderWidth != null && t.push(`border-width: ${e.borderWidth}px`), e.borderRadius != null && t.push(`border-radius: ${e.borderRadius}px`), t.join("; ");
  }
  _renderColorPicker(e, t, i, r, o) {
    return s`
      <div class="field-row">
        <label>${r}</label>
        <uui-color-picker
          label=${r}
          .value=${o ?? ""}
          @change=${(a) => this._handleColorChange(e, t, i, a)}
        ></uui-color-picker>
      </div>
    `;
  }
  _renderElementEditor(e) {
    const t = this._activeSurface, i = this._getElementStyle(t, e.key);
    return s`
      <uui-box headline=${e.label}>
        <div class="element-editor">
          <div class="element-grid">
            ${this._renderColorPicker(t, e.key, "textColor", "Text color", i.textColor)}
            ${this._renderColorPicker(t, e.key, "backgroundColor", "Background", i.backgroundColor)}
            ${this._renderColorPicker(t, e.key, "borderColor", "Border color", i.borderColor)}
          </div>

          <div class="element-grid">
            <div class="field-row">
              <label>Border style</label>
              <uui-select
                label="Border style"
                .options=${w.map((r) => ({
      name: r.label,
      value: r.value,
      selected: (i.borderStyle ?? "") === r.value
    }))}
                @change=${(r) => this._handleBorderStyleChange(t, e.key, r)}
              ></uui-select>
            </div>

            <div class="field-row">
              <label>Border width (px)</label>
              <uui-input
                type="number"
                min="0"
                max="12"
                label="Border width"
                .value=${i.borderWidth != null ? String(i.borderWidth) : ""}
                @input=${(r) => this._handleNumberChange(t, e.key, "borderWidth", r)}
              ></uui-input>
            </div>

            <div class="field-row">
              <label>Border radius (px)</label>
              <uui-input
                type="number"
                min="0"
                max="64"
                label="Border radius"
                .value=${i.borderRadius != null ? String(i.borderRadius) : ""}
                @input=${(r) => this._handleNumberChange(t, e.key, "borderRadius", r)}
              ></uui-input>
            </div>
          </div>

          <div class="element-actions">
            <uui-button
              look="secondary"
              compact
              label=${`Clear ${e.label}`}
              @click=${() => this._clearElement(t, e.key)}
            >
              Clear ${e.label}
            </uui-button>
          </div>
        </div>
      </uui-box>
    `;
  }
  _renderPreviewHeading(e) {
    const t = this.data?.heading?.trim() || "Complete your order";
    return s`
      <h3
        class="preview-heading"
        style=${this._toInlineStyle(e.heading)}
      >${t}</h3>
    `;
  }
  _renderPreviewMessage(e) {
    const t = this.data?.message?.trim() || "Customers often add this item too.";
    return s`
      <p
        class="preview-message"
        style=${this._toInlineStyle(e.message)}
      >${t}</p>
    `;
  }
  _renderPreviewProductCard(e) {
    return s`
      <div class="preview-card" style=${this._toInlineStyle(e.productCard)}>
        <div class="preview-image"></div>
        <div class="preview-content">
          <div class="preview-product-name" style=${this._toInlineStyle(e.productName)}>Premium Pillow Set</div>
          <div class="preview-product-description" style=${this._toInlineStyle(e.productDescription)}>
            Soft support with hotel-grade comfort.
          </div>
          <div class="preview-price-row">
            <span class="preview-price" style=${this._toInlineStyle(e.productPrice)}>$29.99</span>
            <span class="preview-badge" style=${this._toInlineStyle(e.badge)}>Top seller</span>
          </div>

          <div class="preview-variant-wrap">
            <select class="preview-select" style=${this._toInlineStyle(e.variantSelector)}>
              <option>Standard</option>
              <option>King</option>
            </select>
          </div>

          <div class="preview-buttons">
            <button class="preview-primary" style=${this._toInlineStyle(e.button)}>
              ${this._previewAddedState ? "Added" : "Add to Order"}
            </button>
            <button class="preview-secondary" style=${this._toInlineStyle(e.secondaryButton)}>No Thanks</button>
          </div>

          <p class="preview-status" style=${this._toInlineStyle(e.statusText)}>
            ${this._previewAddedState ? "Added to basket" : "Ready to add"}
          </p>
        </div>
      </div>
    `;
  }
  _renderSurfacePreview() {
    const e = this._getSurfaceStyle(this._activeSurface);
    return s`
      <div class="preview-shell" style=${this._toInlineStyle(e.container)}>
        ${this._renderPreviewHeading(e)}
        ${this._renderPreviewMessage(e)}
        ${this._renderPreviewProductCard(e)}
      </div>
    `;
  }
  render() {
    const e = c.find((t) => t.key === this._activeSurface);
    return s`
      <umb-body-layout headline="Upsell Style Customization">
        <div id="main">
          <div class="surface-tabs">
            <uui-tab-group>
              ${c.map((t) => s`
                <uui-tab
                  label=${t.label}
                  ?active=${t.key === this._activeSurface}
                  @click=${() => {
      this._activeSurface = t.key;
    }}
                >${t.label}</uui-tab>
              `)}
            </uui-tab-group>
            <p class="surface-description">${e?.description}</p>
          </div>

          <div class="layout">
            <div class="controls-column">
              <div class="control-actions">
                <uui-button
                  look="secondary"
                  color="danger"
                  label="Clear active surface"
                  @click=${() => this._clearSurface(this._activeSurface)}
                >
                  Clear Surface
                </uui-button>
                <uui-button look="secondary" label="Reset all styles" @click=${this._resetAllStyles}>
                  Reset All
                </uui-button>
              </div>

              ${p.map((t) => this._renderElementEditor(t))}
            </div>

            <div class="preview-column">
              <uui-box headline="Live Preview">
                <div class="preview-wrapper">
                  ${this._renderSurfacePreview()}
                </div>
                <div class="preview-actions">
                  <uui-button
                    look="secondary"
                    compact
                    label=${this._previewAddedState ? "Show default state" : "Show added state"}
                    @click=${() => {
      this._previewAddedState = !this._previewAddedState;
    }}
                  >
                    ${this._previewAddedState ? "Show Default State" : "Show Added State"}
                  </uui-button>
                </div>
              </uui-box>
            </div>
          </div>
        </div>

        <uui-button slot="actions" look="secondary" label="Cancel" @click=${this._handleCancel}>Cancel</uui-button>
        <uui-button slot="actions" look="primary" color="positive" label="Apply styles" @click=${this._handleSave}>Apply Styles</uui-button>
      </umb-body-layout>
    `;
  }
};
d.styles = [
  y,
  h`
    :host {
      display: block;
      max-width: 100%;
    }

    #main {
      display: flex;
      flex-direction: column;
      gap: var(--uui-size-space-4);
      max-height: 82vh;
    }

    .surface-tabs {
      display: flex;
      flex-direction: column;
      gap: var(--uui-size-space-2);
    }

    .surface-description {
      margin: 0;
      font-size: var(--uui-type-small-size);
      color: var(--uui-color-text-alt);
    }

    .layout {
      display: grid;
      grid-template-columns: 1.35fr 1fr;
      gap: var(--uui-size-space-4);
      min-height: 0;
      overflow: hidden;
    }

    .controls-column {
      display: flex;
      flex-direction: column;
      gap: var(--uui-size-space-4);
      overflow: auto;
      padding-right: var(--uui-size-space-2);
    }

    .preview-column {
      position: sticky;
      top: 0;
      align-self: start;
    }

    .control-actions {
      display: flex;
      justify-content: flex-end;
      gap: var(--uui-size-space-2);
    }

    .element-editor {
      display: flex;
      flex-direction: column;
      gap: var(--uui-size-space-3);
    }

    .element-grid {
      display: grid;
      grid-template-columns: repeat(3, minmax(0, 1fr));
      gap: var(--uui-size-space-3);
    }

    .field-row {
      display: flex;
      flex-direction: column;
      gap: var(--uui-size-space-1);
    }

    .field-row label {
      font-size: var(--uui-type-small-size);
      color: var(--uui-color-text-alt);
    }

    .element-actions {
      display: flex;
      justify-content: flex-end;
    }

    .preview-wrapper {
      background: linear-gradient(145deg, #f5f7fa, #eef2f8);
      border-radius: 12px;
      padding: var(--uui-size-space-4);
    }

    .preview-shell {
      border: 1px solid #d5dbe3;
      border-radius: 10px;
      background: white;
      padding: var(--uui-size-space-4);
      box-shadow: 0 10px 30px rgba(31, 42, 55, 0.08);
      display: flex;
      flex-direction: column;
      gap: var(--uui-size-space-3);
    }

    .preview-heading {
      margin: 0;
      font-size: 1.1rem;
    }

    .preview-message {
      margin: 0;
      font-size: 0.9rem;
      color: #556070;
    }

    .preview-card {
      border: 1px solid #d9dde3;
      border-radius: 10px;
      padding: var(--uui-size-space-3);
      display: grid;
      grid-template-columns: 84px 1fr;
      gap: var(--uui-size-space-3);
      background: #ffffff;
    }

    .preview-image {
      width: 84px;
      height: 84px;
      border-radius: 8px;
      background: linear-gradient(45deg, #dbe6f8, #f3f7ff);
      border: 1px solid #d4deef;
    }

    .preview-content {
      display: flex;
      flex-direction: column;
      gap: var(--uui-size-space-2);
    }

    .preview-product-name {
      font-weight: 600;
      color: #1d2733;
    }

    .preview-product-description {
      font-size: 0.82rem;
      color: #647487;
    }

    .preview-price-row {
      display: flex;
      align-items: center;
      gap: var(--uui-size-space-2);
    }

    .preview-price {
      font-weight: 700;
      color: #121923;
    }

    .preview-badge {
      font-size: 0.72rem;
      padding: 2px 8px;
      border-radius: 999px;
      background: #f0f4fa;
      color: #4d5f77;
      border: 1px solid #dae3ef;
    }

    .preview-variant-wrap {
      max-width: 180px;
    }

    .preview-select {
      width: 100%;
      border: 1px solid #cfd7e3;
      border-radius: 8px;
      padding: 6px 8px;
      font-size: 0.82rem;
    }

    .preview-buttons {
      display: flex;
      gap: var(--uui-size-space-2);
    }

    .preview-primary,
    .preview-secondary {
      border: 1px solid #cfd7e3;
      border-radius: 8px;
      padding: 6px 10px;
      font-size: 0.82rem;
      cursor: default;
    }

    .preview-primary {
      background: #111827;
      color: white;
      border-color: #111827;
    }

    .preview-secondary {
      background: white;
      color: #3d4b60;
    }

    .preview-status {
      margin: 0;
      font-size: 0.75rem;
      color: #5f7088;
    }

    .preview-actions {
      margin-top: var(--uui-size-space-3);
      display: flex;
      justify-content: flex-end;
    }

    @media (max-width: 1200px) {
      .layout {
        grid-template-columns: 1fr;
      }

      .preview-column {
        position: static;
      }
    }

    @media (max-width: 768px) {
      #main {
        max-height: 78vh;
      }

      .control-actions {
        justify-content: flex-start;
        flex-wrap: wrap;
      }

      .element-grid {
        grid-template-columns: 1fr;
      }

      .preview-buttons {
        flex-wrap: wrap;
      }

      .preview-card {
        grid-template-columns: 1fr;
      }

      .preview-image {
        width: 100%;
        max-width: 120px;
      }
    }
  `
];
u([
  v()
], d.prototype, "_styles", 2);
u([
  v()
], d.prototype, "_activeSurface", 2);
u([
  v()
], d.prototype, "_previewAddedState", 2);
d = u([
  b("merchello-upsell-style-modal")
], d);
const k = d;
export {
  d as MerchelloUpsellStyleModalElement,
  k as default
};
//# sourceMappingURL=upsell-style-modal.element-CfVJKB6J.js.map
