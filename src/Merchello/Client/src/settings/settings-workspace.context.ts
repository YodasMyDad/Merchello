import type { UmbControllerHost } from "@umbraco-cms/backoffice/controller-api";
import { UmbControllerBase } from "@umbraco-cms/backoffice/class-api";
import type { UmbRoutableWorkspaceContext } from "@umbraco-cms/backoffice/workspace";
import { UMB_WORKSPACE_CONTEXT, UmbWorkspaceRouteManager } from "@umbraco-cms/backoffice/workspace";

export class MerchelloSettingsWorkspaceContext extends UmbControllerBase implements UmbRoutableWorkspaceContext {
  readonly workspaceAlias = "Merchello.Settings.Workspace";
  readonly routes: UmbWorkspaceRouteManager;

  constructor(host: UmbControllerHost) {
    super(host, UMB_WORKSPACE_CONTEXT.toString());
    this.routes = new UmbWorkspaceRouteManager(host);
    this.provideContext(UMB_WORKSPACE_CONTEXT, this);
  }

  getEntityType(): string {
    return "merchello-settings";
  }

  getUnique(): string | undefined {
    return "settings";
  }
}

export { MerchelloSettingsWorkspaceContext as api };
