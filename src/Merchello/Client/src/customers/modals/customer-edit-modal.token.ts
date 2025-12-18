import { UmbModalToken } from "@umbraco-cms/backoffice/modal";
import type { CustomerListItemDto } from "@customers/types/customer.types.js";

export interface CustomerEditModalData {
  /** The customer to edit - always edit mode since customers are created during checkout */
  customer: CustomerListItemDto;
}

export interface CustomerEditModalValue {
  /** The updated customer */
  customer?: CustomerListItemDto;
  /** True if the customer was updated */
  isUpdated?: boolean;
}

export const MERCHELLO_CUSTOMER_EDIT_MODAL = new UmbModalToken<
  CustomerEditModalData,
  CustomerEditModalValue
>("Merchello.Customer.Edit.Modal", {
  modal: {
    type: "sidebar",
    size: "medium",
  },
});
