import { html, css, nothing } from "@umbraco-cms/backoffice/external/lit";
import { customElement, state } from "@umbraco-cms/backoffice/external/lit";
import { UmbModalBaseElement } from "@umbraco-cms/backoffice/modal";
import type { SupplierModalData, SupplierModalValue } from "./supplier-modal.token.js";
import { MerchelloApi } from "@api/merchello-api.js";

@customElement("merchello-supplier-modal")
export class MerchelloSupplierModalElement extends UmbModalBaseElement<
  SupplierModalData,
  SupplierModalValue
> {
  @state() private _name: string = "";
  @state() private _code: string = "";
  @state() private _isSaving: boolean = false;
  @state() private _errors: Record<string, string> = {};

  private get _isEditMode(): boolean {
    return !!this.data?.supplier;
  }

  connectedCallback(): void {
    super.connectedCallback();
    // Pre-populate form with existing supplier data if editing
    if (this.data?.supplier) {
      this._name = this.data.supplier.name;
      this._code = this.data.supplier.code ?? "";
    }
  }

  private _validate(): boolean {
    const errors: Record<string, string> = {};

    if (!this._name.trim()) {
      errors.name = "Supplier name is required";
    }

    this._errors = errors;
    return Object.keys(errors).length === 0;
  }

  private async _handleSave(): Promise<void> {
    if (!this._validate()) return;

    this._isSaving = true;

    if (this._isEditMode) {
      // Update existing supplier
      const supplierId = this.data?.supplier?.id;
      if (!supplierId) {
        this._errors = { general: "Supplier ID is missing" };
        this._isSaving = false;
        return;
      }

      const { data, error } = await MerchelloApi.updateSupplier(supplierId, {
        name: this._name.trim(),
        code: this._code.trim() || undefined,
      });

      this._isSaving = false;

      if (error) {
        this._errors = { general: error.message };
        return;
      }

      this.value = { supplier: data, updated: true };
      this.modalContext?.submit();
    } else {
      // Create new supplier
      const { data, error } = await MerchelloApi.createSupplier({
        name: this._name.trim(),
        code: this._code.trim() || undefined,
      });

      this._isSaving = false;

      if (error) {
        this._errors = { general: error.message };
        return;
      }

      this.value = { supplier: data, created: true };
      this.modalContext?.submit();
    }
  }

  private _handleCancel(): void {
    this.modalContext?.reject();
  }

  render() {
    const headline = this._isEditMode ? "Edit Supplier" : "Add Supplier";
    const saveLabel = this._isEditMode ? "Save Changes" : "Create Supplier";
    const savingLabel = this._isEditMode ? "Saving..." : "Creating...";

    return html`
      <umb-body-layout headline=${headline}>
        <div id="main">
          ${this._errors.general
            ? html`<div class="error-banner">${this._errors.general}</div>`
            : nothing}

          <div class="form-row">
            <label for="supplier-name">Supplier Name <span class="required">*</span></label>
            <uui-input
              id="supplier-name"
              .value=${this._name}
              @input=${(e: Event) => (this._name = (e.target as HTMLInputElement).value)}
              placeholder="e.g., Acme Distribution Co."
              label="Supplier name">
            </uui-input>
            <span class="hint">The name of the company or supplier</span>
            ${this._errors.name ? html`<span class="error">${this._errors.name}</span>` : nothing}
          </div>

          <div class="form-row">
            <label for="supplier-code">Reference Code</label>
            <uui-input
              id="supplier-code"
              .value=${this._code}
              @input=${(e: Event) => (this._code = (e.target as HTMLInputElement).value)}
              placeholder="e.g., SUP-001"
              label="Supplier code">
            </uui-input>
            <span class="hint">Optional code for internal tracking or accounting systems</span>
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

export default MerchelloSupplierModalElement;

declare global {
  interface HTMLElementTagNameMap {
    "merchello-supplier-modal": MerchelloSupplierModalElement;
  }
}

