using Merchello.Core.Accounting.Factories;
using Merchello.Core.Accounting.Models;
using Merchello.Core.Checkout;
using Merchello.Core.Checkout.Factories;
using Merchello.Core.Checkout.Models;
using Merchello.Core.Checkout.Services;
using Merchello.Core.Checkout.Services.Interfaces;
using Merchello.Core.Checkout.Services.Parameters;
using Merchello.Core.Data;
using Merchello.Core.Locality.Factories;
using Merchello.Core.Locality.Models;
using Merchello.Core.Notifications.Interfaces;
using Merchello.Core.Shared.Services.Interfaces;
using Merchello.Core.Shared.Models.Enums;
using Merchello.Tests.TestInfrastructure;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using Shouldly;
using Umbraco.Cms.Persistence.EFCore.Scoping;
using Xunit;

namespace Merchello.Tests.Checkout.Services;

public class AbandonedCheckoutServiceTests : IClassFixture<ServiceTestFixture>, IDisposable
{
    private readonly ServiceTestFixture _fixture;
    private readonly IAbandonedCheckoutService _service;
    private readonly ICurrencyService _currencyService;
    private readonly BasketFactory _basketFactory = new();
    private readonly AddressFactory _addressFactory = new();

    public AbandonedCheckoutServiceTests(ServiceTestFixture fixture)
    {
        _fixture = fixture;
        _fixture.ResetDatabase();
        _service = _fixture.GetService<IAbandonedCheckoutService>();
        _currencyService = _fixture.GetService<ICurrencyService>();
    }

    public void Dispose() => GC.SuppressFinalize(this);

    #region TrackCheckoutActivityAsync

    [Fact]
    public async Task TrackCheckoutActivity_WithBasketAndEmail_CreatesRecord()
    {
        var basket = CreateTestBasket();
        _fixture.DbContext.Baskets.Add(basket);
        await _fixture.DbContext.SaveChangesAsync();

        await _service.TrackCheckoutActivityAsync(basket, "customer@test.com");

        var record = await _service.GetByBasketIdAsync(basket.Id);
        record.ShouldNotBeNull();
        record.Email.ShouldBe("customer@test.com");
        record.Status.ShouldBe(AbandonedCheckoutStatus.Active);
        record.BasketTotal.ShouldBe(basket.Total);
    }

    [Fact]
    public async Task TrackCheckoutActivity_WithoutEmail_DoesNotCreateRecord()
    {
        var basket = CreateTestBasket();
        _fixture.DbContext.Baskets.Add(basket);
        await _fixture.DbContext.SaveChangesAsync();

        await _service.TrackCheckoutActivityAsync(basket, null);

        var record = await _service.GetByBasketIdAsync(basket.Id);
        record.ShouldBeNull();
    }

    [Fact]
    public async Task TrackCheckoutActivity_ExistingRecord_UpdatesActivity()
    {
        var basket = CreateTestBasket();
        _fixture.DbContext.Baskets.Add(basket);
        await _fixture.DbContext.SaveChangesAsync();

        // Track initial activity
        await _service.TrackCheckoutActivityAsync(basket, "customer@test.com");

        // Wait briefly and track again
        await Task.Delay(50);
        basket.Total = 150m;
        await _service.TrackCheckoutActivityAsync(basket, "customer@test.com");

        var record = await _service.GetByBasketIdAsync(basket.Id);
        record.ShouldNotBeNull();
        record.BasketTotal.ShouldBe(150m);
    }

    [Fact]
    public async Task TrackCheckoutActivity_AbandonedRecord_ResetsToActive()
    {
        var basket = CreateTestBasket();
        _fixture.DbContext.Baskets.Add(basket);
        var abandoned = new AbandonedCheckout
        {
            BasketId = basket.Id,
            Email = "customer@test.com",
            Status = AbandonedCheckoutStatus.Abandoned,
            DateAbandoned = DateTime.UtcNow.AddHours(-2),
            BasketTotal = 100m,
            RecoveryEmailsSent = 2
        };
        _fixture.DbContext.AbandonedCheckouts.Add(abandoned);
        await _fixture.DbContext.SaveChangesAsync();

        await _service.TrackCheckoutActivityAsync(basket, "customer@test.com");

        var record = await _service.GetByBasketIdAsync(basket.Id);
        record.ShouldNotBeNull();
        record.Status.ShouldBe(AbandonedCheckoutStatus.Active);
        record.RecoveryEmailsSent.ShouldBe(0);
        record.DateAbandoned.ShouldBeNull();
    }

