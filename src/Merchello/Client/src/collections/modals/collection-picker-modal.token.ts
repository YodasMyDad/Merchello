import { UmbModalToken } from "@umbraco-cms/backoffice/modal";

export interface CollectionPickerModalData {
  /** Collection IDs to exclude from the picker (already selected) */
  excludeIds?: string[];
  /** Allow selecting multiple collections (default: true) */
  multiSelect?: boolean;
}

export interface CollectionPickerModalValue {
  /** The selected collection IDs */
  selectedIds: string[];
  /** The selected collection names for display */
  selectedNames: string[];
  /** The selected collection product counts for display */
  selectedCounts: number[];
}

export const MERCHELLO_COLLECTION_PICKER_MODAL = new UmbModalToken<
  CollectionPickerModalData,
  CollectionPickerModalValue
>("Merchello.CollectionPicker.Modal", {
  modal: {
    type: "sidebar",
    size: "medium",
  },
});
