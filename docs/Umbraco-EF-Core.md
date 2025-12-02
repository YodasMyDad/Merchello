# EF Core Custom Tables in Umbraco

## Basic Setup (Single Provider)

For simple projects with a known database provider:

```csharp
// 1. Create DbContext
public class MyDbContext : DbContext
{
    public MyDbContext(DbContextOptions<MyDbContext> options) : base(options) { }
    public DbSet<MyEntity> MyEntities { get; set; }
}

// 2. Register in Startup/Program.cs
builder.Services.AddUmbracoDbContext<MyDbContext>((serviceProvider, options) =>
{
    options.UseUmbracoDatabaseProvider(serviceProvider); // Auto-detects provider
});

// 3. Create migration handler
public class RunMyMigration(MyDbContext dbContext)
    : INotificationAsyncHandler<UmbracoApplicationStartedNotification>
{
    public async Task HandleAsync(...) => await dbContext.Database.MigrateAsync();
}

// 4. Register handler in Composer
builder.AddNotificationAsyncHandler<UmbracoApplicationStartedNotification, RunMyMigration>();
```

Generate migrations: `dotnet ef migrations add Initial --context MyDbContext`

## Multi-Provider Package Setup (SQL Server + SQLite)

For packages that must support multiple database providers, use **separate assemblies per provider** (Umbraco's pattern).

### Project Structure
```
MyPackage.Core/                    # Shared DbContext & interfaces
  Data/
    MyDbContext.cs
    IMigrationProvider.cs
    IMigrationProviderSetup.cs
    RunMigration.cs
MyPackage.Persistence.SqlServer/   # SQL Server provider
  SqlServerMigrationProvider.cs
  SqlServerDbContextFactory.cs     # IDesignTimeDbContextFactory
  EFCoreSqlServerComposer.cs
  Migrations/
MyPackage.Persistence.Sqlite/      # SQLite provider
  SqliteMigrationProvider.cs
  SqliteDbContextFactory.cs
  EFCoreSqliteComposer.cs
  Migrations/
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

### Provider Implementation (e.g., SQLite)

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

// Runtime migration provider - MUST create own DbContext with MigrationsAssembly
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

// Auto-discovered composer registers services
public class EFCoreSqliteComposer : IComposer
{
    public void Compose(IUmbracoBuilder builder)
    {
        builder.Services.AddSingleton<IMigrationProvider, SqliteMigrationProvider>();
    }
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
        var providerName = connStrings.Value.ProviderName;
        var provider = providers.FirstOrDefault(x =>
            x.ProviderName.Equals(providerName, StringComparison.OrdinalIgnoreCase));

        if (provider != null)
            await provider.MigrateAsync(cancellationToken);
    }
}
```

### Generate Migrations

```bash
# Each provider needs its own migration
# IMPORTANT: Use the provider project as BOTH --project and --startup-project
dotnet ef migrations add Initial --project src/MyPackage.Persistence.SqlServer --startup-project src/MyPackage.Persistence.SqlServer
dotnet ef migrations add Initial --project src/MyPackage.Persistence.Sqlite --startup-project src/MyPackage.Persistence.Sqlite
```

For Merchello, use the helper script:
```powershell
.\scripts\add-migration.ps1
# Prompts for migration name, then creates both SQLite and SQL Server migrations
```

## Key Points

1. **UseUmbracoDatabaseProvider** - Auto-detects provider from connection string, use for runtime DbContext registration
2. **MigrationsAssembly** - Critical for multi-provider; tells EF Core where migrations live
3. **IDesignTimeDbContextFactory** - Required in each provider assembly for `dotnet ef` CLI
4. **Provider assemblies** - Must be referenced by main project so composers are discovered
5. **ProviderName values**: `Microsoft.Data.SqlClient` (SQL Server), `Microsoft.Data.Sqlite` (SQLite)

## Data Access

Use `IEFCoreScopeProvider<T>` for transactional data access:

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
