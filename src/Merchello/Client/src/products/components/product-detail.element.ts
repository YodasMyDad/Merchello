import { LitElement, html, css, nothing } from "@umbraco-cms/backoffice/external/lit";
import { customElement, state } from "@umbraco-cms/backoffice/external/lit";
import { UmbElementMixin } from "@umbraco-cms/backoffice/element-api";
import { UMB_WORKSPACE_CONTEXT } from "@umbraco-cms/backoffice/workspace";
import { UMB_MODAL_MANAGER_CONTEXT } from "@umbraco-cms/backoffice/modal";
import type { UmbModalManagerContext } from "@umbraco-cms/backoffice/modal";
import { UMB_NOTIFICATION_CONTEXT } from "@umbraco-cms/backoffice/notification";
import type { UmbNotificationContext } from "@umbraco-cms/backoffice/notification";
import type { UmbRoute, UmbRouterSlotChangeEvent, UmbRouterSlotInitEvent } from "@umbraco-cms/backoffice/router";
import type { MerchelloProductDetailWorkspaceContext } from "@products/contexts/product-detail-workspace.context.js";
import type {
  ProductRootDetailDto,
  ProductOptionDto,
  ProductVariantDto,
  ProductOptionSettingsDto,
  ProductOptionValueDto,
  ProductTypeDto,
  UpdateProductRootRequest,
  CreateProductRootRequest,
} from "@products/types/product.types.js";
import type { TaxGroupDto } from "@orders/types/order.types.js";
import type { WarehouseDto } from "@shipping/types.js";
import { MerchelloApi } from "@api/merchello-api.js";
import { MERCHELLO_OPTION_EDITOR_MODAL } from "@products/modals/option-editor-modal.token.js";
import { badgeStyles } from "@shared/styles/badge.styles.js";
import { getProductsListHref, getVariantDetailHref } from "@shared/utils/navigation.js";
import "@shared/components/editable-text-list.element.js";
import { UmbDataTypeDetailRepository } from "@umbraco-cms/backoffice/data-type";
import { UmbPropertyEditorConfigCollection } from "@umbraco-cms/backoffice/property-editor";
import type { UmbPropertyEditorConfigCollection as UmbPropertyEditorConfigCollectionType } from "@umbraco-cms/backoffice/property-editor";
// Import TipTap component to register the custom element
import "@umbraco-cms/backoffice/tiptap";

interface SelectOption {
  name: string;
  value: string;
  selected?: boolean;
}

@customElement("merchello-product-detail")
export class MerchelloProductDetailElement extends UmbElementMixin(LitElement) {
  @state() private _product: ProductRootDetailDto | null = null;
  @state() private _isLoading = true;
  @state() private _isSaving = false;
  @state() private _errorMessage: string | null = null;
  @state() private _optionSettings: ProductOptionSettingsDto | null = null;
  @state() private _validationAttempted = false;
  @state() private _fieldErrors: Record<string, string> = {};

  // Tab routing state
  @state() private _routes: UmbRoute[] = [];
  @state() private _routerPath?: string;
  @state() private _activePath = "";

  // Form state
  @state() private _formData: Partial<ProductRootDetailDto> = {};

  // Reference data
  @state() private _taxGroups: TaxGroupDto[] = [];
  @state() private _productTypes: ProductTypeDto[] = [];
  @state() private _warehouses: WarehouseDto[] = [];
  // Note: Categories loaded but not yet used in UI
  // @state() private _categories: ProductCategoryDto[] = [];

  // Description editor configuration from Umbraco DataType
  @state() private _descriptionEditorConfig: UmbPropertyEditorConfigCollectionType | undefined = undefined;

  // Umbraco DataType repository for loading editor configuration
  #dataTypeRepository = new UmbDataTypeDetailRepository(this);
  
  #workspaceContext?: MerchelloProductDetailWorkspaceContext;
  #modalManager?: UmbModalManagerContext;
  #notificationContext?: UmbNotificationContext;
  #isConnected = false;

