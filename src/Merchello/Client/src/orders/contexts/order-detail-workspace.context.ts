import type { UmbControllerHost } from "@umbraco-cms/backoffice/controller-api";
import { UmbControllerBase } from "@umbraco-cms/backoffice/class-api";
import type { UmbRoutableWorkspaceContext } from "@umbraco-cms/backoffice/workspace";
import { UMB_WORKSPACE_CONTEXT, UmbWorkspaceRouteManager } from "@umbraco-cms/backoffice/workspace";
import { UmbObjectState } from "@umbraco-cms/backoffice/observable-api";
import type { OrderDetailDto } from "../types/order.types.js";
import { MerchelloApi } from "@api/merchello-api.js";

export class MerchelloOrderDetailWorkspaceContext extends UmbControllerBase implements UmbRoutableWorkspaceContext {
  readonly workspaceAlias = "Merchello.Order.Detail.Workspace";
  readonly routes: UmbWorkspaceRouteManager;

  #orderId?: string;
  #order = new UmbObjectState<OrderDetailDto | undefined>(undefined);
  readonly order = this.#order.asObservable();

  constructor(host: UmbControllerHost) {
    super(host, UMB_WORKSPACE_CONTEXT.toString());
    this.routes = new UmbWorkspaceRouteManager(host);
    this.provideContext(UMB_WORKSPACE_CONTEXT, this);

    // Set up routes - load the order detail element directly
    this.routes.setRoutes([
      {
        path: "edit/:id",
        component: () => import("../components/order-detail.element.js"),
        setup: (_component, info) => {
          const id = info.match.params.id;
          this.load(id);
        },
      },
    ]);
  }

  getEntityType(): string {
    return "merchello-order";
  }

  getUnique(): string | undefined {
    return this.#orderId;
  }

  async load(unique: string): Promise<void> {
    this.#orderId = unique;
    const { data, error } = await MerchelloApi.getOrder(unique);
    if (error) {
      console.error("Failed to load order:", error);
      return;
    }
    this.#order.setValue(data);
  }
}

export { MerchelloOrderDetailWorkspaceContext as api };
