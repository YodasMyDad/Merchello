using Asp.Versioning;
using Merchello.Core.Accounting.Dtos;
using Merchello.Core.Accounting.Models;
using Merchello.Core.Locality.Dtos;
using Merchello.Core.Payments.Models;
using Merchello.Core.Payments.Services;
using Merchello.Core.Shipping.Dtos;
using Merchello.Core.Data;
using Merchello.Core.Shipping.Models;
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
    private readonly IPaymentService _paymentService;

    public OrdersApiController(
        IEFCoreScopeProvider<MerchelloDbContext> scopeProvider,
        IPaymentService paymentService)
    {
        _scopeProvider = scopeProvider;
        _paymentService = paymentService;
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
                .Include(i => i.Orders)!
                    .ThenInclude(o => o.LineItems)
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

            // Fetch all matching invoices (payment filter applied in memory for SQLite compatibility)
            var allInvoices = await invoicesQuery.ToListAsync();

            // Apply payment status filter in memory (SQLite doesn't support Sum in subqueries)
            IEnumerable<Invoice> filteredInvoices = allInvoices;
            if (!string.IsNullOrEmpty(query.PaymentStatus))
            {
                if (query.PaymentStatus.Equals("paid", StringComparison.OrdinalIgnoreCase))
                {
                    filteredInvoices = allInvoices.Where(i =>
                        i.Payments != null &&
                        i.Payments.Where(p => p.PaymentSuccess).Sum(p => p.Amount) >= i.Total);
                }
                else if (query.PaymentStatus.Equals("unpaid", StringComparison.OrdinalIgnoreCase))
                {
                    filteredInvoices = allInvoices.Where(i =>
                        i.Payments == null ||
                        !i.Payments.Any() ||
                        i.Payments.Where(p => p.PaymentSuccess).Sum(p => p.Amount) < i.Total);
                }
            }

            // Get total count after filtering
            var totalItems = filteredInvoices.Count();

            // Apply pagination in memory
            var skip = (query.Page - 1) * query.PageSize;
            var invoices = filteredInvoices
                .Skip(skip)
                .Take(query.PageSize)
                .ToList();

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
    /// Get order statistics for today
    /// </summary>
    [HttpGet("orders/stats")]
    [ProducesResponseType<OrderStatsDto>(StatusCodes.Status200OK)]
    public async Task<OrderStatsDto> GetOrderStats()
    {
        var today = DateTime.UtcNow.Date;
        var tomorrow = today.AddDays(1);

        using var scope = _scopeProvider.CreateScope();
        var stats = await scope.ExecuteWithContextAsync(async db =>
        {
            // Get today's invoices with their orders and line items
            var todaysInvoices = await db.Invoices
                .Include(i => i.Orders)!
                    .ThenInclude(o => o.LineItems)
                .Include(i => i.Orders)!
                    .ThenInclude(o => o.Shipments)
                .Where(i => i.DateCreated >= today && i.DateCreated < tomorrow)
                .ToListAsync();

            var ordersToday = todaysInvoices.Count;

            var itemsOrderedToday = todaysInvoices
                .SelectMany(i => i.Orders ?? Enumerable.Empty<Order>())
                .SelectMany(o => o.LineItems ?? Enumerable.Empty<LineItem>())
                .Sum(li => li.Quantity);

            var ordersFulfilledToday = todaysInvoices
                .Where(i => i.Orders != null && i.Orders.Any() &&
                            i.Orders.All(o => o.Status == OrderStatus.Shipped || o.Status == OrderStatus.Completed))
                .Count();

            var ordersDeliveredToday = todaysInvoices
                .Where(i => i.Orders != null &&
                            i.Orders.Any(o => o.Shipments != null &&
                                              o.Shipments.Any(s => s.ActualDeliveryDate != null &&
                                                                   s.ActualDeliveryDate.Value.Date == today)))
                .Count();

            return new OrderStatsDto
            {
                OrdersToday = ordersToday,
                ItemsOrderedToday = itemsOrderedToday,
                OrdersFulfilledToday = ordersFulfilledToday,
                OrdersDeliveredToday = ordersDeliveredToday
            };
        });
        scope.Complete();

        return stats;
    }

    /// <summary>
    /// Get dashboard statistics with monthly metrics and percentage changes
    /// </summary>
    [HttpGet("orders/dashboard-stats")]
    [ProducesResponseType<DashboardStatsDto>(StatusCodes.Status200OK)]
    public async Task<DashboardStatsDto> GetDashboardStats()
    {
        var now = DateTime.UtcNow;
        var thisMonthStart = new DateTime(now.Year, now.Month, 1, 0, 0, 0, DateTimeKind.Utc);
        var lastMonthStart = thisMonthStart.AddMonths(-1);
        var lastMonthEnd = thisMonthStart;

        using var scope = _scopeProvider.CreateScope();
        var stats = await scope.ExecuteWithContextAsync(async db =>
        {
            // Get all invoices for this month and last month
            var thisMonthInvoices = await db.Invoices
                .Where(i => i.DateCreated >= thisMonthStart)
                .ToListAsync();

            var lastMonthInvoices = await db.Invoices
                .Where(i => i.DateCreated >= lastMonthStart && i.DateCreated < lastMonthEnd)
                .ToListAsync();

            // Orders stats
            var ordersThisMonth = thisMonthInvoices.Count;
            var ordersLastMonth = lastMonthInvoices.Count;
            var ordersChangePercent = ordersLastMonth > 0
                ? Math.Round(((decimal)(ordersThisMonth - ordersLastMonth) / ordersLastMonth) * 100, 1)
                : (ordersThisMonth > 0 ? 100m : 0m);

            // Revenue stats
            var revenueThisMonth = thisMonthInvoices.Sum(i => i.Total);
            var revenueLastMonth = lastMonthInvoices.Sum(i => i.Total);
            var revenueChangePercent = revenueLastMonth > 0
                ? Math.Round(((revenueThisMonth - revenueLastMonth) / revenueLastMonth) * 100, 1)
                : (revenueThisMonth > 0 ? 100m : 0m);

            // Product count (total active products)
            var productCount = await db.RootProducts.CountAsync();
            // ProductRoot doesn't track DateCreated, so we can't calculate change
            var productCountChange = 0;

            // Customer count (unique billing emails)
            var allEmails = await db.Invoices
                .Where(i => i.BillingAddress.Email != null)
                .Select(i => i.BillingAddress.Email)
                .Distinct()
                .ToListAsync();
            var customerCount = allEmails.Count;

            // New customers this month (emails that first appear this month)
            var emailsBeforeThisMonth = await db.Invoices
                .Where(i => i.DateCreated < thisMonthStart && i.BillingAddress.Email != null)
                .Select(i => i.BillingAddress.Email)
                .Distinct()
                .ToListAsync();
            var emailsThisMonth = thisMonthInvoices
                .Where(i => i.BillingAddress?.Email != null)
                .Select(i => i.BillingAddress!.Email)
                .Distinct()
                .ToList();
            var newCustomersThisMonth = emailsThisMonth.Count(e => !emailsBeforeThisMonth.Contains(e));

            return new DashboardStatsDto
            {
                OrdersThisMonth = ordersThisMonth,
                OrdersChangePercent = ordersChangePercent,
                RevenueThisMonth = revenueThisMonth,
                RevenueChangePercent = revenueChangePercent,
                ProductCount = productCount,
                ProductCountChange = productCountChange,
                CustomerCount = customerCount,
                CustomerCountChange = newCustomersThisMonth
            };
        });
        scope.Complete();

        return stats;
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

        using var scope = _scopeProvider.CreateScope();
        var result = await scope.ExecuteWithContextAsync(async db =>
        {
            var invoice = await db.Invoices.FirstOrDefaultAsync(i => i.Id == invoiceId);
            if (invoice == null)
            {
                return ((InvoiceNote?)null, "Invoice not found");
            }

            var note = new InvoiceNote
            {
                DateCreated = DateTime.UtcNow,
                Description = request.Text.Trim(),
                Author = "Staff", // TODO: Get current user name from auth context
                VisibleToCustomer = request.VisibleToCustomer
            };

            invoice.Notes ??= new List<InvoiceNote>();
            invoice.Notes.Add(note);
            invoice.DateUpdated = DateTime.UtcNow;

            await db.SaveChangesAsync();
            return (note, (string?)null);
        });
        scope.Complete();

        if (result.Item1 == null)
        {
            return result.Item2 == "Invoice not found" ? NotFound(result.Item2) : BadRequest(result.Item2);
        }

        return Ok(new InvoiceNoteDto
        {
            Date = result.Item1.DateCreated,
            Text = result.Item1.Description ?? string.Empty,
            Author = result.Item1.Author,
            VisibleToCustomer = result.Item1.VisibleToCustomer
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
        using var scope = _scopeProvider.CreateScope();
        var result = await scope.ExecuteWithContextAsync(async db =>
        {
            var invoice = await db.Invoices.FirstOrDefaultAsync(i => i.Id == invoiceId);
            if (invoice == null)
            {
                return (false, (AddressDto?)null);
            }

            invoice.BillingAddress = MapDtoToAddress(request);
            invoice.DateUpdated = DateTime.UtcNow;

            await db.SaveChangesAsync();
            return (true, MapAddress(invoice.BillingAddress));
        });
        scope.Complete();

        if (!result.Item1)
        {
            return NotFound("Invoice not found");
        }

        return Ok(result.Item2);
    }

    /// <summary>
    /// Update shipping address for an invoice
    /// </summary>
    [HttpPut("orders/{invoiceId:guid}/shipping-address")]
    [ProducesResponseType<AddressDto>(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> UpdateShippingAddress(Guid invoiceId, [FromBody] AddressDto request)
    {
        using var scope = _scopeProvider.CreateScope();
        var result = await scope.ExecuteWithContextAsync(async db =>
        {
            var invoice = await db.Invoices.FirstOrDefaultAsync(i => i.Id == invoiceId);
            if (invoice == null)
            {
                return (false, (AddressDto?)null);
            }

            invoice.ShippingAddress = MapDtoToAddress(request);
            invoice.DateUpdated = DateTime.UtcNow;

            await db.SaveChangesAsync();
            return (true, MapAddress(invoice.ShippingAddress));
        });
        scope.Complete();

        if (!result.Item1)
        {
            return NotFound("Invoice not found");
        }

        return Ok(result.Item2);
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
        var orders = invoice.Orders?.ToList() ?? new List<Order>();
        var payments = invoice.Payments?.ToList() ?? new List<Payment>();

        // Use centralized payment status calculation from PaymentService
        var paymentDetails = _paymentService.CalculatePaymentStatus(payments, invoice.Total);

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
            PaymentStatus = paymentDetails.Status,
            PaymentStatusDisplay = paymentDetails.StatusDisplay,
            FulfillmentStatus = fulfillmentStatus,
            ItemCount = itemCount,
            DeliveryStatus = deliveryStatus,
            DeliveryMethod = deliveryMethod,
            Tags = new List<string>()
        };
    }

    private OrderDetailDto MapToDetail(Invoice invoice)
    {
        var orders = invoice.Orders?.ToList() ?? new List<Order>();
        var payments = invoice.Payments?.ToList() ?? new List<Payment>();

        // Use centralized payment status calculation from PaymentService
        var paymentDetails = _paymentService.CalculatePaymentStatus(payments, invoice.Total);
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
                Author = n.Author,
                VisibleToCustomer = n.VisibleToCustomer
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
        using var scope = _scopeProvider.CreateScope();
        var invoice = await scope.ExecuteWithContextAsync(async db =>
        {
            return await db.Invoices
                .Include(i => i.Orders)!
                    .ThenInclude(o => o.LineItems)
                .Include(i => i.Orders)!
                    .ThenInclude(o => o.Shipments)
                .FirstOrDefaultAsync(i => i.Id == invoiceId);
        });
        scope.Complete();

        if (invoice == null)
        {
            return NotFound();
        }

        // Load warehouse names
        var warehouseIds = invoice.Orders?.Select(o => o.WarehouseId).Distinct().ToList() ?? new List<Guid>();
        Dictionary<Guid, string> warehouseNames;

        using var scope2 = _scopeProvider.CreateScope();
        warehouseNames = await scope2.ExecuteWithContextAsync(async db =>
        {
            return await db.Warehouses
                .Where(w => warehouseIds.Contains(w.Id))
                .ToDictionaryAsync(w => w.Id, w => w.Name ?? "Unknown Warehouse");
        });
        scope2.Complete();

        var summary = MapToFulfillmentSummary(invoice, warehouseNames);
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

        using var scope = _scopeProvider.CreateScope();
        var result = await scope.ExecuteWithContextAsync(async db =>
        {
            var order = await db.Orders
                .Include(o => o.LineItems)
                .Include(o => o.Shipments)
                .Include(o => o.Invoice)
                .FirstOrDefaultAsync(o => o.Id == orderId);

            if (order == null)
            {
                return ((Shipment?)null, "Order not found");
            }

            // Validate quantities
            foreach (var (lineItemId, quantity) in request.LineItems)
            {
                var lineItem = order.LineItems?.FirstOrDefault(li => li.Id == lineItemId);
                if (lineItem == null)
                {
                    return ((Shipment?)null, $"Line item {lineItemId} not found in order");
                }

                var alreadyShipped = order.Shipments?
                    .SelectMany(s => s.LineItems ?? new List<LineItem>())
                    .Where(li => li.Id == lineItemId)
                    .Sum(li => li.Quantity) ?? 0;

                var remaining = lineItem.Quantity - alreadyShipped;
                if (quantity > remaining)
                {
                    return ((Shipment?)null, $"Cannot ship {quantity} of {lineItem.Name}. Only {remaining} remaining");
                }
            }

            // Create shipment line items
            var shipmentLineItems = new List<LineItem>();
            foreach (var (lineItemId, quantity) in request.LineItems)
            {
                var sourceLineItem = order.LineItems!.First(li => li.Id == lineItemId);
                shipmentLineItems.Add(new LineItem
                {
                    Id = sourceLineItem.Id, // Keep original ID for tracking
                    Sku = sourceLineItem.Sku,
                    Name = sourceLineItem.Name,
                    Quantity = quantity,
                    Amount = sourceLineItem.Amount,
                    LineItemType = sourceLineItem.LineItemType,
                });
            }

            // Create shipment
            var shipment = new Shipment
            {
                OrderId = orderId,
                SupplierId = order.WarehouseId,
                Address = order.Invoice?.ShippingAddress ?? new Core.Locality.Models.Address(),
                LineItems = shipmentLineItems,
                Carrier = request.Carrier,
                TrackingNumber = request.TrackingNumber,
                TrackingUrl = request.TrackingUrl,
                RequestedDeliveryDate = order.RequestedDeliveryDate,
                IsDeliveryDateGuaranteed = order.IsDeliveryDateGuaranteed,
                DateCreated = DateTime.UtcNow
            };

            db.Shipments.Add(shipment);

            // Update order status
            var totalOrdered = order.LineItems?.Sum(li => li.Quantity) ?? 0;
            var totalShipped = (order.Shipments?.SelectMany(s => s.LineItems ?? new List<LineItem>()).Sum(li => li.Quantity) ?? 0)
                             + shipmentLineItems.Sum(li => li.Quantity);

            if (totalShipped >= totalOrdered)
            {
                order.Status = OrderStatus.Shipped;
                order.ShippedDate = DateTime.UtcNow;
            }
            else if (totalShipped > 0)
            {
                order.Status = OrderStatus.PartiallyShipped;
            }

            order.DateUpdated = DateTime.UtcNow;

            await db.SaveChangesAsync();

            return (shipment, (string?)null);
        });
        scope.Complete();

        if (result.Item1 == null)
        {
            return result.Item2 == "Order not found" ? NotFound(result.Item2) : BadRequest(result.Item2);
        }

        return Ok(MapToShipmentDetail(result.Item1));
    }

    /// <summary>
    /// Update shipment tracking information
    /// </summary>
    [HttpPut("shipments/{shipmentId:guid}")]
    [ProducesResponseType<ShipmentDetailDto>(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> UpdateShipment(Guid shipmentId, [FromBody] UpdateShipmentRequestDto request)
    {
        using var scope = _scopeProvider.CreateScope();
        var shipment = await scope.ExecuteWithContextAsync(async db =>
        {
            var s = await db.Shipments.FirstOrDefaultAsync(s => s.Id == shipmentId);
            if (s == null)
            {
                return null;
            }

            if (request.Carrier != null) s.Carrier = request.Carrier;
            if (request.TrackingNumber != null) s.TrackingNumber = request.TrackingNumber;
            if (request.TrackingUrl != null) s.TrackingUrl = request.TrackingUrl;
            if (request.ActualDeliveryDate != null) s.ActualDeliveryDate = request.ActualDeliveryDate;

            await db.SaveChangesAsync();
            return s;
        });
        scope.Complete();

        if (shipment == null)
        {
            return NotFound();
        }

        return Ok(MapToShipmentDetail(shipment));
    }

    /// <summary>
    /// Delete a shipment (releases items back to unfulfilled)
    /// </summary>
    [HttpDelete("shipments/{shipmentId:guid}")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> DeleteShipment(Guid shipmentId)
    {
        using var scope = _scopeProvider.CreateScope();
        var result = await scope.ExecuteWithContextAsync(async db =>
        {
            var shipment = await db.Shipments
                .Include(s => s.Order)
                    .ThenInclude(o => o.Shipments)
                .Include(s => s.Order)
                    .ThenInclude(o => o.LineItems)
                .FirstOrDefaultAsync(s => s.Id == shipmentId);

            if (shipment == null)
            {
                return false;
            }

            var order = shipment.Order;
            db.Shipments.Remove(shipment);

            // Recalculate order status
            var remainingShipments = order.Shipments?.Where(s => s.Id != shipmentId).ToList() ?? new List<Shipment>();
            var totalOrdered = order.LineItems?.Sum(li => li.Quantity) ?? 0;
            var totalShipped = remainingShipments.SelectMany(s => s.LineItems ?? new List<LineItem>()).Sum(li => li.Quantity);

            if (totalShipped >= totalOrdered)
            {
                order.Status = OrderStatus.Shipped;
            }
            else if (totalShipped > 0)
            {
                order.Status = OrderStatus.PartiallyShipped;
            }
            else
            {
                order.Status = OrderStatus.ReadyToFulfill;
                order.ShippedDate = null;
            }

            order.DateUpdated = DateTime.UtcNow;

            await db.SaveChangesAsync();
            return true;
        });
        scope.Complete();

        if (!result)
        {
            return NotFound();
        }

        return NoContent();
    }

    // ============================================
    // Fulfillment Mapping Helpers
    // ============================================

    private static FulfillmentSummaryDto MapToFulfillmentSummary(Invoice invoice, Dictionary<Guid, string> warehouseNames)
    {
        var orders = invoice.Orders?.ToList() ?? new List<Order>();

        return new FulfillmentSummaryDto
        {
            InvoiceId = invoice.Id,
            InvoiceNumber = invoice.InvoiceNumber,
            OverallStatus = GetFulfillmentStatus(orders),
            Orders = orders.Select(o => MapToOrderFulfillment(o, warehouseNames)).ToList()
        };
    }

    private static OrderFulfillmentDto MapToOrderFulfillment(Order order, Dictionary<Guid, string> warehouseNames)
    {
        // Only include product line items for fulfillment (exclude shipping, discounts, etc.)
        var lineItems = order.LineItems?
            .Where(li => li.LineItemType == LineItemType.Product)
            .ToList() ?? new List<LineItem>();
        var shipments = order.Shipments?.ToList() ?? new List<Shipment>();

        // Calculate shipped quantities per line item
        var shippedQuantities = new Dictionary<Guid, int>();
        foreach (var shipment in shipments)
        {
            foreach (var li in shipment.LineItems ?? new List<LineItem>())
            {
                if (!shippedQuantities.ContainsKey(li.Id))
                {
                    shippedQuantities[li.Id] = 0;
                }
                shippedQuantities[li.Id] += li.Quantity;
            }
        }

        return new OrderFulfillmentDto
        {
            OrderId = order.Id,
            WarehouseId = order.WarehouseId,
            WarehouseName = warehouseNames.TryGetValue(order.WarehouseId, out var name) ? name : "Unknown Warehouse",
            Status = order.Status,
            DeliveryMethod = "Standard", // TODO: lookup from ShippingOption
            LineItems = lineItems.Select(li => new FulfillmentLineItemDto
            {
                Id = li.Id,
                Sku = li.Sku,
                Name = li.Name,
                OrderedQuantity = li.Quantity,
                ShippedQuantity = shippedQuantities.TryGetValue(li.Id, out var shipped) ? shipped : 0,
                ImageUrl = null, // TODO: lookup from product
                Amount = li.Amount
            }).ToList(),
            Shipments = shipments.Select(MapToShipmentDetail).ToList()
        };
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
            }).ToList() ?? new List<ShipmentLineItemDto>()
        };
    }
}
