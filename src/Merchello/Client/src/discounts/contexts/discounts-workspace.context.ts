import { UmbContextBase } from "@umbraco-cms/backoffice/class-api";
import { UmbEntityContext } from "@umbraco-cms/backoffice/entity";
import type { UmbRoutableWorkspaceContext } from "@umbraco-cms/backoffice/workspace";
import {
  UMB_WORKSPACE_CONTEXT,
  UmbWorkspaceRouteManager,
} from "@umbraco-cms/backoffice/workspace";
import type { UmbControllerHost } from "@umbraco-cms/backoffice/controller-api";
import { UmbObjectState, UmbBooleanState } from "@umbraco-cms/backoffice/observable-api";
import { MERCHELLO_DISCOUNTS_ENTITY_TYPE } from "@tree/types/tree.types.js";
import {
  DiscountMethod,
  DiscountStatus,
  DiscountValueType,
  DiscountCategory,
  DiscountRequirementType,
  type DiscountDetailDto,
} from "@discounts/types/discount.types.js";
import { MerchelloApi } from "@api/merchello-api.js";
import { getStoreSettings } from "@api/store-settings.js";

export const MERCHELLO_DISCOUNTS_WORKSPACE_ALIAS = "Merchello.Discounts.Workspace";

/**
 * Unified workspace context for discounts - handles both list and detail views.
 * Uses single entity type for consistent tree selection.
 */
export class MerchelloDiscountsWorkspaceContext
  extends UmbContextBase
  implements UmbRoutableWorkspaceContext
{
  readonly workspaceAlias = MERCHELLO_DISCOUNTS_WORKSPACE_ALIAS;
  readonly routes: UmbWorkspaceRouteManager;

  #entityContext = new UmbEntityContext(this);

  // Discount detail state
  #discountId?: string;
  #isNew = false;
  #category?: DiscountCategory;
  #defaultPriority = 1000;

  #discount = new UmbObjectState<DiscountDetailDto | undefined>(undefined);
  readonly discount = this.#discount.asObservable();

  #isLoading = new UmbBooleanState(false);
  readonly isLoading = this.#isLoading.asObservable();

  #isSaving = new UmbBooleanState(false);
  readonly isSaving = this.#isSaving.asObservable();

  constructor(host: UmbControllerHost) {
    super(host, UMB_WORKSPACE_CONTEXT.toString());

    this.#entityContext.setEntityType(MERCHELLO_DISCOUNTS_ENTITY_TYPE);
    this.#entityContext.setUnique("discounts");

    this.routes = new UmbWorkspaceRouteManager(host);
    this._loadSettings();

    // Routes ordered by specificity (most specific first)
    // All routes nested under "edit/discounts" so tree item path matching works
    // Tree item path: section/merchello/workspace/merchello-discounts/edit/discounts
    this.routes.setRoutes([
      // Create discount route (before :id to avoid matching "create" as an id)
      {
        path: "edit/discounts/create",
        component: () => import("../components/discount-detail.element.js"),
        setup: () => {
          this.#isNew = true;
          this.#discountId = undefined;
          // Extract category from query string
          const searchParams = new URLSearchParams(window.location.search);
          const categoryParam = searchParams.get("category") as DiscountCategory | null;
          this.#category = categoryParam ?? DiscountCategory.AmountOffProducts;
          this.#discount.setValue(this._createEmptyDiscount(this.#category));
        },
      },
      // Discount detail route (GUID parameter)
      {
        path: "edit/discounts/:id",
        component: () => import("../components/discount-detail.element.js"),
        setup: (_component, info) => {
          this.#isNew = false;
          const id = info.match.params.id;
          this.load(id);
        },
      },
      // Discounts list route
      {
        path: "edit/discounts",
        component: () => import("../components/discounts-workspace-editor.element.js"),
        setup: () => {
          // Reset detail state when viewing list
          this.#discountId = undefined;
          this.#discount.setValue(undefined);
          this.#isNew = false;
          this.#category = undefined;
        },
      },
      // Default redirect
      {
        path: "",
        redirectTo: "edit/discounts",
      },
    ]);
  }

  getEntityType(): string {
    return MERCHELLO_DISCOUNTS_ENTITY_TYPE;
  }

  getUnique(): string | undefined {
    return this.#discountId ?? "discounts";
  }

  get isNew(): boolean {
    return this.#isNew;
  }

  get category(): DiscountCategory | undefined {
    return this.#category;
  }

  // Discount loading and management

  async load(unique: string): Promise<void> {
    this.#discountId = unique;
    this.#isLoading.setValue(true);

    const { data, error } = await MerchelloApi.getDiscount(unique);

    if (error) {
      this.#isLoading.setValue(false);
      return;
    }

    this.#discount.setValue(data);
    this.#category = data?.category;
    this.#isLoading.setValue(false);
  }

  async reload(): Promise<void> {
    if (this.#discountId) {
      await this.load(this.#discountId);
    }
  }

  updateDiscount(discount: DiscountDetailDto): void {
    this.#discount.setValue(discount);
    if (discount.id && this.#isNew) {
      this.#discountId = discount.id;
      this.#isNew = false;
    }
  }

  getDiscount(): DiscountDetailDto | undefined {
    return this.#discount.getValue();
  }

  setIsSaving(saving: boolean): void {
    this.#isSaving.setValue(saving);
  }

  private async _loadSettings(): Promise<void> {
    const settings = await getStoreSettings();
    this.#defaultPriority = settings.defaultDiscountPriority;
  }

  private _createEmptyDiscount(category: DiscountCategory): DiscountDetailDto {
    const now = new Date().toISOString();
    return {
      id: "",
      name: "",
      description: null,
      status: DiscountStatus.Draft,
      statusLabel: "Draft",
      statusColor: "default",
      category: category,
      method: DiscountMethod.Code,
      code: null,
      valueType: DiscountValueType.Percentage,
      value: 0,
      startsAt: now,
      endsAt: null,
      timezone: null,
      totalUsageLimit: null,
      perCustomerUsageLimit: null,
      perOrderUsageLimit: null,
      currentUsageCount: 0,
      requirementType: DiscountRequirementType.None,
      requirementValue: null,
      canCombineWithProductDiscounts: true,
      canCombineWithOrderDiscounts: true,
      canCombineWithShippingDiscounts: true,
      applyAfterTax: false,
      priority: this.#defaultPriority,
      dateCreated: now,
      dateUpdated: now,
      createdBy: null,
      targetRules: [],
      eligibilityRules: [],
      buyXGetYConfig: null,
      freeShippingConfig: null,
    };
  }
}

export { MerchelloDiscountsWorkspaceContext as api };
