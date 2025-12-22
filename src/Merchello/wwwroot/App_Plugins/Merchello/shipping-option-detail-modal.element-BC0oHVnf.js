import { html as r, nothing as d, css as w, state as o, customElement as k } from "@umbraco-cms/backoffice/external/lit";
import { UmbModalToken as b, UmbModalBaseElement as S, UMB_MODAL_MANAGER_CONTEXT as $, UMB_CONFIRM_MODAL as y } from "@umbraco-cms/backoffice/modal";
import { UMB_NOTIFICATION_CONTEXT as C } from "@umbraco-cms/backoffice/notification";
import { M as h } from "./merchello-api-s-9cx0Ue.js";
import { a as m } from "./formatting-BzzWJIvp.js";
const T = new b("Merchello.ShippingCost.Modal", {
  modal: {
    type: "dialog",
    size: "medium"
  }
}), O = new b("Merchello.ShippingWeightTier.Modal", {
  modal: {
    type: "dialog",
    size: "medium"
  }
});
var L = Object.defineProperty, M = Object.getOwnPropertyDescriptor, D = (i) => {
  throw TypeError(i);
}, s = (i, e, t, n) => {
  for (var l = n > 1 ? void 0 : n ? M(e, t) : e, v = i.length - 1, g; v >= 0; v--)
    (g = i[v]) && (l = (n ? g(e, t, l) : g(l)) || l);
  return n && l && L(e, t, l), l;
}, x = (i, e, t) => e.has(i) || D("Cannot " + t), u = (i, e, t) => (x(i, e, "read from private field"), e.get(i)), f = (i, e, t) => e.has(i) ? D("Cannot add the same private member more than once") : e instanceof WeakSet ? e.add(i) : e.set(i, t), _ = (i, e, t, n) => (x(i, e, "write to private field"), e.set(i, t), t), p, c;
let a = class extends S {
  constructor() {
    super(), this._isLoading = !1, this._isSaving = !1, this._errorMessage = null, this._detail = null, this._warehouses = [], this._availableProviders = [], this._methodConfig = null, this._isLoadingProviders = !1, this._name = "", this._warehouseId = "", this._fixedCost = null, this._daysFrom = 3, this._daysTo = 5, this._isNextDay = !1, this._nextDayCutOffTime = "", this._allowsDeliveryDateSelection = !1, this._minDeliveryDays = null, this._maxDeliveryDays = null, this._allowedDaysOfWeek = "", this._isDeliveryDateGuaranteed = !1, this._providerKey = "flat-rate", this._serviceType = null, this._providerSettings = {}, this._isEnabled = !0, f(this, p), f(this, c), this._daysOfWeek = [
      { value: "Mon", label: "M", fullLabel: "Monday" },
      { value: "Tue", label: "T", fullLabel: "Tuesday" },
      { value: "Wed", label: "W", fullLabel: "Wednesday" },
      { value: "Thu", label: "T", fullLabel: "Thursday" },
      { value: "Fri", label: "F", fullLabel: "Friday" },
      { value: "Sat", label: "S", fullLabel: "Saturday" },
      { value: "Sun", label: "S", fullLabel: "Sunday" }
    ], this.consumeContext($, (i) => {
      _(this, p, i);
    }), this.consumeContext(C, (i) => {
      _(this, c, i);
    });
  }
  /** Whether warehouse is pre-selected and should not show dropdown */
  get _hasFixedWarehouse() {
    return !!this.data?.warehouseId;
  }
  connectedCallback() {
    super.connectedCallback(), this.data?.warehouseId && (this._warehouseId = this.data.warehouseId), this.data?.warehouses ? this._warehouses = this.data.warehouses : this._hasFixedWarehouse || this._loadWarehouses(), this.data?.optionId ? this._loadDetailById(this.data.optionId) : this.data?.option ? this._loadDetail() : this._loadAvailableProviders();
  }
  async _loadAvailableProviders() {
    this._isLoadingProviders = !0;
    try {
      const { data: i } = await h.getAvailableProvidersForWarehouse();
      i && (this._availableProviders = i);
    } catch (i) {
      console.error("Failed to load providers:", i);
    }
    this._isLoadingProviders = !1;
  }
  async _onProviderChange(i) {
    if (this._providerKey = i, this._serviceType = null, this._providerSettings = {}, this._methodConfig = null, i !== "flat-rate")
      try {
        const { data: e } = await h.getShippingProviderMethodConfig(i);
        e && (this._methodConfig = e);
      } catch (e) {
        console.error("Failed to load method config:", e);
      }
  }
  /** Whether this provider uses live rates (external API) */
  get _usesLiveRates() {
    return this._providerKey === "flat-rate" ? !1 : this._availableProviders.find((e) => e.key === this._providerKey)?.capabilities?.usesLiveRates ?? !1;
  }
  /** Options for the provider dropdown - uui-select requires .options property */
  get _providerOptions() {
    const i = [
      { name: "Flat Rate (Manual Pricing)", value: "flat-rate", selected: this._providerKey === "flat-rate" }
    ];
    return this._availableProviders.filter((e) => e.isAvailable && e.key !== "flat-rate").forEach((e) => {
      i.push({
        name: `${e.displayName}${e.capabilities?.usesLiveRates ? " (Live Rates)" : ""}`,
        value: e.key,
        selected: e.key === this._providerKey
      });
    }), i;
  }
  /** Options for the service type dropdown */
  get _serviceTypeOptions() {
    const i = [
      { name: "Select a service type...", value: "", selected: !this._serviceType }
    ];
    return this._methodConfig?.fields.find((t) => t.key === "serviceType")?.options?.forEach((t) => {
      i.push({
        name: t.label,
        value: t.value,
        selected: t.value === this._serviceType
      });
    }), i;
  }
  /** Options for the warehouse dropdown */
  get _warehouseOptions() {
    const i = [
      { name: "Select a warehouse...", value: "", selected: !this._warehouseId }
    ];
    return this._warehouses.forEach((e) => {
      i.push({
        name: e.name,
        value: e.id,
        selected: e.id === this._warehouseId
      });
    }), i;
  }
  async _loadWarehouses() {
    const { data: i } = await h.getWarehouses();
    i && (this._warehouses = i);
  }
  async _loadDetail() {
    this.data?.option && await this._loadDetailById(this.data.option.id);
  }
  async _loadDetailById(i) {
    this._isLoading = !0, this._errorMessage = null;
    try {
      const { data: e, error: t } = await h.getShippingOption(i);
      if (t) {
        this._errorMessage = t.message, this._isLoading = !1;
        return;
      }
      if (e && (this._detail = e, this._name = e.name ?? "", this._hasFixedWarehouse || (this._warehouseId = e.warehouseId), this._fixedCost = e.fixedCost ?? null, this._daysFrom = e.daysFrom, this._daysTo = e.daysTo, this._isNextDay = e.isNextDay, this._nextDayCutOffTime = e.nextDayCutOffTime ?? "", this._allowsDeliveryDateSelection = e.allowsDeliveryDateSelection, this._minDeliveryDays = e.minDeliveryDays ?? null, this._maxDeliveryDays = e.maxDeliveryDays ?? null, this._allowedDaysOfWeek = e.allowedDaysOfWeek ?? "", this._isDeliveryDateGuaranteed = e.isDeliveryDateGuaranteed, this._providerKey = e.providerKey ?? "flat-rate", this._serviceType = e.serviceType ?? null, this._providerSettings = e.providerSettings ?? {}, this._isEnabled = e.isEnabled ?? !0, this._providerKey !== "flat-rate")) {
        await this._loadAvailableProviders();
        const { data: n } = await h.getShippingProviderMethodConfig(this._providerKey);
        n && (this._methodConfig = n);
      }
    } catch (e) {
      this._errorMessage = e instanceof Error ? e.message : "Failed to load shipping option";
    }
    this._isLoading = !1;
  }
  async _save() {
    if (!this._name || !this._warehouseId) {
      u(this, c)?.peek("warning", {
        data: { headline: "Validation", message: "Name and Warehouse are required" }
      });
      return;
    }
    if (this._usesLiveRates && !this._serviceType) {
      u(this, c)?.peek("warning", {
        data: { headline: "Validation", message: "Service type is required for this provider" }
      });
      return;
    }
    this._isSaving = !0;
    const i = {
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
      providerKey: this._providerKey,
      serviceType: this._serviceType ?? void 0,
      providerSettings: Object.keys(this._providerSettings).length > 0 ? this._providerSettings : void 0,
      isEnabled: this._isEnabled
    };
    try {
      const e = this.data?.option?.id || this.data?.optionId || this._detail?.id, t = e ? await h.updateShippingOption(e, i) : await h.createShippingOption(i);
      if (t.error) {
        u(this, c)?.peek("danger", {
          data: { headline: "Error", message: t.error.message }
        }), this._isSaving = !1;
        return;
      }
      u(this, c)?.peek("positive", {
        data: {
          headline: "Success",
          message: e ? "Shipping option updated" : "Shipping option created"
        }
      }), this.modalContext?.setValue({ isSaved: !0 }), this.modalContext?.submit();
    } catch (e) {
      u(this, c)?.peek("danger", {
        data: { headline: "Error", message: e instanceof Error ? e.message : "Failed to save" }
      });
    }
    this._isSaving = !1;
  }
  async _openCostModal(i) {
    if (!u(this, p) || !this._detail) return;
    (await u(this, p).open(this, T, {
      data: { cost: i, optionId: this._detail.id, warehouseId: this._detail.warehouseId }
    }).onSubmit().catch(() => {
    }))?.isSaved && await this._loadDetail();
  }
  async _deleteCost(i) {
    const e = i.regionDisplay ?? i.countryCode;
    if (!await u(this, p)?.open(this, y, {
      data: {
        headline: "Delete Shipping Cost",
        content: `Are you sure you want to delete the shipping cost for ${e}?`,
        confirmLabel: "Delete",
        color: "danger"
      }
    })?.onSubmit().catch(() => {
    })) return;
    const { error: l } = await h.deleteShippingCost(i.id);
    if (l) {
      u(this, c)?.peek("danger", {
        data: { headline: "Error", message: l.message }
      });
      return;
    }
    u(this, c)?.peek("positive", {
      data: { headline: "Success", message: "Cost deleted" }
    }), await this._loadDetail();
  }
  async _openWeightTierModal(i) {
    if (!u(this, p) || !this._detail) return;
    (await u(this, p).open(this, O, {
      data: { tier: i, optionId: this._detail.id, warehouseId: this._detail.warehouseId }
    }).onSubmit().catch(() => {
    }))?.isSaved && await this._loadDetail();
  }
  async _deleteWeightTier(i) {
    const e = i.weightRangeDisplay ?? `${i.minWeightKg}+ kg`;
    if (!await u(this, p)?.open(this, y, {
      data: {
        headline: "Delete Weight Tier",
        content: `Are you sure you want to delete the weight tier "${e}"?`,
        confirmLabel: "Delete",
        color: "danger"
      }
    })?.onSubmit().catch(() => {
    })) return;
    const { error: l } = await h.deleteShippingWeightTier(i.id);
    if (l) {
      u(this, c)?.peek("danger", {
        data: { headline: "Error", message: l.message }
      });
      return;
    }
    u(this, c)?.peek("positive", {
      data: { headline: "Success", message: "Weight tier deleted" }
    }), await this._loadDetail();
  }
  _close() {
    this.modalContext?.setValue({ isSaved: this._detail !== null }), this.modalContext?.submit();
  }
  /** Check if a day is selected */
  _isDaySelected(i) {
    return this._allowedDaysOfWeek ? this._allowedDaysOfWeek.split(",").map((e) => e.trim()).includes(i) : !1;
  }
  /** Toggle a day selection */
  _toggleDay(i) {
    const e = this._allowedDaysOfWeek ? this._allowedDaysOfWeek.split(",").map((t) => t.trim()).filter((t) => t) : [];
    if (e.includes(i))
      this._allowedDaysOfWeek = e.filter((t) => t !== i).join(",");
    else {
      const t = this._daysOfWeek.map((l) => l.value), n = [...e, i].sort(
        (l, v) => t.indexOf(l) - t.indexOf(v)
      );
      this._allowedDaysOfWeek = n.join(",");
    }
  }
  /** Render day of week checkboxes */
  _renderDayCheckboxes() {
    return this._daysOfWeek.map(
      (i) => r`
        <button
          type="button"
          class="day-btn ${this._isDaySelected(i.value) ? "selected" : ""}"
          title="${i.fullLabel}"
          @click=${() => this._toggleDay(i.value)}
        >
          ${i.label}
        </button>
      `
    );
  }
  _renderCostsTable() {
    return this._detail ? r`
      <uui-box headline="Shipping Rates">
        <p class="section-hint">
          Set different shipping rates for specific destinations. Use a wildcard (*) rate as the default for any destination not specifically listed.
        </p>
        <div class="table-header">
          <uui-button look="outline" label="Add Rate" @click=${() => this._openCostModal()}>
            + Add Rate
          </uui-button>
        </div>
        ${this._detail.costs.length === 0 ? r`<p class="no-items">No destination rates configured. Add rates or use the Fixed Cost above.</p>` : r`
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
      (i) => r`
                      <tr>
                        <td>${this._formatRegionDisplay(i.countryCode, i.regionDisplay)}</td>
                        <td class="cost-cell">${m(i.cost)}</td>
                        <td class="actions-col">
                          <uui-button compact look="secondary" label="Edit" @click=${() => this._openCostModal(i)}>
                            <uui-icon name="icon-edit"></uui-icon>
                          </uui-button>
                          <uui-button compact look="secondary" color="danger" label="Delete" @click=${() => this._deleteCost(i)}>
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
    ` : d;
  }
  _formatRegionDisplay(i, e) {
    return i === "*" ? "All Destinations (Default)" : e ?? i;
  }
  _renderWeightTiersTable() {
    return this._detail ? r`
      <uui-box headline="Weight Surcharges">
        <p class="section-hint">
          Add extra charges based on order weight. Surcharges are added on top of the shipping rate.
        </p>
        <div class="table-header">
          <uui-button look="outline" label="Add Surcharge" @click=${() => this._openWeightTierModal()}>
            + Add Surcharge
          </uui-button>
        </div>
        ${this._detail.weightTiers.length === 0 ? r`<p class="no-items">No weight surcharges configured.</p>` : r`
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
      (i) => r`
                      <tr>
                        <td>${this._formatRegionDisplay(i.countryCode, i.regionDisplay)}</td>
                        <td>${i.weightRangeDisplay ?? `${i.minWeightKg}+ kg`}</td>
                        <td class="cost-cell">+${m(i.surcharge)}</td>
                        <td class="actions-col">
                          <uui-button compact look="secondary" label="Edit" @click=${() => this._openWeightTierModal(i)}>
                            <uui-icon name="icon-edit"></uui-icon>
                          </uui-button>
                          <uui-button compact look="secondary" color="danger" label="Delete" @click=${() => this._deleteWeightTier(i)}>
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
    ` : d;
  }
  render() {
    const i = !!(this.data?.option || this.data?.optionId);
    return this._isLoading ? r`
        <umb-body-layout headline="${i ? "Edit" : "Add"} Shipping Option">
          <div class="loading">
            <uui-loader></uui-loader>
            <span>Loading...</span>
          </div>
        </umb-body-layout>
      ` : r`
      <umb-body-layout headline="${i ? "Edit" : "Add"} Shipping Option">
        <div class="form-content">
          ${this._errorMessage ? r`
                <uui-box>
                  <div class="error">${this._errorMessage}</div>
                </uui-box>
              ` : d}

          <!-- Intro guidance -->
          <div class="intro-banner">
            <div class="intro-icon">
              <uui-icon name="icon-truck"></uui-icon>
            </div>
            <div class="intro-content">
              <strong>Shipping Option</strong>
              <p>A shipping option is a delivery method you offer to customers (e.g., "Standard Shipping", "Express Delivery"). Set the pricing, delivery time, and which destinations it's available for.</p>
            </div>
          </div>

          <uui-box headline="Basic Settings">
            <div class="form-grid">
              <!-- Provider Selection (only for new options) -->
              ${i ? r`
                    <!-- Show provider badge for existing options -->
                    <uui-form-layout-item class="full-width">
                      <uui-label slot="label">Provider</uui-label>
                      <div class="provider-badge">
                        <span class="badge ${this._usesLiveRates ? "badge-live" : "badge-manual"}">
                          ${this._detail?.providerDisplayName ?? this._providerKey}
                          ${this._usesLiveRates ? " (Live Rates)" : ""}
                        </span>
                      </div>
                    </uui-form-layout-item>
                  ` : r`
                    <uui-form-layout-item class="full-width">
                      <uui-label slot="label" for="provider" required>Provider</uui-label>
                      <uui-select
                        id="provider"
                        .options=${this._providerOptions}
                        @change=${(e) => this._onProviderChange(e.target.value)}
                        ?disabled=${this._isLoadingProviders}
                      ></uui-select>
                      <span slot="description">
                        ${this._usesLiveRates ? "Rates will be calculated in real-time from the provider's API" : "You'll configure manual pricing below"}
                      </span>
                    </uui-form-layout-item>
                  `}

              <!-- Service Type for external providers -->
              ${this._usesLiveRates && this._methodConfig ? r`
                    <uui-form-layout-item class="full-width">
                      <uui-label slot="label" for="serviceType" required>Service Type</uui-label>
                      <uui-select
                        id="serviceType"
                        .options=${this._serviceTypeOptions}
                        @change=${(e) => {
      if (this._serviceType = e.target.value || null, !this._name && this._serviceType) {
        const n = this._methodConfig?.fields.find((l) => l.key === "serviceType")?.options?.find((l) => l.value === this._serviceType);
        n && (this._name = n.label);
      }
    }}
                      ></uui-select>
                      <span slot="description">The carrier service to use for this shipping method</span>
                    </uui-form-layout-item>
                  ` : d}

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

              ${this._hasFixedWarehouse ? d : r`
                    <uui-form-layout-item class="full-width">
                      <uui-label slot="label" for="warehouse" required>Warehouse</uui-label>
                      <uui-select
                        id="warehouse"
                        .options=${this._warehouseOptions}
                        @change=${(e) => this._warehouseId = e.target.value}
                      ></uui-select>
                    </uui-form-layout-item>
                  `}

              <!-- Fixed Cost only for flat-rate -->
              ${this._usesLiveRates ? d : r`
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
                      <span slot="description">Single price for all destinations, or leave empty to use rates below</span>
                    </uui-form-layout-item>
                  `}

              <!-- Markup for live rates providers -->
              ${this._usesLiveRates ? r`
                    <uui-form-layout-item>
                      <uui-label slot="label" for="markup">Markup %</uui-label>
                      <uui-input
                        id="markup"
                        type="number"
                        step="0.1"
                        min="0"
                        .value=${this._providerSettings.markup ?? "0"}
                        @input=${(e) => {
      const t = e.target.value;
      this._providerSettings = { ...this._providerSettings, markup: t || "0" };
    }}
                        placeholder="0"
                      ></uui-input>
                      <span slot="description">Percentage to add to carrier rates (e.g., 10 for 10%)</span>
                    </uui-form-layout-item>
                  ` : d}

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

          <!-- Delivery Time only for flat-rate (live rate providers get transit time from API) -->
          ${this._usesLiveRates ? d : r`
                <uui-box headline="Delivery Time">
                  <p class="section-hint">Estimated delivery time shown to customers (e.g., "5-10 business days")</p>
                  <div class="form-grid">
                    <uui-form-layout-item>
                      <uui-label slot="label" for="daysFrom">Minimum Days</uui-label>
                      <uui-input
                        id="daysFrom"
                        type="number"
                        min="0"
                        .value=${this._daysFrom.toString()}
                        @input=${(e) => this._daysFrom = parseInt(e.target.value) || 0}
                      ></uui-input>
                    </uui-form-layout-item>

                    <uui-form-layout-item>
                      <uui-label slot="label" for="daysTo">Maximum Days</uui-label>
                      <uui-input
                        id="daysTo"
                        type="number"
                        min="0"
                        .value=${this._daysTo.toString()}
                        @input=${(e) => this._daysTo = parseInt(e.target.value) || 0}
                      ></uui-input>
                    </uui-form-layout-item>

                    <uui-form-layout-item class="toggle-item">
                      <uui-toggle
                        .checked=${this._isNextDay}
                        @change=${(e) => this._isNextDay = e.target.checked}
                        label="Next Day Delivery"
                      ></uui-toggle>
                    </uui-form-layout-item>

                    ${this._isNextDay ? r`
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
                        ` : d}
                  </div>
                </uui-box>
              `}

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

            ${this._allowsDeliveryDateSelection ? r`
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
                      <div class="day-picker">
                        ${this._renderDayCheckboxes()}
                      </div>
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
                ` : d}
          </uui-box>

          <!-- Costs and weight tiers only for flat-rate -->
          ${this._detail && !this._usesLiveRates ? this._renderCostsTable() : d}
          ${this._detail && !this._usesLiveRates ? this._renderWeightTiersTable() : d}

          <!-- Info banner for live rates providers -->
          ${this._usesLiveRates ? r`
                <div class="live-rates-banner">
                  <uui-icon name="icon-cloud"></uui-icon>
                  <div>
                    <strong>Live Rates from ${this._detail?.providerDisplayName ?? this._providerKey}</strong>
                    <p>Shipping costs are calculated in real-time from the carrier's API based on package weight, dimensions, and destination. Use the markup field above to add a percentage to the carrier's rates.</p>
                  </div>
                </div>
              ` : d}
        </div>

        <div slot="actions">
          <uui-button label="Cancel" @click=${this._close}>Cancel</uui-button>
          <uui-button
            look="primary"
            label="${i ? "Save" : "Create"}"
            ?disabled=${this._isSaving}
            @click=${this._save}
          >
            ${this._isSaving ? r`<uui-loader-circle></uui-loader-circle>` : d}
            ${i ? "Save" : "Create"}
          </uui-button>
        </div>
      </umb-body-layout>
    `;
  }
};
p = /* @__PURE__ */ new WeakMap();
c = /* @__PURE__ */ new WeakMap();
a.styles = w`
    :host {
      display: block;
    }

    .form-content {
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

    /* Provider badges */
    .provider-badge {
      display: flex;
      align-items: center;
      padding: var(--uui-size-space-2) 0;
    }

    .badge {
      display: inline-flex;
      align-items: center;
      padding: var(--uui-size-space-1) var(--uui-size-space-3);
      border-radius: var(--uui-border-radius);
      font-size: 0.8125rem;
      font-weight: 500;
    }

    .badge-manual {
      background: var(--uui-color-surface-alt);
      color: var(--uui-color-text);
      border: 1px solid var(--uui-color-border);
    }

    .badge-live {
      background: var(--uui-color-positive-standalone);
      color: white;
    }

    /* Live rates info banner */
    .live-rates-banner {
      display: flex;
      gap: var(--uui-size-space-4);
      padding: var(--uui-size-space-5);
      background: linear-gradient(135deg, #e8f5e9 0%, #f1f8e9 100%);
      border: 1px solid #c8e6c9;
      border-left: 4px solid var(--uui-color-positive);
      border-radius: var(--uui-border-radius);
    }

    .live-rates-banner uui-icon {
      flex-shrink: 0;
      font-size: 1.5rem;
      color: var(--uui-color-positive);
    }

    .live-rates-banner strong {
      display: block;
      margin-bottom: var(--uui-size-space-2);
      color: var(--uui-color-text);
    }

    .live-rates-banner p {
      margin: 0;
      font-size: 0.8125rem;
      color: var(--uui-color-text-alt);
      line-height: 1.5;
    }
  `;
