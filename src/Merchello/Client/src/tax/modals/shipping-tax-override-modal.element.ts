import { html, css, nothing } from "@umbraco-cms/backoffice/external/lit";
import { customElement, state } from "@umbraco-cms/backoffice/external/lit";
import { UmbModalBaseElement } from "@umbraco-cms/backoffice/modal";
import { UMB_NOTIFICATION_CONTEXT } from "@umbraco-cms/backoffice/notification";
import type { UmbNotificationContext } from "@umbraco-cms/backoffice/notification";
import { MerchelloApi } from "@api/merchello-api.js";
import type { TaxGroupDto } from "@orders/types/order.types.js";
import type {
  ShippingTaxOverrideModalData,
  ShippingTaxOverrideModalValue,
} from "./shipping-tax-override-modal.token.js";

interface CountryOption {
  code: string;
  name: string;
}

interface RegionOption {
  regionCode: string;
  name: string;
}

@customElement("merchello-shipping-tax-override-modal")
export class MerchelloShippingTaxOverrideModalElement extends UmbModalBaseElement<
  ShippingTaxOverrideModalData,
  ShippingTaxOverrideModalValue
> {
  @state() private _isSaving = false;
  @state() private _isLoadingCountries = true;
  @state() private _isLoadingRegions = false;
  @state() private _isLoadingTaxGroups = true;
  @state() private _countryCode = "";
  @state() private _stateOrProvinceCode = "";
  @state() private _shippingTaxGroupId: string | null = null;
  @state() private _countries: CountryOption[] = [];
  @state() private _regions: RegionOption[] = [];
  @state() private _taxGroups: TaxGroupDto[] = [];

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
    this._loadTaxGroups();

    if (this.data?.override) {
      this._countryCode = this.data.override.countryCode;
      this._stateOrProvinceCode = this.data.override.stateOrProvinceCode ?? "";
      this._shippingTaxGroupId = this.data.override.shippingTaxGroupId ?? null;

      // Load regions if editing and country is set
      if (this._countryCode) {
        this._loadRegions(this._countryCode);
      }
    }
  }

  private async _loadCountries(): Promise<void> {
    this._isLoadingCountries = true;

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

  private async _loadTaxGroups(): Promise<void> {
    this._isLoadingTaxGroups = true;

    const { data } = await MerchelloApi.getTaxGroups();
    if (data) {
      this._taxGroups = data;
    }

    this._isLoadingTaxGroups = false;
  }

  private _handleCountryChange(e: Event): void {
    const value = (e.target as HTMLSelectElement).value;
    this._countryCode = value;
    this._stateOrProvinceCode = "";
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
      { name: "Entire country (all regions)", value: "", selected: !this._stateOrProvinceCode },
    ];

    this._regions.forEach((r) => {
      options.push({
        name: r.name,
        value: r.regionCode,
        selected: r.regionCode === this._stateOrProvinceCode,
      });
    });

    return options;
  }

  /** Options for tax group dropdown */
  private get _taxGroupOptions(): Array<{ name: string; value: string; selected?: boolean }> {
    const options: Array<{ name: string; value: string; selected?: boolean }> = [
      {
        name: "No shipping tax (never taxed)",
        value: "",
        selected: !this._shippingTaxGroupId,
      },
    ];

    this._taxGroups.forEach((tg) => {
      options.push({
        name: `${tg.name} (${tg.taxPercentage}%)`,
        value: tg.id,
        selected: tg.id === this._shippingTaxGroupId,
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

    this._isSaving = true;

    try {
      if (this.data?.override) {
        // Update existing override
        const result = await MerchelloApi.updateShippingTaxOverride(this.data.override.id, {
          shippingTaxGroupId: this._shippingTaxGroupId || undefined,
        });

        if (result.error) {
          this.#notificationContext?.peek("danger", {
            data: { headline: "Error", message: result.error.message },
          });
          this._isSaving = false;
          return;
        }

        this.#notificationContext?.peek("positive", {
          data: { headline: "Success", message: "Shipping tax override updated" },
        });
      } else {
        // Create new override
        const result = await MerchelloApi.createShippingTaxOverride({
          countryCode: this._countryCode.toUpperCase(),
          stateOrProvinceCode: this._stateOrProvinceCode.toUpperCase() || undefined,
          shippingTaxGroupId: this._shippingTaxGroupId || undefined,
        });

        if (result.error) {
          this.#notificationContext?.peek("danger", {
            data: { headline: "Error", message: result.error.message },
          });
          this._isSaving = false;
          return;
        }

        this.#notificationContext?.peek("positive", {
          data: { headline: "Success", message: "Shipping tax override added" },
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
    const isEditing = !!this.data?.override;

    return html`
      <umb-body-layout headline="${isEditing ? "Edit" : "Add"} Shipping Tax Override">
        <div class="form-content">
          <!-- Info section -->
          <div class="info-box">
            <uui-icon name="icon-info"></uui-icon>
            <span>
              Regional shipping tax overrides take precedence over global settings. Set a tax group
              to apply that rate to shipping, or leave empty to indicate shipping is never taxed in
              this region.
            </span>
          </div>

          <uui-form-layout-item>
            <uui-label slot="label" for="countryCode" required>Country</uui-label>
            ${this._isLoadingCountries
              ? html`<uui-loader></uui-loader>`
              : html`
                  <uui-select
                    id="countryCode"
                    .options=${this._countryOptions}
                    ?disabled=${isEditing}
                    @change=${this._handleCountryChange}
                  ></uui-select>
                `}
            <div slot="description">
              ${isEditing
                ? "Country cannot be changed when editing"
                : "Select the country this override applies to"}
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
                            .options=${this._regionOptions}
                            ?disabled=${isEditing}
                            @change=${(e: Event) =>
                              (this._stateOrProvinceCode = (e.target as HTMLSelectElement).value)}
                          ></uui-select>
                        `
                      : html`
                          <uui-input
                            id="stateCode"
                            .value=${this._stateOrProvinceCode}
                            ?disabled=${isEditing}
                            @input=${(e: InputEvent) =>
                              (this._stateOrProvinceCode = (e.target as HTMLInputElement).value)}
                            placeholder="Optional: CA, NY, etc."
                          ></uui-input>
                        `}
                  <div slot="description">
                    ${isEditing
                      ? "Region cannot be changed when editing"
                      : "Optionally set an override for a specific state or province"}
                  </div>
                </uui-form-layout-item>
              `
            : nothing}

          <uui-form-layout-item>
            <uui-label slot="label" for="taxGroupId">Shipping Tax Group</uui-label>
            ${this._isLoadingTaxGroups
              ? html`<uui-loader></uui-loader>`
              : html`
                  <uui-select
                    id="taxGroupId"
                    .options=${this._taxGroupOptions}
                    @change=${(e: Event) => {
                      const value = (e.target as HTMLSelectElement).value;
                      this._shippingTaxGroupId = value || null;
                    }}
                  ></uui-select>
                `}
            <div slot="description">
              Select a tax group to apply that rate to shipping. Leave empty to indicate shipping is
              never taxed in this region.
            </div>
          </uui-form-layout-item>
        </div>

        <div slot="actions">
          <uui-button label="Cancel" @click=${this._close}>Cancel</uui-button>
          <uui-button
            look="primary"
            color="positive"
            label="${isEditing ? "Save Override" : "Add Override"}"
            ?disabled=${this._isSaving || !this._countryCode}
            @click=${this._save}
          >
            ${this._isSaving ? html`<uui-loader-circle></uui-loader-circle>` : nothing}
            ${isEditing ? "Save Override" : "Add Override"}
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

export default MerchelloShippingTaxOverrideModalElement;

declare global {
  interface HTMLElementTagNameMap {
    "merchello-shipping-tax-override-modal": MerchelloShippingTaxOverrideModalElement;
  }
}
