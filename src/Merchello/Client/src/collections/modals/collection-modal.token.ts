import { UmbModalToken } from "@umbraco-cms/backoffice/modal";
import type { ProductCollectionDto } from '@products/types/product.types.js';

export interface CollectionModalData {
  /** If provided, the modal will be in edit mode. Otherwise, it's in create mode. */
  collection?: ProductCollectionDto;
}

export interface CollectionModalValue {
  /** The created or updated collection */
  collection?: ProductCollectionDto;
  /** True if a new collection was created */
  isCreated?: boolean;
  /** True if an existing collection was updated */
  isUpdated?: boolean;
}

export const MERCHELLO_COLLECTION_MODAL = new UmbModalToken<
  CollectionModalData,
  CollectionModalValue
>("Merchello.Collection.Modal", {
  modal: {
    type: "sidebar",
    size: "medium",
  },
});
