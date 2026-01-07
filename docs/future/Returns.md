# Returns/RMA System

## Overview

A complete returns management system (RMA - Return Merchandise Authorization) enabling customers to request returns and staff to process refunds, exchanges, and restocking.

## Gap Analysis

| Feature | Shopify | Merchello | Status |
|---------|---------|-----------|--------|
| Return requests | Yes | No | **Missing** |
| Return reasons | Yes | No | **Missing** |
| Return shipping | Yes | No | **Missing** |
| Refund processing | Yes | Partial (refunds exist) | **Extend** |
| Restocking | Yes | No | **Missing** |
| Exchanges | Yes | No | **Missing** |
| Store credit | Yes | No | **Missing** |

---

## Entity Models

### Location: `src/Merchello.Core/Returns/Models/`

### Return.cs

```csharp
public class Return
{
    public Guid Id { get; set; } = GuidExtensions.NewSequentialGuid;
    public Guid InvoiceId { get; set; }
    public Invoice? Invoice { get; set; }
    public Guid? OrderId { get; set; }
    public Order? Order { get; set; }
    public Guid CustomerId { get; set; }

    // RMA tracking
    public string RmaNumber { get; set; } = string.Empty;  // e.g., "RMA-0001"
    public ReturnStatus Status { get; set; } = ReturnStatus.Requested;
    public ReturnType ReturnType { get; set; } = ReturnType.Refund;

    // Request details
    public string CustomerNotes { get; set; } = string.Empty;
    public string? StaffNotes { get; set; }

    // Processing details
    public string? ApprovedBy { get; set; }
    public string? RejectionReason { get; set; }
    public string? TrackingNumber { get; set; }
    public string? Carrier { get; set; }

    // Financial
    public decimal RefundAmount { get; set; }
    public decimal RestockingFee { get; set; }
    public string CurrencyCode { get; set; } = "USD";
    public decimal? RefundAmountInStoreCurrency { get; set; }

    // Related records
    public Guid? RefundPaymentId { get; set; }
    public Payment? RefundPayment { get; set; }
    public Guid? GiftCardId { get; set; }  // If refunded to store credit

    // Line items
    public virtual ICollection<ReturnLineItem>? LineItems { get; set; }

    // Dates
    public DateTime DateRequested { get; set; } = DateTime.UtcNow;
    public DateTime? DateApproved { get; set; }
    public DateTime? DateRejected { get; set; }
    public DateTime? DateReceived { get; set; }
    public DateTime? DateCompleted { get; set; }
    public DateTime DateCreated { get; set; } = DateTime.UtcNow;
    public DateTime DateUpdated { get; set; } = DateTime.UtcNow;

    public Dictionary<string, object> ExtendedData { get; set; } = [];
}
```

### ReturnLineItem.cs

```csharp
public class ReturnLineItem
{
    public Guid Id { get; set; } = GuidExtensions.NewSequentialGuid;
    public Guid ReturnId { get; set; }
    public Return? Return { get; set; }

    public Guid OriginalLineItemId { get; set; }
    public LineItem? OriginalLineItem { get; set; }
    public Guid? ProductId { get; set; }
    public Guid? WarehouseId { get; set; }

    public string? Sku { get; set; }
    public string? Name { get; set; }
    public int QuantityRequested { get; set; }
    public int QuantityReceived { get; set; }
    public int QuantityRestocked { get; set; }

    public decimal UnitPrice { get; set; }
    public decimal RefundAmount { get; set; }

    public Guid ReturnReasonId { get; set; }
    public ReturnReason? ReturnReason { get; set; }
    public string? CustomerComments { get; set; }

    public ReturnLineItemCondition Condition { get; set; } = ReturnLineItemCondition.Unknown;
    public bool ShouldRestock { get; set; } = true;

    public DateTime DateCreated { get; set; } = DateTime.UtcNow;
}
```

### ReturnReason.cs

```csharp
public class ReturnReason
{
    public Guid Id { get; set; } = GuidExtensions.NewSequentialGuid;
    public string Name { get; set; } = string.Empty;
    public string? Description { get; set; }
    public bool RequiresCustomerComment { get; set; }
    public bool IsActive { get; set; } = true;
    public int SortOrder { get; set; }
    public DateTime DateCreated { get; set; } = DateTime.UtcNow;
}
```

