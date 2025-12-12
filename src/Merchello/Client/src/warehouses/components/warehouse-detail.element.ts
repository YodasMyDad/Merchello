import { LitElement, html, css, nothing } from "@umbraco-cms/backoffice/external/lit";
import { customElement, state } from "@umbraco-cms/backoffice/external/lit";
import { UmbElementMixin } from "@umbraco-cms/backoffice/element-api";
import { UMB_WORKSPACE_CONTEXT } from "@umbraco-cms/backoffice/workspace";
import type { UmbRoute, UmbRouterSlotChangeEvent, UmbRouterSlotInitEvent } from "@umbraco-cms/backoffice/router";
import { UMB_MODAL_MANAGER_CONTEXT } from "@umbraco-cms/backoffice/modal";
import type { UmbModalManagerContext } from "@umbraco-cms/backoffice/modal";
import { UMB_NOTIFICATION_CONTEXT } from "@umbraco-cms/backoffice/notification";
import type { UmbNotificationContext } from "@umbraco-cms/backoffice/notification";
import type { WarehouseDetailDto, SupplierDto, CountryInfo, ServiceRegionDto } from "@warehouses/types.js";
import type { MerchelloWarehouseDetailWorkspaceContext } from "@warehouses/contexts/warehouse-detail-workspace.context.js";
import { MerchelloApi } from "@api/merchello-api.js";
import { MERCHELLO_SERVICE_REGION_MODAL } from "@warehouses/modals/service-region-modal.token.js";
import { MERCHELLO_SUPPLIER_MODAL } from "@suppliers/modals/supplier-modal.token.js";
import { MERCHELLO_SHIPPING_OPTION_DETAIL_MODAL } from "@shipping/modals/shipping-option-detail-modal.token.js";
import type { ShippingOptionDto } from "@shipping/types.js";
import {
  navigateToWarehousesList,
  getWarehousesListHref,
  getWarehouseDetailHref,
} from "@shared/utils/navigation.js";
import { badgeStyles } from "@shared/styles/badge.styles.js";
import type { SelectOption } from "@shared/types/index.js";

type TabId = "general" | "regions" | "options";

@customElement("merchello-warehouse-detail")
export class MerchelloWarehouseDetailElement extends UmbElementMixin(LitElement) {
  @state() private _warehouse: WarehouseDetailDto | null = null;
  @state() private _isLoading = true;
  @state() private _isSaving = false;
  @state() private _errorMessage: string | null = null;

  // Tab routing state
  @state() private _routes: UmbRoute[] = [];
  @state() private _routerPath?: string;
  @state() private _activePath = "";

  // Form state
  @state() private _formData: Partial<WarehouseDetailDto> = {};
  @state() private _suppliers: SupplierDto[] = [];
  @state() private _countries: CountryInfo[] = [];
  @state() private _shippingOptions: ShippingOptionDto[] = [];
  @state() private _isDeletingRegion: string | null = null;
  @state() private _isDeletingOption: string | null = null;

