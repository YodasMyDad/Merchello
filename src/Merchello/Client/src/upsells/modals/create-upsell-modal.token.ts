import { UmbModalToken } from "@umbraco-cms/backoffice/modal";

export interface CreateUpsellModalData {}

export interface CreateUpsellModalValue {
  id: string;
}

export const MERCHELLO_CREATE_UPSELL_MODAL = new UmbModalToken<
  CreateUpsellModalData,
  CreateUpsellModalValue
>("Merchello.CreateUpsell.Modal", {
  modal: {
    type: "dialog",
    size: "medium",
  },
});