    [Fact]
    public async Task TrackCheckoutActivity_UpdatesEmail_WhenDifferent()
    {
        var basket = CreateTestBasket();
        _fixture.DbContext.Baskets.Add(basket);
        await _fixture.DbContext.SaveChangesAsync();

        await _service.TrackCheckoutActivityAsync(basket, "old@test.com");
        await _service.TrackCheckoutActivityAsync(basket, "new@test.com");

        var record = await _service.GetByBasketIdAsync(basket.Id);
        record.ShouldNotBeNull();
        record.Email.ShouldBe("new@test.com");
    }

    [Fact]
    public async Task TrackCheckoutActivity_WithBasketId_RefreshesSnapshotFromBasket()
    {
        var basket = CreateTestBasket();
        _fixture.DbContext.Baskets.Add(basket);
        await _fixture.DbContext.SaveChangesAsync();

        await _service.TrackCheckoutActivityAsync(basket, "customer@test.com");

        _fixture.DbContext.ChangeTracker.Clear();
        var basketInDb = await _fixture.DbContext.Baskets.FindAsync(basket.Id);
        basketInDb.ShouldNotBeNull();
        basketInDb.Total = 225m;
        basketInDb.Currency = "USD";
        basketInDb.CurrencySymbol = "$";
        basketInDb.BillingAddress.Name = "Updated Name";
        basketInDb.BillingAddress.Email = "updated@example.com";
        var additionalItem = LineItemFactory.CreateCustomLineItem(
            Guid.Empty,
            "Another Product",
            "TEST-002",
            125m,
            cost: 0m,
            quantity: 1,
            isTaxable: false,
            taxRate: 0m);
        additionalItem.LineItemType = LineItemType.Product;
        basketInDb.LineItems.Add(additionalItem);
        await _fixture.DbContext.SaveChangesAsync();

        await _service.TrackCheckoutActivityAsync(basket.Id);

        var record = await _service.GetByBasketIdAsync(basket.Id);
        record.ShouldNotBeNull();
        record.BasketTotal.ShouldBe(225m);
        record.CurrencyCode.ShouldBe("USD");
        record.CurrencySymbol.ShouldBe("$");
        record.CustomerName.ShouldBe("Updated Name");
        record.ItemCount.ShouldBe(2);
    }

    #endregion

    #region DetectAbandonedCheckoutsAsync

    [Fact]
    public async Task DetectAbandoned_ActiveCheckoutPastThreshold_MarksAsAbandoned()
    {
        var abandoned = new AbandonedCheckout
        {
            BasketId = SeedBasket(),
            Email = "customer@test.com",
            Status = AbandonedCheckoutStatus.Active,
            LastActivityUtc = DateTime.UtcNow.AddHours(-2),
            BasketTotal = 50m
        };
        _fixture.DbContext.AbandonedCheckouts.Add(abandoned);
        await _fixture.DbContext.SaveChangesAsync();

        await _service.DetectAbandonedCheckoutsAsync(TimeSpan.FromHours(1));

        var record = await _service.GetByIdAsync(abandoned.Id);
        record.ShouldNotBeNull();
        record.Status.ShouldBe(AbandonedCheckoutStatus.Abandoned);
        record.DateAbandoned.ShouldNotBeNull();
        record.RecoveryToken.ShouldNotBeNullOrEmpty();
    }

    [Fact]
    public async Task DetectAbandoned_ActiveCheckoutWithinThreshold_RemainsActive()
    {
        var active = new AbandonedCheckout
        {
            BasketId = SeedBasket(),
            Email = "customer@test.com",
            Status = AbandonedCheckoutStatus.Active,
            LastActivityUtc = DateTime.UtcNow.AddMinutes(-30),
            BasketTotal = 50m
        };
        _fixture.DbContext.AbandonedCheckouts.Add(active);
        await _fixture.DbContext.SaveChangesAsync();

        await _service.DetectAbandonedCheckoutsAsync(TimeSpan.FromHours(1));

        var record = await _service.GetByIdAsync(active.Id);
        record.ShouldNotBeNull();
        record.Status.ShouldBe(AbandonedCheckoutStatus.Active);
    }

