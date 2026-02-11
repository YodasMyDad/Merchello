import { html, css, nothing } from "@umbraco-cms/backoffice/external/lit";
import { customElement, state } from "@umbraco-cms/backoffice/external/lit";
import { UmbModalBaseElement } from "@umbraco-cms/backoffice/modal";
import { DiscountValueType } from "@orders/types/order.types.js";
import type { AddDiscountModalData, AddDiscountModalValue } from "@orders/modals/add-discount-modal.token.js";
import { DiscountMethod, DiscountStatus, type DiscountListItemDto } from "@discounts/types/discount.types.js";
import { formatNumber } from "@shared/utils/formatting.js";
import { modalLayoutStyles } from "@shared/styles/modal-layout.styles.js";
import { MerchelloApi } from "@api/merchello-api.js";

type OrderDiscountMode = "manual" | "code";

@customElement("merchello-add-discount-modal")
export class MerchelloAddDiscountModalElement extends UmbModalBaseElement<
  AddDiscountModalData,
  AddDiscountModalValue
> {
  @state() private _discountType: DiscountValueType = DiscountValueType.FixedAmount;
  @state() private _discountValue: number = 0;
  @state() private _discountDisplayName: string = "";
  @state() private _discountReason: string = "";
  @state() private _isVisibleToCustomer: boolean = false;
  @state() private _errors: Record<string, string> = {};

  @state() private _orderDiscountMode: OrderDiscountMode = "manual";
  @state() private _discountCode: string = "";
  @state() private _selectedCodeDiscountId: string = "";
  @state() private _availableCodeDiscounts: DiscountListItemDto[] = [];
  @state() private _isLoadingCodeDiscounts: boolean = false;

  // Discount preview state (from backend calculation)
  @state() private _discountPreview: { discountAmount: number } | null = null;
  @state() private _isLoadingPreview: boolean = false;
  private _previewDebounceTimer: ReturnType<typeof setTimeout> | null = null;

  override connectedCallback(): void {
    super.connectedCallback();

    if (this.data?.isOrderDiscount) {
      this._orderDiscountMode = "code";
      this._loadAvailableCodeDiscounts();
    }

    // Pre-fill with existing discount if editing
    if (this.data?.existingDiscount) {
      this._orderDiscountMode = "manual";
      this._discountType = this.data.existingDiscount.type;
      this._discountValue = this.data.existingDiscount.value;
      this._discountDisplayName = this.data.existingDiscount.displayName ?? this.data.existingDiscount.reason ?? "";
      this._discountReason = this.data.existingDiscount.reason ?? "";
      this._isVisibleToCustomer = this.data.existingDiscount.isVisibleToCustomer;
      this._refreshDiscountPreview();
    }
  }

  override disconnectedCallback(): void {
    super.disconnectedCallback();
    if (this._previewDebounceTimer) {
      clearTimeout(this._previewDebounceTimer);
    }
  }

  private async _loadAvailableCodeDiscounts(): Promise<void> {
    this._isLoadingCodeDiscounts = true;
    const { data, error } = await MerchelloApi.getDiscounts({
      page: 1,
      pageSize: 200,
      status: DiscountStatus.Active,
      method: DiscountMethod.Code,
    });
    this._isLoadingCodeDiscounts = false;

    if (error || !data) {
      this._availableCodeDiscounts = [];
      return;
    }

    this._availableCodeDiscounts = data.items.filter((discount) => !!discount.code);
  }

  /**
   * UX validation only.
   * Business rule validation remains in backend.
   */
  private _validate(): boolean {
    const errors: Record<string, string> = {};
    const isOrderDiscount = this.data?.isOrderDiscount ?? true;
    const useCodeMode = isOrderDiscount && this._orderDiscountMode === "code";

    if (useCodeMode) {
      if (!this._discountCode.trim()) {
        errors.code = "Please enter or select a discount code";
      }
      this._errors = errors;
      return Object.keys(errors).length === 0;
    }

    if (!this._discountValue) {
      errors.value = "Please enter a discount value";
    }

    if (!this._discountDisplayName.trim()) {
      errors.displayName = "Please enter a display name";
    }

    this._errors = errors;
    return Object.keys(errors).length === 0;
  }

  private _handleApply(): void {
    if (!this._validate()) return;

    const isOrderDiscount = this.data?.isOrderDiscount ?? true;
    const useCodeMode = isOrderDiscount && this._orderDiscountMode === "code";

    if (useCodeMode) {
      const selectedDiscount = this._availableCodeDiscounts.find((d) => d.id === this._selectedCodeDiscountId);
      this.value = {
        discountCode: this._discountCode.trim(),
        discountName: selectedDiscount?.name ?? null,
      };
      this.modalContext?.submit();
      return;
    }

    this.value = {
      discount: {
        displayName: this._discountDisplayName.trim() || null,
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

  private _getCodeDiscountOptions(): Array<{ name: string; value: string; selected: boolean }> {
    return [
      { name: "Select active discount...", value: "", selected: this._selectedCodeDiscountId === "" },
      ...this._availableCodeDiscounts.map((discount) => ({
        name: discount.code ? `${discount.name} (${discount.code})` : discount.name,
        value: discount.id,
        selected: discount.id === this._selectedCodeDiscountId,
      })),
    ];
  }

  /**
   * Get the calculated discount amount from backend preview.
   */
  private _getCalculatedDiscount(): number | null {
    return this._discountPreview?.discountAmount ?? null;
  }

  /**
   * Refresh discount preview from backend with debouncing.
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
          this._discountPreview = null;
        } else if (data) {
          this._discountPreview = {
            discountAmount: data.discountAmount,
          };
        }
      } catch {
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

  private _handleCodeDiscountSelectionChange(e: Event): void {
    this._selectedCodeDiscountId = (e.target as HTMLSelectElement).value;
    const selected = this._availableCodeDiscounts.find((discount) => discount.id === this._selectedCodeDiscountId);
    if (selected?.code) {
      this._discountCode = selected.code;
      this._errors = { ...this._errors, code: "" };
    }
  }

  private _switchOrderDiscountMode(mode: OrderDiscountMode): void {
    this._orderDiscountMode = mode;
    this._errors = {};
  }

  override render() {
    const currencySymbol = this.data?.currencySymbol ?? "$";
    const isOrderDiscount = this.data?.isOrderDiscount ?? true;
    const isEditing = !!this.data?.existingDiscount;
    const useCodeMode = isOrderDiscount && this._orderDiscountMode === "code" && !isEditing;
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

          ${isOrderDiscount && !isEditing ? html`
            <uui-tab-group class="mode-tabs">
              <uui-tab
                label="Apply code"
                ?active=${this._orderDiscountMode === "code"}
                @click=${() => this._switchOrderDiscountMode("code")}
              >
                Apply code
              </uui-tab>
              <uui-tab
                label="Manual discount"
                ?active=${this._orderDiscountMode === "manual"}
                @click=${() => this._switchOrderDiscountMode("manual")}
              >
                Manual discount
              </uui-tab>
            </uui-tab-group>
          ` : nothing}

          ${useCodeMode ? html`
            <div class="form-row">
              <label for="existing-discount">Choose active discount</label>
              ${this._isLoadingCodeDiscounts ? html`
                <div class="loading-inline">
                  <uui-loader-circle></uui-loader-circle>
                  <span>Loading discounts...</span>
                </div>
              ` : html`
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
                @input=${(e: Event) => (this._discountCode = (e.target as HTMLInputElement).value)}
                placeholder="e.g. SAVE10"
              ></uui-input>
              ${this._errors.code ? html`<span class="error">${this._errors.code}</span>` : nothing}
              <span class="helper">Uses the same discount validation and calculation path as checkout.</span>
            </div>
          ` : html`
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
                Value ${this._discountType === DiscountValueType.Percentage ? "(%)" : !isOrderDiscount ? "(per unit)" : ""}
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
              <label for="discount-display-name">Display name</label>
              <uui-input
                id="discount-display-name"
                .value=${this._discountDisplayName}
                @input=${(e: Event) => (this._discountDisplayName = (e.target as HTMLInputElement).value)}
                placeholder="Shown in order summaries"
              ></uui-input>
              ${this._errors.displayName ? html`<span class="error">${this._errors.displayName}</span>` : nothing}
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
                label="Visible to customer"
                .checked=${this._isVisibleToCustomer}
                @change=${(e: Event) => (this._isVisibleToCustomer = (e.target as HTMLInputElement).checked)}
              >
                Visible to customer
              </uui-checkbox>
            </div>
          `}

          ${!isOrderDiscount && this._discountValue > 0 ? html`
            <div class="summary ${this._isLoadingPreview ? "loading" : ""}">
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
            ${isEditing ? "Update" : useCodeMode ? "Apply code" : "Apply discount"}
          </uui-button>
        </div>
      </umb-body-layout>
    `;
  }

  static override readonly styles = [
    modalLayoutStyles,
    css`
    .mode-tabs {
      display: flex;
      width: 100%;
      --uui-tab-group-background: transparent;
      --uui-tab-background: transparent;
      --uui-tab-text-transform: none;
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
  `,
  ];
}

export default MerchelloAddDiscountModalElement;

declare global {
  interface HTMLElementTagNameMap {
    "merchello-add-discount-modal": MerchelloAddDiscountModalElement;
  }
}
