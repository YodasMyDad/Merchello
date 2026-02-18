using System.Text;
using Merchello.Core.Data;
using Merchello.Core.Accounting.Services.Interfaces;
using Merchello.Core.ProductSync;
using Merchello.Core.ProductSync.Dtos;
using Merchello.Core.ProductSync.Factories;
using Merchello.Core.ProductSync.Models;
using Merchello.Core.ProductSync.Services;
using Merchello.Core.ProductSync.Services.Interfaces;
using Merchello.Core.Products.Models;
using Merchello.Core.Products.Services.Interfaces;
using Merchello.Core.Shared.Models;
using Microsoft.Data.Sqlite;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging.Abstractions;
using Microsoft.Extensions.Options;
using Moq;
using Shouldly;
using Umbraco.Cms.Core.IO;
using Umbraco.Cms.Core.PropertyEditors;
using Umbraco.Cms.Core.Scoping;
using Umbraco.Cms.Core.Services;
using Umbraco.Cms.Core.Strings;
using Umbraco.Cms.Persistence.EFCore.Scoping;
using Xunit;

using CleanupBuckets = System.ValueTuple<System.Collections.Generic.List<System.ValueTuple<System.Guid, string?, string?>>, System.Collections.Generic.List<System.ValueTuple<System.Guid, string?, string?>>>;

namespace Merchello.Tests.ProductSync.Services;

public class ProductSyncServiceIntegrationTests
{
    [Fact]
    public async Task StartImportAsync_WhenImportAlreadyActive_ReturnsConflictErrorAndDoesNotQueueNewRun()
    {
        var sut = CreateSut();
        try
        {
            var existingRun = sut.RunFactory.CreateImportRun(
                ProductSyncProfile.ShopifyStrict,
                requestedByUserId: "existing-user",
                requestedByUserName: "Existing User",
                inputFileName: "existing.csv",
                inputFilePath: Path.Combine(sut.ContentRootPath, "missing-existing.csv"),
                options: new ProductSyncImportRunOptions());
            existingRun.Status = ProductSyncRunStatus.Running;

            await using (var db = sut.CreateDbContext())
            {
                db.ProductSyncRuns.Add(existingRun);
                await db.SaveChangesAsync();
            }

            await using var csv = BuildCsvStream("Handle,Title\nshirt,Shirt");
            var result = await sut.Service.StartImportAsync(
                csv,
                "products.csv",
                new StartProductImportDto
                {
                    Profile = ProductSyncProfile.ShopifyStrict
                },
                requestedByUserId: "new-user",
                requestedByUserName: "New User",
                cancellationToken: CancellationToken.None);

            result.Success.ShouldBeFalse();
            result.Messages.ShouldContain(x =>
                x.Message != null &&
                x.Message.Contains("already queued or running", StringComparison.OrdinalIgnoreCase));

            await using var verifyDb = sut.CreateDbContext();
            var runCount = await verifyDb.ProductSyncRuns.CountAsync();
            runCount.ShouldBe(1);
        }
        finally
        {
            sut.Dispose();
        }
    }

    [Fact]
    public async Task StartImportAsync_WhenValidationFails_DoesNotQueueRun()
    {
        var sut = CreateSut();
        try
        {
            await using var csv = BuildCsvStream("Handle,Title,Custom Column\nshirt,Shirt,unsupported");
            var result = await sut.Service.StartImportAsync(
                csv,
                "products.csv",
                new StartProductImportDto
                {
                    Profile = ProductSyncProfile.ShopifyStrict
                },
                requestedByUserId: "user",
                requestedByUserName: "User",
                cancellationToken: CancellationToken.None);

            result.Success.ShouldBeFalse();
            result.Messages.ShouldContain(x =>
                x.Message != null &&
                x.Message.Contains("Validation failed", StringComparison.OrdinalIgnoreCase));

            await using var verifyDb = sut.CreateDbContext();
            var runs = await verifyDb.ProductSyncRuns.ToListAsync();
            runs.Count.ShouldBe(0);
        }
        finally
        {
            sut.Dispose();
        }
    }

