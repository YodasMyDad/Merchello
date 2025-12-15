import { UmbModalToken } from "@umbraco-cms/backoffice/modal";
import type { ProductFilterGroupDto } from "../types.js";

export interface FilterGroupModalData {
  /** If provided, the modal will be in edit mode. Otherwise, it's in create mode. */
  filterGroup?: ProductFilterGroupDto;
}

export interface FilterGroupModalValue {
  /** The created or updated filter group */
  filterGroup?: ProductFilterGroupDto;
  /** True if a new filter group was created */
  created?: boolean;
  /** True if an existing filter group was updated */
  updated?: boolean;
}

export const MERCHELLO_FILTER_GROUP_MODAL = new UmbModalToken<
  FilterGroupModalData,
  FilterGroupModalValue
>("Merchello.FilterGroup.Modal", {
  modal: {
    type: "sidebar",
    size: "small",
  },
});
