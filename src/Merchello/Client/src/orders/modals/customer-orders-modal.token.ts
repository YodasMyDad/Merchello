import { UmbModalToken } from "@umbraco-cms/backoffice/modal";

export interface CustomerOrdersModalData {
  email: string;
  customerName: string;
  /** Optional customer ID for fetching outstanding balance */
  customerId?: string;
  /** Whether this customer has account terms */
  hasAccountTerms?: boolean;
}

export interface CustomerOrdersModalValue {
  navigatedToOrder: boolean;
}

export const MERCHELLO_CUSTOMER_ORDERS_MODAL = new UmbModalToken<
  CustomerOrdersModalData,
  CustomerOrdersModalValue
>("Merchello.CustomerOrders.Modal", {
  modal: {
    type: "sidebar",
    size: "large",
  },
});
