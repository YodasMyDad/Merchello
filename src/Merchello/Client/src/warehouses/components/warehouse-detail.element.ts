import { LitElement, html, css, nothing } from "@umbraco-cms/backoffice/external/lit";
import { customElement, state } from "@umbraco-cms/backoffice/external/lit";
import { UmbElementMixin } from "@umbraco-cms/backoffice/element-api";
import { UMB_WORKSPACE_CONTEXT } from "@umbraco-cms/backoffice/workspace";
import { UMB_MODAL_MANAGER_CONTEXT } from "@umbraco-cms/backoffice/modal";
import type { UmbModalManagerContext } from "@umbraco-cms/backoffice/modal";
import type { WarehouseDetailDto, SupplierDto, CountryInfo, ServiceRegionDto } from "@warehouses/types.js";
import type { MerchelloWarehouseDetailWorkspaceContext } from "@warehouses/contexts/warehouse-detail-workspace.context.js";
import { MerchelloApi } from "@api/merchello-api.js";
import { MERCHELLO_SERVICE_REGION_MODAL } from "@warehouses/modals/service-region-modal.token.js";
import { MERCHELLO_CREATE_SUPPLIER_MODAL } from "@warehouses/modals/create-supplier-modal.token.js";
import { MERCHELLO_SHIPPING_OPTION_DETAIL_MODAL } from "@shipping/modals/shipping-option-detail-modal.token.js";
import type { ShippingOptionDto } from "@shipping/types.js";
import {
  navigateToWarehousesList,
  getWarehousesListHref,
  getWarehouseDetailHref,
} from "@shared/utils/navigation.js";
import { badgeStyles } from "@shared/styles/badge.styles.js";

type TabId = "general" | "regions" | "options";

interface SelectOption {
  name: string;
  value: string;
  selected?: boolean;
}

@customElement("merchello-warehouse-detail")
export class MerchelloWarehouseDetailElement extends UmbElementMixin(LitElement) {
  @state() private _warehouse: WarehouseDetailDto | null = null;
  @state() private _isLoading = true;
  @state() private _isSaving = false;
  @state() private _errorMessage: string | null = null;
  @state() private _activeTab: TabId = "general";

  // Form state
  @state() private _formData: Partial<WarehouseDetailDto> = {};
  @state() private _suppliers: SupplierDto[] = [];
  @state() private _countries: CountryInfo[] = [];
  @state() private _shippingOptions: ShippingOptionDto[] = [];
  @state() private _isDeletingRegion: string | null = null;
  @state() private _isDeletingOption: string | null = null;

  #workspaceContext?: MerchelloWarehouseDetailWorkspaceContext;
  #modalManager?: UmbModalManagerContext;

