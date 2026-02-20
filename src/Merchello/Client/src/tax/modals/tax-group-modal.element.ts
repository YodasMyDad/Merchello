import { html, css, nothing } from "@umbraco-cms/backoffice/external/lit";
import { customElement, state } from "@umbraco-cms/backoffice/external/lit";
import { UmbModalBaseElement } from "@umbraco-cms/backoffice/modal";
import { UMB_MODAL_MANAGER_CONTEXT } from "@umbraco-cms/backoffice/modal";
import type { UmbModalManagerContext } from "@umbraco-cms/backoffice/modal";
import { UMB_NOTIFICATION_CONTEXT } from "@umbraco-cms/backoffice/notification";
import type { UmbNotificationContext } from "@umbraco-cms/backoffice/notification";
import { UMB_CONFIRM_MODAL } from "@umbraco-cms/backoffice/modal";
import type { TaxGroupModalData, TaxGroupModalValue } from "@tax/modals/tax-group-modal.token.js";
import { MERCHELLO_TAX_RATE_MODAL } from "@tax/modals/tax-rate-modal.token.js";
import { MerchelloApi } from "@api/merchello-api.js";
import type { TaxGroupRateDto } from "@tax/types/tax.types.js";
import { formatNumber } from "@shared/utils/formatting.js";
import { modalLayoutStyles } from "@shared/styles/modal-layout.styles.js";

@customElement("merchello-tax-group-modal")
export class MerchelloTaxGroupModalElement extends UmbModalBaseElement<
  TaxGroupModalData,
  TaxGroupModalValue
