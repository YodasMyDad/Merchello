import { html as o, nothing as h, css as k, state as n, customElement as C } from "@umbraco-cms/backoffice/external/lit";
import { UmbModalToken as v, UmbModalBaseElement as S, UMB_MODAL_MANAGER_CONTEXT as $, UMB_CONFIRM_MODAL as b } from "@umbraco-cms/backoffice/modal";
import { UMB_NOTIFICATION_CONTEXT as T } from "@umbraco-cms/backoffice/notification";
import { M as p } from "./merchello-api-BuImeZL2.js";
import { a as _ } from "./formatting-DGOWmvpU.js";
const E = new v("Merchello.ShippingCost.Modal", {
  modal: {
    type: "dialog",
    size: "medium"
  }
}), O = new v("Merchello.ShippingWeightTier.Modal", {
  modal: {
    type: "dialog",
    size: "medium"
  }
}), R = new v("Merchello.ShippingDestinationExclusion.Modal", {
  modal: {
    type: "sidebar",
    size: "small"
  }
}), M = new v("Merchello.ShippingPostcodeRule.Modal", {
  modal: {
    type: "dialog",
    size: "medium"
  }
});
var I = Object.defineProperty, A = Object.getOwnPropertyDescriptor, x = (e) => {
  throw TypeError(e);
}, l = (e, t, i, a) => {
  for (var d = a > 1 ? void 0 : a ? A(t, i) : t, g = e.length - 1, m; g >= 0; g--)
    (m = e[g]) && (d = (a ? m(t, i, d) : m(d)) || d);
  return a && d && I(t, i, d), d;
}, w = (e, t, i) => t.has(e) || x("Cannot " + i), s = (e, t, i) => (w(e, t, "read from private field"), t.get(e)), f = (e, t, i) => t.has(e) ? x("Cannot add the same private member more than once") : t instanceof WeakSet ? t.add(e) : t.set(e, i), D = (e, t, i, a) => (w(e, t, "write to private field"), t.set(e, i), i), c, u;
let r = class extends S {
  constructor() {
    super(), this._isLoading = !1, this._isSaving = !1, this._errorMessage = null, this._detail = null, this._warehouses = [], this._excludedRegions = [], this._name = "", this._warehouseId = "", this._fixedCost = null, this._daysFrom = 3, this._daysTo = 5, this._isNextDay = !1, this._nextDayCutOffTime = "", this._allowsDeliveryDateSelection = !1, this._minDeliveryDays = null, this._maxDeliveryDays = null, this._allowedDaysOfWeek = "", this._isDeliveryDateGuaranteed = !1, this._isEnabled = !0, this._activeTab = "overview", f(this, c), f(this, u), this._daysOfWeek = [
      { value: "Mon", label: "M", fullLabel: "Monday" },
      { value: "Tue", label: "T", fullLabel: "Tuesday" },
      { value: "Wed", label: "W", fullLabel: "Wednesday" },
      { value: "Thu", label: "T", fullLabel: "Thursday" },
      { value: "Fri", label: "F", fullLabel: "Friday" },
      { value: "Sat", label: "S", fullLabel: "Saturday" },
      { value: "Sun", label: "S", fullLabel: "Sunday" }
    ], this.consumeContext($, (e) => {
      D(this, c, e);
    }), this.consumeContext(T, (e) => {
      D(this, u, e);
    });
  }
  /** Whether warehouse is pre-selected and should not show dropdown */
  get _hasFixedWarehouse() {
    return !!this.data?.warehouseId;
  }
  connectedCallback() {
    super.connectedCallback(), this.data?.warehouseId && (this._warehouseId = this.data.warehouseId), this.data?.warehouses ? this._warehouses = this.data.warehouses : this._hasFixedWarehouse || this._loadWarehouses(), this.data?.optionId ? this._loadDetailById(this.data.optionId) : this.data?.option && this._loadDetail();
  }
  /** Options for the warehouse dropdown */
  get _warehouseOptions() {
    const e = [
      { name: "Select a warehouse...", value: "", selected: !this._warehouseId }
    ];
    return this._warehouses.forEach((t) => {
      e.push({
        name: t.name,
        value: t.id,
        selected: t.id === this._warehouseId
      });
    }), e;
  }
  async _loadWarehouses() {
    const { data: e } = await p.getWarehouses();
    e && (this._warehouses = e);
  }
  async _loadDetail() {
    this.data?.option && await this._loadDetailById(this.data.option.id);
  }
  async _loadDetailById(e) {
    this._isLoading = !0, this._errorMessage = null;
    try {
      const { data: t, error: i } = await p.getShippingOption(e);
      if (i) {
        this._errorMessage = i.message, this._isLoading = !1;
        return;
      }
      t && (this._detail = t, this._name = t.name ?? "", this._hasFixedWarehouse || (this._warehouseId = t.warehouseId), this._fixedCost = t.fixedCost ?? null, this._daysFrom = t.daysFrom, this._daysTo = t.daysTo, this._isNextDay = t.isNextDay, this._nextDayCutOffTime = t.nextDayCutOffTime ?? "", this._allowsDeliveryDateSelection = t.allowsDeliveryDateSelection, this._minDeliveryDays = t.minDeliveryDays ?? null, this._maxDeliveryDays = t.maxDeliveryDays ?? null, this._allowedDaysOfWeek = t.allowedDaysOfWeek ?? "", this._isDeliveryDateGuaranteed = t.isDeliveryDateGuaranteed, this._isEnabled = t.isEnabled ?? !0, this._excludedRegions = t.excludedRegions ?? []);
    } catch (t) {
      this._errorMessage = t instanceof Error ? t.message : "Failed to load shipping option";
    }
    this._isLoading = !1;
  }
  async _save() {
    if (!this._name || !this._warehouseId) {
      s(this, u)?.peek("warning", {
        data: { headline: "Validation", message: "Name and Warehouse are required" }
      });
      return;
    }
    if (!this._isNextDay) {
      if (this._daysFrom < 1 || this._daysTo < 1) {
        s(this, u)?.peek("warning", {
          data: { headline: "Validation", message: "Minimum and maximum delivery days are required (at least 1)" }
        });
        return;
      }
      if (this._daysTo < this._daysFrom) {
        s(this, u)?.peek("warning", {
          data: { headline: "Validation", message: "Maximum days must be greater than or equal to minimum days" }
        });
        return;
      }
    }
    this._isSaving = !0;
    const e = {
      name: this._name,
      warehouseId: this._warehouseId,
      fixedCost: this._fixedCost ?? void 0,
      daysFrom: this._daysFrom,
      daysTo: this._daysTo,
      isNextDay: this._isNextDay,
      nextDayCutOffTime: this._nextDayCutOffTime || void 0,
      allowsDeliveryDateSelection: this._allowsDeliveryDateSelection,
      minDeliveryDays: this._minDeliveryDays ?? void 0,
      maxDeliveryDays: this._maxDeliveryDays ?? void 0,
      allowedDaysOfWeek: this._allowedDaysOfWeek || void 0,
      isDeliveryDateGuaranteed: this._isDeliveryDateGuaranteed,
      isEnabled: this._isEnabled,
      excludedRegions: this._excludedRegions.map((t) => ({
        countryCode: t.countryCode,
        regionCode: t.regionCode
      }))
    };
    try {
      const t = this.data?.option?.id || this.data?.optionId || this._detail?.id, i = !t, a = t ? await p.updateShippingOption(t, e) : await p.createShippingOption(e);
      if (a.error) {
        s(this, u)?.peek("danger", {
          data: { headline: "Error", message: a.error.message }
        }), this._isSaving = !1;
        return;
      }
      if (i && a.data) {
        this._detail = a.data, this._warehouseId = a.data.warehouseId, this._excludedRegions = a.data.excludedRegions ?? this._excludedRegions, this._activeTab = "pricing", s(this, u)?.peek("positive", {
          data: {
            headline: "Shipping option created",
            message: "Now configure destination rates and weight surcharges, then save."
          }
        }), this.modalContext?.setValue({ isSaved: !0 }), this._isSaving = !1;
        return;
      }
      s(this, u)?.peek("positive", {
        data: {
          headline: "Success",
          message: "Shipping option updated"
        }
      }), this.modalContext?.setValue({ isSaved: !0 }), this.modalContext?.submit();
    } catch (t) {
      s(this, u)?.peek("danger", {
        data: { headline: "Error", message: t instanceof Error ? t.message : "Failed to save" }
      });
    }
    this._isSaving = !1;
  }
  async _openCostModal(e) {
    if (!s(this, c) || !this._detail) return;
    (await s(this, c).open(this, E, {
      data: { cost: e, optionId: this._detail.id, warehouseId: this._detail.warehouseId }
    }).onSubmit().catch(() => {
    }))?.isSaved && await this._loadDetail();
  }
  async _deleteCost(e) {
    const t = e.regionDisplay ?? e.countryCode, i = s(this, c)?.open(this, b, {
      data: {
        headline: "Delete Shipping Cost",
        content: `Are you sure you want to delete the shipping cost for ${t}?`,
        confirmLabel: "Delete",
        color: "danger"
      }
    });
    try {
      await i?.onSubmit();
    } catch {
      return;
    }
    const { error: a } = await p.deleteShippingCost(e.id);
    if (a) {
      s(this, u)?.peek("danger", {
        data: { headline: "Error", message: a.message }
      });
      return;
    }
    s(this, u)?.peek("positive", {
      data: { headline: "Success", message: "Cost deleted" }
    }), await this._loadDetail();
  }
  async _openWeightTierModal(e) {
    if (!s(this, c) || !this._detail) return;
    (await s(this, c).open(this, O, {
      data: { tier: e, optionId: this._detail.id, warehouseId: this._detail.warehouseId }
    }).onSubmit().catch(() => {
    }))?.isSaved && await this._loadDetail();
  }
  async _deleteWeightTier(e) {
    const t = e.weightRangeDisplay ?? `${e.minWeightKg}+ kg`, i = s(this, c)?.open(this, b, {
      data: {
        headline: "Delete Weight Tier",
        content: `Are you sure you want to delete the weight tier "${t}"?`,
        confirmLabel: "Delete",
        color: "danger"
      }
    });
    try {
      await i?.onSubmit();
    } catch {
      return;
    }
    const { error: a } = await p.deleteShippingWeightTier(e.id);
    if (a) {
      s(this, u)?.peek("danger", {
        data: { headline: "Error", message: a.message }
      });
      return;
    }
    s(this, u)?.peek("positive", {
      data: { headline: "Success", message: "Weight tier deleted" }
    }), await this._loadDetail();
  }
  _buildExclusionRegionDisplay(e, t) {
    return t ? `${t}, ${e}` : e;
  }
  async _openExclusionModal(e) {
    if (!s(this, c)) return;
    const i = await s(this, c).open(this, R, {
      data: {
        exclusion: e,
        warehouseId: this._warehouseId || this._detail?.warehouseId
      }
    }).onSubmit().catch(() => {
    });
    if (!i?.isSaved || !i.exclusion)
      return;
    const a = i.exclusion.countryCode.toUpperCase(), d = i.exclusion.regionCode?.toUpperCase();
    if (this._excludedRegions.find((y) => y !== e && y.countryCode.toUpperCase() === a && (y.regionCode ?? "").toUpperCase() === (d ?? ""))) {
      s(this, u)?.peek("warning", {
        data: { headline: "Duplicate", message: "This destination is already excluded." }
      });
      return;
    }
    const m = {
      id: e?.id ?? crypto.randomUUID(),
      countryCode: a,
      regionCode: d,
      regionDisplay: this._buildExclusionRegionDisplay(a, d)
    };
    e ? this._excludedRegions = this._excludedRegions.map((y) => y.id === e.id ? m : y) : this._excludedRegions = [...this._excludedRegions, m];
  }
  async _deleteExclusion(e) {
    const t = e.regionDisplay ?? this._buildExclusionRegionDisplay(e.countryCode, e.regionCode), i = s(this, c)?.open(this, b, {
      data: {
        headline: "Delete Destination Exclusion",
        content: `Remove exclusion for ${t}?`,
        confirmLabel: "Delete",
        color: "danger"
      }
    });
    try {
      await i?.onSubmit();
    } catch {
      return;
    }
    this._excludedRegions = this._excludedRegions.filter((a) => a.id !== e.id);
  }
  async _openPostcodeRuleModal(e) {
    if (!s(this, c) || !this._detail) return;
    (await s(this, c).open(this, M, {
      data: { rule: e, optionId: this._detail.id }
    }).onSubmit().catch(() => {
    }))?.isSaved && await this._loadDetail();
  }
  async _deletePostcodeRule(e) {
    const t = e.pattern || e.id, i = s(this, c)?.open(this, b, {
      data: {
        headline: "Delete Postcode Rule",
        content: `Are you sure you want to delete the postcode rule "${t}"?`,
        confirmLabel: "Delete",
        color: "danger"
      }
    });
    try {
      await i?.onSubmit();
    } catch {
      return;
    }
    const { error: a } = await p.deleteShippingPostcodeRule(e.id);
    if (a) {
      s(this, u)?.peek("danger", {
        data: { headline: "Error", message: a.message }
      });
      return;
    }
    s(this, u)?.peek("positive", {
      data: { headline: "Success", message: "Postcode rule deleted" }
    }), await this._loadDetail();
  }
  _close() {
    this.modalContext?.setValue({ isSaved: this._detail !== null }), this.modalContext?.submit();
  }
  /** Check if a day is selected */
  _isDaySelected(e) {
    return this._allowedDaysOfWeek ? this._allowedDaysOfWeek.split(",").map((t) => t.trim()).includes(e) : !1;
  }
  /** Toggle a day selection */
  _toggleDay(e) {
    const t = this._allowedDaysOfWeek ? this._allowedDaysOfWeek.split(",").map((i) => i.trim()).filter((i) => i) : [];
    if (t.includes(e))
      this._allowedDaysOfWeek = t.filter((i) => i !== e).join(",");
    else {
      const i = this._daysOfWeek.map((d) => d.value), a = [...t, e].sort(
        (d, g) => i.indexOf(d) - i.indexOf(g)
      );
      this._allowedDaysOfWeek = a.join(",");
    }
  }
  /** Render day of week checkboxes */
  _renderDayCheckboxes() {
    return this._daysOfWeek.map(
      (e) => o`
        <button
          type="button"
          class="day-btn ${this._isDaySelected(e.value) ? "selected" : ""}"
          title="${e.fullLabel}"
          @click=${() => this._toggleDay(e.value)}
        >
          ${e.label}
        </button>
      `
    );
  }
  _setActiveTab(e) {
    this._activeTab = e;
  }
  _renderTabs() {
    return o`
      <uui-tab-group class="modal-tabs">
        <uui-tab
          label="Overview"
          ?active=${this._activeTab === "overview"}
          @click=${() => this._setActiveTab("overview")}
        >
          Overview
        </uui-tab>
        <uui-tab
          label="Delivery"
          ?active=${this._activeTab === "delivery"}
          @click=${() => this._setActiveTab("delivery")}
        >
          Delivery
        </uui-tab>
        <uui-tab
          label="Destinations"
          ?active=${this._activeTab === "destinations"}
          @click=${() => this._setActiveTab("destinations")}
        >
          Destinations
        </uui-tab>
        <uui-tab
          label="Pricing"
          ?active=${this._activeTab === "pricing"}
          @click=${() => this._setActiveTab("pricing")}
        >
          Pricing
        </uui-tab>
      </uui-tab-group>
    `;
  }
  _renderOverviewTab() {
    return o`
      <uui-box headline="Basic Settings">
        <div class="form-grid">
          <uui-form-layout-item class="full-width">
            <uui-label slot="label" for="name" required>Name</uui-label>
            <uui-input
              id="name"
              .value=${this._name}
              @input=${(e) => this._name = e.target.value}
              placeholder="e.g., Standard Shipping, Express Delivery"
            ></uui-input>
            <span slot="description">Display name shown to customers at checkout</span>
          </uui-form-layout-item>

          ${this._hasFixedWarehouse ? h : o`
                <uui-form-layout-item class="full-width">
                  <uui-label slot="label" for="warehouse" required>Warehouse</uui-label>
                  <uui-select
                    id="warehouse"
                    .options=${this._warehouseOptions}
                    @change=${(e) => this._warehouseId = e.target.value}
                  ></uui-select>
                </uui-form-layout-item>
              `}

          <uui-form-layout-item>
            <uui-label slot="label" for="fixedCost">Fixed Cost</uui-label>
            <uui-input
              id="fixedCost"
              type="number"
              step="0.01"
              min="0"
              .value=${this._fixedCost?.toString() ?? ""}
              @input=${(e) => {
      const t = e.target.value;
      this._fixedCost = t ? parseFloat(t) : null;
    }}
              placeholder="0.00"
            ></uui-input>
            <span slot="description">Single price for all destinations, or leave empty to use destination rates</span>
          </uui-form-layout-item>

          <div class="toggle-with-description">
            <uui-toggle
              .checked=${this._isEnabled}
              @change=${(e) => this._isEnabled = e.target.checked}
              label="Available at checkout"
            ></uui-toggle>
            <span class="toggle-description">When disabled, customers won't see this option</span>
          </div>
        </div>
      </uui-box>
    `;
  }
  _renderDeliveryTab() {
    return o`
      <uui-box headline="Delivery Time">
        <p class="section-hint">Estimated delivery window shown to customers (e.g., "5-10 business days").</p>
        <div class="form-grid">
          <uui-form-layout-item>
            <uui-label slot="label" for="daysFrom" required>Minimum Days</uui-label>
            <uui-input
              id="daysFrom"
              type="number"
              min="1"
              required
              .value=${this._daysFrom.toString()}
              @input=${(e) => this._daysFrom = parseInt(e.target.value) || 1}
            ></uui-input>
          </uui-form-layout-item>

          <uui-form-layout-item>
            <uui-label slot="label" for="daysTo" required>Maximum Days</uui-label>
            <uui-input
              id="daysTo"
              type="number"
              min="1"
              required
              .value=${this._daysTo.toString()}
              @input=${(e) => this._daysTo = parseInt(e.target.value) || 1}
            ></uui-input>
          </uui-form-layout-item>

          <uui-form-layout-item class="toggle-item">
            <uui-toggle
              .checked=${this._isNextDay}
              @change=${(e) => this._isNextDay = e.target.checked}
              label="Next Day Delivery"
            ></uui-toggle>
          </uui-form-layout-item>

          ${this._isNextDay ? o`
                <uui-form-layout-item>
                  <uui-label slot="label" for="cutoff">Order Cut-off Time</uui-label>
                  <uui-input
                    id="cutoff"
                    type="time"
                    .value=${this._nextDayCutOffTime}
                    @input=${(e) => this._nextDayCutOffTime = e.target.value}
                  ></uui-input>
                  <span slot="description">Orders placed after this time ship next business day</span>
                </uui-form-layout-item>
              ` : h}
        </div>
      </uui-box>

      <uui-box headline="Delivery Date Selection" class="optional-section">
        <p class="section-hint">
          Let customers choose a specific delivery date during checkout. Useful for gift deliveries or scheduled appointments.
        </p>
        <uui-form-layout-item class="toggle-item">
          <uui-toggle
            .checked=${this._allowsDeliveryDateSelection}
            @change=${(e) => this._allowsDeliveryDateSelection = e.target.checked}
            label="Allow customers to select delivery date"
          ></uui-toggle>
        </uui-form-layout-item>

        ${this._allowsDeliveryDateSelection ? o`
              <div class="date-options">
                <div class="form-grid">
                  <uui-form-layout-item>
                    <uui-label slot="label" for="minDays">Earliest Booking</uui-label>
                    <uui-input
                      id="minDays"
                      type="number"
                      min="0"
                      .value=${this._minDeliveryDays?.toString() ?? ""}
                      @input=${(e) => {
      const t = e.target.value;
      this._minDeliveryDays = t ? parseInt(t) : null;
    }}
                      placeholder="1"
                    ></uui-input>
                    <span slot="description">Minimum days from today customers can select</span>
                  </uui-form-layout-item>

                  <uui-form-layout-item>
                    <uui-label slot="label" for="maxDays">Latest Booking</uui-label>
                    <uui-input
                      id="maxDays"
                      type="number"
                      min="0"
                      .value=${this._maxDeliveryDays?.toString() ?? ""}
                      @input=${(e) => {
      const t = e.target.value;
      this._maxDeliveryDays = t ? parseInt(t) : null;
    }}
                      placeholder="30"
                    ></uui-input>
                    <span slot="description">Maximum days into the future</span>
                  </uui-form-layout-item>
                </div>

                <div class="day-picker-section">
                  <label class="day-picker-label">Available Days</label>
                  <div class="day-picker">${this._renderDayCheckboxes()}</div>
                  <span class="day-picker-hint">Select which days deliveries are available. Leave all unchecked for any day.</span>
                </div>

                <div class="toggle-with-description">
                  <uui-toggle
                    .checked=${this._isDeliveryDateGuaranteed}
                    @change=${(e) => this._isDeliveryDateGuaranteed = e.target.checked}
                    label="Guarantee delivery date"
                  ></uui-toggle>
                  <span class="toggle-description">Promise delivery on the selected date (not just estimated)</span>
                </div>
              </div>
            ` : h}
      </uui-box>
    `;
  }
  _renderPricingRequiresSave() {
    return o`
      <uui-box headline="Shipping Rates">
        <p class="section-hint">
          Destination-specific rates are available after the shipping option has been created.
        </p>
        <div class="table-header">
          <uui-button look="outline" label="Add Rate" disabled>
            + Add Rate
          </uui-button>
        </div>
        <p class="no-items">Create this shipping option first, then reopen it to configure destination rates.</p>
      </uui-box>

      <uui-box headline="Weight Surcharges">
        <p class="section-hint">
          Destination-specific weight surcharges are available after the shipping option has been created.
        </p>
        <div class="table-header">
          <uui-button look="outline" label="Add Surcharge" disabled>
            + Add Surcharge
          </uui-button>
        </div>
        <p class="no-items">Create this shipping option first, then reopen it to configure weight surcharges.</p>
      </uui-box>

      <uui-box headline="Postcode Rules">
        <p class="section-hint">
          Postcode rules are available after the shipping option has been created.
        </p>
        <div class="table-header">
          <uui-button look="outline" label="Add Rule" disabled>
            + Add Rule
          </uui-button>
        </div>
        <p class="no-items">Create this shipping option first, then reopen it to configure postcode rules.</p>
      </uui-box>
    `;
  }
  _renderActiveTabContent() {
    switch (this._activeTab) {
      case "overview":
        return this._renderOverviewTab();
      case "delivery":
        return this._renderDeliveryTab();
      case "destinations":
        return this._renderExcludedRegionsTable();
      case "pricing":
        return this._detail ? o`
              ${this._renderCostsTable()}
              ${this._renderWeightTiersTable()}
              ${this._renderPostcodeRulesTable()}
            ` : this._renderPricingRequiresSave();
      default:
        return this._renderOverviewTab();
    }
  }
  _renderCostsTable() {
    return this._detail ? o`
      <uui-box headline="Shipping Rates">
        <p class="section-hint">
          Set different shipping rates for specific destinations. Use a wildcard (*) rate as the default for any destination not specifically listed.
        </p>
        <div class="table-header">
          <uui-button look="outline" label="Add Rate" @click=${() => this._openCostModal()}>
            + Add Rate
          </uui-button>
        </div>
        ${this._detail.costs.length === 0 ? o`<p class="no-items">No destination rates configured. Add rates or use the Fixed Cost above.</p>` : o`
              <table class="data-table">
                <thead>
                  <tr>
                    <th>Destination</th>
                    <th>Rate</th>
                    <th class="actions-col">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  ${this._detail.costs.map(
      (e) => o`
                      <tr>
                        <td>${this._formatRegionDisplay(e.countryCode, e.regionDisplay)}</td>
                        <td class="cost-cell">${_(e.cost)}</td>
                        <td class="actions-col">
                          <uui-button compact look="secondary" label="Edit" @click=${() => this._openCostModal(e)}>
                            <uui-icon name="icon-edit"></uui-icon>
                          </uui-button>
                          <uui-button compact look="secondary" color="danger" label="Delete" @click=${() => this._deleteCost(e)}>
                            <uui-icon name="icon-trash"></uui-icon>
                          </uui-button>
                        </td>
                      </tr>
                    `
    )}
                </tbody>
              </table>
            `}
      </uui-box>
    ` : h;
  }
  _formatRegionDisplay(e, t) {
    return e === "*" ? "All Destinations (Default)" : t ?? e;
  }
  _renderWeightTiersTable() {
    return this._detail ? o`
      <uui-box headline="Weight Surcharges">
        <p class="section-hint">
          Add extra charges based on order weight. Surcharges are added on top of the shipping rate.
        </p>
        <div class="table-header">
          <uui-button look="outline" label="Add Surcharge" @click=${() => this._openWeightTierModal()}>
            + Add Surcharge
          </uui-button>
        </div>
        ${this._detail.weightTiers.length === 0 ? o`<p class="no-items">No weight surcharges configured.</p>` : o`
              <table class="data-table">
                <thead>
                  <tr>
                    <th>Destination</th>
                    <th>Weight Range</th>
                    <th>Surcharge</th>
                    <th class="actions-col">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  ${this._detail.weightTiers.map(
      (e) => o`
                      <tr>
                        <td>${this._formatRegionDisplay(e.countryCode, e.regionDisplay)}</td>
                        <td>${e.weightRangeDisplay ?? `${e.minWeightKg}+ kg`}</td>
                        <td class="cost-cell">+${_(e.surcharge)}</td>
                        <td class="actions-col">
                          <uui-button compact look="secondary" label="Edit" @click=${() => this._openWeightTierModal(e)}>
                            <uui-icon name="icon-edit"></uui-icon>
                          </uui-button>
                          <uui-button compact look="secondary" color="danger" label="Delete" @click=${() => this._deleteWeightTier(e)}>
                            <uui-icon name="icon-trash"></uui-icon>
                          </uui-button>
                        </td>
                      </tr>
                    `
    )}
                </tbody>
              </table>
            `}
      </uui-box>
    ` : h;
  }
  _renderExcludedRegionsTable() {
    return o`
      <uui-box headline="Destination Exclusions">
        <p class="section-hint">
          Excluded destinations will not see this shipping option during estimate or checkout.
        </p>
        <div class="table-header">
          <uui-button look="outline" color="danger" label="Add Exclusion" @click=${() => this._openExclusionModal()}>
            + Add Exclusion
          </uui-button>
        </div>
        ${this._excludedRegions.length === 0 ? o`<p class="no-items">No destinations excluded.</p>` : o`
              <table class="data-table">
                <thead>
                  <tr>
                    <th>Destination</th>
                    <th class="actions-col">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  ${this._excludedRegions.slice().sort((e, t) => {
      const i = `${e.countryCode}:${e.regionCode ?? ""}`, a = `${t.countryCode}:${t.regionCode ?? ""}`;
      return i.localeCompare(a);
    }).map((e) => o`
                      <tr>
                        <td>${e.regionDisplay ?? this._buildExclusionRegionDisplay(e.countryCode, e.regionCode)}</td>
                        <td class="actions-col">
                          <uui-button compact look="secondary" label="Edit" @click=${() => this._openExclusionModal(e)}>
                            <uui-icon name="icon-edit"></uui-icon>
                          </uui-button>
                          <uui-button compact look="secondary" color="danger" label="Delete" @click=${() => this._deleteExclusion(e)}>
                            <uui-icon name="icon-trash"></uui-icon>
                          </uui-button>
                        </td>
                      </tr>
                    `)}
                </tbody>
              </table>
            `}
      </uui-box>
    `;
  }
  _renderPostcodeRulesTable() {
    return this._detail ? o`
      <uui-box headline="Postcode Rules">
        <p class="section-hint">
          Block delivery or add surcharges for specific postcodes. Rules match by prefix (IM, HS),
          UK outcode range (IV21-IV28), numeric range (20010-21000), or exact match.
          The most specific rule wins when multiple patterns match.
        </p>
        <div class="table-header">
          <uui-button look="outline" label="Add Rule" @click=${() => this._openPostcodeRuleModal()}>
            + Add Rule
          </uui-button>
        </div>
        ${(this._detail.postcodeRules?.length ?? 0) === 0 ? o`<p class="no-items">No postcode rules configured.</p>` : o`
              <table class="data-table">
                <thead>
                  <tr>
                    <th>Country</th>
                    <th>Pattern</th>
                    <th>Match Type</th>
                    <th>Action</th>
                    <th class="actions-col">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  ${this._detail.postcodeRules?.map(
      (e) => o`
                      <tr>
                        <td>${e.countryDisplay ?? e.countryCode}</td>
                        <td><code class="postcode-pattern">${e.pattern}</code></td>
                        <td>${e.matchTypeDisplay ?? e.matchType}</td>
                        <td>
                          ${e.action === "Block" ? o`<span class="rule-action rule-action-block">Block</span>` : o`<span class="rule-action rule-action-surcharge">+${_(e.surcharge ?? 0)}</span>`}
                        </td>
                        <td class="actions-col">
                          <uui-button compact look="secondary" label="Edit" @click=${() => this._openPostcodeRuleModal(e)}>
                            <uui-icon name="icon-edit"></uui-icon>
                          </uui-button>
                          <uui-button compact look="secondary" color="danger" label="Delete" @click=${() => this._deletePostcodeRule(e)}>
                            <uui-icon name="icon-trash"></uui-icon>
                          </uui-button>
                        </td>
                      </tr>
                    `
    )}
                </tbody>
              </table>
            `}
      </uui-box>
    ` : h;
  }
  render() {
    const e = !!(this.data?.option || this.data?.optionId || this._detail?.id);
    return this._isLoading ? o`
        <umb-body-layout headline="${e ? "Edit" : "Add"} Shipping Option">
          <div class="loading">
            <uui-loader></uui-loader>
            <span>Loading...</span>
          </div>
        </umb-body-layout>
      ` : o`
      <umb-body-layout headline="${e ? "Edit" : "Add"} Shipping Option">
        <div class="form-content">
          ${this._errorMessage ? o`
                <uui-box>
                  <div class="error">${this._errorMessage}</div>
                </uui-box>
              ` : h}

          <div class="intro-banner">
            <div class="intro-icon">
              <uui-icon name="icon-truck"></uui-icon>
            </div>
            <div class="intro-content">
              <strong>Shipping Option</strong>
              <p>
                Configure delivery method behavior in focused sections: basic setup, delivery timing, destination exclusions, and pricing rules.
              </p>
            </div>
          </div>

          ${this._renderTabs()}
          <div class="tab-content">${this._renderActiveTabContent()}</div>
        </div>

        <div slot="actions">
          <uui-button label="Cancel" @click=${this._close}>Cancel</uui-button>
          <uui-button
            look="primary"
            label="${e ? "Save" : "Create"}"
            ?disabled=${this._isSaving}
            @click=${this._save}
          >
            ${this._isSaving ? o`<uui-loader-circle></uui-loader-circle>` : h}
            ${e ? "Save" : "Create"}
          </uui-button>
        </div>
      </umb-body-layout>
    `;
  }
};
c = /* @__PURE__ */ new WeakMap();
u = /* @__PURE__ */ new WeakMap();
r.styles = k`
    :host {
      display: block;
    }

    .form-content {
      display: flex;
      flex-direction: column;
      gap: var(--uui-size-space-5);
    }

    .modal-tabs {
      width: 100%;
      --uui-tab-divider: var(--uui-color-border);
    }

    .tab-content {
      display: flex;
      flex-direction: column;
      gap: var(--uui-size-space-5);
    }

    .loading {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: var(--uui-size-layout-2);
      gap: var(--uui-size-space-4);
    }

    .error {
      color: var(--uui-color-danger);
      padding: var(--uui-size-space-4);
    }

    .form-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: var(--uui-size-space-4);
    }

    .form-grid .full-width {
      grid-column: 1 / -1;
    }

    .toggle-item {
      display: flex;
      align-items: center;
    }

    /* Toggle with description below */
    .toggle-with-description {
      display: flex;
      flex-direction: column;
      gap: var(--uui-size-space-1);
      padding: var(--uui-size-space-2) 0;
    }

    .toggle-description {
      font-size: 0.8125rem;
      color: var(--uui-color-text-alt);
      padding-left: 44px; /* Align with toggle label */
    }

    /* Day picker */
    .day-picker-section {
      display: flex;
      flex-direction: column;
      gap: var(--uui-size-space-2);
      margin-top: var(--uui-size-space-2);
    }

    .day-picker-label {
      font-weight: 600;
      font-size: 0.8125rem;
    }

    .day-picker {
      display: flex;
      gap: var(--uui-size-space-2);
    }

    .day-btn {
      width: 36px;
      height: 36px;
      border-radius: 50%;
      border: 2px solid var(--uui-color-border);
      background: var(--uui-color-surface);
      color: var(--uui-color-text);
      font-weight: 600;
      font-size: 0.8125rem;
      cursor: pointer;
      transition: all 0.15s ease;
    }

    .day-btn:hover {
      border-color: var(--uui-color-interactive);
      background: var(--uui-color-surface-emphasis);
    }

    .day-btn.selected {
      border-color: var(--uui-color-interactive);
      background: var(--uui-color-interactive);
      color: var(--uui-color-interactive-contrast);
    }

    .day-picker-hint {
      font-size: 0.75rem;
      color: var(--uui-color-text-alt);
    }

    uui-box {
      --uui-box-default-padding: var(--uui-size-space-5);
    }

    uui-input,
    uui-select {
      width: 100%;
    }

    .section-hint {
      margin: 0 0 var(--uui-size-space-4) 0;
      color: var(--uui-color-text-alt);
      font-size: 0.875rem;
    }

    .table-header {
      display: flex;
      justify-content: flex-end;
      margin-bottom: var(--uui-size-space-4);
    }

    .data-table {
      width: 100%;
      border-collapse: collapse;
      background: var(--uui-color-surface);
      border: 1px solid var(--uui-color-border);
      border-radius: var(--uui-border-radius);
      overflow: hidden;
    }

    .data-table th,
    .data-table td {
      padding: var(--uui-size-space-3) var(--uui-size-space-4);
      text-align: left;
      border-bottom: 1px solid var(--uui-color-border);
    }

    .data-table th {
      font-weight: 600;
      font-size: 0.8125rem;
      color: var(--uui-color-text-alt);
      background: var(--uui-color-surface-alt);
      text-transform: uppercase;
      letter-spacing: 0.025em;
    }

    .data-table tbody tr:last-child td {
      border-bottom: none;
    }

    .data-table tbody tr:hover {
      background: var(--uui-color-surface-emphasis);
    }

    .cost-cell {
      font-weight: 500;
      font-variant-numeric: tabular-nums;
    }

    .actions-col {
      width: 100px;
      text-align: right;
    }

    .actions-col > * {
      display: inline-flex;
      gap: var(--uui-size-space-1);
    }

    .no-items {
      color: var(--uui-color-text-alt);
      font-style: italic;
      margin: 0;
      padding: var(--uui-size-space-4);
      text-align: center;
      background: var(--uui-color-surface);
      border: 1px dashed var(--uui-color-border);
      border-radius: var(--uui-border-radius);
    }

    [slot="actions"] {
      display: flex;
      gap: var(--uui-size-space-3);
    }

    [slot="description"] {
      font-size: 0.8125rem;
      color: var(--uui-color-text-alt);
    }

    /* Intro banner */
    .intro-banner {
      display: flex;
      gap: var(--uui-size-space-4);
      padding: var(--uui-size-space-4);
      background: linear-gradient(135deg, var(--uui-color-surface-alt) 0%, var(--uui-color-surface) 100%);
      border: 1px solid var(--uui-color-border);
      border-left: 4px solid var(--uui-color-interactive);
      border-radius: var(--uui-border-radius);
    }

    .intro-icon {
      flex-shrink: 0;
      display: flex;
      align-items: center;
      justify-content: center;
      width: 40px;
      height: 40px;
      background: var(--uui-color-interactive);
      color: var(--uui-color-surface);
      border-radius: 50%;
      font-size: 1.25rem;
    }

    .intro-content {
      flex: 1;
    }

    .intro-content strong {
      display: block;
      margin-bottom: var(--uui-size-space-1);
      font-size: 0.9375rem;
    }

    .intro-content p {
      margin: 0;
      font-size: 0.8125rem;
      color: var(--uui-color-text-alt);
      line-height: 1.5;
    }

    /* Optional section styling */
    .optional-section {
      border-style: dashed;
    }

    .date-options {
      margin-top: var(--uui-size-space-4);
      padding-top: var(--uui-size-space-4);
      border-top: 1px solid var(--uui-color-border);
    }

    .date-options .form-grid {
      margin-bottom: var(--uui-size-space-4);
    }

    /* Postcode rules */
    .postcode-pattern {
      font-family: var(--uui-font-family-monospace, monospace);
      font-size: 0.875rem;
      padding: 2px 6px;
      background: var(--uui-color-surface-alt);
      border-radius: var(--uui-border-radius);
    }

    .rule-action {
      display: inline-block;
      padding: 2px 8px;
      border-radius: var(--uui-border-radius);
      font-size: 0.8125rem;
      font-weight: 500;
    }

    .rule-action-block {
      background: var(--uui-color-danger);
      color: var(--uui-color-danger-contrast);
    }

    .rule-action-surcharge {
      background: var(--uui-color-warning);
      color: var(--uui-color-warning-contrast);
    }

  `;
