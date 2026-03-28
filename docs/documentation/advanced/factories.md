# Factories Reference

Merchello uses the **Factory pattern** to centralize all domain object creation. Instead of scattering `new Entity { ... }` calls throughout your services and controllers, every entity is created through a dedicated factory class. This keeps construction logic in one place, makes it easier to refactor, and ensures that required defaults (like sequential GUIDs and UTC timestamps) are always applied.

## Why Factories?

If you have ever tracked down a bug where a `DateCreated` was set to `DateTime.Now` instead of `DateTime.UtcNow`, or an `Id` was accidentally left as `Guid.Empty`, you already know why factories matter.

By routing every creation through a factory, you get:

- **Consistent defaults** -- sequential GUIDs, UTC timestamps, and currency rounding are applied automatically.
- **One place to change** -- when a new required field is added to a model, you update one factory method, not twenty call sites.
- **Testability** -- factories can be injected and mocked in unit tests.

## Architecture Rule

> **Warning:** Never create domain entities with `new Entity { ... }` directly in controllers or services. Always use the appropriate factory.

Factories live alongside their feature in the `Factories/` folder:

```text
Merchello.Core/
  Accounting/Factories/
    InvoiceFactory.cs
    LineItemFactory.cs
    OrderFactory.cs
    TaxGroupFactory.cs
  Checkout/Factories/
    BasketFactory.cs
  Products/Factories/
    ProductFactory.cs
    ProductRootFactory.cs
    ProductOptionFactory.cs
    ProductCollectionFactory.cs
    ProductFilterFactory.cs
    ProductFilterGroupFactory.cs
    ProductTypeFactory.cs
  Customers/Factories/
    CustomerFactory.cs
    CustomerSegmentFactory.cs
  Discounts/Factories/
    DiscountFactory.cs
  ProductFeeds/Factories/
    ProductFeedFactory.cs
```

Factories are registered in the DI container and injected into services via constructor injection. Some factories accept their own dependencies (e.g., `ICurrencyService` for rounding).

---

## Accounting Factories

### InvoiceFactory

Creates `Invoice` instances. Requires `ICurrencyService` for looking up currency symbols.

**Key methods:**

| Method | What it does |
|---|---|
| `CreateFromBasket(...)` | Creates an invoice from a checkout basket. Captures billing/shipping addresses, currency codes, payment terms, and purchase order numbers. |
| `CreateManual(...)` | Creates a manual invoice for admin-created orders. Rounds amounts using the currency service and adds a system note. |

```csharp
// Creating an invoice from a basket during checkout
var invoice = invoiceFactory.CreateFromBasket(
    basket: basket,
    invoiceNumber: "INV-1001",
    billingAddress: billingAddress,
    shippingAddress: shippingAddress,
    presentmentCurrency: "GBP",
    storeCurrency: "USD",
    customerId: customerId);
```

> **Note:** The factory automatically generates a sequential GUID for the `Id`, sets `DateCreated` and `DateUpdated` to `DateTime.UtcNow`, and looks up the currency symbol from the currency service.

### LineItemFactory

The most feature-rich factory in Merchello. Creates different types of `LineItem` for every stage of the order lifecycle.

**Key methods:**

| Method | Purpose |
|---|---|
| `CreateFromProduct(product, quantity)` | Product line item for a basket. Pulls tax rate and tax group from the product root. |
| `CreateAutoAddProductLineItem(...)` | Product line item for auto-add upsell scenarios. |
| `CreateAddonForBasket(...)` | Add-on line item (e.g., gift wrapping) linked to a parent product via `DependantLineItemSku`. |
| `CreateShippingLineItem(name, amount)` | Shipping cost line item. |
| `CreateForOrder(basketLineItem, quantity, amount, cost)` | Copies a basket line item to an order, with allocated quantity for multi-warehouse splits. |
| `CreateAddonForOrder(addonItem, quantity, amount)` | Copies an add-on to an order. Extracts `CostAdjustment` from extended data. |
| `CreateDiscountForOrder(...)` | Scales a discount proportionally when items are split across multiple orders. |
| `CreateForShipment(source, quantity)` | Copies an order line item to a shipment (partial shipment support). |
| `CreateDiscountLineItem(...)` | General-purpose discount line item. |
| `CreateCustomLineItem(...)` | Custom line item for manual orders. |
| `CreateProductForOrderEdit(...)` | Product line item for order edit operations. |
| `CreateAddonForOrderEdit(...)` | Add-on line item for order edit operations. |

```csharp
// Creating a product line item from a product
var lineItem = lineItemFactory.CreateFromProduct(product, quantity: 2);

// Creating a shipping line item
var shippingLine = lineItemFactory.CreateShippingLineItem("Standard Delivery", 5.99m);
```

> **Tip:** The factory handles `JsonElement` unwrapping internally when reading extended data values. You do not need to call `UnwrapJsonElement()` when using factory methods.

### OrderFactory

Creates `Order` instances linked to an invoice and warehouse.

```csharp
var order = orderFactory.Create(
    invoiceId: invoice.Id,
    warehouseId: warehouseId,
    shippingOptionId: shippingOptionId,
    shippingCost: 5.99m);
```

### TaxGroupFactory

Creates `TaxGroup` instances with a name and tax percentage.

```csharp
var taxGroup = taxGroupFactory.Create("Standard Rate", 20.0m);
```

---

## Checkout Factories

### BasketFactory

