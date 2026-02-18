import { html, css, nothing } from "@umbraco-cms/backoffice/external/lit";
import { customElement, state } from "@umbraco-cms/backoffice/external/lit";
import { UmbModalBaseElement } from "@umbraco-cms/backoffice/modal";
import { MerchelloApi } from "@api/merchello-api.js";
import type { ProductVariantDto, UpdateVariantDto } from "@products/types/product.types.js";
import type { SelectOption } from "@shared/types/index.js";
import type {
  VariantBatchEditableField,
  VariantBatchUpdateModalData,
  VariantBatchUpdateModalValue,
} from "@products/modals/variant-batch-update-modal.token.js";
import {
  applyVariantBatchBulkValue,
  isVariantBatchBulkFieldSupported,
  parseVariantBatchBulkValue,
} from "@products/utils/variant-batch-bulk.js";

interface BatchFieldOption {
  key: VariantBatchEditableField;
  label: string;
  description: string;
}

interface WarehouseOption {
  id: string;
  name: string;
}

const BATCH_FIELD_OPTIONS: BatchFieldOption[] = [
  { key: "sku", label: "SKU", description: "Stock keeping unit." },
  { key: "gtin", label: "GTIN/Barcode", description: "Global Trade Item Number." },
  { key: "supplierSku", label: "Supplier SKU", description: "Supplier reference code." },
  { key: "hsCode", label: "HS Code", description: "Harmonized customs code." },
  { key: "price", label: "Price", description: "Customer-facing price." },
  { key: "onSale", label: "On Sale", description: "Enable or disable sale status." },
  { key: "costOfGoods", label: "Cost Of Goods", description: "Internal product cost." },
  { key: "availableForPurchase", label: "Visible On Website", description: "Show product on storefront." },
  { key: "canPurchase", label: "Allow Purchase", description: "Allow checkout for this variant." },
  { key: "trackStock", label: "Track Stock", description: "Toggle stock tracking per warehouse." },
];

const MAX_UPDATE_RETRY_ATTEMPTS = 3;
const UPDATE_RETRY_DELAY_MS = 120;
const MAX_PARALLEL_UPDATES = 3;

@customElement("merchello-variant-batch-update-modal")
export class MerchelloVariantBatchUpdateModalElement extends UmbModalBaseElement<
  VariantBatchUpdateModalData,
  VariantBatchUpdateModalValue
