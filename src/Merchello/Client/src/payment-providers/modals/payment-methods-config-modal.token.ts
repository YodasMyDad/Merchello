import { UmbModalToken } from "@umbraco-cms/backoffice/modal";
import type { PaymentProviderSettingDto } from '@payment-providers/types/payment-providers.types.js';

export interface PaymentMethodsConfigModalData {
  /** The provider setting to configure methods for */
  setting: PaymentProviderSettingDto;
}

export interface PaymentMethodsConfigModalValue {
  /** Whether any methods were changed */
  isChanged: boolean;
}

export const MERCHELLO_PAYMENT_METHODS_CONFIG_MODAL = new UmbModalToken<
  PaymentMethodsConfigModalData,
  PaymentMethodsConfigModalValue
>("Merchello.PaymentMethods.Config.Modal", {
  modal: {
    type: "sidebar",
    size: "small",
  },
});
