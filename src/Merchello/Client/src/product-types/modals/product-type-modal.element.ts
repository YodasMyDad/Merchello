import { html, css, nothing } from "@umbraco-cms/backoffice/external/lit";
import { customElement, state } from "@umbraco-cms/backoffice/external/lit";
import { UmbModalBaseElement } from "@umbraco-cms/backoffice/modal";
import type { ProductTypeModalData, ProductTypeModalValue } from "@product-types/modals/product-type-modal.token.js";
import { MerchelloApi } from "@api/merchello-api.js";

const PRODUCT_TYPE_FORM_ID = "MerchelloProductTypeForm";

@customElement("merchello-product-type-modal")
export class MerchelloProductTypeModalElement extends UmbModalBaseElement<
  ProductTypeModalData,
  ProductTypeModalValue
> {
  @state() private _name = "";
  @state() private _isSaving = false;
  @state() private _nameError: string | null = null;
  @state() private _generalError: string | null = null;

  private get _isEditMode(): boolean {
    return !!this.data?.productType;
  }

  override connectedCallback(): void {
    super.connectedCallback();

    if (this.data?.productType) {
      this._name = this.data.productType.name;
    }
  }

  private _validateName(): boolean {
    const trimmedName = this._name.trim();
    if (!trimmedName) {
      this._nameError = "Product type name is required";
      return false;
    }

    if (trimmedName.length > 120) {
      this._nameError = "Product type name must be 120 characters or fewer";
      return false;
    }

    this._nameError = null;
    return true;
  }

  private _handleNameInput(event: Event): void {
    this._name = (event.target as HTMLInputElement).value;
    this._nameError = null;
    this._generalError = null;
  }

  private async _handleSubmit(event: SubmitEvent): Promise<void> {
    event.preventDefault();
    if (this._isSaving) return;

    const form = event.currentTarget as HTMLFormElement;
    if (!form.checkValidity()) {
      form.reportValidity();
      return;
    }

    if (!this._validateName()) {
      return;
    }

    this._isSaving = true;
    this._generalError = null;
    const name = this._name.trim();

    if (this._isEditMode) {
      const productTypeId = this.data?.productType?.id;
      if (!productTypeId) {
        this._generalError = "Product type ID is missing";
        this._isSaving = false;
        return;
      }

      const { data, error } = await MerchelloApi.updateProductType(productTypeId, {
        name,
      });

      this._isSaving = false;

      if (error) {
        this._generalError = error.message;
        return;
      }

      this.value = { productType: data, isUpdated: true };
      this.modalContext?.submit();
    } else {
      const { data, error } = await MerchelloApi.createProductType({
        name,
      });

      this._isSaving = false;

      if (error) {
        this._generalError = error.message;
        return;
      }

      this.value = { productType: data, isCreated: true };
      this.modalContext?.submit();
    }
  }

  private _handleCancel(): void {
    this.modalContext?.reject();
  }

  override render() {
    const headline = this._isEditMode ? "Edit Product Type" : "Add Product Type";
    const saveLabel = this._isEditMode ? "Save Changes" : "Create Product Type";
    const savingLabel = this._isEditMode ? "Saving..." : "Creating...";

    return html`
      <umb-body-layout .headline=${headline}>
        <uui-form>
          <form id=${PRODUCT_TYPE_FORM_ID} @submit=${this._handleSubmit} novalidate>
            ${this._generalError
              ? html`
                  <div class="error-banner" role="alert">
                    <uui-icon name="icon-alert"></uui-icon>
                    <span>${this._generalError}</span>
                  </div>
                `
              : nothing}

            <uui-form-layout-item>
              <uui-label slot="label" for="product-type-name" required>Name</uui-label>
              <uui-input
                id="product-type-name"
                name="name"
                label="Product type name"
                required
                maxlength="120"
                .value=${this._name}
                placeholder="Physical, Digital, Service"
                @input=${this._handleNameInput}>
              </uui-input>
              <div class="field-hint">A clear display name used when classifying products.</div>
              ${this._nameError ? html`<div class="field-error" role="alert">${this._nameError}</div>` : nothing}
            </uui-form-layout-item>

            ${this._isEditMode && this.data?.productType?.alias
              ? html`
                  <uui-form-layout-item>
                    <uui-label slot="label" for="product-type-alias">Alias</uui-label>
                    <uui-input
                      id="product-type-alias"
                      label="Product type alias"
                      .value=${this.data.productType.alias}
                      readonly
                      disabled>
                    </uui-input>
                    <div class="field-hint">Alias is generated automatically and cannot be changed.</div>
                  </uui-form-layout-item>
                `
              : nothing}
          </form>
        </uui-form>

        <uui-button
          slot="actions"
          label="Cancel"
          look="secondary"
          ?disabled=${this._isSaving}
          @click=${this._handleCancel}>
          Cancel
        </uui-button>
        <uui-button
          slot="actions"
          .label=${saveLabel}
          look="primary"
          color="positive"
          type="submit"
          form=${PRODUCT_TYPE_FORM_ID}
          ?disabled=${this._isSaving}>
          ${this._isSaving ? savingLabel : saveLabel}
        </uui-button>
      </umb-body-layout>
    `;
  }

  static override readonly styles = css`
    :host {
      display: block;
    }

    form {
      display: flex;
      flex-direction: column;
      gap: var(--uui-size-space-5);
    }

    uui-input {
      width: 100%;
    }

    .field-hint {
      color: var(--uui-color-text-alt);
      font-size: var(--uui-type-small-size);
      margin-top: var(--uui-size-space-1);
    }

    .field-error {
      color: var(--uui-color-danger);
      font-size: var(--uui-type-small-size);
      margin-top: var(--uui-size-space-1);
    }

    .error-banner {
      align-items: center;
      background: var(--uui-color-danger-standalone);
      border-radius: var(--uui-border-radius);
      color: var(--uui-color-danger-contrast);
      display: flex;
      gap: var(--uui-size-space-2);
      padding: var(--uui-size-space-3);
    }
  `;
}

export default MerchelloProductTypeModalElement;

declare global {
  interface HTMLElementTagNameMap {
    "merchello-product-type-modal": MerchelloProductTypeModalElement;
  }
}
