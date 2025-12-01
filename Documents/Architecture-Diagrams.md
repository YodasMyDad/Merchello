# Merch.Core Architecture Diagrams

This document provides visual representations of the core architecture for warehouses, regions, shipping options, and how they all connect in the Merch.Core ecommerce system.

## Key Architecture Concepts

**Multi-Warehouse Variant-Level Stock Tracking**

The system uses a hierarchical approach to warehouse and inventory management:

1. **ProductRoot → ProductRootWarehouse**: Defines which warehouses CAN stock a product line, with priority ordering for warehouse selection
2. **Product (variant) → ProductWarehouse**: Tracks actual per-variant, per-warehouse stock levels
3. **Warehouse Selection**: Uses priority + region serviceability + stock availability to select optimal fulfillment location

This design enables:
- Per-variant inventory accuracy (e.g., 50 Blue-Small vs 30 Red-Large)
- Multi-warehouse distribution (same product stocked in multiple locations)
- Geographic optimization (ship from nearest warehouse with stock)
- Automatic failover (if primary warehouse is out of stock, try next priority)

---

## 1. Core Entity Relationships Overview

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                          MERCH.CORE ENTITY STRUCTURE                            │
└─────────────────────────────────────────────────────────────────────────────────┘

                    ┌──────────────────────────┐
                    │       ProductRoot        │
                    │  (Main Product Entity)   │
                    └──────────┬───────────────┘
                               │
                               │ 1:N
                               ▼
                    ┌──────────────────────────┐
                    │        Product           │
                    │  (Variant/SKU Level)     │
                    └──────────┬───────────────┘
                               │
                ┌──────────────┼──────────────┐
                │              │              │
                │ M:N          │ M:N          │ M:N
                │ (Stock)      │(Shipping)    │(Priority)
                ▼              ▼              ▼
    ┌──────────────────┐  ┌──────────────┐  ┌──────────────────┐
    │ProductWarehouse  │  │ShippingOption│  │ProductRoot       │
    │  - Stock         │  │  - Name      │  │  Warehouse       │
    │  - ReorderPoint  │  │  - FixedCost │  │  - PriorityOrder │
    └────────┬─────────┘  └──────┬───────┘  └────────┬─────────┘
             │                   │                    │
             │                   │ 1:N                │
             │                   ▼                    │
             │         ┌──────────────────┐           │
             │         │  ShippingCost    │           │
             │         │  - CountryCode   │           │
             │         │  - State/Province│           │
             │         │  - Cost          │           │
             │         └──────────────────┘           │
             │                                        │
             └────────────┐            ┌──────────────┘
                          ▼            ▼
                    ┌──────────────────────┐
                    │      Warehouse       │
                    │  - Name              │
                    │  - Code              │
                    │  - Address           │
                    └──────────┬───────────┘
                               │
                               │ 1:N
                               ▼
                    ┌──────────────────────┐
                    │ WarehouseService     │
                    │      Region          │
                    │  - CountryCode       │
                    │  - StateOrProvince   │
                    │  - IsExcluded        │
                    └──────────────────────┘
```

---

## 2. Warehouse Deep Dive

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                              WAREHOUSE STRUCTURE                                │
└─────────────────────────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────────────────────┐
│                              WAREHOUSE                                       │
│                                                                              │
│  Core Properties:                                                            │
│  • Id (Guid)                                                                 │
│  • Name (e.g., "East Coast Warehouse")                                      │
│  • Code (e.g., "EC-01")                                                      │
│  • Address (Full warehouse location)                                        │
│  • AutomationMethod (Optional custom logic)                                 │
│  • ExtendedData (Custom metadata)                                           │
│                                                                              │
│  ┌────────────────────────────────────────────────────────────────────┐     │
│  │                    CONNECTED ENTITIES                              │     │
│  │                                                                    │     │
│  │  1. ServiceRegions (WarehouseServiceRegion[])                     │     │
│  │     └─► Defines which regions this warehouse can/cannot serve     │     │
│  │                                                                    │     │
│  │  2. ShippingOptions (ShippingOption[])                            │     │
│  │     └─► All shipping methods available from this warehouse        │     │
│  │                                                                    │     │
│  │  3. ProductRootWarehouses (ProductRootWarehouse[])                │     │
│  │     └─► Products stored here + priority + stock levels            │     │
│  │                                                                    │     │
│  │  4. ProductWarehousePriceOverrides                                │     │
│  │     └─► Custom pricing per product for this warehouse             │     │
│  └────────────────────────────────────────────────────────────────────┘     │
│                                                                              │
│  Key Method:                                                                 │
│  • CanServeRegion(countryCode, stateOrProvinceCode?)                        │
│    └─► Returns true/false based on ServiceRegions configuration             │
│                                                                              │
└──────────────────────────────────────────────────────────────────────────────┘
```

---

## 3. Service Region Logic Flow

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                         WAREHOUSE SERVICE REGION LOGIC                          │
│                     (Uses Specificity-Based Matching)                           │
└─────────────────────────────────────────────────────────────────────────────────┘

                    Customer Order → Check Shipping Address
                                          ↓
                    ┌─────────────────────────────────────┐
                    │  Warehouse.CanServeRegion(country,  │
                    │         stateOrProvince?)           │
                    └─────────────┬───────────────────────┘
                                  │
                    ┌─────────────▼─────────────┐
                    │  No ServiceRegions Set?   │
                    └─────────────┬─────────────┘
                         YES │         │ NO
                             │         │
                    ┌────────▼─────┐   │
                    │ Return TRUE  │   │
                    │ (Serves All) │   │
                    └──────────────┘   │
                                       │
                         ┌─────────────▼──────────────┐
                         │  Find Matching Regions     │
                         │  (by country + state)      │
                         └─────────────┬──────────────┘
                                       │
                         ┌─────────────▼──────────────┐
                         │  Any Matches Found?        │
                         └─────────────┬──────────────┘
                              NO │          │ YES
                                 │          │
                         ┌───────▼───┐      │
                         │Return FALSE│     │
                         └───────────┘      │
                                            │
                         ┌──────────────────▼────────────────────┐
                         │  State/Province Provided in Request?  │
                         └──────────────────┬────────────────────┘
                                  YES │          │ NO
                                      │          │
                ┌─────────────────────▼──┐       │
                │ Find State-Specific    │       │
                │ Rules for This State   │       │
                └─────────────┬──────────┘       │
                              │                  │
                   ┌──────────▼────────┐         │
                   │  Any State Rules? │         │
                   └──────────┬────────┘         │
                       YES │      │ NO           │
                           │      └──────────────┼───────┐
                           │                     │       │
              ┌────────────▼──────────┐          │       │
              │ Return: Any State     │          │       │
              │ Rule NOT Excluded     │          │       │
              └───────────────────────┘          │       │
                                                 │       │
                                    ┌────────────▼───────▼─────┐
                                    │ Find Country-Level Rules │
                                    │ (no state/province set)  │
                                    └────────────┬─────────────┘
                                                 │
                                    ┌────────────▼─────────────┐
                                    │ Any Country-Level Rules? │
                                    └────────────┬─────────────┘
                                          YES │      │ NO
                                              │      │
                                 ┌────────────▼──┐   │
                                 │ Return: Any   │   │
                                 │ Rule NOT      │   │
                                 │ Excluded      │   │
                                 └───────────────┘   │
                                                     │
                                            ┌────────▼────────┐
                                            │  Return FALSE   │
                                            └─────────────────┘


IMPORTANT: Specificity Rules (Most Specific Wins)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
1. State-specific rules take PRECEDENCE over country-level rules
2. If checking a specific state and a state rule exists, ONLY use that rule
3. Country-level rules apply ONLY when:
   - No specific state/province is being checked, OR
   - A state is being checked but no state-specific rule exists


Examples of WarehouseServiceRegion configurations:

