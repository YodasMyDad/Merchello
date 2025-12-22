import type { UmbControllerHost } from "@umbraco-cms/backoffice/controller-api";
import { UmbControllerBase } from "@umbraco-cms/backoffice/class-api";
import type { UmbRoutableWorkspaceContext } from "@umbraco-cms/backoffice/workspace";
import { UMB_WORKSPACE_CONTEXT, UmbWorkspaceRouteManager } from "@umbraco-cms/backoffice/workspace";
import { UmbArrayState, UmbObjectState, UmbStringState } from "@umbraco-cms/backoffice/observable-api";
import type { ProductRootDetailDto } from "@products/types/product.types.js";
import type { ProductFilterGroupDto } from "@filters/types/filters.types.js";
import type { ElementTypeDto } from "@products/types/element-type.types.js";
import { MerchelloApi } from "@api/merchello-api.js";

export class MerchelloProductDetailWorkspaceContext extends UmbControllerBase implements UmbRoutableWorkspaceContext {
  readonly workspaceAlias = "Merchello.Product.Detail.Workspace";
  readonly routes: UmbWorkspaceRouteManager;

  #productRootId?: string;
  #isNew = false;
  #product = new UmbObjectState<ProductRootDetailDto | undefined>(undefined);
  readonly product = this.#product.asObservable();

  // Variant editing state - when set, we're editing a specific variant
  #variantId = new UmbStringState<string | undefined>(undefined);
  readonly variantId = this.#variantId.asObservable();

  // Element Type state for custom content properties
  #elementType = new UmbObjectState<ElementTypeDto | null>(null);
  readonly elementType = this.#elementType.asObservable();

  #elementPropertyValues = new UmbObjectState<Record<string, unknown>>({});
  readonly elementPropertyValues = this.#elementPropertyValues.asObservable();

  // Shared reference data - centralized to avoid duplicate API calls
  #filterGroups = new UmbArrayState<ProductFilterGroupDto>([], (g) => g.id);
  readonly filterGroups = this.#filterGroups.asObservable();
  #filterGroupsLoaded = false;

  constructor(host: UmbControllerHost) {
    super(host, UMB_WORKSPACE_CONTEXT.toString());
    this.routes = new UmbWorkspaceRouteManager(host);
    this.provideContext(UMB_WORKSPACE_CONTEXT, this);

    // Set up routes for create, edit, and variant editing
    this.routes.setRoutes([
      {
        path: "create",
        component: () => import("@products/components/product-detail.element.js"),
        setup: () => {
          this.#isNew = true;
          this.#productRootId = undefined;
          this.#variantId.setValue(undefined);
          this.#product.setValue(this._createEmptyProduct());
        },
      },
      {
        path: "edit/:id/variant/:variantId",
        component: () => import("@products/components/variant-detail.element.js"),
        setup: (_component, info) => {
          this.#isNew = false;
          const productId = info.match.params.id;
          const variantId = info.match.params.variantId;
          this.#variantId.setValue(variantId);
          this.load(productId);
        },
      },
      {
        path: "edit/:id",
        component: () => import("@products/components/product-detail.element.js"),
        setup: (_component, info) => {
          this.#isNew = false;
          this.#variantId.setValue(undefined);
          const id = info.match.params.id;
          this.load(id);
        },
      },
    ]);
  }

  getEntityType(): string {
    return "merchello-product";
  }

  getUnique(): string | undefined {
    return this.#productRootId;
  }

  get isNew(): boolean {
    return this.#isNew;
  }

  async load(unique: string): Promise<void> {
    this.#productRootId = unique;
    const { data, error } = await MerchelloApi.getProductDetail(unique);
    if (error) {
      console.error("Failed to load product:", error);
      return;
    }
    this.#product.setValue(data);
  }

  async reload(): Promise<void> {
    if (this.#productRootId) {
      await this.load(this.#productRootId);
    }
  }

  updateProduct(product: ProductRootDetailDto): void {
    this.#product.setValue(product);
    if (product.id && this.#isNew) {
      this.#productRootId = product.id;
      this.#isNew = false;
    }
    // Update element property values from product data
    if (product.elementProperties) {
      this.#elementPropertyValues.setValue(product.elementProperties);
    }
  }

  // Element Type Methods

  async loadElementType(): Promise<void> {
    const { data, error } = await MerchelloApi.getProductElementType();
    if (error) {
      console.error("Failed to load element type:", error);
      return;
    }
    this.#elementType.setValue(data ?? null);
  }

  // Shared Reference Data Methods

  /**
   * Loads filter groups if not already loaded.
   * Centralized here to avoid duplicate API calls from multiple components.
   */
  async loadFilterGroups(): Promise<void> {
    if (this.#filterGroupsLoaded) return;
    // Set flag immediately to prevent race conditions from concurrent calls
    this.#filterGroupsLoaded = true;

    const { data, error } = await MerchelloApi.getFilterGroups();
    if (error) {
      // Reset flag on error so retry is possible
      this.#filterGroupsLoaded = false;
      console.error("Failed to load filter groups:", error);
      return;
    }

    this.#filterGroups.setValue(data ?? []);
  }

  /** Gets the current filter groups synchronously */
  getFilterGroups(): ProductFilterGroupDto[] {
    return this.#filterGroups.getValue();
  }

  setElementPropertyValue(alias: string, value: unknown): void {
    const current = this.#elementPropertyValues.getValue();
    this.#elementPropertyValues.setValue({ ...current, [alias]: value });
  }

  setElementPropertyValues(values: Record<string, unknown>): void {
    this.#elementPropertyValues.setValue(values);
  }

  getElementPropertyValues(): Record<string, unknown> {
    return this.#elementPropertyValues.getValue();
  }

  private _createEmptyProduct(): ProductRootDetailDto {
    return {
      id: "",
      rootName: "",
      rootImages: [],
      rootUrl: null,
      googleShoppingFeedCategory: null,
      isDigitalProduct: false,
      defaultPackageConfigurations: [],
      description: null,
      metaDescription: null,
      pageTitle: null,
      noIndex: false,
      openGraphImage: null,
      canonicalUrl: null,
      taxGroupId: "",
      taxGroupName: null,
      productTypeId: "",
      productTypeName: null,
      collectionIds: [],
      warehouseIds: [],
      productOptions: [],
      variants: [],
      availableShippingOptions: [],
    };
  }
}

export { MerchelloProductDetailWorkspaceContext as api };
