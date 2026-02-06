import { MERCHELLO_PROVIDERS_ENTITY_TYPE } from "@tree/types/tree.types.js";

export const manifests: Array<UmbExtensionManifest> = [
  // Workspace for providers (when clicking "Providers" in tree)
  {
    type: "workspace",
    kind: "routable",
    alias: "Merchello.Providers.Workspace",
    name: "Merchello Providers Workspace",
    api: () => import("@providers/contexts/providers-workspace.context.js"),
    meta: {
      entityType: MERCHELLO_PROVIDERS_ENTITY_TYPE,
    },
  },
];