  constructor() {
    super();
    this.consumeContext(UMB_WORKSPACE_CONTEXT, (context) => {
      this.#workspaceContext = context as MerchelloWarehouseDetailWorkspaceContext;
      if (this.#workspaceContext) {
        this.observe(this.#workspaceContext.warehouse, (warehouse) => {
          this._warehouse = warehouse ?? null;
          if (warehouse) {
            this._formData = { ...warehouse };
          }
          this._isLoading = !warehouse;
        });
      }
    });
    this.consumeContext(UMB_MODAL_MANAGER_CONTEXT, (context) => {
      this.#modalManager = context;
    });
  }

  connectedCallback(): void {
    super.connectedCallback();
    this._loadSuppliers();
    this._loadCountries();
  }

  private async _loadSuppliers(): Promise<void> {
    const { data } = await MerchelloApi.getSuppliers();
    if (data) {
      this._suppliers = data;
    }
  }

  private async _loadCountries(): Promise<void> {
    const { data } = await MerchelloApi.getLocalityCountries();
    if (data) {
      this._countries = data;
    }
  }

  private async _loadShippingOptions(): Promise<void> {
    if (!this._warehouse?.id) return;
    const { data } = await MerchelloApi.getShippingOptions();
    if (data) {
      // Filter to only this warehouse's options
      this._shippingOptions = data.filter((o) => o.warehouseId === this._warehouse?.id);
    }
  }

  private _handleTabClick(tab: TabId): void {
    this._activeTab = tab;
    if (tab === "options" && this._shippingOptions.length === 0) {
      this._loadShippingOptions();
    }
  }

  private _handleInputChange(field: keyof WarehouseDetailDto, value: string | undefined): void {
    this._formData = { ...this._formData, [field]: value };
  }

  private _handleAddressChange(field: string, value: string): void {
    this._formData = {
      ...this._formData,
      address: {
        ...this._formData.address,
        [field]: value,
      },
    };
  }

  // uui-select options
  private _getSupplierOptions(): SelectOption[] {
    return [
      { name: "None", value: "", selected: !this._formData.supplierId },
      ...this._suppliers.map((s) => ({
        name: s.name + (s.code ? ` (${s.code})` : ""),
        value: s.id,
        selected: s.id === this._formData.supplierId,
      })),
      { name: "+ Create Supplier...", value: "__create__", selected: false },
    ];
  }

  private _getCountryOptions(): SelectOption[] {
    return [
      { name: "Select country...", value: "", selected: !this._formData.address?.countryCode },
      ...this._countries.map((c) => ({
        name: c.name,
        value: c.code,
        selected: c.code === this._formData.address?.countryCode,
      })),
    ];
  }

  private _handleSupplierChange(e: Event): void {
    const select = e.target as HTMLSelectElement;
    const value = select.value;
    if (value === "__create__") {
      this._openCreateSupplierModal();
      // Reset selection
      this.requestUpdate();
    } else {
      this._formData = { ...this._formData, supplierId: value || undefined };
    }
  }

  private _handleCountryChange(e: Event): void {
    const select = e.target as HTMLSelectElement;
    this._handleAddressChange("countryCode", select.value);
  }

  private async _openCreateSupplierModal(): Promise<void> {
    if (!this.#modalManager) return;

    const modal = this.#modalManager.open(this, MERCHELLO_CREATE_SUPPLIER_MODAL, {
      data: {},
    });

    const result = await modal.onSubmit().catch(() => undefined);
    if (result?.supplier) {
      this._suppliers = [...this._suppliers, result.supplier];
      this._formData = { ...this._formData, supplierId: result.supplier.id };
    }
  }

  private async _handleSave(): Promise<void> {
    this._isSaving = true;
    this._errorMessage = null;

    const isNew = this.#workspaceContext?.isNew ?? true;

    if (isNew) {
      // Create new warehouse
      const { data, error } = await MerchelloApi.createWarehouse({
        name: this._formData.name || "",
        code: this._formData.code,
        supplierId: this._formData.supplierId,
        address: this._formData.address,
      });

      if (error) {
        this._errorMessage = error.message;
        this._isSaving = false;
        return;
      }

      if (data) {
        // Update context and navigate to edit route using SPA navigation
        this.#workspaceContext?.updateWarehouse(data);
        history.replaceState({}, "", getWarehouseDetailHref(data.id));
      }
    } else {
      // Update existing warehouse
      const { data, error } = await MerchelloApi.updateWarehouse(this._warehouse!.id, {
        name: this._formData.name,
        code: this._formData.code,
        supplierId: this._formData.supplierId,
        clearSupplierId: !this._formData.supplierId && !!this._warehouse?.supplierId,
        address: this._formData.address,
      });

      if (error) {
        this._errorMessage = error.message;
        this._isSaving = false;
        return;
      }

      if (data) {
        this.#workspaceContext?.updateWarehouse(data);
      }
    }

    this._isSaving = false;
  }

  private async _handleDelete(): Promise<void> {
    if (!this._warehouse?.id) return;

    const confirmed = confirm(
      `Are you sure you want to delete warehouse "${this._warehouse.name || "Unnamed"}"? This action cannot be undone.`
    );

    if (!confirmed) return;

    const { error } = await MerchelloApi.deleteWarehouse(this._warehouse.id);

    if (error) {
      this._errorMessage = `Failed to delete warehouse: ${error.message}`;
      return;
    }

    navigateToWarehousesList();
  }

  // Service Region handlers
  private async _openServiceRegionModal(region?: ServiceRegionDto): Promise<void> {
    if (!this.#modalManager || !this._warehouse?.id) return;

    const modal = this.#modalManager.open(this, MERCHELLO_SERVICE_REGION_MODAL, {
      data: {
        warehouseId: this._warehouse.id,
        region: region,
        existingRegions: this._warehouse.serviceRegions,
      },
    });

    const result = await modal.onSubmit().catch(() => undefined);
    if (result?.saved) {
      this.#workspaceContext?.reload();
    }
  }

  private async _handleDeleteRegion(e: Event, region: ServiceRegionDto): Promise<void> {
    e.stopPropagation();
    if (!this._warehouse?.id) return;

    const confirmed = confirm(`Are you sure you want to remove this service region?`);
    if (!confirmed) return;

    this._isDeletingRegion = region.id;

    const { error } = await MerchelloApi.deleteServiceRegion(this._warehouse.id, region.id);

    this._isDeletingRegion = null;

    if (error) {
      this._errorMessage = `Failed to delete region: ${error.message}`;
      return;
    }

    this.#workspaceContext?.reload();
  }

  // Shipping Option handlers
  private async _openShippingOptionModal(option?: ShippingOptionDto): Promise<void> {
    if (!this.#modalManager || !this._warehouse?.id) return;

    const modal = this.#modalManager.open(this, MERCHELLO_SHIPPING_OPTION_DETAIL_MODAL, {
      data: {
        optionId: option?.id,
        warehouseId: this._warehouse.id,
      },
    });

    const result = await modal.onSubmit().catch(() => undefined);
    if (result?.saved) {
      this._loadShippingOptions();
      this.#workspaceContext?.reload();
    }
  }

  private async _handleDeleteOption(e: Event, option: ShippingOptionDto): Promise<void> {
    e.stopPropagation();

    const confirmed = confirm(`Are you sure you want to delete shipping option "${option.name}"?`);
    if (!confirmed) return;

    this._isDeletingOption = option.id;

    const { error } = await MerchelloApi.deleteShippingOption(option.id);

    this._isDeletingOption = null;

    if (error) {
      this._errorMessage = `Failed to delete option: ${error.message}`;
      return;
    }

    this._loadShippingOptions();
    this.#workspaceContext?.reload();
  }

  // Validation helpers
  private _isFieldEmpty(value: string | undefined | null): boolean {
    return !value || value.trim() === "";
  }

  private _getValidationClass(value: string | undefined | null, required: boolean): string {
    if (required && this._isFieldEmpty(value)) {
      return "field-warning";
    }
    return "";
  }

  // Render methods
  private _renderLoadingState(): unknown {
    return html`<div class="loading"><uui-loader></uui-loader></div>`;
  }

  private _renderTabs(): unknown {
    const regionCount = this._warehouse?.serviceRegions.length ?? 0;
    const optionCount = this._warehouse?.shippingOptionCount ?? 0;

    return html`
      <uui-tab-group>
        <uui-tab
          label="General"
          ?active=${this._activeTab === "general"}
          @click=${() => this._handleTabClick("general")}>
          General
        </uui-tab>
        <uui-tab
          label="Service Regions"
          ?active=${this._activeTab === "regions"}
          @click=${() => this._handleTabClick("regions")}>
          <span class="tab-label">
            Service Regions${regionCount === 0 ? html`<uui-icon name="icon-alert" class="tab-warning"></uui-icon>` : nothing}
            <span class="tab-count">(${regionCount})</span>
          </span>
        </uui-tab>
        <uui-tab
          label="Shipping Options"
          ?active=${this._activeTab === "options"}
          @click=${() => this._handleTabClick("options")}>
          <span class="tab-label">
            Shipping Options${optionCount === 0 ? html`<uui-icon name="icon-alert" class="tab-warning"></uui-icon>` : nothing}
            <span class="tab-count">(${optionCount})</span>
          </span>
        </uui-tab>
      </uui-tab-group>
    `;
  }

  private _renderGeneralTab(): unknown {
    return html`
      <div class="tab-content">
        <!-- Basic Info Section -->
        <uui-box headline="Basic Information">
          <div class="form-grid">
            <div class="form-field ${this._getValidationClass(this._formData.name, true)}">
              <label>Name <span class="required">*</span></label>
              <uui-input
                type="text"
                .value=${this._formData.name || ""}
                @input=${(e: Event) => this._handleInputChange("name", (e.target as HTMLInputElement).value)}
                placeholder="Main Warehouse"
                label="Warehouse name">
              </uui-input>
            </div>

            <div class="form-field">
              <label>Code</label>
              <uui-input
                type="text"
                .value=${this._formData.code || ""}
                @input=${(e: Event) => this._handleInputChange("code", (e.target as HTMLInputElement).value)}
                placeholder="MAIN-01"
                label="Warehouse code">
              </uui-input>
            </div>

            <div class="form-field">
              <label>Supplier</label>
              <uui-select
                label="Supplier"
                .options=${this._getSupplierOptions()}
                @change=${this._handleSupplierChange}>
              </uui-select>
            </div>
          </div>
        </uui-box>

        <!-- Address Section -->
        <uui-box headline="Shipping Origin Address">
          <p class="section-hint">This address is used as the origin for shipping calculations.</p>
          <div class="form-grid">
            <div class="form-field">
              <label>Contact Name</label>
              <uui-input
                type="text"
                .value=${this._formData.address?.name || ""}
                @input=${(e: Event) => this._handleAddressChange("name", (e.target as HTMLInputElement).value)}
                label="Contact name">
              </uui-input>
            </div>

            <div class="form-field">
              <label>Company</label>
              <uui-input
                type="text"
                .value=${this._formData.address?.company || ""}
                @input=${(e: Event) => this._handleAddressChange("company", (e.target as HTMLInputElement).value)}
                label="Company name">
              </uui-input>
            </div>

            <div class="form-field full-width ${this._getValidationClass(this._formData.address?.addressOne, true)}">
              <label>Address Line 1 <span class="required">*</span></label>
              <uui-input
                type="text"
                .value=${this._formData.address?.addressOne || ""}
                @input=${(e: Event) => this._handleAddressChange("addressOne", (e.target as HTMLInputElement).value)}
                label="Address line 1">
              </uui-input>
            </div>

            <div class="form-field full-width">
              <label>Address Line 2</label>
              <uui-input
                type="text"
                .value=${this._formData.address?.addressTwo || ""}
                @input=${(e: Event) => this._handleAddressChange("addressTwo", (e.target as HTMLInputElement).value)}
                label="Address line 2">
              </uui-input>
            </div>

            <div class="form-field ${this._getValidationClass(this._formData.address?.townCity, true)}">
              <label>Town/City <span class="required">*</span></label>
              <uui-input
                type="text"
                .value=${this._formData.address?.townCity || ""}
                @input=${(e: Event) => this._handleAddressChange("townCity", (e.target as HTMLInputElement).value)}
                label="Town or city">
              </uui-input>
            </div>

            <div class="form-field">
              <label>County/State</label>
              <uui-input
                type="text"
                .value=${this._formData.address?.countyState || ""}
                @input=${(e: Event) => this._handleAddressChange("countyState", (e.target as HTMLInputElement).value)}
                label="County or state">
              </uui-input>
            </div>

            <div class="form-field ${this._getValidationClass(this._formData.address?.postalCode, true)}">
              <label>Postal Code <span class="required">*</span></label>
              <uui-input
                type="text"
                .value=${this._formData.address?.postalCode || ""}
                @input=${(e: Event) => this._handleAddressChange("postalCode", (e.target as HTMLInputElement).value)}
                label="Postal code">
              </uui-input>
            </div>

            <div class="form-field ${this._getValidationClass(this._formData.address?.countryCode, true)}">
              <label>Country <span class="required">*</span></label>
              <uui-select
                label="Country"
                .options=${this._getCountryOptions()}
                @change=${this._handleCountryChange}>
              </uui-select>
            </div>

            <div class="form-field">
              <label>Email</label>
              <uui-input
                type="email"
                .value=${this._formData.address?.email || ""}
                @input=${(e: Event) => this._handleAddressChange("email", (e.target as HTMLInputElement).value)}
                label="Email">
              </uui-input>
            </div>

            <div class="form-field">
              <label>Phone</label>
              <uui-input
                type="tel"
                .value=${this._formData.address?.phone || ""}
                @input=${(e: Event) => this._handleAddressChange("phone", (e.target as HTMLInputElement).value)}
                label="Phone">
              </uui-input>
            </div>
          </div>
        </uui-box>

        ${this._renderValidationSummary()}
      </div>
    `;
  }

  private _renderValidationSummary(): unknown {
    const issues: string[] = [];

    if (this._isFieldEmpty(this._formData.name)) {
      issues.push("Warehouse name is required");
    }
    if (this._isFieldEmpty(this._formData.address?.addressOne)) {
      issues.push("Address line 1 is required");
    }
    if (this._isFieldEmpty(this._formData.address?.townCity)) {
      issues.push("Town/City is required");
    }
    if (this._isFieldEmpty(this._formData.address?.postalCode)) {
      issues.push("Postal code is required");
    }
    if (this._isFieldEmpty(this._formData.address?.countryCode)) {
      issues.push("Country is required");
    }

    if (issues.length === 0) return nothing;

    return html`
      <div class="validation-summary">
        <uui-icon name="icon-alert"></uui-icon>
        <div>
          <strong>Please complete the following:</strong>
          <ul>
            ${issues.map((issue) => html`<li>${issue}</li>`)}
          </ul>
        </div>
      </div>
    `;
  }

  private _renderRegionsTab(): unknown {
    const regions = this._warehouse?.serviceRegions ?? [];
    const isNew = this.#workspaceContext?.isNew ?? true;

    return html`
      <div class="tab-content">
        ${isNew
          ? html`
              <div class="info-banner warning">
                <uui-icon name="icon-alert"></uui-icon>
                <span>Save the warehouse first before adding service regions.</span>
              </div>
            `
          : nothing}

        ${!isNew && regions.length === 0
          ? html`
              <div class="info-banner warning">
                <uui-icon name="icon-alert"></uui-icon>
                <span>This warehouse has no service regions and won't ship anywhere. Add regions to define where this warehouse can fulfill orders.</span>
              </div>
            `
          : nothing}

        <div class="section-header">
          <h3>Service Regions</h3>
          <uui-button
            look="primary"
            color="positive"
            label="Add Region"
            ?disabled=${isNew}
            @click=${() => this._openServiceRegionModal()}>
            Add Region
          </uui-button>
        </div>

        ${regions.length > 0
          ? html`
              <div class="table-container">
                <uui-table class="data-table">
                  <uui-table-head>
                    <uui-table-head-cell>Region</uui-table-head-cell>
                    <uui-table-head-cell>Mode</uui-table-head-cell>
                    <uui-table-head-cell class="actions-header">Actions</uui-table-head-cell>
                  </uui-table-head>
                  ${regions.map((region) => this._renderRegionRow(region))}
                </uui-table>
              </div>
            `
          : !isNew
            ? html`
                <div class="empty-state">
                  <uui-icon name="icon-globe"></uui-icon>
                  <p>No service regions configured</p>
                </div>
              `
            : nothing}
      </div>
    `;
  }

  private _renderRegionRow(region: ServiceRegionDto): unknown {
    const isDeleting = this._isDeletingRegion === region.id;

    return html`
      <uui-table-row class="${region.isExcluded ? "excluded-row" : ""}">
        <uui-table-cell>${region.regionDisplay || `${region.stateOrProvinceCode || ""} ${region.countryCode}`}</uui-table-cell>
        <uui-table-cell>
          <span class="badge ${region.isExcluded ? "badge-danger" : "badge-positive"}">
            ${region.isExcluded ? "Exclude" : "Include"}
          </span>
        </uui-table-cell>
        <uui-table-cell class="actions-cell">
          <uui-button
            look="secondary"
            compact
            label="Edit"
            @click=${() => this._openServiceRegionModal(region)}>
            <uui-icon name="icon-edit"></uui-icon>
          </uui-button>
          <uui-button
            look="primary"
            color="danger"
            compact
            label="Delete"
            ?disabled=${isDeleting}
            @click=${(e: Event) => this._handleDeleteRegion(e, region)}>
            <uui-icon name="${isDeleting ? "icon-hourglass" : "icon-trash"}"></uui-icon>
          </uui-button>
        </uui-table-cell>
      </uui-table-row>
    `;
  }

  private _renderOptionsTab(): unknown {
    const isNew = this.#workspaceContext?.isNew ?? true;

    return html`
      <div class="tab-content">
        ${isNew
          ? html`
              <div class="info-banner warning">
                <uui-icon name="icon-alert"></uui-icon>
                <span>Save the warehouse first before adding shipping options.</span>
              </div>
            `
          : nothing}

        ${!isNew && this._shippingOptions.length === 0
          ? html`
              <div class="info-banner warning">
                <uui-icon name="icon-alert"></uui-icon>
                <span>No shipping methods configured for this warehouse. Add shipping options to offer delivery to customers.</span>
              </div>
            `
          : nothing}

        <div class="section-header">
          <h3>Shipping Options</h3>
          <uui-button
            look="primary"
            color="positive"
            label="Add Shipping Option"
            ?disabled=${isNew}
            @click=${() => this._openShippingOptionModal()}>
            Add Shipping Option
          </uui-button>
        </div>

        ${this._shippingOptions.length > 0
          ? html`
              <div class="table-container">
                <uui-table class="data-table">
                  <uui-table-head>
                    <uui-table-head-cell>Provider</uui-table-head-cell>
                    <uui-table-head-cell>Name</uui-table-head-cell>
                    <uui-table-head-cell>Delivery Time</uui-table-head-cell>
                    <uui-table-head-cell>Cost</uui-table-head-cell>
                    <uui-table-head-cell>Status</uui-table-head-cell>
                    <uui-table-head-cell class="actions-header">Actions</uui-table-head-cell>
                  </uui-table-head>
                  ${this._shippingOptions.map((option) => this._renderOptionRow(option))}
                </uui-table>
              </div>
            `
          : !isNew
            ? html`
                <div class="empty-state">
                  <uui-icon name="icon-truck"></uui-icon>
                  <p>No shipping options configured</p>
                </div>
              `
            : nothing}
      </div>
    `;
  }

  private _renderOptionRow(option: ShippingOptionDto): unknown {
    const isDeleting = this._isDeletingOption === option.id;

    // Build delivery time description from daysFrom/daysTo
    const deliveryTime = option.isNextDay
      ? "Next Day"
      : option.daysFrom === option.daysTo
        ? `${option.daysFrom} days`
        : `${option.daysFrom}-${option.daysTo} days`;

    // Display cost info - for live rate providers show "Live", otherwise show fixed cost or location-based
    const costDisplay =
      option.fixedCost != null
        ? `$${option.fixedCost.toFixed(2)}`
        : option.costCount > 0
          ? `${option.costCount} location(s)`
          : "—";

    return html`
      <uui-table-row class="clickable" @click=${() => this._openShippingOptionModal(option)}>
        <uui-table-cell>
          <span class="badge badge-default">${option.providerDisplayName || option.providerKey || "Flat Rate"}</span>
        </uui-table-cell>
        <uui-table-cell>
          <span class="option-name">${option.name || "Unnamed"}</span>
        </uui-table-cell>
        <uui-table-cell>${deliveryTime}</uui-table-cell>
        <uui-table-cell>${costDisplay}</uui-table-cell>
        <uui-table-cell>
          <span class="badge ${option.isEnabled ? "badge-positive" : "badge-default"}">
            ${option.isEnabled ? "Enabled" : "Disabled"}
          </span>
        </uui-table-cell>
        <uui-table-cell class="actions-cell" @click=${(e: Event) => e.stopPropagation()}>
          <uui-button
            look="secondary"
            compact
            label="Edit"
            @click=${() => this._openShippingOptionModal(option)}>
            <uui-icon name="icon-edit"></uui-icon>
          </uui-button>
          <uui-button
            look="primary"
            color="danger"
            compact
            label="Delete"
            ?disabled=${isDeleting}
            @click=${(e: Event) => this._handleDeleteOption(e, option)}>
            <uui-icon name="${isDeleting ? "icon-hourglass" : "icon-trash"}"></uui-icon>
          </uui-button>
        </uui-table-cell>
      </uui-table-row>
    `;
  }

  private _renderTabContent(): unknown {
    switch (this._activeTab) {
      case "general":
        return this._renderGeneralTab();
      case "regions":
        return this._renderRegionsTab();
      case "options":
        return this._renderOptionsTab();
      default:
        return this._renderGeneralTab();
    }
  }

  render() {
    if (this._isLoading) {
      return this._renderLoadingState();
    }

    const isNew = this.#workspaceContext?.isNew ?? true;
    const headline = isNew ? "New Warehouse" : this._warehouse?.name || "Warehouse";

    return html`
      <umb-body-layout header-fit-height main-no-padding>
        <div class="warehouse-container">
          <!-- Header -->
          <div class="header">
            <div class="header-left">
              <a href=${getWarehousesListHref()}>
                <uui-button
                  look="secondary"
                  compact
                  label="Back to Warehouses">
                  <uui-icon name="icon-arrow-left"></uui-icon>
                  Back
                </uui-button>
              </a>
              <h1>${headline}</h1>
            </div>
            <div class="header-actions">
              ${!isNew
                ? html`
                    <uui-button
                      look="primary"
                      color="danger"
                      label="Delete"
                      @click=${this._handleDelete}>
                      Delete
                    </uui-button>
                  `
                : nothing}
              <uui-button
                look="primary"
                color="positive"
                label="Save"
                ?disabled=${this._isSaving}
                @click=${this._handleSave}>
                ${this._isSaving ? "Saving..." : "Save"}
              </uui-button>
            </div>
          </div>

          ${this._errorMessage
            ? html`
                <div class="error-banner">
                  <uui-icon name="icon-alert"></uui-icon>
                  <span>${this._errorMessage}</span>
                </div>
              `
            : nothing}

          <!-- Tabs -->
          ${this._renderTabs()}

          <!-- Tab Content -->
          ${this._renderTabContent()}
        </div>
      </umb-body-layout>
    `;
  }

  static styles = [
    badgeStyles,
    css`
      :host {
        display: block;
        height: 100%;
        background: var(--uui-color-background);
      }

      .warehouse-container {
        max-width: 100%;
        padding: var(--uui-size-layout-1);
      }

      .header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: var(--uui-size-space-4);
      }

      .header-left {
        display: flex;
        align-items: center;
        gap: var(--uui-size-space-4);
      }

      .header-left a {
        text-decoration: none;
      }

      .header-left h1 {
        margin: 0;
        font-size: 1.5rem;
      }

      .header-actions {
        display: flex;
        gap: var(--uui-size-space-2);
      }

      .error-banner {
        display: flex;
        gap: var(--uui-size-space-3);
        align-items: center;
        padding: var(--uui-size-space-4);
        background: var(--uui-color-danger-standalone);
        color: var(--uui-color-danger-contrast);
        border-radius: var(--uui-border-radius);
        margin-bottom: var(--uui-size-space-4);
      }

      uui-tab-group {
        margin-bottom: var(--uui-size-space-4);
      }

      .tab-label {
        display: inline-flex;
        align-items: center;
        gap: var(--uui-size-space-1);
        white-space: nowrap;
      }

      .tab-warning {
        color: var(--uui-color-warning);
      }

      .tab-count {
        color: var(--uui-color-text-alt);
      }

      .tab-content {
        display: flex;
        flex-direction: column;
        gap: var(--uui-size-space-4);
      }

      uui-box {
        margin-bottom: var(--uui-size-space-4);
      }

      .section-hint {
        margin: 0 0 var(--uui-size-space-4) 0;
        font-size: 0.875rem;
        color: var(--uui-color-text-alt);
      }

      .form-grid {
        display: grid;
        grid-template-columns: repeat(2, 1fr);
        gap: var(--uui-size-space-4);
      }

      .form-field {
        display: flex;
        flex-direction: column;
        gap: var(--uui-size-space-1);
      }

      .form-field.full-width {
        grid-column: 1 / -1;
      }

      .form-field label {
        font-weight: 500;
        font-size: 0.875rem;
      }

      .form-field .required {
        color: var(--uui-color-danger);
      }

      .form-field.field-warning uui-input,
      .form-field.field-warning uui-select {
        --uui-input-border-color: var(--uui-color-warning);
        background-color: rgba(255, 193, 7, 0.1);
      }

      .validation-summary {
        display: flex;
        gap: var(--uui-size-space-3);
        padding: var(--uui-size-space-4);
        background: var(--uui-color-warning-standalone);
        color: var(--uui-color-warning-contrast);
        border-radius: var(--uui-border-radius);
      }

      .validation-summary uui-icon {
        flex-shrink: 0;
      }

      .validation-summary ul {
        margin: var(--uui-size-space-2) 0 0;
        padding-left: var(--uui-size-space-4);
      }

      .validation-summary li {
        font-size: 0.875rem;
      }

      .info-banner {
        display: flex;
        gap: var(--uui-size-space-3);
        align-items: flex-start;
        padding: var(--uui-size-space-4);
        background: var(--uui-color-surface-alt);
        border: 1px solid var(--uui-color-border);
        border-radius: var(--uui-border-radius);
        font-size: 0.875rem;
      }

      .info-banner.warning {
        background: var(--uui-color-warning-standalone);
        color: var(--uui-color-warning-contrast);
        border-color: var(--uui-color-warning);
      }

      .section-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
      }

      .section-header h3 {
        margin: 0;
      }

      .table-container {
        background: var(--uui-color-surface);
        border: 1px solid var(--uui-color-border);
        border-radius: var(--uui-border-radius);
        overflow: hidden;
      }

      .data-table {
        width: 100%;
      }

      uui-table-row.clickable {
        cursor: pointer;
      }

      uui-table-row.clickable:hover {
        background: var(--uui-color-surface-emphasis);
      }

      uui-table-row.excluded-row {
        background: rgba(var(--uui-color-danger-rgb, 220, 53, 69), 0.05);
      }

      .option-name {
        font-weight: 500;
      }

      .actions-header {
        width: 120px;
        text-align: right;
      }

      .actions-cell {
        display: flex;
        gap: var(--uui-size-space-1);
        justify-content: flex-end;
      }

      .empty-state {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        padding: var(--uui-size-layout-4);
        text-align: center;
        color: var(--uui-color-text-alt);
      }

      .empty-state uui-icon {
        font-size: 3rem;
        margin-bottom: var(--uui-size-space-4);
        opacity: 0.5;
      }

      .loading {
        display: flex;
        justify-content: center;
        padding: var(--uui-size-space-6);
      }

      @media (max-width: 768px) {
        .form-grid {
          grid-template-columns: 1fr;
        }

        .header {
          flex-direction: column;
          align-items: flex-start;
          gap: var(--uui-size-space-3);
        }

        .header-actions {
          width: 100%;
          justify-content: flex-end;
        }
      }
    `,
  ];
}

export default MerchelloWarehouseDetailElement;

declare global {
  interface HTMLElementTagNameMap {
    "merchello-warehouse-detail": MerchelloWarehouseDetailElement;
  }
}
