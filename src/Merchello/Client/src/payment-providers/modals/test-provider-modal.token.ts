import { UmbModalToken } from "@umbraco-cms/backoffice/modal";
import type { PaymentProviderSettingDto } from '@payment-providers/types/payment-providers.types.js';

export interface TestPaymentProviderModalData {
  setting: PaymentProviderSettingDto;
}

export interface TestPaymentProviderModalValue {
  // Informational modal - no return value needed
}

export const MERCHELLO_TEST_PAYMENT_PROVIDER_MODAL = new UmbModalToken<
  TestPaymentProviderModalData,
  TestPaymentProviderModalValue
>("Merchello.TestPaymentProvider.Modal", {
  modal: {
    type: "sidebar",
    size: "medium",
  },
});
