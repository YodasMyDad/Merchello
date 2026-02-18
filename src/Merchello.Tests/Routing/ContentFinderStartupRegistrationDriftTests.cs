using System.Text.RegularExpressions;
using Shouldly;
using Xunit;

namespace Merchello.Tests.Routing;

public class ContentFinderStartupRegistrationDriftTests
{
    [Fact]
    public void Startup_ShouldGateContentFinderRegistrationWithHeadlessToggles()
    {
        var startupFilePath = ResolveStartupPath();
        var startupText = File.ReadAllText(startupFilePath);

        var productRenderingConditionPattern = new Regex(
            @"if\s*\(\s*.*EnableProductRendering\s*\)",
            RegexOptions.Compiled);

        var checkoutConditionPattern = new Regex(
            @"if\s*\(\s*.*EnableCheckout\s*\)",
            RegexOptions.Compiled);

        var checkoutFallbackConditionPattern = new Regex(
            @"else\s+if\s*\(\s*.*EnableCheckout\s*\)",
            RegexOptions.Compiled);

        productRenderingConditionPattern.IsMatch(startupText).ShouldBeTrue(
            "Startup must gate product content finder registration behind Merchello:EnableProductRendering.");

        checkoutConditionPattern.IsMatch(startupText).ShouldBeTrue(
            "Startup must gate checkout content finder registration behind Merchello:EnableCheckout.");

        checkoutFallbackConditionPattern.IsMatch(startupText).ShouldBeTrue(
            "Startup must include a checkout-only fallback branch when product rendering is disabled.");
    }

    [Fact]
    public void Startup_ShouldRegisterContentFindersWithExpectedAnchors()
    {
        var startupFilePath = ResolveStartupPath();
        var startupText = File.ReadAllText(startupFilePath);

        var productAfterUmbracoPattern = new Regex(
            @"InsertAfter<\s*ContentFinderByUrlNew\s*,\s*ProductContentFinder\s*>",
            RegexOptions.Compiled);

        var checkoutAfterProductPattern = new Regex(
            @"InsertAfter<\s*ProductContentFinder\s*,\s*CheckoutContentFinder\s*>",
            RegexOptions.Compiled);

        var checkoutAfterUmbracoPattern = new Regex(
            @"InsertAfter<\s*ContentFinderByUrlNew\s*,\s*CheckoutContentFinder\s*>",
            RegexOptions.Compiled);

        productAfterUmbracoPattern.IsMatch(startupText).ShouldBeTrue(
            "Startup must register ProductContentFinder after ContentFinderByUrlNew.");

        checkoutAfterProductPattern.IsMatch(startupText).ShouldBeTrue(
            "Startup must register CheckoutContentFinder after ProductContentFinder when both integrated renderers are enabled.");

        checkoutAfterUmbracoPattern.IsMatch(startupText).ShouldBeTrue(
            "Startup must register CheckoutContentFinder after ContentFinderByUrlNew when product rendering is disabled.");
    }

    private static string ResolveStartupPath()
    {
        var current = new DirectoryInfo(AppContext.BaseDirectory);
        while (current != null)
        {
            var startupPath = Path.Combine(current.FullName, "src", "Merchello", "Startup.cs");
            if (File.Exists(startupPath))
            {
                return startupPath;
            }

            current = current.Parent;
        }

        throw new FileNotFoundException("Unable to locate src/Merchello/Startup.cs from test base directory.");
    }
}
