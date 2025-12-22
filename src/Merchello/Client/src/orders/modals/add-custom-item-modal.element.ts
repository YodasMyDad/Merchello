import { html, css, nothing } from "@umbraco-cms/backoffice/external/lit";
import { customElement, state } from "@umbraco-cms/backoffice/external/lit";
import { UmbModalBaseElement } from "@umbraco-cms/backoffice/modal";
import type { AddCustomItemModalData, AddCustomItemModalValue } from "./add-custom-item-modal.token.js";
import { formatNumber } from "@shared/utils/formatting.js";
import { MerchelloApi } from "@api/merchello-api.js";
import type { WarehouseListDto, WarehouseShippingOptionDto } from "@warehouses/types/warehouses.types.js";

type ModalStep = "details" | "shipping";

@customElement("merchello-add-custom-item-modal")
export class MerchelloAddCustomItemModalElement extends UmbModalBaseElement<
  AddCustomItemModalData,
  AddCustomItemModalValue
> {
  // Details step state
  @state() private _name: string = "";
  @state() private _sku: string = "";
  @state() private _price: number = 0;
  @state() private _quantity: number = 1;
  @state() private _selectedTaxGroupId: string | null = null;
  @state() private _isPhysicalProduct: boolean = true;
  @state() private _errors: Record<string, string> = {};

  // Tax preview state (from backend calculation)
  @state() private _taxPreview: { subtotal: number; taxRate: number; taxAmount: number; total: number } | null = null;
  @state() private _isLoadingTaxPreview: boolean = false;
  private _taxPreviewDebounceTimer: ReturnType<typeof setTimeout> | null = null;

  // Multi-step state
  @state() private _step: ModalStep = "details";

  // Shipping step state
  @state() private _warehouses: WarehouseListDto[] = [];
  @state() private _isLoadingWarehouses: boolean = false;
  @state() private _selectedWarehouseId: string | null = null;
  @state() private _shippingOptions: WarehouseShippingOptionDto[] = [];
  @state() private _isLoadingShippingOptions: boolean = false;
  @state() private _selectedShippingOptionId: string | null = null;
  @state() private _shippingError: string | null = null;

  override disconnectedCallback(): void {
    super.disconnectedCallback();
    if (this._taxPreviewDebounceTimer) {
      clearTimeout(this._taxPreviewDebounceTimer);
    }
  }

  /**
   * UX validation only - checks for required fields.
   * Business rule validation (price > 0, quantity >= 1) is handled by backend.
   */
  private _validateDetails(): boolean {
    const errors: Record<string, string> = {};

    // UX: Required field indicators
    if (!this._name.trim()) {
      errors.name = "Item name is required";
    }

    if (!this._sku.trim()) {
      errors.sku = "SKU is required";
    }

    // Note: Business rules for price and quantity are validated by backend

    this._errors = errors;
    return Object.keys(errors).length === 0;
  }

  private _validateShipping(): boolean {
    if (!this._selectedWarehouseId) {
      this._shippingError = "Please select a warehouse";
      return false;
    }
    if (!this._selectedShippingOptionId) {
      this._shippingError = "Please select a shipping option";
      return false;
    }
    this._shippingError = null;
    return true;
  }

  private async _loadWarehouses(): Promise<void> {
    this._isLoadingWarehouses = true;
    try {
      const { data, error } = await MerchelloApi.getWarehousesList();
      if (error) {
        console.error("Failed to load warehouses:", error);
        this._warehouses = [];
      } else {
        this._warehouses = data ?? [];
      }
    } catch (error) {
      console.error("Failed to load warehouses:", error);
      this._warehouses = [];
    } finally {
      this._isLoadingWarehouses = false;
    }
  }

  private async _loadShippingOptions(): Promise<void> {
    if (!this._selectedWarehouseId) return;

    const destination = this.data?.shippingDestination;
    if (!destination?.countryCode) {
      this._shippingError = "No shipping destination configured for this order";
      return;
    }

    this._isLoadingShippingOptions = true;
    this._shippingOptions = [];
    this._selectedShippingOptionId = null;
    this._shippingError = null;

    try {
      const { data, error } = await MerchelloApi.getShippingOptionsForWarehouse(
        this._selectedWarehouseId,
        destination.countryCode,
        destination.stateCode
      );

      if (error || !data) {
        console.error("Failed to load shipping options:", error);
        this._shippingError = "Failed to load shipping options";
        return;
      }

      if (!data.canShipToDestination) {
        this._shippingError = data.message ?? "This warehouse cannot ship to the order destination";
        return;
      }

      this._shippingOptions = data.availableOptions;
      if (this._shippingOptions.length === 0) {
        this._shippingError = "No shipping options available for this destination";
      } else if (this._shippingOptions.length === 1) {
        // Auto-select if only one option
        this._selectedShippingOptionId = this._shippingOptions[0].id;
      }
    } catch (error) {
      console.error("Failed to load shipping options:", error);
      this._shippingError = "Failed to load shipping options";
    } finally {
      this._isLoadingShippingOptions = false;
    }
  }

  private async _handleContinueToShipping(): Promise<void> {
    if (!this._validateDetails()) return;

    // Load warehouses if not already loaded
    if (this._warehouses.length === 0) {
      await this._loadWarehouses();
    }

    this._step = "shipping";
  }

  private _handleBackToDetails(): void {
    this._step = "details";
    this._shippingError = null;
  }

  private async _handleWarehouseChange(e: Event): Promise<void> {
    const value = (e.target as HTMLSelectElement).value;
    this._selectedWarehouseId = value || null;
    this._shippingError = null;

    if (this._selectedWarehouseId) {
      await this._loadShippingOptions();
    } else {
      this._shippingOptions = [];
      this._selectedShippingOptionId = null;
    }
  }

  private _handleShippingOptionChange(e: Event): void {
    const value = (e.target as HTMLSelectElement).value;
    this._selectedShippingOptionId = value || null;
    if (this._selectedShippingOptionId) {
      this._shippingError = null;
    }
  }

  private _handleAdd(): void {
    // For non-physical products, validate and add directly
    if (!this._isPhysicalProduct) {
      if (!this._validateDetails()) return;
      this._submitItem();
      return;
    }

    // For physical products on details step, move to shipping step
    if (this._step === "details") {
      this._handleContinueToShipping();
      return;
    }

    // For physical products on shipping step, validate shipping and add
    if (!this._validateShipping()) return;
    this._submitItem();
  }

  private _submitItem(): void {
    const selectedWarehouse = this._warehouses.find(w => w.id === this._selectedWarehouseId);
    const selectedShippingOption = this._shippingOptions.find(o => o.id === this._selectedShippingOptionId);

    this.value = {
      item: {
        name: this._name.trim(),
        sku: this._sku.trim(),
        price: this._price,
        quantity: this._quantity,
        taxGroupId: this._selectedTaxGroupId,
        isPhysicalProduct: this._isPhysicalProduct,
        warehouseId: this._isPhysicalProduct ? this._selectedWarehouseId ?? undefined : undefined,
        warehouseName: this._isPhysicalProduct ? selectedWarehouse?.name ?? undefined : undefined,
        shippingOptionId: this._isPhysicalProduct ? this._selectedShippingOptionId ?? undefined : undefined,
        shippingOptionName: this._isPhysicalProduct ? selectedShippingOption?.name ?? undefined : undefined,
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
    this._refreshTaxPreview();
  }

  private _handlePriceInput(e: Event): void {
    this._price = parseFloat((e.target as HTMLInputElement).value) || 0;
    this._refreshTaxPreview();
  }

  private _handleQuantityInput(e: Event): void {
    this._quantity = parseInt((e.target as HTMLInputElement).value) || 1;
    this._refreshTaxPreview();
  }

  /**
   * Refresh tax preview from backend with debouncing.
   * This ensures calculations use the centralized backend logic.
   */
  private _refreshTaxPreview(): void {
    if (this._taxPreviewDebounceTimer) {
      clearTimeout(this._taxPreviewDebounceTimer);
    }

    this._taxPreviewDebounceTimer = setTimeout(async () => {
      this._isLoadingTaxPreview = true;
      try {
        const { data, error } = await MerchelloApi.previewCustomItemTax({
          price: this._price,
          quantity: this._quantity,
          taxGroupId: this._selectedTaxGroupId,
        });

        if (error) {
          console.error("Failed to preview tax:", error);
          // Fall back to local calculation on error
          this._taxPreview = null;
        } else if (data) {
          this._taxPreview = {
            subtotal: data.subtotal,
            taxRate: data.taxRate,
            taxAmount: data.taxAmount,
            total: data.total,
          };
        }
      } catch (err) {
        console.error("Unexpected error previewing tax:", err);
        this._taxPreview = null;
      } finally {
        this._isLoadingTaxPreview = false;
      }
    }, 300);
  }

  private _getTaxGroupOptions(): Array<{ name: string; value: string; selected: boolean }> {
    const taxGroups = this.data?.taxGroups ?? [];
    return [
      { name: "Not taxable", value: "", selected: !this._selectedTaxGroupId },
      ...taxGroups.map(tg => ({
        name: `${tg.name} (${tg.taxPercentage}%)`,
        value: tg.id,
        selected: this._selectedTaxGroupId === tg.id
      }))
    ];
  }

  override render() {
    const headline = this._step === "details"
      ? "Add custom item"
      : "Select shipping";

    return html`
      <umb-body-layout headline=${headline}>
        <div id="main">
          ${this._step === "details" ? this._renderDetailsStep() : this._renderShippingStep()}
        </div>
        ${this._renderActions()}
      </umb-body-layout>
    `;
  }

  private _renderDetailsStep() {
    const currencySymbol = this.data?.currencySymbol ?? "£";

    // Use ONLY backend preview values - no local calculations
    const hasTaxPreview = this._taxPreview !== null;
    const taxRate = this._taxPreview?.taxRate;
    const subtotal = this._taxPreview?.subtotal;
    const taxAmount = this._taxPreview?.taxAmount;
    const total = this._taxPreview?.total;

    return html`
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
              @input=${this._handlePriceInput}
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
            @input=${this._handleQuantityInput}
            min="1"
          ></uui-input>
          ${this._errors.quantity ? html`<span class="error">${this._errors.quantity}</span>` : nothing}
        </div>
      </div>

      <div class="form-row">
        <label for="tax-group">Tax</label>
        <uui-select
          id="tax-group"
          .options=${this._getTaxGroupOptions()}
          @change=${this._handleTaxGroupChange}
        ></uui-select>
        ${this._selectedTaxGroupId && this._price > 0 ? html`
          <span class="tax-info">
            ${hasTaxPreview && taxAmount !== undefined && taxRate !== undefined
              ? `Tax: ${currencySymbol}${formatNumber(taxAmount, 2)} at ${taxRate}%`
              : html`<span class="calculating">Calculating tax...</span>`}
          </span>
        ` : nothing}
      </div>

      <div class="form-row checkbox-row">
        <uui-checkbox
          .checked=${this._isPhysicalProduct}
          @change=${(e: Event) => (this._isPhysicalProduct = (e.target as HTMLInputElement).checked)}
        >
          Item is a physical product
        </uui-checkbox>
        ${this._isPhysicalProduct ? html`
          <span class="checkbox-hint">Physical products require warehouse and shipping selection</span>
        ` : nothing}
      </div>

      ${this._price > 0 ? html`
        <div class="summary ${this._isLoadingTaxPreview || !hasTaxPreview ? 'loading' : ''}">
          <div class="summary-row">
            <span>Subtotal</span>
            <span>
              ${hasTaxPreview && subtotal !== undefined
                ? `${currencySymbol}${formatNumber(subtotal, 2)}`
                : html`<span class="calculating">...</span>`}
            </span>
          </div>
          ${this._selectedTaxGroupId ? html`
            <div class="summary-row">
              <span>Tax${hasTaxPreview && taxRate !== undefined ? ` (${taxRate}%)` : ''}</span>
              <span>
                ${hasTaxPreview && taxAmount !== undefined
                  ? `${currencySymbol}${formatNumber(taxAmount, 2)}`
                  : html`<span class="calculating">...</span>`}
              </span>
            </div>
          ` : nothing}
          <div class="summary-row total">
            <span>Total</span>
            <span>
              ${hasTaxPreview && total !== undefined
                ? `${currencySymbol}${formatNumber(total, 2)}`
                : html`<span class="calculating">...</span>`}
            </span>
          </div>
        </div>
      ` : nothing}
    `;
  }

  private _renderShippingStep() {
    const currencySymbol = this.data?.currencySymbol ?? "£";
    const destination = this.data?.shippingDestination;

    return html`
      <div class="shipping-step">
        <div class="item-summary">
          <div class="item-summary-name">${this._name}</div>
          <div class="item-summary-details">
            <span>${this._sku}</span>
            <span>${currencySymbol}${formatNumber(this._price, 2)} × ${this._quantity}</span>
          </div>
        </div>

        ${destination ? html`
          <div class="destination-info">
            <uui-icon name="icon-navigation"></uui-icon>
            <span>Shipping to: ${destination.stateCode ? `${destination.stateCode}, ` : ''}${destination.countryCode}</span>
          </div>
        ` : html`
          <div class="shipping-error">
            <uui-icon name="icon-alert"></uui-icon>
            <span>No shipping destination configured for this order</span>
          </div>
        `}

        <div class="form-row">
          <label for="warehouse">Warehouse</label>
          ${this._isLoadingWarehouses ? html`
            <div class="loading-indicator">
              <uui-loader-circle></uui-loader-circle>
              <span>Loading warehouses...</span>
            </div>
          ` : html`
            <uui-select
              id="warehouse"
              .options=${this._getWarehouseOptions()}
              @change=${this._handleWarehouseChange}
            ></uui-select>
          `}
        </div>

        ${this._selectedWarehouseId ? html`
          <div class="form-row">
            <label for="shipping-option">Shipping option</label>
            ${this._isLoadingShippingOptions ? html`
              <div class="loading-indicator">
                <uui-loader-circle></uui-loader-circle>
                <span>Loading shipping options...</span>
              </div>
            ` : this._shippingOptions.length > 0 ? html`
              <uui-select
                id="shipping-option"
                .options=${this._getShippingOptionOptions()}
                @change=${this._handleShippingOptionChange}
              ></uui-select>
              ${this._selectedShippingOptionId ? this._renderSelectedShippingDetails() : nothing}
            ` : nothing}
          </div>
        ` : nothing}

        ${this._shippingError ? html`
          <div class="shipping-error">
            <uui-icon name="icon-alert"></uui-icon>
            <span>${this._shippingError}</span>
          </div>
        ` : nothing}
      </div>
    `;
  }

  private _renderSelectedShippingDetails() {
    const option = this._shippingOptions.find(o => o.id === this._selectedShippingOptionId);
    if (!option) return nothing;

    const currencySymbol = this.data?.currencySymbol ?? "£";

    return html`
      <div class="shipping-details">
        <div class="shipping-detail-row">
          <uui-icon name="icon-timer"></uui-icon>
          <span>${option.deliveryTimeDescription}</span>
        </div>
        ${option.estimatedCost !== null && option.estimatedCost !== undefined ? html`
          <div class="shipping-detail-row">
            <uui-icon name="icon-coins"></uui-icon>
            <span>${option.isEstimate ? "Est. " : ""}${currencySymbol}${formatNumber(option.estimatedCost, 2)}</span>
          </div>
        ` : nothing}
        ${option.isNextDay ? html`
          <div class="shipping-detail-row next-day">
            <uui-icon name="icon-bolt"></uui-icon>
            <span>Next day delivery</span>
          </div>
        ` : nothing}
      </div>
    `;
  }

  private _getWarehouseOptions(): Array<{ name: string; value: string; selected: boolean }> {
    return [
      { name: "Select a warehouse...", value: "", selected: !this._selectedWarehouseId },
      ...this._warehouses.map(w => ({
        name: w.name ?? w.code ?? "Unnamed",
        value: w.id,
        selected: this._selectedWarehouseId === w.id
      }))
    ];
  }

  private _getShippingOptionOptions(): Array<{ name: string; value: string; selected: boolean }> {
    const currencySymbol = this.data?.currencySymbol ?? "£";
    return [
      { name: "Select shipping option...", value: "", selected: !this._selectedShippingOptionId },
      ...this._shippingOptions.map(o => ({
        name: o.estimatedCost !== null && o.estimatedCost !== undefined
          ? `${o.name} (${currencySymbol}${formatNumber(o.estimatedCost, 2)})`
          : o.name,
        value: o.id,
        selected: this._selectedShippingOptionId === o.id
      }))
    ];
  }

  private _renderActions() {
    const isDetailsStep = this._step === "details";
    const showContinue = isDetailsStep && this._isPhysicalProduct;
    const showAdd = !isDetailsStep || !this._isPhysicalProduct;
    const showBack = !isDetailsStep;

    return html`
      <div slot="actions">
        ${showBack ? html`
          <uui-button label="Back" look="secondary" @click=${this._handleBackToDetails}>
            Back
          </uui-button>
        ` : html`
          <uui-button label="Cancel" look="secondary" @click=${this._handleCancel}>
            Cancel
          </uui-button>
        `}
        ${showContinue ? html`
          <uui-button label="Continue" look="primary" @click=${this._handleAdd}>
            Continue
          </uui-button>
        ` : nothing}
        ${showAdd ? html`
          <uui-button
            label="Add item"
            look="primary"
            @click=${this._handleAdd}
            ?disabled=${this._step === "shipping" && (!this._selectedWarehouseId || !this._selectedShippingOptionId)}
          >
            Add item
          </uui-button>
        ` : nothing}
      </div>
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
      flex-wrap: wrap;
    }

    .checkbox-hint {
      font-size: 0.75rem;
      color: var(--uui-color-text-alt);
      margin-left: var(--uui-size-space-6);
      width: 100%;
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

    .summary.loading {
      opacity: 0.6;
    }

    .calculating {
      font-style: italic;
      color: var(--uui-color-text-alt);
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

    /* Shipping step styles */
    .shipping-step {
      display: flex;
      flex-direction: column;
      gap: var(--uui-size-space-4);
    }

    .item-summary {
      background: var(--uui-color-surface-alt);
      border-radius: var(--uui-border-radius);
      padding: var(--uui-size-space-3);
    }

    .item-summary-name {
      font-weight: 600;
      font-size: 1rem;
      margin-bottom: var(--uui-size-space-1);
    }

    .item-summary-details {
      display: flex;
      gap: var(--uui-size-space-4);
      font-size: 0.875rem;
      color: var(--uui-color-text-alt);
    }

    .destination-info {
      display: flex;
      align-items: center;
      gap: var(--uui-size-space-2);
      padding: var(--uui-size-space-2) var(--uui-size-space-3);
      background: var(--uui-color-default);
      color: var(--uui-color-default-contrast);
      border-radius: var(--uui-border-radius);
      font-size: 0.875rem;
    }

    .destination-info uui-icon {
      font-size: 1rem;
    }

    .loading-indicator {
      display: flex;
      align-items: center;
      gap: var(--uui-size-space-2);
      padding: var(--uui-size-space-2);
      color: var(--uui-color-text-alt);
      font-size: 0.875rem;
    }

    .shipping-error {
      display: flex;
      align-items: center;
      gap: var(--uui-size-space-2);
      padding: var(--uui-size-space-2) var(--uui-size-space-3);
      background: var(--uui-color-danger-standalone);
      color: white;
      border-radius: var(--uui-border-radius);
      font-size: 0.875rem;
    }

    .shipping-error uui-icon {
      font-size: 1rem;
    }

    .shipping-details {
      margin-top: var(--uui-size-space-2);
      padding: var(--uui-size-space-2) var(--uui-size-space-3);
      background: var(--uui-color-surface-alt);
      border-radius: var(--uui-border-radius);
      display: flex;
      flex-direction: column;
      gap: var(--uui-size-space-1);
    }

    .shipping-detail-row {
      display: flex;
      align-items: center;
      gap: var(--uui-size-space-2);
      font-size: 0.813rem;
      color: var(--uui-color-text-alt);
    }

    .shipping-detail-row uui-icon {
      font-size: 0.875rem;
    }

    .shipping-detail-row.next-day {
      color: var(--uui-color-positive);
    }
  `;
}

export default MerchelloAddCustomItemModalElement;

declare global {
  interface HTMLElementTagNameMap {
    "merchello-add-custom-item-modal": MerchelloAddCustomItemModalElement;
  }
}
