import { LitElement, html, css, nothing } from "@umbraco-cms/backoffice/external/lit";
import { customElement, property } from "@umbraco-cms/backoffice/external/lit";
import { UmbElementMixin } from "@umbraco-cms/backoffice/element-api";
import type { PaginationState, PageChangeEventDetail } from "../types/pagination.types.js";
import { getPaginationRangeText, hasPreviousPage, hasNextPage } from "../types/pagination.types.js";

/**
 * Reusable pagination component for paginated lists.
 *
 * @fires page-change - Dispatched when page changes. Detail contains { page: number }
 *
 * @example
 * ```html
 * <merchello-pagination
 *   .state=${{ page: 1, pageSize: 50, totalItems: 200, totalPages: 4 }}
 *   @page-change=${(e) => this._handlePageChange(e.detail.page)}
 * ></merchello-pagination>
 * ```
 */
@customElement("merchello-pagination")
export class MerchelloPaginationElement extends UmbElementMixin(LitElement) {
  @property({ type: Object })
  state: PaginationState = {
    page: 1,
    pageSize: 50,
    totalItems: 0,
    totalPages: 0,
  };

  @property({ type: Boolean })
  disabled = false;

  private _handlePrevious(): void {
    if (hasPreviousPage(this.state) && !this.disabled) {
      this._dispatchPageChange(this.state.page - 1);
    }
  }

  private _handleNext(): void {
    if (hasNextPage(this.state) && !this.disabled) {
      this._dispatchPageChange(this.state.page + 1);
    }
  }

  private _dispatchPageChange(page: number): void {
    const detail: PageChangeEventDetail = { page };
    this.dispatchEvent(
      new CustomEvent("page-change", {
        detail,
        bubbles: true,
        composed: true,
      })
    );
  }

  render() {
    if (this.state.totalItems === 0) {
      return nothing;
    }

    const canGoPrevious = hasPreviousPage(this.state);
    const canGoNext = hasNextPage(this.state);

    return html`
      <div class="pagination">
        <span class="pagination-info">${getPaginationRangeText(this.state)}</span>
        <div class="pagination-controls">
          <button
            class="pagination-button"
            ?disabled=${!canGoPrevious || this.disabled}
            @click=${this._handlePrevious}
            aria-label="Previous page"
            title="Previous page"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polyline points="15,18 9,12 15,6" />
            </svg>
          </button>
          <span class="pagination-page">${this.state.page} / ${this.state.totalPages}</span>
          <button
            class="pagination-button"
            ?disabled=${!canGoNext || this.disabled}
            @click=${this._handleNext}
            aria-label="Next page"
            title="Next page"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polyline points="9,6 15,12 9,18" />
            </svg>
          </button>
        </div>
      </div>
    `;
  }

  static styles = css`
    :host {
      display: block;
    }

    .pagination {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: var(--uui-size-space-4);
      padding: var(--uui-size-space-3) 0;
    }

    .pagination-info {
      color: var(--uui-color-text-alt);
      font-size: var(--uui-type-small-size);
    }

    .pagination-controls {
      display: flex;
      align-items: center;
      gap: var(--uui-size-space-2);
    }

    .pagination-page {
      font-size: var(--uui-type-small-size);
      color: var(--uui-color-text);
      min-width: 60px;
      text-align: center;
    }

    .pagination-button {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 32px;
      height: 32px;
      padding: 0;
      border: 1px solid var(--uui-color-border);
      border-radius: var(--uui-border-radius);
      background: var(--uui-color-surface);
      color: var(--uui-color-text);
      cursor: pointer;
      transition: all 120ms ease;
    }

    .pagination-button:hover:not(:disabled) {
      background: var(--uui-color-surface-emphasis);
      border-color: var(--uui-color-border-emphasis);
    }

    .pagination-button:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }

    .pagination-button svg {
      width: 16px;
      height: 16px;
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    "merchello-pagination": MerchelloPaginationElement;
  }
}

