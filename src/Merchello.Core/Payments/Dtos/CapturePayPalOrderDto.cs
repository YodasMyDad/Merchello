namespace Merchello.Core.Payments.Dtos;

/// <summary>
/// Request to capture an approved PayPal order.
/// Called after the user approves payment in the PayPal popup.
/// </summary>
[Obsolete("Use CaptureWidgetOrderDto instead. This will be removed in a future version.")]
public class CapturePayPalOrderDto : CaptureWidgetOrderDto
{
}
