import { LitElement, html, css, nothing } from "@umbraco-cms/backoffice/external/lit";
import { customElement, state } from "@umbraco-cms/backoffice/external/lit";
import { UmbElementMixin } from "@umbraco-cms/backoffice/element-api";
import { UMB_WORKSPACE_CONTEXT } from "@umbraco-cms/backoffice/workspace";
import { UMB_NOTIFICATION_CONTEXT } from "@umbraco-cms/backoffice/notification";
import type { UmbNotificationContext } from "@umbraco-cms/backoffice/notification";
import type { MerchelloDiscountDetailWorkspaceContext } from "@discounts/contexts/discount-detail-workspace.context.js";
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
import { navigateToDiscountsList } from "@shared/utils/navigation.js";
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
  @state() private _activeTab = "details";
  @state() private _validationErrors: Map<string, string> = new Map();
  @state() private _codeAvailable: boolean | null = null;
  @state() private _isGeneratingCode = false;
  @state() private _targetRules: DiscountTargetRuleDto[] = [];
  @state() private _eligibilityRules: DiscountEligibilityRuleDto[] = [];

  #workspaceContext?: MerchelloDiscountDetailWorkspaceContext;
  #notificationContext?: UmbNotificationContext;
  #codeCheckDebounce?: ReturnType<typeof setTimeout>;

  constructor() {
    super();

    this.consumeContext(UMB_WORKSPACE_CONTEXT, (context) => {
      this.#workspaceContext = context as MerchelloDiscountDetailWorkspaceContext;
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
  }

  override disconnectedCallback(): void {
    super.disconnectedCallback();
    // Clear debounce timeout to prevent memory leak
    if (this.#codeCheckDebounce) {
      clearTimeout(this.#codeCheckDebounce);
      this.#codeCheckDebounce = undefined;
    }
  }

  private _getCategoryInfo(category: DiscountCategory): typeof DISCOUNT_CATEGORIES[number] | undefined {
    return DISCOUNT_CATEGORIES.find((c) => c.category === category);
  }

  private _getHeadline(): string {
    if (this._isNew) {
      const categoryInfo = this._getCategoryInfo(this._discount?.category ?? 0);
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
    const { data, error } = await MerchelloApi.generateDiscountCode(8);
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

  private _validate(): boolean {
    this._validationErrors.clear();

    if (!this._discount?.name?.trim()) {
      this._validationErrors.set("name", "Name is required");
    }

    if (this._discount?.method === DiscountMethod.Code && !this._discount.code?.trim()) {
      this._validationErrors.set("code", "Code is required for code-based discounts");
    }

    if (this._discount?.value === undefined || this._discount.value <= 0) {
      this._validationErrors.set("value", "Value must be greater than 0");
    }

    if (this._discount?.valueType === DiscountValueType.Percentage && this._discount.value > 100) {
      this._validationErrors.set("value", "Percentage cannot exceed 100%");
    }

    if (this._discount?.requirementType !== DiscountRequirementType.None && !this._discount?.requirementValue) {
      this._validationErrors.set("requirementValue", "Requirement value is required");
    }

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
        this.#notificationContext?.peek("positive", {
          data: { headline: "Discount created", message: `${data.name} has been created` },
        });
        // Navigate to the edit page for the newly created discount
        history.replaceState({}, "", `section/merchello/workspace/merchello-discount/edit/${data.id}`);
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

    const confirmed = confirm(`Are you sure you want to delete "${this._discount.name}"? This action cannot be undone.`);
    if (!confirmed) return;

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

  private _renderLoading(): unknown {
    return html`<div class="loading"><uui-loader></uui-loader></div>`;
  }

  private _renderDetailsTab(): unknown {
    return html`
      <uui-box headline="Basic Information">
        <div class="form-grid">
          <uui-form-layout-item>
            <uui-label slot="label" required>Name</uui-label>
            <uui-input
              .value=${this._discount?.name ?? ""}
              @input=${(e: Event) => this._handleInputChange("name", (e.target as HTMLInputElement).value)}
              placeholder="e.g., Summer Sale 20% Off"
              ?invalid=${this._validationErrors.has("name")}
            ></uui-input>
            ${this._validationErrors.has("name")
              ? html`<div class="error-message">${this._validationErrors.get("name")}</div>`
              : nothing}
          </uui-form-layout-item>

          <uui-form-layout-item>
            <uui-label slot="label">Description</uui-label>
            <uui-textarea
              .value=${this._discount?.description ?? ""}
              @input=${(e: Event) => this._handleInputChange("description", (e.target as HTMLTextAreaElement).value)}
              placeholder="Internal description for this discount"
            ></uui-textarea>
          </uui-form-layout-item>
        </div>
      </uui-box>

      <uui-box headline="Discount Method">
        <div class="form-grid">
          <uui-form-layout-item>
            <uui-label slot="label">Method</uui-label>
            <uui-select
              .value=${String(this._discount?.method ?? 0)}
              @change=${(e: Event) =>
                this._handleInputChange("method", parseInt((e.target as HTMLSelectElement).value, 10))}
            >
              <uui-select-option value="0">Discount code</uui-select-option>
              <uui-select-option value="1">Automatic discount</uui-select-option>
            </uui-select>
          </uui-form-layout-item>

          ${this._discount?.method === DiscountMethod.Code
            ? html`
                <uui-form-layout-item>
                  <uui-label slot="label" required>Discount Code</uui-label>
                  <div class="code-input-row">
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
                </uui-form-layout-item>
              `
            : nothing}
        </div>
      </uui-box>

      <uui-box headline="Discount Value">
        <div class="form-grid">
          <uui-form-layout-item>
            <uui-label slot="label">Value Type</uui-label>
            <uui-select
              .value=${String(this._discount?.valueType ?? 1)}
              @change=${(e: Event) =>
                this._handleInputChange("valueType", parseInt((e.target as HTMLSelectElement).value, 10))}
            >
              <uui-select-option value="1">Percentage</uui-select-option>
              <uui-select-option value="0">Fixed amount</uui-select-option>
              ${this._discount?.category === DiscountCategory.BuyXGetY
                ? html`<uui-select-option value="2">Free</uui-select-option>`
                : nothing}
            </uui-select>
          </uui-form-layout-item>

          ${this._discount?.valueType !== DiscountValueType.Free
            ? html`
                <uui-form-layout-item>
                  <uui-label slot="label" required>
                    ${this._discount?.valueType === DiscountValueType.Percentage ? "Percentage (%)" : "Amount"}
                  </uui-label>
                  <uui-input
                    type="number"
                    min="0"
                    max=${this._discount?.valueType === DiscountValueType.Percentage ? "100" : ""}
                    step="0.01"
                    .value=${String(this._discount?.value ?? "")}
                    @input=${(e: Event) =>
                      this._handleInputChange("value", parseFloat((e.target as HTMLInputElement).value) || 0)}
                    ?invalid=${this._validationErrors.has("value")}
                  ></uui-input>
                  ${this._validationErrors.has("value")
                    ? html`<div class="error-message">${this._validationErrors.get("value")}</div>`
                    : nothing}
                </uui-form-layout-item>
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
          <uui-form-layout-item>
            <uui-label slot="label">Requirement Type</uui-label>
            <uui-select
              .value=${String(this._discount?.requirementType ?? 0)}
              @change=${(e: Event) =>
                this._handleInputChange("requirementType", parseInt((e.target as HTMLSelectElement).value, 10))}
            >
              <uui-select-option value="0">No minimum requirements</uui-select-option>
              <uui-select-option value="1">Minimum purchase amount</uui-select-option>
              <uui-select-option value="2">Minimum quantity of items</uui-select-option>
            </uui-select>
          </uui-form-layout-item>

          ${this._discount?.requirementType !== DiscountRequirementType.None
            ? html`
                <uui-form-layout-item>
                  <uui-label slot="label" required>
                    ${this._discount?.requirementType === DiscountRequirementType.MinimumPurchaseAmount ? "Minimum Amount" : "Minimum Quantity"}
                  </uui-label>
                  <uui-input
                    type="number"
                    min="0"
                    step=${this._discount?.requirementType === DiscountRequirementType.MinimumPurchaseAmount ? "0.01" : "1"}
                    .value=${String(this._discount?.requirementValue ?? "")}
                    @input=${(e: Event) =>
                      this._handleInputChange("requirementValue", parseFloat((e.target as HTMLInputElement).value) || null)}
                    ?invalid=${this._validationErrors.has("requirementValue")}
                  ></uui-input>
                  ${this._validationErrors.has("requirementValue")
                    ? html`<div class="error-message">${this._validationErrors.get("requirementValue")}</div>`
                    : nothing}
                </uui-form-layout-item>
              `
            : nothing}
        </div>
      </uui-box>

      <uui-box headline="Usage Limits">
        <div class="form-grid">
          <uui-form-layout-item>
            <uui-label slot="label">Total usage limit</uui-label>
            <uui-input
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
            <small>Leave empty for unlimited uses</small>
          </uui-form-layout-item>

          <uui-form-layout-item>
            <uui-label slot="label">Per customer limit</uui-label>
            <uui-input
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
            <small>Max uses per customer</small>
          </uui-form-layout-item>

          ${this._discount?.category === DiscountCategory.BuyXGetY
            ? html`
                <uui-form-layout-item>
                  <uui-label slot="label">Per order limit</uui-label>
                  <uui-input
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
                  <small>Max times per order (for Buy X Get Y)</small>
                </uui-form-layout-item>
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

      <uui-box headline="Priority">
        <p class="box-description">
          Lower numbers have higher priority. When multiple discounts apply, higher priority discounts are calculated first.
        </p>
        <uui-form-layout-item>
          <uui-label slot="label">Priority</uui-label>
          <uui-input
            type="number"
            min="1"
            step="1"
            .value=${String(this._discount?.priority ?? 1000)}
            @input=${(e: Event) =>
              this._handleInputChange("priority", parseInt((e.target as HTMLInputElement).value, 10) || 1000)}
          ></uui-input>
        </uui-form-layout-item>
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
        <div class="form-grid">
          <uui-form-layout-item>
            <uui-label slot="label" required>Start Date</uui-label>
            <input
              type="datetime-local"
              .value=${formatDateForInput(this._discount?.startsAt)}
              @change=${(e: Event) => {
                const val = (e.target as HTMLInputElement).value;
                this._handleInputChange("startsAt", val ? new Date(val).toISOString() : new Date().toISOString());
              }}
            />
          </uui-form-layout-item>

          <uui-form-layout-item>
            <uui-label slot="label">End Date</uui-label>
            <input
              type="datetime-local"
              .value=${formatDateForInput(this._discount?.endsAt)}
              @change=${(e: Event) => {
                const val = (e.target as HTMLInputElement).value;
                this._handleInputChange("endsAt", val ? new Date(val).toISOString() : null);
              }}
            />
            <small>Leave empty for no end date</small>
          </uui-form-layout-item>
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

  private _renderContent(): unknown {
    if (this._isLoading) {
      return this._renderLoading();
    }

    return html`
      <div class="detail-layout">
        <div class="main-content">
          <!-- Tabs -->
          <uui-tab-group>
            <uui-tab
              label="Details"
              ?active=${this._activeTab === "details"}
              @click=${() => (this._activeTab = "details")}
            >
              Details
            </uui-tab>
            <uui-tab
              label="Applies To"
              ?active=${this._activeTab === "targets"}
              @click=${() => (this._activeTab = "targets")}
            >
              Applies To
            </uui-tab>
            <uui-tab
              label="Requirements"
              ?active=${this._activeTab === "requirements"}
              @click=${() => (this._activeTab = "requirements")}
            >
              Requirements
            </uui-tab>
            <uui-tab
              label="Eligibility"
              ?active=${this._activeTab === "eligibility"}
              @click=${() => (this._activeTab = "eligibility")}
            >
              Eligibility
            </uui-tab>
            <uui-tab
              label="Combinations"
              ?active=${this._activeTab === "combinations"}
              @click=${() => (this._activeTab = "combinations")}
            >
              Combinations
            </uui-tab>
            <uui-tab
              label="Schedule"
              ?active=${this._activeTab === "schedule"}
              @click=${() => (this._activeTab = "schedule")}
            >
              Schedule
            </uui-tab>
            ${!this._isNew
              ? html`
                  <uui-tab
                    label="Performance"
                    ?active=${this._activeTab === "performance"}
                    @click=${() => (this._activeTab = "performance")}
                  >
                    Performance
                  </uui-tab>
                `
              : nothing}
          </uui-tab-group>

          <!-- Tab Content -->
          <div class="tab-content">
            ${this._activeTab === "details" ? this._renderDetailsTab() : nothing}
            ${this._activeTab === "targets" ? this._renderTargetsTab() : nothing}
            ${this._activeTab === "requirements" ? this._renderRequirementsTab() : nothing}
            ${this._activeTab === "eligibility" ? this._renderEligibilityTab() : nothing}
            ${this._activeTab === "combinations" ? this._renderCombinationsTab() : nothing}
            ${this._activeTab === "schedule" ? this._renderScheduleTab() : nothing}
            ${this._activeTab === "performance" && !this._isNew && this._discount?.id
              ? html`<merchello-discount-performance discountId=${this._discount.id}></merchello-discount-performance>`
              : nothing}
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
    `;
  }

  render() {
    const statusLabel = this._discount?.status !== undefined ? DISCOUNT_STATUS_LABELS[this._discount.status] : "";
    const statusColor = this._discount?.status !== undefined ? DISCOUNT_STATUS_COLORS[this._discount.status] : "default";

    return html`
      <umb-workspace-editor alias="Merchello.Discount.Detail.Workspace" headline=${this._getHeadline()}>
        <!-- Status badge in header -->
        ${!this._isNew && this._discount
          ? html`
              <div slot="header">
                <uui-tag look="secondary" color=${statusColor}>${statusLabel}</uui-tag>
              </div>
            `
          : nothing}

        <!-- Header Actions -->
        <div slot="action-menu">
          ${!this._isNew
            ? html`
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
              `
            : nothing}
          <uui-button
            look="primary"
            color="positive"
            label=${this._isNew ? "Create discount" : "Save"}
            ?disabled=${this._isSaving}
            @click=${this._handleSave}
          >
            ${this._isSaving ? "Saving..." : this._isNew ? "Create discount" : "Save"}
          </uui-button>
        </div>

        <!-- Main Content -->
        ${this._renderContent()}
      </umb-workspace-editor>
    `;
  }

  static styles = css`
    :host {
      display: block;
      height: 100%;
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
    }

    .tab-content {
      display: flex;
      flex-direction: column;
      gap: var(--uui-size-space-4);
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
      padding: var(--uui-size-space-2) var(--uui-size-space-3);
      border: 1px solid var(--uui-color-border);
      border-radius: var(--uui-border-radius);
      font-size: var(--uui-type-small-size);
      background: var(--uui-color-surface);
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
  `;
}

export default MerchelloDiscountDetailElement;

declare global {
  interface HTMLElementTagNameMap {
    "merchello-discount-detail": MerchelloDiscountDetailElement;
  }
}
