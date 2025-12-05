import { nothing as n, html as s, css as p, state as d, customElement as m } from "@umbraco-cms/backoffice/external/lit";
import { UmbModalBaseElement as h } from "@umbraco-cms/backoffice/modal";
var v = Object.defineProperty, x = Object.getOwnPropertyDescriptor, u = (e, i, l, o) => {
  for (var r = o > 1 ? void 0 : o ? x(i, l) : i, c = e.length - 1, t; c >= 0; c--)
    (t = e[c]) && (r = (o ? t(i, l, r) : t(r)) || r);
  return o && r && v(i, l, r), r;
};
let a = class extends h {
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
    const i = e.target.value;
    this._selectedTaxGroupId = i === "" ? null : i;
  }
  _getSelectedTaxRate() {
    return this._selectedTaxGroupId ? this.data?.taxGroups?.find((i) => i.id === this._selectedTaxGroupId)?.taxPercentage ?? 0 : 0;
  }
  render() {
    const e = this.data?.currencySymbol ?? "£", i = this.data?.taxGroups ?? [], l = this._getSelectedTaxRate(), o = this._price * this._quantity, r = o * (l / 100), c = o + r;
    return s`
      <umb-body-layout headline="Add custom item">
        <div id="main">
          <div class="form-row-group">
            <div class="form-row">
              <label for="item-name">Item name</label>
              <uui-input
                id="item-name"
                .value=${this._name}
                @input=${(t) => this._name = t.target.value}
                placeholder="Enter item name"
              ></uui-input>
              ${this._errors.name ? s`<span class="error">${this._errors.name}</span>` : n}
            </div>

            <div class="form-row">
              <label for="item-sku">SKU</label>
              <uui-input
                id="item-sku"
                .value=${this._sku}
                @input=${(t) => this._sku = t.target.value}
                placeholder="Enter SKU"
              ></uui-input>
              ${this._errors.sku ? s`<span class="error">${this._errors.sku}</span>` : n}
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
                  @input=${(t) => this._price = parseFloat(t.target.value) || 0}
                  step="0.01"
                  min="0"
                ></uui-input>
              </div>
              ${this._errors.price ? s`<span class="error">${this._errors.price}</span>` : n}
            </div>

            <div class="form-row">
              <label for="item-quantity">Quantity</label>
              <uui-input
                id="item-quantity"
                type="number"
                .value=${this._quantity.toString()}
                @input=${(t) => this._quantity = parseInt(t.target.value) || 1}
                min="1"
              ></uui-input>
              ${this._errors.quantity ? s`<span class="error">${this._errors.quantity}</span>` : n}
            </div>
          </div>

          <div class="form-row">
            <label for="tax-group">Tax</label>
            <select
              id="tax-group"
              class="tax-select"
              .value=${this._selectedTaxGroupId ?? ""}
              @change=${this._handleTaxGroupChange}
            >
              <option value="">Not taxable</option>
              ${i.map(
      (t) => s`
                  <option value=${t.id}>
                    ${t.name} (${t.taxPercentage}%)
                  </option>
                `
    )}
            </select>
            ${this._selectedTaxGroupId ? s`
              <span class="tax-info">Tax: ${e}${r.toFixed(2)} at ${l}%</span>
            ` : n}
          </div>

          <div class="form-row checkbox-row">
            <uui-checkbox
              .checked=${this._isPhysicalProduct}
              @change=${(t) => this._isPhysicalProduct = t.target.checked}
            >
              Item is a physical product
            </uui-checkbox>
          </div>

          ${this._price > 0 ? s`
            <div class="summary">
              <div class="summary-row">
                <span>Subtotal</span>
                <span>${e}${o.toFixed(2)}</span>
              </div>
              ${this._selectedTaxGroupId ? s`
                <div class="summary-row">
                  <span>Tax (${l}%)</span>
                  <span>${e}${r.toFixed(2)}</span>
                </div>
              ` : n}
              <div class="summary-row total">
                <span>Total</span>
                <span>${e}${c.toFixed(2)}</span>
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
a.styles = p`
    #main {
      padding: var(--uui-size-space-4);
      display: flex;
      flex-direction: column;
      gap: var(--uui-size-space-4);
      min-width: 350px;
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

    .tax-select {
      width: 100%;
      padding: var(--uui-size-space-2) var(--uui-size-space-3);
      border: 1px solid var(--uui-color-border);
      border-radius: var(--uui-border-radius);
      background: var(--uui-color-surface);
      font-size: 0.875rem;
      color: var(--uui-color-text);
      cursor: pointer;
    }

    .tax-select:focus {
      outline: none;
      border-color: var(--uui-color-interactive);
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
u([
  d()
], a.prototype, "_name", 2);
u([
  d()
], a.prototype, "_sku", 2);
u([
  d()
], a.prototype, "_price", 2);
u([
  d()
], a.prototype, "_quantity", 2);
u([
  d()
], a.prototype, "_selectedTaxGroupId", 2);
u([
  d()
], a.prototype, "_isPhysicalProduct", 2);
u([
  d()
], a.prototype, "_errors", 2);
a = u([
  m("merchello-add-custom-item-modal")
], a);
const b = a;
export {
  a as MerchelloAddCustomItemModalElement,
  b as default
};
//# sourceMappingURL=add-custom-item-modal.element-C5i5Mx4Q.js.map
