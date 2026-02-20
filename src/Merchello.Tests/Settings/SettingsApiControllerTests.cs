using Merchello.Controllers;
using Merchello.Core.Locality.Services.Interfaces;
using Merchello.Core.Settings.Dtos;
using Merchello.Core.Settings.Models;
using Merchello.Core.Settings.Services.Interfaces;
using Merchello.Core.Shared.Models;
using Merchello.Core.Shared.Models.Enums;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using Moq;
using Shouldly;
using Xunit;

namespace Merchello.Tests.Settings;

public class SettingsApiControllerTests
{
    [Fact]
    public async Task GetStoreConfiguration_ReturnsConfigurationPayload()
    {
        var expected = new StoreConfigurationDto
        {
            StoreKey = "default",
            Store = new StoreConfigurationStorePanelDto
            {
                Name = "Acme Store"
            }
        };

        var storeSettingsService = new Mock<IMerchelloStoreSettingsService>();
        storeSettingsService
            .Setup(x => x.GetStoreConfigurationAsync(It.IsAny<CancellationToken>()))
            .ReturnsAsync(expected);
        storeSettingsService
            .Setup(x => x.GetRuntimeSettings())
            .Returns(new MerchelloStoreRuntimeSettings());

        var controller = CreateController(
            Options.Create(new MerchelloSettings()),
            new ConfigurationBuilder().Build(),
            storeSettingsService.Object);

        var result = await controller.GetStoreConfiguration(CancellationToken.None);
        var ok = result.ShouldBeOfType<OkObjectResult>();
        var dto = ok.Value.ShouldBeOfType<StoreConfigurationDto>();

        dto.StoreKey.ShouldBe("default");
        dto.Store.Name.ShouldBe("Acme Store");
        storeSettingsService.Verify(
            x => x.GetStoreConfigurationAsync(It.IsAny<CancellationToken>()),
            Times.Once);
    }

    [Fact]
    public async Task SaveStoreConfiguration_ReturnsBadRequest_WhenServiceReturnsErrors()
    {
        var payload = new StoreConfigurationDto();
        var failedResult = new CrudResult<StoreConfigurationDto>
        {
            Messages =
            [
                new ResultMessage
                {
                    Message = "Configuration is required.",
                    ResultMessageType = ResultMessageType.Error
                }
            ]
        };

        var storeSettingsService = new Mock<IMerchelloStoreSettingsService>();
        storeSettingsService
            .Setup(x => x.SaveStoreConfigurationAsync(payload, It.IsAny<CancellationToken>()))
            .ReturnsAsync(failedResult);
        storeSettingsService
            .Setup(x => x.GetRuntimeSettings())
            .Returns(new MerchelloStoreRuntimeSettings());

        var controller = CreateController(
            Options.Create(new MerchelloSettings()),
            new ConfigurationBuilder().Build(),
            storeSettingsService.Object);

        var result = await controller.SaveStoreConfiguration(payload, CancellationToken.None);
        result.ShouldBeOfType<BadRequestObjectResult>();
    }

    [Fact]
    public async Task SaveStoreConfiguration_ReturnsSavedConfiguration_WhenServiceSucceeds()
    {
        var payload = new StoreConfigurationDto
        {
            Store = new StoreConfigurationStorePanelDto
            {
                Name = "Updated Store"
            }
        };

        var saved = new StoreConfigurationDto
        {
            StoreKey = "default",
            Store = new StoreConfigurationStorePanelDto
            {
                Name = "Updated Store"
            }
        };

        var serviceResult = new CrudResult<StoreConfigurationDto>
        {
            ResultObject = saved
        };

        var storeSettingsService = new Mock<IMerchelloStoreSettingsService>();
        storeSettingsService
            .Setup(x => x.SaveStoreConfigurationAsync(payload, It.IsAny<CancellationToken>()))
            .ReturnsAsync(serviceResult);
        storeSettingsService
            .Setup(x => x.GetRuntimeSettings())
            .Returns(new MerchelloStoreRuntimeSettings());

        var controller = CreateController(
            Options.Create(new MerchelloSettings()),
            new ConfigurationBuilder().Build(),
            storeSettingsService.Object);

        var result = await controller.SaveStoreConfiguration(payload, CancellationToken.None);
        var ok = result.ShouldBeOfType<OkObjectResult>();
        var dto = ok.Value.ShouldBeOfType<StoreConfigurationDto>();

        dto.Store.Name.ShouldBe("Updated Store");
    }

    [Fact]
    public void GetProductOptionSettings_DeduplicatesBoundAliases()
    {
        // Simulates .NET options binding appending configured arrays to default-initialized arrays.
        var settings = Options.Create(new MerchelloSettings
        {
            OptionTypeAliases = ["colour", "size", "material", "pattern", "colour", "size", "material", "pattern"],
            OptionUiAliases = ["dropdown", "colour", "image", "checkbox", "radiobutton", "dropdown", "colour", "image", "checkbox", "radiobutton"]
        });

        var controller = CreateController(settings, new ConfigurationBuilder().Build());

        var result = controller.GetProductOptionSettings().ShouldBeOfType<OkObjectResult>();
        var dto = result.Value.ShouldBeOfType<ProductOptionSettingsDto>();

        dto.OptionTypeAliases.ShouldBe(["colour", "size", "material", "pattern"]);
        dto.OptionUiAliases.ShouldBe(["dropdown", "colour", "image", "checkbox", "radiobutton"]);
    }

    [Fact]
    public void GetProductOptionSettings_PrefersConfiguredAliasesOverBoundAppendedDefaults()
    {
        // Simulate a bound value polluted by default-initialized arrays.
        var settings = Options.Create(new MerchelloSettings
        {
            OptionTypeAliases = ["colour", "size", "material", "pattern", "finish"],
            OptionUiAliases = ["dropdown", "colour", "image", "checkbox", "radiobutton", "chips"]
        });

        var config = new ConfigurationBuilder()
            .AddInMemoryCollection(new Dictionary<string, string?>
            {
                ["Merchello:OptionTypeAliases:0"] = "finish",
                ["Merchello:OptionTypeAliases:1"] = "texture",
                ["Merchello:OptionUiAliases:0"] = "chips"
            })
            .Build();

        var controller = CreateController(settings, config);

        var result = controller.GetProductOptionSettings().ShouldBeOfType<OkObjectResult>();
        var dto = result.Value.ShouldBeOfType<ProductOptionSettingsDto>();

        dto.OptionTypeAliases.ShouldBe(["finish", "texture"]);
        dto.OptionUiAliases.ShouldBe(["chips"]);
    }

    private static SettingsApiController CreateController(
        IOptions<MerchelloSettings> settings,
        IConfiguration configuration,
        IMerchelloStoreSettingsService? storeSettingsService = null)
    {
        storeSettingsService ??= new Mock<IMerchelloStoreSettingsService>().Object;

        return new SettingsApiController(
            settings,
            configuration,
            new Mock<ILocalityCatalog>().Object,
            null!,
            storeSettingsService,
            new Mock<ILogger<SettingsApiController>>().Object);
    }
}
