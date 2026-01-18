namespace Merchello.Core.Payments.Models;

/// <summary>
/// Style customization for payment method display in checkout.
/// Allows providers to match their brand colors.
/// </summary>
public class PaymentMethodCheckoutStyle
{
    /// <summary>
    /// Background color (e.g., "#f8f9fa" or "rgba(0,112,186,0.05)").
    /// </summary>
    public string? BackgroundColor { get; set; }

    /// <summary>
    /// Border color (e.g., "#dee2e6").
    /// </summary>
    public string? BorderColor { get; set; }

    /// <summary>
    /// Text/label color (e.g., "#333333").
    /// </summary>
    public string? TextColor { get; set; }

    /// <summary>
    /// Background color when selected.
    /// </summary>
    public string? SelectedBackgroundColor { get; set; }

    /// <summary>
    /// Border color when selected.
    /// </summary>
    public string? SelectedBorderColor { get; set; }

    /// <summary>
    /// Text color when selected.
    /// </summary>
    public string? SelectedTextColor { get; set; }

    /// <summary>
    /// Returns true if all style properties are null or empty.
    /// </summary>
    public bool IsEmpty =>
        string.IsNullOrEmpty(BackgroundColor) &&
        string.IsNullOrEmpty(BorderColor) &&
        string.IsNullOrEmpty(TextColor) &&
        string.IsNullOrEmpty(SelectedBackgroundColor) &&
        string.IsNullOrEmpty(SelectedBorderColor) &&
        string.IsNullOrEmpty(SelectedTextColor);
}
