import { html as r, nothing as c, css as w, state as o, customElement as k } from "@umbraco-cms/backoffice/external/lit";
import { UmbModalToken as b, UmbModalBaseElement as S, UMB_MODAL_MANAGER_CONTEXT as C, UMB_CONFIRM_MODAL as g } from "@umbraco-cms/backoffice/modal";
import { UMB_NOTIFICATION_CONTEXT as $ } from "@umbraco-cms/backoffice/notification";
import { M as p } from "./merchello-api-D_QA1kor.js";
import { a as f } from "./formatting-BnzQ_3Fo.js";
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
var M = Object.defineProperty, W = Object.getOwnPropertyDescriptor, D = (t) => {
  throw TypeError(t);
}, s = (t, e, i, n) => {
  for (var d = n > 1 ? void 0 : n ? W(e, i) : e, y = t.length - 1, m; y >= 0; y--)
    (m = t[y]) && (d = (n ? m(e, i, d) : m(d)) || d);
  return n && d && M(e, i, d), d;
}, x = (t, e, i) => e.has(t) || D("Cannot " + i), l = (t, e, i) => (x(t, e, "read from private field"), e.get(t)), v = (t, e, i) => e.has(t) ? D("Cannot add the same private member more than once") : e instanceof WeakSet ? e.add(t) : e.set(t, i), _ = (t, e, i, n) => (x(t, e, "write to private field"), e.set(t, i), i), h, u;
let a = class extends S {
  constructor() {
    super(), this._isLoading = !1, this._isSaving = !1, this._errorMessage = null, this._detail = null, this._warehouses = [], this._name = "", this._warehouseId = "", this._fixedCost = null, this._daysFrom = 3, this._daysTo = 5, this._isNextDay = !1, this._nextDayCutOffTime = "", this._allowsDeliveryDateSelection = !1, this._minDeliveryDays = null, this._maxDeliveryDays = null, this._allowedDaysOfWeek = "", this._isDeliveryDateGuaranteed = !1, this._isEnabled = !0, v(this, h), v(this, u), this._daysOfWeek = [
      { value: "Mon", label: "M", fullLabel: "Monday" },
      { value: "Tue", label: "T", fullLabel: "Tuesday" },
      { value: "Wed", label: "W", fullLabel: "Wednesday" },
      { value: "Thu", label: "T", fullLabel: "Thursday" },
      { value: "Fri", label: "F", fullLabel: "Friday" },
      { value: "Sat", label: "S", fullLabel: "Saturday" },
      { value: "Sun", label: "S", fullLabel: "Sunday" }
    ], this.consumeContext(C, (t) => {
      _(this, h, t);
    }), this.consumeContext($, (t) => {
      _(this, u, t);
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
    const t = [
      { name: "Select a warehouse...", value: "", selected: !this._warehouseId }
    ];
    return this._warehouses.forEach((e) => {
      t.push({
        name: e.name,
        value: e.id,
        selected: e.id === this._warehouseId
      });
    }), t;
  }
  async _loadWarehouses() {
    const { data: t } = await p.getWarehouses();
    t && (this._warehouses = t);
  }
  async _loadDetail() {
    this.data?.option && await this._loadDetailById(this.data.option.id);
  }
  async _loadDetailById(t) {
    this._isLoading = !0, this._errorMessage = null;
    try {
      const { data: e, error: i } = await p.getShippingOption(t);
      if (i) {
        this._errorMessage = i.message, this._isLoading = !1;
        return;
      }
      e && (this._detail = e, this._name = e.name ?? "", this._hasFixedWarehouse || (this._warehouseId = e.warehouseId), this._fixedCost = e.fixedCost ?? null, this._daysFrom = e.daysFrom, this._daysTo = e.daysTo, this._isNextDay = e.isNextDay, this._nextDayCutOffTime = e.nextDayCutOffTime ?? "", this._allowsDeliveryDateSelection = e.allowsDeliveryDateSelection, this._minDeliveryDays = e.minDeliveryDays ?? null, this._maxDeliveryDays = e.maxDeliveryDays ?? null, this._allowedDaysOfWeek = e.allowedDaysOfWeek ?? "", this._isDeliveryDateGuaranteed = e.isDeliveryDateGuaranteed, this._isEnabled = e.isEnabled ?? !0);
    } catch (e) {
      this._errorMessage = e instanceof Error ? e.message : "Failed to load shipping option";
    }
    this._isLoading = !1;
  }
  async _save() {
    if (!this._name || !this._warehouseId) {
      l(this, u)?.peek("warning", {
        data: { headline: "Validation", message: "Name and Warehouse are required" }
      });
      return;
    }
    if (!this._isNextDay) {
      if (this._daysFrom < 1 || this._daysTo < 1) {
        l(this, u)?.peek("warning", {
          data: { headline: "Validation", message: "Minimum and maximum delivery days are required (at least 1)" }
        });
        return;
      }
      if (this._daysTo < this._daysFrom) {
        l(this, u)?.peek("warning", {
          data: { headline: "Validation", message: "Maximum days must be greater than or equal to minimum days" }
        });
        return;
      }
    }
    this._isSaving = !0;
    const t = {
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
      isEnabled: this._isEnabled
    };
    try {
      const e = this.data?.option?.id || this.data?.optionId || this._detail?.id, i = e ? await p.updateShippingOption(e, t) : await p.createShippingOption(t);
      if (i.error) {
        l(this, u)?.peek("danger", {
          data: { headline: "Error", message: i.error.message }
        }), this._isSaving = !1;
        return;
      }
      l(this, u)?.peek("positive", {
        data: {
          headline: "Success",
          message: e ? "Shipping option updated" : "Shipping option created"
        }
      }), this.modalContext?.setValue({ isSaved: !0 }), this.modalContext?.submit();
    } catch (e) {
      l(this, u)?.peek("danger", {
        data: { headline: "Error", message: e instanceof Error ? e.message : "Failed to save" }
      });
    }
    this._isSaving = !1;
  }
  async _openCostModal(t) {
    if (!l(this, h) || !this._detail) return;
    (await l(this, h).open(this, T, {
      data: { cost: t, optionId: this._detail.id, warehouseId: this._detail.warehouseId }
    }).onSubmit().catch(() => {
    }))?.isSaved && await this._loadDetail();
  }
  async _deleteCost(t) {
    const e = t.regionDisplay ?? t.countryCode, i = l(this, h)?.open(this, g, {
      data: {
        headline: "Delete Shipping Cost",
        content: `Are you sure you want to delete the shipping cost for ${e}?`,
        confirmLabel: "Delete",
        color: "danger"
      }
    });
    try {
      await i?.onSubmit();
    } catch {
      return;
    }
    const { error: n } = await p.deleteShippingCost(t.id);
    if (n) {
      l(this, u)?.peek("danger", {
        data: { headline: "Error", message: n.message }
      });
      return;
    }
    l(this, u)?.peek("positive", {
      data: { headline: "Success", message: "Cost deleted" }
    }), await this._loadDetail();
  }
  async _openWeightTierModal(t) {
    if (!l(this, h) || !this._detail) return;
    (await l(this, h).open(this, O, {
      data: { tier: t, optionId: this._detail.id, warehouseId: this._detail.warehouseId }
    }).onSubmit().catch(() => {
    }))?.isSaved && await this._loadDetail();
  }
  async _deleteWeightTier(t) {
    const e = t.weightRangeDisplay ?? `${t.minWeightKg}+ kg`, i = l(this, h)?.open(this, g, {
      data: {
        headline: "Delete Weight Tier",
        content: `Are you sure you want to delete the weight tier "${e}"?`,
        confirmLabel: "Delete",
        color: "danger"
      }
    });
    try {
      await i?.onSubmit();
    } catch {
      return;
    }
    const { error: n } = await p.deleteShippingWeightTier(t.id);
    if (n) {
      l(this, u)?.peek("danger", {
        data: { headline: "Error", message: n.message }
      });
      return;
    }
    l(this, u)?.peek("positive", {
      data: { headline: "Success", message: "Weight tier deleted" }
    }), await this._loadDetail();
  }
  _close() {
    this.modalContext?.setValue({ isSaved: this._detail !== null }), this.modalContext?.submit();
  }
  /** Check if a day is selected */
  _isDaySelected(t) {
    return this._allowedDaysOfWeek ? this._allowedDaysOfWeek.split(",").map((e) => e.trim()).includes(t) : !1;
  }
  /** Toggle a day selection */
  _toggleDay(t) {
    const e = this._allowedDaysOfWeek ? this._allowedDaysOfWeek.split(",").map((i) => i.trim()).filter((i) => i) : [];
    if (e.includes(t))
      this._allowedDaysOfWeek = e.filter((i) => i !== t).join(",");
    else {
      const i = this._daysOfWeek.map((d) => d.value), n = [...e, t].sort(
        (d, y) => i.indexOf(d) - i.indexOf(y)
      );
      this._allowedDaysOfWeek = n.join(",");
    }
  }
  /** Render day of week checkboxes */
  _renderDayCheckboxes() {
    return this._daysOfWeek.map(
      (t) => r`
        <button
          type="button"
          class="day-btn ${this._isDaySelected(t.value) ? "selected" : ""}"
          title="${t.fullLabel}"
          @click=${() => this._toggleDay(t.value)}
        >
          ${t.label}
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
      (t) => r`
                      <tr>
                        <td>${this._formatRegionDisplay(t.countryCode, t.regionDisplay)}</td>
                        <td class="cost-cell">${f(t.cost)}</td>
                        <td class="actions-col">
                          <uui-button compact look="secondary" label="Edit" @click=${() => this._openCostModal(t)}>
                            <uui-icon name="icon-edit"></uui-icon>
                          </uui-button>
                          <uui-button compact look="secondary" color="danger" label="Delete" @click=${() => this._deleteCost(t)}>
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
    ` : c;
  }
  _formatRegionDisplay(t, e) {
    return t === "*" ? "All Destinations (Default)" : e ?? t;
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
      (t) => r`
                      <tr>
                        <td>${this._formatRegionDisplay(t.countryCode, t.regionDisplay)}</td>
                        <td>${t.weightRangeDisplay ?? `${t.minWeightKg}+ kg`}</td>
                        <td class="cost-cell">+${f(t.surcharge)}</td>
                        <td class="actions-col">
                          <uui-button compact look="secondary" label="Edit" @click=${() => this._openWeightTierModal(t)}>
                            <uui-icon name="icon-edit"></uui-icon>
                          </uui-button>
                          <uui-button compact look="secondary" color="danger" label="Delete" @click=${() => this._deleteWeightTier(t)}>
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
    ` : c;
  }
  render() {
    const t = !!(this.data?.option || this.data?.optionId);
    return this._isLoading ? r`
        <umb-body-layout headline="${t ? "Edit" : "Add"} Shipping Option">
          <div class="loading">
            <uui-loader></uui-loader>
            <span>Loading...</span>
          </div>
        </umb-body-layout>
      ` : r`
      <umb-body-layout headline="${t ? "Edit" : "Add"} Shipping Option">
        <div class="form-content">
          ${this._errorMessage ? r`
                <uui-box>
                  <div class="error">${this._errorMessage}</div>
                </uui-box>
              ` : c}

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

              ${this._hasFixedWarehouse ? c : r`
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
      const i = e.target.value;
      this._fixedCost = i ? parseFloat(i) : null;
    }}
                  placeholder="0.00"
                ></uui-input>
                <span slot="description">Single price for all destinations, or leave empty to use rates below</span>
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

          <uui-box headline="Delivery Time">
            <p class="section-hint">Estimated delivery time shown to customers (e.g., "5-10 business days")</p>
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
                  ` : c}
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
      const i = e.target.value;
      this._minDeliveryDays = i ? parseInt(i) : null;
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
      const i = e.target.value;
      this._maxDeliveryDays = i ? parseInt(i) : null;
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
                ` : c}
          </uui-box>

          ${this._detail ? this._renderCostsTable() : c}
          ${this._detail ? this._renderWeightTiersTable() : c}
        </div>

        <div slot="actions">
          <uui-button label="Cancel" @click=${this._close}>Cancel</uui-button>
          <uui-button
            look="primary"
            label="${t ? "Save" : "Create"}"
            ?disabled=${this._isSaving}
            @click=${this._save}
          >
            ${this._isSaving ? r`<uui-loader-circle></uui-loader-circle>` : c}
            ${t ? "Save" : "Create"}
          </uui-button>
        </div>
      </umb-body-layout>
    `;
  }
};
h = /* @__PURE__ */ new WeakMap();
u = /* @__PURE__ */ new WeakMap();
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
], a.prototype, "_isEnabled", 2);
a = s([
  k("merchello-shipping-option-detail-modal")
], a);
const F = a;
export {
  a as MerchelloShippingOptionDetailModalElement,
  F as default
};
//# sourceMappingURL=shipping-option-detail-modal.element-H5i7GX9t.js.map
