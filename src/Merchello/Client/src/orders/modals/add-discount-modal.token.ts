import { UmbModalToken } from "@umbraco-cms/backoffice/modal";
import type { LineItemDiscountDto } from "@orders/types/order.types.js";

export interface AddDiscountModalData {
  /** Currency symbol for display */
  currencySymbol: string;
  /** Currency code for proper rounding (e.g., "GBP", "USD"). Falls back to store currency if not provided. */
  currencyCode?: string;
  /** Whether this is an order-level discount (true) or line item discount (false) */
  isOrderDiscount: boolean;
  /** Line item name for context (only when isOrderDiscount is false) */
  lineItemName?: string;
  /** Line item unit price for context (only when isOrderDiscount is false) */
  lineItemPrice?: number;
  /** Line item quantity for context (only when isOrderDiscount is false) */
  lineItemQuantity?: number;
  /** Existing discount to edit (optional) */
  existingDiscount?: LineItemDiscountDto;
}

export interface AddDiscountModalValue {
  /** Manual discount to apply, or undefined if cancelled */
  discount?: LineItemDiscountDto;
  /** Promotional discount code to apply using checkout discount logic */
  discountCode?: string;
  /** Display name of the selected discount (optional, for UI display only) */
  discountName?: string | null;
}

export const MERCHELLO_ADD_DISCOUNT_MODAL = new UmbModalToken<
  AddDiscountModalData,
  AddDiscountModalValue
>("Merchello.AddDiscount.Modal", {
  modal: {
    type: "dialog",
    size: "medium",
  },
});

