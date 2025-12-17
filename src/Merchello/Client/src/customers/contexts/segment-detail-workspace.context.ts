import type { UmbControllerHost } from "@umbraco-cms/backoffice/controller-api";
import { UmbControllerBase } from "@umbraco-cms/backoffice/class-api";
import type { UmbRoutableWorkspaceContext } from "@umbraco-cms/backoffice/workspace";
import { UMB_WORKSPACE_CONTEXT, UmbWorkspaceRouteManager } from "@umbraco-cms/backoffice/workspace";
import { UmbObjectState } from "@umbraco-cms/backoffice/observable-api";
import type { CustomerSegmentDetailDto } from "../types/segment.types.js";
import { MerchelloApi } from "@api/merchello-api.js";

export class MerchelloSegmentDetailWorkspaceContext extends UmbControllerBase implements UmbRoutableWorkspaceContext {
  readonly workspaceAlias = "Merchello.CustomerSegment.Detail.Workspace";
  readonly routes: UmbWorkspaceRouteManager;

  #segmentId?: string;
  #isNew = false;
  #segment = new UmbObjectState<CustomerSegmentDetailDto | undefined>(undefined);
  readonly segment = this.#segment.asObservable();

  constructor(host: UmbControllerHost) {
    super(host, UMB_WORKSPACE_CONTEXT.toString());
    this.routes = new UmbWorkspaceRouteManager(host);
    this.provideContext(UMB_WORKSPACE_CONTEXT, this);

    // Set up routes for create and edit
    this.routes.setRoutes([
      {
        path: "create",
        component: () => import("../components/segment-detail.element.js"),
        setup: () => {
          this.#isNew = true;
          this.#segmentId = undefined;
          this.#segment.setValue(this._createEmptySegment());
        },
      },
      {
        path: "edit/:id",
        component: () => import("../components/segment-detail.element.js"),
        setup: (_component, info) => {
          this.#isNew = false;
          const id = info.match.params.id;
          this.load(id);
        },
      },
    ]);
  }

  getEntityType(): string {
    return "merchello-customer-segment";
  }

  getUnique(): string | undefined {
    return this.#segmentId;
  }

  get isNew(): boolean {
    return this.#isNew;
  }

  async load(unique: string): Promise<void> {
    this.#segmentId = unique;
    const { data, error } = await MerchelloApi.getCustomerSegment(unique);
    if (error) {
      console.error("Failed to load segment:", error);
      return;
    }
    this.#segment.setValue(data);
  }

  async reload(): Promise<void> {
    if (this.#segmentId) {
      await this.load(this.#segmentId);
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

export { MerchelloSegmentDetailWorkspaceContext as api };
