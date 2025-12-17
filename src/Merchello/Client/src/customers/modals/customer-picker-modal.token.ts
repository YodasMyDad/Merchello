import { UmbModalToken } from "@umbraco-cms/backoffice/modal";

export interface CustomerPickerModalData {
  /** Customer IDs to exclude from the picker (already members) */
  excludeCustomerIds?: string[];
  /** Allow selecting multiple customers (default: true) */
  multiSelect?: boolean;
}

export interface CustomerPickerModalValue {
  /** The selected customer IDs */
  selectedCustomerIds: string[];
}

export const MERCHELLO_CUSTOMER_PICKER_MODAL = new UmbModalToken<
  CustomerPickerModalData,
  CustomerPickerModalValue
>("Merchello.CustomerPicker.Modal", {
  modal: {
    type: "sidebar",
    size: "medium",
  },
});
