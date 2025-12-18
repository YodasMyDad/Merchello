import { nothing as u, html as n, css as h, state as c, customElement as m } from "@umbraco-cms/backoffice/external/lit";
import { UmbModalBaseElement as f } from "@umbraco-cms/backoffice/modal";
import { D as o } from "./order.types-vEwMhKjb.js";
var v = Object.defineProperty, b = Object.getOwnPropertyDescriptor, r = (i, t, a, l) => {
  for (var e = l > 1 ? void 0 : l ? b(t, a) : t, d = i.length - 1, p; d >= 0; d--)
    (p = i[d]) && (e = (l ? p(t, a, e) : p(e)) || e);
  return l && e && v(t, a, e), e;
};
let s = class extends f {
  constructor() {
    super(...arguments), this._discountType = o.FixedAmount, this._discountValue = 0, this._discountReason = "", this._isVisibleToCustomer = !1, this._errors = {};
  }
  connectedCallback() {
    super.connectedCallback(), this.data?.existingDiscount && (this._discountType = this.data.existingDiscount.type, this._discountValue = this.data.existingDiscount.value, this._discountReason = this.data.existingDiscount.reason ?? "", this._isVisibleToCustomer = this.data.existingDiscount.isVisibleToCustomer);
  }
  _validate() {
    const i = {};
    return this._discountValue <= 0 && (i.value = "Discount value must be greater than 0"), this._discountType === o.Percentage && this._discountValue > 100 && (i.value = "Percentage cannot exceed 100%"), this._errors = i, Object.keys(i).length === 0;
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
      { name: "Fixed amount", value: "0", selected: this._discountType === o.FixedAmount },
      { name: "Percentage", value: "1", selected: this._discountType === o.Percentage }
    ];
  }
  _getCalculatedDiscount() {
    if (!this.data || this.data.isOrderDiscount) return 0;
    const i = (this.data.lineItemPrice ?? 0) * (this.data.lineItemQuantity ?? 1);
    return this._discountType === o.FixedAmount ? Math.min(this._discountValue * (this.data.lineItemQuantity ?? 1), i) : i * (this._discountValue / 100);
  }
  render() {
    const i = this.data?.currencySymbol ?? "£", t = this.data?.isOrderDiscount ?? !0, a = !!this.data?.existingDiscount;
    return n`
      <umb-body-layout headline=${a ? "Edit discount" : t ? "Add order discount" : "Add line item discount"}>
        <div id="main">
          ${!t && this.data?.lineItemName ? n`
            <div class="context-info">
              <span class="label">Applying discount to:</span>
              <span class="item-name">${this.data.lineItemName}</span>
              ${this.data.lineItemPrice !== void 0 ? n`
                <span class="item-price">
                  ${i}${this.data.lineItemPrice.toFixed(2)} x ${this.data.lineItemQuantity ?? 1}
                </span>
              ` : u}
            </div>
          ` : u}

          <div class="form-row">
            <label for="discount-type">Discount type</label>
            <uui-select
              id="discount-type"
              .options=${this._getDiscountTypeOptions()}
              @change=${(e) => this._discountType = parseInt(e.target.value)}
            ></uui-select>
          </div>

          <div class="form-row">
            <label for="discount-value">
              Value ${this._discountType === o.Percentage ? "(%)" : t ? "" : "(per unit)"}
            </label>
            <div class="input-with-affix">
              ${this._discountType === o.FixedAmount ? n`<span class="prefix">${i}</span>` : u}
              <uui-input
                id="discount-value"
                type="number"
                .value=${this._discountValue.toString()}
                @input=${(e) => this._discountValue = parseFloat(e.target.value) || 0}
                min="0"
                step="0.01"
              ></uui-input>
              ${this._discountType === o.Percentage ? n`<span class="suffix">%</span>` : u}
            </div>
            ${this._errors.value ? n`<span class="error">${this._errors.value}</span>` : u}
          </div>

          <div class="form-row">
            <label for="discount-reason">Reason for discount</label>
            <uui-input
              id="discount-reason"
              .value=${this._discountReason}
              @input=${(e) => this._discountReason = e.target.value}
              placeholder="Optional"
            ></uui-input>
          </div>

          <div class="form-row checkbox-row">
            <uui-checkbox
              .checked=${this._isVisibleToCustomer}
              @change=${(e) => this._isVisibleToCustomer = e.target.checked}
            >
              Visible to customer
            </uui-checkbox>
          </div>

          ${!t && this._discountValue > 0 ? n`
            <div class="summary">
              <div class="summary-row">
                <span>Discount</span>
                <span class="discount-amount">
                  -${i}${this._getCalculatedDiscount().toFixed(2)}
                </span>
              </div>
            </div>
          ` : u}
        </div>

        <div slot="actions">
          <uui-button label="Cancel" look="secondary" @click=${this._handleCancel}>
            Cancel
          </uui-button>
          <uui-button label=${a ? "Update" : "Apply"} look="primary" @click=${this._handleApply}>
            ${a ? "Update" : "Apply discount"}
          </uui-button>
        </div>
      </umb-body-layout>
    `;
  }
};
s.styles = h`
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

    .summary-row {
      display: flex;
      justify-content: space-between;
      font-size: 0.875rem;
    }

    .discount-amount {
      font-weight: 600;
      color: var(--uui-color-positive);
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
r([
  c()
], s.prototype, "_discountType", 2);
r([
  c()
], s.prototype, "_discountValue", 2);
r([
  c()
], s.prototype, "_discountReason", 2);
r([
  c()
], s.prototype, "_isVisibleToCustomer", 2);
r([
  c()
], s.prototype, "_errors", 2);
s = r([
  m("merchello-add-discount-modal")
], s);
const g = s;
export {
  s as MerchelloAddDiscountModalElement,
  g as default
};
//# sourceMappingURL=add-discount-modal.element-DLZoshMu.js.map
