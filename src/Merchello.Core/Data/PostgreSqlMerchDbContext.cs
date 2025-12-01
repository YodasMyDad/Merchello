using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Diagnostics;
using Microsoft.Extensions.Configuration;

namespace Merchello.Core.Data;

public class PostgreSqlMerchDbContext(
    DbContextOptions<PostgreSqlMerchDbContext> options,
    IConfiguration configuration)
    : MerchDbContextBase(options, configuration), IMerchDbContext
{
    private readonly IConfiguration _configuration = configuration;

    protected override void OnConfiguring(DbContextOptionsBuilder options)
    {
        var section = _configuration.GetSection("Merch");
        var connectionString = section.GetValue<string>("ConnectionString");
        options.UseNpgsql(connectionString, builder =>
        {
            builder.MigrationsHistoryTable(tableName: "MerchMigrations");
            builder.UseQuerySplittingBehavior(QuerySplittingBehavior.SplitQuery);
        });
#if DEBUG
        options.EnableSensitiveDataLogging();
#endif
        options
            .ConfigureWarnings(warnings => warnings.Ignore(RelationalEventId.PendingModelChangesWarning));
    }
}

