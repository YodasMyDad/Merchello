# Gift Cards System

## Overview

A complete gift card system enabling gift card purchases, balance tracking, partial redemption, and store credit from returns.

## Gap Analysis

| Feature | Shopify | Merchello | Status |
|---------|---------|-----------|--------|
| Gift card products | Yes | No | **Missing** |
| Digital delivery | Yes | No | **Missing** |
| Physical cards | Yes | No | **Missing** |
| Balance tracking | Yes | No | **Missing** |
| Partial redemption | Yes | No | **Missing** |
| Store credit | Yes | No | **Missing** |
| Checkout integration | Yes | No | **Missing** |
| Split payments | Yes | No | **Missing** |

---

## Entity Models

### Location: `src/Merchello.Core/GiftCards/Models/`

### GiftCard.cs

```csharp
public class GiftCard
{
    public Guid Id { get; set; } = GuidExtensions.NewSequentialGuid;

    // Card identification
    public string Code { get; set; } = string.Empty;  // Unique redemption code
    public string? Pin { get; set; }  // Optional PIN for security
    public GiftCardType CardType { get; set; } = GiftCardType.Digital;

    // Balance
    public decimal InitialBalance { get; set; }
    public decimal CurrentBalance { get; set; }
    public string CurrencyCode { get; set; } = "USD";

    // Status
    public GiftCardStatus Status { get; set; } = GiftCardStatus.Inactive;
    public bool IsReloadable { get; set; }

    // Ownership
    public Guid? PurchasedByCustomerId { get; set; }
    public Customer? PurchasedByCustomer { get; set; }
    public Guid? IssuedToCustomerId { get; set; }
    public Customer? IssuedToCustomer { get; set; }
    public string? RecipientEmail { get; set; }
    public string? RecipientName { get; set; }
    public string? PersonalMessage { get; set; }

    // Purchase info
    public Guid? SourceInvoiceId { get; set; }
    public Guid? SourceLineItemId { get; set; }

    // Validity
    public DateTime? ActivationDate { get; set; }
    public DateTime? ExpirationDate { get; set; }

    // Physical card info
    public string? PhysicalCardNumber { get; set; }
    public string? BatchNumber { get; set; }

    // Transactions
    public virtual ICollection<GiftCardTransaction>? Transactions { get; set; }

    // Dates
    public DateTime DateCreated { get; set; } = DateTime.UtcNow;
    public DateTime DateUpdated { get; set; } = DateTime.UtcNow;

    public Dictionary<string, object> ExtendedData { get; set; } = [];
}
```

### GiftCardTransaction.cs

```csharp
public class GiftCardTransaction
{
    public Guid Id { get; set; } = GuidExtensions.NewSequentialGuid;
    public Guid GiftCardId { get; set; }
    public GiftCard? GiftCard { get; set; }

    public GiftCardTransactionType TransactionType { get; set; }
    public decimal Amount { get; set; }  // Positive for credits, negative for debits
    public decimal BalanceAfter { get; set; }

    // Reference to related entities
    public Guid? InvoiceId { get; set; }
    public Guid? PaymentId { get; set; }
    public Guid? ReturnId { get; set; }

    public string? Description { get; set; }
    public string? TransactionReference { get; set; }
    public string? PerformedBy { get; set; }

    public DateTime DateCreated { get; set; } = DateTime.UtcNow;
}
```

### Enums

```csharp
public enum GiftCardType
{
    Digital = 1,
    Physical = 2,
    StoreCredit = 3  // Issued from returns
}

public enum GiftCardStatus
{
    Inactive = 0,     // Not yet activated
    Active = 10,      // Ready to use
    Depleted = 20,    // Zero balance
    Expired = 30,     // Past expiration
    Suspended = 40,   // Temporarily disabled
    Cancelled = 50    // Permanently disabled
}

public enum GiftCardTransactionType
{
    Activation = 1,
    Redemption = 2,
    Reload = 3,
    Refund = 4,
    Adjustment = 5,
    Expiration = 6,
    Transfer = 7,
    Cancellation = 8
}
```

---

## DTOs

### Location: `src/Merchello.Core/GiftCards/Dtos/`

| DTO | Purpose |
|-----|---------|
| `GiftCardDto` | Read model for API responses |
| `GiftCardDetailDto` | Full details with transactions |
| `GiftCardListItemDto` | List/table display |
| `CreateGiftCardDto` | Admin creation |
| `PurchaseGiftCardDto` | Checkout purchase |
| `RedeemGiftCardDto` | Apply to checkout |
| `CheckBalanceDto` | Balance lookup request |
| `CheckBalanceResultDto` | Balance lookup response |

