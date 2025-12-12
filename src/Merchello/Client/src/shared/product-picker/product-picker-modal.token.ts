import { UmbModalToken } from "@umbraco-cms/backoffice/modal";
import type { ProductPickerConfig, ProductPickerSelection } from "./product-picker.types.js";

/**
 * Data passed into the product picker modal
 */
export interface ProductPickerModalData {
  /** Configuration options for the picker */
  config: ProductPickerConfig;
}

/**
 * Value returned from the product picker modal on submit
 */
export interface ProductPickerModalValue {
  /** Selected products (may be empty if cancelled) */
  selections: ProductPickerSelection[];
}

/**
 * Modal token for the product picker.
 *
 * Usage:
 * ```typescript
 * const result = await modalManager.open(this, MERCHELLO_PRODUCT_PICKER_MODAL, {
 *   data: {
 *     config: {
 *       currencySymbol: "£",
 *       shippingAddress: {
 *         countryCode: "GB",
 *         stateCode: undefined,
 *       },
 *       excludeProductIds: existingProductIds,
 *     },
 *   },
 * }).onSubmit();
 *
 * if (result?.selections?.length) {
 *   // Handle selected products
 * }
 * ```
 */
export const MERCHELLO_PRODUCT_PICKER_MODAL = new UmbModalToken<
  ProductPickerModalData,
  ProductPickerModalValue
>("Merchello.ProductPicker.Modal", {
  modal: {
    type: "sidebar",
    size: "medium",
  },
});
