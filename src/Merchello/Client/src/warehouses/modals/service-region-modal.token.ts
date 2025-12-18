import { UmbModalToken } from "@umbraco-cms/backoffice/modal";
import type { ServiceRegionDto } from "@warehouses/types/warehouses.types.js";

export interface ServiceRegionModalData {
  warehouseId: string;
  region?: ServiceRegionDto;
  existingRegions?: ServiceRegionDto[];
}

export interface ServiceRegionModalValue {
  isSaved: boolean;
  region?: ServiceRegionDto;
}

export const MERCHELLO_SERVICE_REGION_MODAL = new UmbModalToken<
  ServiceRegionModalData,
  ServiceRegionModalValue
>("Merchello.ServiceRegion.Modal", {
  modal: {
    type: "sidebar",
    size: "medium",
  },
});
