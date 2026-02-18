import { html, css, nothing } from "@umbraco-cms/backoffice/external/lit";
import { customElement, state } from "@umbraco-cms/backoffice/external/lit";
import { UmbModalBaseElement } from "@umbraco-cms/backoffice/modal";
import { UMB_NOTIFICATION_CONTEXT } from "@umbraco-cms/backoffice/notification";
import type { UmbNotificationContext } from "@umbraco-cms/backoffice/notification";
import { MerchelloApi } from "@api/merchello-api.js";
import { getCurrencySymbol, getStoreSettings } from "@api/store-settings.js";
import type { CreateShippingWeightTierDto } from "@shipping/types/shipping.types.js";
import type { ShippingWeightTierModalData, ShippingWeightTierModalValue } from "@shipping/modals/shipping-weight-tier-modal.token.js";
import { modalLayoutStyles } from "@shared/styles/modal-layout.styles.js";

interface CountryOption {
  code: string;
  name: string;
}

interface RegionOption {
  regionCode: string;
  name: string;
}

@customElement("merchello-shipping-weight-tier-modal")
export class MerchelloShippingWeightTierModalElement extends UmbModalBaseElement<
  ShippingWeightTierModalData,
  ShippingWeightTierModalValue
> {
  @state() private _isSaving = false;
  @state() private _isLoadingCountries = true;
  @state() private _isLoadingRegions = false;
  @state() private _countryCode = "";
  @state() private _regionCode = "";
  @state() private _minWeightKg = 0;
  @state() private _maxWeightKg: number | null = null;
  @state() private _surcharge = 0;
  @state() private _currencySymbol = getCurrencySymbol();
  @state() private _countries: CountryOption[] = [];
  @state() private _regions: RegionOption[] = [];

  #notificationContext?: UmbNotificationContext;

  constructor() {
    super();
    this.consumeContext(UMB_NOTIFICATION_CONTEXT, (context) => {
      this.#notificationContext = context;
    });
  }

  override connectedCallback(): void {
    super.connectedCallback();
    this._loadCurrencySymbol();
    this._loadCountries();

    if (this.data?.tier) {
      this._countryCode = this.data.tier.countryCode;
      this._regionCode = this.data.tier.regionCode ?? "";
      this._minWeightKg = this.data.tier.minWeightKg;
      this._maxWeightKg = this.data.tier.maxWeightKg ?? null;
      this._surcharge = this.data.tier.surcharge;

      // Load regions if editing and country is set
      if (this._countryCode && this._countryCode !== "*") {
        this._loadRegions(this._countryCode);
      }
    }
  }

  private async _loadCurrencySymbol(): Promise<void> {
    try {
      await getStoreSettings();
      this._currencySymbol = getCurrencySymbol();
    } catch {
      this._currencySymbol = getCurrencySymbol();
    }
  }

  private async _loadCountries(): Promise<void> {
    this._isLoadingCountries = true;

    // Use warehouse-filtered destinations if warehouseId is provided
    if (this.data?.warehouseId) {
      const { data } = await MerchelloApi.getAvailableDestinationsForWarehouse(this.data.warehouseId);
      if (data) {
        this._countries = data;
      }
    } else {
      // Fallback to all countries
      const { data } = await MerchelloApi.getCountries();
      if (data) {
        this._countries = data;
      }
    }

    this._isLoadingCountries = false;
  }

  private async _loadRegions(countryCode: string): Promise<void> {
    this._isLoadingRegions = true;
    this._regions = [];

    // Use warehouse-filtered regions if warehouseId is provided
    if (this.data?.warehouseId) {
      const { data } = await MerchelloApi.getAvailableRegionsForWarehouse(this.data.warehouseId, countryCode);
      if (data) {
        this._regions = data;
      }
    } else {
      // Fallback to all regions
      const { data } = await MerchelloApi.getLocalityRegions(countryCode);
      if (data) {
        this._regions = data;
      }
    }

    this._isLoadingRegions = false;
  }

  private _handleCountryChange(e: Event): void {
    const value = (e.target as HTMLSelectElement).value;
    this._countryCode = value;
    this._regionCode = "";
    this._regions = [];

    if (value && value !== "*") {
      this._loadRegions(value);
    }
  }

  /** Options for destination dropdown */
  private get _destinationOptions(): Array<{ name: string; value: string; selected?: boolean }> {
    const options: Array<{ name: string; value: string; selected?: boolean }> = [
      { name: "Select a destination...", value: "", selected: !this._countryCode },
      { name: "* All Destinations (Default)", value: "*", selected: this._countryCode === "*" },
    ];

    this._countries.forEach(c => {
      options.push({
        name: c.name,
        value: c.code,
        selected: c.code === this._countryCode
      });
    });

    return options;
  }

  /** Options for region dropdown */
  private get _regionOptions(): Array<{ name: string; value: string; selected?: boolean }> {
    const options: Array<{ name: string; value: string; selected?: boolean }> = [
      { name: "Entire country (all regions)", value: "", selected: !this._regionCode }
    ];

    this._regions.forEach(r => {
      options.push({
        name: r.name,
        value: r.regionCode,
        selected: r.regionCode === this._regionCode
      });
    });

    return options;
  }

  private async _save(): Promise<void> {
    if (!this._countryCode) {
      this.#notificationContext?.peek("warning", {
        data: { headline: "Validation", message: "Country code is required" },
      });
      return;
    }

    if (this._minWeightKg < 0) {
      this.#notificationContext?.peek("warning", {
        data: { headline: "Validation", message: "Min weight must be 0 or greater" },
      });
      return;
    }

    if (this._maxWeightKg !== null && this._maxWeightKg <= this._minWeightKg) {
      this.#notificationContext?.peek("warning", {
        data: { headline: "Validation", message: "Max weight must be greater than min weight" },
      });
      return;
    }

    if (this._surcharge < 0) {
      this.#notificationContext?.peek("warning", {
        data: { headline: "Validation", message: "Surcharge must be 0 or greater" },
      });
      return;
    }

    this._isSaving = true;

    const dto: CreateShippingWeightTierDto = {
      countryCode: this._countryCode.toUpperCase(),
      regionCode: this._regionCode.toUpperCase() || undefined,
      minWeightKg: this._minWeightKg,
      maxWeightKg: this._maxWeightKg ?? undefined,
      surcharge: this._surcharge,
    };

    try {
      const result = this.data?.tier
        ? await MerchelloApi.updateShippingWeightTier(this.data.tier.id, dto)
        : await MerchelloApi.addShippingWeightTier(this.data?.optionId!, dto);

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
          message: this.data?.tier ? "Weight tier updated" : "Weight tier added",
        },
      });

      this.modalContext?.setValue({ isSaved: true });
      this.modalContext?.submit();
    } catch (err) {
      this.#notificationContext?.peek("danger", {
        data: { headline: "Error", message: err instanceof Error ? err.message : "Failed to save" },
      });
    }

    this._isSaving = false;
  }

  private _close(): void {
    this.modalContext?.reject();
  }

  override render() {
    const isEditing = !!this.data?.tier;

    return html`
      <umb-body-layout headline="${isEditing ? 'Edit' : 'Add'} Weight Surcharge">
        <div class="form-content">
          <!-- Info section -->
          <div class="info-box">
            <uui-icon name="icon-info"></uui-icon>
            <span>Add extra charges based on order weight. Surcharges are added on top of the base shipping rate.</span>
          </div>

          <uui-form-layout-item>
            <uui-label slot="label" for="countryCode" required>Destination</uui-label>
            ${this._isLoadingCountries
              ? html`<uui-loader></uui-loader>`
              : html`
                  <uui-select
                    id="countryCode"
                    label="Destination country"
                    .options=${this._destinationOptions}
                    @change=${this._handleCountryChange}
                  ></uui-select>
                `}
            <div slot="description">Choose a specific country or apply to all destinations</div>
          </uui-form-layout-item>

          ${this._countryCode && this._countryCode !== "*"
            ? html`
                <uui-form-layout-item>
                  <uui-label slot="label" for="stateCode">Region/State</uui-label>
                  ${this._isLoadingRegions
                    ? html`<uui-loader></uui-loader>`
                    : this._regions.length > 0
                      ? html`
                          <uui-select
                            id="stateCode"
                            label="Destination region"
                            .options=${this._regionOptions}
                            @change=${(e: Event) => (this._regionCode = (e.target as HTMLSelectElement).value)}
                          ></uui-select>
                        `
                      : html`
                          <uui-input
                            id="stateCode"
                            label="Destination region code"
                            .value=${this._regionCode}
                            @input=${(e: InputEvent) => (this._regionCode = (e.target as HTMLInputElement).value)}
                            placeholder="Optional: CA, NY, etc."
                          ></uui-input>
                        `}
                  <div slot="description">Optionally apply to a specific state or province</div>
                </uui-form-layout-item>
              `
            : nothing}

          <div class="row">
            <uui-form-layout-item>
              <uui-label slot="label" for="minWeight" required>Min Weight (kg)</uui-label>
              <uui-input
                id="minWeight"
                label="Minimum weight"
                type="number"
                step="0.01"
                min="0"
                .value=${this._minWeightKg.toString()}
                @input=${(e: InputEvent) => (this._minWeightKg = parseFloat((e.target as HTMLInputElement).value) || 0)}
                placeholder="0"
              ></uui-input>
            </uui-form-layout-item>

            <uui-form-layout-item>
              <uui-label slot="label" for="maxWeight">Max Weight (kg)</uui-label>
              <uui-input
                id="maxWeight"
                label="Maximum weight"
                type="number"
                step="0.01"
                min="0"
                .value=${this._maxWeightKg?.toString() ?? ""}
                @input=${(e: InputEvent) => {
                  const val = (e.target as HTMLInputElement).value;
                  this._maxWeightKg = val ? parseFloat(val) : null;
                }}
                placeholder="No limit"
              ></uui-input>
            </uui-form-layout-item>
          </div>

          <uui-form-layout-item>
            <uui-label slot="label" for="surcharge" required>Surcharge</uui-label>
            <div class="cost-input-wrapper">
              <span class="currency-symbol">${this._currencySymbol}</span>
              <uui-input
                id="surcharge"
                label="Weight surcharge"
                type="number"
                step="0.01"
                min="0"
                .value=${this._surcharge.toString()}
                @input=${(e: InputEvent) => (this._surcharge = parseFloat((e.target as HTMLInputElement).value) || 0)}
                placeholder="0.00"
              ></uui-input>
            </div>
            <div slot="description">Additional cost added to base shipping rate for this weight range</div>
          </uui-form-layout-item>
        </div>

        <div slot="actions">
          <uui-button label="Cancel" @click=${this._close}>Cancel</uui-button>
          <uui-button
            look="primary"
            color="positive"
            label="${isEditing ? 'Save Surcharge' : 'Add Surcharge'}"
            ?disabled=${this._isSaving || !this._countryCode}
            @click=${this._save}
          >
            ${this._isSaving ? html`<uui-loader-circle></uui-loader-circle>` : nothing}
            ${isEditing ? "Save Surcharge" : "Add Surcharge"}
          </uui-button>
        </div>
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

    .info-box {
      display: flex;
      gap: var(--uui-size-space-3);
      padding: var(--uui-size-space-4);
      background: var(--uui-color-surface-alt);
      border: 1px solid var(--uui-color-border);
      border-radius: var(--uui-border-radius);
      font-size: 0.8125rem;
      color: var(--uui-color-text-alt);
      line-height: 1.5;
    }

    .info-box uui-icon {
      flex-shrink: 0;
      color: var(--uui-color-interactive);
    }

    .row {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: var(--uui-size-space-4);
    }

    uui-select,
    uui-input {
      width: 100%;
    }

    .cost-input-wrapper {
      display: flex;
      align-items: center;
      gap: var(--uui-size-space-2);
    }

    .currency-symbol {
      font-weight: 600;
      font-size: 1.125rem;
      color: var(--uui-color-text-alt);
    }

    .cost-input-wrapper uui-input {
      flex: 1;
      max-width: 150px;
    }

    [slot="actions"] {
      display: flex;
      gap: var(--uui-size-space-3);
    }

    [slot="description"] {
      font-size: 0.8125rem;
      color: var(--uui-color-text-alt);
      margin-top: var(--uui-size-space-1);
    }
  `,
  ];
}

export default MerchelloShippingWeightTierModalElement;

declare global {
  interface HTMLElementTagNameMap {
    "merchello-shipping-weight-tier-modal": MerchelloShippingWeightTierModalElement;
  }
}

