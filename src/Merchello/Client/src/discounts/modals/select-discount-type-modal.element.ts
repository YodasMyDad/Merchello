import { html, css } from "@umbraco-cms/backoffice/external/lit";
import { customElement, state } from "@umbraco-cms/backoffice/external/lit";
import { UmbModalBaseElement } from "@umbraco-cms/backoffice/modal";
import { modalLayoutStyles } from "@shared/styles/modal-layout.styles.js";
import {
  DiscountCategory,
  DISCOUNT_CATEGORIES,
} from "@discounts/types/discount.types.js";
import type {
  SelectDiscountTypeModalData,
  SelectDiscountTypeModalValue,
} from "@discounts/modals/select-discount-type-modal.token.js";

@customElement("merchello-select-discount-type-modal")
export class MerchelloSelectDiscountTypeModalElement extends UmbModalBaseElement<
  SelectDiscountTypeModalData,
  SelectDiscountTypeModalValue
> {
  @state() private _selectedCategory: DiscountCategory | null = null;

  private _handleCategorySelect(category: DiscountCategory): void {
    this._selectedCategory = category;
  }

  private _handleContinue(): void {
    if (this._selectedCategory === null) return;

    this.value = { selectedCategory: this._selectedCategory };
    this.modalContext?.submit();
  }

  private _handleCancel(): void {
    this.modalContext?.reject();
  }

  override render() {
    return html`
      <umb-body-layout headline="Create Discount">
        <div id="main">
          <p class="description">
            Select the type of discount you want to create.
          </p>

          <div class="category-grid">
            ${DISCOUNT_CATEGORIES.map(
              (cat) => html`
                <button
                  type="button"
                  aria-pressed=${this._selectedCategory === cat.category}
                  class="category-card ${this._selectedCategory === cat.category ? "selected" : ""}"
                  @click=${() => this._handleCategorySelect(cat.category)}
                >
                  <div class="category-icon">
                    <uui-icon name="${cat.icon}"></uui-icon>
                  </div>
                  <div class="category-content">
                    <div class="category-label">${cat.label}</div>
                    <div class="category-description">${cat.description}</div>
                  </div>
                </button>
              `
            )}
          </div>
        </div>

        <uui-button
          slot="actions"
          label="Cancel"
          look="secondary"
          @click=${this._handleCancel}
        >
          Cancel
        </uui-button>
        <uui-button
          slot="actions"
          label="Continue"
          look="primary"
          color="positive"
          @click=${this._handleContinue}
          ?disabled=${this._selectedCategory === null}
        >
          Continue
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

    .description {
      margin: 0 0 var(--uui-size-space-5);
      color: var(--uui-color-text-alt);
      font-size: 0.875rem;
      line-height: 1.5;
    }

    .category-grid {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: var(--uui-size-space-4);
    }

    @media (max-width: 600px) {
      .category-grid {
        grid-template-columns: 1fr;
      }
    }

    .category-card {
      display: flex;
      align-items: flex-start;
      gap: var(--uui-size-space-3);
      padding: var(--uui-size-space-4);
      border: 2px solid var(--uui-color-border);
      border-radius: var(--uui-border-radius);
      background: var(--uui-color-surface);
      cursor: pointer;
      text-align: left;
      transition: border-color 0.15s ease, background-color 0.15s ease;
    }

    .category-card:hover {
      border-color: var(--uui-color-interactive);
      background: var(--uui-color-surface-emphasis);
    }

    .category-card.selected {
      border-color: var(--uui-color-positive);
      background: color-mix(in srgb, var(--uui-color-positive) 10%, transparent);
    }

    .category-icon {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 40px;
      height: 40px;
      border-radius: 8px;
      background: var(--uui-color-surface-alt);
      flex-shrink: 0;
    }

    .category-icon uui-icon {
      font-size: 20px;
      color: var(--uui-color-interactive);
    }

    .category-card.selected .category-icon {
      background: var(--uui-color-positive);
    }

    .category-card.selected .category-icon uui-icon {
      color: var(--uui-color-positive-contrast);
    }

    .category-content {
      flex: 1;
    }

    .category-label {
      font-weight: 600;
      font-size: 0.9375rem;
      margin-bottom: var(--uui-size-space-1);
    }

    .category-description {
      font-size: 0.8125rem;
      color: var(--uui-color-text-alt);
      line-height: 1.4;
    }
  `,
  ];
}

export default MerchelloSelectDiscountTypeModalElement;

declare global {
  interface HTMLElementTagNameMap {
    "merchello-select-discount-type-modal": MerchelloSelectDiscountTypeModalElement;
  }
}

