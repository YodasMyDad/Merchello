namespace Merchello.Core.Shipping.Dtos;

/// <summary>
/// DTO for creating/updating a shipping postcode rule.
/// </summary>
public class CreateShippingPostcodeRuleDto
{
    public required string CountryCode { get; set; }
    public required string Pattern { get; set; }
    public required string MatchType { get; set; }
    public required string Action { get; set; }
    public decimal Surcharge { get; set; }
    public string? Description { get; set; }
}
