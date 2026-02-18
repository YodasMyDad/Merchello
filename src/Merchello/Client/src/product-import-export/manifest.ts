import { MERCHELLO_PRODUCT_IMPORT_EXPORT_ENTITY_TYPE } from "@tree/types/tree.types.js";

export const manifests: Array<UmbExtensionManifest> = [
  {
    type: "workspace",
    kind: "routable",
    alias: "Merchello.ProductImportExport.Workspace",
    name: "Merchello Product Import Export Workspace",
    api: () => import("@product-import-export/contexts/product-import-export-workspace.context.js"),
    meta: {
      entityType: MERCHELLO_PRODUCT_IMPORT_EXPORT_ENTITY_TYPE,
    },
  },
  {
    type: "workspaceView",
    alias: "Merchello.ProductImportExport.Workspace.View",
    name: "Merchello Product Import Export View",
    js: () => import("@product-import-export/components/product-import-export-page.element.js"),
    weight: 100,
    meta: {
      label: "Import & Export",
      pathname: "sync",
      icon: "icon-page-up",
    },
    conditions: [
      {
        alias: "Umb.Condition.WorkspaceAlias",
        match: "Merchello.ProductImportExport.Workspace",
      },
    ],
  },
];
