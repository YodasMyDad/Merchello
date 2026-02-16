import { UmbContextBase } from "@umbraco-cms/backoffice/class-api";
import { UmbEntityContext } from "@umbraco-cms/backoffice/entity";
import type { UmbRoutableWorkspaceContext } from "@umbraco-cms/backoffice/workspace";
import {
  UMB_WORKSPACE_CONTEXT,
  UmbWorkspaceRouteManager,
} from "@umbraco-cms/backoffice/workspace";
import type { UmbControllerHost } from "@umbraco-cms/backoffice/controller-api";
import { UmbObjectState } from "@umbraco-cms/backoffice/observable-api";
import { MERCHELLO_EMAILS_ENTITY_TYPE } from "@tree/types/tree.types.js";
import type { EmailConfigurationDetailDto } from "@email/types/email.types.js";
import { MerchelloApi } from "@api/merchello-api.js";

export const MERCHELLO_EMAILS_WORKSPACE_ALIAS = "Merchello.Emails.Workspace";

/**
 * Workspace context for emails - handles both list and email editor views.
 * Uses single entity type for consistent tree selection.
 */
export class MerchelloEmailsWorkspaceContext
  extends UmbContextBase
  implements UmbRoutableWorkspaceContext
{
  readonly workspaceAlias = MERCHELLO_EMAILS_WORKSPACE_ALIAS;
  readonly routes: UmbWorkspaceRouteManager;

  #entityContext = new UmbEntityContext(this);

  // Email configuration state
  #emailId?: string;
  #isNew = false;
  #email = new UmbObjectState<EmailConfigurationDetailDto | undefined>(undefined);
  readonly email = this.#email.asObservable();
  #isLoading = new UmbObjectState<boolean>(false);
  readonly isLoading = this.#isLoading.asObservable();
  #loadError = new UmbObjectState<string | null>(null);
  readonly loadError = this.#loadError.asObservable();

  constructor(host: UmbControllerHost) {
    super(host, UMB_WORKSPACE_CONTEXT.toString());

    this.#entityContext.setEntityType(MERCHELLO_EMAILS_ENTITY_TYPE);
    this.#entityContext.setUnique("emails");

    this.routes = new UmbWorkspaceRouteManager(host);

    // Routes ordered by specificity (most specific first)
    // All routes nested under "edit/emails" so tree item path matching works
    this.routes.setRoutes([
      // Create email route
      {
        path: "edit/emails/create",
        component: () => import("@email/components/email-editor.element.js"),
        setup: () => {
          this.#isNew = true;
          this.#emailId = undefined;
          this.#isLoading.setValue(false);
          this.#loadError.setValue(null);
          this.#email.setValue(this._createEmptyEmail());
        },
      },
      // Email detail/edit route
      {
        path: "edit/emails/:id",
        component: () => import("@email/components/email-editor.element.js"),
        setup: (_component, info) => {
          this.#isNew = false;
          const id = info.match.params.id;
          this.loadEmail(id);
        },
      },
      // Emails list route
      {
        path: "edit/emails",
        component: () => import("@email/components/email-workspace-editor.element.js"),
        setup: () => {
          // Reset email state when viewing list
          this.#emailId = undefined;
          this.#email.setValue(undefined);
          this.#isNew = false;
          this.#isLoading.setValue(false);
          this.#loadError.setValue(null);
        },
      },
      // Default redirect
      {
        path: "",
        redirectTo: "edit/emails",
      },
    ]);
  }

  getEntityType(): string {
    return MERCHELLO_EMAILS_ENTITY_TYPE;
  }

  getUnique(): string | undefined {
    return this.#emailId ?? "emails";
  }

  get isNew(): boolean {
    return this.#isNew;
  }

  // Email loading and management

  async loadEmail(unique: string): Promise<void> {
    this.#emailId = unique;
    this.#isLoading.setValue(true);
    this.#loadError.setValue(null);
    this.#email.setValue(undefined);

    const { data, error } = await MerchelloApi.getEmailConfiguration(unique);
    if (error || !data) {
      this.#loadError.setValue(error?.message ?? "Email configuration not found.");
      this.#isLoading.setValue(false);
      return;
    }

    this.#email.setValue(data);
    this.#isLoading.setValue(false);
  }

  async reloadEmail(): Promise<void> {
    if (this.#emailId) {
      await this.loadEmail(this.#emailId);
    }
  }

  updateEmail(email: EmailConfigurationDetailDto): void {
    this.#email.setValue(email);
    this.#isLoading.setValue(false);
    this.#loadError.setValue(null);
    if (email.id && this.#isNew) {
      this.#emailId = email.id;
      this.#isNew = false;
    }
  }

  private _createEmptyEmail(): EmailConfigurationDetailDto {
    return {
      id: "",
      name: "",
      topic: "",
      topicDisplayName: null,
      topicCategory: null,
      enabled: true,
      templatePath: "",
      toExpression: "",
      subjectExpression: "",
      ccExpression: null,
      bccExpression: null,
      fromExpression: null,
      description: null,
      attachmentAliases: [],
      dateCreated: new Date().toISOString(),
      dateModified: new Date().toISOString(),
      totalSent: 0,
      totalFailed: 0,
      lastSentUtc: null,
    };
  }
}

export { MerchelloEmailsWorkspaceContext as api };
