import { UmbModalToken } from "@umbraco-cms/backoffice/modal";
import type {
  ProductFeedValidationModalData,
  ProductFeedValidationModalValue,
} from "@product-feed/types/product-feed.types.js";

export const MERCHELLO_PRODUCT_FEED_VALIDATION_MODAL = new UmbModalToken<
  ProductFeedValidationModalData,
  ProductFeedValidationModalValue
>("Merchello.ProductFeed.Validation.Modal", {
  modal: {
    type: "sidebar",
    size: "large",
  },
});
