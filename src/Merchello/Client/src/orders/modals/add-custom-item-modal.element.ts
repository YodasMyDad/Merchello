import { html, css, nothing } from "@umbraco-cms/backoffice/external/lit";
import { customElement, state } from "@umbraco-cms/backoffice/external/lit";
import { UmbModalBaseElement } from "@umbraco-cms/backoffice/modal";
import { UmbSorterController } from "@umbraco-cms/backoffice/sorter";
import type { AddCustomItemModalData, AddCustomItemModalValue } from "@orders/modals/add-custom-item-modal.token.js";
import type { CustomItemAddonDto, OrderProductAutocompleteDto } from "@orders/types/order.types.js";
import { formatNumber } from "@shared/utils/formatting.js";
import { modalLayoutStyles } from "@shared/styles/modal-layout.styles.js";
import { MerchelloApi } from "@api/merchello-api.js";
import type { WarehouseListDto, WarehouseShippingOptionDto } from "@warehouses/types/warehouses.types.js";

type ModalStep = "details" | "shipping";
type AutocompleteField = "name" | "sku";
const NO_SHIPPING_OPTION_VALUE = "__no-shipping__";
const NO_SHIPPING_OPTION_NAME = "No Shipping";
const PRODUCT_AUTOCOMPLETE_MIN_QUERY_LENGTH = 2;
const PRODUCT_AUTOCOMPLETE_DEBOUNCE_MS = 250;

interface CustomItemAddonFormRow {
  id: string;
  key: string;
  value: string;
  priceAdjustment: number;
  costAdjustment: number;
  skuSuffix: string;
}

@customElement("merchello-add-custom-item-modal")
export class MerchelloAddCustomItemModalElement extends UmbModalBaseElement<
  AddCustomItemModalData,
  AddCustomItemModalValue
