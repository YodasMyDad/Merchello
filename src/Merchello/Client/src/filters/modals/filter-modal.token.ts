import { UmbModalToken } from "@umbraco-cms/backoffice/modal";
import type { ProductFilterDto } from "../types.js";

export interface FilterModalData {
  /** The filter group ID this filter belongs to */
  filterGroupId: string;
  /** If provided, the modal will be in edit mode. Otherwise, it's in create mode. */
  filter?: ProductFilterDto;
}

export interface FilterModalValue {
  /** The created or updated filter */
  filter?: ProductFilterDto;
  /** True if a new filter was created */
  created?: boolean;
  /** True if an existing filter was updated */
  updated?: boolean;
  /** True if the filter was deleted */
  deleted?: boolean;
}

export const MERCHELLO_FILTER_MODAL = new UmbModalToken<
  FilterModalData,
  FilterModalValue
>("Merchello.Filter.Modal", {
  modal: {
    type: "sidebar",
    size: "small",
  },
});
