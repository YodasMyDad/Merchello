import {
  html,
  css,
  nothing,
  repeat,
  customElement,
  property,
  state,
} from "@umbraco-cms/backoffice/external/lit";
import { UmbLitElement } from "@umbraco-cms/backoffice/lit-element";
import { UmbFormControlMixin } from "@umbraco-cms/backoffice/validation";
import { UmbChangeEvent } from "@umbraco-cms/backoffice/event";
import { UMB_MODAL_MANAGER_CONTEXT } from "@umbraco-cms/backoffice/modal";
import { UmbSorterController } from "@umbraco-cms/backoffice/sorter";
import type {
  UmbPropertyEditorUiElement,
  UmbPropertyEditorConfigCollection,
} from "@umbraco-cms/backoffice/property-editor";
import { MERCHELLO_PRODUCT_PICKER_MODAL } from "@shared/product-picker/product-picker-modal.token.js";
import { MerchelloApi } from "@api/merchello-api.js";
import { getCurrencySymbol, getStoreSettings } from "@api/store-settings.js";
import "@shared/components/product-image.element.js";

interface SelectedProduct {
  id: string;
  name: string;
  sku: string | null;
  price: number;
  imageUrl: string | null;
  notFound: boolean;
}

@customElement("merchello-property-editor-ui-product-picker")
export class MerchelloPropertyEditorUiProductPickerElement
  extends UmbFormControlMixin<string | undefined, typeof UmbLitElement, undefined>(
    UmbLitElement,
    undefined
  )
  implements UmbPropertyEditorUiElement
{
  @property({ type: Boolean, reflect: true })
  readonly = false;

  @state()
  private _selection: SelectedProduct[] = [];

  @state()
  private _maxItems = 1;

  @state()
  private _collectionIds: string[] = [];

  @state()
  private _productTypeIds: string[] = [];

  @state()
  private _filterValueIds: string[] = [];

  @state()
  private _isLoading = false;

  #modalManager?: typeof UMB_MODAL_MANAGER_CONTEXT.TYPE;
  #isConnected = false;
  #loadingRequestId = 0;

  // Sorter for multi-select drag-to-reorder
  #sorter = new UmbSorterController<SelectedProduct>(this, {
    getUniqueOfElement: (el) => el.getAttribute("data-id")!,
    getUniqueOfModel: (item) => item.id,
    identifier: "Merchello.ProductPicker",
    itemSelector: ".product-item",
    containerSelector: ".product-list",
    onChange: ({ model }) => {
      this._selection = model;
      this.#updateValue();
    },
  });

  constructor() {
    super();
    this.consumeContext(UMB_MODAL_MANAGER_CONTEXT, (ctx) => {
      this.#modalManager = ctx;
    });
  }

  override connectedCallback(): void {
    super.connectedCallback();
    this.#isConnected = true;
    getStoreSettings();
  }

  override disconnectedCallback(): void {
    super.disconnectedCallback();
    this.#isConnected = false;
  }

  public set config(config: UmbPropertyEditorConfigCollection | undefined) {
    // Note: minItems is available via config?.getValueByAlias<number>("minItems") for future validation
    const maxItems = config?.getValueByAlias<number>("maxItems");
    this._maxItems = maxItems === 0 ? Infinity : maxItems ?? 1;

    // Collection IDs - stored as comma-separated string
    const collectionIds = config?.getValueByAlias<string>("collectionIds");
    this._collectionIds = collectionIds ? collectionIds.split(",").filter(Boolean) : [];

    // Product Type IDs - stored as comma-separated string
    const productTypeIds = config?.getValueByAlias<string>("productTypeIds");
    this._productTypeIds = productTypeIds ? productTypeIds.split(",").filter(Boolean) : [];

    // Filter Value IDs - stored as comma-separated string
    const filterValueIds = config?.getValueByAlias<string>("filterValueIds");
    this._filterValueIds = filterValueIds ? filterValueIds.split(",").filter(Boolean) : [];
  }

  public override set value(val: string | undefined) {
    super.value = val;
    this.#loadSelectionFromValue(val);
  }

  public override get value(): string | undefined {
    return super.value;
  }

  async #loadSelectionFromValue(val: string | undefined): Promise<void> {
    const requestId = ++this.#loadingRequestId;

    if (!val) {
      this._selection = [];
      if (this._maxItems !== 1) {
        this.#sorter.setModel([]);
      }
      return;
    }

    const ids = val.split(",").filter((id) => id.trim());
    if (ids.length === 0) {
      this._selection = [];
      if (this._maxItems !== 1) {
        this.#sorter.setModel([]);
      }
      return;
    }

    // Fetch products by IDs to verify existence and get display data
    this._isLoading = true;
    const { data, error } = await MerchelloApi.getVariantsByIds(ids);

    if (!this.#isConnected || requestId !== this.#loadingRequestId) return;

    this._isLoading = false;

    if (error) {
      console.error("Failed to load product variants:", error);
      // Still try to show the IDs as not found
      this._selection = ids.map((id) => ({
        id,
        name: "Unknown",
        sku: null,
        price: 0,
        imageUrl: null,
        notFound: true,
      }));
      if (this._maxItems !== 1) {
        this.#sorter.setModel(this._selection);
      }
      return;
    }

    // Map the lookup results, preserving order from stored value
    const selection: SelectedProduct[] = ids.map((id) => {
      const variant = data?.find((v) => v.id === id);
      if (variant?.found) {
        return {
          id: variant.id,
          name: variant.name ?? variant.rootName ?? "Unknown",
          sku: variant.sku ?? null,
          price: variant.price ?? 0,
          imageUrl: variant.imageUrl ?? null,
          notFound: false,
        };
      } else {
        return {
          id,
          name: "Product not found",
          sku: null,
          price: 0,
          imageUrl: null,
          notFound: true,
        };
      }
    });

    this._selection = selection;
    if (this._maxItems !== 1) {
      this.#sorter.setModel(selection);
    }
  }

  #updateValue(): void {
    const newValue =
      this._selection.length > 0
        ? this._selection.map((s) => s.id).join(",")
        : undefined;

    super.value = newValue;
    this.dispatchEvent(new UmbChangeEvent());
  }

  async #openPicker(): Promise<void> {
    if (this.readonly || !this.#modalManager) return;

    const currentIds = this._selection.map((s) => s.id);

    const result = await this.#modalManager
      .open(this, MERCHELLO_PRODUCT_PICKER_MODAL, {
        data: {
          config: {
            currencySymbol: getCurrencySymbol(),
            excludeProductIds: currentIds,
            productTypeId: this._productTypeIds.length === 1 ? this._productTypeIds[0] : undefined,
            productTypeIds: this._productTypeIds.length > 1 ? this._productTypeIds : undefined,
            collectionId: this._collectionIds.length === 1 ? this._collectionIds[0] : undefined,
            collectionIds: this._collectionIds.length > 1 ? this._collectionIds : undefined,
            filterValueIds: this._filterValueIds.length > 0 ? this._filterValueIds : undefined,
            propertyEditorMode: true,
            showAddons: false,
            showImages: true,
            maxItems: this._maxItems === 1 ? 1 : this._maxItems - this._selection.length,
          },
        },
      })
      .onSubmit()
      .catch(() => undefined);

    if (!result || result.selections.length === 0) return;

    // Build new selection from result
    const newItems: SelectedProduct[] = result.selections.map((sel) => ({
      id: sel.productId,
      name: sel.name,
      sku: sel.sku,
      price: sel.price,
      imageUrl: sel.imageUrl,
      notFound: false,
    }));

    const isMultiSelect = this._maxItems !== 1;
    if (isMultiSelect) {
      const combined = [...this._selection, ...newItems];
      this._selection =
        this._maxItems === Infinity
          ? combined
          : combined.slice(0, this._maxItems);
    } else {
      this._selection = newItems.slice(0, 1);
    }

    this.#sorter.setModel(this._selection);
    this.#updateValue();
  }

  #onRemove(id: string): void {
    this._selection = this._selection.filter((s) => s.id !== id);
    this.#sorter.setModel(this._selection);
    this.#updateValue();
  }

  #onClear(): void {
    this._selection = [];
    this.#sorter.setModel([]);
    this.#updateValue();
  }

  #formatPrice(price: number): string {
    return `${getCurrencySymbol()}${price.toFixed(2)}`;
  }

  #renderSingleSelect(): unknown {
    const selected = this._selection[0];

    if (!selected) {
      return html`
        <uui-button
          look="placeholder"
          label="Select product"
          @click=${this.#openPicker}
          ?disabled=${this.readonly || this._isLoading}>
          ${this._isLoading ? "Loading..." : "Select a product..."}
        </uui-button>
      `;
    }

    if (selected.notFound) {
      return html`
        <div class="single-select-display not-found">
          <div class="product-info">
            <div class="product-image-placeholder">
              <uui-icon name="icon-alert"></uui-icon>
            </div>
            <div class="product-details">
              <span class="product-name">Product not found</span>
              <span class="product-id">ID: ${selected.id}</span>
            </div>
          </div>
          ${!this.readonly
            ? html`
                <div class="actions">
                  <uui-button
                    compact
                    look="secondary"
                    label="Change"
                    @click=${this.#openPicker}>
                    <uui-icon name="icon-edit"></uui-icon>
                  </uui-button>
                  <uui-button
                    compact
                    look="secondary"
                    label="Clear"
                    @click=${this.#onClear}>
                    <uui-icon name="icon-trash"></uui-icon>
                  </uui-button>
                </div>
              `
            : nothing}
        </div>
      `;
    }

    return html`
      <div class="single-select-display">
        <div class="product-info">
          <merchello-product-image
            media-key=${selected.imageUrl ?? ""}
            size="medium"
            alt=${selected.name}>
          </merchello-product-image>
          <div class="product-details">
            <span class="product-name">${selected.name}</span>
            ${selected.sku ? html`<span class="product-sku">${selected.sku}</span>` : nothing}
            <span class="product-price">${this.#formatPrice(selected.price)}</span>
          </div>
        </div>
        ${!this.readonly
          ? html`
              <div class="actions">
                <uui-button
                  compact
                  look="secondary"
                  label="Change"
                  @click=${this.#openPicker}>
                  <uui-icon name="icon-edit"></uui-icon>
                </uui-button>
                <uui-button
                  compact
                  look="secondary"
                  label="Clear"
                  @click=${this.#onClear}>
                  <uui-icon name="icon-trash"></uui-icon>
                </uui-button>
              </div>
            `
          : nothing}
      </div>
    `;
  }

  #renderMultiSelect(): unknown {
    const canAddMore = !this.readonly && this._selection.length < this._maxItems;

    return html`
      <div class="product-list">
        ${repeat(
          this._selection,
          (item) => item.id,
          (item) => this.#renderProductItem(item)
        )}
      </div>
      ${canAddMore
        ? html`
            <uui-button
              look="placeholder"
              label="Add product"
              @click=${this.#openPicker}
              ?disabled=${this._isLoading}>
              ${this._isLoading ? "Loading..." : "Add product"}
            </uui-button>
          `
        : nothing}
    `;
  }

  #renderProductItem(item: SelectedProduct): unknown {
    if (item.notFound) {
      return html`
        <div class="product-item not-found" data-id=${item.id}>
          <uui-icon name="icon-navigation" class="drag-handle"></uui-icon>
          <div class="product-image-placeholder">
            <uui-icon name="icon-alert"></uui-icon>
          </div>
          <div class="product-details">
            <span class="product-name">Product not found</span>
            <span class="product-id">ID: ${item.id}</span>
          </div>
          ${!this.readonly
            ? html`
                <uui-button
                  compact
                  look="secondary"
                  label="Remove"
                  @click=${() => this.#onRemove(item.id)}>
                  <uui-icon name="icon-trash"></uui-icon>
                </uui-button>
              `
            : nothing}
        </div>
      `;
    }

    return html`
      <div class="product-item" data-id=${item.id}>
        <uui-icon name="icon-navigation" class="drag-handle"></uui-icon>
        <merchello-product-image
          media-key=${item.imageUrl ?? ""}
          size="small"
          alt=${item.name}>
        </merchello-product-image>
        <div class="product-details">
          <span class="product-name">${item.name}</span>
          ${item.sku ? html`<span class="product-sku">${item.sku}</span>` : nothing}
        </div>
        <span class="product-price">${this.#formatPrice(item.price)}</span>
        ${!this.readonly
          ? html`
              <uui-button
                compact
                look="secondary"
                label="Remove"
                @click=${() => this.#onRemove(item.id)}>
                <uui-icon name="icon-trash"></uui-icon>
              </uui-button>
            `
          : nothing}
      </div>
    `;
  }

  override render() {
    if (this._isLoading && this._selection.length === 0) {
      return html`<uui-loader></uui-loader>`;
    }

    return this._maxItems === 1
      ? this.#renderSingleSelect()
      : this.#renderMultiSelect();
  }

  static override readonly styles = css`
    :host {
      display: block;
    }

    .single-select-display {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: var(--uui-size-space-3);
      background: var(--uui-color-surface-alt);
      border-radius: var(--uui-border-radius);
    }

    .single-select-display.not-found {
      background: var(--uui-color-danger-standalone);
    }

    .product-info {
      display: flex;
      align-items: center;
      gap: var(--uui-size-space-3);
    }

    .product-details {
      display: flex;
      flex-direction: column;
      gap: var(--uui-size-space-1);
    }

    .product-name {
      font-weight: 500;
    }

    .product-sku {
      color: var(--uui-color-text-alt);
      font-size: 0.85em;
    }

    .product-id {
      color: var(--uui-color-text-alt);
      font-size: 0.75em;
      font-family: monospace;
    }

    .product-price {
      color: var(--uui-color-positive);
      font-weight: 600;
      font-size: 0.9em;
    }

    .product-image-placeholder {
      width: 40px;
      height: 40px;
      display: flex;
      align-items: center;
      justify-content: center;
      background: var(--uui-color-surface);
      border-radius: var(--uui-border-radius);
      color: var(--uui-color-danger);
    }

    .actions {
      display: flex;
      gap: var(--uui-size-space-1);
    }

    .product-list {
      display: flex;
      flex-direction: column;
      gap: var(--uui-size-space-2);
      margin-bottom: var(--uui-size-space-2);
    }

    .product-item {
      display: flex;
      align-items: center;
      gap: var(--uui-size-space-2);
      padding: var(--uui-size-space-3);
      background: var(--uui-color-surface-alt);
      border-radius: var(--uui-border-radius);
    }

    .product-item.not-found {
      background: var(--uui-color-danger-standalone);
    }

    .product-item .product-details {
      flex: 1;
    }

    .product-item .product-price {
      margin-right: var(--uui-size-space-2);
    }

    .drag-handle {
      cursor: grab;
      color: var(--uui-color-text-alt);
    }

    .drag-handle:active {
      cursor: grabbing;
    }

    uui-button[look="placeholder"] {
      width: 100%;
    }
  `;
}

export default MerchelloPropertyEditorUiProductPickerElement;

declare global {
  interface HTMLElementTagNameMap {
    "merchello-property-editor-ui-product-picker": MerchelloPropertyEditorUiProductPickerElement;
  }
}