┌──────────────────┬──────────────────┬─────────────┬────────────────────────────────────┐
│  CountryCode     │  State/Province  │  IsExcluded │  Behavior                          │
├──────────────────┼──────────────────┼─────────────┼────────────────────────────────────┤
│  "GB"            │  null            │  false      │  Serves all of UK                  │
│  "GB"            │  "NIR"           │  true       │  Excludes Northern Ireland ONLY    │
│                  │                  │             │  ✓ CanServe("GB", null) = TRUE     │
│                  │                  │             │  ✓ CanServe("GB", "ENG") = TRUE    │
│                  │                  │             │  ✗ CanServe("GB", "NIR") = FALSE   │
├──────────────────┼──────────────────┼─────────────┼────────────────────────────────────┤
│  "US"            │  null            │  false      │  Serves all of USA                 │
│  "US"            │  "HI"            │  true       │  Excludes Hawaii ONLY              │
│                  │                  │             │  ✓ CanServe("US", null) = TRUE     │
│                  │                  │             │  ✓ CanServe("US", "CA") = TRUE     │
│                  │                  │             │  ✗ CanServe("US", "HI") = FALSE    │
├──────────────────┼──────────────────┼─────────────┼────────────────────────────────────┤
│  "CA"            │  "QC"            │  false      │  Serves ONLY Quebec                │
│                  │                  │             │  ✗ CanServe("CA", null) = FALSE    │
│                  │                  │             │  ✓ CanServe("CA", "QC") = TRUE     │
│                  │                  │             │  ✗ CanServe("CA", "ON") = FALSE    │
├──────────────────┼──────────────────┼─────────────┼────────────────────────────────────┤
│  "*"             │  null            │  false      │  Serves all countries globally     │
└──────────────────┴──────────────────┴─────────────┴────────────────────────────────────┘
```

---

## 2. Product Options, Variants, and Add‑ons

The catalog supports two kinds of product options on `ProductRoot`:

- Variant Options: participate in variant generation and determine distinct `Product` SKUs.
- Add‑on Options: do not generate new variants; selected values add price/cost and appear as child line items.

Data model (stored as JSON on `ProductRoot`):

```
┌──────────────────────────┐         has (JSON)
│       ProductRoot        │──────────────────────────────────────┐
└──────────────────────────┘                                      │
                                                                  ▼
                                                         ┌─────────────────────┐
                                                         │   ProductOption     │
                                                         │ - Name/Alias        │
                                                         │ - OptionUiAlias     │
                                                         │ - IsVariant (bool)  │
                                                         └──────────┬──────────┘
                                                                    │ 1:N
                                                                    ▼
                                                         ┌─────────────────────┐
                                                         │ ProductOptionValue  │
                                                         │ - Name/FullName     │
                                                         │ - SortOrder         │
                                                         │ - PriceAdjustment   │
                                                         │ - CostAdjustment    │
                                                         │ - SkuSuffix         │
                                                         └─────────────────────┘
```

Variant generation uses only options where `IsVariant = true`. Add‑on options (`IsVariant = false`) never affect `VariantOptionsKey` and therefore never multiply variants.

Add‑on selection → basket/order flow:

```
 Product Detail Page                                      Basket / Order
 ───────────────────────                                   ───────────────────────────────
 [Variant selectors]
 [Add‑ons]
   - Checkbox/Dropdown (PriceAdjustment shown)   POST /Cart/AddToCart
                                                 ↳ Creates parent Product line:
                                                   LineItemType = Product
                                                 ↳ For each selected add‑on value:
                                                   + LineItemType = Custom
                                                   + Amount = PriceAdjustment (per unit)
                                                   + DependantLineItemSku = parent SKU
                                                   + SKU = baseSKU + '-' + SkuSuffix

 LineItemService.CalculateLineItems includes Product and Custom in subtotal/tax
 Shipping selection ignores Custom line items for grouping and rate logic
 OrderService.CreateOrderFromBasket attaches Custom lines to same order as parent
```

Key behaviors
- Add‑on `PriceAdjustment` and `CostAdjustment` are currency‑agnostic decimals, per unit.
- Add‑on selections are taxable using the parent product’s tax group (can be adjusted later per option if needed).
- Custom line items are non‑shippable and do not affect warehouse grouping.

---

## 4. Shipping Option Structure

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                          SHIPPING OPTION HIERARCHY                              │
└─────────────────────────────────────────────────────────────────────────────────┘

                           ┌───────────────────────────────────┐
                           │       ShippingOption              │
                           │                                   │
                           │  - Name                           │
                           │  - FixedCost?                     │
                           │  - CalculationMethod?             │
                           │  - DaysFrom/DaysTo                │
                           │  - IsNextDay                      │
                           │  - NextDayCutOffTime?             │
                           │                                   │
                           │  Delivery Date Selection:         │
                           │  - AllowsDeliveryDateSelection    │
                           │  - MinDeliveryDays?               │
                           │  - MaxDeliveryDays?               │
                           │  - AllowedDaysOfWeek?             │
                           │  - IsDeliveryDateGuaranteed       │
                           │  - DeliveryDatePricingMethod?     │
                           └──────────┬────────────────────────┘
                                      │
                   ┌──────────────────┼──────────────────┐
                   │                  │                  │
                   ▼                  ▼                  ▼
        ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐
        │ ShippingCost[]  │  │  Products[]     │  │ShippingOption   │
        │                 │  │                 │  │  Country[]      │
        │ Per country/    │  │ Products using  │  │                 │
        │ state pricing   │  │ this option     │  │ Available in    │
        │                 │  │                 │  │ these countries │
        └─────────────────┘  └─────────────────┘  └─────────────────┘


Example Configuration:

┌────────────────────────────────────────────────────────────────────────────┐
│  ShippingOption: "Standard Ground Shipping"                                │
│  - WarehouseId: East Coast Warehouse                                       │
│  - DaysFrom: 3, DaysTo: 5                                                  │
│  - FixedCost: null (use ShippingCosts instead)                            │
│  - AllowsDeliveryDateSelection: false (not enabled)                       │
│                                                                            │
│  ShippingCosts:                                                            │
│    ┌─────────────┬──────────────────┬───────┐                            │
│    │ CountryCode │ State/Province   │ Cost  │                            │
│    ├─────────────┼──────────────────┼───────┤                            │
│    │ "US"        │ null             │ $8.99 │  (All US states)           │
│    │ "US"        │ "HI"             │ $15.99│  (Hawaii override)         │
│    │ "CA"        │ null             │ $12.99│  (All Canada)              │
│    │ "GB"        │ null             │ $18.99│  (United Kingdom)          │
│    └─────────────┴──────────────────┴───────┘                            │
└────────────────────────────────────────────────────────────────────────────┘

┌────────────────────────────────────────────────────────────────────────────┐
│  ShippingOption: "Premium Delivery with Date Selection"                    │
│  - WarehouseId: East Coast Warehouse                                       │
│  - DaysFrom: 2, DaysTo: 10                                                 │
│  - FixedCost: $15.99                                                       │
│                                                                            │
│  Delivery Date Selection:                                                  │
│  - AllowsDeliveryDateSelection: true                                       │
│  - MinDeliveryDays: 2 (earliest: 2 days from order)                       │
│  - MaxDeliveryDays: 10 (latest: 10 days from order)                       │
│  - AllowedDaysOfWeek: "1,2,3,4,5" (Monday-Friday only)                    │
│  - IsDeliveryDateGuaranteed: true                                          │
│  - DeliveryDatePricingMethod: null (no surcharge)                          │
│                                                                            │
│  Customer selects: December 15th → Additional surcharge calculated         │
│  via IDeliveryDateProvider (pluggable, can add weekend fees, rush fees)   │
└────────────────────────────────────────────────────────────────────────────┘
```

---

## 5. Product to Warehouse to Shipping Flow

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                      PRODUCT SHIPPING ASSIGNMENT FLOW                           │
└─────────────────────────────────────────────────────────────────────────────────┘

Step 1: Product is associated with ProductRoot
─────────────────────────────────────────────────────────────────
                    ┌──────────────────┐
                    │   ProductRoot    │
                    │  "T-Shirt Line"  │
                    └────────┬─────────┘
                             │
                    ┌────────▼─────────┐
                    │     Product      │
                    │  "Blue T-Shirt"  │
                    │  SKU: BLU-001    │
                    └──────────────────┘


