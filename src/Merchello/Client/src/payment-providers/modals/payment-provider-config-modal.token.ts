import { UmbModalToken } from "@umbraco-cms/backoffice/modal";
import type { PaymentProviderDto, PaymentProviderSettingDto } from '@payment-providers/types/payment-providers.types.js';

export interface PaymentProviderConfigModalData {
  /** The provider to configure */
  provider: PaymentProviderDto;
  /** Existing setting if editing, null if creating new */
  setting?: PaymentProviderSettingDto;
}

export interface PaymentProviderConfigModalValue {
  /** Whether the provider was saved/updated */
  isSaved: boolean;
}

export const MERCHELLO_PAYMENT_PROVIDER_CONFIG_MODAL = new UmbModalToken<
  PaymentProviderConfigModalData,
  PaymentProviderConfigModalValue
>("Merchello.PaymentProvider.Config.Modal", {
  modal: {
    type: "sidebar",
    size: "medium",
  },
});

