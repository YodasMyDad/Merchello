import { html, css, nothing } from "@umbraco-cms/backoffice/external/lit";
import { customElement, state } from "@umbraco-cms/backoffice/external/lit";
import { UmbModalBaseElement } from "@umbraco-cms/backoffice/modal";
import { UMB_NOTIFICATION_CONTEXT } from "@umbraco-cms/backoffice/notification";
import type { UmbNotificationContext } from "@umbraco-cms/backoffice/notification";
import type { VariantDetailModalData, VariantDetailModalValue } from "./variant-detail-modal.token.js";
import type { ProductVariantDto, UpdateVariantRequest } from "@products/types/product.types.js";
import { MerchelloApi } from "@api/merchello-api.js";
import { badgeStyles } from "@shared/styles/badge.styles.js";

type SectionId = "basic" | "dimensions" | "seo" | "feed" | "stock";

@customElement("merchello-variant-detail-modal")
export class MerchelloVariantDetailModalElement extends UmbModalBaseElement<
  VariantDetailModalData,
  VariantDetailModalValue
> {
  @state() private _formData: Partial<ProductVariantDto> = {};
  @state() private _isSaving = false;
  @state() private _errorMessage: string | null = null;
  @state() private _activeSection: SectionId = "basic";

  #notificationContext?: UmbNotificationContext;

  constructor() {
    super();
    this.consumeContext(UMB_NOTIFICATION_CONTEXT, (context) => {
      this.#notificationContext = context;
    });
  }

  connectedCallback(): void {
    super.connectedCallback();
    if (this.data?.variant) {
      this._formData = { ...this.data.variant };
    }
  }

  private async _handleSave(): Promise<void> {
    if (!this.data) return;

    this._isSaving = true;
    this._errorMessage = null;

    try {
      const request: UpdateVariantRequest = {
        name: this._formData.name ?? undefined,
        sku: this._formData.sku ?? undefined,
        gtin: this._formData.gtin ?? undefined,
        supplierSku: this._formData.supplierSku ?? undefined,
        price: this._formData.price,
        costOfGoods: this._formData.costOfGoods,
        onSale: this._formData.onSale,
        previousPrice: this._formData.previousPrice ?? undefined,
        availableForPurchase: this._formData.availableForPurchase,
        canPurchase: this._formData.canPurchase,
        images: this._formData.images,
        description: this._formData.description ?? undefined,
        excludeRootProductImages: this._formData.excludeRootProductImages,
        url: this._formData.url ?? undefined,
        weight: this._formData.weight ?? undefined,
        lengthCm: this._formData.lengthCm ?? undefined,
        widthCm: this._formData.widthCm ?? undefined,
        heightCm: this._formData.heightCm ?? undefined,
        metaDescription: this._formData.metaDescription ?? undefined,
        pageTitle: this._formData.pageTitle ?? undefined,
        noIndex: this._formData.noIndex,
        openGraphImage: this._formData.openGraphImage ?? undefined,
        shoppingFeedTitle: this._formData.shoppingFeedTitle ?? undefined,
        shoppingFeedDescription: this._formData.shoppingFeedDescription ?? undefined,
        shoppingFeedColour: this._formData.shoppingFeedColour ?? undefined,
        shoppingFeedMaterial: this._formData.shoppingFeedMaterial ?? undefined,
        shoppingFeedSize: this._formData.shoppingFeedSize ?? undefined,
        excludeFromCustomLabels: this._formData.excludeFromCustomLabels,
        removeFromFeed: this._formData.removeFromFeed,
      };

      const { data, error } = await MerchelloApi.updateVariant(
        this.data.productRootId,
        this.data.variant.id,
        request
      );

      if (error) {
        this._errorMessage = error.message;
        this.#notificationContext?.peek("danger", { data: { headline: "Failed to save variant", message: error.message } });
        return;
      }

      this.#notificationContext?.peek("positive", { data: { headline: "Variant saved", message: "Changes have been saved successfully" } });
      this.value = { saved: true, variant: data };
      this.modalContext?.submit();
    } catch (error) {
      this._errorMessage = error instanceof Error ? error.message : "An unexpected error occurred";
      this.#notificationContext?.peek("danger", { data: { headline: "Error", message: this._errorMessage } });
      console.error("Variant save failed:", error);
    } finally {
      this._isSaving = false;
    }
  }

  private _renderSectionNav(): unknown {
    return html`
      <div class="section-nav">
        <uui-button
          look=${this._activeSection === "basic" ? "primary" : "secondary"}
          compact
          @click=${() => (this._activeSection = "basic")}
          label="Basic Info">
          <uui-icon name="icon-info"></uui-icon>
          Basic Info
        </uui-button>
        <uui-button
          look=${this._activeSection === "dimensions" ? "primary" : "secondary"}
          compact
          @click=${() => (this._activeSection = "dimensions")}
          label="Dimensions">
          <uui-icon name="icon-ruler"></uui-icon>
          Dimensions
        </uui-button>
        <uui-button
          look=${this._activeSection === "seo" ? "primary" : "secondary"}
          compact
          @click=${() => (this._activeSection = "seo")}
          label="SEO">
          <uui-icon name="icon-globe"></uui-icon>
          SEO
        </uui-button>
        <uui-button
          look=${this._activeSection === "feed" ? "primary" : "secondary"}
          compact
          @click=${() => (this._activeSection = "feed")}
          label="Shopping Feed">
          <uui-icon name="icon-tags"></uui-icon>
          Shopping Feed
        </uui-button>
        <uui-button
          look=${this._activeSection === "stock" ? "primary" : "secondary"}
          compact
          @click=${() => (this._activeSection = "stock")}
          label="Stock">
          <uui-icon name="icon-box"></uui-icon>
          Stock
        </uui-button>
      </div>
    `;
  }

  private _renderActiveSection(): unknown {
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

  private _renderBasicSection(): unknown {
    return html`
      <div class="section-content">
        <div class="form-grid">
          <div class="form-field">
            <label>Variant Name</label>
            <uui-input
              .value=${this._formData.name || ""}
              @input=${(e: Event) => (this._formData = { ...this._formData, name: (e.target as HTMLInputElement).value })}
              placeholder="e.g., Blue T-Shirt - Large">
            </uui-input>
            <small class="hint">If empty, generated from option values</small>
          </div>

          <div class="form-field">
            <label>SKU <span class="required">*</span></label>
            <uui-input
              .value=${this._formData.sku || ""}
              @input=${(e: Event) => (this._formData = { ...this._formData, sku: (e.target as HTMLInputElement).value })}
              placeholder="PROD-001">
            </uui-input>
            <small class="hint">Stock Keeping Unit - unique product identifier</small>
          </div>

          <div class="form-field">
            <label>GTIN/Barcode</label>
            <uui-input
              .value=${this._formData.gtin || ""}
              @input=${(e: Event) => (this._formData = { ...this._formData, gtin: (e.target as HTMLInputElement).value })}
              placeholder="012345678905">
            </uui-input>
            <small class="hint">Global Trade Item Number (EAN/UPC)</small>
          </div>

          <div class="form-field">
            <label>Supplier SKU</label>
            <uui-input
              .value=${this._formData.supplierSku || ""}
              @input=${(e: Event) => (this._formData = { ...this._formData, supplierSku: (e.target as HTMLInputElement).value })}
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
              @input=${(e: Event) => (this._formData = { ...this._formData, price: parseFloat((e.target as HTMLInputElement).value) || 0 })}>
            </uui-input>
            <small class="hint">Customer-facing price (excluding tax)</small>
          </div>

          <div class="form-field">
            <label>Cost of Goods</label>
            <uui-input
              type="number"
              step="0.01"
              .value=${String(this._formData.costOfGoods ?? 0)}
              @input=${(e: Event) => (this._formData = { ...this._formData, costOfGoods: parseFloat((e.target as HTMLInputElement).value) || 0 })}>
            </uui-input>
            <small class="hint">Your cost for profit margin calculation</small>
          </div>

          <div class="form-field toggle-field">
            <uui-toggle
              .checked=${this._formData.onSale ?? false}
              @change=${(e: Event) => (this._formData = { ...this._formData, onSale: (e.target as any).checked })}>
            </uui-toggle>
            <label>On Sale</label>
          </div>

          ${this._formData.onSale
            ? html`
                <div class="form-field">
                  <label>Previous Price (Was)</label>
                  <uui-input
                    type="number"
                    step="0.01"
                    .value=${String(this._formData.previousPrice ?? 0)}
                    @input=${(e: Event) => (this._formData = { ...this._formData, previousPrice: parseFloat((e.target as HTMLInputElement).value) || 0 })}>
                  </uui-input>
                  <small class="hint">Original price to show discount</small>
                </div>
              `
            : nothing}
        </div>

        <div class="availability-section">
          <h4>Availability Settings</h4>
          <div class="form-grid">
            <div class="form-field toggle-field">
              <uui-toggle
                .checked=${this._formData.availableForPurchase ?? true}
                @change=${(e: Event) => (this._formData = { ...this._formData, availableForPurchase: (e.target as any).checked })}>
              </uui-toggle>
              <div>
                <label>Available for Purchase</label>
                <small class="hint">Show on website, allow add to cart</small>
              </div>
            </div>

            <div class="form-field toggle-field">
              <uui-toggle
                .checked=${this._formData.canPurchase ?? true}
                @change=${(e: Event) => (this._formData = { ...this._formData, canPurchase: (e.target as any).checked })}>
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
            @input=${(e: Event) => (this._formData = { ...this._formData, description: (e.target as HTMLTextAreaElement).value })}
            placeholder="Describe this variant...">
          </uui-textarea>
          <small class="hint">Variant-specific description (overrides product description)</small>
        </div>
      </div>
    `;
  }

  private _renderDimensionsSection(): unknown {
    return html`
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
              @input=${(e: Event) => (this._formData = { ...this._formData, weight: parseFloat((e.target as HTMLInputElement).value) || undefined })}
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
              @input=${(e: Event) => (this._formData = { ...this._formData, lengthCm: parseFloat((e.target as HTMLInputElement).value) || undefined })}
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
              @input=${(e: Event) => (this._formData = { ...this._formData, widthCm: parseFloat((e.target as HTMLInputElement).value) || undefined })}
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
              @input=${(e: Event) => (this._formData = { ...this._formData, heightCm: parseFloat((e.target as HTMLInputElement).value) || undefined })}
              placeholder="10">
            </uui-input>
            <small class="hint">Shortest side</small>
          </div>
        </div>
      </div>
    `;
  }

  private _renderSeoSection(): unknown {
    return html`
      <div class="section-content">
        <div class="form-grid">
          <div class="form-field full-width">
            <label>Page Title</label>
            <uui-input
              .value=${this._formData.pageTitle || ""}
              @input=${(e: Event) => (this._formData = { ...this._formData, pageTitle: (e.target as HTMLInputElement).value })}>
            </uui-input>
          </div>

          <div class="form-field full-width">
            <label>Meta Description</label>
            <uui-textarea
              .value=${this._formData.metaDescription || ""}
              @input=${(e: Event) => (this._formData = { ...this._formData, metaDescription: (e.target as HTMLTextAreaElement).value })}>
            </uui-textarea>
          </div>

          <div class="form-field full-width">
            <label>URL Slug</label>
            <uui-input
              .value=${this._formData.url || ""}
              @input=${(e: Event) => (this._formData = { ...this._formData, url: (e.target as HTMLInputElement).value })}>
            </uui-input>
          </div>

          <div class="form-field toggle-field">
            <uui-toggle
              .checked=${this._formData.noIndex ?? false}
              @change=${(e: Event) => (this._formData = { ...this._formData, noIndex: (e.target as any).checked })}>
            </uui-toggle>
            <label>No Index (hide from search engines)</label>
          </div>
        </div>
      </div>
    `;
  }

  private _renderFeedSection(): unknown {
    return html`
      <div class="section-content">
        <p class="section-hint">Override shopping feed values for this variant.</p>

        <div class="form-field toggle-field">
          <uui-toggle
            .checked=${this._formData.removeFromFeed ?? false}
            @change=${(e: Event) => (this._formData = { ...this._formData, removeFromFeed: (e.target as any).checked })}>
          </uui-toggle>
          <label>Remove from shopping feed</label>
        </div>

        ${!this._formData.removeFromFeed
          ? html`
              <div class="form-grid">
                <div class="form-field full-width">
                  <label>Feed Title</label>
                  <uui-input
                    .value=${this._formData.shoppingFeedTitle || ""}
                    @input=${(e: Event) => (this._formData = { ...this._formData, shoppingFeedTitle: (e.target as HTMLInputElement).value })}>
                  </uui-input>
                </div>

                <div class="form-field full-width">
                  <label>Feed Description</label>
                  <uui-textarea
                    .value=${this._formData.shoppingFeedDescription || ""}
                    @input=${(e: Event) => (this._formData = { ...this._formData, shoppingFeedDescription: (e.target as HTMLTextAreaElement).value })}>
                  </uui-textarea>
                </div>

                <div class="form-field">
                  <label>Colour</label>
                  <uui-input
                    .value=${this._formData.shoppingFeedColour || ""}
                    @input=${(e: Event) => (this._formData = { ...this._formData, shoppingFeedColour: (e.target as HTMLInputElement).value })}>
                  </uui-input>
                </div>

                <div class="form-field">
                  <label>Material</label>
                  <uui-input
                    .value=${this._formData.shoppingFeedMaterial || ""}
                    @input=${(e: Event) => (this._formData = { ...this._formData, shoppingFeedMaterial: (e.target as HTMLInputElement).value })}>
                  </uui-input>
                </div>

                <div class="form-field">
                  <label>Size</label>
                  <uui-input
                    .value=${this._formData.shoppingFeedSize || ""}
                    @input=${(e: Event) => (this._formData = { ...this._formData, shoppingFeedSize: (e.target as HTMLInputElement).value })}>
                  </uui-input>
                </div>

                <div class="form-field toggle-field">
                  <uui-toggle
                    .checked=${this._formData.excludeFromCustomLabels ?? false}
                    @change=${(e: Event) => (this._formData = { ...this._formData, excludeFromCustomLabels: (e.target as any).checked })}>
                  </uui-toggle>
                  <label>Exclude from custom labels</label>
                </div>
              </div>
            `
          : nothing}
      </div>
    `;
  }

  private _renderStockSection(): unknown {
    const warehouseStock = this._formData.warehouseStock ?? [];
    const totalStock = warehouseStock.reduce((sum, ws) => sum + ws.stock, 0);

    return html`
      <div class="section-content">
        <div class="info-banner">
          <uui-icon name="icon-info"></uui-icon>
          <div>
            <p class="section-hint"><strong>Stock Management:</strong> Stock levels are managed per warehouse. To adjust stock, create a shipment from the Orders section or use the Inventory management tools.</p>
          </div>
        </div>

        ${warehouseStock.length > 0
          ? html`
              <div class="stock-summary">
                <strong>Total Stock:</strong> ${totalStock} units
              </div>
              <div class="table-container">
                <uui-table>
                  <uui-table-head>
                    <uui-table-head-cell>Warehouse</uui-table-head-cell>
                    <uui-table-head-cell>Available</uui-table-head-cell>
                    <uui-table-head-cell>Reorder Point</uui-table-head-cell>
                    <uui-table-head-cell>Track Stock</uui-table-head-cell>
                  </uui-table-head>
                  ${warehouseStock.map(
                    (ws) => html`
                      <uui-table-row>
                        <uui-table-cell><strong>${ws.warehouseName}</strong></uui-table-cell>
                        <uui-table-cell>
                          <span class="badge ${ws.stock === 0 ? "badge-danger" : ws.stock < 10 ? "badge-warning" : "badge-positive"}">
                            ${ws.stock} units
                          </span>
                        </uui-table-cell>
                        <uui-table-cell>
                          <span class="stock-value">${ws.reorderPoint ?? "Not set"}</span>
                        </uui-table-cell>
                        <uui-table-cell>
                          <uui-badge color=${ws.trackStock ? "positive" : "default"}>
                            ${ws.trackStock ? "Enabled" : "Disabled"}
                          </uui-badge>
                        </uui-table-cell>
                      </uui-table-row>
                    `
                  )}
                </uui-table>
              </div>
            `
          : html`
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
    return html`
      <umb-body-layout headline="Edit Variant: ${this._formData.name || "Unnamed"}">
        <div class="modal-content">
          ${this._renderSectionNav()}

          ${this._errorMessage
            ? html`
                <div class="error-banner">
                  <uui-icon name="icon-alert"></uui-icon>
                  ${this._errorMessage}
                </div>
              `
            : nothing}

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

  static styles = [
    badgeStyles,
    css`
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
    `,
  ];
}

export default MerchelloVariantDetailModalElement;

declare global {
  interface HTMLElementTagNameMap {
    "merchello-variant-detail-modal": MerchelloVariantDetailModalElement;
  }
}
