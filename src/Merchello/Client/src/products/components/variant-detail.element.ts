import { LitElement, html, css, nothing } from "@umbraco-cms/backoffice/external/lit";
import { customElement, state } from "@umbraco-cms/backoffice/external/lit";
import { UmbElementMixin } from "@umbraco-cms/backoffice/element-api";
import { UMB_WORKSPACE_CONTEXT } from "@umbraco-cms/backoffice/workspace";
import { UMB_NOTIFICATION_CONTEXT } from "@umbraco-cms/backoffice/notification";
import type { UmbNotificationContext } from "@umbraco-cms/backoffice/notification";
import type { UmbRoute, UmbRouterSlotChangeEvent, UmbRouterSlotInitEvent } from "@umbraco-cms/backoffice/router";
import type { MerchelloProductDetailWorkspaceContext } from "@products/contexts/product-detail-workspace.context.js";
import type { ProductRootDetailDto, ProductVariantDto, UpdateVariantRequest } from "@products/types/product.types.js";
import { MerchelloApi } from "@api/merchello-api.js";
import { badgeStyles } from "@shared/styles/badge.styles.js";
import { getProductDetailHref } from "@shared/utils/navigation.js";

@customElement("merchello-variant-detail")
export class MerchelloVariantDetailElement extends UmbElementMixin(LitElement) {
  @state() private _product: ProductRootDetailDto | null = null;
  @state() private _variant: ProductVariantDto | null = null;
  @state() private _isLoading = true;
  @state() private _isSaving = false;
  @state() private _errorMessage: string | null = null;

  // Tab routing state
  @state() private _routes: UmbRoute[] = [];
  @state() private _routerPath?: string;
  @state() private _activePath = "";

  // Form state - copy of variant data for editing
  @state() private _formData: Partial<ProductVariantDto> = {};

  #workspaceContext?: MerchelloProductDetailWorkspaceContext;
  #notificationContext?: UmbNotificationContext;
  #variantId: string | undefined;
  #isConnected = false;

