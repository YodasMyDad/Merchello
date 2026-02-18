import { html, css, nothing } from "@umbraco-cms/backoffice/external/lit";
import { customElement, state } from "@umbraco-cms/backoffice/external/lit";
import { UmbModalBaseElement } from "@umbraco-cms/backoffice/modal";
import { UMB_NOTIFICATION_CONTEXT } from "@umbraco-cms/backoffice/notification";
import type { UmbNotificationContext } from "@umbraco-cms/backoffice/notification";
import { MerchelloApi } from "@api/merchello-api.js";
import type { TaxRateModalData, TaxRateModalValue } from "@tax/modals/tax-rate-modal.token.js";
import { modalLayoutStyles } from "@shared/styles/modal-layout.styles.js";

interface CountryOption {
  code: string;
  name: string;
}

interface RegionOption {
  regionCode: string;
  name: string;
}

@customElement("merchello-tax-rate-modal")
export class MerchelloTaxRateModalElement extends UmbModalBaseElement<
  TaxRateModalData,
  TaxRateModalValue
> {
  @state() private _isSaving = false;
  @state() private _isLoadingCountries = true;
  @state() private _isLoadingRegions = false;
  @state() private _countryCode = "";
  @state() private _regionCode = "";
  @state() private _taxPercentage = 0;
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
    this._loadCountries();

    if (this.data?.rate) {
      this._countryCode = this.data.rate.countryCode;
      this._regionCode = this.data.rate.regionCode ?? "";
      this._taxPercentage = this.data.rate.taxPercentage;

      // Load regions if editing and country is set
      if (this._countryCode) {
        this._loadRegions(this._countryCode);
      }
    }
  }

  private async _loadCountries(): Promise<void> {
    this._isLoadingCountries = true;

    // Use locality countries for tax rates
    const { data } = await MerchelloApi.getLocalityCountries();
    if (data) {
      this._countries = data.map((c) => ({ code: c.code, name: c.name }));
    }

    this._isLoadingCountries = false;
  }

  private async _loadRegions(countryCode: string): Promise<void> {
    this._isLoadingRegions = true;
    this._regions = [];

    const { data } = await MerchelloApi.getLocalityRegions(countryCode);
    if (data) {
      this._regions = data.map((r) => ({ regionCode: r.regionCode, name: r.name }));
    }

    this._isLoadingRegions = false;
  }

  private _handleCountryChange(e: Event): void {
    const value = (e.target as HTMLSelectElement).value;
    this._countryCode = value;
    this._regionCode = "";
    this._regions = [];

    if (value) {
      this._loadRegions(value);
    }
  }

  /** Options for country dropdown */
  private get _countryOptions(): Array<{ name: string; value: string; selected?: boolean }> {
    const options: Array<{ name: string; value: string; selected?: boolean }> = [
      { name: "Select a country...", value: "", selected: !this._countryCode },
    ];

    this._countries.forEach((c) => {
      options.push({
        name: c.name,
        value: c.code,
        selected: c.code === this._countryCode,
      });
    });

    return options;
  }

  /** Options for region dropdown */
  private get _regionOptions(): Array<{ name: string; value: string; selected?: boolean }> {
    const options: Array<{ name: string; value: string; selected?: boolean }> = [
      { name: "Entire country (all regions)", value: "", selected: !this._regionCode },
    ];

    this._regions.forEach((r) => {
      options.push({
        name: r.name,
        value: r.regionCode,
        selected: r.regionCode === this._regionCode,
      });
    });

    return options;
  }

  private async _save(): Promise<void> {
    if (!this._countryCode) {
      this.#notificationContext?.peek("warning", {
        data: { headline: "Validation", message: "Country is required" },
      });
      return;
    }

    if (this._taxPercentage < 0 || this._taxPercentage > 100) {
      this.#notificationContext?.peek("warning", {
        data: { headline: "Validation", message: "Tax rate must be between 0 and 100" },
      });
      return;
    }

    this._isSaving = true;

    try {
      if (this.data?.rate) {
        // Update existing rate
        const result = await MerchelloApi.updateTaxGroupRate(this.data.rate.id, {
          taxPercentage: this._taxPercentage,
        });

        if (result.error) {
          this.#notificationContext?.peek("danger", {
            data: { headline: "Error", message: result.error.message },
          });
          this._isSaving = false;
          return;
        }

        this.#notificationContext?.peek("positive", {
          data: { headline: "Success", message: "Tax rate updated" },
        });
      } else {
        // Create new rate
        const result = await MerchelloApi.createTaxGroupRate(this.data!.taxGroupId, {
          countryCode: this._countryCode.toUpperCase(),
          regionCode: this._regionCode.toUpperCase() || undefined,
          taxPercentage: this._taxPercentage,
        });

        if (result.error) {
          this.#notificationContext?.peek("danger", {
            data: { headline: "Error", message: result.error.message },
          });
          this._isSaving = false;
          return;
        }

        this.#notificationContext?.peek("positive", {
          data: { headline: "Success", message: "Tax rate added" },
        });
      }

      this.modalContext?.setValue({ isSaved: true });
      this.modalContext?.submit();
    } catch (err) {
      this.#notificationContext?.peek("danger", {
        data: {
          headline: "Error",
          message: err instanceof Error ? err.message : "Failed to save",
        },
      });
    }

    this._isSaving = false;
  }

  private _close(): void {
    this.modalContext?.reject();
  }

  override render() {
    const isEditing = !!this.data?.rate;

    return html`
      <umb-body-layout headline="${isEditing ? "Edit" : "Add"} Tax Rate">
        <div class="form-content">
          <!-- Info section -->
          <div class="info-box">
            <uui-icon name="icon-info"></uui-icon>
            <span
              >Set the tax rate for a specific country or region. If no specific rate exists for a
              customer's location, 0% tax will be applied.</span
            >
          </div>

          <uui-form-layout-item>
            <uui-label slot="label" for="countryCode" required>Country</uui-label>
            ${this._isLoadingCountries
              ? html`<uui-loader></uui-loader>`
              : html`
                  <uui-select
                    id="countryCode"
                    label="Country"
                    .options=${this._countryOptions}
                    ?disabled=${isEditing}
                    @change=${this._handleCountryChange}
                  ></uui-select>
                `}
            <div slot="description">
              ${isEditing
                ? "Country cannot be changed when editing"
                : "Select the country this tax rate applies to"}
            </div>
          </uui-form-layout-item>

          ${this._countryCode
            ? html`
                <uui-form-layout-item>
                  <uui-label slot="label" for="stateCode">Region/State</uui-label>
                  ${this._isLoadingRegions
                    ? html`<uui-loader></uui-loader>`
                    : this._regions.length > 0
                      ? html`
                          <uui-select
                            id="stateCode"
                            label="Region/State"
                            .options=${this._regionOptions}
                            ?disabled=${isEditing}
                            @change=${(e: Event) =>
                              (this._regionCode = (e.target as HTMLSelectElement).value)}
                          ></uui-select>
                        `
                      : html`
                          <uui-input
                            id="stateCode"
                            label="Region/State"
                            .value=${this._regionCode}
                            ?disabled=${isEditing}
                            @input=${(e: InputEvent) =>
                              (this._regionCode = (e.target as HTMLInputElement).value)}
                            placeholder="Optional: CA, NY, etc."
                          ></uui-input>
                        `}
                  <div slot="description">
                    ${isEditing
                      ? "Region cannot be changed when editing"
                      : "Optionally set a rate for a specific state or province"}
                  </div>
                </uui-form-layout-item>
              `
            : nothing}

          <uui-form-layout-item>
            <uui-label slot="label" for="taxPercentage" required>Tax Rate (%)</uui-label>
            <div class="rate-input-wrapper">
              <uui-input
                id="taxPercentage"
                label="Tax rate"
                type="number"
                step="0.01"
                min="0"
                max="100"
                .value=${this._taxPercentage.toString()}
                @input=${(e: InputEvent) =>
                  (this._taxPercentage = parseFloat((e.target as HTMLInputElement).value) || 0)}
                placeholder="0.00"
              ></uui-input>
              <span class="percent-symbol">%</span>
            </div>
            <div slot="description">The tax percentage (0-100). For example, 20 for 20% VAT.</div>
          </uui-form-layout-item>
        </div>

        <div slot="actions">
          <uui-button label="Cancel" @click=${this._close}>Cancel</uui-button>
          <uui-button
            look="primary"
            color="positive"
            label="${isEditing ? "Save Rate" : "Add Rate"}"
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

    uui-select,
    uui-input {
      width: 100%;
    }

    .rate-input-wrapper {
      display: flex;
      align-items: center;
      gap: var(--uui-size-space-2);
    }

    .percent-symbol {
      font-weight: 600;
      font-size: 1.125rem;
      color: var(--uui-color-text-alt);
    }

    .rate-input-wrapper uui-input {
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

export default MerchelloTaxRateModalElement;

declare global {
  interface HTMLElementTagNameMap {
    "merchello-tax-rate-modal": MerchelloTaxRateModalElement;
  }
}

