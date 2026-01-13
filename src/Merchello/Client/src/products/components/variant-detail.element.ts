import { LitElement, html, css, nothing } from "@umbraco-cms/backoffice/external/lit";
import { customElement, state } from "@umbraco-cms/backoffice/external/lit";
import { UmbElementMixin } from "@umbraco-cms/backoffice/element-api";
import { UMB_WORKSPACE_CONTEXT } from "@umbraco-cms/backoffice/workspace";
import { UMB_NOTIFICATION_CONTEXT } from "@umbraco-cms/backoffice/notification";
import type { UmbNotificationContext } from "@umbraco-cms/backoffice/notification";
import type { UmbRoute, UmbRouterSlotChangeEvent, UmbRouterSlotInitEvent } from "@umbraco-cms/backoffice/router";
import type { MerchelloProductsWorkspaceContext } from "@products/contexts/products-workspace.context.js";
import type { ProductRootDetailDto, ProductVariantDto, ProductPackageDto, UpdateVariantDto, ShippingOptionExclusionDto } from "@products/types/product.types.js";
import type { ProductFilterGroupDto } from "@filters/types/filters.types.js";
import { MerchelloApi } from "@api/merchello-api.js";
import { badgeStyles } from "@shared/styles/badge.styles.js";
import { getProductDetailHref } from "@shared/utils/navigation.js";

// Shared components
import "@products/components/variant-basic-info.element.js";
import "@products/components/variant-feed-settings.element.js";
import "@products/components/variant-stock-display.element.js";
import "@products/components/product-packages.element.js";
import "@products/components/product-filters.element.js";
import "@products/components/product-shipping-exclusions.element.js";
import type { StockSettingsChangeDetail } from "@products/components/variant-stock-display.element.js";
import type { PackagesChangeDetail } from "@products/components/product-packages.element.js";
import type { FiltersChangeDetail } from "@products/components/product-filters.element.js";
import type { ShippingExclusionsChangeDetail } from "@products/components/product-shipping-exclusions.element.js";

// ============================================
// Component
// ============================================

/**
 * Variant detail editing component.
 *
 * Displays and allows editing of a single product variant including:
 * - Basic info (SKU, pricing, availability)
 * - Shipping packages (with override from product root)
 * - SEO settings (URL slug)
 * - Shopping feed settings
 * - Stock levels per warehouse
 * - Filter assignments
 *
 * Accessed by clicking a variant row in the product detail's Variants tab.
 */
@customElement("merchello-variant-detail")
export class MerchelloVariantDetailElement extends UmbElementMixin(LitElement) {
  // ============================================
  // State: Loading & Errors
  // ============================================

  @state() private _product: ProductRootDetailDto | null = null;
  @state() private _variant: ProductVariantDto | null = null;
  @state() private _isLoading = true;
  @state() private _isSaving = false;
  @state() private _errorMessage: string | null = null;

  // ============================================
  // State: Tab Routing
  // ============================================

  @state() private _routes: UmbRoute[] = [];
  @state() private _routerPath?: string;
  @state() private _activePath = "";

  // ============================================
  // State: Form Data
  // ============================================

  /** Copy of variant data for editing */
  @state() private _formData: Partial<ProductVariantDto> = {};

  // ============================================
  // State: Filters
  // ============================================

  @state() private _filterGroups: ProductFilterGroupDto[] = [];
  @state() private _assignedFilterIds: string[] = [];
  private _originalAssignedFilterIds: string[] = [];

  // Shipping exclusions state - for this specific variant
  @state() private _variantShippingOptions: ShippingOptionExclusionDto[] = [];
  @state() private _variantExcludedOptionIds: string[] = [];

  // ============================================
  // Private Members
  // ============================================

  #workspaceContext?: MerchelloProductsWorkspaceContext;
  #notificationContext?: UmbNotificationContext;
  #variantId: string | undefined;
  #isConnected = false;

  // ============================================
  // Constructor & Lifecycle
  // ============================================

