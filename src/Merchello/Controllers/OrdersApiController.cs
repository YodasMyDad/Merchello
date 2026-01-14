using Asp.Versioning;
using Merchello.Core;
using Merchello.Core.Accounting.Dtos;
using Merchello.Core.Accounting.Extensions;
using Merchello.Core.Accounting.Models;
using Merchello.Core.Accounting.Services.Interfaces;
using Merchello.Core.Accounting.Services.Parameters;
using Merchello.Core.Checkout.Dtos;
using Merchello.Core.Locality.Dtos;
using Merchello.Core.Payments.Models;
using Merchello.Core.Payments.Services.Interfaces;
using Merchello.Core.Payments.Services.Parameters;
using Merchello.Core.Reporting.Services.Interfaces;
using Merchello.Core.Shared.Services.Interfaces;
using Merchello.Core.Shared.Models;
using Merchello.Core.Shared.Models.Enums;
using Merchello.Core.Shipping.Dtos;
using Merchello.Core.Shipping.Models;
using Merchello.Core.Shipping.Services.Interfaces;
using Merchello.Core.Shipping.Services.Parameters;
using Merchello.Core.Products.Services.Interfaces;
using Merchello.Core.Locality.Services.Interfaces;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Options;
using Umbraco.Cms.Core.Security;

namespace Merchello.Controllers;

