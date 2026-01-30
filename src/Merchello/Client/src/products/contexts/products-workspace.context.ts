import { UmbContextBase } from "@umbraco-cms/backoffice/class-api";
import { UmbEntityContext } from "@umbraco-cms/backoffice/entity";
import type { UmbRoutableWorkspaceContext } from "@umbraco-cms/backoffice/workspace";
import {
  UMB_WORKSPACE_CONTEXT,
  UmbWorkspaceRouteManager,
} from "@umbraco-cms/backoffice/workspace";
import type { UmbControllerHost } from "@umbraco-cms/backoffice/controller-api";
import { UmbArrayState, UmbObjectState, UmbStringState } from "@umbraco-cms/backoffice/observable-api";
import { MERCHELLO_PRODUCTS_ENTITY_TYPE } from "@tree/types/tree.types.js";
import type { ProductRootDetailDto } from "@products/types/product.types.js";
import type { ProductFilterGroupDto } from "@filters/types/filters.types.js";
import type { ElementTypeDto } from "@products/types/element-type.types.js";
import { MerchelloApi } from "@api/merchello-api.js";

export const MERCHELLO_PRODUCTS_WORKSPACE_ALIAS = "Merchello.Products.Workspace";

/**
 * Unified workspace context for products - handles both list and detail views.
 * Uses single entity type for consistent tree selection.
 */
export class MerchelloProductsWorkspaceContext
  extends UmbContextBase
  implements UmbRoutableWorkspaceContext
{
  readonly workspaceAlias = MERCHELLO_PRODUCTS_WORKSPACE_ALIAS;
  readonly routes: UmbWorkspaceRouteManager;

  #entityContext = new UmbEntityContext(this);

  // Product detail state
  #productRootId?: string;
  #isNew = false;
  #product = new UmbObjectState<ProductRootDetailDto | undefined>(undefined);
  readonly product = this.#product.asObservable();

  // Variant editing state
  #variantId = new UmbStringState<string | undefined>(undefined);
  readonly variantId = this.#variantId.asObservable();

  // Element Type state for custom content properties
  #elementType = new UmbObjectState<ElementTypeDto | null>(null);
  readonly elementType = this.#elementType.asObservable();

  #elementPropertyValues = new UmbObjectState<Record<string, unknown>>({});
  readonly elementPropertyValues = this.#elementPropertyValues.asObservable();

  // Shared reference data
  #filterGroups = new UmbArrayState<ProductFilterGroupDto>([], (g) => g.id);
  readonly filterGroups = this.#filterGroups.asObservable();
  #filterGroupsLoaded = false;

  constructor(host: UmbControllerHost) {
    super(host, UMB_WORKSPACE_CONTEXT.toString());

    this.#entityContext.setEntityType(MERCHELLO_PRODUCTS_ENTITY_TYPE);
    this.#entityContext.setUnique("products");

    this.routes = new UmbWorkspaceRouteManager(host);

    // Routes ordered by specificity (most specific first)
    // All routes nested under "edit/products" so tree item path matching works
    // Tree item path: section/merchello/workspace/merchello-products/edit/products
    this.routes.setRoutes([
      // Variant detail route
      {
        path: "edit/products/:id/variant/:variantId",
        component: () => import("../components/variant-detail.element.js"),
        setup: (_component, info) => {
          this.#isNew = false;
          const productId = info.match.params.id;
          const variantId = info.match.params.variantId;
          this.#variantId.setValue(variantId);
          this.load(productId);
        },
      },
      // Create product route (before :id to avoid matching "create" as an id)
      {
        path: "edit/products/create",
        component: () => import("../components/product-detail.element.js"),
        setup: () => {
          this.#isNew = true;
          this.#productRootId = undefined;
          this.#variantId.setValue(undefined);
          this.#product.setValue(this._createEmptyProduct());
        },
      },
      // Product detail route (GUID parameter)
      {
        path: "edit/products/:id",
        component: () => import("../components/product-detail.element.js"),
        setup: (_component, info) => {
          this.#isNew = false;
          this.#variantId.setValue(undefined);
          const id = info.match.params.id;
          this.load(id);
        },
      },
      // Products list route
      {
        path: "edit/products",
        component: () => import("../components/products-workspace-editor.element.js"),
        setup: () => {
          // Reset detail state when viewing list
          this.#productRootId = undefined;
          this.#product.setValue(undefined);
          this.#variantId.setValue(undefined);
          this.#isNew = false;
        },
      },
      // Default redirect
      {
        path: "",
        redirectTo: "edit/products",
      },
    ]);
  }

  getEntityType(): string {
    return MERCHELLO_PRODUCTS_ENTITY_TYPE;
  }

  getUnique(): string | undefined {
    return this.#productRootId ?? "products";
  }

  get isNew(): boolean {
    return this.#isNew;
  }

  // Product loading and management

  async load(unique: string): Promise<void> {
    this.#productRootId = unique;
    const { data, error } = await MerchelloApi.getProductDetail(unique);
    if (error) {
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
    if (product.elementProperties) {
      this.#elementPropertyValues.setValue(product.elementProperties);
    }
  }

  // Element Type Methods

  async loadElementType(): Promise<void> {
    const { data, error } = await MerchelloApi.getProductElementType();
    if (error) {
      return;
    }
    this.#elementType.setValue(data ?? null);
  }

  // Shared Reference Data Methods

  async loadFilterGroups(): Promise<void> {
    if (this.#filterGroupsLoaded) return;
    this.#filterGroupsLoaded = true;

    const { data, error } = await MerchelloApi.getFilterGroups();
    if (error) {
      this.#filterGroupsLoaded = false;
      return;
    }

    this.#filterGroups.setValue(data ?? []);
  }

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
      aggregateStockStatus: "InStock",
      aggregateStockStatusLabel: "",
      aggregateStockStatusCssClass: "",
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

export { MerchelloProductsWorkspaceContext as api };
