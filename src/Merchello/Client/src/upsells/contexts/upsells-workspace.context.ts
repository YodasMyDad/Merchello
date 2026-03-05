import { UmbContextBase } from "@umbraco-cms/backoffice/class-api";
import { UmbEntityContext } from "@umbraco-cms/backoffice/entity";
import type { UmbRoutableWorkspaceContext } from "@umbraco-cms/backoffice/workspace";
import {
  UMB_WORKSPACE_CONTEXT,
  UmbWorkspaceRouteManager,
} from "@umbraco-cms/backoffice/workspace";
import type { UmbControllerHost } from "@umbraco-cms/backoffice/controller-api";
import { UmbObjectState, UmbBooleanState } from "@umbraco-cms/backoffice/observable-api";
import { MERCHELLO_UPSELLS_ENTITY_TYPE } from "@tree/types/tree.types.js";
import { MerchelloTreeExpansionController } from "@tree/services/tree-expansion.controller.js";
import {
  UpsellStatus,
  UpsellDisplayLocation,
  UpsellSortBy,
  CheckoutUpsellMode,
  type UpsellDetailDto,
} from "@upsells/types/upsell.types.js";
import { MerchelloApi } from "@api/merchello-api.js";

export const MERCHELLO_UPSELLS_WORKSPACE_ALIAS = "Merchello.Upsells.Workspace";

export class MerchelloUpsellsWorkspaceContext
  extends UmbContextBase
  implements UmbRoutableWorkspaceContext
{
  readonly workspaceAlias = MERCHELLO_UPSELLS_WORKSPACE_ALIAS;
  readonly routes: UmbWorkspaceRouteManager;

  #entityContext = new UmbEntityContext(this);

  #upsellId?: string;
  #isNew = false;

  #upsell = new UmbObjectState<UpsellDetailDto | undefined>(undefined);
  readonly upsell = this.#upsell.asObservable();

  #isLoading = new UmbBooleanState(false);
  readonly isLoading = this.#isLoading.asObservable();

  #isSaving = new UmbBooleanState(false);
  readonly isSaving = this.#isSaving.asObservable();

  constructor(host: UmbControllerHost) {
    super(host, UMB_WORKSPACE_CONTEXT.toString());

    this.#entityContext.setEntityType(MERCHELLO_UPSELLS_ENTITY_TYPE);
    this.#entityContext.setUnique("upsells");

    new MerchelloTreeExpansionController(this, MERCHELLO_UPSELLS_ENTITY_TYPE, "upsells");

    this.routes = new UmbWorkspaceRouteManager(host);

    this.routes.setRoutes([
      {
        path: "edit/upsells/create",
        component: () => import("@upsells/components/upsell-detail.element.js"),
        setup: () => {
          this.#isNew = true;
          this.#upsellId = undefined;
          this.#upsell.setValue(this._createEmptyUpsell());
        },
      },
      {
        path: "edit/upsells/:id",
        component: () => import("@upsells/components/upsell-detail.element.js"),
        setup: (_component, info) => {
          this.#isNew = false;
          const id = info.match.params.id;
          this.load(id);
        },
      },
      {
        path: "edit/upsells",
        component: () => import("@upsells/components/upsells-workspace-editor.element.js"),
        setup: () => {
          this.#upsellId = undefined;
          this.#upsell.setValue(undefined);
          this.#isNew = false;
        },
      },
      {
        path: "",
        redirectTo: "edit/upsells",
      },
    ]);
  }

  getEntityType(): string {
    return MERCHELLO_UPSELLS_ENTITY_TYPE;
  }

  getUnique(): string | undefined {
    return this.#upsellId ?? "upsells";
  }

  get isNew(): boolean {
    return this.#isNew;
  }

  async load(unique: string): Promise<void> {
    this.#upsellId = unique;
    this.#isLoading.setValue(true);

    const { data, error } = await MerchelloApi.getUpsell(unique);

    if (error) {
      this.#isLoading.setValue(false);
      return;
    }

    this.#upsell.setValue(data);
    this.#isLoading.setValue(false);
  }

  async reload(): Promise<void> {
    if (this.#upsellId) {
      await this.load(this.#upsellId);
    }
  }

  updateUpsell(upsell: UpsellDetailDto): void {
    this.#upsell.setValue(upsell);
    if (upsell.id && this.#isNew) {
      this.#upsellId = upsell.id;
      this.#isNew = false;
    }
  }

  getUpsell(): UpsellDetailDto | undefined {
    return this.#upsell.getValue();
  }

  setIsSaving(saving: boolean): void {
    this.#isSaving.setValue(saving);
  }

  private _createEmptyUpsell(): UpsellDetailDto {
    const now = new Date().toISOString();
    return {
      id: "",
      name: "",
      description: undefined,
      heading: "",
      message: undefined,
      status: UpsellStatus.Draft,
      statusLabel: "Draft",
      statusColor: "default",
      displayLocation: UpsellDisplayLocation.Checkout,
      checkoutMode: CheckoutUpsellMode.Inline,
      sortBy: UpsellSortBy.BestSeller,
      maxProducts: 4,
      suppressIfInCart: true,
      priority: 1000,
      startsAt: now,
      endsAt: undefined,
      timezone: undefined,
      dateCreated: now,
      dateUpdated: now,
      triggerRules: [],
      recommendationRules: [],
      eligibilityRules: [],
    };
  }
}

export { MerchelloUpsellsWorkspaceContext as api };
