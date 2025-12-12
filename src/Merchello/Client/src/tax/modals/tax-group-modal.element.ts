import { html, css, nothing } from "@umbraco-cms/backoffice/external/lit";
import { customElement, state } from "@umbraco-cms/backoffice/external/lit";
import { UmbModalBaseElement } from "@umbraco-cms/backoffice/modal";
import type { TaxGroupModalData, TaxGroupModalValue } from "./tax-group-modal.token.js";
import { MerchelloApi } from "@api/merchello-api.js";

@customElement("merchello-tax-group-modal")
export class MerchelloTaxGroupModalElement extends UmbModalBaseElement<
  TaxGroupModalData,
  TaxGroupModalValue
> {
  @state() private _name: string = "";
  @state() private _taxPercentage: string = "";
  @state() private _isSaving: boolean = false;
  @state() private _errors: Record<string, string> = {};

  private get _isEditMode(): boolean {
    return !!this.data?.taxGroup;
  }

  connectedCallback(): void {
    super.connectedCallback();
    // Pre-populate form with existing tax group data if editing
    if (this.data?.taxGroup) {
      this._name = this.data.taxGroup.name;
      this._taxPercentage = String(this.data.taxGroup.taxPercentage);
    }
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

      this.value = { taxGroup: data, updated: true };
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

      this.value = { taxGroup: data, created: true };
      this.modalContext?.submit();
    }
  }

  private _handleCancel(): void {
    this.modalContext?.reject();
  }

  render() {
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
            <label for="tax-percentage">Tax Rate (%) <span class="required">*</span></label>
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
            <span class="hint">The tax percentage (0-100). For example, 20 for 20% VAT.</span>
            ${this._errors.taxPercentage ? html`<span class="error">${this._errors.taxPercentage}</span>` : nothing}
          </div>
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

  static styles = css`
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
  `;
}

export default MerchelloTaxGroupModalElement;

declare global {
  interface HTMLElementTagNameMap {
    "merchello-tax-group-modal": MerchelloTaxGroupModalElement;
  }
}