  constructor() {
    super();
    this.consumeContext(UMB_WORKSPACE_CONTEXT, (context) => {
      this.#workspaceContext = context as MerchelloProductDetailWorkspaceContext;
      if (this.#workspaceContext) {
        this.observe(this.#workspaceContext.product, (product) => {
          this._product = product ?? null;
          this._updateVariantFromProduct();
        });
        this.observe(this.#workspaceContext.variantId, (variantId) => {
          this.#variantId = variantId;
          this._updateVariantFromProduct();
        });
      }
    });
    this.consumeContext(UMB_NOTIFICATION_CONTEXT, (context) => {
      this.#notificationContext = context;
    });
  }

  connectedCallback(): void {
    super.connectedCallback();
    this.#isConnected = true;
    this._createRoutes();
  }

  disconnectedCallback(): void {
    super.disconnectedCallback();
    this.#isConnected = false;
  }

  /**
   * Updates variant data from the loaded product
   */
  private _updateVariantFromProduct(): void {
    if (!this._product || !this.#variantId) {
      this._variant = null;
      this._isLoading = true;
      return;
    }

    const variant = this._product.variants.find((v) => v.id === this.#variantId);
    if (variant) {
      this._variant = variant;
      this._formData = { ...variant };
      this._isLoading = false;
    }
  }

  /**
   * Creates routes for tab navigation.
   * The router-slot is hidden via CSS - we use it purely for URL tracking.
   */
  private _createRoutes(): void {
    const stubComponent = (): HTMLElement => document.createElement("div");

    this._routes = [
      { path: "tab/basic", component: stubComponent },
      { path: "tab/dimensions", component: stubComponent },
      { path: "tab/seo", component: stubComponent },
      { path: "tab/feed", component: stubComponent },
      { path: "tab/stock", component: stubComponent },
      { path: "", redirectTo: "tab/basic" },
    ];
  }

  /**
   * Gets the currently active tab based on the route path
   */
  private _getActiveTab(): "basic" | "dimensions" | "seo" | "feed" | "stock" {
    if (this._activePath.includes("tab/dimensions")) return "dimensions";
    if (this._activePath.includes("tab/seo")) return "seo";
    if (this._activePath.includes("tab/feed")) return "feed";
    if (this._activePath.includes("tab/stock")) return "stock";
    return "basic";
  }

  private async _handleSave(): Promise<void> {
    if (!this._product || !this._variant) return;

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

      const { error } = await MerchelloApi.updateVariant(this._product.id, this._variant.id, request);

      if (!this.#isConnected) return;

      if (error) {
        this._errorMessage = error.message;
        this.#notificationContext?.peek("danger", { data: { headline: "Failed to save variant", message: error.message } });
        return;
      }

      this.#notificationContext?.peek("positive", { data: { headline: "Variant saved", message: "Changes have been saved successfully" } });

      // Reload the product to get updated variant data
      this.#workspaceContext?.reload();
    } catch (error) {
      if (!this.#isConnected) return;
      this._errorMessage = error instanceof Error ? error.message : "An unexpected error occurred";
      this.#notificationContext?.peek("danger", { data: { headline: "Error", message: this._errorMessage } });
      console.error("Variant save failed:", error);
    } finally {
      this._isSaving = false;
    }
  }

  private _renderTabs(): unknown {
    const activeTab = this._getActiveTab();

    return html`
      <uui-tab-group slot="header">
        <uui-tab label="Basic Info" href="${this._routerPath}/tab/basic" ?active=${activeTab === "basic"}>
          Basic Info
        </uui-tab>
        <uui-tab label="Dimensions" href="${this._routerPath}/tab/dimensions" ?active=${activeTab === "dimensions"}>
          Dimensions
        </uui-tab>
        <uui-tab label="SEO" href="${this._routerPath}/tab/seo" ?active=${activeTab === "seo"}>
          SEO
        </uui-tab>
        <uui-tab label="Shopping Feed" href="${this._routerPath}/tab/feed" ?active=${activeTab === "feed"}>
          Shopping Feed
        </uui-tab>
        <uui-tab label="Stock" href="${this._routerPath}/tab/stock" ?active=${activeTab === "stock"}>
          Stock
        </uui-tab>
      </uui-tab-group>
    `;
  }

  private _renderBasicTab(): unknown {
    return html`
      <div class="tab-content">
        ${this._errorMessage
          ? html`
              <uui-box class="error-box">
                <div class="error-message">
                  <uui-icon name="icon-alert"></uui-icon>
                  <span>${this._errorMessage}</span>
                </div>
              </uui-box>
            `
          : nothing}

        <uui-box headline="Identification">
          <umb-property-layout label="Variant Name" description="If empty, generated from option values">
            <uui-input
              slot="editor"
              .value=${this._formData.name || ""}
              @input=${(e: Event) => (this._formData = { ...this._formData, name: (e.target as HTMLInputElement).value })}
              placeholder="e.g., Blue T-Shirt - Large">
            </uui-input>
          </umb-property-layout>

          <umb-property-layout label="SKU" description="Stock Keeping Unit - unique product identifier" ?mandatory=${true}>
            <uui-input
              slot="editor"
              .value=${this._formData.sku || ""}
              @input=${(e: Event) => (this._formData = { ...this._formData, sku: (e.target as HTMLInputElement).value })}
              placeholder="PROD-001">
            </uui-input>
          </umb-property-layout>

          <umb-property-layout label="GTIN/Barcode" description="Global Trade Item Number (EAN/UPC)">
            <uui-input
              slot="editor"
              .value=${this._formData.gtin || ""}
              @input=${(e: Event) => (this._formData = { ...this._formData, gtin: (e.target as HTMLInputElement).value })}
              placeholder="012345678905">
            </uui-input>
          </umb-property-layout>

          <umb-property-layout label="Supplier SKU" description="Your supplier's product code">
            <uui-input
              slot="editor"
              .value=${this._formData.supplierSku || ""}
              @input=${(e: Event) => (this._formData = { ...this._formData, supplierSku: (e.target as HTMLInputElement).value })}
              placeholder="SUP-001">
            </uui-input>
          </umb-property-layout>
        </uui-box>

        <uui-box headline="Pricing">
          <umb-property-layout label="Price" description="Customer-facing price (excluding tax)" ?mandatory=${true}>
            <uui-input
              slot="editor"
              type="number"
              step="0.01"
              .value=${String(this._formData.price ?? 0)}
              @input=${(e: Event) => (this._formData = { ...this._formData, price: parseFloat((e.target as HTMLInputElement).value) || 0 })}>
            </uui-input>
          </umb-property-layout>

          <umb-property-layout label="Cost of Goods" description="Your cost for profit margin calculation">
            <uui-input
              slot="editor"
              type="number"
              step="0.01"
              .value=${String(this._formData.costOfGoods ?? 0)}
              @input=${(e: Event) => (this._formData = { ...this._formData, costOfGoods: parseFloat((e.target as HTMLInputElement).value) || 0 })}>
            </uui-input>
          </umb-property-layout>

          <umb-property-layout label="On Sale" description="Enable sale pricing">
            <uui-toggle
              slot="editor"
              .checked=${this._formData.onSale ?? false}
              @change=${(e: Event) => (this._formData = { ...this._formData, onSale: (e.target as any).checked })}>
            </uui-toggle>
          </umb-property-layout>

          ${this._formData.onSale
            ? html`
                <umb-property-layout label="Previous Price (Was)" description="Original price to show discount">
                  <uui-input
                    slot="editor"
                    type="number"
                    step="0.01"
                    .value=${String(this._formData.previousPrice ?? 0)}
                    @input=${(e: Event) => (this._formData = { ...this._formData, previousPrice: parseFloat((e.target as HTMLInputElement).value) || 0 })}>
                  </uui-input>
                </umb-property-layout>
              `
            : nothing}
        </uui-box>

        <uui-box headline="Availability">
          <umb-property-layout label="Available for Purchase" description="Show on website, allow add to cart">
            <uui-toggle
              slot="editor"
              .checked=${this._formData.availableForPurchase ?? true}
              @change=${(e: Event) => (this._formData = { ...this._formData, availableForPurchase: (e.target as any).checked })}>
            </uui-toggle>
          </umb-property-layout>

          <umb-property-layout label="Can Purchase" description="Allow checkout (stock/inventory check)">
            <uui-toggle
              slot="editor"
              .checked=${this._formData.canPurchase ?? true}
              @change=${(e: Event) => (this._formData = { ...this._formData, canPurchase: (e.target as any).checked })}>
            </uui-toggle>
          </umb-property-layout>
        </uui-box>

        <uui-box headline="Description">
          <umb-property-layout label="Variant Description" description="Variant-specific description (overrides product description)">
            <uui-textarea
              slot="editor"
              .value=${this._formData.description || ""}
              @input=${(e: Event) => (this._formData = { ...this._formData, description: (e.target as HTMLTextAreaElement).value })}
              placeholder="Describe this variant...">
            </uui-textarea>
          </umb-property-layout>
        </uui-box>
      </div>
    `;
  }

  private _renderDimensionsTab(): unknown {
    return html`
      <div class="tab-content">
        <uui-box class="info-banner">
          <div class="info-content">
            <uui-icon name="icon-info"></uui-icon>
            <div>
              <strong>Shipping Dimensions</strong>
              <p>These dimensions are used for shipping rate calculations with carriers like FedEx, UPS, and DHL.</p>
            </div>
          </div>
        </uui-box>

        <uui-box headline="Package Dimensions">
          <umb-property-layout label="Weight (kg)" description="Package weight in kilograms">
            <uui-input
              slot="editor"
              type="number"
              step="0.01"
              .value=${String(this._formData.weight ?? "")}
              @input=${(e: Event) => (this._formData = { ...this._formData, weight: parseFloat((e.target as HTMLInputElement).value) || undefined })}
              placeholder="0.50">
            </uui-input>
          </umb-property-layout>

          <umb-property-layout label="Length (cm)" description="Longest side">
            <uui-input
              slot="editor"
              type="number"
              step="0.1"
              .value=${String(this._formData.lengthCm ?? "")}
              @input=${(e: Event) => (this._formData = { ...this._formData, lengthCm: parseFloat((e.target as HTMLInputElement).value) || undefined })}
              placeholder="20">
            </uui-input>
          </umb-property-layout>

          <umb-property-layout label="Width (cm)" description="Middle side">
            <uui-input
              slot="editor"
              type="number"
              step="0.1"
              .value=${String(this._formData.widthCm ?? "")}
              @input=${(e: Event) => (this._formData = { ...this._formData, widthCm: parseFloat((e.target as HTMLInputElement).value) || undefined })}
              placeholder="15">
            </uui-input>
          </umb-property-layout>

          <umb-property-layout label="Height (cm)" description="Shortest side">
            <uui-input
              slot="editor"
              type="number"
              step="0.1"
              .value=${String(this._formData.heightCm ?? "")}
              @input=${(e: Event) => (this._formData = { ...this._formData, heightCm: parseFloat((e.target as HTMLInputElement).value) || undefined })}
              placeholder="10">
            </uui-input>
          </umb-property-layout>
        </uui-box>
      </div>
    `;
  }

  private _renderSeoTab(): unknown {
    return html`
      <div class="tab-content">
        <uui-box headline="Search Engine Optimization">
          <umb-property-layout label="Page Title" description="Title displayed in browser tab and search results">
            <uui-input
              slot="editor"
              .value=${this._formData.pageTitle || ""}
              @input=${(e: Event) => (this._formData = { ...this._formData, pageTitle: (e.target as HTMLInputElement).value })}>
            </uui-input>
          </umb-property-layout>

          <umb-property-layout label="Meta Description" description="Description shown in search engine results">
            <uui-textarea
              slot="editor"
              .value=${this._formData.metaDescription || ""}
              @input=${(e: Event) => (this._formData = { ...this._formData, metaDescription: (e.target as HTMLTextAreaElement).value })}>
            </uui-textarea>
          </umb-property-layout>

          <umb-property-layout label="URL Slug" description="The URL path for this variant">
            <uui-input
              slot="editor"
              .value=${this._formData.url || ""}
              @input=${(e: Event) => (this._formData = { ...this._formData, url: (e.target as HTMLInputElement).value })}>
            </uui-input>
          </umb-property-layout>

          <umb-property-layout label="No Index" description="Hide from search engines">
            <uui-toggle
              slot="editor"
              .checked=${this._formData.noIndex ?? false}
              @change=${(e: Event) => (this._formData = { ...this._formData, noIndex: (e.target as any).checked })}>
            </uui-toggle>
          </umb-property-layout>
        </uui-box>
      </div>
    `;
  }

  private _renderFeedTab(): unknown {
    return html`
      <div class="tab-content">
        <uui-box headline="Shopping Feed Settings">
          <umb-property-layout label="Remove from Feed" description="Exclude this variant from shopping feeds">
            <uui-toggle
              slot="editor"
              .checked=${this._formData.removeFromFeed ?? false}
              @change=${(e: Event) => (this._formData = { ...this._formData, removeFromFeed: (e.target as any).checked })}>
            </uui-toggle>
          </umb-property-layout>

          ${!this._formData.removeFromFeed
            ? html`
                <umb-property-layout label="Feed Title" description="Title for shopping feed">
                  <uui-input
                    slot="editor"
                    .value=${this._formData.shoppingFeedTitle || ""}
                    @input=${(e: Event) => (this._formData = { ...this._formData, shoppingFeedTitle: (e.target as HTMLInputElement).value })}>
                  </uui-input>
                </umb-property-layout>

                <umb-property-layout label="Feed Description" description="Description for shopping feed">
                  <uui-textarea
                    slot="editor"
                    .value=${this._formData.shoppingFeedDescription || ""}
                    @input=${(e: Event) => (this._formData = { ...this._formData, shoppingFeedDescription: (e.target as HTMLTextAreaElement).value })}>
                  </uui-textarea>
                </umb-property-layout>

                <umb-property-layout label="Colour" description="Product colour for feed">
                  <uui-input
                    slot="editor"
                    .value=${this._formData.shoppingFeedColour || ""}
                    @input=${(e: Event) => (this._formData = { ...this._formData, shoppingFeedColour: (e.target as HTMLInputElement).value })}>
                  </uui-input>
                </umb-property-layout>

                <umb-property-layout label="Material" description="Product material for feed">
                  <uui-input
                    slot="editor"
                    .value=${this._formData.shoppingFeedMaterial || ""}
                    @input=${(e: Event) => (this._formData = { ...this._formData, shoppingFeedMaterial: (e.target as HTMLInputElement).value })}>
                  </uui-input>
                </umb-property-layout>

                <umb-property-layout label="Size" description="Product size for feed">
                  <uui-input
                    slot="editor"
                    .value=${this._formData.shoppingFeedSize || ""}
                    @input=${(e: Event) => (this._formData = { ...this._formData, shoppingFeedSize: (e.target as HTMLInputElement).value })}>
                  </uui-input>
                </umb-property-layout>

                <umb-property-layout label="Exclude from Custom Labels" description="Exclude from custom label categorization">
                  <uui-toggle
                    slot="editor"
                    .checked=${this._formData.excludeFromCustomLabels ?? false}
                    @change=${(e: Event) => (this._formData = { ...this._formData, excludeFromCustomLabels: (e.target as any).checked })}>
                  </uui-toggle>
                </umb-property-layout>
              `
            : nothing}
        </uui-box>
      </div>
    `;
  }

  private _renderStockTab(): unknown {
    const warehouseStock = this._formData.warehouseStock ?? [];
    const totalStock = warehouseStock.reduce((sum, ws) => sum + ws.stock, 0);

    return html`
      <div class="tab-content">
        <uui-box class="info-banner">
          <div class="info-content">
            <uui-icon name="icon-info"></uui-icon>
            <div>
              <strong>Stock Management</strong>
              <p>Stock levels are managed per warehouse. To adjust stock, create a shipment from the Orders section or use the Inventory management tools.</p>
            </div>
          </div>
        </uui-box>

        <uui-box headline="Warehouse Stock">
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
        </uui-box>
      </div>
    `;
  }

  private _renderFooter(): unknown {
    return html`
      <umb-footer-layout slot="footer">
        <!-- Breadcrumb in default slot -->
        <uui-breadcrumbs>
          <uui-breadcrumb-item href=${getProductDetailHref(this._product?.id || "")}>
            ${this._product?.rootName || "Product"}
          </uui-breadcrumb-item>
          <uui-breadcrumb-item>
            ${this._variant?.name || this._formData.name || "Variant"}
          </uui-breadcrumb-item>
        </uui-breadcrumbs>

        <!-- Save button in actions slot -->
        <uui-button
          slot="actions"
          look="primary"
          color="positive"
          @click=${this._handleSave}
          ?disabled=${this._isSaving}
          label=${this._isSaving ? "Saving..." : "Save Changes"}>
          ${this._isSaving ? "Saving..." : "Save Changes"}
        </uui-button>
      </umb-footer-layout>
    `;
  }

  /**
   * Handles router slot initialization
   */
  private _onRouterInit(event: UmbRouterSlotInitEvent): void {
    this._routerPath = event.target.absoluteRouterPath;
  }

  /**
   * Handles router slot path changes
   */
  private _onRouterChange(event: UmbRouterSlotChangeEvent): void {
    this._activePath = event.target.localActiveViewPath || "";
  }

  render() {
    if (this._isLoading) {
      return html`
        <umb-body-layout header-fit-height>
          <div class="loading">
            <uui-loader></uui-loader>
          </div>
        </umb-body-layout>
      `;
    }

    const activeTab = this._getActiveTab();
    const backHref = this._product?.id ? getProductDetailHref(this._product.id) : "";

    return html`
      <umb-body-layout header-fit-height main-no-padding>
        <!-- Header: back button + icon + name input -->
        <uui-button slot="header" compact href=${backHref} label="Back to Product" class="back-button">
          <uui-icon name="icon-arrow-left"></uui-icon>
        </uui-button>

        <div id="header" slot="header">
          <umb-icon name="icon-layers"></umb-icon>
          <uui-input
            id="name-input"
            .value=${this._formData.name || ""}
            @input=${(e: Event) => (this._formData = { ...this._formData, name: (e.target as HTMLInputElement).value })}
            placeholder="Variant name"
            aria-label="Variant name">
          </uui-input>
        </div>

        <!-- Inner body layout for tabs + content -->
        <umb-body-layout header-fit-height header-no-padding>
          ${this._renderTabs()}

          <umb-router-slot
            .routes=${this._routes}
            @init=${this._onRouterInit}
            @change=${this._onRouterChange}>
          </umb-router-slot>

          ${activeTab === "basic" ? this._renderBasicTab() : nothing}
          ${activeTab === "dimensions" ? this._renderDimensionsTab() : nothing}
          ${activeTab === "seo" ? this._renderSeoTab() : nothing}
          ${activeTab === "feed" ? this._renderFeedTab() : nothing}
          ${activeTab === "stock" ? this._renderStockTab() : nothing}
        </umb-body-layout>

        <!-- Footer with breadcrumb + save button -->
        ${this._renderFooter()}
      </umb-body-layout>
    `;
  }

  static styles = [
    badgeStyles,
    css`
      :host {
        display: block;
        width: 100%;
        height: 100%;
        --uui-tab-background: var(--uui-color-surface);
      }

      /* Header layout */
      #header {
        display: flex;
        align-items: center;
        gap: var(--uui-size-space-3);
        flex: 1;
        padding: var(--uui-size-space-4) 0;
      }

      #header umb-icon {
        font-size: 24px;
        color: var(--uui-color-text-alt);
      }

      #name-input {
        flex: 1 1 auto;
        --uui-input-border-color: transparent;
        --uui-input-background-color: transparent;
        font-size: var(--uui-type-h5-size);
        font-weight: 700;
      }

      #name-input:hover,
      #name-input:focus-within {
        --uui-input-border-color: var(--uui-color-border);
        --uui-input-background-color: var(--uui-color-surface);
      }

      .back-button {
        margin-right: var(--uui-size-space-2);
      }

      /* Loading state */
      .loading {
        display: flex;
        justify-content: center;
        align-items: center;
        min-height: 400px;
      }

      /* Tab styling - Umbraco pattern */
      uui-tab-group {
        --uui-tab-divider: var(--uui-color-border);
        width: 100%;
      }

      /* Hide router slot as we render content inline */
      umb-router-slot {
        display: none;
      }

      /* Box styling - Umbraco pattern */
      uui-box {
        --uui-box-default-padding: var(--uui-size-space-5);
      }

      /* Property layout adjustments */
      umb-property-layout:first-child {
        padding-top: 0;
      }

      umb-property-layout:last-child {
        padding-bottom: 0;
      }

      umb-property-layout uui-input,
      umb-property-layout uui-textarea {
        width: 100%;
      }

      /* Tab content */
      .tab-content {
        display: flex;
        flex-direction: column;
        gap: var(--uui-size-space-5);
      }

      /* Info and error banners */
      .error-box {
        background: var(--uui-color-danger-surface);
        border-left: 3px solid var(--uui-color-danger);
      }

      .info-banner {
        background: var(--uui-color-surface);
        border-left: 3px solid var(--uui-color-selected);
      }

      .info-content {
        display: flex;
        gap: var(--uui-size-space-3);
        padding: var(--uui-size-space-3);
      }

      .info-content uui-icon {
        font-size: 24px;
        flex-shrink: 0;
        color: var(--uui-color-selected);
      }

      .info-content strong {
        display: block;
        margin-bottom: var(--uui-size-space-1);
      }

      .info-content p {
        margin: 0;
        color: var(--uui-color-text-alt);
      }

      .error-message {
        display: flex;
        align-items: center;
        gap: var(--uui-size-space-2);
        color: var(--uui-color-danger);
        padding: var(--uui-size-space-3);
      }

      /* Table styles */
      .table-container {
        overflow-x: auto;
      }

      .stock-summary {
        padding: var(--uui-size-space-3);
        background: var(--uui-color-surface-alt);
        border-radius: var(--uui-border-radius);
        margin-bottom: var(--uui-size-space-3);
      }

      .stock-value {
        font-weight: 500;
      }

      /* Empty state */
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

      .hint {
        font-size: 0.875rem;
        color: var(--uui-color-text-alt);
        margin: 0;
      }

      /* Breadcrumbs */
      uui-breadcrumbs {
        font-size: 0.875rem;
      }
    `,
  ];
}

export default MerchelloVariantDetailElement;

declare global {
  interface HTMLElementTagNameMap {
    "merchello-variant-detail": MerchelloVariantDetailElement;
  }
}
