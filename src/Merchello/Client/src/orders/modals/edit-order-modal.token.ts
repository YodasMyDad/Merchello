import { UmbModalToken } from "@umbraco-cms/backoffice/modal";

export interface EditOrderModalData {
  /** The invoice ID to edit */
  invoiceId: string;
}

export interface EditOrderModalValue {
  /** Whether the order was saved */
  saved: boolean;
}

export const MERCHELLO_EDIT_ORDER_MODAL = new UmbModalToken<
  EditOrderModalData,
  EditOrderModalValue
>("Merchello.EditOrder.Modal", {
  modal: {
    type: "sidebar",
    size: "large",
  },
});
