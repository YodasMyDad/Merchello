import { UmbModalToken } from "@umbraco-cms/backoffice/modal";

export interface ActionSidebarModalData {
  elementTag: string;
  actionKey: string;
  sidebarJsModule?: string;
  invoiceId?: string;
  orderId?: string;
  productRootId?: string;
  productId?: string;
  customerId?: string;
  warehouseId?: string;
  supplierId?: string;
}

export const MERCHELLO_ACTION_SIDEBAR_MODAL = new UmbModalToken<
  ActionSidebarModalData,
  undefined
>("Merchello.ActionSidebar.Modal", {
  modal: {
    type: "sidebar",
    size: "medium",
  },
});
