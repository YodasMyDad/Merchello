import { UmbContextBase } from "@umbraco-cms/backoffice/class-api";
import { UmbEntityContext } from "@umbraco-cms/backoffice/entity";
import type { UmbRoutableWorkspaceContext } from "@umbraco-cms/backoffice/workspace";
import {
  UMB_WORKSPACE_CONTEXT,
  UmbWorkspaceRouteManager,
} from "@umbraco-cms/backoffice/workspace";
import type { UmbControllerHost } from "@umbraco-cms/backoffice/controller-api";
import { UmbObjectState } from "@umbraco-cms/backoffice/observable-api";
import { MERCHELLO_WEBHOOKS_ENTITY_TYPE } from "@tree/types/tree.types.js";
import type { WebhookSubscriptionDetailDto } from "@webhooks/types/webhooks.types.js";
import { MerchelloApi } from "@api/merchello-api.js";

export const MERCHELLO_WEBHOOKS_WORKSPACE_ALIAS = "Merchello.Webhooks.Workspace";

/**
 * Workspace context for webhooks - handles both list and detail views.
 * Uses single entity type for consistent tree selection.
 */
export class MerchelloWebhooksWorkspaceContext
  extends UmbContextBase
  implements UmbRoutableWorkspaceContext
{
  readonly workspaceAlias = MERCHELLO_WEBHOOKS_WORKSPACE_ALIAS;
  readonly routes: UmbWorkspaceRouteManager;

  #entityContext = new UmbEntityContext(this);

  // Webhook subscription state
  #subscriptionId?: string;
  #subscription = new UmbObjectState<WebhookSubscriptionDetailDto | undefined>(undefined);
  readonly subscription = this.#subscription.asObservable();
  #isLoading = new UmbObjectState<boolean>(false);
  readonly isLoading = this.#isLoading.asObservable();
  #loadError = new UmbObjectState<string | null>(null);
  readonly loadError = this.#loadError.asObservable();

  constructor(host: UmbControllerHost) {
    super(host, UMB_WORKSPACE_CONTEXT.toString());

    this.#entityContext.setEntityType(MERCHELLO_WEBHOOKS_ENTITY_TYPE);
    this.#entityContext.setUnique("webhooks");

    this.routes = new UmbWorkspaceRouteManager(host);

    // Routes ordered by specificity (most specific first)
    // All routes nested under "edit/webhooks" so tree item path matching works
    this.routes.setRoutes([
      // Webhook detail route (view deliveries)
      {
        path: "edit/webhooks/:id",
        component: () => import("@webhooks/components/webhook-detail.element.js"),
        setup: (_component, info) => {
          const id = info.match.params.id;
          this.loadSubscription(id);
        },
      },
      // Webhooks list route
      {
        path: "edit/webhooks",
        component: () => import("@webhooks/components/webhooks-workspace-editor.element.js"),
        setup: () => {
          // Reset subscription state when viewing list
          this.#subscriptionId = undefined;
          this.#subscription.setValue(undefined);
          this.#isLoading.setValue(false);
          this.#loadError.setValue(null);
        },
      },
      // Default redirect
      {
        path: "",
        redirectTo: "edit/webhooks",
      },
    ]);
  }

  getEntityType(): string {
    return MERCHELLO_WEBHOOKS_ENTITY_TYPE;
  }

  getUnique(): string | undefined {
    return this.#subscriptionId ?? "webhooks";
  }

  // Subscription loading and management

  async loadSubscription(unique: string): Promise<void> {
    this.#subscriptionId = unique;
    this.#isLoading.setValue(true);
    this.#loadError.setValue(null);
    this.#subscription.setValue(undefined);

    const { data, error } = await MerchelloApi.getWebhookSubscription(unique);

    if (error || !data) {
      this.#loadError.setValue(error?.message ?? "Webhook subscription not found.");
      this.#isLoading.setValue(false);
      return;
    }

    this.#subscription.setValue(data);
    this.#isLoading.setValue(false);
  }

  async reloadSubscription(): Promise<void> {
    if (this.#subscriptionId) {
      await this.loadSubscription(this.#subscriptionId);
    }
  }

  updateSubscription(subscription: WebhookSubscriptionDetailDto): void {
    this.#subscription.setValue(subscription);
    this.#isLoading.setValue(false);
    this.#loadError.setValue(null);
    if (subscription.id) {
      this.#subscriptionId = subscription.id;
    }
  }

  clearSubscription(): void {
    this.#subscriptionId = undefined;
    this.#subscription.setValue(undefined);
    this.#isLoading.setValue(false);
    this.#loadError.setValue(null);
  }
}

export { MerchelloWebhooksWorkspaceContext as api };
