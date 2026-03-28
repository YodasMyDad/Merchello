# CrudResult Pattern

When a service method can fail for business reasons (not just exceptions), Merchello uses the `CrudResult<T>` pattern. This gives you a consistent way to return success or failure from mutations, along with user-facing error and warning messages.

## The Problem CrudResult Solves

Imagine you have a service method that creates a discount. It might fail because:
- The discount code already exists
- The start date is after the end date
- The customer segment does not exist

You could throw exceptions for these, but exceptions are expensive and should be reserved for truly unexpected situations. Instead, `CrudResult<T>` lets you return a structured result with messages that can be shown to the user.

## The CrudResult Class

Here is the complete implementation -- it is intentionally simple:

```csharp
public class CrudResult<T> : IResult
{
    public T? ResultObject { get; set; }
    public List<ResultMessage> Messages { get; set; } = [];
    public bool Success => Messages.All(x => x.ResultMessageType != ResultMessageType.Error);
}
```

Key things to notice:

- **`Success` is computed** -- it is `true` when there are zero error messages. You do not set it manually.
- **`ResultObject`** holds the created/updated entity on success, or `null` on failure.
- **`Messages`** can contain errors, warnings, and success messages simultaneously.

### ResultMessage

```csharp
public class ResultMessage
{
    public ResultMessageType ResultMessageType { get; set; }
    public string? Message { get; set; }
}

public enum ResultMessageType
{
    Success,
    Warning,
    Error
}
```

## When to Use CrudResult

Use `CrudResult<T>` for **mutation operations** that can fail for business reasons:

| Operation type | Return type |
|---|---|
| Create, Update, Delete | `CrudResult<T>` |
| Query, Get, List | Return entity directly (`T`, `List<T>`, etc.) |

```csharp
// Good: mutation returns CrudResult
public async Task<CrudResult<Discount>> CreateAsync(CreateDiscountParameters parameters, CancellationToken ct)

// Good: query returns entity directly
public async Task<Discount?> GetAsync(Guid id, CancellationToken ct)
```

## Adding Messages

Use the extension methods to add messages to a `CrudResult<T>`:

```csharp
public async Task<CrudResult<Discount>> CreateAsync(
    CreateDiscountParameters parameters,
    CancellationToken ct)
{
    var result = new CrudResult<Discount>();

    // Validation -- add error messages for failures
    if (string.IsNullOrWhiteSpace(parameters.Name))
    {
        result.AddErrorMessage("Discount name is required.");
        return result;
    }

    // Check for duplicates
    var existing = await GetByCodeAsync(parameters.Code, ct);
    if (existing != null)
    {
        result.AddErrorMessage($"A discount with code '{parameters.Code}' already exists.");
        return result;
    }

    // Create the entity
    var discount = discountFactory.Create(parameters);
    await SaveAsync(discount, ct);

    // Add a warning if something is noteworthy but not an error
    if (parameters.EndsAt.HasValue && parameters.EndsAt.Value < DateTime.UtcNow.AddDays(1))
    {
        result.AddWarningMessage("This discount expires within 24 hours.");
    }

    result.AddSuccessMessage("Discount created successfully.");
    result.ResultObject = discount;
    return result;
}
```

### Available Extension Methods

All extension methods are in `CrudResultExtensions`:

| Method | What it does |
|---|---|
| `AddErrorMessage(message)` | Adds an error. This causes `Success` to become `false`. |
| `AddWarningMessage(message)` | Adds a warning. Does not affect `Success`. |
| `AddSuccessMessage(message)` | Adds a success message. Does not affect `Success`. |

## Checking Results

### In a Service

```csharp
var result = await discountService.CreateAsync(parameters, ct);

if (!result.Success)
{
    // Log errors
    result.LogErrorMessages(logger);
    return result; // Propagate the failure
}

var discount = result.ResultObject!;
// Continue with the discount...
```

### In a Controller

```csharp
[HttpPost]
public async Task<IActionResult> Create(CreateDiscountDto dto, CancellationToken ct)
{
    var result = await discountService.CreateAsync(parameters, ct);

    if (!result.Success)
    {
        // Return the error messages to the frontend
        var errors = result.Messages.ErrorMessages().Select(m => m.Message);
        return BadRequest(new { errors });
    }

    return Ok(MapToDto(result.ResultObject!));
}
```

## Logging Extensions

`CrudResultExtensions` provides logging helpers that work with `ILogger<T>`:

```csharp
// Log all errors and warnings
result.LogBadMessages(logger);

// Log only errors
result.LogErrorMessages(logger);

// Log only warnings
result.LogWarningMessages(logger);
```

## Filtering Messages

You can filter messages by type using the list extension methods:

```csharp
// Get only error messages
var errors = result.Messages.ErrorMessages();

// Get only warning messages
var warnings = result.Messages.WarningMessages();
```

## Common Patterns

### Propagating Results Through Service Layers

When one service calls another and both return `CrudResult<T>`, propagate the messages:

```csharp
var invoiceResult = await invoiceService.CreateAsync(invoiceParams, ct);
if (!invoiceResult.Success)
{
    var orderResult = new CrudResult<Order>();
    foreach (var msg in invoiceResult.Messages)
    {
        orderResult.Messages.Add(msg);
    }
    return orderResult;
}
```

### Multiple Validations Before Returning

You can accumulate multiple error messages before returning, giving the user a complete picture of what needs fixing:

```csharp
var result = new CrudResult<Product>();

if (string.IsNullOrWhiteSpace(parameters.Name))
    result.AddErrorMessage("Product name is required.");

if (parameters.Price < 0)
    result.AddErrorMessage("Price cannot be negative.");

if (string.IsNullOrWhiteSpace(parameters.Sku))
    result.AddErrorMessage("SKU is required.");

if (!result.Success)
    return result; // Return all errors at once

// All validations passed, proceed with creation...
```

## Key Files

| File | Description |
|---|---|
| `Merchello.Core/Shared/Models/CrudResult.cs` | The `CrudResult<T>` class |
| `Merchello.Core/Shared/Extensions/CrudResultExtensions.cs` | Extension methods for adding messages and logging |
| `Merchello.Core/Shared/Models/ResultMessage.cs` | The `ResultMessage` class |
| `Merchello.Core/Shared/Models/Enums/ResultMessageType.cs` | The `ResultMessageType` enum |
