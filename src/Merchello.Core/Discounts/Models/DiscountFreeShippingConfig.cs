using System.Text.Json;
using Merchello.Core.Shared.Extensions;

namespace Merchello.Core.Discounts.Models;

/// <summary>
/// Configuration for Free Shipping discounts.
/// </summary>
public class DiscountFreeShippingConfig
{
    /// <summary>
    /// Unique identifier for the configuration.
    /// </summary>
    public Guid Id { get; set; } = GuidExtensions.NewSequentialGuid;

    /// <summary>
    /// The discount this configuration belongs to.
    /// </summary>
    public Guid DiscountId { get; set; }

    /// <summary>
    /// Whether free shipping applies to all countries or selected countries.
    /// </summary>
    public FreeShippingCountryScope CountryScope { get; set; }

    /// <summary>
    /// JSON array of country codes when CountryScope is SelectedCountries.
    /// </summary>
    public string? CountryCodes { get; set; }

    /// <summary>
    /// Whether to exclude shipping rates over a certain amount.
    /// </summary>
    public bool ExcludeRatesOverAmount { get; set; }

    /// <summary>
    /// The maximum shipping rate value when ExcludeRatesOverAmount is true.
    /// </summary>
    public decimal? ExcludeRatesOverValue { get; set; }

    /// <summary>
    /// JSON array of allowed shipping option IDs. Null means all shipping options.
    /// </summary>
    public string? AllowedShippingOptionIds { get; set; }

    /// <summary>
    /// Navigation property to the parent discount.
    /// </summary>
    public virtual Discount Discount { get; set; } = null!;

    /// <summary>
    /// Gets the country codes as a list of strings.
    /// </summary>
    public List<string> GetCountryCodesList()
    {
        if (string.IsNullOrEmpty(CountryCodes))
        {
            return [];
        }

        try
        {
            return JsonSerializer.Deserialize<List<string>>(CountryCodes) ?? [];
        }
        catch (JsonException ex)
        {
            // Log warning - malformed JSON in CountryCodes
            System.Diagnostics.Debug.WriteLine($"[DiscountFreeShippingConfig] Failed to deserialize CountryCodes JSON for config {Id}: {ex.Message}");
            return [];
        }
    }

    /// <summary>
    /// Gets the allowed shipping option IDs as a list of Guids.
    /// </summary>
    public List<Guid> GetAllowedShippingOptionIdsList()
    {
        if (string.IsNullOrEmpty(AllowedShippingOptionIds))
        {
            return [];
        }

        try
        {
            return JsonSerializer.Deserialize<List<Guid>>(AllowedShippingOptionIds) ?? [];
        }
        catch (JsonException ex)
        {
            // Log warning - malformed JSON in AllowedShippingOptionIds
            System.Diagnostics.Debug.WriteLine($"[DiscountFreeShippingConfig] Failed to deserialize AllowedShippingOptionIds JSON for config {Id}: {ex.Message}");
            return [];
        }
    }
}
