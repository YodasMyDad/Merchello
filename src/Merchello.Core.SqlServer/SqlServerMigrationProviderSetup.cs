using Merchello.Core.Data;
using Merchello.Core.Data.Interfaces;
using Microsoft.EntityFrameworkCore;

namespace Merchello.Core.SqlServer;

/// <summary>
/// SQL Server implementation of IMerchelloMigrationProviderSetup.
/// Configures the DbContext to use SQL Server with migrations from this assembly.
/// </summary>
public class SqlServerMigrationProviderSetup : IMerchelloMigrationProviderSetup
{
    public string ProviderName => "Microsoft.Data.SqlClient";

    public void Setup(DbContextOptionsBuilder builder, string? connectionString)
    {
        builder.UseSqlServer(connectionString, x => x.MigrationsAssembly(GetType().Assembly.FullName));
    }
}
