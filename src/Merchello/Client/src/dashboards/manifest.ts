export const manifests: Array<UmbExtensionManifest> = [
  {
    name: "Merchello Dashboard",
    alias: "Merchello.Dashboard",
    type: "dashboard",
    js: () => import("./dashboard.element.js"),
    meta: {
      label: "Merchello Dashboard",
      pathname: "merchello-dashboard",
    },
    conditions: [
      {
        alias: "Umb.Condition.SectionAlias",
        match: "Umb.Section.Content",
      },
    ],
  },
];
