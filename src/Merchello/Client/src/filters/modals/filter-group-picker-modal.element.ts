import { html, css } from "@umbraco-cms/backoffice/external/lit";
import { customElement, state } from "@umbraco-cms/backoffice/external/lit";
import { UmbModalBaseElement } from "@umbraco-cms/backoffice/modal";
import type { FilterGroupPickerModalData, FilterGroupPickerModalValue } from "./filter-group-picker-modal.token.js";
import { MerchelloApi } from "@api/merchello-api.js";
import type { ProductFilterGroupDto } from "@filters/types/filters.types.js";

@customElement("merchello-filter-group-picker-modal")
export class MerchelloFilterGroupPickerModalElement extends UmbModalBaseElement<
  FilterGroupPickerModalData,
  FilterGroupPickerModalValue
> {
  @state() private _selectedIds: string[] = [];
  @state() private _selectedNames: string[] = [];
  @state() private _filterGroups: ProductFilterGroupDto[] = [];
  @state() private _isLoading = true;
  @state() private _errorMessage: string | null = null;

  #isConnected = false;

  override connectedCallback(): void {
    super.connectedCallback();
    this.#isConnected = true;
    this._loadFilterGroups();
  }

  override disconnectedCallback(): void {
    super.disconnectedCallback();
    this.#isConnected = false;
  }

  private async _loadFilterGroups(): Promise<void> {
    this._isLoading = true;
    this._errorMessage = null;

    const { data, error } = await MerchelloApi.getFilterGroups();

    if (!this.#isConnected) return;

    if (error) {
      this._errorMessage = error.message;
      this._isLoading = false;
      return;
    }

    const excludeIds = this.data?.excludeIds ?? [];
    this._filterGroups = (data ?? []).filter((g) => !excludeIds.includes(g.id));
    this._isLoading = false;
  }

  private _toggleSelection(filterGroup: ProductFilterGroupDto): void {
    const multiSelect = this.data?.multiSelect !== false;

    if (this._selectedIds.includes(filterGroup.id)) {
      // Remove from selection
      const index = this._selectedIds.indexOf(filterGroup.id);
      this._selectedIds = this._selectedIds.filter((_, i) => i !== index);
      this._selectedNames = this._selectedNames.filter((_, i) => i !== index);
    } else {
      if (multiSelect) {
        this._selectedIds = [...this._selectedIds, filterGroup.id];
        this._selectedNames = [...this._selectedNames, filterGroup.name];
      } else {
        this._selectedIds = [filterGroup.id];
        this._selectedNames = [filterGroup.name];
      }
    }
  }

  private _handleSubmit(): void {
    this.value = {
      selectedIds: this._selectedIds,
      selectedNames: this._selectedNames,
    };
    this.modalContext?.submit();
  }

  private _handleCancel(): void {
    this.modalContext?.reject();
  }

  private _renderFilterGroupRow(filterGroup: ProductFilterGroupDto): unknown {
    const isSelected = this._selectedIds.includes(filterGroup.id);
    const filterCount = filterGroup.filters?.length ?? 0;

    return html`
      <uui-table-row
        selectable
        ?selected=${isSelected}
        @click=${() => this._toggleSelection(filterGroup)}>
        <uui-table-cell style="width: 40px;">
          <uui-checkbox
            .checked=${isSelected}
            @change=${(e: Event) => {
              e.stopPropagation();
              this._toggleSelection(filterGroup);
            }}>
          </uui-checkbox>
        </uui-table-cell>
        <uui-table-cell>
          <div class="group-info">
            <uui-icon name="icon-filter"></uui-icon>
            <span class="group-name">${filterGroup.name}</span>
          </div>
        </uui-table-cell>
        <uui-table-cell class="filter-count">${filterCount} filter${filterCount !== 1 ? "s" : ""}</uui-table-cell>
      </uui-table-row>
    `;
  }

  private _renderContent(): unknown {
    if (this._isLoading) {
      return html`<div class="loading"><uui-loader></uui-loader></div>`;
    }

    if (this._errorMessage) {
      return html`<div class="error-banner">${this._errorMessage}</div>`;
    }

    if (this._filterGroups.length === 0) {
      return html`<p class="empty-state">No filter groups available.</p>`;
    }

    return html`
      <uui-table class="groups-table">
        <uui-table-head>
          <uui-table-head-cell style="width: 40px;"></uui-table-head-cell>
          <uui-table-head-cell>Name</uui-table-head-cell>
          <uui-table-head-cell>Filters</uui-table-head-cell>
        </uui-table-head>
        ${this._filterGroups.map((group) => this._renderFilterGroupRow(group))}
      </uui-table>
    `;
  }

  override render() {
    const selectedCount = this._selectedIds.length;

    return html`
      <umb-body-layout headline="Select Filter Groups">
        <div id="main">
          <div class="results-container">${this._renderContent()}</div>
        </div>

        <div slot="actions">
          <uui-button label="Cancel" look="secondary" @click=${this._handleCancel}>
            Cancel
          </uui-button>
          <uui-button
            label="Add Selected"
            look="primary"
            color="positive"
            ?disabled=${selectedCount === 0}
            @click=${this._handleSubmit}>
            Add Selected (${selectedCount})
          </uui-button>
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
      height: 100%;
    }

    .results-container {
      flex: 1;
      overflow-y: auto;
      min-height: 300px;
    }

    .groups-table {
      width: 100%;
    }

    uui-table-row[selectable] {
      cursor: pointer;
    }

    uui-table-row[selected] {
      background: var(--uui-color-selected);
    }

    .group-info {
      display: flex;
      align-items: center;
      gap: var(--uui-size-space-2);
    }

    .group-name {
      font-weight: 500;
    }

    .filter-count {
      color: var(--uui-color-text-alt);
      font-size: var(--uui-type-small-size);
    }

    .loading {
      display: flex;
      justify-content: center;
      padding: var(--uui-size-space-6);
    }

    .empty-state {
      color: var(--uui-color-text-alt);
      text-align: center;
      padding: var(--uui-size-space-6);
    }

    .error-banner {
      padding: var(--uui-size-space-3);
      background: var(--uui-color-danger-standalone);
      color: var(--uui-color-danger-contrast);
      border-radius: var(--uui-border-radius);
    }

    [slot="actions"] {
      display: flex;
      gap: var(--uui-size-space-2);
      justify-content: flex-end;
    }
  `;
}

export default MerchelloFilterGroupPickerModalElement;

declare global {
  interface HTMLElementTagNameMap {
    "merchello-filter-group-picker-modal": MerchelloFilterGroupPickerModalElement;
  }
}
