using Merchello.Core.Data;
using Merchello.Core.Data.Interfaces;
using Microsoft.Extensions.DependencyInjection;
using Umbraco.Cms.Core.Composing;
using Umbraco.Cms.Core.DependencyInjection;

namespace Merchello.Core.Sqlite;

/// <summary>
/// Umbraco composer that registers SQLite migration services.
/// Auto-discovered by Umbraco at startup.
/// </summary>
public class EFCoreSqliteComposer : IComposer
{
    public void Compose(IUmbracoBuilder builder)
    {
        builder.Services.AddSingleton<IMerchelloMigrationProvider, SqliteMigrationProvider>();
        builder.Services.AddSingleton<IMerchelloMigrationProviderSetup, SqliteMigrationProviderSetup>();
    }
}
