import { nothing as n, html as u, css as m, state as d, customElement as h } from "@umbraco-cms/backoffice/external/lit";
import { UmbModalBaseElement as v } from "@umbraco-cms/backoffice/modal";
import { c as p } from "./formatting-D9W2VVNu.js";
var _ = Object.defineProperty, f = Object.getOwnPropertyDescriptor, o = (e, t, l, s) => {
  for (var a = s > 1 ? void 0 : s ? f(t, l) : t, i = e.length - 1, c; i >= 0; i--)
    (c = e[i]) && (a = (s ? c(t, l, a) : c(a)) || a);
  return s && a && _(t, l, a), a;
};
let r = class extends v {
  constructor() {
    super(...arguments), this._name = "", this._sku = "", this._price = 0, this._quantity = 1, this._selectedTaxGroupId = null, this._isPhysicalProduct = !0, this._errors = {};
  }
  _validate() {
    const e = {};
    return this._name.trim() || (e.name = "Item name is required"), this._sku.trim() || (e.sku = "SKU is required"), this._price <= 0 && (e.price = "Price must be greater than 0"), this._quantity < 1 && (e.quantity = "Quantity must be at least 1"), this._errors = e, Object.keys(e).length === 0;
  }
  _handleAdd() {
    this._validate() && (this.value = {
      item: {
        name: this._name.trim(),
        sku: this._sku.trim(),
        price: this._price,
        quantity: this._quantity,
        taxGroupId: this._selectedTaxGroupId,
        isPhysicalProduct: this._isPhysicalProduct
      }
    }, this.modalContext?.submit());
  }
  _handleCancel() {
    this.modalContext?.reject();
  }
  _handleTaxGroupChange(e) {
    const t = e.target.value;
    this._selectedTaxGroupId = t === "" ? null : t;
  }
  _getSelectedTaxRate() {
    return this._selectedTaxGroupId ? this.data?.taxGroups?.find((t) => t.id === this._selectedTaxGroupId)?.taxPercentage ?? 0 : 0;
  }
  _getTaxGroupOptions() {
    const e = this.data?.taxGroups ?? [];
    return [
      { name: "Not taxable", value: "", selected: !this._selectedTaxGroupId },
      ...e.map((t) => ({
        name: `${t.name} (${t.taxPercentage}%)`,
        value: t.id,
        selected: this._selectedTaxGroupId === t.id
      }))
    ];
  }
  render() {
    const e = this.data?.currencySymbol ?? "£", t = this._getSelectedTaxRate(), l = this._price * this._quantity, s = l * (t / 100), a = l + s;
    return u`
      <umb-body-layout headline="Add custom item">
        <div id="main">
          <div class="form-row-group">
            <div class="form-row">
              <label for="item-name">Item name</label>
              <uui-input
                id="item-name"
                .value=${this._name}
                @input=${(i) => this._name = i.target.value}
                placeholder="Enter item name"
              ></uui-input>
              ${this._errors.name ? u`<span class="error">${this._errors.name}</span>` : n}
            </div>

            <div class="form-row">
              <label for="item-sku">SKU</label>
              <uui-input
                id="item-sku"
                .value=${this._sku}
                @input=${(i) => this._sku = i.target.value}
                placeholder="Enter SKU"
              ></uui-input>
              ${this._errors.sku ? u`<span class="error">${this._errors.sku}</span>` : n}
            </div>
          </div>

          <div class="form-row-group">
            <div class="form-row">
              <label for="item-price">Price</label>
              <div class="input-with-prefix">
                <span class="prefix">${e}</span>
                <uui-input
                  id="item-price"
                  type="number"
                  .value=${this._price.toString()}
                  @input=${(i) => this._price = parseFloat(i.target.value) || 0}
                  step="0.01"
                  min="0"
                ></uui-input>
              </div>
              ${this._errors.price ? u`<span class="error">${this._errors.price}</span>` : n}
            </div>

            <div class="form-row">
              <label for="item-quantity">Quantity</label>
              <uui-input
                id="item-quantity"
                type="number"
                .value=${this._quantity.toString()}
                @input=${(i) => this._quantity = parseInt(i.target.value) || 1}
                min="1"
              ></uui-input>
              ${this._errors.quantity ? u`<span class="error">${this._errors.quantity}</span>` : n}
            </div>
          </div>

          <div class="form-row">
            <label for="tax-group">Tax</label>
            <uui-select
              id="tax-group"
              .options=${this._getTaxGroupOptions()}
              @change=${this._handleTaxGroupChange}
            ></uui-select>
            ${this._selectedTaxGroupId ? u`
              <span class="tax-info">Tax: ${e}${p(s, 2)} at ${t}%</span>
            ` : n}
          </div>

          <div class="form-row checkbox-row">
            <uui-checkbox
              .checked=${this._isPhysicalProduct}
              @change=${(i) => this._isPhysicalProduct = i.target.checked}
            >
              Item is a physical product
            </uui-checkbox>
          </div>

          ${this._price > 0 ? u`
            <div class="summary">
              <div class="summary-row">
                <span>Subtotal</span>
                <span>${e}${p(l, 2)}</span>
              </div>
              ${this._selectedTaxGroupId ? u`
                <div class="summary-row">
                  <span>Tax (${t}%)</span>
                  <span>${e}${p(s, 2)}</span>
                </div>
              ` : n}
              <div class="summary-row total">
                <span>Total</span>
                <span>${e}${p(a, 2)}</span>
              </div>
            </div>
          ` : n}
        </div>

        <div slot="actions">
          <uui-button label="Cancel" look="secondary" @click=${this._handleCancel}>
            Cancel
          </uui-button>
          <uui-button label="Add item" look="primary" @click=${this._handleAdd}>
            Add item
          </uui-button>
        </div>
      </umb-body-layout>
    `;
  }
};
r.styles = m`
    :host {
      display: block;
    }

    #main {
      display: flex;
      flex-direction: column;
      gap: var(--uui-size-space-4);
    }

    .form-row {
      display: flex;
      flex-direction: column;
      gap: var(--uui-size-space-1);
    }

    .form-row-group {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: var(--uui-size-space-4);
    }

    label {
      font-weight: 500;
      font-size: 0.875rem;
    }

    .input-with-prefix {
      display: flex;
      align-items: center;
    }

    .input-with-prefix .prefix {
      background: var(--uui-color-surface-alt);
      border: 1px solid var(--uui-color-border);
      border-right: none;
      padding: 0 var(--uui-size-space-3);
      height: 36px;
      display: flex;
      align-items: center;
      border-radius: var(--uui-border-radius) 0 0 var(--uui-border-radius);
      color: var(--uui-color-text-alt);
    }

    .input-with-prefix uui-input {
      flex: 1;
    }

    .input-with-prefix uui-input::part(input) {
      border-radius: 0 var(--uui-border-radius) var(--uui-border-radius) 0;
    }

    uui-select {
      width: 100%;
    }

    .tax-info {
      font-size: 0.75rem;
      color: var(--uui-color-text-alt);
      margin-top: var(--uui-size-space-1);
    }

    .checkbox-row {
      flex-direction: row;
      align-items: center;
    }

    .summary {
      background: var(--uui-color-surface-alt);
      border-radius: var(--uui-border-radius);
      padding: var(--uui-size-space-3);
      display: flex;
      flex-direction: column;
      gap: var(--uui-size-space-2);
    }

    .summary-row {
      display: flex;
      justify-content: space-between;
      font-size: 0.875rem;
    }

    .summary-row.total {
      font-weight: 600;
      border-top: 1px solid var(--uui-color-border);
      padding-top: var(--uui-size-space-2);
      margin-top: var(--uui-size-space-1);
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
o([
  d()
], r.prototype, "_name", 2);
o([
  d()
], r.prototype, "_sku", 2);
o([
  d()
], r.prototype, "_price", 2);
o([
  d()
], r.prototype, "_quantity", 2);
o([
  d()
], r.prototype, "_selectedTaxGroupId", 2);
o([
  d()
], r.prototype, "_isPhysicalProduct", 2);
o([
  d()
], r.prototype, "_errors", 2);
r = o([
  h("merchello-add-custom-item-modal")
], r);
const g = r;
export {
  r as MerchelloAddCustomItemModalElement,
  g as default
};
//# sourceMappingURL=add-custom-item-modal.element-JqnVVy6r.js.map