    [Fact]
    public async Task DetectAbandoned_AlreadyAbandoned_DoesNotReprocess()
    {
        var originalDate = DateTime.UtcNow.AddDays(-1);
        var abandoned = new AbandonedCheckout
        {
            BasketId = SeedBasket(),
            Email = "customer@test.com",
            Status = AbandonedCheckoutStatus.Abandoned,
            LastActivityUtc = DateTime.UtcNow.AddHours(-5),
            DateAbandoned = originalDate,
            BasketTotal = 50m
        };
        _fixture.DbContext.AbandonedCheckouts.Add(abandoned);
        await _fixture.DbContext.SaveChangesAsync();

        await _service.DetectAbandonedCheckoutsAsync(TimeSpan.FromHours(1));

        var record = await _service.GetByIdAsync(abandoned.Id);
        record.ShouldNotBeNull();
        record.DateAbandoned.ShouldBe(originalDate);
    }

    #endregion

    #region SendScheduledRecoveryEmailsAsync

    [Fact]
    public async Task SendScheduledRecoveryEmails_FirstEmailDue_IncrementsCounter()
    {
        var abandoned = new AbandonedCheckout
        {
            BasketId = SeedBasket(),
            Email = "customer@test.com",
            Status = AbandonedCheckoutStatus.Abandoned,
            DateAbandoned = DateTime.UtcNow.AddHours(-2),
            BasketTotal = 100m,
            RecoveryEmailsSent = 0
        };
        _fixture.DbContext.AbandonedCheckouts.Add(abandoned);
        await _fixture.DbContext.SaveChangesAsync();

        await _service.SendScheduledRecoveryEmailsAsync();

        var record = await _service.GetByIdAsync(abandoned.Id);
        record.ShouldNotBeNull();
        record.RecoveryEmailsSent.ShouldBe(1);
        record.LastRecoveryEmailSentUtc.ShouldNotBeNull();
    }

    [Fact]
    public async Task SendScheduledRecoveryEmails_ReminderDue_IncrementsCounter()
    {
        var abandoned = new AbandonedCheckout
        {
            BasketId = SeedBasket(),
            Email = "customer@test.com",
            Status = AbandonedCheckoutStatus.Abandoned,
            DateAbandoned = DateTime.UtcNow.AddDays(-2),
            BasketTotal = 100m,
            RecoveryEmailsSent = 1,
            LastRecoveryEmailSentUtc = DateTime.UtcNow.AddHours(-25)
        };
        _fixture.DbContext.AbandonedCheckouts.Add(abandoned);
        await _fixture.DbContext.SaveChangesAsync();

        await _service.SendScheduledRecoveryEmailsAsync();

        var record = await _service.GetByIdAsync(abandoned.Id);
        record.ShouldNotBeNull();
        record.RecoveryEmailsSent.ShouldBe(2);
        record.LastRecoveryEmailSentUtc.ShouldNotBeNull();
    }

    [Fact]
    public async Task SendScheduledRecoveryEmails_NotDue_DoesNotIncrementCounter()
    {
        var abandoned = new AbandonedCheckout
        {
            BasketId = SeedBasket(),
            Email = "customer@test.com",
            Status = AbandonedCheckoutStatus.Abandoned,
            DateAbandoned = DateTime.UtcNow.AddMinutes(-10),
            BasketTotal = 100m,
            RecoveryEmailsSent = 0
        };
        _fixture.DbContext.AbandonedCheckouts.Add(abandoned);
        await _fixture.DbContext.SaveChangesAsync();

        await _service.SendScheduledRecoveryEmailsAsync();

        var record = await _service.GetByIdAsync(abandoned.Id);
        record.ShouldNotBeNull();
        record.RecoveryEmailsSent.ShouldBe(0);
        record.LastRecoveryEmailSentUtc.ShouldBeNull();
    }

