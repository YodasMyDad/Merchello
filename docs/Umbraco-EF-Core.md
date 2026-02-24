# EF Core Custom Tables in Umbraco

## Basic Setup (Single Provider)

For simple projects with known database provider:

```csharp
public class MyDbContext : DbContext
{
    public MyDbContext(DbContextOptions<MyDbContext> options) : base(options) { }
    public DbSet<MyEntity> MyEntities { get; set; }
}

// Startup/Program.cs
builder.Services.AddUmbracoDbContext<MyDbContext>((sp, opts) =>
    opts.UseUmbracoDatabaseProvider(sp));

// Migration handler
public class RunMyMigration(MyDbContext dbContext)
    : INotificationAsyncHandler<UmbracoApplicationStartedNotification>
{
    public async Task HandleAsync(...) => await dbContext.Database.MigrateAsync();
}

// Composer
builder.AddNotificationAsyncHandler<UmbracoApplicationStartedNotification, RunMyMigration>();
```

Generate: `dotnet ef migrations add Initial --context MyDbContext`

## Multi-Provider Setup (SQL Server + SQLite)

For packages supporting multiple providers, use **separate assemblies per provider**.

### Structure
```
MyPackage.Core/                    # Shared DbContext & interfaces
  Data/
    MyDbContext.cs, IMigrationProvider.cs, IMigrationProviderSetup.cs, RunMigration.cs
MyPackage.Persistence.SqlServer/   # SQL Server: provider, factory, composer, Migrations/
MyPackage.Persistence.Sqlite/      # SQLite: provider, factory, composer, Migrations/
```

### Core Interfaces
```csharp
public interface IMigrationProvider
{
    string ProviderName { get; }
    Task MigrateAsync(CancellationToken ct = default);
}

public interface IMigrationProviderSetup
{
    string ProviderName { get; }
    void Setup(DbContextOptionsBuilder builder, string? connectionString);
}
```

### Provider Implementation (SQLite example)
```csharp
// Design-time factory for 'dotnet ef migrations add'
public class SqliteDbContextFactory : IDesignTimeDbContextFactory<MyDbContext>
{
    public MyDbContext CreateDbContext(string[] args)
    {
        var builder = new DbContextOptionsBuilder<MyDbContext>();
        builder.UseSqlite("Data Source=design.db",
            x => x.MigrationsAssembly(GetType().Assembly.FullName));
        return new MyDbContext(builder.Options);
    }
}

// Runtime provider - creates own DbContext with MigrationsAssembly
public class SqliteMigrationProvider(IOptions<ConnectionStrings> connStrings) : IMigrationProvider
{
    public string ProviderName => "Microsoft.Data.Sqlite";

    public async Task MigrateAsync(CancellationToken ct = default)
    {
        var builder = new DbContextOptionsBuilder<MyDbContext>();
        builder.UseSqlite(connStrings.Value.ConnectionString,
            x => x.MigrationsAssembly(GetType().Assembly.FullName));
        await using var ctx = new MyDbContext(builder.Options);
        await ctx.Database.MigrateAsync(ct);
    }
}

// Composer auto-discovered
public class EFCoreSqliteComposer : IComposer
{
    public void Compose(IUmbracoBuilder builder) =>
        builder.Services.AddSingleton<IMigrationProvider, SqliteMigrationProvider>();
}
```

### Migration Handler
```csharp
public class RunMigration(
    IEnumerable<IMigrationProvider> providers,
    IOptions<ConnectionStrings> connStrings,
    ILogger<RunMigration> logger)
    : INotificationAsyncHandler<UmbracoApplicationStartedNotification>
{
    public async Task HandleAsync(...)
    {
        var provider = providers.FirstOrDefault(x =>
            x.ProviderName.Equals(connStrings.Value.ProviderName, StringComparison.OrdinalIgnoreCase));
        if (provider != null) await provider.MigrateAsync(cancellationToken);
    }
}
```

### Generate Migrations
```bash
# Use provider project as BOTH --project and --startup-project
dotnet ef migrations add Initial --project src/MyPackage.Persistence.SqlServer --startup-project src/MyPackage.Persistence.SqlServer
dotnet ef migrations add Initial --project src/MyPackage.Persistence.Sqlite --startup-project src/MyPackage.Persistence.Sqlite
```

Merchello: `.\scripts\add-migration.ps1` (prompts for name, creates both)

## Key Points

| Concept | Purpose |
|---------|---------|
| **UseUmbracoDatabaseProvider** | Auto-detects provider from connection string (runtime) |
| **MigrationsAssembly** | Tells EF Core where migrations live (critical for multi-provider) |
| **IDesignTimeDbContextFactory** | Required per provider assembly for `dotnet ef` CLI |
| **Provider assemblies** | Must be referenced by main project for composer discovery |
| **ProviderName** | `Microsoft.Data.SqlClient` (SQL Server), `Microsoft.Data.Sqlite` (SQLite) |

## Data Access

Use `IEFCoreScopeProvider<T>` for transactional access:
```csharp
public class MyService(IEFCoreScopeProvider<MyDbContext> scopeProvider)
{
    public async Task<List<MyEntity>> GetAll()
    {
        using var scope = scopeProvider.CreateScope();
        var result = await scope.ExecuteWithContextAsync(db => db.MyEntities.ToListAsync());
        scope.Complete();
        return result;
    }
}
```

