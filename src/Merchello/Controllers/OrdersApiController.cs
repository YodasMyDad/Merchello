using Asp.Versioning;
using Merchello.Controllers.Dtos;
using Merchello.Core.Accounting.Models;
using Merchello.Core.Data;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Umbraco.Cms.Persistence.EFCore.Scoping;

namespace Merchello.Controllers;

[ApiVersion("1.0")]
[ApiExplorerSettings(GroupName = "Merchello")]
public class OrdersApiController : MerchelloApiControllerBase
{
    private readonly IEFCoreScopeProvider<MerchelloDbContext> _scopeProvider;

    public OrdersApiController(IEFCoreScopeProvider<MerchelloDbContext> scopeProvider)
    {
        _scopeProvider = scopeProvider;
    }

    /// <summary>
    /// Get paginated list of orders/invoices
    /// </summary>
    [HttpGet("orders")]
    [ProducesResponseType<OrderListResponse>(StatusCodes.Status200OK)]
    public async Task<OrderListResponse> GetOrders([FromQuery] OrderListQuery query)
    {
        using var scope = _scopeProvider.CreateScope();
        var result = await scope.ExecuteWithContextAsync(async db =>
        {
            var invoicesQuery = db.Invoices
                .Include(i => i.Orders)
                .Include(i => i.Payments)
                .AsQueryable();

            // Apply filters
            if (!string.IsNullOrEmpty(query.Search))
            {
                var search = query.Search.ToLower();
                invoicesQuery = invoicesQuery.Where(i =>
                    i.InvoiceNumber.ToLower().Contains(search) ||
                    (i.BillingAddress.Name != null && i.BillingAddress.Name.ToLower().Contains(search)));
            }

            if (!string.IsNullOrEmpty(query.PaymentStatus))
            {
                if (query.PaymentStatus.Equals("paid", StringComparison.OrdinalIgnoreCase))
                {
                    invoicesQuery = invoicesQuery.Where(i =>
                        i.Payments != null && i.Payments.Sum(p => p.PaymentSuccess ? p.Amount : 0) >= i.Total);
                }
                else if (query.PaymentStatus.Equals("unpaid", StringComparison.OrdinalIgnoreCase))
                {
                    invoicesQuery = invoicesQuery.Where(i =>
                        i.Payments == null || i.Payments.Sum(p => p.PaymentSuccess ? p.Amount : 0) < i.Total);
                }
            }

            if (!string.IsNullOrEmpty(query.FulfillmentStatus))
            {
                if (query.FulfillmentStatus.Equals("unfulfilled", StringComparison.OrdinalIgnoreCase))
                {
                    invoicesQuery = invoicesQuery.Where(i =>
                        i.Orders != null && i.Orders.Any(o =>
                            o.Status != OrderStatus.Completed && o.Status != OrderStatus.Shipped));
                }
                else if (query.FulfillmentStatus.Equals("fulfilled", StringComparison.OrdinalIgnoreCase))
                {
                    invoicesQuery = invoicesQuery.Where(i =>
                        i.Orders != null && i.Orders.All(o =>
                            o.Status == OrderStatus.Completed || o.Status == OrderStatus.Shipped));
                }
            }

            // Get total count before pagination
            var totalItems = await invoicesQuery.CountAsync();

            // Apply sorting
            invoicesQuery = query.SortBy?.ToLower() switch
            {
                "total" => query.SortDir?.ToLower() == "asc"
                    ? invoicesQuery.OrderBy(i => i.Total)
                    : invoicesQuery.OrderByDescending(i => i.Total),
                "customer" => query.SortDir?.ToLower() == "asc"
                    ? invoicesQuery.OrderBy(i => i.BillingAddress.Name)
                    : invoicesQuery.OrderByDescending(i => i.BillingAddress.Name),
                _ => query.SortDir?.ToLower() == "asc"
                    ? invoicesQuery.OrderBy(i => i.DateCreated)
                    : invoicesQuery.OrderByDescending(i => i.DateCreated)
            };

            // Apply pagination
            var skip = (query.Page - 1) * query.PageSize;
            var invoices = await invoicesQuery
                .Skip(skip)
                .Take(query.PageSize)
                .ToListAsync();

            // Map to DTOs
            var items = invoices.Select(MapToListItem).ToList();

            return new OrderListResponse
            {
                Items = items,
                Page = query.Page,
                PageSize = query.PageSize,
                TotalItems = totalItems,
                TotalPages = (int)Math.Ceiling((double)totalItems / query.PageSize)
            };
        });
        scope.Complete();
        return result;
    }

