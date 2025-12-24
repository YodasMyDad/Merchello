import { UmbModalToken } from "@umbraco-cms/backoffice/modal";

export interface ProductTypePickerModalData {
  /** Product type IDs to exclude from the picker (already selected) */
  excludeIds?: string[];
  /** Allow selecting multiple product types (default: true) */
  multiSelect?: boolean;
}

export interface ProductTypePickerModalValue {
  /** The selected product type IDs */
  selectedIds: string[];
  /** The selected product type names for display */
  selectedNames: string[];
  /** The selected product type aliases for display */
  selectedAliases: (string | null)[];
}

export const MERCHELLO_PRODUCT_TYPE_PICKER_MODAL = new UmbModalToken<
  ProductTypePickerModalData,
  ProductTypePickerModalValue
>("Merchello.ProductTypePicker.Modal", {
  modal: {
    type: "sidebar",
    size: "medium",
  },
});
