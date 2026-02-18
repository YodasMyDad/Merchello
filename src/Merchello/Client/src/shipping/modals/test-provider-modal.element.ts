import { html, css, nothing } from "@umbraco-cms/backoffice/external/lit";
import { customElement, state } from "@umbraco-cms/backoffice/external/lit";
import { UmbModalBaseElement } from "@umbraco-cms/backoffice/modal";
import type { TestShippingProviderModalData, TestShippingProviderModalValue } from "@shipping/modals/test-provider-modal.token.js";
import type { WarehouseListDto, CountryInfo, SubdivisionInfo } from "@warehouses/types/warehouses.types.js";
import type { TestShippingProviderDto, TestShippingProviderResultDto } from "@shipping/types/shipping.types.js";
import { MerchelloApi } from "@api/merchello-api.js";
import { getCurrencySymbol, getStoreSettings } from "@api/store-settings.js";
import type { SelectOption } from "@shared/types/index.js";
import { formatNumber } from "@shared/utils/formatting.js";

const STORAGE_KEY = "merchello-test-provider-form";

interface SavedFormValues {
  warehouseId?: string;
  countryCode?: string;
  regionCode?: string;
  postalCode?: string;
  city?: string;
  weightKg?: number;
  lengthCm?: number;
  widthCm?: number;
  heightCm?: number;
  itemsSubtotal?: number;
}

@customElement("merchello-test-provider-modal")
export class MerchelloTestProviderModalElement extends UmbModalBaseElement<
  TestShippingProviderModalData,
  TestShippingProviderModalValue
