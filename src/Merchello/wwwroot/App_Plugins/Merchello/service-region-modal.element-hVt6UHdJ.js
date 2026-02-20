import { nothing as g, html as u, css as h, state as n, customElement as p } from "@umbraco-cms/backoffice/external/lit";
import { UmbModalBaseElement as v } from "@umbraco-cms/backoffice/modal";
import { M as d } from "./merchello-api-B76CV0sD.js";
import { b as m } from "./badge.styles-C7D4rnJo.js";
import { m as b } from "./modal-layout.styles-C2OaUji5.js";
var _ = Object.defineProperty, y = Object.getOwnPropertyDescriptor, r = (e, i, o, s) => {
  for (var a = s > 1 ? void 0 : s ? y(i, o) : i, l = e.length - 1, c; l >= 0; l--)
    (c = e[l]) && (a = (s ? c(i, o, a) : c(a)) || a);
  return s && a && _(i, o, a), a;
};
let t = class extends v {
  constructor() {
    super(...arguments), this._countryCode = "", this._regionCode = "", this._isExcluded = !1, this._countries = [], this._regions = [], this._isLoadingRegions = !1, this._isSaving = !1, this._errors = {};
  }
  connectedCallback() {
    super.connectedCallback(), this._loadCountries(), this.data?.region && (this._countryCode = this.data.region.countryCode, this._regionCode = this.data.region.regionCode || "", this._isExcluded = this.data.region.isExcluded, this._countryCode && this._loadRegions(this._countryCode));
  }
  async _loadCountries() {
    const { data: e } = await d.getLocalityCountries();
    e && (this._countries = e);
  }
  async _loadRegions(e) {
    this._isLoadingRegions = !0, this._regions = [];
    const { data: i } = await d.getLocalityRegions(e);
    i && (this._regions = i), this._isLoadingRegions = !1;
  }
  // uui-select options
  _getCountryOptions() {
    return [
      { name: "Select country...", value: "", selected: !this._countryCode },
      ...this._countries.map((e) => ({
        name: e.name,
        value: e.code,
        selected: e.code === this._countryCode
      }))
    ];
  }
  _getRegionOptions() {
    const e = [
      { name: "All regions (entire country)", value: "", selected: !this._regionCode }
    ];
    return this._isLoadingRegions ? [{ name: "Loading...", value: "", selected: !0 }] : [
      ...e,
      ...this._regions.map((i) => ({
        name: i.name,
        value: i.regionCode,
        selected: i.regionCode === this._regionCode
      }))
    ];
  }
  _handleCountryChange(e) {
    const i = e.target.value;
    this._countryCode = i, this._regionCode = "", i ? this._loadRegions(i) : this._regions = [];
  }
  _handleStateChange(e) {
    this._regionCode = e.target.value;
  }
  _validate() {
    const e = {};
    return this._countryCode || (e.country = "Please select a country"), (this.data?.existingRegions ?? []).some(
      (s) => s.countryCode === this._countryCode && (s.regionCode || "") === (this._regionCode || "") && s.id !== this.data?.region?.id
    ) && (e.duplicate = "This region already exists for this warehouse"), this._errors = e, Object.keys(e).length === 0;
  }
  async _handleSave() {
    if (!this._validate()) return;
    this._isSaving = !0;
    const e = this.data?.warehouseId;
    if (!e) {
      this._errors = { general: "Warehouse ID is missing" }, this._isSaving = !1;
      return;
    }
    const i = {
      countryCode: this._countryCode,
      regionCode: this._regionCode || void 0,
      isExcluded: this._isExcluded
    };
    let o;
    if (this.data?.region?.id ? o = await d.updateServiceRegion(e, this.data.region.id, i) : o = await d.addServiceRegion(e, i), this._isSaving = !1, o.error) {
      this._errors = { general: o.error.message };
      return;
    }
    this.value = {
      isSaved: !0,
      region: o.data
    }, this.modalContext?.submit();
  }
  _handleCancel() {
    this.modalContext?.reject();
  }
  render() {
    const e = !!this.data?.region, i = e ? "Edit Service Region" : "Add Service Region", o = this._regions.length > 0 || this._isLoadingRegions;
    return u`
      <umb-body-layout headline="${i}">
        <div id="main">
          <!-- Info section -->
          <div class="info-box">
            <uui-icon name="icon-globe"></uui-icon>
            <div>
              <strong>Service Region</strong>
              <p>Define where this warehouse can ship to. Include regions you service, or exclude specific areas from a broader region.</p>
            </div>
          </div>

          ${this._errors.general ? u`
                <div class="error-banner" role="alert">
                  <uui-icon name="icon-alert"></uui-icon>
                  <span>${this._errors.general}</span>
                </div>
              ` : g}
          ${this._errors.duplicate ? u`
                <div class="error-banner" role="alert">
                  <uui-icon name="icon-alert"></uui-icon>
                  <span>${this._errors.duplicate}</span>
                </div>
              ` : g}

          <uui-box>
            <umb-property-layout
              label="Country"
              description="Select the country this region applies to"
              ?mandatory=${!0}
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
              description=${this._regions.length === 0 && this._countryCode && !this._isLoadingRegions ? "No subdivisions available - rule applies to entire country" : "Leave as 'All regions' to apply to entire country"}>
              <uui-select
                slot="editor"
                label="State/Province"
                .options=${this._getRegionOptions()}
                ?disabled=${!this._countryCode || !o && !this._isLoadingRegions}
                @change=${this._handleStateChange}>
              </uui-select>
            </umb-property-layout>
          </uui-box>

          <uui-box headline="Shipping Mode">
            <div class="mode-cards">
              <button
                type="button"
                class="mode-card ${this._isExcluded ? "" : "active"}"
                aria-pressed=${!this._isExcluded}
                @click=${() => this._isExcluded = !1}>
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
                @click=${() => this._isExcluded = !0}>
                <div class="mode-icon exclude">
                  <uui-icon name="icon-block"></uui-icon>
                </div>
                <div class="mode-content">
                  <strong>Exclude</strong>
                  <span>Don't ship here</span>
                </div>
              </button>
            </div>
            ${this._isExcluded ? u`
                  <div class="mode-hint warning">
                    <uui-icon name="icon-alert"></uui-icon>
                    <span>Orders to this region won't be fulfilled from this warehouse</span>
                  </div>
                ` : u`
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
          label="${e ? "Save" : "Add Region"}"
          look="primary"
          color="positive"
          ?disabled=${this._isSaving}
          @click=${this._handleSave}>
          ${this._isSaving ? "Saving..." : e ? "Save" : "Add Region"}
        </uui-button>
      </umb-body-layout>
    `;
  }
};
t.styles = [
  b,
  m,
  h`
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

    `
];
r([
  n()
], t.prototype, "_countryCode", 2);
r([
  n()
], t.prototype, "_regionCode", 2);
r([
  n()
], t.prototype, "_isExcluded", 2);
r([
  n()
], t.prototype, "_countries", 2);
r([
  n()
], t.prototype, "_regions", 2);
r([
  n()
], t.prototype, "_isLoadingRegions", 2);
r([
  n()
], t.prototype, "_isSaving", 2);
r([
  n()
], t.prototype, "_errors", 2);
t = r([
  p("merchello-service-region-modal")
], t);
const $ = t;
export {
  t as MerchelloServiceRegionModalElement,
  $ as default
};
//# sourceMappingURL=service-region-modal.element-hVt6UHdJ.js.map
