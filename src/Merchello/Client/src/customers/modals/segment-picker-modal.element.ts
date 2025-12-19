import { html, css } from "@umbraco-cms/backoffice/external/lit";
import { customElement, state } from "@umbraco-cms/backoffice/external/lit";
import { UmbModalBaseElement } from "@umbraco-cms/backoffice/modal";
import type { SegmentPickerModalData, SegmentPickerModalValue } from "./segment-picker-modal.token.js";
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

  connectedCallback(): void {
    super.connectedCallback();
    this.#isConnected = true;
    this._loadSegments();
  }

  disconnectedCallback(): void {
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

    // Filter out excluded segments and only show active ones
    const excludeIds = this.data?.excludeIds ?? [];
    this._segments = (data ?? []).filter(
      (s) => !excludeIds.includes(s.id) && s.isActive
    );
    this._isLoading = false;
  }

  private _toggleSelection(segment: CustomerSegmentListItemDto): void {
    const multiSelect = this.data?.multiSelect !== false; // default to true

    if (this._selectedIds.includes(segment.id)) {
      // Remove from selection - find the index and remove from both arrays
      const index = this._selectedIds.indexOf(segment.id);
      this._selectedIds = this._selectedIds.filter((_, i) => i !== index);
      this._selectedNames = this._selectedNames.filter((_, i) => i !== index);
    } else {
      if (multiSelect) {
        this._selectedIds = [...this._selectedIds, segment.id];
        this._selectedNames = [...this._selectedNames, segment.name];
      } else {
        this._selectedIds = [segment.id];
        this._selectedNames = [segment.name];
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

  private _renderSegmentRow(segment: CustomerSegmentListItemDto): unknown {
    const isSelected = this._selectedIds.includes(segment.id);

    return html`
      <uui-table-row
        selectable
        ?selected=${isSelected}
        @click=${() => this._toggleSelection(segment)}>
        <uui-table-cell style="width: 40px;">
          <uui-checkbox
            .checked=${isSelected}
            @change=${(e: Event) => {
              e.stopPropagation();
              this._toggleSelection(segment);
            }}>
          </uui-checkbox>
        </uui-table-cell>
        <uui-table-cell>
          <div class="segment-info">
            <uui-icon name="icon-users"></uui-icon>
            <div class="segment-details">
              <span class="segment-name">${segment.name}</span>
              ${segment.description
                ? html`<span class="segment-description">${segment.description}</span>`
                : null}
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
      return html`<div class="error-banner">${this._errorMessage}</div>`;
    }

    if (this._segments.length === 0) {
      return html`<p class="empty-state">No active segments available.</p>`;
    }

    return html`
      <uui-table class="segments-table">
        <uui-table-head>
          <uui-table-head-cell style="width: 40px;"></uui-table-head-cell>
          <uui-table-head-cell>Segment</uui-table-head-cell>
          <uui-table-head-cell class="center">Members</uui-table-head-cell>
        </uui-table-head>
        ${this._segments.map((segment) => this._renderSegmentRow(segment))}
      </uui-table>
    `;
  }

  render() {
    const selectedCount = this._selectedIds.length;

    return html`
      <umb-body-layout headline="Select Customer Segments">
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

  static styles = css`
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

    .segments-table {
      width: 100%;
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
    }

    .segment-info {
      display: flex;
      align-items: flex-start;
      gap: var(--uui-size-space-2);
    }

    .segment-details {
      display: flex;
      flex-direction: column;
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

export default MerchelloSegmentPickerModalElement;

declare global {
  interface HTMLElementTagNameMap {
    "merchello-segment-picker-modal": MerchelloSegmentPickerModalElement;
  }
}
