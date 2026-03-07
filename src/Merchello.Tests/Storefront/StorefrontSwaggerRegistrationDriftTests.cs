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
    public void AddMerchello_ShouldRegisterStorefrontSwaggerDocument()
    {
        var startupPath = ResolveRepoFilePath("src", "Merchello", "Startup.cs");
        var startupText = File.ReadAllText(startupPath);

        startupText.ShouldContain("SwaggerDoc(Core.Constants.StorefrontApiName");
    }

    [Fact]
    public void ExampleSite_ShouldOptIntoMerchelloExplicitly()
    {
        var programPath = ResolveRepoFilePath("src", "Merchello.Site", "Program.cs");
        var programText = File.ReadAllText(programPath);

        programText.ShouldContain(".AddMerchello()");
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
