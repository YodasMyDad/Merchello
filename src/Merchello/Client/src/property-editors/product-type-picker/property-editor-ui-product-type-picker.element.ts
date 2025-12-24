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
import { MERCHELLO_PRODUCT_TYPE_PICKER_MODAL } from "@product-types/modals/product-type-picker-modal.token.js";
import { MerchelloApi } from "@api/merchello-api.js";
import type { ProductTypeDto } from "@products/types/product.types.js";

interface SelectedProductType {
  id: string;
  name: string;
  alias: string | null;
  notFound: boolean;
}

@customElement("merchello-property-editor-ui-product-type-picker")
export class MerchelloPropertyEditorUiProductTypePickerElement
  extends UmbFormControlMixin<string | undefined, typeof UmbLitElement, undefined>(
    UmbLitElement,
    undefined
  )
  implements UmbPropertyEditorUiElement
{
  @property({ type: Boolean, reflect: true })
  readonly = false;

  @state()
  private _selection: SelectedProductType[] = [];

  @state()
  private _maxItems = 1;

  @state()
  private _isLoading = false;

  @state()
  private _allProductTypes: ProductTypeDto[] = [];

  #modalManager?: typeof UMB_MODAL_MANAGER_CONTEXT.TYPE;
  #isConnected = false;
  #loadingRequestId = 0; // Track request ID to handle race conditions

  // Sorter for multi-select drag-to-reorder
  #sorter = new UmbSorterController<SelectedProductType>(this, {
    getUniqueOfElement: (el) => el.getAttribute("data-id")!,
    getUniqueOfModel: (item) => item.id,
    identifier: "Merchello.ProductTypePicker",
    itemSelector: ".type-item",
    containerSelector: ".type-list",
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
  }

  override disconnectedCallback(): void {
    super.disconnectedCallback();
    this.#isConnected = false;
  }

  public set config(config: UmbPropertyEditorConfigCollection | undefined) {
    const maxItems = config?.getValueByAlias<number>("maxItems");
    this._maxItems = maxItems === 0 ? Infinity : maxItems ?? 1;
  }

  public override set value(val: string | undefined) {
    super.value = val;
    this.#loadSelectionFromValue(val);
  }

  public override get value(): string | undefined {
    return super.value;
  }

  async #loadSelectionFromValue(val: string | undefined): Promise<void> {
    // Increment request ID to track the latest request (handles race conditions)
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

    // Load all product types if not already loaded
    if (this._allProductTypes.length === 0) {
      this._isLoading = true;
      const { data } = await MerchelloApi.getProductTypes();

      // Check if this request is still the latest and component is still connected
      if (!this.#isConnected || requestId !== this.#loadingRequestId) return;

      this._allProductTypes = data ?? [];
      this._isLoading = false;
    }

    // Check again after async operation
    if (requestId !== this.#loadingRequestId) return;

    // Map IDs to full product type info, marking missing items as notFound
    const selection: SelectedProductType[] = [];
    for (const id of ids) {
      const productType = this._allProductTypes.find((t) => t.id === id);
      if (productType) {
        selection.push({
          id: productType.id,
          name: productType.name,
          alias: productType.alias,
          notFound: false,
        });
      } else {
        // Product type was deleted - keep the ID but mark as not found
        selection.push({
          id,
          name: "Product type not found",
          alias: null,
          notFound: true,
        });
      }
    }

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

    // Load product types if needed
    if (this._allProductTypes.length === 0) {
      this._isLoading = true;
      const { data } = await MerchelloApi.getProductTypes();
      if (!this.#isConnected) return;
      this._allProductTypes = data ?? [];
      this._isLoading = false;
    }

    const isMultiSelect = this._maxItems !== 1;
    const currentIds = this._selection.map((s) => s.id);

    const result = await this.#modalManager
      .open(this, MERCHELLO_PRODUCT_TYPE_PICKER_MODAL, {
        data: {
          excludeIds: currentIds,
          multiSelect: isMultiSelect,
        },
      })
      .onSubmit()
      .catch(() => undefined);

    if (!result || result.selectedIds.length === 0) return;

    // Build new selection from result
    const newItems: SelectedProductType[] = result.selectedIds.map((id, index) => {
      const productType = this._allProductTypes.find((t) => t.id === id);
      return {
        id,
        name: result.selectedNames[index] ?? productType?.name ?? "Unknown",
        alias: result.selectedAliases?.[index] ?? productType?.alias ?? null,
        notFound: false,
      };
    });

    if (isMultiSelect) {
      // Multi-select: append to existing
      const combined = [...this._selection, ...newItems];
      // Respect max limit
      this._selection =
        this._maxItems === Infinity
          ? combined
          : combined.slice(0, this._maxItems);
    } else {
      // Single select: replace
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

  #renderSingleSelect(): unknown {
    const selected = this._selection[0];

    if (!selected) {
      return html`
        <uui-button
          look="placeholder"
          label="Select product type"
          @click=${this.#openPicker}
          ?disabled=${this.readonly || this._isLoading}>
          ${this._isLoading ? "Loading..." : "Select a product type..."}
        </uui-button>
      `;
    }

    if (selected.notFound) {
      return html`
        <div class="single-select-display not-found">
          <div class="type-info">
            <uui-icon name="icon-alert"></uui-icon>
            <span class="type-name">${selected.name}</span>
            <span class="type-id">ID: ${selected.id}</span>
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
        <div class="type-info">
          <uui-icon name="icon-tags"></uui-icon>
          <span class="type-name">${selected.name}</span>
          ${selected.alias
            ? html`<span class="type-alias">(${selected.alias})</span>`
            : nothing}
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
    const canAddMore =
      !this.readonly && this._selection.length < this._maxItems;

    return html`
      <div class="type-list">
        ${repeat(
          this._selection,
          (item) => item.id,
          (item) => this.#renderTypeItem(item)
        )}
      </div>
      ${canAddMore
        ? html`
            <uui-button
              look="placeholder"
              label="Add product type"
              @click=${this.#openPicker}
              ?disabled=${this._isLoading}>
              ${this._isLoading ? "Loading..." : "Add product type"}
            </uui-button>
          `
        : nothing}
    `;
  }

  #renderTypeItem(item: SelectedProductType): unknown {
    if (item.notFound) {
      return html`
        <div class="type-item not-found" data-id=${item.id}>
          <uui-icon name="icon-navigation" class="drag-handle"></uui-icon>
          <uui-icon name="icon-alert"></uui-icon>
          <span class="type-name">${item.name}</span>
          <span class="type-id">ID: ${item.id}</span>
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
      <div class="type-item" data-id=${item.id}>
        <uui-icon name="icon-navigation" class="drag-handle"></uui-icon>
        <uui-icon name="icon-tags"></uui-icon>
        <span class="type-name">${item.name}</span>
        ${item.alias
          ? html`<span class="type-alias">(${item.alias})</span>`
          : nothing}
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

    .type-info {
      display: flex;
      align-items: center;
      gap: var(--uui-size-space-2);
    }

    .type-name {
      font-weight: 500;
    }

    .type-alias {
      color: var(--uui-color-text-alt);
      font-size: 0.9em;
    }

    .actions {
      display: flex;
      gap: var(--uui-size-space-1);
    }

    .type-list {
      display: flex;
      flex-direction: column;
      gap: var(--uui-size-space-2);
      margin-bottom: var(--uui-size-space-2);
    }

    .type-item {
      display: flex;
      align-items: center;
      gap: var(--uui-size-space-2);
      padding: var(--uui-size-space-3);
      background: var(--uui-color-surface-alt);
      border-radius: var(--uui-border-radius);
    }

    .type-item .type-name {
      flex: 1;
    }

    .not-found {
      background: var(--uui-color-danger-standalone);
    }

    .type-id {
      color: var(--uui-color-text-alt);
      font-size: 0.75em;
      font-family: monospace;
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

export default MerchelloPropertyEditorUiProductTypePickerElement;

declare global {
  interface HTMLElementTagNameMap {
    "merchello-property-editor-ui-product-type-picker": MerchelloPropertyEditorUiProductTypePickerElement;
  }
}
