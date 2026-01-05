import { html, css, nothing } from "@umbraco-cms/backoffice/external/lit";
import { customElement, state } from "@umbraco-cms/backoffice/external/lit";
import { UmbModalBaseElement } from "@umbraco-cms/backoffice/modal";
import { UMB_MODAL_MANAGER_CONTEXT, UMB_CONFIRM_MODAL } from "@umbraco-cms/backoffice/modal";
import type { UmbModalManagerContext } from "@umbraco-cms/backoffice/modal";
import { UMB_NOTIFICATION_CONTEXT } from "@umbraco-cms/backoffice/notification";
import type { UmbNotificationContext } from "@umbraco-cms/backoffice/notification";
import { MerchelloApi } from "@api/merchello-api.js";
import type { TaxProviderFieldDto, TaxGroupDto } from "@tax/types/tax.types.js";
import type {
  TaxProviderConfigModalData,
  TaxProviderConfigModalValue,
} from "./tax-provider-config-modal.token.js";
import { MERCHELLO_TAX_GROUP_MODAL } from "./tax-group-modal.token.js";

@customElement("merchello-tax-provider-config-modal")
export class MerchelloTaxProviderConfigModalElement extends UmbModalBaseElement<
  TaxProviderConfigModalData,
  TaxProviderConfigModalValue
