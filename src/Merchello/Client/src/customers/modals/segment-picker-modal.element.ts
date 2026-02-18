import { html, css, nothing } from "@umbraco-cms/backoffice/external/lit";
import { customElement, state } from "@umbraco-cms/backoffice/external/lit";
import { UmbModalBaseElement } from "@umbraco-cms/backoffice/modal";
import type { SegmentPickerModalData, SegmentPickerModalValue } from "@customers/modals/segment-picker-modal.token.js";
import { MerchelloApi } from "@api/merchello-api.js";
import type { CustomerSegmentListItemDto } from "@customers/types/segment.types.js";

@customElement("merchello-segment-picker-modal")
export class MerchelloSegmentPickerModalElement extends UmbModalBaseElement<
  SegmentPickerModalData,
  SegmentPickerModalValue
> {
  @state() private _selectedIds: string[] = [];
  @state() private _selectedNames: string[] = [];
  @state() private _segments: CustomerSegmentListItemDto[] = [];
  @state() private _isLoading = true;
  @state() private _errorMessage: string | null = null;

  #isConnected = false;

  private get _isMultiSelect(): boolean {
    return this.data?.multiSelect !== false;
  }

  private get _selectedCount(): number {
    return this._selectedIds.length;
  }

  private get _isAllVisibleSelected(): boolean {
    if (!this._segments.length) return false;
    return this._segments.every((segment) => this._selectedIds.includes(segment.id));
  }

  private get _isPartiallySelected(): boolean {
    return this._selectedCount > 0 && !this._isAllVisibleSelected;
  }

  override connectedCallback(): void {
    super.connectedCallback();
    this.#isConnected = true;
    this._loadSegments();
  }

  override disconnectedCallback(): void {
    super.disconnectedCallback();
    this.#isConnected = false;
  }

  private async _loadSegments(): Promise<void> {
    this._isLoading = true;
    this._errorMessage = null;

    const { data, error } = await MerchelloApi.getCustomerSegments();

    if (!this.#isConnected) return;

    if (error) {
      this._errorMessage = error.message;
      this._isLoading = false;
      return;
    }

    const excludeIds = this.data?.excludeIds ?? [];
    this._segments = (data ?? []).filter((segment) => !excludeIds.includes(segment.id) && segment.isActive);
    this._isLoading = false;
  }

  private _toggleSelection(segment: CustomerSegmentListItemDto): void {
    const existingIndex = this._selectedIds.indexOf(segment.id);

    if (existingIndex !== -1) {
      this._selectedIds = this._selectedIds.filter((id) => id !== segment.id);
      this._selectedNames = this._selectedNames.filter((_, index) => index !== existingIndex);
      return;
    }

    if (this._isMultiSelect) {
      this._selectedIds = [...this._selectedIds, segment.id];
      this._selectedNames = [...this._selectedNames, segment.name];
      return;
    }

    this._selectedIds = [segment.id];
    this._selectedNames = [segment.name];
  }

  private _toggleSelectAll(): void {
    if (!this._isMultiSelect) return;

    if (this._isAllVisibleSelected) {
      this._selectedIds = [];
      this._selectedNames = [];
      return;
    }

    this._selectedIds = this._segments.map((segment) => segment.id);
    this._selectedNames = this._segments.map((segment) => segment.name);
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

  private _getSelectionLabel(segment: CustomerSegmentListItemDto): string {
    return `${this._isMultiSelect ? "Select" : "Choose"} segment ${segment.name}`;
  }

  private _renderSelectionCell(segment: CustomerSegmentListItemDto): unknown {
    const isSelected = this._selectedIds.includes(segment.id);
    const label = this._getSelectionLabel(segment);

    if (this._isMultiSelect) {
      return html`
        <uui-checkbox
          aria-label=${label}
          .checked=${isSelected}
          @click=${(e: Event) => e.stopPropagation()}
          @change=${() => this._toggleSelection(segment)}>
        </uui-checkbox>
      `;
    }

    return html`
      <uui-radio
        aria-label=${label}
        .checked=${isSelected}
        @click=${(e: Event) => e.stopPropagation()}
        @change=${() => this._toggleSelection(segment)}>
      </uui-radio>
    `;
  }

  private _renderSegmentRow(segment: CustomerSegmentListItemDto): unknown {
    const isSelected = this._selectedIds.includes(segment.id);

    return html`
      <uui-table-row
        selectable
        ?selected=${isSelected}
        @click=${() => this._toggleSelection(segment)}>
        <uui-table-cell class="selection-cell">
          ${this._renderSelectionCell(segment)}
        </uui-table-cell>
        <uui-table-cell>
          <div class="segment-info">
            <uui-icon name="icon-users"></uui-icon>
            <div class="segment-details">
              <span class="segment-name">${segment.name}</span>
              ${segment.description
                ? html`<span class="segment-description">${segment.description}</span>`
                : nothing}
            </div>
          </div>
        </uui-table-cell>
        <uui-table-cell class="center">${segment.memberCount}</uui-table-cell>
      </uui-table-row>
    `;
  }

  private _renderContent(): unknown {
    if (this._isLoading) {
      return html`<div class="loading"><uui-loader></uui-loader></div>`;
    }

    if (this._errorMessage) {
      return html`
        <div class="error-banner" role="alert">
          <uui-icon name="icon-alert"></uui-icon>
          <span>${this._errorMessage}</span>
        </div>
      `;
    }

    if (this._segments.length === 0) {
      return html`<p class="empty-state">No active segments are available.</p>`;
    }

    return html`
      <uui-table class="segments-table">
        <uui-table-head>
          <uui-table-head-cell class="selection-cell">
            ${this._isMultiSelect
              ? html`
                  <uui-checkbox
                    aria-label="Select all segments"
                    .checked=${this._isAllVisibleSelected}
                    .indeterminate=${this._isPartiallySelected}
                    @change=${() => this._toggleSelectAll()}>
                  </uui-checkbox>
                `
              : nothing}
          </uui-table-head-cell>
          <uui-table-head-cell>Segment</uui-table-head-cell>
          <uui-table-head-cell class="center">Members</uui-table-head-cell>
        </uui-table-head>
        ${this._segments.map((segment) => this._renderSegmentRow(segment))}
      </uui-table>
    `;
  }

  private _getPrimaryActionLabel(): string {
    if (this._isMultiSelect) {
      return `Add selected (${this._selectedCount})`;
    }

    return "Select segment";
  }

  override render() {
    return html`
      <umb-body-layout headline="Select customer segments">
        <div id="main">
          <uui-box>
            <p class="hint">Only active segments are shown.</p>
            <div class="results-header">
              <span class="results-count">${this._segments.length} available</span>
              <span class="selected-count">${this._selectedCount} selected</span>
            </div>
            <div class="results-container">${this._renderContent()}</div>
          </uui-box>
        </div>

        <uui-button slot="actions" label="Cancel" look="secondary" @click=${this._handleCancel}>
          Cancel
        </uui-button>
        <uui-button
          slot="actions"
          label=${this._getPrimaryActionLabel()}
          look="primary"
          color="positive"
          ?disabled=${this._selectedCount === 0 || this._isLoading}
          @click=${this._handleSubmit}>
          ${this._getPrimaryActionLabel()}
        </uui-button>
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

    .hint {
      margin: 0 0 var(--uui-size-space-3);
      color: var(--uui-color-text-alt);
      font-size: var(--uui-type-small-size);
    }

    .results-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: var(--uui-size-space-3);
      font-size: var(--uui-type-small-size);
    }

    .results-count {
      color: var(--uui-color-text-alt);
    }

    .selected-count {
      font-weight: 600;
    }

    .results-container {
      overflow-y: auto;
      min-height: 300px;
    }

    .segments-table {
      width: 100%;
    }

    .selection-cell {
      width: 44px;
      text-align: center;
    }

    uui-table-head-cell.center,
    uui-table-cell.center {
      text-align: center;
    }

    uui-table-row[selectable] {
      cursor: pointer;
    }

    uui-table-row[selected] {
      background: var(--uui-color-selected);
      color: var(--uui-color-selected-contrast, #fff);
      font-weight: 600;
    }

    uui-table-row[selected] .segment-description,
    uui-table-row[selected] .segment-name,
    uui-table-row[selected] uui-icon {
      color: var(--uui-color-selected-contrast, #fff);
    }

    .segment-info {
      display: flex;
      align-items: flex-start;
      gap: var(--uui-size-space-2);
    }

    .segment-details {
      display: flex;
      flex-direction: column;
      gap: 2px;
    }

    .segment-name {
      font-weight: 500;
    }

    .segment-description {
      font-size: var(--uui-type-small-size);
      color: var(--uui-color-text-alt);
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
      font-size: var(--uui-type-small-size);
    }

    .error-banner {
      display: flex;
      align-items: center;
      gap: var(--uui-size-space-2);
      padding: var(--uui-size-space-3);
      background: var(--uui-color-danger-standalone);
      color: var(--uui-color-danger-contrast);
      border-radius: var(--uui-border-radius);
    }

    .error-banner uui-icon {
      flex-shrink: 0;
    }
  `;
}

export default MerchelloSegmentPickerModalElement;

declare global {
  interface HTMLElementTagNameMap {
    "merchello-segment-picker-modal": MerchelloSegmentPickerModalElement;
  }
}
