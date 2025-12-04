using Merchello.Core.Data;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Design;

namespace Merchello.Core.Sqlite;

/// <summary>
/// Design-time factory for EF Core CLI tools.
/// Used when running 'dotnet ef migrations add' for SQLite.
/// </summary>
public class SqliteDbContextFactory : IDesignTimeDbContextFactory<MerchelloDbContext>
{
    public MerchelloDbContext CreateDbContext(string[] args)
    {
        var optionsBuilder = new DbContextOptionsBuilder<MerchelloDbContext>();
        optionsBuilder.UseSqlite(
            "Data Source=merchello_design.db",
            x => x.MigrationsAssembly(GetType().Assembly.FullName)
            .UseQuerySplittingBehavior(QuerySplittingBehavior.SplitQuery));
        return new MerchelloDbContext(optionsBuilder.Options);
    }
}
