
export const manifests: Array<UmbExtensionManifest> = [
  {
    type: "modal",
    alias: "Merchello.HealthCheck.Detail.Modal",
    name: "Merchello Health Check Detail Modal",
    element: () => import("@health-checks/modals/health-check-detail-modal.element.js"),
  },
];
