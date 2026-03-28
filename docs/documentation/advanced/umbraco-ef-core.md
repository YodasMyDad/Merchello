# Umbraco EF Core Integration Notes

Merchello uses Entity Framework Core with Umbraco's `EFCoreScope` system for database access. This page covers critical pitfalls you must avoid, and patterns you must follow, when writing code that touches the database.

## The Three Rules

If you remember nothing else from this page, remember these:

1. **Never use `Task.WhenAll` to parallelize database calls**
2. **Never start transactions inside `ExecuteWithContextAsync`**
3. **Always use `HostedServiceRuntimeGate` in background jobs**

## Rule 1: No Task.WhenAll with Database Calls

Umbraco's `EFCoreScope` uses `AsyncLocal` ambient state to track the current scope. When you run multiple database operations in parallel with `Task.WhenAll`, the concurrent tasks corrupt the scope ordering.

**What happens if you break this rule:**

```
InvalidOperationException: The Scope being disposed is not the Ambient Scope
```
or:
```
The connection does not support MultipleActiveResultSets
```

**Bad -- do not do this:**

```csharp
// WRONG: parallel DB calls corrupt EFCoreScope state
var invoiceTask = invoiceService.GetAsync(invoiceId, ct);
var customerTask = customerService.GetAsync(customerId, ct);
var paymentsTask = paymentService.GetPaymentsForInvoiceAsync(invoiceId, ct);

await Task.WhenAll(invoiceTask, customerTask, paymentsTask);
```

**Good -- sequential calls:**

```csharp
// CORRECT: sequential DB calls
var invoice = await invoiceService.GetAsync(invoiceId, ct);
var customer = await customerService.GetAsync(customerId, ct);
var payments = await paymentService.GetPaymentsForInvoiceAsync(invoiceId, ct);
```

> **Warning:** This applies everywhere -- controllers, services, strategies, notification handlers. Any code path where services use `IEFCoreScopeProvider` must avoid parallel database access.

## Rule 2: No Nested Transactions

`EFCoreScope` already owns a transaction. If you call `db.Database.BeginTransactionAsync()` inside `scope.ExecuteWithContextAsync()`, you get:

```
InvalidOperationException: The connection is already in a transaction
```

**Bad:**

```csharp
using var scope = scopeProvider.CreateScope();
await scope.ExecuteWithContextAsync(async db =>
{
    // WRONG: nested transaction
    using var transaction = await db.Database.BeginTransactionAsync(ct);
    // ...
    await transaction.CommitAsync(ct);
});
```

**Good:**

```csharp
using var scope = scopeProvider.CreateScope();
await scope.ExecuteWithContextAsync(async db =>
{
    // CORRECT: rely on scope's transaction
    db.MyEntities.Add(entity);
    await db.SaveChangesAsync(ct);
});
scope.Complete(); // Commits the scope's transaction
```

For concurrency control, use unique constraints and handle `DbUpdateException` instead of explicit transactions.

## Rule 3: Background Job Pattern

Background jobs (`IHostedService` / `BackgroundService`) need special handling because:

- They are singletons, but scoped services like `DbContext` need a fresh scope per cycle
- Umbraco's `EFCoreScope` `AsyncLocal` state can leak from the HTTP pipeline into background workers
- SQLite only supports one writer at a time, so concurrent background jobs will fail
- Jobs must not start before Umbraco reaches `RuntimeLevel.Run`

### HostedServiceRuntimeGate

Merchello provides `HostedServiceRuntimeGate` to handle all of these concerns:

| Method | Purpose |
|---|---|
| `RunIsolatedAsync` | Suppresses `ExecutionContext` flow so `AsyncLocal` scope state does not leak from the HTTP pipeline into background workers |
| `WaitForRunLevelAsync` | Polls `IRuntimeState` every 2 seconds until Umbraco reaches `RuntimeLevel.Run` |
| `ExecuteWithSqliteLockRetryAsync` | Wraps DB operations with retry on transient SQLite lock exceptions (linear backoff: 200ms to 1200ms, default 4 attempts) |

### Background Job Template

Here is the standard pattern for all Merchello background jobs:

```csharp
public class MyBackgroundJob(
    IServiceScopeFactory serviceScopeFactory,
    IRuntimeState runtimeState,
    ILogger<MyBackgroundJob> logger) : BackgroundService
{
    private readonly TimeSpan _checkInterval = TimeSpan.FromMinutes(1);
    private readonly TimeSpan _initialDelay = TimeSpan.FromSeconds(30);

    // Step 1: Suppress ExecutionContext flow
    protected override Task ExecuteAsync(CancellationToken stoppingToken)
        => HostedServiceRuntimeGate.RunIsolatedAsync(ExecuteCoreAsync, stoppingToken);

    private async Task ExecuteCoreAsync(CancellationToken stoppingToken)
    {
        // Step 2: Wait for Umbraco to be fully booted
        if (!await HostedServiceRuntimeGate.WaitForRunLevelAsync(
                runtimeState, logger, nameof(MyBackgroundJob), stoppingToken))
            return;

        // Step 3: Initial delay for migrations to complete
        try { await Task.Delay(_initialDelay, stoppingToken); }
        catch (OperationCanceledException) { return; }

        using var timer = new PeriodicTimer(_checkInterval);

        while (!stoppingToken.IsCancellationRequested)
        {
            try
            {
                // Step 4: Wrap DB work in SQLite lock retry
                await HostedServiceRuntimeGate.ExecuteWithSqliteLockRetryAsync(
                    () => DoWorkAsync(stoppingToken),
                    logger,
                    "my operation",
                    stoppingToken);
            }
            catch (Exception ex) when (IsDatabaseNotReadyException(ex))
            {
                // Step 5: Skip if tables don't exist yet
                logger.LogDebug("Database not ready yet, skipping cycle");
            }
            catch (Exception ex)
            {
                logger.LogError(ex, "Error in background job cycle");
            }

            try { await timer.WaitForNextTickAsync(stoppingToken); }
            catch (OperationCanceledException) { break; }
        }
    }

    private async Task DoWorkAsync(CancellationToken ct)
    {
        // Step 6: Fresh DI scope per cycle
        using var scope = serviceScopeFactory.CreateScope();
        var myService = scope.ServiceProvider.GetRequiredService<IMyService>();
        await myService.DoSomethingAsync(ct);
    }

    private static bool IsDatabaseNotReadyException(Exception ex)
    {
        return ex.Message.Contains("no such table", StringComparison.OrdinalIgnoreCase) ||
               ex.Message.Contains("Invalid object name", StringComparison.OrdinalIgnoreCase) ||
               ex.InnerException?.Message.Contains("no such table", StringComparison.OrdinalIgnoreCase) == true ||
               ex.InnerException?.Message.Contains("Invalid object name", StringComparison.OrdinalIgnoreCase) == true;
    }
}

// Registration
builder.Services.AddHostedService<MyBackgroundJob>();
```

