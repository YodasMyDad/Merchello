import type { UmbControllerHost } from "@umbraco-cms/backoffice/controller-api";
import { UmbControllerBase } from "@umbraco-cms/backoffice/class-api";
import type { UmbRoutableWorkspaceContext } from "@umbraco-cms/backoffice/workspace";
import { UMB_WORKSPACE_CONTEXT, UmbWorkspaceRouteManager } from "@umbraco-cms/backoffice/workspace";
import { UmbObjectState, UmbStringState } from "@umbraco-cms/backoffice/observable-api";
import type { ProductRootDetailDto } from "@products/types/product.types.js";
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
  }

  private _createEmptyProduct(): ProductRootDetailDto {
    return {
      id: "",
      rootName: "",
      rootImages: [],
      rootUrl: null,
      sellingPoints: [],
      videos: [],
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
      categoryIds: [],
      warehouseIds: [],
      productOptions: [],
      variants: [],
    };
  }
}

export { MerchelloProductDetailWorkspaceContext as api };