### Key DTOs

```csharp
public class CreateGiftCardDto
{
    public decimal InitialBalance { get; set; }
    public string CurrencyCode { get; set; } = "USD";
    public GiftCardType CardType { get; set; } = GiftCardType.Digital;
    public bool IsReloadable { get; set; }
    public DateTime? ExpirationDate { get; set; }
    public string? RecipientEmail { get; set; }
    public string? RecipientName { get; set; }
    public string? PersonalMessage { get; set; }
    public bool ActivateImmediately { get; set; } = true;
}

public class RedeemGiftCardDto
{
    public string Code { get; set; } = string.Empty;
    public string? Pin { get; set; }
    public decimal? Amount { get; set; }  // Null = use full balance
}

public class CheckBalanceResultDto
{
    public bool IsValid { get; set; }
    public decimal? CurrentBalance { get; set; }
    public string? CurrencyCode { get; set; }
    public DateTime? ExpirationDate { get; set; }
    public string? ErrorMessage { get; set; }
}
```

---

## Service Interface

### Location: `src/Merchello.Core/GiftCards/Services/Interfaces/IGiftCardService.cs`

```csharp
public interface IGiftCardService
{
    // Card lifecycle
    Task<CrudResult<GiftCard>> CreateGiftCardAsync(
        CreateGiftCardParameters parameters,
        CancellationToken cancellationToken = default);

    Task<CrudResult<GiftCard>> ActivateGiftCardAsync(
        Guid giftCardId,
        CancellationToken cancellationToken = default);

    Task<CrudResult<GiftCard>> SuspendGiftCardAsync(
        Guid giftCardId,
        string reason,
        CancellationToken cancellationToken = default);

    Task<CrudResult<GiftCard>> CancelGiftCardAsync(
        Guid giftCardId,
        string reason,
        CancellationToken cancellationToken = default);

    // Balance operations
    Task<RedemptionResult> RedeemAsync(
        RedeemGiftCardParameters parameters,
        CancellationToken cancellationToken = default);

    Task<CrudResult<GiftCard>> ReloadAsync(
        ReloadGiftCardParameters parameters,
        CancellationToken cancellationToken = default);

    Task<CrudResult<GiftCard>> RefundToGiftCardAsync(
        RefundToGiftCardParameters parameters,
        CancellationToken cancellationToken = default);

    Task<CrudResult<GiftCard>> AdjustBalanceAsync(
        AdjustGiftCardBalanceParameters parameters,
        CancellationToken cancellationToken = default);

    // Queries
    Task<CheckBalanceResult> CheckBalanceAsync(
        string code,
        string? pin = null,
        CancellationToken cancellationToken = default);

    Task<GiftCard?> GetGiftCardAsync(Guid id, CancellationToken cancellationToken = default);
    Task<GiftCard?> GetGiftCardByCodeAsync(string code, CancellationToken cancellationToken = default);
    Task<IEnumerable<GiftCard>> GetGiftCardsForCustomerAsync(Guid customerId, CancellationToken cancellationToken = default);
    Task<PaginatedList<GiftCard>> QueryGiftCardsAsync(GiftCardQueryParameters parameters, CancellationToken cancellationToken = default);
    Task<IEnumerable<GiftCardTransaction>> GetTransactionsAsync(Guid giftCardId, CancellationToken cancellationToken = default);

    // Utility
    string GenerateCode();
    string GeneratePin();
    Task<bool> ValidateCodeAsync(string code, string? pin = null, CancellationToken cancellationToken = default);
}
```

---

## Checkout Integration

### Gift Card Payment Provider

Location: `src/Merchello.Core/GiftCards/Providers/GiftCardPaymentProvider.cs`

```csharp
public class GiftCardPaymentProvider : PaymentProviderBase
{
    public override PaymentProviderMetadata Metadata => new()
    {
        Alias = "gift-card",
        Name = "Gift Card",
        SupportsRefunds = true,
        SupportsPartialRefunds = true,
        SupportsPartialPayments = true,  // Key: enables split payments
        IntegrationType = PaymentIntegrationType.Inline
    };

    public override async Task<PaymentResult> ProcessPaymentAsync(
        ProcessPaymentRequest request,
        CancellationToken cancellationToken = default)
    {
        // Extract gift card code from request
        // Validate and redeem from gift card service
        // Return success with transaction details
    }

    public override async Task<RefundResult> RefundPaymentAsync(
        RefundRequest request,
        CancellationToken cancellationToken = default)
    {
        // Refund back to gift card balance
    }
}
```

