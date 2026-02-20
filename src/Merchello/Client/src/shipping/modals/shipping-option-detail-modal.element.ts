import { html, css, nothing } from "@umbraco-cms/backoffice/external/lit";
import { customElement, state } from "@umbraco-cms/backoffice/external/lit";
import { UmbModalBaseElement } from "@umbraco-cms/backoffice/modal";
import { UMB_MODAL_MANAGER_CONTEXT, UMB_CONFIRM_MODAL } from "@umbraco-cms/backoffice/modal";
import { UMB_NOTIFICATION_CONTEXT } from "@umbraco-cms/backoffice/notification";
import type { UmbModalManagerContext } from "@umbraco-cms/backoffice/modal";
import type { UmbNotificationContext } from "@umbraco-cms/backoffice/notification";
import { MerchelloApi } from "@api/merchello-api.js";
import type {
  ShippingOptionDetailDto,
  ShippingCostDto,
  ShippingWeightTierDto,
  ShippingDestinationExclusionDto,
  ShippingPostcodeRuleDto,
  CreateShippingOptionDto,
  WarehouseDto,
} from "@shipping/types/shipping.types.js";
import type { ShippingOptionDetailModalData, ShippingOptionDetailModalValue } from "@shipping/modals/shipping-option-detail-modal.token.js";
import { MERCHELLO_SHIPPING_COST_MODAL } from "@shipping/modals/shipping-cost-modal.token.js";
import { MERCHELLO_SHIPPING_WEIGHT_TIER_MODAL } from "@shipping/modals/shipping-weight-tier-modal.token.js";
import { MERCHELLO_SHIPPING_DESTINATION_EXCLUSION_MODAL } from "@shipping/modals/shipping-destination-exclusion-modal.token.js";
import { MERCHELLO_SHIPPING_POSTCODE_RULE_MODAL } from "@shipping/modals/shipping-postcode-rule-modal.token.js";
import { formatCurrency } from "@shared/utils/formatting.js";
import { modalLayoutStyles } from "@shared/styles/modal-layout.styles.js";

type ShippingOptionModalTab = "overview" | "delivery" | "destinations" | "pricing";

@customElement("merchello-shipping-option-detail-modal")
export class MerchelloShippingOptionDetailModalElement extends UmbModalBaseElement<
  ShippingOptionDetailModalData,
  ShippingOptionDetailModalValue