l([
  n()
], r.prototype, "_isLoading", 2);
l([
  n()
], r.prototype, "_isSaving", 2);
l([
  n()
], r.prototype, "_errorMessage", 2);
l([
  n()
], r.prototype, "_detail", 2);
l([
  n()
], r.prototype, "_warehouses", 2);
l([
  n()
], r.prototype, "_excludedRegions", 2);
l([
  n()
], r.prototype, "_name", 2);
l([
  n()
], r.prototype, "_warehouseId", 2);
l([
  n()
], r.prototype, "_fixedCost", 2);
l([
  n()
], r.prototype, "_daysFrom", 2);
l([
  n()
], r.prototype, "_daysTo", 2);
l([
  n()
], r.prototype, "_isNextDay", 2);
l([
  n()
], r.prototype, "_nextDayCutOffTime", 2);
l([
  n()
], r.prototype, "_allowsDeliveryDateSelection", 2);
l([
  n()
], r.prototype, "_minDeliveryDays", 2);
l([
  n()
], r.prototype, "_maxDeliveryDays", 2);
l([
  n()
], r.prototype, "_allowedDaysOfWeek", 2);
l([
  n()
], r.prototype, "_isDeliveryDateGuaranteed", 2);
l([
  n()
], r.prototype, "_isEnabled", 2);
l([
  n()
], r.prototype, "_activeTab", 2);
r = l([
  C("merchello-shipping-option-detail-modal")
], r);
const F = r;
export {
  r as MerchelloShippingOptionDetailModalElement,
  F as default
};
//# sourceMappingURL=shipping-option-detail-modal.element-DIVlGrXZ.js.map
