namespace Merchello.Core.Payments.Dtos;

/// <summary>
/// Request to toggle provider enabled status
/// </summary>
public class TogglePaymentProviderDto
{
    public bool IsEnabled { get; set; }
}
