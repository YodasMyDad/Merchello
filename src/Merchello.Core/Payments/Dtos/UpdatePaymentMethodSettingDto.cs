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
}
