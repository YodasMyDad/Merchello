import { nothing as n, html as r, css as D, state as o, customElement as x } from "@umbraco-cms/backoffice/external/lit";
import { UmbModalToken as v, UmbModalBaseElement as w, UMB_MODAL_MANAGER_CONTEXT as $ } from "@umbraco-cms/backoffice/modal";
import { UMB_NOTIFICATION_CONTEXT as S } from "@umbraco-cms/backoffice/notification";
import { M as c } from "./merchello-api-DuHTSXU5.js";
const k = new v("Merchello.ShippingCost.Modal", {
  modal: {
    type: "dialog",
    size: "small"
  }
}), C = new v("Merchello.ShippingWeightTier.Modal", {
  modal: {
    type: "dialog",
    size: "small"
  }
});
var T = Object.defineProperty, M = Object.getOwnPropertyDescriptor, _ = (t) => {
  throw TypeError(t);
}, s = (t, e, i, p) => {
  for (var d = p > 1 ? void 0 : p ? M(e, i) : e, m = t.length - 1, y; m >= 0; m--)
    (y = t[m]) && (d = (p ? y(e, i, d) : y(d)) || d);
  return p && d && T(e, i, d), d;
}, b = (t, e, i) => e.has(t) || _("Cannot " + i), l = (t, e, i) => (b(t, e, "read from private field"), e.get(t)), g = (t, e, i) => e.has(t) ? _("Cannot add the same private member more than once") : e instanceof WeakSet ? e.add(t) : e.set(t, i), f = (t, e, i, p) => (b(t, e, "write to private field"), e.set(t, i), i), h, u;
let a = class extends w {
  constructor() {
    super(), this._isLoading = !1, this._isSaving = !1, this._errorMessage = null, this._detail = null, this._warehouses = [], this._name = "", this._warehouseId = "", this._fixedCost = null, this._daysFrom = 3, this._daysTo = 5, this._isNextDay = !1, this._nextDayCutOffTime = "", this._allowsDeliveryDateSelection = !1, this._minDeliveryDays = null, this._maxDeliveryDays = null, this._allowedDaysOfWeek = "", this._isDeliveryDateGuaranteed = !1, this._providerKey = "flat-rate", this._isEnabled = !0, g(this, h), g(this, u), this.consumeContext($, (t) => {
      f(this, h, t);
    }), this.consumeContext(S, (t) => {
      f(this, u, t);
    });
  }
  /** Whether warehouse is pre-selected and should not show dropdown */
  get _hasFixedWarehouse() {
    return !!this.data?.warehouseId;
  }
  connectedCallback() {
    super.connectedCallback(), this.data?.warehouseId && (this._warehouseId = this.data.warehouseId), this.data?.warehouses ? this._warehouses = this.data.warehouses : this._hasFixedWarehouse || this._loadWarehouses(), this.data?.optionId ? this._loadDetailById(this.data.optionId) : this.data?.option && this._loadDetail();
  }
  async _loadWarehouses() {
    const { data: t } = await c.getWarehouses();
    t && (this._warehouses = t);
  }
  async _loadDetail() {
    this.data?.option && await this._loadDetailById(this.data.option.id);
  }
  async _loadDetailById(t) {
    this._isLoading = !0, this._errorMessage = null;
    try {
      const { data: e, error: i } = await c.getShippingOption(t);
      if (i) {
        this._errorMessage = i.message, this._isLoading = !1;
        return;
      }
      e && (this._detail = e, this._name = e.name ?? "", this._hasFixedWarehouse || (this._warehouseId = e.warehouseId), this._fixedCost = e.fixedCost ?? null, this._daysFrom = e.daysFrom, this._daysTo = e.daysTo, this._isNextDay = e.isNextDay, this._nextDayCutOffTime = e.nextDayCutOffTime ?? "", this._allowsDeliveryDateSelection = e.allowsDeliveryDateSelection, this._minDeliveryDays = e.minDeliveryDays ?? null, this._maxDeliveryDays = e.maxDeliveryDays ?? null, this._allowedDaysOfWeek = e.allowedDaysOfWeek ?? "", this._isDeliveryDateGuaranteed = e.isDeliveryDateGuaranteed, this._providerKey = e.providerKey ?? "flat-rate", this._isEnabled = e.isEnabled ?? !0);
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
      providerKey: this._providerKey,
      isEnabled: this._isEnabled
    };
    try {
      const e = this.data?.option?.id || this.data?.optionId || this._detail?.id, i = e ? await c.updateShippingOption(e, t) : await c.createShippingOption(t);
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
      }), !e && i.data && (this._detail = i.data), this.modalContext?.setValue({ saved: !0 }), e || i.data && (this._detail = i.data);
    } catch (e) {
      l(this, u)?.peek("danger", {
        data: { headline: "Error", message: e instanceof Error ? e.message : "Failed to save" }
      });
    }
    this._isSaving = !1;
  }
  async _openCostModal(t) {
    if (!l(this, h) || !this._detail) return;
    (await l(this, h).open(this, k, {
      data: { cost: t, optionId: this._detail.id }
    }).onSubmit().catch(() => {
    }))?.saved && await this._loadDetail();
  }
  async _deleteCost(t) {
    if (!confirm(`Delete cost for ${t.regionDisplay ?? t.countryCode}?`)) return;
    const { error: e } = await c.deleteShippingCost(t.id);
    if (e) {
      l(this, u)?.peek("danger", {
        data: { headline: "Error", message: e.message }
      });
      return;
    }
    l(this, u)?.peek("positive", {
      data: { headline: "Success", message: "Cost deleted" }
    }), await this._loadDetail();
  }
  async _openWeightTierModal(t) {
    if (!l(this, h) || !this._detail) return;
    (await l(this, h).open(this, C, {
      data: { tier: t, optionId: this._detail.id }
    }).onSubmit().catch(() => {
    }))?.saved && await this._loadDetail();
  }
  async _deleteWeightTier(t) {
    if (!confirm(`Delete weight tier ${t.weightRangeDisplay}?`)) return;
    const { error: e } = await c.deleteShippingWeightTier(t.id);
    if (e) {
      l(this, u)?.peek("danger", {
        data: { headline: "Error", message: e.message }
      });
      return;
    }
    l(this, u)?.peek("positive", {
      data: { headline: "Success", message: "Weight tier deleted" }
    }), await this._loadDetail();
  }
  _close() {
    this.modalContext?.setValue({ saved: this._detail !== null }), this.modalContext?.submit();
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
                        <td class="cost-cell">$${t.cost.toFixed(2)}</td>
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
    ` : n;
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
                        <td class="cost-cell">+$${t.surcharge.toFixed(2)}</td>
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
    ` : n;
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
              ` : n}

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

              ${this._hasFixedWarehouse ? n : r`
                    <uui-form-layout-item class="full-width">
                      <uui-label slot="label" for="warehouse" required>Warehouse</uui-label>
                      <uui-select
                        id="warehouse"
                        .value=${this._warehouseId}
                        @change=${(e) => this._warehouseId = e.target.value}
                      >
                        <option value="">Select a warehouse...</option>
                        ${this._warehouses.map(
      (e) => r`<option value="${e.id}" ?selected=${e.id === this._warehouseId}>${e.name}</option>`
    )}
                      </uui-select>
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

              <uui-form-layout-item class="toggle-item">
                <uui-toggle
                  .checked=${this._isEnabled}
                  @change=${(e) => this._isEnabled = e.target.checked}
                  label="Enabled"
                ></uui-toggle>
                <span slot="description">Disabled options won't appear at checkout</span>
              </uui-form-layout-item>
            </div>
          </uui-box>

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
                  ` : n}
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

                    <uui-form-layout-item>
                      <uui-label slot="label" for="allowedDays">Available Days</uui-label>
                      <uui-input
                        id="allowedDays"
                        .value=${this._allowedDaysOfWeek}
                        @input=${(e) => this._allowedDaysOfWeek = e.target.value}
                        placeholder="Mon,Tue,Wed,Thu,Fri"
                      ></uui-input>
                      <span slot="description">Which days of the week deliveries are available. Leave empty for all days.</span>
                    </uui-form-layout-item>

                    <uui-form-layout-item class="toggle-item">
                      <uui-toggle
                        .checked=${this._isDeliveryDateGuaranteed}
                        @change=${(e) => this._isDeliveryDateGuaranteed = e.target.checked}
                        label="Guarantee delivery date"
                      ></uui-toggle>
                      <span slot="description">Promise delivery on the selected date (not just estimated)</span>
                    </uui-form-layout-item>
                  </div>
                ` : n}
          </uui-box>

          ${this._detail ? this._renderCostsTable() : n}
          ${this._detail ? this._renderWeightTiersTable() : n}
        </div>

        <div slot="actions">
          <uui-button label="Cancel" @click=${this._close}>Cancel</uui-button>
          <uui-button
            look="primary"
            label="${t ? "Save" : "Create"}"
            ?disabled=${this._isSaving}
            @click=${this._save}
          >
            ${this._isSaving ? r`<uui-loader-circle></uui-loader-circle>` : n}
            ${t ? "Save" : "Create"}
          </uui-button>
        </div>
      </umb-body-layout>
    `;
  }
};
h = /* @__PURE__ */ new WeakMap();
u = /* @__PURE__ */ new WeakMap();
a.styles = D`
    :host {
      display: block;
      height: 100%;
      --modal-width: 700px;
    }

    umb-body-layout {
      --umb-body-layout-header-padding: var(--uui-size-space-4) var(--uui-size-space-5);
    }

    .form-content {
      padding: var(--uui-size-layout-1);
      display: flex;
      flex-direction: column;
      gap: var(--uui-size-space-5);
      min-width: 600px;
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
      padding: var(--uui-size-space-4);
      border-top: 1px solid var(--uui-color-border);
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
], a.prototype, "_providerKey", 2);
s([
  o()
], a.prototype, "_isEnabled", 2);
a = s([
  x("merchello-shipping-option-detail-modal")
], a);
const z = a;
export {
  a as MerchelloShippingOptionDetailModalElement,
  z as default
};
//# sourceMappingURL=shipping-option-detail-modal.element-DGv261R-.js.map
