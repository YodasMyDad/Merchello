import type { ManifestPropertyEditorUi } from "@umbraco-cms/backoffice/property-editor";

export const manifests: ManifestPropertyEditorUi[] = [
  {
    type: "propertyEditorUi",
    alias: "Merchello.PropertyEditorUi.GoogleShoppingCategoryPicker",
    name: "Merchello Google Shopping Category Picker",
    element: () =>
      import(
        "@property-editors/google-shopping-category-picker/property-editor-ui-google-shopping-category-picker.element.js"
      ),
    meta: {
      label: "Google Shopping Category Picker",
      icon: "icon-shopping-basket-alt-2",
      group: "Merchello",
      propertyEditorSchemaAlias: "Umbraco.Plain.String",
    },
  },
];

