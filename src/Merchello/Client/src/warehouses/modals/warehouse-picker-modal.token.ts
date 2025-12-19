import { UmbModalToken } from "@umbraco-cms/backoffice/modal";

export interface WarehousePickerModalData {
  /** Warehouse IDs to exclude from the picker (already selected) */
  excludeIds?: string[];
  /** Allow selecting multiple warehouses (default: true) */
  multiSelect?: boolean;
}

export interface WarehousePickerModalValue {
  /** The selected warehouse IDs */
  selectedIds: string[];
  /** The selected warehouse names for display */
  selectedNames: string[];
}

export const MERCHELLO_WAREHOUSE_PICKER_MODAL = new UmbModalToken<
  WarehousePickerModalData,
  WarehousePickerModalValue
>("Merchello.WarehousePicker.Modal", {
  modal: {
    type: "sidebar",
    size: "medium",
  },
});
