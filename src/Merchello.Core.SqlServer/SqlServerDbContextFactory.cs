using Merchello.Core.Data;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Design;

namespace Merchello.Core.SqlServer;

/// <summary>
/// Design-time factory for EF Core CLI tools.
/// Used when running 'dotnet ef migrations add' for SQL Server.
/// </summary>
public class SqlServerDbContextFactory : IDesignTimeDbContextFactory<MerchelloDbContext>
{
    public MerchelloDbContext CreateDbContext(string[] args)
    {
        var optionsBuilder = new DbContextOptionsBuilder<MerchelloDbContext>();
        optionsBuilder.UseSqlServer(
            "Server=.;Database=Merchello_Design;Trusted_Connection=True;TrustServerCertificate=True;",
            x => x.MigrationsAssembly(GetType().Assembly.FullName)
                  .UseQuerySplittingBehavior(QuerySplittingBehavior.SplitQuery));
        return new MerchelloDbContext(optionsBuilder.Options);
    }
}
