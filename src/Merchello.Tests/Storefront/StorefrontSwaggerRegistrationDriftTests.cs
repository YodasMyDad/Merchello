using Shouldly;
using Xunit;

namespace Merchello.Tests.Storefront;

public class StorefrontSwaggerRegistrationDriftTests
{
    [Fact]
    public void StorefrontApiName_ShouldRemainStable()
    {
        Core.Constants.StorefrontApiName.ShouldBe("merchello-storefront");
    }

    [Fact]
    public void Composer_ShouldRegisterStorefrontSwaggerDocument()
    {
        var composerPath = ResolveRepoFilePath("src", "Merchello", "Composers", "MerchelloComposer.cs");
        var composerText = File.ReadAllText(composerPath);

        composerText.ShouldContain("SwaggerDoc(Core.Constants.StorefrontApiName");
    }

    [Fact]
    public void PublicHeadlessControllers_ShouldMapToStorefrontApiDocument()
    {
        var storefrontControllerPath = ResolveRepoFilePath("src", "Merchello", "Controllers", "StorefrontApiController.cs");
        var checkoutControllerPath = ResolveRepoFilePath("src", "Merchello", "Controllers", "CheckoutApiController.cs");

        var storefrontControllerText = File.ReadAllText(storefrontControllerPath);
        var checkoutControllerText = File.ReadAllText(checkoutControllerPath);

        storefrontControllerText.ShouldContain("[ApiExplorerSettings(GroupName = Core.Constants.StorefrontApiName)]");
        checkoutControllerText.ShouldContain("[ApiExplorerSettings(GroupName = Core.Constants.StorefrontApiName)]");
        storefrontControllerText.ShouldContain("[MapToApi(Core.Constants.StorefrontApiName)]");
        checkoutControllerText.ShouldContain("[MapToApi(Core.Constants.StorefrontApiName)]");
    }

    private static string ResolveRepoFilePath(params string[] segments)
    {
        var current = new DirectoryInfo(AppContext.BaseDirectory);
        while (current != null)
        {
            var candidate = Path.Combine([current.FullName, .. segments]);
            if (File.Exists(candidate))
            {
                return candidate;
            }

            current = current.Parent;
        }

        throw new FileNotFoundException($"Unable to locate file from base directory: {Path.Combine(segments)}");
    }
}
