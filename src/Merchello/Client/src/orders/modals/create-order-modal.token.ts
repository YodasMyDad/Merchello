import { UmbModalToken } from "@umbraco-cms/backoffice/modal";

export interface CreateOrderModalData {}

export interface CreateOrderModalValue {
  /** Whether the order was created */
  isCreated: boolean;
  /** The ID of the created invoice (if successful) */
  invoiceId?: string;
}

export const MERCHELLO_CREATE_ORDER_MODAL = new UmbModalToken<
  CreateOrderModalData,
  CreateOrderModalValue
>("Merchello.CreateOrder.Modal", {
  modal: {
    type: "sidebar",
    size: "large",
  },
});
