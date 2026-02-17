import { describe, expect, it } from "vitest";
import type { WarehouseListDto } from "@warehouses/types/warehouses.types.js";
import {
  getSelectedWarehouseSetupSummary,
  getWarehouseSetupState,
} from "@products/utils/warehouse-setup.js";

function createWarehouse(overrides: Partial<WarehouseListDto> = {}): WarehouseListDto {
  return {
    id: "warehouse-1",
    name: "Warehouse",
    code: "WH-1",
    serviceRegionCount: 1,
    shippingOptionCount: 1,
    addressSummary: "London, GB",
    dateUpdated: "2026-01-01T00:00:00Z",
    ...overrides,
  };
}

describe("warehouse setup utilities", () => {
  it("returns configured state when regions and shipping options exist", () => {
    const warehouse = createWarehouse({ serviceRegionCount: 2, shippingOptionCount: 3 });

    const result = getWarehouseSetupState(warehouse);

    expect(result.needsSetup).toBe(false);
    expect(result.isConfigured).toBe(true);
    expect(result.warningMessage).toBeNull();
  });

  it("returns region warning when service regions are missing", () => {
    const warehouse = createWarehouse({ serviceRegionCount: 0, shippingOptionCount: 3 });

    const result = getWarehouseSetupState(warehouse);

    expect(result.isMissingRegions).toBe(true);
    expect(result.isMissingShippingOptions).toBe(false);
    expect(result.warningMessage).toBe("No service regions configured");
  });

  it("returns shipping option warning when shipping options are missing", () => {
    const warehouse = createWarehouse({ serviceRegionCount: 2, shippingOptionCount: 0 });

    const result = getWarehouseSetupState(warehouse);

    expect(result.isMissingRegions).toBe(false);
    expect(result.isMissingShippingOptions).toBe(true);
    expect(result.warningMessage).toBe("No shipping options configured");
  });

  it("returns combined warning when regions and shipping options are missing", () => {
    const warehouse = createWarehouse({ serviceRegionCount: 0, shippingOptionCount: 0 });

    const result = getWarehouseSetupState(warehouse);

    expect(result.isMissingRegions).toBe(true);
    expect(result.isMissingShippingOptions).toBe(true);
    expect(result.warningMessage).toBe("No service regions or shipping options configured");
  });

  it("summarizes selected warehouse setup counts", () => {
    const warehouses: WarehouseListDto[] = [
      createWarehouse({ id: "warehouse-1", serviceRegionCount: 2, shippingOptionCount: 2 }),
      createWarehouse({ id: "warehouse-2", serviceRegionCount: 0, shippingOptionCount: 1 }),
      createWarehouse({ id: "warehouse-3", serviceRegionCount: 1, shippingOptionCount: 0 }),
    ];

    const result = getSelectedWarehouseSetupSummary(warehouses, ["warehouse-1", "warehouse-2", "warehouse-3"]);

    expect(result.selectedCount).toBe(3);
    expect(result.selectedNeedsSetupCount).toBe(2);
    expect(result.missingSelectedIdsCount).toBe(0);
  });

  it("counts selected IDs that are missing from the warehouse list", () => {
    const warehouses: WarehouseListDto[] = [
      createWarehouse({ id: "warehouse-1", serviceRegionCount: 2, shippingOptionCount: 2 }),
      createWarehouse({ id: "warehouse-2", serviceRegionCount: 0, shippingOptionCount: 1 }),
    ];

    const result = getSelectedWarehouseSetupSummary(warehouses, ["warehouse-1", "warehouse-2", "warehouse-4"]);

    expect(result.selectedCount).toBe(3);
    expect(result.selectedNeedsSetupCount).toBe(1);
    expect(result.missingSelectedIdsCount).toBe(1);
  });
});
