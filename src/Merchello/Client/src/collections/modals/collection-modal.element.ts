import { html, css, nothing } from "@umbraco-cms/backoffice/external/lit";
import { customElement, state } from "@umbraco-cms/backoffice/external/lit";
import { UmbModalBaseElement } from "@umbraco-cms/backoffice/modal";
import type { CollectionModalData, CollectionModalValue } from "./collection-modal.token.js";
import { MerchelloApi } from "@api/merchello-api.js";

@customElement("merchello-collection-modal")
export class MerchelloCollectionModalElement extends UmbModalBaseElement<
  CollectionModalData,
  CollectionModalValue
> {
  @state() private _name: string = "";
  @state() private _isSaving: boolean = false;
  @state() private _errors: Record<string, string> = {};

  private get _isEditMode(): boolean {
    return !!this.data?.collection;
  }

  override connectedCallback(): void {
    super.connectedCallback();
    // Pre-populate form with existing collection data if editing
    if (this.data?.collection) {
      this._name = this.data.collection.name;
    }
  }

  private _validate(): boolean {
    const errors: Record<string, string> = {};

    if (!this._name.trim()) {
      errors.name = "Collection name is required";
    }

    this._errors = errors;
    return Object.keys(errors).length === 0;
  }

  private async _handleSave(): Promise<void> {
    if (!this._validate()) return;

    this._isSaving = true;

    if (this._isEditMode) {
      // Update existing collection
      const collectionId = this.data?.collection?.id;
      if (!collectionId) {
        this._errors = { general: "Collection ID is missing" };
        this._isSaving = false;
        return;
      }

      const { data, error } = await MerchelloApi.updateProductCollection(collectionId, {
        name: this._name.trim(),
      });

      this._isSaving = false;

      if (error) {
        this._errors = { general: error.message };
        return;
      }

      this.value = { collection: data, isUpdated: true };
      this.modalContext?.submit();
    } else {
      // Create new collection
      const { data, error } = await MerchelloApi.createProductCollection({
        name: this._name.trim(),
      });

      this._isSaving = false;

      if (error) {
        this._errors = { general: error.message };
        return;
      }

      this.value = { collection: data, isCreated: true };
      this.modalContext?.submit();
    }
  }

  private _handleCancel(): void {
    this.modalContext?.reject();
  }

  override render() {
    const headline = this._isEditMode ? "Edit Collection" : "Add Collection";
    const saveLabel = this._isEditMode ? "Save Changes" : "Create Collection";
    const savingLabel = this._isEditMode ? "Saving..." : "Creating...";

    return html`
      <umb-body-layout headline=${headline}>
        <div id="main">
          ${this._errors.general
            ? html`<div class="error-banner">${this._errors.general}</div>`
            : nothing}

          <div class="form-row">
            <label for="collection-name">Collection Name <span class="required">*</span></label>
            <uui-input
              id="collection-name"
              .value=${this._name}
              @input=${(e: Event) => (this._name = (e.target as HTMLInputElement).value)}
              placeholder="e.g., Summer Sale, New Arrivals"
              label="Collection name">
            </uui-input>
            <span class="hint">A name to identify this collection of products</span>
            ${this._errors.name ? html`<span class="error">${this._errors.name}</span>` : nothing}
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

export default MerchelloCollectionModalElement;

declare global {
  interface HTMLElementTagNameMap {
    "merchello-collection-modal": MerchelloCollectionModalElement;
  }
}
