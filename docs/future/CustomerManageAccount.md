# Customer Account Portal API

## Overview

Public API endpoints enabling customer self-service: order history, saved addresses, profile management. Integrates with Umbraco Member authentication.

## Gap Analysis

| Feature | Shopify | Merchello | Status |
|---------|---------|-----------|--------|
| Customer login | Yes | Via Umbraco | **Exists** |
| Order history | Yes | Backend only | **Extend** |
| Order detail view | Yes | Backend only | **Extend** |
| Saved addresses | Yes | No | **Missing** |
| Profile editing | Yes | Backend only | **Extend** |
| Reorder | Yes | No | **Missing** |

---

## Entity Models

### Location: `src/Merchello.Core/Customers/Models/`

### CustomerAddress.cs

```csharp
public class CustomerAddress
{
    public Guid Id { get; set; } = GuidExtensions.NewSequentialGuid;
    public Guid CustomerId { get; set; }
    public string? Label { get; set; }  // "Home", "Work", etc.
    public AddressType AddressType { get; set; } = AddressType.Both;
    public bool IsDefault { get; set; }

    // Address fields
    public string? Name { get; set; }
    public string? Company { get; set; }
    public string? AddressOne { get; set; }
    public string? AddressTwo { get; set; }
    public string? TownCity { get; set; }
    public string? CountyState { get; set; }
    public string? CountyStateCode { get; set; }
    public string? PostalCode { get; set; }
    public string? Country { get; set; }
    public string? CountryCode { get; set; }
    public string? Phone { get; set; }

    // Timestamps
    public DateTime DateCreated { get; set; } = DateTime.UtcNow;
    public DateTime DateUpdated { get; set; } = DateTime.UtcNow;

    // Navigation
    public virtual Customer? Customer { get; set; }
}

public enum AddressType
{
    Billing = 1,
    Shipping = 2,
    Both = 3
}
```

---

## DTOs

### Location: `src/Merchello.Core/Customers/Dtos/`

### Profile DTOs

```csharp
public class CustomerProfileDto
{
    public Guid Id { get; set; }
    public string Email { get; set; } = string.Empty;
    public string? FirstName { get; set; }
    public string? LastName { get; set; }
    public bool AcceptsMarketing { get; set; }
    public DateTime DateCreated { get; set; }
    public int OrderCount { get; set; }
    public decimal TotalSpent { get; set; }
    public string FormattedTotalSpent { get; set; } = string.Empty;
}

public class UpdateCustomerProfileDto
{
    public string? FirstName { get; set; }
    public string? LastName { get; set; }
    public bool? AcceptsMarketing { get; set; }
}
```

### Address DTOs

```csharp
public class CustomerAddressDto
{
    public Guid Id { get; set; }
    public string? Label { get; set; }
    public AddressType AddressType { get; set; }
    public bool IsDefault { get; set; }
    public string? Name { get; set; }
    public string? Company { get; set; }
    public string? AddressOne { get; set; }
    public string? AddressTwo { get; set; }
    public string? TownCity { get; set; }
    public string? CountyState { get; set; }
    public string? CountyStateCode { get; set; }
    public string? PostalCode { get; set; }
    public string? Country { get; set; }
    public string? CountryCode { get; set; }
    public string? Phone { get; set; }
}

public class CreateCustomerAddressDto
{
    public string? Label { get; set; }
    public AddressType AddressType { get; set; } = AddressType.Both;
    public bool IsDefault { get; set; }
    [Required] public string Name { get; set; } = string.Empty;
    public string? Company { get; set; }
    [Required] public string AddressOne { get; set; } = string.Empty;
    public string? AddressTwo { get; set; }
    [Required] public string TownCity { get; set; } = string.Empty;
    public string? CountyState { get; set; }
    public string? CountyStateCode { get; set; }
    [Required] public string PostalCode { get; set; } = string.Empty;
    [Required] public string Country { get; set; } = string.Empty;
    [Required] public string CountryCode { get; set; } = string.Empty;
    public string? Phone { get; set; }
}

public class UpdateCustomerAddressDto
{
    public string? Label { get; set; }
    public AddressType? AddressType { get; set; }
    public bool? IsDefault { get; set; }
    public string? Name { get; set; }
    public string? Company { get; set; }
    public string? AddressOne { get; set; }
    public string? AddressTwo { get; set; }
    public string? TownCity { get; set; }
    public string? CountyState { get; set; }
    public string? CountyStateCode { get; set; }
    public string? PostalCode { get; set; }
    public string? Country { get; set; }
    public string? CountryCode { get; set; }
    public string? Phone { get; set; }
}
```

