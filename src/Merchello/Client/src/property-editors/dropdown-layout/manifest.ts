export const manifests: Array<UmbExtensionManifest> = [
  {
    type: "propertyContext",
    alias: "Merchello.PropertyContext.DropdownLayout",
    name: "Merchello Dropdown Layout Property Context",
    api: () => import("@property-editors/dropdown-layout/dropdown-layout.property-context.js"),
    forPropertyEditorUis: [
      "Umb.PropertyEditorUi.Dropdown",
      "Umb.PropertyEditorUi.Select",
    ],
    meta: {},
    weight: 500,
  },
];
