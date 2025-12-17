import { UmbModalToken } from "@umbraco-cms/backoffice/modal";
import type { ProductOptionDto, ProductOptionSettingsDto } from "@products/types/product.types.js";

export interface OptionEditorModalData {
  option?: ProductOptionDto; // undefined for new
  settings: ProductOptionSettingsDto;
}

export interface OptionEditorModalValue {
  isSaved: boolean;
  option?: ProductOptionDto;
  isDeleted?: boolean;
}

export const MERCHELLO_OPTION_EDITOR_MODAL = new UmbModalToken<OptionEditorModalData, OptionEditorModalValue>(
  "Merchello.OptionEditor.Modal",
  {
    modal: {
      type: "sidebar",
      size: "medium",
    },
  }
);

