import {
  css,
  html,
  nothing,
  customElement,
  state,
} from "@umbraco-cms/backoffice/external/lit";
import { UmbModalBaseElement } from "@umbraco-cms/backoffice/modal";
import { MerchelloApi } from "@api/merchello-api.js";
import { modalLayoutStyles } from "@shared/styles/modal-layout.styles.js";
import type {
  HealthCheckDetailModalData,
  HealthCheckDetailModalValue,
  HealthCheckDetailItemDto,
} from "@health-checks/types/health-check.types.js";

const PAGE_SIZE = 25;

@customElement("merchello-health-check-detail-modal")
export class MerchelloHealthCheckDetailModalElement extends UmbModalBaseElement<
  HealthCheckDetailModalData,
  HealthCheckDetailModalValue
> {
  @state() private _items: HealthCheckDetailItemDto[] = [];
  @state() private _isLoading = false;
  @state() private _currentPage = 1;
  @state() private _totalItems = 0;
  @state() private _totalPages = 0;
  @state() private _errorMessage: string | null = null;

  override connectedCallback(): void {
    super.connectedCallback();
    void this._loadPage(1);
  }

  private async _loadPage(page: number): Promise<void> {
    const alias = this.data?.alias;
    if (!alias) return;

    this._isLoading = true;
    this._errorMessage = null;

    const { data, error } = await MerchelloApi.getHealthCheckDetail(alias, page, PAGE_SIZE);

    this._isLoading = false;

    if (error || !data) {
      this._errorMessage = error?.message ?? "Failed to load details.";
      return;
    }

    this._items = data.items;
    this._currentPage = data.page;
    this._totalItems = data.totalItems;
    this._totalPages = data.totalPages;
  }

  private _goToPage(page: number): void {
    if (page < 1 || page > this._totalPages) return;
    void this._loadPage(page);
  }

  private _navigateToItem(item: HealthCheckDetailItemDto): void {
    if (!item.editPath) return;
    // Navigate within the backoffice using history
    window.history.pushState({}, "", item.editPath);
    this._close();
  }

  private _close(): void {
    this.value = { refreshed: true };
    this.modalContext?.submit();
  }

  private _renderItems(): unknown {
    if (this._isLoading) {
      return html`<div class="loading"><uui-loader></uui-loader></div>`;
    }

    if (this._errorMessage) {
      return html`
        <div class="error-banner">
          <umb-icon name="icon-alert"></umb-icon>
          <span>${this._errorMessage}</span>
        </div>
      `;
    }

    if (this._items.length === 0) {
      return html`<p class="hint">No affected items found.</p>`;
    }

    return html`
      <div class="items-table-wrap">
        <uui-table>
          <uui-table-head>
            <uui-table-head-cell>Name</uui-table-head-cell>
            <uui-table-head-cell>Details</uui-table-head-cell>
            <uui-table-head-cell style="width: 80px"></uui-table-head-cell>
          </uui-table-head>
          ${this._items.map((item) => html`
            <uui-table-row>
              <uui-table-cell>
                <span class="item-name">${item.name}</span>
              </uui-table-cell>
              <uui-table-cell>
                ${item.description
                  ? html`<span class="item-description">${item.description}</span>`
                  : nothing}
              </uui-table-cell>
              <uui-table-cell>
                ${item.editPath
                  ? html`
                      <uui-button
                        compact
                        look="secondary"
                        label="Edit ${item.name}"
                        @click=${() => this._navigateToItem(item)}>
                        Edit
                      </uui-button>
                    `
                  : nothing}
              </uui-table-cell>
            </uui-table-row>
          `)}
        </uui-table>
      </div>
    `;
  }

  private _renderPagination(): unknown {
    if (this._totalPages <= 1) return nothing;

    return html`
      <div class="pagination">
        <uui-button
          compact
          look="secondary"
          label="Previous page"
          ?disabled=${this._currentPage <= 1 || this._isLoading}
          @click=${() => this._goToPage(this._currentPage - 1)}>
          Previous
        </uui-button>

        <span class="pagination-info">
          Page ${this._currentPage} of ${this._totalPages}
          (${this._totalItems} item${this._totalItems === 1 ? "" : "s"})
        </span>

        <uui-button
          compact
          look="secondary"
          label="Next page"
          ?disabled=${this._currentPage >= this._totalPages || this._isLoading}
          @click=${() => this._goToPage(this._currentPage + 1)}>
          Next
        </uui-button>
      </div>
    `;
  }

  override render() {
    const name = this.data?.name ?? "Health Check";
    const description = this.data?.description ?? "";

    return html`
      <umb-body-layout headline=${name}>
        <div id="main">
          ${description
            ? html`<p class="check-description">${description}</p>`
            : nothing}

          ${this._renderItems()}
          ${this._renderPagination()}
        </div>

        <uui-button slot="actions" look="secondary" label="Close" @click=${this._close}>
          Close
        </uui-button>
      </umb-body-layout>
    `;
  }

  static override readonly styles = [
    modalLayoutStyles,
    css`
      :host {
        display: block;
      }

      #main {
        display: flex;
        flex-direction: column;
        gap: var(--uui-size-space-4);
      }

      .check-description {
        margin: 0;
        color: var(--uui-color-text-alt);
        font-size: var(--uui-type-default-size);
        line-height: 1.5;
      }

      .items-table-wrap {
        border: 1px solid var(--uui-color-border);
        border-radius: var(--uui-border-radius);
        overflow-x: auto;
      }

      .item-name {
        font-weight: 600;
        color: var(--uui-color-text);
      }

      .item-description {
        color: var(--uui-color-text-alt);
        font-size: var(--uui-type-small-size);
      }

      .pagination {
        display: flex;
        align-items: center;
        justify-content: center;
        gap: var(--uui-size-space-3);
        padding: var(--uui-size-space-3) 0;
      }

      .pagination-info {
        font-size: var(--uui-type-small-size);
        color: var(--uui-color-text-alt);
      }

      .loading {
        display: flex;
        justify-content: center;
        padding: var(--uui-size-space-5);
      }

      .hint {
        margin: 0;
        color: var(--uui-color-text-alt);
        font-size: var(--uui-type-small-size);
        text-align: center;
        padding: var(--uui-size-space-5);
      }

      .error-banner {
        display: flex;
        align-items: center;
        gap: var(--uui-size-space-2);
        padding: var(--uui-size-space-3);
        border-radius: var(--uui-border-radius);
        background: var(--uui-color-danger-standalone);
        color: var(--uui-color-danger-contrast);
      }
    `,
  ];
}

export default MerchelloHealthCheckDetailModalElement;

declare global {
  interface HTMLElementTagNameMap {
    "merchello-health-check-detail-modal": MerchelloHealthCheckDetailModalElement;
  }
}
