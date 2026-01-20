namespace Merchello.Core.Payments.Dtos;

/// <summary>
/// Response from capturing a PayPal order.
/// </summary>
[Obsolete("Use CaptureWidgetOrderResultDto instead. This will be removed in a future version.")]
public class CapturePayPalOrderResultDto : CaptureWidgetOrderResultDto
{
}
