import { html, css, nothing } from "@umbraco-cms/backoffice/external/lit";
import { customElement, state } from "@umbraco-cms/backoffice/external/lit";
import { UmbModalBaseElement } from "@umbraco-cms/backoffice/modal";
import { UMB_MODAL_MANAGER_CONTEXT } from "@umbraco-cms/backoffice/modal";
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
} from "@shipping/types.js";
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
    }
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
        this._isEnabled = data.isEnabled ?? true;
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

      // If creating new, update _detail so we can add costs/tiers
      if (!existingId && result.data) {
        this._detail = result.data;
      }

      this.modalContext?.setValue({ saved: true });

      // Only close if creating new, otherwise stay open for editing costs/tiers
      if (!existingId) {
        // Update data so we're now in edit mode
        if (result.data) {
          this._detail = result.data;
        }
      }
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
      data: { cost, optionId: this._detail.id },
    });

    const result = await modal.onSubmit().catch(() => undefined);
    if (result?.saved) {
      await this._loadDetail();
    }
  }

  private async _deleteCost(cost: ShippingCostDto): Promise<void> {
    if (!confirm(`Delete cost for ${cost.regionDisplay ?? cost.countryCode}?`)) return;

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
      data: { tier, optionId: this._detail.id },
    });

    const result = await modal.onSubmit().catch(() => undefined);
    if (result?.saved) {
      await this._loadDetail();
    }
  }

  private async _deleteWeightTier(tier: ShippingWeightTierDto): Promise<void> {
    if (!confirm(`Delete weight tier ${tier.weightRangeDisplay}?`)) return;

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
    this.modalContext?.setValue({ saved: this._detail !== null });
    this.modalContext?.submit();
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
                        .value=${this._warehouseId}
                        @change=${(e: Event) => (this._warehouseId = (e.target as HTMLSelectElement).value)}
                      >
                        <option value="">Select a warehouse...</option>
                        ${this._warehouses.map(
                          (w) => html`<option value="${w.id}" ?selected=${w.id === this._warehouseId}>${w.name}</option>`
                        )}
                      </uui-select>
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
                  .value=${this._fixedCost?.toString() ?? ""}
                  @input=${(e: InputEvent) => {
                    const val = (e.target as HTMLInputElement).value;
                    this._fixedCost = val ? parseFloat(val) : null;
                  }}
                  placeholder="0.00"
                ></uui-input>
                <span slot="description">Single price for all destinations, or leave empty to use rates below</span>
              </uui-form-layout-item>

              <uui-form-layout-item class="toggle-item">
                <uui-toggle
                  .checked=${this._isEnabled}
                  @change=${(e: Event) => (this._isEnabled = (e.target as HTMLInputElement).checked)}
                  label="Enabled"
                ></uui-toggle>
                <span slot="description">Disabled options won't appear at checkout</span>
              </uui-form-layout-item>
            </div>
          </uui-box>

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

                    <uui-form-layout-item>
                      <uui-label slot="label" for="allowedDays">Available Days</uui-label>
                      <uui-input
                        id="allowedDays"
                        .value=${this._allowedDaysOfWeek}
                        @input=${(e: InputEvent) => (this._allowedDaysOfWeek = (e.target as HTMLInputElement).value)}
                        placeholder="Mon,Tue,Wed,Thu,Fri"
                      ></uui-input>
                      <span slot="description">Which days of the week deliveries are available. Leave empty for all days.</span>
                    </uui-form-layout-item>

                    <uui-form-layout-item class="toggle-item">
                      <uui-toggle
                        .checked=${this._isDeliveryDateGuaranteed}
                        @change=${(e: Event) => (this._isDeliveryDateGuaranteed = (e.target as HTMLInputElement).checked)}
                        label="Guarantee delivery date"
                      ></uui-toggle>
                      <span slot="description">Promise delivery on the selected date (not just estimated)</span>
                    </uui-form-layout-item>
                  </div>
                `
              : nothing}
          </uui-box>

          ${this._detail ? this._renderCostsTable() : nothing}
          ${this._detail ? this._renderWeightTiersTable() : nothing}
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
      height: 100%;
      --modal-width: 700px;
    }

    umb-body-layout {
      --umb-body-layout-header-padding: var(--uui-size-space-4) var(--uui-size-space-5);
    }

    .form-content {
      padding: var(--uui-size-layout-1);
      display: flex;
      flex-direction: column;
      gap: var(--uui-size-space-5);
      min-width: 600px;
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
      padding: var(--uui-size-space-4);
      border-top: 1px solid var(--uui-color-border);
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
  `;
}

export default MerchelloShippingOptionDetailModalElement;

declare global {
  interface HTMLElementTagNameMap {
    "merchello-shipping-option-detail-modal": MerchelloShippingOptionDetailModalElement;
  }
}
