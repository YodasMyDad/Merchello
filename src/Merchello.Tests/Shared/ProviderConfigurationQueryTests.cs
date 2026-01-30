using Merchello.Core.ExchangeRates.Models;
using Merchello.Core.Tax.Models;
using Merchello.Tests.TestInfrastructure;
using Microsoft.EntityFrameworkCore;
using Shouldly;
using Xunit;

namespace Merchello.Tests.Shared;

/// <summary>
/// Verifies that ProviderConfiguration subtype queries translate to SQL correctly.
/// Catches [NotMapped] property usage in LINQ-to-DB expressions.
/// </summary>
[Collection("Integration Tests")]
public class ProviderConfigurationQueryTests(ServiceTestFixture fixture) : IClassFixture<ServiceTestFixture>
{
    private readonly ServiceTestFixture _fixture = fixture;

    [Fact]
    public async Task ExchangeRateProviderSetting_QueryByIsEnabled_TranslatesToSql()
    {
        _fixture.ResetDatabase();

        _fixture.DbContext.ProviderConfigurations.Add(new ExchangeRateProviderSetting
        {
            ProviderKey = "test-exchange-provider",
            IsEnabled = true,
            CreateDate = DateTime.UtcNow,
            UpdateDate = DateTime.UtcNow
        });
        await _fixture.DbContext.SaveChangesAsync();
        _fixture.DbContext.ChangeTracker.Clear();

        var result = await _fixture.DbContext.ProviderConfigurations
            .OfType<ExchangeRateProviderSetting>()
            .AsNoTracking()
            .FirstOrDefaultAsync(s => s.IsEnabled);

        result.ShouldNotBeNull();
        result.ProviderKey.ShouldBe("test-exchange-provider");
        result.IsEnabled.ShouldBeTrue();
    }

    [Fact]
    public async Task TaxProviderSetting_QueryByIsEnabled_TranslatesToSql()
    {
        _fixture.ResetDatabase();

        _fixture.DbContext.ProviderConfigurations.Add(new TaxProviderSetting
        {
            ProviderKey = "test-tax-provider",
            IsEnabled = true,
            CreateDate = DateTime.UtcNow,
            UpdateDate = DateTime.UtcNow
        });
        await _fixture.DbContext.SaveChangesAsync();
        _fixture.DbContext.ChangeTracker.Clear();

        var result = await _fixture.DbContext.ProviderConfigurations
            .OfType<TaxProviderSetting>()
            .AsNoTracking()
            .FirstOrDefaultAsync(s => s.IsEnabled);

        result.ShouldNotBeNull();
        result.ProviderKey.ShouldBe("test-tax-provider");
        result.IsEnabled.ShouldBeTrue();
    }

    [Fact]
    public async Task ExchangeRateProviderSetting_QueryByProviderKey_TranslatesToSql()
    {
        _fixture.ResetDatabase();

        _fixture.DbContext.ProviderConfigurations.Add(new ExchangeRateProviderSetting
        {
            ProviderKey = "frankfurter",
            IsEnabled = false,
            CreateDate = DateTime.UtcNow,
            UpdateDate = DateTime.UtcNow
        });
        await _fixture.DbContext.SaveChangesAsync();
        _fixture.DbContext.ChangeTracker.Clear();

        var result = await _fixture.DbContext.ProviderConfigurations
            .OfType<ExchangeRateProviderSetting>()
            .AsNoTracking()
            .FirstOrDefaultAsync(s => s.ProviderKey == "frankfurter");

        result.ShouldNotBeNull();
        result.IsEnabled.ShouldBeFalse();
    }
}
