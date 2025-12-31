using Merchello.Core.Data;
using Merchello.Core.Data.Interfaces;
using Microsoft.Extensions.DependencyInjection;
using Umbraco.Cms.Core.Composing;
using Umbraco.Cms.Core.DependencyInjection;

namespace Merchello.Core.SqlServer;

/// <summary>
/// Umbraco composer that registers SQL Server migration services.
/// Auto-discovered by Umbraco at startup.
/// </summary>
public class EFCoreSqlServerComposer : IComposer
{
    public void Compose(IUmbracoBuilder builder)
    {
        builder.Services.AddSingleton<IMerchelloMigrationProvider, SqlServerMigrationProvider>();
        builder.Services.AddSingleton<IMerchelloMigrationProviderSetup, SqlServerMigrationProviderSetup>();
    }
}