    [Fact]
    public async Task SendScheduledRecoveryEmails_FinalEmailDue_IncrementsCounter()
    {
        var abandoned = new AbandonedCheckout
        {
            BasketId = SeedBasket(),
            Email = "customer@test.com",
            Status = AbandonedCheckoutStatus.Abandoned,
            DateAbandoned = DateTime.UtcNow.AddDays(-4),
            BasketTotal = 100m,
            RecoveryEmailsSent = 2,
            LastRecoveryEmailSentUtc = DateTime.UtcNow.AddHours(-49)
        };
        _fixture.DbContext.AbandonedCheckouts.Add(abandoned);
        await _fixture.DbContext.SaveChangesAsync();

        await _service.SendScheduledRecoveryEmailsAsync();

        var record = await _service.GetByIdAsync(abandoned.Id);
        record.ShouldNotBeNull();
        record.RecoveryEmailsSent.ShouldBe(3);
        record.LastRecoveryEmailSentUtc.ShouldNotBeNull();
    }

    #endregion

    #region ExpireOldRecoveriesAsync

    [Fact]
    public async Task ExpireOldRecoveries_OldAbandoned_MarksAsExpired()
    {
        var abandoned = new AbandonedCheckout
        {
            BasketId = SeedBasket(),
            Email = "customer@test.com",
            Status = AbandonedCheckoutStatus.Abandoned,
            DateAbandoned = DateTime.UtcNow.AddDays(-31),
            BasketTotal = 50m
        };
        _fixture.DbContext.AbandonedCheckouts.Add(abandoned);
        await _fixture.DbContext.SaveChangesAsync();

        await _service.ExpireOldRecoveriesAsync(TimeSpan.FromDays(30));

        var record = await _service.GetByIdAsync(abandoned.Id);
        record.ShouldNotBeNull();
        record.Status.ShouldBe(AbandonedCheckoutStatus.Expired);
        record.DateExpired.ShouldNotBeNull();
    }

    [Fact]
    public async Task ExpireOldRecoveries_RecentAbandoned_RemainsAbandoned()
    {
        var abandoned = new AbandonedCheckout
        {
            BasketId = SeedBasket(),
            Email = "customer@test.com",
            Status = AbandonedCheckoutStatus.Abandoned,
            DateAbandoned = DateTime.UtcNow.AddDays(-5),
            BasketTotal = 50m
        };
        _fixture.DbContext.AbandonedCheckouts.Add(abandoned);
        await _fixture.DbContext.SaveChangesAsync();

        await _service.ExpireOldRecoveriesAsync(TimeSpan.FromDays(30));

        var record = await _service.GetByIdAsync(abandoned.Id);
        record.ShouldNotBeNull();
        record.Status.ShouldBe(AbandonedCheckoutStatus.Abandoned);
    }

    #endregion

    #region MarkAsRecoveredAsync / MarkAsConvertedAsync

    [Fact]
    public async Task MarkAsRecovered_UpdatesStatus()
    {
        var abandoned = new AbandonedCheckout
        {
            BasketId = SeedBasket(),
            Email = "customer@test.com",
            Status = AbandonedCheckoutStatus.Abandoned,
            DateAbandoned = DateTime.UtcNow.AddHours(-2),
            BasketTotal = 75m
        };
        _fixture.DbContext.AbandonedCheckouts.Add(abandoned);
        await _fixture.DbContext.SaveChangesAsync();

        await _service.MarkAsRecoveredAsync(abandoned.Id);

        var record = await _service.GetByIdAsync(abandoned.Id);
        record.ShouldNotBeNull();
        record.Status.ShouldBe(AbandonedCheckoutStatus.Recovered);
        record.DateRecovered.ShouldNotBeNull();
    }

    [Fact]
    public async Task MarkAsConverted_UpdatesStatusAndInvoiceId()
    {
        var invoiceId = Guid.NewGuid();
        var abandoned = new AbandonedCheckout
        {
            BasketId = SeedBasket(),
            Email = "customer@test.com",
            Status = AbandonedCheckoutStatus.Recovered,
            BasketTotal = 75m
        };
        _fixture.DbContext.AbandonedCheckouts.Add(abandoned);
        await _fixture.DbContext.SaveChangesAsync();

        await _service.MarkAsConvertedAsync(abandoned.Id, invoiceId);

        var record = await _service.GetByIdAsync(abandoned.Id);
        record.ShouldNotBeNull();
        record.Status.ShouldBe(AbandonedCheckoutStatus.Converted);
        record.RecoveredInvoiceId.ShouldBe(invoiceId);
        record.DateConverted.ShouldNotBeNull();
    }

