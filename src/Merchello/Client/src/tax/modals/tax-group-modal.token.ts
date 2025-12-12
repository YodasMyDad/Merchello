import { UmbModalToken } from "@umbraco-cms/backoffice/modal";
import type { TaxGroupDto } from "../types.js";

export interface TaxGroupModalData {
  /** If provided, the modal will be in edit mode. Otherwise, it's in create mode. */
  taxGroup?: TaxGroupDto;
}

export interface TaxGroupModalValue {
  /** The created or updated tax group */
  taxGroup?: TaxGroupDto;
  /** True if a new tax group was created */
  created?: boolean;
  /** True if an existing tax group was updated */
  updated?: boolean;
}

export const MERCHELLO_TAX_GROUP_MODAL = new UmbModalToken<
  TaxGroupModalData,
  TaxGroupModalValue
>("Merchello.TaxGroup.Modal", {
  modal: {
    type: "sidebar",
    size: "small",
  },
});
