import { html, css, nothing } from "@umbraco-cms/backoffice/external/lit";
import { customElement, state } from "@umbraco-cms/backoffice/external/lit";
import { UmbModalBaseElement } from "@umbraco-cms/backoffice/modal";
import { UMB_NOTIFICATION_CONTEXT } from "@umbraco-cms/backoffice/notification";
import type { UmbNotificationContext } from "@umbraco-cms/backoffice/notification";
import { MerchelloApi } from "@api/merchello-api.js";
import { getCurrencySymbol, getStoreSettings } from "@api/store-settings.js";
import type { CreateShippingPostcodeRuleDto, PostcodeMatchType, PostcodeRuleAction } from "@shipping/types/shipping.types.js";
import type { ShippingPostcodeRuleModalData, ShippingPostcodeRuleModalValue } from "@shipping/modals/shipping-postcode-rule-modal.token.js";

interface CountryOption {
  code: string;
  name: string;
}

@customElement("merchello-shipping-postcode-rule-modal")
export class MerchelloShippingPostcodeRuleModalElement extends UmbModalBaseElement<
  ShippingPostcodeRuleModalData,
  ShippingPostcodeRuleModalValue
> {
  @state() private _isSaving = false;
  @state() private _isLoadingCountries = true;
  @state() private _countryCode = "";
  @state() private _pattern = "";
  @state() private _matchType: PostcodeMatchType = "Prefix";
  @state() private _action: PostcodeRuleAction = "Block";
  @state() private _surcharge = 0;
  @state() private _currencySymbol = getCurrencySymbol();
  @state() private _description = "";
  @state() private _countries: CountryOption[] = [];

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

    if (this.data?.rule) {
      this._countryCode = this.data.rule.countryCode;
      this._pattern = this.data.rule.pattern;
      this._matchType = this.data.rule.matchType;
      this._action = this.data.rule.action;
      this._surcharge = this.data.rule.surcharge;
      this._description = this.data.rule.description ?? "";
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

  private get _countryOptions(): Array<{ name: string; value: string; selected?: boolean }> {
    const options: Array<{ name: string; value: string; selected?: boolean }> = [
      { name: "Select a country...", value: "", selected: !this._countryCode },
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

  private get _matchTypeOptions(): Array<{ name: string; value: string; selected?: boolean }> {
    return [
      { name: "Prefix match (e.g., IM, HS, ZE)", value: "Prefix", selected: this._matchType === "Prefix" },
      { name: "UK outcode range (e.g., IV21-IV28)", value: "OutcodeRange", selected: this._matchType === "OutcodeRange" },
      { name: "Numeric range (e.g., 20010-21000)", value: "NumericRange", selected: this._matchType === "NumericRange" },
      { name: "Exact postcode", value: "Exact", selected: this._matchType === "Exact" },
    ];
  }

  private get _actionOptions(): Array<{ name: string; value: string; selected?: boolean }> {
    return [
      { name: "Block delivery", value: "Block", selected: this._action === "Block" },
      { name: "Add surcharge", value: "Surcharge", selected: this._action === "Surcharge" },
    ];
  }

  private get _patternPlaceholder(): string {
    switch (this._matchType) {
      case "Prefix":
        return "e.g., IM, HS, ZE, BT";
      case "OutcodeRange":
        return "e.g., IV21-IV28, PA20-PA80";
      case "NumericRange":
        return "e.g., 20010-21000";
      case "Exact":
        return "e.g., IM1 1AA";
      default:
        return "Enter pattern";
    }
  }

  private get _patternHelp(): string {
    switch (this._matchType) {
      case "Prefix":
        return "Matches any postcode starting with this prefix";
      case "OutcodeRange":
        return "Matches UK postcodes where the outcode falls within the range (e.g., IV21-IV28 matches IV21, IV22...IV28)";
      case "NumericRange":
        return "Matches numeric zip codes within the range (inclusive)";
      case "Exact":
        return "Matches this exact postcode (spaces and case are ignored)";
      default:
        return "";
    }
  }

  private async _save(): Promise<void> {
    if (!this._countryCode) {
      this.#notificationContext?.peek("warning", {
        data: { headline: "Validation", message: "Country is required" },
      });
      return;
    }

    if (!this._pattern.trim()) {
      this.#notificationContext?.peek("warning", {
        data: { headline: "Validation", message: "Pattern is required" },
      });
      return;
    }

    if (this._action === "Surcharge" && this._surcharge <= 0) {
      this.#notificationContext?.peek("warning", {
        data: { headline: "Validation", message: "Surcharge must be greater than 0" },
      });
      return;
    }

    this._isSaving = true;

    const dto: CreateShippingPostcodeRuleDto = {
      countryCode: this._countryCode.toUpperCase(),
      pattern: this._pattern.trim(),
      matchType: this._matchType,
      action: this._action,
      surcharge: this._action === "Surcharge" ? this._surcharge : 0,
      description: this._description.trim() || undefined,
    };

    try {
      const result = this.data?.rule
        ? await MerchelloApi.updateShippingPostcodeRule(this.data.rule.id, dto)
        : await MerchelloApi.addShippingPostcodeRule(this.data?.optionId!, dto);

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
          message: this.data?.rule ? "Rule updated" : "Rule added",
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
    const isEditing = !!this.data?.rule;

    return html`
      <umb-body-layout headline="${isEditing ? 'Edit' : 'Add'} Postcode Rule">
        <div class="form-content">
          <div class="info-box">
            <uui-icon name="icon-info"></uui-icon>
            <span>Create rules to block delivery or add surcharges for specific postcodes. Rules are evaluated by specificity - more specific patterns take precedence.</span>
          </div>

          <uui-form-layout-item>
            <uui-label slot="label" for="countryCode" required>Country</uui-label>
            ${this._isLoadingCountries
              ? html`<uui-loader></uui-loader>`
              : html`
                  <uui-select
                    id="countryCode"
                    .options=${this._countryOptions}
                    @change=${(e: Event) => (this._countryCode = (e.target as HTMLSelectElement).value)}
                  ></uui-select>
                `}
            <div slot="description">The country this rule applies to (postcode formats vary by country)</div>
          </uui-form-layout-item>

          <uui-form-layout-item>
            <uui-label slot="label" for="matchType" required>Match Type</uui-label>
            <uui-select
              id="matchType"
              .options=${this._matchTypeOptions}
              @change=${(e: Event) => (this._matchType = (e.target as HTMLSelectElement).value as PostcodeMatchType)}
            ></uui-select>
            <div slot="description">How the pattern should be matched against customer postcodes</div>
          </uui-form-layout-item>

          <uui-form-layout-item>
            <uui-label slot="label" for="pattern" required>Pattern</uui-label>
            <uui-input
              id="pattern"
              .value=${this._pattern}
              @input=${(e: InputEvent) => (this._pattern = (e.target as HTMLInputElement).value)}
              placeholder=${this._patternPlaceholder}
            ></uui-input>
            <div slot="description">${this._patternHelp}</div>
          </uui-form-layout-item>

          <uui-form-layout-item>
            <uui-label slot="label" for="action" required>Action</uui-label>
            <uui-select
              id="action"
              .options=${this._actionOptions}
              @change=${(e: Event) => (this._action = (e.target as HTMLSelectElement).value as PostcodeRuleAction)}
            ></uui-select>
            <div slot="description">What happens when a customer's postcode matches this rule</div>
          </uui-form-layout-item>

          ${this._action === "Surcharge"
            ? html`
                <uui-form-layout-item>
                  <uui-label slot="label" for="surcharge" required>Surcharge Amount</uui-label>
                  <div class="cost-input-wrapper">
                    <span class="currency-symbol">${this._currencySymbol}</span>
                    <uui-input
                      id="surcharge"
                      type="number"
                      step="0.01"
                      min="0.01"
                      .value=${this._surcharge.toString()}
                      @input=${(e: InputEvent) => (this._surcharge = parseFloat((e.target as HTMLInputElement).value) || 0)}
                      placeholder="0.00"
                    ></uui-input>
                  </div>
                  <div slot="description">Additional amount added to shipping cost for matching postcodes</div>
                </uui-form-layout-item>
              `
            : nothing}

          <uui-form-layout-item>
            <uui-label slot="label" for="description">Description</uui-label>
            <uui-input
              id="description"
              .value=${this._description}
              @input=${(e: InputEvent) => (this._description = (e.target as HTMLInputElement).value)}
              placeholder="e.g., Scottish Highlands surcharge"
            ></uui-input>
            <div slot="description">Optional note to help identify this rule in the list</div>
          </uui-form-layout-item>
        </div>

        <div slot="actions">
          <uui-button label="Cancel" @click=${this._close}>Cancel</uui-button>
          <uui-button
            look="primary"
            color="positive"
            label="${isEditing ? 'Save Rule' : 'Add Rule'}"
            ?disabled=${this._isSaving || !this._countryCode || !this._pattern}
            @click=${this._save}
          >
            ${this._isSaving ? html`<uui-loader-circle></uui-loader-circle>` : nothing}
            ${isEditing ? "Save Rule" : "Add Rule"}
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

export default MerchelloShippingPostcodeRuleModalElement;

declare global {
  interface HTMLElementTagNameMap {
    "merchello-shipping-postcode-rule-modal": MerchelloShippingPostcodeRuleModalElement;
  }
}
