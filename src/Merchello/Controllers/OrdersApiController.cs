using Asp.Versioning;
using FluentValidation;
using Merchello.Core;
using Merchello.Core.Accounting.Dtos;
using Merchello.Core.Accounting.Extensions;
using Merchello.Core.Accounting.Models;
using Merchello.Core.Accounting.Services.Interfaces;
using Merchello.Core.Accounting.Services.Parameters;
using Merchello.Core.Accounting.Validators;
using Merchello.Core.Customers.Dtos;
using Merchello.Core.Customers.Services.Interfaces;
using Merchello.Core.Checkout.Dtos;
using Merchello.Core.Locality.Dtos;
using Merchello.Core.Payments.Models;
using Merchello.Core.Payments.Services.Interfaces;
using Merchello.Core.Payments.Services.Parameters;
using Merchello.Core.Reporting.Services.Interfaces;
using Merchello.Core.Shared.Models;
using Merchello.Core.Shared.Models.Enums;
using Merchello.Core.Shipping.Dtos;
using Merchello.Core.Shipping.Extensions;
using Merchello.Core.Shipping.Models;
using Merchello.Core.Shipping.Services.Interfaces;
using Merchello.Core.Shipping.Services.Parameters;
using Merchello.Core.Products.Services.Interfaces;
using Merchello.Core.Products.Services.Parameters;
using Merchello.Core.Products.Models;
using Merchello.Core.Locality.Services.Interfaces;
using Merchello.Core.AddressLookup.Dtos;
using Merchello.Core.AddressLookup.Services.Interfaces;
using Merchello.Core.AddressLookup.Services.Parameters;
using Merchello.Services;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Umbraco.Cms.Core.Security;

namespace Merchello.Controllers;

