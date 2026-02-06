using Merchello.Controllers;
using Merchello.Core.Locality.Services.Interfaces;
using Merchello.Core.Settings.Dtos;
using Merchello.Core.Shared.Models;
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
        IConfiguration configuration)
    {
        return new SettingsApiController(
            settings,
            configuration,
            new Mock<ILocalityCatalog>().Object,
            null!,
            new Mock<ILogger<SettingsApiController>>().Object);
    }
}