    [Fact]
    public async Task MarkRecoveryEmailSent_IncrementsCountAndTimestamp()
    {
        var abandoned = new AbandonedCheckout
        {
            BasketId = SeedBasket(),
            Email = "customer@test.com",
            Status = AbandonedCheckoutStatus.Abandoned,
            BasketTotal = 75m,
            RecoveryEmailsSent = 1
        };
        _fixture.DbContext.AbandonedCheckouts.Add(abandoned);
        await _fixture.DbContext.SaveChangesAsync();

        var sentAt = DateTime.UtcNow.AddMinutes(-5);
        var updated = await _service.MarkRecoveryEmailSentAsync(abandoned.Id, sentAt);

        updated.ShouldBeTrue();
        var record = await _service.GetByIdAsync(abandoned.Id);
        record.ShouldNotBeNull();
        record.RecoveryEmailsSent.ShouldBe(2);
        record.LastRecoveryEmailSentUtc.ShouldBe(sentAt);
    }

    #endregion

    #region GenerateRecoveryLinkAsync

    [Fact]
    public async Task GenerateRecoveryLink_CreatesTokenAndReturnsUrl()
    {
        var abandoned = new AbandonedCheckout
        {
            BasketId = SeedBasket(),
            Email = "customer@test.com",
            Status = AbandonedCheckoutStatus.Abandoned,
            BasketTotal = 100m
        };
        _fixture.DbContext.AbandonedCheckouts.Add(abandoned);
        await _fixture.DbContext.SaveChangesAsync();

        var link = await _service.GenerateRecoveryLinkAsync(abandoned.Id);

        link.ShouldNotBeNullOrEmpty();
        link.ShouldStartWith("https://example.com/checkout/recover/");

        var record = await _service.GetByIdAsync(abandoned.Id);
        record.ShouldNotBeNull();
        record.RecoveryToken.ShouldNotBeNullOrEmpty();
        record.RecoveryTokenExpiresUtc.ShouldNotBeNull();
        record.RecoveryTokenExpiresUtc.Value.ShouldBeGreaterThan(DateTime.UtcNow);
    }

    [Fact]
    public async Task GenerateRecoveryLink_ExistingToken_ReusesToken()
    {
        var existingToken = "existing-recovery-token";
        var abandoned = new AbandonedCheckout
        {
            BasketId = SeedBasket(),
            Email = "customer@test.com",
            Status = AbandonedCheckoutStatus.Abandoned,
            BasketTotal = 100m,
            RecoveryToken = existingToken,
            RecoveryTokenExpiresUtc = DateTime.UtcNow.AddDays(15)
        };
        _fixture.DbContext.AbandonedCheckouts.Add(abandoned);
        await _fixture.DbContext.SaveChangesAsync();

        var link = await _service.GenerateRecoveryLinkAsync(abandoned.Id);

        link.ShouldContain(existingToken);
    }

    [Fact]
    public async Task GenerateRecoveryLink_ExpiredToken_RegeneratesToken()
    {
        var expiredToken = "expired-token";
        var abandoned = new AbandonedCheckout
        {
            BasketId = SeedBasket(),
            Email = "customer@test.com",
            Status = AbandonedCheckoutStatus.Abandoned,
            BasketTotal = 100m,
            RecoveryToken = expiredToken,
            RecoveryTokenExpiresUtc = DateTime.UtcNow.AddDays(-1) // Expired
        };
        _fixture.DbContext.AbandonedCheckouts.Add(abandoned);
        await _fixture.DbContext.SaveChangesAsync();

        var link = await _service.GenerateRecoveryLinkAsync(abandoned.Id);

        link.ShouldNotContain(expiredToken);
    }

    [Fact]
    public async Task GenerateRecoveryLink_NonExistentId_Throws()
    {
        await Should.ThrowAsync<InvalidOperationException>(
            () => _service.GenerateRecoveryLinkAsync(Guid.NewGuid()));
    }

