using Merchello.Core.Data;
using Merchello.Core.Data.Interfaces;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;
using Umbraco.Cms.Core.Configuration.Models;

namespace Merchello.Core.SqlServer;

/// <summary>
/// SQL Server implementation of IMerchelloMigrationProvider.
/// Handles executing EF Core migrations for SQL Server databases.
/// </summary>
public class SqlServerMigrationProvider(IOptions<ConnectionStrings> connectionStrings)
    : IMerchelloMigrationProvider
{
    public string ProviderName => "Microsoft.Data.SqlClient";

    public async Task MigrateAsync(CancellationToken cancellationToken = default)
    {
        // Create a DbContext with the correct MigrationsAssembly setting
        var optionsBuilder = new DbContextOptionsBuilder<MerchelloDbContext>();
        optionsBuilder.UseSqlServer(
            connectionStrings.Value.ConnectionString,
            x => x.MigrationsAssembly(GetType().Assembly.FullName));

        await using var context = new MerchelloDbContext(optionsBuilder.Options);
        await context.Database.MigrateAsync(cancellationToken);
    }
}
