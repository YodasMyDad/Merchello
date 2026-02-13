import { html, css, nothing } from "@umbraco-cms/backoffice/external/lit";
import { customElement, state } from "@umbraco-cms/backoffice/external/lit";
import { UmbModalBaseElement } from "@umbraco-cms/backoffice/modal";
import { UMB_NOTIFICATION_CONTEXT } from "@umbraco-cms/backoffice/notification";
import type { UmbNotificationContext } from "@umbraco-cms/backoffice/notification";
import { MerchelloApi } from "@api/merchello-api.js";
import { getCurrencySymbol, getStoreSettings } from "@api/store-settings.js";
import type { CreateShippingCostDto } from "@shipping/types/shipping.types.js";
import type { ShippingCostModalData, ShippingCostModalValue } from "@shipping/modals/shipping-cost-modal.token.js";

interface CountryOption {
  code: string;
  name: string;
}

interface RegionOption {
  regionCode: string;
  name: string;
}

@customElement("merchello-shipping-cost-modal")
export class MerchelloShippingCostModalElement extends UmbModalBaseElement<
  ShippingCostModalData,
  ShippingCostModalValue
> {
  @state() private _isSaving = false;
  @state() private _isLoadingCountries = true;
  @state() private _isLoadingRegions = false;
  @state() private _countryCode = "";
  @state() private _regionCode = "";
  @state() private _cost = 0;
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
    
    if (this.data?.cost) {
      this._countryCode = this.data.cost.countryCode;
      this._regionCode = this.data.cost.regionCode ?? "";
      this._cost = this.data.cost.cost;
      
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
      { name: "★ All Destinations (Default Rate)", value: "*", selected: this._countryCode === "*" },
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

    if (this._cost < 0) {
      this.#notificationContext?.peek("warning", {
        data: { headline: "Validation", message: "Cost must be 0 or greater" },
      });
      return;
    }

    this._isSaving = true;

    const dto: CreateShippingCostDto = {
      countryCode: this._countryCode.toUpperCase(),
      regionCode: this._regionCode.toUpperCase() || undefined,
      cost: this._cost,
    };

    try {
      const result = this.data?.cost
        ? await MerchelloApi.updateShippingCost(this.data.cost.id, dto)
        : await MerchelloApi.addShippingCost(this.data?.optionId!, dto);

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
          message: this.data?.cost ? "Cost updated" : "Cost added",
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
    const isEditing = !!this.data?.cost;

    return html`
      <umb-body-layout headline="${isEditing ? 'Edit' : 'Add'} Shipping Rate">
        <div class="form-content">
          <!-- Info section -->
          <div class="info-box">
            <uui-icon name="icon-info"></uui-icon>
            <span>Set the shipping cost for a specific destination. Use "All Destinations" as a default rate that applies when no specific rate is configured.</span>
          </div>

          <uui-form-layout-item>
            <uui-label slot="label" for="countryCode" required>Destination</uui-label>
            ${this._isLoadingCountries
              ? html`<uui-loader></uui-loader>`
              : html`
                  <uui-select
                    id="countryCode"
                    .options=${this._destinationOptions}
                    @change=${this._handleCountryChange}
                  ></uui-select>
                `}
            <div slot="description">Choose a specific country or set a default rate for all destinations</div>
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
                            .options=${this._regionOptions}
                            @change=${(e: Event) => (this._regionCode = (e.target as HTMLSelectElement).value)}
                          ></uui-select>
                        `
                      : html`
                          <uui-input
                            id="stateCode"
                            .value=${this._regionCode}
                            @input=${(e: InputEvent) => (this._regionCode = (e.target as HTMLInputElement).value)}
                            placeholder="Optional: CA, NY, etc."
                          ></uui-input>
                        `}
                  <div slot="description">Optionally set a rate for a specific state or province</div>
                </uui-form-layout-item>
              `
            : nothing}

          <uui-form-layout-item>
            <uui-label slot="label" for="cost" required>Shipping Rate</uui-label>
            <div class="cost-input-wrapper">
              <span class="currency-symbol">${this._currencySymbol}</span>
              <uui-input
                id="cost"
                type="number"
                step="0.01"
                min="0"
                .value=${this._cost.toString()}
                @input=${(e: InputEvent) => (this._cost = parseFloat((e.target as HTMLInputElement).value) || 0)}
                placeholder="0.00"
              ></uui-input>
            </div>
            <div slot="description">The shipping cost charged to customers for this destination</div>
          </uui-form-layout-item>
        </div>

        <div slot="actions">
          <uui-button label="Cancel" @click=${this._close}>Cancel</uui-button>
          <uui-button
            look="primary"
            color="positive"
            label="${isEditing ? 'Save Rate' : 'Add Rate'}"
            ?disabled=${this._isSaving || !this._countryCode}
            @click=${this._save}
          >
            ${this._isSaving ? html`<uui-loader-circle></uui-loader-circle>` : nothing}
            ${isEditing ? "Save Rate" : "Add Rate"}
          </uui-button>
        </div>
      </umb-body-layout>
    `;
  }

  static override readonly styles = css`
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
  `;
}

export default MerchelloShippingCostModalElement;

declare global {
  interface HTMLElementTagNameMap {
    "merchello-shipping-cost-modal": MerchelloShippingCostModalElement;
  }
}
