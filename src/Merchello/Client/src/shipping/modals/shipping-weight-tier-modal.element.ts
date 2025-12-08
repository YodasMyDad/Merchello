import { html, css, nothing } from "@umbraco-cms/backoffice/external/lit";
import { customElement, state } from "@umbraco-cms/backoffice/external/lit";
import { UmbModalBaseElement } from "@umbraco-cms/backoffice/modal";
import { UMB_NOTIFICATION_CONTEXT } from "@umbraco-cms/backoffice/notification";
import type { UmbNotificationContext } from "@umbraco-cms/backoffice/notification";
import { MerchelloApi } from "@api/merchello-api.js";
import type { CreateShippingWeightTierDto } from "@shipping/types.js";
import type { ShippingWeightTierModalData, ShippingWeightTierModalValue } from "./shipping-weight-tier-modal.token.js";

@customElement("merchello-shipping-weight-tier-modal")
export class MerchelloShippingWeightTierModalElement extends UmbModalBaseElement<
  ShippingWeightTierModalData,
  ShippingWeightTierModalValue
> {
  @state() private _isSaving = false;
  @state() private _countryCode = "";
  @state() private _stateOrProvinceCode = "";
  @state() private _minWeightKg = 0;
  @state() private _maxWeightKg: number | null = null;
  @state() private _surcharge = 0;

  #notificationContext?: UmbNotificationContext;

  constructor() {
    super();
    this.consumeContext(UMB_NOTIFICATION_CONTEXT, (context) => {
      this.#notificationContext = context;
    });
  }

  connectedCallback(): void {
    super.connectedCallback();
    if (this.data?.tier) {
      this._countryCode = this.data.tier.countryCode;
      this._stateOrProvinceCode = this.data.tier.stateOrProvinceCode ?? "";
      this._minWeightKg = this.data.tier.minWeightKg;
      this._maxWeightKg = this.data.tier.maxWeightKg ?? null;
      this._surcharge = this.data.tier.surcharge;
    }
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
      stateOrProvinceCode: this._stateOrProvinceCode.toUpperCase() || undefined,
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

      this.modalContext?.setValue({ saved: true });
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

  render() {
    const isEditing = !!this.data?.tier;

    return html`
      <umb-body-layout headline="${isEditing ? 'Edit' : 'Add'} Weight Tier">
        <div class="form-content">
          <uui-form-layout-item>
            <uui-label slot="label" for="countryCode" required>Country Code</uui-label>
            <uui-input
              id="countryCode"
              .value=${this._countryCode}
              @input=${(e: InputEvent) => (this._countryCode = (e.target as HTMLInputElement).value)}
              placeholder="GB, US, * for all"
            ></uui-input>
            <div slot="description">Use * for all countries</div>
          </uui-form-layout-item>

          <uui-form-layout-item>
            <uui-label slot="label" for="stateCode">State/Province Code</uui-label>
            <uui-input
              id="stateCode"
              .value=${this._stateOrProvinceCode}
              @input=${(e: InputEvent) => (this._stateOrProvinceCode = (e.target as HTMLInputElement).value)}
              placeholder="CA, NY (optional)"
            ></uui-input>
            <div slot="description">Leave empty for country-wide tier</div>
          </uui-form-layout-item>

          <div class="row">
            <uui-form-layout-item>
              <uui-label slot="label" for="minWeight" required>Min Weight (kg)</uui-label>
              <uui-input
                id="minWeight"
                type="number"
                step="0.01"
                min="0"
                .value=${this._minWeightKg.toString()}
                @input=${(e: InputEvent) => (this._minWeightKg = parseFloat((e.target as HTMLInputElement).value) || 0)}
              ></uui-input>
            </uui-form-layout-item>

            <uui-form-layout-item>
              <uui-label slot="label" for="maxWeight">Max Weight (kg)</uui-label>
              <uui-input
                id="maxWeight"
                type="number"
                step="0.01"
                min="0"
                .value=${this._maxWeightKg?.toString() ?? ""}
                @input=${(e: InputEvent) => {
                  const val = (e.target as HTMLInputElement).value;
                  this._maxWeightKg = val ? parseFloat(val) : null;
                }}
                placeholder="Leave empty for unlimited"
              ></uui-input>
            </uui-form-layout-item>
          </div>

          <uui-form-layout-item>
            <uui-label slot="label" for="surcharge" required>Surcharge</uui-label>
            <uui-input
              id="surcharge"
              type="number"
              step="0.01"
              min="0"
              .value=${this._surcharge.toString()}
              @input=${(e: InputEvent) => (this._surcharge = parseFloat((e.target as HTMLInputElement).value) || 0)}
            ></uui-input>
            <div slot="description">Additional cost added to base shipping rate</div>
          </uui-form-layout-item>
        </div>

        <div slot="actions">
          <uui-button label="Cancel" @click=${this._close}>Cancel</uui-button>
          <uui-button
            look="primary"
            label="${isEditing ? 'Save' : 'Add'}"
            ?disabled=${this._isSaving}
            @click=${this._save}
          >
            ${this._isSaving ? html`<uui-loader-circle></uui-loader-circle>` : nothing}
            ${isEditing ? "Save" : "Add"}
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
      padding: var(--uui-size-layout-1);
      display: flex;
      flex-direction: column;
      gap: var(--uui-size-space-4);
    }

    .row {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: var(--uui-size-space-4);
    }

    [slot="actions"] {
      display: flex;
      gap: var(--uui-size-space-3);
      padding: var(--uui-size-space-4);
      border-top: 1px solid var(--uui-color-border);
    }

    [slot="description"] {
      font-size: 0.875rem;
      color: var(--uui-color-text-alt);
    }
  `;
}

export default MerchelloShippingWeightTierModalElement;

declare global {
  interface HTMLElementTagNameMap {
    "merchello-shipping-weight-tier-modal": MerchelloShippingWeightTierModalElement;
  }
}
