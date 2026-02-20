using Merchello.Core.Locality.Models;
using Merchello.Core.Tax.Providers.BuiltIn;
using Merchello.Core.Tax.Providers.Models;
using Shouldly;
using Xunit;

namespace Merchello.Tests.Tax.Providers;

/// <summary>
/// Optional live Avalara tests. Disabled by default and only run when explicitly enabled via environment variables.
/// </summary>
public class AvalaraTaxProviderLiveIntegrationTests
{
    private const string AccountIdEnvVar = "MERCHELLO_AVALARA_ACCOUNT_ID";
    private const string LicenseKeyEnvVar = "MERCHELLO_AVALARA_LICENSE_KEY";
    private const string CompanyCodeEnvVar = "MERCHELLO_AVALARA_COMPANY_CODE";
    private const string EnvironmentEnvVar = "MERCHELLO_AVALARA_ENVIRONMENT";

    [AvalaraLiveFact]
    public async Task ValidateConfigurationAsync_WithLiveCredentials_ReturnsValid()
    {
        var provider = await CreateConfiguredProviderAsync();

        var result = await provider.ValidateConfigurationAsync();

        result.IsValid.ShouldBeTrue(result.ErrorMessage ?? "Expected Avalara live validation to succeed.");
    }

    [AvalaraLiveFact]
    public async Task CalculateOrderTaxAsync_AuthoritativeFlow_CanRepeatReferenceNumber()
    {
        var provider = await CreateConfiguredProviderAsync();

        var referenceNumber = $"MERCH-LIVE-{DateTime.UtcNow:yyyyMMddHHmmss}-{Guid.NewGuid():N}"[..45];
        var request = CreateRequest(referenceNumber, isEstimate: false);

        var first = await provider.CalculateOrderTaxAsync(request);
        first.Success.ShouldBeTrue(first.ErrorMessage ?? "Expected first authoritative tax call to succeed.");
        first.TransactionId.ShouldNotBeNullOrWhiteSpace();
        first.TransactionId.ShouldBe(referenceNumber);

        var second = await provider.CalculateOrderTaxAsync(request);
        second.Success.ShouldBeTrue(second.ErrorMessage ?? "Expected repeated authoritative tax call to succeed.");
        second.TransactionId.ShouldNotBeNullOrWhiteSpace();
        second.TransactionId.ShouldBe(referenceNumber);
    }

    private static async Task<AvalaraTaxProvider> CreateConfiguredProviderAsync()
    {
        var provider = new AvalaraTaxProvider();
        var configuration = BuildLiveConfiguration();

        await provider.ConfigureAsync(configuration);
        return provider;
    }

    private static TaxProviderConfiguration BuildLiveConfiguration()
    {
        var accountId = GetRequiredEnvironmentVariable(AccountIdEnvVar);
        var licenseKey = GetRequiredEnvironmentVariable(LicenseKeyEnvVar);
        var companyCode = GetRequiredEnvironmentVariable(CompanyCodeEnvVar);
        var environment = Environment.GetEnvironmentVariable(EnvironmentEnvVar);
        environment = string.IsNullOrWhiteSpace(environment) ? "sandbox" : environment;

        return new TaxProviderConfiguration(new Dictionary<string, string>
        {
            ["accountId"] = accountId,
            ["licenseKey"] = licenseKey,
            ["companyCode"] = companyCode,
            ["environment"] = environment
        });
    }

    private static string GetRequiredEnvironmentVariable(string key)
    {
        var value = Environment.GetEnvironmentVariable(key);
        if (string.IsNullOrWhiteSpace(value))
        {
            throw new InvalidOperationException(
                $"Missing required environment variable {key} for live Avalara tests.");
        }

        return value;
    }

    private static TaxCalculationRequest CreateRequest(string referenceNumber, bool isEstimate)
    {
        return new TaxCalculationRequest
        {
            ShippingAddress = new Address
            {
                AddressOne = "1301 2nd Avenue",
                TownCity = "Seattle",
                PostalCode = "98101",
                CountryCode = "US",
                CountyState = new CountyState
                {
                    RegionCode = "WA"
                }
            },
            CurrencyCode = "USD",
            LineItems =
            [
                new TaxableLineItem
                {
                    LineItemId = Guid.NewGuid(),
                    Sku = "LIVE-TAX-001",
                    Name = "Live Tax Test Item",
                    Amount = 19.95m,
                    Quantity = 1,
                    IsTaxable = true
                }
            ],
            ShippingAmount = 4.99m,
            CustomerEmail = "integration-test@merchello.local",
            TransactionDate = DateTime.UtcNow,
            ReferenceNumber = referenceNumber,
            IsEstimate = isEstimate
        };
    }
}
