using Merchello.Core.Accounting.Dtos;
using Merchello.Core.Accounting.Extensions;
using Merchello.Core.Accounting.Models;
using Merchello.Core.Checkout.Dtos;
using Merchello.Core.Fulfilment.Providers.SupplierDirect;
using Merchello.Core.Fulfilment.Providers.SupplierDirect.Models;
using Merchello.Core.Fulfilment.Services.Interfaces;
using Merchello.Core.Locality.Dtos;
using Merchello.Core.Locality.Services.Interfaces;
using Merchello.Core.Payments.Models;
using Merchello.Core.Payments.Services.Interfaces;
using Merchello.Core.Payments.Services.Parameters;
using Merchello.Core.Shared.Extensions;
using Merchello.Core.Shared.Services.Interfaces;
using Merchello.Core.Shipping.Dtos;
using Merchello.Core.Shipping.Extensions;
using Merchello.Core.Shipping.Models;
using Merchello.Core.Warehouses.Services.Interfaces;

namespace Merchello.Services;

public class OrdersDtoMapper(
    IPaymentService paymentService,
    ICurrencyService currencyService,
    ILocalityCatalog localityCatalog,
    IFulfilmentService fulfilmentService,
    IWarehouseService warehouseService) : IOrdersDtoMapper
{
    private readonly ICurrencyService _currencyService = currencyService;
    private readonly ILocalityCatalog _localityCatalog = localityCatalog;
    private readonly IFulfilmentService _fulfilmentService = fulfilmentService;
    private readonly IWarehouseService _warehouseService = warehouseService;

    public Core.Locality.Models.Address MapDtoToAddress(AddressDto dto)
    {
        return new Core.Locality.Models.Address
        {
            Name = dto.Name,
            Company = dto.Company,
            AddressOne = dto.AddressOne,
            AddressTwo = dto.AddressTwo,
            TownCity = dto.TownCity,
            CountyState = new Core.Locality.Models.CountyState
            {
                Name = dto.CountyState,
                RegionCode = dto.RegionCode ?? dto.CountyState
            },
            PostalCode = dto.PostalCode,
            Country = dto.Country,
            CountryCode = dto.CountryCode,
            Email = dto.Email,
            Phone = dto.Phone
        };
    }

    public OrderListItemDto MapToListItem(Invoice invoice)
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

        var itemCount = GetItemCount(orders, li => li.LineItemType != LineItemType.Discount);

        var fulfillmentStatus = GetFulfillmentStatus(orders);
        var deliveryStatus = GetDeliveryStatus(orders);

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
            PaymentStatusCssClass = paymentDetails.Status.GetPaymentStatusCssClass(),
            FulfillmentStatus = fulfillmentStatus,
            FulfillmentStatusCssClass = GetFulfillmentStatusCssClass(orders),
            IsCancelled = invoice.IsCancelled,
            ItemCount = itemCount,
            DeliveryStatus = deliveryStatus,
            DueDate = invoice.DueDate,
            IsOverdue = invoice.DueDate.HasValue && invoice.DueDate.Value < DateTime.UtcNow && paymentDetails.BalanceDue > 0,
            DaysUntilDue = invoice.DueDate.HasValue ? (int)(invoice.DueDate.Value.Date - DateTime.UtcNow.Date).TotalDays : null,
            SourceType = invoice.Source?.Type,
            SourceName = invoice.Source?.SourceName ?? invoice.Source?.DisplayName,
            MaxRiskScore = paymentDetails.MaxRiskScore,
            MaxRiskScoreSource = paymentDetails.MaxRiskScoreSource,
            RiskLevel = paymentDetails.RiskLevel
        };
    }

    public async Task<OrderDetailDto> MapToDetailAsync(
        Invoice invoice,
        Dictionary<Guid, string> shippingOptionNames,
        Dictionary<Guid, string?> productImages,
        CancellationToken ct = default)
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
        var supplierDirectContexts = await ResolveSupplierDirectContextsAsync(orders, ct);

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
        var billingAddress = await MapAddressAsync(invoice.BillingAddress, ct);
        var shippingAddress = await MapAddressAsync(invoice.ShippingAddress, ct);

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
            PaymentStatusCssClass = paymentDetails.Status.GetPaymentStatusCssClass(),
            MaxRiskScore = paymentDetails.MaxRiskScore,
            MaxRiskScoreSource = paymentDetails.MaxRiskScoreSource,
            FulfillmentStatus = GetFulfillmentStatus(orders),
            FulfillmentStatusCssClass = GetFulfillmentStatusCssClass(orders),
            IsCancelled = invoice.IsCancelled,
            BillingAddress = billingAddress,
            ShippingAddress = shippingAddress,
            Orders = orders
                .Select(o => MapFulfillmentOrder(
                    o,
                    shippingOptionNames,
                    productImages,
                    supplierDirectContexts,
                    paymentDetails.Status))
                .ToList(),
            Notes = invoice.Notes?.Select(n => new InvoiceNoteDto
            {
                Date = n.DateCreated,
                Text = n.Description ?? string.Empty,
                AuthorId = n.AuthorId,
                Author = n.Author,
                IsVisibleToCustomer = n.VisibleToCustomer
            }).ToList() ?? [],
            ItemCount = GetItemCount(orders, li => li.LineItemType is LineItemType.Product or LineItemType.Custom or LineItemType.Addon),
            CanFulfill = !invoice.IsCancelled && GetFulfillmentStatus(orders) != "Fulfilled",
            DueDate = invoice.DueDate,
            IsOverdue = invoice.DueDate.HasValue && invoice.DueDate.Value < DateTime.UtcNow && paymentDetails.BalanceDue > 0,
            DaysUntilDue = invoice.DueDate.HasValue ? (int)(invoice.DueDate.Value.Date - DateTime.UtcNow.Date).TotalDays : null,
            Source = invoice.Source != null ? new InvoiceSourceDto
            {
                Type = invoice.Source.Type,
                DisplayName = invoice.Source.DisplayName,
                SourceId = invoice.Source.SourceId,
                SourceName = invoice.Source.SourceName,
                ProtocolVersion = invoice.Source.ProtocolVersion,
                SessionId = invoice.Source.SessionId
            } : null
        };
    }

    public AddressDto? MapAddress(Core.Locality.Models.Address? address)
    {
        if (address == null)
        {
            return null;
        }

        return new AddressDto
        {
            Name = address.Name,
            Company = address.Company,
            AddressOne = address.AddressOne,
            AddressTwo = address.AddressTwo,
            TownCity = address.TownCity,
            CountyState = address.CountyState?.Name,
            RegionCode = address.CountyState?.RegionCode,
            PostalCode = address.PostalCode,
            Country = address.Country,
            CountryCode = address.CountryCode,
            Email = address.Email,
            Phone = address.Phone
        };
    }

    public ShipmentDetailDto MapToShipmentDetail(Shipment shipment, Dictionary<Guid, string?> productImages)
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

    private async Task<AddressDto?> MapAddressAsync(Core.Locality.Models.Address? address, CancellationToken ct)
    {
        if (address == null)
        {
            return null;
        }

        // Look up country name from code if not set
        var countryName = address.Country;
        if (string.IsNullOrEmpty(countryName) && !string.IsNullOrEmpty(address.CountryCode))
        {
            countryName = await _localityCatalog.TryGetCountryNameAsync(address.CountryCode, ct);
        }

        return new AddressDto
        {
            Name = address.Name,
            Company = address.Company,
            AddressOne = address.AddressOne,
            AddressTwo = address.AddressTwo,
            TownCity = address.TownCity,
            CountyState = address.CountyState?.Name,
            RegionCode = address.CountyState?.RegionCode,
            PostalCode = address.PostalCode,
            Country = countryName,
            CountryCode = address.CountryCode,
            Email = address.Email,
            Phone = address.Phone
        };
    }

    private static FulfillmentOrderDto MapFulfillmentOrder(
        Order order,
        Dictionary<Guid, string> shippingOptionNames,
        Dictionary<Guid, string?> productImages,
        IReadOnlyDictionary<Guid, (string? ProviderKey, SupplierDirectSubmissionTrigger SubmissionTrigger)> supplierDirectContexts,
        InvoicePaymentStatus invoicePaymentStatus)
    {
        supplierDirectContexts.TryGetValue(order.Id, out var supplierDirectContext);

        var effectiveProviderKey = order.FulfilmentProviderConfiguration?.ProviderKey
                                   ?? supplierDirectContext.ProviderKey;
        var isSupplierDirect = string.Equals(
            effectiveProviderKey,
            SupplierDirectProviderDefaults.ProviderKey,
            StringComparison.OrdinalIgnoreCase);
        var supplierDirectSubmissionTrigger = isSupplierDirect
            ? supplierDirectContext.SubmissionTrigger
            : SupplierDirectSubmissionTrigger.OnPaid;
        var canReleaseSupplierDirect = isSupplierDirect &&
                                       supplierDirectSubmissionTrigger == SupplierDirectSubmissionTrigger.ExplicitRelease &&
                                       string.IsNullOrWhiteSpace(order.FulfilmentProviderReference) &&
                                       invoicePaymentStatus == InvoicePaymentStatus.Paid;

        var deliveryMethod = shippingOptionNames.TryGetValue(order.ShippingOptionId, out var name)
            ? name
            : "Unknown";

        var lineItems = order.LineItems?
            .Where(li => li.LineItemType == LineItemType.Product
                      || li.LineItemType == LineItemType.Custom
                      || li.LineItemType == LineItemType.Addon)
            .ToList() ?? [];

        var parentLineItems = lineItems
            .Where(li => li.LineItemType is LineItemType.Product or LineItemType.Custom)
            .ToList();

        var addonLineItems = lineItems
            .Where(li => li.LineItemType == LineItemType.Addon)
            .ToList();

        var addonsByParentId = addonLineItems
            .Select(addon => new { Addon = addon, ParentLineItemId = addon.GetParentLineItemId() })
            .Where(x => x.ParentLineItemId.HasValue)
            .GroupBy(x => x.ParentLineItemId!.Value)
            .ToDictionary(group => group.Key, group => group.Select(x => x.Addon).ToList());

        var addonsByParentSku = addonLineItems
            .Where(addon =>
                !addon.GetParentLineItemId().HasValue &&
                !string.IsNullOrWhiteSpace(addon.DependantLineItemSku))
            .GroupBy(addon => addon.DependantLineItemSku!, StringComparer.OrdinalIgnoreCase)
            .ToDictionary(group => group.Key, group => group.ToList(), StringComparer.OrdinalIgnoreCase);

        var mappedLineItems = parentLineItems
            .Select(parentLineItem =>
            {
                List<LineItem> linkedAddons = [];
                if (addonsByParentId.TryGetValue(parentLineItem.Id, out var addonsById))
                {
                    linkedAddons.AddRange(addonsById);
                }

                if (!string.IsNullOrWhiteSpace(parentLineItem.Sku) &&
                    addonsByParentSku.TryGetValue(parentLineItem.Sku, out var addonsBySku))
                {
                    linkedAddons.AddRange(addonsBySku);
                }

                var childAddons = linkedAddons
                    .GroupBy(addon => addon.Id)
                    .Select(group => group.First())
                    .Select(addon => MapLineItem(addon, productImages, parentLineItem.Sku, parentLineItem.Id, true, []))
                    .ToList();

                return MapLineItem(parentLineItem, productImages, null, null, false, childAddons);
            })
            .ToList();

        var mappedAddonIds = mappedLineItems
            .SelectMany(lineItem => lineItem.ChildLineItems)
            .Select(lineItem => lineItem.Id)
            .ToHashSet();

        var orphanAddons = addonLineItems
            .Where(addon => !mappedAddonIds.Contains(addon.Id))
            .Select(addon => MapLineItem(
                addon,
                productImages,
                addon.DependantLineItemSku,
                addon.GetParentLineItemId(),
                true,
                []))
            .ToList();

        if (orphanAddons.Count > 0)
        {
            mappedLineItems.AddRange(orphanAddons);
        }

        return new FulfillmentOrderDto
        {
            Id = order.Id,
            Status = order.Status,
            StatusLabel = order.Status.ToLabel(),
            StatusCssClass = order.Status.ToCssClass(),
            DeliveryMethod = deliveryMethod,
            ShippingCost = order.ShippingCost,
            LineItems = mappedLineItems,
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
            }).ToList() ?? [],

            // Fulfilment provider information
            FulfilmentProviderKey = effectiveProviderKey,
            FulfilmentProviderName = order.FulfilmentProviderConfiguration?.DisplayName,
            FulfilmentProviderReference = order.FulfilmentProviderReference,
            FulfilmentSubmittedAt = order.FulfilmentSubmittedAt,
            FulfilmentErrorMessage = order.FulfilmentErrorMessage,
            FulfilmentRetryCount = order.FulfilmentRetryCount,
            SupplierDirectSubmissionTrigger = isSupplierDirect
                ? supplierDirectSubmissionTrigger.ToString()
                : null,
            CanReleaseSupplierDirect = canReleaseSupplierDirect
        };
    }

    private async Task<Dictionary<Guid, (string? ProviderKey, SupplierDirectSubmissionTrigger SubmissionTrigger)>> ResolveSupplierDirectContextsAsync(
        List<Order> orders,
        CancellationToken ct)
    {
        Dictionary<Guid, (string? ProviderKey, SupplierDirectSubmissionTrigger SubmissionTrigger)> contexts = [];
        Dictionary<Guid, (string? ProviderKey, SupplierDirectSubmissionTrigger SubmissionTrigger)> warehouseContexts = [];

        var warehouseIds = orders
            .Select(o => o.WarehouseId)
            .Distinct()
            .ToList();

        foreach (var warehouseId in warehouseIds)
        {
            var providerConfig = await _fulfilmentService.ResolveProviderForWarehouseAsync(warehouseId, ct);
            var providerKey = providerConfig?.ProviderKey;
            var submissionTrigger = SupplierDirectSubmissionTrigger.OnPaid;

            if (string.Equals(providerKey, SupplierDirectProviderDefaults.ProviderKey, StringComparison.OrdinalIgnoreCase))
            {
                var warehouse = await _warehouseService.GetWarehouseByIdAsync(warehouseId, ct);
                if (warehouse?.Supplier?.ExtendedData?.TryGetValue(SupplierDirectExtendedDataKeys.Profile, out var profileRaw) == true)
                {
                    var profileJson = profileRaw.UnwrapJsonElement()?.ToString();
                    var profile = SupplierDirectProfile.FromJson(profileJson);
                    if (profile != null)
                    {
                        submissionTrigger = profile.SubmissionTrigger;
                    }
                }
            }

            warehouseContexts[warehouseId] = (providerKey, submissionTrigger);
        }

        foreach (var order in orders)
        {
            warehouseContexts.TryGetValue(order.WarehouseId, out var warehouseContext);
            var effectiveProviderKey = order.FulfilmentProviderConfiguration?.ProviderKey
                                       ?? warehouseContext.ProviderKey;
            contexts[order.Id] = (effectiveProviderKey, warehouseContext.SubmissionTrigger);
        }

        return contexts;
    }

    private static LineItemDto MapLineItem(
        LineItem lineItem,
        Dictionary<Guid, string?> productImages,
        string? parentLineItemSku,
        Guid? parentLineItemId,
        bool isAddon,
        List<LineItemDto> childLineItems)
    {
        var resolvedParentLineItemSku = parentLineItemSku ?? lineItem.DependantLineItemSku;
        var resolvedParentLineItemId = parentLineItemId ?? lineItem.GetParentLineItemId();
        var isProductLineItem = lineItem.LineItemType == LineItemType.Product;
        var imageUrl = isProductLineItem
                       && lineItem.ProductId.HasValue
                       && productImages.TryGetValue(lineItem.ProductId.Value, out var img)
            ? img
            : null;

        return new LineItemDto
        {
            Id = lineItem.Id,
            Sku = lineItem.Sku,
            Name = lineItem.Name,
            ProductRootName = isAddon ? lineItem.Name ?? string.Empty : lineItem.GetProductRootName(),
            SelectedOptions = isAddon
                ? []
                : lineItem.GetSelectedOptions()
                    .Select(o => new SelectedOptionDto
                    {
                        OptionName = o.OptionName,
                        ValueName = o.ValueName
                    }).ToList(),
            Quantity = lineItem.Quantity,
            Amount = lineItem.Amount,
            OriginalAmount = lineItem.OriginalAmount,
            ImageUrl = imageUrl,
            // Backend is single source of truth for calculated total
            CalculatedTotal = lineItem.Amount * lineItem.Quantity,
            LineItemType = lineItem.LineItemType.ToString(),
            ChildLineItems = childLineItems,
            ParentLineItemSku = resolvedParentLineItemSku,
            ParentLineItemId = resolvedParentLineItemId,
            IsAddon = isAddon
        };
    }

    private static int GetItemCount(List<Order> orders, Func<LineItem, bool> predicate) =>
        orders.SelectMany(o => o.LineItems ?? []).Where(predicate).Sum(li => li.Quantity);

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
}
