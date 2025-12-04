namespace Merchello.Core.Shipping.Dtos;

/// <summary>
/// Request to toggle provider enabled status
/// </summary>
public class ToggleShippingProviderDto
{
    public bool IsEnabled { get; set; }
}