> {
  @state() private _isLoading = false;
  @state() private _isSaving = false;
  @state() private _errorMessage: string | null = null;
  @state() private _detail: ShippingOptionDetailDto | null = null;
  @state() private _warehouses: WarehouseDto[] = [];
  @state() private _excludedRegions: ShippingDestinationExclusionDto[] = [];

  // Form fields
  @state() private _name = "";
  @state() private _warehouseId = "";
  @state() private _fixedCost: number | null = 0;
  @state() private _daysFrom = 3;
  @state() private _daysTo = 5;
  @state() private _isNextDay = false;
  @state() private _nextDayCutOffTime = "";
  @state() private _allowsDeliveryDateSelection = false;
  @state() private _minDeliveryDays: number | null = null;
  @state() private _maxDeliveryDays: number | null = null;
  @state() private _allowedDaysOfWeek = "";
  @state() private _isDeliveryDateGuaranteed = false;
  @state() private _isEnabled = true;
  @state() private _activeTab: ShippingOptionModalTab = "overview";

  #modalManager?: UmbModalManagerContext;
  #notificationContext?: UmbNotificationContext;

  /** Whether warehouse is pre-selected and should not show dropdown */
  private get _hasFixedWarehouse(): boolean {
    return !!this.data?.warehouseId;
  }

  private get _isFlatRateOption(): boolean {
    const providerKey = this._detail?.providerKey ?? this.data?.option?.providerKey ?? "flat-rate";
    return providerKey.toLowerCase() === "flat-rate";
  }

  constructor() {
    super();
    this.consumeContext(UMB_MODAL_MANAGER_CONTEXT, (context) => {
      this.#modalManager = context;
    });
    this.consumeContext(UMB_NOTIFICATION_CONTEXT, (context) => {
      this.#notificationContext = context;
    });
  }

  override connectedCallback(): void {
    super.connectedCallback();

    // Set pre-selected warehouse if provided
    if (this.data?.warehouseId) {
      this._warehouseId = this.data.warehouseId;
    }

    // Use provided warehouses or load from API
    if (this.data?.warehouses) {
      this._warehouses = this.data.warehouses;
    } else if (!this._hasFixedWarehouse) {
      this._loadWarehouses();
    }

    // Load existing option if optionId or option provided
    if (this.data?.optionId) {
      this._loadDetailById(this.data.optionId);
    } else if (this.data?.option) {
      this._loadDetail();
    }
  }

  /** Options for the warehouse dropdown */
  private get _warehouseOptions(): Array<{ name: string; value: string; selected?: boolean }> {
    const options: Array<{ name: string; value: string; selected?: boolean }> = [
      { name: "Select a warehouse...", value: "", selected: !this._warehouseId }
    ];

    this._warehouses.forEach(w => {
      options.push({
        name: w.name,
        value: w.id,
        selected: w.id === this._warehouseId
      });
    });

    return options;
  }

  private async _loadWarehouses(): Promise<void> {
    const { data } = await MerchelloApi.getWarehouses();
    if (data) {
      this._warehouses = data;
    }
  }

  private async _loadDetail(): Promise<void> {
    if (!this.data?.option) return;
    await this._loadDetailById(this.data.option.id);
  }

  private async _loadDetailById(optionId: string): Promise<void> {
    this._isLoading = true;
    this._errorMessage = null;

    try {
      const { data, error } = await MerchelloApi.getShippingOption(optionId);

      if (error) {
        this._errorMessage = error.message;
        this._isLoading = false;
        return;
      }

      if (data) {
        this._detail = data;
        this._name = data.name ?? "";
        // Only override warehouseId if not pre-set
        if (!this._hasFixedWarehouse) {
          this._warehouseId = data.warehouseId;
        }
        this._fixedCost = this._isFlatRateOption ? (data.fixedCost ?? 0) : (data.fixedCost ?? null);
        this._daysFrom = data.daysFrom;
        this._daysTo = data.daysTo;
        this._isNextDay = data.isNextDay;
        this._nextDayCutOffTime = data.nextDayCutOffTime ?? "";
        this._allowsDeliveryDateSelection = data.allowsDeliveryDateSelection;
        this._minDeliveryDays = data.minDeliveryDays ?? null;
        this._maxDeliveryDays = data.maxDeliveryDays ?? null;
        this._allowedDaysOfWeek = data.allowedDaysOfWeek ?? "";
        this._isDeliveryDateGuaranteed = data.isDeliveryDateGuaranteed;
        this._isEnabled = data.isEnabled ?? true;
        this._excludedRegions = data.excludedRegions ?? [];
      }
    } catch (err) {
      this._errorMessage = err instanceof Error ? err.message : "Failed to load shipping option";
    }

    this._isLoading = false;
  }

  private async _save(): Promise<void> {
    if (!this._name || !this._warehouseId) {
      this.#notificationContext?.peek("warning", {
        data: { headline: "Validation", message: "Name and Warehouse are required" },
      });
      return;
    }

    // Validate delivery days
    if (!this._isNextDay) {
      if (this._daysFrom < 1 || this._daysTo < 1) {
        this.#notificationContext?.peek("warning", {
          data: { headline: "Validation", message: "Minimum and maximum delivery days are required (at least 1)" },
        });
        return;
      }
      if (this._daysTo < this._daysFrom) {
        this.#notificationContext?.peek("warning", {
          data: { headline: "Validation", message: "Maximum days must be greater than or equal to minimum days" },
        });
        return;
      }
    }

    this._isSaving = true;
    const isFlatRateOption = this._isFlatRateOption;

    const dto: CreateShippingOptionDto = {
      name: this._name,
      warehouseId: this._warehouseId,
      fixedCost: isFlatRateOption ? (this._fixedCost ?? 0) : (this._fixedCost ?? undefined),
      daysFrom: this._daysFrom,
      daysTo: this._daysTo,
      isNextDay: this._isNextDay,
      nextDayCutOffTime: this._nextDayCutOffTime || undefined,
      allowsDeliveryDateSelection: this._allowsDeliveryDateSelection,
      minDeliveryDays: this._minDeliveryDays ?? undefined,
      maxDeliveryDays: this._maxDeliveryDays ?? undefined,
      allowedDaysOfWeek: this._allowedDaysOfWeek || undefined,
      isDeliveryDateGuaranteed: this._isDeliveryDateGuaranteed,
      isEnabled: this._isEnabled,
      excludedRegions: this._excludedRegions.map((x) => ({
        countryCode: x.countryCode,
        regionCode: x.regionCode,
      })),
    };

    try {
      const existingId = this.data?.option?.id || this.data?.optionId || this._detail?.id;
      const isCreating = !existingId;
      const result = existingId
        ? await MerchelloApi.updateShippingOption(existingId, dto)
        : await MerchelloApi.createShippingOption(dto);

      if (result.error) {
        this.#notificationContext?.peek("danger", {
          data: { headline: "Error", message: result.error.message },
        });
        this._isSaving = false;
        return;
      }

      if (isCreating && result.data) {
        this._detail = result.data;
        this._warehouseId = result.data.warehouseId;
        this._fixedCost = this._isFlatRateOption ? (result.data.fixedCost ?? 0) : (result.data.fixedCost ?? null);
        this._excludedRegions = result.data.excludedRegions ?? this._excludedRegions;
        this._activeTab = "pricing";

        this.#notificationContext?.peek("positive", {
          data: {
            headline: "Shipping option created",
            message: "Now configure destination rates and weight surcharges, then save.",
          },
        });

        this.modalContext?.setValue({ isSaved: true });
        this._isSaving = false;
        return;
      }

      this.#notificationContext?.peek("positive", {
        data: {
          headline: "Success",
          message: "Shipping option updated",
        },
      });

      this.modalContext?.setValue({ isSaved: true });

      // Close the modal after successful save
      this.modalContext?.submit();
    } catch (err) {
      this.#notificationContext?.peek("danger", {
        data: { headline: "Error", message: err instanceof Error ? err.message : "Failed to save" },
      });
    }

    this._isSaving = false;
  }

  private async _openCostModal(cost?: ShippingCostDto): Promise<void> {
    if (!this.#modalManager || !this._detail) return;

    const modal = this.#modalManager.open(this, MERCHELLO_SHIPPING_COST_MODAL, {
      data: { cost, optionId: this._detail.id, warehouseId: this._detail.warehouseId },
    });

    const result = await modal.onSubmit().catch(() => undefined);
    if (result?.isSaved) {
      await this._loadDetail();
    }
  }

  private async _deleteCost(cost: ShippingCostDto): Promise<void> {
    const displayName = cost.regionDisplay ?? cost.countryCode;

    const modalContext = this.#modalManager?.open(this, UMB_CONFIRM_MODAL, {
      data: {
        headline: "Delete Shipping Cost",
        content: `Delete the shipping cost for ${displayName}.`,
        confirmLabel: "Delete",
        color: "danger",
      },
    });

    try {
      await modalContext?.onSubmit();
    } catch {
      return; // User cancelled
    }

    const { error } = await MerchelloApi.deleteShippingCost(cost.id);

    if (error) {
      this.#notificationContext?.peek("danger", {
        data: { headline: "Error", message: error.message },
      });
      return;
    }

    this.#notificationContext?.peek("positive", {
      data: { headline: "Success", message: "Cost deleted" },
    });

    await this._loadDetail();
  }

  private async _openWeightTierModal(tier?: ShippingWeightTierDto): Promise<void> {
    if (!this.#modalManager || !this._detail) return;

    const modal = this.#modalManager.open(this, MERCHELLO_SHIPPING_WEIGHT_TIER_MODAL, {
      data: { tier, optionId: this._detail.id, warehouseId: this._detail.warehouseId },
    });

    const result = await modal.onSubmit().catch(() => undefined);
    if (result?.isSaved) {
      await this._loadDetail();
    }
  }

  private async _deleteWeightTier(tier: ShippingWeightTierDto): Promise<void> {
    const displayName = tier.weightRangeDisplay ?? `${tier.minWeightKg}+ kg`;

    const modalContext = this.#modalManager?.open(this, UMB_CONFIRM_MODAL, {
      data: {
        headline: "Delete Weight Tier",
        content: `Delete weight tier "${displayName}".`,
        confirmLabel: "Delete",
        color: "danger",
      },
    });

    try {
      await modalContext?.onSubmit();
    } catch {
      return; // User cancelled
    }

    const { error } = await MerchelloApi.deleteShippingWeightTier(tier.id);

    if (error) {
      this.#notificationContext?.peek("danger", {
        data: { headline: "Error", message: error.message },
      });
      return;
    }

    this.#notificationContext?.peek("positive", {
      data: { headline: "Success", message: "Weight tier deleted" },
    });

    await this._loadDetail();
  }

  private _buildExclusionRegionDisplay(countryCode: string, regionCode?: string): string {
    if (!regionCode) return countryCode;
    return `${regionCode}, ${countryCode}`;
  }

  private async _openExclusionModal(exclusion?: ShippingDestinationExclusionDto): Promise<void> {
    if (!this.#modalManager) return;

    const modal = this.#modalManager.open(this, MERCHELLO_SHIPPING_DESTINATION_EXCLUSION_MODAL, {
      data: {
        exclusion,
        warehouseId: this._warehouseId || this._detail?.warehouseId,
      },
    });

    const result = await modal.onSubmit().catch(() => undefined);
    if (!result?.isSaved || !result.exclusion) {
      return;
    }

    const countryCode = result.exclusion.countryCode.toUpperCase();
    const regionCode = result.exclusion.regionCode?.toUpperCase();
    const duplicate = this._excludedRegions.find((x) =>
      x !== exclusion &&
      x.countryCode.toUpperCase() === countryCode &&
      (x.regionCode ?? "").toUpperCase() === (regionCode ?? ""));

    if (duplicate) {
      this.#notificationContext?.peek("warning", {
        data: { headline: "Duplicate", message: "This destination is already excluded." },
      });
      return;
    }

    const updatedExclusion: ShippingDestinationExclusionDto = {
      id: exclusion?.id ?? crypto.randomUUID(),
      countryCode,
      regionCode,
      regionDisplay: this._buildExclusionRegionDisplay(countryCode, regionCode),
    };

    if (exclusion) {
      this._excludedRegions = this._excludedRegions.map((x) => x.id === exclusion.id ? updatedExclusion : x);
    } else {
      this._excludedRegions = [...this._excludedRegions, updatedExclusion];
    }
  }

  private async _deleteExclusion(exclusion: ShippingDestinationExclusionDto): Promise<void> {
    const displayName = exclusion.regionDisplay ?? this._buildExclusionRegionDisplay(exclusion.countryCode, exclusion.regionCode);

    const modalContext = this.#modalManager?.open(this, UMB_CONFIRM_MODAL, {
      data: {
        headline: "Delete Destination Exclusion",
        content: `Remove exclusion for ${displayName}?`,
        confirmLabel: "Delete",
        color: "danger",
      },
    });

    try {
      await modalContext?.onSubmit();
    } catch {
      return;
    }

    this._excludedRegions = this._excludedRegions.filter((x) => x.id !== exclusion.id);
  }

  private async _openPostcodeRuleModal(rule?: ShippingPostcodeRuleDto): Promise<void> {
    if (!this.#modalManager || !this._detail) return;

    const modal = this.#modalManager.open(this, MERCHELLO_SHIPPING_POSTCODE_RULE_MODAL, {
      data: { rule, optionId: this._detail.id },
    });

    const result = await modal.onSubmit().catch(() => undefined);
    if (result?.isSaved) {
      await this._loadDetail();
    }
  }

  private async _deletePostcodeRule(rule: ShippingPostcodeRuleDto): Promise<void> {
    const displayName = rule.pattern || rule.id;

    const modalContext = this.#modalManager?.open(this, UMB_CONFIRM_MODAL, {
      data: {
        headline: "Delete Postcode Rule",
        content: `Delete postcode rule "${displayName}".`,
        confirmLabel: "Delete",
        color: "danger",
      },
    });

    try {
      await modalContext?.onSubmit();
    } catch {
      return; // User cancelled
    }

    const { error } = await MerchelloApi.deleteShippingPostcodeRule(rule.id);

    if (error) {
      this.#notificationContext?.peek("danger", {
        data: { headline: "Error", message: error.message },
      });
      return;
    }

    this.#notificationContext?.peek("positive", {
      data: { headline: "Success", message: "Postcode rule deleted" },
    });

    await this._loadDetail();
  }

  private _close(): void {
    this.modalContext?.setValue({ isSaved: this._detail !== null });
    this.modalContext?.submit();
  }

  /** Days of week for the day picker */
  private readonly _daysOfWeek = [
    { value: "Mon", label: "M", fullLabel: "Monday" },
    { value: "Tue", label: "T", fullLabel: "Tuesday" },
    { value: "Wed", label: "W", fullLabel: "Wednesday" },
    { value: "Thu", label: "T", fullLabel: "Thursday" },
    { value: "Fri", label: "F", fullLabel: "Friday" },
    { value: "Sat", label: "S", fullLabel: "Saturday" },
    { value: "Sun", label: "S", fullLabel: "Sunday" },
  ];

  /** Check if a day is selected */
  private _isDaySelected(day: string): boolean {
    if (!this._allowedDaysOfWeek) return false;
    return this._allowedDaysOfWeek.split(",").map(d => d.trim()).includes(day);
  }

  /** Toggle a day selection */
  private _toggleDay(day: string): void {
    const currentDays = this._allowedDaysOfWeek
      ? this._allowedDaysOfWeek.split(",").map(d => d.trim()).filter(d => d)
      : [];

    if (currentDays.includes(day)) {
      // Remove the day
      this._allowedDaysOfWeek = currentDays.filter(d => d !== day).join(",");
    } else {
      // Add the day in order
      const orderedDays = this._daysOfWeek.map(d => d.value);
      const newDays = [...currentDays, day].sort(
        (a, b) => orderedDays.indexOf(a) - orderedDays.indexOf(b)
      );
      this._allowedDaysOfWeek = newDays.join(",");
    }
  }

  /** Render day of week checkboxes */
  private _renderDayCheckboxes(): unknown {
    return this._daysOfWeek.map(
      (day) => html`
        <button
          type="button"
          class="day-btn ${this._isDaySelected(day.value) ? "selected" : ""}"
          title="${day.fullLabel}"
          @click=${() => this._toggleDay(day.value)}
        >
          ${day.label}
        </button>
      `
    );
  }

  private _setActiveTab(tab: ShippingOptionModalTab): void {
    this._activeTab = tab;
  }

  private _renderTabs(): unknown {
    return html`
      <uui-tab-group class="modal-tabs">
        <uui-tab
          label="Overview"
          ?active=${this._activeTab === "overview"}
          @click=${() => this._setActiveTab("overview")}
        >
          Overview
        </uui-tab>
        <uui-tab
          label="Delivery"
          ?active=${this._activeTab === "delivery"}
          @click=${() => this._setActiveTab("delivery")}
        >
          Delivery
        </uui-tab>
        <uui-tab
          label="Destinations"
          ?active=${this._activeTab === "destinations"}
          @click=${() => this._setActiveTab("destinations")}
        >
          Destinations
        </uui-tab>
        <uui-tab
          label="Pricing"
          ?active=${this._activeTab === "pricing"}
          @click=${() => this._setActiveTab("pricing")}
        >
          Pricing
        </uui-tab>
      </uui-tab-group>
    `;
  }

  private _renderOverviewTab(): unknown {
    return html`
      <uui-box headline="Basic Settings">
        <div class="form-grid">
          <uui-form-layout-item class="full-width">
            <uui-label slot="label" for="name" required>Name</uui-label>
            <uui-input
              id="name"
              .value=${this._name}
              @input=${(e: InputEvent) => (this._name = (e.target as HTMLInputElement).value)}
              placeholder="e.g., Standard Shipping, Express Delivery"
            ></uui-input>
            <span slot="description">Display name shown to customers at checkout</span>
          </uui-form-layout-item>

          ${!this._hasFixedWarehouse
            ? html`
                <uui-form-layout-item class="full-width">
                  <uui-label slot="label" for="warehouse" required>Warehouse</uui-label>
                  <uui-select
                    id="warehouse"
                    label="Warehouse"
                    .options=${this._warehouseOptions}
                    @change=${(e: Event) => (this._warehouseId = (e.target as HTMLSelectElement).value)}
                  ></uui-select>
                </uui-form-layout-item>
              `
            : nothing}

          <uui-form-layout-item>
            <uui-label slot="label" for="fixedCost">Fixed Cost</uui-label>
            <uui-input
              id="fixedCost"
              type="number"
              step="0.01"
              min="0"
              .value=${this._isFlatRateOption ? (this._fixedCost ?? 0).toString() : (this._fixedCost?.toString() ?? "")}
              @input=${(e: InputEvent) => {
                const val = (e.target as HTMLInputElement).value;
                const parsed = Number.parseFloat(val);
                const parsedValue = Number.isFinite(parsed) ? parsed : null;

                if (this._isFlatRateOption) {
                  this._fixedCost = parsedValue ?? 0;
                  return;
                }

                this._fixedCost = parsedValue;
              }}
              placeholder="0.00"
            ></uui-input>
            <span slot="description">Destination rates are applied first. If no destination rate matches, this fixed cost is used.</span>
          </uui-form-layout-item>

          <div class="toggle-with-description">
            <uui-toggle
              .checked=${this._isEnabled}
              @change=${(e: Event) => (this._isEnabled = (e.target as HTMLInputElement).checked)}
              label="Available at checkout"
            ></uui-toggle>
            <span class="toggle-description">When disabled, customers won't see this option</span>
          </div>
        </div>
      </uui-box>
    `;
  }

  private _renderDeliveryTab(): unknown {
    return html`
      <uui-box headline="Delivery Time">
        <p class="section-hint">Estimated delivery window shown to customers (e.g., "5-10 business days").</p>
        <div class="form-grid">
          <uui-form-layout-item>
            <uui-label slot="label" for="daysFrom" required>Minimum Days</uui-label>
            <uui-input
              id="daysFrom"
              type="number"
              min="1"
              required
              .value=${this._daysFrom.toString()}
              @input=${(e: InputEvent) => (this._daysFrom = parseInt((e.target as HTMLInputElement).value) || 1)}
            ></uui-input>
          </uui-form-layout-item>

          <uui-form-layout-item>
            <uui-label slot="label" for="daysTo" required>Maximum Days</uui-label>
            <uui-input
              id="daysTo"
              type="number"
              min="1"
              required
              .value=${this._daysTo.toString()}
              @input=${(e: InputEvent) => (this._daysTo = parseInt((e.target as HTMLInputElement).value) || 1)}
            ></uui-input>
          </uui-form-layout-item>

          <uui-form-layout-item class="toggle-item">
            <uui-toggle
              .checked=${this._isNextDay}
              @change=${(e: Event) => (this._isNextDay = (e.target as HTMLInputElement).checked)}
              label="Next Day Delivery"
            ></uui-toggle>
          </uui-form-layout-item>

          ${this._isNextDay
            ? html`
                <uui-form-layout-item>
                  <uui-label slot="label" for="cutoff">Order Cut-off Time</uui-label>
                  <uui-input
                    id="cutoff"
                    type="time"
                    .value=${this._nextDayCutOffTime}
                    @input=${(e: InputEvent) => (this._nextDayCutOffTime = (e.target as HTMLInputElement).value)}
                  ></uui-input>
                  <span slot="description">Orders placed after this time ship next business day</span>
                </uui-form-layout-item>
              `
            : nothing}
        </div>
      </uui-box>

      <uui-box headline="Delivery Date Selection" class="optional-section">
        <p class="section-hint">
          Let customers choose a specific delivery date during checkout. Useful for gift deliveries or scheduled appointments.
        </p>
        <uui-form-layout-item class="toggle-item">
          <uui-toggle
            .checked=${this._allowsDeliveryDateSelection}
            @change=${(e: Event) => (this._allowsDeliveryDateSelection = (e.target as HTMLInputElement).checked)}
            label="Allow customers to select delivery date"
          ></uui-toggle>
        </uui-form-layout-item>

        ${this._allowsDeliveryDateSelection
          ? html`
              <div class="date-options">
                <div class="form-grid">
                  <uui-form-layout-item>
                    <uui-label slot="label" for="minDays">Earliest Booking</uui-label>
                    <uui-input
                      id="minDays"
                      type="number"
                      min="0"
                      .value=${this._minDeliveryDays?.toString() ?? ""}
                      @input=${(e: InputEvent) => {
                        const val = (e.target as HTMLInputElement).value;
                        this._minDeliveryDays = val ? parseInt(val) : null;
                      }}
                      placeholder="1"
                    ></uui-input>
                    <span slot="description">Minimum days from today customers can select</span>
                  </uui-form-layout-item>

                  <uui-form-layout-item>
                    <uui-label slot="label" for="maxDays">Latest Booking</uui-label>
                    <uui-input
                      id="maxDays"
                      type="number"
                      min="0"
                      .value=${this._maxDeliveryDays?.toString() ?? ""}
                      @input=${(e: InputEvent) => {
                        const val = (e.target as HTMLInputElement).value;
                        this._maxDeliveryDays = val ? parseInt(val) : null;
                      }}
                      placeholder="30"
                    ></uui-input>
                    <span slot="description">Maximum days into the future</span>
                  </uui-form-layout-item>
                </div>

                <div class="day-picker-section">
                  <label class="day-picker-label">Available Days</label>
                  <div class="day-picker">${this._renderDayCheckboxes()}</div>
                  <span class="day-picker-hint">Select which days deliveries are available. Leave all unchecked for any day.</span>
                </div>

                <div class="toggle-with-description">
                  <uui-toggle
                    .checked=${this._isDeliveryDateGuaranteed}
                    @change=${(e: Event) => (this._isDeliveryDateGuaranteed = (e.target as HTMLInputElement).checked)}
                    label="Guarantee delivery date"
                  ></uui-toggle>
                  <span class="toggle-description">Promise delivery on the selected date (not just estimated)</span>
                </div>
              </div>
            `
          : nothing}
      </uui-box>
    `;
  }

  private _renderPricingRequiresSave(): unknown {
    return html`
      <uui-box headline="Shipping Rates">
        <p class="section-hint">
          Destination-specific rates are available after the shipping option has been created.
        </p>
        <div class="table-header">
          <uui-button look="outline" label="Add Rate" disabled>
            + Add Rate
          </uui-button>
        </div>
        <p class="no-items">Create this shipping option first, then reopen it to configure destination rates.</p>
      </uui-box>

      <uui-box headline="Weight Surcharges">
        <p class="section-hint">
          Destination-specific weight surcharges are available after the shipping option has been created.
        </p>
        <div class="table-header">
          <uui-button look="outline" label="Add Surcharge" disabled>
            + Add Surcharge
          </uui-button>
        </div>
        <p class="no-items">Create this shipping option first, then reopen it to configure weight surcharges.</p>
      </uui-box>

      <uui-box headline="Postcode Rules">
        <p class="section-hint">
          Postcode rules are available after the shipping option has been created.
        </p>
        <div class="table-header">
          <uui-button look="outline" label="Add Rule" disabled>
            + Add Rule
          </uui-button>
        </div>
        <p class="no-items">Create this shipping option first, then reopen it to configure postcode rules.</p>
      </uui-box>
    `;
  }

  private _renderActiveTabContent(): unknown {
    switch (this._activeTab) {
      case "overview":
        return this._renderOverviewTab();
      case "delivery":
        return this._renderDeliveryTab();
      case "destinations":
        return this._renderExcludedRegionsTable();
      case "pricing":
        return this._detail
          ? html`
              ${this._renderCostsTable()}
              ${this._renderWeightTiersTable()}
              ${this._renderPostcodeRulesTable()}
            `
          : this._renderPricingRequiresSave();
      default:
        return this._renderOverviewTab();
    }
  }

  private _renderCostsTable(): unknown {
    if (!this._detail) return nothing;

    return html`
      <uui-box headline="Shipping Rates">
        <p class="section-hint">
          Set different shipping rates for specific destinations. Use a wildcard (*) rate as the default for any destination not specifically listed.
        </p>
        <div class="table-header">
          <uui-button look="outline" label="Add Rate" @click=${() => this._openCostModal()}>
            + Add Rate
          </uui-button>
        </div>
        ${this._detail.costs.length === 0
          ? html`<p class="no-items">No destination rates configured. Fixed Cost will be used as fallback for all destinations.</p>`
          : html`
              <table class="data-table">
                <thead>
                  <tr>
                    <th>Destination</th>
                    <th>Rate</th>
                    <th class="actions-col">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  ${this._detail.costs.map(
                    (cost) => html`
                      <tr>
                        <td>${this._formatRegionDisplay(cost.countryCode, cost.regionDisplay)}</td>
                        <td class="cost-cell">${formatCurrency(cost.cost)}</td>
                        <td class="actions-col">
                          <uui-button compact look="secondary" label="Edit" @click=${() => this._openCostModal(cost)}>
                            <uui-icon name="icon-edit"></uui-icon>
                          </uui-button>
                          <uui-button compact look="secondary" color="danger" label="Delete" @click=${() => this._deleteCost(cost)}>
                            <uui-icon name="icon-trash"></uui-icon>
                          </uui-button>
                        </td>
                      </tr>
                    `
                  )}
                </tbody>
              </table>
            `}
      </uui-box>
    `;
  }

  private _formatRegionDisplay(countryCode: string, regionDisplay?: string | null): string {
    if (countryCode === "*") {
      return "All Destinations (Default)";
    }
    return regionDisplay ?? countryCode;
  }

  private _renderWeightTiersTable(): unknown {
    if (!this._detail) return nothing;

    return html`
      <uui-box headline="Weight Surcharges">
        <p class="section-hint">
          Add extra charges based on order weight. Surcharges are added on top of the shipping rate.
        </p>
        <div class="table-header">
          <uui-button look="outline" label="Add Surcharge" @click=${() => this._openWeightTierModal()}>
            + Add Surcharge
          </uui-button>
        </div>
        ${this._detail.weightTiers.length === 0
          ? html`<p class="no-items">No weight surcharges configured.</p>`
          : html`
              <table class="data-table">
                <thead>
                  <tr>
                    <th>Destination</th>
                    <th>Weight Range</th>
                    <th>Surcharge</th>
                    <th class="actions-col">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  ${this._detail.weightTiers.map(
                    (tier) => html`
                      <tr>
                        <td>${this._formatRegionDisplay(tier.countryCode, tier.regionDisplay)}</td>
                        <td>${tier.weightRangeDisplay ?? `${tier.minWeightKg}+ kg`}</td>
                        <td class="cost-cell">+${formatCurrency(tier.surcharge)}</td>
                        <td class="actions-col">
                          <uui-button compact look="secondary" label="Edit" @click=${() => this._openWeightTierModal(tier)}>
                            <uui-icon name="icon-edit"></uui-icon>
                          </uui-button>
                          <uui-button compact look="secondary" color="danger" label="Delete" @click=${() => this._deleteWeightTier(tier)}>
                            <uui-icon name="icon-trash"></uui-icon>
                          </uui-button>
                        </td>
                      </tr>
                    `
                  )}
                </tbody>
              </table>
            `}
      </uui-box>
    `;
  }

  private _renderExcludedRegionsTable(): unknown {
    return html`
      <uui-box headline="Destination Exclusions">
        <p class="section-hint">
          Excluded destinations will not see this shipping option during estimate or checkout.
        </p>
        <div class="table-header">
          <uui-button look="outline" color="danger" label="Add Exclusion" @click=${() => this._openExclusionModal()}>
            + Add Exclusion
          </uui-button>
        </div>
        ${this._excludedRegions.length === 0
          ? html`<p class="no-items">No destinations excluded.</p>`
          : html`
              <table class="data-table">
                <thead>
                  <tr>
                    <th>Destination</th>
                    <th class="actions-col">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  ${this._excludedRegions
                    .slice()
                    .sort((a, b) => {
                      const aValue = `${a.countryCode}:${a.regionCode ?? ""}`;
                      const bValue = `${b.countryCode}:${b.regionCode ?? ""}`;
                      return aValue.localeCompare(bValue);
                    })
                    .map((exclusion) => html`
                      <tr>
                        <td>${exclusion.regionDisplay ?? this._buildExclusionRegionDisplay(exclusion.countryCode, exclusion.regionCode)}</td>
                        <td class="actions-col">
                          <uui-button compact look="secondary" label="Edit" @click=${() => this._openExclusionModal(exclusion)}>
                            <uui-icon name="icon-edit"></uui-icon>
                          </uui-button>
                          <uui-button compact look="secondary" color="danger" label="Delete" @click=${() => this._deleteExclusion(exclusion)}>
                            <uui-icon name="icon-trash"></uui-icon>
                          </uui-button>
                        </td>
                      </tr>
                    `)}
                </tbody>
              </table>
            `}
      </uui-box>
    `;
  }

  private _renderPostcodeRulesTable(): unknown {
    if (!this._detail) return nothing;

    return html`
      <uui-box headline="Postcode Rules">
        <p class="section-hint">
          Block delivery or add surcharges for specific postcodes. Rules match by prefix (IM, HS),
          UK outcode range (IV21-IV28), numeric range (20010-21000), or exact match.
          The most specific rule wins when multiple patterns match.
        </p>
        <div class="table-header">
          <uui-button look="outline" label="Add Rule" @click=${() => this._openPostcodeRuleModal()}>
            + Add Rule
          </uui-button>
        </div>
        ${(this._detail.postcodeRules?.length ?? 0) === 0
          ? html`<p class="no-items">No postcode rules configured.</p>`
          : html`
              <table class="data-table">
                <thead>
                  <tr>
                    <th>Country</th>
                    <th>Pattern</th>
                    <th>Match Type</th>
                    <th>Action</th>
                    <th class="actions-col">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  ${this._detail.postcodeRules?.map(
                    (rule) => html`
                      <tr>
                        <td>${rule.countryDisplay ?? rule.countryCode}</td>
                        <td><code class="postcode-pattern">${rule.pattern}</code></td>
                        <td>${rule.matchTypeDisplay ?? rule.matchType}</td>
                        <td>
                          ${rule.action === "Block"
                            ? html`<span class="rule-action rule-action-block">Block</span>`
                            : html`<span class="rule-action rule-action-surcharge">+${formatCurrency(rule.surcharge ?? 0)}</span>`}
                        </td>
                        <td class="actions-col">
                          <uui-button compact look="secondary" label="Edit" @click=${() => this._openPostcodeRuleModal(rule)}>
                            <uui-icon name="icon-edit"></uui-icon>
                          </uui-button>
                          <uui-button compact look="secondary" color="danger" label="Delete" @click=${() => this._deletePostcodeRule(rule)}>
                            <uui-icon name="icon-trash"></uui-icon>
                          </uui-button>
                        </td>
                      </tr>
                    `
                  )}
                </tbody>
              </table>
            `}
      </uui-box>
    `;
  }

  override render() {
    const isEditing = !!(this.data?.option || this.data?.optionId || this._detail?.id);

    if (this._isLoading) {
      return html`
        <umb-body-layout headline="${isEditing ? 'Edit' : 'Add'} Shipping Option">
          <div class="loading">
            <uui-loader></uui-loader>
            <span>Loading...</span>
          </div>
        </umb-body-layout>
      `;
    }

    return html`
      <umb-body-layout headline="${isEditing ? 'Edit' : 'Add'} Shipping Option">
        <div class="form-content">
          ${this._errorMessage
            ? html`
                <uui-box>
                  <div class="error">${this._errorMessage}</div>
                </uui-box>
              `
            : nothing}

          <div class="intro-banner">
            <div class="intro-icon">
              <uui-icon name="icon-truck"></uui-icon>
            </div>
            <div class="intro-content">
              <strong>Shipping Option</strong>
              <p>
                Configure delivery method behavior in focused sections: basic setup, delivery timing, destination exclusions, and pricing rules.
              </p>
            </div>
          </div>

          ${this._renderTabs()}
          <div class="tab-content">${this._renderActiveTabContent()}</div>
        </div>

        <uui-button slot="actions" label="Cancel" look="secondary" @click=${this._close}>Cancel</uui-button>
        <uui-button
          slot="actions"
          look="primary"
          color="positive"
          label="${isEditing ? "Save" : "Create"}"
          ?disabled=${this._isSaving}
          @click=${this._save}>
          ${this._isSaving ? html`<uui-loader-circle></uui-loader-circle>` : nothing}
          ${isEditing ? "Save" : "Create"}
        </uui-button>
      </umb-body-layout>
    `;
  }

  static override readonly styles = [
    modalLayoutStyles,
    css`
    :host {
      display: block;
    }

    .form-content {
      display: flex;
      flex-direction: column;
      gap: var(--uui-size-space-5);
    }

    .modal-tabs {
      width: 100%;
      --uui-tab-divider: var(--uui-color-border);
    }

    .tab-content {
      display: flex;
      flex-direction: column;
      gap: var(--uui-size-space-5);
    }

    .loading {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: var(--uui-size-layout-2);
      gap: var(--uui-size-space-4);
    }

    .error {
      color: var(--uui-color-danger);
      padding: var(--uui-size-space-4);
    }

    .form-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: var(--uui-size-space-4);
    }

    .form-grid .full-width {
      grid-column: 1 / -1;
    }

    .toggle-item {
      display: flex;
      align-items: center;
    }

    /* Toggle with description below */
    .toggle-with-description {
      display: flex;
      flex-direction: column;
      gap: var(--uui-size-space-1);
      padding: var(--uui-size-space-2) 0;
    }

    .toggle-description {
      font-size: 0.8125rem;
      color: var(--uui-color-text-alt);
      padding-left: 44px; /* Align with toggle label */
    }

    /* Day picker */
    .day-picker-section {
      display: flex;
      flex-direction: column;
      gap: var(--uui-size-space-2);
      margin-top: var(--uui-size-space-2);
    }

    .day-picker-label {
      font-weight: 600;
      font-size: 0.8125rem;
    }

    .day-picker {
      display: flex;
      gap: var(--uui-size-space-2);
    }

    .day-btn {
      width: 36px;
      height: 36px;
      border-radius: 50%;
      border: 2px solid var(--uui-color-border);
      background: var(--uui-color-surface);
      color: var(--uui-color-text);
      font-weight: 600;
      font-size: 0.8125rem;
      cursor: pointer;
      transition: all 0.15s ease;
    }

    .day-btn:hover {
      border-color: var(--uui-color-interactive);
      background: var(--uui-color-surface-emphasis);
    }

    .day-btn.selected {
      border-color: var(--uui-color-interactive);
      background: var(--uui-color-interactive);
      color: var(--uui-color-interactive-contrast);
    }

    .day-picker-hint {
      font-size: 0.75rem;
      color: var(--uui-color-text-alt);
    }

    uui-box {
      --uui-box-default-padding: var(--uui-size-space-5);
    }

    uui-input,
    uui-select {
      width: 100%;
    }

    .section-hint {
      margin: 0 0 var(--uui-size-space-4) 0;
      color: var(--uui-color-text-alt);
      font-size: 0.875rem;
    }

    .table-header {
      display: flex;
      justify-content: flex-end;
      margin-bottom: var(--uui-size-space-4);
    }

    .data-table {
      width: 100%;
      border-collapse: collapse;
      background: var(--uui-color-surface);
      border: 1px solid var(--uui-color-border);
      border-radius: var(--uui-border-radius);
      overflow: hidden;
    }

    .data-table th,
    .data-table td {
      padding: var(--uui-size-space-3) var(--uui-size-space-4);
      text-align: left;
      border-bottom: 1px solid var(--uui-color-border);
    }

    .data-table th {
      font-weight: 600;
      font-size: 0.8125rem;
      color: var(--uui-color-text-alt);
      background: var(--uui-color-surface-alt);
      text-transform: uppercase;
      letter-spacing: 0.025em;
    }

    .data-table tbody tr:last-child td {
      border-bottom: none;
    }

    .data-table tbody tr:hover {
      background: var(--uui-color-surface-emphasis);
    }

    .cost-cell {
      font-weight: 500;
      font-variant-numeric: tabular-nums;
    }

    .actions-col {
      width: 100px;
      text-align: right;
    }

    .actions-col > * {
      display: inline-flex;
      gap: var(--uui-size-space-1);
    }

    .no-items {
      color: var(--uui-color-text-alt);
      font-style: italic;
      margin: 0;
      padding: var(--uui-size-space-4);
      text-align: center;
      background: var(--uui-color-surface);
      border: 1px dashed var(--uui-color-border);
      border-radius: var(--uui-border-radius);
    }

    [slot="description"] {
      font-size: 0.8125rem;
      color: var(--uui-color-text-alt);
    }

    /* Intro banner */
    .intro-banner {
      display: flex;
      gap: var(--uui-size-space-4);
      padding: var(--uui-size-space-4);
      background: linear-gradient(135deg, var(--uui-color-surface-alt) 0%, var(--uui-color-surface) 100%);
      border: 1px solid var(--uui-color-border);
      border-left: 4px solid var(--uui-color-interactive);
      border-radius: var(--uui-border-radius);
    }

    .intro-icon {
      flex-shrink: 0;
      display: flex;
      align-items: center;
      justify-content: center;
      width: 40px;
      height: 40px;
      background: var(--uui-color-interactive);
      color: var(--uui-color-surface);
      border-radius: 50%;
      font-size: 1.25rem;
    }

    .intro-content {
      flex: 1;
    }

    .intro-content strong {
      display: block;
      margin-bottom: var(--uui-size-space-1);
      font-size: 0.9375rem;
    }

    .intro-content p {
      margin: 0;
      font-size: 0.8125rem;
      color: var(--uui-color-text-alt);
      line-height: 1.5;
    }

    /* Optional section styling */
    .optional-section {
      border-style: dashed;
    }

    .date-options {
      margin-top: var(--uui-size-space-4);
      padding-top: var(--uui-size-space-4);
      border-top: 1px solid var(--uui-color-border);
    }

    .date-options .form-grid {
      margin-bottom: var(--uui-size-space-4);
    }

    /* Postcode rules */
    .postcode-pattern {
      font-family: var(--uui-font-family-monospace, monospace);
      font-size: 0.875rem;
      padding: 2px 6px;
      background: var(--uui-color-surface-alt);
      border-radius: var(--uui-border-radius);
    }

    .rule-action {
      display: inline-block;
      padding: 2px 8px;
      border-radius: var(--uui-border-radius);
      font-size: 0.8125rem;
      font-weight: 500;
    }

    .rule-action-block {
      background: var(--uui-color-danger);
      color: var(--uui-color-danger-contrast);
    }

    .rule-action-surcharge {
      background: var(--merchello-color-warning-status-background, #8a6500);
      color: #fff;
    }

  `,
  ];
}

export default MerchelloShippingOptionDetailModalElement;

declare global {
  interface HTMLElementTagNameMap {
    "merchello-shipping-option-detail-modal": MerchelloShippingOptionDetailModalElement;
  }
}

