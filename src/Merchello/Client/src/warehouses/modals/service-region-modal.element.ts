import { html, css, nothing } from "@umbraco-cms/backoffice/external/lit";
import { customElement, state } from "@umbraco-cms/backoffice/external/lit";
import { UmbModalBaseElement } from "@umbraco-cms/backoffice/modal";
import type { ServiceRegionModalData, ServiceRegionModalValue } from "@warehouses/modals/service-region-modal.token.js";
import type { CountryInfo, SubdivisionInfo } from "@warehouses/types/warehouses.types.js";
import { MerchelloApi } from "@api/merchello-api.js";
import { badgeStyles } from "@shared/styles/badge.styles.js";
import type { SelectOption } from "@shared/types/index.js";
import { modalLayoutStyles } from "@shared/styles/modal-layout.styles.js";

@customElement("merchello-service-region-modal")
export class MerchelloServiceRegionModalElement extends UmbModalBaseElement<
  ServiceRegionModalData,
  ServiceRegionModalValue
> {
  @state() private _countryCode: string = "";
  @state() private _regionCode: string = "";
  @state() private _isExcluded: boolean = false;
  @state() private _countries: CountryInfo[] = [];
  @state() private _regions: SubdivisionInfo[] = [];
  @state() private _isLoadingRegions: boolean = false;
  @state() private _isSaving: boolean = false;
  @state() private _errors: Record<string, string> = {};

  override connectedCallback(): void {
    super.connectedCallback();
    this._loadCountries();

    // Load existing data if editing
    if (this.data?.region) {
      this._countryCode = this.data.region.countryCode;
      this._regionCode = this.data.region.regionCode || "";
      this._isExcluded = this.data.region.isExcluded;
      if (this._countryCode) {
        this._loadRegions(this._countryCode);
      }
    }
  }

  private async _loadCountries(): Promise<void> {
    const { data } = await MerchelloApi.getLocalityCountries();
    if (data) {
      this._countries = data;
    }
  }

  private async _loadRegions(countryCode: string): Promise<void> {
    this._isLoadingRegions = true;
    this._regions = [];

    const { data } = await MerchelloApi.getLocalityRegions(countryCode);
    if (data) {
      this._regions = data;
    }

    this._isLoadingRegions = false;
  }

  // uui-select options
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
    const options: SelectOption[] = [
      { name: "All regions (entire country)", value: "", selected: !this._regionCode },
    ];

    if (this._isLoadingRegions) {
      return [{ name: "Loading...", value: "", selected: true }];
    }

    return [
      ...options,
      ...this._regions.map((r) => ({
        name: r.name,
        value: r.regionCode,
        selected: r.regionCode === this._regionCode,
      })),
    ];
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

  private _handleStateChange(e: Event): void {
    this._regionCode = (e.target as HTMLSelectElement).value;
  }

  private _validate(): boolean {
    const errors: Record<string, string> = {};

    if (!this._countryCode) {
      errors.country = "Please select a country";
    }

    // Check for duplicate region
    const existingRegions = this.data?.existingRegions ?? [];
    const isDuplicate = existingRegions.some(
      (r) =>
        r.countryCode === this._countryCode &&
        (r.regionCode || "") === (this._regionCode || "") &&
        r.id !== this.data?.region?.id
    );

    if (isDuplicate) {
      errors.duplicate = "This region already exists for this warehouse";
    }

    this._errors = errors;
    return Object.keys(errors).length === 0;
  }

  private async _handleSave(): Promise<void> {
    if (!this._validate()) return;

    this._isSaving = true;

    const warehouseId = this.data?.warehouseId;
    if (!warehouseId) {
      this._errors = { general: "Warehouse ID is missing" };
      this._isSaving = false;
      return;
    }

    const regionData = {
      countryCode: this._countryCode,
      regionCode: this._regionCode || undefined,
      isExcluded: this._isExcluded,
    };

    let result;
    if (this.data?.region?.id) {
      // Update existing
      result = await MerchelloApi.updateServiceRegion(warehouseId, this.data.region.id, regionData);
    } else {
      // Create new
      result = await MerchelloApi.addServiceRegion(warehouseId, regionData);
    }

    this._isSaving = false;

    if (result.error) {
      this._errors = { general: result.error.message };
      return;
    }

    this.value = {
      isSaved: true,
      region: result.data,
    };
    this.modalContext?.submit();
  }

  private _handleCancel(): void {
    this.modalContext?.reject();
  }

  override render() {
    const isEditing = !!this.data?.region;
    const headline = isEditing ? "Edit Service Region" : "Add Service Region";
    const hasRegions = this._regions.length > 0 || this._isLoadingRegions;

    return html`
      <umb-body-layout headline="${headline}">
        <div id="main">
          <!-- Info section -->
          <div class="info-box">
            <uui-icon name="icon-globe"></uui-icon>
            <div>
              <strong>Service Region</strong>
              <p>Define where this warehouse can ship to. Include regions you service, or exclude specific areas from a broader region.</p>
            </div>
          </div>

          ${this._errors.general
            ? html`
                <div class="error-banner" role="alert">
                  <uui-icon name="icon-alert"></uui-icon>
                  <span>${this._errors.general}</span>
                </div>
              `
            : nothing}
          ${this._errors.duplicate
            ? html`
                <div class="error-banner" role="alert">
                  <uui-icon name="icon-alert"></uui-icon>
                  <span>${this._errors.duplicate}</span>
                </div>
              `
            : nothing}

          <uui-box>
            <umb-property-layout
              label="Country"
              description="Select the country this region applies to"
              ?mandatory=${true}
              ?invalid=${!!this._errors.country}>
              <uui-select
                slot="editor"
                label="Country"
                .options=${this._getCountryOptions()}
                @change=${this._handleCountryChange}>
              </uui-select>
            </umb-property-layout>

            <umb-property-layout
              label="State/Province"
              description=${this._regions.length === 0 && this._countryCode && !this._isLoadingRegions
                ? "No subdivisions available - rule applies to entire country"
                : "Leave as 'All regions' to apply to entire country"}>
              <uui-select
                slot="editor"
                label="State/Province"
                .options=${this._getRegionOptions()}
                ?disabled=${!this._countryCode || (!hasRegions && !this._isLoadingRegions)}
                @change=${this._handleStateChange}>
              </uui-select>
            </umb-property-layout>
          </uui-box>

          <uui-box headline="Shipping Mode">
            <div class="mode-cards">
              <button
                type="button"
                class="mode-card ${!this._isExcluded ? "active" : ""}"
                aria-pressed=${!this._isExcluded}
                @click=${() => (this._isExcluded = false)}>
                <div class="mode-icon include">
                  <uui-icon name="icon-check"></uui-icon>
                </div>
                <div class="mode-content">
                  <strong>Include</strong>
                  <span>Ship to this region</span>
                </div>
              </button>
              <button
                type="button"
                class="mode-card ${this._isExcluded ? "active" : ""}"
                aria-pressed=${this._isExcluded}
                @click=${() => (this._isExcluded = true)}>
                <div class="mode-icon exclude">
                  <uui-icon name="icon-block"></uui-icon>
                </div>
                <div class="mode-content">
                  <strong>Exclude</strong>
                  <span>Don't ship here</span>
                </div>
              </button>
            </div>
            ${this._isExcluded
              ? html`
                  <div class="mode-hint warning">
                    <uui-icon name="icon-alert"></uui-icon>
                    <span>Orders to this region won't be fulfilled from this warehouse</span>
                  </div>
                `
              : html`
                  <div class="mode-hint success">
                    <uui-icon name="icon-check"></uui-icon>
                    <span>Orders to this region can be fulfilled from this warehouse</span>
                  </div>
                `}
          </uui-box>
        </div>

        <uui-button slot="actions" label="Cancel" look="secondary" @click=${this._handleCancel}>
          Cancel
        </uui-button>
        <uui-button
          slot="actions"
          label="${isEditing ? "Save" : "Add Region"}"
          look="primary"
          color="positive"
          ?disabled=${this._isSaving}
          @click=${this._handleSave}>
          ${this._isSaving ? "Saving..." : isEditing ? "Save" : "Add Region"}
        </uui-button>
      </umb-body-layout>
    `;
  }

  static override readonly styles = [
    modalLayoutStyles,
    badgeStyles,
    css`
      :host {
        display: block;
      }

      #main {
        display: flex;
        flex-direction: column;
        gap: var(--uui-size-space-5);
      }

      /* Info box */
      .info-box {
        display: flex;
        gap: var(--uui-size-space-3);
        padding: var(--uui-size-space-4);
        background: linear-gradient(135deg, var(--uui-color-surface-alt) 0%, var(--uui-color-surface) 100%);
        border: 1px solid var(--uui-color-border);
        border-left: 4px solid var(--uui-color-interactive);
        border-radius: var(--uui-border-radius);
      }

      .info-box > uui-icon {
        flex-shrink: 0;
        font-size: 1.25rem;
        color: var(--uui-color-interactive);
      }

      .info-box strong {
        display: block;
        margin-bottom: var(--uui-size-space-1);
        font-size: 0.875rem;
      }

      .info-box p {
        margin: 0;
        font-size: 0.8125rem;
        color: var(--uui-color-text-alt);
        line-height: 1.5;
      }

      /* Property layout in uui-box */
      uui-box umb-property-layout {
        --umb-property-layout-label-width: 140px;
      }

      uui-box umb-property-layout:first-child {
        padding-top: 0;
      }

      uui-box umb-property-layout:last-child {
        padding-bottom: 0;
      }

      uui-box umb-property-layout uui-select {
        width: 100%;
      }

      .mode-cards {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: var(--uui-size-space-3);
      }

      .mode-card {
        display: flex;
        gap: var(--uui-size-space-3);
        width: 100%;
        padding: var(--uui-size-space-4);
        background: var(--uui-color-surface);
        border: 2px solid var(--uui-color-border);
        border-radius: var(--uui-border-radius);
        cursor: pointer;
        transition: all 0.15s ease;
        text-align: left;
        font: inherit;
        color: inherit;
      }

      .mode-card:hover {
        border-color: var(--uui-color-border-emphasis);
      }

      .mode-card:focus-visible {
        outline: 2px solid var(--uui-color-interactive);
        outline-offset: 2px;
      }

      .mode-card.active {
        border-color: var(--uui-color-interactive);
        background: var(--uui-color-surface-emphasis);
      }

      .mode-icon {
        display: flex;
        align-items: center;
        justify-content: center;
        width: 32px;
        height: 32px;
        border-radius: 50%;
        font-size: 1rem;
      }

      .mode-icon.include {
        background: var(--uui-color-positive-standalone);
        color: var(--uui-color-positive-contrast);
      }

      .mode-icon.exclude {
        background: var(--uui-color-danger-standalone);
        color: var(--uui-color-danger-contrast);
      }

      .mode-content {
        display: flex;
        flex-direction: column;
        gap: 2px;
      }

      .mode-content strong {
        font-size: 0.875rem;
      }

      .mode-content span {
        font-size: 0.75rem;
        color: var(--uui-color-text-alt);
      }

      .mode-hint {
        display: flex;
        align-items: center;
        gap: var(--uui-size-space-2);
        font-size: 0.8125rem;
        padding: var(--uui-size-space-3);
        border-radius: var(--uui-border-radius);
        margin-top: var(--uui-size-space-3);
      }

      .mode-hint.success {
        background: var(--uui-color-positive-standalone);
        color: var(--uui-color-positive-contrast);
      }

      .mode-hint.warning {
        background: var(--uui-color-warning-standalone);
        color: var(--uui-color-warning-contrast);
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

      .field-error {
        color: var(--uui-color-danger);
        font-size: 0.75rem;
      }

    `,
  ];
}

export default MerchelloServiceRegionModalElement;

declare global {
  interface HTMLElementTagNameMap {
    "merchello-service-region-modal": MerchelloServiceRegionModalElement;
  }
}

