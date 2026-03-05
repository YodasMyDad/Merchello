import { describe, expect, it, vi } from "vitest";

vi.mock("@umbraco-cms/backoffice/class-api", () => ({
  UmbControllerBase: class {},
}));

import { MerchelloTreeDataSource } from "@tree/services/tree-data-source.js";
import {
  MERCHELLO_ORDERS_ENTITY_TYPE,
  MERCHELLO_PRODUCTS_ENTITY_TYPE,
  MERCHELLO_PRODUCT_IMPORT_EXPORT_ENTITY_TYPE,
  MERCHELLO_ROOT_ENTITY_TYPE,
} from "@tree/types/tree.types.js";

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

  it("root items have empty ancestors array", async () => {
    const dataSource = new MerchelloTreeDataSource({} as never);
    const result = await dataSource.getRootItems({} as never);

    for (const item of result.data!.items) {
      expect(item.ancestors).toEqual([]);
    }
  });

  it("child items under Orders have correct ancestors", async () => {
    const dataSource = new MerchelloTreeDataSource({} as never);

    const result = await dataSource.getChildrenOf({
      parent: { unique: "orders", entityType: MERCHELLO_ORDERS_ENTITY_TYPE },
    } as never);

    for (const child of result.data!.items) {
      expect(child.ancestors).toEqual([
        { entityType: MERCHELLO_ROOT_ENTITY_TYPE, unique: null },
        { entityType: MERCHELLO_ORDERS_ENTITY_TYPE, unique: "orders" },
      ]);
    }
  });

  it("child items under Products have correct ancestors", async () => {
    const dataSource = new MerchelloTreeDataSource({} as never);

    const result = await dataSource.getChildrenOf({
      parent: { unique: "products", entityType: MERCHELLO_PRODUCTS_ENTITY_TYPE },
    } as never);

    for (const child of result.data!.items) {
      expect(child.ancestors).toEqual([
        { entityType: MERCHELLO_ROOT_ENTITY_TYPE, unique: null },
        { entityType: MERCHELLO_PRODUCTS_ENTITY_TYPE, unique: "products" },
      ]);
    }
  });

  it("getAncestorsOf returns parent for child items", async () => {
    const dataSource = new MerchelloTreeDataSource({} as never);

    const result = await dataSource.getAncestorsOf({
      treeItem: { unique: "outstanding", entityType: "merchello-outstanding" },
    } as never);

    expect(result.data).toHaveLength(1);
    expect(result.data![0].entityType).toBe(MERCHELLO_ORDERS_ENTITY_TYPE);
    expect(result.data![0].unique).toBe("orders");
  });

  it("getAncestorsOf returns empty for root items", async () => {
    const dataSource = new MerchelloTreeDataSource({} as never);

    const result = await dataSource.getAncestorsOf({
      treeItem: { unique: "orders", entityType: MERCHELLO_ORDERS_ENTITY_TYPE },
    } as never);

    expect(result.data).toEqual([]);
  });
});
