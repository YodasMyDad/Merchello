import { nothing as l, html as o, css as p, state as c, customElement as m } from "@umbraco-cms/backoffice/external/lit";
import { UmbModalBaseElement as h } from "@umbraco-cms/backoffice/modal";
var v = Object.defineProperty, x = Object.getOwnPropertyDescriptor, n = (e, i, u, s) => {
  for (var r = s > 1 ? void 0 : s ? x(i, u) : i, d = e.length - 1, t; d >= 0; d--)
    (t = e[d]) && (r = (s ? t(i, u, r) : t(r)) || r);
  return s && r && v(i, u, r), r;
};
let a = class extends h {
  constructor() {
    super(...arguments), this._name = "", this._price = 0, this._quantity = 1, this._selectedTaxGroupId = null, this._isPhysicalProduct = !0, this._errors = {};
  }
  _validate() {
    const e = {};
    return this._name.trim() || (e.name = "Item name is required"), this._price <= 0 && (e.price = "Price must be greater than 0"), this._quantity < 1 && (e.quantity = "Quantity must be at least 1"), this._errors = e, Object.keys(e).length === 0;
  }
  _handleAdd() {
    this._validate() && (this.value = {
      item: {
        name: this._name.trim(),
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
    const e = this.data?.currencySymbol ?? "£", i = this.data?.taxGroups ?? [], u = this._getSelectedTaxRate(), s = this._price * this._quantity, r = s * (u / 100), d = s + r;
    return o`
      <umb-body-layout headline="Add custom item">
        <div id="main">
          <div class="form-row">
            <label for="item-name">Item name</label>
            <uui-input
              id="item-name"
              .value=${this._name}
              @input=${(t) => this._name = t.target.value}
              placeholder="Enter item name"
            ></uui-input>
            ${this._errors.name ? o`<span class="error">${this._errors.name}</span>` : l}
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
              ${this._errors.price ? o`<span class="error">${this._errors.price}</span>` : l}
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
              ${this._errors.quantity ? o`<span class="error">${this._errors.quantity}</span>` : l}
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
      (t) => o`
                  <option value=${t.id}>
                    ${t.name} (${t.taxPercentage}%)
                  </option>
                `
    )}
            </select>
            ${this._selectedTaxGroupId ? o`
              <span class="tax-info">Tax: ${e}${r.toFixed(2)} at ${u}%</span>
            ` : l}
          </div>

          <div class="form-row checkbox-row">
            <uui-checkbox
              .checked=${this._isPhysicalProduct}
              @change=${(t) => this._isPhysicalProduct = t.target.checked}
            >
              Item is a physical product
            </uui-checkbox>
          </div>

          ${this._price > 0 ? o`
            <div class="summary">
              <div class="summary-row">
                <span>Subtotal</span>
                <span>${e}${s.toFixed(2)}</span>
              </div>
              ${this._selectedTaxGroupId ? o`
                <div class="summary-row">
                  <span>Tax (${u}%)</span>
                  <span>${e}${r.toFixed(2)}</span>
                </div>
              ` : l}
              <div class="summary-row total">
                <span>Total</span>
                <span>${e}${d.toFixed(2)}</span>
              </div>
            </div>
          ` : l}
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
n([
  c()
], a.prototype, "_name", 2);
n([
  c()
], a.prototype, "_price", 2);
n([
  c()
], a.prototype, "_quantity", 2);
n([
  c()
], a.prototype, "_selectedTaxGroupId", 2);
n([
  c()
], a.prototype, "_isPhysicalProduct", 2);
n([
  c()
], a.prototype, "_errors", 2);
a = n([
  m("merchello-add-custom-item-modal")
], a);
const b = a;
export {
  a as MerchelloAddCustomItemModalElement,
  b as default
};
//# sourceMappingURL=add-custom-item-modal.element-D9ZCN4o3.js.map
