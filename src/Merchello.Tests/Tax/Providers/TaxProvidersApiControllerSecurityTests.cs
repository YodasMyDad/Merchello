using Merchello.Controllers;
using Merchello.Core.Shared.Providers;
using Merchello.Core.Tax.Dtos;
using Merchello.Core.Tax.Models;
using Merchello.Core.Tax.Providers;
using Merchello.Core.Tax.Providers.Interfaces;
using Merchello.Core.Tax.Providers.Models;
using Microsoft.AspNetCore.Mvc;
using Moq;
using Shouldly;
using Xunit;

namespace Merchello.Tests.Tax.Providers;

public class TaxProvidersApiControllerSecurityTests
{
    [Fact]
    public async Task GetProviders_MasksSensitiveConfigurationValues()
    {
        var providerMock = CreateProviderMock();
        var existingConfig = new TaxProviderConfiguration(new Dictionary<string, string>
        {
            ["licenseKey"] = "super-secret",
            ["accountId"] = "acct-123"
        });

        var managerMock = new Mock<ITaxProviderManager>();
        managerMock
            .Setup(x => x.GetProvidersAsync(It.IsAny<CancellationToken>()))
            .ReturnsAsync(
            [
                new RegisteredTaxProvider(
                    providerMock.Object,
                    new TaxProviderSetting { ProviderKey = "avalara", IsEnabled = true },
                    existingConfig)
            ]);

        var controller = new TaxProvidersApiController(managerMock.Object);

        var providers = await controller.GetProviders();

        providers.Count.ShouldBe(1);
        providers[0].Configuration.ShouldNotBeNull();
        providers[0].Configuration!["licenseKey"].ShouldBe("********");
        providers[0].Configuration!["accountId"].ShouldBe("acct-123");
    }

    [Fact]
    public async Task SaveProviderSettings_MaskedSensitiveValue_PreservesExistingSecret()
    {
        var providerMock = CreateProviderMock();
        var existingConfig = new TaxProviderConfiguration(new Dictionary<string, string>
        {
            ["licenseKey"] = "existing-secret",
            ["accountId"] = "acct-123"
        });

        Dictionary<string, string>? capturedSettings = null;
        var managerMock = new Mock<ITaxProviderManager>();
        managerMock
            .Setup(x => x.GetProvidersAsync(It.IsAny<CancellationToken>()))
            .ReturnsAsync(
            [
                new RegisteredTaxProvider(
                    providerMock.Object,
                    new TaxProviderSetting { ProviderKey = "avalara", IsEnabled = true },
                    existingConfig)
            ]);
        managerMock
            .Setup(x => x.SaveProviderSettingsAsync("avalara", It.IsAny<Dictionary<string, string>>(), It.IsAny<CancellationToken>()))
            .Callback<string, Dictionary<string, string>, CancellationToken>((_, settings, _) =>
            {
                capturedSettings = settings;
            })
            .ReturnsAsync(true);

        var controller = new TaxProvidersApiController(managerMock.Object);

        var result = await controller.SaveProviderSettings(
            "avalara",
            new SaveTaxProviderSettingsDto
            {
                Configuration = new Dictionary<string, string>
                {
                    ["licenseKey"] = "********",
                    ["accountId"] = "acct-updated"
                }
            });

        result.ShouldBeOfType<OkObjectResult>();
        capturedSettings.ShouldNotBeNull();
        capturedSettings!["licenseKey"].ShouldBe("existing-secret");
        capturedSettings!["accountId"].ShouldBe("acct-updated");
    }

    private static Mock<ITaxProvider> CreateProviderMock()
    {
        var providerMock = new Mock<ITaxProvider>();
        providerMock
            .SetupGet(x => x.Metadata)
            .Returns(new TaxProviderMetadata(
                Alias: "avalara",
                DisplayName: "Avalara",
                Icon: "icon-cloud",
                Description: "Avalara provider",
                SupportsRealTimeCalculation: true,
                RequiresApiCredentials: true));
        providerMock
            .Setup(x => x.GetConfigurationFieldsAsync(It.IsAny<CancellationToken>()))
            .Returns(ValueTask.FromResult<IEnumerable<ProviderConfigurationField>>(
            [
                new ProviderConfigurationField
                {
                    Key = "licenseKey",
                    Label = "License Key",
                    FieldType = ConfigurationFieldType.Password,
                    IsSensitive = true
                },
                new ProviderConfigurationField
                {
                    Key = "accountId",
                    Label = "Account ID",
                    FieldType = ConfigurationFieldType.Text,
                    IsSensitive = false
                }
            ]));

        return providerMock;
    }
}