### Enums

```csharp
public enum ReturnStatus
{
    Requested = 10,      // Customer submitted return request
    Pending = 20,        // Awaiting staff review
    Approved = 30,       // Return approved, awaiting return shipment
    Rejected = 40,       // Return rejected
    InTransit = 50,      // Items being shipped back
    Received = 60,       // Items received at warehouse
    Processing = 70,     // Processing refund/exchange
    Completed = 80,      // Return fully processed
    Cancelled = 90       // Return cancelled
}

public enum ReturnType
{
    Refund = 1,
    Exchange = 2,
    StoreCredit = 3
}

public enum ReturnLineItemCondition
{
    Unknown = 0,
    New = 1,             // Unopened, resellable
    LikeNew = 2,         // Opened but unused
    Used = 3,            // Used but good condition
    Damaged = 4,         // Damaged, not resellable
    Defective = 5        // Manufacturing defect
}
```

---

## DTOs

### Location: `src/Merchello.Core/Returns/Dtos/`

| DTO | Purpose |
|-----|---------|
| `ReturnDto` | Read model for API responses |
| `ReturnDetailDto` | Full details with line items |
| `ReturnListItemDto` | List/table display |
| `CreateReturnRequestDto` | Customer-facing return request |
| `ApproveReturnDto` | Staff approval with notes |
| `RejectReturnDto` | Staff rejection with reason |
| `ReceiveReturnDto` | Mark items as received |
| `ProcessRefundDto` | Complete the refund |

### CreateReturnRequestDto.cs

```csharp
public class CreateReturnRequestDto
{
    public Guid InvoiceId { get; set; }
    public Guid? OrderId { get; set; }
    public List<CreateReturnLineItemDto> LineItems { get; set; } = [];
    public string? CustomerNotes { get; set; }
    public ReturnType ReturnType { get; set; } = ReturnType.Refund;
}

public class CreateReturnLineItemDto
{
    public Guid LineItemId { get; set; }
    public int Quantity { get; set; }
    public Guid ReturnReasonId { get; set; }
    public string? Comments { get; set; }
}
```

---

## Service Interface

### Location: `src/Merchello.Core/Returns/Services/Interfaces/IReturnService.cs`

```csharp
public interface IReturnService
{
    // Return request lifecycle
    Task<CrudResult<Return>> CreateReturnRequestAsync(
        CreateReturnRequestParameters parameters,
        CancellationToken cancellationToken = default);

    Task<CrudResult<Return>> ApproveReturnAsync(
        ApproveReturnParameters parameters,
        CancellationToken cancellationToken = default);

    Task<CrudResult<Return>> RejectReturnAsync(
        RejectReturnParameters parameters,
        CancellationToken cancellationToken = default);

    Task<CrudResult<Return>> ReceiveReturnAsync(
        ReceiveReturnParameters parameters,
        CancellationToken cancellationToken = default);

    Task<CrudResult<Return>> ProcessRefundAsync(
        ProcessReturnRefundParameters parameters,
        CancellationToken cancellationToken = default);

    Task<CrudResult<bool>> RestockItemsAsync(
        RestockReturnItemsParameters parameters,
        CancellationToken cancellationToken = default);

    Task<CrudResult<Return>> CancelReturnAsync(
        Guid returnId,
        string reason,
        CancellationToken cancellationToken = default);

    // Queries
    Task<Return?> GetReturnAsync(Guid returnId, CancellationToken cancellationToken = default);
    Task<Return?> GetReturnByRmaNumberAsync(string rmaNumber, CancellationToken cancellationToken = default);
    Task<IEnumerable<Return>> GetReturnsForInvoiceAsync(Guid invoiceId, CancellationToken cancellationToken = default);
    Task<IEnumerable<Return>> GetReturnsForCustomerAsync(Guid customerId, CancellationToken cancellationToken = default);
    Task<PaginatedList<Return>> QueryReturnsAsync(ReturnQueryParameters parameters, CancellationToken cancellationToken = default);

    // Return reasons (configurable)
    Task<IEnumerable<ReturnReason>> GetReturnReasonsAsync(CancellationToken cancellationToken = default);
    Task<CrudResult<ReturnReason>> CreateReturnReasonAsync(CreateReturnReasonParameters parameters, CancellationToken cancellationToken = default);
    Task<CrudResult<ReturnReason>> UpdateReturnReasonAsync(UpdateReturnReasonParameters parameters, CancellationToken cancellationToken = default);
    Task<CrudResult<bool>> DeleteReturnReasonAsync(Guid reasonId, CancellationToken cancellationToken = default);

    // Utility
    Task<bool> CanReturnLineItemAsync(Guid lineItemId, CancellationToken cancellationToken = default);
    Task<ReturnEligibility> GetReturnEligibilityAsync(Guid invoiceId, CancellationToken cancellationToken = default);
    string GenerateRmaNumber();
}
```

