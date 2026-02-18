import { html, css, nothing } from "@umbraco-cms/backoffice/external/lit";
import { customElement, state } from "@umbraco-cms/backoffice/external/lit";
import { UmbModalBaseElement, UMB_MODAL_MANAGER_CONTEXT, UMB_CONFIRM_MODAL } from "@umbraco-cms/backoffice/modal";
import type { UmbModalManagerContext } from "@umbraco-cms/backoffice/modal";
import type { FilterModalData, FilterModalValue } from "@filters/modals/filter-modal.token.js";
import { MerchelloApi } from "@api/merchello-api.js";
import "@umbraco-cms/backoffice/media";
import { modalLayoutStyles } from "@shared/styles/modal-layout.styles.js";

const FILTER_FORM_ID = "MerchelloFilterForm";

@customElement("merchello-filter-modal")
export class MerchelloFilterModalElement extends UmbModalBaseElement<
  FilterModalData,
  FilterModalValue
> {
  @state() private _name = "";
  @state() private _hexColour = "";
  @state() private _image: string | null = null;
  @state() private _isSaving = false;
  @state() private _isDeleting = false;
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
    if (this.data?.filter) {
      this._name = this.data.filter.name;
      this._hexColour = this.data.filter.hexColour || "";
      this._image = this.data.filter.image;
    }
  }

  override disconnectedCallback(): void {
    super.disconnectedCallback();
    this.#isConnected = false;
  }

  private _handleNameInput(event: Event): void {
    this._name = (event.target as HTMLInputElement).value;
    if (this._errors.name || this._errors.general) {
      this._errors = {};
    }
  }

  private _validate(): boolean {
    const form = this.shadowRoot?.querySelector<HTMLFormElement>(`#${FILTER_FORM_ID}`);
    if (form && !form.checkValidity()) {
      form.reportValidity();
      return false;
    }

    const errors: Record<string, string> = {};
    if (!this._name.trim()) {
      errors.name = "Filter name is required";
    }

    this._errors = errors;
    return Object.keys(errors).length === 0;
  }

  private async _handleSave(event?: Event): Promise<void> {
    event?.preventDefault();
    if (this._isSaving || this._isDeleting) return;
    if (!this._validate()) return;

    this._isSaving = true;
    this._errors = {};
    const trimmedName = this._name.trim();

    if (this._isEditMode) {
      const filterId = this.data?.filter?.id;
      if (!filterId) {
        this._errors = { general: "Filter ID is missing" };
        this._isSaving = false;
        return;
      }

      const { data, error } = await MerchelloApi.updateFilter(filterId, {
        name: trimmedName,
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
      return;
    }

    const filterGroupId = this.data?.filterGroupId;
    if (!filterGroupId) {
      this._errors = { general: "Filter group ID is missing" };
      this._isSaving = false;
      return;
    }

    const { data, error } = await MerchelloApi.createFilter(filterGroupId, {
      name: trimmedName,
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

  private async _handleDelete(): Promise<void> {
    const filterId = this.data?.filter?.id;
    if (!filterId || this._isDeleting || this._isSaving) return;

    const filterName = this._name.trim() || "this filter";
    const modalContext = this.#modalManager?.open(this, UMB_CONFIRM_MODAL, {
      data: {
        headline: "Delete Filter",
        content: `Delete "${filterName}"? This cannot be undone.`,
        confirmLabel: "Delete",
        color: "danger",
      },
    });

    try {
      await modalContext?.onSubmit();
    } catch {
      return;
    }
    if (!this.#isConnected) return;

    this._isDeleting = true;
    this._errors = {};

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

  private _handleColorChange(event: Event): void {
    this._hexColour = (event.target as HTMLInputElement).value || "";
  }

  private _handleMediaChange(event: Event): void {
    const target = event.target as HTMLElement & { value?: Array<{ mediaKey?: string }> };
    const selected = target.value ?? [];
    this._image = selected.length > 0 ? selected[0].mediaKey || null : null;
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
    const submitLabel = this._isSaving ? "Saving..." : saveLabel;
    const mediaValue = this._image ? [{ key: this._image, mediaKey: this._image }] : [];

    return html`
      <umb-body-layout headline=${headline}>
        <div id="main">
          ${this._errors.general
            ? html`
                <div class="error-banner" role="alert">
                  <uui-icon name="icon-alert"></uui-icon>
                  <span>${this._errors.general}</span>
                </div>
              `
            : nothing}

          <uui-box>
            <uui-form>
              <form id=${FILTER_FORM_ID} @submit=${this._handleSave}>
                <uui-form-layout-item>
                  <uui-label slot="label" for="filter-name" required>Filter Name</uui-label>
                  <uui-input
                    id="filter-name"
                    name="filterName"
                    label="Filter name"
                    maxlength="255"
                    required
                    placeholder="e.g., Red, Blue, Large, Cotton"
                    .value=${this._name}
                    @input=${this._handleNameInput}>
                  </uui-input>
                  <span class="hint">Label shown when this filter value is selected on products.</span>
                  ${this._errors.name ? html`<span class="error" role="alert">${this._errors.name}</span>` : nothing}
                </uui-form-layout-item>

                <uui-form-layout-item>
                  <uui-label slot="label">Color (Optional)</uui-label>
                  <div class="field-stack">
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
                              type="button"
                              label="Clear color"
                              look="secondary"
                              compact
                              @click=${this._clearColor}>
                              Clear
                            </uui-button>
                          </div>
                        `
                      : nothing}
                  </div>
                  <span class="hint">Optional color for storefront swatches.</span>
                </uui-form-layout-item>

                <uui-form-layout-item>
                  <uui-label slot="label">Image (Optional)</uui-label>
                  <div class="field-stack">
                    <umb-input-rich-media
                      .value=${mediaValue}
                      ?multiple=${false}
                      @change=${this._handleMediaChange}>
                    </umb-input-rich-media>
                    ${this._image
                      ? html`
                          <uui-button
                            type="button"
                            label="Clear image"
                            look="secondary"
                            compact
                            @click=${this._clearImage}>
                            Clear image
                          </uui-button>
                        `
                      : nothing}
                  </div>
                  <span class="hint">Optional image reference for material or texture-based filters.</span>
                </uui-form-layout-item>
              </form>
            </uui-form>
          </uui-box>
        </div>

        ${this._isEditMode
          ? html`
              <uui-button
                slot="actions"
                class="delete-action"
                label="Delete"
                look="secondary"
                color="danger"
                ?disabled=${this._isDeleting || this._isSaving}
                @click=${this._handleDelete}>
                ${this._isDeleting ? "Deleting..." : "Delete"}
              </uui-button>
            `
          : nothing}
        <uui-button slot="actions" label="Cancel" look="secondary" @click=${this._handleCancel}>
          Cancel
        </uui-button>
        <uui-button
          slot="actions"
          type="submit"
          form=${FILTER_FORM_ID}
          label=${saveLabel}
          look="primary"
          color="positive"
          ?disabled=${this._isSaving || this._isDeleting}>
          ${submitLabel}
        </uui-button>
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
      gap: var(--uui-size-space-4);
    }

    uui-input {
      width: 100%;
    }

    .field-stack {
      display: flex;
      flex-direction: column;
      gap: var(--uui-size-space-2);
    }

    .hint {
      display: block;
      margin-top: var(--uui-size-space-2);
      font-size: var(--uui-type-small-size);
      color: var(--uui-color-text-alt);
    }

    .error-banner {
      display: flex;
      align-items: center;
      gap: var(--uui-size-space-3);
      padding: var(--uui-size-space-4);
      background: var(--uui-color-danger-standalone);
      color: var(--uui-color-danger-contrast);
      border-radius: var(--uui-border-radius);
    }

    .error {
      display: block;
      margin-top: var(--uui-size-space-2);
      color: var(--uui-color-danger);
      font-size: var(--uui-type-small-size);
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

    .delete-action {
      margin-right: auto;
    }
  `,
  ];
}

export default MerchelloFilterModalElement;

declare global {
  interface HTMLElementTagNameMap {
    "merchello-filter-modal": MerchelloFilterModalElement;
  }
}