    [Fact]
    public async Task GenerateRecoveryLink_RelativeBase_UsesWebsiteUrl()
    {
        var abandoned = new AbandonedCheckout
        {
            BasketId = SeedBasket(),
            Email = "customer@test.com",
            Status = AbandonedCheckoutStatus.Abandoned,
            BasketTotal = 100m
        };
        _fixture.DbContext.AbandonedCheckouts.Add(abandoned);
        await _fixture.DbContext.SaveChangesAsync();

        var relativeBaseService = new AbandonedCheckoutService(
            _fixture.GetService<IEFCoreScopeProvider<MerchelloDbContext>>(),
            _fixture.GetService<IMerchelloNotificationPublisher>(),
            Options.Create(new AbandonedCheckoutSettings
            {
                RecoveryUrlBase = "/checkout/recover"
            }),
            Options.Create(_fixture.GetService<IOptions<Merchello.Core.Shared.Models.MerchelloSettings>>().Value),
            _fixture.GetService<ILogger<AbandonedCheckoutService>>());

        var link = await relativeBaseService.GenerateRecoveryLinkAsync(abandoned.Id);

        link.ShouldStartWith("https://test.example.com/checkout/recover/");
    }

    #endregion

    #region GetByRecoveryTokenAsync

    [Fact]
    public async Task GetByRecoveryToken_ExistingToken_ReturnsRecord()
    {
        var token = "test-recovery-token-123";
        var abandoned = new AbandonedCheckout
        {
            BasketId = SeedBasket(),
            Email = "customer@test.com",
            Status = AbandonedCheckoutStatus.Abandoned,
            BasketTotal = 100m,
            RecoveryToken = token
        };
        _fixture.DbContext.AbandonedCheckouts.Add(abandoned);
        await _fixture.DbContext.SaveChangesAsync();

        var result = await _service.GetByRecoveryTokenAsync(token);

        result.ShouldNotBeNull();
        result.Id.ShouldBe(abandoned.Id);
    }

    [Fact]
    public async Task GetByRecoveryToken_NonExistentToken_ReturnsNull()
    {
        var result = await _service.GetByRecoveryTokenAsync("nonexistent");
        result.ShouldBeNull();
    }

    #endregion

    #region GetPagedAsync

    [Fact]
    public async Task GetPaged_ReturnsPagedResults()
    {
        for (var i = 0; i < 5; i++)
        {
            _fixture.DbContext.AbandonedCheckouts.Add(new AbandonedCheckout
            {
                BasketId = SeedBasket(),
                Email = $"user{i}@test.com",
                Status = AbandonedCheckoutStatus.Abandoned,
                DateAbandoned = DateTime.UtcNow.AddHours(-(i + 1)),
                BasketTotal = (i + 1) * 25m
            });
        }
        await _fixture.DbContext.SaveChangesAsync();

        var result = await _service.GetPagedAsync(new AbandonedCheckoutQueryParameters
        {
            Page = 1,
            PageSize = 3
        });

        result.Items.Count.ShouldBe(3);
        result.TotalItems.ShouldBe(5);
        result.TotalPages.ShouldBe(2);
    }

    [Fact]
    public async Task GetPaged_FilterByStatus_ReturnsFiltered()
    {
        _fixture.DbContext.AbandonedCheckouts.Add(new AbandonedCheckout
        {
            BasketId = SeedBasket(),
            Email = "active@test.com",
            Status = AbandonedCheckoutStatus.Active,
            BasketTotal = 50m
        });
        _fixture.DbContext.AbandonedCheckouts.Add(new AbandonedCheckout
        {
            BasketId = SeedBasket(),
            Email = "abandoned@test.com",
            Status = AbandonedCheckoutStatus.Abandoned,
            DateAbandoned = DateTime.UtcNow.AddHours(-1),
            BasketTotal = 75m
        });
        await _fixture.DbContext.SaveChangesAsync();

        var result = await _service.GetPagedAsync(new AbandonedCheckoutQueryParameters
        {
            Status = AbandonedCheckoutStatus.Abandoned
        });

        result.Items.Count.ShouldBe(1);
        result.Items[0].CustomerEmail.ShouldBe("abandoned@test.com");
    }