> {
  // Form state
  @state() private _warehouseId: string = "";
  @state() private _countryCode: string = "";
  @state() private _regionCode: string = "";
  @state() private _postalCode: string = "";
  @state() private _city: string = "";
  @state() private _weightKg: number = 1.0;
  @state() private _lengthCm: string = "";
  @state() private _widthCm: string = "";
  @state() private _heightCm: string = "";
  @state() private _itemsSubtotal: number = 100.0;

  // Data state
  @state() private _warehouses: WarehouseListDto[] = [];
  @state() private _countries: CountryInfo[] = [];
  @state() private _regions: SubdivisionInfo[] = [];

  // UI state
  @state() private _isLoadingData = true;
  @state() private _isLoadingRegions = false;
  @state() private _isTesting = false;
  @state() private _testResult?: TestShippingProviderResultDto;
  @state() private _errorMessage: string | null = null;

  #isConnected = false;

  override connectedCallback(): void {
    super.connectedCallback();
    this.#isConnected = true;
    this._loadInitialData();
    this._restoreSavedValues();
  }

  override disconnectedCallback(): void {
    super.disconnectedCallback();
    this.#isConnected = false;
  }

  private async _loadInitialData(): Promise<void> {
    this._isLoadingData = true;

    // Preload store settings for currency symbol
    getStoreSettings();

    const [warehousesResult, countriesResult] = await Promise.all([
      MerchelloApi.getWarehousesList(),
      MerchelloApi.getLocalityCountries(),
    ]);

    if (!this.#isConnected) return;

    if (warehousesResult.error) {
      this._errorMessage = warehousesResult.error.message;
      this._isLoadingData = false;
      return;
    }

    if (countriesResult.error) {
      this._errorMessage = countriesResult.error.message;
      this._isLoadingData = false;
      return;
    }

    this._warehouses = warehousesResult.data ?? [];
    this._countries = countriesResult.data ?? [];

    // Auto-select first warehouse if only one and none was restored
    if (this._warehouses.length === 1 && !this._warehouseId) {
      this._warehouseId = this._warehouses[0].id;
    }

    // Load regions if country was restored from storage
    if (this._countryCode) {
      await this._loadRegions(this._countryCode);
    }

    this._isLoadingData = false;
  }

  private _restoreSavedValues(): void {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const values: SavedFormValues = JSON.parse(saved);
        if (values.warehouseId) this._warehouseId = values.warehouseId;
        if (values.countryCode) this._countryCode = values.countryCode;
        if (values.regionCode) this._regionCode = values.regionCode;
        if (values.postalCode) this._postalCode = values.postalCode;
        if (values.city) this._city = values.city;
        if (values.weightKg !== undefined) this._weightKg = values.weightKg;
        if (values.lengthCm !== undefined) this._lengthCm = String(values.lengthCm);
        if (values.widthCm !== undefined) this._widthCm = String(values.widthCm);
        if (values.heightCm !== undefined) this._heightCm = String(values.heightCm);
        if (values.itemsSubtotal !== undefined) this._itemsSubtotal = values.itemsSubtotal;
      }
    } catch {
      // Ignore localStorage errors
    }
  }

  private _saveFormValues(): void {
    try {
      const values: SavedFormValues = {
        warehouseId: this._warehouseId,
        countryCode: this._countryCode,
        regionCode: this._regionCode,
        postalCode: this._postalCode,
        city: this._city,
        weightKg: this._weightKg,
        lengthCm: this._lengthCm ? parseFloat(this._lengthCm) : undefined,
        widthCm: this._widthCm ? parseFloat(this._widthCm) : undefined,
        heightCm: this._heightCm ? parseFloat(this._heightCm) : undefined,
        itemsSubtotal: this._itemsSubtotal,
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(values));
    } catch {
      // Ignore localStorage errors
    }
  }

  private async _loadRegions(countryCode: string): Promise<void> {
    this._isLoadingRegions = true;
    this._regions = [];

    const { data } = await MerchelloApi.getLocalityRegions(countryCode);
    if (!this.#isConnected) return;

    if (data) {
      this._regions = data;
    }

    this._isLoadingRegions = false;
  }

  private _handleCountryChange(e: Event): void {
    const value = (e.target as HTMLSelectElement).value;
    this._countryCode = value;
    this._regionCode = "";
    if (value) {
      this._loadRegions(value);
    } else {
      this._regions = [];
    }
  }

  private async _handleTest(): Promise<void> {
    if (!this._warehouseId || !this._countryCode) {
      this._errorMessage = "Please select a warehouse and destination country.";
      return;
    }

    this._isTesting = true;
    this._errorMessage = null;
    this._testResult = undefined;
    this._saveFormValues();

    const configId = this.data?.configuration.id;
    if (!configId) {
      this._errorMessage = "Configuration ID missing.";
      this._isTesting = false;
      return;
    }

    const request: TestShippingProviderDto = {
      warehouseId: this._warehouseId,
      countryCode: this._countryCode,
      regionCode: this._regionCode || undefined,
      postalCode: this._postalCode || undefined,
      city: this._city || undefined,
      weightKg: this._weightKg,
      lengthCm: this._lengthCm ? parseFloat(this._lengthCm) : undefined,
      widthCm: this._widthCm ? parseFloat(this._widthCm) : undefined,
      heightCm: this._heightCm ? parseFloat(this._heightCm) : undefined,
      itemsSubtotal: this._itemsSubtotal,
    };

    const { data, error } = await MerchelloApi.testShippingProvider(configId, request);

    if (!this.#isConnected) return;

    if (error) {
      this._errorMessage = error.message;
      this._isTesting = false;
      return;
    }

    this._testResult = data;
    this._isTesting = false;
  }

  private _handleClose(): void {
    this.modalContext?.reject();
  }

  // Select options builders
  private _getWarehouseOptions(): SelectOption[] {
    return [
      { name: "Select warehouse...", value: "", selected: !this._warehouseId },
      ...this._warehouses.map((w) => ({
        name: w.name || w.code || "Unnamed Warehouse",
        value: w.id,
        selected: w.id === this._warehouseId,
      })),
    ];
  }

  private _getCountryOptions(): SelectOption[] {
    return [
      { name: "Select country...", value: "", selected: !this._countryCode },
      ...this._countries.map((c) => ({
        name: c.name,
        value: c.code,
        selected: c.code === this._countryCode,
      })),
    ];
  }

  private _getRegionOptions(): SelectOption[] {
    if (this._isLoadingRegions) {
      return [{ name: "Loading...", value: "", selected: true }];
    }

    return [
      { name: "All regions", value: "", selected: !this._regionCode },
      ...this._regions.map((r) => ({
        name: r.name,
        value: r.regionCode,
        selected: r.regionCode === this._regionCode,
      })),
    ];
  }

  // Render methods
  private _renderForm(): unknown {
    const currencySymbol = getCurrencySymbol();

    return html`
      <uui-box headline="Origin">
        <umb-property-layout label="Warehouse" description="The warehouse to ship from" ?mandatory=${true}>
          <uui-select
            slot="editor"
            label="Warehouse"
            .options=${this._getWarehouseOptions()}
            @change=${(e: Event) => (this._warehouseId = (e.target as HTMLSelectElement).value)}
          ></uui-select>
        </umb-property-layout>
      </uui-box>

      <uui-box headline="Destination">
        <umb-property-layout label="Country" description="Destination country" ?mandatory=${true}>
          <uui-select
            slot="editor"
            label="Country"
            .options=${this._getCountryOptions()}
            @change=${this._handleCountryChange}
          ></uui-select>
        </umb-property-layout>

        <umb-property-layout label="State/Province" description="Narrow down to a specific region">
          <uui-select
            slot="editor"
            label="State/Province"
            .options=${this._getRegionOptions()}
            ?disabled=${!this._countryCode || this._isLoadingRegions}
            @change=${(e: Event) =>
              (this._regionCode = (e.target as HTMLSelectElement).value)}
          ></uui-select>
        </umb-property-layout>

        <umb-property-layout label="Postal Code" description="Required for accurate rate quotes from most carriers">
          <uui-input
            slot="editor"
            label="Postal Code"
            type="text"
            .value=${this._postalCode}
            placeholder="e.g., SW1A 1AA"
            @input=${(e: Event) => (this._postalCode = (e.target as HTMLInputElement).value)}
          ></uui-input>
        </umb-property-layout>

        <umb-property-layout label="City">
          <uui-input
            slot="editor"
            label="City"
            type="text"
            .value=${this._city}
            placeholder="e.g., London"
            @input=${(e: Event) => (this._city = (e.target as HTMLInputElement).value)}
          ></uui-input>
        </umb-property-layout>
      </uui-box>

      <uui-box headline="Package">
        <umb-property-layout label="Weight (kg)" description="Package weight" ?mandatory=${true}>
          <uui-input
            slot="editor"
            label="Weight"
            type="number"
            min="0.01"
            step="0.1"
            .value=${String(this._weightKg)}
            @input=${(e: Event) =>
              (this._weightKg = parseFloat((e.target as HTMLInputElement).value) || 1)}
          ></uui-input>
        </umb-property-layout>

        <umb-property-layout label="Dimensions (cm)" description="Length x Width x Height (optional)">
          <div slot="editor" class="dimensions-group">
            <uui-input
              label="Length"
              type="number"
              min="0"
              step="1"
              .value=${this._lengthCm}
              placeholder="L"
              @input=${(e: Event) => (this._lengthCm = (e.target as HTMLInputElement).value)}
            ></uui-input>
            <uui-input
              label="Width"
              type="number"
              min="0"
              step="1"
              .value=${this._widthCm}
              placeholder="W"
              @input=${(e: Event) => (this._widthCm = (e.target as HTMLInputElement).value)}
            ></uui-input>
            <uui-input
              label="Height"
              type="number"
              min="0"
              step="1"
              .value=${this._heightCm}
              placeholder="H"
              @input=${(e: Event) => (this._heightCm = (e.target as HTMLInputElement).value)}
            ></uui-input>
          </div>
        </umb-property-layout>

        <umb-property-layout label="Item Value (${currencySymbol})" description="Used for value-based shipping calculations (e.g., free shipping thresholds)">
          <uui-input
            slot="editor"
            label="Item Value"
            type="number"
            min="0"
            step="0.01"
            .value=${String(this._itemsSubtotal)}
            @input=${(e: Event) =>
              (this._itemsSubtotal = parseFloat((e.target as HTMLInputElement).value) || 0)}
          ></uui-input>
        </umb-property-layout>
      </uui-box>
    `;
  }

  private _renderResults(): unknown {
    if (!this._testResult) return nothing;

    const { isSuccessful: success, serviceLevels, errors } = this._testResult;
    const currencySymbol = getCurrencySymbol();

    // Separate configured vs other available service types
    const configuredLevels = serviceLevels.filter((sl) => sl.isConfigured);
    const otherLevels = serviceLevels.filter((sl) => !sl.isConfigured);
    const hasConfigured = configuredLevels.length > 0;

    return html`
      <uui-box headline="Results">
        ${errors.length > 0
          ? html`
              <div class="result-errors">
                <uui-icon name="icon-alert"></uui-icon>
                <ul>
                  ${errors.map((err) => html`<li>${err}</li>`)}
                </ul>
              </div>
            `
          : nothing}

        ${hasConfigured
          ? html`
              <div class="results-group">
                <h4>Configured Service Types</h4>
                <div class="service-levels">
                  ${configuredLevels.map((level) => this._renderServiceLevelCard(level, currencySymbol, true))}
                </div>
              </div>
            `
          : nothing}

        ${otherLevels.length > 0
          ? html`
              <div class="results-group">
                <h4>${hasConfigured ? "Other Available Services" : "Available Service Types"}</h4>
                <div class="service-levels">
                  ${otherLevels.map((level) => this._renderServiceLevelCard(level, currencySymbol, false))}
                </div>
              </div>
            `
          : nothing}

        ${serviceLevels.length === 0 && success
          ? html`<p class="no-results">No service levels returned for this destination.</p>`
          : nothing}
      </uui-box>
    `;
  }

  private _renderServiceLevelCard(
    level: import("@shipping/types/shipping.types.js").TestShippingServiceLevelDto,
    currencySymbol: string,
    showValidation: boolean
  ): unknown {
    const isValid = level.isValid !== false;

    return html`
      <div class="service-level-card ${!isValid ? "invalid" : ""}">
        <div class="service-header">
          <span class="service-name">
            ${showValidation
              ? isValid
                ? html`<uui-icon name="icon-check" class="valid-icon"></uui-icon>`
                : html`<uui-icon name="icon-wrong" class="invalid-icon"></uui-icon>`
              : nothing}
            ${level.serviceType || level.serviceName}
          </span>
          ${isValid
            ? html`<span class="service-cost">${currencySymbol}${formatNumber(level.totalCost, 2)}</span>`
            : html`<span class="service-invalid">Invalid / Not Available</span>`}
        </div>
        ${isValid
          ? html`
              <div class="service-details">
                <span class="service-code">${level.serviceCode}</span>
                ${level.transitTime
                  ? html`<span class="transit-time">Transit: ${level.transitTime}</span>`
                  : nothing}
                ${level.estimatedDeliveryDate
                  ? html`<span class="delivery-date">Est. delivery: ${new Date(level.estimatedDeliveryDate).toLocaleDateString()}</span>`
                  : nothing}
              </div>
              ${level.description
                ? html`<p class="service-description">${level.description}</p>`
                : nothing}
            `
          : nothing}
      </div>
    `;
  }

  override render() {
    const providerName = this.data?.configuration.displayName ?? "Provider";

    if (this._isLoadingData) {
      return html`
        <umb-body-layout headline="Test ${providerName}">
          <div id="main">
            <div class="loading">
              <uui-loader></uui-loader>
              <span>Loading...</span>
            </div>
          </div>
        </umb-body-layout>
      `;
    }

    return html`
      <umb-body-layout headline="Test ${providerName}">
        <div id="main">
          ${this._errorMessage
            ? html`
                <div class="error-banner">
                  <uui-icon name="icon-alert"></uui-icon>
                  <span>${this._errorMessage}</span>
                  <uui-button
                    look="secondary"
                    compact
                    label="Dismiss error"
                    @click=${() => (this._errorMessage = null)}
                  >
                    Dismiss
                  </uui-button>
                </div>
              `
            : nothing}

          ${this._renderForm()}
          ${this._renderResults()}
        </div>

        <div slot="actions">
          <uui-button label="Close" look="secondary" @click=${this._handleClose}>
            Close
          </uui-button>
          <uui-button
            label="Test Provider"
            look="primary"
            color="positive"
            ?disabled=${this._isTesting || !this._warehouseId || !this._countryCode}
            @click=${this._handleTest}
          >
            ${this._isTesting ? html`<uui-loader-circle></uui-loader-circle>` : nothing}
            ${this._isTesting ? "Testing..." : "Test Provider"}
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

    .loading {
      display: flex;
      flex-direction: column;
      align-items: center;
      padding: var(--uui-size-layout-2);
      gap: var(--uui-size-space-4);
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

    .error-banner span {
      flex: 1;
    }

    uui-box {
      --uui-box-default-padding: var(--uui-size-space-5);
    }

    umb-property-layout uui-select,
    umb-property-layout uui-input {
      width: 100%;
    }

    .dimensions-group {
      display: grid;
      grid-template-columns: 1fr 1fr 1fr;
      gap: var(--uui-size-space-3);
    }

    .dimensions-group uui-input {
      width: 100%;
    }

    .result-errors {
      display: flex;
      gap: var(--uui-size-space-2);
      padding: var(--uui-size-space-3);
      background: var(--uui-color-warning-standalone);
      color: var(--uui-color-warning-contrast);
      border-radius: var(--uui-border-radius);
      margin-bottom: var(--uui-size-space-3);
    }

    .result-errors ul {
      margin: 0;
      padding-left: var(--uui-size-space-4);
    }

    .service-levels {
      display: flex;
      flex-direction: column;
      gap: var(--uui-size-space-3);
    }

    .service-level-card {
      padding: var(--uui-size-space-3);
      background: var(--uui-color-surface);
      border: 1px solid var(--uui-color-border);
      border-radius: var(--uui-border-radius);
    }

    .service-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    .service-cost {
      font-weight: 700;
      font-size: 1.125rem;
      color: var(--uui-color-positive);
    }

    .service-invalid {
      font-weight: 600;
      font-size: 0.875rem;
      color: var(--uui-color-danger);
    }

    .results-group {
      margin-bottom: var(--uui-size-space-4);
    }

    .results-group h4 {
      margin: 0 0 var(--uui-size-space-2) 0;
      font-size: 0.8125rem;
      font-weight: 600;
      color: var(--uui-color-text-alt);
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }

    .service-name {
      display: flex;
      align-items: center;
      gap: var(--uui-size-space-2);
      font-weight: 600;
    }

    .valid-icon {
      color: var(--uui-color-positive);
    }

    .invalid-icon {
      color: var(--uui-color-danger);
    }

    .service-level-card.invalid {
      border-color: var(--uui-color-danger);
      background: color-mix(in srgb, var(--uui-color-danger) 5%, var(--uui-color-surface));
    }

    .service-details {
      display: flex;
      gap: var(--uui-size-space-3);
      margin-top: var(--uui-size-space-2);
      font-size: 0.75rem;
      color: var(--uui-color-text-alt);
    }

    .service-description {
      margin: var(--uui-size-space-2) 0 0;
      font-size: 0.8125rem;
      color: var(--uui-color-text-alt);
    }

    .no-results {
      color: var(--uui-color-text-alt);
      font-style: italic;
    }

    [slot="actions"] {
      display: flex;
      gap: var(--uui-size-space-2);
      justify-content: flex-end;
    }
  `;
}

export default MerchelloTestProviderModalElement;

declare global {
  interface HTMLElementTagNameMap {
    "merchello-test-provider-modal": MerchelloTestProviderModalElement;
  }
}
