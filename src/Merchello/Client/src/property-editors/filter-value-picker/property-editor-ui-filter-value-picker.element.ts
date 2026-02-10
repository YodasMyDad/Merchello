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
import { MERCHELLO_FILTER_PICKER_MODAL } from "@filters/modals/filter-picker-modal.token.js";
import { MerchelloApi } from "@api/merchello-api.js";
import type { ProductFilterGroupDto } from "@filters/types/filters.types.js";

interface SelectedFilter {
  id: string;
  name: string;
  groupName: string;
  hexColour: string | null;
  notFound: boolean;
}

@customElement("merchello-property-editor-ui-filter-value-picker")
export class MerchelloPropertyEditorUiFilterValuePickerElement
  extends UmbFormControlMixin<string | undefined, typeof UmbLitElement, undefined>(
    UmbLitElement,
    undefined
  )
  implements UmbPropertyEditorUiElement
{
  @property({ type: Boolean, reflect: true })
  readonly = false;

  @state()
  private _selection: SelectedFilter[] = [];

  @state()
  private _maxItems = Infinity;

  @state()
  private _filterGroupId?: string;

  @state()
  private _isLoading = false;

  @state()
  private _allFilterGroups: ProductFilterGroupDto[] = [];

  #modalManager?: typeof UMB_MODAL_MANAGER_CONTEXT.TYPE;
  #isConnected = false;
  #loadingRequestId = 0;

  // Sorter for multi-select drag-to-reorder
  #sorter = new UmbSorterController<SelectedFilter>(this, {
    getUniqueOfElement: (el) => el.getAttribute("data-id")!,
    getUniqueOfModel: (item) => item.id,
    identifier: "Merchello.FilterValuePicker",
    itemSelector: ".filter-item",
    containerSelector: ".filter-list",
    onChange: ({ model }) => {
      this._selection = model;
      this.#updateValue();
    },
  });

  constructor() {
    super();
    this.#sorter.disable();
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
    this._maxItems = maxItems === 0 ? Infinity : maxItems ?? Infinity;
    this._filterGroupId = config?.getValueByAlias<string>("filterGroupId");

    if (this._maxItems === 1) {
      this.#sorter.disable();
      return;
    }

    this.#sorter.enable();
    this.#sorter.setModel(this._selection);
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

    // Load all filter groups if not already loaded
    if (this._allFilterGroups.length === 0) {
      this._isLoading = true;
      const { data } = await MerchelloApi.getFilterGroups();

      if (!this.#isConnected || requestId !== this.#loadingRequestId) return;

      this._allFilterGroups = data ?? [];
      this._isLoading = false;
    }

    if (requestId !== this.#loadingRequestId) return;

    // Map IDs to full filter info by searching through all groups, marking missing items as notFound
    const selection: SelectedFilter[] = [];
    for (const id of ids) {
      const filter = this.#findFilterById(id);
      if (filter) {
        selection.push(filter);
      } else {
        // Filter was deleted - keep the ID but mark as not found
        selection.push({
          id,
          name: "Filter not found",
          groupName: "",
          hexColour: null,
          notFound: true,
        });
      }
    }

    this._selection = selection;
    if (this._maxItems !== 1) {
      this.#sorter.setModel(selection);
    }
  }

  #findFilterById(filterId: string): SelectedFilter | null {
    for (const group of this._allFilterGroups) {
      const filter = group.filters.find((f) => f.id === filterId);
      if (filter) {
        return {
          id: filter.id,
          name: filter.name,
          groupName: group.name,
          hexColour: filter.hexColour,
          notFound: false,
        };
      }
    }
    return null;
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

    // Load filter groups if needed
    if (this._allFilterGroups.length === 0) {
      this._isLoading = true;
      const { data } = await MerchelloApi.getFilterGroups();
      if (!this.#isConnected) return;
      this._allFilterGroups = data ?? [];
      this._isLoading = false;
    }

    const isMultiSelect = this._maxItems !== 1;
    const currentIds = this._selection.map((s) => s.id);

    const result = await this.#modalManager
      .open(this, MERCHELLO_FILTER_PICKER_MODAL, {
        data: {
          excludeFilterIds: currentIds,
          multiSelect: isMultiSelect,
          filterGroupId: this._filterGroupId,
        },
      })
      .onSubmit()
      .catch(() => undefined);

    if (!result || result.selectedFilterIds.length === 0) return;

    // Build new selection from result
    const newItems: SelectedFilter[] = result.selectedFilterIds.map((id, index) => {
      const filter = this.#findFilterById(id);
      // Parse the display name (format: "GroupName: FilterName")
      const displayName = result.selectedFilterNames[index] ?? "";
      const [groupName, filterName] = displayName.includes(": ")
        ? displayName.split(": ", 2)
        : ["", displayName];

      return {
        id,
        name: filter?.name ?? filterName,
        groupName: filter?.groupName ?? groupName,
        hexColour: filter?.hexColour ?? null,
        notFound: false,
      };
    });

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

  #renderColorSwatch(hexColour: string | null): unknown {
    if (!hexColour) return nothing;
    return html`
      <span
        class="color-swatch"
        style="background-color: ${hexColour};">
      </span>
    `;
  }

  #renderSingleSelect(): unknown {
    const selected = this._selection[0];

    if (!selected) {
      return html`
        <uui-button
          look="placeholder"
          label="Select filter"
          @click=${this.#openPicker}
          ?disabled=${this.readonly || this._isLoading}>
          ${this._isLoading ? "Loading..." : "Select a filter..."}
        </uui-button>
      `;
    }

    if (selected.notFound) {
      return html`
        <div class="single-select-display not-found">
          <div class="filter-info">
            <uui-icon name="icon-alert"></uui-icon>
            <span class="filter-name">${selected.name}</span>
            <span class="filter-id">ID: ${selected.id}</span>
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
        <div class="filter-info">
          ${this.#renderColorSwatch(selected.hexColour)}
          <span class="filter-name">${selected.name}</span>
          <span class="group-name">(${selected.groupName})</span>
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
      <div class="filter-list">
        ${repeat(
          this._selection,
          (item) => item.id,
          (item) => this.#renderFilterItem(item)
        )}
      </div>
      ${canAddMore
        ? html`
            <uui-button
              look="placeholder"
              label="Add filter"
              @click=${this.#openPicker}
              ?disabled=${this._isLoading}>
              ${this._isLoading ? "Loading..." : "Add filter"}
            </uui-button>
          `
        : nothing}
    `;
  }

  #renderFilterItem(item: SelectedFilter): unknown {
    if (item.notFound) {
      return html`
        <div class="filter-item not-found" data-id=${item.id}>
          <uui-icon name="icon-navigation" class="drag-handle"></uui-icon>
          <uui-icon name="icon-alert"></uui-icon>
          <span class="filter-name">${item.name}</span>
          <span class="filter-id">ID: ${item.id}</span>
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
      <div class="filter-item" data-id=${item.id}>
        <uui-icon name="icon-navigation" class="drag-handle"></uui-icon>
        ${this.#renderColorSwatch(item.hexColour)}
        <span class="filter-name">${item.name}</span>
        <span class="group-name">(${item.groupName})</span>
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
    const isMultiSelect = this._maxItems !== 1;

    if (!isMultiSelect && this._isLoading && this._selection.length === 0) {
      return html`<uui-loader></uui-loader>`;
    }

    return isMultiSelect
      ? this.#renderMultiSelect()
      : this.#renderSingleSelect();
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

    .filter-info {
      display: flex;
      align-items: center;
      gap: var(--uui-size-space-2);
    }

    .filter-name {
      font-weight: 500;
    }

    .group-name {
      color: var(--uui-color-text-alt);
      font-size: 0.9em;
    }

    .color-swatch {
      display: inline-block;
      width: 16px;
      height: 16px;
      border-radius: 2px;
      border: 1px solid var(--uui-color-border);
    }

    .actions {
      display: flex;
      gap: var(--uui-size-space-1);
    }

    .filter-list {
      display: flex;
      flex-direction: column;
      gap: var(--uui-size-space-2);
      margin-bottom: var(--uui-size-space-2);
    }

    .filter-item {
      display: flex;
      align-items: center;
      gap: var(--uui-size-space-2);
      padding: var(--uui-size-space-3);
      background: var(--uui-color-surface-alt);
      border-radius: var(--uui-border-radius);
    }

    .filter-item .filter-name {
      flex: 1;
    }

    .not-found {
      background: var(--uui-color-danger-standalone);
    }

    .filter-id {
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

export default MerchelloPropertyEditorUiFilterValuePickerElement;

declare global {
  interface HTMLElementTagNameMap {
    "merchello-property-editor-ui-filter-value-picker": MerchelloPropertyEditorUiFilterValuePickerElement;
  }
}
