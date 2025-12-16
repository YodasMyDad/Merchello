import { html, css, nothing } from "@umbraco-cms/backoffice/external/lit";
import { customElement, state } from "@umbraco-cms/backoffice/external/lit";
import { UmbModalBaseElement } from "@umbraco-cms/backoffice/modal";
import type { ProductTypeModalData, ProductTypeModalValue } from "./product-type-modal.token.js";
import { MerchelloApi } from "@api/merchello-api.js";

@customElement("merchello-product-type-modal")
export class MerchelloProductTypeModalElement extends UmbModalBaseElement<
  ProductTypeModalData,
  ProductTypeModalValue
> {
  @state() private _name: string = "";
  @state() private _isSaving: boolean = false;
  @state() private _errors: Record<string, string> = {};

  private get _isEditMode(): boolean {
    return !!this.data?.productType;
  }

  connectedCallback(): void {
    super.connectedCallback();
    // Pre-populate form with existing product type data if editing
    if (this.data?.productType) {
      this._name = this.data.productType.name;
    }
  }

  private _validate(): boolean {
    const errors: Record<string, string> = {};

    if (!this._name.trim()) {
      errors.name = "Product type name is required";
    }

    this._errors = errors;
    return Object.keys(errors).length === 0;
  }

  private async _handleSave(): Promise<void> {
    if (!this._validate()) return;

    this._isSaving = true;

    if (this._isEditMode) {
      // Update existing product type
      const productTypeId = this.data?.productType?.id;
      if (!productTypeId) {
        this._errors = { general: "Product type ID is missing" };
        this._isSaving = false;
        return;
      }

      const { data, error } = await MerchelloApi.updateProductType(productTypeId, {
        name: this._name.trim(),
      });

      this._isSaving = false;

      if (error) {
        this._errors = { general: error.message };
        return;
      }

      this.value = { productType: data, updated: true };
      this.modalContext?.submit();
    } else {
      // Create new product type
      const { data, error } = await MerchelloApi.createProductType({
        name: this._name.trim(),
      });

      this._isSaving = false;

      if (error) {
        this._errors = { general: error.message };
        return;
      }

      this.value = { productType: data, created: true };
      this.modalContext?.submit();
    }
  }

  private _handleCancel(): void {
    this.modalContext?.reject();
  }

  render() {
    const headline = this._isEditMode ? "Edit Product Type" : "Add Product Type";
    const saveLabel = this._isEditMode ? "Save Changes" : "Create Product Type";
    const savingLabel = this._isEditMode ? "Saving..." : "Creating...";

    return html`
      <umb-body-layout headline=${headline}>
        <div id="main">
          ${this._errors.general
            ? html`<div class="error-banner">${this._errors.general}</div>`
            : nothing}

          <div class="form-row">
            <label for="product-type-name">Name <span class="required">*</span></label>
            <uui-input
              id="product-type-name"
              .value=${this._name}
              @input=${(e: Event) => (this._name = (e.target as HTMLInputElement).value)}
              placeholder="e.g., Physical, Digital, Service"
              label="Product type name">
            </uui-input>
            <span class="hint">A descriptive name for this product type (e.g., Physical, Digital, Service)</span>
            ${this._errors.name ? html`<span class="error">${this._errors.name}</span>` : nothing}
          </div>

          ${this._isEditMode && this.data?.productType?.alias
            ? html`
                <div class="form-row">
                  <label>Alias</label>
                  <uui-input .value=${this.data.productType.alias} readonly disabled></uui-input>
                  <span class="hint">The alias is auto-generated and cannot be changed</span>
                </div>
              `
            : nothing}
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

export default MerchelloProductTypeModalElement;

declare global {
  interface HTMLElementTagNameMap {
    "merchello-product-type-modal": MerchelloProductTypeModalElement;
  }
}
