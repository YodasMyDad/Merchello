import { describe, expect, it, vi } from "vitest";

vi.mock("@umbraco-cms/backoffice/class-api", () => ({
  UmbControllerBase: class {},
}));

import { MerchelloTreeDataSource } from "@tree/services/tree-data-source.js";
import { MERCHELLO_PRODUCT_IMPORT_EXPORT_ENTITY_TYPE } from "@tree/types/tree.types.js";

describe("tree data source", () => {
  it("adds Import & Export as a child under Products", async () => {
    const dataSource = new MerchelloTreeDataSource({} as never);

    const result = await dataSource.getChildrenOf({
      parent: {
        unique: "products",
        entityType: "merchello-products",
      },
    } as never);

    const child = result.data?.items.find((item) => item.unique === "import-export");
    expect(child).toBeDefined();
    expect(child?.name).toBe("Import & Export");
    expect(child?.entityType).toBe(MERCHELLO_PRODUCT_IMPORT_EXPORT_ENTITY_TYPE);
  });
});
