import type { UmbControllerHost } from "@umbraco-cms/backoffice/controller-api";
import { UmbControllerBase } from "@umbraco-cms/backoffice/class-api";
import type { UmbRoutableWorkspaceContext } from "@umbraco-cms/backoffice/workspace";
import { UMB_WORKSPACE_CONTEXT, UmbWorkspaceRouteManager } from "@umbraco-cms/backoffice/workspace";
import { UmbObjectState, UmbBooleanState } from "@umbraco-cms/backoffice/observable-api";
import type { DiscountDetailDto, DiscountCategory } from "@discounts/types/discount.types.js";
import { MerchelloApi } from "@api/merchello-api.js";
import { DISCOUNT_ENTITY_TYPE } from "@shared/utils/navigation.js";

export class MerchelloDiscountDetailWorkspaceContext extends UmbControllerBase implements UmbRoutableWorkspaceContext {
  readonly workspaceAlias = "Merchello.Discount.Detail.Workspace";
  readonly routes: UmbWorkspaceRouteManager;

  #discountId?: string;
  #isNew = false;
  #category?: DiscountCategory;

  #discount = new UmbObjectState<DiscountDetailDto | undefined>(undefined);
  readonly discount = this.#discount.asObservable();

  #isLoading = new UmbBooleanState(false);
  readonly isLoading = this.#isLoading.asObservable();

  #isSaving = new UmbBooleanState(false);
  readonly isSaving = this.#isSaving.asObservable();

  constructor(host: UmbControllerHost) {
    super(host, UMB_WORKSPACE_CONTEXT.toString());
    this.routes = new UmbWorkspaceRouteManager(host);
    this.provideContext(UMB_WORKSPACE_CONTEXT, this);

    // Set up routes for create and edit
    this.routes.setRoutes([
      {
        path: "create",
        component: () => import("@discounts/components/discount-detail.element.js"),
        setup: () => {
          this.#isNew = true;
          this.#discountId = undefined;
          // Extract category from query string
          const searchParams = new URLSearchParams(window.location.search);
          const categoryParam = searchParams.get("category");
          this.#category = categoryParam ? parseInt(categoryParam, 10) : 0;
          this.#discount.setValue(this._createEmptyDiscount(this.#category));
        },
      },
      {
        path: "edit/:id",
        component: () => import("@discounts/components/discount-detail.element.js"),
        setup: (_component, info) => {
          this.#isNew = false;
          const id = info.match.params.id;
          this.load(id);
        },
      },
    ]);
  }

  getEntityType(): string {
    return DISCOUNT_ENTITY_TYPE;
  }

  getUnique(): string | undefined {
    return this.#discountId;
  }

  get isNew(): boolean {
    return this.#isNew;
  }

  get category(): DiscountCategory | undefined {
    return this.#category;
  }

  async load(unique: string): Promise<void> {
    this.#discountId = unique;
    this.#isLoading.setValue(true);

    const { data, error } = await MerchelloApi.getDiscount(unique);

    if (error) {
      console.error("Failed to load discount:", error);
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

  private _createEmptyDiscount(category: DiscountCategory): DiscountDetailDto {
    const now = new Date().toISOString();
    return {
      id: "",
      name: "",
      description: null,
      status: 0, // Draft
      category: category,
      method: 0, // Code
      code: null,
      valueType: 1, // Percentage
      value: 0,
      startsAt: now,
      endsAt: null,
      timezone: null,
      totalUsageLimit: null,
      perCustomerUsageLimit: null,
      perOrderUsageLimit: null,
      currentUsageCount: 0,
      requirementType: 0, // None
      requirementValue: null,
      canCombineWithProductDiscounts: true,
      canCombineWithOrderDiscounts: true,
      canCombineWithShippingDiscounts: true,
      priority: 1000,
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

export { MerchelloDiscountDetailWorkspaceContext as api };
