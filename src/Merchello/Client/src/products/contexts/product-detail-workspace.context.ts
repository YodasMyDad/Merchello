import type { UmbControllerHost } from "@umbraco-cms/backoffice/controller-api";
import { UmbControllerBase } from "@umbraco-cms/backoffice/class-api";
import type { UmbRoutableWorkspaceContext } from "@umbraco-cms/backoffice/workspace";
import { UMB_WORKSPACE_CONTEXT, UmbWorkspaceRouteManager } from "@umbraco-cms/backoffice/workspace";
import { UmbObjectState } from "@umbraco-cms/backoffice/observable-api";
import type { ProductDetailDto } from "@products/types/product.types.js";

export class MerchelloProductDetailWorkspaceContext extends UmbControllerBase implements UmbRoutableWorkspaceContext {
  readonly workspaceAlias = "Merchello.Product.Detail.Workspace";
  readonly routes: UmbWorkspaceRouteManager;

  #productId?: string;
  #product = new UmbObjectState<ProductDetailDto | undefined>(undefined);
  readonly product = this.#product.asObservable();

  constructor(host: UmbControllerHost) {
    super(host, UMB_WORKSPACE_CONTEXT.toString());
    this.routes = new UmbWorkspaceRouteManager(host);
    this.provideContext(UMB_WORKSPACE_CONTEXT, this);

    this.routes.setRoutes([
      {
        path: "edit/:id",
        component: () => import("@products/components/product-detail.element.js"),
        setup: (_component, info) => {
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
    return this.#productId;
  }

  async load(unique: string): Promise<void> {
    this.#productId = unique;
    // TODO: Fetch product from API when endpoint is available
    // For now, set a placeholder product
    this.#product.setValue({
      id: unique,
      productRootId: unique,
      name: "Loading...",
      sku: null,
      price: 0,
    });
  }
}

export { MerchelloProductDetailWorkspaceContext as api };
