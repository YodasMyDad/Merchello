import { html, css, nothing } from "@umbraco-cms/backoffice/external/lit";
import { customElement, state } from "@umbraco-cms/backoffice/external/lit";
import { UmbModalBaseElement } from "@umbraco-cms/backoffice/modal";
import { UMB_NOTIFICATION_CONTEXT } from "@umbraco-cms/backoffice/notification";
import type { UmbNotificationContext } from "@umbraco-cms/backoffice/notification";
import { MerchelloApi } from "@api/merchello-api.js";
import { modalLayoutStyles } from "@shared/styles/modal-layout.styles.js";
import type {
  ShippingDestinationExclusionModalData,
  ShippingDestinationExclusionModalValue,
} from "@shipping/modals/shipping-destination-exclusion-modal.token.js";

interface CountryOption {
  code: string;
  name: string;
}

interface RegionOption {
  regionCode: string;
  name: string;
}

@customElement("merchello-shipping-destination-exclusion-modal")
export class MerchelloShippingDestinationExclusionModalElement extends UmbModalBaseElement<
  ShippingDestinationExclusionModalData,
  ShippingDestinationExclusionModalValue
> {
  @state() private _isSaving = false;
  @state() private _isLoadingCountries = true;
  @state() private _isLoadingRegions = false;
  @state() private _countryCode = "";
  @state() private _regionCode = "";
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

    if (this.data?.exclusion) {
      this._countryCode = this.data.exclusion.countryCode;
      this._regionCode = this.data.exclusion.regionCode ?? "";

      if (this._countryCode) {
        this._loadRegions(this._countryCode);
      }
    }
  }

  private async _loadCountries(): Promise<void> {
    this._isLoadingCountries = true;

    if (this.data?.warehouseId) {
      const { data } = await MerchelloApi.getAvailableDestinationsForWarehouse(this.data.warehouseId);
      if (data) {
        this._countries = data;
      }
    } else {
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

    if (this.data?.warehouseId) {
      const { data } = await MerchelloApi.getAvailableRegionsForWarehouse(this.data.warehouseId, countryCode);
      if (data) {
        this._regions = data;
      }
    } else {
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

    if (value) {
      this._loadRegions(value);
    }
  }

  private get _destinationOptions(): Array<{ name: string; value: string; selected?: boolean }> {
    const options: Array<{ name: string; value: string; selected?: boolean }> = [
      { name: "Select a destination...", value: "", selected: !this._countryCode },
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
        data: { headline: "Validation", message: "Destination country is required" },
      });
      return;
    }

    this._isSaving = true;

    this.modalContext?.setValue({
      isSaved: true,
      exclusion: {
        countryCode: this._countryCode.toUpperCase(),
        regionCode: this._regionCode.toUpperCase() || undefined,
      },
    });
    this.modalContext?.submit();
    this._isSaving = false;
  }

  private _close(): void {
    this.modalContext?.reject();
  }

  override render() {
    const isEditing = !!this.data?.exclusion;

    return html`
      <umb-body-layout headline="${isEditing ? "Edit" : "Add"} Destination Exclusion">
        <div class="form-content">
          <div class="info-box">
            <uui-icon name="icon-alert"></uui-icon>
            <span>Excluded destinations will not see this shipping option during basket estimate or checkout.</span>
          </div>

          <uui-form-layout-item>
            <uui-label slot="label" for="countryCode" required>Destination Country</uui-label>
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
          </uui-form-layout-item>

          ${this._countryCode
            ? html`
                <uui-form-layout-item>
                  <uui-label slot="label" for="stateCode">Region/State (Optional)</uui-label>
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
                            placeholder="Optional region code"
                          ></uui-input>
                        `}
                </uui-form-layout-item>
              `
            : nothing}
        </div>

        <div slot="actions">
          <uui-button label="Cancel" @click=${this._close}>Cancel</uui-button>
          <uui-button
            look="primary"
            color="danger"
            label="${isEditing ? "Save Exclusion" : "Add Exclusion"}"
            ?disabled=${this._isSaving || !this._countryCode}
            @click=${this._save}
          >
            ${isEditing ? "Save Exclusion" : "Add Exclusion"}
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
      color: var(--uui-color-danger);
    }

    uui-select,
    uui-input {
      width: 100%;
    }

    [slot="actions"] {
      display: flex;
      gap: var(--uui-size-space-3);
    }
  `,
  ];
}

export default MerchelloShippingDestinationExclusionModalElement;

declare global {
  interface HTMLElementTagNameMap {
    "merchello-shipping-destination-exclusion-modal": MerchelloShippingDestinationExclusionModalElement;
  }
}

