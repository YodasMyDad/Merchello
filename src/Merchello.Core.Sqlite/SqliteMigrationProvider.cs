using Merchello.Core.Data;
using Merchello.Core.Data.Interfaces;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using Umbraco.Cms.Core.Configuration.Models;

namespace Merchello.Core.Sqlite;

/// <summary>
/// SQLite implementation of IMerchelloMigrationProvider.
/// Handles executing EF Core migrations for SQLite databases.
/// </summary>
public class SqliteMigrationProvider(
    IOptions<ConnectionStrings> connectionStrings,
    ILogger<SqliteMigrationProvider> logger)
    : IMerchelloMigrationProvider
{
    public string ProviderName => "Microsoft.Data.Sqlite";

    public async Task MigrateAsync(CancellationToken cancellationToken = default)
    {
        // Create a DbContext with the correct MigrationsAssembly setting
        var optionsBuilder = new DbContextOptionsBuilder<MerchelloDbContext>();
        optionsBuilder.UseSqlite(
            connectionStrings.Value.ConnectionString,
            x => x.MigrationsAssembly(GetType().Assembly.FullName));

        await using var context = new MerchelloDbContext(optionsBuilder.Options);
        await context.Database.MigrateAsync(cancellationToken);
        await ApplySqliteConcurrencyPragmasAsync(context, cancellationToken);
    }

    private async Task ApplySqliteConcurrencyPragmasAsync(
        MerchelloDbContext context,
        CancellationToken cancellationToken)
    {
        try
        {
            // Persist WAL journaling mode on the SQLite database file.
            // This improves read concurrency when background jobs/imports are writing.
            await context.Database.ExecuteSqlRawAsync("PRAGMA journal_mode=WAL;", cancellationToken);
        }
        catch (Exception ex)
        {
            logger.LogWarning(ex, "Unable to enable SQLite WAL mode. Continuing with existing journal mode.");
        }
    }
}
