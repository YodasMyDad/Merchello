import { UmbModalToken } from "@umbraco-cms/backoffice/modal";

/** Data passed to the export modal (currently empty, but extensible) */
export interface ExportModalData {}

/** Value returned from the export modal */
export interface ExportModalValue {
  /** Whether an export was successfully generated */
  exported: boolean;
}

export const MERCHELLO_EXPORT_MODAL = new UmbModalToken<
  ExportModalData,
  ExportModalValue
>("Merchello.Export.Modal", {
  modal: {
    type: "sidebar",
    size: "small",
  },
});
