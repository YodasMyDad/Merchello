using Merchello.Core.Data.Handlers;
using Merchello.Core.Data.Interfaces;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using Moq;
using Umbraco.Cms.Core;
using Umbraco.Cms.Core.Configuration.Models;
using Umbraco.Cms.Core.Notifications;
using Umbraco.Cms.Core.Services;
using Xunit;

namespace Merchello.Tests.Data;

public class RunMerchMigrationTests
{
    [Fact]
    public async Task HandleAsync_WhenRuntimeLevelIsNotRun_DoesNotRunMigrations()
    {
        var migrationProvider = CreateMigrationProvider("Microsoft.Data.SqlClient");
        var logger = new Mock<ILogger<RunMerchMigration>>();
        var sut = CreateSut(
            [migrationProvider.Object],
            providerName: "Microsoft.Data.SqlClient",
            runtimeLevel: RuntimeLevel.Install,
            logger);

        await sut.HandleAsync(new UmbracoApplicationStartedNotification(false), CancellationToken.None);

        migrationProvider.Verify(x => x.MigrateAsync(It.IsAny<CancellationToken>()), Times.Never);
    }

    [Fact]
    public async Task HandleAsync_WhenRuntimeLevelIsRun_AndProviderMatches_RunsMigrations()
    {
        var migrationProvider = CreateMigrationProvider("Microsoft.Data.SqlClient");
        var logger = new Mock<ILogger<RunMerchMigration>>();
        var sut = CreateSut(
            [migrationProvider.Object],
            providerName: "Microsoft.Data.SqlClient",
            runtimeLevel: RuntimeLevel.Run,
            logger);

        await sut.HandleAsync(new UmbracoApplicationStartedNotification(false), CancellationToken.None);

        migrationProvider.Verify(x => x.MigrateAsync(It.IsAny<CancellationToken>()), Times.Once);
    }

    [Fact]
    public async Task HandleAsync_WhenRuntimeLevelIsRun_AndSqliteProviderNameVaries_RunsMigrations()
    {
        var migrationProvider = CreateMigrationProvider("Microsoft.Data.Sqlite");
        var logger = new Mock<ILogger<RunMerchMigration>>();
        var sut = CreateSut(
            [migrationProvider.Object],
            providerName: "Microsoft.Data.SQLite",
            runtimeLevel: RuntimeLevel.Run,
            logger);

        await sut.HandleAsync(new UmbracoApplicationStartedNotification(false), CancellationToken.None);

        migrationProvider.Verify(x => x.MigrateAsync(It.IsAny<CancellationToken>()), Times.Once);
    }

    [Fact]
    public async Task HandleAsync_WhenRuntimeLevelIsRun_AndProviderDoesNotMatch_DoesNotRunMigrations()
    {
        var migrationProvider = CreateMigrationProvider("Microsoft.Data.Sqlite");
        var logger = new Mock<ILogger<RunMerchMigration>>();
        var sut = CreateSut(
            [migrationProvider.Object],
            providerName: "Some.Other.Provider",
            runtimeLevel: RuntimeLevel.Run,
            logger);

        await sut.HandleAsync(new UmbracoApplicationStartedNotification(false), CancellationToken.None);

        migrationProvider.Verify(x => x.MigrateAsync(It.IsAny<CancellationToken>()), Times.Never);
    }

    private static RunMerchMigration CreateSut(
        IEnumerable<IMerchelloMigrationProvider> migrationProviders,
        string? providerName,
        RuntimeLevel runtimeLevel,
        Mock<ILogger<RunMerchMigration>> logger)
    {
        var connectionStrings = Options.Create(new ConnectionStrings
        {
            ProviderName = providerName
        });

        var runtimeState = new Mock<IRuntimeState>();
        runtimeState.SetupGet(x => x.Level).Returns(runtimeLevel);

        return new RunMerchMigration(
            migrationProviders,
            connectionStrings,
            runtimeState.Object,
            logger.Object);
    }

    private static Mock<IMerchelloMigrationProvider> CreateMigrationProvider(string providerName)
    {
        var provider = new Mock<IMerchelloMigrationProvider>();
        provider.SetupGet(x => x.ProviderName).Returns(providerName);
        provider.Setup(x => x.MigrateAsync(It.IsAny<CancellationToken>())).Returns(Task.CompletedTask);
        return provider;
    }
}
