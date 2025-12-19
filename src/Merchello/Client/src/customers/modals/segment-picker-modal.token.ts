import { UmbModalToken } from "@umbraco-cms/backoffice/modal";

export interface SegmentPickerModalData {
  /** Segment IDs to exclude from the picker (already selected) */
  excludeIds?: string[];
  /** Allow selecting multiple segments (default: true) */
  multiSelect?: boolean;
}

export interface SegmentPickerModalValue {
  /** The selected segment IDs */
  selectedIds: string[];
  /** The selected segment names for display */
  selectedNames: string[];
}

export const MERCHELLO_SEGMENT_PICKER_MODAL = new UmbModalToken<
  SegmentPickerModalData,
  SegmentPickerModalValue
>("Merchello.SegmentPicker.Modal", {
  modal: {
    type: "sidebar",
    size: "medium",
  },
});
