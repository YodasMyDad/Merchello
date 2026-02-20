using Merchello.Core;
using Merchello.Core.Accounting;
using Merchello.Core.Caching.Services.Interfaces;
using Merchello.Core.Checkout;
using Merchello.Core.Checkout.Models;
using Merchello.Core.Data;
using Merchello.Core.Email;
using Merchello.Core.Settings.Dtos;
using Merchello.Core.Settings.Models;
using Merchello.Core.Settings.Services;
using Merchello.Core.Shared.Models;
using Merchello.Core.Shared.Services.Interfaces;
using Microsoft.AspNetCore.Http;
using Microsoft.Data.Sqlite;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using Moq;
using Shouldly;
using Umbraco.Cms.Core.Scoping;
using Umbraco.Cms.Persistence.EFCore.Scoping;
using Xunit;

namespace Merchello.Tests.Settings;

public class MerchelloStoreSettingsServiceTests : IDisposable
{
    private readonly SqliteConnection _connection;
    private readonly MerchelloDbContext _db;
    private readonly Mock<ICacheService> _cacheServiceMock;
    private readonly MerchelloStoreSettingsService _service;

    public MerchelloStoreSettingsServiceTests()
    {
        _connection = new SqliteConnection("DataSource=:memory:");
        _connection.Open();

        var dbOptions = new DbContextOptionsBuilder<MerchelloDbContext>()
            .UseSqlite(_connection)
            .Options;

        _db = new MerchelloDbContext(dbOptions);
        _db.Database.EnsureCreated();

        _cacheServiceMock = new Mock<ICacheService>();
        _cacheServiceMock
            .Setup(x => x.RemoveByTagAsync(It.IsAny<string>(), It.IsAny<CancellationToken>()))
            .Returns(Task.CompletedTask);

        var mediaUrlResolverMock = new Mock<IMediaUrlResolver>();
        mediaUrlResolverMock
            .Setup(x => x.ResolveMediaUrl(It.IsAny<Guid?>()))
            .Returns((Guid? _) => null);
        mediaUrlResolverMock
            .Setup(x => x.ResolveMediaUrl(It.IsAny<string?>()))
            .Returns((string? _) => null);

        _service = new MerchelloStoreSettingsService(
            CreateScopeProvider(_db),
            _cacheServiceMock.Object,
            CreateOptionsMonitor(new MerchelloSettings()),
            CreateOptionsMonitor(new CheckoutSettings()),
            CreateOptionsMonitor(new AbandonedCheckoutSettings()),
            CreateOptionsMonitor(new InvoiceReminderSettings()),
            CreateOptionsMonitor(new EmailSettings()),
            new Mock<IHttpContextAccessor>().Object,
            mediaUrlResolverMock.Object,
            new Mock<ILogger<MerchelloStoreSettingsService>>().Object);
    }

    [Fact]
    public async Task SaveStoreConfiguration_WhenOverdueReminderIntervalDaysIsZero_ClampsToOne()
    {
        var configuration = new StoreConfigurationDto
        {
            InvoiceReminders = new StoreConfigurationInvoiceRemindersDto
            {
                ReminderDaysBeforeDue = 7,
                OverdueReminderIntervalDays = 0,
                MaxOverdueReminders = 3,
                CheckIntervalHours = 24
            }
        };

        var result = await _service.SaveStoreConfigurationAsync(configuration, CancellationToken.None);

        result.Success.ShouldBeTrue();
        result.ResultObject.ShouldNotBeNull();
        result.ResultObject.InvoiceReminders.OverdueReminderIntervalDays.ShouldBe(1);

        _db.ChangeTracker.Clear();
        var persistedStore = await _db.MerchelloStores.AsNoTracking().SingleAsync();
        persistedStore.InvoiceReminders.OverdueReminderIntervalDays.ShouldBe(1);

        _cacheServiceMock.Verify(
            x => x.RemoveByTagAsync(Constants.CacheTags.StoreSettings, It.IsAny<CancellationToken>()),
            Times.Once);
    }

    [Fact]
    public async Task SaveStoreConfiguration_WhenAbandonedCheckoutIntervalsBelowRuntimeMinimums_ClampsToExpectedValues()
    {
        var configuration = new StoreConfigurationDto
        {
            AbandonedCheckout = new StoreConfigurationAbandonedCheckoutDto
            {
                AbandonmentThresholdHours = 0.1,
                RecoveryExpiryDays = 30,
                CheckIntervalMinutes = 1,
                FirstEmailDelayHours = 1,
                ReminderEmailDelayHours = 24,
                FinalEmailDelayHours = 48,
                MaxRecoveryEmails = 3
            }
        };

        var result = await _service.SaveStoreConfigurationAsync(configuration, CancellationToken.None);

        result.Success.ShouldBeTrue();
        result.ResultObject.ShouldNotBeNull();
        result.ResultObject.AbandonedCheckout.AbandonmentThresholdHours.ShouldBe(0.5);
        result.ResultObject.AbandonedCheckout.CheckIntervalMinutes.ShouldBe(5);

        _db.ChangeTracker.Clear();
        var persistedStore = await _db.MerchelloStores.AsNoTracking().SingleAsync();
        persistedStore.AbandonedCheckout.AbandonmentThresholdHours.ShouldBe(0.5);
        persistedStore.AbandonedCheckout.CheckIntervalMinutes.ShouldBe(5);
    }

    public void Dispose()
    {
        _db.Dispose();
        _connection.Dispose();
        GC.SuppressFinalize(this);
    }

    private static IOptionsMonitor<T> CreateOptionsMonitor<T>(T value) where T : class
    {
        var monitor = new Mock<IOptionsMonitor<T>>();
        monitor.Setup(x => x.CurrentValue).Returns(value);
        monitor.Setup(x => x.Get(It.IsAny<string>())).Returns(value);
        return monitor.Object;
    }

    private static IEFCoreScopeProvider<MerchelloDbContext> CreateScopeProvider(MerchelloDbContext db)
    {
        var scopeProviderMock = new Mock<IEFCoreScopeProvider<MerchelloDbContext>>();
        scopeProviderMock
            .Setup(p => p.CreateScope(It.IsAny<RepositoryCacheMode>(), It.IsAny<bool?>()))
            .Returns(() =>
            {
                var scopeMock = new Mock<IEfCoreScope<MerchelloDbContext>>();
                scopeMock
                    .Setup(s => s.ExecuteWithContextAsync(It.IsAny<Func<MerchelloDbContext, Task<MerchelloStore>>>()))
                    .Returns((Func<MerchelloDbContext, Task<MerchelloStore>> func) => func(db));
                scopeMock
                    .Setup(s => s.ExecuteWithContextAsync(It.IsAny<Func<MerchelloDbContext, Task<MerchelloStore?>>>()))
                    .Returns((Func<MerchelloDbContext, Task<MerchelloStore?>> func) => func(db));
                scopeMock.Setup(s => s.Complete()).Returns(true);
                return scopeMock.Object;
            });

        return scopeProviderMock.Object;
    }
}