Creates `Basket` instances for the checkout flow.

```csharp
var basket = basketFactory.Create(
    customerId: customerId,  // null for guest checkout
    currencyCode: "GBP",
    currencySymbol: "\u00a3");
```

---

## Product Factories

### ProductRootFactory

Creates `ProductRoot` instances -- the parent entity that holds shared configuration like tax group, product type, and options.

```csharp
// Simple creation with options
var root = productRootFactory.Create(
    name: "T-Shirt",
    taxGroup: standardRate,
    productType: clothingType,
    productOptions: sizeAndColorOptions);

// Full creation with URL, collections, and images
var root = productRootFactory.Create(
    name: "T-Shirt",
    rootUrl: "t-shirt",
    taxGroup: standardRate,
    productType: clothingType,
    collections: [casualCollection],
    isDigitalProduct: false,
    rootImages: ["img/tshirt-hero.jpg"]);
```

### ProductFactory

Creates `Product` instances (variants) linked to a product root. Requires `SlugHelper` for URL generation.

```csharp
var product = productFactory.Create(
    productRoot: root,
    name: "T-Shirt - Blue / Large",
    price: 24.99m,
    costOfGoods: 8.50m,
    gtin: "1234567890123",
    sku: "TSH-BLU-LG",
    isDefault: true,
    variantOptionsKey: "blue-large");
```

### ProductOptionFactory

Creates empty `ProductOption` and `ProductOptionValue` instances for update scenarios where properties are set later.

```csharp
var option = productOptionFactory.CreateEmpty();
var value = productOptionFactory.CreateEmptyValue();
```

### ProductCollectionFactory

Creates `ProductCollection` instances for grouping products.

```csharp
var collection = productCollectionFactory.Create("Summer Sale");
```

### ProductFilterFactory and ProductFilterGroupFactory

Create filter entities for product browsing.

```csharp
var group = productFilterGroupFactory.Create("Colour", sortOrder: 1);
var filter = productFilterFactory.Create(
    name: "Red",
    filterGroupId: group.Id,
    hexColour: "#FF0000");
```

### ProductTypeFactory

Creates `ProductType` instances.

```csharp
var type = productTypeFactory.Create("Clothing", "clothing");
```

---

## Customer Factories

### CustomerFactory

Creates `Customer` instances from email (minimal checkout creation) or from explicit parameters.

```csharp
// Minimal creation during checkout
var customer = customerFactory.CreateFromEmail(
    email: "jane@example.com",
    billingAddress: billingAddress,
    acceptsMarketing: true);

// Explicit creation with all fields
var customer = customerFactory.Create(new CreateCustomerParameters
{
    Email = "jane@example.com",
    FirstName = "Jane",
    LastName = "Doe",
    MemberKey = memberKey
});
```

> **Tip:** `CreateFromEmail` automatically extracts first and last names from the billing address `Name` field by splitting on the first space.

### CustomerSegmentFactory

Creates `CustomerSegment` and `CustomerSegmentMember` instances.

```csharp
var segment = customerSegmentFactory.Create(new CreateSegmentParameters
{
    Name = "VIP Customers",
    SegmentType = SegmentType.Manual,
    CreatedBy = adminUserId
});

var member = customerSegmentFactory.CreateMember(
    segmentId: segment.Id,
    customerId: customerId,
    addedBy: adminUserId,
    notes: "Top spender last quarter");
```

---

## Discount Factories

### DiscountFactory

Creates `Discount` instances and all their related configuration objects (target rules, eligibility rules, buy-X-get-Y configs, and free shipping configs).

```csharp
var discount = discountFactory.Create(new CreateDiscountParameters
{
    Name = "Summer Sale 20%",
    Category = DiscountCategory.Product,
    Method = DiscountMethod.Automatic,
    ValueType = DiscountValueType.Percentage,
    Value = 20m,
    StartsAt = DateTime.UtcNow,
    EndsAt = DateTime.UtcNow.AddDays(30)
});

// Create a target rule
var targetRule = discountFactory.CreateTargetRule(
    targetType: DiscountTargetType.Collection,
    targetIds: [summerCollectionId]);

// Create an eligibility rule
var eligibilityRule = discountFactory.CreateEligibilityRule(
    eligibilityType: DiscountEligibilityType.CustomerSegment,
    eligibilityIds: [vipSegmentId]);
```

> **Note:** The factory automatically determines the initial status based on scheduling. If `StartsAt` is in the future, the discount is created with `DiscountStatus.Scheduled`. Otherwise, it is `DiscountStatus.Active`.

---

## Creating Your Own Factories

If you are building a Merchello extension that introduces new domain entities, follow the same pattern:

1. Create a factory class in your feature's `Factories/` folder.
2. Accept any required services (like `ICurrencyService`) via a primary constructor.
3. Use `GuidExtensions.NewSequentialGuid` for entity IDs.
4. Always set `DateCreated` and `DateUpdated` to `DateTime.UtcNow`.
5. Register the factory in DI and inject it where needed.

```csharp
public class MyWidgetFactory(ICurrencyService currencyService)
{
    public Widget Create(string name, decimal price, string currencyCode)
    {
        return new Widget
        {
            Id = GuidExtensions.NewSequentialGuid,
            Name = name,
            Price = currencyService.Round(price, currencyCode),
            DateCreated = DateTime.UtcNow,
            DateUpdated = DateTime.UtcNow
        };
    }
}
```