Step 2: ProductRoot links to Warehouses via ProductRootWarehouse
─────────────────────────────────────────────────────────────────
                    ┌──────────────────┐
                    │   ProductRoot    │
                    │  "T-Shirt Line"  │
                    └────────┬─────────┘
                             │
              ┌──────────────┼──────────────┐
              │              │              │
              ▼              ▼              ▼
   ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐
   │ProductRoot      │  │ProductRoot      │  │ProductRoot      │
   │  Warehouse      │  │  Warehouse      │  │  Warehouse      │
   │                 │  │                 │  │                 │
   │- PriorityOrder:1│  │- PriorityOrder:2│  │- PriorityOrder:3│
   │  (Defines       │  │  (Failover)     │  │  (Last resort)  │
   │   eligibility)  │  │                 │  │                 │
   └────────┬────────┘  └────────┬────────┘  └────────┬────────┘
            │                    │                     │
            ▼                    ▼                     ▼
   ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐
   │  Warehouse #1   │  │  Warehouse #2   │  │  Warehouse #3   │
   │  "East Coast"   │  │  "West Coast"   │  │  "EU Central"   │
   └─────────────────┘  └─────────────────┘  └─────────────────┘


Step 3: Products have stock at warehouses via ProductWarehouse
─────────────────────────────────────────────────────────────────
                    ┌──────────────────┐
                    │     Product      │
                    │  "Blue T-Small"  │
                    │  SKU: BLU-SM     │
                    └────────┬─────────┘
                             │
              ┌──────────────┼──────────────┐
              │              │              │
              ▼              ▼              ▼
   ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐
   │ProductWarehouse │  │ProductWarehouse │  │ProductWarehouse │
   │  Warehouse #1   │  │  Warehouse #2   │  │  Warehouse #3   │
   │                 │  │                 │  │                 │
   │- Stock: 50      │  │- Stock: 30      │  │- Stock: 0       │
   │- ReorderPt: 10  │  │- ReorderPt: 5   │  │- ReorderPt: 5   │
   └────────┬────────┘  └────────┬────────┘  └────────┬────────┘
            │                    │                     │
            ▼                    ▼                     ▼
   ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐
   │  Warehouse #1   │  │  Warehouse #2   │  │  Warehouse #3   │
   │  "East Coast"   │  │  "West Coast"   │  │  "EU Central"   │
   └─────────────────┘  └─────────────────┘  └─────────────────┘

Total Stock for "Blue T-Small": 50 + 30 + 0 = 80 units


Step 4: Each Warehouse has ShippingOptions
─────────────────────────────────────────────────────────────────
   ┌─────────────────────────────────┐
   │      Warehouse "East Coast"     │
   └─────────────┬───────────────────┘
                 │
     ┌───────────┼───────────┐
     │           │           │
     ▼           ▼           ▼
┌─────────┐ ┌─────────┐ ┌─────────┐
│Standard │ │Express  │ │Next Day │
│Ground   │ │2-Day    │ │Morning  │
│$8.99    │ │$15.99   │ │$24.99   │
└─────────┘ └─────────┘ └─────────┘


Step 5: Product-Level Shipping Control (Three-Property System)
─────────────────────────────────────────────────────────────────

Products have FINE-GRAINED control over available shipping options
using THREE properties that work together:

   ┌──────────────────────────────────────────────────────────────┐
   │                      Product Model                           │
   │                                                              │
   │  1. ShippingOptions (ICollection<ShippingOption>)           │
   │     └─► Base set of shipping options for this product       │
   │         (If empty, falls back to warehouse options)         │
   │                                                              │
   │  2. ShippingRestrictionMode (enum)                          │
   │     └─► How to filter options: None / AllowList / ExcludeList│
   │                                                              │
   │  3a. AllowedShippingOptions (ICollection<ShippingOption>)   │
   │      └─► Used when mode = AllowList                         │
   │                                                              │
   │  3b. ExcludedShippingOptions (ICollection<ShippingOption>)  │
   │      └─► Used when mode = ExcludeList                       │
   └──────────────────────────────────────────────────────────────┘


TWO-STEP RESOLUTION ALGORITHM:
═══════════════════════════════════════════════════════════════════

STEP 1: Determine Base Options
─────────────────────────────────────────
  IF Product.ShippingOptions is NOT empty:
    └─► Use Product.ShippingOptions as base
  ELSE:
    └─► Fall back to Warehouse.ShippingOptions


STEP 2: Apply Restriction Mode Filter
─────────────────────────────────────────
  CASE ShippingRestrictionMode.None:
    └─► Return base options as-is (no filtering)

  CASE ShippingRestrictionMode.AllowList:
    └─► IGNORE base options completely
    └─► Return ONLY Product.AllowedShippingOptions
        (Must be explicitly configured)

  CASE ShippingRestrictionMode.ExcludeList:
    └─► Start with base options
    └─► REMOVE any options in Product.ExcludedShippingOptions
    └─► Return filtered list


VISUAL EXAMPLE:
═══════════════════════════════════════════════════════════════════

Warehouse "East Coast" offers: [Standard, Express, Next Day]

Product A: "Regular T-Shirt"
  ├─ ShippingOptions: [] (empty)
  ├─ ShippingRestrictionMode: None
  └─► RESULT: [Standard, Express, Next Day] ✓ (all warehouse options)

Product B: "Fragile Mug"  
  ├─ ShippingOptions: [] (empty, falls back to warehouse)
  ├─ ShippingRestrictionMode: ExcludeList
  ├─ ExcludedShippingOptions: [Next Day]
  └─► RESULT: [Standard, Express] ✓ (Next Day removed due to fragility)

Product C: "Hazmat Item"
  ├─ ShippingOptions: [Ground Special]
  ├─ ShippingRestrictionMode: AllowList
  ├─ AllowedShippingOptions: [Ground Special]
  └─► RESULT: [Ground Special] ✓ (ONLY allowed option, ignores warehouse)

