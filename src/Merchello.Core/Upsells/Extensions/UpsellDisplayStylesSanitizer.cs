using System.Text.RegularExpressions;
using Merchello.Core.Upsells.Models;

namespace Merchello.Core.Upsells.Extensions;

/// <summary>
/// Sanitizes upsell display style values before persistence and rendering.
/// </summary>
public static partial class UpsellDisplayStylesSanitizer
{
    private static readonly HashSet<string> AllowedBorderStyles = new(StringComparer.OrdinalIgnoreCase)
    {
        "none",
        "solid",
        "dashed",
        "dotted",
        "double"
    };

    public static UpsellDisplayStyles? Sanitize(UpsellDisplayStyles? styles)
    {
        if (styles == null)
        {
            return null;
        }

        var sanitized = new UpsellDisplayStyles
        {
            CheckoutInline = SanitizeSurface(styles.CheckoutInline),
            CheckoutInterstitial = SanitizeSurface(styles.CheckoutInterstitial),
            PostPurchase = SanitizeSurface(styles.PostPurchase),
            Basket = SanitizeSurface(styles.Basket),
            ProductPage = SanitizeSurface(styles.ProductPage),
            Email = SanitizeSurface(styles.Email),
            Confirmation = SanitizeSurface(styles.Confirmation)
        };

        return IsEmpty(sanitized) ? null : sanitized;
    }

    private static UpsellSurfaceStyle? SanitizeSurface(UpsellSurfaceStyle? surface)
    {
        if (surface == null)
        {
            return null;
        }

        var sanitized = new UpsellSurfaceStyle
        {
            Container = SanitizeElement(surface.Container),
            Heading = SanitizeElement(surface.Heading),
            Message = SanitizeElement(surface.Message),
            ProductCard = SanitizeElement(surface.ProductCard),
            ProductName = SanitizeElement(surface.ProductName),
            ProductDescription = SanitizeElement(surface.ProductDescription),
            ProductPrice = SanitizeElement(surface.ProductPrice),
            Badge = SanitizeElement(surface.Badge),
            Button = SanitizeElement(surface.Button),
            SecondaryButton = SanitizeElement(surface.SecondaryButton),
            VariantSelector = SanitizeElement(surface.VariantSelector),
            StatusText = SanitizeElement(surface.StatusText)
        };

        return IsEmpty(sanitized) ? null : sanitized;
    }

    private static UpsellElementStyle? SanitizeElement(UpsellElementStyle? style)
    {
        if (style == null)
        {
            return null;
        }

        var sanitized = new UpsellElementStyle
        {
            TextColor = SanitizeColor(style.TextColor),
            BackgroundColor = SanitizeColor(style.BackgroundColor),
            BorderColor = SanitizeColor(style.BorderColor),
            BorderStyle = SanitizeBorderStyle(style.BorderStyle),
            BorderWidth = SanitizeInt(style.BorderWidth, min: 0, max: 12),
            BorderRadius = SanitizeInt(style.BorderRadius, min: 0, max: 64)
        };

        return IsEmpty(sanitized) ? null : sanitized;
    }

    private static int? SanitizeInt(int? value, int min, int max)
    {
        if (!value.HasValue)
        {
            return null;
        }

        return value.Value < min || value.Value > max ? null : value.Value;
    }

    private static string? SanitizeBorderStyle(string? value)
    {
        if (string.IsNullOrWhiteSpace(value))
        {
            return null;
        }

        var normalized = value.Trim().ToLowerInvariant();
        return AllowedBorderStyles.Contains(normalized) ? normalized : null;
    }

    private static string? SanitizeColor(string? value)
    {
        if (string.IsNullOrWhiteSpace(value))
        {
            return null;
        }

        var normalized = value.Trim();
        if (normalized.Length > 64)
        {
            return null;
        }

        if (HexColorRegex().IsMatch(normalized) ||
            RgbColorRegex().IsMatch(normalized) ||
            HslColorRegex().IsMatch(normalized) ||
            NamedColorRegex().IsMatch(normalized))
        {
            return normalized;
        }

        return null;
    }

    private static bool IsEmpty(UpsellDisplayStyles styles)
    {
        return styles.CheckoutInline == null &&
               styles.CheckoutInterstitial == null &&
               styles.PostPurchase == null &&
               styles.Basket == null &&
               styles.ProductPage == null &&
               styles.Email == null &&
               styles.Confirmation == null;
    }

    private static bool IsEmpty(UpsellSurfaceStyle style)
    {
        return style.Container == null &&
               style.Heading == null &&
               style.Message == null &&
               style.ProductCard == null &&
               style.ProductName == null &&
               style.ProductDescription == null &&
               style.ProductPrice == null &&
               style.Badge == null &&
               style.Button == null &&
               style.SecondaryButton == null &&
               style.VariantSelector == null &&
               style.StatusText == null;
    }

    private static bool IsEmpty(UpsellElementStyle style)
    {
        return string.IsNullOrWhiteSpace(style.TextColor) &&
               string.IsNullOrWhiteSpace(style.BackgroundColor) &&
               string.IsNullOrWhiteSpace(style.BorderColor) &&
               string.IsNullOrWhiteSpace(style.BorderStyle) &&
               !style.BorderWidth.HasValue &&
               !style.BorderRadius.HasValue;
    }

    [GeneratedRegex("^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$")]
    private static partial Regex HexColorRegex();

    [GeneratedRegex("^rgba?\\(\\s*\\d{1,3}(?:\\.\\d+)?\\s*,\\s*\\d{1,3}(?:\\.\\d+)?\\s*,\\s*\\d{1,3}(?:\\.\\d+)?(?:\\s*,\\s*(?:0|1|0?\\.\\d+))?\\s*\\)$", RegexOptions.IgnoreCase)]
    private static partial Regex RgbColorRegex();

    [GeneratedRegex("^hsla?\\(\\s*\\d{1,3}(?:\\.\\d+)?\\s*(?:deg)?\\s*,\\s*\\d{1,3}(?:\\.\\d+)?%\\s*,\\s*\\d{1,3}(?:\\.\\d+)?%(?:\\s*,\\s*(?:0|1|0?\\.\\d+))?\\s*\\)$", RegexOptions.IgnoreCase)]
    private static partial Regex HslColorRegex();

    [GeneratedRegex("^[a-zA-Z]+$")]
    private static partial Regex NamedColorRegex();
}

