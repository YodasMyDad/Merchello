import { html, css, nothing } from "@umbraco-cms/backoffice/external/lit";
import { customElement, state } from "@umbraco-cms/backoffice/external/lit";
import { UmbModalBaseElement, UMB_MODAL_MANAGER_CONTEXT, UMB_CONFIRM_MODAL } from "@umbraco-cms/backoffice/modal";
import type { UmbModalManagerContext } from "@umbraco-cms/backoffice/modal";
import type { FilterModalData, FilterModalValue } from "./filter-modal.token.js";
import { MerchelloApi } from "@api/merchello-api.js";

// Import Umbraco packages for the components
import "@umbraco-cms/backoffice/media";

@customElement("merchello-filter-modal")
export class MerchelloFilterModalElement extends UmbModalBaseElement<
  FilterModalData,
  FilterModalValue
> {
  @state() private _name: string = "";
  @state() private _hexColour: string = "";
  @state() private _image: string | null = null;
  @state() private _isSaving: boolean = false;
  @state() private _isDeleting: boolean = false;
  @state() private _errors: Record<string, string> = {};

  #modalManager?: UmbModalManagerContext;
  #isConnected = false;

  private get _isEditMode(): boolean {
    return !!this.data?.filter;
  }

  constructor() {
    super();
    this.consumeContext(UMB_MODAL_MANAGER_CONTEXT, (context) => {
      this.#modalManager = context;
    });
  }

  override connectedCallback(): void {
    super.connectedCallback();
    this.#isConnected = true;
    // Pre-populate form with existing filter data if editing
    if (this.data?.filter) {
      this._name = this.data.filter.name;
      this._hexColour = this.data.filter.hexColour || "";
      this._image = this.data.filter.image;
    }
  }

  private _validate(): boolean {
    const errors: Record<string, string> = {};

    if (!this._name.trim()) {
      errors.name = "Filter name is required";
    }

    this._errors = errors;
    return Object.keys(errors).length === 0;
  }

  private async _handleSave(): Promise<void> {
    if (!this._validate()) return;

    this._isSaving = true;

    if (this._isEditMode) {
      // Update existing filter
      const filterId = this.data?.filter?.id;
      if (!filterId) {
        this._errors = { general: "Filter ID is missing" };
        this._isSaving = false;
        return;
      }

      const { data, error } = await MerchelloApi.updateFilter(filterId, {
        name: this._name.trim(),
        hexColour: this._hexColour || null,
        image: this._image || null,
      });

      this._isSaving = false;

      if (error) {
        this._errors = { general: error.message };
        return;
      }

      this.value = { filter: data, isUpdated: true };
      this.modalContext?.submit();
    } else {
      // Create new filter
      const filterGroupId = this.data?.filterGroupId;
      if (!filterGroupId) {
        this._errors = { general: "Filter group ID is missing" };
        this._isSaving = false;
        return;
      }

      const { data, error } = await MerchelloApi.createFilter(filterGroupId, {
        name: this._name.trim(),
        hexColour: this._hexColour || undefined,
        image: this._image || undefined,
      });

      this._isSaving = false;

      if (error) {
        this._errors = { general: error.message };
        return;
      }

      this.value = { filter: data, isCreated: true };
      this.modalContext?.submit();
    }
  }

  private async _handleDelete(): Promise<void> {
    const filterId = this.data?.filter?.id;
    if (!filterId) return;

    const modalContext = this.#modalManager?.open(this, UMB_CONFIRM_MODAL, {
      data: {
        headline: "Delete Filter",
        content: `Are you sure you want to delete "${this._name}"? This action cannot be undone.`,
        confirmLabel: "Delete",
        color: "danger",
      },
    });

    try {
      await modalContext?.onSubmit();
    } catch {
      return; // User cancelled
    }
    if (!this.#isConnected) return; // Component disconnected while modal was open

    this._isDeleting = true;

    const { error } = await MerchelloApi.deleteFilter(filterId);

    if (!this.#isConnected) return;

    this._isDeleting = false;

    if (error) {
      this._errors = { general: error.message };
      return;
    }

    this.value = { isDeleted: true };
    this.modalContext?.submit();
  }

  private _handleCancel(): void {
    this.modalContext?.reject();
  }

  private _handleColorChange(e: Event): void {
    const target = e.target as HTMLInputElement;
    this._hexColour = target.value || "";
  }

  private _handleMediaChange(e: Event): void {
    const target = e.target as HTMLElement & { value?: Array<{ mediaKey?: string }> };
    const value = target?.value || [];
    this._image = value.length > 0 ? value[0].mediaKey || null : null;
  }

  private _clearColor(): void {
    this._hexColour = "";
  }

  private _clearImage(): void {
    this._image = null;
  }

  override render() {
    const headline = this._isEditMode ? "Edit Filter" : "Add Filter";
    const saveLabel = this._isEditMode ? "Save Changes" : "Create Filter";
    const savingLabel = this._isEditMode ? "Saving..." : "Creating...";

    // Prepare media value for the picker
    const mediaValue = this._image ? [{ key: this._image, mediaKey: this._image }] : [];

    return html`
      <umb-body-layout headline=${headline}>
        <div id="main">
          ${this._errors.general
            ? html`<div class="error-banner">${this._errors.general}</div>`
            : nothing}

          <div class="form-row">
            <label for="filter-name">Name <span class="required">*</span></label>
            <uui-input
              id="filter-name"
              .value=${this._name}
              @input=${(e: Event) => (this._name = (e.target as HTMLInputElement).value)}
              placeholder="e.g., Red, Blue, Large, Cotton"
              label="Filter name">
            </uui-input>
            <span class="hint">The name of the filter value (e.g., Red, Blue, Large)</span>
            ${this._errors.name ? html`<span class="error">${this._errors.name}</span>` : nothing}
          </div>

          <div class="form-row">
            <label>Color (Optional)</label>
            <div class="color-picker-row">
              <uui-color-picker
                label="Filter color"
                .value=${this._hexColour}
                @change=${this._handleColorChange}>
              </uui-color-picker>
              ${this._hexColour
                ? html`
                    <div class="color-preview-row">
                      <span class="color-swatch" style="background: ${this._hexColour}"></span>
                      <span class="color-value">${this._hexColour}</span>
                      <uui-button
                        label="Clear"
                        look="placeholder"
                        compact
                        @click=${this._clearColor}>
                        <uui-icon name="icon-trash"></uui-icon>
                      </uui-button>
                    </div>
                  `
                : nothing}
            </div>
            <span class="hint">Optional color for display (e.g., for color swatches)</span>
          </div>

          <div class="form-row">
            <label>Image (Optional)</label>
            <umb-input-rich-media
              .value=${mediaValue}
              ?multiple=${false}
              @change=${this._handleMediaChange}>
            </umb-input-rich-media>
            ${this._image
              ? html`
                  <uui-button
                    label="Clear image"
                    look="placeholder"
                    compact
                    @click=${this._clearImage}>
                    <uui-icon name="icon-trash"></uui-icon> Clear image
                  </uui-button>
                `
              : nothing}
            <span class="hint">Optional image for this filter (e.g., material texture)</span>
          </div>
        </div>

        <div slot="actions">
          ${this._isEditMode
            ? html`
                <uui-button
                  label="Delete"
                  look="secondary"
                  color="danger"
                  ?disabled=${this._isDeleting || this._isSaving}
                  @click=${this._handleDelete}>
                  ${this._isDeleting ? "Deleting..." : "Delete"}
                </uui-button>
              `
            : nothing}
          <uui-button label="Cancel" look="secondary" @click=${this._handleCancel}>
            Cancel
          </uui-button>
          <uui-button
            label=${saveLabel}
            look="primary"
            color="positive"
            ?disabled=${this._isSaving || this._isDeleting}
            @click=${this._handleSave}>
            ${this._isSaving ? savingLabel : saveLabel}
          </uui-button>
        </div>
      </umb-body-layout>
    `;
  }

  static override readonly styles = css`
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

    .color-picker-row {
      display: flex;
      flex-direction: column;
      gap: var(--uui-size-space-2);
    }

    .color-preview-row {
      display: flex;
      align-items: center;
      gap: var(--uui-size-space-2);
    }

    .color-swatch {
      display: inline-block;
      width: 24px;
      height: 24px;
      border-radius: var(--uui-border-radius);
      border: 1px solid var(--uui-color-border);
    }

    .color-value {
      font-family: monospace;
      font-size: 0.875rem;
    }

    [slot="actions"] {
      display: flex;
      gap: var(--uui-size-space-2);
      justify-content: flex-end;
    }

    [slot="actions"] uui-button:first-child {
      margin-right: auto;
    }
  `;
}

export default MerchelloFilterModalElement;

declare global {
  interface HTMLElementTagNameMap {
    "merchello-filter-modal": MerchelloFilterModalElement;
  }
}
