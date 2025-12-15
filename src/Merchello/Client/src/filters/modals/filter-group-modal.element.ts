import { html, css, nothing } from "@umbraco-cms/backoffice/external/lit";
import { customElement, state } from "@umbraco-cms/backoffice/external/lit";
import { UmbModalBaseElement } from "@umbraco-cms/backoffice/modal";
import type { FilterGroupModalData, FilterGroupModalValue } from "./filter-group-modal.token.js";
import { MerchelloApi } from "@api/merchello-api.js";

@customElement("merchello-filter-group-modal")
export class MerchelloFilterGroupModalElement extends UmbModalBaseElement<
  FilterGroupModalData,
  FilterGroupModalValue
> {
  @state() private _name: string = "";
  @state() private _isSaving: boolean = false;
  @state() private _errors: Record<string, string> = {};

  private get _isEditMode(): boolean {
    return !!this.data?.filterGroup;
  }

  connectedCallback(): void {
    super.connectedCallback();
    // Pre-populate form with existing filter group data if editing
    if (this.data?.filterGroup) {
      this._name = this.data.filterGroup.name;
    }
  }

  private _validate(): boolean {
    const errors: Record<string, string> = {};

    if (!this._name.trim()) {
      errors.name = "Filter group name is required";
    }

    this._errors = errors;
    return Object.keys(errors).length === 0;
  }

  private async _handleSave(): Promise<void> {
    if (!this._validate()) return;

    this._isSaving = true;

    if (this._isEditMode) {
      // Update existing filter group
      const filterGroupId = this.data?.filterGroup?.id;
      if (!filterGroupId) {
        this._errors = { general: "Filter group ID is missing" };
        this._isSaving = false;
        return;
      }

      const { data, error } = await MerchelloApi.updateFilterGroup(filterGroupId, {
        name: this._name.trim(),
      });

      this._isSaving = false;

      if (error) {
        this._errors = { general: error.message };
        return;
      }

      this.value = { filterGroup: data, updated: true };
      this.modalContext?.submit();
    } else {
      // Create new filter group
      const { data, error } = await MerchelloApi.createFilterGroup({
        name: this._name.trim(),
      });

      this._isSaving = false;

      if (error) {
        this._errors = { general: error.message };
        return;
      }

      this.value = { filterGroup: data, created: true };
      this.modalContext?.submit();
    }
  }

  private _handleCancel(): void {
    this.modalContext?.reject();
  }

  render() {
    const headline = this._isEditMode ? "Edit Filter Group" : "Add Filter Group";
    const saveLabel = this._isEditMode ? "Save Changes" : "Create Filter Group";
    const savingLabel = this._isEditMode ? "Saving..." : "Creating...";

    return html`
      <umb-body-layout headline=${headline}>
        <div id="main">
          ${this._errors.general
            ? html`<div class="error-banner">${this._errors.general}</div>`
            : nothing}

          <div class="form-row">
            <label for="filter-group-name">Name <span class="required">*</span></label>
            <uui-input
              id="filter-group-name"
              .value=${this._name}
              @input=${(e: Event) => (this._name = (e.target as HTMLInputElement).value)}
              placeholder="e.g., Color, Size, Material"
              label="Filter group name">
            </uui-input>
            <span class="hint">A descriptive name for this filter group (e.g., Color, Size, Material)</span>
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

export default MerchelloFilterGroupModalElement;

declare global {
  interface HTMLElementTagNameMap {
    "merchello-filter-group-modal": MerchelloFilterGroupModalElement;
  }
}
