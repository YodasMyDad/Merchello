import { UmbModalToken } from "@umbraco-cms/backoffice/modal";
import type { UpsellDisplayStylesDto } from "@upsells/types/upsell.types.js";

export interface UpsellStyleModalData {
  styles?: UpsellDisplayStylesDto;
  heading?: string;
  message?: string;
}

export interface UpsellStyleModalValue {
  styles?: UpsellDisplayStylesDto;
}

export const MERCHELLO_UPSELL_STYLE_MODAL = new UmbModalToken<
  UpsellStyleModalData,
  UpsellStyleModalValue
>("Merchello.UpsellStyle.Modal", {
  modal: {
    type: "dialog",
    size: "large",
  },
});