### Split Payment Support

Add to `ICheckoutService`:

```csharp
public async Task<CrudResult<Invoice>> ProcessMultiPaymentCheckoutAsync(
    MultiPaymentCheckoutParameters parameters,
    CancellationToken cancellationToken = default)
{
    // 1. Apply gift card payment first
    // 2. Calculate remaining balance
    // 3. Process remaining with primary payment method
    // 4. Create invoice with multiple payment records
}
```

### Line Item Type

Add to `LineItemType` enum:

```csharp
public enum LineItemType
{
    Product = 0,
    Addon = 1,
    Shipping = 2,
    Tax = 3,
    Discount = 4,
    GiftCard = 5,  // NEW: Gift card purchase
    Fee = 6
}
```

---

## Notifications

### Location: `src/Merchello.Core/Notifications/GiftCard/`

| Notification | Cancelable | Description |
|--------------|------------|-------------|
| `GiftCardCreatingNotification` | Yes | Before creation |
| `GiftCardCreatedNotification` | No | After creation |
| `GiftCardActivatingNotification` | Yes | Before activation |
| `GiftCardActivatedNotification` | No | After activation |
| `GiftCardRedeemingNotification` | Yes | Before redemption |
| `GiftCardRedeemedNotification` | No | After redemption |
| `GiftCardReloadingNotification` | Yes | Before reload |
| `GiftCardReloadedNotification` | No | After reload |
| `GiftCardBalanceAdjustedNotification` | No | After manual adjustment |
| `GiftCardExpiringNotification` | No | Warning before expiration |
| `GiftCardExpiredNotification` | No | After expiration |
| `GiftCardSuspendedNotification` | No | After suspension |
| `GiftCardCancelledNotification` | No | After cancellation |

---

## API Endpoints

### Backoffice: `src/Merchello/Controllers/GiftCardsApiController.cs`

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/gift-cards` | Query gift cards |
| GET | `/gift-cards/{id}` | Get gift card details |
| GET | `/gift-cards/by-code/{code}` | Get by code |
| POST | `/gift-cards` | Create gift card |
| POST | `/gift-cards/{id}/activate` | Activate |
| POST | `/gift-cards/{id}/suspend` | Suspend |
| POST | `/gift-cards/{id}/cancel` | Cancel |
| POST | `/gift-cards/{id}/reload` | Add balance |
| POST | `/gift-cards/{id}/adjust` | Adjust balance |
| GET | `/gift-cards/{id}/transactions` | Get transactions |

### Storefront: `src/Merchello/Controllers/CheckoutGiftCardsApiController.cs`

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/checkout/gift-cards/check-balance` | Check balance |
| POST | `/checkout/gift-cards/apply` | Apply to basket |
| DELETE | `/checkout/gift-cards/{id}` | Remove from basket |

---

## Frontend Components

### Location: `src/Merchello/Client/src/gift-cards/`

```
gift-cards/
  components/
    gift-cards-list.element.ts
    gift-card-detail.element.ts
    gift-card-transactions.element.ts
    gift-card-balance-display.element.ts
  modals/
    create-gift-card-modal.element.ts
    reload-gift-card-modal.element.ts
    adjust-balance-modal.element.ts
    suspend-gift-card-modal.element.ts
  contexts/
    gift-cards-workspace.context.ts
  types/
    gift-cards.types.ts
  manifest.ts
```

---

## Code Generation

### GiftCardFactory.cs

```csharp
public class GiftCardFactory
{
    public string GenerateCode()
        => $"GC-{Guid.NewGuid().ToString()[..12].ToUpperInvariant()}";

    public string GeneratePin()
        => new Random().Next(1000, 9999).ToString();
}
```

---

## Database Changes

Add to `MerchelloDbContext.cs`:

```csharp
public DbSet<GiftCard> GiftCards => Set<GiftCard>();
public DbSet<GiftCardTransaction> GiftCardTransactions => Set<GiftCardTransaction>();
```

Create mapping: `src/Merchello.Core/GiftCards/Mapping/GiftCardDbMapping.cs`

---

## Integration Points

1. **ICheckoutService** - Apply gift card at checkout
2. **IPaymentService** - Gift card as payment method
3. **IReturnService** - Refund to store credit option

---

## Implementation Sequence

1. Create entity models and enums
2. Create EF mappings and migration
3. Create factory
4. Create DTOs
5. Create service interface and implementation
6. Create gift card payment provider
7. Create notifications
8. Create API controllers (backoffice + storefront)
9. Integrate with checkout service
10. Register in DI
11. Create frontend components
