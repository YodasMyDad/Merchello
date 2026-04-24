# Package Configuration

When Merchello calculates shipping rates -- especially with dynamic carrier providers like FedEx or UPS -- it needs to know the physical dimensions and weight of each product. That is what **package configuration** handles.

## How Packages Work

Each product can define one or more `ProductPackage` entries that describe the boxes it ships in. A large piece of furniture might ship in two boxes, while a t-shirt ships in one. Each package has:

| Property | Description |
|----------|-------------|
| `Weight` | Package weight in **kilograms** |
| `LengthCm` | Package length in **centimetres** (optional) |
| `WidthCm` | Package width in **centimetres** (optional) |
| `HeightCm` | Package height in **centimetres** (optional) |

> **Note:** Dimensions are optional for flat-rate shipping but required for accurate dynamic carrier quotes. If you use FedEx or UPS, always configure dimensions.

## Inheritance: Root vs Variant

Package configuration follows a two-level inheritance model:

### ProductRoot: Default packages

The `ProductRoot` has a `DefaultPackageConfigurations` property. This defines the default packaging for all variants of the product.

```
ProductRoot
  └── DefaultPackageConfigurations: [{ Weight: 2.5, LengthCm: 30, WidthCm: 20, HeightCm: 15 }]
```

### Product (Variant): Override packages

Each variant (`Product`) has its own `PackageConfigurations` property. When populated, it **overrides** the root's defaults entirely. When empty, the variant **inherits** from the root.

```
Product (Variant: "Large - Red")
  └── PackageConfigurations: []  // inherits from root

Product (Variant: "Extra Large - Blue")
  └── PackageConfigurations: [   // overrides root
        { Weight: 5.0, LengthCm: 50, WidthCm: 40, HeightCm: 30 },
        { Weight: 3.0, LengthCm: 40, WidthCm: 30, HeightCm: 20 }
      ]
```

The resolution logic is straightforward:

```csharp
// Variant packages if defined, otherwise root defaults
var packages = product.PackageConfigurations.Count > 0
    ? product.PackageConfigurations
    : product.ProductRoot?.DefaultPackageConfigurations ?? [];
```

> **Tip:** Use variant-level overrides when different sizes or materials of the same product require different packaging. A "Small" variant might ship in a paddy envelope while an "Extra Large" needs a proper box.

## Multiple Packages Per Product

Some products ship in multiple boxes. Simply add multiple entries to the package configuration list. During shipping rate calculations, Merchello creates separate `ShipmentPackage` objects for each box. For a quantity of 3 with 2 packages per unit, Merchello sends 6 packages to the carrier API.

## Add-on Weight

If a line item has dependent add-on products (linked via `DependantLineItemSku`), the add-on weight is extracted from the add-on's `ExtendedData["WeightKg"]` and merged into the **first package** of the parent product. This way carrier APIs receive accurate total weight without inflating the box count.

## HS Codes for International Shipping

For cross-border shipments, products can carry a **Harmonized System (HS) code** for customs classification. This is stored at the variant level (`Product.HsCode`) because different variants may have different materials or compositions.

```csharp
public class Product
{
    /// <summary>
    /// Harmonized System (HS) code for customs/tariff classification.
    /// Different variants may have different materials/compositions.
    /// </summary>
    public string? HsCode { get; set; }
}
```

HS codes are used by fulfilment providers and carrier APIs for customs documentation on international shipments.

## Flat-Rate Weight Tiers

For flat-rate shipping, Merchello uses the total package weight of a group to determine the correct price tier. After order grouping, the system recalculates flat-rate costs based on the combined weight of all packages in the group, ensuring weight-based pricing tiers are applied correctly.

## Best Practices

1. **Always set weight** -- even for flat-rate shipping, weight is used for tier-based pricing.
2. **Set dimensions for carrier shipping** -- FedEx and UPS use dimensional weight pricing. Without dimensions, you may get inaccurate or failed quotes.
3. **Use root defaults** -- set packages on the `ProductRoot` and only override at the variant level when genuinely different.
4. **Keep units consistent** -- weight is always in kilograms, dimensions always in centimetres. The system does not perform unit conversion.

## Related Topics

- [Shipping Overview](shipping-overview.md)
- [Flat Rate Shipping](flat-rate-shipping.md) -- weight tier pricing
- [Dynamic Shipping Providers](dynamic-shipping-providers.md) -- carrier APIs consume weight and dimensions
- [Products Overview](../products/products-overview.md)
