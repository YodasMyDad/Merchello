
export const manifests: Array<UmbExtensionManifest> = [
  // Section
  {
    type: "section",
    alias: "Merchello.Section",
    name: "Merchello Section",
    meta: {
      label: "Merchello",
      pathname: "merchello",
    },
    conditions: [
      {
        alias: "Umb.Condition.SectionUserPermission",
        match: "Merchello.Section",
      },
    ],
  },

  // Menu
  {
    type: "menu",
    alias: "Merchello.Menu",
    name: "Merchello Menu",
  },

  // Sidebar app to show the menu
  {
    type: "sectionSidebarApp",
    kind: "menu",
    alias: "Merchello.SidebarApp",
    name: "Merchello Sidebar",
    weight: 100,
    meta: {
      label: "Merchello",
      menu: "Merchello.Menu",
    },
    conditions: [
      {
        alias: "Umb.Condition.SectionAlias",
        match: "Merchello.Section",
      },
    ],
  },

  // Health Checks Dashboard
  {
    type: "dashboard",
    alias: "Merchello.Dashboard.HealthChecks",
    name: "Merchello Health Checks Dashboard",
    element: () => import("@health-checks/components/health-checks-dashboard.element.js"),
    meta: {
      label: "Health Checks",
      pathname: "health-checks",
    },
    conditions: [
      {
        alias: "Umb.Condition.SectionAlias",
        match: "Merchello.Section",
      },
    ],
  },
];