  constructor() {
    super();
    this.consumeContext(UMB_WORKSPACE_CONTEXT, (context) => {
      this.#workspaceContext = context as MerchelloProductDetailWorkspaceContext;
      if (this.#workspaceContext) {
        this.observe(this.#workspaceContext.product, (product) => {
          this._product = product ?? null;
          if (product) {
            this._formData = { ...product };
          }
          this._isLoading = !product;
        });
      }
    });
    this.consumeContext(UMB_MODAL_MANAGER_CONTEXT, (context) => {
      this.#modalManager = context;
    });
    this.consumeContext(UMB_NOTIFICATION_CONTEXT, (context) => {
      this.#notificationContext = context;
    });
  }

  connectedCallback(): void {
    super.connectedCallback();
    this.#isConnected = true;
    this._loadReferenceData();
    this._createRoutes();
  }

  disconnectedCallback(): void {
    super.disconnectedCallback();
    this.#isConnected = false;
  }

  private async _loadReferenceData(): Promise<void> {
    try {
      const [taxGroups, productTypes, warehouses, optionSettings, descriptionEditorSettings] = await Promise.all([
        MerchelloApi.getTaxGroups(),
        MerchelloApi.getProductTypes(),
        MerchelloApi.getWarehouses(),
        MerchelloApi.getProductOptionSettings(),
        MerchelloApi.getDescriptionEditorSettings(),
      ]);

      // Prevent state updates if component was disconnected during async operation
      if (!this.#isConnected) return;

      if (taxGroups.data) this._taxGroups = taxGroups.data;
      if (productTypes.data) this._productTypes = productTypes.data;
      if (warehouses.data) this._warehouses = warehouses.data;
      if (optionSettings.data) this._optionSettings = optionSettings.data;
      // Load DataType configuration using Umbraco's repository (handles auth automatically)
      if (descriptionEditorSettings.data?.dataTypeKey) {
        await this._loadDataTypeConfig(descriptionEditorSettings.data.dataTypeKey);
        // Check again after async operation
        if (!this.#isConnected) return;
      }
    } catch (error) {
      console.error("Failed to load reference data:", error);
      // Component will still function but with limited options
    }
  }

  /**
   * Fetches the DataType configuration using Umbraco's DataType repository.
   * This handles authentication automatically through Umbraco's internal mechanisms.
   */
  private async _loadDataTypeConfig(dataTypeKey: string): Promise<void> {
    try {
      console.log("[Merchello] Loading DataType config for:", dataTypeKey);
      
      // Request the DataType through Umbraco's repository (handles auth)
      const { data, error } = await this.#dataTypeRepository.requestByUnique(dataTypeKey);
      
      if (error) {
        console.error("[Merchello] Error requesting DataType:", error);
        this._setFallbackEditorConfig();
        return;
      }

      console.log("[Merchello] DataType request result:", data);
      
      // Observe the DataType to get its configuration
      this.observe(
        await this.#dataTypeRepository.byUnique(dataTypeKey),
        (dataType) => {
          console.log("[Merchello] DataType observed:", dataType);
          if (!this.#isConnected) return;
          
          if (!dataType) {
            console.warn("[Merchello] DataType not found, using fallback config");
            this._setFallbackEditorConfig();
            return;
          }
          
          // Create the config collection from the DataType's values
          console.log("[Merchello] DataType values:", dataType.values);
          console.log("[Merchello] DataType values detail:", JSON.stringify(dataType.values, null, 2));
          
          // Check if extensions config exists
          const hasExtensions = dataType.values?.some((v: { alias: string }) => v.alias === 'extensions');
          const hasToolbar = dataType.values?.some((v: { alias: string }) => v.alias === 'toolbar');
          console.log("[Merchello] Has extensions:", hasExtensions, "Has toolbar:", hasToolbar);
          
          if (!hasExtensions) {
            console.warn("[Merchello] DataType is missing 'extensions' config. Delete it in Settings > Data Types and restart to recreate.");
          }
          
          this._descriptionEditorConfig = new UmbPropertyEditorConfigCollection(dataType.values);
        },
        '_observeDescriptionDataType',
      );
    } catch (error) {
      console.error("[Merchello] Failed to load DataType configuration:", error);
      this._setFallbackEditorConfig();
    }
  }

  /**
   * Sets a fallback editor configuration if the DataType cannot be loaded.
   */
  private _setFallbackEditorConfig(): void {
    console.log("[Merchello] Using fallback TipTap configuration");
    this._descriptionEditorConfig = new UmbPropertyEditorConfigCollection([
      {
        alias: "toolbar",
        value: [
          [
            ["Umb.Tiptap.Toolbar.Bold", "Umb.Tiptap.Toolbar.Italic", "Umb.Tiptap.Toolbar.Underline"],
            ["Umb.Tiptap.Toolbar.BulletList", "Umb.Tiptap.Toolbar.OrderedList"],
            ["Umb.Tiptap.Toolbar.Link", "Umb.Tiptap.Toolbar.Unlink"],
          ],
        ],
      },
      {
        alias: "extensions",
        value: [
          "Umb.Tiptap.RichTextEssentials",
          "Umb.Tiptap.Bold",
          "Umb.Tiptap.Italic",
          "Umb.Tiptap.Underline",
          "Umb.Tiptap.Link",
          "Umb.Tiptap.BulletList",
          "Umb.Tiptap.OrderedList",
        ],
      },
    ]);
  }

  /**
   * Creates routes for tab navigation.
   * The router-slot is hidden via CSS - we use it purely for URL tracking.
   * Content is rendered inline based on _getActiveTab().
   */
  private _createRoutes(): void {
    // Simple stub component - router-slot is hidden, content rendered inline
    const stubComponent = (): HTMLElement => document.createElement("div");

    this._routes = [
      {
        path: "tab/details",
        component: stubComponent,
      },
      {
        path: "tab/media",
        component: stubComponent,
      },
      {
        path: "tab/seo",
        component: stubComponent,
      },
      {
        path: "tab/variants",
        component: stubComponent,
      },
      {
        path: "tab/options",
        component: stubComponent,
      },
      {
        path: "",
        redirectTo: "tab/details",
      },
    ];
  }

  /**
   * Gets the currently active tab based on the route path
   */
  private _getActiveTab(): "details" | "media" | "seo" | "variants" | "options" {
    if (this._activePath.includes("tab/media")) return "media";
    if (this._activePath.includes("tab/seo")) return "seo";
    if (this._activePath.includes("tab/variants")) return "variants";
    if (this._activePath.includes("tab/options")) return "options";
    return "details";
  }

  /**
   * Checks if there are validation errors on the details tab
   */
  private _hasDetailsErrors(): boolean {
    return !!(this._fieldErrors.rootName || this._fieldErrors.taxGroupId || this._fieldErrors.productTypeId || this._fieldErrors.warehouseIds);
  }

  /**
   * Gets validation hint for a specific tab
   */
  private _getTabHint(tab: "details" | "variants" | "options"): { color: string } | null {
    if (tab === "details" && this._validationAttempted && this._hasDetailsErrors()) {
      return { color: "danger" };
    }
    if (tab === "variants" && this._hasVariantWarnings()) {
      return { color: "warning" };
    }
    if (tab === "options" && this._hasOptionWarnings()) {
      return { color: "warning" };
    }
    return null;
  }

  private _handleInputChange(field: keyof ProductRootDetailDto, value: string): void {
    this._formData = { ...this._formData, [field]: value };
  }

  private _handleToggleChange(field: keyof ProductRootDetailDto, value: boolean): void {
    this._formData = { ...this._formData, [field]: value };
  }

  private _getTaxGroupOptions(): SelectOption[] {
    return [
      { name: "Select tax group...", value: "", selected: !this._formData.taxGroupId },
      ...this._taxGroups.map((t) => ({
        name: t.name,
        value: t.id,
        selected: t.id === this._formData.taxGroupId,
      })),
    ];
  }

  private _getProductTypeOptions(): SelectOption[] {
    return [
      { name: "Select product type...", value: "", selected: !this._formData.productTypeId },
      ...this._productTypes.map((t) => ({
        name: t.name,
        value: t.id,
        selected: t.id === this._formData.productTypeId,
      })),
    ];
  }

  private _handleTaxGroupChange(e: Event): void {
    const select = e.target as HTMLSelectElement;
    this._formData = { ...this._formData, taxGroupId: select.value };
  }

  private _handleProductTypeChange(e: Event): void {
    const select = e.target as HTMLSelectElement;
    this._formData = { ...this._formData, productTypeId: select.value };
  }

  private async _handleSave(): Promise<void> {
    if (!this._validateForm()) {
      return;
    }

    this._isSaving = true;
    this._errorMessage = null;

    try {
      const isNew = this.#workspaceContext?.isNew ?? true;

      if (isNew) {
        await this._createProduct();
      } else {
        await this._updateProduct();
      }
    } catch (error) {
      this._errorMessage = error instanceof Error ? error.message : "An unexpected error occurred";
      console.error("Save failed:", error);
    } finally {
      this._isSaving = false;
    }
  }

  private async _createProduct(): Promise<void> {
    const request: CreateProductRootRequest = {
      rootName: this._formData.rootName || "",
      taxGroupId: this._formData.taxGroupId || "",
      productTypeId: this._formData.productTypeId || "",
      categoryIds: this._formData.categoryIds,
      warehouseIds: this._formData.warehouseIds,
      rootImages: this._formData.rootImages,
      isDigitalProduct: this._formData.isDigitalProduct || false,
      defaultVariant: {
        price: 0,
        costOfGoods: 0,
      },
    };

    const { data, error } = await MerchelloApi.createProduct(request);

    if (error) {
      this._errorMessage = error.message;
      this.#notificationContext?.peek("danger", { data: { headline: "Failed to create product", message: error.message } });
      return;
    }

    if (data) {
      this.#workspaceContext?.updateProduct(data);
      this.#notificationContext?.peek("positive", { data: { headline: "Product created", message: `"${data.rootName}" has been created successfully` } });
      this._validationAttempted = false;
      this._fieldErrors = {};
    }
  }

  private async _updateProduct(): Promise<void> {
    if (!this._product?.id) return;

    const request: UpdateProductRootRequest = {
      rootName: this._formData.rootName,
      rootImages: this._formData.rootImages,
      rootUrl: this._formData.rootUrl ?? undefined,
      sellingPoints: this._formData.sellingPoints,
      videos: this._formData.videos,
      googleShoppingFeedCategory: this._formData.googleShoppingFeedCategory ?? undefined,
      hsCode: this._formData.hsCode ?? undefined,
      isDigitalProduct: this._formData.isDigitalProduct,
      taxGroupId: this._formData.taxGroupId,
      productTypeId: this._formData.productTypeId,
      categoryIds: this._formData.categoryIds,
      warehouseIds: this._formData.warehouseIds,
      description: this._formData.description ?? undefined,
      metaDescription: this._formData.metaDescription ?? undefined,
      pageTitle: this._formData.pageTitle ?? undefined,
      noIndex: this._formData.noIndex,
      openGraphImage: this._formData.openGraphImage ?? undefined,
      canonicalUrl: this._formData.canonicalUrl ?? undefined,
    };

    const { data, error } = await MerchelloApi.updateProduct(this._product.id, request);

    if (error) {
      this._errorMessage = error.message;
      this.#notificationContext?.peek("danger", { data: { headline: "Failed to save product", message: error.message } });
      return;
    }

    if (data) {
      this.#workspaceContext?.updateProduct(data);
      this.#notificationContext?.peek("positive", { data: { headline: "Product saved", message: "Changes have been saved successfully" } });
    }
  }

  /**
   * Validates the form and sets field-level errors
   */
  private _validateForm(): boolean {
    this._validationAttempted = true;
    this._fieldErrors = {};
    this._errorMessage = null;

    if (!this._formData.rootName?.trim()) {
      this._fieldErrors.rootName = "Product name is required";
    }
    if (!this._formData.taxGroupId) {
      this._fieldErrors.taxGroupId = "Tax group is required";
    }
    if (!this._formData.productTypeId) {
      this._fieldErrors.productTypeId = "Product type is required";
    }
    if (!this._formData.isDigitalProduct && (!this._formData.warehouseIds || this._formData.warehouseIds.length === 0)) {
      this._fieldErrors.warehouseIds = "At least one warehouse is required for physical products";
    }

    const hasErrors = Object.keys(this._fieldErrors).length > 0;
    if (hasErrors) {
      this._errorMessage = "Please fix the errors below before saving";
    }
    return !hasErrors;
  }

  /**
   * Checks if there are warnings for variants tab
   */
  private _hasVariantWarnings(): boolean {
    if (!this._product?.variants) return false;
    return this._product.variants.some((v) => !v.sku || v.price === 0);
  }

  /**
   * Checks if there are warnings for options tab
   */
  private _hasOptionWarnings(): boolean {
    const variantCount = this._product?.variants.length ?? 0;
    const optionCount = this._product?.productOptions.length ?? 0;
    return variantCount > 1 && optionCount === 0;
  }

  private _renderTabs(): unknown {
    const variantCount = this._product?.variants.length ?? 0;
    const optionCount = this._product?.productOptions.length ?? 0;
    const activeTab = this._getActiveTab();
    const detailsHint = this._getTabHint("details");
    const variantsHint = this._getTabHint("variants");
    const optionsHint = this._getTabHint("options");

    return html`
      <uui-tab-group slot="header">
        <uui-tab
          label="Details"
          href="${this._routerPath}/tab/details"
          ?active=${activeTab === "details"}>
          Details
          ${detailsHint ? html`<uui-badge slot="extra" color="danger" attention>!</uui-badge>` : nothing}
        </uui-tab>

        <uui-tab
          label="Media"
          href="${this._routerPath}/tab/media"
          ?active=${activeTab === "media"}>
          Media
        </uui-tab>

        <uui-tab
          label="SEO"
          href="${this._routerPath}/tab/seo"
          ?active=${activeTab === "seo"}>
          SEO
        </uui-tab>

        ${variantCount > 1
          ? html`
              <uui-tab
                label="Variants"
                href="${this._routerPath}/tab/variants"
                ?active=${activeTab === "variants"}>
                Variants (${variantCount})
                ${variantsHint ? html`<uui-badge slot="extra" color="warning">!</uui-badge>` : nothing}
              </uui-tab>
            `
          : nothing}

        <uui-tab
          label="Options"
          href="${this._routerPath}/tab/options"
          ?active=${activeTab === "options"}>
          Options (${optionCount})
          ${optionsHint ? html`<uui-badge slot="extra" color="warning">!</uui-badge>` : nothing}
        </uui-tab>
      </uui-tab-group>
    `;
  }

  private _renderDetailsTab(): unknown {
    const isNew = this.#workspaceContext?.isNew ?? true;

    return html`
      <div class="tab-content">
        ${isNew
          ? html`
              <uui-box class="info-banner">
                <div class="info-content">
                  <uui-icon name="icon-lightbulb"></uui-icon>
                  <div>
                    <strong>Getting Started</strong>
                    <p>Fill in the basic product information below. You can add variants and options after creating the product.</p>
                  </div>
                </div>
              </uui-box>
            `
          : nothing}

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

        <uui-box headline="Basic Information">
          <umb-property-layout
            label="Product Type"
            description="Categorize your product for reporting and organization"
            ?mandatory=${true}
            ?invalid=${!!this._fieldErrors.productTypeId}>
            <uui-select
              slot="editor"
              .options=${this._getProductTypeOptions()}
              @change=${this._handleProductTypeChange}>
            </uui-select>
          </umb-property-layout>

          <umb-property-layout
            label="Tax Group"
            description="Tax rate applied to this product"
            ?mandatory=${true}
            ?invalid=${!!this._fieldErrors.taxGroupId}>
            <uui-select
              slot="editor"
              .options=${this._getTaxGroupOptions()}
              @change=${this._handleTaxGroupChange}>
            </uui-select>
          </umb-property-layout>

          <umb-property-layout
            label="Digital Product"
            description="No shipping costs, instant delivery, no warehouse needed">
            <uui-toggle
              slot="editor"
              .checked=${this._formData.isDigitalProduct ?? false}
              @change=${(e: Event) => this._handleToggleChange("isDigitalProduct", (e.target as any).checked)}>
            </uui-toggle>
          </umb-property-layout>

          <umb-property-layout
            label="Selling Points"
            description="Key features or benefits to display on your storefront">
            <merchello-editable-text-list
              slot="editor"
              .items=${this._formData.sellingPoints || []}
              @change=${this._handleSellingPointsChange}
              placeholder="e.g., Free shipping, 30-day returns">
            </merchello-editable-text-list>
          </umb-property-layout>

          <umb-property-layout
            label="Description"
            description="Product description for your storefront. Edit the DataType in Settings > Data Types to customize the editor toolbar.">
            <div slot="editor">
              ${this._renderDescriptionEditor()}
            </div>
          </umb-property-layout>
        </uui-box>

        ${!this._formData.isDigitalProduct
          ? html`
              <uui-box headline="Warehouses">
                <umb-property-layout
                  label="Stock Locations"
                  description="Select which warehouses stock this product"
                  ?mandatory=${true}
                  ?invalid=${!!this._fieldErrors.warehouseIds}>
                  <div slot="editor">
                    ${this._renderWarehouseSelector()}
                  </div>
                </umb-property-layout>
              </uui-box>
            `
          : nothing}
      </div>
    `;
  }

  private _renderMediaTab(): unknown {
    return html`
      <div class="tab-content">
        <uui-box headline="Product Images">
          <umb-property-layout
            label="Images"
            description="Add images that will be displayed on your storefront. These images are shared across all variants.">
            <div slot="editor">
              ${this._renderMediaPicker()}
            </div>
          </umb-property-layout>
        </uui-box>
      </div>
    `;
  }

  /**
   * Renders the Description rich text editor using Umbraco's TipTap input component.
   * The editor configuration comes from a DataType that can be customized in Settings > Data Types.
   */
  private _renderDescriptionEditor(): unknown {
    // Show loading state while config is being fetched
    if (!this._descriptionEditorConfig) {
      return html`<uui-loader-bar></uui-loader-bar>`;
    }

    return html`
      <umb-input-tiptap
        .configuration=${this._descriptionEditorConfig}
        .value=${this._formData.description || ""}
        @change=${this._handleDescriptionChange}>
      </umb-input-tiptap>
    `;
  }

  /**
   * Handles changes from the Description rich text editor.
   * Extracts the markup value and updates the form data.
   */
  private _handleDescriptionChange(e: Event): void {
    const target = e.target as HTMLElement & { value?: string };
    const markup = target?.value || "";
    
    this._formData = {
      ...this._formData,
      description: markup,
    };
  }

  private _renderMediaPicker(): unknown {
    const imageKeys = this._formData.rootImages || [];
    const mediaValue = imageKeys.map((key) => ({ key, mediaKey: key }));

    return html`
      <umb-input-rich-media
        .value=${mediaValue}
        ?multiple=${true}
        @change=${this._handleMediaChange}>
      </umb-input-rich-media>
      ${imageKeys.length === 0 ? html`
        <div class="empty-media-state">
          <uui-icon name="icon-picture"></uui-icon>
          <p>No images added yet</p>
          <small>Click the button above to add product images</small>
        </div>
      ` : nothing}
    `;
  }

  private _handleMediaChange(e: CustomEvent): void {
    const target = e.target as any;
    const value = target?.value || [];
    const imageKeys = value.map((item: any) => item.mediaKey).filter(Boolean);
    this._formData = { ...this._formData, rootImages: imageKeys };
  }

  private _renderSeoTab(): unknown {
    const openGraphImageValue = this._formData.openGraphImage
      ? [{ key: this._formData.openGraphImage, mediaKey: this._formData.openGraphImage }]
      : [];

    return html`
      <div class="tab-content">
        <uui-box headline="Search Engine Optimization">
          <umb-property-layout
            label="Page Title"
            description="The title shown in browser tabs and search results">
            <uui-input
              slot="editor"
              .value=${this._formData.pageTitle || ""}
              @input=${(e: Event) => this._handleInputChange("pageTitle", (e.target as HTMLInputElement).value)}
              placeholder="e.g., Blue T-Shirt | Your Store Name">
            </uui-input>
          </umb-property-layout>

          <umb-property-layout
            label="Meta Description"
            description="The description shown in search results (recommended: 150-160 characters)">
            <uui-textarea
              slot="editor"
              .value=${this._formData.metaDescription || ""}
              @input=${(e: Event) => this._handleInputChange("metaDescription", (e.target as HTMLTextAreaElement).value)}
              placeholder="A brief description for search engines...">
            </uui-textarea>
          </umb-property-layout>

          <umb-property-layout
            label="Canonical URL"
            description="Optional URL to indicate the preferred version of this page for SEO">
            <uui-input
              slot="editor"
              .value=${this._formData.canonicalUrl || ""}
              @input=${(e: Event) => this._handleInputChange("canonicalUrl", (e.target as HTMLInputElement).value)}
              placeholder="https://example.com/products/blue-t-shirt">
            </uui-input>
          </umb-property-layout>

          <umb-property-layout
            label="Hide from Search Engines"
            description="Adds noindex meta tag to prevent search engines from indexing this page">
            <uui-toggle
              slot="editor"
              .checked=${this._formData.noIndex ?? false}
              @change=${(e: Event) => this._handleToggleChange("noIndex", (e.target as any).checked)}>
            </uui-toggle>
          </umb-property-layout>
        </uui-box>

        <uui-box headline="Social Sharing">
          <umb-property-layout
            label="Open Graph Image"
            description="Image displayed when this page is shared on social media">
            <div slot="editor">
              <umb-input-rich-media
                .value=${openGraphImageValue}
                ?multiple=${false}
                @change=${this._handleOpenGraphImageChange}>
              </umb-input-rich-media>
              ${!this._formData.openGraphImage
                ? html`
                    <div class="empty-media-state small">
                      <uui-icon name="icon-share-alt"></uui-icon>
                      <p>No image selected</p>
                      <small>Recommended size: 1200×630 pixels</small>
                    </div>
                  `
                : nothing}
            </div>
          </umb-property-layout>
        </uui-box>

        <uui-box headline="Search Preview">
          <umb-property-layout
            label="Google Search Result"
            description="Preview how this product may appear in Google search results">
            <div slot="editor">
              ${this._renderGoogleSearchPreview()}
            </div>
          </umb-property-layout>
        </uui-box>
      </div>
    `;
  }

  private _renderGoogleSearchPreview(): unknown {
    const pageTitle = this._formData.pageTitle || this._formData.rootName || "Product Title";
    const metaDescription = this._formData.metaDescription || "No meta description set. Add a description to improve search visibility.";
    const url = this._formData.canonicalUrl || "https://yourstore.com/products/product-name";

    // Parse URL into breadcrumb format (how Google now displays URLs)
    const urlBreadcrumb = this._formatUrlAsBreadcrumb(url);

    // Google measures in pixels (~600px for titles, ~920px for descriptions)
    // Character limits are approximations since character widths vary
    // Desktop: ~50-60 chars for title, ~155-160 for description
    const titleCharLimit = 60;
    const descCharLimit = 160;
    const titleOverLimit = pageTitle.length > titleCharLimit;
    const descOverLimit = metaDescription.length > descCharLimit;

    // Show truncated version as Google would display it
    const displayTitle = titleOverLimit ? pageTitle.substring(0, titleCharLimit - 3) + "..." : pageTitle;
    const displayDescription = descOverLimit ? metaDescription.substring(0, descCharLimit - 3) + "..." : metaDescription;

    return html`
      <div class="google-preview">
        <div class="google-preview-header">
          <div class="google-preview-favicon">
            <uui-icon name="icon-globe"></uui-icon>
          </div>
          <div class="google-preview-site">
            <div class="google-preview-site-name">Your Store</div>
            <div class="google-preview-url">${urlBreadcrumb}</div>
          </div>
        </div>
        <div class="google-preview-title">${displayTitle}</div>
        <div class="google-preview-description">${displayDescription}</div>
      </div>
      <div class="google-preview-stats">
        <span class="${titleOverLimit ? "stat-warning" : "stat-ok"}">
          Title: ${pageTitle.length}/${titleCharLimit} chars ${titleOverLimit ? "(will be truncated)" : ""}
        </span>
        <span class="${descOverLimit ? "stat-warning" : "stat-ok"}">
          Description: ${metaDescription.length}/${descCharLimit} chars ${descOverLimit ? "(will be truncated)" : ""}
        </span>
      </div>
    `;
  }

  private _formatUrlAsBreadcrumb(url: string): string {
    try {
      const parsed = new URL(url);
      const pathParts = parsed.pathname.split("/").filter((p) => p);
      if (pathParts.length === 0) {
        return parsed.hostname;
      }
      return `${parsed.hostname} › ${pathParts.join(" › ")}`;
    } catch {
      return url;
    }
  }

  private _handleOpenGraphImageChange(e: CustomEvent): void {
    const target = e.target as any;
    const value = target?.value || [];
    const imageKey = value.length > 0 ? value[0].mediaKey : null;
    this._formData = { ...this._formData, openGraphImage: imageKey };
  }

  private _renderWarehouseSelector(): unknown {
    const selectedWarehouseIds = this._formData.warehouseIds || [];

    return html`
      <div class="warehouse-toggle-list">
        ${this._warehouses.map(
          (warehouse) => html`
            <div class="toggle-field">
              <uui-toggle
                .checked=${selectedWarehouseIds.includes(warehouse.id)}
                @change=${(e: Event) => this._handleWarehouseToggle(warehouse.id, (e.target as any).checked)}>
              </uui-toggle>
              <label>${warehouse.name} ${warehouse.code ? `(${warehouse.code})` : ""}</label>
            </div>
          `
        )}
        ${this._warehouses.length === 0
          ? html`<p class="hint">No warehouses available. Create a warehouse first.</p>`
          : nothing}
      </div>
    `;
  }

  private _handleWarehouseToggle(warehouseId: string, checked: boolean): void {
    const warehouseIds = this._formData.warehouseIds || [];
    if (checked) {
      this._formData = { ...this._formData, warehouseIds: [...warehouseIds, warehouseId] };
    } else {
      this._formData = { ...this._formData, warehouseIds: warehouseIds.filter((id) => id !== warehouseId) };
    }
  }

  private _renderVariantsTab(): unknown {
    const variants = this._product?.variants ?? [];

    return html`
      <div class="tab-content">
        <div class="section-header">
          <h3>Product Variants</h3>
          <p class="section-description">
            Click a row to edit variant details. Select a variant as the default using the radio button.
          </p>
        </div>

        <div class="table-container">
          <uui-table class="data-table">
            <uui-table-head>
              <uui-table-head-cell style="width: 60px;">Default</uui-table-head-cell>
              <uui-table-head-cell>Variant</uui-table-head-cell>
              <uui-table-head-cell>SKU</uui-table-head-cell>
              <uui-table-head-cell>Price</uui-table-head-cell>
              <uui-table-head-cell>Stock</uui-table-head-cell>
              <uui-table-head-cell>Status</uui-table-head-cell>
            </uui-table-head>
            ${variants.map((variant) => this._renderVariantRow(variant))}
          </uui-table>
        </div>
      </div>
    `;
  }

  private _renderVariantRow(variant: ProductVariantDto): unknown {
    const variantHref = this._product ? getVariantDetailHref(this._product.id, variant.id) : "";
    const optionDescription = this._getVariantOptionDescription(variant);
    return html`
      <uui-table-row>
        <uui-table-cell>
          <uui-radio
            name="default-variant-${variant.productRootId}"
            ?checked=${variant.default}
            @click=${(e: Event) => { e.preventDefault(); this._handleSetDefaultVariant(variant.id); }}>
          </uui-radio>
        </uui-table-cell>
        <uui-table-cell>
          <div class="variant-name-cell">
            <a href=${variantHref} class="variant-link">${variant.name || "Unnamed"}</a>
            ${optionDescription ? html`<span class="variant-options-text">${optionDescription}</span>` : nothing}
          </div>
        </uui-table-cell>
        <uui-table-cell>${variant.sku || "—"}</uui-table-cell>
        <uui-table-cell>$${variant.price.toFixed(2)}</uui-table-cell>
        <uui-table-cell>
          <span class="badge ${this._getStockBadgeClass(variant.totalStock)}">${variant.totalStock}</span>
        </uui-table-cell>
        <uui-table-cell>
          <span class="badge ${variant.availableForPurchase ? "badge-positive" : "badge-danger"}">
            ${variant.availableForPurchase ? "Available" : "Unavailable"}
          </span>
        </uui-table-cell>
      </uui-table-row>
    `;
  }

  private _getStockBadgeClass(stock: number): string {
    if (stock === 0) return "badge-danger";
    if (stock < 10) return "badge-warning";
    return "badge-positive";
  }

  /**
   * Parses the variant's option key and returns a human-readable description
   * of the option value combination (e.g., "Red / Large / Cotton")
   */
  private _getVariantOptionDescription(variant: ProductVariantDto): string | null {
    if (!variant.variantOptionsKey || !this._product) return null;

    const guids = variant.variantOptionsKey.split('-');
    const descriptions: string[] = [];

    for (const guid of guids) {
      for (const option of this._product.productOptions) {
        const value = option.values.find(v => v.id === guid);
        if (value) {
          descriptions.push(value.name);
          break;
        }
      }
    }

    return descriptions.length > 0 ? descriptions.join(' / ') : null;
  }

  private async _handleSetDefaultVariant(variantId: string): Promise<void> {
    if (!this._product) return;

    // Skip if this variant is already the default
    const clickedVariant = this._product.variants.find(v => v.id === variantId);
    if (clickedVariant?.default) return;

    const productRootId = this._product.id;
    console.log("Setting default variant:", { productRootId, variantId });

    // Optimistic UI update - immediately show new default
    const updatedVariants = this._product.variants.map(v => ({
      ...v,
      default: v.id === variantId
    }));
    this._product = { ...this._product, variants: updatedVariants };

    try {
      const { error } = await MerchelloApi.setDefaultVariant(productRootId, variantId);
      console.log("API response:", { error });
      
      if (!error) {
        this.#notificationContext?.peek("positive", { data: { headline: "Default variant updated", message: "" } });
        // Reload to sync with server state
        await this.#workspaceContext?.reload();
        console.log("After reload, variants:", this._product?.variants.map(v => ({ id: v.id, name: v.name, default: v.default })));
      } else {
        console.error("Failed to set default variant:", error);
        this.#notificationContext?.peek("danger", { data: { headline: "Failed to set default variant", message: error.message } });
        // Revert optimistic update on error
        await this.#workspaceContext?.reload();
      }
    } catch (error) {
      console.error("Failed to set default variant:", error);
      this.#notificationContext?.peek("danger", { data: { headline: "Error", message: "An unexpected error occurred" } });
      // Revert optimistic update on error
      await this.#workspaceContext?.reload();
    }
  }

  private _renderOptionsTab(): unknown {
    const options = this._formData.productOptions ?? [];
    const isNew = this.#workspaceContext?.isNew ?? true;
    const variantOptions = options.filter((o) => o.isVariant);
    const estimatedVariants = variantOptions.reduce((acc, opt) => acc * (opt.values.length || 1), variantOptions.length > 0 ? 1 : 0);
    const maxOptions = this._optionSettings?.maxProductOptions ?? 5;
    const isAtMaxOptions = options.length >= maxOptions;

    return html`
      <div class="tab-content">
        ${isNew
          ? html`
              <uui-box class="info-banner warning">
                <div class="info-content">
                  <uui-icon name="icon-alert"></uui-icon>
                  <div>
                    <strong>Save Required</strong>
                    <p>You must save the product before adding options.</p>
                  </div>
                </div>
              </uui-box>
            `
          : html`
              <uui-box class="info-banner">
                <div class="info-content">
                  <uui-icon name="icon-lightbulb"></uui-icon>
                  <div>
                    <strong>About Product Options</strong>
                    <p>Options with "Generates Variants" create all combinations (e.g., 3 sizes × 4 colors = 12 variants). Options without this are add-ons that modify price.</p>
                  </div>
                </div>
              </uui-box>
            `}

        <div class="section-header">
          <div>
            <h3>Product Options <span class="option-count">${options.length}/${maxOptions}</span></h3>
            ${estimatedVariants > 0 ? html`<small class="hint">Will generate ${estimatedVariants} variant${estimatedVariants !== 1 ? 's' : ''}</small>` : nothing}
          </div>
          <uui-button
            look="primary"
            color="positive"
            label="Add Option"
            ?disabled=${isNew || isAtMaxOptions}
            @click=${this._addNewOption}>
            <uui-icon name="icon-add"></uui-icon>
            Add Option
          </uui-button>
        </div>

        ${options.length > 0
          ? html` <div class="options-list">${options.map((option) => this._renderOptionCard(option))}</div> `
          : !isNew
          ? html`
              <div class="empty-state">
                <uui-icon name="icon-layers"></uui-icon>
                <p>No options configured</p>
                <p class="hint">Use the <strong>Add Option</strong> button above to add options like Size, Color, or Material</p>
              </div>
            `
          : nothing}

      </div>
    `;
  }

  private _renderOptionCard(option: ProductOptionDto): unknown {
    return html`
      <uui-box class="option-card">
        <div class="option-header">
          <div class="option-info">
            <strong>${option.name}</strong>
            <span class="badge ${option.isVariant ? "badge-positive" : "badge-default"}">
              ${option.isVariant ? "Generates Variants" : "Add-on"}
            </span>
            ${option.optionUiAlias
              ? html` <span class="badge badge-default">${option.optionUiAlias}</span> `
              : nothing}
          </div>
          <div class="option-actions">
            <uui-button compact look="secondary" @click=${() => this._editOption(option)} label="Edit option" aria-label="Edit ${option.name}">
              <uui-icon name="icon-edit"></uui-icon>
            </uui-button>
            <uui-button compact look="primary" color="danger" @click=${() => this._deleteOption(option.id)} label="Delete option" aria-label="Delete ${option.name}">
              <uui-icon name="icon-trash"></uui-icon>
            </uui-button>
          </div>
        </div>

        <div class="option-values">
          ${option.values.map((value) => this._renderOptionValue(value, option.optionUiAlias))}
          ${option.values.length === 0 ? html`<p class="hint">No values added yet</p>` : nothing}
        </div>
      </uui-box>
    `;
  }

  private _renderOptionValue(value: ProductOptionValueDto, uiAlias: string | null): unknown {
    return html`
      <div class="option-value-chip">
        ${uiAlias === "colour" && value.hexValue
          ? html` <span class="color-swatch" style="background-color: ${value.hexValue}"></span> `
          : nothing}
        <span>${value.name}</span>
        ${value.priceAdjustment !== 0
          ? html`
              <span class="price-adjustment">
                ${value.priceAdjustment > 0 ? "+" : ""}$${value.priceAdjustment.toFixed(2)}
              </span>
            `
          : nothing}
      </div>
    `;
  }

  private async _addNewOption(): Promise<void> {
    if (!this.#modalManager || !this._optionSettings) return;

    const modal = this.#modalManager.open(this, MERCHELLO_OPTION_EDITOR_MODAL, {
      data: {
        option: undefined,
        settings: this._optionSettings,
      },
    });

    const result = await modal.onSubmit().catch(() => undefined);
    if (result?.saved && result.option) {
      // Add option to form data
      const options = this._formData.productOptions || [];
      this._formData = {
        ...this._formData,
        productOptions: [...options, result.option],
      };
      await this._saveOptions();
    }
  }

  private async _editOption(option: ProductOptionDto): Promise<void> {
    if (!this.#modalManager || !this._optionSettings) return;

    const modal = this.#modalManager.open(this, MERCHELLO_OPTION_EDITOR_MODAL, {
      data: {
        option: option,
        settings: this._optionSettings,
      },
    });

    const result = await modal.onSubmit().catch(() => undefined);
    if (result?.saved) {
      if (result.deleted) {
        await this._deleteOption(option.id);
      } else if (result.option) {
        // Update option in form data
        const options = this._formData.productOptions || [];
        const index = options.findIndex((o) => o.id === option.id);
        if (index !== -1) {
          options[index] = result.option;
          this._formData = { ...this._formData, productOptions: [...options] };
          await this._saveOptions();
        }
      }
    }
  }

  private async _deleteOption(optionId: string): Promise<void> {
    const option = this._formData.productOptions?.find((o) => o.id === optionId);
    const optionName = option?.name || "this option";

    const confirmed = confirm(`Are you sure you want to delete "${optionName}"? This action cannot be undone.`);
    if (!confirmed) return;

    const options = (this._formData.productOptions || []).filter((o) => o.id !== optionId);
    this._formData = { ...this._formData, productOptions: options };
    await this._saveOptions();
  }

  /**
   * Confirms with user before saving options that will regenerate variants.
   * Returns true if user confirms or no confirmation needed, false if cancelled.
   */
  private _confirmVariantRegeneration(): boolean {
    const options = this._formData.productOptions || [];
    const variantOptions = options.filter((o) => o.isVariant);
    const currentVariantCount = this._product?.variants.length ?? 0;

    // Calculate new variant count from cartesian product
    const newVariantCount = variantOptions.length > 0
      ? variantOptions.reduce((acc, opt) => acc * (opt.values.length || 1), 1)
      : 1;

    // Show warning if there are existing variants and variant options exist
    if (currentVariantCount > 0 && variantOptions.length > 0) {
      const message =
        `⚠️ WARNING: Saving these options will regenerate all product variants.\n\n` +
        `Current variants: ${currentVariantCount}\n` +
        `New variants to create: ${newVariantCount}\n\n` +
        `This will DELETE all existing variants and create new ones.\n` +
        `Any variant-specific data (pricing, stock levels, images, SKUs) will need to be re-entered manually.\n\n` +
        `Are you sure you want to continue?`;

      return confirm(message);
    }

    // Show warning if removing all variant options (will collapse to single variant)
    if (currentVariantCount > 1 && variantOptions.length === 0) {
      const message =
        `⚠️ WARNING: Removing all variant options will collapse this product to a single variant.\n\n` +
        `Current variants: ${currentVariantCount}\n` +
        `After save: 1 variant (default only)\n\n` +
        `${currentVariantCount - 1} variants will be DELETED.\n` +
        `Only the default variant will be kept.\n\n` +
        `Are you sure you want to continue?`;

      return confirm(message);
    }

    return true;
  }

  private async _saveOptions(): Promise<void> {
    if (!this._product?.id) return;

    // Confirm with user before potentially destructive operation
    if (!this._confirmVariantRegeneration()) {
      // User cancelled - reload to revert form state
      this.#workspaceContext?.reload();
      return;
    }

    try {
      const options = (this._formData.productOptions || []).map((opt, index) => ({
        id: opt.id,
        name: opt.name,
        alias: opt.alias ?? undefined,
        sortOrder: index,
        optionTypeAlias: opt.optionTypeAlias ?? undefined,
        optionUiAlias: opt.optionUiAlias ?? undefined,
        isVariant: opt.isVariant,
        values: opt.values.map((val, valIndex) => ({
          id: val.id,
          name: val.name,
          sortOrder: valIndex,
          hexValue: val.hexValue ?? undefined,
          mediaKey: val.mediaKey ?? undefined,
          priceAdjustment: val.priceAdjustment,
          costAdjustment: val.costAdjustment,
          skuSuffix: val.skuSuffix ?? undefined,
        })),
      }));

      this.#notificationContext?.peek("default", { data: { headline: "Saving options...", message: "Variants will be regenerated" } });

      const { data, error } = await MerchelloApi.saveProductOptions(this._product.id, options);

      // Prevent state updates if component was disconnected during async operation
      if (!this.#isConnected) return;

      if (!error && data) {
        this._formData = { ...this._formData, productOptions: data };
        this.#notificationContext?.peek("positive", { data: { headline: "Options saved", message: "Variants have been regenerated" } });
        this.#workspaceContext?.reload();
      } else if (error) {
        console.error("Failed to save options:", error);
        this._errorMessage = "Failed to save options: " + error.message;
        this.#notificationContext?.peek("danger", { data: { headline: "Failed to save options", message: error.message } });
      }
    } catch (error) {
      if (!this.#isConnected) return;
      console.error("Failed to save options:", error);
      this._errorMessage = error instanceof Error ? error.message : "Failed to save options";
      this.#notificationContext?.peek("danger", { data: { headline: "Error", message: "An unexpected error occurred" } });
    }
  }

  /**
   * Handles selling points change from the editable text list.
   */
  private _handleSellingPointsChange(e: CustomEvent): void {
    const target = e.target as any;
    const items = target?.items || [];
    this._formData = { ...this._formData, sellingPoints: items };
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

    const isNew = this.#workspaceContext?.isNew ?? true;
    const activeTab = this._getActiveTab();

    return html`
      <umb-body-layout header-fit-height main-no-padding>
        <!-- Header: back button + icon + name input -->
        <uui-button slot="header" compact href=${getProductsListHref()} label="Back" class="back-button">
          <uui-icon name="icon-arrow-left"></uui-icon>
        </uui-button>

        <div id="header" slot="header">
          <umb-icon name="icon-box"></umb-icon>
          <uui-input
            id="name-input"
            .value=${this._formData.rootName || ""}
            @input=${(e: Event) => this._handleInputChange("rootName", (e.target as HTMLInputElement).value)}
            placeholder=${isNew ? "Enter product name..." : "Product name"}
            ?invalid=${!!this._fieldErrors.rootName}
            aria-label="Product name"
            aria-required="true">
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

          ${activeTab === "details" ? this._renderDetailsTab() : nothing}
          ${activeTab === "media" ? this._renderMediaTab() : nothing}
          ${activeTab === "seo" ? this._renderSeoTab() : nothing}
          ${activeTab === "variants" ? this._renderVariantsTab() : nothing}
          ${activeTab === "options" ? this._renderOptionsTab() : nothing}
        </umb-body-layout>

        <!-- Footer with save button -->
        <umb-footer-layout slot="footer">
          <uui-button
            slot="actions"
            look="primary"
            color="positive"
            @click=${this._handleSave}
            ?disabled=${this._isSaving}
            label=${this._isSaving ? "Saving..." : isNew ? "Create Product" : "Save Changes"}>
            ${this._isSaving ? "Saving..." : isNew ? "Create Product" : "Save Changes"}
          </uui-button>
        </umb-footer-layout>
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

      umb-property-layout uui-select,
      umb-property-layout uui-input {
        width: 100%;
      }

      /* Tab content */
      .tab-content {
        display: flex;
        flex-direction: column;
        gap: var(--uui-size-space-5);
      }

      /* Warehouse toggle list */
      .warehouse-toggle-list {
        display: flex;
        flex-direction: column;
        gap: var(--uui-size-space-4);
      }

      .warehouse-toggle-list .toggle-field {
        display: flex;
        align-items: center;
        gap: var(--uui-size-space-3);
      }

      .warehouse-toggle-list label {
        font-weight: normal;
        color: var(--uui-color-text);
      }

      .hint {
        font-size: 0.875rem;
        color: var(--uui-color-text-alt);
        margin: 0;
      }

      /* Empty media state */
      .empty-media-state {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        padding: var(--uui-size-space-6);
        margin-top: var(--uui-size-space-3);
        background: var(--uui-color-surface);
        border: 2px dashed var(--uui-color-border);
        border-radius: var(--uui-border-radius);
        color: var(--uui-color-text-alt);
        text-align: center;
      }

      .empty-media-state uui-icon {
        font-size: 48px;
        opacity: 0.5;
        margin-bottom: var(--uui-size-space-2);
      }

      .empty-media-state p {
        margin: 0 0 var(--uui-size-space-1) 0;
        font-weight: 500;
      }

      .empty-media-state small {
        font-size: 0.875rem;
        color: var(--uui-color-text-alt);
      }

      .empty-media-state.small {
        padding: var(--uui-size-space-4);
      }

      .empty-media-state.small uui-icon {
        font-size: 32px;
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

      .info-banner.warning {
        background: var(--uui-color-warning-surface);
        border-left-color: var(--uui-color-warning);
      }

      .info-content {
        display: flex;
        gap: var(--uui-size-space-3);
        padding: var(--uui-size-space-3);
      }

      .info-content uui-icon {
        font-size: 24px;
        flex-shrink: 0;
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

      /* Section headers */
      .section-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: var(--uui-size-space-3);
      }

      .section-header h3 {
        margin: 0;
        font-size: 1.25rem;
      }

      .option-count {
        font-size: 0.875rem;
        font-weight: normal;
        color: var(--uui-color-text-alt);
        margin-left: var(--uui-size-space-2);
      }

      .section-description {
        color: var(--uui-color-text-alt);
        margin: var(--uui-size-space-2) 0;
      }

      /* Table styles */
      .table-container {
        overflow-x: auto;
      }

      .data-table {
        width: 100%;
      }

      .variant-name-cell {
        display: flex;
        flex-direction: column;
        gap: var(--uui-size-space-1);
      }

      .variant-link {
        font-weight: 500;
        color: var(--uui-color-interactive);
        text-decoration: none;
      }

      .variant-link:hover {
        text-decoration: underline;
        color: var(--uui-color-interactive-emphasis);
      }

      .variant-options-text {
        font-size: 0.8125rem;
        color: var(--uui-color-text-alt);
      }

      /* Options */
      .options-list {
        display: flex;
        flex-direction: column;
        gap: var(--uui-size-space-3);
      }

      .option-card {
        background: var(--uui-color-surface);
      }

      .option-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: var(--uui-size-space-3);
        border-bottom: 1px solid var(--uui-color-border);
      }

      .option-info {
        display: flex;
        align-items: center;
        gap: var(--uui-size-space-2);
        flex-wrap: wrap;
      }

      .option-actions {
        display: flex;
        gap: var(--uui-size-space-2);
      }

      .option-values {
        display: flex;
        flex-wrap: wrap;
        gap: var(--uui-size-space-2);
        padding: var(--uui-size-space-3);
        min-height: 60px;
        align-items: center;
      }

      .option-value-chip {
        display: flex;
        align-items: center;
        gap: var(--uui-size-space-1);
        padding: var(--uui-size-space-2) var(--uui-size-space-3);
        background: var(--uui-color-surface-alt);
        border-radius: var(--uui-border-radius);
        font-size: 0.875rem;
      }

      .color-swatch {
        width: 16px;
        height: 16px;
        border-radius: 50%;
        border: 1px solid var(--uui-color-border);
      }

      .price-adjustment {
        font-weight: 600;
        color: var(--uui-color-positive);
      }

      /* Empty state for options */
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

      .empty-state strong {
        color: var(--uui-color-text);
      }

      /* Google Search Preview - Updated 2024/2025 styling */
      .google-preview {
        font-family: Arial, sans-serif;
        max-width: 600px;
        padding: var(--uui-size-space-4);
        background: #fff;
        border: 1px solid var(--uui-color-border);
        border-radius: var(--uui-border-radius);
      }

      .google-preview-header {
        display: flex;
        align-items: center;
        gap: 12px;
        margin-bottom: 4px;
      }

      .google-preview-favicon {
        width: 28px;
        height: 28px;
        border-radius: 50%;
        background: #f1f3f4;
        display: flex;
        align-items: center;
        justify-content: center;
        flex-shrink: 0;
      }

      .google-preview-favicon uui-icon {
        font-size: 16px;
        color: #5f6368;
      }

      .google-preview-site {
        display: flex;
        flex-direction: column;
        min-width: 0;
      }

      .google-preview-site-name {
        font-size: 14px;
        color: #202124;
        line-height: 1.3;
      }

      .google-preview-url {
        font-size: 12px;
        color: #4d5156;
        line-height: 1.3;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }

      .google-preview-title {
        font-size: 20px;
        color: #1a0dab;
        line-height: 1.3;
        margin-bottom: 4px;
        word-wrap: break-word;
      }

      .google-preview-title:hover {
        text-decoration: underline;
        cursor: pointer;
      }

      .google-preview-description {
        font-size: 14px;
        color: #4d5156;
        line-height: 1.58;
        word-wrap: break-word;
      }

      .google-preview-stats {
        display: flex;
        gap: var(--uui-size-space-4);
        margin-top: var(--uui-size-space-3);
        font-size: 12px;
        flex-wrap: wrap;
      }

      .google-preview-stats .stat-ok {
        color: var(--uui-color-positive);
      }

      .google-preview-stats .stat-warning {
        color: var(--uui-color-warning);
      }

      /* Description editor styling */
      umb-property-dataset {
        display: block;
      }

      umb-property-dataset umb-property {
        --umb-property-layout-description-display: none;
      }
    `,
  ];
}

export default MerchelloProductDetailElement;

declare global {
  interface HTMLElementTagNameMap {
    "merchello-product-detail": MerchelloProductDetailElement;
  }
}