### Order History DTOs

```csharp
public class CustomerOrderHistoryDto
{
    public List<CustomerOrderListItemDto> Orders { get; set; } = [];
    public int TotalOrders { get; set; }
    public int Page { get; set; }
    public int PageSize { get; set; }
}

public class CustomerOrderListItemDto
{
    public Guid Id { get; set; }
    public string InvoiceNumber { get; set; } = string.Empty;
    public DateTime DateCreated { get; set; }
    public decimal Total { get; set; }
    public string FormattedTotal { get; set; } = string.Empty;
    public string CurrencySymbol { get; set; } = string.Empty;
    public string PaymentStatus { get; set; } = string.Empty;
    public string FulfillmentStatus { get; set; } = string.Empty;
    public int ItemCount { get; set; }
}

public class CustomerOrderDetailDto
{
    public Guid Id { get; set; }
    public string InvoiceNumber { get; set; } = string.Empty;
    public DateTime DateCreated { get; set; }
    public AddressDto? BillingAddress { get; set; }
    public AddressDto? ShippingAddress { get; set; }
    public List<CustomerOrderLineItemDto> LineItems { get; set; } = [];
    public decimal SubTotal { get; set; }
    public decimal Discount { get; set; }
    public decimal Shipping { get; set; }
    public decimal Tax { get; set; }
    public decimal Total { get; set; }
    public string CurrencySymbol { get; set; } = string.Empty;
    public string PaymentStatus { get; set; } = string.Empty;
    public string FulfillmentStatus { get; set; } = string.Empty;
    public List<CustomerShipmentDto> Shipments { get; set; } = [];
}

public class CustomerOrderLineItemDto
{
    public Guid Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public string? Sku { get; set; }
    public int Quantity { get; set; }
    public decimal UnitPrice { get; set; }
    public decimal Total { get; set; }
    public string? ImageUrl { get; set; }
    public string? ProductUrl { get; set; }
}

public class CustomerShipmentDto
{
    public Guid Id { get; set; }
    public string? TrackingNumber { get; set; }
    public string? Carrier { get; set; }
    public string? TrackingUrl { get; set; }
    public DateTime? DateShipped { get; set; }
    public List<string> Items { get; set; } = [];
}
```

---

## Service Extensions

### Add to: `src/Merchello.Core/Customers/Services/Interfaces/ICustomerService.cs`

```csharp
// =====================================================
// Customer Account Portal Methods
// =====================================================

/// <summary>
/// Gets customer profile with aggregated stats for account portal.
/// </summary>
Task<CustomerProfileDto?> GetProfileAsync(Guid customerId, CancellationToken ct = default);

/// <summary>
/// Updates customer profile from account portal.
/// </summary>
Task<CrudResult<Customer>> UpdateProfileAsync(
    Guid customerId,
    UpdateCustomerProfileDto dto,
    CancellationToken ct = default);

/// <summary>
/// Gets saved addresses for a customer.
/// </summary>
Task<List<CustomerAddressDto>> GetAddressesAsync(Guid customerId, CancellationToken ct = default);

/// <summary>
/// Gets a specific address for a customer.
/// </summary>
Task<CustomerAddressDto?> GetAddressAsync(Guid customerId, Guid addressId, CancellationToken ct = default);

/// <summary>
/// Creates a new saved address for a customer.
/// </summary>
Task<CrudResult<CustomerAddress>> CreateAddressAsync(
    Guid customerId,
    CreateCustomerAddressDto dto,
    CancellationToken ct = default);

/// <summary>
/// Updates an existing address for a customer.
/// </summary>
Task<CrudResult<CustomerAddress>> UpdateAddressAsync(
    Guid customerId,
    Guid addressId,
    UpdateCustomerAddressDto dto,
    CancellationToken ct = default);

/// <summary>
/// Deletes a saved address for a customer.
/// </summary>
Task<bool> DeleteAddressAsync(Guid customerId, Guid addressId, CancellationToken ct = default);

/// <summary>
/// Gets paginated order history for a customer.
/// </summary>
Task<CustomerOrderHistoryDto> GetOrderHistoryAsync(
    Guid customerId,
    int page = 1,
    int pageSize = 20,
    CancellationToken ct = default);

/// <summary>
/// Gets full order detail for a customer (validates ownership).
/// </summary>
Task<CustomerOrderDetailDto?> GetOrderDetailAsync(
    Guid customerId,
    Guid invoiceId,
    CancellationToken ct = default);
```

