import { UmbContextBase } from "@umbraco-cms/backoffice/class-api";
import { UmbEntityContext } from "@umbraco-cms/backoffice/entity";
import type { UmbRoutableWorkspaceContext } from "@umbraco-cms/backoffice/workspace";
import {
  UMB_WORKSPACE_CONTEXT,
  UmbWorkspaceRouteManager,
} from "@umbraco-cms/backoffice/workspace";
import type { UmbControllerHost } from "@umbraco-cms/backoffice/controller-api";
import { UmbObjectState, UmbBooleanState, UmbStringState } from "@umbraco-cms/backoffice/observable-api";
import { MERCHELLO_NOTIFICATIONS_ENTITY_TYPE } from "@tree/types/tree.types.js";
import type { NotificationDiscoveryResultDto } from "@notifications/types/notifications.types.js";
import { MerchelloApi } from "@api/merchello-api.js";

export const MERCHELLO_NOTIFICATIONS_WORKSPACE_ALIAS = "Merchello.Notifications.Workspace";

/**
 * Workspace context for notifications discovery - developer tools view.
 * Shows all notification types and their registered handlers.
 */
export class MerchelloNotificationsWorkspaceContext
  extends UmbContextBase
  implements UmbRoutableWorkspaceContext
{
  readonly workspaceAlias = MERCHELLO_NOTIFICATIONS_WORKSPACE_ALIAS;
  readonly routes: UmbWorkspaceRouteManager;

  #entityContext = new UmbEntityContext(this);

  // State
  #data = new UmbObjectState<NotificationDiscoveryResultDto | undefined>(undefined);
  readonly data = this.#data.asObservable();

  #loading = new UmbBooleanState(false);
  readonly loading = this.#loading.asObservable();

  #loadError = new UmbObjectState<string | null>(null);
  readonly loadError = this.#loadError.asObservable();

  #searchTerm = new UmbStringState("");
  readonly searchTerm = this.#searchTerm.asObservable();

  constructor(host: UmbControllerHost) {
    super(host, UMB_WORKSPACE_CONTEXT.toString());

    this.#entityContext.setEntityType(MERCHELLO_NOTIFICATIONS_ENTITY_TYPE);
    this.#entityContext.setUnique("notifications");

    this.routes = new UmbWorkspaceRouteManager(host);

    this.routes.setRoutes([
      {
        path: "edit/notifications",
        component: () => import("@notifications/components/notifications-workspace-editor.element.js"),
        setup: () => {
          this.loadData();
        },
      },
      {
        path: "",
        redirectTo: "edit/notifications",
      },
    ]);
  }

  getEntityType(): string {
    return MERCHELLO_NOTIFICATIONS_ENTITY_TYPE;
  }

  getUnique(): string {
    return "notifications";
  }

  async loadData(force = false): Promise<void> {
    if (this.#loading.getValue()) {
      return;
    }

    // Skip if already loaded (cached on backend)
    if (!force && this.#data.getValue()) {
      return;
    }

    this.#loading.setValue(true);
    this.#loadError.setValue(null);

    const { data, error } = await MerchelloApi.getNotifications();
    if (error || !data) {
      this.#loadError.setValue(error?.message ?? "Failed to load notifications.");
      this.#loading.setValue(false);
      return;
    }

    this.#data.setValue(data);
    this.#loading.setValue(false);
  }

  setSearchTerm(term: string): void {
    this.#searchTerm.setValue(term);
  }
}

export { MerchelloNotificationsWorkspaceContext as api };
