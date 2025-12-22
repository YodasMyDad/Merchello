import { html, css, nothing } from "@umbraco-cms/backoffice/external/lit";
import { customElement, state } from "@umbraco-cms/backoffice/external/lit";
import { UmbModalBaseElement } from "@umbraco-cms/backoffice/modal";
import { DiscountValueType } from "@orders/types/order.types.js";
import type { AddDiscountModalData, AddDiscountModalValue } from "./add-discount-modal.token.js";
import { formatNumber } from "@shared/utils/formatting.js";
import { MerchelloApi } from "@api/merchello-api.js";

@customElement("merchello-add-discount-modal")
export class MerchelloAddDiscountModalElement extends UmbModalBaseElement<
  AddDiscountModalData,
  AddDiscountModalValue
> {
  @state() private _discountType: DiscountValueType = DiscountValueType.FixedAmount;
  @state() private _discountValue: number = 0;
  @state() private _discountReason: string = "";
  @state() private _isVisibleToCustomer: boolean = false;
  @state() private _errors: Record<string, string> = {};

  // Discount preview state (from backend calculation)
  @state() private _discountPreview: { discountAmount: number } | null = null;
  @state() private _isLoadingPreview: boolean = false;
  private _previewDebounceTimer: ReturnType<typeof setTimeout> | null = null;

  override connectedCallback(): void {
    super.connectedCallback();
    // Pre-fill with existing discount if editing
    if (this.data?.existingDiscount) {
      this._discountType = this.data.existingDiscount.type;
      this._discountValue = this.data.existingDiscount.value;
      this._discountReason = this.data.existingDiscount.reason ?? "";
      this._isVisibleToCustomer = this.data.existingDiscount.isVisibleToCustomer;
      // Trigger preview for existing discount
      this._refreshDiscountPreview();
    }
  }

  override disconnectedCallback(): void {
    super.disconnectedCallback();
    if (this._previewDebounceTimer) {
      clearTimeout(this._previewDebounceTimer);
    }
  }

  /**
   * UX validation only - checks for required fields.
   * Business rule validation (value > 0, percentage <= 100) is handled by backend.
   */
  private _validate(): boolean {
    const errors: Record<string, string> = {};

    // UX: Indicate if no value has been entered
    if (!this._discountValue) {
      errors.value = "Please enter a discount value";
    }

    this._errors = errors;
    return Object.keys(errors).length === 0;
  }

  private _handleApply(): void {
    if (!this._validate()) return;

    this.value = {
      discount: {
        type: this._discountType,
        value: this._discountValue,
        reason: this._discountReason.trim() || null,
        isVisibleToCustomer: this._isVisibleToCustomer,
      },
    };
    this.modalContext?.submit();
  }

  private _handleCancel(): void {
    this.modalContext?.reject();
  }

  private _getDiscountTypeOptions(): Array<{ name: string; value: string; selected: boolean }> {
    return [
      { name: "Fixed amount", value: "0", selected: this._discountType === DiscountValueType.FixedAmount },
      { name: "Percentage", value: "1", selected: this._discountType === DiscountValueType.Percentage },
    ];
  }

  /**
   * Get the calculated discount amount from backend preview.
   * Returns null if no preview is available - UI should show loading indicator.
   * Backend is the single source of truth for discount calculations.
   */
  private _getCalculatedDiscount(): number | null {
    return this._discountPreview?.discountAmount ?? null;
  }

  /**
   * Refresh discount preview from backend with debouncing.
   * This ensures calculations use the centralized backend logic.
   */
  private _refreshDiscountPreview(): void {
    // Only call API for line item discounts (not order discounts)
    if (!this.data || this.data.isOrderDiscount || this._discountValue <= 0) {
      this._discountPreview = null;
      return;
    }

    if (this._previewDebounceTimer) {
      clearTimeout(this._previewDebounceTimer);
    }

    this._previewDebounceTimer = setTimeout(async () => {
      this._isLoadingPreview = true;
      try {
        const { data, error } = await MerchelloApi.previewDiscount({
          lineItemPrice: this.data!.lineItemPrice ?? 0,
          quantity: this.data!.lineItemQuantity ?? 1,
          discountType: this._discountType,
          discountValue: this._discountValue,
          currencyCode: this.data!.currencyCode,
        });

        if (error) {
          console.error("Failed to preview discount:", error);
          // Clear preview - UI will show "Calculating..." until retry succeeds
          this._discountPreview = null;
        } else if (data) {
          this._discountPreview = {
            discountAmount: data.discountAmount,
          };
        }
      } catch (err) {
        console.error("Unexpected error previewing discount:", err);
        this._discountPreview = null;
      } finally {
        this._isLoadingPreview = false;
      }
    }, 300);
  }

  private _handleDiscountTypeChange(e: Event): void {
    this._discountType = parseInt((e.target as HTMLSelectElement).value);
    this._refreshDiscountPreview();
  }

  private _handleDiscountValueChange(e: Event): void {
    this._discountValue = parseFloat((e.target as HTMLInputElement).value) || 0;
    this._refreshDiscountPreview();
  }

  override render() {
    const currencySymbol = this.data?.currencySymbol ?? "£";
    const isOrderDiscount = this.data?.isOrderDiscount ?? true;
    const isEditing = !!this.data?.existingDiscount;
    const headline = isEditing 
      ? "Edit discount" 
      : isOrderDiscount 
        ? "Add order discount" 
        : "Add line item discount";

    return html`
      <umb-body-layout headline=${headline}>
        <div id="main">
          ${!isOrderDiscount && this.data?.lineItemName ? html`
            <div class="context-info">
              <span class="label">Applying discount to:</span>
              <span class="item-name">${this.data.lineItemName}</span>
              ${this.data.lineItemPrice !== undefined ? html`
                <span class="item-price">
                  ${currencySymbol}${formatNumber(this.data.lineItemPrice, 2)} x ${this.data.lineItemQuantity ?? 1}
                </span>
              ` : nothing}
            </div>
          ` : nothing}

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
              Value ${this._discountType === DiscountValueType.Percentage ? "(%)": !isOrderDiscount ? "(per unit)" : ""}
            </label>
            <div class="input-with-affix">
              ${this._discountType === DiscountValueType.FixedAmount
                ? html`<span class="prefix">${currencySymbol}</span>`
                : nothing}
              <uui-input
                id="discount-value"
                type="number"
                .value=${this._discountValue.toString()}
                @input=${this._handleDiscountValueChange}
                min="0"
                step="0.01"
              ></uui-input>
              ${this._discountType === DiscountValueType.Percentage
                ? html`<span class="suffix">%</span>`
                : nothing}
            </div>
            ${this._errors.value ? html`<span class="error">${this._errors.value}</span>` : nothing}
          </div>

          <div class="form-row">
            <label for="discount-reason">Reason for discount</label>
            <uui-input
              id="discount-reason"
              .value=${this._discountReason}
              @input=${(e: Event) => (this._discountReason = (e.target as HTMLInputElement).value)}
              placeholder="Optional"
            ></uui-input>
          </div>

          <div class="form-row checkbox-row">
            <uui-checkbox
              .checked=${this._isVisibleToCustomer}
              @change=${(e: Event) => (this._isVisibleToCustomer = (e.target as HTMLInputElement).checked)}
            >
              Visible to customer
            </uui-checkbox>
          </div>

          ${!isOrderDiscount && this._discountValue > 0 ? html`
            <div class="summary ${this._isLoadingPreview ? 'loading' : ''}">
              <div class="summary-row">
                <span>Discount</span>
                <span class="discount-amount">
                  ${this._isLoadingPreview || this._getCalculatedDiscount() === null
                    ? html`<span class="calculating">Calculating...</span>`
                    : html`-${currencySymbol}${formatNumber(this._getCalculatedDiscount()!, 2)}`}
                </span>
              </div>
            </div>
          ` : nothing}
        </div>

        <div slot="actions">
          <uui-button label="Cancel" look="secondary" @click=${this._handleCancel}>
            Cancel
          </uui-button>
          <uui-button label=${isEditing ? "Update" : "Apply"} look="primary" @click=${this._handleApply}>
            ${isEditing ? "Update" : "Apply discount"}
          </uui-button>
        </div>
      </umb-body-layout>
    `;
  }

  static styles = css`
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
}

export default MerchelloAddDiscountModalElement;

declare global {
  interface HTMLElementTagNameMap {
    "merchello-add-discount-modal": MerchelloAddDiscountModalElement;
  }
}