  constructor() {
    super();
    this.consumeContext(UMB_WORKSPACE_CONTEXT, (context) => {
      this.#workspaceContext = context as MerchelloProductsWorkspaceContext;
      if (this.#workspaceContext) {
        this.observe(this.#workspaceContext.product, (product) => {
          this._product = product ?? null;
          this._updateVariantFromProduct();
        }, '_product');
        this.observe(this.#workspaceContext.variantId, (variantId) => {
          this.#variantId = variantId;
          this._updateVariantFromProduct();
        }, '_variantId');
        // Observe filter groups from centralized context
        this.observe(this.#workspaceContext.filterGroups, (groups) => {
          this._filterGroups = groups;
        }, '_filterGroups');
      }
    });
    this.consumeContext(UMB_NOTIFICATION_CONTEXT, (context) => {
      this.#notificationContext = context;
    });
  }

  override connectedCallback(): void {
    super.connectedCallback();
    this.#isConnected = true;
    this._createRoutes();
    // Load filter groups from centralized context (avoids duplicate API calls)
    this.#workspaceContext?.loadFilterGroups();
  }

  override disconnectedCallback(): void {
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
      // Load filters for this variant
      this._loadAssignedFilters();
      // Initialize shipping exclusions for this variant
      this._initializeShippingExclusions(variant);
    }
  }

  /** Initializes shipping exclusions state for this variant */
  private _initializeShippingExclusions(variant: ProductVariantDto): void {
    // Get available options from product root
    const availableOptions = this._product?.availableShippingOptions ?? [];
    // Store the variant's currently excluded IDs
    this._variantExcludedOptionIds = variant.excludedShippingOptionIds ?? [];

    // Create a variant-specific view of the options
    this._variantShippingOptions = availableOptions.map((option) => ({
      ...option,
      // Override with this variant's specific exclusion state
      isExcluded: this._variantExcludedOptionIds.includes(option.id),
      isPartiallyExcluded: false, // Not relevant in variant mode
      excludedVariantCount: 0,
      totalVariantCount: 1,
    }));
  }

  /**
   * Loads filters assigned to the current variant
   */
  private async _loadAssignedFilters(): Promise<void> {
    const variantId = this._variant?.id;
    if (!variantId) return;

    const { data } = await MerchelloApi.getFiltersForProduct(variantId);
    if (!this.#isConnected) return;

    if (data) {
      const filterIds = data.map((f) => f.id);
      this._assignedFilterIds = filterIds;
      this._originalAssignedFilterIds = [...filterIds];
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
      { path: "tab/packages", component: stubComponent },
      { path: "tab/seo", component: stubComponent },
      { path: "tab/feed", component: stubComponent },
      { path: "tab/stock", component: stubComponent },
      { path: "tab/filters", component: stubComponent },
      { path: "", redirectTo: "tab/basic" },
    ];
  }

  /**
   * Gets the currently active tab based on the route path
   */
  private _getActiveTab(): "basic" | "packages" | "seo" | "feed" | "stock" | "filters" {
    if (this._activePath.includes("tab/packages")) return "packages";
    if (this._activePath.includes("tab/seo")) return "seo";
    if (this._activePath.includes("tab/feed")) return "feed";
    if (this._activePath.includes("tab/stock")) return "stock";
    if (this._activePath.includes("tab/filters")) return "filters";
    return "basic";
  }

  private async _handleSave(): Promise<void> {
    if (!this._product || !this._variant) return;

    this._isSaving = true;
    this._errorMessage = null;

    try {
      const request: UpdateVariantDto = {
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
        excludeRootProductImages: this._formData.excludeRootProductImages,
        url: this._formData.url ?? undefined,
        hsCode: this._formData.hsCode ?? undefined,
        packageConfigurations: this._formData.packageConfigurations,
        shoppingFeedTitle: this._formData.shoppingFeedTitle ?? undefined,
        shoppingFeedDescription: this._formData.shoppingFeedDescription ?? undefined,
        shoppingFeedColour: this._formData.shoppingFeedColour ?? undefined,
        shoppingFeedMaterial: this._formData.shoppingFeedMaterial ?? undefined,
        shoppingFeedSize: this._formData.shoppingFeedSize ?? undefined,
        removeFromFeed: this._formData.removeFromFeed,
        warehouseStock: this._formData.warehouseStock?.map((ws) => ({
          warehouseId: ws.warehouseId,
          stock: ws.stock,
          reorderPoint: ws.reorderPoint,
          trackStock: ws.trackStock,
        })),
      };

      const { error } = await MerchelloApi.updateVariant(this._product.id, this._variant.id, request);

      if (!this.#isConnected) return;

      if (error) {
        this._errorMessage = error.message;
        this.#notificationContext?.peek("danger", { data: { headline: "Failed to save variant", message: error.message } });
        return;
      }

      // Save filter assignments
      await this._saveFilterAssignments();

      // Save shipping exclusions
      await this._saveShippingExclusions();

      this.#notificationContext?.peek("positive", { data: { headline: "Variant saved", message: "Changes have been saved successfully" } });

      // Reload the product to get updated variant data
      this.#workspaceContext?.reload();
    } catch (error) {
      if (!this.#isConnected) return;
      this._errorMessage = error instanceof Error ? error.message : "An unexpected error occurred";
      this.#notificationContext?.peek("danger", { data: { headline: "Error", message: this._errorMessage } });
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
        <uui-tab label="Shipping" href="${this._routerPath}/tab/packages" ?active=${activeTab === "packages"}>
          Shipping
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
        <uui-tab label="Filters" href="${this._routerPath}/tab/filters" ?active=${activeTab === "filters"}>
          Filters
        </uui-tab>
      </uui-tab-group>
    `;
  }

  private _renderBasicTab(): unknown {
    return html`
      <div class="tab-content">
        <merchello-variant-basic-info
          .formData=${this._formData}
          .showVariantName=${true}
          @variant-change=${(e: CustomEvent) => (this._formData = e.detail)}>
        </merchello-variant-basic-info>
      </div>
    `;
  }

  /**
   * Check if variant is overriding root packages
   */
  private _isOverridingPackages(): boolean {
    return (this._formData.packageConfigurations?.length ?? 0) > 0;
  }

  /**
   * Get effective packages - variant's own or inherited from root
   */
  private _getEffectivePackages(): ProductPackageDto[] {
    if (this._isOverridingPackages()) {
      return this._formData.packageConfigurations ?? [];
    }
    return this._product?.defaultPackageConfigurations ?? [];
  }

  /**
   * Toggle package override mode
   */
  private _togglePackageOverride(): void {
    if (this._isOverridingPackages()) {
      // Clear variant packages to inherit from root
      this._formData = { ...this._formData, packageConfigurations: [] };
    } else {
      // Copy root packages to variant for editing
      const rootPackages = this._product?.defaultPackageConfigurations ?? [];
      this._formData = {
        ...this._formData,
        packageConfigurations: rootPackages.length > 0
          ? rootPackages.map((p) => ({ ...p }))
          : [{ weight: 0, lengthCm: null, widthCm: null, heightCm: null }],
      };
    }
  }

  // ============================================
  // Tab Render Methods
  // ============================================

  private _renderPackagesTab(): unknown {
    const isOverriding = this._isOverridingPackages();
    const effectivePackages = this._getEffectivePackages();
    const hasRootPackages = (this._product?.defaultPackageConfigurations?.length ?? 0) > 0;

    return html`
      <div class="tab-content">
        <uui-box class="info-banner">
          <div class="info-content">
            <uui-icon name="icon-info"></uui-icon>
            <div>
              <strong>Shipping</strong>
              <p>Define package configurations for shipping rate calculations. Products can ship in multiple packages.</p>
            </div>
          </div>
        </uui-box>

        ${hasRootPackages
          ? html`
              <uui-box headline="Package Settings">
                <umb-property-layout
                  label="Override Product Packages"
                  description="By default, this variant inherits packages from the product. Enable to define variant-specific packages.">
                  <uui-toggle
                    slot="editor"
                    .checked=${isOverriding}
                    @change=${() => this._togglePackageOverride()}>
                  </uui-toggle>
                </umb-property-layout>
              </uui-box>
            `
          : nothing}

        <uui-box headline=${isOverriding ? "Variant Packages" : hasRootPackages ? "Inherited from Product" : "Packages"}>
          <merchello-product-packages
            .packages=${effectivePackages}
            .editable=${isOverriding || !hasRootPackages}
            .showInheritedBanner=${!isOverriding && hasRootPackages}
            @packages-change=${this._handlePackagesChange}>
          </merchello-product-packages>
        </uui-box>

        <merchello-product-shipping-exclusions
          .shippingOptions=${this._variantShippingOptions}
          .variantMode=${true}
          .isNewProduct=${false}
          @shipping-exclusions-change=${this._handleShippingExclusionsChange}>
        </merchello-product-shipping-exclusions>
      </div>
    `;
  }

  /** Handles packages change from the shared component */
  private _handlePackagesChange(e: CustomEvent<PackagesChangeDetail>): void {
    this._formData = { ...this._formData, packageConfigurations: e.detail.packages };
  }

  /** Handles shipping exclusions change from the shared component */
  private _handleShippingExclusionsChange(e: CustomEvent<ShippingExclusionsChangeDetail>): void {
    this._variantExcludedOptionIds = e.detail.excludedShippingOptionIds;
    // Update the local state
    this._variantShippingOptions = this._variantShippingOptions.map((o) => ({
      ...o,
      isExcluded: this._variantExcludedOptionIds.includes(o.id),
    }));
  }

  private _renderFeedTab(): unknown {
    return html`
      <div class="tab-content">
        <merchello-variant-feed-settings
          .formData=${this._formData}
          @variant-change=${(e: CustomEvent) => (this._formData = e.detail)}>
        </merchello-variant-feed-settings>
      </div>
    `;
  }

  private _renderStockTab(): unknown {
    return html`
      <div class="tab-content">
        <merchello-variant-stock-display
          .warehouseStock=${this._formData.warehouseStock ?? []}
          @stock-settings-change=${this._handleStockSettingsChange}>
        </merchello-variant-stock-display>
      </div>
    `;
  }

  private _renderSeoTab(): unknown {
    return html`
      <div class="tab-content">
        <uui-box headline="Search Engine Optimization">
          <umb-property-layout
            label="URL Slug"
            description="Custom URL path for this variant">
            <uui-input
              slot="editor"
              .value=${this._formData.url || ""}
              @input=${(e: Event) => (this._formData = { ...this._formData, url: (e.target as HTMLInputElement).value })}
              placeholder="/products/my-product/blue-large">
            </uui-input>
          </umb-property-layout>
        </uui-box>
      </div>
    `;
  }

  private _handleStockSettingsChange(e: CustomEvent<StockSettingsChangeDetail>): void {
    const { warehouseId, stock, reorderPoint, trackStock } = e.detail;
    const updatedStock = (this._formData.warehouseStock ?? []).map((ws) => {
      if (ws.warehouseId !== warehouseId) return ws;
      return {
        ...ws,
        ...(stock !== undefined && { stock }),
        ...(reorderPoint !== undefined && { reorderPoint }),
        ...(trackStock !== undefined && { trackStock }),
      };
    });
    this._formData = { ...this._formData, warehouseStock: updatedStock };
  }

  /**
   * Renders the Filters tab for assigning filters to the variant.
   * Uses the shared product-filters component.
   */
  private _renderFiltersTab(): unknown {
    return html`
      <div class="tab-content">
        <merchello-product-filters
          .filterGroups=${this._filterGroups}
          .assignedFilterIds=${this._assignedFilterIds}
          @filters-change=${this._handleFiltersChange}>
        </merchello-product-filters>
      </div>
    `;
  }

  /** Handles filter selection changes from the shared component */
  private _handleFiltersChange(e: CustomEvent<FiltersChangeDetail>): void {
    this._assignedFilterIds = e.detail.filterIds;
  }

  /**
   * Checks if filter assignments have changed
   */
  private _hasFilterChanges(): boolean {
    if (this._assignedFilterIds.length !== this._originalAssignedFilterIds.length) return true;
    const sortedCurrent = [...this._assignedFilterIds].sort();
    const sortedOriginal = [...this._originalAssignedFilterIds].sort();
    return sortedCurrent.some((id, index) => id !== sortedOriginal[index]);
  }

  /**
   * Saves filter assignments for the variant
   */
  private async _saveFilterAssignments(): Promise<void> {
    const variantId = this._variant?.id;
    if (!variantId || !this._hasFilterChanges()) return;

    const { error } = await MerchelloApi.assignFiltersToProduct(variantId, this._assignedFilterIds);

    if (error) {
      this.#notificationContext?.peek("danger", {
        data: { headline: "Failed to save filters", message: error.message },
      });
      return;
    }

    // Update original to match current after successful save
    this._originalAssignedFilterIds = [...this._assignedFilterIds];
  }

  /** Saves shipping exclusions for this variant */
  private async _saveShippingExclusions(): Promise<void> {
    if (!this._product?.id || !this._variant?.id) return;

    const { error } = await MerchelloApi.updateVariantShippingExclusions(
      this._product.id,
      this._variant.id,
      this._variantExcludedOptionIds
    );

    if (error) {
      this.#notificationContext?.peek("warning", {
        data: { headline: "Shipping exclusions not saved", message: error.message },
      });
    }
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

  override render() {
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

          ${activeTab === "basic" ? this._renderBasicTab() : nothing}
          ${activeTab === "packages" ? this._renderPackagesTab() : nothing}
          ${activeTab === "seo" ? this._renderSeoTab() : nothing}
          ${activeTab === "feed" ? this._renderFeedTab() : nothing}
          ${activeTab === "stock" ? this._renderStockTab() : nothing}
          ${activeTab === "filters" ? this._renderFiltersTab() : nothing}
        </umb-body-layout>

        <!-- Footer with breadcrumb + save button -->
        ${this._renderFooter()}
      </umb-body-layout>
    `;
  }

  static override readonly styles = [
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