> {
  // Details step state
  @state() private _name: string = "";
  @state() private _sku: string = "";
  @state() private _price: number = 0;
  @state() private _cost: number = 0;
  @state() private _quantity: number = 1;
  @state() private _selectedTaxGroupId: string | null = null;
  @state() private _isPhysicalProduct: boolean = true;
  @state() private _addons: CustomItemAddonFormRow[] = [];
  @state() private _errors: Record<string, string> = {};

  // Tax preview state (from backend calculation)
  @state() private _taxPreview: { subtotal: number; taxRate: number; taxAmount: number; total: number } | null = null;
  @state() private _isLoadingTaxPreview: boolean = false;
  private _taxPreviewDebounceTimer: ReturnType<typeof setTimeout> | null = null;

  // Product autocomplete state
  @state() private _productAutocompleteResults: OrderProductAutocompleteDto[] = [];
  @state() private _isSearchingProducts: boolean = false;
  @state() private _showProductAutocomplete: boolean = false;
  @state() private _autocompleteField: AutocompleteField = "name";
  @state() private _selectedAutocompleteProduct: OrderProductAutocompleteDto | null = null;
  private _productSearchDebounceTimer: ReturnType<typeof setTimeout> | null = null;
  private _productAutocompleteHideTimer: ReturnType<typeof setTimeout> | null = null;
  private _addonSortSequence = 0;

  #addonSorter = new UmbSorterController<CustomItemAddonFormRow>(this, {
    getUniqueOfElement: (element) => element.getAttribute("data-addon-id") ?? "",
    getUniqueOfModel: (model) => model.id,
    identifier: "Merchello.AddCustomItem.Addons.Sorter",
    itemSelector: ".addon-row",
    containerSelector: ".addons-list",
    handleSelector: ".addon-drag-handle",
    placeholderClass: "--umb-sorter-placeholder",
    onChange: ({ model }) => this._handleAddonSort(model),
  });

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
    if (this._productSearchDebounceTimer) {
      clearTimeout(this._productSearchDebounceTimer);
    }
    if (this._productAutocompleteHideTimer) {
      clearTimeout(this._productAutocompleteHideTimer);
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

    this._addons.forEach((addon, index) => {
      const hasAnyValue = Boolean(
        addon.key.trim() ||
        addon.value.trim() ||
        addon.skuSuffix.trim() ||
        addon.priceAdjustment !== 0 ||
        addon.costAdjustment !== 0
      );

      if (!hasAnyValue) {
        return;
      }

      if (!addon.key.trim()) {
        errors[`addon-key-${index}`] = "Key is required";
      }
      if (!addon.value.trim()) {
        errors[`addon-value-${index}`] = "Value is required";
      }
    });

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
      this._warehouses = error ? [] : (data ?? []);
    } catch {
      this._warehouses = [];
    } finally {
      this._isLoadingWarehouses = false;
    }
  }

  private async _loadShippingOptions(): Promise<void> {
    if (!this._selectedWarehouseId) return;

    const destination = this.data?.shippingDestination;
    if (!destination?.countryCode) {
      this._shippingOptions = [];
      this._selectedShippingOptionId = null;
      this._shippingError = null;
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
        destination.regionCode
      );

      if (error || !data) {
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
    } catch {
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

  private _handleNameInput(e: Event): void {
    const value = (e.target as HTMLInputElement).value;
    this._name = value;
    this._selectedAutocompleteProduct = null;
    this._clearFieldError("name");
    this._scheduleProductAutocompleteSearch(value, "name");
  }

  private _handleSkuInput(e: Event): void {
    const value = (e.target as HTMLInputElement).value;
    this._sku = value;
    this._selectedAutocompleteProduct = null;
    this._clearFieldError("sku");
    this._scheduleProductAutocompleteSearch(value, "sku");
  }

  private _handleProductAutocompleteFocus(field: AutocompleteField): void {
    this._autocompleteField = field;
    if (this._productAutocompleteHideTimer) {
      clearTimeout(this._productAutocompleteHideTimer);
      this._productAutocompleteHideTimer = null;
    }
    if (this._productAutocompleteResults.length > 0) {
      this._showProductAutocomplete = true;
      return;
    }

    const query = field === "name" ? this._name : this._sku;
    if (query.trim().length >= PRODUCT_AUTOCOMPLETE_MIN_QUERY_LENGTH) {
      this._scheduleProductAutocompleteSearch(query, field);
    }
  }

  private _handleProductAutocompleteBlur(): void {
    if (this._productAutocompleteHideTimer) {
      clearTimeout(this._productAutocompleteHideTimer);
    }
    // Delay hide so suggestion clicks can be handled first.
    this._productAutocompleteHideTimer = setTimeout(() => {
      this._showProductAutocomplete = false;
      this._productAutocompleteHideTimer = null;
    }, 150);
  }

  private _scheduleProductAutocompleteSearch(query: string, field: AutocompleteField): void {
    this._autocompleteField = field;
    if (this._productSearchDebounceTimer) {
      clearTimeout(this._productSearchDebounceTimer);
    }

    const trimmedQuery = query.trim();
    if (trimmedQuery.length < PRODUCT_AUTOCOMPLETE_MIN_QUERY_LENGTH) {
      this._productAutocompleteResults = [];
      this._showProductAutocomplete = false;
      this._isSearchingProducts = false;
      return;
    }

    this._productSearchDebounceTimer = setTimeout(async () => {
      const searchQuery = trimmedQuery;
      this._isSearchingProducts = true;

      const { data, error } = await MerchelloApi.searchOrderProducts(searchQuery, 8);

      const activeQuery = (field === "name" ? this._name : this._sku).trim();
      if (this._autocompleteField !== field || activeQuery !== searchQuery) {
        this._isSearchingProducts = false;
        return;
      }

      this._isSearchingProducts = false;
      if (error) {
        this._productAutocompleteResults = [];
        this._showProductAutocomplete = false;
        return;
      }

      this._productAutocompleteResults = data ?? [];
      this._showProductAutocomplete = true;
    }, PRODUCT_AUTOCOMPLETE_DEBOUNCE_MS);
  }

  private _applyAutocompleteProduct(product: OrderProductAutocompleteDto): void {
    const displayName = this._getAutocompleteProductDisplayName(product);

    this._selectedAutocompleteProduct = product;
    this._name = displayName || this._name;
    this._sku = product.sku ?? this._sku;
    this._price = product.price;
    this._cost = product.cost;
    this._selectedTaxGroupId = product.taxGroupId ?? null;
    this._isPhysicalProduct = product.isPhysicalProduct;
    this._productAutocompleteResults = [];
    this._showProductAutocomplete = false;
    this._clearFieldError("name");
    this._clearFieldError("sku");
    this._refreshTaxPreview();
  }

  private _getAutocompleteProductDisplayName(product: OrderProductAutocompleteDto): string {
    const rootName = (product.rootName ?? "").trim();
    const variantName = (product.name ?? "").trim();

    if (rootName && variantName && rootName.toLowerCase() !== variantName.toLowerCase()) {
      return `${rootName} - ${variantName}`;
    }

    return rootName || variantName;
  }

  private _createAddonRow(): CustomItemAddonFormRow {
    this._addonSortSequence += 1;
    return {
      id: `addon-${this._addonSortSequence}`,
      key: "",
      value: "",
      priceAdjustment: 0,
      costAdjustment: 0,
      skuSuffix: "",
    };
  }

  private _setAddons(
    addons: CustomItemAddonFormRow[],
    options: { refreshTaxPreview?: boolean; syncSorter?: boolean } = {}
  ): void {
    this._addons = addons;

    if (options.syncSorter ?? true) {
      this.#addonSorter.setModel(addons);
    }

    if (options.refreshTaxPreview === true) {
      this._refreshTaxPreview();
    }
  }

  private _reindexAddonErrors(previousOrder: string[], nextOrder: string[]): void {
    const nextIndexById = new Map(nextOrder.map((id, index) => [id, index]));
    const nextErrors: Record<string, string> = {};

    for (const [key, value] of Object.entries(this._errors)) {
      if (!key.startsWith("addon-key-") && !key.startsWith("addon-value-")) {
        nextErrors[key] = value;
        continue;
      }

      const parts = key.split("-");
      const previousIndex = Number.parseInt(parts[2], 10);
      if (!Number.isFinite(previousIndex)) {
        continue;
      }

      const addonId = previousOrder[previousIndex];
      if (!addonId) {
        continue;
      }

      const nextIndex = nextIndexById.get(addonId);
      if (nextIndex === undefined) {
        continue;
      }

      nextErrors[`${parts[0]}-${parts[1]}-${nextIndex}`] = value;
    }

    this._errors = nextErrors;
  }

  private _handleAddonSort(sortedAddons: CustomItemAddonFormRow[]): void {
    const previousOrder = this._addons.map((addon) => addon.id);
    const nextOrder = sortedAddons.map((addon) => addon.id);

    this._setAddons(sortedAddons, { syncSorter: false });
    this._reindexAddonErrors(previousOrder, nextOrder);
  }

  private _addAddonRow(): void {
    this._setAddons([...this._addons, this._createAddonRow()]);
  }

  private _removeAddonRow(index: number): void {
    const previousOrder = this._addons.map((addon) => addon.id);
    const nextAddons = this._addons.filter((_, currentIndex) => currentIndex !== index);
    const nextOrder = nextAddons.map((addon) => addon.id);
    this._setAddons(nextAddons, { refreshTaxPreview: true });
    this._reindexAddonErrors(previousOrder, nextOrder);
  }

  private _updateAddonStringField(index: number, field: "key" | "value" | "skuSuffix", value: string): void {
    this._setAddons(this._addons.map((addon, currentIndex) =>
      currentIndex === index ? { ...addon, [field]: value } : addon
    ));

    if (field === "key" || field === "value") {
      this._clearFieldError(`addon-${field}-${index}`);
    }
  }

  private _updateAddonNumberField(index: number, field: "priceAdjustment" | "costAdjustment", rawValue: string): void {
    const parsedValue = parseFloat(rawValue);
    const value = Number.isFinite(parsedValue) ? parsedValue : 0;

    this._setAddons(this._addons.map((addon, currentIndex) =>
      currentIndex === index ? { ...addon, [field]: value } : addon
    ), { refreshTaxPreview: field === "priceAdjustment" });
  }

  private _toCustomItemAddons(): CustomItemAddonDto[] {
    return this._addons
      .filter((addon) => addon.key.trim() && addon.value.trim())
      .map((addon) => ({
        key: addon.key.trim(),
        value: addon.value.trim(),
        priceAdjustment: addon.priceAdjustment,
        costAdjustment: addon.costAdjustment,
        skuSuffix: addon.skuSuffix.trim() ? addon.skuSuffix.trim() : null,
      }));
  }

  private _clearFieldError(field: string): void {
    if (!this._errors[field]) return;
    const nextErrors = { ...this._errors };
    delete nextErrors[field];
    this._errors = nextErrors;
  }

  private _getAddonsTotalPerUnit(): number {
    return this._toCustomItemAddons().reduce((total, addon) => total + addon.priceAdjustment, 0);
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
    const noShippingSelected = this._selectedShippingOptionId === NO_SHIPPING_OPTION_VALUE;

    this.value = {
      item: {
        name: this._name.trim(),
        sku: this._sku.trim(),
        price: this._price,
        cost: this._cost,
        quantity: this._quantity,
        taxGroupId: this._selectedTaxGroupId,
        isPhysicalProduct: this._isPhysicalProduct,
        addons: this._toCustomItemAddons(),
        warehouseId: this._isPhysicalProduct ? this._selectedWarehouseId ?? undefined : undefined,
        warehouseName: this._isPhysicalProduct ? selectedWarehouse?.name ?? undefined : undefined,
        shippingOptionId: this._isPhysicalProduct
          ? noShippingSelected
            ? null
            : this._selectedShippingOptionId ?? undefined
          : undefined,
        shippingOptionName: this._isPhysicalProduct
          ? noShippingSelected
            ? NO_SHIPPING_OPTION_NAME
            : selectedShippingOption?.name ?? undefined
          : undefined,
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
          addonsTotal: this._getAddonsTotalPerUnit(),
        });

        if (error) {
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
      } catch {
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

  private _renderProductAutocompleteDropdown(field: AutocompleteField) {
    if (this._autocompleteField !== field || !this._showProductAutocomplete) {
      return nothing;
    }

    const query = (field === "name" ? this._name : this._sku).trim();
    if (query.length < PRODUCT_AUTOCOMPLETE_MIN_QUERY_LENGTH) {
      return nothing;
    }

    const currencySymbol = this.data?.currencySymbol ?? "£";

    return html`
      <div class="autocomplete-dropdown" role="listbox">
        ${this._isSearchingProducts ? html`
          <div class="autocomplete-status">
            <uui-loader-circle></uui-loader-circle>
            <span>Searching products...</span>
          </div>
        ` : this._productAutocompleteResults.length === 0 ? html`
          <div class="autocomplete-status">No products found</div>
        ` : this._productAutocompleteResults.map((product) => html`
          <button
            type="button"
            class="autocomplete-option"
            @mousedown=${(event: MouseEvent) => {
              event.preventDefault();
              this._applyAutocompleteProduct(product);
            }}
          >
            <span class="autocomplete-option-name">${this._getAutocompleteProductDisplayName(product)}</span>
            <span class="autocomplete-option-meta">
              ${product.sku || "No SKU"} | ${currencySymbol}${formatNumber(product.price, 2)}
            </span>
          </button>
        `)}
      </div>
    `;
  }

  private _renderDetailsStep() {
    const currencySymbol = this.data?.currencySymbol ?? "£";
    const addonsTotalPerUnit = this._getAddonsTotalPerUnit();
    const addonsTotal = addonsTotalPerUnit * this._quantity;

    // Use ONLY backend preview values - no local calculations
    const hasTaxPreview = this._taxPreview !== null;
    const taxRate = this._taxPreview?.taxRate;
    const subtotal = this._taxPreview?.subtotal;
    const taxAmount = this._taxPreview?.taxAmount;
    const total = this._taxPreview?.total;

    return html`
      <div class="form-row-group">
        <div class="form-row autocomplete-group">
          <label for="item-name">Item name</label>
          <div class="autocomplete-field">
            <uui-input
              id="item-name"
              .value=${this._name}
              @input=${this._handleNameInput}
              @focus=${() => this._handleProductAutocompleteFocus("name")}
              @blur=${this._handleProductAutocompleteBlur}
              placeholder="Enter item name"
              autocomplete="off"
            ></uui-input>
            ${this._renderProductAutocompleteDropdown("name")}
          </div>
          ${this._errors.name ? html`<span class="error">${this._errors.name}</span>` : nothing}
        </div>

        <div class="form-row autocomplete-group">
          <label for="item-sku">SKU</label>
          <div class="autocomplete-field">
            <uui-input
              id="item-sku"
              .value=${this._sku}
              @input=${this._handleSkuInput}
              @focus=${() => this._handleProductAutocompleteFocus("sku")}
              @blur=${this._handleProductAutocompleteBlur}
              placeholder="Enter SKU"
              autocomplete="off"
            ></uui-input>
            ${this._renderProductAutocompleteDropdown("sku")}
          </div>
          ${this._errors.sku ? html`<span class="error">${this._errors.sku}</span>` : nothing}
        </div>
      </div>

      ${this._selectedAutocompleteProduct ? html`
        <div class="selected-product-chip">
          <uui-icon name="icon-check"></uui-icon>
          <span>
            Based on existing product:
            <strong>${this._getAutocompleteProductDisplayName(this._selectedAutocompleteProduct)}</strong>
            ${this._selectedAutocompleteProduct.sku ? ` (${this._selectedAutocompleteProduct.sku})` : ""}
          </span>
          <uui-button
            compact
            look="secondary"
            @click=${() => (this._selectedAutocompleteProduct = null)}
            title="Clear product selection"
          >
            <uui-icon name="icon-delete"></uui-icon>
          </uui-button>
        </div>
      ` : nothing}

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
          <label for="item-cost">Cost</label>
          <div class="input-with-prefix">
            <span class="prefix">${currencySymbol}</span>
            <uui-input
              id="item-cost"
              type="number"
              .value=${this._cost.toString()}
              @input=${(e: Event) => (this._cost = parseFloat((e.target as HTMLInputElement).value) || 0)}
              step="0.01"
              min="0"
            ></uui-input>
          </div>
        </div>
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

      <div class="form-row">
        <label for="tax-group">Tax</label>
        <uui-select
          id="tax-group"
          .options=${this._getTaxGroupOptions()}
          @change=${this._handleTaxGroupChange}
        ></uui-select>
        ${this._selectedTaxGroupId && (this._price > 0 || addonsTotalPerUnit > 0) ? html`
          <span class="tax-info">
            ${hasTaxPreview && taxAmount !== undefined && taxRate !== undefined
              ? `Tax: ${currencySymbol}${formatNumber(taxAmount, 2)} at ${taxRate}%`
              : html`<span class="calculating">Calculating tax...</span>`}
          </span>
        ` : nothing}
      </div>

      <div class="addons-section">
        <div class="addons-header">
          <h4>Add-ons</h4>
          <uui-button look="secondary" compact @click=${this._addAddonRow}>
            <uui-icon name="icon-add"></uui-icon>
            Add add-on
          </uui-button>
        </div>

        <!-- Always render container for sorter -->
        <div class="addons-list">
          ${this._addons.length === 0 ? html`
            <div class="addons-empty">
              Add key/value rows such as "Drawers: Left side", with optional price, cost, and SKU suffix.
            </div>
          ` : this._addons.map((addon, index) => html`
            <div class="addon-row" data-addon-id=${addon.id}>
              <div class="addon-fields-top">
                <div class="form-row">
                  <label for=${`addon-key-${index}`}>Key</label>
                  <uui-input
                    id=${`addon-key-${index}`}
                    .value=${addon.key}
                    @input=${(e: Event) =>
                      this._updateAddonStringField(index, "key", (e.target as HTMLInputElement).value)}
                    placeholder="e.g. Drawers"
                  ></uui-input>
                  ${this._errors[`addon-key-${index}`]
                    ? html`<span class="error">${this._errors[`addon-key-${index}`]}</span>`
                    : nothing}
                </div>

                <div class="form-row">
                  <label for=${`addon-value-${index}`}>Value</label>
                  <uui-input
                    id=${`addon-value-${index}`}
                    .value=${addon.value}
                    @input=${(e: Event) =>
                      this._updateAddonStringField(index, "value", (e.target as HTMLInputElement).value)}
                    placeholder="e.g. Left side"
                  ></uui-input>
                  ${this._errors[`addon-value-${index}`]
                    ? html`<span class="error">${this._errors[`addon-value-${index}`]}</span>`
                    : nothing}
                </div>

                <div class="addon-row-actions">
                  <button
                    type="button"
                    class="addon-drag-handle"
                    title="Reorder add-on"
                    aria-label="Reorder add-on"
                  >
                    <uui-icon name="icon-navigation"></uui-icon>
                  </button>
                  <uui-button
                    compact
                    look="secondary"
                    color="danger"
                    @click=${() => this._removeAddonRow(index)}
                    title="Remove add-on"
                  >
                    <uui-icon name="icon-delete"></uui-icon>
                  </uui-button>
                </div>
              </div>

              <div class="addon-fields-bottom">
                <div class="form-row">
                  <label for=${`addon-price-${index}`}>Price adjustment</label>
                  <div class="input-with-prefix">
                    <span class="prefix">${currencySymbol}</span>
                    <uui-input
                      id=${`addon-price-${index}`}
                      type="number"
                      .value=${addon.priceAdjustment.toString()}
                      @input=${(e: Event) =>
                        this._updateAddonNumberField(index, "priceAdjustment", (e.target as HTMLInputElement).value)}
                      step="0.01"
                    ></uui-input>
                  </div>
                </div>

                <div class="form-row">
                  <label for=${`addon-cost-${index}`}>Cost adjustment</label>
                  <div class="input-with-prefix">
                    <span class="prefix">${currencySymbol}</span>
                    <uui-input
                      id=${`addon-cost-${index}`}
                      type="number"
                      .value=${addon.costAdjustment.toString()}
                      @input=${(e: Event) =>
                        this._updateAddonNumberField(index, "costAdjustment", (e.target as HTMLInputElement).value)}
                      step="0.01"
                    ></uui-input>
                  </div>
                </div>

                <div class="form-row">
                  <label for=${`addon-sku-${index}`}>SKU suffix</label>
                  <uui-input
                    id=${`addon-sku-${index}`}
                    .value=${addon.skuSuffix}
                    @input=${(e: Event) =>
                      this._updateAddonStringField(index, "skuSuffix", (e.target as HTMLInputElement).value)}
                    placeholder="e.g. DRAWER-L"
                  ></uui-input>
                </div>
              </div>
            </div>
          `)}
        </div>
      </div>

      <div class="form-row checkbox-row">
        <uui-checkbox
          label="Physical product"
          .checked=${this._isPhysicalProduct}
          @change=${(e: Event) => (this._isPhysicalProduct = (e.target as HTMLInputElement).checked)}
        >
          Item is a physical product
        </uui-checkbox>
        ${this._isPhysicalProduct ? html`
          <span class="checkbox-hint">Physical products require warehouse and shipping selection</span>
        ` : nothing}
      </div>

      ${this._price > 0 || addonsTotalPerUnit > 0 ? html`
        <div class="summary ${this._isLoadingTaxPreview || !hasTaxPreview ? 'loading' : ''}">
          ${addonsTotalPerUnit > 0 ? html`
            <div class="summary-row">
              <span>Add-ons (${currencySymbol}${formatNumber(addonsTotalPerUnit, 2)} per unit)</span>
              <span>+${currencySymbol}${formatNumber(addonsTotal, 2)}</span>
            </div>
          ` : nothing}
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
    const addonsTotalPerUnit = this._getAddonsTotalPerUnit();

    return html`
      <div class="shipping-step">
        <div class="item-summary">
          <div class="item-summary-name">${this._name}</div>
          <div class="item-summary-details">
            <span>${this._sku}</span>
            <span>${currencySymbol}${formatNumber(this._price, 2)} x ${this._quantity}</span>
            ${addonsTotalPerUnit > 0
              ? html`<span>Add-ons +${currencySymbol}${formatNumber(addonsTotalPerUnit, 2)} each</span>`
              : nothing}
          </div>
        </div>

        ${destination ? html`
          <div class="destination-info">
            <uui-icon name="icon-navigation"></uui-icon>
            <span>Shipping to: ${destination.regionCode ? `${destination.regionCode}, ` : ''}${destination.countryCode}</span>
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
            ` : html`
              <uui-select
                id="shipping-option"
                .options=${this._getShippingOptionOptions()}
                @change=${this._handleShippingOptionChange}
              ></uui-select>
              ${this._selectedShippingOptionId ? this._renderSelectedShippingDetails() : nothing}
            `}
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
    if (this._selectedShippingOptionId === NO_SHIPPING_OPTION_VALUE) return nothing;

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
      })),
      {
        name: NO_SHIPPING_OPTION_NAME,
        value: NO_SHIPPING_OPTION_VALUE,
        selected: this._selectedShippingOptionId === NO_SHIPPING_OPTION_VALUE
      }
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

  static override readonly styles = [
    modalLayoutStyles,
    css`
    .autocomplete-group {
      position: relative;
    }

    .autocomplete-field {
      position: relative;
    }

    .autocomplete-dropdown {
      position: absolute;
      top: calc(100% + 2px);
      left: 0;
      right: 0;
      z-index: 20;
      background: var(--uui-color-surface);
      border: 1px solid var(--uui-color-border);
      border-radius: var(--uui-border-radius);
      box-shadow: var(--uui-shadow-depth-2);
      max-height: 240px;
      overflow-y: auto;
    }

    .autocomplete-option {
      display: flex;
      flex-direction: column;
      width: 100%;
      border: 0;
      background: transparent;
      text-align: left;
      padding: var(--uui-size-space-2) var(--uui-size-space-3);
      cursor: pointer;
      gap: 2px;
    }

    .autocomplete-option:hover {
      background: var(--uui-color-surface-alt);
    }

    .autocomplete-option-name {
      font-size: 0.875rem;
      font-weight: 600;
      color: var(--uui-color-text);
    }

    .autocomplete-option-meta {
      font-size: 0.75rem;
      color: var(--uui-color-text-alt);
    }

    .autocomplete-status {
      display: flex;
      align-items: center;
      gap: var(--uui-size-space-2);
      padding: var(--uui-size-space-3);
      font-size: 0.813rem;
      color: var(--uui-color-text-alt);
    }

    .selected-product-chip {
      display: flex;
      align-items: center;
      gap: var(--uui-size-space-2);
      border: 1px solid var(--uui-color-positive);
      border-radius: var(--uui-border-radius);
      background: rgba(var(--uui-color-positive-rgb), 0.08);
      padding: var(--uui-size-space-2) var(--uui-size-space-3);
      font-size: 0.813rem;
    }

    .selected-product-chip span {
      flex: 1;
      min-width: 0;
    }

    .addons-section {
      border: 1px solid var(--uui-color-border);
      border-radius: var(--uui-border-radius);
      padding: var(--uui-size-space-3);
      display: flex;
      flex-direction: column;
      gap: var(--uui-size-space-3);
    }

    .addons-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: var(--uui-size-space-2);
    }

    .addons-header h4 {
      margin: 0;
      font-size: 0.875rem;
    }

    .addons-list {
      display: flex;
      flex-direction: column;
      gap: var(--uui-size-space-2);
    }

    .addons-empty {
      font-size: 0.813rem;
      color: var(--uui-color-text-alt);
      padding: var(--uui-size-space-2);
      background: var(--uui-color-surface-alt);
      border-radius: var(--uui-border-radius);
    }

    .addon-row {
      display: flex;
      flex-direction: column;
      gap: var(--uui-size-space-3);
      padding: var(--uui-size-space-3);
      border: 1px solid var(--uui-color-border);
      border-radius: var(--uui-border-radius);
      background: var(--uui-color-surface-alt);
    }

    .addon-row.--umb-sorter-placeholder,
    .addon-row[drag-placeholder] {
      visibility: hidden;
      position: relative;
    }

    .addon-row.--umb-sorter-placeholder::after,
    .addon-row[drag-placeholder]::after {
      content: "";
      position: absolute;
      inset: 0;
      border: 2px dashed var(--uui-color-divider-emphasis);
      border-radius: var(--uui-border-radius);
      visibility: visible;
      background: rgba(var(--uui-color-current-rgb), 0.08);
    }

    .addon-fields-top {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr)) auto;
      gap: var(--uui-size-space-3);
      align-items: end;
    }

    .addon-row-actions {
      display: flex;
      gap: var(--uui-size-space-1);
      justify-content: flex-end;
      padding-bottom: 2px;
    }

    .addon-drag-handle {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 32px;
      height: 32px;
      border: 1px solid var(--uui-color-border);
      border-radius: var(--uui-border-radius);
      background: var(--uui-color-surface);
      color: var(--uui-color-text-alt);
      cursor: grab;
      padding: 0;
    }

    .addon-drag-handle:hover {
      color: var(--uui-color-text);
      border-color: var(--uui-color-border-emphasis);
    }

    .addon-drag-handle:active {
      cursor: grabbing;
    }

    .addon-fields-bottom {
      display: grid;
      grid-template-columns: repeat(3, minmax(0, 1fr));
      gap: var(--uui-size-space-3);
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

    @media (max-width: 900px) {
      .addon-fields-top,
      .addon-fields-bottom {
        grid-template-columns: 1fr;
      }

      .addons-header {
        flex-direction: column;
        align-items: flex-start;
      }

      .addon-row-actions {
        justify-content: flex-start;
      }

      .item-summary-details {
        flex-direction: column;
        gap: var(--uui-size-space-1);
      }
    }
  `,
  ];
}

export default MerchelloAddCustomItemModalElement;

declare global {
  interface HTMLElementTagNameMap {
    "merchello-add-custom-item-modal": MerchelloAddCustomItemModalElement;
  }
}

