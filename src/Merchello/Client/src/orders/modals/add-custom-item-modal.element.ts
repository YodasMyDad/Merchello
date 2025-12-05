import { html, css, nothing } from "@umbraco-cms/backoffice/external/lit";
import { customElement, state } from "@umbraco-cms/backoffice/external/lit";
import { UmbModalBaseElement } from "@umbraco-cms/backoffice/modal";
import type { AddCustomItemModalData, AddCustomItemModalValue } from "./add-custom-item-modal.token.js";

@customElement("merchello-add-custom-item-modal")
export class MerchelloAddCustomItemModalElement extends UmbModalBaseElement<
  AddCustomItemModalData,
  AddCustomItemModalValue
> {
  @state() private _name: string = "";
  @state() private _sku: string = "";
  @state() private _price: number = 0;
  @state() private _quantity: number = 1;
  @state() private _selectedTaxGroupId: string | null = null;
  @state() private _isPhysicalProduct: boolean = true;
  @state() private _errors: Record<string, string> = {};

  private _validate(): boolean {
    const errors: Record<string, string> = {};

    if (!this._name.trim()) {
      errors.name = "Item name is required";
    }

    if (!this._sku.trim()) {
      errors.sku = "SKU is required";
    }

    if (this._price <= 0) {
      errors.price = "Price must be greater than 0";
    }

    if (this._quantity < 1) {
      errors.quantity = "Quantity must be at least 1";
    }

    this._errors = errors;
    return Object.keys(errors).length === 0;
  }

  private _handleAdd(): void {
    if (!this._validate()) return;

    this.value = {
      item: {
        name: this._name.trim(),
        sku: this._sku.trim(),
        price: this._price,
        quantity: this._quantity,
        taxGroupId: this._selectedTaxGroupId,
        isPhysicalProduct: this._isPhysicalProduct,
      },
    };
    this.modalContext?.submit();
  }

  private _handleCancel(): void {
    this.modalContext?.reject();
  }

  private _handleTaxGroupChange(e: Event): void {
    const value = (e.target as HTMLSelectElement).value;
    this._selectedTaxGroupId = value === "" ? null : value;
  }

  private _getSelectedTaxRate(): number {
    if (!this._selectedTaxGroupId) return 0;
    const taxGroup = this.data?.taxGroups?.find(tg => tg.id === this._selectedTaxGroupId);
    return taxGroup?.taxPercentage ?? 0;
  }

  render() {
    const currencySymbol = this.data?.currencySymbol ?? "£";
    const taxGroups = this.data?.taxGroups ?? [];
    const selectedTaxRate = this._getSelectedTaxRate();
    const subtotal = this._price * this._quantity;
    const taxAmount = subtotal * (selectedTaxRate / 100);
    const total = subtotal + taxAmount;

    return html`
      <umb-body-layout headline="Add custom item">
        <div id="main">
          <div class="form-row-group">
            <div class="form-row">
              <label for="item-name">Item name</label>
              <uui-input
                id="item-name"
                .value=${this._name}
                @input=${(e: Event) => (this._name = (e.target as HTMLInputElement).value)}
                placeholder="Enter item name"
              ></uui-input>
              ${this._errors.name ? html`<span class="error">${this._errors.name}</span>` : nothing}
            </div>

            <div class="form-row">
              <label for="item-sku">SKU</label>
              <uui-input
                id="item-sku"
                .value=${this._sku}
                @input=${(e: Event) => (this._sku = (e.target as HTMLInputElement).value)}
                placeholder="Enter SKU"
              ></uui-input>
              ${this._errors.sku ? html`<span class="error">${this._errors.sku}</span>` : nothing}
            </div>
          </div>

          <div class="form-row-group">
            <div class="form-row">
              <label for="item-price">Price</label>
              <div class="input-with-prefix">
                <span class="prefix">${currencySymbol}</span>
                <uui-input
                  id="item-price"
                  type="number"
                  .value=${this._price.toString()}
                  @input=${(e: Event) => (this._price = parseFloat((e.target as HTMLInputElement).value) || 0)}
                  step="0.01"
                  min="0"
                ></uui-input>
              </div>
              ${this._errors.price ? html`<span class="error">${this._errors.price}</span>` : nothing}
            </div>

            <div class="form-row">
              <label for="item-quantity">Quantity</label>
              <uui-input
                id="item-quantity"
                type="number"
                .value=${this._quantity.toString()}
                @input=${(e: Event) => (this._quantity = parseInt((e.target as HTMLInputElement).value) || 1)}
                min="1"
              ></uui-input>
              ${this._errors.quantity ? html`<span class="error">${this._errors.quantity}</span>` : nothing}
            </div>
          </div>

          <div class="form-row">
            <label for="tax-group">Tax</label>
            <uui-select
              id="tax-group"
              .value=${this._selectedTaxGroupId ?? ""}
              @change=${this._handleTaxGroupChange}
            >
              <option value="">Not taxable</option>
              ${taxGroups.map(
                (tg) => html`
                  <option value=${tg.id}>
                    ${tg.name} (${tg.taxPercentage}%)
                  </option>
                `
              )}
            </uui-select>
            ${this._selectedTaxGroupId ? html`
              <span class="tax-info">Tax: ${currencySymbol}${taxAmount.toFixed(2)} at ${selectedTaxRate}%</span>
            ` : nothing}
          </div>

          <div class="form-row checkbox-row">
            <uui-checkbox
              .checked=${this._isPhysicalProduct}
              @change=${(e: Event) => (this._isPhysicalProduct = (e.target as HTMLInputElement).checked)}
            >
              Item is a physical product
            </uui-checkbox>
          </div>

          ${this._price > 0 ? html`
            <div class="summary">
              <div class="summary-row">
                <span>Subtotal</span>
                <span>${currencySymbol}${subtotal.toFixed(2)}</span>
              </div>
              ${this._selectedTaxGroupId ? html`
                <div class="summary-row">
                  <span>Tax (${selectedTaxRate}%)</span>
                  <span>${currencySymbol}${taxAmount.toFixed(2)}</span>
                </div>
              ` : nothing}
              <div class="summary-row total">
                <span>Total</span>
                <span>${currencySymbol}${total.toFixed(2)}</span>
              </div>
            </div>
          ` : nothing}
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

  static styles = css`
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
}

export default MerchelloAddCustomItemModalElement;

declare global {
  interface HTMLElementTagNameMap {
    "merchello-add-custom-item-modal": MerchelloAddCustomItemModalElement;
  }
}
