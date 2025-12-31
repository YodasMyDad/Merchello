namespace Merchello.Core.Data.Interfaces;

/// <summary>
/// Interface for provider-specific migration execution.
/// Implementations handle running EF Core migrations for a specific database provider.
/// </summary>
public interface IMerchelloMigrationProvider
{
    /// <summary>
    /// The database provider name (e.g., "Microsoft.Data.SqlClient" or "Microsoft.Data.Sqlite")
    /// </summary>
    string ProviderName { get; }

    /// <summary>
    /// Applies any pending EF Core migrations for this provider
    /// </summary>
    Task MigrateAsync(CancellationToken cancellationToken = default);
}
