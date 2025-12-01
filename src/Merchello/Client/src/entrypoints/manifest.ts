export const manifests: Array<UmbExtensionManifest> = [
  {
    name: "Merchello Entrypoint",
    alias: "Merchello.Entrypoint",
    type: "backofficeEntryPoint",
    js: () => import("./entrypoint.js"),
  },
];
