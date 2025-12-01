using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Diagnostics;
using Microsoft.Extensions.Configuration;

namespace Merchello.Core.Data;

public class MerchDbContextTests(DbContextOptions<MerchDbContextTests> options, IConfiguration configuration)
    : MerchDbContextBase(options, configuration), IMerchDbContext
{
    protected override void OnConfiguring(DbContextOptionsBuilder options)
    {
        options.UseSqlite("DataSource=:memory:");
#if DEBUG
        options.EnableSensitiveDataLogging();
#endif
        options
            .ConfigureWarnings(warnings => warnings.Ignore(RelationalEventId.PendingModelChangesWarning));
    }
}
