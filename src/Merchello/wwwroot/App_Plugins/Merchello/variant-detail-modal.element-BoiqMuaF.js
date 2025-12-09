import { html as t, nothing as m, css as f, state as n, customElement as g } from "@umbraco-cms/backoffice/external/lit";
import { UmbModalBaseElement as _ } from "@umbraco-cms/backoffice/modal";
import { UMB_NOTIFICATION_CONTEXT as b } from "@umbraco-cms/backoffice/notification";
import { M as D } from "./merchello-api-C2InYbkz.js";
import { b as S } from "./badge.styles-C_lNgH9O.js";
var $ = Object.defineProperty, k = Object.getOwnPropertyDescriptor, p = (e) => {
  throw TypeError(e);
}, u = (e, a, i, s) => {
  for (var r = s > 1 ? void 0 : s ? k(a, i) : a, c = e.length - 1, d; c >= 0; c--)
    (d = e[c]) && (r = (s ? d(a, i, r) : d(r)) || r);
  return s && r && $(a, i, r), r;
}, v = (e, a, i) => a.has(e) || p("Cannot " + i), h = (e, a, i) => (v(e, a, "read from private field"), i ? i.call(e) : a.get(e)), y = (e, a, i) => a.has(e) ? p("Cannot add the same private member more than once") : a instanceof WeakSet ? a.add(e) : a.set(e, i), x = (e, a, i, s) => (v(e, a, "write to private field"), a.set(e, i), i), l;
let o = class extends _ {
  constructor() {
    super(), this._formData = {}, this._isSaving = !1, this._errorMessage = null, this._activeSection = "basic", y(this, l), this.consumeContext(b, (e) => {
      x(this, l, e);
    });
  }
  connectedCallback() {
    super.connectedCallback(), this.data?.variant && (this._formData = { ...this.data.variant });
  }
  async _handleSave() {
    if (this.data) {
      this._isSaving = !0, this._errorMessage = null;
      try {
        const e = {
          name: this._formData.name ?? void 0,
          sku: this._formData.sku ?? void 0,
          gtin: this._formData.gtin ?? void 0,
          supplierSku: this._formData.supplierSku ?? void 0,
          price: this._formData.price,
          costOfGoods: this._formData.costOfGoods,
          onSale: this._formData.onSale,
          previousPrice: this._formData.previousPrice ?? void 0,
          availableForPurchase: this._formData.availableForPurchase,
          canPurchase: this._formData.canPurchase,
          images: this._formData.images,
          description: this._formData.description ?? void 0,
          excludeRootProductImages: this._formData.excludeRootProductImages,
          url: this._formData.url ?? void 0,
          weight: this._formData.weight ?? void 0,
          lengthCm: this._formData.lengthCm ?? void 0,
          widthCm: this._formData.widthCm ?? void 0,
          heightCm: this._formData.heightCm ?? void 0,
          metaDescription: this._formData.metaDescription ?? void 0,
          pageTitle: this._formData.pageTitle ?? void 0,
          noIndex: this._formData.noIndex,
          openGraphImage: this._formData.openGraphImage ?? void 0,
          shoppingFeedTitle: this._formData.shoppingFeedTitle ?? void 0,
          shoppingFeedDescription: this._formData.shoppingFeedDescription ?? void 0,
          shoppingFeedColour: this._formData.shoppingFeedColour ?? void 0,
          shoppingFeedMaterial: this._formData.shoppingFeedMaterial ?? void 0,
          shoppingFeedSize: this._formData.shoppingFeedSize ?? void 0,
          excludeFromCustomLabels: this._formData.excludeFromCustomLabels,
          removeFromFeed: this._formData.removeFromFeed
        }, { data: a, error: i } = await D.updateVariant(
          this.data.productRootId,
          this.data.variant.id,
          e
        );
        if (i) {
          this._errorMessage = i.message, h(this, l)?.peek("danger", { data: { headline: "Failed to save variant", message: i.message } });
          return;
        }
        h(this, l)?.peek("positive", { data: { headline: "Variant saved", message: "Changes have been saved successfully" } }), this.value = { saved: !0, variant: a }, this.modalContext?.submit();
      } catch (e) {
        this._errorMessage = e instanceof Error ? e.message : "An unexpected error occurred", h(this, l)?.peek("danger", { data: { headline: "Error", message: this._errorMessage } }), console.error("Variant save failed:", e);
      } finally {
        this._isSaving = !1;
      }
    }
  }
  _renderSectionNav() {
    return t`
      <div class="section-nav">
        <uui-button
          look=${this._activeSection === "basic" ? "primary" : "secondary"}
          compact
          @click=${() => this._activeSection = "basic"}
          label="Basic Info">
          <uui-icon name="icon-info"></uui-icon>
          Basic Info
        </uui-button>
        <uui-button
          look=${this._activeSection === "dimensions" ? "primary" : "secondary"}
          compact
          @click=${() => this._activeSection = "dimensions"}
          label="Dimensions">
          <uui-icon name="icon-ruler"></uui-icon>
          Dimensions
        </uui-button>
        <uui-button
          look=${this._activeSection === "seo" ? "primary" : "secondary"}
          compact
          @click=${() => this._activeSection = "seo"}
          label="SEO">
          <uui-icon name="icon-globe"></uui-icon>
          SEO
        </uui-button>
        <uui-button
          look=${this._activeSection === "feed" ? "primary" : "secondary"}
          compact
          @click=${() => this._activeSection = "feed"}
          label="Shopping Feed">
          <uui-icon name="icon-tags"></uui-icon>
          Shopping Feed
        </uui-button>
        <uui-button
          look=${this._activeSection === "stock" ? "primary" : "secondary"}
          compact
          @click=${() => this._activeSection = "stock"}
          label="Stock">
          <uui-icon name="icon-box"></uui-icon>
          Stock
        </uui-button>
      </div>
    `;
  }
  _renderActiveSection() {
    switch (this._activeSection) {
      case "basic":
        return this._renderBasicSection();
      case "dimensions":
        return this._renderDimensionsSection();
      case "seo":
        return this._renderSeoSection();
      case "feed":
        return this._renderFeedSection();
      case "stock":
        return this._renderStockSection();
    }
  }
  _renderBasicSection() {
    return t`
      <div class="section-content">
        <div class="form-grid">
          <div class="form-field">
            <label>Variant Name</label>
            <uui-input
              .value=${this._formData.name || ""}
              @input=${(e) => this._formData = { ...this._formData, name: e.target.value }}
              placeholder="e.g., Blue T-Shirt - Large">
            </uui-input>
            <small class="hint">If empty, generated from option values</small>
          </div>

          <div class="form-field">
            <label>SKU <span class="required">*</span></label>
            <uui-input
              .value=${this._formData.sku || ""}
              @input=${(e) => this._formData = { ...this._formData, sku: e.target.value }}
              placeholder="PROD-001">
            </uui-input>
            <small class="hint">Stock Keeping Unit - unique product identifier</small>
          </div>

          <div class="form-field">
            <label>GTIN/Barcode</label>
            <uui-input
              .value=${this._formData.gtin || ""}
              @input=${(e) => this._formData = { ...this._formData, gtin: e.target.value }}
              placeholder="012345678905">
            </uui-input>
            <small class="hint">Global Trade Item Number (EAN/UPC)</small>
          </div>

          <div class="form-field">
            <label>Supplier SKU</label>
            <uui-input
              .value=${this._formData.supplierSku || ""}
              @input=${(e) => this._formData = { ...this._formData, supplierSku: e.target.value }}
              placeholder="SUP-001">
            </uui-input>
            <small class="hint">Your supplier's product code</small>
          </div>

          <div class="form-field">
            <label>Price <span class="required">*</span></label>
            <uui-input
              type="number"
              step="0.01"
              .value=${String(this._formData.price ?? 0)}
              @input=${(e) => this._formData = { ...this._formData, price: parseFloat(e.target.value) || 0 }}>
            </uui-input>
            <small class="hint">Customer-facing price (excluding tax)</small>
          </div>

          <div class="form-field">
            <label>Cost of Goods</label>
            <uui-input
              type="number"
              step="0.01"
              .value=${String(this._formData.costOfGoods ?? 0)}
              @input=${(e) => this._formData = { ...this._formData, costOfGoods: parseFloat(e.target.value) || 0 }}>
            </uui-input>
            <small class="hint">Your cost for profit margin calculation</small>
          </div>

          <div class="form-field toggle-field">
            <uui-toggle
              .checked=${this._formData.onSale ?? !1}
              @change=${(e) => this._formData = { ...this._formData, onSale: e.target.checked }}>
            </uui-toggle>
            <label>On Sale</label>
          </div>

          ${this._formData.onSale ? t`
                <div class="form-field">
                  <label>Previous Price (Was)</label>
                  <uui-input
                    type="number"
                    step="0.01"
                    .value=${String(this._formData.previousPrice ?? 0)}
                    @input=${(e) => this._formData = { ...this._formData, previousPrice: parseFloat(e.target.value) || 0 }}>
                  </uui-input>
                  <small class="hint">Original price to show discount</small>
                </div>
              ` : m}
        </div>

        <div class="availability-section">
          <h4>Availability Settings</h4>
          <div class="form-grid">
            <div class="form-field toggle-field">
              <uui-toggle
                .checked=${this._formData.availableForPurchase ?? !0}
                @change=${(e) => this._formData = { ...this._formData, availableForPurchase: e.target.checked }}>
              </uui-toggle>
              <div>
                <label>Available for Purchase</label>
                <small class="hint">Show on website, allow add to cart</small>
              </div>
            </div>

            <div class="form-field toggle-field">
              <uui-toggle
                .checked=${this._formData.canPurchase ?? !0}
                @change=${(e) => this._formData = { ...this._formData, canPurchase: e.target.checked }}>
              </uui-toggle>
              <div>
                <label>Can Purchase</label>
                <small class="hint">Allow checkout (stock/inventory check)</small>
              </div>
            </div>
          </div>
        </div>

        <div class="form-field full-width">
          <label>Description</label>
          <uui-textarea
            .value=${this._formData.description || ""}
            @input=${(e) => this._formData = { ...this._formData, description: e.target.value }}
            placeholder="Describe this variant...">
          </uui-textarea>
          <small class="hint">Variant-specific description (overrides product description)</small>
        </div>
      </div>
    `;
  }
  _renderDimensionsSection() {
    return t`
      <div class="section-content">
        <div class="info-banner">
          <uui-icon name="icon-info"></uui-icon>
          <div>
            <p class="section-hint"><strong>Important:</strong> These dimensions are used for shipping rate calculations with carriers like FedEx, UPS, and DHL.</p>
          </div>
        </div>
        <div class="form-grid">
          <div class="form-field">
            <label>Weight (kg)</label>
            <uui-input
              type="number"
              step="0.01"
              .value=${String(this._formData.weight ?? "")}
              @input=${(e) => this._formData = { ...this._formData, weight: parseFloat(e.target.value) || void 0 }}
              placeholder="0.50">
            </uui-input>
            <small class="hint">Package weight in kilograms</small>
          </div>

          <div class="form-field">
            <label>Length (cm)</label>
            <uui-input
              type="number"
              step="0.1"
              .value=${String(this._formData.lengthCm ?? "")}
              @input=${(e) => this._formData = { ...this._formData, lengthCm: parseFloat(e.target.value) || void 0 }}
              placeholder="20">
            </uui-input>
            <small class="hint">Longest side</small>
          </div>

          <div class="form-field">
            <label>Width (cm)</label>
            <uui-input
              type="number"
              step="0.1"
              .value=${String(this._formData.widthCm ?? "")}
              @input=${(e) => this._formData = { ...this._formData, widthCm: parseFloat(e.target.value) || void 0 }}
              placeholder="15">
            </uui-input>
            <small class="hint">Middle side</small>
          </div>

          <div class="form-field">
            <label>Height (cm)</label>
            <uui-input
              type="number"
              step="0.1"
              .value=${String(this._formData.heightCm ?? "")}
              @input=${(e) => this._formData = { ...this._formData, heightCm: parseFloat(e.target.value) || void 0 }}
              placeholder="10">
            </uui-input>
            <small class="hint">Shortest side</small>
          </div>
        </div>
      </div>
    `;
  }
  _renderSeoSection() {
    return t`
      <div class="section-content">
        <div class="form-grid">
          <div class="form-field full-width">
            <label>Page Title</label>
            <uui-input
              .value=${this._formData.pageTitle || ""}
              @input=${(e) => this._formData = { ...this._formData, pageTitle: e.target.value }}>
            </uui-input>
          </div>

          <div class="form-field full-width">
            <label>Meta Description</label>
            <uui-textarea
              .value=${this._formData.metaDescription || ""}
              @input=${(e) => this._formData = { ...this._formData, metaDescription: e.target.value }}>
            </uui-textarea>
          </div>

          <div class="form-field full-width">
            <label>URL Slug</label>
            <uui-input
              .value=${this._formData.url || ""}
              @input=${(e) => this._formData = { ...this._formData, url: e.target.value }}>
            </uui-input>
          </div>

          <div class="form-field toggle-field">
            <uui-toggle
              .checked=${this._formData.noIndex ?? !1}
              @change=${(e) => this._formData = { ...this._formData, noIndex: e.target.checked }}>
            </uui-toggle>
            <label>No Index (hide from search engines)</label>
          </div>
        </div>
      </div>
    `;
  }
  _renderFeedSection() {
    return t`
      <div class="section-content">
        <p class="section-hint">Override shopping feed values for this variant.</p>

        <div class="form-field toggle-field">
          <uui-toggle
            .checked=${this._formData.removeFromFeed ?? !1}
            @change=${(e) => this._formData = { ...this._formData, removeFromFeed: e.target.checked }}>
          </uui-toggle>
          <label>Remove from shopping feed</label>
        </div>

        ${this._formData.removeFromFeed ? m : t`
              <div class="form-grid">
                <div class="form-field full-width">
                  <label>Feed Title</label>
                  <uui-input
                    .value=${this._formData.shoppingFeedTitle || ""}
                    @input=${(e) => this._formData = { ...this._formData, shoppingFeedTitle: e.target.value }}>
                  </uui-input>
                </div>

                <div class="form-field full-width">
                  <label>Feed Description</label>
                  <uui-textarea
                    .value=${this._formData.shoppingFeedDescription || ""}
                    @input=${(e) => this._formData = { ...this._formData, shoppingFeedDescription: e.target.value }}>
                  </uui-textarea>
                </div>

                <div class="form-field">
                  <label>Colour</label>
                  <uui-input
                    .value=${this._formData.shoppingFeedColour || ""}
                    @input=${(e) => this._formData = { ...this._formData, shoppingFeedColour: e.target.value }}>
                  </uui-input>
                </div>

                <div class="form-field">
                  <label>Material</label>
                  <uui-input
                    .value=${this._formData.shoppingFeedMaterial || ""}
                    @input=${(e) => this._formData = { ...this._formData, shoppingFeedMaterial: e.target.value }}>
                  </uui-input>
                </div>

                <div class="form-field">
                  <label>Size</label>
                  <uui-input
                    .value=${this._formData.shoppingFeedSize || ""}
                    @input=${(e) => this._formData = { ...this._formData, shoppingFeedSize: e.target.value }}>
                  </uui-input>
                </div>

                <div class="form-field toggle-field">
                  <uui-toggle
                    .checked=${this._formData.excludeFromCustomLabels ?? !1}
                    @change=${(e) => this._formData = { ...this._formData, excludeFromCustomLabels: e.target.checked }}>
                  </uui-toggle>
                  <label>Exclude from custom labels</label>
                </div>
              </div>
            `}
      </div>
    `;
  }
  _renderStockSection() {
    const e = this._formData.warehouseStock ?? [], a = e.reduce((i, s) => i + s.stock, 0);
    return t`
      <div class="section-content">
        <div class="info-banner">
          <uui-icon name="icon-info"></uui-icon>
          <div>
            <p class="section-hint"><strong>Stock Management:</strong> Stock levels are managed per warehouse. To adjust stock, create a shipment from the Orders section or use the Inventory management tools.</p>
          </div>
        </div>

        ${e.length > 0 ? t`
              <div class="stock-summary">
                <strong>Total Stock:</strong> ${a} units
              </div>
              <div class="table-container">
                <uui-table>
                  <uui-table-head>
                    <uui-table-head-cell>Warehouse</uui-table-head-cell>
                    <uui-table-head-cell>Available</uui-table-head-cell>
                    <uui-table-head-cell>Reorder Point</uui-table-head-cell>
                    <uui-table-head-cell>Track Stock</uui-table-head-cell>
                  </uui-table-head>
                  ${e.map(
      (i) => t`
                      <uui-table-row>
                        <uui-table-cell><strong>${i.warehouseName}</strong></uui-table-cell>
                        <uui-table-cell>
                          <span class="badge ${i.stock === 0 ? "badge-danger" : i.stock < 10 ? "badge-warning" : "badge-positive"}">
                            ${i.stock} units
                          </span>
                        </uui-table-cell>
                        <uui-table-cell>
                          <span class="stock-value">${i.reorderPoint ?? "Not set"}</span>
                        </uui-table-cell>
                        <uui-table-cell>
                          <uui-badge color=${i.trackStock ? "positive" : "default"}>
                            ${i.trackStock ? "Enabled" : "Disabled"}
                          </uui-badge>
                        </uui-table-cell>
                      </uui-table-row>
                    `
    )}
                </uui-table>
              </div>
            ` : t`
              <div class="empty-state">
                <uui-icon name="icon-box"></uui-icon>
                <p>No warehouses assigned to this product</p>
                <p class="hint">Assign warehouses in the product details tab</p>
              </div>
            `}
      </div>
    `;
  }
  render() {
    return t`
      <umb-body-layout headline="Edit Variant: ${this._formData.name || "Unnamed"}">
        <div class="modal-content">
          ${this._renderSectionNav()}

          ${this._errorMessage ? t`
                <div class="error-banner">
                  <uui-icon name="icon-alert"></uui-icon>
                  ${this._errorMessage}
                </div>
              ` : m}

          ${this._renderActiveSection()}
        </div>

        <div slot="actions">
          <uui-button look="secondary" @click=${() => this.modalContext?.reject()}> Cancel </uui-button>
          <uui-button look="primary" color="positive" ?disabled=${this._isSaving} @click=${this._handleSave}>
            ${this._isSaving ? "Saving..." : "Save"}
          </uui-button>
        </div>
      </umb-body-layout>
    `;
  }
};
l = /* @__PURE__ */ new WeakMap();
o.styles = [
  S,
  f`
      :host {
        display: block;
      }

      .modal-content {
        padding: var(--uui-size-layout-1);
        display: flex;
        flex-direction: column;
        gap: var(--uui-size-space-4);
      }

      .section-nav {
        display: flex;
        gap: var(--uui-size-space-2);
        flex-wrap: wrap;
      }

      .section-nav uui-button {
        display: flex;
        align-items: center;
        gap: var(--uui-size-space-2);
      }

      .section-content {
        display: flex;
        flex-direction: column;
        gap: var(--uui-size-space-4);
      }

      .section-hint {
        font-size: 0.875rem;
        color: var(--uui-color-text-alt);
        margin: 0;
      }

      .hint {
        font-size: 0.875rem;
        color: var(--uui-color-text-alt);
        display: block;
        margin-top: -var(--uui-size-space-1);
      }

      .required {
        color: var(--uui-color-danger);
      }

      .info-banner {
        display: flex;
        gap: var(--uui-size-space-3);
        padding: var(--uui-size-space-3);
        background: var(--uui-color-surface);
        border-left: 3px solid var(--uui-color-selected);
        border-radius: var(--uui-border-radius);
      }

      .info-banner uui-icon {
        font-size: 24px;
        color: var(--uui-color-selected);
        flex-shrink: 0;
      }

      .availability-section {
        border-top: 1px solid var(--uui-color-border);
        padding-top: var(--uui-size-space-3);
      }

      .availability-section h4 {
        margin: 0 0 var(--uui-size-space-3) 0;
        font-size: 1rem;
      }

      .form-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
        gap: var(--uui-size-space-3);
      }

      .form-field {
        display: flex;
        flex-direction: column;
        gap: var(--uui-size-space-2);
      }

      .form-field.full-width {
        grid-column: 1 / -1;
      }

      .form-field label {
        font-weight: 600;
        color: var(--uui-color-text);
        font-size: 0.875rem;
      }

      .toggle-field {
        flex-direction: row;
        align-items: flex-start;
        gap: var(--uui-size-space-2);
      }

      .toggle-field > div {
        display: flex;
        flex-direction: column;
        gap: var(--uui-size-space-1);
      }

      .error-banner {
        display: flex;
        align-items: center;
        gap: var(--uui-size-space-2);
        padding: var(--uui-size-space-3);
        background: var(--uui-color-danger-surface);
        color: var(--uui-color-danger);
        border-radius: var(--uui-border-radius);
        border-left: 3px solid var(--uui-color-danger);
      }

      .table-container {
        overflow-x: auto;
      }

      .stock-summary {
        padding: var(--uui-size-space-3);
        background: var(--uui-color-surface);
        border-radius: var(--uui-border-radius);
        margin-bottom: var(--uui-size-space-3);
      }

      .stock-value {
        font-weight: 500;
      }

      .empty-state {
        text-align: center;
        padding: var(--uui-size-space-6);
        color: var(--uui-color-text-alt);
      }

      .empty-state uui-icon {
        font-size: 48px;
        opacity: 0.5;
        margin-bottom: var(--uui-size-space-3);
      }

      .empty-state p {
        margin: var(--uui-size-space-2) 0;
      }
    `
];
u([
  n()
], o.prototype, "_formData", 2);
u([
  n()
], o.prototype, "_isSaving", 2);
u([
  n()
], o.prototype, "_errorMessage", 2);
u([
  n()
], o.prototype, "_activeSection", 2);
o = u([
  g("merchello-variant-detail-modal")
], o);
const M = o;
export {
  o as MerchelloVariantDetailModalElement,
  M as default
};
//# sourceMappingURL=variant-detail-modal.element-BoiqMuaF.js.map