    [Fact]
    public async Task TryProcessNextQueuedRunAsync_WhenImportArtifactMissing_FailsRunAndPersistsIssue()
    {
        var sut = CreateSut();
        try
        {
            var queuedRun = sut.RunFactory.CreateImportRun(
                ProductSyncProfile.ShopifyStrict,
                requestedByUserId: "user",
                requestedByUserName: "User",
                inputFileName: "products.csv",
                inputFilePath: BuildMissingArtifactPath(sut.ContentRootPath, "does-not-exist.csv"),
                options: new ProductSyncImportRunOptions());
            queuedRun.Status = ProductSyncRunStatus.Queued;

            await using (var db = sut.CreateDbContext())
            {
                db.ProductSyncRuns.Add(queuedRun);
                await db.SaveChangesAsync();
            }

            var processed = await sut.Service.TryProcessNextQueuedRunAsync(CancellationToken.None);
            processed.ShouldBeTrue();

            await using var verifyDb = sut.CreateDbContext();
            var persistedRun = await verifyDb.ProductSyncRuns.FirstAsync(x => x.Id == queuedRun.Id);
            persistedRun.Status.ShouldBe(ProductSyncRunStatus.Failed);
            persistedRun.ItemsFailed.ShouldBe(1);
            persistedRun.ErrorCount.ShouldBeGreaterThanOrEqualTo(1);
            persistedRun.ErrorMessage.ShouldNotBeNull();
            persistedRun.ErrorMessage.ShouldContain("Input CSV artifact could not be opened.");

            var issues = await verifyDb.ProductSyncIssues
                .Where(x => x.RunId == queuedRun.Id)
                .ToListAsync();
            issues.ShouldContain(x => x.Code == "input_artifact_missing");
        }
        finally
        {
            sut.Dispose();
        }
    }

    [Fact]
    public async Task TryProcessNextQueuedRunAsync_ForExportRun_CompletesAndCreatesDownloadableArtifact()
    {
        var sut = CreateSut();
        try
        {
            var startResult = await sut.Service.StartExportAsync(
                new StartProductExportDto
                {
                    Profile = ProductSyncProfile.ShopifyStrict
                },
                requestedByUserId: "user",
                requestedByUserName: "User",
                cancellationToken: CancellationToken.None);

            startResult.Success.ShouldBeTrue();
            startResult.ResultObject.ShouldNotBeNull();
            var runId = startResult.ResultObject!.Id;

            var queuedArtifact = await sut.Service.OpenExportArtifactAsync(runId, CancellationToken.None);
            queuedArtifact.ShouldBeNull();

            var processed = await sut.Service.TryProcessNextQueuedRunAsync(CancellationToken.None);
            processed.ShouldBeTrue();

            await using (var verifyDb = sut.CreateDbContext())
            {
                var run = await verifyDb.ProductSyncRuns.FirstAsync(x => x.Id == runId);
                run.Status.ShouldBe(ProductSyncRunStatus.Completed);
                run.ItemsProcessed.ShouldBe(0);
                run.ItemsFailed.ShouldBe(0);
                run.OutputFilePath.ShouldNotBeNullOrWhiteSpace();
                File.Exists(run.OutputFilePath).ShouldBeTrue();
            }

            var artifact = await sut.Service.OpenExportArtifactAsync(runId, CancellationToken.None);
            artifact.ShouldNotBeNull();
            artifact.Value.ContentType.ShouldBe("text/csv");

            using var reader = new StreamReader(artifact.Value.Stream, Encoding.UTF8, detectEncodingFromByteOrderMarks: true);
            var csv = await reader.ReadToEndAsync();
            csv.ShouldContain("Handle,Title,Body (HTML)");
        }
        finally
        {
            sut.Dispose();
        }
    }

