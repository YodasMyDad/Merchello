import { html, css, nothing } from "@umbraco-cms/backoffice/external/lit";
import { customElement, state } from "@umbraco-cms/backoffice/external/lit";
import { UmbModalBaseElement } from "@umbraco-cms/backoffice/modal";
import { UMB_MODAL_MANAGER_CONTEXT, UMB_CONFIRM_MODAL } from "@umbraco-cms/backoffice/modal";
import type { UmbModalManagerContext } from "@umbraco-cms/backoffice/modal";
import { UMB_NOTIFICATION_CONTEXT } from "@umbraco-cms/backoffice/notification";
import type { UmbNotificationContext } from "@umbraco-cms/backoffice/notification";
import { MerchelloApi } from "@api/merchello-api.js";
import type { TaxProviderFieldDto, TaxGroupDto, ShippingTaxOverrideDto } from "@tax/types/tax.types.js";
import type {
  TaxProviderConfigModalData,
  TaxProviderConfigModalValue,
} from "@tax/modals/tax-provider-config-modal.token.js";
import { MERCHELLO_TAX_GROUP_MODAL } from "@tax/modals/tax-group-modal.token.js";
import { MERCHELLO_SHIPPING_TAX_OVERRIDE_MODAL } from "@tax/modals/shipping-tax-override-modal.token.js";