    [Fact]
    public async Task GetPaged_SearchByEmail_ReturnsMatches()
    {
        _fixture.DbContext.AbandonedCheckouts.Add(new AbandonedCheckout
        {
            BasketId = SeedBasket(),
            Email = "john@example.com",
            Status = AbandonedCheckoutStatus.Abandoned,
            DateAbandoned = DateTime.UtcNow,
            BasketTotal = 50m
        });
        _fixture.DbContext.AbandonedCheckouts.Add(new AbandonedCheckout
        {
            BasketId = SeedBasket(),
            Email = "jane@other.com",
            Status = AbandonedCheckoutStatus.Abandoned,
            DateAbandoned = DateTime.UtcNow,
            BasketTotal = 75m
        });
        await _fixture.DbContext.SaveChangesAsync();

        var result = await _service.GetPagedAsync(new AbandonedCheckoutQueryParameters
        {
            Search = "john"
        });

        result.Items.Count.ShouldBe(1);
        result.Items[0].CustomerEmail.ShouldBe("john@example.com");
    }

    #endregion

    #region GetStatsAsync

    [Fact]
    public async Task GetStats_CalculatesCorrectly()
    {
        _fixture.DbContext.AbandonedCheckouts.AddRange(
            new AbandonedCheckout { BasketId = SeedBasket(), Email = "a@t.com", Status = AbandonedCheckoutStatus.Abandoned, BasketTotal = 100m },
            new AbandonedCheckout { BasketId = SeedBasket(), Email = "b@t.com", Status = AbandonedCheckoutStatus.Recovered, BasketTotal = 200m },
            new AbandonedCheckout { BasketId = SeedBasket(), Email = "c@t.com", Status = AbandonedCheckoutStatus.Converted, BasketTotal = 300m },
            new AbandonedCheckout { BasketId = SeedBasket(), Email = "d@t.com", Status = AbandonedCheckoutStatus.Active, BasketTotal = 50m }
        );
        await _fixture.DbContext.SaveChangesAsync();

        var stats = await _service.GetStatsAsync();

        stats.TotalAbandoned.ShouldBe(3); // abandoned + recovered + converted
        stats.TotalRecovered.ShouldBe(2); // recovered + converted
        stats.TotalConverted.ShouldBe(1);
        stats.TotalValueRecovered.ShouldBe(300m); // only converted value
    }

    [Fact]
    public async Task GetStats_EmptyDatabase_ReturnsZeros()
    {
        var stats = await _service.GetStatsAsync();

        stats.TotalAbandoned.ShouldBe(0);
        stats.TotalRecovered.ShouldBe(0);
        stats.TotalConverted.ShouldBe(0);
        stats.RecoveryRate.ShouldBe(0);
        stats.ConversionRate.ShouldBe(0);
    }

    #endregion

    private Basket CreateTestBasket()
    {
        var basket = _basketFactory.Create(null, "GBP", _currencyService.GetCurrency("GBP").Symbol);
        var lineItem = LineItemFactory.CreateCustomLineItem(
            Guid.Empty,
            "Test Product",
            "TEST-001",
            100m,
            cost: 0m,
            quantity: 1,
            isTaxable: false,
            taxRate: 0m);
        lineItem.LineItemType = LineItemType.Product;
        lineItem.OrderId = null;
        basket.LineItems.Add(lineItem);
        basket.SubTotal = 100m;
        basket.Total = 100m;

        basket.BillingAddress = _addressFactory.CreateFromFormData(
            firstName: "John",
            lastName: "Doe",
            address1: "123 Main St",
            address2: null,
            city: "London",
            postalCode: "SW1A 1AA",
            countryCode: "GB",
            regionCode: null,
            phone: null,
            email: "customer@test.com");
        basket.ShippingAddress = _addressFactory.CreateFromFormData(
            firstName: "John",
            lastName: "Doe",
            address1: "123 Main St",
            address2: null,
            city: "London",
            postalCode: "SW1A 1AA",
            countryCode: "GB",
            regionCode: null,
            phone: null,
            email: null);
        return basket;
    }

    /// <summary>
    /// Seeds a minimal basket in the database and returns its ID.
    /// Required because AbandonedCheckout.BasketId has an FK to Basket.
    /// </summary>
    private Guid SeedBasket()
    {
        var basket = CreateTestBasket();
        _fixture.DbContext.Baskets.Add(basket);
        _fixture.DbContext.SaveChanges();
        return basket.Id;
    }
}