## Background Jobs (SQLite Lock Handling)

### The Problem

SQLite serializes all writes via a single file-level lock. When multiple `BackgroundService` jobs run concurrently and hit the database, SQLite throws `SQLITE_BUSY` (error 5) or `SQLITE_LOCKED` (error 6). Unlike SQL Server, there is no row-level locking — any concurrent write attempt will fail.

Additional concerns in Umbraco:
- Jobs must not run before Umbraco reaches `RuntimeLevel.Run`
- Umbraco's `EFCoreScope` uses `AsyncLocal` state that can leak into background workers
- Tables may not exist yet if migrations haven't completed

### The Solution: `HostedServiceRuntimeGate`

A static helper (`Merchello.Core/Shared/Services/HostedServiceRuntimeGate.cs`) that centralises three concerns:

| Method | Purpose |
|--------|---------|
| **RunIsolatedAsync** | Suppresses `ExecutionContext` flow so `AsyncLocal` scope state doesn't leak from the HTTP pipeline into background workers |
| **WaitForRunLevelAsync** | Polls `IRuntimeState` every 2s until Umbraco reaches `RuntimeLevel.Run` |
| **ExecuteWithSqliteLockRetryAsync** | Wraps DB operations with retry on transient SQLite lock exceptions. Linear backoff: 200ms → 400ms → 600ms (capped 1200ms), default 4 attempts. No-op passthrough for SQL Server (non-SQLite exceptions propagate immediately) |

Lock detection checks for `SqliteException` with error codes 5 or 6, or messages containing `"database is locked"` / `"database table is locked"`. Walks the inner exception chain recursively to catch both direct `SqliteException` and `DbUpdateException` wrapping one.

### Background Job Template

```csharp
public class MyBackgroundJob(
    IServiceScopeFactory serviceScopeFactory,
    IRuntimeState runtimeState,
    ILogger<MyBackgroundJob> logger) : BackgroundService
{
    private readonly TimeSpan _checkInterval = TimeSpan.FromMinutes(1);
    private readonly TimeSpan _initialDelay = TimeSpan.FromSeconds(30);

    // 1. Suppress ExecutionContext flow to isolate from HTTP pipeline
    protected override Task ExecuteAsync(CancellationToken stoppingToken)
        => HostedServiceRuntimeGate.RunIsolatedAsync(ExecuteCoreAsync, stoppingToken);

    private async Task ExecuteCoreAsync(CancellationToken stoppingToken)
    {
        // 2. Wait for Umbraco to be fully booted
        if (!await HostedServiceRuntimeGate.WaitForRunLevelAsync(
                runtimeState, logger, nameof(MyBackgroundJob), stoppingToken))
            return;

        // 3. Initial delay to allow migrations to complete
        try { await Task.Delay(_initialDelay, stoppingToken); }
        catch (OperationCanceledException) { return; }

        using var timer = new PeriodicTimer(_checkInterval);

        while (!stoppingToken.IsCancellationRequested)
        {
            try
            {
                // 4. Wrap work in SQLite lock retry
                await HostedServiceRuntimeGate.ExecuteWithSqliteLockRetryAsync(
                    () => DoWorkAsync(stoppingToken),
                    logger,
                    "my operation",
                    stoppingToken);
            }
            catch (Exception ex) when (IsDatabaseNotReadyException(ex))
            {
                // 5. Silently skip if tables don't exist yet
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
        // 6. Create a fresh DI scope per cycle (not constructor-injected)
        using var scope = serviceScopeFactory.CreateScope();
        var myService = scope.ServiceProvider.GetRequiredService<IMyService>();
        await myService.DoSomethingAsync(ct);
    }

    private static bool IsDatabaseNotReadyException(Exception ex)
    {
        return ex.Message.Contains("no such table", StringComparison.OrdinalIgnoreCase) ||          // SQLite
               ex.Message.Contains("Invalid object name", StringComparison.OrdinalIgnoreCase) ||    // SQL Server
               ex.InnerException?.Message.Contains("no such table", StringComparison.OrdinalIgnoreCase) == true ||
               ex.InnerException?.Message.Contains("Invalid object name", StringComparison.OrdinalIgnoreCase) == true;
    }
}

// Registration
builder.Services.AddHostedService<MyBackgroundJob>();
```

### Key Rules

1. **Always use `RunIsolatedAsync`** — without it, Umbraco's `EFCoreScope` `AsyncLocal` state leaks across background workers causing scope/transaction errors.
2. **Always gate on `WaitForRunLevelAsync`** — jobs that run before Umbraco boots will fail on missing services or uninitialized state.
3. **Always wrap DB writes in `ExecuteWithSqliteLockRetryAsync`** — this is the only protection against `SQLITE_BUSY`/`SQLITE_LOCKED` in concurrent background jobs.
4. **Use `IServiceScopeFactory`** — background services are singletons; create a fresh scope per cycle to resolve scoped services like `DbContext`.
5. **Add an initial delay** — gives migrations time to run before the first cycle hits the database.
