using Merchello.Core.Locality.Dtos;

namespace Merchello.Core.Accounting.Dtos;

/// <summary>
/// Request DTO for creating a draft order from the admin backoffice
/// </summary>
public class CreateDraftOrderDto
{
    /// <summary>
    /// Billing address for the order (required)
    /// </summary>
    public AddressDto BillingAddress { get; set; } = new();

    /// <summary>
    /// Shipping address for the order. If null, billing address is used.
    /// </summary>
    public AddressDto? ShippingAddress { get; set; }

    /// <summary>
    /// Custom items to add to the order
    /// </summary>
    public List<AddCustomItemDto> CustomItems { get; set; } = [];
}
