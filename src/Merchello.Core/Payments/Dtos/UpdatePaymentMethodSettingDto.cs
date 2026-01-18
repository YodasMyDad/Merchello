namespace Merchello.Core.Payments.Dtos;

/// <summary>
/// Request to update a payment method setting.
/// </summary>
public class UpdatePaymentMethodSettingDto
{
    /// <summary>
    /// Whether the method is enabled.
    /// </summary>
    public bool? IsEnabled { get; set; }

    /// <summary>
    /// Custom display name override. Set to empty string to clear and use provider default.
    /// </summary>
    public string? DisplayNameOverride { get; set; }

    /// <summary>
    /// Umbraco media key for custom checkout icon. Set to null to use provider default.
    /// </summary>
    public Guid? IconMediaKey { get; set; }

    /// <summary>
    /// Whether to clear the icon (set IconMediaKey to null).
    /// Used when the client wants to explicitly remove the custom icon.
    /// </summary>
    public bool ClearIcon { get; set; }

    /// <summary>
    /// Checkout style override. Set to null to use provider default.
    /// </summary>
    public PaymentMethodCheckoutStyleDto? CheckoutStyleOverride { get; set; }

    /// <summary>
    /// Whether to clear the checkout style (set CheckoutStyleOverride to null).
    /// Used when the client wants to explicitly reset to provider defaults.
    /// </summary>
    public bool ClearCheckoutStyle { get; set; }
}