    [Fact]
    public async Task TryProcessNextQueuedRunAsync_WhenImportAlreadyRunning_SkipsQueuedImportAndProcessesExport()
    {
        var sut = CreateSut();
        try
        {
            var runningImport = sut.RunFactory.CreateImportRun(
                ProductSyncProfile.ShopifyStrict,
                requestedByUserId: "running-user",
                requestedByUserName: "Running",
                inputFileName: "running.csv",
                inputFilePath: BuildMissingArtifactPath(sut.ContentRootPath, "running.csv"),
                options: new ProductSyncImportRunOptions());
            runningImport.Status = ProductSyncRunStatus.Running;
            runningImport.StartedAtUtc = DateTime.UtcNow.AddMinutes(-2);
            runningImport.DateCreatedUtc = DateTime.UtcNow.AddMinutes(-10);

            var queuedImport = sut.RunFactory.CreateImportRun(
                ProductSyncProfile.ShopifyStrict,
                requestedByUserId: "queued-user",
                requestedByUserName: "Queued",
                inputFileName: "queued.csv",
                inputFilePath: BuildMissingArtifactPath(sut.ContentRootPath, "queued.csv"),
                options: new ProductSyncImportRunOptions());
            queuedImport.Status = ProductSyncRunStatus.Queued;
            queuedImport.DateCreatedUtc = DateTime.UtcNow.AddMinutes(-9);

            var queuedExport = sut.RunFactory.CreateExportRun(
                ProductSyncProfile.ShopifyStrict,
                requestedByUserId: "export-user",
                requestedByUserName: "Export",
                options: new ProductSyncExportRunOptions());
            queuedExport.Status = ProductSyncRunStatus.Queued;
            queuedExport.DateCreatedUtc = DateTime.UtcNow.AddMinutes(-8);

            await using (var db = sut.CreateDbContext())
            {
                db.ProductSyncRuns.AddRange(runningImport, queuedImport, queuedExport);
                await db.SaveChangesAsync();
            }

            var processed = await sut.Service.TryProcessNextQueuedRunAsync(CancellationToken.None);
            processed.ShouldBeTrue();

            await using var verifyDb = sut.CreateDbContext();
            var importStillQueued = await verifyDb.ProductSyncRuns.FirstAsync(x => x.Id == queuedImport.Id);
            importStillQueued.Status.ShouldBe(ProductSyncRunStatus.Queued);

            var exportProcessed = await verifyDb.ProductSyncRuns.FirstAsync(x => x.Id == queuedExport.Id);
            exportProcessed.Status.ShouldBe(ProductSyncRunStatus.Completed);
        }
        finally
        {
            sut.Dispose();
        }
    }

    [Fact]
    public async Task CleanupRunsAsync_ClearsOldArtifactPathsAndDeletesOldRuns()
    {
        var settings = new ProductSyncSettings
        {
            ArtifactStoragePath = "App_Data/ProductSync",
            MaxCsvBytes = 1024 * 1024,
            MaxValidationIssuesReturned = 1000,
            RunRetentionDays = 3,
            ArtifactRetentionDays = 1,
            WorkerIntervalSeconds = 2,
            ImageDownloadTimeoutSeconds = 5,
            MaxImageBytes = 1024 * 1024
        };

        var sut = CreateSut(settings);
        try
        {
            var (oldArtifactInputName, oldArtifactInputPath) = await SaveImportArtifactAsync(
                sut.ArtifactService,
                "old-artifact-input.csv",
                "Handle,Title\nold,Old Artifact");

            var (oldRunInputName, oldRunInputPath) = await SaveImportArtifactAsync(
                sut.ArtifactService,
                "old-run-input.csv",
                "Handle,Title\noldrun,Old Run");

            var (recentInputName, recentInputPath) = await SaveImportArtifactAsync(
                sut.ArtifactService,
                "recent-input.csv",
                "Handle,Title\nrecent,Recent");

            var (oldRunOutputName, oldRunOutputPath) = await CreateExportArtifactAsync(
                sut.ArtifactService,
                "old-run-output.csv",
                "Handle,Title\noldrun,Old Run Export");

            var (recentOutputName, recentOutputPath) = await CreateExportArtifactAsync(
                sut.ArtifactService,
                "recent-output.csv",
                "Handle,Title\nrecent,Recent Export");

            var artifactOnlyRun = sut.RunFactory.CreateImportRun(
                ProductSyncProfile.ShopifyStrict,
                requestedByUserId: "artifact-user",
                requestedByUserName: "Artifact User",
                inputFileName: oldArtifactInputName,
                inputFilePath: oldArtifactInputPath,
                options: new ProductSyncImportRunOptions());
            artifactOnlyRun.OutputFileName = null;
            artifactOnlyRun.OutputFilePath = null;
            artifactOnlyRun.DateCreatedUtc = DateTime.UtcNow.AddDays(-2);

            var oldRun = sut.RunFactory.CreateExportRun(
                ProductSyncProfile.ShopifyStrict,
                requestedByUserId: "old-user",
                requestedByUserName: "Old User",
                options: new ProductSyncExportRunOptions());
            oldRun.InputFileName = oldRunInputName;
            oldRun.InputFilePath = oldRunInputPath;
            oldRun.OutputFileName = oldRunOutputName;
            oldRun.OutputFilePath = oldRunOutputPath;
            oldRun.DateCreatedUtc = DateTime.UtcNow.AddDays(-5);

            var recentRun = sut.RunFactory.CreateExportRun(
                ProductSyncProfile.ShopifyStrict,
                requestedByUserId: "recent-user",
                requestedByUserName: "Recent User",
                options: new ProductSyncExportRunOptions());
            recentRun.InputFileName = recentInputName;
            recentRun.InputFilePath = recentInputPath;
            recentRun.OutputFileName = recentOutputName;
            recentRun.OutputFilePath = recentOutputPath;
            recentRun.DateCreatedUtc = DateTime.UtcNow.AddHours(-1);

            await using (var db = sut.CreateDbContext())
            {
                db.ProductSyncRuns.AddRange(artifactOnlyRun, oldRun, recentRun);
                await db.SaveChangesAsync();
            }

            await sut.Service.CleanupRunsAsync(CancellationToken.None);

            await using var verifyDb = sut.CreateDbContext();
            var persistedArtifactOnlyRun = await verifyDb.ProductSyncRuns.FirstOrDefaultAsync(x => x.Id == artifactOnlyRun.Id);
            persistedArtifactOnlyRun.ShouldNotBeNull();
            persistedArtifactOnlyRun.InputFilePath.ShouldBeNull();
            persistedArtifactOnlyRun.OutputFilePath.ShouldBeNull();

            var deletedOldRun = await verifyDb.ProductSyncRuns.FirstOrDefaultAsync(x => x.Id == oldRun.Id);
            deletedOldRun.ShouldBeNull();

            var persistedRecentRun = await verifyDb.ProductSyncRuns.FirstOrDefaultAsync(x => x.Id == recentRun.Id);
            persistedRecentRun.ShouldNotBeNull();
            persistedRecentRun.InputFilePath.ShouldBe(recentInputPath);
            persistedRecentRun.OutputFilePath.ShouldBe(recentOutputPath);

            File.Exists(oldArtifactInputPath).ShouldBeFalse();
            File.Exists(oldRunInputPath).ShouldBeFalse();
            File.Exists(oldRunOutputPath).ShouldBeFalse();
            File.Exists(recentInputPath).ShouldBeTrue();
            File.Exists(recentOutputPath).ShouldBeTrue();
        }
        finally
        {
            sut.Dispose();
        }
    }

