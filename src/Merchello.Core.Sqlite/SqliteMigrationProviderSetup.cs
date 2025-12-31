using Merchello.Core.Data;
using Merchello.Core.Data.Interfaces;
using Microsoft.EntityFrameworkCore;

namespace Merchello.Core.Sqlite;

/// <summary>
/// SQLite implementation of IMerchelloMigrationProviderSetup.
/// Configures the DbContext to use SQLite with migrations from this assembly.
/// </summary>
public class SqliteMigrationProviderSetup : IMerchelloMigrationProviderSetup
{
    public string ProviderName => "Microsoft.Data.Sqlite";

    public void Setup(DbContextOptionsBuilder builder, string? connectionString)
    {
        builder.UseSqlite(connectionString, x => x.MigrationsAssembly(GetType().Assembly.FullName));
    }
}
