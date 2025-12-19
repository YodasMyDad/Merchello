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
  CreateShippingOptionDto,
  WarehouseDto,
  AvailableProviderDto,
  ProviderMethodConfigDto,
} from "@shipping/types/shipping.types.js";
import type { ShippingOptionDetailModalData, ShippingOptionDetailModalValue } from "./shipping-option-detail-modal.token.js";
import { MERCHELLO_SHIPPING_COST_MODAL } from "./shipping-cost-modal.token.js";
import { MERCHELLO_SHIPPING_WEIGHT_TIER_MODAL } from "./shipping-weight-tier-modal.token.js";

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

  // Provider selection
  @state() private _availableProviders: AvailableProviderDto[] = [];
  @state() private _methodConfig: ProviderMethodConfigDto | null = null;
  @state() private _isLoadingProviders = false;

  // Form fields
  @state() private _name = "";
  @state() private _warehouseId = "";
  @state() private _fixedCost: number | null = null;
  @state() private _daysFrom = 3;
  @state() private _daysTo = 5;
  @state() private _isNextDay = false;
  @state() private _nextDayCutOffTime = "";
  @state() private _allowsDeliveryDateSelection = false;
  @state() private _minDeliveryDays: number | null = null;
  @state() private _maxDeliveryDays: number | null = null;
  @state() private _allowedDaysOfWeek = "";
  @state() private _isDeliveryDateGuaranteed = false;
  @state() private _providerKey = "flat-rate";
  @state() private _serviceType: string | null = null;
  @state() private _providerSettings: Record<string, string> = {};
  @state() private _isEnabled = true;

  #modalManager?: UmbModalManagerContext;
  #notificationContext?: UmbNotificationContext;

  /** Whether warehouse is pre-selected and should not show dropdown */
  private get _hasFixedWarehouse(): boolean {
    return !!this.data?.warehouseId;
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

  connectedCallback(): void {
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
    } else {
      // New option - load available providers
      this._loadAvailableProviders();
    }
  }

  private async _loadAvailableProviders(): Promise<void> {
    this._isLoadingProviders = true;
    try {
      const { data } = await MerchelloApi.getAvailableProvidersForWarehouse();
      if (data) {
        this._availableProviders = data;
      }
    } catch (err) {
      console.error("Failed to load providers:", err);
    }
    this._isLoadingProviders = false;
  }

  private async _onProviderChange(providerKey: string): Promise<void> {
    this._providerKey = providerKey;
    this._serviceType = null;
    this._providerSettings = {};
    this._methodConfig = null;

    if (providerKey !== "flat-rate") {
      // Load method config for external providers
      try {
        const { data } = await MerchelloApi.getShippingProviderMethodConfig(providerKey);
        if (data) {
          this._methodConfig = data;
        }
      } catch (err) {
        console.error("Failed to load method config:", err);
      }
    }
  }

  /** Whether this provider uses live rates (external API) */
  private get _usesLiveRates(): boolean {
    if (this._providerKey === "flat-rate") return false;
    const provider = this._availableProviders.find(p => p.key === this._providerKey);
    return provider?.capabilities?.usesLiveRates ?? false;
  }

  /** Options for the provider dropdown - uui-select requires .options property */
  private get _providerOptions(): Array<{ name: string; value: string; selected?: boolean }> {
    const options: Array<{ name: string; value: string; selected?: boolean }> = [
      { name: "Flat Rate (Manual Pricing)", value: "flat-rate", selected: this._providerKey === "flat-rate" }
    ];

    // Add external providers that are available
    this._availableProviders
      .filter(p => p.isAvailable && p.key !== "flat-rate")
      .forEach(p => {
        options.push({
          name: `${p.displayName}${p.capabilities?.usesLiveRates ? " (Live Rates)" : ""}`,
          value: p.key,
          selected: p.key === this._providerKey
        });
      });

    return options;
  }

  /** Options for the service type dropdown */
  private get _serviceTypeOptions(): Array<{ name: string; value: string; selected?: boolean }> {
    const options: Array<{ name: string; value: string; selected?: boolean }> = [
      { name: "Select a service type...", value: "", selected: !this._serviceType }
    ];

    const serviceTypeField = this._methodConfig?.fields.find(f => f.key === "serviceType");
    serviceTypeField?.options?.forEach(o => {
      options.push({
        name: o.label,
        value: o.value,
        selected: o.value === this._serviceType
      });
    });

    return options;
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
        this._fixedCost = data.fixedCost ?? null;
        this._daysFrom = data.daysFrom;
        this._daysTo = data.daysTo;
        this._isNextDay = data.isNextDay;
        this._nextDayCutOffTime = data.nextDayCutOffTime ?? "";
        this._allowsDeliveryDateSelection = data.allowsDeliveryDateSelection;
        this._minDeliveryDays = data.minDeliveryDays ?? null;
        this._maxDeliveryDays = data.maxDeliveryDays ?? null;
        this._allowedDaysOfWeek = data.allowedDaysOfWeek ?? "";
        this._isDeliveryDateGuaranteed = data.isDeliveryDateGuaranteed;
        this._providerKey = data.providerKey ?? "flat-rate";
        this._serviceType = data.serviceType ?? null;
        this._providerSettings = data.providerSettings ?? {};
        this._isEnabled = data.isEnabled ?? true;

        // Load method config if external provider
        if (this._providerKey !== "flat-rate") {
          await this._loadAvailableProviders();
          const { data: methodConfig } = await MerchelloApi.getShippingProviderMethodConfig(this._providerKey);
          if (methodConfig) {
            this._methodConfig = methodConfig;
          }
        }
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

    // Validate service type for external providers
    if (this._usesLiveRates && !this._serviceType) {
      this.#notificationContext?.peek("warning", {
        data: { headline: "Validation", message: "Service type is required for this provider" },
      });
      return;
    }

    this._isSaving = true;

    const dto: CreateShippingOptionDto = {
      name: this._name,
      warehouseId: this._warehouseId,
      fixedCost: this._fixedCost ?? undefined,
      daysFrom: this._daysFrom,
      daysTo: this._daysTo,
      isNextDay: this._isNextDay,
      nextDayCutOffTime: this._nextDayCutOffTime || undefined,
      allowsDeliveryDateSelection: this._allowsDeliveryDateSelection,
      minDeliveryDays: this._minDeliveryDays ?? undefined,
      maxDeliveryDays: this._maxDeliveryDays ?? undefined,
      allowedDaysOfWeek: this._allowedDaysOfWeek || undefined,
      isDeliveryDateGuaranteed: this._isDeliveryDateGuaranteed,
      providerKey: this._providerKey,
      serviceType: this._serviceType ?? undefined,
      providerSettings: Object.keys(this._providerSettings).length > 0 ? this._providerSettings : undefined,
      isEnabled: this._isEnabled,
    };

    try {
      const existingId = this.data?.option?.id || this.data?.optionId || this._detail?.id;
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

      this.#notificationContext?.peek("positive", {
        data: {
          headline: "Success",
          message: existingId ? "Shipping option updated" : "Shipping option created",
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
        content: `Are you sure you want to delete the shipping cost for ${displayName}?`,
        confirmLabel: "Delete",
        color: "danger",
      },
    });

    const result = await modalContext?.onSubmit().catch(() => undefined);
    if (!result) return; // User cancelled

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
        content: `Are you sure you want to delete the weight tier "${displayName}"?`,
        confirmLabel: "Delete",
        color: "danger",
      },
    });

    const result = await modalContext?.onSubmit().catch(() => undefined);
    if (!result) return; // User cancelled

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
          ? html`<p class="no-items">No destination rates configured. Add rates or use the Fixed Cost above.</p>`
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
                        <td class="cost-cell">$${cost.cost.toFixed(2)}</td>
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
                        <td class="cost-cell">+$${tier.surcharge.toFixed(2)}</td>
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

  render() {
    const isEditing = !!(this.data?.option || this.data?.optionId);

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

          <!-- Intro guidance -->
          <div class="intro-banner">
            <div class="intro-icon">
              <uui-icon name="icon-truck"></uui-icon>
            </div>
            <div class="intro-content">
              <strong>Shipping Option</strong>
              <p>A shipping option is a delivery method you offer to customers (e.g., "Standard Shipping", "Express Delivery"). Set the pricing, delivery time, and which destinations it's available for.</p>
            </div>
          </div>

          <uui-box headline="Basic Settings">
            <div class="form-grid">
              <!-- Provider Selection (only for new options) -->
              ${!isEditing
                ? html`
                    <uui-form-layout-item class="full-width">
                      <uui-label slot="label" for="provider" required>Provider</uui-label>
                      <uui-select
                        id="provider"
                        .options=${this._providerOptions}
                        @change=${(e: Event) => this._onProviderChange((e.target as HTMLSelectElement).value)}
                        ?disabled=${this._isLoadingProviders}
                      ></uui-select>
                      <span slot="description">
                        ${this._usesLiveRates
                          ? "Rates will be calculated in real-time from the provider's API"
                          : "You'll configure manual pricing below"}
                      </span>
                    </uui-form-layout-item>
                  `
                : html`
                    <!-- Show provider badge for existing options -->
                    <uui-form-layout-item class="full-width">
                      <uui-label slot="label">Provider</uui-label>
                      <div class="provider-badge">
                        <span class="badge ${this._usesLiveRates ? "badge-live" : "badge-manual"}">
                          ${this._detail?.providerDisplayName ?? this._providerKey}
                          ${this._usesLiveRates ? " (Live Rates)" : ""}
                        </span>
                      </div>
                    </uui-form-layout-item>
                  `}

              <!-- Service Type for external providers -->
              ${this._usesLiveRates && this._methodConfig
                ? html`
                    <uui-form-layout-item class="full-width">
                      <uui-label slot="label" for="serviceType" required>Service Type</uui-label>
                      <uui-select
                        id="serviceType"
                        .options=${this._serviceTypeOptions}
                        @change=${(e: Event) => {
                          this._serviceType = (e.target as HTMLSelectElement).value || null;
                          // Auto-fill name from service type if empty
                          if (!this._name && this._serviceType) {
                            const field = this._methodConfig?.fields.find(f => f.key === "serviceType");
                            const option = field?.options?.find(o => o.value === this._serviceType);
                            if (option) {
                              this._name = option.label;
                            }
                          }
                        }}
                      ></uui-select>
                      <span slot="description">The carrier service to use for this shipping method</span>
                    </uui-form-layout-item>
                  `
                : nothing}

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
                        .options=${this._warehouseOptions}
                        @change=${(e: Event) => (this._warehouseId = (e.target as HTMLSelectElement).value)}
                      ></uui-select>
                    </uui-form-layout-item>
                  `
                : nothing}

              <!-- Fixed Cost only for flat-rate -->
              ${!this._usesLiveRates
                ? html`
                    <uui-form-layout-item>
                      <uui-label slot="label" for="fixedCost">Fixed Cost</uui-label>
                      <uui-input
                        id="fixedCost"
                        type="number"
                        step="0.01"
                        min="0"
                        .value=${this._fixedCost?.toString() ?? ""}
                        @input=${(e: InputEvent) => {
                          const val = (e.target as HTMLInputElement).value;
                          this._fixedCost = val ? parseFloat(val) : null;
                        }}
                        placeholder="0.00"
                      ></uui-input>
                      <span slot="description">Single price for all destinations, or leave empty to use rates below</span>
                    </uui-form-layout-item>
                  `
                : nothing}

              <!-- Markup for live rates providers -->
              ${this._usesLiveRates
                ? html`
                    <uui-form-layout-item>
                      <uui-label slot="label" for="markup">Markup %</uui-label>
                      <uui-input
                        id="markup"
                        type="number"
                        step="0.1"
                        min="0"
                        .value=${this._providerSettings["markup"] ?? "0"}
                        @input=${(e: InputEvent) => {
                          const val = (e.target as HTMLInputElement).value;
                          this._providerSettings = { ...this._providerSettings, markup: val || "0" };
                        }}
                        placeholder="0"
                      ></uui-input>
                      <span slot="description">Percentage to add to carrier rates (e.g., 10 for 10%)</span>
                    </uui-form-layout-item>
                  `
                : nothing}

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

          <!-- Delivery Time only for flat-rate (live rate providers get transit time from API) -->
          ${!this._usesLiveRates
            ? html`
                <uui-box headline="Delivery Time">
                  <p class="section-hint">Estimated delivery time shown to customers (e.g., "5-10 business days")</p>
                  <div class="form-grid">
                    <uui-form-layout-item>
                      <uui-label slot="label" for="daysFrom">Minimum Days</uui-label>
                      <uui-input
                        id="daysFrom"
                        type="number"
                        min="0"
                        .value=${this._daysFrom.toString()}
                        @input=${(e: InputEvent) => (this._daysFrom = parseInt((e.target as HTMLInputElement).value) || 0)}
                      ></uui-input>
                    </uui-form-layout-item>

                    <uui-form-layout-item>
                      <uui-label slot="label" for="daysTo">Maximum Days</uui-label>
                      <uui-input
                        id="daysTo"
                        type="number"
                        min="0"
                        .value=${this._daysTo.toString()}
                        @input=${(e: InputEvent) => (this._daysTo = parseInt((e.target as HTMLInputElement).value) || 0)}
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
              `
            : nothing}

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
                      <div class="day-picker">
                        ${this._renderDayCheckboxes()}
                      </div>
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

          <!-- Costs and weight tiers only for flat-rate -->
          ${this._detail && !this._usesLiveRates ? this._renderCostsTable() : nothing}
          ${this._detail && !this._usesLiveRates ? this._renderWeightTiersTable() : nothing}

          <!-- Info banner for live rates providers -->
          ${this._usesLiveRates
            ? html`
                <div class="live-rates-banner">
                  <uui-icon name="icon-cloud"></uui-icon>
                  <div>
                    <strong>Live Rates from ${this._detail?.providerDisplayName ?? this._providerKey}</strong>
                    <p>Shipping costs are calculated in real-time from the carrier's API based on package weight, dimensions, and destination. Use the markup field above to add a percentage to the carrier's rates.</p>
                  </div>
                </div>
              `
            : nothing}
        </div>

        <div slot="actions">
          <uui-button label="Cancel" @click=${this._close}>Cancel</uui-button>
          <uui-button
            look="primary"
            label="${isEditing ? 'Save' : 'Create'}"
            ?disabled=${this._isSaving}
            @click=${this._save}
          >
            ${this._isSaving ? html`<uui-loader-circle></uui-loader-circle>` : nothing}
            ${isEditing ? "Save" : "Create"}
          </uui-button>
        </div>
      </umb-body-layout>
    `;
  }

  static styles = css`
    :host {
      display: block;
    }

    .form-content {
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

    [slot="actions"] {
      display: flex;
      gap: var(--uui-size-space-3);
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

    /* Provider badges */
    .provider-badge {
      display: flex;
      align-items: center;
      padding: var(--uui-size-space-2) 0;
    }

    .badge {
      display: inline-flex;
      align-items: center;
      padding: var(--uui-size-space-1) var(--uui-size-space-3);
      border-radius: var(--uui-border-radius);
      font-size: 0.8125rem;
      font-weight: 500;
    }

    .badge-manual {
      background: var(--uui-color-surface-alt);
      color: var(--uui-color-text);
      border: 1px solid var(--uui-color-border);
    }

    .badge-live {
      background: var(--uui-color-positive-standalone);
      color: white;
    }

    /* Live rates info banner */
    .live-rates-banner {
      display: flex;
      gap: var(--uui-size-space-4);
      padding: var(--uui-size-space-5);
      background: linear-gradient(135deg, #e8f5e9 0%, #f1f8e9 100%);
      border: 1px solid #c8e6c9;
      border-left: 4px solid var(--uui-color-positive);
      border-radius: var(--uui-border-radius);
    }

    .live-rates-banner uui-icon {
      flex-shrink: 0;
      font-size: 1.5rem;
      color: var(--uui-color-positive);
    }

    .live-rates-banner strong {
      display: block;
      margin-bottom: var(--uui-size-space-2);
      color: var(--uui-color-text);
    }

    .live-rates-banner p {
      margin: 0;
      font-size: 0.8125rem;
      color: var(--uui-color-text-alt);
      line-height: 1.5;
    }
  `;
}

export default MerchelloShippingOptionDetailModalElement;

declare global {
  interface HTMLElementTagNameMap {
    "merchello-shipping-option-detail-modal": MerchelloShippingOptionDetailModalElement;
  }
}
