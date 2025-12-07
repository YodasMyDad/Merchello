import { LitElement, html } from "@umbraco-cms/backoffice/external/lit";
import { customElement, property } from "@umbraco-cms/backoffice/external/lit";
import { UmbElementMixin } from "@umbraco-cms/backoffice/element-api";
import { badgeStyles } from "@shared/styles/badge.styles.js";
import {
  getPaymentStatusBadgeClass,
  getFulfillmentStatusBadgeClass,
} from "@shared/utils/formatting.js";
import { InvoicePaymentStatus } from "@orders/types/order.types.js";

/**
 * Reusable status badge component for payment and fulfillment statuses.
 *
 * @example
 * ```html
 * <merchello-status-badge
 *   variant="payment"
 *   .status=${InvoicePaymentStatus.Paid}
 *   label="Paid">
 * </merchello-status-badge>
 *
 * <merchello-status-badge
 *   variant="fulfillment"
 *   status="Unfulfilled"
 *   label="Unfulfilled">
 * </merchello-status-badge>
 * ```
 */
@customElement("merchello-status-badge")
export class MerchelloStatusBadgeElement extends UmbElementMixin(LitElement) {
  /**
   * Badge variant - determines which status class mapping to use.
   */
  @property({ type: String })
  variant: "payment" | "fulfillment" = "payment";

  /**
   * Status value - InvoicePaymentStatus for payment, string for fulfillment.
   */
  @property({ attribute: false })
  status: InvoicePaymentStatus | string = "";

  /**
   * Display label for the badge.
   */
  @property({ type: String })
  label = "";

  private _getBadgeClass(): string {
    if (this.variant === "payment") {
      return getPaymentStatusBadgeClass(this.status as InvoicePaymentStatus);
    }
    return getFulfillmentStatusBadgeClass(this.status as string);
  }

  render() {
    return html`<span class="badge ${this._getBadgeClass()}">${this.label}</span>`;
  }

  static styles = [badgeStyles];
}

export default MerchelloStatusBadgeElement;

declare global {
  interface HTMLElementTagNameMap {
    "merchello-status-badge": MerchelloStatusBadgeElement;
  }
}
