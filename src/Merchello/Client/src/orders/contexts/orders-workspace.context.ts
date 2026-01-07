import { UmbContextBase } from "@umbraco-cms/backoffice/class-api";
import { UmbEntityContext } from "@umbraco-cms/backoffice/entity";
import type { UmbRoutableWorkspaceContext } from "@umbraco-cms/backoffice/workspace";
import {
  UMB_WORKSPACE_CONTEXT,
  UmbWorkspaceRouteManager,
} from "@umbraco-cms/backoffice/workspace";
import type { UmbControllerHost } from "@umbraco-cms/backoffice/controller-api";
import { UmbObjectState } from "@umbraco-cms/backoffice/observable-api";
import { MERCHELLO_ORDERS_ENTITY_TYPE } from "@tree/types/tree.types.js";
import type { OrderDetailDto } from "@orders/types/order.types.js";
import { MerchelloApi } from "@api/merchello-api.js";

export const MERCHELLO_ORDERS_WORKSPACE_ALIAS = "Merchello.Orders.Workspace";

/**
 * Unified workspace context for orders - handles both list and detail views.
 * Uses single entity type for consistent tree selection.
 */
export class MerchelloOrdersWorkspaceContext
  extends UmbContextBase
  implements UmbRoutableWorkspaceContext
{
  readonly workspaceAlias = MERCHELLO_ORDERS_WORKSPACE_ALIAS;
  readonly routes: UmbWorkspaceRouteManager;

  #entityContext = new UmbEntityContext(this);

  // Order detail state
  #orderId?: string;
  #order = new UmbObjectState<OrderDetailDto | undefined>(undefined);
  readonly order = this.#order.asObservable();

  constructor(host: UmbControllerHost) {
    super(host, UMB_WORKSPACE_CONTEXT.toString());

    this.#entityContext.setEntityType(MERCHELLO_ORDERS_ENTITY_TYPE);
    this.#entityContext.setUnique("orders");

    this.routes = new UmbWorkspaceRouteManager(host);

    // Routes ordered by specificity (most specific first)
    // All routes nested under "edit/orders" so tree item path matching works
    // Tree item path: section/merchello/workspace/merchello-orders/edit/orders
    this.routes.setRoutes([
      // Order detail route (GUID parameter)
      {
        path: "edit/orders/:id",
        component: () => import("../components/order-detail.element.js"),
        setup: (_component, info) => {
          const id = info.match.params.id;
          this.load(id);
        },
      },
      // Orders list route
      {
        path: "edit/orders",
        component: () => import("../components/orders-workspace-editor.element.js"),
        setup: () => {
          // Reset detail state when viewing list
          this.#orderId = undefined;
          this.#order.setValue(undefined);
        },
      },
      // Default redirect
      {
        path: "",
        redirectTo: "edit/orders",
      },
    ]);
  }

  getEntityType(): string {
    return MERCHELLO_ORDERS_ENTITY_TYPE;
  }

  getUnique(): string | undefined {
    return this.#orderId ?? "orders";
  }

  // Order loading

  async load(unique: string): Promise<void> {
    this.#orderId = unique;
    const { data, error } = await MerchelloApi.getOrder(unique);
    if (error) {
      // Error already handled by API response - silently skip
      return;
    }
    this.#order.setValue(data);
  }

  async reload(): Promise<void> {
    if (this.#orderId) {
      await this.load(this.#orderId);
    }
  }
}

export { MerchelloOrdersWorkspaceContext as api };
