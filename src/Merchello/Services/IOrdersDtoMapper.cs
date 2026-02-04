using Merchello.Core.Accounting.Dtos;
using Merchello.Core.Accounting.Models;
using Merchello.Core.Checkout.Dtos;
using Merchello.Core.Locality.Dtos;
using Merchello.Core.Shipping.Dtos;
using Merchello.Core.Shipping.Models;

namespace Merchello.Services;

/// <summary>
/// Maps order/invoice domain models to API DTOs.
/// </summary>
public interface IOrdersDtoMapper
{
    /// <summary>
    /// Maps an address DTO to a domain address model.
    /// </summary>
    Core.Locality.Models.Address MapDtoToAddress(AddressDto dto);

    /// <summary>
    /// Maps invoice summary data to order list item DTO.
    /// </summary>
    OrderListItemDto MapToListItem(Invoice invoice);

    /// <summary>
    /// Maps invoice details to order detail DTO.
    /// </summary>
    Task<OrderDetailDto> MapToDetailAsync(
        Invoice invoice,
        Dictionary<Guid, string> shippingOptionNames,
        Dictionary<Guid, string?> productImages,
        CancellationToken ct = default);

    /// <summary>
    /// Maps domain address to API address DTO.
    /// </summary>
    AddressDto? MapAddress(Core.Locality.Models.Address? address);

    /// <summary>
    /// Maps shipment to shipment detail DTO.
    /// </summary>
    ShipmentDetailDto MapToShipmentDetail(Shipment shipment, Dictionary<Guid, string?> productImages);
}
