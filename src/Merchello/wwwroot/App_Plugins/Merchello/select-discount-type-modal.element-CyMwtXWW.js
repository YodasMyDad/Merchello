import { html as s, css as u, state as d, customElement as g } from "@umbraco-cms/backoffice/external/lit";
import { UmbModalBaseElement as p } from "@umbraco-cms/backoffice/modal";
import { e as y } from "./discount.types-DX82Q6oV.js";
var v = Object.defineProperty, m = Object.getOwnPropertyDescriptor, n = (e, r, a, i) => {
  for (var t = i > 1 ? void 0 : i ? m(r, a) : r, c = e.length - 1, l; c >= 0; c--)
    (l = e[c]) && (t = (i ? l(r, a, t) : l(t)) || t);
  return i && t && v(r, a, t), t;
};
let o = class extends p {
  constructor() {
    super(...arguments), this._selectedCategory = null;
  }
  _handleCategorySelect(e) {
    this._selectedCategory = e;
  }
  _handleContinue() {
    this._selectedCategory !== null && (this.value = { selectedCategory: this._selectedCategory }, this.modalContext?.submit());
  }
  _handleCancel() {
    this.modalContext?.reject();
  }
  render() {
    return s`
      <umb-body-layout headline="Create Discount">
        <div id="main">
          <p class="description">
            Select the type of discount you want to create.
          </p>

          <div class="category-grid">
            ${y.map(
      (e) => s`
                <button
                  type="button"
                  aria-pressed=${this._selectedCategory === e.category}
                  class="category-card ${this._selectedCategory === e.category ? "selected" : ""}"
                  @click=${() => this._handleCategorySelect(e.category)}
                >
                  <div class="category-icon">
                    <uui-icon name="${e.icon}"></uui-icon>
                  </div>
                  <div class="category-content">
                    <div class="category-label">${e.label}</div>
                    <div class="category-description">${e.description}</div>
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
};
o.styles = u`
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
  `;
n([
  d()
], o.prototype, "_selectedCategory", 2);
o = n([
  g("merchello-select-discount-type-modal")
], o);
const C = o;
export {
  o as MerchelloSelectDiscountTypeModalElement,
  C as default
};
//# sourceMappingURL=select-discount-type-modal.element-CyMwtXWW.js.map
