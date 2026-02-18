import { LitElement, html, css, nothing } from "@umbraco-cms/backoffice/external/lit";
import { customElement, property } from "@umbraco-cms/backoffice/external/lit";
import { UmbElementMixin } from "@umbraco-cms/backoffice/element-api";

/**
 * Reusable empty state component for lists and tables.
 *
 * @example
 * ```html
 * <merchello-empty-state
 *   icon="icon-receipt-dollar"
 *   headline="No orders found"
 *   message="Orders will appear here once customers place them.">
 * </merchello-empty-state>
 * ```
 */
@customElement("merchello-empty-state")
export class MerchelloEmptyStateElement extends UmbElementMixin(LitElement) {
  /**
   * Icon name to display (from UUI icon set).
   */
  @property({ type: String })
  icon = "icon-box";

  /**
   * Main headline text.
   */
  @property({ type: String })
  headline = "No items found";

  /**
   * Optional description message.
   */
  @property({ type: String })
  message?: string;

  override render() {
    return html`
      <div class="empty-state">
        <uui-icon name=${this.icon}></uui-icon>
        <h3>${this.headline}</h3>
        ${this.message ? html`<p>${this.message}</p>` : nothing}
        <slot name="actions"></slot>
        <slot name="action"></slot>
      </div>
    `;
  }

  static override readonly styles = css`
    :host {
      display: block;
    }

    .empty-state {
      text-align: center;
      padding: var(--uui-size-layout-2);
      color: var(--uui-color-text-alt);
    }

    .empty-state uui-icon {
      font-size: 3rem;
      margin-bottom: var(--uui-size-space-4);
    }

    .empty-state h3 {
      margin: 0 0 var(--uui-size-space-2);
      color: var(--uui-color-text);
    }

    .empty-state p {
      margin: 0;
    }

    ::slotted([slot="actions"]),
    ::slotted([slot="action"]) {
      margin-top: var(--uui-size-space-4);
    }
  `;
}

export default MerchelloEmptyStateElement;

declare global {
  interface HTMLElementTagNameMap {
    "merchello-empty-state": MerchelloEmptyStateElement;
  }
}