    private static ProductSyncTestContext CreateSut(ProductSyncSettings? settingsOverride = null)
    {
        var contentRoot = Path.Combine(Path.GetTempPath(), $"merchello-product-sync-tests-{Guid.NewGuid():N}");
        Directory.CreateDirectory(contentRoot);

        var databasePath = Path.Combine(contentRoot, "product-sync-tests.sqlite");
        var connectionString = new SqliteConnectionStringBuilder
        {
            DataSource = databasePath,
            Cache = SqliteCacheMode.Shared,
            Pooling = false
        }.ToString();

        MerchelloDbContext CreateDbContext()
        {
            var options = new DbContextOptionsBuilder<MerchelloDbContext>()
                .UseSqlite(connectionString)
                .Options;
            return new MerchelloDbContext(options);
        }

        using (var setupDb = CreateDbContext())
        {
            setupDb.Database.EnsureCreated();
        }

        var productSyncSettings = settingsOverride ?? new ProductSyncSettings
        {
            ArtifactStoragePath = "App_Data/ProductSync",
            MaxCsvBytes = 1024 * 1024,
            MaxValidationIssuesReturned = 1000,
            RunRetentionDays = 90,
            ArtifactRetentionDays = 30,
            WorkerIntervalSeconds = 2,
            ImageDownloadTimeoutSeconds = 5,
            MaxImageBytes = 1024 * 1024
        };

        var hostEnvironmentMock = new Mock<IHostEnvironment>();
        hostEnvironmentMock.SetupGet(x => x.ContentRootPath).Returns(contentRoot);

        var artifactService = new ProductSyncArtifactService(
            hostEnvironmentMock.Object,
            Options.Create(productSyncSettings),
            NullLogger<ProductSyncArtifactService>.Instance);

        var service = new ProductSyncService(
            CreateScopeProvider(CreateDbContext),
            new ShopifyCsvMapper(),
            new ShopifyCsvImportValidator(),
            artifactService,
            new ProductSyncRunFactory(),
            new ProductSyncIssueFactory(),
            Mock.Of<IProductService>(),
            Mock.Of<IProductTypeService>(),
            Mock.Of<ITaxService>(),
            Mock.Of<IMediaService>(),
            null!,
            new MediaUrlGeneratorCollection(() => []),
            Mock.Of<IShortStringHelper>(),
            Mock.Of<IContentTypeBaseServiceProvider>(),
            Mock.Of<IHttpClientFactory>(),
            Options.Create(new MerchelloSettings
            {
                Store = new StoreSettings
                {
                    WebsiteUrl = "https://test.example.com"
                }
            }),
            Options.Create(productSyncSettings),
            NullLogger<ProductSyncService>.Instance);

        return new ProductSyncTestContext(
            service,
            artifactService,
            new ProductSyncRunFactory(),
            CreateDbContext,
            contentRoot);
    }