s([
  o()
], a.prototype, "_isLoading", 2);
s([
  o()
], a.prototype, "_isSaving", 2);
s([
  o()
], a.prototype, "_errorMessage", 2);
s([
  o()
], a.prototype, "_detail", 2);
s([
  o()
], a.prototype, "_warehouses", 2);
s([
  o()
], a.prototype, "_availableProviders", 2);
s([
  o()
], a.prototype, "_methodConfig", 2);
s([
  o()
], a.prototype, "_isLoadingProviders", 2);
s([
  o()
], a.prototype, "_name", 2);
s([
  o()
], a.prototype, "_warehouseId", 2);
s([
  o()
], a.prototype, "_fixedCost", 2);
s([
  o()
], a.prototype, "_daysFrom", 2);
s([
  o()
], a.prototype, "_daysTo", 2);
s([
  o()
], a.prototype, "_isNextDay", 2);
s([
  o()
], a.prototype, "_nextDayCutOffTime", 2);
s([
  o()
], a.prototype, "_allowsDeliveryDateSelection", 2);
s([
  o()
], a.prototype, "_minDeliveryDays", 2);
s([
  o()
], a.prototype, "_maxDeliveryDays", 2);
s([
  o()
], a.prototype, "_allowedDaysOfWeek", 2);
s([
  o()
], a.prototype, "_isDeliveryDateGuaranteed", 2);
s([
  o()
], a.prototype, "_providerKey", 2);
s([
  o()
], a.prototype, "_serviceType", 2);
s([
  o()
], a.prototype, "_providerSettings", 2);
s([
  o()
], a.prototype, "_isEnabled", 2);
a = s([
  k("merchello-shipping-option-detail-modal")
], a);
const A = a;
export {
  a as MerchelloShippingOptionDetailModalElement,
  A as default
};
//# sourceMappingURL=shipping-option-detail-modal.element-BC0oHVnf.js.map
