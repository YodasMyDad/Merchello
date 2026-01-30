import { LitElement, html } from "@umbraco-cms/backoffice/external/lit";
import { customElement, property } from "@umbraco-cms/backoffice/external/lit";
import { UmbElementMixin } from "@umbraco-cms/backoffice/element-api";
import { badgeStyles } from "@shared/styles/badge.styles.js";

/**
 * Reusable status badge component.
 * Expects CSS class and label values provided by the backend.
 *
 * @example
 * ```html
 * <merchello-status-badge cssClass="paid" label="Paid"></merchello-status-badge>
 * <merchello-status-badge cssClass="fulfilled" label="Fulfilled"></merchello-status-badge>
 * ```
 */
@customElement("merchello-status-badge")
export class MerchelloStatusBadgeElement extends UmbElementMixin(LitElement) {
  /**
   * CSS class for the badge (provided by backend DTOs).
   */
  @property({ type: String })
  cssClass = "";

  /**
   * Display label for the badge.
   */
  @property({ type: String })
  label = "";

  override render() {
    return html`<span class="badge ${this.cssClass}">${this.label}</span>`;
  }

  static override readonly styles = [badgeStyles];
}

export default MerchelloStatusBadgeElement;

declare global {
  interface HTMLElementTagNameMap {
    "merchello-status-badge": MerchelloStatusBadgeElement;
  }
}