  #workspaceContext?: MerchelloWarehouseDetailWorkspaceContext;
  #modalManager?: UmbModalManagerContext;
  #notificationContext?: UmbNotificationContext;
  #isConnected = false;

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
    this.consumeContext(UMB_NOTIFICATION_CONTEXT, (context) => {
      this.#notificationContext = context;
    });
  }

  connectedCallback(): void {
    super.connectedCallback();
    this.#isConnected = true;
    this._createRoutes();
    this._loadSuppliers();
    this._loadCountries();
  }

  disconnectedCallback(): void {
    super.disconnectedCallback();
    this.#isConnected = false;
  }

  // Tab routing
  private _createRoutes(): void {
    const stubComponent = (): HTMLElement => document.createElement("div");
    this._routes = [
      { path: "tab/general", component: stubComponent },
      { path: "tab/regions", component: stubComponent },
      { path: "tab/options", component: stubComponent },
      { path: "", redirectTo: "tab/general" },
    ];
  }

  private _getActiveTab(): TabId {
    if (this._activePath.includes("tab/regions")) return "regions";
    if (this._activePath.includes("tab/options")) return "options";
    return "general";
  }

  private _onRouterInit(event: UmbRouterSlotInitEvent): void {
    this._routerPath = event.target.absoluteRouterPath;
  }

  private _onRouterChange(event: UmbRouterSlotChangeEvent): void {
    this._activePath = event.target.localActiveViewPath || "";
    // Load shipping options when navigating to options tab
    if (this._getActiveTab() === "options" && this._shippingOptions.length === 0) {
      this._loadShippingOptions();
    }
  }

  private async _loadSuppliers(): Promise<void> {
    const { data } = await MerchelloApi.getSuppliers();
    if (!this.#isConnected) return;
    if (data) {
      this._suppliers = data;
    }
  }

  private async _loadCountries(): Promise<void> {
    const { data } = await MerchelloApi.getLocalityCountries();
    if (!this.#isConnected) return;
    if (data) {
      this._countries = data;
    }
  }

  private async _loadShippingOptions(): Promise<void> {
    if (!this._warehouse?.id) return;
    const { data } = await MerchelloApi.getShippingOptions();
    if (!this.#isConnected) return;
    if (data) {
      // Filter to only this warehouse's options
      this._shippingOptions = data.filter((o) => o.warehouseId === this._warehouse?.id);
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

    const modal = this.#modalManager.open(this, MERCHELLO_SUPPLIER_MODAL, {
      data: {},
    });

    const result = await modal.onSubmit().catch(() => undefined);
    if (!this.#isConnected) return;
    if (result?.created && result.supplier) {
      this._suppliers = [...this._suppliers, result.supplier];
      this._formData = { ...this._formData, supplierId: result.supplier.id };
    }
  }

  private async _handleSave(): Promise<void> {
    this._isSaving = true;
    this._errorMessage = null;

    const isNew = this.#workspaceContext?.isNew ?? true;

    try {
      if (isNew) {
        // Create new warehouse
        const { data, error } = await MerchelloApi.createWarehouse({
          name: this._formData.name || "",
          code: this._formData.code,
          supplierId: this._formData.supplierId,
          address: this._formData.address,
        });

        if (!this.#isConnected) return;

        if (error) {
          this._errorMessage = error.message;
          this.#notificationContext?.peek("danger", {
            data: { headline: "Failed to create", message: error.message || "Could not create warehouse" }
          });
          return;
        }

        if (data) {
          // Update context and navigate to edit route using SPA navigation
          this.#workspaceContext?.updateWarehouse(data);
          history.replaceState({}, "", getWarehouseDetailHref(data.id));
          this.#notificationContext?.peek("positive", {
            data: { headline: "Warehouse created", message: "The warehouse has been created successfully" }
          });
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

        if (!this.#isConnected) return;

        if (error) {
          this._errorMessage = error.message;
          this.#notificationContext?.peek("danger", {
            data: { headline: "Failed to save", message: error.message || "Could not save changes" }
          });
          return;
        }

        if (data) {
          this.#workspaceContext?.updateWarehouse(data);
          this.#notificationContext?.peek("positive", {
            data: { headline: "Changes saved", message: "The warehouse has been updated successfully" }
          });
        }
      }
    } finally {
      if (this.#isConnected) {
        this._isSaving = false;
      }
    }
  }

  private async _handleDelete(): Promise<void> {
    if (!this._warehouse?.id) return;

    const confirmed = confirm(
      `Are you sure you want to delete warehouse "${this._warehouse.name || "Unnamed"}"? This action cannot be undone.`
    );

    if (!confirmed) return;

    const { error } = await MerchelloApi.deleteWarehouse(this._warehouse.id);

    if (!this.#isConnected) return;

    if (error) {
      this._errorMessage = `Failed to delete warehouse: ${error.message}`;
      this.#notificationContext?.peek("danger", {
        data: { headline: "Failed to delete", message: error.message || "Could not delete warehouse" }
      });
      return;
    }

    this.#notificationContext?.peek("positive", {
      data: { headline: "Warehouse deleted", message: "The warehouse has been deleted successfully" }
    });
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
    if (!this.#isConnected) return;
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

    if (!this.#isConnected) return;

    this._isDeletingRegion = null;

    if (error) {
      this._errorMessage = `Failed to delete region: ${error.message}`;
      this.#notificationContext?.peek("danger", {
        data: { headline: "Failed to delete", message: error.message || "Could not delete region" }
      });
      return;
    }

    this.#notificationContext?.peek("positive", {
      data: { headline: "Region deleted", message: "The service region has been removed" }
    });
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
    if (!this.#isConnected) return;
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

    if (!this.#isConnected) return;

    this._isDeletingOption = null;

    if (error) {
      this._errorMessage = `Failed to delete option: ${error.message}`;
      this.#notificationContext?.peek("danger", {
        data: { headline: "Failed to delete", message: error.message || "Could not delete shipping option" }
      });
      return;
    }

    this.#notificationContext?.peek("positive", {
      data: { headline: "Option deleted", message: "The shipping option has been removed" }
    });
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

  private _renderGeneralTab(): unknown {
    return html`
      <div class="tab-content">
        <!-- Basic Info Section -->
        <uui-box headline="Basic Information">
          <div class="form-grid">
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
    const hasLiveRateOptions = this._shippingOptions.some(o => o.providerKey !== "flat-rate");

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
              <div class="info-banner info">
                <uui-icon name="icon-info"></uui-icon>
                <div>
                  <strong>Configure Shipping Methods</strong>
                  <p>Add shipping options to enable delivery for products from this warehouse. You can:</p>
                  <ul>
                    <li><strong>Flat Rate</strong> - Set manual prices per destination</li>
                    <li><strong>FedEx/UPS</strong> - Get live rates from carrier APIs (requires provider setup in Settings)</li>
                  </ul>
                </div>
              </div>
            `
          : nothing}

        <!-- Help text for existing options -->
        ${!isNew && this._shippingOptions.length > 0
          ? html`
              <p class="section-description">
                These shipping methods are available for products shipped from this warehouse.
                ${hasLiveRateOptions
                  ? "Live rate options fetch real-time prices from the carrier's API."
                  : "Add more options or configure external providers for live rates."}
              </p>
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
    const isLiveRates = option.providerKey !== "flat-rate";

    // Build delivery time description from daysFrom/daysTo
    const deliveryTime = option.isNextDay
      ? "Next Day"
      : option.daysFrom === option.daysTo
        ? `${option.daysFrom} days`
        : `${option.daysFrom}-${option.daysTo} days`;

    // Display cost info - for live rate providers show "Live Rates", otherwise show fixed cost or location-based
    let costDisplay: string;
    if (isLiveRates) {
      costDisplay = "Live Rates";
    } else if (option.fixedCost != null) {
      costDisplay = `$${option.fixedCost.toFixed(2)}`;
    } else if (option.costCount > 0) {
      costDisplay = `${option.costCount} location(s)`;
    } else {
      costDisplay = "—";
    }

    return html`
      <uui-table-row class="clickable" @click=${() => this._openShippingOptionModal(option)}>
        <uui-table-cell>
          <span class="badge ${isLiveRates ? "badge-live" : "badge-default"}">
            ${option.providerDisplayName || option.providerKey || "Flat Rate"}
          </span>
          ${option.serviceType ? html`<span class="service-type">${option.serviceType}</span>` : nothing}
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
    const activeTab = this._getActiveTab();
    switch (activeTab) {
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

    return html`
      <umb-body-layout header-fit-height main-no-padding>
        <!-- Back button -->
        <uui-button slot="header" compact href=${getWarehousesListHref()} label="Back to Warehouses" class="back-button">
          <uui-icon name="icon-arrow-left"></uui-icon>
        </uui-button>

        <!-- Header with warehouse info -->
        <div id="header" slot="header">
          <umb-icon name="icon-box"></umb-icon>
          <uui-input
            id="name-input"
            type="text"
            .value=${this._formData.name || ""}
            @input=${(e: Event) => this._handleInputChange("name", (e.target as HTMLInputElement).value)}
            placeholder="Warehouse name"
            label="Warehouse name">
          </uui-input>
        </div>

        <!-- Inner layout with tabs -->
        <umb-body-layout header-fit-height header-no-padding>
          <!-- Error banner -->
          ${this._errorMessage
            ? html`
                <div class="error-banner" slot="header">
                  <uui-icon name="icon-alert"></uui-icon>
                  <span>${this._errorMessage}</span>
                </div>
              `
            : nothing}

          <!-- Tabs in header slot -->
          <uui-tab-group slot="header">
            <uui-tab
              label="General"
              href="${this._routerPath}/tab/general"
              ?active=${this._getActiveTab() === "general"}>
              General
            </uui-tab>
            <uui-tab
              label="Service Regions"
              href="${this._routerPath}/tab/regions"
              ?active=${this._getActiveTab() === "regions"}>
              <span class="tab-label">
                Service Regions${(this._warehouse?.serviceRegions.length ?? 0) === 0 ? html`<uui-icon name="icon-alert" class="tab-warning"></uui-icon>` : nothing}
                <span class="tab-count">(${this._warehouse?.serviceRegions.length ?? 0})</span>
              </span>
            </uui-tab>
            <uui-tab
              label="Shipping Options"
              href="${this._routerPath}/tab/options"
              ?active=${this._getActiveTab() === "options"}>
              <span class="tab-label">
                Shipping Options${(this._warehouse?.shippingOptionCount ?? 0) === 0 ? html`<uui-icon name="icon-alert" class="tab-warning"></uui-icon>` : nothing}
                <span class="tab-count">(${this._warehouse?.shippingOptionCount ?? 0})</span>
              </span>
            </uui-tab>
          </uui-tab-group>

          <!-- Hidden router slot for URL tracking -->
          <umb-router-slot
            .routes=${this._routes}
            @init=${this._onRouterInit}
            @change=${this._onRouterChange}>
          </umb-router-slot>

          <!-- Tab content -->
          <div class="tab-content">
            ${this._renderTabContent()}
          </div>
        </umb-body-layout>

        <!-- Footer -->
        <umb-footer-layout slot="footer">
          <uui-breadcrumbs>
            <uui-breadcrumb-item href=${getWarehousesListHref()}>Warehouses</uui-breadcrumb-item>
            <uui-breadcrumb-item>${this._formData.name || "New Warehouse"}</uui-breadcrumb-item>
          </uui-breadcrumbs>

          ${!isNew
            ? html`
                <uui-button
                  slot="actions"
                  look="secondary"
                  color="danger"
                  label="Delete"
                  @click=${this._handleDelete}>
                  Delete
                </uui-button>
              `
            : nothing}
          <uui-button
            slot="actions"
            look="primary"
            color="positive"
            label="Save"
            ?disabled=${this._isSaving}
            @click=${this._handleSave}>
            ${this._isSaving ? "Saving..." : "Save"}
          </uui-button>
        </umb-footer-layout>
      </umb-body-layout>
    `;
  }

  static styles = [
    badgeStyles,
    css`
      :host {
        display: block;
        width: 100%;
        height: 100%;
        --uui-tab-background: var(--uui-color-surface);
      }

      /* Header styling */
      .back-button {
        margin-right: var(--uui-size-space-2);
      }

      #header {
        display: flex;
        align-items: center;
        gap: var(--uui-size-space-3);
        flex: 1;
        padding: var(--uui-size-space-4) 0;
      }

      #header umb-icon {
        font-size: 24px;
        color: var(--uui-color-text-alt);
      }

      #name-input {
        flex: 1 1 auto;
        --uui-input-border-color: transparent;
        --uui-input-background-color: transparent;
        font-size: var(--uui-type-h5-size);
        font-weight: 700;
      }

      #name-input:hover,
      #name-input:focus-within {
        --uui-input-border-color: var(--uui-color-border);
        --uui-input-background-color: var(--uui-color-surface);
      }

      /* Error banner */
      .error-banner {
        display: flex;
        gap: var(--uui-size-space-3);
        align-items: center;
        padding: var(--uui-size-space-4);
        background: var(--uui-color-danger-standalone);
        color: var(--uui-color-danger-contrast);
        border-radius: var(--uui-border-radius);
        margin: var(--uui-size-space-3);
      }

      /* Tab styling */
      uui-tab-group {
        --uui-tab-divider: var(--uui-color-border);
        width: 100%;
      }

      umb-router-slot {
        display: none;
      }

      /* Breadcrumbs */
      uui-breadcrumbs {
        font-size: 0.875rem;
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
        background-color: color-mix(in srgb, var(--uui-color-warning) 10%, transparent);
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

      .info-banner.info {
        background: linear-gradient(135deg, #e3f2fd 0%, #f5f5f5 100%);
        border-left: 4px solid var(--uui-color-interactive);
      }

      .info-banner.info strong {
        display: block;
        margin-bottom: var(--uui-size-space-2);
        color: var(--uui-color-text);
      }

      .info-banner.info p {
        margin: 0 0 var(--uui-size-space-2);
        color: var(--uui-color-text-alt);
      }

      .info-banner.info ul {
        margin: 0;
        padding-left: var(--uui-size-space-4);
      }

      .info-banner.info li {
        margin-bottom: var(--uui-size-space-1);
      }

      .section-description {
        font-size: 0.875rem;
        color: var(--uui-color-text-alt);
        margin: 0 0 var(--uui-size-space-4);
      }

      .badge-live {
        background: var(--uui-color-positive-standalone);
        color: white;
      }

      .badge-default {
        background: var(--uui-color-surface-alt);
        border: 1px solid var(--uui-color-border);
      }

      .service-type {
        font-size: 0.75rem;
        color: var(--uui-color-text-alt);
        display: block;
        margin-top: var(--uui-size-space-1);
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

        .header-content {
          flex-direction: column;
          align-items: flex-start;
        }

        .name-input {
          max-width: 100%;
          width: 100%;
        }

        .footer-left {
          display: none;
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
