import type { WarehouseListDto } from "@warehouses/types/warehouses.types.js";

export interface WarehouseSetupState {
  hasServiceRegions: boolean;
  hasShippingOptions: boolean;
  isMissingRegions: boolean;
  isMissingShippingOptions: boolean;
  isConfigured: boolean;
  needsSetup: boolean;
  warningMessage: string | null;
}

export interface SelectedWarehouseSetupSummary {
  selectedCount: number;
  selectedNeedsSetupCount: number;
  missingSelectedIdsCount: number;
}

export function getWarehouseSetupState(warehouse: WarehouseListDto): WarehouseSetupState {
  const serviceRegionCount = warehouse.serviceRegionCount ?? 0;
  const shippingOptionCount = warehouse.shippingOptionCount ?? 0;

  const hasServiceRegions = serviceRegionCount > 0;
  const hasShippingOptions = shippingOptionCount > 0;
  const isMissingRegions = !hasServiceRegions;
  const isMissingShippingOptions = !hasShippingOptions;
  const needsSetup = isMissingRegions || isMissingShippingOptions;

  let warningMessage: string | null = null;
  if (isMissingRegions && isMissingShippingOptions) {
    warningMessage = "No service regions or shipping options configured";
  } else if (isMissingRegions) {
    warningMessage = "No service regions configured";
  } else if (isMissingShippingOptions) {
    warningMessage = "No shipping options configured";
  }

  return {
    hasServiceRegions,
    hasShippingOptions,
    isMissingRegions,
    isMissingShippingOptions,
    isConfigured: !needsSetup,
    needsSetup,
    warningMessage,
  };
}

export function getSelectedWarehouseSetupSummary(
  warehouses: WarehouseListDto[],
  selectedWarehouseIds: string[]
): SelectedWarehouseSetupSummary {
  const uniqueSelectedIds = [...new Set(selectedWarehouseIds)];
  const warehouseById = new Map(warehouses.map((warehouse) => [warehouse.id, warehouse]));

  let selectedNeedsSetupCount = 0;
  let missingSelectedIdsCount = 0;

  for (const selectedWarehouseId of uniqueSelectedIds) {
    const warehouse = warehouseById.get(selectedWarehouseId);

    if (!warehouse) {
      missingSelectedIdsCount += 1;
      continue;
    }

    if (getWarehouseSetupState(warehouse).needsSetup) {
      selectedNeedsSetupCount += 1;
    }
  }

  return {
    selectedCount: uniqueSelectedIds.length,
    selectedNeedsSetupCount,
    missingSelectedIdsCount,
  };
}
