# Merchello Discount System - Developer Implementation Guide

> A comprehensive plan for implementing Shopify-like discounts in Merchello.

## Table of Contents

1. [Overview](#1-overview)
2. [Discount Types](#2-discount-types)
3. [Database Schema](#3-database-schema)
4. [Backend Architecture](#4-backend-architecture)
5. [API Design](#5-api-design)
6. [Frontend Implementation](#6-frontend-implementation)
7. [Discount Engine](#7-discount-engine)
8. [Reporting & Analytics](#8-reporting--analytics)
9. [Implementation Phases](#9-implementation-phases)
10. [Testing Strategy](#10-testing-strategy)

> **Prerequisite**: This feature depends on [Customer Segments](Customer-Segments.md) being implemented first. The discount eligibility system uses segments for customer targeting.

> **Note**: The `DiscountValueType` enum (in `src/Merchello.Core/Accounting/Models/DiscountValueType.cs`) supports `FixedAmount`, `Percentage`, and `Free` values. The existing manual discount feature in order editing uses this enum.

---

## 1. Overview

### Goals

- Feature parity with Shopify's discount system
- Highly configurable discount rules
- Both automatic and code-based discounts
- Applicable at checkout AND manually in backoffice
- Full reporting on discount performance
- Multi-currency support (follows existing patterns)

### Key Features

| Feature | Description |
|---------|-------------|
| **Discount Types** | Amount off products, Buy X get Y, Amount off order, Free shipping |
| **Methods** | Discount codes (manual entry) or Automatic (auto-applied) |
| **Targeting** | Products, Variants, Categories, ProductFilters, ProductTypes, Suppliers, Warehouses |
| **Eligibility** | All customers, Customer segments, Specific customers |
| **Requirements** | Minimum purchase amount, Minimum quantity |
| **Limits** | Total uses, Per-customer uses, Per-order uses |
| **Combinations** | Control which discount types can stack |
| **Scheduling** | Start/end dates with timezone support |

### Architecture Principles

1. **Centralized Calculations** - All discount logic MUST go through `ILineItemService.AddDiscountLineItem()` and `IDiscountService.CalculateDiscount()`
2. **Factories** - All discount entities created via `DiscountFactory`
3. **Services** - All business logic in services, no DbContext in controllers
4. **Provider Pattern** - Extensible discount types via `IDiscountProvider`

---

## 2. Discount Types

### 2.1 Amount Off Products

Discount specific products or collections by percentage or fixed amount.

```
Configuration:
├── Value Type: Percentage | Fixed Amount
├── Value: decimal (e.g., 10 for 10% or £10)
├── Applies To:
│   ├── All Products
│   ├── Specific Collections (Categories)
│   ├── Specific Products (including variants)
│   ├── Product Filters (e.g., Color: Blue, Size: Large)
│   ├── Product Types
│   ├── Suppliers
│   └── Warehouses
└── Minimum Requirements:
    ├── None
    ├── Minimum purchase amount
    └── Minimum quantity of items
```

### 2.2 Buy X Get Y (BOGO)

True BOGO: Customer buys products from set X, gets products from set Y at a discount.

```
Configuration:
├── Customer Buys:
│   ├── Trigger Type: Minimum quantity | Minimum purchase amount
│   ├── Trigger Value: decimal
│   └── Products: Specific products | Collections
├── Customer Gets:
│   ├── Quantity: int
│   ├── Products: Specific products | Collections (can differ from "Buys")
│   └── Discount Type: Percentage | Fixed amount | Free
├── Max Uses Per Order: int (optional)
└── Applies to cheapest/most expensive item
```

**Example**: Buy 3 shirts, get 1 belt 50% off.

### 2.3 Amount Off Order

Discount the entire order total.

```
Configuration:
├── Value Type: Percentage | Fixed Amount
├── Value: decimal
├── Minimum Requirements:
│   ├── None
│   ├── Minimum purchase amount
│   └── Minimum quantity of items
└── Excludes: Shipping, Taxes (configurable)
```

### 2.4 Free Shipping

Waive shipping costs entirely or reduce them.

```
Configuration:
├── Countries: All | Selected countries
├── Shipping Rates: All | Exclude rates over amount
├── Minimum Requirements:
│   ├── None
│   ├── Minimum purchase amount
│   └── Minimum quantity of items
└── Applies To: All shipping methods | Specific methods
```

---

## 3. Database Schema

### 3.1 Core Entities

#### Discount Entity

**File**: `src/Merchello.Core/Discounts/Models/Discount.cs`

```csharp
public class Discount
{
    public Guid Id { get; set; } = GuidExtensions.NewSequentialGuid;

    // Basic Info
    public string Name { get; set; } = string.Empty;
    public string? Description { get; set; }
    public DiscountStatus Status { get; set; } = DiscountStatus.Draft;

    // Type & Method
    public DiscountCategory Category { get; set; } // AmountOffProducts, BuyXGetY, AmountOffOrder, FreeShipping
    public DiscountMethod Method { get; set; } // Code, Automatic
    public string? Code { get; set; } // Null for automatic discounts

    // Value
    public DiscountValueType ValueType { get; set; } // Percentage, FixedAmount, Free
    public decimal Value { get; set; }

    // Scheduling
    public DateTime StartsAt { get; set; } = DateTime.UtcNow;
    public DateTime? EndsAt { get; set; }
    public string? Timezone { get; set; } // For display purposes

    // Limits
    public int? TotalUsageLimit { get; set; }
    public int? PerCustomerUsageLimit { get; set; }
    public int? PerOrderUsageLimit { get; set; } // For BOGO
    public int CurrentUsageCount { get; set; }

    // Minimum Requirements
    public DiscountRequirementType RequirementType { get; set; } // None, MinimumAmount, MinimumQuantity
    public decimal? RequirementValue { get; set; }

    // Combinations
    public bool CanCombineWithProductDiscounts { get; set; }
    public bool CanCombineWithOrderDiscounts { get; set; }
    public bool CanCombineWithShippingDiscounts { get; set; }

    // Priority (lower = higher priority)
    public int Priority { get; set; } = 1000;

    // Audit
    public DateTime DateCreated { get; set; } = DateTime.UtcNow;
    public DateTime DateUpdated { get; set; } = DateTime.UtcNow;
    public Guid? CreatedBy { get; set; }

    // Navigation Properties
    public virtual ICollection<DiscountTargetRule> TargetRules { get; set; } = [];
    public virtual ICollection<DiscountEligibilityRule> EligibilityRules { get; set; } = [];
    public virtual ICollection<DiscountUsage> Usages { get; set; } = [];
    public virtual DiscountBuyXGetYConfig? BuyXGetYConfig { get; set; }
    public virtual DiscountFreeShippingConfig? FreeShippingConfig { get; set; }
}
```

#### Discount Target Rules

**File**: `src/Merchello.Core/Discounts/Models/DiscountTargetRule.cs`

```csharp
public class DiscountTargetRule
{
    public Guid Id { get; set; } = GuidExtensions.NewSequentialGuid;
    public Guid DiscountId { get; set; }

    public DiscountTargetType TargetType { get; set; } // AllProducts, SpecificProducts, Categories, ProductFilters, ProductTypes, Suppliers, Warehouses

    // Store as JSON array of GUIDs for flexibility
    public string? TargetIds { get; set; } // JSON: ["guid1", "guid2"]

    public bool IsExclusion { get; set; } // True = exclude these, False = include these

    public virtual Discount Discount { get; set; } = null!;
}
```

#### Discount Eligibility Rules

**File**: `src/Merchello.Core/Discounts/Models/DiscountEligibilityRule.cs`

```csharp
public class DiscountEligibilityRule
{
    public Guid Id { get; set; } = GuidExtensions.NewSequentialGuid;
    public Guid DiscountId { get; set; }

    public DiscountEligibilityType EligibilityType { get; set; } // AllCustomers, CustomerSegments, SpecificCustomers

    // Store as JSON array
    public string? EligibilityIds { get; set; } // Segment IDs or Customer IDs

    public virtual Discount Discount { get; set; } = null!;
}
```

#### Buy X Get Y Configuration

**File**: `src/Merchello.Core/Discounts/Models/DiscountBuyXGetYConfig.cs`

```csharp
public class DiscountBuyXGetYConfig
{
    public Guid Id { get; set; } = GuidExtensions.NewSequentialGuid;
    public Guid DiscountId { get; set; }

    // Customer Buys
    public BuyXTriggerType BuyTriggerType { get; set; } // MinimumQuantity, MinimumAmount
    public decimal BuyTriggerValue { get; set; }
    public DiscountTargetType BuyTargetType { get; set; }
    public string? BuyTargetIds { get; set; } // JSON array

    // Customer Gets
    public int GetQuantity { get; set; }
    public DiscountTargetType GetTargetType { get; set; }
    public string? GetTargetIds { get; set; } // JSON array (can differ from Buy)
    public DiscountValueType GetValueType { get; set; } // Percentage, FixedAmount, Free
    public decimal GetValue { get; set; }

    // Options
    public BuyXGetYSelectionMethod SelectionMethod { get; set; } // Cheapest, MostExpensive

    public virtual Discount Discount { get; set; } = null!;
}
```

#### Free Shipping Configuration

**File**: `src/Merchello.Core/Discounts/Models/DiscountFreeShippingConfig.cs`

```csharp
public class DiscountFreeShippingConfig
{
    public Guid Id { get; set; } = GuidExtensions.NewSequentialGuid;
    public Guid DiscountId { get; set; }

    public FreeShippingCountryScope CountryScope { get; set; } // AllCountries, SelectedCountries
    public string? CountryCodes { get; set; } // JSON array: ["US", "CA", "GB"]

    public bool ExcludeRatesOverAmount { get; set; }
    public decimal? ExcludeRatesOverValue { get; set; }

    public string? AllowedShippingOptionIds { get; set; } // JSON array, null = all

    public virtual Discount Discount { get; set; } = null!;
}
```

#### Discount Usage Tracking

**File**: `src/Merchello.Core/Discounts/Models/DiscountUsage.cs`

```csharp
public class DiscountUsage
{
    public Guid Id { get; set; } = GuidExtensions.NewSequentialGuid;
    public Guid DiscountId { get; set; }
    public Guid InvoiceId { get; set; }
    public Guid? CustomerId { get; set; }

    public decimal DiscountAmount { get; set; }
    public decimal DiscountAmountInStoreCurrency { get; set; }
    public string CurrencyCode { get; set; } = string.Empty;

    public DateTime DateUsed { get; set; } = DateTime.UtcNow;

    public virtual Discount Discount { get; set; } = null!;
}
```

### 3.2 Enums

**File**: `src/Merchello.Core/Discounts/Models/DiscountEnums.cs`

```csharp
public enum DiscountStatus
{
    Draft,
    Active,
    Scheduled,
    Expired,
    Disabled
}

public enum DiscountCategory
{
    AmountOffProducts,
    BuyXGetY,
    AmountOffOrder,
    FreeShipping
}

public enum DiscountMethod
{
    Code,       // Customer enters code
    Automatic   // Applied automatically
}

// NOTE: DiscountValueType already exists at src/Merchello.Core/Accounting/Models/DiscountValueType.cs
// DO NOT duplicate - use the existing enum which has values: FixedAmount, Percentage, Free

public enum DiscountRequirementType
{
    None,
    MinimumPurchaseAmount,
    MinimumQuantity
}

public enum DiscountTargetType
{
    AllProducts,
    SpecificProducts,    // Includes variants
    Categories,
    ProductFilters,      // Filter values (e.g., "Blue", "Large") from ProductFilterGroups
    ProductTypes,
    Suppliers,
    Warehouses
}

public enum DiscountEligibilityType
{
    AllCustomers,
    CustomerSegments,
    SpecificCustomers
}

public enum BuyXTriggerType
{
    MinimumQuantity,
    MinimumPurchaseAmount
}

public enum BuyXGetYSelectionMethod
{
    Cheapest,
    MostExpensive
}

public enum FreeShippingCountryScope
{
    AllCountries,
    SelectedCountries
}
```

### 3.3 Entity Configurations

**File**: `src/Merchello.Core/Discounts/Mapping/DiscountDbMapping.cs`

```csharp
public class DiscountDbMapping : IEntityTypeConfiguration<Discount>
{
    public void Configure(EntityTypeBuilder<Discount> builder)
    {
        builder.ToTable("merchelloDiscounts");
        builder.HasKey(x => x.Id);

        builder.Property(x => x.Name).HasMaxLength(300).IsRequired();
        builder.Property(x => x.Code).HasMaxLength(50);
        builder.Property(x => x.Value).HasPrecision(18, 4);
        builder.Property(x => x.RequirementValue).HasPrecision(18, 4);

        builder.HasIndex(x => x.Code).IsUnique().HasFilter("[Code] IS NOT NULL");
        builder.HasIndex(x => x.Status);
        builder.HasIndex(x => new { x.StartsAt, x.EndsAt });

        builder.HasMany(x => x.TargetRules)
            .WithOne(x => x.Discount)
            .HasForeignKey(x => x.DiscountId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.HasMany(x => x.EligibilityRules)
            .WithOne(x => x.Discount)
            .HasForeignKey(x => x.DiscountId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.HasMany(x => x.Usages)
            .WithOne(x => x.Discount)
            .HasForeignKey(x => x.DiscountId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.HasOne(x => x.BuyXGetYConfig)
            .WithOne(x => x.Discount)
            .HasForeignKey<DiscountBuyXGetYConfig>(x => x.DiscountId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.HasOne(x => x.FreeShippingConfig)
            .WithOne(x => x.Discount)
            .HasForeignKey<DiscountFreeShippingConfig>(x => x.DiscountId)
            .OnDelete(DeleteBehavior.Cascade);
    }
}
```

### 3.4 Database Tables Summary

| Table | Purpose |
|-------|---------|
| `merchelloDiscounts` | Core discount definitions |
| `merchelloDiscountTargetRules` | What products/categories the discount applies to |
| `merchelloDiscountEligibilityRules` | Who can use the discount (references segments) |
| `merchelloDiscountBuyXGetYConfigs` | BOGO-specific configuration |
| `merchelloDiscountFreeShippingConfigs` | Free shipping-specific configuration |
| `merchelloDiscountUsages` | Usage tracking for limits and reporting |

> **Note**: Customer segment tables (`merchelloCustomerSegments`, `merchelloCustomerSegmentMembers`) are defined in [Customer-Segments.md](Customer-Segments.md).

### 3.5 Migration

Use the existing migration script:

```powershell
.\scripts\add-migration.ps1
# Enter migration name: AddDiscountTables
```

---

## 4. Backend Architecture

### 4.1 Folder Structure

```
src/Merchello.Core/
├── Discounts/
│   ├── Models/
│   │   ├── Discount.cs
│   │   ├── DiscountTargetRule.cs
│   │   ├── DiscountEligibilityRule.cs
│   │   ├── DiscountBuyXGetYConfig.cs
│   │   ├── DiscountFreeShippingConfig.cs
│   │   ├── DiscountUsage.cs
│   │   └── DiscountEnums.cs
│   ├── Factories/
│   │   └── DiscountFactory.cs
│   ├── Services/
│   │   ├── Interfaces/
│   │   │   ├── IDiscountService.cs
│   │   │   └── IDiscountEngine.cs
│   │   ├── Parameters/
│   │   │   ├── DiscountQueryParameters.cs
│   │   │   ├── CreateDiscountParameters.cs
│   │   │   └── ApplyDiscountParameters.cs
│   │   ├── DiscountService.cs
│   │   └── DiscountEngine.cs
│   ├── Mapping/
│   │   ├── DiscountDbMapping.cs
│   │   └── DiscountTargetRuleDbMapping.cs (etc.)
│   ├── Dtos/
│   │   ├── DiscountListItemDto.cs
│   │   ├── DiscountDetailDto.cs
│   │   ├── CreateDiscountDto.cs
│   │   ├── UpdateDiscountDto.cs
│   │   └── ApplyDiscountResultDto.cs
│   └── Notifications/
│       ├── DiscountCreatingNotification.cs   # extends MerchelloCancelableNotification<Discount>
│       ├── DiscountCreatedNotification.cs    # extends MerchelloNotification
│       ├── DiscountApplyingNotification.cs   # extends MerchelloCancelableNotification<Discount> (for code validation)
│       └── DiscountAppliedNotification.cs    # extends MerchelloNotification
```

> **Implementation Note**: "Creating" and "Applying" notifications extend `MerchelloCancelableNotification<Discount>` allowing handlers to cancel operations via `notification.CancelOperation("reason")`. "Created" and "Applied" notifications extend `MerchelloNotification` for post-operation reactions (logging, external sync, etc.).

> **Note**: Customer segment models and services are defined in [Customer-Segments.md](Customer-Segments.md).

### 4.2 Discount Service Interface

**File**: `src/Merchello.Core/Discounts/Services/Interfaces/IDiscountService.cs`

```csharp
public interface IDiscountService
{
    // CRUD Operations
    Task<PaginatedList<Discount>> QueryAsync(DiscountQueryParameters parameters, CancellationToken ct = default);
    Task<Discount?> GetByIdAsync(Guid discountId, CancellationToken ct = default);
    Task<Discount?> GetByCodeAsync(string code, CancellationToken ct = default);
    Task<CrudResult<Discount>> CreateAsync(CreateDiscountParameters parameters, CancellationToken ct = default);
    Task<CrudResult<Discount>> UpdateAsync(Guid discountId, UpdateDiscountParameters parameters, CancellationToken ct = default);
    Task<CrudResult> DeleteAsync(Guid discountId, CancellationToken ct = default);

    // Status Management
    Task<CrudResult<Discount>> ActivateAsync(Guid discountId, CancellationToken ct = default);
    Task<CrudResult<Discount>> DeactivateAsync(Guid discountId, CancellationToken ct = default);
    Task UpdateExpiredDiscountsAsync(CancellationToken ct = default); // Background job

    // Code Generation
    string GenerateUniqueCode(int length = 8);
    Task<bool> IsCodeAvailableAsync(string code, Guid? excludeDiscountId = null, CancellationToken ct = default);

    // Usage Tracking
    Task<DiscountUsage> RecordUsageAsync(Guid discountId, Guid invoiceId, Guid? customerId, decimal amount, string currencyCode, CancellationToken ct = default);
    Task<int> GetUsageCountAsync(Guid discountId, CancellationToken ct = default);
    Task<int> GetCustomerUsageCountAsync(Guid discountId, Guid customerId, CancellationToken ct = default);

    // Reporting
    Task<DiscountPerformanceDto> GetPerformanceAsync(Guid discountId, CancellationToken ct = default);
    Task<List<DiscountUsageSummaryDto>> GetUsageSummaryAsync(DiscountReportParameters parameters, CancellationToken ct = default);
}
```

### 4.3 Discount Engine Interface

The engine is responsible for calculating and applying discounts. This is the **centralized method** for discount calculations.

**File**: `src/Merchello.Core/Discounts/Services/Interfaces/IDiscountEngine.cs`

```csharp
public interface IDiscountEngine
{
    /// <summary>
    /// Get all applicable automatic discounts for a basket/order.
    /// </summary>
    Task<List<ApplicableDiscount>> GetApplicableAutomaticDiscountsAsync(
        DiscountContext context,
        CancellationToken ct = default);

    /// <summary>
    /// Validate and get discount by code.
    /// </summary>
    Task<DiscountValidationResult> ValidateCodeAsync(
        string code,
        DiscountContext context,
        CancellationToken ct = default);

    /// <summary>
    /// Calculate the discount amount for a given discount and context.
    /// This is the CENTRALIZED calculation method.
    /// </summary>
    Task<DiscountCalculationResult> CalculateAsync(
        Discount discount,
        DiscountContext context,
        CancellationToken ct = default);

    /// <summary>
    /// Apply discounts to line items. Creates discount LineItems via ILineItemService.
    /// </summary>
    Task<ApplyDiscountsResult> ApplyDiscountsAsync(
        List<Discount> discounts,
        List<LineItem> lineItems,
        DiscountContext context,
        CancellationToken ct = default);

    /// <summary>
    /// Check if discounts can be combined according to their combination rules.
    /// </summary>
    bool CanCombine(Discount discount1, Discount discount2);
}

// Supporting types
public class DiscountContext
{
    public Guid? CustomerId { get; set; }
    public List<DiscountContextLineItem> LineItems { get; set; } = [];
    public decimal SubTotal { get; set; }
    public decimal ShippingTotal { get; set; }
    public string CurrencyCode { get; set; } = string.Empty;
    public Address? ShippingAddress { get; set; }
    public Guid? SelectedShippingOptionId { get; set; }
    public List<Guid>? CustomerSegmentIds { get; set; }
}

public class DiscountContextLineItem
{
    public Guid? ProductId { get; set; }
    public Guid? ProductRootId { get; set; }
    public List<Guid>? CategoryIds { get; set; } // Products can belong to multiple categories
    public Guid? ProductTypeId { get; set; }
    public Guid? SupplierId { get; set; }
    public Guid? WarehouseId { get; set; }
    public string Sku { get; set; } = string.Empty;
    public int Quantity { get; set; }
    public decimal UnitPrice { get; set; }
    public decimal LineTotal { get; set; }
}

public class DiscountCalculationResult
{
    public bool IsApplicable { get; set; }
    public decimal DiscountAmount { get; set; }
    public string? Message { get; set; }
    public List<DiscountedLineItem> DiscountedItems { get; set; } = [];
}

public class DiscountValidationResult
{
    public bool IsValid { get; set; }
    public Discount? Discount { get; set; }
    public string? ErrorCode { get; set; }
    public string? ErrorMessage { get; set; }
}
```

### 4.4 Discount Factory

**File**: `src/Merchello.Core/Discounts/Factories/DiscountFactory.cs`

```csharp
public class DiscountFactory
{
    public Discount Create(CreateDiscountParameters parameters)
    {
        var discount = new Discount
        {
            Name = parameters.Name,
            Description = parameters.Description,
            Category = parameters.Category,
            Method = parameters.Method,
            Code = parameters.Method == DiscountMethod.Code ? parameters.Code : null,
            ValueType = parameters.ValueType,
            Value = parameters.Value,
            StartsAt = parameters.StartsAt ?? DateTime.UtcNow,
            EndsAt = parameters.EndsAt,
            Timezone = parameters.Timezone,
            TotalUsageLimit = parameters.TotalUsageLimit,
            PerCustomerUsageLimit = parameters.PerCustomerUsageLimit,
            PerOrderUsageLimit = parameters.PerOrderUsageLimit,
            RequirementType = parameters.RequirementType,
            RequirementValue = parameters.RequirementValue,
            CanCombineWithProductDiscounts = parameters.CanCombineWithProductDiscounts,
            CanCombineWithOrderDiscounts = parameters.CanCombineWithOrderDiscounts,
            CanCombineWithShippingDiscounts = parameters.CanCombineWithShippingDiscounts,
            Priority = parameters.Priority,
            Status = parameters.StartsAt > DateTime.UtcNow ? DiscountStatus.Scheduled : DiscountStatus.Active
        };

        return discount;
    }

    public DiscountTargetRule CreateTargetRule(Guid discountId, DiscountTargetType targetType, List<Guid>? targetIds, bool isExclusion = false)
    {
        return new DiscountTargetRule
        {
            DiscountId = discountId,
            TargetType = targetType,
            TargetIds = targetIds != null ? JsonSerializer.Serialize(targetIds) : null,
            IsExclusion = isExclusion
        };
    }

    public DiscountBuyXGetYConfig CreateBuyXGetYConfig(CreateBuyXGetYParameters parameters)
    {
        return new DiscountBuyXGetYConfig
        {
            DiscountId = parameters.DiscountId,
            BuyTriggerType = parameters.BuyTriggerType,
            BuyTriggerValue = parameters.BuyTriggerValue,
            BuyTargetType = parameters.BuyTargetType,
            BuyTargetIds = parameters.BuyTargetIds != null ? JsonSerializer.Serialize(parameters.BuyTargetIds) : null,
            GetQuantity = parameters.GetQuantity,
            GetTargetType = parameters.GetTargetType,
            GetTargetIds = parameters.GetTargetIds != null ? JsonSerializer.Serialize(parameters.GetTargetIds) : null,
            GetValueType = parameters.GetValueType,
            GetValue = parameters.GetValue,
            SelectionMethod = parameters.SelectionMethod
        };
    }
}
```

### 4.5 Integration with Existing Services

#### Use Existing ILineItemService

The discount engine will use the **existing centralized method** - no new method needed:

```csharp
// Existing method in ILineItemService - use this directly
List<string> AddDiscountLineItem(
    List<LineItem> lineItems,
    decimal amount,
    DiscountValueType discountValueType,
    string currencyCode,
    string? linkedSku = null,
    string? name = null,
    string? reason = null);
```

> **Implementation Note**: After calling `AddDiscountLineItem()`, set the promotional discount metadata on the created LineItem's ExtendedData using `Constants.ExtendedDataKeys.DiscountId`, etc. (see ExtendedData Pattern section below). This approach reuses the existing centralized method rather than adding a new one.

#### Update ICheckoutService

> **Note**: `ICheckoutService` already has methods for **manual discounts** (used in backoffice order editing):
> - `AddDiscountToBasketAsync()` - adds a manual discount line item
> - `RemoveDiscountFromBasketAsync()` - removes a discount line item
>
> The following **new methods** are for **promotional discounts** (code-based and automatic):

```csharp
// Add to ICheckoutService (promotional discounts)
Task<CrudResult<Basket>> ApplyDiscountCodeAsync(Guid basketId, string code, CancellationToken ct = default);
Task<List<ApplicableDiscount>> GetApplicableAutomaticDiscountsAsync(Guid basketId, CancellationToken ct = default);
Task<Basket> RefreshAutomaticDiscountsAsync(Basket basket, CancellationToken ct = default);
```

#### Update IInvoiceService (Backoffice Application)

```csharp
// Add to IInvoiceService
Task<CrudResult<Invoice>> ApplyDiscountAsync(Guid invoiceId, Guid discountId, CancellationToken ct = default);
Task<CrudResult<Invoice>> ApplyManualDiscountAsync(Guid invoiceId, ApplyManualDiscountParameters parameters, CancellationToken ct = default);
```

#### Manual vs Promotional Discounts

The system supports two types of discounts that serve different purposes:

| Aspect | Manual Discounts (Existing) | Promotional Discounts (This Spec) |
|--------|----------------------------|----------------------------------|
| **Purpose** | Staff applies ad-hoc adjustments during order editing (price match, goodwill, error correction) | Marketing-driven promotions with rules, codes, eligibility, and tracking |
| **Database Entity** | None - inline LineItem creation | Full `Discount` entity with relationships |
| **Application** | Backoffice order editing only | Checkout (automatic/code) + Backoffice |
| **Tracking** | No usage tracking | Usage limits, customer history, performance reporting |
| **Validation** | None - staff discretion | Rules engine, date ranges, eligibility |
| **ExtendedData** | `DiscountValueType`, `DiscountValue`, `VisibleToCustomer` | Extended keys (see below) |

Both systems will continue to work. Manual discounts remain for staff flexibility; promotional discounts add marketing automation.

#### Discount LineItem ExtendedData Pattern

> **Implementation Note**: All ExtendedData keys should be defined in `src/Merchello.Core/Constants.cs` under `Constants.ExtendedDataKeys`. Add the following new keys for promotional discounts:
> ```csharp
> public const string DiscountId = "DiscountId";
> public const string DiscountCode = "DiscountCode";
> public const string DiscountName = "DiscountName";
> public const string DiscountCategory = "DiscountCategory";
> ```
> The existing keys (`DiscountValueType`, `DiscountValue`, `VisibleToCustomer`, `Reason`) are already defined.

**For promotional discounts** (linked to Discount entity), store full metadata:

```csharp
ExtendedData[Constants.ExtendedDataKeys.DiscountId] = discount.Id.ToString();
ExtendedData[Constants.ExtendedDataKeys.DiscountCode] = discount.Code ?? "";  // Empty for automatic discounts
ExtendedData[Constants.ExtendedDataKeys.DiscountName] = discount.Name;
ExtendedData[Constants.ExtendedDataKeys.DiscountCategory] = discount.Category.ToString();  // AmountOffProducts, BuyXGetY, etc.
ExtendedData[Constants.ExtendedDataKeys.DiscountValueType] = discount.ValueType.ToString();  // Percentage, FixedAmount, Free
ExtendedData[Constants.ExtendedDataKeys.DiscountValue] = discount.Value.ToString();
```

**For manual discounts** (existing pattern), the simpler format continues to work:

```csharp
ExtendedData[Constants.ExtendedDataKeys.DiscountValueType] = valueType.ToString();  // Percentage, FixedAmount
ExtendedData[Constants.ExtendedDataKeys.DiscountValue] = value.ToString();
ExtendedData[Constants.ExtendedDataKeys.VisibleToCustomer] = isVisible.ToString();
```

The presence of `DiscountId` distinguishes promotional discounts from manual ones, enabling:
- Tracking which Discount entity created each line item
- Reporting on promotional discount performance
- Preventing duplicate promotional discount applications
- Displaying discount details in UI

### 4.6 Background Jobs

Create a background job to update discount statuses:

**File**: `src/Merchello.Core/Discounts/Jobs/DiscountStatusJob.cs`

```csharp
public class DiscountStatusJob(
    IDiscountService discountService,
    ILogger<DiscountStatusJob> logger) : IHostedService, IDisposable
{
    private Timer? _timer;

    public Task StartAsync(CancellationToken cancellationToken)
    {
        // Run every minute
        _timer = new Timer(DoWork, null, TimeSpan.Zero, TimeSpan.FromMinutes(1));
        return Task.CompletedTask;
    }

    private async void DoWork(object? state)
    {
        try
        {
            await discountService.UpdateExpiredDiscountsAsync();
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Error updating discount statuses");
        }
    }

    // ... Dispose implementation
}
```

---

## 5. API Design

### 5.1 Controller Structure

**File**: `src/Merchello/Controllers/DiscountsApiController.cs`

```csharp
[ApiVersion("1.0")]
[ApiExplorerSettings(GroupName = "Merchello")]
public class DiscountsApiController(
    IDiscountService discountService,
    IDiscountEngine discountEngine) : MerchelloApiControllerBase
{
    // List discounts with filtering
    [HttpGet]
    public async Task<ActionResult<PaginatedResponse<DiscountListItemDto>>> GetDiscounts(
        [FromQuery] DiscountQueryParameters parameters,
        CancellationToken ct)

    // Get single discount
    [HttpGet("{id:guid}")]
    public async Task<ActionResult<DiscountDetailDto>> GetDiscount(Guid id, CancellationToken ct)

    // Create discount
    [HttpPost]
    public async Task<ActionResult<DiscountDetailDto>> CreateDiscount(
        [FromBody] CreateDiscountDto request,
        CancellationToken ct)

    // Update discount
    [HttpPut("{id:guid}")]
    public async Task<ActionResult<DiscountDetailDto>> UpdateDiscount(
        Guid id,
        [FromBody] UpdateDiscountDto request,
        CancellationToken ct)

    // Delete discount
    [HttpDelete("{id:guid}")]
    public async Task<ActionResult> DeleteDiscount(Guid id, CancellationToken ct)

    // Activate/Deactivate
    [HttpPost("{id:guid}/activate")]
    public async Task<ActionResult<DiscountDetailDto>> ActivateDiscount(Guid id, CancellationToken ct)

    [HttpPost("{id:guid}/deactivate")]
    public async Task<ActionResult<DiscountDetailDto>> DeactivateDiscount(Guid id, CancellationToken ct)

    // Code management
    [HttpGet("generate-code")]
    public ActionResult<GeneratedCodeDto> GenerateCode([FromQuery] int length = 8)

    [HttpGet("validate-code")]
    public async Task<ActionResult<CodeValidationDto>> ValidateCode(
        [FromQuery] string code,
        [FromQuery] Guid? excludeId,
        CancellationToken ct)

    // Reporting
    [HttpGet("{id:guid}/performance")]
    public async Task<ActionResult<DiscountPerformanceDto>> GetPerformance(Guid id, CancellationToken ct)

    [HttpGet("usage-report")]
    public async Task<ActionResult<List<DiscountUsageSummaryDto>>> GetUsageReport(
        [FromQuery] DiscountReportParameters parameters,
        CancellationToken ct)
}
```

### 5.2 Checkout API Extensions

**File**: `src/Merchello/Api/CheckoutController.cs` (extend existing)

```csharp
// Add discount code to basket
[HttpPost("basket/{basketId:guid}/discounts")]
public async Task<ActionResult<BasketDto>> ApplyDiscountCode(
    Guid basketId,
    [FromBody] ApplyDiscountCodeRequest request,
    CancellationToken ct)

// Remove discount from basket
[HttpDelete("basket/{basketId:guid}/discounts/{discountLineItemId:guid}")]
public async Task<ActionResult<BasketDto>> RemoveDiscount(
    Guid basketId,
    Guid discountLineItemId,
    CancellationToken ct)

// Get applicable automatic discounts (for display)
[HttpGet("basket/{basketId:guid}/available-discounts")]
public async Task<ActionResult<List<AvailableDiscountDto>>> GetAvailableDiscounts(
    Guid basketId,
    CancellationToken ct)
```

### 5.3 Invoice API Extensions

**File**: `src/Merchello/Api/InvoiceController.cs` (extend existing)

```csharp
// Apply discount to existing invoice (backoffice)
[HttpPost("{invoiceId:guid}/discounts")]
public async Task<ActionResult<InvoiceDetailDto>> ApplyDiscount(
    Guid invoiceId,
    [FromBody] ApplyInvoiceDiscountRequest request,
    CancellationToken ct)

// Apply manual discount (backoffice)
[HttpPost("{invoiceId:guid}/manual-discount")]
public async Task<ActionResult<InvoiceDetailDto>> ApplyManualDiscount(
    Guid invoiceId,
    [FromBody] ApplyManualDiscountRequest request,
    CancellationToken ct)
```

> **Note**: Customer Segment API is defined in [Customer-Segments.md](Customer-Segments.md).

---

## 6. Frontend Implementation

### 6.1 File Structure

```
src/Merchello/Client/src/discounts/
├── manifest.ts                           # Feature manifests
├── types/
│   └── discount.types.ts                 # TypeScript interfaces
├── components/
│   ├── discounts-list.element.ts         # Main list view
│   ├── discount-detail.element.ts        # Edit/create view
│   ├── discount-table.element.ts         # Table component
│   ├── discount-target-picker.element.ts # Product/category picker
│   └── discount-summary-card.element.ts  # Right sidebar summary
├── contexts/
│   └── discount-detail-workspace.context.ts
├── modals/
│   ├── select-discount-type-modal.element.ts
│   ├── select-discount-type-modal.token.ts
│   ├── product-picker-modal.element.ts   # Reuse from products if exists
│   └── product-picker-modal.token.ts
└── utils/
    └── discount-validation.ts
```

### 6.2 Manifests

**File**: `src/Merchello/Client/src/discounts/manifest.ts`

```typescript
import type { UmbExtensionManifest } from "@umbraco-cms/backoffice/extension-api";

export const manifests: Array<UmbExtensionManifest> = [
  // Workspace for discounts list
  {
    type: "workspace",
    kind: "default",
    alias: "Merchello.Discounts.Workspace",
    name: "Merchello Discounts Workspace",
    meta: {
      entityType: "merchello-discounts",
      headline: "Discounts",
    },
  },

  // Workspace view for discounts list
  {
    type: "workspaceView",
    alias: "Merchello.Discounts.Workspace.View",
    name: "Merchello Discounts View",
    js: () => import("./components/discounts-list.element.js"),
    weight: 100,
    meta: {
      label: "Discounts",
      pathname: "discounts",
      icon: "icon-tag",
    },
    conditions: [
      {
        alias: "Umb.Condition.WorkspaceAlias",
        match: "Merchello.Discounts.Workspace",
      },
    ],
  },

  // Routable workspace for discount detail
  {
    type: "workspace",
    kind: "routable",
    alias: "Merchello.Discount.Detail.Workspace",
    name: "Discount Detail Workspace",
    api: () => import("./contexts/discount-detail-workspace.context.js"),
    meta: {
      entityType: "merchello-discount",
    },
  },

  // Modal: Select Discount Type
  {
    type: "modal",
    alias: "Merchello.SelectDiscountType.Modal",
    name: "Select Discount Type Modal",
    js: () => import("./modals/select-discount-type-modal.element.js"),
  },

  // Modal: Product Picker
  {
    type: "modal",
    alias: "Merchello.DiscountProductPicker.Modal",
    name: "Discount Product Picker Modal",
    js: () => import("./modals/product-picker-modal.element.js"),
  },
];
```

### 6.3 Type Definitions

**File**: `src/Merchello/Client/src/discounts/types/discount.types.ts`

```typescript
export type DiscountStatus = "Draft" | "Active" | "Scheduled" | "Expired" | "Disabled";
export type DiscountCategory = "AmountOffProducts" | "BuyXGetY" | "AmountOffOrder" | "FreeShipping";
export type DiscountMethod = "Code" | "Automatic";
export type DiscountValueType = "Percentage" | "FixedAmount" | "Free";
export type DiscountRequirementType = "None" | "MinimumPurchaseAmount" | "MinimumQuantity";
export type DiscountTargetType = "AllProducts" | "SpecificProducts" | "Categories" | "ProductFilters" | "ProductTypes" | "Suppliers" | "Warehouses";
export type DiscountEligibilityType = "AllCustomers" | "CustomerSegments" | "SpecificCustomers";

export interface DiscountListItemDto {
  id: string;
  name: string;
  code: string | null;
  status: DiscountStatus;
  category: DiscountCategory;
  method: DiscountMethod;
  valueType: DiscountValueType;
  value: number;
  startsAt: string;
  endsAt: string | null;
  currentUsageCount: number;
  totalUsageLimit: number | null;
  canCombineWithProductDiscounts: boolean;
  canCombineWithOrderDiscounts: boolean;
  canCombineWithShippingDiscounts: boolean;
}

export interface DiscountDetailDto extends DiscountListItemDto {
  description: string | null;
  timezone: string | null;
  perCustomerUsageLimit: number | null;
  perOrderUsageLimit: number | null;
  requirementType: DiscountRequirementType;
  requirementValue: number | null;
  priority: number;
  targetRules: DiscountTargetRuleDto[];
  eligibilityRules: DiscountEligibilityRuleDto[];
  buyXGetYConfig: DiscountBuyXGetYConfigDto | null;
  freeShippingConfig: DiscountFreeShippingConfigDto | null;
  dateCreated: string;
  dateUpdated: string;
}

export interface DiscountTargetRuleDto {
  id: string;
  targetType: DiscountTargetType;
  targetIds: string[] | null;
  targetNames?: string[]; // Resolved names for display
  isExclusion: boolean;
}

export interface DiscountEligibilityRuleDto {
  id: string;
  eligibilityType: DiscountEligibilityType;
  eligibilityIds: string[] | null;
  eligibilityNames?: string[]; // Resolved names for display
}

export interface DiscountBuyXGetYConfigDto {
  buyTriggerType: "MinimumQuantity" | "MinimumPurchaseAmount";
  buyTriggerValue: number;
  buyTargetType: DiscountTargetType;
  buyTargetIds: string[] | null;
  buyTargetNames?: string[];
  getQuantity: number;
  getTargetType: DiscountTargetType;
  getTargetIds: string[] | null;
  getTargetNames?: string[];
  getValueType: DiscountValueType;
  getValue: number;
  selectionMethod: "Cheapest" | "MostExpensive";
}

export interface DiscountFreeShippingConfigDto {
  countryScope: "AllCountries" | "SelectedCountries";
  countryCodes: string[] | null;
  excludeRatesOverAmount: boolean;
  excludeRatesOverValue: number | null;
  allowedShippingOptionIds: string[] | null;
}

export interface CreateDiscountDto {
  name: string;
  description?: string;
  category: DiscountCategory;
  method: DiscountMethod;
  code?: string;
  valueType: DiscountValueType;
  value: number;
  startsAt?: string;
  endsAt?: string;
  timezone?: string;
  totalUsageLimit?: number;
  perCustomerUsageLimit?: number;
  perOrderUsageLimit?: number;
  requirementType: DiscountRequirementType;
  requirementValue?: number;
  canCombineWithProductDiscounts: boolean;
  canCombineWithOrderDiscounts: boolean;
  canCombineWithShippingDiscounts: boolean;
  priority?: number;
  targetRules: CreateDiscountTargetRuleDto[];
  eligibilityRules: CreateDiscountEligibilityRuleDto[];
  buyXGetYConfig?: CreateBuyXGetYConfigDto;
  freeShippingConfig?: CreateFreeShippingConfigDto;
}

// Column configuration for table
export type DiscountColumnKey = "select" | "title" | "status" | "method" | "type" | "combinations" | "used";

export const DISCOUNT_COLUMN_LABELS: Record<DiscountColumnKey, string> = {
  select: "",
  title: "Title",
  status: "Status",
  method: "Method",
  type: "Type",
  combinations: "Combinations",
  used: "Used",
};

// Events
export interface DiscountClickEventDetail {
  discountId: string;
  discount: DiscountListItemDto;
}
```

### 6.4 API Integration

**File**: `src/Merchello/Client/src/api/merchello-api.ts` (add to existing)

```typescript
// Add to MerchelloApi object

// Discounts
getDiscounts: (params?: DiscountListParams) =>
  apiGet<PaginatedResponse<DiscountListItemDto>>(
    buildQueryString("discounts", params)
  ),

getDiscount: (id: string) =>
  apiGet<DiscountDetailDto>(`discounts/${id}`),

createDiscount: (data: CreateDiscountDto) =>
  apiPost<DiscountDetailDto>("discounts", data),

updateDiscount: (id: string, data: UpdateDiscountDto) =>
  apiPut<DiscountDetailDto>(`discounts/${id}`, data),

deleteDiscount: (id: string) =>
  apiDelete(`discounts/${id}`),

activateDiscount: (id: string) =>
  apiPost<DiscountDetailDto>(`discounts/${id}/activate`),

deactivateDiscount: (id: string) =>
  apiPost<DiscountDetailDto>(`discounts/${id}/deactivate`),

generateDiscountCode: (length?: number) =>
  apiGet<{ code: string }>(`discounts/generate-code${length ? `?length=${length}` : ""}`),

validateDiscountCode: (code: string, excludeId?: string) =>
  apiGet<{ isAvailable: boolean }>(`discounts/validate-code?code=${encodeURIComponent(code)}${excludeId ? `&excludeId=${excludeId}` : ""}`),

getDiscountPerformance: (id: string) =>
  apiGet<DiscountPerformanceDto>(`discounts/${id}/performance`),

// Customer Segments - see Customer-Segments.md for full API
getCustomerSegments: () =>
  apiGet<CustomerSegmentDto[]>("customer-segments"),
```

### 6.5 Discounts List Component

**File**: `src/Merchello/Client/src/discounts/components/discounts-list.element.ts`

The list should include:

1. **Header Actions**:
   - "Create discount" button (opens type selection modal)

2. **Tabs/Filters**:
   - All | Active | Scheduled | Expired
   - Search by name/code

3. **Table Columns**:
   - Title (name + description preview)
   - Status (badge: Active/Scheduled/Expired/Disabled)
   - Method (Code/Automatic)
   - Type (icon + label: Amount off products, etc.)
   - Combinations (icons showing what it can combine with)
   - Used (usage count)

4. **Row Actions**:
   - Click to edit
   - Context menu: Duplicate, Activate/Deactivate, Delete

### 6.6 Discount Detail Component

Following the Workspace Editor Layout Pattern from [Umbraco-Backoffice-Dev.md](Umbraco-Backoffice-Dev.md#workspace-editor-layout-pattern):

**Tabs**:

1. **Details Tab** (varies by discount category):
   - Amount Off Products: Value type, value, applies to (product picker)
   - Buy X Get Y: Customer buys section, Customer gets section
   - Amount Off Order: Value type, value
   - Free Shipping: Countries, shipping rates

2. **Requirements Tab**:
   - Minimum purchase requirements (none/amount/quantity)
   - Maximum discount uses (total/per customer/per order)

3. **Eligibility Tab**:
   - Customer eligibility (all/segments/specific)
   - Segment picker
   - Customer picker

4. **Combinations Tab**:
   - Can combine with product discounts
   - Can combine with order discounts
   - Can combine with shipping discounts

5. **Schedule Tab**:
   - Start date/time
   - End date/time (optional)
   - Timezone

**Right Sidebar Summary** (like Shopify):
- Code or "Automatic"
- Type (with icon)
- Details summary list

### 6.7 Select Discount Type Modal

**File**: `src/Merchello/Client/src/discounts/modals/select-discount-type-modal.element.ts`

Options to display:
1. **Amount off products** - icon-tag - "Discount specific products or collections"
2. **Buy X get Y** - icon-gift - "Discount products when customers buy specific items"
3. **Amount off order** - icon-receipt - "Discount the total order amount"
4. **Free shipping** - icon-truck - "Offer free shipping on an order"

### 6.8 Navigation Utilities

**File**: `src/Merchello/Client/src/shared/utils/navigation.ts` (add)

```typescript
export const DISCOUNT_ENTITY_TYPE = "merchello-discount";
export const DISCOUNTS_ENTITY_TYPE = "merchello-discounts";

export function getDiscountDetailHref(discountId: string): string {
  return getMerchelloWorkspaceHref(DISCOUNT_ENTITY_TYPE, `edit/${discountId}`);
}

export function getDiscountCreateHref(category: DiscountCategory): string {
  return getMerchelloWorkspaceHref(DISCOUNT_ENTITY_TYPE, `create/${category.toLowerCase()}`);
}

export function navigateToDiscountDetail(discountId: string): void {
  navigateToMerchelloWorkspace(DISCOUNT_ENTITY_TYPE, `edit/${discountId}`);
}

export function navigateToDiscountCreate(category: DiscountCategory): void {
  navigateToMerchelloWorkspace(DISCOUNT_ENTITY_TYPE, `create/${category.toLowerCase()}`);
}

export function navigateToDiscountsList(): void {
  navigateToMerchelloWorkspace(DISCOUNTS_ENTITY_TYPE, "");
}
```

---

## 7. Discount Engine

### 7.1 Calculation Logic

The discount engine follows a specific order of operations:

```
1. Collect all applicable discounts (automatic + code-based)
2. Validate each discount (eligibility, requirements, limits)
3. Check combination rules
4. Sort by priority (lower = higher priority)
5. Calculate discount amounts
6. Apply discounts via ILineItemService.AddDiscountLineItem()
```

### 7.2 Priority and Stacking

**Default Priority Values**:
| Category | Default Priority |
|----------|-----------------|
| Free Shipping | 100 |
| Buy X Get Y | 500 |
| Amount Off Products | 1000 |
| Amount Off Order | 2000 |

Lower priority = applied first.

**Stacking Rules**:
- Discounts can only stack if BOTH discounts allow combination with each other's category
- When discounts cannot stack, higher priority wins
- Order discounts always calculated last (on adjusted subtotal)

### 7.3 Validation Rules

```csharp
public async Task<DiscountValidationResult> ValidateAsync(Discount discount, DiscountContext context)
{
    // 1. Status check
    if (discount.Status != DiscountStatus.Active)
        return Fail("DISCOUNT_NOT_ACTIVE", "This discount is not currently active.");

    // 2. Date check
    if (discount.StartsAt > DateTime.UtcNow)
        return Fail("DISCOUNT_NOT_STARTED", "This discount hasn't started yet.");
    if (discount.EndsAt.HasValue && discount.EndsAt < DateTime.UtcNow)
        return Fail("DISCOUNT_EXPIRED", "This discount has expired.");

    // 3. Total usage limit
    if (discount.TotalUsageLimit.HasValue && discount.CurrentUsageCount >= discount.TotalUsageLimit)
        return Fail("USAGE_LIMIT_REACHED", "This discount has reached its usage limit.");

    // 4. Per-customer limit
    if (discount.PerCustomerUsageLimit.HasValue && context.CustomerId.HasValue)
    {
        var customerUsage = await GetCustomerUsageCountAsync(discount.Id, context.CustomerId.Value);
        if (customerUsage >= discount.PerCustomerUsageLimit)
            return Fail("CUSTOMER_LIMIT_REACHED", "You have already used this discount the maximum number of times.");
    }

    // 5. Eligibility check
    if (!await IsCustomerEligibleAsync(discount, context))
        return Fail("CUSTOMER_NOT_ELIGIBLE", "This discount is not available for your account.");

    // 6. Minimum requirements
    if (!MeetsRequirements(discount, context))
        return Fail("REQUIREMENTS_NOT_MET", GetRequirementMessage(discount));

    // 7. Product applicability (for product-based discounts)
    if (!HasApplicableProducts(discount, context))
        return Fail("NO_APPLICABLE_PRODUCTS", "No items in your cart qualify for this discount.");

    return Success(discount);
}
```

### 7.4 Calculation Examples

**Amount Off Products (10% off shirts)**:
```
Cart:
- Shirt A: £50 x 2 = £100 (qualifies)
- Pants B: £75 x 1 = £75 (doesn't qualify)

Discount: 10% off shirts
Calculation: £100 * 0.10 = £10 discount
```

**Buy X Get Y (Buy 2 shirts, get belt 50% off)**:
```
Cart:
- Shirt A: £50 x 2 = £100 (qualifies as "Buy")
- Belt A: £30 x 1 = £30 (qualifies as "Get")

Trigger: 2 shirts (met)
Get: 1 belt at 50% off
Calculation: £30 * 0.50 = £15 discount
```

### 7.5 Buy X Get Y Algorithm

The BOGO discount type requires a precise algorithm to handle complex cart scenarios.

#### Algorithm Steps

```
1. Count qualifying "Buy" items in cart
2. Calculate how many times the trigger is satisfied
3. Determine how many "Get" items can be discounted
4. Select which specific items to discount based on SelectionMethod
5. Apply discount to selected items (respecting PerOrderUsageLimit)
```

#### Trigger Calculation

**MinimumQuantity trigger:**
```
triggersEarned = floor(qualifyingBuyQuantity / buyTriggerValue)
```

**MinimumPurchaseAmount trigger:**
```
triggersEarned = floor(qualifyingBuyTotal / buyTriggerValue)
```

#### Selection Rules

1. **SelectionMethod.Cheapest**: Sort qualifying "Get" items by unit price ascending, discount cheapest first
2. **SelectionMethod.MostExpensive**: Sort qualifying "Get" items by unit price descending, discount most expensive first

#### Limits Applied

```
maxDiscountableItems = min(
    triggersEarned * getQuantity,           // Based on triggers earned
    totalQualifyingGetItems,                // Available items to discount
    perOrderUsageLimit ?? int.MaxValue      // Per-order limit if set
)
```

#### Complex Example

**Discount**: Buy 2 shirts, get 1 accessory 50% off (PerOrderUsageLimit = 2, SelectionMethod = Cheapest)

```
Cart:
- Shirt A: £50 x 3 (qualifies as "Buy")
- Belt A: £30 x 1 (qualifies as "Get")
- Belt B: £20 x 1 (qualifies as "Get")
- Scarf: £40 x 1 (qualifies as "Get")

Step 1: Count Buy items = 3 shirts
Step 2: Triggers earned = floor(3 / 2) = 1 trigger
Step 3: Get items discountable = 1 trigger × 1 getQuantity = 1 item
Step 4: Apply PerOrderUsageLimit = min(1, 2) = 1 item
Step 5: Sort Get items by price (Cheapest): Belt B (£20), Belt A (£30), Scarf (£40)
Step 6: Discount Belt B: £20 × 50% = £10 discount

Total discount: £10
```

**Same cart with 4 shirts:**
```
Step 1: Count Buy items = 4 shirts
Step 2: Triggers earned = floor(4 / 2) = 2 triggers
Step 3: Get items discountable = 2 triggers × 1 getQuantity = 2 items
Step 4: Apply PerOrderUsageLimit = min(2, 2) = 2 items
Step 5: Sort Get items by price (Cheapest): Belt B (£20), Belt A (£30), Scarf (£40)
Step 6: Discount Belt B (£20 × 50% = £10) + Belt A (£30 × 50% = £15)

Total discount: £25
```

#### Edge Cases

| Scenario | Behaviour |
|----------|-----------|
| Buy and Get target same products | Item can satisfy Buy OR Get, not both. Prioritise Buy trigger first. |
| Get quantity exceeds available items | Discount only available items |
| Multiple BOGO discounts on same cart | Each discount evaluated independently; combination rules apply |
| Quantity-based Get (e.g., "get 2 free") | Select multiple items up to getQuantity per trigger |
| Customer adds more Buy items after discount applied | Recalculate on cart update |

**Amount Off Order (£20 off orders over £100)**:
```
Cart Subtotal: £150
Requirement: Minimum £100 (met)
Calculation: £20 fixed discount
```

---

## 8. Reporting & Analytics

### 8.1 Discount Performance Metrics

**File**: `src/Merchello.Core/Discounts/Dtos/DiscountPerformanceDto.cs`

```csharp
public class DiscountPerformanceDto
{
    public Guid DiscountId { get; set; }
    public string Name { get; set; } = string.Empty;

    // Usage
    public int TotalUsageCount { get; set; }
    public int UniqueCustomersCount { get; set; }
    public int? RemainingUses { get; set; } // null = unlimited

    // Financial (in store currency)
    public decimal TotalDiscountAmount { get; set; }
    public decimal AverageDiscountPerUse { get; set; }
    public decimal TotalOrderRevenue { get; set; } // Revenue from orders with this discount
    public decimal AverageOrderValue { get; set; }

    // Timeline
    public List<UsageByDateDto> UsageByDate { get; set; } = [];
    public DateTime? FirstUsed { get; set; }
    public DateTime? LastUsed { get; set; }
}

public class UsageByDateDto
{
    public DateTime Date { get; set; }
    public int UsageCount { get; set; }
    public decimal DiscountAmount { get; set; }
}
```

### 8.2 Queries

```sql
-- Usage summary by discount
SELECT
    d.Id,
    d.Name,
    COUNT(u.Id) AS UsageCount,
    COUNT(DISTINCT u.CustomerId) AS UniqueCustomers,
    SUM(u.DiscountAmountInStoreCurrency) AS TotalDiscount,
    AVG(u.DiscountAmountInStoreCurrency) AS AvgDiscount
FROM merchelloDiscounts d
LEFT JOIN merchelloDiscountUsages u ON d.Id = u.DiscountId
WHERE d.Status IN ('Active', 'Expired')
GROUP BY d.Id, d.Name
ORDER BY UsageCount DESC;

-- Usage over time (for charts)
SELECT
    CAST(u.DateUsed AS DATE) AS Date,
    COUNT(*) AS UsageCount,
    SUM(u.DiscountAmountInStoreCurrency) AS TotalDiscount
FROM merchelloDiscountUsages u
WHERE u.DiscountId = @discountId
  AND u.DateUsed >= @startDate
GROUP BY CAST(u.DateUsed AS DATE)
ORDER BY Date;
```

### 8.3 Integration with Architecture-Diagrams.md

Add to centralized methods table:

| Operation | Service.Method |
|-----------|----------------|
| Discount calculation | `IDiscountEngine.CalculateAsync()` |
| Apply discount | `IDiscountEngine.ApplyDiscountsAsync()` |
| Validate discount code | `IDiscountEngine.ValidateCodeAsync()` |
| Record usage | `IDiscountService.RecordUsageAsync()` |

---

## 9. Implementation Phases

### Phase 1: Foundation

**Database & Core Models**
- [ ] Create discount entity models
- [ ] Create EF Core mappings
- [ ] Run migrations (both providers)
- [ ] Create DiscountFactory

**Basic Service Layer**
- [ ] Implement IDiscountService (CRUD only)
- [ ] Create API controller with basic endpoints
- [ ] Add to DI registration

**Deliverable**: Can create/read/update/delete discounts via API

### Phase 2: Discount Engine

**Engine Implementation**
- [ ] Implement IDiscountEngine
- [ ] Validation logic
- [ ] Calculation logic for all 4 discount types
- [ ] Priority and stacking logic

**Integration**
- [ ] Extend ILineItemService
- [ ] Extend ICheckoutService for basket discounts
- [ ] Add automatic discount detection to checkout flow

**Deliverable**: Discounts can be applied to baskets during checkout

### Phase 3: Backoffice Manual Discounts

**Invoice Integration**
- [ ] Extend IInvoiceService for discount application
- [ ] Add API endpoints for manual discounts
- [ ] Create discount line items on invoices

**Deliverable**: Admins can add discounts to existing orders

### Phase 4: Frontend - List & Create

**Discounts List**
- [ ] Update manifest.ts
- [ ] Create discounts-list.element.ts
- [ ] Create discount-table.element.ts
- [ ] Add API methods to merchello-api.ts

**Create Discount Flow**
- [ ] Create select-discount-type-modal
- [ ] Create discount-detail.element.ts (basic form)

**Deliverable**: Can view discount list and create basic discounts in UI

### Phase 5: Frontend - Full Edit Experience

**Complete Detail View**
- [ ] All tabs implemented
- [ ] Product picker modal
- [ ] Customer segment picker
- [ ] Summary card component

**Navigation**
- [ ] Workspace context with routing
- [ ] Navigation utilities

**Deliverable**: Full discount management in backoffice

### Phase 6: Reporting

**Performance Metrics**
- [ ] Implement performance queries
- [ ] Add performance endpoint
- [ ] Usage tracking on discount application

**UI**
- [ ] Performance view in discount detail
- [ ] Usage charts
- [ ] Summary statistics

**Deliverable**: Discount performance reporting

### Phase 7: Testing & Polish

**Testing**
- [ ] Unit tests for discount engine
- [ ] Integration tests for API
- [ ] E2E tests for UI flows

**Polish**
- [ ] Error handling
- [ ] Loading states
- [ ] Validation messages
- [ ] Documentation

**Deliverable**: Production-ready discount system

---

## 10. Testing Strategy

### 10.1 Unit Tests

**Discount Engine Tests**:
```csharp
public class DiscountEngineTests
{
    [Fact]
    public async Task CalculateAsync_PercentageDiscount_CalculatesCorrectly()
    {
        // Arrange
        var discount = CreatePercentageDiscount(10); // 10%
        var context = CreateContext(subtotal: 100);

        // Act
        var result = await _engine.CalculateAsync(discount, context);

        // Assert
        result.DiscountAmount.ShouldBe(10);
    }

    [Fact]
    public async Task ValidateAsync_ExpiredDiscount_ReturnsError()
    {
        // Arrange
        var discount = CreateExpiredDiscount();
        var context = CreateContext();

        // Act
        var result = await _engine.ValidateAsync(discount, context);

        // Assert
        result.IsValid.ShouldBeFalse();
        result.ErrorCode.ShouldBe("DISCOUNT_EXPIRED");
    }

    [Fact]
    public async Task CalculateAsync_BuyXGetY_AppliesCorrectly()
    {
        // Arrange: Buy 2 shirts, get 1 belt 50% off
        var discount = CreateBuyXGetYDiscount(
            buyQuantity: 2,
            buyProductIds: [shirtId],
            getQuantity: 1,
            getProductIds: [beltId],
            getDiscountPercent: 50
        );
        var context = CreateContextWithItems([
            (shirtId, quantity: 2, price: 50),  // £100
            (beltId, quantity: 1, price: 30)    // £30
        ]);

        // Act
        var result = await _engine.CalculateAsync(discount, context);

        // Assert
        result.DiscountAmount.ShouldBe(15); // 50% of £30
    }
}
```

### 10.2 Integration Tests

**API Tests**:
```csharp
public class DiscountApiTests : IntegrationTestBase
{
    [Fact]
    public async Task CreateDiscount_ValidRequest_ReturnsCreated()
    {
        // Arrange
        var request = new CreateDiscountDto
        {
            Name = "Summer Sale",
            Category = DiscountCategory.AmountOffProducts,
            Method = DiscountMethod.Code,
            Code = "SUMMER10",
            ValueType = DiscountValueType.Percentage,
            Value = 10
        };

        // Act
        var response = await _client.PostAsJsonAsync("/umbraco/merchello/api/v1/discounts", request);

        // Assert
        response.StatusCode.ShouldBe(HttpStatusCode.Created);
        var discount = await response.Content.ReadFromJsonAsync<DiscountDetailDto>();
        discount.ShouldNotBeNull();
        discount.Code.ShouldBe("SUMMER10");
    }

    [Fact]
    public async Task ApplyDiscountCode_ValidCode_AppliesDiscount()
    {
        // Arrange
        var discount = await CreateActiveDiscount("TESTCODE", 10);
        var basket = await CreateBasketWithProducts(total: 100);

        // Act
        var response = await _client.PostAsJsonAsync(
            $"/umbraco/merchello/api/v1/checkout/basket/{basket.Id}/discounts",
            new { code = "TESTCODE" }
        );

        // Assert
        response.StatusCode.ShouldBe(HttpStatusCode.OK);
        var updatedBasket = await response.Content.ReadFromJsonAsync<BasketDto>();
        updatedBasket.Discount.ShouldBe(10);
        updatedBasket.AdjustedSubTotal.ShouldBe(90);
    }
}
```

### 10.3 UI Tests

**Component Tests** (using @open-wc/testing):
```typescript
describe("discounts-list", () => {
  it("renders loading state initially", async () => {
    const el = await fixture(html`<merchello-discounts-list></merchello-discounts-list>`);
    expect(el.shadowRoot?.querySelector("uui-loader")).to.exist;
  });

  it("renders discounts when loaded", async () => {
    // Mock API response
    const discounts = [
      { id: "1", name: "Summer Sale", status: "Active", method: "Code" }
    ];
    // ... setup

    const rows = el.shadowRoot?.querySelectorAll("uui-table-row");
    expect(rows?.length).to.equal(1);
  });

  it("opens create modal on button click", async () => {
    const el = await fixture(html`<merchello-discounts-list></merchello-discounts-list>`);
    const createButton = el.shadowRoot?.querySelector("[data-testid='create-discount']");
    createButton?.click();

    // Verify modal opened
    // ...
  });
});
```

---

## Appendix A: Shopify Feature Comparison

| Feature | Shopify | Merchello (Planned) |
|---------|---------|-------------------|
| Amount off products | Yes | Yes |
| Amount off order | Yes | Yes |
| Buy X get Y | Yes | Yes (true BOGO) |
| Free shipping | Yes | Yes |
| Discount codes | Yes | Yes |
| Automatic discounts | Yes | Yes |
| Percentage discounts | Yes | Yes |
| Fixed amount discounts | Yes | Yes |
| Minimum purchase amount | Yes | Yes |
| Minimum quantity | Yes | Yes |
| Usage limits (total) | Yes | Yes |
| Usage limits (per customer) | Yes | Yes |
| Customer eligibility | Yes | Yes (segments) |
| Product collections | Yes | Yes (categories) |
| Product filters | No | Yes (extended) |
| Product types | No | Yes (extended) |
| Suppliers | No | Yes (extended) |
| Warehouses | No | Yes (extended) |
| Combination rules | Yes | Yes |
| Active dates | Yes | Yes |
| Performance reporting | Yes | Yes |

## Appendix B: Key File Paths

### Backend

| Purpose | Path |
|---------|------|
| Discount Models | `src/Merchello.Core/Discounts/Models/` |
| Discount Service | `src/Merchello.Core/Discounts/Services/DiscountService.cs` |
| Discount Engine | `src/Merchello.Core/Discounts/Services/DiscountEngine.cs` |
| Discount Factory | `src/Merchello.Core/Discounts/Factories/DiscountFactory.cs` |
| Discount API | `src/Merchello/Controllers/DiscountsApiController.cs` |
| DbContext | `src/Merchello.Core/Data/MerchelloDbContext.cs` |
| Line Item Service | `src/Merchello.Core/Accounting/Services/LineItemService.cs` |

> **Note**: Customer Segment file paths are defined in [Customer-Segments.md](Customer-Segments.md).

### Frontend

| Purpose | Path |
|---------|------|
| Manifests | `src/Merchello/Client/src/discounts/manifest.ts` |
| Types | `src/Merchello/Client/src/discounts/types/discount.types.ts` |
| List View | `src/Merchello/Client/src/discounts/components/discounts-list.element.ts` |
| Detail View | `src/Merchello/Client/src/discounts/components/discount-detail.element.ts` |
| Workspace Context | `src/Merchello/Client/src/discounts/contexts/discount-detail-workspace.context.ts` |
| API | `src/Merchello/Client/src/api/merchello-api.ts` |
| Navigation | `src/Merchello/Client/src/shared/utils/navigation.ts` |

## Appendix C: Related Documentation

- [Customer-Segments.md](Customer-Segments.md) - **Prerequisite** - Customer segments for eligibility targeting
- [Architecture-Diagrams.md](Architecture-Diagrams.md) - Centralized methods and factory patterns
- [Umbraco-EF-Core.md](Umbraco-EF-Core.md) - Database and migration patterns
- [Umbraco-Backoffice-Dev.md](Umbraco-Backoffice-Dev.md) - Frontend component patterns