type TabType = "product" | "shipping";

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

  // Tab state (for Manual provider)
  @state() private _activeTab: TabType = "product";

  // Tax Groups (for Manual provider)
  @state() private _taxGroups: TaxGroupDto[] = [];
  @state() private _isLoadingTaxGroups = false;
  @state() private _isDeleting: string | null = null;

  // Shipping Tax Overrides (for Manual provider)
  @state() private _shippingOverrides: ShippingTaxOverrideDto[] = [];
  @state() private _isLoadingOverrides = false;
  @state() private _deletedOverrideIds: string[] = [];

  // Tax Group Mappings (for API providers like Avalara)
  @state() private _mappings: Record<string, string> = {};

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

    // Load Tax Groups and Shipping Overrides for Manual provider
    if (this._isManualProvider) {
      await Promise.all([this._loadTaxGroups(), this._loadShippingOverrides()]);
    }

    // Load Tax Groups for non-manual providers that have TaxGroupMapping fields
    if (!this._isManualProvider && this._fields.some((f) => f.fieldType === "TaxGroupMapping")) {
      await this._loadTaxGroups();

      // Parse existing mapping from config
      const mappingJson = this._values["taxGroupMappings"];
      if (mappingJson) {
        try {
          this._mappings = JSON.parse(mappingJson);
        } catch {
          this._mappings = {};
        }
      }
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

  private async _loadShippingOverrides(): Promise<void> {
    this._isLoadingOverrides = true;

    const { data, error } = await MerchelloApi.getShippingTaxOverrides();

    if (!this.#isConnected) return;

    if (error) {
      this.#notificationContext?.peek("danger", {
        data: { headline: "Error loading shipping overrides", message: error.message },
      });
      this._isLoadingOverrides = false;
      return;
    }

    this._shippingOverrides = data ?? [];
    this._isLoadingOverrides = false;
  }

  // Tax Group Methods
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
        content: `Delete tax group "${taxGroup.name}". Products using this tax group must be reassigned.`,
        confirmLabel: "Delete",
        color: "danger",
      },
    });

    try {
      await modalContext?.onSubmit();
    } catch {
      return; // User cancelled
    }
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

  // Shipping Override Methods
  private async _handleAddOverride(): Promise<void> {
    const modal = this.#modalManager?.open(this, MERCHELLO_SHIPPING_TAX_OVERRIDE_MODAL, {
      data: {},
    });

    const result = await modal?.onSubmit().catch(() => undefined);
    if (!this.#isConnected) return;
    if (result?.isSaved) {
      this._loadShippingOverrides();
    }
  }

  private async _handleEditOverride(override: ShippingTaxOverrideDto): Promise<void> {
    const modal = this.#modalManager?.open(this, MERCHELLO_SHIPPING_TAX_OVERRIDE_MODAL, {
      data: { override },
    });

    const result = await modal?.onSubmit().catch(() => undefined);
    if (!this.#isConnected) return;
    if (result?.isSaved) {
      this._loadShippingOverrides();
    }
  }

  private async _handleDeleteOverride(e: Event, override: ShippingTaxOverrideDto): Promise<void> {
    e.preventDefault();
    e.stopPropagation();

    const regionLabel = override.regionName
      ? `${override.countryName} - ${override.regionName}`
      : override.countryName || override.countryCode;

    const modalContext = this.#modalManager?.open(this, UMB_CONFIRM_MODAL, {
      data: {
        headline: "Delete Shipping Tax Override",
        content: `Delete the shipping tax override for ${regionLabel}.`,
        confirmLabel: "Delete",
        color: "danger",
      },
    });

    try {
      await modalContext?.onSubmit();
    } catch {
      return; // User cancelled
    }
    if (!this.#isConnected) return;

    // Track deleted override to be saved with unified save
    this._deletedOverrideIds = [...this._deletedOverrideIds, override.id];
    this._shippingOverrides = this._shippingOverrides.filter((o) => o.id !== override.id);
  }

  // Config field handlers
  private _handleValueChange(key: string, value: string): void {
    this._values = { ...this._values, [key]: value };
  }

  private _handleCheckboxChange(key: string, checked: boolean): void {
    this._values = { ...this._values, [key]: checked ? "true" : "false" };
  }

  // Tax Group Mapping handlers
  private _handleMappingChange(taxGroupId: string, code: string): void {
    if (code) {
      this._mappings = { ...this._mappings, [taxGroupId]: code };
    } else {
      const { [taxGroupId]: _, ...rest } = this._mappings;
      this._mappings = rest;
    }
    this._values = { ...this._values, taxGroupMappings: JSON.stringify(this._mappings) };
  }

  private _renderTaxGroupMappingField(field: TaxProviderFieldDto): unknown {
    if (this._isLoadingTaxGroups) {
      return html`
        <div class="form-field">
          <label>${field.label}</label>
          <div class="loading-inline">
            <uui-loader-circle></uui-loader-circle>
            <span>Loading tax groups...</span>
          </div>
        </div>
      `;
    }

    if (this._taxGroups.length === 0) {
      return html`
        <div class="form-field">
          <label>${field.label}</label>
          <div class="empty-state-inline">
            <p>No tax groups configured. Create tax groups in the Manual tax provider settings first.</p>
          </div>
        </div>
      `;
    }

    return html`
      <div class="form-field">
        <label>${field.label}</label>
        ${field.description ? html`<p class="field-description">${field.description}</p>` : nothing}
        <div class="table-container">
          <uui-table class="mapping-table">
            <uui-table-head>
              <uui-table-head-cell>Tax Group</uui-table-head-cell>
              <uui-table-head-cell>Tax Code</uui-table-head-cell>
            </uui-table-head>
            ${this._taxGroups.map(
              (group) => html`
                <uui-table-row>
                  <uui-table-cell>
                    <span class="name-cell">${group.name}</span>
                    <span class="rate-cell">(${group.taxPercentage}%)</span>
                  </uui-table-cell>
                  <uui-table-cell>
                    <uui-input
                      label="Tax code for ${group.name}"
                      .value=${this._mappings[group.id] ?? ""}
                      @input=${(e: Event) =>
                        this._handleMappingChange(group.id, (e.target as HTMLInputElement).value)}
                      placeholder="${field.placeholder || "P0000000"}"
                    ></uui-input>
                  </uui-table-cell>
                </uui-table-row>
              `
            )}
          </uui-table>
        </div>
      </div>
    `;
  }

  // Save handler
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
      // Save provider configuration
      const { error } = await MerchelloApi.saveTaxProviderSettings(provider.alias, {
        configuration: this._values,
      });

      if (!this.#isConnected) return;

      if (error) {
        this._errorMessage = error.message;
        this._isSaving = false;
        return;
      }

      // Delete any pending shipping override deletions
      if (this._isManualProvider && this._deletedOverrideIds.length > 0) {
        for (const id of this._deletedOverrideIds) {
          const deleteResult = await MerchelloApi.deleteShippingTaxOverride(id);
          if (deleteResult.error) {
            // Deletion failed but continue with save - override may have been deleted already
          }
        }
        this._deletedOverrideIds = [];
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

  // Tab handlers
  private _handleTabClick(tab: TabType): void {
    this._activeTab = tab;
  }

  // Format helpers
  private _formatPercentage(value: number): string {
    return `${value}%`;
  }

  private _formatRegion(override: ShippingTaxOverrideDto): string {
    if (override.regionName && override.countryName) {
      return `${override.countryName} - ${override.regionName}`;
    }
    if (override.countryName) {
      return override.countryName;
    }
    if (override.regionCode) {
      return `${override.countryCode}-${override.regionCode}`;
    }
    return override.countryCode;
  }

  // Render: Config field
  private _renderField(field: TaxProviderFieldDto): unknown {
    const value = this._values[field.key] ?? "";

    // For Manual provider, shipping tax fields are rendered in the Shipping tab
    if (this._isManualProvider && (field.key === "shippingTaxGroupId" || field.key === "isShippingTaxable")) {
      return nothing;
    }

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
              label="${field.label}"
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
              label="${field.label}"
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
              label="${field.label}"
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
              label="${field.label}"
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
              label="${field.label}"
              .options=${field.options?.map((o) => ({
                name: o.label,
                value: o.value,
                selected: value === o.value,
              })) ?? []}
              ?required=${field.isRequired}
              @change=${(e: Event) =>
                this._handleValueChange(field.key, (e.target as HTMLSelectElement).value)}
            ></uui-select>
          </div>
        `;

      case "TaxGroupMapping":
        return this._renderTaxGroupMappingField(field);

      default:
        return nothing;
    }
  }

  // Render: Tabs
  private _renderTabs(): unknown {
    return html`
      <uui-tab-group class="tabs">
        <uui-tab
          label="Product Taxes"
          ?active=${this._activeTab === "product"}
          @click=${() => this._handleTabClick("product")}
        >
          Product Taxes
        </uui-tab>
        <uui-tab
          label="Shipping Taxes"
          ?active=${this._activeTab === "shipping"}
          @click=${() => this._handleTabClick("shipping")}
        >
          Shipping Taxes
          ${this._deletedOverrideIds.length > 0
            ? html`<uui-badge slot="extra" color="warning" attention>Unsaved</uui-badge>`
            : nothing}
        </uui-tab>
      </uui-tab-group>
    `;
  }

  // Render: Product Taxes Tab
  private _renderProductTaxesTab(): unknown {
    return html`
      <div class="tab-content">
        <div class="info-box">
          <uui-icon name="icon-info"></uui-icon>
          <span>
            Product taxes apply to the items customers purchase. Create tax groups to categorize
            products by rate (e.g., Standard VAT, Reduced Rate, Zero Rated).
          </span>
        </div>

        <div class="section">
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
                    <uui-table class="data-table">
                      <uui-table-head>
                        <uui-table-head-cell>Name</uui-table-head-cell>
                        <uui-table-head-cell>Default Rate</uui-table-head-cell>
                        <uui-table-head-cell class="actions-header">Actions</uui-table-head-cell>
                      </uui-table-head>
                      ${this._taxGroups.map((tg) => this._renderTaxGroupRow(tg))}
                    </uui-table>
                  </div>
                  <p class="table-hint">Click a row to edit the tax group and manage regional rate overrides.</p>
                `}
        </div>
      </div>
    `;
  }

  private _renderTaxGroupRow(taxGroup: TaxGroupDto): unknown {
    const isDeleting = this._isDeleting === taxGroup.id;

    return html`
      <uui-table-row class="clickable" @click=${() => this._handleEditTaxGroup(taxGroup)}>
        <uui-table-cell>
          <span class="name-cell">${taxGroup.name}</span>
        </uui-table-cell>
        <uui-table-cell>
          <span class="rate-cell">${this._formatPercentage(taxGroup.taxPercentage)}</span>
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

  // Render: Shipping Taxes Tab
  private _renderShippingTaxesTab(): unknown {
    const isShippingTaxable = this._values["isShippingTaxable"] === "true";
    const shippingTaxGroupId = this._values["shippingTaxGroupId"] ?? "";

    const taxGroupOptions = [
      { name: "Use proportional rate (weighted average)", value: "", selected: !shippingTaxGroupId },
      ...this._taxGroups.map((tg) => ({
        name: `${tg.name} (${tg.taxPercentage}%)`,
        value: tg.id,
        selected: tg.id === shippingTaxGroupId,
      })),
    ];

    return html`
      <div class="tab-content">
        <div class="info-box">
          <uui-icon name="icon-info"></uui-icon>
          <span>
            Configure how shipping costs are taxed. Regional overrides take precedence over
            global settings below.
          </span>
        </div>

        <!-- Global Settings -->
        <div class="section">
          <h4 class="section-title">Global Settings</h4>

          <div class="form-field checkbox-field">
            <uui-checkbox
              label="Tax shipping"
              ?checked=${isShippingTaxable}
              @change=${(e: Event) =>
                this._handleCheckboxChange("isShippingTaxable", (e.target as HTMLInputElement).checked)}
            >
              Tax Shipping
            </uui-checkbox>
            <p class="field-description">Enable tax on shipping costs</p>
          </div>

          ${isShippingTaxable
            ? html`
                <div class="form-field">
                  <label>Default Shipping Tax Group</label>
                  <p class="field-description">
                    Select a tax group for shipping, or leave empty to calculate shipping tax as a
                    weighted average of line item tax rates (EU/UK compliant).
                  </p>
                  ${this._isLoadingTaxGroups
                    ? html`<uui-loader-circle></uui-loader-circle>`
                    : html`
                        <uui-select
                          label="Shipping tax group"
                          .options=${taxGroupOptions}
                          @change=${(e: Event) =>
                            this._handleValueChange("shippingTaxGroupId", (e.target as HTMLSelectElement).value)}
                        ></uui-select>
                      `}
                </div>
              `
            : nothing}
        </div>

        <!-- Regional Overrides -->
        <div class="section">
          <div class="section-header">
            <div>
              <h4 class="section-title">Regional Overrides</h4>
              <p class="section-description">
                Define which regions tax shipping and which don't. Overrides apply regardless of
                global settings above.
              </p>
            </div>
            <uui-button
              look="primary"
              compact
              label="Add Override"
              @click=${this._handleAddOverride}
              ?disabled=${this._isLoadingOverrides}
            >
              <uui-icon name="icon-add"></uui-icon>
              Add
            </uui-button>
          </div>

          ${this._isLoadingOverrides
            ? html`
                <div class="loading-inline">
                  <uui-loader-circle></uui-loader-circle>
                  <span>Loading overrides...</span>
                </div>
              `
            : this._shippingOverrides.length === 0
              ? html`
                  <div class="empty-state">
                    <uui-icon name="icon-globe"></uui-icon>
                    <p>No regional overrides configured.</p>
                    <p class="empty-hint">
                      Add overrides to customize shipping tax rules per country or state.
                    </p>
                  </div>
                `
              : html`
                  <div class="table-container">
                    <uui-table class="data-table">
                      <uui-table-head>
                        <uui-table-head-cell>Region</uui-table-head-cell>
                        <uui-table-head-cell>Tax Group</uui-table-head-cell>
                        <uui-table-head-cell class="actions-header">Actions</uui-table-head-cell>
                      </uui-table-head>
                      ${this._shippingOverrides.map((o) => this._renderOverrideRow(o))}
                    </uui-table>
                  </div>
                `}
        </div>
      </div>
    `;
  }

  private _renderOverrideRow(override: ShippingTaxOverrideDto): unknown {
    return html`
      <uui-table-row>
        <uui-table-cell>
          <div class="region-cell">
            <span class="name-cell">${this._formatRegion(override)}</span>
            ${!override.regionCode
              ? html`<span class="country-badge">Country-wide</span>`
              : nothing}
          </div>
        </uui-table-cell>
        <uui-table-cell>
          ${override.shippingTaxGroupId && override.shippingTaxGroupName
            ? html`<span class="name-cell">${override.shippingTaxGroupName}
                <span class="rate-cell">(${override.shippingTaxGroupPercentage}%)</span></span>`
            : html`<span class="no-tax">No shipping tax</span>`}
        </uui-table-cell>
        <uui-table-cell>
          <div class="actions-cell">
            <uui-button
              look="secondary"
              compact
              label="Edit"
              @click=${() => this._handleEditOverride(override)}
            >
              <uui-icon name="icon-edit"></uui-icon>
            </uui-button>
            <uui-button
              look="secondary"
              compact
              label="Delete"
              @click=${(e: Event) => this._handleDeleteOverride(e, override)}
            >
              <uui-icon name="icon-delete"></uui-icon>
            </uui-button>
          </div>
        </uui-table-cell>
      </uui-table-row>
    `;
  }

  // Render: Non-Manual provider content
  private _renderNonManualContent(): unknown {
    const provider = this.data?.provider;

    return html`
      ${provider?.setupInstructions
        ? html`
            <div class="info-box">
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
        : html`
            <p class="no-fields">This provider does not require any configuration.</p>
          `}
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

                ${this._isManualProvider
                  ? html`
                      ${this._renderTabs()}
                      ${this._activeTab === "product"
                        ? this._renderProductTaxesTab()
                        : this._renderShippingTaxesTab()}
                    `
                  : this._renderNonManualContent()}
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

    /* Tabs */
    .tabs {
      --uui-tab-divider: var(--uui-color-border);
      margin-bottom: var(--uui-size-space-4);
    }

    .tab-content {
      display: flex;
      flex-direction: column;
      gap: var(--uui-size-space-5);
    }

    /* Info Box */
    .info-box {
      display: flex;
      align-items: flex-start;
      gap: var(--uui-size-space-3);
      padding: var(--uui-size-space-4);
      background: var(--uui-color-surface-alt);
      border: 1px solid var(--uui-color-border);
      border-radius: var(--uui-border-radius);
      font-size: 0.875rem;
      color: var(--uui-color-text-alt);
      line-height: 1.5;
    }

    .info-box uui-icon {
      flex-shrink: 0;
      color: var(--uui-color-interactive);
    }

    /* Sections */
    .section {
      display: flex;
      flex-direction: column;
      gap: var(--uui-size-space-4);
    }

    .section-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      gap: var(--uui-size-space-4);
    }

    .section-header h3,
    .section-header h4 {
      margin: 0;
    }

    .section-title {
      font-size: 0.875rem;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      color: var(--uui-color-text);
      margin: 0;
    }

    .section-description {
      color: var(--uui-color-text-alt);
      font-size: 0.875rem;
      margin: var(--uui-size-space-1) 0 0 0;
    }

    /* Form fields */
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

    .no-fields {
      color: var(--uui-color-text-alt);
      font-style: italic;
    }

    /* Tables */
    .table-container {
      overflow-x: auto;
      background: var(--uui-color-surface);
      border: 1px solid var(--uui-color-border);
      border-radius: var(--uui-border-radius);
    }

    .data-table,
    .mapping-table {
      width: 100%;
    }

    .mapping-table uui-input {
      width: 100%;
    }

    .empty-state-inline {
      padding: var(--uui-size-space-4);
      background: var(--uui-color-surface-alt);
      border: 1px dashed var(--uui-color-border);
      border-radius: var(--uui-border-radius);
      color: var(--uui-color-text-alt);
      font-style: italic;
    }

    .empty-state-inline p {
      margin: 0;
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

    .name-cell {
      font-weight: 500;
      color: var(--uui-color-interactive);
    }

    .rate-cell {
      font-family: var(--uui-font-family-monospace, monospace);
      color: var(--uui-color-text-alt);
    }

    .region-cell {
      display: flex;
      align-items: center;
      gap: var(--uui-size-space-2);
    }

    .country-badge {
      font-size: 0.6875rem;
      padding: 2px 6px;
      background: var(--uui-color-surface-alt);
      border-radius: var(--uui-border-radius);
      color: var(--uui-color-text-alt);
    }

    .no-tax {
      color: var(--uui-color-text-alt);
      font-style: italic;
    }

    .actions-header {
      text-align: right;
    }

    .actions-cell {
      display: flex;
      gap: var(--uui-size-space-1);
      justify-content: flex-end;
    }

    .table-hint {
      font-size: 0.8125rem;
      color: var(--uui-color-text-alt);
      margin: var(--uui-size-space-2) 0 0 0;
    }

    /* Loading and empty states */
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
      padding: var(--uui-size-space-6);
      text-align: center;
      color: var(--uui-color-text-alt);
      background: var(--uui-color-surface-alt);
      border: 1px dashed var(--uui-color-border);
      border-radius: var(--uui-border-radius);
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

    /* Actions slot */
    [slot="actions"] {
      display: flex;
      gap: var(--uui-size-space-2);
      justify-content: flex-end;
    }
  `;
}

export default MerchelloTaxProviderConfigModalElement;

declare global {
  interface HTMLElementTagNameMap {
    "merchello-tax-provider-config-modal": MerchelloTaxProviderConfigModalElement;
  }
}
