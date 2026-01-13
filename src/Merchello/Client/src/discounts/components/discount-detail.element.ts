import { LitElement, html, css, nothing } from "@umbraco-cms/backoffice/external/lit";
import { customElement, state } from "@umbraco-cms/backoffice/external/lit";
import { UmbElementMixin } from "@umbraco-cms/backoffice/element-api";
import { UMB_WORKSPACE_CONTEXT } from "@umbraco-cms/backoffice/workspace";
import { UMB_NOTIFICATION_CONTEXT } from "@umbraco-cms/backoffice/notification";
import type { UmbNotificationContext } from "@umbraco-cms/backoffice/notification";
import { UMB_MODAL_MANAGER_CONTEXT, UMB_CONFIRM_MODAL } from "@umbraco-cms/backoffice/modal";
import type { UmbModalManagerContext } from "@umbraco-cms/backoffice/modal";
import type { UmbRoute, UmbRouterSlotChangeEvent, UmbRouterSlotInitEvent } from "@umbraco-cms/backoffice/router";
import type { MerchelloDiscountsWorkspaceContext } from "@discounts/contexts/discounts-workspace.context.js";
import type {
  DiscountDetailDto,
  CreateDiscountDto,
  UpdateDiscountDto,
  DiscountTargetRuleDto,
  DiscountEligibilityRuleDto,
} from "@discounts/types/discount.types.js";
import {
  DiscountCategory,
  DiscountMethod,
  DiscountValueType,
  DiscountRequirementType,
  DiscountStatus,
  DISCOUNT_CATEGORIES,
  DISCOUNT_STATUS_LABELS,
  DISCOUNT_STATUS_COLORS,
} from "@discounts/types/discount.types.js";
import { MerchelloApi } from "@api/merchello-api.js";
import { getStoreSettings } from "@api/store-settings.js";
import { navigateToDiscountsList, getDiscountsListHref, replaceToDiscountDetail } from "@shared/utils/navigation.js";
import "./discount-summary-card.element.js";
import "./discount-performance.element.js";
import "./eligibility-rule-builder.element.js";
import "./target-rule-builder.element.js";

@customElement("merchello-discount-detail")
export class MerchelloDiscountDetailElement extends UmbElementMixin(LitElement) {
  @state() private _discount?: DiscountDetailDto;
  @state() private _isNew = true;
  @state() private _isLoading = true;
  @state() private _isSaving = false;
  @state() private _validationErrors: Map<string, string> = new Map();
  @state() private _codeAvailable: boolean | null = null;
  @state() private _isGeneratingCode = false;
  @state() private _targetRules: DiscountTargetRuleDto[] = [];
  @state() private _eligibilityRules: DiscountEligibilityRuleDto[] = [];
  @state() private _discountCodeLength = 8;

  // Router state for URL-based tab navigation
  @state() private _routes: UmbRoute[] = [];
  @state() private _routerPath?: string;
  @state() private _activePath = "";

  #workspaceContext?: MerchelloDiscountsWorkspaceContext;
  #notificationContext?: UmbNotificationContext;
  #modalManager?: UmbModalManagerContext;
  #codeCheckDebounce?: ReturnType<typeof setTimeout>;

