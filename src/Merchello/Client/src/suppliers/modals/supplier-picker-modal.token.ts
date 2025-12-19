import { UmbModalToken } from "@umbraco-cms/backoffice/modal";

export interface SupplierPickerModalData {
  /** Supplier IDs to exclude from the picker (already selected) */
  excludeIds?: string[];
  /** Allow selecting multiple suppliers (default: true) */
  multiSelect?: boolean;
}

export interface SupplierPickerModalValue {
  /** The selected supplier IDs */
  selectedIds: string[];
  /** The selected supplier names for display */
  selectedNames: string[];
}

export const MERCHELLO_SUPPLIER_PICKER_MODAL = new UmbModalToken<
  SupplierPickerModalData,
  SupplierPickerModalValue
>("Merchello.SupplierPicker.Modal", {
  modal: {
    type: "sidebar",
    size: "medium",
  },
});