### Why Each Step Matters

| Step | What happens if you skip it |
|---|---|
| `RunIsolatedAsync` | `AsyncLocal` scope state leaks across background workers, causing scope disposal errors |
| `WaitForRunLevelAsync` | Jobs fail on missing services or uninitialized state during Umbraco boot |
| Initial delay | First cycle hits database before migrations have run |
| `ExecuteWithSqliteLockRetryAsync` | SQLite `SQLITE_BUSY` / `SQLITE_LOCKED` errors crash the job on concurrent access |
| Database not ready check | `no such table` exceptions crash the job before migrations complete |
| Fresh DI scope | Scoped services like `DbContext` are resolved from the singleton's constructor scope, causing shared state bugs |

## Data Access Pattern

The standard pattern for database access in Merchello services:

```csharp
public class MyService(IEFCoreScopeProvider<MerchelloDbContext> scopeProvider)
{
    public async Task<List<MyEntity>> GetAllAsync(CancellationToken ct)
    {
        using var scope = scopeProvider.CreateScope();
        var result = await scope.ExecuteWithContextAsync(
            db => db.MyEntities.AsNoTracking().ToListAsync(ct));
        scope.Complete();
        return result;
    }
}
```

Key points:
- Use `CreateScope()` to get a scope with an implicit transaction
- Use `ExecuteWithContextAsync` to get the `DbContext`
- Use `AsNoTracking()` for read-only queries (better performance)
- Call `scope.Complete()` to commit the transaction
- If `scope.Complete()` is not called, the transaction is rolled back on disposal

## SQLite-Specific Pitfalls

### Aggregate Functions in Projections

SQLite does not support EF Core aggregate translation for `Min()` and `Max()` in `Select` projections:

```
SQLite Error 1: 'no such function: ef_min'
```

**Bad:**

```csharp
query.Select(x => new Dto
{
    MinPrice = x.Products.Min(p => p.Price),  // Fails on SQLite
    MaxPrice = x.Products.Max(p => p.Price)   // Fails on SQLite
});
```

**Good:**

```csharp
// 1. Select placeholders
var dtos = await query.Select(x => new Dto { MinPrice = 0, MaxPrice = 0 }).ToListAsync(ct);

// 2. Load needed columns separately
var prices = await db.Products.Select(p => new { p.ProductRootId, p.Price }).ToListAsync(ct);

// 3. Aggregate in memory
var priceDict = prices.GroupBy(p => p.ProductRootId)
    .ToDictionary(g => g.Key, g => (Min: g.Min(p => p.Price), Max: g.Max(p => p.Price)));

// 4. Patch DTO values
foreach (var dto in dtos)
{
    if (priceDict.TryGetValue(dto.Id, out var range))
    {
        dto.MinPrice = range.Min;
        dto.MaxPrice = range.Max;
    }
}
```

### JsonElement Unwrapping

When deserializing `Dictionary<string, object>` values with `System.Text.Json`, values arrive as `JsonElement`, not CLR primitives. Calling `Convert.ToDecimal()` directly throws `InvalidCastException`.

**Bad:**

```csharp
Convert.ToDecimal(extendedData["Price"]);  // throws InvalidCastException
```

**Good:**

```csharp
Convert.ToDecimal(extendedData["Price"].UnwrapJsonElement());
```

Always call `UnwrapJsonElement()` on dictionary values before converting.

## Multi-Provider Support

Merchello supports both SQL Server and SQLite. The database provider is auto-detected from Umbraco's connection string at startup. Migrations live in separate assemblies per provider:

```
Merchello.Core/Data/              -- Shared DbContext
Merchello.Persistence.SqlServer/  -- SQL Server migrations
Merchello.Persistence.Sqlite/     -- SQLite migrations
```

Use `scripts/add-migration.ps1` to generate migrations for both providers simultaneously.

## Key Files

| File | Description |
|---|---|
| `Merchello.Core/Data/Context/MerchelloDbContext.cs` | The shared EF Core DbContext |
| `Merchello.Core/Shared/Services/HostedServiceRuntimeGate.cs` | Background job utilities |
| `Merchello.Core/Shared/Extensions/JsonElementExtensions.cs` | `UnwrapJsonElement()` extension |
| `docs/Umbraco-EF-Core.md` | Internal architecture reference |