    private static IEFCoreScopeProvider<MerchelloDbContext> CreateScopeProvider(Func<MerchelloDbContext> dbContextFactory)
    {
        var scopeProviderMock = new Mock<IEFCoreScopeProvider<MerchelloDbContext>>();
        scopeProviderMock
            .Setup(x => x.CreateScope(It.IsAny<RepositoryCacheMode>(), It.IsAny<bool?>()))
            .Returns(() =>
            {
                var dbContext = dbContextFactory();
                var scopeMock = new Mock<IEfCoreScope<MerchelloDbContext>>();

                scopeMock
                    .Setup(s => s.ExecuteWithContextAsync(It.IsAny<Func<MerchelloDbContext, Task<bool>>>()))
                    .Returns((Func<MerchelloDbContext, Task<bool>> func) => func(dbContext));

                scopeMock
                    .Setup(s => s.ExecuteWithContextAsync(It.IsAny<Func<MerchelloDbContext, Task<Guid?>>>()))
                    .Returns((Func<MerchelloDbContext, Task<Guid?>> func) => func(dbContext));

                scopeMock
                    .Setup(s => s.ExecuteWithContextAsync(It.IsAny<Func<MerchelloDbContext, Task<ProductSyncRun?>>>()))
                    .Returns((Func<MerchelloDbContext, Task<ProductSyncRun?>> func) => func(dbContext));

                scopeMock
                    .Setup(s => s.ExecuteWithContextAsync(It.IsAny<Func<MerchelloDbContext, Task<List<ProductRoot>>>>()))
                    .Returns((Func<MerchelloDbContext, Task<List<ProductRoot>>> func) => func(dbContext));

                scopeMock
                    .Setup(s => s.ExecuteWithContextAsync(It.IsAny<Func<MerchelloDbContext, Task<CleanupBuckets>>>()))
                    .Returns((Func<MerchelloDbContext, Task<CleanupBuckets>> func) => func(dbContext));

                scopeMock.Setup(s => s.Complete()).Returns(true);
                scopeMock.Setup(s => s.Dispose()).Callback(dbContext.Dispose);

                return scopeMock.Object;
            });

        return scopeProviderMock.Object;
    }

    private static MemoryStream BuildCsvStream(string csv)
        => new(Encoding.UTF8.GetBytes(csv));

    private static string BuildMissingArtifactPath(string contentRootPath, string fileName)
        => Path.Combine(contentRootPath, "App_Data", "ProductSync", "imports", "19000101", fileName);

    private static async Task<(string FileName, string FilePath)> SaveImportArtifactAsync(
        IProductSyncArtifactService artifactService,
        string fileName,
        string csv)
    {
        await using var stream = BuildCsvStream(csv);
        return await artifactService.SaveImportArtifactAsync(fileName, stream, CancellationToken.None);
    }

    private static async Task<(string FileName, string FilePath)> CreateExportArtifactAsync(
        IProductSyncArtifactService artifactService,
        string fileName,
        string csv)
    {
        var (savedFileName, savedFilePath, output) = await artifactService.CreateExportArtifactAsync(fileName, CancellationToken.None);
        await using (output)
        {
            using var writer = new StreamWriter(output, Encoding.UTF8, 1024, leaveOpen: false);
            await writer.WriteAsync(csv);
            await writer.FlushAsync();
        }

        return (savedFileName, savedFilePath);
    }

    private sealed class ProductSyncTestContext(
        IProductSyncService service,
        IProductSyncArtifactService artifactService,
        ProductSyncRunFactory runFactory,
        Func<MerchelloDbContext> createDbContext,
        string contentRootPath) : IDisposable
    {
        public IProductSyncService Service { get; } = service;
        public IProductSyncArtifactService ArtifactService { get; } = artifactService;
        public ProductSyncRunFactory RunFactory { get; } = runFactory;
        public Func<MerchelloDbContext> CreateDbContext { get; } = createDbContext;
        public string ContentRootPath { get; } = contentRootPath;

        public void Dispose()
        {
            try
            {
                if (Directory.Exists(ContentRootPath))
                {
                    Directory.Delete(ContentRootPath, recursive: true);
                }
            }
            catch
            {
                // Best-effort cleanup for temp directories.
            }
        }
    }
}
