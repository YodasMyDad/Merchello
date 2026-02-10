import { nothing as d, html as o, css as _, state as n, customElement as v } from "@umbraco-cms/backoffice/external/lit";
import { UmbModalBaseElement as f } from "@umbraco-cms/backoffice/modal";
import { D as l } from "./order.types-_o7xLk2Z.js";
import { D as b, a as g } from "./discount.types-DX82Q6oV.js";
import { c as p } from "./formatting-Zq8WrH0t.js";
import { M as m } from "./merchello-api-DHA5uhZX.js";
var y = Object.defineProperty, D = Object.getOwnPropertyDescriptor, a = (e, i, t, u) => {
  for (var c = u > 1 ? void 0 : u ? D(i, t) : i, r = e.length - 1, h; r >= 0; r--)
    (h = e[r]) && (c = (u ? h(i, t, c) : h(c)) || c);
  return u && c && y(i, t, c), c;
};
let s = class extends f {
  constructor() {
    super(...arguments), this._discountType = l.FixedAmount, this._discountValue = 0, this._discountReason = "", this._isVisibleToCustomer = !1, this._errors = {}, this._orderDiscountMode = "manual", this._discountCode = "", this._selectedCodeDiscountId = "", this._availableCodeDiscounts = [], this._isLoadingCodeDiscounts = !1, this._discountPreview = null, this._isLoadingPreview = !1, this._previewDebounceTimer = null;
  }
  connectedCallback() {
    super.connectedCallback(), this.data?.isOrderDiscount && (this._orderDiscountMode = "code", this._loadAvailableCodeDiscounts()), this.data?.existingDiscount && (this._orderDiscountMode = "manual", this._discountType = this.data.existingDiscount.type, this._discountValue = this.data.existingDiscount.value, this._discountReason = this.data.existingDiscount.reason ?? "", this._isVisibleToCustomer = this.data.existingDiscount.isVisibleToCustomer, this._refreshDiscountPreview());
  }
  disconnectedCallback() {
    super.disconnectedCallback(), this._previewDebounceTimer && clearTimeout(this._previewDebounceTimer);
  }
  async _loadAvailableCodeDiscounts() {
    this._isLoadingCodeDiscounts = !0;
    const { data: e, error: i } = await m.getDiscounts({
      page: 1,
      pageSize: 200,
      status: g.Active,
      method: b.Code
    });
    if (this._isLoadingCodeDiscounts = !1, i || !e) {
      this._availableCodeDiscounts = [];
      return;
    }
    this._availableCodeDiscounts = e.items.filter((t) => !!t.code);
  }
  /**
   * UX validation only.
   * Business rule validation remains in backend.
   */
  _validate() {
    const e = {};
    return (this.data?.isOrderDiscount ?? !0) && this._orderDiscountMode === "code" ? (this._discountCode.trim() || (e.code = "Please enter or select a discount code"), this._errors = e, Object.keys(e).length === 0) : (this._discountValue || (e.value = "Please enter a discount value"), this._errors = e, Object.keys(e).length === 0);
  }
  _handleApply() {
    if (!this._validate()) return;
    if ((this.data?.isOrderDiscount ?? !0) && this._orderDiscountMode === "code") {
      const t = this._availableCodeDiscounts.find((u) => u.id === this._selectedCodeDiscountId);
      this.value = {
        discountCode: this._discountCode.trim(),
        discountName: t?.name ?? null
      }, this.modalContext?.submit();
      return;
    }
    this.value = {
      discount: {
        type: this._discountType,
        value: this._discountValue,
        reason: this._discountReason.trim() || null,
        isVisibleToCustomer: this._isVisibleToCustomer
      }
    }, this.modalContext?.submit();
  }
  _handleCancel() {
    this.modalContext?.reject();
  }
  _getDiscountTypeOptions() {
    return [
      { name: "Fixed amount", value: "0", selected: this._discountType === l.FixedAmount },
      { name: "Percentage", value: "1", selected: this._discountType === l.Percentage }
    ];
  }
  _getCodeDiscountOptions() {
    return [
      { name: "Select active discount...", value: "", selected: this._selectedCodeDiscountId === "" },
      ...this._availableCodeDiscounts.map((e) => ({
        name: e.code ? `${e.name} (${e.code})` : e.name,
        value: e.id,
        selected: e.id === this._selectedCodeDiscountId
      }))
    ];
  }
  /**
   * Get the calculated discount amount from backend preview.
   */
  _getCalculatedDiscount() {
    return this._discountPreview?.discountAmount ?? null;
  }
  /**
   * Refresh discount preview from backend with debouncing.
   */
  _refreshDiscountPreview() {
    if (!this.data || this.data.isOrderDiscount || this._discountValue <= 0) {
      this._discountPreview = null;
      return;
    }
    this._previewDebounceTimer && clearTimeout(this._previewDebounceTimer), this._previewDebounceTimer = setTimeout(async () => {
      this._isLoadingPreview = !0;
      try {
        const { data: e, error: i } = await m.previewDiscount({
          lineItemPrice: this.data.lineItemPrice ?? 0,
          quantity: this.data.lineItemQuantity ?? 1,
          discountType: this._discountType,
          discountValue: this._discountValue,
          currencyCode: this.data.currencyCode
        });
        i ? this._discountPreview = null : e && (this._discountPreview = {
          discountAmount: e.discountAmount
        });
      } catch {
        this._discountPreview = null;
      } finally {
        this._isLoadingPreview = !1;
      }
    }, 300);
  }
  _handleDiscountTypeChange(e) {
    this._discountType = parseInt(e.target.value), this._refreshDiscountPreview();
  }
  _handleDiscountValueChange(e) {
    this._discountValue = parseFloat(e.target.value) || 0, this._refreshDiscountPreview();
  }
  _handleCodeDiscountSelectionChange(e) {
    this._selectedCodeDiscountId = e.target.value;
    const i = this._availableCodeDiscounts.find((t) => t.id === this._selectedCodeDiscountId);
    i?.code && (this._discountCode = i.code, this._errors = { ...this._errors, code: "" });
  }
  _switchOrderDiscountMode(e) {
    this._orderDiscountMode = e, this._errors = {};
  }
  render() {
    const e = this.data?.currencySymbol ?? "$", i = this.data?.isOrderDiscount ?? !0, t = !!this.data?.existingDiscount, u = i && this._orderDiscountMode === "code" && !t;
    return o`
      <umb-body-layout headline=${t ? "Edit discount" : i ? "Add order discount" : "Add line item discount"}>
        <div id="main">
          ${!i && this.data?.lineItemName ? o`
            <div class="context-info">
              <span class="label">Applying discount to:</span>
              <span class="item-name">${this.data.lineItemName}</span>
              ${this.data.lineItemPrice !== void 0 ? o`
                <span class="item-price">
                  ${e}${p(this.data.lineItemPrice, 2)} x ${this.data.lineItemQuantity ?? 1}
                </span>
              ` : d}
            </div>
          ` : d}

          ${i && !t ? o`
            <div class="mode-switch">
              <uui-button
                look=${this._orderDiscountMode === "code" ? "primary" : "secondary"}
                compact
                @click=${() => this._switchOrderDiscountMode("code")}
                label="Apply code">
                Apply code
              </uui-button>
              <uui-button
                look=${this._orderDiscountMode === "manual" ? "primary" : "secondary"}
                compact
                @click=${() => this._switchOrderDiscountMode("manual")}
                label="Manual discount">
                Manual discount
              </uui-button>
            </div>
          ` : d}

          ${u ? o`
            <div class="form-row">
              <label for="existing-discount">Choose active discount</label>
              ${this._isLoadingCodeDiscounts ? o`
                <div class="loading-inline">
                  <uui-loader-circle></uui-loader-circle>
                  <span>Loading discounts...</span>
                </div>
              ` : o`
                <uui-select
                  id="existing-discount"
                  .options=${this._getCodeDiscountOptions()}
                  @change=${this._handleCodeDiscountSelectionChange}
                ></uui-select>
              `}
            </div>

            <div class="form-row">
              <label for="discount-code">Or enter discount code</label>
              <uui-input
                id="discount-code"
                .value=${this._discountCode}
                @input=${(r) => this._discountCode = r.target.value}
                placeholder="e.g. SAVE10"
              ></uui-input>
              ${this._errors.code ? o`<span class="error">${this._errors.code}</span>` : d}
              <span class="helper">Uses the same discount validation and calculation path as checkout.</span>
            </div>
          ` : o`
            <div class="form-row">
              <label for="discount-type">Discount type</label>
              <uui-select
                id="discount-type"
                .options=${this._getDiscountTypeOptions()}
                @change=${this._handleDiscountTypeChange}
              ></uui-select>
            </div>

            <div class="form-row">
              <label for="discount-value">
                Value ${this._discountType === l.Percentage ? "(%)" : i ? "" : "(per unit)"}
              </label>
              <div class="input-with-affix">
                ${this._discountType === l.FixedAmount ? o`<span class="prefix">${e}</span>` : d}
                <uui-input
                  id="discount-value"
                  type="number"
                  .value=${this._discountValue.toString()}
                  @input=${this._handleDiscountValueChange}
                  min="0"
                  step="0.01"
                ></uui-input>
                ${this._discountType === l.Percentage ? o`<span class="suffix">%</span>` : d}
              </div>
              ${this._errors.value ? o`<span class="error">${this._errors.value}</span>` : d}
            </div>

            <div class="form-row">
              <label for="discount-reason">Reason for discount</label>
              <uui-input
                id="discount-reason"
                .value=${this._discountReason}
                @input=${(r) => this._discountReason = r.target.value}
                placeholder="Optional"
              ></uui-input>
            </div>

            <div class="form-row checkbox-row">
              <uui-checkbox
                label="Visible to customer"
                .checked=${this._isVisibleToCustomer}
                @change=${(r) => this._isVisibleToCustomer = r.target.checked}
              >
                Visible to customer
              </uui-checkbox>
            </div>
          `}

          ${!i && this._discountValue > 0 ? o`
            <div class="summary ${this._isLoadingPreview ? "loading" : ""}">
              <div class="summary-row">
                <span>Discount</span>
                <span class="discount-amount">
                  ${this._isLoadingPreview || this._getCalculatedDiscount() === null ? o`<span class="calculating">Calculating...</span>` : o`-${e}${p(this._getCalculatedDiscount(), 2)}`}
                </span>
              </div>
            </div>
          ` : d}
        </div>

        <div slot="actions">
          <uui-button label="Cancel" look="secondary" @click=${this._handleCancel}>
            Cancel
          </uui-button>
          <uui-button label=${t ? "Update" : "Apply"} look="primary" @click=${this._handleApply}>
            ${t ? "Update" : u ? "Apply code" : "Apply discount"}
          </uui-button>
        </div>
      </umb-body-layout>
    `;
  }
};
s.styles = _`
    :host {
      display: block;
    }

    #main {
      display: flex;
      flex-direction: column;
      gap: var(--uui-size-space-4);
    }

    .mode-switch {
      display: flex;
      gap: var(--uui-size-space-2);
      flex-wrap: wrap;
    }

    .context-info {
      background: var(--uui-color-surface-alt);
      border-radius: var(--uui-border-radius);
      padding: var(--uui-size-space-3);
      display: flex;
      flex-direction: column;
      gap: var(--uui-size-space-1);
    }

    .context-info .label {
      font-size: 0.75rem;
      color: var(--uui-color-text-alt);
    }

    .context-info .item-name {
      font-weight: 500;
    }

    .context-info .item-price {
      font-size: 0.875rem;
      color: var(--uui-color-text-alt);
    }

    .form-row {
      display: flex;
      flex-direction: column;
      gap: var(--uui-size-space-1);
    }

    .checkbox-row {
      flex-direction: row;
      align-items: center;
    }

    label {
      font-weight: 500;
      font-size: 0.875rem;
    }

    uui-select {
      width: 100%;
    }

    .input-with-affix {
      display: flex;
      align-items: center;
    }

    .input-with-affix .prefix,
    .input-with-affix .suffix {
      background: var(--uui-color-surface-alt);
      border: 1px solid var(--uui-color-border);
      padding: 0 var(--uui-size-space-3);
      height: 36px;
      display: flex;
      align-items: center;
      color: var(--uui-color-text-alt);
    }

    .input-with-affix .prefix {
      border-right: none;
      border-radius: var(--uui-border-radius) 0 0 var(--uui-border-radius);
    }

    .input-with-affix .suffix {
      border-left: none;
      border-radius: 0 var(--uui-border-radius) var(--uui-border-radius) 0;
    }

    .input-with-affix uui-input {
      flex: 1;
    }

    .summary {
      background: var(--uui-color-surface-alt);
      border-radius: var(--uui-border-radius);
      padding: var(--uui-size-space-3);
    }

    .summary.loading {
      opacity: 0.6;
    }

    .summary-row {
      display: flex;
      justify-content: space-between;
      font-size: 0.875rem;
    }

    .discount-amount {
      font-weight: 600;
      color: var(--uui-color-positive);
    }

    .calculating {
      font-style: italic;
      color: var(--uui-color-text-alt);
      font-weight: normal;
    }

    .loading-inline {
      display: flex;
      align-items: center;
      gap: var(--uui-size-space-2);
      color: var(--uui-color-text-alt);
      font-size: 0.875rem;
      min-height: 36px;
    }

    .helper {
      color: var(--uui-color-text-alt);
      font-size: 0.75rem;
    }

    .error {
      color: var(--uui-color-danger);
      font-size: 0.75rem;
    }

    [slot="actions"] {
      display: flex;
      gap: var(--uui-size-space-2);
      justify-content: flex-end;
    }
  `;
a([
  n()
], s.prototype, "_discountType", 2);
a([
  n()
], s.prototype, "_discountValue", 2);
a([
  n()
], s.prototype, "_discountReason", 2);
a([
  n()
], s.prototype, "_isVisibleToCustomer", 2);
a([
  n()
], s.prototype, "_errors", 2);
a([
  n()
], s.prototype, "_orderDiscountMode", 2);
a([
  n()
], s.prototype, "_discountCode", 2);
a([
  n()
], s.prototype, "_selectedCodeDiscountId", 2);
a([
  n()
], s.prototype, "_availableCodeDiscounts", 2);
a([
  n()
], s.prototype, "_isLoadingCodeDiscounts", 2);
a([
  n()
], s.prototype, "_discountPreview", 2);
a([
  n()
], s.prototype, "_isLoadingPreview", 2);
s = a([
  v("merchello-add-discount-modal")
], s);
const M = s;
export {
  s as MerchelloAddDiscountModalElement,
  M as default
};
//# sourceMappingURL=add-discount-modal.element-ax_U1_a4.js.map
