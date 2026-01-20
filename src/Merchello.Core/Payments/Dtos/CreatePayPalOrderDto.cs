namespace Merchello.Core.Payments.Dtos;

/// <summary>
/// Request to create a PayPal order for the standard Widget payment flow.
/// Called by the PayPal button's createOrder callback.
/// </summary>
[Obsolete("Use CreateWidgetOrderDto instead. This will be removed in a future version.")]
public class CreatePayPalOrderDto : CreateWidgetOrderDto
{
}
