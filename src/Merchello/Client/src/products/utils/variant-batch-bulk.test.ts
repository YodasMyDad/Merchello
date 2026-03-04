import { describe, expect, it } from "vitest";
import type { ProductVariantDto } from "@products/types/product.types.js";
import type { SupportedVariantBatchBulkField } from "@products/utils/variant-batch-bulk.js";
import {
  applyVariantBatchBulkValue,
  isVariantBatchBulkFieldSupported,
  parseVariantBatchBulkValue,
} from "@products/utils/variant-batch-bulk.js";

function createVariant(overrides: Partial<ProductVariantDto> = {}): ProductVariantDto {
  return {
    id: "variant-1",
    sku: "SKU-001",
    gtin: "1234567890123",
    supplierSku: "SUP-001",
    hsCode: "620462",
    price: 50,
    costOfGoods: 20,
    onSale: false,
    availableForPurchase: true,
    canPurchase: true,
    warehouseStock: [],
    ...overrides,
  } as ProductVariantDto;
}

describe("variant batch bulk utilities", () => {
  it("supports all bulk fields except trackStock", () => {
    expect(isVariantBatchBulkFieldSupported("price")).toBe(true);
    expect(isVariantBatchBulkFieldSupported("costOfGoods")).toBe(true);
    expect(isVariantBatchBulkFieldSupported("trackStock")).toBe(false);
  });

  it("parses numeric values and rejects invalid or negative numbers", () => {
    const validPrice = parseVariantBatchBulkValue("price", "99.99");
    const validCost = parseVariantBatchBulkValue("costOfGoods", "36");
    const invalid = parseVariantBatchBulkValue("price", "abc");
    const negative = parseVariantBatchBulkValue("price", "-1");

    expect(validPrice.value).toBe(99.99);
    expect(validCost.value).toBe(36);
    expect(invalid.error).toBe("Price must be a valid number.");
    expect(negative.error).toBe("Price must be 0 or greater.");
  });

  it("parses boolean values from controlled inputs", () => {
    const trueValue = parseVariantBatchBulkValue("onSale", "true");
    const falseValue = parseVariantBatchBulkValue("canPurchase", "false");
    const invalid = parseVariantBatchBulkValue("availableForPurchase", "yes");

    expect(trueValue.value).toBe(true);
    expect(falseValue.value).toBe(false);
    expect(invalid.error).toBe("Select true or false for Visible On Website.");
  });

  it("accepts string values for text fields", () => {
    const sku = parseVariantBatchBulkValue("sku", "NEW-SKU-001");
    const hsCode = parseVariantBatchBulkValue("hsCode", "610910");

    expect(sku.value).toBe("NEW-SKU-001");
    expect(hsCode.value).toBe("610910");
  });

  it("applies bulk values immutably and only changes the targeted field", () => {
    const original = [
      createVariant({ id: "variant-1", price: 49.99, sku: "SKU-1" }),
      createVariant({ id: "variant-2", price: 79.99, sku: "SKU-2" }),
    ];

    const updatedPrice = applyVariantBatchBulkValue(original, "price", 99.99);
    const updatedOnSale = applyVariantBatchBulkValue(
      updatedPrice,
      "onSale",
      true,
    );

    expect(updatedPrice[0].price).toBe(99.99);
    expect(updatedPrice[1].price).toBe(99.99);
    expect(updatedPrice[0].sku).toBe("SKU-1");
    expect(updatedOnSale[0].onSale).toBe(true);
    expect(updatedOnSale[1].onSale).toBe(true);

    expect(updatedPrice).not.toBe(original);
    expect(updatedPrice[0]).not.toBe(original[0]);
    expect(updatedPrice[1]).not.toBe(original[1]);
    expect(original[0].price).toBe(49.99);
    expect(original[1].price).toBe(79.99);
  });

  it("applies each supported field without mutating the source variants", () => {
    const variant = createVariant();
    const fieldCases: Array<{
      field: SupportedVariantBatchBulkField;
      value: string | number | boolean;
      getValue: (item: ProductVariantDto) => string | number | boolean;
    }> = [
      { field: "sku", value: "SKU-ALL", getValue: (item) => item.sku ?? "" },
      { field: "gtin", value: "9999999999999", getValue: (item) => item.gtin ?? "" },
      { field: "supplierSku", value: "SUP-ALL", getValue: (item) => item.supplierSku ?? "" },
      { field: "hsCode", value: "620443", getValue: (item) => item.hsCode ?? "" },
      { field: "price", value: 88.5, getValue: (item) => item.price },
      { field: "previousPrice", value: 59.99, getValue: (item) => item.previousPrice as number },
      { field: "costOfGoods", value: 33.1, getValue: (item) => item.costOfGoods },
      { field: "onSale", value: true, getValue: (item) => item.onSale },
      { field: "availableForPurchase", value: false, getValue: (item) => item.availableForPurchase },
      { field: "canPurchase", value: false, getValue: (item) => item.canPurchase },
    ];

    for (const entry of fieldCases) {
      const source = [{ ...variant }];
      const updated = applyVariantBatchBulkValue(source, entry.field, entry.value);
      expect(entry.getValue(updated[0])).toBe(entry.value);
      expect(source[0]).not.toBe(updated[0]);
    }
  });
});