[ApiVersion("1.0")]
[ApiExplorerSettings(GroupName = "Merchello")]
public class OrdersApiController(
    IPaymentService paymentService,
    IInvoiceService invoiceService,
    IInvoiceEditService invoiceEditService,
    ICustomerService customerService,
    IShipmentService shipmentService,
    IReportingService reportingService,
    IStatementService statementService,
    IProductService productService,
    IAddressLookupService addressLookupService,
    IOrdersDtoMapper ordersDtoMapper,
    IOrdersRequestMapper ordersRequestMapper,
    IBackOfficeSecurityAccessor backOfficeSecurityAccessor) : MerchelloApiControllerBase
{
    /// <summary>
    /// Get paginated list of orders/invoices
    /// </summary>
    [HttpGet("orders")]
    [ProducesResponseType<OrderPageDto>(StatusCodes.Status200OK)]
    public async Task<OrderPageDto> GetOrders([FromQuery] OrderQueryDto query, CancellationToken ct)
    {
        var parameters = ordersRequestMapper.MapInvoiceQuery(query);

        // Execute query using service with real DB paging
        var result = await invoiceService.QueryInvoices(parameters, ct);

        // Map to DTOs
        var items = result.Items.Select(ordersDtoMapper.MapToListItem).ToList();

        return new OrderPageDto
        {
            Items = items,
            Page = result.PageIndex,
            PageSize = query.PageSize,
            TotalItems = result.TotalItems,
            TotalPages = result.TotalPages
        };
    }

    /// <summary>
    /// Get order statistics for today
    /// </summary>
    [HttpGet("orders/stats")]
    [ProducesResponseType<OrderStatsDto>(StatusCodes.Status200OK)]
    public async Task<OrderStatsDto> GetOrderStats(CancellationToken ct)
    {
        return await reportingService.GetOrderStatsAsync(ct);
    }

    /// <summary>
    /// Get dashboard statistics with monthly metrics and percentage changes
    /// </summary>
    [HttpGet("orders/dashboard-stats")]
    [ProducesResponseType<DashboardStatsDto>(StatusCodes.Status200OK)]
    public async Task<DashboardStatsDto> GetDashboardStats(CancellationToken ct)
    {
        return await reportingService.GetDashboardStatsAsync(ct);
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
    public async Task<IActionResult> GetOrder(Guid id, CancellationToken ct)
    {
        var invoice = await invoiceService.GetInvoiceAsync(id, ct);

        if (invoice == null)
        {
            return NotFound();
        }

        // Lookup shipping option names for delivery method display
        var shippingOptionIds = invoice.Orders?.Select(o => o.ShippingOptionId).Distinct().ToList() ?? [];
        var shippingOptionNames = await invoiceService.GetShippingOptionNamesAsync(shippingOptionIds, ct);

        // Lookup product images for line items
        var productIds = invoice.Orders?
            .SelectMany(o => o.LineItems ?? [])
            .Where(li => li.ProductId.HasValue)
            .Select(li => li.ProductId!.Value)
            .Distinct() ?? [];
        var productImages = await productService.GetProductImagesAsync(productIds, ct);

        var detail = await ordersDtoMapper.MapToDetailAsync(invoice, shippingOptionNames, productImages, ct);

        // Get customer order count by billing email
        var billingEmail = invoice.BillingAddress?.Email;
        if (!string.IsNullOrWhiteSpace(billingEmail))
        {
            detail.CustomerOrderCount = await invoiceService.GetInvoiceCountByBillingEmailAsync(billingEmail, ct);
        }

        return Ok(detail);
    }

    /// <summary>
    /// Soft-delete multiple orders/invoices
    /// </summary>
    [HttpPost("orders/delete")]
    [ProducesResponseType<DeleteOrdersResultDto>(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> DeleteOrders([FromBody] DeleteOrdersDto request, CancellationToken ct)
    {
        if (request.Ids == null || request.Ids.Count == 0)
        {
            return BadRequest("At least one order ID is required");
        }

        var deletedCount = await invoiceService.SoftDeleteInvoicesAsync(request.Ids, ct);

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
    public async Task<IActionResult> CancelInvoice(Guid invoiceId, [FromBody] CancelInvoiceDto request, CancellationToken ct)
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
        }, ct);

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
    public async Task<IActionResult> AddNote(Guid invoiceId, [FromBody] AddInvoiceNoteDto request, CancellationToken ct)
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
        }, ct);

        if (CrudError(result) is { } error) return error;

        var note = result.ResultObject!;
        return Ok(new InvoiceNoteDto
        {
            Date = note.DateCreated,
            Text = note.Description ?? string.Empty,
            AuthorId = note.AuthorId,
            Author = note.Author,
            IsVisibleToCustomer = note.VisibleToCustomer
        });
    }

    /// <summary>
    /// Update billing address for an invoice
    /// </summary>
    [HttpPut("orders/{invoiceId:guid}/billing-address")]
    [ProducesResponseType<AddressDto>(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> UpdateBillingAddress(Guid invoiceId, [FromBody] AddressDto request, CancellationToken ct)
    {
        var address = ordersDtoMapper.MapDtoToAddress(request);
        var result = await invoiceService.UpdateBillingAddressAsync(invoiceId, address, ct);

        if (result.ResultObject == null)
        {
            return NotFound("Invoice not found");
        }

        return Ok(ordersDtoMapper.MapAddress(result.ResultObject));
    }

    /// <summary>
    /// Update shipping address for an invoice
    /// </summary>
    [HttpPut("orders/{invoiceId:guid}/shipping-address")]
    [ProducesResponseType<AddressDto>(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> UpdateShippingAddress(Guid invoiceId, [FromBody] AddressDto request, CancellationToken ct)
    {
        var address = ordersDtoMapper.MapDtoToAddress(request);
        var result = await invoiceService.UpdateShippingAddressAsync(invoiceId, address, ct);

        if (result.ResultObject == null)
        {
            return NotFound("Invoice not found");
        }

        return Ok(ordersDtoMapper.MapAddress(result.ResultObject));
    }

    /// <summary>
    /// Update purchase order number for an invoice
    /// </summary>
    [HttpPut("orders/{invoiceId:guid}/purchase-order")]
    [ProducesResponseType<UpdatePurchaseOrderResultDto>(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> UpdatePurchaseOrder(Guid invoiceId, [FromBody] UpdatePurchaseOrderDto request, CancellationToken ct)
    {
        var result = await invoiceService.UpdatePurchaseOrderAsync(invoiceId, request.PurchaseOrder, ct);

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
    public async Task<IActionResult> GetInvoiceForEdit(Guid invoiceId, CancellationToken ct)
    {
        var invoiceData = await invoiceEditService.GetInvoiceForEditAsync(invoiceId, ct);

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
    public async Task<IActionResult> PreviewEditInvoice(Guid invoiceId, [FromBody] EditInvoiceDto request, CancellationToken ct)
    {
        var result = await invoiceEditService.PreviewInvoiceEditAsync(invoiceId, request, ct);

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
    public async Task<PreviewDiscountResultDto> PreviewDiscount([FromBody] PreviewDiscountRequestDto request, CancellationToken ct)
    {
        return await invoiceEditService.PreviewDiscountAsync(request, ct);
    }

    /// <summary>
    /// Edit an invoice (update quantities, apply discounts, add custom items, etc.)
    /// </summary>
    [HttpPut("orders/{invoiceId:guid}/edit")]
    [ProducesResponseType<EditInvoiceResultDto>(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> EditInvoice(Guid invoiceId, [FromBody] EditInvoiceDto request, CancellationToken ct)
    {
        // Get current backoffice user
        var currentUser = backOfficeSecurityAccessor.BackOfficeSecurity?.CurrentUser;
        var authorId = currentUser?.Key;
        var authorName = currentUser?.Name;

        var result = await invoiceEditService.EditInvoiceAsync(new EditInvoiceParameters
        {
            InvoiceId = invoiceId,
            Request = request,
            AuthorId = authorId,
            AuthorName = authorName
        }, ct);

        if (!result.Success)
        {
            var errorMessage = result.ErrorMessage ?? "Failed to edit invoice";
            return errorMessage.Contains("not found", StringComparison.OrdinalIgnoreCase)
                ? NotFound(errorMessage)
                : BadRequest(errorMessage);
        }

        return Ok(result.Data);
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
    public async Task<IActionResult> GetFulfillmentSummary(Guid invoiceId, CancellationToken ct)
    {
        var summary = await shipmentService.GetFulfillmentSummaryAsync(invoiceId, ct);

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
    public async Task<IActionResult> CreateShipment(Guid orderId, [FromBody] CreateShipmentDto request, CancellationToken ct)
    {
        if (request.LineItems == null || request.LineItems.Count == 0)
        {
            return BadRequest("At least one line item is required");
        }

        var parameters = ordersRequestMapper.MapCreateShipmentParameters(orderId, request);

        var result = await shipmentService.CreateShipmentAsync(parameters, ct);

        if (CrudError(result) is { } error) return error;

        var shipment = result.ResultObject!;
        var productImages = await GetProductImagesForShipment(shipment, ct);
        return Ok(ordersDtoMapper.MapToShipmentDetail(shipment, productImages));
    }

    /// <summary>
    /// Update shipment tracking information
    /// </summary>
    [HttpPut("shipments/{shipmentId:guid}")]
    [ProducesResponseType<ShipmentDetailDto>(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> UpdateShipment(Guid shipmentId, [FromBody] UpdateShipmentDto request, CancellationToken ct)
    {
        var parameters = ordersRequestMapper.MapUpdateShipmentParameters(shipmentId, request);

        var result = await shipmentService.UpdateShipmentAsync(parameters, ct);

        if (result.ResultObject == null)
        {
            return NotFound();
        }

        var productImages = await GetProductImagesForShipment(result.ResultObject, ct);
        return Ok(ordersDtoMapper.MapToShipmentDetail(result.ResultObject, productImages));
    }

    /// <summary>
    /// Update shipment status (e.g., Preparing -> Shipped -> Delivered)
    /// </summary>
    [HttpPut("shipments/{shipmentId:guid}/status")]
    [ProducesResponseType<ShipmentDetailDto>(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> UpdateShipmentStatus(Guid shipmentId, [FromBody] UpdateShipmentStatusDto request, CancellationToken ct)
    {
        var parameters = ordersRequestMapper.MapUpdateShipmentStatusParameters(shipmentId, request);

        var result = await shipmentService.UpdateShipmentStatusAsync(parameters, ct);

        if (!result.Success)
        {
            if (result.ResultObject == null)
            {
                return NotFound();
            }
            var errorMessage = result.Messages.FirstOrDefault(m => m.ResultMessageType == ResultMessageType.Error)?.Message;
            return BadRequest(new { error = errorMessage ?? "Failed to update shipment status" });
        }

        var productImages = await GetProductImagesForShipment(result.ResultObject!, ct);
        return Ok(ordersDtoMapper.MapToShipmentDetail(result.ResultObject!, productImages));
    }

    /// <summary>
    /// Delete a shipment (releases items back to unfulfilled)
    /// </summary>
    [HttpDelete("shipments/{shipmentId:guid}")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> DeleteShipment(Guid shipmentId, CancellationToken ct)
    {
        var success = await shipmentService.DeleteShipmentAsync(shipmentId, ct);

        if (!success)
        {
            return NotFound();
        }

        return NoContent();
    }

    // ============================================
    // Manual Order Creation Endpoints
    // ============================================

    /// <summary>
    /// Create a new manual order from the admin backoffice
    /// </summary>
    [HttpPost("orders/manual")]
    [ProducesResponseType<CreateManualOrderResultDto>(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> CreateManualOrder([FromBody] CreateManualOrderDto request, CancellationToken ct)
    {
        var validation = await new CreateManualOrderDtoValidator().ValidateAsync(request, ct);
        if (!validation.IsValid)
        {
            return BadRequest((object)validation.Errors[0].ErrorMessage);
        }

        // Get current backoffice user
        var currentUser = backOfficeSecurityAccessor.BackOfficeSecurity?.CurrentUser;
        var authorId = currentUser?.Key;
        var authorName = currentUser?.Name;

        var result = await invoiceService.CreateManualOrderAsync(
            request,
            authorId,
            authorName,
            ct);

        if (!result.Success)
        {
            return BadRequest(result.ErrorMessage ?? "Failed to create manual order");
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
        [FromQuery] string? name,
        CancellationToken ct)
    {
        var results = await customerService.SearchCustomersAsync(email, name, ct: ct);
        return Ok(results);
    }

    /// <summary>
    /// Search product variants by name or SKU for custom item autocomplete in order edit.
    /// </summary>
    [HttpGet("orders/product-autocomplete")]
    [ProducesResponseType<List<OrderProductAutocompleteDto>>(StatusCodes.Status200OK)]
    public async Task<List<OrderProductAutocompleteDto>> SearchProductsForOrder(
        [FromQuery] string? query,
        [FromQuery] int limit = 10,
        CancellationToken ct = default)
    {
        if (string.IsNullOrWhiteSpace(query))
        {
            return [];
        }

        var trimmedQuery = query.Trim();
        var clampedLimit = Math.Clamp(limit, 1, 25);
        var fetchSize = Math.Clamp(clampedLimit * 3, clampedLimit, 75);

        var result = await productService.QueryProducts(new ProductQueryParameters
        {
            CurrentPage = 1,
            AmountPerPage = fetchSize,
            Search = trimmedQuery,
            AllVariants = true,
            NoTracking = true,
            OrderBy = ProductOrderBy.ProductRoot
        }, ct);

        return result.Items
            .Select(product => new
            {
                Product = product,
                RootName = product.ProductRoot?.RootName ?? product.Name ?? "Unnamed Product",
                VariantName = product.Name ?? product.ProductRoot?.RootName ?? "Unnamed Product"
            })
            .OrderByDescending(x => string.Equals(x.Product.Sku, trimmedQuery, StringComparison.OrdinalIgnoreCase))
            .ThenByDescending(x => x.Product.Sku != null &&
                x.Product.Sku.StartsWith(trimmedQuery, StringComparison.OrdinalIgnoreCase))
            .ThenByDescending(x => x.RootName.StartsWith(trimmedQuery, StringComparison.OrdinalIgnoreCase))
            .ThenByDescending(x => x.VariantName.StartsWith(trimmedQuery, StringComparison.OrdinalIgnoreCase))
            .ThenBy(x => x.RootName)
            .ThenBy(x => x.Product.Sku)
            .Take(clampedLimit)
            .Select(x => new OrderProductAutocompleteDto
            {
                Id = x.Product.Id,
                ProductRootId = x.Product.ProductRootId,
                RootName = x.RootName,
                Name = x.VariantName,
                Sku = x.Product.Sku,
                Price = x.Product.Price,
                Cost = x.Product.CostOfGoods,
                TaxGroupId = x.Product.ProductRoot?.TaxGroupId,
                IsPhysicalProduct = !(x.Product.ProductRoot?.IsDigitalProduct ?? false),
                ImageUrl = x.Product.Images.FirstOrDefault() ?? x.Product.ProductRoot?.RootImages.FirstOrDefault()
            })
            .ToList();
    }

    /// <summary>
    /// Get all orders for a customer by their billing email address
    /// </summary>
    [HttpGet("orders/customer/{email}")]
    [ProducesResponseType<List<OrderListItemDto>>(StatusCodes.Status200OK)]
    public async Task<IActionResult> GetCustomerOrders(string email, CancellationToken ct)
    {
        if (string.IsNullOrWhiteSpace(email))
        {
            return Ok(Array.Empty<OrderListItemDto>());
        }

        // URL decode the email in case it contains special characters
        var decodedEmail = Uri.UnescapeDataString(email);

        var invoices = await invoiceService.GetInvoicesByBillingEmailAsync(decodedEmail, ct);

        // Map to DTOs
        var items = invoices.Select(ordersDtoMapper.MapToListItem).ToList();

        return Ok(items);
    }

    // ============================================
    // Address Lookup Endpoints (Backoffice)
    // ============================================

    /// <summary>
    /// Get address lookup configuration for the backoffice order creation UI.
    /// </summary>
    [HttpGet("orders/address-lookup/config")]
    [ProducesResponseType<AddressLookupClientConfigDto>(StatusCodes.Status200OK)]
    public async Task<IActionResult> GetAddressLookupConfig(CancellationToken ct)
    {
        var config = await addressLookupService.GetClientConfigAsync(null, ct);
        return Ok(config);
    }

    /// <summary>
    /// Get address lookup suggestions for a query (backoffice - no rate limiting).
    /// </summary>
    [HttpPost("orders/address-lookup/suggestions")]
    [ProducesResponseType<AddressLookupSuggestionsResponseDto>(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> GetAddressLookupSuggestions(
        [FromBody] AddressLookupSuggestionsRequestDto request,
        CancellationToken ct)
    {
        if (request == null || string.IsNullOrWhiteSpace(request.Query))
        {
            return BadRequest(new AddressLookupSuggestionsResponseDto
            {
                Success = false,
                ErrorMessage = "Query is required."
            });
        }

        var result = await addressLookupService.GetSuggestionsAsync(new AddressLookupSuggestionsParameters
        {
            Query = request.Query,
            CountryCode = request.CountryCode,
            Limit = request.Limit,
            SessionId = request.SessionId
        }, ct);

        return Ok(new AddressLookupSuggestionsResponseDto
        {
            Success = result.Success,
            ErrorMessage = result.ErrorMessage,
            Suggestions = result.Suggestions?.Select(s => new AddressLookupSuggestionDto
            {
                Id = s.Id,
                Label = s.Label,
                Description = s.Description
            }).ToList() ?? []
        });
    }

    /// <summary>
    /// Resolve an address lookup suggestion into a full address (backoffice - no rate limiting).
    /// </summary>
    [HttpPost("orders/address-lookup/resolve")]
    [ProducesResponseType<AddressLookupResolveResponseDto>(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> ResolveAddressLookup(
        [FromBody] AddressLookupResolveRequestDto request,
        CancellationToken ct)
    {
        if (request == null || string.IsNullOrWhiteSpace(request.Id))
        {
            return BadRequest(new AddressLookupResolveResponseDto
            {
                Success = false,
                ErrorMessage = "Address id is required."
            });
        }

        var result = await addressLookupService.ResolveAddressAsync(new AddressLookupResolveParameters
        {
            Id = request.Id!,
            CountryCode = request.CountryCode,
            SessionId = request.SessionId
        }, ct);

        return Ok(new AddressLookupResolveResponseDto
        {
            Success = result.Success,
            ErrorMessage = result.ErrorMessage,
            Address = result.Address != null ? new AddressLookupAddressDto
            {
                Company = result.Address.Company,
                AddressOne = result.Address.AddressOne,
                AddressTwo = result.Address.AddressTwo,
                TownCity = result.Address.TownCity,
                CountyState = result.Address.CountyState,
                RegionCode = result.Address.RegionCode,
                PostalCode = result.Address.PostalCode,
                Country = result.Address.Country,
                CountryCode = result.Address.CountryCode
            } : null
        });
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
    public async Task<IActionResult> ApplyDiscount(Guid invoiceId, [FromBody] ApplyDiscountDto request, CancellationToken ct)
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
        }, ct);

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

    private async Task<Dictionary<Guid, string?>> GetProductImagesForShipment(Shipment shipment, CancellationToken ct)
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

        return await productService.GetProductImagesAsync(productIds, ct);
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
        var parameters = ordersRequestMapper.MapOutstandingInvoicesQuery(
            customerId,
            accountCustomersOnly,
            overdueOnly,
            dueWithinDays,
            search,
            sortBy,
            sortDirection,
            page,
            pageSize);

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

        var parameters = ordersRequestMapper.MapBatchMarkAsPaidParameters(dto);

        var result = await paymentService.BatchMarkAsPaidAsync(parameters, ct);

        var response = new BatchMarkAsPaidResultDto
        {
            SuccessCount = result.ResultObject?.Count ?? 0,
            Messages = result.Messages.Select(m => m.Message ?? "").ToList(),
            PaymentIds = result.ResultObject?.Select(p => p.Id).ToList() ?? []
        };

        if (!result.Success)
        {
            return BadRequest(response);
        }

        return Ok(response);
    }
}