    /// <summary>
    /// Get order/invoice details by ID
    /// </summary>
    [HttpGet("orders/{id:guid}")]
    [ProducesResponseType<OrderDetailDto>(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> GetOrder(Guid id)
    {
        using var scope = _scopeProvider.CreateScope();
        var invoice = await scope.ExecuteWithContextAsync(async db =>
        {
            return await db.Invoices
                .Include(i => i.Orders)!
                    .ThenInclude(o => o.LineItems)
                .Include(i => i.Orders)!
                    .ThenInclude(o => o.Shipments)
                .Include(i => i.Payments)
                .FirstOrDefaultAsync(i => i.Id == id);
        });
        scope.Complete();

        if (invoice == null)
        {
            return NotFound();
        }

        return Ok(MapToDetail(invoice));
    }

    private static OrderListItemDto MapToListItem(Invoice invoice)
    {
        var orders = invoice.Orders?.ToList() ?? new List<Order>();
        var payments = invoice.Payments?.ToList() ?? new List<Payment>();

        var amountPaid = payments.Where(p => p.PaymentSuccess).Sum(p => p.Amount);
        var isPaid = amountPaid >= invoice.Total;

        var itemCount = orders.SelectMany(o => o.LineItems ?? Enumerable.Empty<LineItem>()).Sum(li => li.Quantity);

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
            PaymentStatus = isPaid ? "Paid" : "Unpaid",
            FulfillmentStatus = fulfillmentStatus,
            ItemCount = itemCount,
            DeliveryStatus = deliveryStatus,
            DeliveryMethod = deliveryMethod,
            Tags = new List<string>()
        };
    }

    private static OrderDetailDto MapToDetail(Invoice invoice)
    {
        var orders = invoice.Orders?.ToList() ?? new List<Order>();
        var payments = invoice.Payments?.ToList() ?? new List<Payment>();

        var amountPaid = payments.Where(p => p.PaymentSuccess).Sum(p => p.Amount);
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
            AmountPaid = amountPaid,
            PaymentStatus = amountPaid >= invoice.Total ? "Paid" : "Unpaid",
            FulfillmentStatus = GetFulfillmentStatus(orders),
            BillingAddress = MapAddress(invoice.BillingAddress),
            ShippingAddress = MapAddress(invoice.ShippingAddress),
            Orders = orders.Select(MapFulfillmentOrder).ToList(),
            Notes = invoice.Notes?.Select(n => new InvoiceNoteDto
            {
                Date = n.DateCreated,
                Text = n.Description ?? string.Empty,
                Author = n.Author
            }).ToList() ?? new List<InvoiceNoteDto>()
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
            LineItems = order.LineItems?.Select(li => new LineItemDto
            {
                Id = li.Id,
                Sku = li.Sku,
                Name = li.Name,
                Quantity = li.Quantity,
                Amount = li.Amount,
                OriginalAmount = li.OriginalAmount,
                ImageUrl = null // Would come from product lookup
            }).ToList() ?? new List<LineItemDto>(),
            Shipments = order.Shipments?.Select(s => new ShipmentDto
            {
                Id = s.Id,
                TrackingNumber = s.TrackingNumber,
                TrackingUrl = s.TrackingUrl,
                Carrier = s.Carrier,
                ActualDeliveryDate = s.ActualDeliveryDate
            }).ToList() ?? new List<ShipmentDto>()
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
}