---

## API Controller

### Location: `src/Merchello/Controllers/CustomerAccountApiController.cs`

```csharp
/// <summary>
/// Public API controller for customer account self-service.
/// Requires authenticated Umbraco Member.
/// </summary>
[ApiController]
[Route("api/merchello/account")]
[Authorize]
public class CustomerAccountApiController(
    ICustomerService customerService,
    IMemberManager memberManager,
    ILogger<CustomerAccountApiController> logger) : ControllerBase
{
    /// <summary>
    /// Gets the current customer from the authenticated member.
    /// </summary>
    private async Task<Customer?> GetCurrentCustomerAsync(CancellationToken ct)
    {
        var member = await memberManager.GetCurrentMemberAsync();
        if (member == null) return null;

        return await customerService.GetByMemberKeyAsync(member.Key, ct);
    }

    // GET /api/merchello/account/profile
    [HttpGet("profile")]
    [ProducesResponseType<CustomerProfileDto>(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    public async Task<IActionResult> GetProfile(CancellationToken ct)
    {
        var customer = await GetCurrentCustomerAsync(ct);
        if (customer == null) return Unauthorized();

        var profile = await customerService.GetProfileAsync(customer.Id, ct);
        return Ok(profile);
    }

    // PUT /api/merchello/account/profile
    [HttpPut("profile")]
    public async Task<IActionResult> UpdateProfile(
        [FromBody] UpdateCustomerProfileDto dto,
        CancellationToken ct)
    {
        var customer = await GetCurrentCustomerAsync(ct);
        if (customer == null) return Unauthorized();

        var result = await customerService.UpdateProfileAsync(customer.Id, dto, ct);
        if (!result.Successful)
            return BadRequest(result.Messages.FirstOrDefault()?.Message);

        return Ok(await customerService.GetProfileAsync(customer.Id, ct));
    }

    // GET /api/merchello/account/orders
    [HttpGet("orders")]
    [ProducesResponseType<CustomerOrderHistoryDto>(StatusCodes.Status200OK)]
    public async Task<IActionResult> GetOrders(
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 20,
        CancellationToken ct = default)
    {
        var customer = await GetCurrentCustomerAsync(ct);
        if (customer == null) return Unauthorized();

        var history = await customerService.GetOrderHistoryAsync(customer.Id, page, pageSize, ct);
        return Ok(history);
    }

    // GET /api/merchello/account/orders/{id}
    [HttpGet("orders/{id:guid}")]
    [ProducesResponseType<CustomerOrderDetailDto>(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> GetOrder(Guid id, CancellationToken ct)
    {
        var customer = await GetCurrentCustomerAsync(ct);
        if (customer == null) return Unauthorized();

        var order = await customerService.GetOrderDetailAsync(customer.Id, id, ct);
        if (order == null) return NotFound();

        return Ok(order);
    }

    // GET /api/merchello/account/addresses
    [HttpGet("addresses")]
    [ProducesResponseType<List<CustomerAddressDto>>(StatusCodes.Status200OK)]
    public async Task<IActionResult> GetAddresses(CancellationToken ct)
    {
        var customer = await GetCurrentCustomerAsync(ct);
        if (customer == null) return Unauthorized();

        var addresses = await customerService.GetAddressesAsync(customer.Id, ct);
        return Ok(addresses);
    }

    // POST /api/merchello/account/addresses
    [HttpPost("addresses")]
    [ProducesResponseType<CustomerAddressDto>(StatusCodes.Status201Created)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> CreateAddress(
        [FromBody] CreateCustomerAddressDto dto,
        CancellationToken ct)
    {
        var customer = await GetCurrentCustomerAsync(ct);
        if (customer == null) return Unauthorized();

        var result = await customerService.CreateAddressAsync(customer.Id, dto, ct);
        if (!result.Successful)
            return BadRequest(result.Messages.FirstOrDefault()?.Message);

        var addressDto = await customerService.GetAddressAsync(customer.Id, result.ResultObject!.Id, ct);
        return CreatedAtAction(nameof(GetAddress), new { id = result.ResultObject.Id }, addressDto);
    }

    // GET /api/merchello/account/addresses/{id}
    [HttpGet("addresses/{id:guid}")]
    public async Task<IActionResult> GetAddress(Guid id, CancellationToken ct)
    {
        var customer = await GetCurrentCustomerAsync(ct);
        if (customer == null) return Unauthorized();

        var address = await customerService.GetAddressAsync(customer.Id, id, ct);
        if (address == null) return NotFound();

        return Ok(address);
    }

    // PUT /api/merchello/account/addresses/{id}
    [HttpPut("addresses/{id:guid}")]
    public async Task<IActionResult> UpdateAddress(
        Guid id,
        [FromBody] UpdateCustomerAddressDto dto,
        CancellationToken ct)
    {
        var customer = await GetCurrentCustomerAsync(ct);
        if (customer == null) return Unauthorized();

        var result = await customerService.UpdateAddressAsync(customer.Id, id, dto, ct);
        if (!result.Successful)
        {
            var msg = result.Messages.FirstOrDefault()?.Message;
            if (msg?.Contains("not found") == true) return NotFound();
            return BadRequest(msg);
        }

        return Ok(await customerService.GetAddressAsync(customer.Id, id, ct));
    }

    // DELETE /api/merchello/account/addresses/{id}
    [HttpDelete("addresses/{id:guid}")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> DeleteAddress(Guid id, CancellationToken ct)
    {
        var customer = await GetCurrentCustomerAsync(ct);
        if (customer == null) return Unauthorized();

        var deleted = await customerService.DeleteAddressAsync(customer.Id, id, ct);
        if (!deleted) return NotFound();

        return NoContent();
    }
}
```

