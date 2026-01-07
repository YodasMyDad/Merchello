import { UmbContextBase } from "@umbraco-cms/backoffice/class-api";
import { UmbEntityContext } from "@umbraco-cms/backoffice/entity";
import type { UmbRoutableWorkspaceContext } from "@umbraco-cms/backoffice/workspace";
import {
  UMB_WORKSPACE_CONTEXT,
  UmbWorkspaceRouteManager,
} from "@umbraco-cms/backoffice/workspace";
import type { UmbControllerHost } from "@umbraco-cms/backoffice/controller-api";
import { UmbObjectState } from "@umbraco-cms/backoffice/observable-api";
import { MERCHELLO_CUSTOMERS_ENTITY_TYPE } from "@tree/types/tree.types.js";
import type { CustomerSegmentDetailDto } from "@customers/types/segment.types.js";
import { MerchelloApi } from "@api/merchello-api.js";

export const MERCHELLO_CUSTOMERS_WORKSPACE_ALIAS = "Merchello.Customers.Workspace";

/**
 * Unified workspace context for customers - handles both list and segment detail views.
 * Uses single entity type for consistent tree selection.
 */
export class MerchelloCustomersWorkspaceContext
  extends UmbContextBase
  implements UmbRoutableWorkspaceContext
{
  readonly workspaceAlias = MERCHELLO_CUSTOMERS_WORKSPACE_ALIAS;
  readonly routes: UmbWorkspaceRouteManager;

  #entityContext = new UmbEntityContext(this);

  // Segment detail state
  #segmentId?: string;
  #isNew = false;
  #segment = new UmbObjectState<CustomerSegmentDetailDto | undefined>(undefined);
  readonly segment = this.#segment.asObservable();

  constructor(host: UmbControllerHost) {
    super(host, UMB_WORKSPACE_CONTEXT.toString());

    this.#entityContext.setEntityType(MERCHELLO_CUSTOMERS_ENTITY_TYPE);
    this.#entityContext.setUnique("customers");

    this.routes = new UmbWorkspaceRouteManager(host);

    // Routes ordered by specificity (most specific first)
    // All routes nested under "edit/customers" so tree item path matching works
    // Tree item path: section/merchello/workspace/merchello-customers/edit/customers
    this.routes.setRoutes([
      // Create segment route
      {
        path: "edit/customers/segment/create",
        component: () => import("../components/segment-detail.element.js"),
        setup: () => {
          this.#isNew = true;
          this.#segmentId = undefined;
          this.#segment.setValue(this._createEmptySegment());
        },
      },
      // Segment detail route
      {
        path: "edit/customers/segment/:id",
        component: () => import("../components/segment-detail.element.js"),
        setup: (_component, info) => {
          this.#isNew = false;
          const id = info.match.params.id;
          this.loadSegment(id);
        },
      },
      // Customers list route
      {
        path: "edit/customers",
        component: () => import("../components/customers-workspace-editor.element.js"),
        setup: () => {
          // Reset segment state when viewing list
          this.#segmentId = undefined;
          this.#segment.setValue(undefined);
          this.#isNew = false;
        },
      },
      // Default redirect
      {
        path: "",
        redirectTo: "edit/customers",
      },
    ]);
  }

  getEntityType(): string {
    return MERCHELLO_CUSTOMERS_ENTITY_TYPE;
  }

  getUnique(): string | undefined {
    return this.#segmentId ?? "customers";
  }

  get isNew(): boolean {
    return this.#isNew;
  }

  // Segment loading and management

  async loadSegment(unique: string): Promise<void> {
    this.#segmentId = unique;
    const { data, error } = await MerchelloApi.getCustomerSegment(unique);
    if (error) {
      return;
    }
    this.#segment.setValue(data);
  }

  async reloadSegment(): Promise<void> {
    if (this.#segmentId) {
      await this.loadSegment(this.#segmentId);
    }
  }

  updateSegment(segment: CustomerSegmentDetailDto): void {
    this.#segment.setValue(segment);
    if (segment.id && this.#isNew) {
      this.#segmentId = segment.id;
      this.#isNew = false;
    }
  }

  private _createEmptySegment(): CustomerSegmentDetailDto {
    return {
      id: "",
      name: "",
      description: null,
      segmentType: "Manual",
      isActive: true,
      isSystemSegment: false,
      memberCount: 0,
      dateCreated: new Date().toISOString(),
      dateUpdated: new Date().toISOString(),
      criteria: null,
      matchMode: "All",
    };
  }
}

export { MerchelloCustomersWorkspaceContext as api };
