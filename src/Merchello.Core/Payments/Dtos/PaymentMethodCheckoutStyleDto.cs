using System.Text.Json.Serialization;

namespace Merchello.Core.Payments.Dtos;

/// <summary>
/// Style customization for payment method display in checkout.
/// Allows providers to match their brand colors.
/// </summary>
public class PaymentMethodCheckoutStyleDto
{
    /// <summary>
    /// Background color (e.g., "#f8f9fa" or "rgba(0,112,186,0.05)").
    /// </summary>
    [JsonPropertyName("backgroundColor")]
    public string? BackgroundColor { get; set; }

    /// <summary>
    /// Border color (e.g., "#dee2e6").
    /// </summary>
    [JsonPropertyName("borderColor")]
    public string? BorderColor { get; set; }

    /// <summary>
    /// Text/label color (e.g., "#333333").
    /// </summary>
    [JsonPropertyName("textColor")]
    public string? TextColor { get; set; }

    /// <summary>
    /// Background color when selected.
    /// </summary>
    [JsonPropertyName("selectedBackgroundColor")]
    public string? SelectedBackgroundColor { get; set; }

    /// <summary>
    /// Border color when selected.
    /// </summary>
    [JsonPropertyName("selectedBorderColor")]
    public string? SelectedBorderColor { get; set; }

    /// <summary>
    /// Text color when selected.
    /// </summary>
    [JsonPropertyName("selectedTextColor")]
    public string? SelectedTextColor { get; set; }
}