Product D: "Custom Print"
  ├─ ShippingOptions: [Standard, Express] (custom base, not from warehouse)
  ├─ ShippingRestrictionMode: None
  └─► RESULT: [Standard, Express] ✓ (uses product's base options)


IMPORTANT: Impact on Warehouse Grouping
═══════════════════════════════════════════════════════════════════
Products are grouped together at checkout ONLY if they have:
  1. Same warehouse selection, AND
  2. IDENTICAL set of allowed shipping option IDs

This means:
  ✓ Product A + Product A = Same group (same options)
  ✗ Product A + Product B = Different groups (different options)
  ✗ Product B + Product C = Different groups (different options)

Result: Customer may see multiple shipping selections for one warehouse
        if products have different shipping restrictions.
```

---

## 6. Complete Order to Shipment Flow

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                         ORDER TO SHIPMENT FLOW                                  │
└─────────────────────────────────────────────────────────────────────────────────┘

START: Customer adds items to cart and proceeds to checkout
                           ↓
┌─────────────────────────────────────────────────────────────────────┐
│  STEP 1: Customer provides shipping address                        │
│  - Country: US                                                      │
│  - State: CA (California)                                           │
└────────────────────────────┬────────────────────────────────────────┘
                             ↓
┌─────────────────────────────────────────────────────────────────────┐
│  STEP 2: System groups cart items by ProductRoot                   │
│  - Product A (from ProductRoot X)                                   │
│  - Product B (from ProductRoot X)                                   │
│  - Product C (from ProductRoot Y)                                   │
└────────────────────────────┬────────────────────────────────────────┘
                             ↓
┌─────────────────────────────────────────────────────────────────────┐
│  STEP 3: For each Product, select best warehouse                   │
│                                                                     │
│  Product A "Blue T-Shirt Small":                                    │
│    Check ProductRoot.ProductRootWarehouses (by priority):           │
│                                                                     │
│    ├─ Warehouse "East Coast" (Priority 1)                          │
│    │   ├─ CanServeRegion("US", "CA") → TRUE ✓                      │
│    │   └─ Product.ProductWarehouse[East Coast].Stock = 50 ✓        │
│    │   → SELECTED (highest priority + can serve + has stock)       │
│    │                                                                │
│    ├─ Warehouse "West Coast" (Priority 2) - SKIPPED                │
│    │   └─ (Already found suitable warehouse)                       │
│    │                                                                │
│    └─ Warehouse "EU Central" (Priority 3) - SKIPPED                │
│                                                                     │
│  Product C "Red T-Shirt Large":                                     │
│    ├─ Warehouse "East Coast" (Priority 1)                          │
│    │   ├─ CanServeRegion("US", "CA") → TRUE ✓                      │
│    │   └─ Product.ProductWarehouse[East Coast].Stock = 0 ✗         │
│    │                                                                │
│    ├─ Warehouse "West Coast" (Priority 2)                          │
│    │   ├─ CanServeRegion("US", "CA") → TRUE ✓                      │
│    │   └─ Product.ProductWarehouse[West Coast].Stock = 15 ✓        │
│    │   → SELECTED (fallback to priority 2 due to stock)            │
│                                                                     │
│  Result: Product A from East Coast, Product C from West Coast      │
└────────────────────────────┬────────────────────────────────────────┘
                             ↓
┌─────────────────────────────────────────────────────────────────────┐
│  STEP 4: Get shipping options for each product                    │
│                                                                     │
│  For Product A:                                                     │
│    Base Options:                                                    │
│      IF Product.ShippingOptions is empty:                          │
│        → Use Warehouse "East Coast" options:                       │
│           [Standard Ground, Express 2-Day, Next Day Morning]       │
│      ELSE:                                                          │
│        → Use Product.ShippingOptions as base                       │
│                                                                     │
│    Apply ShippingRestrictionMode:                                  │
│      IF mode = None:                                                │
│        → Return base options as-is                                 │
│      IF mode = AllowList:                                           │
│        → Return ONLY Product.AllowedShippingOptions                │
│      IF mode = ExcludeList:                                         │
│        → Return base options MINUS Product.ExcludedShippingOptions │
│                                                                     │
│    Apply ShippingCost for specific region (US, CA)                 │
│                                                                     │
│  Result: Each product has its own filtered shipping options list   │
└────────────────────────────┬────────────────────────────────────────┘
                             ↓
┌─────────────────────────────────────────────────────────────────────┐
│  STEP 5: Create WarehouseShippingGroup                             │
│                                                                     │
│  Group 1:                                                           │
│  - GroupId: {deterministic-guid-1}                                  │
│  - WarehouseId: East Coast                                          │
│  - LineItems: [Product A, Product B]                               │
│  - AvailableShippingOptions: [Standard, Express, Next Day]         │
│                                                                     │
│  Group 2:                                                           │
│  - GroupId: {deterministic-guid-2}                                  │
│  - WarehouseId: West Coast                                          │
│  - LineItems: [Product C]                                           │
│  - AvailableShippingOptions: [Standard, Express]                   │
└────────────────────────────┬────────────────────────────────────────┘
                             ↓
┌─────────────────────────────────────────────────────────────────────┐
│  STEP 6: Customer selects shipping option for each group           │
│  - Group 1: Standard Ground ($8.99)                                │
│  - Group 2: Express 2-Day ($15.99)                                 │
│                                                                     │
│  Optional: Customer selects delivery date (if shipping option      │
│  allows it via AllowsDeliveryDateSelection = true):                │
│  - Group 1: No date selection (not enabled)                        │
│  - Group 2: December 15th selected                                 │
│    → Delivery date validated (min/max days, allowed weekdays)      │
│    → Delivery date surcharge calculated via IDeliveryDateProvider  │
│    → Surcharge: $2.00 (e.g., rush fee for specific date)          │
│                                                                     │
│  Total Shipping Cost: $26.98 ($8.99 + $15.99 + $2.00 surcharge)    │
│                                                                     │
│  CheckoutSession stores:                                            │
│  - SelectedShippingOptions[GroupId-1] = Standard Ground ID          │
│  - SelectedShippingOptions[GroupId-2] = Express 2-Day ID            │
│  - SelectedDeliveryDates[GroupId-2] = December 15th                 │
└────────────────────────────┬────────────────────────────────────────┘
                             ↓
┌─────────────────────────────────────────────────────────────────────┐
│  STEP 7: Order placed → Create Invoice with Orders                 │
│                                                                     │
│  Invoice Created:                                                   │
│    - InvoiceId: {guid}                                              │
│    - Total: $54.98 ($25.00 products + $26.98 shipping + $3.00 tax) │
│                                                                     │
│    Order 1 (matches Group 1):                                       │
│      - WarehouseId: East Coast                                      │
│      - ShippingOptionId: Standard Ground ID                         │
│      - ShippingAddress: Customer Address                            │
│      - ShippingCost: $8.99                                          │
│      - RequestedDeliveryDate: null (not selected)                   │
│      - IsDeliveryDateGuaranteed: null                               │
│      - DeliveryDateSurcharge: null                                  │
│      - LineItems: [Product A, Product B]                            │
│                                                                     │
│    Order 2 (matches Group 2):                                       │
│      - WarehouseId: West Coast                                      │
│      - ShippingOptionId: Express 2-Day ID                           │
│      - ShippingAddress: Customer Address                            │
│      - ShippingCost: $17.99 ($15.99 base + $2.00 surcharge)        │
│      - RequestedDeliveryDate: December 15th                         │
│      - IsDeliveryDateGuaranteed: true                               │
│      - DeliveryDateSurcharge: $2.00                                 │
│      - LineItems: [Product C]                                       │
│                                                                     │
│  NOTE: Orders are NOT shipments yet - they await fulfillment        │
└────────────────────────────┬────────────────────────────────────────┘
                             ↓
┌─────────────────────────────────────────────────────────────────────┐
│  STEP 8: Admin fulfills orders (Future: Admin System)              │
│                                                                     │
│  For each Order, admin can:                                         │
│  1. View order details                                              │
│  2. Pick/pack items from warehouse                                  │
│  3. Create Shipment with tracking info                              │
│                                                                     │
│  Shipment 1 (from Order 1):                                         │
│    - OrderId: Order 1 ID                                            │
│    - SupplierId: East Coast Warehouse ID                            │
│    - Address: Customer Address                                      │
│    - TrackingNumber: "1Z999AA10123456784"                           │
│    - Carrier: "UPS"                                                 │
│    - RequestedDeliveryDate: null                                    │
│    - IsDeliveryDateGuaranteed: null                                 │
│    - ActualDeliveryDate: null (updated later via tracking)          │
│    - LineItems: [Product A, Product B]                              │
│                                                                     │
│  Shipment 2 (from Order 2):                                         │
│    - OrderId: Order 2 ID                                            │
│    - SupplierId: West Coast Warehouse ID                            │
│    - Address: Customer Address                                      │
│    - TrackingNumber: "1Z999AA10123456785"                           │
│    - Carrier: "FedEx"                                               │
│    - RequestedDeliveryDate: December 15th (from Order)              │
│    - IsDeliveryDateGuaranteed: true (from Order)                    │
│    - ActualDeliveryDate: null (updated when delivered)              │
│    - LineItems: [Product C]                                         │
└─────────────────────────────────────────────────────────────────────┘
                             ↓
                           END


KEY CONCEPTS:
═════════════════════════════════════════════════════════════════════

1. WAREHOUSE SHIPPING GROUPS (Checkout Phase)
   - Created during checkout based on warehouse selection + shipping restrictions
   - Each group has a deterministic GroupId for consistency across requests
   - Products are grouped together ONLY if they have:
     a) Same warehouse selection, AND
     b) IDENTICAL set of allowed shipping option IDs
   - Products with different shipping restrictions get SEPARATE groups
   - This means one warehouse can have MULTIPLE groups if products have different restrictions
   
   Example: East Coast Warehouse shipping 3 products
     • Product A (allows: Standard, Express, Next Day) → Group 1
     • Product B (allows: Standard, Express, Next Day) → Group 1 (same options)
     • Product C (allows: Standard, Express only)      → Group 2 (different options)
   
   Result: Customer sees TWO shipping selections for East Coast warehouse
   
   - Groups determine what shipping options customers can choose from

2. ORDERS (Post-Checkout Phase)  
   - One Order created per WarehouseShippingGroup
   - Orders are NOT shipments - they are fulfillment instructions
   - Contains: WarehouseId, ShippingOptionId, ShippingAddress, ShippingCost, LineItems
   - Orders belong to an Invoice (one invoice can have multiple orders)

3. SHIPMENTS (Fulfillment Phase)
   - Created by admin when fulfilling orders
   - Represents actual physical packages sent to customer
   - Contains tracking numbers, carrier info, actual items shipped
   - One Order can have multiple Shipments (partial fulfillment)
   - Shipments belong to Orders

RELATIONSHIP HIERARCHY:
═════════════════════════════════════════════════════════════════════
Invoice (1) → Orders (N) → Shipments (N)

Example:
  Invoice #12345 (Total: $100)
    ├─ Order #1 (Ship from East Coast, Standard Ground)
    │   ├─ Shipment #1 (Package 1, UPS Tracking: 1Z999...)
    │   └─ Shipment #2 (Package 2, UPS Tracking: 1Z998...)
    │
    └─ Order #2 (Ship from West Coast, Express 2-Day)
        └─ Shipment #3 (Package 1, FedEx Tracking: 7999...)
```

---

## 7. Shipping Calculation Methods

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                       SHIPPING COST CALCULATION OPTIONS                         │
└─────────────────────────────────────────────────────────────────────────────────┘

Option 1: Fixed Cost
────────────────────────────────────────────────
ShippingOption:
  - FixedCost: $8.99
  - ShippingCosts: null

Result: Always charges $8.99 regardless of destination


Option 2: Region-Based Pricing (Most Common)
────────────────────────────────────────────────
ShippingOption:
  - FixedCost: null
  - ShippingCosts:
      • US → $8.99
      • US/HI → $15.99
      • CA → $12.99
      • GB → $18.99

Result: Looks up cost based on customer's country/state


Option 3: Custom Calculation Method (Extensible)
────────────────────────────────────────────────
ShippingOption:
  - FixedCost: null
  - CalculationMethod: "MyApp.Shipping.WeightBasedCalculator"
  - ShippingCosts: null

Result: Executes custom plugin/provider logic
  - Can calculate based on weight, dimensions, distance
  - Fully extensible via plugin architecture


Priority Order:
────────────────────────────────────────────────
1. If CalculationMethod is set → Use custom provider
2. Else if FixedCost is set → Use fixed price
3. Else if ShippingCosts exist → Look up by region
4. Else → Error or default to $0


┌────────────────────────────────────────────────────────────────────┐
│  Pro Tip: Warehouse can also have AutomationMethod property       │
│  for custom warehouse-level shipping logic that affects all       │
│  shipping options from that warehouse                             │
└────────────────────────────────────────────────────────────────────┘
```

---

## 8. Invoice → Order → Shipment Hierarchy

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                    INVOICE → ORDER → SHIPMENT STRUCTURE                         │
└─────────────────────────────────────────────────────────────────────────────────┘

                           ┌──────────────────────┐
                           │       Invoice        │
                           │                      │
                           │  - SubTotal          │
                           │  - Tax               │
                           │  - Total             │
                           │  - Adjustments       │
                           └──────────┬───────────┘
                                      │
                                      │ 1:N
                                      ▼
                           ┌──────────────────────┐
                           │        Order         │
                           │                      │
                           │  - InvoiceId         │
                           │  - WarehouseId       │◄─── Which warehouse ships this
                           │  - ShippingOptionId  │◄─── Selected shipping method
                           │  - ShippingAddress   │◄─── Where to ship
                           │  - ShippingCost      │◄─── Cost for this order
                           │  - LineItems[]       │◄─── Products in this order
                           └──────────┬───────────┘
                                      │
                                      │ 1:N
                                      ▼
                           ┌──────────────────────┐
                           │      Shipment        │
                           │                      │
                           │  - OrderId           │
                           │  - SupplierId        │◄─── Warehouse that shipped
                           │  - TrackingNumber    │◄─── Carrier tracking
                           │  - TrackingUrl       │
                           │  - Carrier           │◄─── UPS, FedEx, etc.
                           │  - Address           │
                           │  - LineItems[]       │◄─── Actual items shipped
                           └──────────────────────┘


Example Flow:
═════════════════════════════════════════════════════════════════════

Invoice #12345
├─ Order #1 (East Coast Warehouse, Standard Ground, $8.99)
│  ├─ LineItems: Blue T-Shirt Small (x2), Blue T-Shirt Medium (x1)
│  ├─ Shipment #1 (Sent 2 Blue Small, UPS: 1Z999...)
│  └─ Shipment #2 (Sent 1 Blue Medium, UPS: 1Z998...)
│
└─ Order #2 (West Coast Warehouse, Express 2-Day, $15.99)
   ├─ LineItems: Red T-Shirt Large (x1)
   └─ Shipment #3 (Sent 1 Red Large, FedEx: 7999...)


Why This Design?
═════════════════════════════════════════════════════════════════════

1. INVOICE = Customer's bill (one per checkout)
   - Contains financial totals
   - Can have multiple orders if items ship from different warehouses

2. ORDER = Fulfillment instruction (one per warehouse shipping group)
   - Tells warehouse staff WHAT to ship, WHERE, and HOW
   - Created immediately after checkout
   - Awaits fulfillment (admin action)

3. SHIPMENT = Physical package (created during fulfillment)
   - Represents actual packages with tracking numbers
   - Created by admin when order is fulfilled
   - Enables partial fulfillment (backorders, split packages)
```

---

## 9. Key Relationships Summary

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                         ENTITY RELATIONSHIP MATRIX                              │
└─────────────────────────────────────────────────────────────────────────────────┘

ProductRoot ←──[1:N]──→ Product
    │                      │
    │                      ├─[M:N]─→ ShippingOption
    │                      │
    │                      └─[1:N]─→ ProductWarehousePriceOverride
    │
    └──[M:N via ProductRootWarehouse]──→ Warehouse
                                            │
                                            ├─[1:N]─→ ShippingOption
                                            │            │
                                            │            ├─[1:N]─→ ShippingCost
                                            │            │
                                            │            └─[M:N]─→ ShippingOptionCountry
                                            │
                                            └─[1:N]─→ WarehouseServiceRegion

Invoice ←──[1:N]──→ Order ←──[1:N]──→ Shipment
   │                  │                   │
   │                  ├─ WarehouseId      └─ TrackingNumber
   │                  ├─ ShippingOptionId     Carrier
   │                  ├─ ShippingAddress      Address
   │                  ├─ ShippingCost
   │                  └─ LineItems[]
   │
   ├─ SubTotal
   ├─ Tax
   ├─ Total
   └─ Adjustments


Legend:
  1:N  = One-to-Many (e.g., 1 Invoice has N Orders)
  M:N  = Many-to-Many (e.g., Many Products can use Many ShippingOptions)
```

---

## 10. Real-World Example Scenario

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                          REAL-WORLD CONFIGURATION EXAMPLE                       │
└─────────────────────────────────────────────────────────────────────────────────┘

Company: "TeeShirts R Us" - Global T-Shirt Retailer

WAREHOUSES:
───────────────────────────────────────────────────────────────────────
┌──────────────────────┬──────────────────────┬──────────────────────┐
│  East Coast USA      │  West Coast USA      │  Europe              │
│  (NYC)               │  (LA)                │  (Amsterdam)         │
├──────────────────────┼──────────────────────┼──────────────────────┤
│  ServiceRegions:     │  ServiceRegions:     │  ServiceRegions:     │
│  • US (all)          │  • US (all)          │  • GB (all)          │
│  • CA (all)          │  • CA (all)          │  • FR (all)          │
│                      │                      │  • DE (all)          │
│                      │                      │  • NL (all)          │
├──────────────────────┼──────────────────────┼──────────────────────┤
│  ShippingOptions:    │  ShippingOptions:    │  ShippingOptions:    │
│  • Ground (3-5d)     │  • Ground (3-5d)     │  • Standard (5-7d)   │
│  • Express (2d)      │  • Express (2d)      │  • Express (2-3d)    │
│  • Next Day          │  • Next Day          │                      │
└──────────────────────┴──────────────────────┴──────────────────────┘


PRODUCT CONFIGURATION:
───────────────────────────────────────────────────────────────────────
ProductRoot: "Classic T-Shirt"
  │
  ├─► Product: "Classic T-Shirt - Blue - Small" (SKU: CTS-BLU-SM)
  │   └─ ShippingRestrictionMode: None (all options available)
  │
  ├─► Product: "Classic T-Shirt - Red - Large" (SKU: CTS-RED-LG)
  │   └─ ShippingRestrictionMode: ExcludeList
  │       └─ Excludes: Next Day (fragile packaging, can't rush)
  │
  └─► Warehouses via ProductRootWarehouse:
      ├─ East Coast (Priority: 1)
      ├─ West Coast (Priority: 2)
      └─ Europe (Priority: 3)
  
  └─► Per-Variant Stock via ProductWarehouse:
      Product "Blue - Small":
        ├─ East Coast: 50 units
        ├─ West Coast: 30 units
        └─ Europe: 20 units
      Product "Red - Large":
        ├─ East Coast: 0 units (out of stock!)
        ├─ West Coast: 15 units
        └─ Europe: 10 units


CUSTOMER ORDER SCENARIO:
───────────────────────────────────────────────────────────────────────
Customer: John in California
Orders:
  • 2x "Classic T-Shirt - Blue - Small"
  • 1x "Classic T-Shirt - Red - Large"

System Logic:
  1. Customer address: US/CA
  2. For "Blue - Small":
     - Check East Coast (Priority 1): CanServeRegion("US", "CA") = TRUE ✓
     - Check stock: ProductWarehouse[East Coast].Stock = 50 ✓
     - SELECTED: East Coast
  3. For "Red - Large":
     - Check East Coast (Priority 1): CanServeRegion("US", "CA") = TRUE ✓
     - Check stock: ProductWarehouse[East Coast].Stock = 0 ✗
     - Check West Coast (Priority 2): CanServeRegion("US", "CA") = TRUE ✓
     - Check stock: ProductWarehouse[West Coast].Stock = 15 ✓
     - SELECTED: West Coast (fallback due to stock)
  4. Two shipments needed (different warehouses)
  5. Get shipping options from each warehouse
  6. Customer selects shipping method for each group
  7. Create shipments from East Coast + West Coast


Alternative Scenario - European Customer:
───────────────────────────────────────────────────────────────────────
Customer: Marie in France
Orders: Same products

System Logic:
  1. Customer address: FR
  2. Check ProductRoot warehouses
  3. Priority 1: East Coast → CanServeRegion("FR") = FALSE ✗
  4. Priority 2: West Coast → CanServeRegion("FR") = FALSE ✗
  5. Priority 3: Europe → CanServeRegion("FR") = TRUE ✓
  6. Use Europe Warehouse (Amsterdam)
  7. Get shipping options: Standard, Express
  8. Customer selects: Standard 5-7 Days
  9. Lookup ShippingCost for FR → €12.99
  10. Create shipment from Europe Warehouse


Advanced Scenario - Shipping Restrictions Affecting Groups:
───────────────────────────────────────────────────────────────────────
Company: "Electronics & More" - Multi-Product Retailer

WAREHOUSE:
East Coast Warehouse offers: [Ground, Express, Next Day, Freight]

PRODUCTS WITH DIFFERENT RESTRICTIONS:

ProductRoot: "Electronics Bundle"
  ├─► Product A: "Smartphone" (SKU: PHONE-001)
  │   ├─ ShippingRestrictionMode: None
  │   ├─ ShippingOptions: [] (empty, uses warehouse options)
  │   └─► Available: [Ground, Express, Next Day, Freight]
  │
  ├─► Product B: "Laptop" (SKU: LAPTOP-001)
  │   ├─ ShippingRestrictionMode: None
  │   ├─ ShippingOptions: [] (empty, uses warehouse options)
  │   └─► Available: [Ground, Express, Next Day, Freight]
  │
  ├─► Product C: "Fragile Monitor" (SKU: MON-001)
  │   ├─ ShippingRestrictionMode: ExcludeList
  │   ├─ ExcludedShippingOptions: [Next Day] (too fragile to rush)
  │   └─► Available: [Ground, Express, Freight]
  │
  └─► Product D: "Lithium Battery Pack" (SKU: BATT-001)
      ├─ ShippingRestrictionMode: AllowList
      ├─ AllowedShippingOptions: [Ground] (hazmat regulations)
      └─► Available: [Ground] only

CUSTOMER ORDER:
Customer: Sarah in New York
Cart:
  • 1x Smartphone (Product A)
  • 1x Laptop (Product B)
  • 1x Fragile Monitor (Product C)
  • 1x Lithium Battery Pack (Product D)

WAREHOUSE GROUPING LOGIC:
1. All products selected for East Coast Warehouse (stock available, region serviceable)

2. Calculate allowed shipping options per product:
   • Product A: [Ground, Express, Next Day, Freight]
   • Product B: [Ground, Express, Next Day, Freight]
   • Product C: [Ground, Express, Freight] (excludes Next Day)
   • Product D: [Ground] (only allowed option)

3. Group products by identical shipping option sets:
   
   GROUP 1: Products A + B
     ├─ WarehouseId: East Coast
     ├─ Allowed Options: [Ground, Express, Next Day, Freight]
     ├─ GroupId: {deterministic-guid-1}
     └─ LineItems: Smartphone, Laptop
   
   GROUP 2: Product C
     ├─ WarehouseId: East Coast
     ├─ Allowed Options: [Ground, Express, Freight]
     ├─ GroupId: {deterministic-guid-2}
     └─ LineItems: Fragile Monitor
   
   GROUP 3: Product D
     ├─ WarehouseId: East Coast
     ├─ Allowed Options: [Ground]
     ├─ GroupId: {deterministic-guid-3}
     └─ LineItems: Lithium Battery Pack

CHECKOUT EXPERIENCE:
Customer sees THREE shipping method selections (all from East Coast Warehouse):

  Shipment 1 - Smartphone, Laptop
    ○ Ground Shipping ($8.99, 3-5 days)
    ○ Express 2-Day ($15.99, 2 days)
    ○ Next Day ($24.99, 1 day)
    ○ Freight ($12.99, 5-7 days)

  Shipment 2 - Fragile Monitor
    ○ Ground Shipping ($8.99, 3-5 days)
    ○ Express 2-Day ($15.99, 2 days)
    ○ Freight ($12.99, 5-7 days)
    [Next Day not available due to fragility]

  Shipment 3 - Lithium Battery Pack
    ○ Ground Shipping ($8.99, 3-5 days)
    [Only Ground available due to hazmat regulations]

Customer selections:
  • Shipment 1: Next Day ($24.99) - wants electronics fast
  • Shipment 2: Ground ($8.99) - monitor can arrive slower
  • Shipment 3: Ground ($8.99) - no choice, only option

Total Shipping: $42.97

RESULT:
Invoice created with THREE Orders (one per group), all from East Coast Warehouse
  ├─ Order 1: Smartphone + Laptop via Next Day ($24.99)
  ├─ Order 2: Monitor via Ground ($8.99)
  └─ Order 3: Battery Pack via Ground ($8.99)
```

---

## 11. Order Status & Inventory Management

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                      ORDER STATUS LIFECYCLE & INVENTORY                         │
└─────────────────────────────────────────────────────────────────────────────────┘

OVERVIEW:
Orders have a complete lifecycle with automatic inventory reservation/allocation.
Stock tracking is optional per product-warehouse (TrackStock flag).

ORDER STATUS FLOW:
═══════════════════════════════════════════════════════════════════════════

┌─────────────┐
│   Pending   │  Order created, awaiting initial processing
└──────┬──────┘
       │
       ▼
┌─────────────┐
│ AwaitingStock│ Stock reserved but not all available (backorder scenario)
└──────┬──────┘
       │
       ▼
┌──────────────┐
│ReadyToFulfill│  Stock available and reserved, ready for warehouse picking
└──────┬───────┘
       │
       ▼
┌─────────────┐
│ Processing  │  Being picked/packed at warehouse
└──────┬──────┘
       │
       ├───────────────┐
       ▼               ▼
┌──────────────┐ ┌──────────┐
│PartiallyShipped│ │ Shipped  │  All items shipped
└──────────────┘ └────┬─────┘
                      │
                      ▼
               ┌──────────┐
               │Completed │  Delivered to customer
               └──────────┘

  ANY STATUS (except Shipped/Completed) can transition to:
  ┌──────────┐
  │Cancelled │  Order cancelled, stock reservations released
  └──────────┘

  ┌────────┐
  │ OnHold │  Payment issue, fraud check, manual review
  └────────┘


INVENTORY RESERVATION FLOW:
═══════════════════════════════════════════════════════════════════════════

ProductWarehouse Entity:
  - Stock: Total physical inventory
  - ReservedStock: Quantity reserved by pending orders
  - TrackStock: Enable/disable stock tracking (default: true)
  
Available Stock = Stock - ReservedStock

PHASE 1: ORDER CREATION (Checkout Complete)
───────────────────────────────────────────────────────────────────────────

Customer checks out
       ↓
For each line item:
  ├─ Check TrackStock flag
  │
  ├─ If TrackStock = false (digital/dropship):
  │   └─ Skip reservation, mark ready
  │
  └─ If TrackStock = true (physical product):
      ├─ Check available stock (Stock - ReservedStock)
      ├─ If sufficient: Reserve quantity
      │   └─ ReservedStock += quantity
      └─ If insufficient: Fail order creation (rollback transaction)

Order created with status = ReadyToFulfill
Stock is now RESERVED but NOT DEDUCTED


PHASE 2: SHIPMENT CREATION (Fulfillment)
───────────────────────────────────────────────────────────────────────────

Warehouse creates shipment
       ↓
For each line item:
  ├─ Check TrackStock flag
  │
  ├─ If TrackStock = false:
  │   └─ Skip allocation
  │
  └─ If TrackStock = true:
      ├─ Allocate stock:
      │   ├─ Stock -= quantity
      │   └─ ReservedStock -= quantity
      └─ Stock is now DEDUCTED

Order status updates automatically:
  ├─ If all items shipped → Shipped
  └─ If some items shipped → PartiallyShipped


PHASE 3: ORDER CANCELLATION
───────────────────────────────────────────────────────────────────────────

Order cancelled (before shipping)
       ↓
For each line item:
  ├─ Check TrackStock flag
  │
  ├─ If TrackStock = false:
  │   └─ Skip release
  │
  └─ If TrackStock = true:
      └─ Release reservation:
          └─ ReservedStock -= quantity

Stock is now AVAILABLE AGAIN for other orders


TRACKSTOCK FLAG BEHAVIOR:
═══════════════════════════════════════════════════════════════════════════

TrackStock = TRUE (Physical Products - Default):
─────────────────────────────────────────────────
  ✓ Stock checked during warehouse selection
  ✓ Reservation required before order created
  ✓ Available stock = Stock - ReservedStock
  ✓ Allocation deducts from Stock when shipped
  ✓ Use cases: T-shirts, books, electronics, etc.

TrackStock = FALSE (Digital/Made-to-Order):
────────────────────────────────────────────
  ✓ Warehouse selection always succeeds (no stock check)
  ✓ No reservation needed
  ✓ Available stock = unlimited (int.MaxValue)
  ✓ No stock deduction when shipped
  ✓ Use cases: Digital downloads, services, made-to-order, dropship


MIXED ORDERS (Tracked + Untracked Items):
═══════════════════════════════════════════════════════════════════════════

Orders can contain BOTH tracked and untracked items seamlessly:

Example Order:
  ├─ 2x Physical T-Shirt (TrackStock=true)  → Stock reserved & allocated
  ├─ 1x Digital eBook (TrackStock=false)    → No stock operations
  └─ 1x Custom Print (TrackStock=false)     → No stock operations

The system automatically handles each item appropriately based on its
TrackStock flag. No manual intervention needed.


CONCURRENT ORDER PROTECTION:
═══════════════════════════════════════════════════════════════════════════

Database transactions ensure atomic operations:
  ├─ Order creation + stock reservation = single transaction
  ├─ Shipment creation + stock allocation = single transaction
  └─ Order cancellation + stock release = single transaction

Multiple customers ordering simultaneously are protected:
  ├─ Available stock checked: Stock - ReservedStock
  ├─ Reservations are atomic (database-level consistency)
  └─ Over-allocation prevented


EXTENSIBILITY: IOrderStatusHandler
═══════════════════════════════════════════════════════════════════════════

Custom status transition logic via plugin:

  public interface IOrderStatusHandler
  {
      Task<bool> CanTransitionAsync(order, newStatus);
      Task OnStatusChangingAsync(order, oldStatus, newStatus);
      Task OnStatusChangedAsync(order, oldStatus, newStatus);
  }

Use cases:
  ├─ Custom validation rules
  ├─ Send notifications on status change
  ├─ Trigger external systems (ERP, WMS)
  └─ Log to audit trail

Register custom handler in Startup.cs:
  builder.Services.AddScoped<IOrderStatusHandler, CustomOrderStatusHandler>();


REAL-WORLD EXAMPLE: Mixed Order Flow
═══════════════════════════════════════════════════════════════════════════

Customer orders:
  ├─ 2x Blue T-Shirt Small (Physical, TrackStock=true, Stock=50)
  └─ 1x Premium Support (Service, TrackStock=false)

Order Creation:
  ├─ T-Shirts: Check available stock (50 - 0 = 50 available) ✓
  ├─ T-Shirts: Reserve 2 units → ReservedStock = 2
  ├─ Service: Skip stock operations ✓
  └─ Order created with Status=ReadyToFulfill

Warehouse Fulfillment:
  ├─ Create shipment for T-Shirts
  ├─ Allocate: Stock = 48, ReservedStock = 0
  ├─ Service requires no shipment
  └─ Order Status → Shipped

Final State:
  ├─ T-Shirts: Stock=48, ReservedStock=0 (2 units sold)
  ├─ Service: Stock unchanged (not tracked)
  └─ Available to other customers: 48 T-Shirts
```

---

## 12. Extension Points & Customization

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                         EXTENSIBILITY & PLUGIN POINTS                           │
└─────────────────────────────────────────────────────────────────────────────────┘

The system is designed for extensibility at multiple levels:

1. WAREHOUSE LEVEL
   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   Warehouse.AutomationMethod
   └─► Custom logic for warehouse-wide shipping calculations
       Example: "MyCompany.Shipping.DistanceBasedCalculator"


2. SHIPPING OPTION LEVEL
   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   ShippingOption.CalculationMethod
   └─► Custom per-option calculation logic
       Example: "MyCompany.Shipping.WeightBasedCalculator"
       
   Plugin discovers via ExtensionManager (IShippingProvider)


3. PRODUCT LEVEL - SHIPPING RESTRICTIONS
   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   Products control shipping via a THREE-PROPERTY system:
   
   A. Product.ShippingOptions (ICollection<ShippingOption>)
      └─► Base set of shipping options for this specific product
          • If empty: Falls back to warehouse options
          • If populated: Uses these as base instead of warehouse options
          • Purpose: Allows products to have custom base options
   
   B. Product.ShippingRestrictionMode (enum)
      ├─ None: Return base options as-is (no filtering)
      ├─ AllowList: Return ONLY AllowedShippingOptions (ignores base)
      └─ ExcludeList: Return base MINUS ExcludedShippingOptions
   
   C. Product.AllowedShippingOptions (ICollection<ShippingOption>)
      └─► Used when mode = AllowList
          • Completely overrides base options
          • Must be explicitly configured
          • Use case: Hazmat, special handling, regulatory restrictions
   
   D. Product.ExcludedShippingOptions (ICollection<ShippingOption>)
      └─► Used when mode = ExcludeList
          • Filters OUT specific options from base
          • Remaining options are available
          • Use case: Fragile items, size restrictions, temperature-sensitive
   
   
   RESOLUTION ALGORITHM (implemented in GetAllowedShippingOptionsForProduct):
   ─────────────────────────────────────────────────────────────────────────
   
   Step 1: Determine Base Options
     baseOptions = product.ShippingOptions.Any() 
                   ? product.ShippingOptions 
                   : warehouse.ShippingOptions
   
   Step 2: Apply Restriction Mode
     switch (product.ShippingRestrictionMode)
     {
       case None:
         return baseOptions;
       
       case AllowList:
         return product.AllowedShippingOptions;
       
       case ExcludeList:
         return baseOptions.Except(product.ExcludedShippingOptions);
     }
   
   
   REAL-WORLD EXAMPLES:
   ─────────────────────────────────────────────────────────────────────────
   
   Example 1: Standard Product (No Restrictions)
   ─────────────────────────────────────────────
   Product: "Cotton T-Shirt"
     • ShippingOptions: [] (empty)
     • ShippingRestrictionMode: None
     • Warehouse offers: [Ground, Express, Next Day]
     → Result: [Ground, Express, Next Day] ✓
   
   
   Example 2: Fragile Product (Exclude Fast Shipping)
   ─────────────────────────────────────────────
   Product: "Glass Vase"
     • ShippingOptions: [] (empty, use warehouse)
     • ShippingRestrictionMode: ExcludeList
     • ExcludedShippingOptions: [Next Day]
     • Warehouse offers: [Ground, Express, Next Day]
     → Result: [Ground, Express] ✓
     Rationale: Next Day shipping too rough for fragile items
   
   
   Example 3: Hazmat Product (Only Specific Carrier)
   ─────────────────────────────────────────────
   Product: "Aerosol Spray Paint"
     • ShippingOptions: [] (not used in AllowList mode)
     • ShippingRestrictionMode: AllowList
     • AllowedShippingOptions: [Ground Hazmat]
     • Warehouse offers: [Ground, Express, Next Day, Ground Hazmat]
     → Result: [Ground Hazmat] ✓ (only allowed option)
     Rationale: DOT regulations require specific carrier certification
   
   
   Example 4: Custom Base Options (Different from Warehouse)
   ─────────────────────────────────────────────
   Product: "Digital Download"
     • ShippingOptions: [Email Delivery]
     • ShippingRestrictionMode: None
     • Warehouse offers: [Ground, Express, Next Day]
     → Result: [Email Delivery] ✓
     Rationale: Product has its own shipping method, ignores warehouse physical options
   
   
   IMPACT ON WAREHOUSE GROUPING:
   ─────────────────────────────────────────────────────────────────────────
   
   Products are grouped at checkout by:
     1. Selected warehouse ID (same warehouse)
     2. Allowed shipping option IDs (EXACT match required)
   
   This means:
     • Products with different restrictions → SEPARATE groups
     • Same warehouse can have MULTIPLE groups
     • Customer may select different shipping for each group
   
   Example:
     Cart: [T-Shirt (all options), Glass Vase (no Next Day), Battery (Ground only)]
     Warehouse: East Coast (offers Ground, Express, Next Day)
     
     Result: 3 separate groups from same warehouse
       Group 1: T-Shirt → can choose from [Ground, Express, Next Day]
       Group 2: Glass Vase → can choose from [Ground, Express]
       Group 3: Battery → must use [Ground]


4. PRICING LEVEL
   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   ProductWarehousePriceOverride
   └─► Custom product pricing per warehouse
       Example: Product costs more when shipped from EU warehouse


5. DELIVERY DATE SELECTION
   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   ShippingOption.DeliveryDatePricingMethod
   └─► Custom delivery date calculation and pricing logic via IDeliveryDateProvider
   
   ShippingOption Properties:
   ├─ AllowsDeliveryDateSelection - Enable/disable feature per option
   ├─ MinDeliveryDays / MaxDeliveryDays - Date range constraints
   ├─ AllowedDaysOfWeek - CSV list (e.g., "1,2,3,4,5" for weekdays)
   ├─ IsDeliveryDateGuaranteed - Hard requirement vs best effort
   └─ DeliveryDatePricingMethod - Plugin for custom surcharge logic
   
   Default Provider (DefaultDeliveryDateProvider):
   ├─ Calculates available dates using min/max days + allowed weekdays
   ├─ Returns zero surcharge (no pricing impact)
   └─ Validates dates against configured constraints
   
   Custom Provider Example (WeekendSurchargeProvider):
   ├─ Implement IDeliveryDateProvider interface
   ├─ Add custom logic in CalculateSurchargeAsync()
   └─ Discovered automatically via ExtensionManager
   
   Flow:
   CheckoutSession.SelectedDeliveryDates[GroupId]
     ↓
   DeliveryDateService.CalculateDeliveryDateSurchargeAsync()
     ↓ (via provider)
   Order { RequestedDeliveryDate, IsDeliveryDateGuaranteed, DeliveryDateSurcharge }
     ↓
   Shipment { RequestedDeliveryDate, IsDeliveryDateGuaranteed, ActualDeliveryDate }
   
   Use Cases:
   ├─ Guaranteed delivery dates (e.g., "Deliver on December 25th")
   ├─ Weekend/holiday surcharges (custom provider)
   ├─ Weekday-only delivery (AllowedDaysOfWeek = "1,2,3,4,5")
   └─ Rush delivery fees (custom provider based on min days)


6. DATA EXTENSION
   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   Warehouse.ExtendedData (Dictionary<string, object>)
   └─► Store custom metadata without schema changes
       Example: { "CarrierAccountId": "12345", "MaxWeight": 50 }


┌────────────────────────────────────────────────────────────────────┐
│  Design Philosophy:                                                │
│  Everything is pluggable via ExtensionManager, not hardcoded       │
│  Use factories for object creation (dependency injection)          │
│  Services consolidate all feature methods (KISS principle)         │
└────────────────────────────────────────────────────────────────────┘
```

---

## Summary

The Merch.Core architecture follows a hierarchical flow:

1. **Products** are grouped under **ProductRoots**
2. **ProductRoots** are stored in **Warehouses** (with priority & stock)
3. **Warehouses** define which **regions** they can serve (via `WarehouseServiceRegion`)
4. **Warehouses** offer **ShippingOptions** (with pricing, timing, delivery info)
5. **ShippingOptions** have **ShippingCosts** for specific countries/states
6. **Products** have fine-grained shipping control via three properties:
   - `ShippingOptions` (base options, falls back to warehouse if empty)
   - `ShippingRestrictionMode` (None/AllowList/ExcludeList)
   - `AllowedShippingOptions` / `ExcludedShippingOptions` (filter collections)
7. **ShippingOptions** optionally allow **Delivery Date Selection**:
   - `AllowsDeliveryDateSelection` enables/disables feature per option
   - Configurable constraints: min/max days, allowed weekdays
   - Guaranteed vs preference delivery modes
   - Pluggable pricing via `IDeliveryDateProvider`
8. At checkout, the system:
   - Selects optimal warehouse per product (priority + region + stock)
   - Determines base shipping options (product's or warehouse's)
   - Applies product-level restrictions (allow/exclude filters)
   - Groups products by warehouse + identical allowed shipping options
   - Creates separate groups for products with different restrictions
   - Presents available shipping options per group
   - Allows delivery date selection (if enabled on shipping option)
   - Calculates costs based on configuration or plugins
   - Calculates delivery date surcharges (if applicable)
9. **Orders** store delivery date information:
   - `RequestedDeliveryDate`, `IsDeliveryDateGuaranteed`, `DeliveryDateSurcharge`
10. **Shipments** track delivery dates:
    - Requested date from Order, actual delivery date (from tracking)

This design ensures:
- ✓ Flexibility for multi-warehouse operations
- ✓ Geographic shipping restrictions (warehouse level)
- ✓ Product-specific shipping restrictions (variant level)
- ✓ Per-region pricing
- ✓ Fine-grained shipping controls (fragile, hazmat, size restrictions)
- ✓ Automatic warehouse grouping with restriction awareness
- ✓ Optional delivery date selection with configurable constraints
- ✓ Pluggable delivery date pricing (weekend fees, rush charges, etc.)
- ✓ Transparent delivery date surcharges
- ✓ Guaranteed vs preference delivery modes
- ✓ Extensibility via plugins
- ✓ Simple developer experience (KISS principle)

