import { UmbModalToken } from "@umbraco-cms/backoffice/modal";

export interface FilterPickerModalData {
  /** Filter IDs to exclude from the picker (already selected) */
  excludeFilterIds?: string[];
  /** Allow selecting multiple filters (default: true) */
  multiSelect?: boolean;
  /** Optional: Restrict to filters from this group only */
  filterGroupId?: string;
}

export interface FilterPickerModalValue {
  /** The selected filter IDs */
  selectedFilterIds: string[];
  /** The selected filter names for display (format: "GroupName: FilterName") */
  selectedFilterNames: string[];
}

export const MERCHELLO_FILTER_PICKER_MODAL = new UmbModalToken<
  FilterPickerModalData,
  FilterPickerModalValue
>("Merchello.FilterPicker.Modal", {
  modal: {
    type: "sidebar",
    size: "medium",
  },
});