[ApiVersion("1.0")]
[ApiExplorerSettings(GroupName = "Merchello")]
public class OrdersApiController(
    IPaymentService paymentService,
    IInvoiceService invoiceService,
    IShipmentService shipmentService,
    IReportingService reportingService,
    IStatementService statementService,
    IProductService productService,
    ICurrencyService currencyService,
    ILocalityCatalog localityCatalog,
    IOptions<MerchelloSettings> merchelloSettings,
    IBackOfficeSecurityAccessor backOfficeSecurityAccessor) : MerchelloApiControllerBase
{
    private readonly ICurrencyService _currencyService = currencyService;
    private readonly ILocalityCatalog _localityCatalog = localityCatalog;
    private readonly MerchelloSettings _settings = merchelloSettings.Value;
    /// <summary>
    /// Get paginated list of orders/invoices
    /// </summary>
    [HttpGet("orders")]
    [ProducesResponseType<OrderPageDto>(StatusCodes.Status200OK)]
    public async Task<OrderPageDto> GetOrders([FromQuery] OrderQueryDto query)
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
                Constants.QueryFilters.PaymentStatus.Paid => InvoicePaymentStatusFilter.Paid,
                Constants.QueryFilters.PaymentStatus.Unpaid => InvoicePaymentStatusFilter.Unpaid,
                _ => InvoicePaymentStatusFilter.All
            };
        }

        // Map fulfillment status filter
        if (!string.IsNullOrEmpty(query.FulfillmentStatus))
        {
            parameters.FulfillmentStatusFilter = query.FulfillmentStatus.ToLower() switch
            {
                Constants.QueryFilters.FulfillmentStatus.Fulfilled => InvoiceFulfillmentStatusFilter.Fulfilled,
                Constants.QueryFilters.FulfillmentStatus.Unfulfilled => InvoiceFulfillmentStatusFilter.Unfulfilled,
                _ => InvoiceFulfillmentStatusFilter.All
            };
        }

        // Map cancellation status filter
        if (!string.IsNullOrEmpty(query.CancellationStatus))
        {
            parameters.CancellationStatusFilter = query.CancellationStatus.ToLower() switch
            {
                Constants.QueryFilters.CancellationStatus.Cancelled => InvoiceCancellationStatusFilter.Cancelled,
                Constants.QueryFilters.CancellationStatus.Active => InvoiceCancellationStatusFilter.Active,
                _ => InvoiceCancellationStatusFilter.All
            };
        }

        // Execute query using service with real DB paging
        var result = await invoiceService.QueryInvoices(parameters);

        // Lookup shipping option names for delivery method display
        var shippingOptionIds = result.Items
            .SelectMany(i => i.Orders ?? [])
            .Select(o => o.ShippingOptionId)
            .Distinct()
            .ToList();
        var shippingOptionNames = await invoiceService.GetShippingOptionNamesAsync(shippingOptionIds);

        // Map to DTOs
        var items = result.Items.Select(i => MapToListItem(i, shippingOptionNames)).ToList();

        return new OrderPageDto
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
        var isAsc = sortDir?.ToLower() == Constants.QueryFilters.SortDirection.Ascending;
        return sortBy?.ToLower() switch
        {
            Constants.QueryFilters.SortBy.Total => isAsc ? InvoiceOrderBy.TotalAsc : InvoiceOrderBy.TotalDesc,
            Constants.QueryFilters.SortBy.Customer => isAsc ? InvoiceOrderBy.CustomerAsc : InvoiceOrderBy.CustomerDesc,
            Constants.QueryFilters.SortBy.InvoiceNumber => isAsc ? InvoiceOrderBy.InvoiceNumberAsc : InvoiceOrderBy.InvoiceNumberDesc,
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
        return await reportingService.GetOrderStatsAsync();
    }

    /// <summary>
    /// Get dashboard statistics with monthly metrics and percentage changes
    /// </summary>
    [HttpGet("orders/dashboard-stats")]
    [ProducesResponseType<DashboardStatsDto>(StatusCodes.Status200OK)]
    public async Task<DashboardStatsDto> GetDashboardStats()
    {
        return await reportingService.GetDashboardStatsAsync();
    }

    /// <summary>
    /// Export orders within a date range for CSV generation
    /// </summary>
    [HttpPost("orders/export")]
    [ProducesResponseType<List<OrderExportItemDto>>(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> ExportOrders(
        [FromBody] ExportOrderDto request,
        CancellationToken cancellationToken)
    {
        if (request.FromDate > request.ToDate)
        {
            return BadRequest("From date must be before or equal to To date");
        }

        var exportItems = await reportingService.GetOrdersForExportAsync(
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

        // Lookup shipping option names for delivery method display
        var shippingOptionIds = invoice.Orders?.Select(o => o.ShippingOptionId).Distinct().ToList() ?? [];
        var shippingOptionNames = await invoiceService.GetShippingOptionNamesAsync(shippingOptionIds);

        // Lookup product images for line items
        var productIds = invoice.Orders?
            .SelectMany(o => o.LineItems ?? [])
            .Where(li => li.ProductId.HasValue)
            .Select(li => li.ProductId!.Value)
            .Distinct() ?? [];
        var productImages = await productService.GetProductImagesAsync(productIds);

        var detail = await MapToDetailAsync(invoice, shippingOptionNames, productImages);

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
    [ProducesResponseType<DeleteOrdersResultDto>(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> DeleteOrders([FromBody] DeleteOrdersDto request)
    {
        if (request.Ids == null || request.Ids.Count == 0)
        {
            return BadRequest("At least one order ID is required");
        }

        var deletedCount = await invoiceService.SoftDeleteInvoicesAsync(request.Ids);

        return Ok(new DeleteOrdersResultDto
        {
            DeletedCount = deletedCount
        });
    }

    /// <summary>
    /// Cancel an invoice and all its unfulfilled orders
    /// </summary>
    [HttpPost("orders/{invoiceId:guid}/cancel")]
    [ProducesResponseType<CancelInvoiceResultDto>(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> CancelInvoice(Guid invoiceId, [FromBody] CancelInvoiceDto request)
    {
        if (string.IsNullOrWhiteSpace(request.Reason))
        {
            return BadRequest("Cancellation reason is required");
        }

        var currentUser = backOfficeSecurityAccessor.BackOfficeSecurity?.CurrentUser;

        var result = await invoiceService.CancelInvoiceAsync(new CancelInvoiceParameters
        {
            InvoiceId = invoiceId,
            Reason = request.Reason,
            AuthorId = currentUser?.Key,
            AuthorName = currentUser?.Name ?? currentUser?.Username
        });

        if (result.Messages.Any(m => m.ResultMessageType == ResultMessageType.Error))
        {
            var errorMessage = result.Messages.First(m => m.ResultMessageType == ResultMessageType.Error).Message;
            return BadRequest(new CancelInvoiceResultDto
            {
                Success = false,
                ErrorMessage = errorMessage
            });
        }

        return Ok(new CancelInvoiceResultDto
        {
            Success = true,
            CancelledOrderCount = result.ResultObject
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

        var result = await invoiceService.AddNoteAsync(new AddInvoiceNoteParameters
        {
            InvoiceId = invoiceId,
            Text = request.Text,
            VisibleToCustomer = request.IsVisibleToCustomer,
            AuthorId = authorId,
            AuthorName = authorName
        });

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
            IsVisibleToCustomer = result.ResultObject.VisibleToCustomer
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

    /// <summary>
    /// Update purchase order number for an invoice
    /// </summary>
    [HttpPut("orders/{invoiceId:guid}/purchase-order")]
    [ProducesResponseType<UpdatePurchaseOrderResultDto>(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> UpdatePurchaseOrder(Guid invoiceId, [FromBody] UpdatePurchaseOrderDto request)
    {
        var result = await invoiceService.UpdatePurchaseOrderAsync(invoiceId, request.PurchaseOrder);

        if (result.Messages.Any(m => m.ResultMessageType == ResultMessageType.Error))
        {
            return NotFound("Invoice not found");
        }

        return Ok(new UpdatePurchaseOrderResultDto { PurchaseOrder = result.ResultObject });
    }

    // ============================================
    // Invoice Editing Endpoints
    // ============================================

    /// <summary>
    /// Get invoice data prepared for editing
    /// </summary>
    [HttpGet("orders/{invoiceId:guid}/edit")]
    [ProducesResponseType<InvoiceForEditDto>(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> GetInvoiceForEdit(Guid invoiceId)
    {
        var invoiceData = await invoiceService.GetInvoiceForEditAsync(invoiceId);

        if (invoiceData == null)
        {
            return NotFound("Invoice not found");
        }

        return Ok(invoiceData);
    }

    /// <summary>
    /// Preview calculated totals for proposed invoice changes without persisting.
    /// This is the single source of truth for all invoice calculations.
    /// Frontend should call this instead of calculating locally.
    /// </summary>
    [HttpPost("orders/{invoiceId:guid}/preview-edit")]
    [ProducesResponseType<PreviewEditResultDto>(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> PreviewEditInvoice(Guid invoiceId, [FromBody] EditInvoiceDto request)
    {
        var result = await invoiceService.PreviewInvoiceEditAsync(invoiceId, request);

        if (result == null)
        {
            return NotFound("Invoice not found");
        }

        return Ok(result);
    }

    /// <summary>
    /// Preview calculated discount amount for a line item.
    /// This is the single source of truth for discount calculations.
    /// Frontend should call this instead of calculating locally.
    /// </summary>
    [HttpPost("orders/preview-discount")]
    [ProducesResponseType<PreviewDiscountResultDto>(StatusCodes.Status200OK)]
    public PreviewDiscountResultDto PreviewDiscount([FromBody] PreviewDiscountRequestDto request)
    {
        // Use provided currency code or default to store currency
        var currencyCode = !string.IsNullOrEmpty(request.CurrencyCode)
            ? request.CurrencyCode
            : _settings.StoreCurrencyCode;

        var lineTotal = request.LineItemPrice * request.Quantity;
        var discountAmount = request.DiscountType == DiscountValueType.FixedAmount
            ? Math.Min(request.DiscountValue * request.Quantity, lineTotal)
            : lineTotal * (request.DiscountValue / 100m);

        // Round using currency-aware rounding from MerchelloSettings
        var roundedDiscount = _currencyService.Round(discountAmount, currencyCode);

        return new PreviewDiscountResultDto
        {
            LineTotal = _currencyService.Round(lineTotal, currencyCode),
            DiscountAmount = roundedDiscount,
            DiscountedTotal = _currencyService.Round(lineTotal - roundedDiscount, currencyCode)
        };
    }

    /// <summary>
    /// Edit an invoice (update quantities, apply discounts, add custom items, etc.)
    /// </summary>
    [HttpPut("orders/{invoiceId:guid}/edit")]
    [ProducesResponseType<EditInvoiceResultDto>(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> EditInvoice(Guid invoiceId, [FromBody] EditInvoiceDto request)
    {
        // Get current backoffice user
        var currentUser = backOfficeSecurityAccessor.BackOfficeSecurity?.CurrentUser;
        var authorId = currentUser?.Key;
        var authorName = currentUser?.Name;

        var result = await invoiceService.EditInvoiceAsync(new EditInvoiceParameters
        {
            InvoiceId = invoiceId,
            Request = request,
            AuthorId = authorId,
            AuthorName = authorName
        });

        if (!result.IsSuccess)
        {
            var errorMessage = result.ErrorMessage ?? "Failed to edit invoice";
            return errorMessage.Contains("not found", StringComparison.OrdinalIgnoreCase)
                ? NotFound(errorMessage)
                : BadRequest(errorMessage);
        }

        return Ok(result.Data);
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

    private OrderListItemDto MapToListItem(Invoice invoice, Dictionary<Guid, string> shippingOptionNames)
    {
        var orders = invoice.Orders?.ToList() ?? [];
        var payments = invoice.Payments?.ToList() ?? [];

        // Use centralized payment status calculation from PaymentService
        var paymentDetails = paymentService.CalculatePaymentStatus(new CalculatePaymentStatusParameters
        {
            Payments = payments,
            InvoiceTotal = invoice.Total,
            CurrencyCode = invoice.CurrencyCode
        });

        var itemCount = orders
            .SelectMany(o => o.LineItems ?? [])
            .Where(li => li.LineItemType != LineItemType.Discount)
            .Sum(li => li.Quantity);

        var fulfillmentStatus = GetFulfillmentStatus(orders);
        var deliveryStatus = GetDeliveryStatus(orders);

        // Get delivery method from first order's shipping option (fallback to "Unknown")
        var firstOrderShippingOptionId = orders.FirstOrDefault()?.ShippingOptionId;
        var deliveryMethod = firstOrderShippingOptionId.HasValue
            && shippingOptionNames.TryGetValue(firstOrderShippingOptionId.Value, out var name)
            ? name
            : "Unknown";

        return new OrderListItemDto
        {
            Id = invoice.Id,
            InvoiceNumber = invoice.InvoiceNumber,
            DateCreated = invoice.DateCreated,
            CustomerName = invoice.BillingAddress?.Name ?? "Unknown",
            Channel = invoice.Channel,
            CurrencyCode = invoice.CurrencyCode,
            CurrencySymbol = invoice.CurrencySymbol,
            StoreCurrencyCode = invoice.StoreCurrencyCode,
            StoreCurrencySymbol = _currencyService.GetCurrency(invoice.StoreCurrencyCode).Symbol,
            Total = invoice.Total,
            TotalInStoreCurrency = invoice.TotalInStoreCurrency,
            IsMultiCurrency = !string.Equals(invoice.CurrencyCode, invoice.StoreCurrencyCode, StringComparison.OrdinalIgnoreCase),
            PaymentStatus = paymentDetails.Status,
            PaymentStatusDisplay = paymentDetails.StatusDisplay,
            FulfillmentStatus = fulfillmentStatus,
            IsCancelled = invoice.IsCancelled,
            ItemCount = itemCount,
            DeliveryStatus = deliveryStatus,
            DeliveryMethod = deliveryMethod,
            DueDate = invoice.DueDate,
            IsOverdue = invoice.DueDate.HasValue && invoice.DueDate.Value < DateTime.UtcNow && paymentDetails.BalanceDue > 0,
            DaysUntilDue = invoice.DueDate.HasValue ? (int)(invoice.DueDate.Value.Date - DateTime.UtcNow.Date).TotalDays : null
        };
    }

    private async Task<OrderDetailDto> MapToDetailAsync(Invoice invoice, Dictionary<Guid, string> shippingOptionNames, Dictionary<Guid, string?> productImages)
    {
        var orders = invoice.Orders?.ToList() ?? [];
        var payments = invoice.Payments?.ToList() ?? [];

        // Use centralized payment status calculation from PaymentService (includes store currency)
        var paymentDetails = paymentService.CalculatePaymentStatus(new CalculatePaymentStatusParameters
        {
            Payments = payments,
            InvoiceTotal = invoice.Total,
            CurrencyCode = invoice.CurrencyCode,
            InvoiceTotalInStoreCurrency = invoice.TotalInStoreCurrency,
            StoreCurrencyCode = invoice.StoreCurrencyCode
        });

        var shippingCost = orders.Sum(o => o.ShippingCost);
        var shippingCostInStoreCurrency = orders.Sum(o => o.ShippingCostInStoreCurrency ?? o.ShippingCost);

        // Get discount line items
        var discountLineItems = orders
            .SelectMany(o => o.LineItems ?? [])
            .Where(li => li.LineItemType == LineItemType.Discount)
            .ToList();

        var discountTotal = discountLineItems.Sum(li => Math.Abs(li.Amount));

        // Map discount line items to DTOs for display
        var discounts = discountLineItems.Select(d => new DiscountLineItemDto
        {
            Id = d.Id,
            Name = d.Name,
            Amount = Math.Abs(d.Amount)
        }).ToList();

        // Map addresses with country name lookup
        var billingAddress = await MapAddressAsync(invoice.BillingAddress);
        var shippingAddress = await MapAddressAsync(invoice.ShippingAddress);

        return new OrderDetailDto
        {
            Id = invoice.Id,
            CustomerId = invoice.CustomerId,
            InvoiceNumber = invoice.InvoiceNumber,
            DateCreated = invoice.DateCreated,
            Channel = invoice.Channel,
            PurchaseOrder = invoice.PurchaseOrder,
            CurrencyCode = invoice.CurrencyCode,
            CurrencySymbol = invoice.CurrencySymbol,
            StoreCurrencyCode = invoice.StoreCurrencyCode,
            StoreCurrencySymbol = _currencyService.GetCurrency(invoice.StoreCurrencyCode).Symbol,
            PricingExchangeRate = invoice.PricingExchangeRate,
            PricingExchangeRateSource = invoice.PricingExchangeRateSource,
            PricingExchangeRateTimestampUtc = invoice.PricingExchangeRateTimestampUtc,
            SubTotal = invoice.SubTotal,
            DiscountTotal = discountTotal,
            Discounts = discounts,
            ShippingCost = shippingCost,
            Tax = invoice.Tax,
            Total = invoice.Total,
            SubTotalInStoreCurrency = invoice.SubTotalInStoreCurrency,
            DiscountTotalInStoreCurrency = invoice.DiscountInStoreCurrency,
            ShippingCostInStoreCurrency = shippingCostInStoreCurrency,
            TaxInStoreCurrency = invoice.TaxInStoreCurrency,
            TotalInStoreCurrency = invoice.TotalInStoreCurrency,
            AmountPaid = paymentDetails.NetPayment,
            BalanceDue = paymentDetails.BalanceDue,
            AmountPaidInStoreCurrency = paymentDetails.NetPaymentInStoreCurrency,
            BalanceDueInStoreCurrency = paymentDetails.BalanceDueInStoreCurrency,
            BalanceStatus = paymentDetails.BalanceDue switch
            {
                > 0 => "Underpaid",
                < 0 => "Overpaid",
                _ => "Balanced"
            },
            BalanceStatusCssClass = paymentDetails.BalanceDue switch
            {
                > 0 => "underpaid",
                < 0 => "overpaid",
                _ => "balanced"
            },
            BalanceStatusLabel = paymentDetails.BalanceDue switch
            {
                > 0 => "Balance Due",
                < 0 => "Credit Due",
                _ => ""
            },
            PaymentStatus = paymentDetails.Status,
            PaymentStatusDisplay = paymentDetails.StatusDisplay,
            MaxRiskScore = paymentDetails.MaxRiskScore,
            MaxRiskScoreSource = paymentDetails.MaxRiskScoreSource,
            FulfillmentStatus = GetFulfillmentStatus(orders),
            FulfillmentStatusCssClass = GetFulfillmentStatusCssClass(orders),
            IsCancelled = invoice.IsCancelled,
            BillingAddress = billingAddress,
            ShippingAddress = shippingAddress,
            Orders = orders.Select(o => MapFulfillmentOrder(o, shippingOptionNames, productImages)).ToList(),
            Notes = invoice.Notes?.Select(n => new InvoiceNoteDto
            {
                Date = n.DateCreated,
                Text = n.Description ?? string.Empty,
                AuthorId = n.AuthorId,
                Author = n.Author,
                IsVisibleToCustomer = n.VisibleToCustomer
            }).ToList() ?? [],
            ItemCount = orders
                .SelectMany(o => o.LineItems ?? [])
                .Where(li => li.LineItemType == LineItemType.Product
                          || li.LineItemType == LineItemType.Custom
                          || li.LineItemType == LineItemType.Addon)
                .Sum(li => li.Quantity),
            CanFulfill = !invoice.IsCancelled && GetFulfillmentStatus(orders) != "Fulfilled",
            DueDate = invoice.DueDate,
            IsOverdue = invoice.DueDate.HasValue && invoice.DueDate.Value < DateTime.UtcNow && paymentDetails.BalanceDue > 0,
            DaysUntilDue = invoice.DueDate.HasValue ? (int)(invoice.DueDate.Value.Date - DateTime.UtcNow.Date).TotalDays : null
        };
    }

    private async Task<AddressDto?> MapAddressAsync(Core.Locality.Models.Address? address)
    {
        if (address == null) return null;

        // Look up country name from code if not set
        var countryName = address.Country;
        if (string.IsNullOrEmpty(countryName) && !string.IsNullOrEmpty(address.CountryCode))
        {
            countryName = await _localityCatalog.TryGetCountryNameAsync(address.CountryCode);
        }

        return new AddressDto
        {
            Name = address.Name,
            Company = address.Company,
            AddressOne = address.AddressOne,
            AddressTwo = address.AddressTwo,
            TownCity = address.TownCity,
            CountyState = address.CountyState?.Name,
            PostalCode = address.PostalCode,
            Country = countryName,
            CountryCode = address.CountryCode,
            Email = address.Email,
            Phone = address.Phone
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

    private static FulfillmentOrderDto MapFulfillmentOrder(Order order, Dictionary<Guid, string> shippingOptionNames, Dictionary<Guid, string?> productImages)
    {
        var deliveryMethod = shippingOptionNames.TryGetValue(order.ShippingOptionId, out var name)
            ? name
            : "Unknown";

        return new FulfillmentOrderDto
        {
            Id = order.Id,
            Status = order.Status,
            StatusLabel = order.Status.ToLabel(),
            StatusCssClass = order.Status.ToCssClass(),
            DeliveryMethod = deliveryMethod,
            ShippingCost = order.ShippingCost,
            LineItems = order.LineItems?
                .Where(li => li.LineItemType == LineItemType.Product
                          || li.LineItemType == LineItemType.Custom
                          || li.LineItemType == LineItemType.Addon)
                .Select(li => new LineItemDto
            {
                Id = li.Id,
                Sku = li.Sku,
                Name = li.Name,
                ProductRootName = li.GetProductRootName(),
                SelectedOptions = li.GetSelectedOptions()
                    .Select(o => new SelectedOptionDto
                    {
                        OptionName = o.OptionName,
                        ValueName = o.ValueName
                    }).ToList(),
                Quantity = li.Quantity,
                Amount = li.Amount,
                OriginalAmount = li.OriginalAmount,
                ImageUrl = li.ProductId.HasValue && productImages.TryGetValue(li.ProductId.Value, out var img) ? img : null,
                // Backend is single source of truth for calculated total
                CalculatedTotal = li.Amount * li.Quantity
            }).ToList() ?? [],
            Shipments = order.Shipments?.Select(s => new ShipmentDto
            {
                Id = s.Id,
                Status = s.Status,
                StatusLabel = s.Status.ToLabel(),
                StatusCssClass = s.Status.ToCssClass(),
                TrackingNumber = s.TrackingNumber,
                TrackingUrl = s.TrackingUrl,
                Carrier = s.Carrier,
                ShippedDate = s.ShippedDate,
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

    private static string GetFulfillmentStatusCssClass(List<Order> orders)
    {
        var status = GetFulfillmentStatus(orders);
        return status.ToLowerInvariant();
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
        var summary = await shipmentService.GetFulfillmentSummaryAsync(invoiceId);

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
    public async Task<IActionResult> CreateShipment(Guid orderId, [FromBody] CreateShipmentDto request)
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

        var result = await shipmentService.CreateShipmentAsync(parameters);

        if (result.ResultObject == null)
        {
            var error = result.Messages.FirstOrDefault()?.Message ?? "Failed to create shipment";
            return error.Contains("not found") ? NotFound(error) : BadRequest(error);
        }

        var productImages = await GetProductImagesForShipment(result.ResultObject);
        return Ok(MapToShipmentDetail(result.ResultObject, productImages));
    }

    /// <summary>
    /// Update shipment tracking information
    /// </summary>
    [HttpPut("shipments/{shipmentId:guid}")]
    [ProducesResponseType<ShipmentDetailDto>(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> UpdateShipment(Guid shipmentId, [FromBody] UpdateShipmentDto request)
    {
        var parameters = new UpdateShipmentParameters
        {
            ShipmentId = shipmentId,
            Carrier = request.Carrier,
            TrackingNumber = request.TrackingNumber,
            TrackingUrl = request.TrackingUrl,
            ActualDeliveryDate = request.ActualDeliveryDate
        };

        var result = await shipmentService.UpdateShipmentAsync(parameters);

        if (result.ResultObject == null)
        {
            return NotFound();
        }

        var productImages = await GetProductImagesForShipment(result.ResultObject);
        return Ok(MapToShipmentDetail(result.ResultObject, productImages));
    }

    /// <summary>
    /// Update shipment status (e.g., Preparing -> Shipped -> Delivered)
    /// </summary>
    [HttpPut("shipments/{shipmentId:guid}/status")]
    [ProducesResponseType<ShipmentDetailDto>(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> UpdateShipmentStatus(Guid shipmentId, [FromBody] UpdateShipmentStatusDto request)
    {
        var parameters = new UpdateShipmentStatusParameters
        {
            ShipmentId = shipmentId,
            NewStatus = request.NewStatus,
            Carrier = request.Carrier,
            TrackingNumber = request.TrackingNumber,
            TrackingUrl = request.TrackingUrl
        };

        var result = await shipmentService.UpdateShipmentStatusAsync(parameters);

        if (!result.Successful)
        {
            if (result.ResultObject == null)
            {
                return NotFound();
            }
            var errorMessage = result.Messages.FirstOrDefault(m => m.ResultMessageType == ResultMessageType.Error)?.Message;
            return BadRequest(new { error = errorMessage ?? "Failed to update shipment status" });
        }

        var productImages = await GetProductImagesForShipment(result.ResultObject!);
        return Ok(MapToShipmentDetail(result.ResultObject!, productImages));
    }

    /// <summary>
    /// Delete a shipment (releases items back to unfulfilled)
    /// </summary>
    [HttpDelete("shipments/{shipmentId:guid}")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> DeleteShipment(Guid shipmentId)
    {
        var success = await shipmentService.DeleteShipmentAsync(shipmentId);

        if (!success)
        {
            return NotFound();
        }

        return NoContent();
    }

    // ============================================
    // Draft Order Creation Endpoints
    // ============================================

    /// <summary>
    /// Create a new draft order from the admin backoffice
    /// </summary>
    [HttpPost("orders/draft")]
    [ProducesResponseType<CreateDraftOrderResultDto>(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> CreateDraftOrder([FromBody] CreateDraftOrderDto request)
    {
        // Validate billing address required fields
        if (string.IsNullOrWhiteSpace(request.BillingAddress.Name))
        {
            return BadRequest("Billing address name is required");
        }

        if (string.IsNullOrWhiteSpace(request.BillingAddress.Email))
        {
            return BadRequest("Billing address email is required");
        }

        if (string.IsNullOrWhiteSpace(request.BillingAddress.AddressOne))
        {
            return BadRequest("Billing address line 1 is required");
        }

        if (string.IsNullOrWhiteSpace(request.BillingAddress.TownCity))
        {
            return BadRequest("Billing address town/city is required");
        }

        if (string.IsNullOrWhiteSpace(request.BillingAddress.PostalCode))
        {
            return BadRequest("Billing address postal code is required");
        }

        if (string.IsNullOrWhiteSpace(request.BillingAddress.CountryCode))
        {
            return BadRequest("Billing address country is required");
        }

        // Get current backoffice user
        var currentUser = backOfficeSecurityAccessor.BackOfficeSecurity?.CurrentUser;
        var authorId = currentUser?.Key;
        var authorName = currentUser?.Name;

        var result = await invoiceService.CreateDraftOrderAsync(
            request,
            authorId,
            authorName);

        if (!result.IsSuccess)
        {
            return BadRequest(result.ErrorMessage ?? "Failed to create draft order");
        }

        return Ok(result.Data);
    }

    /// <summary>
    /// Search for customers by email or name for order creation
    /// </summary>
    [HttpGet("orders/customer-lookup")]
    [ProducesResponseType<List<CustomerLookupResultDto>>(StatusCodes.Status200OK)]
    public async Task<IActionResult> SearchCustomers(
        [FromQuery] string? email,
        [FromQuery] string? name)
    {
        var results = await invoiceService.SearchCustomersAsync(email, name);
        return Ok(results);
    }

    /// <summary>
    /// Get all orders for a customer by their billing email address
    /// </summary>
    [HttpGet("orders/customer/{email}")]
    [ProducesResponseType<List<OrderListItemDto>>(StatusCodes.Status200OK)]
    public async Task<IActionResult> GetCustomerOrders(string email)
    {
        if (string.IsNullOrWhiteSpace(email))
        {
            return Ok(Array.Empty<OrderListItemDto>());
        }

        // URL decode the email in case it contains special characters
        var decodedEmail = Uri.UnescapeDataString(email);

        var invoices = await invoiceService.GetInvoicesByBillingEmailAsync(decodedEmail);

        // Lookup shipping option names for delivery method display
        var shippingOptionIds = invoices
            .SelectMany(i => i.Orders ?? [])
            .Select(o => o.ShippingOptionId)
            .Distinct()
            .ToList();
        var shippingOptionNames = await invoiceService.GetShippingOptionNamesAsync(shippingOptionIds);

        // Map to DTOs
        var items = invoices.Select(i => MapToListItem(i, shippingOptionNames)).ToList();

        return Ok(items);
    }

    // ============================================
    // Discount Endpoints
    // ============================================

    /// <summary>
    /// Apply a promotional discount to an existing invoice
    /// </summary>
    [HttpPost("orders/{invoiceId:guid}/apply-discount")]
    [ProducesResponseType<ApplyDiscountResultDto>(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> ApplyDiscount(Guid invoiceId, [FromBody] ApplyDiscountDto request)
    {
        if (request.DiscountId == Guid.Empty)
        {
            return BadRequest("Discount ID is required");
        }

        var currentUser = backOfficeSecurityAccessor.BackOfficeSecurity?.CurrentUser;

        var result = await invoiceService.ApplyPromotionalDiscountAsync(new ApplyPromotionalDiscountParameters
        {
            InvoiceId = invoiceId,
            DiscountId = request.DiscountId,
            AuthorId = currentUser?.Key,
            AuthorName = currentUser?.Name ?? currentUser?.Username
        });

        if (result.Messages.Any(m => m.ResultMessageType == ResultMessageType.Error))
        {
            var errorMessage = result.Messages.First(m => m.ResultMessageType == ResultMessageType.Error).Message ?? "An error occurred";
            return errorMessage.Contains("not found", StringComparison.OrdinalIgnoreCase)
                ? NotFound(new ApplyDiscountResultDto { Success = false, ErrorMessage = errorMessage })
                : BadRequest(new ApplyDiscountResultDto { Success = false, ErrorMessage = errorMessage });
        }

        return Ok(new ApplyDiscountResultDto
        {
            Success = true,
            NewTotal = result.ResultObject?.Total
        });
    }

    private async Task<Dictionary<Guid, string?>> GetProductImagesForShipment(Shipment shipment)
    {
        var productIds = shipment.LineItems
            .Where(li => li.ProductId.HasValue)
            .Select(li => li.ProductId!.Value)
            .Distinct()
            .ToList();

        if (productIds.Count == 0)
        {
            return [];
        }

        return await productService.GetProductImagesAsync(productIds);
    }

    private static ShipmentDetailDto MapToShipmentDetail(Shipment shipment, Dictionary<Guid, string?> productImages)
    {
        return new ShipmentDetailDto
        {
            Id = shipment.Id,
            OrderId = shipment.OrderId,
            Status = shipment.Status,
            StatusLabel = shipment.Status.ToLabel(),
            StatusCssClass = shipment.Status.ToCssClass(),
            Carrier = shipment.Carrier,
            TrackingNumber = shipment.TrackingNumber,
            TrackingUrl = shipment.TrackingUrl,
            DateCreated = shipment.DateCreated,
            ShippedDate = shipment.ShippedDate,
            ActualDeliveryDate = shipment.ActualDeliveryDate,
            CanMarkAsShipped = shipment.Status == ShipmentStatus.Preparing,
            CanMarkAsDelivered = shipment.Status == ShipmentStatus.Shipped,
            CanCancel = shipment.Status != ShipmentStatus.Delivered && shipment.Status != ShipmentStatus.Cancelled,
            LineItems = shipment.LineItems?.Select(li => new ShipmentLineItemDto
            {
                Id = Guid.NewGuid(), // Generate new ID for the shipment line item reference
                LineItemId = li.Id,
                Sku = li.Sku,
                Name = li.Name,
                ProductRootName = li.GetProductRootName(),
                SelectedOptions = li.GetSelectedOptions()
                    .Select(o => new SelectedOptionDto
                    {
                        OptionName = o.OptionName,
                        ValueName = o.ValueName
                    }).ToList(),
                Quantity = li.Quantity,
                ImageUrl = li.ProductId.HasValue && productImages.TryGetValue(li.ProductId.Value, out var imageUrl) ? imageUrl : null
            }).ToList() ?? []
        };
    }

    /// <summary>
    /// Get paginated list of outstanding (unpaid) invoices across all account customers
    /// </summary>
    [HttpGet("orders/outstanding")]
    [ProducesResponseType<OutstandingOrdersPageDto>(StatusCodes.Status200OK)]
    public async Task<OutstandingOrdersPageDto> GetOutstandingOrders(
        [FromQuery] Guid? customerId = null,
        [FromQuery] bool accountCustomersOnly = true,
        [FromQuery] bool? overdueOnly = null,
        [FromQuery] int? dueWithinDays = null,
        [FromQuery] string? search = null,
        [FromQuery] string sortBy = "dueDate",
        [FromQuery] string sortDirection = "asc",
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 50,
        CancellationToken ct = default)
    {
        var parameters = new OutstandingInvoicesQueryParameters
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

        var result = await statementService.GetOutstandingInvoicesPagedAsync(parameters, ct);

        return new OutstandingOrdersPageDto
        {
            Items = result.Items.ToList(),
            Page = result.PageIndex,
            PageSize = pageSize,
            TotalItems = result.TotalItems,
            TotalPages = result.TotalPages
        };
    }

    /// <summary>
    /// Mark multiple invoices as paid (batch operation for offline payments)
    /// </summary>
    [HttpPost("orders/batch-mark-paid")]
    [ProducesResponseType<BatchMarkAsPaidResultDto>(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> BatchMarkAsPaid([FromBody] BatchMarkAsPaidDto dto, CancellationToken ct)
    {
        if (dto.InvoiceIds == null || dto.InvoiceIds.Count == 0)
        {
            return BadRequest("No invoice IDs provided.");
        }

        if (string.IsNullOrWhiteSpace(dto.PaymentMethod))
        {
            return BadRequest("Payment method is required.");
        }

        var parameters = new BatchMarkAsPaidParameters
        {
            InvoiceIds = dto.InvoiceIds,
            PaymentMethod = dto.PaymentMethod,
            Reference = dto.Reference,
            DateReceived = dto.DateReceived
        };

        var result = await paymentService.BatchMarkAsPaidAsync(parameters, ct);

        var response = new BatchMarkAsPaidResultDto
        {
            SuccessCount = result.ResultObject?.Count ?? 0,
            Messages = result.Messages.Select(m => m.Message ?? "").ToList(),
            PaymentIds = result.ResultObject?.Select(p => p.Id).ToList() ?? []
        };

        if (!result.Successful)
        {
            return BadRequest(response);
        }

        return Ok(response);
    }
}

/// <summary>
/// DTO for outstanding orders page response
/// </summary>
public record OutstandingOrdersPageDto
{
    public List<OrderListItemDto> Items { get; init; } = [];
    public int Page { get; init; }
    public int PageSize { get; init; }
    public int TotalItems { get; init; }
    public int TotalPages { get; init; }
}

/// <summary>
/// DTO for batch mark as paid request
/// </summary>
public record BatchMarkAsPaidDto
{
    public List<Guid> InvoiceIds { get; init; } = [];
    public string PaymentMethod { get; init; } = string.Empty;
    public string? Reference { get; init; }
    public DateTime? DateReceived { get; init; }
}

/// <summary>
/// DTO for batch mark as paid response
/// </summary>
public record BatchMarkAsPaidResultDto
{
    public int SuccessCount { get; init; }
    public List<string> Messages { get; init; } = [];
    public List<Guid> PaymentIds { get; init; } = [];
}
