using Merchello.Core.Accounting.Dtos;
using Merchello.Core.Accounting.Services.Parameters;
using Merchello.Core.Payments.Services.Parameters;
using Merchello.Core.Shipping.Dtos;
using Merchello.Core.Shipping.Services.Parameters;

namespace Merchello.Services;

public interface IOrdersRequestMapper
{
    InvoiceQueryParameters MapInvoiceQuery(OrderQueryDto query);

    CreateShipmentParameters MapCreateShipmentParameters(Guid orderId, CreateShipmentDto request);

    UpdateShipmentParameters MapUpdateShipmentParameters(Guid shipmentId, UpdateShipmentDto request);

    UpdateShipmentStatusParameters MapUpdateShipmentStatusParameters(Guid shipmentId, UpdateShipmentStatusDto request);

    OutstandingInvoicesQueryParameters MapOutstandingInvoicesQuery(
        Guid? customerId,
        bool accountCustomersOnly,
        bool? overdueOnly,
        int? dueWithinDays,
        string? search,
        string sortBy,
        string sortDirection,
        int page,
        int pageSize);

    BatchMarkAsPaidParameters MapBatchMarkAsPaidParameters(BatchMarkAsPaidDto dto);
}
