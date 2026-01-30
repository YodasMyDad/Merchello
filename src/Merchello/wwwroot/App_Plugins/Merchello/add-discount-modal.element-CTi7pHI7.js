import { nothing as r, html as o, css as m, state as u, customElement as f } from "@umbraco-cms/backoffice/external/lit";
import { UmbModalBaseElement as v } from "@umbraco-cms/backoffice/modal";
import { D as l } from "./order.types-_6ggCmi6.js";
import { c as h } from "./formatting-CeWY__1B.js";
import { M as _ } from "./merchello-api-LENiBVrz.js";
var y = Object.defineProperty, b = Object.getOwnPropertyDescriptor, a = (e, i, n, c) => {
  for (var t = c > 1 ? void 0 : c ? b(i, n) : i, d = e.length - 1, p; d >= 0; d--)
    (p = e[d]) && (t = (c ? p(i, n, t) : p(t)) || t);
  return c && t && y(i, n, t), t;
};
let s = class extends v {
  constructor() {
    super(...arguments), this._discountType = l.FixedAmount, this._discountValue = 0, this._discountReason = "", this._isVisibleToCustomer = !1, this._errors = {}, this._discountPreview = null, this._isLoadingPreview = !1, this._previewDebounceTimer = null;
  }
  connectedCallback() {
    super.connectedCallback(), this.data?.existingDiscount && (this._discountType = this.data.existingDiscount.type, this._discountValue = this.data.existingDiscount.value, this._discountReason = this.data.existingDiscount.reason ?? "", this._isVisibleToCustomer = this.data.existingDiscount.isVisibleToCustomer, this._refreshDiscountPreview());
  }
  disconnectedCallback() {
    super.disconnectedCallback(), this._previewDebounceTimer && clearTimeout(this._previewDebounceTimer);
  }
  /**
   * UX validation only - checks for required fields.
   * Business rule validation (value > 0, percentage <= 100) is handled by backend.
   */
  _validate() {
    const e = {};
    return this._discountValue || (e.value = "Please enter a discount value"), this._errors = e, Object.keys(e).length === 0;
  }
  _handleApply() {
    this._validate() && (this.value = {
      discount: {
        type: this._discountType,
        value: this._discountValue,
        reason: this._discountReason.trim() || null,
        isVisibleToCustomer: this._isVisibleToCustomer
      }
    }, this.modalContext?.submit());
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
  /**
   * Get the calculated discount amount from backend preview.
   * Returns null if no preview is available - UI should show loading indicator.
   * Backend is the single source of truth for discount calculations.
   */
  _getCalculatedDiscount() {
    return this._discountPreview?.discountAmount ?? null;
  }
  /**
   * Refresh discount preview from backend with debouncing.
   * This ensures calculations use the centralized backend logic.
   */
  _refreshDiscountPreview() {
    if (!this.data || this.data.isOrderDiscount || this._discountValue <= 0) {
      this._discountPreview = null;
      return;
    }
    this._previewDebounceTimer && clearTimeout(this._previewDebounceTimer), this._previewDebounceTimer = setTimeout(async () => {
      this._isLoadingPreview = !0;
      try {
        const { data: e, error: i } = await _.previewDiscount({
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
  render() {
    const e = this.data?.currencySymbol ?? "£", i = this.data?.isOrderDiscount ?? !0, n = !!this.data?.existingDiscount;
    return o`
      <umb-body-layout headline=${n ? "Edit discount" : i ? "Add order discount" : "Add line item discount"}>
        <div id="main">
          ${!i && this.data?.lineItemName ? o`
            <div class="context-info">
              <span class="label">Applying discount to:</span>
              <span class="item-name">${this.data.lineItemName}</span>
              ${this.data.lineItemPrice !== void 0 ? o`
                <span class="item-price">
                  ${e}${h(this.data.lineItemPrice, 2)} x ${this.data.lineItemQuantity ?? 1}
                </span>
              ` : r}
            </div>
          ` : r}

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
              ${this._discountType === l.FixedAmount ? o`<span class="prefix">${e}</span>` : r}
              <uui-input
                id="discount-value"
                type="number"
                .value=${this._discountValue.toString()}
                @input=${this._handleDiscountValueChange}
                min="0"
                step="0.01"
              ></uui-input>
              ${this._discountType === l.Percentage ? o`<span class="suffix">%</span>` : r}
            </div>
            ${this._errors.value ? o`<span class="error">${this._errors.value}</span>` : r}
          </div>

          <div class="form-row">
            <label for="discount-reason">Reason for discount</label>
            <uui-input
              id="discount-reason"
              .value=${this._discountReason}
              @input=${(t) => this._discountReason = t.target.value}
              placeholder="Optional"
            ></uui-input>
          </div>

          <div class="form-row checkbox-row">
            <uui-checkbox
              .checked=${this._isVisibleToCustomer}
              @change=${(t) => this._isVisibleToCustomer = t.target.checked}
            >
              Visible to customer
            </uui-checkbox>
          </div>

          ${!i && this._discountValue > 0 ? o`
            <div class="summary ${this._isLoadingPreview ? "loading" : ""}">
              <div class="summary-row">
                <span>Discount</span>
                <span class="discount-amount">
                  ${this._isLoadingPreview || this._getCalculatedDiscount() === null ? o`<span class="calculating">Calculating...</span>` : o`-${e}${h(this._getCalculatedDiscount(), 2)}`}
                </span>
              </div>
            </div>
          ` : r}
        </div>

        <div slot="actions">
          <uui-button label="Cancel" look="secondary" @click=${this._handleCancel}>
            Cancel
          </uui-button>
          <uui-button label=${n ? "Update" : "Apply"} look="primary" @click=${this._handleApply}>
            ${n ? "Update" : "Apply discount"}
          </uui-button>
        </div>
      </umb-body-layout>
    `;
  }
};
s.styles = m`
    :host {
      display: block;
    }

    #main {
      display: flex;
      flex-direction: column;
      gap: var(--uui-size-space-4);
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
  u()
], s.prototype, "_discountType", 2);
a([
  u()
], s.prototype, "_discountValue", 2);
a([
  u()
], s.prototype, "_discountReason", 2);
a([
  u()
], s.prototype, "_isVisibleToCustomer", 2);
a([
  u()
], s.prototype, "_errors", 2);
a([
  u()
], s.prototype, "_discountPreview", 2);
a([
  u()
], s.prototype, "_isLoadingPreview", 2);
s = a([
  f("merchello-add-discount-modal")
], s);
const P = s;
export {
  s as MerchelloAddDiscountModalElement,
  P as default
};
//# sourceMappingURL=add-discount-modal.element-CTi7pHI7.js.map
