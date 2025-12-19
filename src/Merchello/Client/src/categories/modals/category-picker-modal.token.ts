import { UmbModalToken } from "@umbraco-cms/backoffice/modal";

export interface CategoryPickerModalData {
  /** Category IDs to exclude from the picker (already selected) */
  excludeIds?: string[];
  /** Allow selecting multiple categories (default: true) */
  multiSelect?: boolean;
}

export interface CategoryPickerModalValue {
  /** The selected category IDs */
  selectedIds: string[];
  /** The selected category names for display */
  selectedNames: string[];
}

export const MERCHELLO_CATEGORY_PICKER_MODAL = new UmbModalToken<
  CategoryPickerModalData,
  CategoryPickerModalValue
>("Merchello.CategoryPicker.Modal", {
  modal: {
    type: "sidebar",
    size: "medium",
  },
});