---

## Notifications

### Location: `src/Merchello.Core/Notifications/Return/`

| Notification | Cancelable | Description |
|--------------|------------|-------------|
| `ReturnRequestingNotification` | Yes | Before return request |
| `ReturnRequestedNotification` | No | After return request created |
| `ReturnApprovingNotification` | Yes | Before approval |
| `ReturnApprovedNotification` | No | After approval |
| `ReturnRejectingNotification` | Yes | Before rejection |
| `ReturnRejectedNotification` | No | After rejection |
| `ReturnReceivingNotification` | Yes | Before receiving items |
| `ReturnReceivedNotification` | No | After items received |
| `ReturnRefundingNotification` | Yes | Before refund processed |
| `ReturnRefundedNotification` | No | After refund processed |
| `ReturnStatusChangingNotification` | Yes | Any status change |
| `ReturnStatusChangedNotification` | No | After status change |

---

## API Endpoints

### Location: `src/Merchello/Controllers/ReturnsApiController.cs`

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/returns` | Query returns with pagination |
| GET | `/returns/{id}` | Get return details |
| GET | `/returns/by-rma/{rmaNumber}` | Get by RMA number |
| GET | `/invoices/{invoiceId}/returns` | Get returns for invoice |
| POST | `/invoices/{invoiceId}/returns` | Create return request |
| POST | `/returns/{id}/approve` | Approve return |
| POST | `/returns/{id}/reject` | Reject return |
| POST | `/returns/{id}/receive` | Mark items received |
| POST | `/returns/{id}/refund` | Process refund |
| POST | `/returns/{id}/restock` | Restock items |
| POST | `/returns/{id}/cancel` | Cancel return |
| GET | `/return-reasons` | Get available reasons |
| POST | `/return-reasons` | Create reason |
| PUT | `/return-reasons/{id}` | Update reason |
| DELETE | `/return-reasons/{id}` | Delete reason |

---

## Frontend Components

### Location: `src/Merchello/Client/src/returns/`

```
returns/
  components/
    returns-list.element.ts
    return-detail.element.ts
    return-timeline.element.ts
    return-line-items.element.ts
  modals/
    approve-return-modal.element.ts
    reject-return-modal.element.ts
    receive-return-modal.element.ts
    process-refund-modal.element.ts
  contexts/
    returns-workspace.context.ts
  types/
    returns.types.ts
  manifest.ts
```

---

## Workflow

```
Customer Request → Staff Review → Approved/Rejected
                                      ↓
                              Return Shipping
                                      ↓
                              Items Received
                                      ↓
                              Refund Processed
                                      ↓
                              Optionally Restock
```

---

## Integration Points

1. **IInvoiceService** - Link returns to invoices
2. **IPaymentService** - Process refunds
3. **IInventoryService** - Restock items
4. **IGiftCardService** - Store credit option (requires Gift Cards feature)

---

## Database Changes

Add to `MerchelloDbContext.cs`:

```csharp
public DbSet<Return> Returns => Set<Return>();
public DbSet<ReturnLineItem> ReturnLineItems => Set<ReturnLineItem>();
public DbSet<ReturnReason> ReturnReasons => Set<ReturnReason>();
```

Create mapping: `src/Merchello.Core/Returns/Mapping/ReturnDbMapping.cs`

---

## Implementation Sequence

1. Create entity models and enums
2. Create EF mappings and migration
3. Create factory (`ReturnFactory.cs`)
4. Create DTOs
5. Create service interface and implementation
6. Create notifications
7. Create API controller
8. Register in DI
9. Create frontend components
10. Add to backoffice navigation
