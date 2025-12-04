using Asp.Versioning;
using Merchello.Core.Accounting.Dtos;
using Merchello.Core.Accounting.Models;
using Merchello.Core.Accounting.Services.Interfaces;
using Merchello.Core.Accounting.Services.Parameters;
using Merchello.Core.Locality.Dtos;
using Merchello.Core.Payments.Models;
using Merchello.Core.Payments.Services;
using Merchello.Core.Shipping.Dtos;
using Merchello.Core.Shipping.Models;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Umbraco.Cms.Core.Security;

namespace Merchello.Controllers;

[ApiVersion("1.0")]
[ApiExplorerSettings(GroupName = "Merchello")]
public class OrdersApiController(
    IPaymentService paymentService,
    IInvoiceService invoiceService,
    IBackOfficeSecurityAccessor backOfficeSecurityAccessor) : MerchelloApiControllerBase
{
    /// <summary>
    /// Get paginated list of orders/invoices
    /// </summary>
    [HttpGet("orders")]
    [ProducesResponseType<OrderListResponse>(StatusCodes.Status200OK)]
    public async Task<OrderListResponse> GetOrders([FromQuery] OrderListQuery query)
    {
        // Map query to parameters
        var parameters = new InvoiceQueryParameters
        {
            CurrentPage = query.Page,
            AmountPerPage = query.PageSize,
            Search = query.Search,
            OrderBy = MapOrderBy(query.SortBy, query.SortDir)
        };

        // Map payment status filter
        if (!string.IsNullOrEmpty(query.PaymentStatus))
        {
            parameters.PaymentStatusFilter = query.PaymentStatus.ToLower() switch
            {
                "paid" => InvoicePaymentStatusFilter.Paid,
                "unpaid" => InvoicePaymentStatusFilter.Unpaid,
                _ => InvoicePaymentStatusFilter.All
            };
        }

        // Map fulfillment status filter
        if (!string.IsNullOrEmpty(query.FulfillmentStatus))
        {
            parameters.FulfillmentStatusFilter = query.FulfillmentStatus.ToLower() switch
            {
                "fulfilled" => InvoiceFulfillmentStatusFilter.Fulfilled,
                "unfulfilled" => InvoiceFulfillmentStatusFilter.Unfulfilled,
                _ => InvoiceFulfillmentStatusFilter.All
            };
        }

        // Execute query using service with real DB paging
        var result = await invoiceService.QueryInvoices(parameters);

        // Map to DTOs
        var items = result.Items.Select(MapToListItem).ToList();

        return new OrderListResponse
        {
            Items = items,
            Page = result.PageIndex,
            PageSize = query.PageSize,
            TotalItems = result.TotalItems,
            TotalPages = result.TotalPages
        };
    }

    private static InvoiceOrderBy MapOrderBy(string? sortBy, string? sortDir)
    {
        var isAsc = sortDir?.ToLower() == "asc";
        return sortBy?.ToLower() switch
        {
            "total" => isAsc ? InvoiceOrderBy.TotalAsc : InvoiceOrderBy.TotalDesc,
            "customer" => isAsc ? InvoiceOrderBy.CustomerAsc : InvoiceOrderBy.CustomerDesc,
            "invoicenumber" => isAsc ? InvoiceOrderBy.InvoiceNumberAsc : InvoiceOrderBy.InvoiceNumberDesc,
            _ => isAsc ? InvoiceOrderBy.DateAsc : InvoiceOrderBy.DateDesc
        };
    }

    /// <summary>
    /// Get order statistics for today
    /// </summary>
    [HttpGet("orders/stats")]
    [ProducesResponseType<OrderStatsDto>(StatusCodes.Status200OK)]
    public async Task<OrderStatsDto> GetOrderStats()
    {
        return await invoiceService.GetOrderStatsAsync();
    }

    /// <summary>
    /// Get dashboard statistics with monthly metrics and percentage changes
    /// </summary>
    [HttpGet("orders/dashboard-stats")]
    [ProducesResponseType<DashboardStatsDto>(StatusCodes.Status200OK)]
    public async Task<DashboardStatsDto> GetDashboardStats()
    {
        return await invoiceService.GetDashboardStatsAsync();
    }

    /// <summary>
    /// Export orders within a date range for CSV generation
    /// </summary>
    [HttpPost("orders/export")]
    [ProducesResponseType<List<OrderExportItemDto>>(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> ExportOrders(
        [FromBody] OrderExportRequestDto request,
        CancellationToken cancellationToken)
    {
        if (request.FromDate > request.ToDate)
        {
            return BadRequest("From date must be before or equal to To date");
        }

        var exportItems = await invoiceService.GetOrdersForExportAsync(
            request.FromDate,
            request.ToDate,
            cancellationToken);

        return Ok(exportItems);
    }

    /// <summary>
    /// Get order/invoice details by ID
    /// </summary>
    [HttpGet("orders/{id:guid}")]
    [ProducesResponseType<OrderDetailDto>(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> GetOrder(Guid id)
    {
        var invoice = await invoiceService.GetInvoiceAsync(id);

        if (invoice == null)
        {
            return NotFound();
        }

        var detail = MapToDetail(invoice);

        // Get customer order count by billing email
        var billingEmail = invoice.BillingAddress?.Email;
        if (!string.IsNullOrWhiteSpace(billingEmail))
        {
            detail.CustomerOrderCount = await invoiceService.GetInvoiceCountByBillingEmailAsync(billingEmail);
        }

        return Ok(detail);
    }

    /// <summary>
    /// Soft-delete multiple orders/invoices
    /// </summary>
    [HttpPost("orders/delete")]
    [ProducesResponseType<DeleteOrdersResponse>(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> DeleteOrders([FromBody] DeleteOrdersRequest request)
    {
        if (request.Ids == null || request.Ids.Count == 0)
        {
            return BadRequest("At least one order ID is required");
        }

        var deletedCount = await invoiceService.SoftDeleteInvoicesAsync(request.Ids);

        return Ok(new DeleteOrdersResponse
        {
            DeletedCount = deletedCount
        });
    }

    /// <summary>
    /// Add a note to an invoice timeline
    /// </summary>
    [HttpPost("orders/{invoiceId:guid}/notes")]
    [ProducesResponseType<InvoiceNoteDto>(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> AddNote(Guid invoiceId, [FromBody] AddInvoiceNoteDto request)
    {
        if (string.IsNullOrWhiteSpace(request.Text))
        {
            return BadRequest("Note text is required");
        }

        // Get current backoffice user if available
        var currentUser = backOfficeSecurityAccessor.BackOfficeSecurity?.CurrentUser;
        var authorId = currentUser?.Key;
        var authorName = currentUser?.Name;

        var result = await invoiceService.AddNoteAsync(
            invoiceId,
            request.Text,
            request.VisibleToCustomer,
            authorId,
            authorName);

        if (result.ResultObject == null)
        {
            var error = result.Messages.FirstOrDefault()?.Message ?? "Failed to add note";
            return error.Contains("not found") ? NotFound(error) : BadRequest(error);
        }

        return Ok(new InvoiceNoteDto
        {
            Date = result.ResultObject.DateCreated,
            Text = result.ResultObject.Description ?? string.Empty,
            AuthorId = result.ResultObject.AuthorId,
            Author = result.ResultObject.Author,
            VisibleToCustomer = result.ResultObject.VisibleToCustomer
        });
    }

    /// <summary>
    /// Update billing address for an invoice
    /// </summary>
    [HttpPut("orders/{invoiceId:guid}/billing-address")]
    [ProducesResponseType<AddressDto>(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> UpdateBillingAddress(Guid invoiceId, [FromBody] AddressDto request)
    {
        var address = MapDtoToAddress(request);
        var result = await invoiceService.UpdateBillingAddressAsync(invoiceId, address);

        if (result.ResultObject == null)
        {
            return NotFound("Invoice not found");
        }

        return Ok(MapAddress(result.ResultObject));
    }

    /// <summary>
    /// Update shipping address for an invoice
    /// </summary>
    [HttpPut("orders/{invoiceId:guid}/shipping-address")]
    [ProducesResponseType<AddressDto>(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> UpdateShippingAddress(Guid invoiceId, [FromBody] AddressDto request)
    {
        var address = MapDtoToAddress(request);
        var result = await invoiceService.UpdateShippingAddressAsync(invoiceId, address);

        if (result.ResultObject == null)
        {
            return NotFound("Invoice not found");
        }

        return Ok(MapAddress(result.ResultObject));
    }

    private static Core.Locality.Models.Address MapDtoToAddress(AddressDto dto)
    {
        return new Core.Locality.Models.Address
        {
            Name = dto.Name,
            Company = dto.Company,
            AddressOne = dto.AddressOne,
            AddressTwo = dto.AddressTwo,
            TownCity = dto.TownCity,
            CountyState = new Core.Locality.Models.CountyState { Name = dto.CountyState },
            PostalCode = dto.PostalCode,
            Country = dto.Country,
            CountryCode = dto.CountryCode,
            Email = dto.Email,
            Phone = dto.Phone
        };
    }

    private OrderListItemDto MapToListItem(Invoice invoice)
    {
        var orders = invoice.Orders?.ToList() ?? [];
        var payments = invoice.Payments?.ToList() ?? [];

        // Use centralized payment status calculation from PaymentService
        var paymentDetails = paymentService.CalculatePaymentStatus(payments, invoice.Total);

        var itemCount = orders.SelectMany(o => o.LineItems ?? []).Sum(li => li.Quantity);

        var fulfillmentStatus = GetFulfillmentStatus(orders);
        var deliveryStatus = GetDeliveryStatus(orders);
        var deliveryMethod = "Standard"; // TODO: This should come from ShippingOption lookup

        return new OrderListItemDto
        {
            Id = invoice.Id,
            InvoiceNumber = invoice.InvoiceNumber,
            DateCreated = invoice.DateCreated,
            CustomerName = invoice.BillingAddress?.Name ?? "Unknown",
            Channel = invoice.Channel,
            Total = invoice.Total,
            PaymentStatus = paymentDetails.Status,
            PaymentStatusDisplay = paymentDetails.StatusDisplay,
            FulfillmentStatus = fulfillmentStatus,
            ItemCount = itemCount,
            DeliveryStatus = deliveryStatus,
            DeliveryMethod = deliveryMethod,
            Tags = []
        };
    }

    private OrderDetailDto MapToDetail(Invoice invoice)
    {
        var orders = invoice.Orders?.ToList() ?? [];
        var payments = invoice.Payments?.ToList() ?? [];

        // Use centralized payment status calculation from PaymentService
        var paymentDetails = paymentService.CalculatePaymentStatus(payments, invoice.Total);
        var shippingCost = orders.Sum(o => o.ShippingCost);

        return new OrderDetailDto
        {
            Id = invoice.Id,
            InvoiceNumber = invoice.InvoiceNumber,
            DateCreated = invoice.DateCreated,
            Channel = invoice.Channel,
            SubTotal = invoice.SubTotal,
            ShippingCost = shippingCost,
            Tax = invoice.Tax,
            Total = invoice.Total,
            AmountPaid = paymentDetails.NetPayment,
            BalanceDue = paymentDetails.BalanceDue,
            PaymentStatus = paymentDetails.Status,
            PaymentStatusDisplay = paymentDetails.StatusDisplay,
            FulfillmentStatus = GetFulfillmentStatus(orders),
            BillingAddress = MapAddress(invoice.BillingAddress),
            ShippingAddress = MapAddress(invoice.ShippingAddress),
            Orders = orders.Select(MapFulfillmentOrder).ToList(),
            Notes = invoice.Notes?.Select(n => new InvoiceNoteDto
            {
                Date = n.DateCreated,
                Text = n.Description ?? string.Empty,
                AuthorId = n.AuthorId,
                Author = n.Author,
                VisibleToCustomer = n.VisibleToCustomer
            }).ToList() ?? []
        };
    }

    private static AddressDto? MapAddress(Core.Locality.Models.Address? address)
    {
        if (address == null) return null;

        return new AddressDto
        {
            Name = address.Name,
            Company = address.Company,
            AddressOne = address.AddressOne,
            AddressTwo = address.AddressTwo,
            TownCity = address.TownCity,
            CountyState = address.CountyState?.Name,
            PostalCode = address.PostalCode,
            Country = address.Country,
            CountryCode = address.CountryCode,
            Email = address.Email,
            Phone = address.Phone
        };
    }

    private static FulfillmentOrderDto MapFulfillmentOrder(Order order)
    {
        return new FulfillmentOrderDto
        {
            Id = order.Id,
            Status = order.Status,
            DeliveryMethod = "Standard", // Would come from ShippingOption lookup
            ShippingCost = order.ShippingCost,
            LineItems = order.LineItems?
                .Where(li => li.LineItemType == LineItemType.Product)
                .Select(li => new LineItemDto
            {
                Id = li.Id,
                Sku = li.Sku,
                Name = li.Name,
                Quantity = li.Quantity,
                Amount = li.Amount,
                OriginalAmount = li.OriginalAmount,
                ImageUrl = null // Would come from product lookup
            }).ToList() ?? [],
            Shipments = order.Shipments?.Select(s => new ShipmentDto
            {
                Id = s.Id,
                TrackingNumber = s.TrackingNumber,
                TrackingUrl = s.TrackingUrl,
                Carrier = s.Carrier,
                ActualDeliveryDate = s.ActualDeliveryDate
            }).ToList() ?? []
        };
    }

    private static string GetFulfillmentStatus(List<Order> orders)
    {
        if (!orders.Any()) return "Unfulfilled";

        var allShipped = orders.All(o => o.Status == OrderStatus.Shipped || o.Status == OrderStatus.Completed);
        if (allShipped) return "Fulfilled";

        var anyShipped = orders.Any(o => o.Status == OrderStatus.Shipped || o.Status == OrderStatus.PartiallyShipped);
        if (anyShipped) return "Partial";

        return "Unfulfilled";
    }

    private static string GetDeliveryStatus(List<Order> orders)
    {
        var hasTracking = orders.Any(o => o.Shipments?.Any(s => !string.IsNullOrEmpty(s.TrackingNumber)) == true);
        return hasTracking ? "Tracking added" : "";
    }

    // ============================================
    // Fulfillment Endpoints
    // ============================================

    /// <summary>
    /// Get fulfillment summary for an invoice (used in fulfillment dialog)
    /// </summary>
    [HttpGet("orders/{invoiceId:guid}/fulfillment-summary")]
    [ProducesResponseType<FulfillmentSummaryDto>(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> GetFulfillmentSummary(Guid invoiceId)
    {
        var summary = await invoiceService.GetFulfillmentSummaryAsync(invoiceId);

        if (summary == null)
        {
            return NotFound();
        }

        return Ok(summary);
    }

    /// <summary>
    /// Create a shipment for an order
    /// </summary>
    [HttpPost("orders/{orderId:guid}/shipments")]
    [ProducesResponseType<ShipmentDetailDto>(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> CreateShipment(Guid orderId, [FromBody] CreateShipmentRequestDto request)
    {
        if (request.LineItems == null || request.LineItems.Count == 0)
        {
            return BadRequest("At least one line item is required");
        }

        var parameters = new CreateShipmentParameters
        {
            OrderId = orderId,
            LineItems = request.LineItems,
            Carrier = request.Carrier,
            TrackingNumber = request.TrackingNumber,
            TrackingUrl = request.TrackingUrl
        };

        var result = await invoiceService.CreateShipmentAsync(parameters);

        if (result.ResultObject == null)
        {
            var error = result.Messages.FirstOrDefault()?.Message ?? "Failed to create shipment";
            return error.Contains("not found") ? NotFound(error) : BadRequest(error);
        }

        return Ok(MapToShipmentDetail(result.ResultObject));
    }

    /// <summary>
    /// Update shipment tracking information
    /// </summary>
    [HttpPut("shipments/{shipmentId:guid}")]
    [ProducesResponseType<ShipmentDetailDto>(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> UpdateShipment(Guid shipmentId, [FromBody] UpdateShipmentRequestDto request)
    {
        var parameters = new UpdateShipmentParameters
        {
            ShipmentId = shipmentId,
            Carrier = request.Carrier,
            TrackingNumber = request.TrackingNumber,
            TrackingUrl = request.TrackingUrl,
            ActualDeliveryDate = request.ActualDeliveryDate
        };

        var result = await invoiceService.UpdateShipmentAsync(parameters);

        if (result.ResultObject == null)
        {
            return NotFound();
        }

        return Ok(MapToShipmentDetail(result.ResultObject));
    }

    /// <summary>
    /// Delete a shipment (releases items back to unfulfilled)
    /// </summary>
    [HttpDelete("shipments/{shipmentId:guid}")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> DeleteShipment(Guid shipmentId)
    {
        var success = await invoiceService.DeleteShipmentAsync(shipmentId);

        if (!success)
        {
            return NotFound();
        }

        return NoContent();
    }

    private static ShipmentDetailDto MapToShipmentDetail(Shipment shipment)
    {
        return new ShipmentDetailDto
        {
            Id = shipment.Id,
            OrderId = shipment.OrderId,
            Carrier = shipment.Carrier,
            TrackingNumber = shipment.TrackingNumber,
            TrackingUrl = shipment.TrackingUrl,
            DateCreated = shipment.DateCreated,
            ActualDeliveryDate = shipment.ActualDeliveryDate,
            LineItems = shipment.LineItems?.Select(li => new ShipmentLineItemDto
            {
                Id = Guid.NewGuid(), // Generate new ID for the shipment line item reference
                LineItemId = li.Id,
                Sku = li.Sku,
                Name = li.Name,
                Quantity = li.Quantity,
                ImageUrl = null // TODO: lookup from product
            }).ToList() ?? []
        };
    }
}
