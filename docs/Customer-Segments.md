# Merchello Customer Segments - Developer Implementation Guide

> Customer segments enable grouping customers for targeted marketing, pricing strategies, and personalized experiences.

## Table of Contents

1. [Overview](#1-overview)
2. [Segment Types](#2-segment-types)
3. [Database Schema](#3-database-schema)
4. [Backend Architecture](#4-backend-architecture)
   - [4.6 Integration Points](#46-integration-points) - Where segment checks are called
5. [API Design](#5-api-design)
6. [Frontend Implementation](#6-frontend-implementation)
7. [Criteria Engine](#7-criteria-engine)
8. [Implementation Phases](#8-implementation-phases)
9. [Testing Strategy](#9-testing-strategy)

---

## 1. Overview

### Goals

- Group customers for targeted features and personalization
- Support both manual curation and automated criteria-based segments
- Real-time membership evaluation for automated segments
- Simple UI for segment management
- Extensible criteria system

### Key Features

| Feature | Description |
|---------|-------------|
| **Segment Types** | Manual (curated) or Automated (criteria-based) |
| **Criteria Fields** | Order count, total spend, first order date, tags, etc. |
| **Operators** | Equals, greater than, less than, contains, between |
| **Matching** | All conditions (AND) or Any condition (OR) |
| **Membership** | Cached for manual, calculated on-demand for automated |
| **UI Location** | Customers section as workspace view/tab |

### Architecture Principles

1. **Centralized Evaluation** - All segment membership checks go through `ICustomerSegmentService.IsCustomerInSegmentAsync()`
2. **Factories** - All segment entities created via `CustomerSegmentFactory`
3. **Services** - All business logic in services, no DbContext in controllers
4. **Criteria Pattern** - Extensible criteria evaluation via `ISegmentCriteriaEvaluator`

---

## 2. Segment Types

### 2.1 Manual Segments

Admin explicitly adds/removes customers. Membership is stored in the database.

```
Use Cases:
├── VIP Customers - Hand-picked high-value customers
├── Wholesale Accounts - B2B customers with special pricing
├── Beta Testers - Customers testing new features
└── Blacklisted - Customers excluded from promotions
```

### 2.2 Automated Segments

Membership is calculated dynamically based on criteria rules.

```
Configuration:
├── Criteria Rules:
│   ├── Field: orderCount, totalSpend, firstOrderDate, daysSinceLastOrder, etc.
│   ├── Operator: equals, greaterThan, lessThan, between, contains
│   └── Value: number, string, date, array
├── Match Mode:
│   ├── All - Customer must match ALL criteria (AND)
│   └── Any - Customer must match ANY criteria (OR)
└── Evaluation: On-demand when checking eligibility
```

**Example Automated Segments**:

| Segment | Criteria |
|---------|----------|
| First-time Buyers | `orderCount equals 0` |
| Returning Customers | `orderCount greaterThan 0` |
| High Spenders | `totalSpend greaterThan 500` |
| Lapsed Customers | `daysSinceLastOrder greaterThan 90` |
| Frequent Buyers | `orderCount greaterThan 5 AND totalSpend greaterThan 200` |

---

## 3. Database Schema

### 3.1 Core Entities

#### CustomerSegment Entity

**File**: `src/Merchello.Core/Customers/Models/CustomerSegment.cs`

```csharp
public class CustomerSegment
{
    public Guid Id { get; set; } = GuidExtensions.NewSequentialGuid;
    public string Name { get; set; } = string.Empty;
    public string? Description { get; set; }

    // Type
    public CustomerSegmentType SegmentType { get; set; } // Manual, Automated

    // Criteria (for automated segments)
    public string? CriteriaJson { get; set; } // JSON array of criteria rules
    public SegmentMatchMode MatchMode { get; set; } = SegmentMatchMode.All;

    // Status
    public bool IsActive { get; set; } = true;
    public bool IsSystemSegment { get; set; } // Built-in segments cannot be deleted

    // Audit - All timestamps stored in UTC
    public DateTime DateCreated { get; set; } = DateTime.UtcNow;
    public DateTime DateUpdated { get; set; } = DateTime.UtcNow;
    public Guid? CreatedBy { get; set; }

    // Navigation (for manual segments)
    public virtual ICollection<CustomerSegmentMember> Members { get; set; } = [];
}
```

### 3.1.1 Customer Model Prerequisites

Before implementing segments, the Customer model requires a Tags property for tag-based criteria:

**File**: `src/Merchello.Core/Customers/Models/Customer.cs` - Add:
```csharp
public List<string> Tags { get; set; } = [];
```

**File**: `src/Merchello.Core/Customers/Mapping/CustomerDbMapping.cs` - Add:
```csharp
builder.Property(x => x.Tags).ToJsonConversion(4000);
```

**File**: `src/Merchello.Core/Customers/Factories/CustomerFactory.cs` - Initialize:
```csharp
Tags = []
```

Run migration after adding this property: `.\scripts\add-migration.ps1`

#### CustomerSegmentMember Entity (Manual Segments Only)

**File**: `src/Merchello.Core/Customers/Models/CustomerSegmentMember.cs`

```csharp
public class CustomerSegmentMember
{
    public Guid Id { get; set; } = GuidExtensions.NewSequentialGuid;
    public Guid SegmentId { get; set; }
    public Guid CustomerId { get; set; }

    public DateTime DateAdded { get; set; } = DateTime.UtcNow; // UTC
    public Guid? AddedBy { get; set; }
    public string? Notes { get; set; }

    public virtual CustomerSegment Segment { get; set; } = null!;
}
```

### 3.2 Criteria Model

**File**: `src/Merchello.Core/Customers/Models/SegmentCriteria.cs`

```csharp
public class SegmentCriteria
{
    public string Field { get; set; } = string.Empty;
    public SegmentCriteriaOperator Operator { get; set; }
    public object? Value { get; set; }
    public object? Value2 { get; set; } // For "between" operator
}

public class SegmentCriteriaSet
{
    public List<SegmentCriteria> Criteria { get; set; } = [];
    public SegmentMatchMode MatchMode { get; set; } = SegmentMatchMode.All;
}
```

### 3.3 Enums

**File**: `src/Merchello.Core/Customers/Models/CustomerSegmentEnums.cs`

```csharp
public enum CustomerSegmentType
{
    Manual,     // Membership stored in database
    Automated   // Membership calculated from criteria
}

public enum SegmentMatchMode
{
    All,    // AND - all criteria must match
    Any     // OR - any criteria can match
}

public enum SegmentCriteriaOperator
{
    Equals,
    NotEquals,
    GreaterThan,
    GreaterThanOrEqual,
    LessThan,
    LessThanOrEqual,
    Between,
    Contains,
    NotContains,
    StartsWith,
    EndsWith,
    IsEmpty,
    IsNotEmpty
}

public enum SegmentCriteriaField
{
    // Order metrics
    OrderCount,
    TotalSpend,
    AverageOrderValue,
    FirstOrderDate,
    LastOrderDate,
    DaysSinceLastOrder,

    // Customer properties
    DateCreated,
    Email,
    Country,

    // Custom
    Tag
}
```

### 3.4 Entity Configuration

**File**: `src/Merchello.Core/Customers/Mapping/CustomerSegmentDbMapping.cs`

```csharp
public class CustomerSegmentDbMapping : IEntityTypeConfiguration<CustomerSegment>
{
    public void Configure(EntityTypeBuilder<CustomerSegment> builder)
    {
        builder.ToTable("merchelloCustomerSegments");
        builder.HasKey(x => x.Id);

        builder.Property(x => x.Name).HasMaxLength(300).IsRequired();
        builder.Property(x => x.Description).HasMaxLength(1000);
        builder.Property(x => x.CriteriaJson).HasColumnType("nvarchar(max)");

        builder.HasIndex(x => x.Name);
        builder.HasIndex(x => x.SegmentType);
        builder.HasIndex(x => x.IsActive);

        builder.HasMany(x => x.Members)
            .WithOne(x => x.Segment)
            .HasForeignKey(x => x.SegmentId)
            .OnDelete(DeleteBehavior.Cascade);
    }
}

public class CustomerSegmentMemberDbMapping : IEntityTypeConfiguration<CustomerSegmentMember>
{
    public void Configure(EntityTypeBuilder<CustomerSegmentMember> builder)
    {
        builder.ToTable("merchelloCustomerSegmentMembers");
        builder.HasKey(x => x.Id);

        builder.HasIndex(x => new { x.SegmentId, x.CustomerId }).IsUnique();
        builder.HasIndex(x => x.CustomerId);
    }
}
```

### 3.5 Database Tables Summary

| Table | Purpose |
|-------|---------|
| `merchelloCustomerSegments` | Segment definitions (both manual and automated) |
| `merchelloCustomerSegmentMembers` | Membership records (manual segments only) |

### 3.6 Migration

```powershell
.\scripts\add-migration.ps1
# Enter migration name: AddCustomerSegmentTables
```

---

## 4. Backend Architecture

### 4.1 Folder Structure

```
src/Merchello.Core/
├── Customers/
│   ├── Models/
│   │   ├── CustomerSegment.cs
│   │   ├── CustomerSegmentMember.cs
│   │   ├── SegmentCriteria.cs
│   │   └── CustomerSegmentEnums.cs
│   ├── Factories/
│   │   └── CustomerSegmentFactory.cs
│   ├── Services/
│   │   ├── Interfaces/
│   │   │   ├── ICustomerSegmentService.cs
│   │   │   └── ISegmentCriteriaEvaluator.cs
│   │   ├── Parameters/
│   │   │   ├── CreateSegmentParameters.cs
│   │   │   ├── UpdateSegmentParameters.cs
│   │   │   └── SegmentQueryParameters.cs
│   │   ├── CustomerSegmentService.cs
│   │   └── SegmentCriteriaEvaluator.cs
│   ├── Mapping/
│   │   ├── CustomerSegmentDbMapping.cs
│   │   └── CustomerSegmentMemberDbMapping.cs
│   ├── Dtos/
│   │   ├── CustomerSegmentListItemDto.cs
│   │   ├── CustomerSegmentDetailDto.cs
│   │   ├── CreateCustomerSegmentDto.cs
│   │   └── SegmentCriteriaDto.cs
│   └── Notifications/
│       ├── SegmentMemberAddedNotification.cs
│       └── SegmentMemberRemovedNotification.cs
```

### 4.2 Service Interface

**File**: `src/Merchello.Core/Customers/Services/Interfaces/ICustomerSegmentService.cs`

```csharp
public interface ICustomerSegmentService
{
    // CRUD Operations
    Task<List<CustomerSegment>> GetAllAsync(CancellationToken ct = default);
    Task<CustomerSegment?> GetByIdAsync(Guid segmentId, CancellationToken ct = default);
    Task<CrudResult<CustomerSegment>> CreateAsync(CreateSegmentParameters parameters, CancellationToken ct = default);
    Task<CrudResult<CustomerSegment>> UpdateAsync(Guid segmentId, UpdateSegmentParameters parameters, CancellationToken ct = default);
    Task<CrudResult> DeleteAsync(Guid segmentId, CancellationToken ct = default);

    // Membership - Manual Segments
    Task<List<Guid>> GetMemberIdsAsync(Guid segmentId, CancellationToken ct = default);
    Task<PaginatedList<CustomerSegmentMember>> GetMembersAsync(Guid segmentId, int page = 1, int pageSize = 50, CancellationToken ct = default);
    Task<CrudResult> AddMembersAsync(Guid segmentId, List<Guid> customerIds, Guid? addedBy = null, CancellationToken ct = default);
    Task<CrudResult> RemoveMembersAsync(Guid segmentId, List<Guid> customerIds, CancellationToken ct = default);

    // Membership - Evaluation (CENTRALIZED METHOD)
    /// <summary>
    /// Check if a customer is in a segment. For manual segments, checks database.
    /// For automated segments, evaluates criteria against customer data.
    /// </summary>
    Task<bool> IsCustomerInSegmentAsync(Guid segmentId, Guid customerId, CancellationToken ct = default);

    /// <summary>
    /// Get all segment IDs that a customer belongs to.
    /// </summary>
    Task<List<Guid>> GetCustomerSegmentIdsAsync(Guid customerId, CancellationToken ct = default);

    /// <summary>
    /// Get customers matching an automated segment's criteria (for preview/testing).
    /// </summary>
    Task<PaginatedList<Guid>> GetMatchingCustomerIdsAsync(Guid segmentId, int page = 1, int pageSize = 50, CancellationToken ct = default);

    // Criteria Validation
    Task<CriteriaValidationResult> ValidateCriteriaAsync(List<SegmentCriteria> criteria, CancellationToken ct = default);

    // Statistics
    Task<int> GetMemberCountAsync(Guid segmentId, CancellationToken ct = default);
    Task<SegmentStatisticsDto> GetStatisticsAsync(Guid segmentId, CancellationToken ct = default);
}
```

#### Service Implementation Pattern

Services must use `IEFCoreScopeProvider<MerchelloDbContext>` for all database access:

```csharp
public class CustomerSegmentService(
    IEFCoreScopeProvider<MerchelloDbContext> efCoreScopeProvider,
    CustomerSegmentFactory segmentFactory,
    ISegmentCriteriaEvaluator criteriaEvaluator,
    ILogger<CustomerSegmentService> logger) : ICustomerSegmentService
{
    public async Task<CustomerSegment?> GetByIdAsync(Guid segmentId, CancellationToken ct = default)
    {
        using var scope = efCoreScopeProvider.CreateScope();
        var result = await scope.ExecuteWithContextAsync(async db =>
            await db.CustomerSegments
                .AsNoTracking()
                .FirstOrDefaultAsync(s => s.Id == segmentId, ct));
        scope.Complete();
        return result;
    }
}
```

#### Statistics Implementation

```csharp
public async Task<SegmentStatisticsDto> GetStatisticsAsync(Guid segmentId, CancellationToken ct = default)
{
    var segment = await GetByIdAsync(segmentId, ct);
    if (segment == null) return new SegmentStatisticsDto();

    // Get member IDs (works for both manual and automated segments)
    List<Guid> memberIds;
    if (segment.SegmentType == CustomerSegmentType.Manual)
    {
        using var scope = efCoreScopeProvider.CreateScope();
        memberIds = await scope.ExecuteWithContextAsync(async db =>
            await db.CustomerSegmentMembers
                .Where(m => m.SegmentId == segmentId)
                .Select(m => m.CustomerId)
                .ToListAsync(ct));
        scope.Complete();
    }
    else
    {
        // For automated segments, get matching customer IDs
        var matchResult = await GetMatchingCustomerIdsAsync(segmentId, page: 1, pageSize: int.MaxValue, ct);
        memberIds = matchResult.Items.ToList();
    }

    if (memberIds.Count == 0)
        return new SegmentStatisticsDto { TotalMembers = 0 };

    // Calculate statistics from invoices
    using var statsScope = efCoreScopeProvider.CreateScope();
    var stats = await statsScope.ExecuteWithContextAsync(async db =>
        await db.Invoices
            .Where(i => memberIds.Contains(i.CustomerId))
            .Where(i => !i.IsDeleted && !i.IsCancelled)
            .GroupBy(_ => 1)
            .Select(g => new
            {
                TotalRevenue = g.Sum(i => i.Total),
                OrderCount = g.Count(),
                ActiveCustomers = g.Select(i => i.CustomerId).Distinct().Count()
            })
            .FirstOrDefaultAsync(ct));
    statsScope.Complete();

    return new SegmentStatisticsDto
    {
        TotalMembers = memberIds.Count,
        ActiveMembers = stats?.ActiveCustomers ?? 0,
        TotalRevenue = stats?.TotalRevenue ?? 0,
        AverageOrderValue = stats?.OrderCount > 0
            ? (stats.TotalRevenue / stats.OrderCount)
            : 0
    };
}
```

### 4.3 Criteria Evaluator Interface

**File**: `src/Merchello.Core/Customers/Services/Interfaces/ISegmentCriteriaEvaluator.cs`

```csharp
public interface ISegmentCriteriaEvaluator
{
    /// <summary>
    /// Evaluate if a customer matches the given criteria set.
    /// </summary>
    Task<bool> EvaluateAsync(Guid customerId, SegmentCriteriaSet criteriaSet, CancellationToken ct = default);

    /// <summary>
    /// Get all available criteria fields with their metadata.
    /// </summary>
    List<CriteriaFieldMetadata> GetAvailableFields();

    /// <summary>
    /// Get valid operators for a specific field.
    /// </summary>
    List<SegmentCriteriaOperator> GetOperatorsForField(SegmentCriteriaField field);
}

public class CriteriaFieldMetadata
{
    public SegmentCriteriaField Field { get; set; }
    public string Label { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public CriteriaValueType ValueType { get; set; } // Number, String, Date, Boolean
    public List<SegmentCriteriaOperator> SupportedOperators { get; set; } = [];
}

public enum CriteriaValueType
{
    Number,
    String,
    Date,
    Boolean,
    Currency
}
```

### 4.4 Segment Factory

**File**: `src/Merchello.Core/Customers/Factories/CustomerSegmentFactory.cs`

```csharp
public class CustomerSegmentFactory
{
    public CustomerSegment Create(CreateSegmentParameters parameters)
    {
        return new CustomerSegment
        {
            Name = parameters.Name,
            Description = parameters.Description,
            SegmentType = parameters.SegmentType,
            CriteriaJson = parameters.Criteria != null
                ? JsonSerializer.Serialize(parameters.Criteria)
                : null,
            MatchMode = parameters.MatchMode,
            IsActive = true,
            IsSystemSegment = false,
            CreatedBy = parameters.CreatedBy
        };
    }

    public CustomerSegmentMember CreateMember(Guid segmentId, Guid customerId, Guid? addedBy = null)
    {
        return new CustomerSegmentMember
        {
            SegmentId = segmentId,
            CustomerId = customerId,
            AddedBy = addedBy
        };
    }
}
```

### 4.5 Predefined System Segments

Create on installation:

```csharp
public class SystemSegmentInitializer
{
    private readonly ICustomerSegmentService _segmentService;

    public async Task EnsureSystemSegmentsAsync()
    {
        var systemSegments = new[]
        {
            new CreateSegmentParameters
            {
                Name = "First-time Buyers",
                Description = "Customers who haven't placed an order yet",
                SegmentType = CustomerSegmentType.Automated,
                Criteria = [new SegmentCriteria { Field = "OrderCount", Operator = SegmentCriteriaOperator.Equals, Value = 0 }],
                IsSystemSegment = true
            },
            new CreateSegmentParameters
            {
                Name = "Returning Customers",
                Description = "Customers with at least one previous order",
                SegmentType = CustomerSegmentType.Automated,
                Criteria = [new SegmentCriteria { Field = "OrderCount", Operator = SegmentCriteriaOperator.GreaterThan, Value = 0 }],
                IsSystemSegment = true
            },
            new CreateSegmentParameters
            {
                Name = "VIP Customers",
                Description = "Hand-picked high-value customers",
                SegmentType = CustomerSegmentType.Manual,
                IsSystemSegment = true
            }
        };

        foreach (var segment in systemSegments)
        {
            // Create if doesn't exist by name
            await _segmentService.EnsureSystemSegmentAsync(segment);
        }
    }
}
```

### 4.6 Integration Points

Segment membership is checked at these **centralized locations**. All calls go through `ICustomerSegmentService.IsCustomerInSegmentAsync()` - this is the single source of truth for segment membership.

> **Note:** The code examples below are **conceptual integration patterns** showing how existing services would call `ICustomerSegmentService`. Actual service implementations must use `IEFCoreScopeProvider<MerchelloDbContext>` for database access (see section 4.2).

#### Integration Summary

| Location | Service | Method | Purpose |
|----------|---------|--------|---------|
| **Discount Eligibility** | `IDiscountService` | `GetEligibleDiscountsAsync()` | Filters discounts by segment criteria |
| **Shipping Quotes** | `IShippingQuoteService` | `GetQuotesAsync()` | Segment-specific shipping rates/exclusions |
| **Customer Profile** | `ICustomerService` | `GetCustomerWithSegmentsAsync()` | Display segment badges in UI |

#### 4.6.1 Discount Eligibility

**File**: `src/Merchello.Core/Discounts/Services/DiscountService.cs`

Discounts can be restricted to specific customer segments. When calculating eligible discounts, the service filters by segment membership:

```csharp
public class DiscountService(
    MerchelloDbContext db,
    ICustomerSegmentService segmentService,
    ILogger<DiscountService> logger) : IDiscountService
{
    public async Task<List<Discount>> GetEligibleDiscountsAsync(
        GetEligibleDiscountsParameters parameters,
        CancellationToken ct = default)
    {
        // Get all active discounts within date range
        var discounts = await db.Discounts
            .Where(d => d.IsActive)
            .Where(d => d.StartDate <= DateTime.UtcNow)
            .Where(d => d.EndDate == null || d.EndDate > DateTime.UtcNow)
            .ToListAsync(ct);

        // Filter by customer segment eligibility
        var eligibleDiscounts = new List<Discount>();

        foreach (var discount in discounts)
        {
            // If discount has no segment restrictions, it's available to all
            if (discount.SegmentIds.Count == 0)
            {
                eligibleDiscounts.Add(discount);
                continue;
            }

            // Check if customer is in ANY of the required segments
            var isEligible = await CheckCustomerSegmentEligibilityAsync(
                parameters.CustomerId,
                discount.SegmentIds,
                ct);

            if (isEligible)
            {
                eligibleDiscounts.Add(discount);
            }
        }

        return eligibleDiscounts;
    }

    /// <summary>
    /// Centralized segment eligibility check - uses ICustomerSegmentService.
    /// Customer must be in at least one of the specified segments.
    /// </summary>
    private async Task<bool> CheckCustomerSegmentEligibilityAsync(
        Guid customerId,
        List<Guid> requiredSegmentIds,
        CancellationToken ct)
    {
        // Get all segments the customer belongs to (more efficient than checking each)
        var customerSegmentIds = await segmentService.GetCustomerSegmentIdsAsync(customerId, ct);

        // Customer is eligible if they're in ANY of the required segments
        return requiredSegmentIds.Any(segmentId => customerSegmentIds.Contains(segmentId));
    }
}
```

#### 4.6.2 Shipping Quotes

**File**: `src/Merchello.Core/Shipping/Services/ShippingQuoteService.cs`

Shipping options can be restricted or adjusted based on customer segments:

```csharp
public class ShippingQuoteService(
    MerchelloDbContext db,
    ICustomerSegmentService segmentService,
    IExtensionManager extensionManager,
    ILogger<ShippingQuoteService> logger) : IShippingQuoteService
{
    public async Task<List<ShippingQuote>> GetQuotesAsync(
        GetShippingQuotesParameters parameters,
        CancellationToken ct = default)
    {
        // Get all active shipping methods for the destination
        var shippingMethods = await db.ShippingMethods
            .Include(sm => sm.ShippingProvider)
            .Where(sm => sm.IsActive)
            .Where(sm => sm.Countries.Contains(parameters.DestinationCountry))
            .ToListAsync(ct);

        // Get customer's segment IDs for filtering
        var customerSegmentIds = await segmentService.GetCustomerSegmentIdsAsync(
            parameters.CustomerId,
            ct);

        var quotes = new List<ShippingQuote>();

        foreach (var method in shippingMethods)
        {
            // Check segment exclusions - skip methods excluded for this customer's segments
            if (method.ExcludedSegmentIds.Any(segmentId => customerSegmentIds.Contains(segmentId)))
            {
                logger.LogDebug(
                    "Shipping method {MethodName} excluded for customer {CustomerId} due to segment exclusion",
                    method.Name, parameters.CustomerId);
                continue;
            }

            // Calculate base quote from provider
            var provider = extensionManager.GetShippingProvider(method.ShippingProviderId);
            var baseQuote = await provider.GetQuoteAsync(method, parameters, ct);

            if (baseQuote == null)
                continue;

            // Apply segment-specific shipping discounts
            var discountedRate = await ApplySegmentShippingDiscountAsync(
                baseQuote.Rate,
                method,
                customerSegmentIds,
                ct);

            quotes.Add(new ShippingQuote
            {
                ShippingMethodId = method.Id,
                ShippingMethodName = method.Name,
                ProviderName = method.ShippingProvider.Name,
                Rate = discountedRate,
                OriginalRate = baseQuote.Rate,
                EstimatedDays = baseQuote.EstimatedDays,
                SegmentDiscountApplied = discountedRate < baseQuote.Rate
            });
        }

        return quotes.OrderBy(q => q.Rate).ToList();
    }

    /// <summary>
    /// Apply segment-specific shipping discounts.
    /// For example, VIP customers get free shipping on orders over £50.
    /// </summary>
    private async Task<decimal> ApplySegmentShippingDiscountAsync(
        decimal baseRate,
        ShippingMethod method,
        List<Guid> customerSegmentIds,
        CancellationToken ct)
    {
        // Check if any segment-specific shipping rules apply
        var shippingRules = await db.SegmentShippingRules
            .Where(r => r.ShippingMethodId == method.Id)
            .Where(r => r.IsActive)
            .ToListAsync(ct);

        foreach (var rule in shippingRules)
        {
            if (customerSegmentIds.Contains(rule.SegmentId))
            {
                return rule.RuleType switch
                {
                    ShippingRuleType.FreeShipping => 0m,
                    ShippingRuleType.FlatRate => rule.FlatRate ?? baseRate,
                    ShippingRuleType.PercentDiscount => baseRate * (1 - (rule.DiscountPercent ?? 0) / 100m),
                    _ => baseRate
                };
            }
        }

        return baseRate;
    }
}
```

#### 4.6.3 Customer Profile Display

**File**: `src/Merchello.Core/Customers/Services/CustomerService.cs`

When loading a customer profile (for admin or checkout), include their segment memberships:

```csharp
public class CustomerService(
    MerchelloDbContext db,
    ICustomerSegmentService segmentService,
    ILogger<CustomerService> logger) : ICustomerService
{
    public async Task<CustomerDetailDto?> GetCustomerWithSegmentsAsync(
        Guid customerId,
        CancellationToken ct = default)
    {
        var customer = await db.Customers
            .Include(c => c.Addresses)
            .FirstOrDefaultAsync(c => c.Id == customerId, ct);

        if (customer == null)
            return null;

        // Get all active segments and check membership
        var allSegments = await segmentService.GetAllAsync(ct);
        var customerSegments = new List<CustomerSegmentSummaryDto>();

        foreach (var segment in allSegments.Where(s => s.IsActive))
        {
            var isInSegment = await segmentService.IsCustomerInSegmentAsync(
                segment.Id,
                customerId,
                ct);

            if (isInSegment)
            {
                customerSegments.Add(new CustomerSegmentSummaryDto
                {
                    Id = segment.Id,
                    Name = segment.Name,
                    SegmentType = segment.SegmentType
                });
            }
        }

        return new CustomerDetailDto
        {
            Id = customer.Id,
            Email = customer.Email,
            FirstName = customer.FirstName,
            LastName = customer.LastName,
            // ... other customer properties
            Segments = customerSegments
        };
    }
}
```

#### 4.6.4 Integration Flow Diagram

```
┌─────────────────────────────────────────────────────────────────────┐
│                         CHECKOUT FLOW                                │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  1. Customer adds items to cart                                      │
│           │                                                          │
│           ▼                                                          │
│  2. Get Eligible Discounts (IDiscountService)                       │
│           │                                                          │
│           └──► segmentService.GetCustomerSegmentIdsAsync()          │
│                 (filter discounts by segment eligibility)            │
│           │                                                          │
│           ▼                                                          │
│  3. Get Shipping Quotes (IShippingQuoteService)                     │
│           │                                                          │
│           └──► segmentService.GetCustomerSegmentIdsAsync()          │
│                 │                                                    │
│                 ├──► Filter excluded shipping methods                │
│                 └──► Apply segment shipping discounts                │
│           │                                                          │
│           ▼                                                          │
│  4. Display checkout totals with segment-based discounts applied     │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────┐
│                   SEGMENT MEMBERSHIP CHECK                           │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  ICustomerSegmentService.IsCustomerInSegmentAsync(segmentId, custId)│
│           │                                                          │
│           ├──► If Manual Segment:                                    │
│           │         Query merchelloCustomerSegmentMembers table      │
│           │         Return: EXISTS in membership table               │
│           │                                                          │
│           └──► If Automated Segment:                                 │
│                     │                                                │
│                     ▼                                                │
│                 ISegmentCriteriaEvaluator.EvaluateAsync()           │
│                     │                                                │
│                     ├──► Get customer metrics (orders, spend, etc.) │
│                     ├──► Evaluate each criterion                     │
│                     └──► Apply match mode (All/Any)                  │
│                     │                                                │
│                     ▼                                                │
│                 Return: true/false based on criteria match           │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

> **IMPORTANT**: All segment membership checks MUST go through `ICustomerSegmentService`. Never query the segment membership table directly - this ensures automated segments are evaluated consistently and manual segment caching works correctly.

---

## 5. API Design

### 5.1 Controller

**File**: `src/Merchello/Controllers/CustomerSegmentsApiController.cs`

```csharp
[ApiVersion("1.0")]
[ApiExplorerSettings(GroupName = "Merchello")]
public class CustomerSegmentsApiController(
    ICustomerSegmentService segmentService,
    ISegmentCriteriaEvaluator criteriaEvaluator) : MerchelloApiControllerBase
{
    // List all segments
    [HttpGet("customer-segments")]
    [ProducesResponseType<List<CustomerSegmentListItemDto>>(StatusCodes.Status200OK)]
    public async Task<ActionResult<List<CustomerSegmentListItemDto>>> GetSegments(CancellationToken ct)

    // Get segment detail
    [HttpGet("customer-segments/{id:guid}")]
    [ProducesResponseType<CustomerSegmentDetailDto>(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<CustomerSegmentDetailDto>> GetSegment(Guid id, CancellationToken ct)

    // Create segment
    [HttpPost("customer-segments")]
    [ProducesResponseType<CustomerSegmentDetailDto>(StatusCodes.Status201Created)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<ActionResult<CustomerSegmentDetailDto>> CreateSegment(
        [FromBody] CreateCustomerSegmentDto request,
        CancellationToken ct)

    // Update segment
    [HttpPut("customer-segments/{id:guid}")]
    [ProducesResponseType<CustomerSegmentDetailDto>(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<CustomerSegmentDetailDto>> UpdateSegment(
        Guid id,
        [FromBody] UpdateCustomerSegmentDto request,
        CancellationToken ct)

    // Delete segment
    [HttpDelete("customer-segments/{id:guid}")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult> DeleteSegment(Guid id, CancellationToken ct)

    // Get segment members (paginated)
    [HttpGet("customer-segments/{id:guid}/members")]
    [ProducesResponseType<PaginatedResponse<SegmentMemberDto>>(StatusCodes.Status200OK)]
    public async Task<ActionResult<PaginatedResponse<SegmentMemberDto>>> GetMembers(
        Guid id,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 50,
        CancellationToken ct = default)

    // Add members to manual segment
    [HttpPost("customer-segments/{id:guid}/members")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<ActionResult> AddMembers(
        Guid id,
        [FromBody] AddSegmentMembersDto request,
        CancellationToken ct)

    // Remove members from manual segment
    [HttpDelete("customer-segments/{id:guid}/members")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<ActionResult> RemoveMembers(
        Guid id,
        [FromBody] RemoveSegmentMembersDto request,
        CancellationToken ct)

    // Preview matching customers for automated segment
    [HttpGet("customer-segments/{id:guid}/preview")]
    [ProducesResponseType<PaginatedResponse<CustomerPreviewDto>>(StatusCodes.Status200OK)]
    public async Task<ActionResult<PaginatedResponse<CustomerPreviewDto>>> PreviewMatches(
        Guid id,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 50,
        CancellationToken ct = default)

    // Get segment statistics
    [HttpGet("customer-segments/{id:guid}/statistics")]
    [ProducesResponseType<SegmentStatisticsDto>(StatusCodes.Status200OK)]
    public async Task<ActionResult<SegmentStatisticsDto>> GetStatistics(Guid id, CancellationToken ct)

    // Get available criteria fields
    [HttpGet("customer-segments/criteria/fields")]
    [ProducesResponseType<List<CriteriaFieldMetadataDto>>(StatusCodes.Status200OK)]
    public ActionResult<List<CriteriaFieldMetadataDto>> GetCriteriaFields()

    // Validate criteria
    [HttpPost("customer-segments/criteria/validate")]
    [ProducesResponseType<CriteriaValidationResultDto>(StatusCodes.Status200OK)]
    public async Task<ActionResult<CriteriaValidationResultDto>> ValidateCriteria(
        [FromBody] List<SegmentCriteriaDto> criteria,
        CancellationToken ct)
}
```

### 5.2 DTOs

```csharp
public class CustomerSegmentListItemDto
{
    public Guid Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public string? Description { get; set; }
    public CustomerSegmentType SegmentType { get; set; }
    public bool IsActive { get; set; }
    public bool IsSystemSegment { get; set; }
    public int MemberCount { get; set; }
    public DateTime DateCreated { get; set; }
}

public class CustomerSegmentDetailDto : CustomerSegmentListItemDto
{
    public List<SegmentCriteriaDto>? Criteria { get; set; }
    public SegmentMatchMode MatchMode { get; set; }
    public DateTime DateUpdated { get; set; }
}

public class SegmentCriteriaDto
{
    public string Field { get; set; } = string.Empty;
    public string Operator { get; set; } = string.Empty;
    public object? Value { get; set; }
    public object? Value2 { get; set; }
}

public class CreateCustomerSegmentDto
{
    public string Name { get; set; } = string.Empty;
    public string? Description { get; set; }
    public CustomerSegmentType SegmentType { get; set; }
    public List<SegmentCriteriaDto>? Criteria { get; set; }
    public SegmentMatchMode MatchMode { get; set; } = SegmentMatchMode.All;
}

public class SegmentStatisticsDto
{
    public int TotalMembers { get; set; }
    public int ActiveMembers { get; set; } // Members with recent activity
    public decimal TotalRevenue { get; set; } // Combined spend of members
    public decimal AverageOrderValue { get; set; }
}
```

---

## 6. Frontend Implementation

### 6.1 File Structure

Segment files are added under the existing `customers/` folder:

```
src/Merchello/Client/src/customers/
├── manifest.ts                              [MODIFY - add segment manifests]
├── types/
│   ├── customer.types.ts                    [EXISTS]
│   └── segment.types.ts                     [NEW]
├── components/
│   ├── customers-list.element.ts            [EXISTS]
│   ├── segments-list.element.ts             [NEW] Main list view
│   ├── segment-detail.element.ts            [NEW] Edit/create view
│   ├── segment-criteria-builder.element.ts  [NEW] Criteria rule builder
│   ├── segment-members-table.element.ts     [NEW] Member list for manual segments
│   └── segment-preview.element.ts           [NEW] Preview matches for automated
├── contexts/
│   └── segment-detail-workspace.context.ts  [NEW]
└── modals/
    ├── customer-edit-modal.element.ts       [EXISTS]
    ├── customer-edit-modal.token.ts         [EXISTS]
    ├── customer-picker-modal.element.ts     [NEW]
    └── customer-picker-modal.token.ts       [NEW]
```

### 6.2 Manifests

**File**: `src/Merchello/Client/src/customers/manifest.ts` (add to existing)

```typescript
import type { UmbExtensionManifest } from "@umbraco-cms/backoffice/extension-api";

export const manifests: Array<UmbExtensionManifest> = [
  // Workspace view in Customers section
  {
    type: "workspaceView",
    alias: "Merchello.Customers.Segments.View",
    name: "Customer Segments View",
    js: () => import("./components/segments-list.element.js"),
    weight: 90,
    meta: {
      label: "Segments",
      pathname: "segments",
      icon: "icon-users",
    },
    conditions: [
      {
        alias: "Umb.Condition.WorkspaceAlias",
        match: "Merchello.Customers.Workspace",
      },
    ],
  },

  // Routable workspace for segment detail
  {
    type: "workspace",
    kind: "routable",
    alias: "Merchello.CustomerSegment.Detail.Workspace",
    name: "Customer Segment Detail Workspace",
    api: () => import("./contexts/segment-detail-workspace.context.js"),
    meta: {
      entityType: "merchello-customer-segment",
    },
  },

  // Customer picker modal
  {
    type: "modal",
    alias: "Merchello.CustomerPicker.Modal",
    name: "Customer Picker Modal",
    js: () => import("./modals/customer-picker-modal.element.js"),
  },
];
```

### 6.3 Workspace Context (Routable)

**File**: `src/Merchello/Client/src/customers/contexts/segment-detail-workspace.context.ts`

The workspace context **must** set up routes using `this.routes.setRoutes()`:

```typescript
import type { UmbControllerHost } from "@umbraco-cms/backoffice/controller-api";
import { UmbControllerBase } from "@umbraco-cms/backoffice/class-api";
import type { UmbRoutableWorkspaceContext } from "@umbraco-cms/backoffice/workspace";
import { UMB_WORKSPACE_CONTEXT, UmbWorkspaceRouteManager } from "@umbraco-cms/backoffice/workspace";
import { UmbObjectState } from "@umbraco-cms/backoffice/observable-api";
import { MerchelloApi } from "@api/merchello-api.js";
import type { CustomerSegmentDetailDto } from "../types/customer-segment.types.js";

export const SEGMENT_ENTITY_TYPE = "merchello-customer-segment";

export class SegmentDetailWorkspaceContext extends UmbControllerBase implements UmbRoutableWorkspaceContext {
  readonly workspaceAlias = "Merchello.CustomerSegment.Detail.Workspace";
  readonly routes: UmbWorkspaceRouteManager;

  #segmentId?: string;
  #segment = new UmbObjectState<CustomerSegmentDetailDto | undefined>(undefined);
  readonly segment = this.#segment.asObservable();

  constructor(host: UmbControllerHost) {
    super(host, UMB_WORKSPACE_CONTEXT.toString());
    this.routes = new UmbWorkspaceRouteManager(host);
    this.provideContext(UMB_WORKSPACE_CONTEXT, this);

    // CRITICAL: Must set up routes - without this, navigation won't work!
    this.routes.setRoutes([
      {
        path: "edit/:id",
        component: () => import("../components/segment-detail.element.js"),
        setup: (_component, info) => {
          const id = info.match.params.id;
          this.load(id);
        },
      },
      {
        path: "create",
        component: () => import("../components/segment-detail.element.js"),
        setup: () => {
          this.createNew();
        },
      },
    ]);
  }

  getEntityType(): string {
    return SEGMENT_ENTITY_TYPE;
  }

  getUnique(): string | undefined {
    return this.#segmentId;
  }

  async load(id: string): Promise<void> {
    this.#segmentId = id;
    const { data, error } = await MerchelloApi.getCustomerSegment(id);
    if (error) {
      console.error("Failed to load segment:", error);
      return;
    }
    this.#segment.setValue(data);
  }

  createNew(): void {
    this.#segmentId = undefined;
    this.#segment.setValue({
      id: "",
      name: "",
      description: null,
      segmentType: "Manual",
      isActive: true,
      isSystemSegment: false,
      memberCount: 0,
      dateCreated: new Date().toISOString(),
      dateUpdated: new Date().toISOString(),
      criteria: null,
      matchMode: "All",
    });
  }
}

export { SegmentDetailWorkspaceContext as api };
```

### 6.4 Type Definitions

**File**: `src/Merchello/Client/src/customers/types/segment.types.ts`

```typescript
export type CustomerSegmentType = "Manual" | "Automated";
export type SegmentMatchMode = "All" | "Any";
export type SegmentCriteriaOperator =
  | "Equals" | "NotEquals"
  | "GreaterThan" | "GreaterThanOrEqual"
  | "LessThan" | "LessThanOrEqual"
  | "Between" | "Contains" | "NotContains"
  | "StartsWith" | "EndsWith"
  | "IsEmpty" | "IsNotEmpty";

export type CriteriaValueType = "Number" | "String" | "Date" | "Boolean" | "Currency";

export interface SegmentCriteriaDto {
  field: string;
  operator: SegmentCriteriaOperator;
  value: unknown;
  value2?: unknown;
}

export interface CustomerSegmentListItemDto {
  id: string;
  name: string;
  description: string | null;
  segmentType: CustomerSegmentType;
  isActive: boolean;
  isSystemSegment: boolean;
  memberCount: number;
  dateCreated: string;
}

export interface CustomerSegmentDetailDto extends CustomerSegmentListItemDto {
  criteria: SegmentCriteriaDto[] | null;
  matchMode: SegmentMatchMode;
  dateUpdated: string;
}

export interface CriteriaFieldMetadataDto {
  field: string;
  label: string;
  description: string;
  valueType: CriteriaValueType;
  supportedOperators: SegmentCriteriaOperator[];
}

export interface CreateCustomerSegmentDto {
  name: string;
  description?: string;
  segmentType: CustomerSegmentType;
  criteria?: SegmentCriteriaDto[];
  matchMode?: SegmentMatchMode;
}
```

### 6.5 API Integration

**File**: `src/Merchello/Client/src/api/merchello-api.ts` (add)

```typescript
// Customer Segments
getCustomerSegments: () =>
  apiGet<CustomerSegmentListItemDto[]>("customer-segments"),

getCustomerSegment: (id: string) =>
  apiGet<CustomerSegmentDetailDto>(`customer-segments/${id}`),

createCustomerSegment: (data: CreateCustomerSegmentDto) =>
  apiPost<CustomerSegmentDetailDto>("customer-segments", data),

updateCustomerSegment: (id: string, data: UpdateCustomerSegmentDto) =>
  apiPut<CustomerSegmentDetailDto>(`customer-segments/${id}`, data),

deleteCustomerSegment: (id: string) =>
  apiDelete(`customer-segments/${id}`),

getSegmentMembers: (id: string, page?: number, pageSize?: number) =>
  apiGet<PaginatedResponse<SegmentMemberDto>>(
    `customer-segments/${id}/members?page=${page ?? 1}&pageSize=${pageSize ?? 50}`
  ),

addSegmentMembers: (id: string, customerIds: string[]) =>
  apiPost(`customer-segments/${id}/members`, { customerIds }),

removeSegmentMembers: (id: string, customerIds: string[]) =>
  apiDelete(`customer-segments/${id}/members`, { customerIds }),

previewSegmentMatches: (id: string, page?: number) =>
  apiGet<PaginatedResponse<CustomerPreviewDto>>(
    `customer-segments/${id}/preview?page=${page ?? 1}`
  ),

getSegmentStatistics: (id: string) =>
  apiGet<SegmentStatisticsDto>(`customer-segments/${id}/statistics`),

getCriteriaFields: () =>
  apiGet<CriteriaFieldMetadataDto[]>("customer-segments/criteria/fields"),

validateCriteria: (criteria: SegmentCriteriaDto[]) =>
  apiPost<CriteriaValidationResultDto>("customer-segments/criteria/validate", criteria),

// Customer Search (for picker modal - supports large customer bases)
searchCustomers: (params: { search: string; excludeIds?: string[]; pageSize?: number }) =>
  apiGet<PaginatedResponse<CustomerListItemDto>>(
    `customers/search?${new URLSearchParams({
      search: params.search,
      pageSize: String(params.pageSize ?? 50),
      ...(params.excludeIds?.length ? { excludeIds: params.excludeIds.join(",") } : {})
    })}`
  ),
```

### 6.5.1 Navigation Helpers

**File**: `src/Merchello/Client/src/shared/utils/navigation.ts` (add to existing)

```typescript
// Customer Segments
export const SEGMENT_ENTITY_TYPE = "merchello-customer-segment";

export function getSegmentDetailHref(segmentId: string): string {
  return getMerchelloWorkspaceHref(SEGMENT_ENTITY_TYPE, `edit/${segmentId}`);
}

export function getSegmentCreateHref(): string {
  return getMerchelloWorkspaceHref(SEGMENT_ENTITY_TYPE, "create");
}

export function navigateToSegmentDetail(segmentId: string): void {
  navigateToMerchelloWorkspace(SEGMENT_ENTITY_TYPE, `edit/${segmentId}`);
}

export function navigateToSegmentCreate(): void {
  navigateToMerchelloWorkspace(SEGMENT_ENTITY_TYPE, "create");
}
```

**Usage in components:**
```typescript
import { getSegmentDetailHref, getSegmentCreateHref } from "@shared/utils/navigation.js";

// In list - use href for SPA navigation (no page reload)
html`<a href=${getSegmentDetailHref(segment.id)}>${segment.name}</a>`

// Create button
html`<uui-button href=${getSegmentCreateHref()} label="Create Segment">Create Segment</uui-button>`
```

> **IMPORTANT:** Never use `window.location.href` for navigation - it causes full page reloads and resets sidebar state. Always use `href` attributes or the `navigateTo*` helpers.

### 6.6 Segments List Component

**File**: `src/Merchello/Client/src/customers/components/segments-list.element.ts`

**Features**:
- Table showing all segments with type badge (Manual/Automated)
- Member count column
- System segment indicator (cannot delete)
- Create button using `href` navigation
- Click row to edit using `href` navigation
- Context menu: Duplicate, Activate/Deactivate, Delete (non-system only)

**Key Implementation Notes:**

```typescript
import { html, css, customElement, state, nothing } from "@umbraco-cms/backoffice/external/lit";
import { UmbLitElement } from "@umbraco-cms/backoffice/lit-element";
import { getSegmentDetailHref, getSegmentCreateHref } from "@shared/utils/navigation.js";
import type { CustomerSegmentListItemDto } from "../types/customer-segment.types.js";

@customElement("merchello-segments-list")
export class SegmentsListElement extends UmbLitElement {
  @state() private _segments: CustomerSegmentListItemDto[] = [];
  @state() private _isLoading = true;

  // ... loading logic ...

  override render() {
    if (this._isLoading) {
      return html`<uui-loader-bar></uui-loader-bar>`;
    }

    return html`
      <umb-body-layout header-fit-height>
        <div id="header" slot="header">
          <uui-button
            href=${getSegmentCreateHref()}
            look="primary"
            label="Create Segment">
            Create Segment
          </uui-button>
        </div>

        <uui-box>
          ${this._segments.length === 0
            ? this._renderEmptyState()
            : this._renderTable()}
        </uui-box>
      </umb-body-layout>
    `;
  }

  private _renderTable() {
    return html`
      <uui-table>
        <uui-table-head>
          <uui-table-head-cell>Name</uui-table-head-cell>
          <uui-table-head-cell>Type</uui-table-head-cell>
          <uui-table-head-cell>Members</uui-table-head-cell>
          <uui-table-head-cell>Status</uui-table-head-cell>
          <uui-table-head-cell></uui-table-head-cell>
        </uui-table-head>
        ${this._segments.map((segment) => html`
          <uui-table-row>
            <uui-table-cell>
              <a href=${getSegmentDetailHref(segment.id)}>${segment.name}</a>
              ${segment.isSystemSegment ? html`<uui-tag look="secondary">System</uui-tag>` : nothing}
            </uui-table-cell>
            <uui-table-cell>
              <uui-tag color=${segment.segmentType === "Automated" ? "positive" : "default"}>
                ${segment.segmentType}
              </uui-tag>
            </uui-table-cell>
            <uui-table-cell>${segment.memberCount}</uui-table-cell>
            <uui-table-cell>
              <uui-tag color=${segment.isActive ? "positive" : "warning"}>
                ${segment.isActive ? "Active" : "Inactive"}
              </uui-tag>
            </uui-table-cell>
            <uui-table-cell>
              ${!segment.isSystemSegment ? html`
                <uui-button label="Delete" color="danger" @click=${() => this._handleDelete(segment.id)}>
                  <uui-icon name="icon-delete"></uui-icon>
                </uui-button>
              ` : nothing}
            </uui-table-cell>
          </uui-table-row>
        `)}
      </uui-table>
    `;
  }

  static override styles = [css`
    :host {
      display: block;
      height: 100%;  /* Required for umb-body-layout scrolling */
    }

    #header {
      display: flex;
      justify-content: flex-end;
      padding: var(--uui-size-space-4) 0;
    }
  `];
}
```

### 6.7 Segment Detail Component

**File**: `src/Merchello/Client/src/customers/components/segment-detail.element.ts`

Following the **Workspace Editor Layout Pattern**:

```typescript
import { html, css, customElement, state, nothing } from "@umbraco-cms/backoffice/external/lit";
import { UmbLitElement } from "@umbraco-cms/backoffice/lit-element";
import { UMB_WORKSPACE_CONTEXT } from "@umbraco-cms/backoffice/workspace";
import type { UmbRoute } from "@umbraco-cms/backoffice/router";
import { UMB_NOTIFICATION_CONTEXT } from "@umbraco-cms/backoffice/notification";
import type { CustomerSegmentDetailDto } from "../types/customer-segment.types.js";

@customElement("merchello-segment-detail")
export class SegmentDetailElement extends UmbLitElement {
  @state() private _segment: CustomerSegmentDetailDto | undefined;
  @state() private _formData: Partial<CustomerSegmentDetailDto> = {};
  @state() private _fieldErrors: Record<string, string> = {};
  @state() private _isSaving = false;
  @state() private _activePath = "tab/details";
  @state() private _routerPath = "";

  #workspaceContext?: typeof UMB_WORKSPACE_CONTEXT.TYPE;
  #notificationContext?: typeof UMB_NOTIFICATION_CONTEXT.TYPE;

  private _routes: UmbRoute[] = [
    { path: "tab/details", component: () => html`` },
    { path: "tab/members", component: () => html`` },
    { path: "tab/criteria", component: () => html`` },
    { path: "tab/preview", component: () => html`` },
    { path: "", redirectTo: "tab/details" },
  ];

  constructor() {
    super();
    this.consumeContext(UMB_WORKSPACE_CONTEXT, (ctx) => {
      this.#workspaceContext = ctx;
      this.observe((ctx as any).segment, (segment: CustomerSegmentDetailDto | undefined) => {
        this._segment = segment;
        if (segment) {
          this._formData = { ...segment };
        }
      });
    });
    this.consumeContext(UMB_NOTIFICATION_CONTEXT, (ctx) => {
      this.#notificationContext = ctx;
    });
  }

  override render() {
    if (!this._segment) {
      return html`<uui-loader-bar></uui-loader-bar>`;
    }

    const isNew = !this._segment.id;
    const backHref = "section/merchello/workspace/merchello-customers/segments";

    return html`
      <umb-body-layout header-fit-height main-no-padding>
        <!-- Back button -->
        <uui-button slot="header" compact href=${backHref} label="Back to Segments" class="back-button">
          <uui-icon name="icon-arrow-left"></uui-icon>
        </uui-button>

        <!-- Header: icon + name input -->
        <div id="header" slot="header">
          <umb-icon name="icon-users"></umb-icon>
          <uui-input
            id="name-input"
            .value=${this._formData.name || ""}
            @input=${this._handleNameChange}
            placeholder="Enter segment name..."
            ?invalid=${!!this._fieldErrors.name}>
          </uui-input>
        </div>

        <!-- Inner layout with tabs -->
        <umb-body-layout header-fit-height header-no-padding>
          ${this._renderTabs()}

          <!-- Router slot for URL tracking (hidden) -->
          <umb-router-slot
            .routes=${this._routes}
            @init=${(e: any) => { this._routerPath = e.target.absoluteRouterPath; }}
            @change=${(e: any) => { this._activePath = e.target.localActiveViewPath; }}>
          </umb-router-slot>

          <!-- Tab content -->
          <div class="tab-content">
            ${this._renderActiveTabContent()}
          </div>
        </umb-body-layout>

        <!-- Footer -->
        <umb-footer-layout slot="footer">
          <uui-button
            slot="actions"
            look="primary"
            color="positive"
            @click=${this._handleSave}
            ?disabled=${this._isSaving}>
            ${this._isSaving ? "Saving..." : isNew ? "Create Segment" : "Save Changes"}
          </uui-button>
        </umb-footer-layout>
      </umb-body-layout>
    `;
  }

  private _renderTabs() {
    const isManual = this._formData.segmentType === "Manual";
    const isAutomated = this._formData.segmentType === "Automated";

    return html`
      <uui-tab-group slot="header">
        <uui-tab
          label="Details"
          href="${this._routerPath}/tab/details"
          ?active=${this._activePath.includes("tab/details")}>
          Details
          ${this._hasDetailsErrors() ? html`<uui-badge slot="extra" color="danger" attention>!</uui-badge>` : nothing}
        </uui-tab>
        ${isManual ? html`
          <uui-tab
            label="Members"
            href="${this._routerPath}/tab/members"
            ?active=${this._activePath.includes("tab/members")}>
            Members (${this._segment?.memberCount ?? 0})
          </uui-tab>
        ` : nothing}
        ${isAutomated ? html`
          <uui-tab
            label="Criteria"
            href="${this._routerPath}/tab/criteria"
            ?active=${this._activePath.includes("tab/criteria")}>
            Criteria
          </uui-tab>
          <uui-tab
            label="Preview"
            href="${this._routerPath}/tab/preview"
            ?active=${this._activePath.includes("tab/preview")}>
            Preview
          </uui-tab>
        ` : nothing}
      </uui-tab-group>
    `;
  }

  private _renderActiveTabContent() {
    if (this._activePath.includes("tab/members")) {
      return this._renderMembersTab();
    }
    if (this._activePath.includes("tab/criteria")) {
      return this._renderCriteriaTab();
    }
    if (this._activePath.includes("tab/preview")) {
      return this._renderPreviewTab();
    }
    return this._renderDetailsTab();
  }

  private _renderDetailsTab() {
    const isNew = !this._segment?.id;

    return html`
      <uui-box headline="Basic Information">
        <umb-property-layout label="Description" description="Optional description for this segment">
          <uui-textarea
            slot="editor"
            .value=${this._formData.description || ""}
            @input=${this._handleDescriptionChange}
            placeholder="Describe the purpose of this segment...">
          </uui-textarea>
        </umb-property-layout>

        <umb-property-layout
          label="Segment Type"
          description="Manual segments have hand-picked members. Automated segments use criteria rules."
          ?mandatory=${isNew}>
          <uui-select
            slot="editor"
            .options=${[
              { name: "Manual", value: "Manual", selected: this._formData.segmentType === "Manual" },
              { name: "Automated", value: "Automated", selected: this._formData.segmentType === "Automated" },
            ]}
            @change=${this._handleTypeChange}
            ?disabled=${!isNew}>
          </uui-select>
        </umb-property-layout>

        ${this._formData.segmentType === "Automated" ? html`
          <umb-property-layout
            label="Match Mode"
            description="How criteria rules are combined">
            <uui-select
              slot="editor"
              .options=${[
                { name: "All conditions (AND)", value: "All", selected: this._formData.matchMode === "All" },
                { name: "Any condition (OR)", value: "Any", selected: this._formData.matchMode === "Any" },
              ]}
              @change=${this._handleMatchModeChange}>
            </uui-select>
          </umb-property-layout>
        ` : nothing}
      </uui-box>

      <uui-box headline="Status">
        <umb-property-layout label="Active" description="Inactive segments are not evaluated for membership">
          <uui-toggle
            slot="editor"
            .checked=${this._formData.isActive ?? true}
            @change=${this._handleActiveChange}>
          </uui-toggle>
        </umb-property-layout>
      </uui-box>
    `;
  }

  private _renderMembersTab() {
    return html`
      <merchello-segment-members-table
        .segmentId=${this._segment?.id}
        @members-changed=${this._handleMembersChanged}>
      </merchello-segment-members-table>
    `;
  }

  private _renderCriteriaTab() {
    return html`
      <merchello-segment-criteria-builder
        .criteria=${this._formData.criteria || []}
        .matchMode=${this._formData.matchMode || "All"}
        @criteria-changed=${this._handleCriteriaChanged}>
      </merchello-segment-criteria-builder>
    `;
  }

  private _renderPreviewTab() {
    return html`
      <merchello-segment-preview .segmentId=${this._segment?.id}></merchello-segment-preview>
    `;
  }

  // ... event handlers ...

  static override styles = [css`
    :host {
      display: block;
      height: 100%;
      --uui-tab-background: var(--uui-color-surface);
    }

    .back-button {
      margin-right: var(--uui-size-space-2);
    }

    #header {
      display: flex;
      align-items: center;
      gap: var(--uui-size-space-3);
      flex: 1;
      padding: var(--uui-size-space-4) 0;
    }

    #header umb-icon {
      font-size: 24px;
      color: var(--uui-color-text-alt);
    }

    #name-input {
      flex: 1 1 auto;
      --uui-input-border-color: transparent;
      --uui-input-background-color: transparent;
      font-size: var(--uui-type-h5-size);
      font-weight: 700;
    }

    #name-input:hover,
    #name-input:focus-within {
      --uui-input-border-color: var(--uui-color-border);
      --uui-input-background-color: var(--uui-color-surface);
    }

    uui-tab-group {
      --uui-tab-divider: var(--uui-color-border);
      width: 100%;
    }

    umb-router-slot {
      display: none;
    }

    .tab-content {
      display: flex;
      flex-direction: column;
      gap: var(--uui-size-space-5);
    }

    uui-box {
      --uui-box-default-padding: var(--uui-size-space-5);
    }
  `];
}

export default SegmentDetailElement;
```

**Key patterns used:**
- `umb-body-layout` with `header-fit-height main-no-padding` for outer layout
- Inner `umb-body-layout` with `header-fit-height header-no-padding` for tabs
- `umb-router-slot` hidden but used for URL tracking (enables deep-linking to tabs)
- `umb-property-layout` for 2-column label/editor layout
- `umb-footer-layout` with save button in `actions` slot
- Tab validation badges using `uui-badge` with `slot="extra"`
- `:host { height: 100% }` for proper scrolling

### 6.8 Criteria Builder Component

**File**: `src/Merchello/Client/src/customers/components/segment-criteria-builder.element.ts`

Visual builder for criteria rules:

```
┌─────────────────────────────────────────────────────────────┐
│  Match customers where [All ▼] of these conditions are true │
├─────────────────────────────────────────────────────────────┤
│  [Order Count ▼] [is greater than ▼] [5    ] [×]           │
│  [Total Spend ▼] [is greater than ▼] [£200 ] [×]           │
│                                                             │
│  [+ Add condition]                                          │
├─────────────────────────────────────────────────────────────┤
│  Preview: 47 customers match these criteria                 │
└─────────────────────────────────────────────────────────────┘
```

### 6.9 Customer Picker Modal

**File**: `src/Merchello/Client/src/customers/modals/customer-picker-modal.token.ts`

```typescript
import { UmbModalToken } from "@umbraco-cms/backoffice/modal";

export interface CustomerPickerModalData {
  excludeCustomerIds?: string[];
  multiSelect?: boolean;
}

export interface CustomerPickerModalValue {
  selectedCustomerIds: string[];
}

export const CUSTOMER_PICKER_MODAL = new UmbModalToken<CustomerPickerModalData, CustomerPickerModalValue>(
  "Merchello.CustomerPicker.Modal",
  {
    modal: {
      type: "sidebar",
      size: "medium",
    },
  }
);
```

**File**: `src/Merchello/Client/src/customers/modals/customer-picker-modal.element.ts`

> **Note**: Uses search-based loading instead of loading all customers to support large customer bases.

```typescript
import { html, css, customElement, state, nothing } from "@umbraco-cms/backoffice/external/lit";
import { UmbModalBaseElement } from "@umbraco-cms/backoffice/modal";
import { MerchelloApi } from "@api/merchello-api.js";
import type { CustomerPickerModalData, CustomerPickerModalValue } from "./customer-picker-modal.token.js";

@customElement("merchello-customer-picker-modal")
export class CustomerPickerModalElement extends UmbModalBaseElement<CustomerPickerModalData, CustomerPickerModalValue> {
  @state() private _selectedIds: string[] = [];
  @state() private _customers: CustomerListItemDto[] = [];
  @state() private _isLoading = false;
  @state() private _searchTerm = "";
  @state() private _hasSearched = false;

  private async _handleSearch() {
    if (this._searchTerm.length < 2) return;

    this._isLoading = true;
    const { data } = await MerchelloApi.searchCustomers({
      search: this._searchTerm,
      excludeIds: this.data?.excludeCustomerIds,
      pageSize: 50
    });
    this._customers = data?.items ?? [];
    this._isLoading = false;
    this._hasSearched = true;
  }

  private _handleSubmit() {
    this.modalContext?.setValue({ selectedCustomerIds: this._selectedIds });
    this.modalContext?.submit();
  }

  override render() {
    return html`
      <umb-body-layout headline="Select Customers">
        <div class="search-container">
          <uui-input
            id="search-input"
            placeholder="Search by name or email..."
            .value=${this._searchTerm}
            @input=${(e: InputEvent) => this._searchTerm = (e.target as HTMLInputElement).value}
            @keydown=${(e: KeyboardEvent) => e.key === "Enter" && this._handleSearch()}>
            <uui-button slot="append" @click=${this._handleSearch} label="Search" compact>
              <uui-icon name="icon-search"></uui-icon>
            </uui-button>
          </uui-input>
        </div>

        ${this._isLoading
          ? html`<uui-loader-bar></uui-loader-bar>`
          : this._hasSearched
            ? this._customers.length > 0
              ? this._renderCustomerList()
              : html`<p class="empty-state">No customers found matching "${this._searchTerm}"</p>`
            : html`<p class="hint">Enter at least 2 characters to search</p>`}

        <div slot="actions">
          <uui-button label="Cancel" @click=${() => this.modalContext?.reject()}></uui-button>
          <uui-button
            label="Add Selected (${this._selectedIds.length})"
            look="primary"
            color="positive"
            @click=${this._handleSubmit}
            ?disabled=${this._selectedIds.length === 0}>
          </uui-button>
        </div>
      </umb-body-layout>
    `;
  }

  private _renderCustomerList() {
    return html`
      <uui-table>
        <uui-table-head>
          <uui-table-head-cell style="width: 50px;"></uui-table-head-cell>
          <uui-table-head-cell>Name</uui-table-head-cell>
          <uui-table-head-cell>Email</uui-table-head-cell>
        </uui-table-head>
        ${this._customers.map(customer => html`
          <uui-table-row
            selectable
            ?selected=${this._selectedIds.includes(customer.id)}
            @click=${() => this._toggleSelection(customer.id)}>
            <uui-table-cell>
              <uui-checkbox
                .checked=${this._selectedIds.includes(customer.id)}
                @change=${(e: Event) => {
                  e.stopPropagation();
                  this._toggleSelection(customer.id);
                }}>
              </uui-checkbox>
            </uui-table-cell>
            <uui-table-cell>${customer.firstName} ${customer.lastName}</uui-table-cell>
            <uui-table-cell>${customer.email}</uui-table-cell>
          </uui-table-row>
        `)}
      </uui-table>
    `;
  }

  private _toggleSelection(customerId: string) {
    if (this._selectedIds.includes(customerId)) {
      this._selectedIds = this._selectedIds.filter(id => id !== customerId);
    } else {
      this._selectedIds = [...this._selectedIds, customerId];
    }
  }

  static override styles = [css`
    .search-container {
      margin-bottom: var(--uui-size-space-4);
    }

    #search-input {
      width: 100%;
    }

    .hint, .empty-state {
      color: var(--uui-color-text-alt);
      text-align: center;
      padding: var(--uui-size-space-6);
    }
  `];
}

export default CustomerPickerModalElement;
```

**Usage in segment-members-table.element.ts:**

```typescript
import { UMB_MODAL_MANAGER_CONTEXT } from "@umbraco-cms/backoffice/modal";
import { CUSTOMER_PICKER_MODAL } from "../modals/customer-picker-modal.token.js";

// In component:
#modalManager?: typeof UMB_MODAL_MANAGER_CONTEXT.TYPE;

constructor() {
  super();
  this.consumeContext(UMB_MODAL_MANAGER_CONTEXT, (ctx) => {
    this.#modalManager = ctx;
  });
}

private async _handleAddCustomers() {
  const modal = this.#modalManager?.open(this, CUSTOMER_PICKER_MODAL, {
    data: {
      excludeCustomerIds: this._existingMemberIds,
      multiSelect: true,
    },
  });

  const result = await modal?.onSubmit();
  if (result?.selectedCustomerIds.length) {
    await MerchelloApi.addSegmentMembers(this._segmentId, result.selectedCustomerIds);
    this._loadMembers();
  }
}
```

---

## 7. Criteria Engine

### 7.1 Evaluation Logic

**File**: `src/Merchello.Core/Customers/Services/SegmentCriteriaEvaluator.cs`

```csharp
public class SegmentCriteriaEvaluator(
    IEFCoreScopeProvider<MerchelloDbContext> efCoreScopeProvider,
    ILogger<SegmentCriteriaEvaluator> logger) : ISegmentCriteriaEvaluator
{
    public async Task<bool> EvaluateAsync(Guid customerId, SegmentCriteriaSet criteriaSet, CancellationToken ct)
    {
        if (criteriaSet.Criteria.Count == 0)
            return false;

        // Get customer metrics
        var metrics = await GetCustomerMetricsAsync(customerId, ct);

        // Evaluate each criterion
        var results = criteriaSet.Criteria.Select(c => EvaluateCriterion(c, metrics));

        // Apply match mode
        return criteriaSet.MatchMode == SegmentMatchMode.All
            ? results.All(r => r)
            : results.Any(r => r);
    }

    /// <summary>
    /// DATE HANDLING: All dates are stored and compared in UTC.
    /// - Database dates: Stored as UTC (DateTime.UtcNow on creation)
    /// - Criteria dates: Expected in UTC format (ISO 8601)
    /// - DaysSinceLastOrder: Calculated from DateTime.UtcNow
    ///
    /// Frontend should convert local dates to UTC before sending criteria.
    /// Display dates should be converted to user's timezone in the UI.
    /// </summary>
    private async Task<CustomerMetrics> GetCustomerMetricsAsync(Guid customerId, CancellationToken ct)
    {
        using var scope = efCoreScopeProvider.CreateScope();
        var result = await scope.ExecuteWithContextAsync(async db =>
        {
            // Get customer record for Tags
            var customer = await db.Customers
                .AsNoTracking()
                .FirstOrDefaultAsync(c => c.Id == customerId, ct);

            // Query customer order history for metrics
            // Note: Excludes deleted and cancelled invoices from metrics
            var orderStats = await db.Invoices
                .Where(i => i.CustomerId == customerId && !i.IsDeleted && !i.IsCancelled)
                .GroupBy(i => i.CustomerId)
                .Select(g => new
                {
                    OrderCount = g.Count(),
                    TotalSpend = g.Sum(i => i.TotalInStoreCurrency ?? i.Total),
                    FirstOrderDate = g.Min(i => i.DateCreated),
                    LastOrderDate = g.Max(i => i.DateCreated)
                })
                .FirstOrDefaultAsync(ct);

            return new CustomerMetrics
            {
                OrderCount = orderStats?.OrderCount ?? 0,
                TotalSpend = orderStats?.TotalSpend ?? 0,
                FirstOrderDate = orderStats?.FirstOrderDate,
                LastOrderDate = orderStats?.LastOrderDate,
                DaysSinceLastOrder = orderStats?.LastOrderDate != null
                    ? (DateTime.UtcNow - orderStats.LastOrderDate.Value).Days
                    : (int?)null,

                // Customer properties
                DateCreated = customer?.DateCreated,
                Email = customer?.Email,
                Country = customer?.DefaultBillingAddress?.Country,

                // Tags - stored as List<string> on customer
                Tags = customer?.Tags ?? []
            };
        });
        scope.Complete();
        return result;
    }

    private bool EvaluateCriterion(SegmentCriteria criterion, CustomerMetrics metrics)
    {
        // Special handling for Tag criteria
        if (criterion.Field == "Tag")
        {
            var tagValue = criterion.Value?.ToString() ?? "";
            return criterion.Operator switch
            {
                SegmentCriteriaOperator.Contains => metrics.Tags.Contains(tagValue, StringComparer.OrdinalIgnoreCase),
                SegmentCriteriaOperator.NotContains => !metrics.Tags.Contains(tagValue, StringComparer.OrdinalIgnoreCase),
                SegmentCriteriaOperator.IsEmpty => metrics.Tags.Count == 0,
                SegmentCriteriaOperator.IsNotEmpty => metrics.Tags.Count > 0,
                _ => false
            };
        }

        // Standard field evaluation
        var fieldValue = GetFieldValue(criterion.Field, metrics);
        return criterion.Operator switch
        {
            SegmentCriteriaOperator.Equals => Equals(fieldValue, criterion.Value),
            SegmentCriteriaOperator.NotEquals => !Equals(fieldValue, criterion.Value),
            SegmentCriteriaOperator.GreaterThan => Compare(fieldValue, criterion.Value) > 0,
            SegmentCriteriaOperator.GreaterThanOrEqual => Compare(fieldValue, criterion.Value) >= 0,
            SegmentCriteriaOperator.LessThan => Compare(fieldValue, criterion.Value) < 0,
            SegmentCriteriaOperator.LessThanOrEqual => Compare(fieldValue, criterion.Value) <= 0,
            SegmentCriteriaOperator.Between => Compare(fieldValue, criterion.Value) >= 0
                                            && Compare(fieldValue, criterion.Value2) <= 0,
            SegmentCriteriaOperator.Contains => fieldValue?.ToString()?.Contains(criterion.Value?.ToString() ?? "", StringComparison.OrdinalIgnoreCase) ?? false,
            SegmentCriteriaOperator.IsEmpty => fieldValue == null || string.IsNullOrEmpty(fieldValue.ToString()),
            SegmentCriteriaOperator.IsNotEmpty => fieldValue != null && !string.IsNullOrEmpty(fieldValue.ToString()),
            _ => false
        };
    }
}
```

### 7.2 Available Criteria Fields

| Field | Label | Value Type | Description |
|-------|-------|------------|-------------|
| `OrderCount` | Order Count | Number | Total completed orders |
| `TotalSpend` | Total Spend | Currency | Lifetime spend amount |
| `AverageOrderValue` | Average Order Value | Currency | Average order amount |
| `FirstOrderDate` | First Order Date | Date (UTC) | Date of first order (stored/compared in UTC) |
| `LastOrderDate` | Last Order Date | Date (UTC) | Date of most recent order (stored/compared in UTC) |
| `DaysSinceLastOrder` | Days Since Last Order | Number | Days since last purchase (calculated from UTC now) |
| `DateCreated` | Customer Since | Date (UTC) | Account creation date (stored/compared in UTC) |
| `Email` | Email | String | Customer email address |
| `Country` | Country | String | Billing/shipping country |
| `Tag` | Customer Tag | String | Check if customer has specific tag (case-insensitive) |

**Tag Operators**: `Contains`, `NotContains`, `IsEmpty`, `IsNotEmpty`

---

## 8. Implementation Phases

### Phase 1: Foundation

**Database & Core Models**
- [ ] Create CustomerSegment entity
- [ ] Create CustomerSegmentMember entity
- [ ] Create enums and criteria models
- [ ] Create EF Core mappings
- [ ] Run migrations
- [ ] Create CustomerSegmentFactory

**Deliverable**: Database ready for segments

### Phase 2: Manual Segments

**Service Layer**
- [ ] Implement ICustomerSegmentService (CRUD)
- [ ] Implement manual membership methods
- [ ] Create API controller
- [ ] Add system segment initializer

**Deliverable**: Can create manual segments and add members via API

### Phase 3: Automated Segments

**Criteria Engine**
- [ ] Implement ISegmentCriteriaEvaluator
- [ ] Add customer metrics queries
- [ ] Implement IsCustomerInSegmentAsync
- [ ] Add criteria validation

**Deliverable**: Automated segments evaluate criteria correctly

### Phase 4: Frontend - List & Manual

**List View**
- [ ] Create segments-list.element.ts
- [ ] Create segment-detail.element.ts (manual mode)
- [ ] Create customer-picker-modal
- [ ] Add API methods

**Deliverable**: Can manage manual segments in UI

### Phase 5: Frontend - Criteria Builder

**Automated Segments UI**
- [ ] Create segment-criteria-builder.element.ts
- [ ] Add preview functionality
- [ ] Implement match mode toggle
- [ ] Show estimated member count

**Deliverable**: Full segment management in backoffice

### Phase 6: Testing & Polish

**Testing**
- [ ] Unit tests for criteria evaluator
- [ ] Integration tests for API
- [ ] E2E tests for UI flows

**Polish**
- [ ] Error handling
- [ ] Loading states
- [ ] Validation messages

**Deliverable**: Production-ready segment system

---

## 9. Testing Strategy

### 9.1 Unit Tests

```csharp
public class SegmentCriteriaEvaluatorTests
{
    [Fact]
    public async Task EvaluateAsync_OrderCountEquals_MatchesCorrectly()
    {
        // Arrange
        var evaluator = CreateEvaluator();
        var criteria = new SegmentCriteriaSet
        {
            Criteria = [new SegmentCriteria
            {
                Field = "OrderCount",
                Operator = SegmentCriteriaOperator.Equals,
                Value = 0
            }],
            MatchMode = SegmentMatchMode.All
        };

        // Act - customer with no orders
        var result = await evaluator.EvaluateAsync(newCustomerId, criteria);

        // Assert
        result.ShouldBeTrue();
    }

    [Fact]
    public async Task EvaluateAsync_MatchModeAny_MatchesIfAnyTrue()
    {
        // Arrange
        var criteria = new SegmentCriteriaSet
        {
            Criteria = [
                new SegmentCriteria { Field = "OrderCount", Operator = SegmentCriteriaOperator.GreaterThan, Value = 100 }, // false
                new SegmentCriteria { Field = "TotalSpend", Operator = SegmentCriteriaOperator.GreaterThan, Value = 10 }   // true
            ],
            MatchMode = SegmentMatchMode.Any
        };

        // Act
        var result = await evaluator.EvaluateAsync(customerId, criteria);

        // Assert
        result.ShouldBeTrue();
    }
}
```

### 9.2 Integration Tests

```csharp
public class CustomerSegmentApiTests : IntegrationTestBase
{
    [Fact]
    public async Task CreateSegment_AutomatedWithCriteria_CreatesSuccessfully()
    {
        // Arrange
        var request = new CreateCustomerSegmentDto
        {
            Name = "High Spenders",
            SegmentType = CustomerSegmentType.Automated,
            Criteria = [new SegmentCriteriaDto
            {
                Field = "TotalSpend",
                Operator = "GreaterThan",
                Value = 500
            }],
            MatchMode = SegmentMatchMode.All
        };

        // Act
        var response = await _client.PostAsJsonAsync("/umbraco/merchello/api/v1/customer-segments", request);

        // Assert
        response.StatusCode.ShouldBe(HttpStatusCode.Created);
        var segment = await response.Content.ReadFromJsonAsync<CustomerSegmentDetailDto>();
        segment.ShouldNotBeNull();
        segment.Criteria.ShouldNotBeEmpty();
    }
}
```

---

## Appendix A: Key File Paths

### Backend

| Purpose | Path |
|---------|------|
| Segment Models | `src/Merchello.Core/Customers/Models/` |
| Segment Service | `src/Merchello.Core/Customers/Services/CustomerSegmentService.cs` |
| Criteria Evaluator | `src/Merchello.Core/Customers/Services/SegmentCriteriaEvaluator.cs` |
| Segment Factory | `src/Merchello.Core/Customers/Factories/CustomerSegmentFactory.cs` |
| Segment API | `src/Merchello/Controllers/CustomerSegmentsApiController.cs` |

### Frontend

| Purpose | Path |
|---------|------|
| Manifests | `src/Merchello/Client/src/customers/manifest.ts` |
| Types | `src/Merchello/Client/src/customers/types/segment.types.ts` |
| List View | `src/Merchello/Client/src/customers/components/segments-list.element.ts` |
| Detail View | `src/Merchello/Client/src/customers/components/segment-detail.element.ts` |
| Criteria Builder | `src/Merchello/Client/src/customers/components/segment-criteria-builder.element.ts` |

## Appendix B: Related Documentation

- [Architecture-Diagrams.md](Architecture-Diagrams.md) - Centralized methods and factory patterns
- [Umbraco-EF-Core.md](Umbraco-EF-Core.md) - Database and migration patterns
- [Umbraco-Backoffice-Dev.md](Umbraco-Backoffice-Dev.md) - Frontend component patterns
