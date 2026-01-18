import { UmbModalToken } from "@umbraco-cms/backoffice/modal";
import type { PaymentMethodSettingDto } from "@payment-providers/types/payment-providers.types.js";

export interface PaymentMethodEditModalData {
  /** The provider setting ID */
  providerSettingId: string;
  /** The method to edit */
  method: PaymentMethodSettingDto;
}

export interface PaymentMethodEditModalValue {
  /** Whether the method was changed */
  isChanged: boolean;
}

export const MERCHELLO_PAYMENT_METHOD_EDIT_MODAL = new UmbModalToken<
  PaymentMethodEditModalData,
  PaymentMethodEditModalValue
>("Merchello.PaymentMethod.Edit.Modal", {
  modal: {
    type: "sidebar",
    size: "medium",
  },
});
