namespace Merchello.Core.Shipping.Extensions;

/// <summary>
/// Extension methods for parsing and working with shipping SelectionKey values.
/// SelectionKey is a unified identifier format that supports both flat-rate ShippingOptions
/// and dynamic provider services:
/// - Flat-rate: "so:{guid}" (e.g., "so:a1b2c3d4-...")
/// - Dynamic: "dyn:{provider}:{serviceCode}" (e.g., "dyn:fedex:FEDEX_GROUND")
/// - Legacy: plain Guid string (for backward compatibility)
/// </summary>
public static class SelectionKeyExtensions
{
    private const string ShippingOptionPrefix = "so:";
    private const string DynamicProviderPrefix = "dyn:";

    /// <summary>
    /// Parses a SelectionKey into its components.
    /// Returns true if parsing succeeded, false otherwise.
    /// Only one output path will be populated based on the key format.
    /// </summary>
    /// <param name="key">The SelectionKey to parse</param>
    /// <param name="shippingOptionId">Output: The ShippingOption Guid if flat-rate or legacy format</param>
    /// <param name="providerKey">Output: The provider key if dynamic format (e.g., "fedex")</param>
    /// <param name="serviceCode">Output: The service code if dynamic format (e.g., "FEDEX_GROUND")</param>
    /// <returns>True if parsing succeeded</returns>
    public static bool TryParse(
        string? key,
        out Guid? shippingOptionId,
        out string? providerKey,
        out string? serviceCode)
    {
        shippingOptionId = null;
        providerKey = null;
        serviceCode = null;

        if (string.IsNullOrEmpty(key))
            return false;

        // New format: "so:{guid}" for flat-rate ShippingOption
        if (key.StartsWith(ShippingOptionPrefix, StringComparison.Ordinal))
        {
            if (Guid.TryParse(key.AsSpan(ShippingOptionPrefix.Length), out var guid))
            {
                shippingOptionId = guid;
                return true;
            }
            return false;
        }

        // New format: "dyn:{provider}:{serviceCode}" for dynamic providers
        if (key.StartsWith(DynamicProviderPrefix, StringComparison.Ordinal))
        {
            var remainder = key.AsSpan(DynamicProviderPrefix.Length);
            var colonIndex = remainder.IndexOf(':');
            if (colonIndex > 0)
            {
                providerKey = remainder[..colonIndex].ToString();
                // Everything after the first colon is the service code (handles codes with colons)
                serviceCode = remainder[(colonIndex + 1)..].ToString();
                return !string.IsNullOrEmpty(providerKey) && !string.IsNullOrEmpty(serviceCode);
            }
            return false;
        }

        // Legacy format: plain Guid (for backward compatibility during transition)
        if (Guid.TryParse(key, out var legacyGuid))
        {
            shippingOptionId = legacyGuid;
            return true;
        }

        return false;
    }

    /// <summary>
    /// Determines if the SelectionKey represents a dynamic provider selection.
    /// </summary>
    public static bool IsDynamicProvider(string? key)
        => key?.StartsWith(DynamicProviderPrefix, StringComparison.Ordinal) == true;

    /// <summary>
    /// Determines if the SelectionKey represents a flat-rate ShippingOption.
    /// Includes both new "so:" format and legacy plain Guid format.
    /// </summary>
    public static bool IsShippingOption(string? key)
        => key?.StartsWith(ShippingOptionPrefix, StringComparison.Ordinal) == true
           || (key != null && !key.StartsWith(DynamicProviderPrefix, StringComparison.Ordinal) && Guid.TryParse(key, out _));

    /// <summary>
    /// Creates a SelectionKey for a flat-rate ShippingOption.
    /// </summary>
    public static string ForShippingOption(Guid shippingOptionId)
        => $"{ShippingOptionPrefix}{shippingOptionId}";

    /// <summary>
    /// Creates a SelectionKey for a dynamic provider service.
    /// </summary>
    public static string ForDynamicProvider(string providerKey, string serviceCode)
        => $"{DynamicProviderPrefix}{providerKey}:{serviceCode}";
}
