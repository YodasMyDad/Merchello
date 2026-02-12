using Merchello.Core.Upsells.Extensions;
using Merchello.Core.Upsells.Models;
using Shouldly;
using Xunit;

namespace Merchello.Tests.Upsells;

public class UpsellDisplayStylesSanitizerTests
{
    [Fact]
    public void Sanitize_WithValidValues_PreservesSupportedStyleValues()
    {
        var styles = new UpsellDisplayStyles
        {
            CheckoutInline = new UpsellSurfaceStyle
            {
                Heading = new UpsellElementStyle
                {
                    TextColor = "#123abc",
                    BackgroundColor = "rgb(10, 20, 30)",
                    BorderColor = "hsl(200, 40%, 50%)",
                    BorderStyle = "dashed",
                    BorderWidth = 3,
                    BorderRadius = 8
                }
            }
        };

        var sanitized = UpsellDisplayStylesSanitizer.Sanitize(styles);

        sanitized.ShouldNotBeNull();
        sanitized!.CheckoutInline.ShouldNotBeNull();
        sanitized.CheckoutInline!.Heading.ShouldNotBeNull();
        sanitized.CheckoutInline.Heading!.TextColor.ShouldBe("#123abc");
        sanitized.CheckoutInline.Heading.BackgroundColor.ShouldBe("rgb(10, 20, 30)");
        sanitized.CheckoutInline.Heading.BorderColor.ShouldBe("hsl(200, 40%, 50%)");
        sanitized.CheckoutInline.Heading.BorderStyle.ShouldBe("dashed");
        sanitized.CheckoutInline.Heading.BorderWidth.ShouldBe(3);
        sanitized.CheckoutInline.Heading.BorderRadius.ShouldBe(8);
    }

    [Fact]
    public void Sanitize_WithInvalidValues_RemovesInvalidAndEmptyNodes()
    {
        var styles = new UpsellDisplayStyles
        {
            CheckoutInline = new UpsellSurfaceStyle
            {
                Heading = new UpsellElementStyle
                {
                    TextColor = "javascript:alert(1)",
                    BorderStyle = "groove",
                    BorderWidth = 40,
                    BorderRadius = -1
                }
            },
            Email = new UpsellSurfaceStyle
            {
                Button = new UpsellElementStyle
                {
                    BackgroundColor = "rebeccapurple",
                    BorderColor = "rgba(10, 20, 30, 0.2)",
                    BorderStyle = "solid",
                    BorderWidth = 2
                }
            }
        };

        var sanitized = UpsellDisplayStylesSanitizer.Sanitize(styles);

        sanitized.ShouldNotBeNull();
        sanitized!.CheckoutInline.ShouldBeNull();
        sanitized.Email.ShouldNotBeNull();
        sanitized.Email!.Button.ShouldNotBeNull();
        sanitized.Email.Button!.BackgroundColor.ShouldBe("rebeccapurple");
        sanitized.Email.Button.BorderColor.ShouldBe("rgba(10, 20, 30, 0.2)");
        sanitized.Email.Button.BorderStyle.ShouldBe("solid");
        sanitized.Email.Button.BorderWidth.ShouldBe(2);
    }

    [Fact]
    public void Sanitize_WithNullStyles_ReturnsNull()
    {
        var sanitized = UpsellDisplayStylesSanitizer.Sanitize(null);

        sanitized.ShouldBeNull();
    }
}
