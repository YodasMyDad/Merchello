namespace Merchello.Core.Shipping.Dtos;

/// <summary>
/// DTO for postcode rule entries.
/// </summary>
public class ShippingPostcodeRuleDto
{
    public Guid Id { get; set; }
    public string CountryCode { get; set; } = null!;
    public string Pattern { get; set; } = null!;
    public string MatchType { get; set; } = null!;
    public string Action { get; set; } = null!;
    public decimal Surcharge { get; set; }
    public string? Description { get; set; }

    /// <summary>
    /// Display-friendly match type description (e.g., "Prefix match").
    /// </summary>
    public string? MatchTypeDisplay { get; set; }

    /// <summary>
    /// Display-friendly action description (e.g., "Block delivery").
    /// </summary>
    public string? ActionDisplay { get; set; }

    /// <summary>
    /// Display-friendly country name.
    /// </summary>
    public string? CountryDisplay { get; set; }
}
