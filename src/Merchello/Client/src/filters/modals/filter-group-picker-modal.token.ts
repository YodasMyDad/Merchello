import { UmbModalToken } from "@umbraco-cms/backoffice/modal";

export interface FilterGroupPickerModalData {
  /** Filter group IDs to exclude from the picker (already selected) */
  excludeIds?: string[];
  /** Allow selecting multiple filter groups (default: true) */
  multiSelect?: boolean;
}

export interface FilterGroupPickerModalValue {
  /** The selected filter group IDs */
  selectedIds: string[];
  /** The selected filter group names for display */
  selectedNames: string[];
}

export const MERCHELLO_FILTER_GROUP_PICKER_MODAL = new UmbModalToken<
  FilterGroupPickerModalData,
  FilterGroupPickerModalValue
>("Merchello.FilterGroupPicker.Modal", {
  modal: {
    type: "sidebar",
    size: "medium",
  },
});