> {
  // Provider config fields
  @state() private _fields: TaxProviderFieldDto[] = [];
  @state() private _values: Record<string, string> = {};
  @state() private _isLoading = true;
  @state() private _isSaving = false;
  @state() private _errorMessage: string | null = null;

  // Tax Groups (for Manual provider)
  @state() private _taxGroups: TaxGroupDto[] = [];
  @state() private _isLoadingTaxGroups = false;
  @state() private _isDeleting: string | null = null;

  #isConnected = false;
  #modalManager?: UmbModalManagerContext;
  #notificationContext?: UmbNotificationContext;

  constructor() {
    super();
    this.consumeContext(UMB_MODAL_MANAGER_CONTEXT, (context) => {
      this.#modalManager = context;
    });
    this.consumeContext(UMB_NOTIFICATION_CONTEXT, (context) => {
      this.#notificationContext = context;
    });
  }

  private get _isManualProvider(): boolean {
    return this.data?.provider.alias === "manual";
  }

  override connectedCallback(): void {
    super.connectedCallback();
    this.#isConnected = true;
    this._loadData();
  }

  override disconnectedCallback(): void {
    super.disconnectedCallback();
    this.#isConnected = false;
  }

  private async _loadData(): Promise<void> {
    this._isLoading = true;
    this._errorMessage = null;

    const provider = this.data?.provider;

    if (!provider) {
      this._errorMessage = "No provider specified";
      this._isLoading = false;
      return;
    }

    // Load configuration fields
    const { data, error } = await MerchelloApi.getTaxProviderFields(provider.alias);

    if (!this.#isConnected) return;

    if (error) {
      this._errorMessage = error.message;
      this._isLoading = false;
      return;
    }

    this._fields = data ?? [];

    // Initialize values from existing configuration or defaults
    const existingConfig = provider.configuration ?? {};
    this._values = {};

    for (const field of this._fields) {
      this._values[field.key] = existingConfig[field.key] ?? field.defaultValue ?? "";
    }

    this._isLoading = false;

    // Load Tax Groups for Manual provider
    if (this._isManualProvider) {
      await this._loadTaxGroups();
    }
  }

  private async _loadTaxGroups(): Promise<void> {
    this._isLoadingTaxGroups = true;

    const { data, error } = await MerchelloApi.getTaxGroups();

    if (!this.#isConnected) return;

    if (error) {
      this.#notificationContext?.peek("danger", {
        data: { headline: "Error loading tax groups", message: error.message },
      });
      this._isLoadingTaxGroups = false;
      return;
    }

    this._taxGroups = data ?? [];
    this._isLoadingTaxGroups = false;
  }

  private async _handleAddTaxGroup(): Promise<void> {
    const modal = this.#modalManager?.open(this, MERCHELLO_TAX_GROUP_MODAL, {
      data: {},
    });

    const result = await modal?.onSubmit().catch(() => undefined);
    if (!this.#isConnected) return;
    if (result?.isCreated) {
      this.#notificationContext?.peek("positive", {
        data: {
          headline: "Tax group created",
          message: `"${result.taxGroup?.name}" has been created successfully`,
        },
      });
      this._loadTaxGroups();
    }
  }

  private async _handleEditTaxGroup(taxGroup: TaxGroupDto): Promise<void> {
    const modal = this.#modalManager?.open(this, MERCHELLO_TAX_GROUP_MODAL, {
      data: { taxGroup },
    });

    const result = await modal?.onSubmit().catch(() => undefined);
    if (!this.#isConnected) return;
    if (result?.isUpdated) {
      this.#notificationContext?.peek("positive", {
        data: {
          headline: "Tax group updated",
          message: `"${result.taxGroup?.name}" has been updated successfully`,
        },
      });
      this._loadTaxGroups();
    }
  }

  private async _handleDeleteTaxGroup(e: Event, taxGroup: TaxGroupDto): Promise<void> {
    e.preventDefault();
    e.stopPropagation();

    const modalContext = this.#modalManager?.open(this, UMB_CONFIRM_MODAL, {
      data: {
        headline: "Delete Tax Group",
        content: `Are you sure you want to delete tax group "${taxGroup.name}"? Products using this tax group will need to be reassigned.`,
        confirmLabel: "Delete",
        color: "danger",
      },
    });

    const result = await modalContext?.onSubmit().catch(() => undefined);
    if (!result) return;
    if (!this.#isConnected) return;

    this._isDeleting = taxGroup.id;

    const { error } = await MerchelloApi.deleteTaxGroup(taxGroup.id);

    if (!this.#isConnected) return;

    this._isDeleting = null;

    if (error) {
      this.#notificationContext?.peek("danger", {
        data: { headline: "Failed to delete", message: error.message || "Could not delete tax group" },
      });
      return;
    }

    this.#notificationContext?.peek("positive", {
      data: { headline: "Tax group deleted", message: "The tax group has been deleted successfully" },
    });
    this._loadTaxGroups();
  }

  private _handleValueChange(key: string, value: string): void {
    this._values = { ...this._values, [key]: value };
  }

  private _handleCheckboxChange(key: string, checked: boolean): void {
    this._values = { ...this._values, [key]: checked ? "true" : "false" };
  }

  private async _handleSave(): Promise<void> {
    const provider = this.data?.provider;

    if (!provider) return;

    this._isSaving = true;
    this._errorMessage = null;

    // Validate required fields
    for (const field of this._fields) {
      if (field.isRequired && !this._values[field.key]) {
        this._errorMessage = `${field.label} is required`;
        this._isSaving = false;
        return;
      }
    }

    try {
      const { error } = await MerchelloApi.saveTaxProviderSettings(provider.alias, {
        configuration: this._values,
      });

      if (!this.#isConnected) return;

      if (error) {
        this._errorMessage = error.message;
        this._isSaving = false;
        return;
      }

      this._isSaving = false;
      this.value = { isSaved: true };
      this.modalContext?.submit();
    } catch (err) {
      if (!this.#isConnected) return;
      this._errorMessage = err instanceof Error ? err.message : "Failed to save configuration";
      this._isSaving = false;
    }
  }

  private _handleCancel(): void {
    this.modalContext?.reject();
  }

  private _renderField(field: TaxProviderFieldDto): unknown {
    const value = this._values[field.key] ?? "";

    switch (field.fieldType) {
      case "Text":
      case "Url":
        return html`
          <div class="form-field">
            <label for="${field.key}">${field.label}${field.isRequired ? " *" : ""}</label>
            ${field.description
              ? html`<p class="field-description">${field.description}</p>`
              : nothing}
            <uui-input
              id="${field.key}"
              type="${field.fieldType === "Url" ? "url" : "text"}"
              .value=${value}
              placeholder="${field.placeholder ?? ""}"
              ?required=${field.isRequired}
              @input=${(e: Event) =>
                this._handleValueChange(field.key, (e.target as HTMLInputElement).value)}
            ></uui-input>
          </div>
        `;

      case "Password":
        return html`
          <div class="form-field">
            <label for="${field.key}">${field.label}${field.isRequired ? " *" : ""}</label>
            ${field.description
              ? html`<p class="field-description">${field.description}</p>`
              : nothing}
            <uui-input
              id="${field.key}"
              type="password"
              .value=${value}
              placeholder="${field.placeholder ?? ""}"
              ?required=${field.isRequired}
              @input=${(e: Event) =>
                this._handleValueChange(field.key, (e.target as HTMLInputElement).value)}
            ></uui-input>
            ${field.isSensitive && value
              ? html`<small class="sensitive-note">Value is stored securely</small>`
              : nothing}
          </div>
        `;

      case "Textarea":
        return html`
          <div class="form-field">
            <label for="${field.key}">${field.label}${field.isRequired ? " *" : ""}</label>
            ${field.description
              ? html`<p class="field-description">${field.description}</p>`
              : nothing}
            <uui-textarea
              id="${field.key}"
              .value=${value}
              placeholder="${field.placeholder ?? ""}"
              ?required=${field.isRequired}
              @input=${(e: Event) =>
                this._handleValueChange(field.key, (e.target as HTMLTextAreaElement).value)}
            ></uui-textarea>
          </div>
        `;

      case "Checkbox":
        return html`
          <div class="form-field checkbox-field">
            <uui-checkbox
              id="${field.key}"
              ?checked=${value === "true"}
              @change=${(e: Event) =>
                this._handleCheckboxChange(field.key, (e.target as HTMLInputElement).checked)}
            >
              ${field.label}
            </uui-checkbox>
            ${field.description
              ? html`<p class="field-description">${field.description}</p>`
              : nothing}
          </div>
        `;

      case "Select":
        return html`
          <div class="form-field">
            <label for="${field.key}">${field.label}${field.isRequired ? " *" : ""}</label>
            ${field.description
              ? html`<p class="field-description">${field.description}</p>`
              : nothing}
            <uui-select
              id="${field.key}"
              .value=${value}
              ?required=${field.isRequired}
              @change=${(e: Event) =>
                this._handleValueChange(field.key, (e.target as HTMLSelectElement).value)}
            >
              ${field.options?.map(
                (option) => html`
                  <uui-select-option value="${option.value}" ?selected=${value === option.value}>
                    ${option.label}
                  </uui-select-option>
                `
              )}
            </uui-select>
          </div>
        `;

      default:
        return nothing;
    }
  }

  private _formatPercentage(value: number): string {
    return `${value}%`;
  }

  private _renderTaxGroupRow(taxGroup: TaxGroupDto): unknown {
    const isDeleting = this._isDeleting === taxGroup.id;

    return html`
      <uui-table-row class="clickable" @click=${() => this._handleEditTaxGroup(taxGroup)}>
        <uui-table-cell>
          <span class="tax-group-name">${taxGroup.name}</span>
        </uui-table-cell>
        <uui-table-cell>
          <span class="tax-rate">${this._formatPercentage(taxGroup.taxPercentage)}</span>
        </uui-table-cell>
        <uui-table-cell>
          <div class="actions-cell">
            <uui-button
              look="secondary"
              compact
              label="Edit"
              @click=${(e: Event) => {
                e.stopPropagation();
                this._handleEditTaxGroup(taxGroup);
              }}
            >
              <uui-icon name="icon-edit"></uui-icon>
            </uui-button>
            <uui-button
              look="primary"
              color="danger"
              compact
              label="Delete"
              ?disabled=${isDeleting}
              @click=${(e: Event) => this._handleDeleteTaxGroup(e, taxGroup)}
            >
              <uui-icon name="${isDeleting ? "icon-hourglass" : "icon-trash"}"></uui-icon>
            </uui-button>
          </div>
        </uui-table-cell>
      </uui-table-row>
    `;
  }

  private _renderTaxGroupsSection(): unknown {
    return html`
      <div class="tax-groups-section">
        <div class="section-header">
          <h3>Tax Groups</h3>
          <uui-button
            look="primary"
            color="positive"
            compact
            label="Add Tax Group"
            @click=${this._handleAddTaxGroup}
          >
            <uui-icon name="icon-add"></uui-icon>
            Add
          </uui-button>
        </div>

        <p class="section-description">
          Tax groups define the tax rates applied to products. Click a row to edit, or use the
          buttons to manage geographic rate overrides.
        </p>

        ${this._isLoadingTaxGroups
          ? html`
              <div class="loading-inline">
                <uui-loader-circle></uui-loader-circle>
                <span>Loading tax groups...</span>
              </div>
            `
          : this._taxGroups.length === 0
            ? html`
                <div class="empty-state">
                  <uui-icon name="icon-calculator"></uui-icon>
                  <p>No tax groups configured yet.</p>
                  <p class="empty-hint">
                    Create tax groups like "Standard VAT" or "Reduced Rate" to assign to products.
                  </p>
                </div>
              `
            : html`
                <div class="table-container">
                  <uui-table class="tax-groups-table">
                    <uui-table-head>
                      <uui-table-head-cell>Name</uui-table-head-cell>
                      <uui-table-head-cell>Default Rate</uui-table-head-cell>
                      <uui-table-head-cell class="actions-header">Actions</uui-table-head-cell>
                    </uui-table-head>
                    ${this._taxGroups.map((tg) => this._renderTaxGroupRow(tg))}
                  </uui-table>
                </div>
              `}
      </div>
    `;
  }

  override render() {
    const provider = this.data?.provider;

    return html`
      <umb-body-layout headline="Configure ${provider?.displayName ?? "Provider"}">
        <div id="main">
          ${this._isLoading
            ? html`
                <div class="loading">
                  <uui-loader></uui-loader>
                  <span>Loading configuration...</span>
                </div>
              `
            : html`
                ${this._errorMessage
                  ? html`
                      <div class="error-message">
                        <uui-icon name="icon-alert"></uui-icon>
                        ${this._errorMessage}
                      </div>
                    `
                  : nothing}

                ${provider?.setupInstructions
                  ? html`
                      <div class="setup-instructions">
                        <uui-icon name="icon-info"></uui-icon>
                        <span>${provider.setupInstructions}</span>
                      </div>
                    `
                  : nothing}

                ${this._fields.length > 0
                  ? html`
                      <p class="section-description">
                        Configure the settings for ${provider?.displayName ?? "this provider"}.
                      </p>
                      ${this._fields.map((field) => this._renderField(field))}
                    `
                  : nothing}

                ${this._isManualProvider ? this._renderTaxGroupsSection() : nothing}

                ${!this._isManualProvider && this._fields.length === 0
                  ? html`
                      <p class="no-fields">This provider does not require any configuration.</p>
                    `
                  : nothing}
              `}
        </div>

        <div slot="actions">
          <uui-button
            label="Close"
            look="secondary"
            @click=${this._handleCancel}
            ?disabled=${this._isSaving}
          >
            Close
          </uui-button>
          ${this._fields.length > 0
            ? html`
                <uui-button
                  label="Save"
                  look="primary"
                  color="positive"
                  @click=${this._handleSave}
                  ?disabled=${this._isLoading || this._isSaving}
                >
                  ${this._isSaving ? html`<uui-loader-circle></uui-loader-circle>` : nothing}
                  Save
                </uui-button>
              `
            : nothing}
        </div>
      </umb-body-layout>
    `;
  }

  static override readonly styles = css`
    :host {
      display: block;
    }

    .loading {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: var(--uui-size-layout-2);
      gap: var(--uui-size-space-4);
    }

    .error-message {
      display: flex;
      align-items: center;
      gap: var(--uui-size-space-2);
      padding: var(--uui-size-space-3);
      background: var(--uui-color-danger-standalone);
      color: var(--uui-color-danger-contrast);
      border-radius: var(--uui-border-radius);
      margin-bottom: var(--uui-size-space-4);
    }

    .setup-instructions {
      display: flex;
      align-items: flex-start;
      gap: var(--uui-size-space-2);
      padding: var(--uui-size-space-3);
      background: var(--uui-color-surface-alt);
      border: 1px solid var(--uui-color-border);
      border-radius: var(--uui-border-radius);
      margin-bottom: var(--uui-size-space-4);
      font-size: 0.875rem;
      color: var(--uui-color-text-alt);
    }

    .setup-instructions uui-icon {
      flex-shrink: 0;
      color: var(--uui-color-interactive);
    }

    .section-description {
      color: var(--uui-color-text-alt);
      margin-bottom: var(--uui-size-space-4);
    }

    .no-fields {
      color: var(--uui-color-text-alt);
      font-style: italic;
    }

    .form-field {
      margin-bottom: var(--uui-size-space-4);
    }

    .form-field label {
      display: block;
      font-weight: 600;
      margin-bottom: var(--uui-size-space-1);
    }

    .field-description {
      margin: 0 0 var(--uui-size-space-2) 0;
      font-size: 0.875rem;
      color: var(--uui-color-text-alt);
    }

    .checkbox-field .field-description {
      margin-left: var(--uui-size-space-5);
    }

    .sensitive-note {
      display: block;
      margin-top: var(--uui-size-space-1);
      font-size: 0.75rem;
      color: var(--uui-color-text-alt);
    }

    uui-input,
    uui-textarea,
    uui-select {
      width: 100%;
    }

    [slot="actions"] {
      display: flex;
      gap: var(--uui-size-space-2);
      justify-content: flex-end;
    }

    /* Tax Groups Section */
    .tax-groups-section {
      margin-top: var(--uui-size-space-6);
      padding-top: var(--uui-size-space-4);
      border-top: 1px solid var(--uui-color-border);
    }

    .section-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: var(--uui-size-space-3);
    }

    .section-header h3 {
      margin: 0;
      font-size: 1rem;
      font-weight: 600;
    }

    .table-container {
      overflow-x: auto;
      background: var(--uui-color-surface);
      border: 1px solid var(--uui-color-border);
      border-radius: var(--uui-border-radius);
    }

    .tax-groups-table {
      width: 100%;
    }

    uui-table-head-cell,
    uui-table-cell {
      white-space: nowrap;
    }

    uui-table-row.clickable {
      cursor: pointer;
    }

    uui-table-row.clickable:hover {
      background: var(--uui-color-surface-emphasis);
    }

    .tax-group-name {
      font-weight: 500;
      color: var(--uui-color-interactive);
    }

    .tax-rate {
      font-family: var(--uui-font-family-monospace, monospace);
    }

    .actions-header {
      text-align: right;
    }

    .actions-cell {
      display: flex;
      gap: var(--uui-size-space-1);
      justify-content: flex-end;
    }

    .loading-inline {
      display: flex;
      align-items: center;
      gap: var(--uui-size-space-2);
      padding: var(--uui-size-space-4);
      color: var(--uui-color-text-alt);
    }

    .empty-state {
      display: flex;
      flex-direction: column;
      align-items: center;
      padding: var(--uui-size-space-5);
      text-align: center;
      color: var(--uui-color-text-alt);
    }

    .empty-state uui-icon {
      font-size: 2rem;
      margin-bottom: var(--uui-size-space-3);
      opacity: 0.5;
    }

    .empty-state p {
      margin: 0;
    }

    .empty-hint {
      font-size: 0.875rem;
      margin-top: var(--uui-size-space-2) !important;
    }
  `;
}

export default MerchelloTaxProviderConfigModalElement;

declare global {
  interface HTMLElementTagNameMap {
    "merchello-tax-provider-config-modal": MerchelloTaxProviderConfigModalElement;
  }
}
