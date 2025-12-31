using Microsoft.EntityFrameworkCore;

namespace Merchello.Core.Data.Interfaces;

/// <summary>
/// Interface for provider-specific DbContext configuration.
/// Implementations configure the DbContextOptionsBuilder with the correct provider and migration assembly.
/// </summary>
public interface IMerchelloMigrationProviderSetup
{
    /// <summary>
    /// The database provider name (e.g., "Microsoft.Data.SqlClient" or "Microsoft.Data.Sqlite")
    /// </summary>
    string ProviderName { get; }

    /// <summary>
    /// Configures the DbContextOptionsBuilder with the correct database provider and migration assembly
    /// </summary>
    void Setup(DbContextOptionsBuilder builder, string? connectionString);
}