---

## API Endpoints Summary

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/merchello/account/profile` | Get customer profile |
| PUT | `/api/merchello/account/profile` | Update profile |
| GET | `/api/merchello/account/orders` | Get order history |
| GET | `/api/merchello/account/orders/{id}` | Get order detail |
| GET | `/api/merchello/account/addresses` | Get saved addresses |
| POST | `/api/merchello/account/addresses` | Create address |
| GET | `/api/merchello/account/addresses/{id}` | Get address |
| PUT | `/api/merchello/account/addresses/{id}` | Update address |
| DELETE | `/api/merchello/account/addresses/{id}` | Delete address |

---

## Security Considerations

1. **Authentication**: Uses Umbraco Member authentication via `IMemberManager`
2. **Authorization**: Every endpoint validates customer ownership
3. **Data Isolation**: Queries always filter by `CustomerId`
4. **Input Validation**: Data Annotations on DTOs

---

## Database Changes

Add to `MerchelloDbContext.cs`:

```csharp
public DbSet<CustomerAddress> CustomerAddresses => Set<CustomerAddress>();
```

### Mapping

```csharp
public class CustomerAddressDbMapping : IEntityTypeConfiguration<CustomerAddress>
{
    public void Configure(EntityTypeBuilder<CustomerAddress> builder)
    {
        builder.ToTable("merchelloCustomerAddresses");
        builder.HasKey(x => x.Id);
        builder.Property(x => x.Label).HasMaxLength(100);
        builder.Property(x => x.Name).HasMaxLength(200);
        builder.Property(x => x.Company).HasMaxLength(200);
        builder.Property(x => x.AddressOne).HasMaxLength(500);
        builder.Property(x => x.AddressTwo).HasMaxLength(500);
        builder.Property(x => x.TownCity).HasMaxLength(200);
        builder.Property(x => x.CountyState).HasMaxLength(200);
        builder.Property(x => x.CountyStateCode).HasMaxLength(20);
        builder.Property(x => x.PostalCode).HasMaxLength(20);
        builder.Property(x => x.Country).HasMaxLength(100);
        builder.Property(x => x.CountryCode).HasMaxLength(10);
        builder.Property(x => x.Phone).HasMaxLength(50);

        builder.HasIndex(x => x.CustomerId);
        builder.HasOne(x => x.Customer)
            .WithMany()
            .HasForeignKey(x => x.CustomerId)
            .OnDelete(DeleteBehavior.Cascade);
    }
}
```

---

## Checkout Integration

Use saved addresses at checkout:

```csharp
// In CheckoutService or CheckoutApiController
[HttpGet("checkout/saved-addresses")]
[Authorize]
public async Task<IActionResult> GetSavedAddresses(CancellationToken ct)
{
    var customer = await GetCurrentCustomerAsync(ct);
    if (customer == null) return Ok(new List<CustomerAddressDto>());

    var addresses = await customerService.GetAddressesAsync(customer.Id, ct);
    return Ok(addresses);
}
```

---

## Implementation Sequence

1. Create `CustomerAddress` entity
2. Create EF mapping and migration
3. Create DTOs
4. Extend `ICustomerService` with account methods
5. Implement service methods
6. Create `CustomerAccountApiController`
7. Register in DI
8. Test authentication flow with Umbraco Members
9. Document API for frontend developers
