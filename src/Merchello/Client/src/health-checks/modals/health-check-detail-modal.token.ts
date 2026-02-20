import { UmbModalToken } from "@umbraco-cms/backoffice/modal";
import type {
  HealthCheckDetailModalData,
  HealthCheckDetailModalValue,
} from "@health-checks/types/health-check.types.js";

export const MERCHELLO_HEALTH_CHECK_DETAIL_MODAL = new UmbModalToken<
  HealthCheckDetailModalData,
  HealthCheckDetailModalValue
>("Merchello.HealthCheck.Detail.Modal", {
  modal: {
    type: "sidebar",
    size: "large",
  },
});