> {
  @state() private _name: string = "";
  @state() private _taxPercentage: string = "";
  @state() private _isSaving: boolean = false;
  @state() private _errors: Record<string, string> = {};
  @state() private _rates: TaxGroupRateDto[] = [];
  @state() private _isLoadingRates: boolean = false;
  @state() private _isDeletingRate: string | null = null;

  #modalManager?: UmbModalManagerContext;
  #notificationContext?: UmbNotificationContext;

  private get _isEditMode(): boolean {
    return !!this.data?.taxGroup;
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
    // Pre-populate form with existing tax group data if editing
    if (this.data?.taxGroup) {
      this._name = this.data.taxGroup.name;
      this._taxPercentage = String(this.data.taxGroup.taxPercentage);
      this._loadRates();
    }
  }

  private async _loadRates(): Promise<void> {
    const taxGroupId = this.data?.taxGroup?.id;
    if (!taxGroupId) return;

    this._isLoadingRates = true;
    const { data, error } = await MerchelloApi.getTaxGroupRates(taxGroupId);
    this._isLoadingRates = false;

    if (error) {
      this.#notificationContext?.peek("danger", {
        data: { headline: "Error", message: "Failed to load tax rates" },
      });
      return;
    }

    this._rates = data ?? [];
  }

  private _validate(): boolean {
    const errors: Record<string, string> = {};

    if (!this._name.trim()) {
      errors.name = "Tax group name is required";
    }

    const percentage = parseFloat(this._taxPercentage);
    if (isNaN(percentage)) {
      errors.taxPercentage = "Tax percentage is required";
    } else if (percentage < 0 || percentage > 100) {
      errors.taxPercentage = "Tax percentage must be between 0 and 100";
    }

    this._errors = errors;
    return Object.keys(errors).length === 0;
  }

  private async _handleSave(): Promise<void> {
    if (!this._validate()) return;

    this._isSaving = true;

    const taxPercentage = parseFloat(this._taxPercentage);

    if (this._isEditMode) {
      // Update existing tax group
      const taxGroupId = this.data?.taxGroup?.id;
      if (!taxGroupId) {
        this._errors = { general: "Tax group ID is missing" };
        this._isSaving = false;
        return;
      }

      const { data, error } = await MerchelloApi.updateTaxGroup(taxGroupId, {
        name: this._name.trim(),
        taxPercentage,
      });

      this._isSaving = false;

      if (error) {
        this._errors = { general: error.message };
        return;
      }

      this.value = { taxGroup: data, isUpdated: true };
      this.modalContext?.submit();
    } else {
      // Create new tax group
      const { data, error } = await MerchelloApi.createTaxGroup({
        name: this._name.trim(),
        taxPercentage,
      });

      this._isSaving = false;

      if (error) {
        this._errors = { general: error.message };
        return;
      }

      this.value = { taxGroup: data, isCreated: true };
      this.modalContext?.submit();
    }
  }

  private _handleCancel(): void {
    this.modalContext?.reject();
  }

  private async _handleAddRate(): Promise<void> {
    const taxGroupId = this.data?.taxGroup?.id;
    if (!taxGroupId || !this.#modalManager) return;

    const modal = this.#modalManager.open(this, MERCHELLO_TAX_RATE_MODAL, {
      data: { taxGroupId },
    });

    const result = await modal.onSubmit().catch(() => null);
    if (result?.isSaved) {
      await this._loadRates();
    }
  }

  private async _handleEditRate(rate: TaxGroupRateDto): Promise<void> {
    const taxGroupId = this.data?.taxGroup?.id;
    if (!taxGroupId || !this.#modalManager) return;

    const modal = this.#modalManager.open(this, MERCHELLO_TAX_RATE_MODAL, {
      data: { taxGroupId, rate },
    });

    const result = await modal.onSubmit().catch(() => null);
    if (result?.isSaved) {
      await this._loadRates();
    }
  }

  private async _handleDeleteRate(rate: TaxGroupRateDto): Promise<void> {
    if (!this.#modalManager) return;

    const locationLabel = rate.regionName
      ? `${rate.countryName ?? rate.countryCode} - ${rate.regionName}`
      : rate.countryName ?? rate.countryCode;

    const confirm = this.#modalManager.open(this, UMB_CONFIRM_MODAL, {
      data: {
        headline: "Delete Tax Rate",
        content: `Delete the tax rate for ${locationLabel}.`,
        confirmLabel: "Delete",
        color: "danger",
      },
    });

    try {
      await confirm.onSubmit();
    } catch {
      return; // User cancelled
    }

    this._isDeletingRate = rate.id;
    const { error } = await MerchelloApi.deleteTaxGroupRate(rate.id);
    this._isDeletingRate = null;

    if (error) {
      this.#notificationContext?.peek("danger", {
        data: { headline: "Error", message: error.message },
      });
      return;
    }

    this.#notificationContext?.peek("positive", {
      data: { headline: "Success", message: "Tax rate deleted" },
    });

    await this._loadRates();
  }

  private _renderRatesSection() {
    return html`
      <div class="rates-section">
        <div class="rates-header">
          <div class="rates-title">
            <label>Regional Tax Rates</label>
            <span class="hint"
              >Define tax rates per country or state. If no rate exists for a customer's location, 0%
              tax will be applied.</span
            >
          </div>
          <uui-button
            look="outline"
            label="Add Rate"
            @click=${this._handleAddRate}
            ?disabled=${this._isLoadingRates}>
            <uui-icon name="icon-add"></uui-icon>
            Add Rate
          </uui-button>
        </div>

        ${this._isLoadingRates
          ? html`<uui-loader-bar></uui-loader-bar>`
          : this._rates.length === 0
            ? html`
                <div class="empty-rates">
                  <uui-icon name="icon-globe"></uui-icon>
                  <p>No regional rates defined</p>
                  <span>Add regional rates to apply location-specific tax percentages</span>
                </div>
              `
            : html`
                <uui-table>
                  <uui-table-head>
                    <uui-table-head-cell>Country</uui-table-head-cell>
                    <uui-table-head-cell>State/Province</uui-table-head-cell>
                    <uui-table-head-cell style="text-align: right">Rate</uui-table-head-cell>
                    <uui-table-head-cell style="width: 100px"></uui-table-head-cell>
                  </uui-table-head>
                  ${this._rates.map(
                    (rate) => html`
                      <uui-table-row>
                        <uui-table-cell>
                          ${rate.countryName ?? rate.countryCode}
                        </uui-table-cell>
                        <uui-table-cell>
                          ${rate.regionName ?? rate.regionCode ?? "All regions"}
                        </uui-table-cell>
                        <uui-table-cell style="text-align: right">
                          ${formatNumber(rate.taxPercentage, 2)}%
                        </uui-table-cell>
                        <uui-table-cell>
                          <div class="rate-actions">
                            <uui-button
                              look="default"
                              compact
                              label="Edit"
                              @click=${() => this._handleEditRate(rate)}
                              ?disabled=${this._isDeletingRate === rate.id}>
                              <uui-icon name="icon-edit"></uui-icon>
                            </uui-button>
                            <uui-button
                              look="default"
                              compact
                              label="Delete"
                              @click=${() => this._handleDeleteRate(rate)}
                              ?disabled=${this._isDeletingRate === rate.id}>
                              ${this._isDeletingRate === rate.id
                                ? html`<uui-loader-circle></uui-loader-circle>`
                                : html`<uui-icon name="icon-delete"></uui-icon>`}
                            </uui-button>
                          </div>
                        </uui-table-cell>
                      </uui-table-row>
                    `
                  )}
                </uui-table>
              `}
      </div>
    `;
  }

  override render() {
    const headline = this._isEditMode ? "Edit Tax Group" : "Add Tax Group";
    const saveLabel = this._isEditMode ? "Save Changes" : "Create Tax Group";
    const savingLabel = this._isEditMode ? "Saving..." : "Creating...";

    return html`
      <umb-body-layout headline=${headline}>
        <div id="main">
          ${this._errors.general
            ? html`<div class="error-banner">${this._errors.general}</div>`
            : nothing}

          <div class="form-row">
            <label for="tax-group-name">Name <span class="required">*</span></label>
            <uui-input
              id="tax-group-name"
              .value=${this._name}
              @input=${(e: Event) => (this._name = (e.target as HTMLInputElement).value)}
              placeholder="e.g., Standard VAT"
              label="Tax group name">
            </uui-input>
            <span class="hint">A descriptive name for this tax rate</span>
            ${this._errors.name ? html`<span class="error">${this._errors.name}</span>` : nothing}
          </div>

          <div class="form-row">
            <label for="tax-percentage">Default Tax Rate (%) <span class="required">*</span></label>
            <uui-input
              id="tax-percentage"
              type="number"
              min="0"
              max="100"
              step="0.01"
              .value=${this._taxPercentage}
              @input=${(e: Event) => (this._taxPercentage = (e.target as HTMLInputElement).value)}
              placeholder="e.g., 20"
              label="Tax percentage">
            </uui-input>
            <span class="hint">Fallback rate used when no regional rate matches the customer's location.</span>
            ${this._errors.taxPercentage ? html`<span class="error">${this._errors.taxPercentage}</span>` : nothing}
          </div>

          ${this._isEditMode ? this._renderRatesSection() : nothing}
        </div>

        <div slot="actions">
          <uui-button label="Cancel" look="secondary" @click=${this._handleCancel}>
            Cancel
          </uui-button>
          <uui-button
            label=${saveLabel}
            look="primary"
            color="positive"
            ?disabled=${this._isSaving}
            @click=${this._handleSave}>
            ${this._isSaving ? savingLabel : saveLabel}
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

    #main {
      display: flex;
      flex-direction: column;
      gap: var(--uui-size-space-5);
    }

    .form-row {
      display: flex;
      flex-direction: column;
      gap: var(--uui-size-space-1);
    }

    label {
      font-weight: 600;
      font-size: 0.8125rem;
    }

    .required {
      color: var(--uui-color-danger);
    }

    uui-input {
      width: 100%;
    }

    .hint {
      font-size: 0.75rem;
      color: var(--uui-color-text-alt);
    }

    .error-banner {
      display: flex;
      align-items: center;
      gap: var(--uui-size-space-2);
      padding: var(--uui-size-space-3);
      background: var(--uui-color-danger-standalone);
      color: var(--uui-color-danger-contrast);
      border-radius: var(--uui-border-radius);
    }

    .error {
      color: var(--uui-color-danger);
      font-size: 0.75rem;
    }

    [slot="actions"] {
      display: flex;
      gap: var(--uui-size-space-2);
      justify-content: flex-end;
    }

    /* Rates section styles */
    .rates-section {
      display: flex;
      flex-direction: column;
      gap: var(--uui-size-space-4);
      margin-top: var(--uui-size-space-4);
      padding-top: var(--uui-size-space-5);
      border-top: 1px solid var(--uui-color-border);
    }

    .rates-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      gap: var(--uui-size-space-4);
    }

    .rates-title {
      display: flex;
      flex-direction: column;
      gap: var(--uui-size-space-1);
    }

    .rates-title label {
      font-weight: 600;
      font-size: 0.9rem;
    }

    .empty-rates {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: var(--uui-size-space-2);
      padding: var(--uui-size-space-6);
      background: var(--uui-color-surface-alt);
      border: 1px dashed var(--uui-color-border);
      border-radius: var(--uui-border-radius);
      text-align: center;
    }

    .empty-rates uui-icon {
      font-size: 2rem;
      color: var(--uui-color-text-alt);
    }

    .empty-rates p {
      margin: 0;
      font-weight: 600;
      color: var(--uui-color-text);
    }

    .empty-rates span {
      font-size: 0.8125rem;
      color: var(--uui-color-text-alt);
    }

    uui-table {
      width: 100%;
    }

    .rate-actions {
      display: flex;
      gap: var(--uui-size-space-1);
      justify-content: flex-end;
    }

    .rate-actions uui-button {
      --uui-button-padding-left-factor: 1;
      --uui-button-padding-right-factor: 1;
    }
  `,
  ];
}

export default MerchelloTaxGroupModalElement;

declare global {
  interface HTMLElementTagNameMap {
    "merchello-tax-group-modal": MerchelloTaxGroupModalElement;
  }
}