> {
  @state() private _step: "fields" | "edit" = "fields";
  @state() private _variants: ProductVariantDto[] = [];
  @state() private _selectedFields: VariantBatchEditableField[] = [];
  @state() private _warehouseOptions: WarehouseOption[] = [];
  @state() private _bulkFieldValues: Partial<Record<VariantBatchEditableField, string>> = {};
  @state() private _isSaving = false;
  @state() private _errorMessage: string | null = null;
  @state() private _rowErrors: Record<string, string> = {};

  override connectedCallback(): void {
    super.connectedCallback();
    this._initializeData();
  }

  private _initializeData(): void {
    const sourceVariants = this.data?.variants ?? [];
    const warehouses = new Map<string, string>();

    for (const variant of sourceVariants) {
      for (const warehouseStock of variant.warehouseStock ?? []) {
        if (!warehouses.has(warehouseStock.warehouseId)) {
          warehouses.set(
            warehouseStock.warehouseId,
            warehouseStock.warehouseName ?? "Unnamed warehouse",
          );
        }
      }
    }

    this._warehouseOptions = Array.from(warehouses.entries()).map(([id, name]) => ({ id, name }));

    this._variants = sourceVariants.map((variant) => ({
      ...variant,
      warehouseStock: this._warehouseOptions.map((warehouse) => {
        const existing = variant.warehouseStock.find(
          (warehouseStock) => warehouseStock.warehouseId === warehouse.id,
        );

        if (existing) {
          return {
            ...existing,
            warehouseName: existing.warehouseName ?? warehouse.name,
          };
        }

        return {
          warehouseId: warehouse.id,
          warehouseName: warehouse.name,
          stock: 0,
          reservedStock: 0,
          availableStock: 0,
          reorderPoint: null,
          reorderQuantity: null,
          trackStock: false,
          stockStatus: "Untracked",
          stockStatusLabel: "Untracked",
          stockStatusCssClass: "badge-default",
        };
      }),
    }));
  }

  private _toggleField(field: VariantBatchEditableField, checked: boolean): void {
    if (checked) {
      if (!this._selectedFields.includes(field)) {
        this._selectedFields = [...this._selectedFields, field];
      }
      return;
    }

    this._selectedFields = this._selectedFields.filter((selectedField) => selectedField !== field);
  }

  private _selectAllFields(): void {
    this._selectedFields = BATCH_FIELD_OPTIONS.map((field) => field.key);
  }

  private _clearFields(): void {
    this._selectedFields = [];
  }

  private _continueToEditor(): void {
    if (this._selectedFields.length === 0) return;
    this._errorMessage = null;
    this._rowErrors = {};
    this._step = "edit";
  }

  private _goBackToFields(): void {
    if (this._isSaving) return;
    this._errorMessage = null;
    this._rowErrors = {};
    this._step = "fields";
  }

  private _handleCancel(): void {
    this.modalContext?.reject();
  }

  private _updateVariantField<K extends keyof ProductVariantDto>(
    variantId: string,
    field: K,
    value: ProductVariantDto[K],
  ): void {
    this._variants = this._variants.map((variant) =>
      variant.id === variantId ? { ...variant, [field]: value } : variant,
    );

    if (this._rowErrors[variantId]) {
      const nextErrors = { ...this._rowErrors };
      delete nextErrors[variantId];
      this._rowErrors = nextErrors;
    }
  }

  private _updateTrackStock(variantId: string, warehouseId: string, trackStock: boolean): void {
    this._variants = this._variants.map((variant) => {
      if (variant.id !== variantId) return variant;

      return {
        ...variant,
        warehouseStock: variant.warehouseStock.map((warehouseStock) =>
          warehouseStock.warehouseId === warehouseId
            ? { ...warehouseStock, trackStock }
            : warehouseStock,
        ),
      };
    });

    if (this._rowErrors[variantId]) {
      const nextErrors = { ...this._rowErrors };
      delete nextErrors[variantId];
      this._rowErrors = nextErrors;
    }
  }

  private _parseNumber(value: string, fallback: number): number {
    const parsed = Number.parseFloat(value);
    return Number.isFinite(parsed) ? parsed : fallback;
  }

  private _getDefaultBulkFieldValue(field: VariantBatchEditableField): string {
    const firstVariant = this._variants[0];
    if (!firstVariant) {
      return "";
    }

    switch (field) {
      case "sku":
        return firstVariant.sku ?? "";
      case "gtin":
        return firstVariant.gtin ?? "";
      case "supplierSku":
        return firstVariant.supplierSku ?? "";
      case "hsCode":
        return firstVariant.hsCode ?? "";
      case "price":
        return String(firstVariant.price);
      case "costOfGoods":
        return String(firstVariant.costOfGoods);
      case "onSale":
        return String(firstVariant.onSale);
      case "availableForPurchase":
        return String(firstVariant.availableForPurchase);
      case "canPurchase":
        return String(firstVariant.canPurchase);
      case "trackStock":
        return "";
      default:
        return "";
    }
  }

  private _getBulkFieldValue(field: VariantBatchEditableField): string {
    return this._bulkFieldValues[field] ?? this._getDefaultBulkFieldValue(field);
  }

  private _updateBulkFieldValue(field: VariantBatchEditableField, value: string): void {
    this._bulkFieldValues = {
      ...this._bulkFieldValues,
      [field]: value,
    };
    this._errorMessage = null;
  }

  private _getBooleanBulkOptions(field: "onSale" | "availableForPurchase" | "canPurchase"): SelectOption[] {
    const selectedValue = this._getBulkFieldValue(field);
    return [
      { name: "True", value: "true", selected: selectedValue === "true" },
      { name: "False", value: "false", selected: selectedValue === "false" },
    ];
  }

  private _applyBulkFieldValue(field: VariantBatchEditableField): void {
    if (!isVariantBatchBulkFieldSupported(field)) {
      return;
    }

    const parseResult = parseVariantBatchBulkValue(field, this._getBulkFieldValue(field));
    if (parseResult.error || parseResult.value === undefined) {
      this._errorMessage =
        parseResult.error ?? `Unable to apply ${this._getFieldLabel(field)} to all variants.`;
      return;
    }

    this._variants = applyVariantBatchBulkValue(this._variants, field, parseResult.value);
    this._rowErrors = {};
    this._errorMessage = null;
  }

  private _validateBeforeSave(): boolean {
    const rowErrors: Record<string, string> = {};

    for (const variant of this._variants) {
      const variantErrors: string[] = [];

      if (this._selectedFields.includes("sku") && !variant.sku?.trim()) {
        variantErrors.push("SKU is required.");
      }

      if (this._selectedFields.includes("price") && variant.price < 0) {
        variantErrors.push("Price must be 0 or greater.");
      }

      if (this._selectedFields.includes("costOfGoods") && variant.costOfGoods < 0) {
        variantErrors.push("Cost of goods must be 0 or greater.");
      }

      if (variantErrors.length > 0) {
        rowErrors[variant.id] = variantErrors.join(" ");
      }
    }

    this._rowErrors = rowErrors;
    if (Object.keys(rowErrors).length > 0) {
      this._errorMessage = "Please fix the highlighted rows before saving.";
      return false;
    }

    return true;
  }

  private _buildUpdateRequest(variant: ProductVariantDto): UpdateVariantDto {
    const request: UpdateVariantDto = {};

    if (this._selectedFields.includes("sku")) request.sku = variant.sku ?? "";
    if (this._selectedFields.includes("gtin")) request.gtin = variant.gtin ?? "";
    if (this._selectedFields.includes("supplierSku")) request.supplierSku = variant.supplierSku ?? "";
    if (this._selectedFields.includes("hsCode")) request.hsCode = variant.hsCode ?? "";
    if (this._selectedFields.includes("price")) request.price = variant.price;
    if (this._selectedFields.includes("onSale")) request.onSale = variant.onSale;
    if (this._selectedFields.includes("costOfGoods")) request.costOfGoods = variant.costOfGoods;
    if (this._selectedFields.includes("availableForPurchase")) {
      request.availableForPurchase = variant.availableForPurchase;
    }
    if (this._selectedFields.includes("canPurchase")) request.canPurchase = variant.canPurchase;
    if (this._selectedFields.includes("trackStock")) {
      request.warehouseStock = variant.warehouseStock.map((warehouseStock) => ({
        warehouseId: warehouseStock.warehouseId,
        stock: warehouseStock.stock,
        reorderPoint: warehouseStock.reorderPoint,
        trackStock: warehouseStock.trackStock,
      }));
    }

    return request;
  }

  private _isRetryableUpdateError(error: Error): boolean {
    const message = error.message.toLowerCase();
    return (
      message.includes("database table is locked") ||
      message.includes("database is locked") ||
      message.includes("sqlite error 5") ||
      message.includes("sqlite error 6") ||
      message.startsWith("http 500")
    );
  }

  private _delay(milliseconds: number): Promise<void> {
    return new Promise((resolve) => {
      window.setTimeout(resolve, milliseconds);
    });
  }

  private async _updateVariantWithRetry(
    productRootId: string,
    variantId: string,
    request: UpdateVariantDto,
  ): Promise<{ error?: Error }> {
    let lastError: Error | undefined;

    for (let attempt = 1; attempt <= MAX_UPDATE_RETRY_ATTEMPTS; attempt++) {
      const { error } = await MerchelloApi.updateVariant(productRootId, variantId, request);
      if (!error) {
        return {};
      }

      lastError = error;
      if (!this._isRetryableUpdateError(error) || attempt === MAX_UPDATE_RETRY_ATTEMPTS) {
        return { error };
      }

      await this._delay(UPDATE_RETRY_DELAY_MS * attempt);
    }

    return { error: lastError };
  }

  private async _saveVariantsWithLimitedConcurrency(
    productRootId: string,
  ): Promise<Array<{ variant: ProductVariantDto; error?: Error }>> {
    const results: Array<{ variant: ProductVariantDto; error?: Error }> = new Array(this._variants.length);
    let nextIndex = 0;

    const worker = async (): Promise<void> => {
      while (nextIndex < this._variants.length) {
        const index = nextIndex;
        nextIndex += 1;

        const variant = this._variants[index];
        const request = this._buildUpdateRequest(variant);
        const updateResult = await this._updateVariantWithRetry(productRootId, variant.id, request);
        results[index] = { variant, error: updateResult.error };
      }
    };

    const workerCount = Math.min(MAX_PARALLEL_UPDATES, this._variants.length);
    await Promise.all(Array.from({ length: workerCount }, () => worker()));
    return results;
  }

  private async _handleSave(): Promise<void> {
    if (!this.data?.productRootId || this._selectedFields.length === 0 || this._variants.length === 0) {
      return;
    }

    if (!this._validateBeforeSave()) {
      return;
    }

    this._isSaving = true;
    this._errorMessage = null;
    this._rowErrors = {};

    try {
      const results = await this._saveVariantsWithLimitedConcurrency(this.data!.productRootId);

      const failed = results.filter((result) => result.error);
      if (failed.length > 0) {
        const nextRowErrors: Record<string, string> = {};
        for (const failure of failed) {
          nextRowErrors[failure.variant.id] = failure.error?.message ?? "Failed to update variant.";
        }
        this._rowErrors = nextRowErrors;

        const successCount = this._variants.length - failed.length;
        this._errorMessage =
          successCount > 0
            ? `${successCount} variant${successCount === 1 ? "" : "s"} updated. ${failed.length} failed.`
            : `Failed to update ${failed.length} variant${failed.length === 1 ? "" : "s"}.`;

        return;
      }

      this.value = {
        isSaved: true,
        updatedCount: this._variants.length,
      };
      this.modalContext?.submit();
    } catch (error) {
      this._errorMessage =
        error instanceof Error ? error.message : "An unexpected error occurred while saving variants.";
    } finally {
      this._isSaving = false;
    }
  }

  private _renderError(): unknown {
    if (!this._errorMessage) return nothing;

    return html`
      <div class="error-message">
        <uui-icon name="icon-alert"></uui-icon>
        <span>${this._errorMessage}</span>
      </div>
    `;
  }

  private _renderFieldSelectionStep(): unknown {
    return html`
      <div class="intro">
        <strong>Select fields to batch update</strong>
        <p>Choose one or more fields. Next, you will edit these values for all selected variants in a table.</p>
      </div>

      <div class="field-actions">
        <uui-button look="secondary" label="Select all fields" @click=${this._selectAllFields}>
          Select all
        </uui-button>
        <uui-button look="secondary" label="Clear fields" @click=${this._clearFields}>
          Clear
        </uui-button>
      </div>

      <div class="field-grid">
        ${BATCH_FIELD_OPTIONS.map((field) => {
          const isSelected = this._selectedFields.includes(field.key);
          return html`
            <div class="field-card ${isSelected ? "selected" : ""}">
              <uui-checkbox
                label=${field.label}
                ?checked=${isSelected}
                @change=${(event: Event) =>
                  this._toggleField(field.key, (event.target as HTMLInputElement).checked)}>
                ${field.label}
              </uui-checkbox>
              <p>${field.description}</p>
            </div>
          `;
        })}
      </div>
    `;
  }

  private _renderVariantName(variant: ProductVariantDto): unknown {
    const rowError = this._rowErrors[variant.id];

    return html`
      <div class="variant-name-cell">
        <strong>${variant.name || "Unnamed variant"}</strong>
        <span class="variant-subtext">ID: ${variant.id}</span>
        ${rowError ? html`<span class="row-error">${rowError}</span>` : nothing}
      </div>
    `;
  }

  private _renderTrackStockCell(variant: ProductVariantDto): unknown {
    if (this._warehouseOptions.length === 0) {
      return html`<span class="no-warehouses">No warehouses assigned</span>`;
    }

    return html`
      <div class="track-stock-list">
        ${this._warehouseOptions.map((warehouse) => {
          const warehouseStock = variant.warehouseStock.find(
            (existingStock) => existingStock.warehouseId === warehouse.id,
          );
          return html`
            <label class="track-stock-item">
              <uui-toggle
                label=${warehouse.name}
                .checked=${warehouseStock?.trackStock ?? false}
                @change=${(event: Event) =>
                  this._updateTrackStock(
                    variant.id,
                    warehouse.id,
                    (event.target as HTMLInputElement).checked,
                  )}>
              </uui-toggle>
              <span>${warehouse.name}</span>
            </label>
          `;
        })}
      </div>
    `;
  }

  private _renderEditorCell(variant: ProductVariantDto, field: VariantBatchEditableField): unknown {
    switch (field) {
      case "sku":
        return html`
          <uui-input
            class="cell-input"
            .value=${variant.sku ?? ""}
            @input=${(event: Event) =>
              this._updateVariantField(variant.id, "sku", (event.target as HTMLInputElement).value)}>
          </uui-input>
        `;
      case "gtin":
        return html`
          <uui-input
            class="cell-input"
            .value=${variant.gtin ?? ""}
            @input=${(event: Event) =>
              this._updateVariantField(variant.id, "gtin", (event.target as HTMLInputElement).value)}>
          </uui-input>
        `;
      case "supplierSku":
        return html`
          <uui-input
            class="cell-input"
            .value=${variant.supplierSku ?? ""}
            @input=${(event: Event) =>
              this._updateVariantField(variant.id, "supplierSku", (event.target as HTMLInputElement).value)}>
          </uui-input>
        `;
      case "hsCode":
        return html`
          <uui-input
            class="cell-input"
            .value=${variant.hsCode ?? ""}
            @input=${(event: Event) =>
              this._updateVariantField(variant.id, "hsCode", (event.target as HTMLInputElement).value)}>
          </uui-input>
        `;
      case "price":
        return html`
          <uui-input
            class="cell-input"
            type="number"
            step="0.01"
            .value=${String(variant.price)}
            @input=${(event: Event) =>
              this._updateVariantField(
                variant.id,
                "price",
                this._parseNumber((event.target as HTMLInputElement).value, variant.price),
              )}>
          </uui-input>
        `;
      case "costOfGoods":
        return html`
          <uui-input
            class="cell-input"
            type="number"
            step="0.01"
            .value=${String(variant.costOfGoods)}
            @input=${(event: Event) =>
              this._updateVariantField(
                variant.id,
                "costOfGoods",
                this._parseNumber((event.target as HTMLInputElement).value, variant.costOfGoods),
              )}>
          </uui-input>
        `;
      case "onSale":
        return html`
          <uui-toggle
            label="On Sale"
            .checked=${variant.onSale}
            @change=${(event: Event) =>
              this._updateVariantField(variant.id, "onSale", (event.target as HTMLInputElement).checked)}>
          </uui-toggle>
        `;
      case "availableForPurchase":
        return html`
          <uui-toggle
            label="Visible On Website"
            .checked=${variant.availableForPurchase}
            @change=${(event: Event) =>
              this._updateVariantField(
                variant.id,
                "availableForPurchase",
                (event.target as HTMLInputElement).checked,
              )}>
          </uui-toggle>
        `;
      case "canPurchase":
        return html`
          <uui-toggle
            label="Allow Purchase"
            .checked=${variant.canPurchase}
            @change=${(event: Event) =>
              this._updateVariantField(
                variant.id,
                "canPurchase",
                (event.target as HTMLInputElement).checked,
              )}>
          </uui-toggle>
        `;
      case "trackStock":
        return this._renderTrackStockCell(variant);
      default:
        return nothing;
    }
  }

  private _getFieldLabel(field: VariantBatchEditableField): string {
    return BATCH_FIELD_OPTIONS.find((option) => option.key === field)?.label ?? field;
  }

  private _renderBulkHeaderControl(field: VariantBatchEditableField): unknown {
    if (!isVariantBatchBulkFieldSupported(field)) {
      return html`<span class="bulk-hint">Per-row only</span>`;
    }

    if (field === "onSale" || field === "availableForPurchase" || field === "canPurchase") {
      return html`
        <div class="bulk-control">
          <uui-select
            class="bulk-select"
            label="Set all values"
            .options=${this._getBooleanBulkOptions(field)}
            @change=${(event: Event) =>
              this._updateBulkFieldValue(field, (event.target as HTMLSelectElement).value)}
            ?disabled=${this._isSaving}>
          </uui-select>
          <uui-button
            look="secondary"
            compact
            label="Apply to all"
            @click=${() => this._applyBulkFieldValue(field)}
            ?disabled=${this._isSaving}>
            Apply to all
          </uui-button>
        </div>
      `;
    }

    if (field === "price" || field === "costOfGoods") {
      return html`
        <div class="bulk-control">
          <uui-input
            class="bulk-input"
            type="number"
            step="0.01"
            label="Set all values"
            .value=${this._getBulkFieldValue(field)}
            @input=${(event: Event) =>
              this._updateBulkFieldValue(field, (event.target as HTMLInputElement).value)}
            ?disabled=${this._isSaving}>
          </uui-input>
          <uui-button
            look="secondary"
            compact
            label="Apply to all"
            @click=${() => this._applyBulkFieldValue(field)}
            ?disabled=${this._isSaving}>
            Apply to all
          </uui-button>
        </div>
      `;
    }

    return html`
      <div class="bulk-control">
        <uui-input
          class="bulk-input"
          label="Set all values"
          .value=${this._getBulkFieldValue(field)}
          @input=${(event: Event) =>
            this._updateBulkFieldValue(field, (event.target as HTMLInputElement).value)}
          ?disabled=${this._isSaving}>
        </uui-input>
        <uui-button
          look="secondary"
          compact
          label="Apply to all"
          @click=${() => this._applyBulkFieldValue(field)}
          ?disabled=${this._isSaving}>
          Apply to all
        </uui-button>
      </div>
    `;
  }

  private _renderEditorHeaderCell(field: VariantBatchEditableField): unknown {
    return html`
      <uui-table-head-cell>
        <div class="bulk-header-cell">
          <span class="bulk-header-label">${this._getFieldLabel(field)}</span>
          ${this._renderBulkHeaderControl(field)}
        </div>
      </uui-table-head-cell>
    `;
  }

  private _renderEditorStep(): unknown {
    return html`
      <div class="intro">
        <strong>Edit selected fields for ${this._variants.length} variants</strong>
        <p>Use each column header to apply values to all rows, then fine-tune individual variants if needed.</p>
      </div>

      <div class="table-container">
        <uui-table class="editor-table">
          <uui-table-head>
            <uui-table-head-cell class="variant-column">Variant</uui-table-head-cell>
            ${this._selectedFields.map((field) => this._renderEditorHeaderCell(field))}
          </uui-table-head>
          ${this._variants.map(
            (variant) => html`
              <uui-table-row class=${this._rowErrors[variant.id] ? "row-has-error" : ""}>
                <uui-table-cell>${this._renderVariantName(variant)}</uui-table-cell>
                ${this._selectedFields.map(
                  (field) => html`<uui-table-cell>${this._renderEditorCell(variant, field)}</uui-table-cell>`,
                )}
              </uui-table-row>
            `,
          )}
        </uui-table>
      </div>
    `;
  }

  override render() {
    const headline =
      this._step === "fields"
        ? `Batch Update ${this._variants.length} Variants`
        : `Edit ${this._variants.length} Variants`;

    return html`
      <umb-body-layout headline=${headline}>
        <div id="main">
          ${this._renderError()}
          ${this._step === "fields" ? this._renderFieldSelectionStep() : this._renderEditorStep()}
        </div>

        <div slot="actions">
          ${this._step === "edit"
            ? html`
                <uui-button
                  look="secondary"
                  label="Back"
                  @click=${this._goBackToFields}
                  ?disabled=${this._isSaving}>
                  Back
                </uui-button>
              `
            : nothing}

          <uui-button
            look="secondary"
            label="Cancel"
            @click=${this._handleCancel}
            ?disabled=${this._isSaving}>
            Cancel
          </uui-button>

          ${this._step === "fields"
            ? html`
                <uui-button
                  look="primary"
                  color="positive"
                  label="Continue"
                  @click=${this._continueToEditor}
                  ?disabled=${this._selectedFields.length === 0}>
                  Continue
                </uui-button>
              `
            : html`
                <uui-button
                  look="primary"
                  color="positive"
                  label="Save Batch Updates"
                  @click=${this._handleSave}
                  ?disabled=${this._isSaving}
                  .state=${this._isSaving ? "waiting" : undefined}>
                  ${this._isSaving ? "Saving..." : "Save Batch Updates"}
                </uui-button>
              `}
        </div>
      </umb-body-layout>
    `;
  }

  static override readonly styles = css`
    :host {
      display: block;
    }

    #main {
      display: flex;
      flex-direction: column;
      gap: var(--uui-size-space-4);
    }

    .intro strong {
      display: block;
      margin-bottom: var(--uui-size-space-1);
    }

    .intro p {
      margin: 0;
      color: var(--uui-color-text-alt);
    }

    .error-message {
      display: flex;
      align-items: center;
      gap: var(--uui-size-space-2);
      padding: var(--uui-size-space-3);
      border-radius: var(--uui-border-radius);
      background: var(--uui-color-danger-standalone);
      color: var(--uui-color-danger-contrast);
    }

    .field-actions {
      display: flex;
      gap: var(--uui-size-space-2);
      flex-wrap: wrap;
    }

    .field-grid {
      display: grid;
      gap: var(--uui-size-space-3);
      grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
    }

    .field-card {
      border: 1px solid var(--uui-color-border);
      border-radius: var(--uui-border-radius);
      padding: var(--uui-size-space-3);
      background: var(--uui-color-surface);
    }

    .field-card.selected {
      border-color: var(--uui-color-selected);
      background: var(--uui-color-selected-emphasis);
      color: var(--uui-color-selected-contrast, #fff);
    }

    .field-card.selected uui-checkbox,
    .field-card.selected p {
      color: var(--uui-color-selected-contrast, #fff);
    }

    .field-card p {
      margin: var(--uui-size-space-2) 0 0;
      color: var(--uui-color-text-alt);
      font-size: 0.875rem;
    }

    .table-container {
      overflow: auto;
      max-height: 62vh;
      border: 1px solid var(--uui-color-border);
      border-radius: var(--uui-border-radius);
    }

    .editor-table {
      min-width: 1080px;
      width: 100%;
    }

    .editor-table .variant-column {
      min-width: 220px;
    }

    .bulk-header-cell {
      display: flex;
      flex-direction: column;
      gap: var(--uui-size-space-2);
      min-width: 190px;
    }

    .bulk-header-label {
      font-weight: 600;
    }

    .bulk-control {
      display: flex;
      align-items: flex-end;
      gap: var(--uui-size-space-2);
    }

    .bulk-input,
    .bulk-select {
      min-width: 120px;
      flex: 1;
    }

    .bulk-hint {
      font-size: 0.75rem;
      color: var(--uui-color-text-alt);
      font-style: italic;
    }

    .variant-name-cell {
      display: flex;
      flex-direction: column;
      gap: 2px;
    }

    .variant-subtext {
      color: var(--uui-color-text-alt);
      font-size: 0.75rem;
      font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono",
        "Courier New", monospace;
    }

    .row-error {
      color: var(--uui-color-danger);
      font-size: 0.75rem;
      font-weight: 600;
    }

    .row-has-error {
      background: var(--uui-color-danger-surface);
    }

    .cell-input {
      min-width: 140px;
      width: 100%;
    }

    .track-stock-list {
      display: flex;
      flex-direction: column;
      gap: var(--uui-size-space-2);
      min-width: 220px;
    }

    .track-stock-item {
      display: flex;
      align-items: center;
      gap: var(--uui-size-space-2);
      font-size: 0.875rem;
    }

    .no-warehouses {
      color: var(--uui-color-text-alt);
      font-style: italic;
    }

    [slot="actions"] {
      display: flex;
      gap: var(--uui-size-space-2);
      justify-content: flex-end;
    }

    @media (max-width: 960px) {
      .bulk-control {
        flex-direction: column;
        align-items: stretch;
      }
    }
  `;
}

export default MerchelloVariantBatchUpdateModalElement;

declare global {
  interface HTMLElementTagNameMap {
    "merchello-variant-batch-update-modal": MerchelloVariantBatchUpdateModalElement;
  }
}
