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
