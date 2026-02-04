using Merchello.Core;
using Merchello.Core.Accounting.Dtos;
using Merchello.Core.Accounting.Services.Parameters;
using Merchello.Core.Payments.Services.Parameters;
using Merchello.Core.Shared.Models.Enums;
using Merchello.Core.Shipping.Dtos;
using Merchello.Core.Shipping.Services.Parameters;

namespace Merchello.Services;

public class OrdersRequestMapper : IOrdersRequestMapper
{
    public InvoiceQueryParameters MapInvoiceQuery(OrderQueryDto query)
    {
        var parameters = new InvoiceQueryParameters
        {
            CurrentPage = query.Page,
            AmountPerPage = query.PageSize,
            Search = query.Search,
            OrderBy = MapOrderBy(query.SortBy, query.SortDir)
        };

        if (!string.IsNullOrEmpty(query.PaymentStatus))
        {
            parameters.PaymentStatusFilter = query.PaymentStatus.ToLower() switch
            {
                Constants.QueryFilters.PaymentStatus.Paid => InvoicePaymentStatusFilter.Paid,
                Constants.QueryFilters.PaymentStatus.Unpaid => InvoicePaymentStatusFilter.Unpaid,
                _ => InvoicePaymentStatusFilter.All
            };
        }

        if (!string.IsNullOrEmpty(query.FulfillmentStatus))
        {
            parameters.FulfillmentStatusFilter = query.FulfillmentStatus.ToLower() switch
            {
                Constants.QueryFilters.FulfillmentStatus.Fulfilled => InvoiceFulfillmentStatusFilter.Fulfilled,
                Constants.QueryFilters.FulfillmentStatus.Unfulfilled => InvoiceFulfillmentStatusFilter.Unfulfilled,
                _ => InvoiceFulfillmentStatusFilter.All
            };
        }

        if (!string.IsNullOrEmpty(query.CancellationStatus))
        {
            parameters.CancellationStatusFilter = query.CancellationStatus.ToLower() switch
            {
                Constants.QueryFilters.CancellationStatus.Cancelled => InvoiceCancellationStatusFilter.Cancelled,
                Constants.QueryFilters.CancellationStatus.Active => InvoiceCancellationStatusFilter.Active,
                _ => InvoiceCancellationStatusFilter.All
            };
        }

        return parameters;
    }

    public CreateShipmentParameters MapCreateShipmentParameters(Guid orderId, CreateShipmentDto request) =>
        new()
        {
            OrderId = orderId,
            LineItems = request.LineItems,
            Carrier = request.Carrier,
            TrackingNumber = request.TrackingNumber,
            TrackingUrl = request.TrackingUrl
        };

    public UpdateShipmentParameters MapUpdateShipmentParameters(Guid shipmentId, UpdateShipmentDto request) =>
        new()
        {
            ShipmentId = shipmentId,
            Carrier = request.Carrier,
            TrackingNumber = request.TrackingNumber,
            TrackingUrl = request.TrackingUrl,
            ActualDeliveryDate = request.ActualDeliveryDate
        };

    public UpdateShipmentStatusParameters MapUpdateShipmentStatusParameters(Guid shipmentId, UpdateShipmentStatusDto request) =>
        new()
        {
            ShipmentId = shipmentId,
            NewStatus = request.NewStatus,
            Carrier = request.Carrier,
            TrackingNumber = request.TrackingNumber,
            TrackingUrl = request.TrackingUrl
        };

    public OutstandingInvoicesQueryParameters MapOutstandingInvoicesQuery(
        Guid? customerId,
        bool accountCustomersOnly,
        bool? overdueOnly,
        int? dueWithinDays,
        string? search,
        string sortBy,
        string sortDirection,
        int page,
        int pageSize) =>
        new()
        {
            CustomerId = customerId,
            AccountCustomersOnly = accountCustomersOnly,
            OverdueOnly = overdueOnly,
            DueWithinDays = dueWithinDays,
            Search = search,
            SortBy = sortBy,
            SortDirection = sortDirection,
            Page = page,
            PageSize = pageSize
        };

    public BatchMarkAsPaidParameters MapBatchMarkAsPaidParameters(BatchMarkAsPaidDto dto) =>
        new()
        {
            InvoiceIds = dto.InvoiceIds,
            PaymentMethod = dto.PaymentMethod,
            Reference = dto.Reference,
            DateReceived = dto.DateReceived
        };

    private static InvoiceOrderBy MapOrderBy(string? sortBy, string? sortDir)
    {
        var isAsc = sortDir?.ToLower() == Constants.QueryFilters.SortDirection.Ascending;
        return sortBy?.ToLower() switch
        {
            Constants.QueryFilters.SortBy.Total => isAsc ? InvoiceOrderBy.TotalAsc : InvoiceOrderBy.TotalDesc,
            Constants.QueryFilters.SortBy.Customer => isAsc ? InvoiceOrderBy.CustomerAsc : InvoiceOrderBy.CustomerDesc,
            Constants.QueryFilters.SortBy.InvoiceNumber => isAsc ? InvoiceOrderBy.InvoiceNumberAsc : InvoiceOrderBy.InvoiceNumberDesc,
            _ => isAsc ? InvoiceOrderBy.DateAsc : InvoiceOrderBy.DateDesc
        };
    }
}