  constructor() {
    super();
    this._initRoutes();
    this._loadSettings();

    this.consumeContext(UMB_WORKSPACE_CONTEXT, (context) => {
      this.#workspaceContext = context as MerchelloDiscountsWorkspaceContext;
      this._isNew = this.#workspaceContext.isNew;

      this.observe(this.#workspaceContext.discount, (discount) => {
        this._discount = discount;
        this._targetRules = discount?.targetRules ?? [];
        this._eligibilityRules = discount?.eligibilityRules ?? [];
        this._isLoading = false;
      });

      this.observe(this.#workspaceContext.isLoading, (isLoading) => {
        this._isLoading = isLoading;
      });

      this.observe(this.#workspaceContext.isSaving, (isSaving) => {
        this._isSaving = isSaving;
      });
    });

    this.consumeContext(UMB_NOTIFICATION_CONTEXT, (context) => {
      this.#notificationContext = context;
    });

    this.consumeContext(UMB_MODAL_MANAGER_CONTEXT, (context) => {
      this.#modalManager = context;
    });
  }

  override disconnectedCallback(): void {
    super.disconnectedCallback();
    // Clear debounce timeout to prevent memory leak
    if (this.#codeCheckDebounce) {
      clearTimeout(this.#codeCheckDebounce);
      this.#codeCheckDebounce = undefined;
    }
  }

  private async _loadSettings(): Promise<void> {
    const settings = await getStoreSettings();
    this._discountCodeLength = settings.discountCodeLength;
  }

  // ============================================
  // Router Methods
  // ============================================

  /**
   * Initialize routes for URL-based tab navigation
   */
  private _initRoutes(): void {
    const stubComponent = (): HTMLElement => document.createElement("div");

    this._routes = [
      { path: "tab/details", component: stubComponent },
      { path: "tab/targets", component: stubComponent },
      { path: "tab/requirements", component: stubComponent },
      { path: "tab/eligibility", component: stubComponent },
      { path: "tab/combinations", component: stubComponent },
      { path: "tab/schedule", component: stubComponent },
      { path: "tab/performance", component: stubComponent },
      { path: "", redirectTo: "tab/details" },
    ];
  }

  /**
   * Get the currently active tab from the router path
   */
  private _getActiveTab(): string {
    if (this._activePath.includes("tab/targets")) return "targets";
    if (this._activePath.includes("tab/requirements")) return "requirements";
    if (this._activePath.includes("tab/eligibility")) return "eligibility";
    if (this._activePath.includes("tab/combinations")) return "combinations";
    if (this._activePath.includes("tab/schedule")) return "schedule";
    if (this._activePath.includes("tab/performance")) return "performance";
    return "details";
  }

  /**
   * Handle router slot initialization
   */
  private _onRouterInit(event: UmbRouterSlotInitEvent): void {
    this._routerPath = event.target.absoluteRouterPath;
  }

  /**
   * Handle router slot path changes
   */
  private _onRouterChange(event: UmbRouterSlotChangeEvent): void {
    this._activePath = event.target.localActiveViewPath || "";
  }

  private _getCategoryInfo(category: DiscountCategory): typeof DISCOUNT_CATEGORIES[number] | undefined {
    return DISCOUNT_CATEGORIES.find((c) => c.category === category);
  }

  private _getMethodOptions(): Array<{ name: string; value: string; selected: boolean }> {
    return [
      { name: "Discount code", value: DiscountMethod.Code, selected: this._discount?.method === DiscountMethod.Code },
      { name: "Automatic discount", value: DiscountMethod.Automatic, selected: this._discount?.method === DiscountMethod.Automatic },
    ];
  }

  private _getValueTypeOptions(): Array<{ name: string; value: string; selected: boolean }> {
    const options: Array<{ name: string; value: string; selected: boolean }> = [
      { name: "Percentage", value: DiscountValueType.Percentage, selected: this._discount?.valueType === DiscountValueType.Percentage },
      { name: "Fixed amount", value: DiscountValueType.FixedAmount, selected: this._discount?.valueType === DiscountValueType.FixedAmount },
    ];
    if (this._discount?.category === DiscountCategory.BuyXGetY) {
      options.push({ name: "Free", value: DiscountValueType.Free, selected: this._discount?.valueType === DiscountValueType.Free });
    }
    return options;
  }

  private _getRequirementTypeOptions(): Array<{ name: string; value: string; selected: boolean }> {
    return [
      { name: "No minimum requirements", value: DiscountRequirementType.None, selected: this._discount?.requirementType === DiscountRequirementType.None },
      { name: "Minimum purchase amount", value: DiscountRequirementType.MinimumPurchaseAmount, selected: this._discount?.requirementType === DiscountRequirementType.MinimumPurchaseAmount },
      { name: "Minimum quantity of items", value: DiscountRequirementType.MinimumQuantity, selected: this._discount?.requirementType === DiscountRequirementType.MinimumQuantity },
    ];
  }

  private _getHeadline(): string {
    if (this._isNew) {
      const categoryInfo = this._getCategoryInfo(this._discount?.category ?? DiscountCategory.AmountOffProducts);
      return `Create ${categoryInfo?.label ?? "discount"}`;
    }
    return this._discount?.name ?? "Edit discount";
  }

  private _handleInputChange(field: keyof DiscountDetailDto, value: unknown): void {
    if (!this._discount) return;

    const updated = { ...this._discount, [field]: value };
    this.#workspaceContext?.updateDiscount(updated);
    this._validationErrors.delete(field);
    this.requestUpdate();
  }

  private _handleCodeInput(e: Event): void {
    const input = e.target as HTMLInputElement;
    const code = input.value.toUpperCase().replace(/[^A-Z0-9]/g, "");
    this._handleInputChange("code", code || null);

    // Debounce code availability check
    if (this.#codeCheckDebounce) {
      clearTimeout(this.#codeCheckDebounce);
    }

    if (code) {
      this.#codeCheckDebounce = setTimeout(() => {
        this._checkCodeAvailability(code);
      }, 500);
    } else {
      this._codeAvailable = null;
    }
  }

  private async _checkCodeAvailability(code: string): Promise<void> {
    const { data, error } = await MerchelloApi.checkDiscountCodeAvailable(
      code,
      this._isNew ? undefined : this._discount?.id
    );

    if (!error && data) {
      this._codeAvailable = data.available;
    }
  }

  private async _handleGenerateCode(): Promise<void> {
    this._isGeneratingCode = true;
    const { data, error } = await MerchelloApi.generateDiscountCode(this._discountCodeLength);
    this._isGeneratingCode = false;

    if (!error && data) {
      this._handleInputChange("code", data.code);
      this._codeAvailable = true;
    }
  }

  private _handleTargetRulesChange(e: CustomEvent<{ rules: DiscountTargetRuleDto[] }>): void {
    this._targetRules = e.detail.rules;
  }

  private _handleEligibilityRulesChange(e: CustomEvent<{ rules: DiscountEligibilityRuleDto[] }>): void {
    this._eligibilityRules = e.detail.rules;
  }

  /**
   * UX validation only - checks for required fields to provide immediate feedback.
   * Business rule validation (value ranges, percentages) is handled by backend.
   */
  private _validate(): boolean {
    this._validationErrors.clear();

    // UX: Required field indicators
    if (!this._discount?.name?.trim()) {
      this._validationErrors.set("name", "Name is required");
    }

    if (this._discount?.method === DiscountMethod.Code && !this._discount.code?.trim()) {
      this._validationErrors.set("code", "Code is required for code-based discounts");
    }

    // Note: Business rules like value > 0, percentage <= 100, requirementValue are
    // validated by backend and errors returned in API response

    this.requestUpdate();
    return this._validationErrors.size === 0;
  }

  private async _handleSave(): Promise<void> {
    if (!this._discount || !this._validate()) {
      this.#notificationContext?.peek("warning", {
        data: { headline: "Validation failed", message: "Please fix the errors before saving" },
      });
      return;
    }

    this.#workspaceContext?.setIsSaving(true);

    if (this._isNew) {
      const createDto: CreateDiscountDto = {
        name: this._discount.name,
        description: this._discount.description,
        category: this._discount.category,
        method: this._discount.method,
        code: this._discount.code,
        valueType: this._discount.valueType,
        value: this._discount.value,
        startsAt: this._discount.startsAt,
        endsAt: this._discount.endsAt,
        timezone: this._discount.timezone,
        totalUsageLimit: this._discount.totalUsageLimit,
        perCustomerUsageLimit: this._discount.perCustomerUsageLimit,
        perOrderUsageLimit: this._discount.perOrderUsageLimit,
        requirementType: this._discount.requirementType,
        requirementValue: this._discount.requirementValue,
        canCombineWithProductDiscounts: this._discount.canCombineWithProductDiscounts,
        canCombineWithOrderDiscounts: this._discount.canCombineWithOrderDiscounts,
        canCombineWithShippingDiscounts: this._discount.canCombineWithShippingDiscounts,
        applyAfterTax: this._discount.applyAfterTax,
        priority: this._discount.priority,
        targetRules: this._targetRules.map((r) => ({
          targetType: r.targetType,
          targetIds: r.targetIds,
          isExclusion: r.isExclusion,
        })),
        eligibilityRules: this._eligibilityRules.map((r) => ({
          eligibilityType: r.eligibilityType,
          eligibilityIds: r.eligibilityIds,
        })),
      };

      const { data, error } = await MerchelloApi.createDiscount(createDto);
      this.#workspaceContext?.setIsSaving(false);

      if (error) {
        this.#notificationContext?.peek("danger", {
          data: { headline: "Failed to create discount", message: error.message },
        });
        return;
      }

      if (data) {
        this.#workspaceContext?.updateDiscount(data);
        this._isNew = false; // Switch to edit mode after successful creation
        this.#notificationContext?.peek("positive", {
          data: { headline: "Discount created", message: `${data.name} has been created` },
        });
        // Navigate to the edit page for the newly created discount
        replaceToDiscountDetail(data.id);
      }
    } else {
      const updateDto: UpdateDiscountDto = {
        id: this._discount.id,
        name: this._discount.name,
        description: this._discount.description,
        category: this._discount.category,
        method: this._discount.method,
        code: this._discount.code,
        valueType: this._discount.valueType,
        value: this._discount.value,
        startsAt: this._discount.startsAt,
        endsAt: this._discount.endsAt,
        timezone: this._discount.timezone,
        totalUsageLimit: this._discount.totalUsageLimit,
        perCustomerUsageLimit: this._discount.perCustomerUsageLimit,
        perOrderUsageLimit: this._discount.perOrderUsageLimit,
        requirementType: this._discount.requirementType,
        requirementValue: this._discount.requirementValue,
        canCombineWithProductDiscounts: this._discount.canCombineWithProductDiscounts,
        canCombineWithOrderDiscounts: this._discount.canCombineWithOrderDiscounts,
        canCombineWithShippingDiscounts: this._discount.canCombineWithShippingDiscounts,
        applyAfterTax: this._discount.applyAfterTax,
        priority: this._discount.priority,
        targetRules: this._targetRules.map((r) => ({
          targetType: r.targetType,
          targetIds: r.targetIds,
          isExclusion: r.isExclusion,
        })),
        eligibilityRules: this._eligibilityRules.map((r) => ({
          eligibilityType: r.eligibilityType,
          eligibilityIds: r.eligibilityIds,
        })),
      };

      const { data, error } = await MerchelloApi.updateDiscount(this._discount.id, updateDto);
      this.#workspaceContext?.setIsSaving(false);

      if (error) {
        this.#notificationContext?.peek("danger", {
          data: { headline: "Failed to update discount", message: error.message },
        });
        return;
      }

      if (data) {
        this.#workspaceContext?.updateDiscount(data);
        this.#notificationContext?.peek("positive", {
          data: { headline: "Discount saved", message: `${data.name} has been updated` },
        });
      }
    }
  }

  private async _handleDelete(): Promise<void> {
    if (!this._discount?.id) return;

    const modalContext = this.#modalManager?.open(this, UMB_CONFIRM_MODAL, {
      data: {
        headline: "Delete Discount",
        content: `Are you sure you want to delete "${this._discount.name}"? This action cannot be undone.`,
        confirmLabel: "Delete",
        color: "danger",
      },
    });

    try {
      await modalContext?.onSubmit();
    } catch {
      return; // User cancelled
    }

    const { error } = await MerchelloApi.deleteDiscount(this._discount.id);

    if (error) {
      this.#notificationContext?.peek("danger", {
        data: { headline: "Failed to delete discount", message: error.message },
      });
      return;
    }

    this.#notificationContext?.peek("positive", {
      data: { headline: "Discount deleted", message: `${this._discount.name} has been deleted` },
    });
    navigateToDiscountsList();
  }

  private async _handleActivate(): Promise<void> {
    if (!this._discount?.id) return;

    const { data, error } = await MerchelloApi.activateDiscount(this._discount.id);

    if (error) {
      this.#notificationContext?.peek("danger", {
        data: { headline: "Failed to activate discount", message: error.message },
      });
      return;
    }

    if (data) {
      this.#workspaceContext?.updateDiscount(data);
      this.#notificationContext?.peek("positive", {
        data: { headline: "Discount activated", message: `${data.name} is now active` },
      });
    }
  }

  private async _handleDeactivate(): Promise<void> {
    if (!this._discount?.id) return;

    const { data, error } = await MerchelloApi.deactivateDiscount(this._discount.id);

    if (error) {
      this.#notificationContext?.peek("danger", {
        data: { headline: "Failed to deactivate discount", message: error.message },
      });
      return;
    }

    if (data) {
      this.#workspaceContext?.updateDiscount(data);
      this.#notificationContext?.peek("positive", {
        data: { headline: "Discount deactivated", message: `${data.name} has been disabled` },
      });
    }
  }

  private _renderDetailsTab(): unknown {
    return html`
      <uui-box headline="Basic Information">
        <div class="form-grid">
          <umb-property-layout
            label="Name"
            ?mandatory=${true}
            ?invalid=${this._validationErrors.has("name")}>
            <uui-input
              slot="editor"
              .value=${this._discount?.name ?? ""}
              @input=${(e: Event) => this._handleInputChange("name", (e.target as HTMLInputElement).value)}
              placeholder="e.g., Summer Sale 20% Off"
              ?invalid=${this._validationErrors.has("name")}
            ></uui-input>
          </umb-property-layout>

          <umb-property-layout
            label="Description"
            description="Internal description for this discount">
            <uui-textarea
              slot="editor"
              .value=${this._discount?.description ?? ""}
              @input=${(e: Event) => this._handleInputChange("description", (e.target as HTMLTextAreaElement).value)}
              placeholder="Internal description for this discount"
            ></uui-textarea>
          </umb-property-layout>
        </div>
      </uui-box>

      <uui-box headline="Discount Method">
        <div class="form-grid">
          <umb-property-layout label="Method">
            <uui-select
              slot="editor"
              .options=${this._getMethodOptions()}
              .value=${this._discount?.method ?? DiscountMethod.Code}
              @change=${(e: Event) =>
                this._handleInputChange("method", (e.target as HTMLSelectElement).value as DiscountMethod)}
            ></uui-select>
          </umb-property-layout>

          ${this._discount?.method === DiscountMethod.Code
            ? html`
                <umb-property-layout
                  label="Discount Code"
                  ?mandatory=${true}
                  ?invalid=${this._validationErrors.has("code") || this._codeAvailable === false}>
                  <div slot="editor" class="code-input-row">
                    <uui-input
                      .value=${this._discount?.code ?? ""}
                      @input=${this._handleCodeInput}
                      placeholder="e.g., SUMMER20"
                      ?invalid=${this._validationErrors.has("code") || this._codeAvailable === false}
                    ></uui-input>
                    <uui-button
                      look="secondary"
                      @click=${this._handleGenerateCode}
                      ?disabled=${this._isGeneratingCode}
                    >
                      ${this._isGeneratingCode ? "Generating..." : "Generate"}
                    </uui-button>
                  </div>
                  ${this._validationErrors.has("code")
                    ? html`<div class="error-message">${this._validationErrors.get("code")}</div>`
                    : this._codeAvailable === false
                      ? html`<div class="error-message">This code is already in use</div>`
                      : this._codeAvailable === true
                        ? html`<div class="success-message">Code is available</div>`
                        : nothing}
                </umb-property-layout>
              `
            : nothing}
        </div>
      </uui-box>

      <uui-box headline="Discount Value">
        <div class="form-grid">
          <umb-property-layout label="Value Type">
            <uui-select
              slot="editor"
              .options=${this._getValueTypeOptions()}
              .value=${this._discount?.valueType ?? DiscountValueType.Percentage}
              @change=${(e: Event) =>
                this._handleInputChange("valueType", (e.target as HTMLSelectElement).value as DiscountValueType)}
            ></uui-select>
          </umb-property-layout>

          ${this._discount?.valueType !== DiscountValueType.Free
            ? html`
                <umb-property-layout
                  label=${this._discount?.valueType === DiscountValueType.Percentage ? "Percentage (%)" : "Amount"}
                  ?mandatory=${true}
                  ?invalid=${this._validationErrors.has("value")}>
                  <uui-input
                    slot="editor"
                    type="number"
                    min="0"
                    max=${this._discount?.valueType === DiscountValueType.Percentage ? "100" : ""}
                    step="0.01"
                    .value=${String(this._discount?.value ?? "")}
                    @input=${(e: Event) =>
                      this._handleInputChange("value", parseFloat((e.target as HTMLInputElement).value) || 0)}
                    ?invalid=${this._validationErrors.has("value")}
                  ></uui-input>
                </umb-property-layout>
              `
            : nothing}
        </div>
      </uui-box>
    `;
  }

  private _renderRequirementsTab(): unknown {
    return html`
      <uui-box headline="Minimum Requirements">
        <div class="form-grid">
          <umb-property-layout label="Requirement Type">
            <uui-select
              slot="editor"
              .options=${this._getRequirementTypeOptions()}
              .value=${this._discount?.requirementType ?? DiscountRequirementType.None}
              @change=${(e: Event) =>
                this._handleInputChange("requirementType", (e.target as HTMLSelectElement).value as DiscountRequirementType)}
            ></uui-select>
          </umb-property-layout>

          ${this._discount?.requirementType !== DiscountRequirementType.None
            ? html`
                <umb-property-layout
                  label=${this._discount?.requirementType === DiscountRequirementType.MinimumPurchaseAmount ? "Minimum Amount" : "Minimum Quantity"}
                  ?mandatory=${true}
                  ?invalid=${this._validationErrors.has("requirementValue")}>
                  <uui-input
                    slot="editor"
                    type="number"
                    min="0"
                    step=${this._discount?.requirementType === DiscountRequirementType.MinimumPurchaseAmount ? "0.01" : "1"}
                    .value=${String(this._discount?.requirementValue ?? "")}
                    @input=${(e: Event) =>
                      this._handleInputChange("requirementValue", parseFloat((e.target as HTMLInputElement).value) || null)}
                    ?invalid=${this._validationErrors.has("requirementValue")}
                  ></uui-input>
                </umb-property-layout>
              `
            : nothing}
        </div>
      </uui-box>

      <uui-box headline="Usage Limits">
        <div class="form-grid">
          <umb-property-layout
            label="Total usage limit"
            description="Leave empty for unlimited uses">
            <uui-input
              slot="editor"
              type="number"
              min="0"
              step="1"
              .value=${String(this._discount?.totalUsageLimit ?? "")}
              @input=${(e: Event) => {
                const val = (e.target as HTMLInputElement).value;
                this._handleInputChange("totalUsageLimit", val ? parseInt(val, 10) : null);
              }}
              placeholder="Unlimited"
            ></uui-input>
          </umb-property-layout>

          <umb-property-layout
            label="Per customer limit"
            description="Max uses per customer">
            <uui-input
              slot="editor"
              type="number"
              min="0"
              step="1"
              .value=${String(this._discount?.perCustomerUsageLimit ?? "")}
              @input=${(e: Event) => {
                const val = (e.target as HTMLInputElement).value;
                this._handleInputChange("perCustomerUsageLimit", val ? parseInt(val, 10) : null);
              }}
              placeholder="Unlimited"
            ></uui-input>
          </umb-property-layout>

          ${this._discount?.category === DiscountCategory.BuyXGetY
            ? html`
                <umb-property-layout
                  label="Per order limit"
                  description="Max times per order (for Buy X Get Y)">
                  <uui-input
                    slot="editor"
                    type="number"
                    min="0"
                    step="1"
                    .value=${String(this._discount?.perOrderUsageLimit ?? "")}
                    @input=${(e: Event) => {
                      const val = (e.target as HTMLInputElement).value;
                      this._handleInputChange("perOrderUsageLimit", val ? parseInt(val, 10) : null);
                    }}
                    placeholder="Unlimited"
                  ></uui-input>
                </umb-property-layout>
              `
            : nothing}
        </div>
      </uui-box>
    `;
  }

  private _renderCombinationsTab(): unknown {
    return html`
      <uui-box headline="Discount Combinations">
        <p class="box-description">
          Choose which other discount types can be used together with this discount.
          If no options are selected, this discount cannot be combined with any other discounts.
        </p>
        <div class="checkbox-group">
          <uui-checkbox
            label="Can combine with product discounts"
            ?checked=${this._discount?.canCombineWithProductDiscounts}
            @change=${(e: Event) =>
              this._handleInputChange("canCombineWithProductDiscounts", (e.target as HTMLInputElement).checked)}
          >
            Can combine with product discounts
          </uui-checkbox>

          <uui-checkbox
            label="Can combine with order discounts"
            ?checked=${this._discount?.canCombineWithOrderDiscounts}
            @change=${(e: Event) =>
              this._handleInputChange("canCombineWithOrderDiscounts", (e.target as HTMLInputElement).checked)}
          >
            Can combine with order discounts
          </uui-checkbox>

          <uui-checkbox
            label="Can combine with shipping discounts"
            ?checked=${this._discount?.canCombineWithShippingDiscounts}
            @change=${(e: Event) =>
              this._handleInputChange("canCombineWithShippingDiscounts", (e.target as HTMLInputElement).checked)}
          >
            Can combine with shipping discounts
          </uui-checkbox>
        </div>
      </uui-box>

      <uui-box headline="Tax Calculation">
        <p class="box-description">
          Choose how the discount is calculated in relation to tax.
        </p>
        <div class="checkbox-group">
          <uui-checkbox
            label="Calculate discount on total including tax"
            ?checked=${this._discount?.applyAfterTax}
            @change=${(e: Event) =>
              this._handleInputChange("applyAfterTax", (e.target as HTMLInputElement).checked)}
          >
            Calculate discount on total including tax
          </uui-checkbox>
          <small>
            When enabled, customers see the discount as a percentage/amount off their total (including tax).
            The system will correctly calculate the pre-tax adjustment for accounting purposes.
          </small>
        </div>
      </uui-box>

      <uui-box headline="Priority">
        <p class="box-description">
          Lower numbers have higher priority. When multiple discounts apply, higher priority discounts are calculated first.
        </p>
        <umb-property-layout label="Priority"
          description="When discounts cannot be combined (based on the settings above), only the discount with the lowest priority number will be applied.">
          <uui-input
            slot="editor"
            type="number"
            min="1"
            step="1"
            .value=${String(this._discount?.priority ?? 1000)}
            @input=${(e: Event) =>
              this._handleInputChange("priority", parseInt((e.target as HTMLInputElement).value, 10) || 1000)}
          ></uui-input>
        </umb-property-layout>
      </uui-box>
    `;
  }

  private _renderScheduleTab(): unknown {
    const formatDateForInput = (isoString: string | null | undefined): string => {
      if (!isoString) return "";
      const date = new Date(isoString);
      return date.toISOString().slice(0, 16);
    };

    return html`
      <uui-box headline="Active Dates">
        <div class="schedule-form">
          <umb-property-layout label="Start Date" ?mandatory=${true}>
            <input
              slot="editor"
              type="datetime-local"
              .value=${formatDateForInput(this._discount?.startsAt)}
              @change=${(e: Event) => {
                const val = (e.target as HTMLInputElement).value;
                this._handleInputChange("startsAt", val ? new Date(val).toISOString() : new Date().toISOString());
              }}
            />
          </umb-property-layout>

          <umb-property-layout
            label="End Date"
            description="Leave empty for no end date">
            <input
              slot="editor"
              type="datetime-local"
              .value=${formatDateForInput(this._discount?.endsAt)}
              @change=${(e: Event) => {
                const val = (e.target as HTMLInputElement).value;
                this._handleInputChange("endsAt", val ? new Date(val).toISOString() : null);
              }}
            />
          </umb-property-layout>
        </div>
      </uui-box>
    `;
  }

  private _renderTargetsTab(): unknown {
    return html`
      <uui-box headline="Product Targeting">
        <merchello-target-rule-builder
          .rules=${this._targetRules}
          @rules-change=${this._handleTargetRulesChange}
        ></merchello-target-rule-builder>
      </uui-box>
    `;
  }

  private _renderEligibilityTab(): unknown {
    return html`
      <uui-box headline="Customer Eligibility">
        <merchello-eligibility-rule-builder
          .rules=${this._eligibilityRules}
          @rules-change=${this._handleEligibilityRulesChange}
        ></merchello-eligibility-rule-builder>
      </uui-box>
    `;
  }

  /**
   * Render the tabs with href-based routing
   */
  private _renderTabs(): unknown {
    const activeTab = this._getActiveTab();

    return html`
      <uui-tab-group slot="header">
        <uui-tab
          label="Details"
          href="${this._routerPath}/tab/details"
          ?active=${activeTab === "details"}>
          Details
        </uui-tab>
        <uui-tab
          label="Applies To"
          href="${this._routerPath}/tab/targets"
          ?active=${activeTab === "targets"}>
          Applies To
        </uui-tab>
        <uui-tab
          label="Requirements"
          href="${this._routerPath}/tab/requirements"
          ?active=${activeTab === "requirements"}>
          Requirements
        </uui-tab>
        <uui-tab
          label="Eligibility"
          href="${this._routerPath}/tab/eligibility"
          ?active=${activeTab === "eligibility"}>
          Eligibility
        </uui-tab>
        <uui-tab
          label="Combinations"
          href="${this._routerPath}/tab/combinations"
          ?active=${activeTab === "combinations"}>
          Combinations
        </uui-tab>
        <uui-tab
          label="Schedule"
          href="${this._routerPath}/tab/schedule"
          ?active=${activeTab === "schedule"}>
          Schedule
        </uui-tab>
        ${!this._isNew
          ? html`
              <uui-tab
                label="Performance"
                href="${this._routerPath}/tab/performance"
                ?active=${activeTab === "performance"}>
                Performance
              </uui-tab>
            `
          : nothing}
      </uui-tab-group>
    `;
  }

  /**
   * Render the active tab content
   */
  private _renderActiveTabContent(): unknown {
    const activeTab = this._getActiveTab();

    return html`
      ${activeTab === "details" ? this._renderDetailsTab() : nothing}
      ${activeTab === "targets" ? this._renderTargetsTab() : nothing}
      ${activeTab === "requirements" ? this._renderRequirementsTab() : nothing}
      ${activeTab === "eligibility" ? this._renderEligibilityTab() : nothing}
      ${activeTab === "combinations" ? this._renderCombinationsTab() : nothing}
      ${activeTab === "schedule" ? this._renderScheduleTab() : nothing}
      ${activeTab === "performance" && !this._isNew && this._discount?.id
        ? html`<merchello-discount-performance discountId=${this._discount.id}></merchello-discount-performance>`
        : nothing}
    `;
  }

  override render() {
    if (this._isLoading) {
      return html`
        <umb-body-layout>
          <div class="loading"><uui-loader></uui-loader></div>
        </umb-body-layout>
      `;
    }

    const statusLabel = this._discount?.status !== undefined ? DISCOUNT_STATUS_LABELS[this._discount.status] : "";
    const statusColor = this._discount?.status !== undefined ? DISCOUNT_STATUS_COLORS[this._discount.status] : "default";

    return html`
      <umb-body-layout header-fit-height main-no-padding>
        <!-- Back button -->
        <uui-button slot="header" compact href=${getDiscountsListHref()} label="Back to Discounts" class="back-button">
          <uui-icon name="icon-arrow-left"></uui-icon>
        </uui-button>

        <!-- Header with discount info -->
        <div id="header" slot="header">
          <umb-icon name="icon-coin-dollar"></umb-icon>
          <span class="headline">${this._getHeadline()}</span>
          ${!this._isNew && this._discount
            ? html`<uui-tag look="secondary" color=${statusColor}>${statusLabel}</uui-tag>`
            : nothing}
        </div>

        <!-- Header Actions (only for existing discounts) -->
        ${!this._isNew
          ? html`
              <div slot="header" class="header-actions">
                ${this._discount?.status === DiscountStatus.Active
                  ? html`
                      <uui-button
                        look="secondary"
                        color="warning"
                        label="Deactivate"
                        @click=${this._handleDeactivate}
                      >
                        Deactivate
                      </uui-button>
                    `
                  : html`
                      <uui-button
                        look="secondary"
                        color="positive"
                        label="Activate"
                        @click=${this._handleActivate}
                      >
                        Activate
                      </uui-button>
                    `}
                <uui-button look="secondary" color="danger" label="Delete" @click=${this._handleDelete}>
                  Delete
                </uui-button>
              </div>
            `
          : nothing}

        <!-- Inner layout with tabs -->
        <umb-body-layout header-fit-height header-no-padding>
          ${this._renderTabs()}

          <!-- Router slot for URL tracking (hidden via CSS) -->
          <umb-router-slot
            .routes=${this._routes}
            @init=${this._onRouterInit}
            @change=${this._onRouterChange}>
          </umb-router-slot>

          <!-- Detail layout with main content and sidebar -->
          <div class="detail-layout">
            <div class="main-content">
              <div class="tab-content">
                ${this._renderActiveTabContent()}
              </div>
            </div>

            <!-- Sidebar -->
            <div class="sidebar">
              <merchello-discount-summary-card
                .discount=${this._discount}
                .isNew=${this._isNew}
              ></merchello-discount-summary-card>
            </div>
          </div>
        </umb-body-layout>

        <!-- Footer with Save button -->
        <umb-footer-layout slot="footer">
          <uui-button
            slot="actions"
            look="primary"
            color="positive"
            label=${this._isNew ? "Create" : "Save"}
            ?disabled=${this._isSaving}
            @click=${this._handleSave}
          >
            ${this._isSaving
              ? this._isNew ? "Creating..." : "Saving..."
              : this._isNew ? "Create" : "Save"}
          </uui-button>
        </umb-footer-layout>
      </umb-body-layout>
    `;
  }

  static override readonly styles = css`
    :host {
      display: block;
      height: 100%;
      --uui-tab-background: var(--uui-color-surface);
    }

    /* Back button styling */
    .back-button {
      margin-right: var(--uui-size-space-2);
    }

    /* Hide router slot - we use it only for URL tracking */
    umb-router-slot {
      display: none;
    }

    /* Header styling */
    #header {
      display: flex;
      align-items: center;
      gap: var(--uui-size-space-3);
      flex: 1;
      padding: var(--uui-size-space-4) 0;
    }

    #header umb-icon {
      font-size: 24px;
      color: var(--uui-color-text-alt);
    }

    #header .headline {
      font-size: var(--uui-type-h4-size);
      font-weight: 700;
    }

    /* Header actions styling */
    .header-actions {
      display: flex;
      gap: var(--uui-size-space-3);
      padding-right: var(--uui-size-layout-1);
    }

    .loading {
      display: flex;
      justify-content: center;
      align-items: center;
      padding: var(--uui-size-layout-2);
    }

    .detail-layout {
      display: grid;
      grid-template-columns: 1fr 320px;
      gap: var(--uui-size-layout-1);
      padding: var(--uui-size-layout-1);
    }

    @media (max-width: 1024px) {
      .detail-layout {
        grid-template-columns: 1fr;
      }

      .sidebar {
        order: -1;
      }
    }

    .main-content {
      display: flex;
      flex-direction: column;
      gap: var(--uui-size-space-4);
      align-self: start;
    }

    .tab-content {
      display: flex;
      flex-direction: column;
      gap: var(--uui-size-space-4);
    }

    /* Tab group styling */
    uui-tab-group {
      --uui-tab-divider: var(--uui-color-border);
      width: 100%;
    }

    uui-box {
      --uui-box-default-padding: var(--uui-size-space-5);
    }

    .box-description {
      margin: 0 0 var(--uui-size-space-4) 0;
      color: var(--uui-color-text-alt);
    }

    .form-grid {
      display: flex;
      flex-direction: column;
      gap: var(--uui-size-space-4);
    }

    uui-form-layout-item {
      margin: 0;
    }

    uui-input,
    uui-textarea,
    uui-select {
      width: 100%;
    }

    input[type="datetime-local"] {
      width: 100%;
      padding: var(--uui-size-space-3) var(--uui-size-space-4);
      border: 1px solid var(--uui-color-border);
      border-radius: var(--uui-border-radius);
      font-size: var(--uui-type-default-size);
      font-family: inherit;
      background: var(--uui-color-surface);
      color: var(--uui-color-text);
      box-sizing: border-box;
    }

    input[type="datetime-local"]:focus {
      outline: 2px solid var(--uui-color-focus);
      outline-offset: 2px;
    }

    .code-input-row {
      display: flex;
      gap: var(--uui-size-space-2);
    }

    .code-input-row uui-input {
      flex: 1;
    }

    .checkbox-group {
      display: flex;
      flex-direction: column;
      gap: var(--uui-size-space-3);
    }

    .error-message {
      color: var(--uui-color-danger);
      font-size: var(--uui-type-small-size);
      margin-top: var(--uui-size-space-1);
    }

    .success-message {
      color: var(--uui-color-positive);
      font-size: var(--uui-type-small-size);
      margin-top: var(--uui-size-space-1);
    }

    small {
      color: var(--uui-color-text-alt);
      font-size: var(--uui-type-small-size);
    }

    .sidebar {
      position: sticky;
      top: var(--uui-size-space-4);
      align-self: start;
    }

    .schedule-form {
      display: flex;
      flex-direction: column;
      gap: var(--uui-size-space-5);
      max-width: 400px;
    }

  `;
}

export default MerchelloDiscountDetailElement;

declare global {
  interface HTMLElementTagNameMap {
    "merchello-discount-detail": MerchelloDiscountDetailElement;
  }
}
