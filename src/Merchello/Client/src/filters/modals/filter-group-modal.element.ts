import { html, css, nothing } from "@umbraco-cms/backoffice/external/lit";
import { customElement, state } from "@umbraco-cms/backoffice/external/lit";
import { UmbModalBaseElement } from "@umbraco-cms/backoffice/modal";
import type { FilterGroupModalData, FilterGroupModalValue } from "@filters/modals/filter-group-modal.token.js";
import { MerchelloApi } from "@api/merchello-api.js";

const FILTER_GROUP_FORM_ID = "MerchelloFilterGroupForm";

@customElement("merchello-filter-group-modal")
export class MerchelloFilterGroupModalElement extends UmbModalBaseElement<
  FilterGroupModalData,
  FilterGroupModalValue
> {
  @state() private _name = "";
  @state() private _isSaving = false;
  @state() private _errors: Record<string, string> = {};

  private get _isEditMode(): boolean {
    return !!this.data?.filterGroup;
  }

  override connectedCallback(): void {
    super.connectedCallback();
    if (this.data?.filterGroup) {
      this._name = this.data.filterGroup.name;
    }
  }

  private _handleNameInput(event: Event): void {
    this._name = (event.target as HTMLInputElement).value;
    if (this._errors.name || this._errors.general) {
      this._errors = {};
    }
  }

  private _validate(): boolean {
    const form = this.shadowRoot?.querySelector<HTMLFormElement>(`#${FILTER_GROUP_FORM_ID}`);
    if (form && !form.checkValidity()) {
      form.reportValidity();
      return false;
    }

    const errors: Record<string, string> = {};
    if (!this._name.trim()) {
      errors.name = "Filter group name is required";
    }

    this._errors = errors;
    return Object.keys(errors).length === 0;
  }

  private async _handleSave(event?: Event): Promise<void> {
    event?.preventDefault();
    if (this._isSaving) return;
    if (!this._validate()) return;

    this._isSaving = true;
    this._errors = {};
    const trimmedName = this._name.trim();

    if (this._isEditMode) {
      const filterGroupId = this.data?.filterGroup?.id;
      if (!filterGroupId) {
        this._errors = { general: "Filter group ID is missing" };
        this._isSaving = false;
        return;
      }

      const { data, error } = await MerchelloApi.updateFilterGroup(filterGroupId, {
        name: trimmedName,
      });

      this._isSaving = false;
      if (error) {
        this._errors = { general: error.message };
        return;
      }

      this.value = { filterGroup: data, isUpdated: true };
      this.modalContext?.submit();
      return;
    }

    const { data, error } = await MerchelloApi.createFilterGroup({
      name: trimmedName,
    });

    this._isSaving = false;
    if (error) {
      this._errors = { general: error.message };
      return;
    }

    this.value = { filterGroup: data, isCreated: true };
    this.modalContext?.submit();
  }

  private _handleCancel(): void {
    this.modalContext?.reject();
  }

  override render() {
    const headline = this._isEditMode ? "Edit Filter Group" : "Add Filter Group";
    const saveLabel = this._isEditMode ? "Save Changes" : "Create Filter Group";
    const submitLabel = this._isSaving ? "Saving..." : saveLabel;

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
              <form id=${FILTER_GROUP_FORM_ID} @submit=${this._handleSave}>
                <uui-form-layout-item>
                  <uui-label slot="label" for="filter-group-name" required>Filter Group Name</uui-label>
                  <uui-input
                    id="filter-group-name"
                    name="filterGroupName"
                    label="Filter group name"
                    maxlength="255"
                    required
                    placeholder="e.g., Color, Size, Material"
                    .value=${this._name}
                    @input=${this._handleNameInput}>
                  </uui-input>
                  <span class="hint">Use a clear label shown to merchandisers when assigning filter values.</span>
                  ${this._errors.name ? html`<span class="error" role="alert">${this._errors.name}</span>` : nothing}
                </uui-form-layout-item>
              </form>
            </uui-form>
          </uui-box>
        </div>

        <uui-button slot="actions" label="Cancel" look="secondary" @click=${this._handleCancel}>
          Cancel
        </uui-button>
        <uui-button
          slot="actions"
          type="submit"
          form=${FILTER_GROUP_FORM_ID}
          label=${saveLabel}
          look="primary"
          color="positive"
          ?disabled=${this._isSaving}>
          ${submitLabel}
        </uui-button>
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
      gap: var(--uui-size-space-4);
    }

    uui-input {
      width: 100%;
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
  `;
}

export default MerchelloFilterGroupModalElement;

declare global {
  interface HTMLElementTagNameMap {
    "merchello-filter-group-modal": MerchelloFilterGroupModalElement;
  }
}
