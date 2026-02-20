using System.Text.Json;
using Merchello.Core.Accounting.Factories;
using Merchello.Core.Accounting.Dtos;
using Merchello.Core.Accounting.Models;
using Merchello.Core.Accounting.Services.Interfaces;
using Merchello.Core.Accounting.Services.Parameters;
using Merchello.Core.Checkout.Factories;
using Merchello.Core.Checkout.Models;
using Merchello.Core.Checkout.Strategies.Interfaces;
using Merchello.Core.Checkout.Strategies.Models;
using Merchello.Core.Data;
using Merchello.Core.Payments.Dtos;
using Merchello.Core.Payments.Models;
using Merchello.Core.Payments.Providers.Interfaces;
using Merchello.Core.Payments.Services.Interfaces;
using Merchello.Core.Payments.Services.Parameters;
using Merchello.Core.Shared;
using Merchello.Core.Shared.Extensions;
using Merchello.Core.Shared.Models;
using Merchello.Core.Shared.Models.Enums;
using Merchello.Core.Shared.Services.Interfaces;
using Merchello.Core.Products.Services.Interfaces;
using Merchello.Core.Shipping.Extensions;
using Merchello.Core.Shipping.Services.Interfaces;
using Merchello.Core.Storefront.Models;
using Merchello.Core.Products.Models;
using Merchello.Core.Settings.Services.Interfaces;
using Merchello.Core.Upsells.Dtos;
using Merchello.Core.Upsells.Models;
using Merchello.Core.Upsells.Services.Interfaces;
using Merchello.Core.Upsells.Services.Parameters;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using Umbraco.Cms.Persistence.EFCore.Scoping;

namespace Merchello.Core.Upsells.Services;

/// <summary>
/// Manages post-purchase upsell flows: initialization, previewing, adding items,
/// charging saved payment methods, and releasing fulfillment holds.
/// </summary>
public class PostPurchaseUpsellService(
    IEFCoreScopeProvider<MerchelloDbContext> efCoreScopeProvider,
    IInvoiceService invoiceService,
    IInvoiceEditService invoiceEditService,
    LineItemFactory lineItemFactory,
    BasketFactory basketFactory,
    ISavedPaymentMethodService savedPaymentMethodService,
    IPaymentService paymentService,
    IPaymentProviderManager paymentProviderManager,
    IUpsellEngine upsellEngine,
    IUpsellAnalyticsService analyticsService,
    ICurrencyService currencyService,
    IShippingService shippingService,
    IOrderGroupingStrategyResolver strategyResolver,
    IUpsellContextBuilder upsellContextBuilder,
    IInventoryService inventoryService,
    IOptions<MerchelloSettings> merchelloSettings,
    IOptions<UpsellSettings> upsellSettings,
    ILogger<PostPurchaseUpsellService> logger,
    IMerchelloStoreSettingsService? storeSettingsService = null) : IPostPurchaseUpsellService
{
    private readonly MerchelloSettings _storeSettings = merchelloSettings.Value;
    private readonly IMerchelloStoreSettingsService? _storeSettingsService = storeSettingsService;
    private const string PostPurchaseEligibleKey = "PostPurchaseEligible";
    private const string PostPurchaseWindowStartKey = "PostPurchaseWindowStartUtc";
    private const string PostPurchaseWindowEndsKey = "PostPurchaseWindowEndsUtc";
    private const string PostPurchaseProviderAliasKey = "PostPurchaseProviderAlias";
    private const string PostPurchaseSavedMethodIdKey = "PostPurchaseSavedMethodId";
    private const string PostPurchaseOriginalOrderStatusKey = "PostPurchaseOriginalOrderStatus";

    public async Task<OperationResult<bool>> InitializePostPurchaseAsync(
        InitializePostPurchaseParameters parameters,
        CancellationToken ct = default)
    {
        var settings = upsellSettings.Value;
        if (!settings.EnablePostPurchase)
            return OperationResult<bool>.Fail("Post-purchase upsells are disabled.");

        var invoice = await invoiceService.GetInvoiceAsync(parameters.InvoiceId, ct);
        if (invoice == null)
            return OperationResult<bool>.Fail("Invoice not found.");

        // Guest checkout — no saved methods possible
        if (invoice.CustomerId == Guid.Empty)
            return OperationResult<bool>.Fail("Post-purchase upsells require an authenticated customer.");

        // If already eligible and window is still active, no-op
        if (TryGetPostPurchaseWindowEnd(invoice, out var existingWindowEnd) &&
            existingWindowEnd > DateTime.UtcNow &&
            invoice.ExtendedData.TryGetValue(PostPurchaseEligibleKey, out var eligibleFlag) &&
            Convert.ToBoolean(eligibleFlag.UnwrapJsonElement()))
        {
            return OperationResult<bool>.Ok(true);
        }

        if (TryGetPostPurchaseWindowEnd(invoice, out var expiredWindowEnd) &&
            expiredWindowEnd <= DateTime.UtcNow)
        {
            await ClearPostPurchaseMetadataAsync(invoice.Id, ct);
        }

        // Verify provider supports vaulting
        var provider = await paymentProviderManager.GetProviderAsync(
            parameters.ProviderAlias, requireEnabled: false, ct);

        if (provider?.Metadata.SupportsVaultedPayments != true ||
            provider.Setting?.IsVaultingEnabled != true)
        {
            return OperationResult<bool>.Fail("Payment provider does not support vaulted payments.");
        }

        // Find saved payment method
        SavedPaymentMethod? savedMethod = null;
        if (parameters.SavedPaymentMethodId.HasValue)
        {
            savedMethod = await savedPaymentMethodService.GetPaymentMethodAsync(
                parameters.SavedPaymentMethodId.Value, ct);
        }

        savedMethod ??= await savedPaymentMethodService.GetDefaultPaymentMethodAsync(
            invoice.CustomerId, ct);

        if (savedMethod == null)
            return OperationResult<bool>.Fail("No saved payment method found.");

        if (savedMethod.CustomerId != invoice.CustomerId)
            return OperationResult<bool>.Fail("Saved payment method does not belong to this customer.");

        // Check for active PostPurchase upsell rules (confirmation location)
        var context = await BuildUpsellContextAsync(invoice, UpsellDisplayLocation.Confirmation, ct);
        if (context == null)
            return OperationResult<bool>.Ok(false);

        var suggestions = await upsellEngine.GetSuggestionsForLocationAsync(
            context,
            UpsellDisplayLocation.Confirmation,
            ct);
        var postPurchaseSuggestions = suggestions
            .Where(s => s.CheckoutMode == CheckoutUpsellMode.PostPurchase)
            .ToList();

        if (postPurchaseSuggestions.Count == 0)
            return OperationResult<bool>.Ok(false);

        // Set all orders to OnHold
        if (invoice.Orders != null)
        {
            foreach (var order in invoice.Orders)
            {
                if (order.Status == OrderStatus.OnHold)
                    continue;

                await invoiceService.UpdateOrderStatusAsync(new UpdateOrderStatusParameters
                {
                    OrderId = order.Id,
                    NewStatus = OrderStatus.OnHold,
                    Reason = "Post-purchase upsell window active",
                }, ct);
            }
        }

        // Persist window state on invoice ExtendedData
        var now = DateTime.UtcNow;
        var windowEnd = now.AddMinutes(settings.PostPurchaseFulfillmentHoldMinutes);
        var originalStatuses = invoice.Orders?
            .ToDictionary(o => o.Id, o => o.Status) ?? new Dictionary<Guid, OrderStatus>();

        await UpdateInvoiceExtendedDataAsync(parameters.InvoiceId, data =>
        {
            data[PostPurchaseEligibleKey] = true;
            data[PostPurchaseWindowStartKey] = now.ToString("O");
            data[PostPurchaseWindowEndsKey] = windowEnd.ToString("O");
            data[PostPurchaseProviderAliasKey] = parameters.ProviderAlias;
            data[PostPurchaseSavedMethodIdKey] = savedMethod.Id.ToString();
            if (!data.ContainsKey(PostPurchaseOriginalOrderStatusKey) && originalStatuses.Count > 0)
            {
                data[PostPurchaseOriginalOrderStatusKey] = JsonSerializer.Serialize(originalStatuses);
            }
        }, ct);

        return OperationResult<bool>.Ok(true);
    }

    public async Task<PostPurchaseUpsellsDto?> GetAvailableUpsellsAsync(
        Guid invoiceId,
        CancellationToken ct = default)
    {
        if (!upsellSettings.Value.EnablePostPurchase)
            return null;

        var invoice = await invoiceService.GetInvoiceAsync(invoiceId, ct);
        if (invoice == null)
            return null;

        // Guest checkout — no saved methods
        if (invoice.CustomerId == Guid.Empty)
            return null;

        // Check window eligibility
        if (!invoice.ExtendedData.TryGetValue(PostPurchaseEligibleKey, out var eligible) ||
            !Convert.ToBoolean(eligible.UnwrapJsonElement()))
        {
            return null;
        }

        var windowExpired = false;
        var timeRemaining = 0;

        if (TryGetPostPurchaseWindowEnd(invoice, out var endsAt))
        {
            var remaining = endsAt - DateTime.UtcNow;
            if (remaining <= TimeSpan.Zero)
            {
                windowExpired = true;
            }
            else
            {
                timeRemaining = (int)remaining.TotalSeconds;
            }
        }
        else
        {
            windowExpired = true;
        }

        if (windowExpired)
        {
            await ReleaseHoldAsync(invoice, ct);
            await ClearPostPurchaseMetadataAsync(invoice.Id, ct);

            return new PostPurchaseUpsellsDto
            {
                InvoiceId = invoice.Id,
                InvoiceNumber = invoice.InvoiceNumber,
                Suggestions = [],
                SavedPaymentMethod = null,
                TimeRemainingSeconds = 0,
                WindowExpired = true
            };
        }

        // Get saved payment method
        StorefrontSavedMethodDto? savedMethodDto = null;
        if (invoice.ExtendedData.TryGetValue(PostPurchaseSavedMethodIdKey, out var methodIdStr) &&
            Guid.TryParse(methodIdStr?.ToString(), out var methodId))
        {
            var savedMethod = await savedPaymentMethodService.GetPaymentMethodAsync(methodId, ct);
            if (savedMethod != null && savedMethod.CustomerId == invoice.CustomerId)
                savedMethodDto = MapToStorefrontDto(savedMethod);
        }

        if (savedMethodDto == null)
            return null;

        // Get suggestions for confirmation location
        var context = await BuildUpsellContextAsync(invoice, UpsellDisplayLocation.Confirmation, ct);
        if (context == null)
        {
            await ReleaseHoldAsync(invoice, ct);
            await ClearPostPurchaseMetadataAsync(invoice.Id, ct);
            return null;
        }

        var suggestions = await upsellEngine.GetSuggestionsForLocationAsync(
            context,
            UpsellDisplayLocation.Confirmation,
            ct);
        var postPurchaseSuggestions = suggestions
            .Where(s => s.CheckoutMode == CheckoutUpsellMode.PostPurchase)
            .ToList();

        if (postPurchaseSuggestions.Count == 0)
        {
            await ReleaseHoldAsync(invoice, ct);
            await ClearPostPurchaseMetadataAsync(invoice.Id, ct);
            return null;
        }

        var suggestionDtos = postPurchaseSuggestions.Select(MapSuggestionToDto).ToList();

        return new PostPurchaseUpsellsDto
        {
            InvoiceId = invoice.Id,
            InvoiceNumber = invoice.InvoiceNumber,
            Suggestions = suggestionDtos,
            SavedPaymentMethod = savedMethodDto,
            TimeRemainingSeconds = timeRemaining,
            WindowExpired = windowExpired,
        };
    }

    public async Task<PostPurchasePreviewDto?> PreviewAddToOrderAsync(
        PreviewPostPurchaseParameters parameters,
        CancellationToken ct = default)
    {
        if (!await IsPostPurchaseWindowValidAsync(parameters.InvoiceId, ct))
            return null;

        var invoice = await invoiceService.GetInvoiceAsync(parameters.InvoiceId, ct);
        if (invoice == null)
            return null;

        var (editRequest, product, unavailableReason) = await BuildEditRequestAsync(
            invoice,
            parameters.ProductId,
            parameters.Quantity,
            parameters.Addons,
            ct);

        if (editRequest == null || product == null)
        {
            return new PostPurchasePreviewDto
            {
                ProductId = parameters.ProductId,
                ProductName = product?.ProductRoot?.RootName ?? product?.Name ?? "Product",
                Quantity = parameters.Quantity,
                CurrencyCode = invoice.CurrencyCode,
                CurrencySymbol = invoice.CurrencySymbol,
                IsAvailable = false,
                UnavailableReason = unavailableReason ?? "Product is unavailable."
            };
        }

        var preview = await invoiceEditService.PreviewInvoiceEditAsync(
            parameters.InvoiceId, editRequest, ct);

        if (preview == null)
            return null;

        var currentShipping = invoice.Orders?.Sum(o => o.ShippingCost) ?? 0;

        // Calculate amounts from preview delta vs current invoice
        var subTotalDelta = currencyService.Round(preview.SubTotal - invoice.SubTotal, invoice.CurrencyCode);
        var taxDelta = currencyService.Round(preview.Tax - invoice.Tax, invoice.CurrencyCode);
        var shippingDelta = currencyService.Round(Math.Max(0, preview.ShippingTotal - currentShipping), invoice.CurrencyCode);
        var totalDelta = currencyService.Round(subTotalDelta + taxDelta + shippingDelta, invoice.CurrencyCode);

        var unitPriceNet = parameters.Quantity > 0 ? subTotalDelta / parameters.Quantity : subTotalDelta;
        var priceIncludesTax = GetEffectiveStoreSettings().DisplayPricesIncTax;
        var displaySubTotal = priceIncludesTax ? subTotalDelta + taxDelta : subTotalDelta;
        var displayUnitPrice = parameters.Quantity > 0 ? displaySubTotal / parameters.Quantity : displaySubTotal;

        var taxRate = subTotalDelta > 0
            ? Math.Round((taxDelta / subTotalDelta) * 100m, 2, GetEffectiveStoreSettings().DefaultRounding)
            : 0m;
        var taxLabel = taxDelta > 0
            ? priceIncludesTax ? "inc tax" : "plus tax"
            : null;

        return new PostPurchasePreviewDto
        {
            ProductId = parameters.ProductId,
            ProductName = product.ProductRoot?.RootName ?? product.Name ?? "Product",
            Quantity = parameters.Quantity,
            UnitPrice = currencyService.Round(displayUnitPrice, invoice.CurrencyCode),
            SubTotal = currencyService.Round(displaySubTotal, invoice.CurrencyCode),
            TaxAmount = taxDelta,
            ShippingDelta = shippingDelta,
            Total = totalDelta,
            UnitPriceInStoreCurrency = ConvertPresentmentToStoreCurrency(invoice, unitPriceNet),
            SubTotalInStoreCurrency = ConvertPresentmentToStoreCurrency(invoice, subTotalDelta),
            TotalInStoreCurrency = ConvertPresentmentToStoreCurrency(invoice, totalDelta),
            FormattedUnitPrice = currencyService.FormatAmount(displayUnitPrice, invoice.CurrencyCode),
            FormattedSubTotal = currencyService.FormatAmount(displaySubTotal, invoice.CurrencyCode),
            FormattedTaxAmount = currencyService.FormatAmount(taxDelta, invoice.CurrencyCode),
            FormattedShippingDelta = currencyService.FormatAmount(shippingDelta, invoice.CurrencyCode),
            FormattedTotal = currencyService.FormatAmount(totalDelta, invoice.CurrencyCode),
            CurrencyCode = invoice.CurrencyCode,
            CurrencySymbol = invoice.CurrencySymbol,
            PriceIncludesTax = priceIncludesTax,
            TaxLabel = taxLabel,
            TaxRate = taxRate,
            IsAvailable = true
        };
    }

    public async Task<OperationResult<PostPurchaseResultDto>> AddToOrderAsync(
        AddPostPurchaseUpsellParameters parameters,
        CancellationToken ct = default)
    {
        if (!await IsPostPurchaseWindowValidAsync(parameters.InvoiceId, ct))
            return OperationResult<PostPurchaseResultDto>.Fail("Post-purchase window has expired.");

        var invoice = await invoiceService.GetInvoiceAsync(parameters.InvoiceId, ct);
        if (invoice == null)
            return OperationResult<PostPurchaseResultDto>.Fail("Invoice not found.");

        // Guest checkout — no saved methods
        if (invoice.CustomerId == Guid.Empty)
            return OperationResult<PostPurchaseResultDto>.Fail("Post-purchase upsells require an authenticated customer.");

        // Verify saved payment method
        var savedMethod = await savedPaymentMethodService.GetPaymentMethodAsync(
            parameters.SavedPaymentMethodId, ct);
        if (savedMethod == null)
            return OperationResult<PostPurchaseResultDto>.Fail("Saved payment method not found.");

        if (savedMethod.CustomerId != invoice.CustomerId)
            return OperationResult<PostPurchaseResultDto>.Fail("Saved payment method does not belong to this customer.");

        if (IsExpired(savedMethod.ExpiryMonth, savedMethod.ExpiryYear))
            return OperationResult<PostPurchaseResultDto>.Fail("Payment method has expired.");

        var (editRequest, _, unavailableReason) = await BuildEditRequestAsync(
            invoice,
            parameters.ProductId,
            parameters.Quantity,
            parameters.Addons,
            ct);

        if (editRequest == null)
            return OperationResult<PostPurchaseResultDto>.Fail(unavailableReason ?? "Product is unavailable.");

        // Preview to get the charge amount
        var preview = await invoiceEditService.PreviewInvoiceEditAsync(
            parameters.InvoiceId,
            editRequest,
            ct);

        if (preview == null)
            return OperationResult<PostPurchaseResultDto>.Fail("Unable to preview order changes.");

        var currentShipping = invoice.Orders?.Sum(o => o.ShippingCost) ?? 0;
        var subTotalDelta = currencyService.Round(preview.SubTotal - invoice.SubTotal, invoice.CurrencyCode);
        var taxDelta = currencyService.Round(preview.Tax - invoice.Tax, invoice.CurrencyCode);
        var shippingDelta = currencyService.Round(Math.Max(0, preview.ShippingTotal - currentShipping), invoice.CurrencyCode);
        var chargeAmount = currencyService.Round(subTotalDelta + taxDelta + shippingDelta, invoice.CurrencyCode);

        if (chargeAmount <= 0)
            return OperationResult<PostPurchaseResultDto>.Fail("Nothing to charge.");

        // Charge saved payment method
        var chargeResult = await savedPaymentMethodService.ChargeAsync(new ChargeSavedMethodParameters
        {
            InvoiceId = parameters.InvoiceId,
            SavedPaymentMethodId = parameters.SavedPaymentMethodId,
            Amount = chargeAmount,
            Description = "Post-purchase upsell",
            IdempotencyKey = parameters.IdempotencyKey,
        }, ct);

        if (!chargeResult.Success || chargeResult.ResultObject == null)
        {
            var errorMsg = chargeResult.Messages
                .Where(m => m.ResultMessageType == ResultMessageType.Error)
                .Select(m => m.Message)
                .FirstOrDefault() ?? "Payment failed.";
            return OperationResult<PostPurchaseResultDto>.Fail(errorMsg);
        }

        var paymentResult = chargeResult.ResultObject;
        var transactionId = paymentResult.TransactionId ?? Guid.NewGuid().ToString();

        // Record the payment
        var recordResult = await paymentService.RecordPaymentAsync(new RecordPaymentParameters
        {
            InvoiceId = parameters.InvoiceId,
            ProviderAlias = savedMethod.ProviderAlias,
            TransactionId = transactionId,
            IdempotencyKey = parameters.IdempotencyKey,
            Amount = chargeAmount,
            Description = "Post-purchase upsell",
        }, ct);

        if (!recordResult.Success || recordResult.ResultObject == null)
        {
            logger.LogCritical(
                "Post-purchase payment captured but failed to record. InvoiceId={InvoiceId}, Amount={Amount}, TransactionId={TransactionId}. Manual review required.",
                parameters.InvoiceId,
                chargeAmount,
                transactionId);

            await ReleaseHoldAsync(invoice, ct);

            return OperationResult<PostPurchaseResultDto>.Fail(
                "Payment captured but failed to record. Please contact support.");
        }

        // Apply invoice changes
        var editResult = await invoiceEditService.EditInvoiceAsync(new EditInvoiceParameters
        {
            InvoiceId = parameters.InvoiceId,
            Request = editRequest,
            AuthorId = invoice.CustomerId,
            AuthorName = "PostPurchase",
        }, ct);

        var response = new PostPurchaseResultDto
        {
            Success = true,
            PaymentTransactionId = transactionId,
            AmountCharged = chargeAmount,
            FormattedAmountCharged = currencyService.FormatAmount(chargeAmount, invoice.CurrencyCode),
        };

        if (!editResult.Success)
        {
            logger.LogCritical(
                "Invoice edit failed after successful payment charge. InvoiceId={InvoiceId}, Amount={Amount}, TransactionId={TransactionId}. Manual review required.",
                parameters.InvoiceId, chargeAmount, transactionId);
            response.ErrorMessage = "Payment captured but order update failed. Please contact support.";
        }

        // Release hold
        await ReleaseHoldAsync(invoice, ct);

        // Record conversion analytics
        await analyticsService.RecordConversionAsync(new RecordUpsellConversionParameters
        {
            UpsellRuleId = parameters.UpsellRuleId,
            ProductId = parameters.ProductId,
            InvoiceId = parameters.InvoiceId,
            Amount = chargeAmount,
            DisplayLocation = UpsellDisplayLocation.Confirmation,
        }, ct);

        return OperationResult<PostPurchaseResultDto>.Ok(response);
    }

    public async Task<OperationResult<bool>> SkipUpsellsAsync(
        Guid invoiceId,
        CancellationToken ct = default)
    {
        var invoice = await invoiceService.GetInvoiceAsync(invoiceId, ct);
        if (invoice == null)
            return OperationResult<bool>.Fail("Invoice not found.");

        await ReleaseHoldAsync(invoice, ct);

        // Clear post-purchase window metadata
        await UpdateInvoiceExtendedDataAsync(invoiceId, data =>
        {
            data.Remove(PostPurchaseEligibleKey);
            data.Remove(PostPurchaseWindowStartKey);
            data.Remove(PostPurchaseWindowEndsKey);
            data.Remove(PostPurchaseProviderAliasKey);
            data.Remove(PostPurchaseSavedMethodIdKey);
            data.Remove(PostPurchaseOriginalOrderStatusKey);
        }, ct);

        return OperationResult<bool>.Ok(true);
    }

    public async Task<bool> IsPostPurchaseWindowValidAsync(
        Guid invoiceId,
        CancellationToken ct = default)
    {
        var invoice = await invoiceService.GetInvoiceAsync(invoiceId, ct);
        if (invoice == null)
            return false;

        if (!invoice.ExtendedData.TryGetValue(PostPurchaseEligibleKey, out var eligible) ||
            !Convert.ToBoolean(eligible.UnwrapJsonElement()))
        {
            return false;
        }

        if (TryGetPostPurchaseWindowEnd(invoice, out var endsAt))
        {
            return DateTime.UtcNow < endsAt;
        }

        return false;
    }

    // =====================================================
    // Helpers
    // =====================================================

    private async Task ReleaseHoldAsync(Invoice invoice, CancellationToken ct)
    {
        if (invoice.Orders == null)
            return;

        var originalStatuses = GetOriginalOrderStatuses(invoice.ExtendedData);

        foreach (var order in invoice.Orders.Where(o => o.Status == OrderStatus.OnHold))
        {
            var newStatus = originalStatuses.TryGetValue(order.Id, out var status)
                ? status
                : OrderStatus.ReadyToFulfill;

            await invoiceService.UpdateOrderStatusAsync(new UpdateOrderStatusParameters
            {
                OrderId = order.Id,
                NewStatus = newStatus,
                Reason = "Post-purchase window ended",
            }, ct);
        }
    }

    private async Task UpdateInvoiceExtendedDataAsync(
        Guid invoiceId,
        Action<Dictionary<string, object>> mutate,
        CancellationToken ct)
    {
        using var scope = efCoreScopeProvider.CreateScope();
        await scope.ExecuteWithContextAsync(async db =>
        {
            var invoice = await db.Invoices.FirstOrDefaultAsync(i => i.Id == invoiceId, ct);
            if (invoice == null)
                return false;

            mutate(invoice.ExtendedData);
            await db.SaveChangesAsync(ct);
            return true;
        });
        scope.Complete();
    }

    private async Task<UpsellContext?> BuildUpsellContextAsync(
        Invoice invoice,
        UpsellDisplayLocation location,
        CancellationToken ct)
    {
        var orderLineItems = invoice.Orders?
            .SelectMany(o => o.LineItems ?? [])
            .Where(li => li.ProductId.HasValue)
            .ToList() ?? [];

        if (orderLineItems.Count == 0)
        {
            return null;
        }

        var lineItems = await upsellContextBuilder.BuildLineItemsAsync(orderLineItems, ct);
        if (lineItems.Count == 0)
        {
            return null;
        }

        var countryCode = invoice.ShippingAddress?.CountryCode
            ?? invoice.BillingAddress?.CountryCode
            ?? GetEffectiveStoreSettings().DefaultShippingCountry
            ?? "US";

        var regionCode = invoice.ShippingAddress?.CountyState?.RegionCode
            ?? invoice.BillingAddress?.CountyState?.RegionCode;

        return new UpsellContext
        {
            CustomerId = invoice.CustomerId,
            LineItems = lineItems,
            CountryCode = countryCode,
            RegionCode = regionCode,
            Location = location,
            DisplayContext = BuildInvoiceDisplayContext(invoice)
        };
    }

    private StorefrontDisplayContext BuildInvoiceDisplayContext(Invoice invoice)
    {
        var storeCurrencyCode = string.IsNullOrWhiteSpace(invoice.StoreCurrencyCode)
            ? GetEffectiveStoreSettings().StoreCurrencyCode
            : invoice.StoreCurrencyCode;

        var currencyCode = string.IsNullOrWhiteSpace(invoice.CurrencyCode)
            ? storeCurrencyCode
            : invoice.CurrencyCode;

        var currencyInfo = currencyService.GetCurrency(currencyCode);
        var currencySymbol = string.IsNullOrWhiteSpace(invoice.CurrencySymbol)
            ? currencyInfo.Symbol
            : invoice.CurrencySymbol;

        var exchangeRate = 1m;
        if (!string.Equals(currencyCode, storeCurrencyCode, StringComparison.OrdinalIgnoreCase))
        {
            if (invoice.PricingExchangeRate.HasValue && invoice.PricingExchangeRate.Value > 0m)
            {
                exchangeRate = 1m / invoice.PricingExchangeRate.Value;
            }
        }

        var taxCountryCode = invoice.ShippingAddress?.CountryCode
            ?? invoice.BillingAddress?.CountryCode
            ?? GetEffectiveStoreSettings().DefaultShippingCountry
            ?? "US";

        return new StorefrontDisplayContext(
            currencyCode,
            currencySymbol,
            currencyInfo.DecimalPlaces,
            exchangeRate,
            storeCurrencyCode,
            GetEffectiveStoreSettings().DisplayPricesIncTax,
            taxCountryCode,
            invoice.ShippingAddress?.CountyState?.RegionCode);
    }

    private async Task<(EditInvoiceDto? Request, Product? Product, string? UnavailableReason)> BuildEditRequestAsync(
        Invoice invoice,
        Guid productId,
        int quantity,
        List<OrderAddonDto>? addons,
        CancellationToken ct)
    {
        if (quantity <= 0)
        {
            return (null, null, "Quantity must be at least 1.");
        }

        if (string.IsNullOrWhiteSpace(invoice.ShippingAddress?.CountryCode))
        {
            return (null, null, "Shipping address is missing.");
        }

        Product? product;
        using (var scope = efCoreScopeProvider.CreateScope())
        {
            product = await scope.ExecuteWithContextAsync(async db =>
                await db.Products
                    .AsNoTracking()
                    .Include(p => p.ProductRoot)
                    .FirstOrDefaultAsync(p => p.Id == productId, ct));
            scope.Complete();
        }

        if (product == null)
        {
            return (null, null, "Product not found.");
        }

        var fulfillment = await shippingService.GetFulfillmentOptionsForProductAsync(
            productId,
            invoice.ShippingAddress.CountryCode!,
            invoice.ShippingAddress.CountyState?.RegionCode,
            ct);

        if (!fulfillment.CanAddToOrder || fulfillment.FulfillingWarehouse == null)
        {
            return (null, product, fulfillment.BlockedReason ?? "Product is unavailable.");
        }

        var warehouseId = fulfillment.FulfillingWarehouse.Id;

        var isTracked = await inventoryService.IsStockTrackedAsync(productId, warehouseId, ct);
        if (isTracked)
        {
            var available = await inventoryService.GetAvailableStockAsync(productId, warehouseId, ct);
            if (available < quantity)
            {
                return (null, product, $"Only {available} left in stock.");
            }
        }

        var selectionKey = ResolveSelectionKeyForWarehouse(invoice, warehouseId);

        var addProduct = new AddProductToOrderDto
        {
            ProductId = productId,
            Quantity = quantity,
            WarehouseId = warehouseId,
            Addons = addons ?? [],
            SelectionKey = selectionKey
        };

        if (!string.IsNullOrWhiteSpace(selectionKey) &&
            SelectionKeyExtensions.TryParse(selectionKey, out var shippingOptionId, out _, out _) &&
            shippingOptionId.HasValue)
        {
            addProduct.ShippingOptionId = shippingOptionId.Value;
        }

        var (shippingUpdates, error) = await CalculateShippingUpdatesAsync(invoice, addProduct, ct);
        if (error != null)
        {
            return (null, product, error);
        }

        var request = new EditInvoiceDto
        {
            ProductsToAdd = [addProduct],
            OrderShippingUpdates = shippingUpdates,
            EditReason = "Post-purchase upsell"
        };

        return (request, product, null);
    }

    private async Task<(List<OrderShippingUpdateDto> Updates, string? ErrorMessage)> CalculateShippingUpdatesAsync(
        Invoice invoice,
        AddProductToOrderDto productToAdd,
        CancellationToken ct)
    {
        var orders = invoice.Orders?.ToList() ?? [];
        if (orders.Count == 0)
        {
            return ([], null);
        }

        if (string.IsNullOrWhiteSpace(invoice.ShippingAddress?.CountryCode))
        {
            return ([], "Shipping address is missing.");
        }

        var orderLineItems = orders
            .SelectMany(o => o.LineItems ?? [])
            .Where(li => li.ProductId.HasValue)
            .ToList();

        var productIds = orderLineItems
            .Select(li => li.ProductId!.Value)
            .Append(productToAdd.ProductId)
            .Distinct()
            .ToList();

        using var scope = efCoreScopeProvider.CreateScope();
        var (products, warehouses) = await scope.ExecuteWithContextAsync(async db =>
        {
            var loadedProducts = productIds.Any()
                ? await db.Products
                    .AsNoTracking()
                    .Include(p => p.ProductRoot!)
                        .ThenInclude(pr => pr!.ProductRootWarehouses.OrderBy(prw => prw.PriorityOrder))
                            .ThenInclude(prw => prw.Warehouse)
                                
                    .Include(p => p.ProductRoot!)
                        .ThenInclude(pr => pr!.ProductRootWarehouses)
                            .ThenInclude(prw => prw.Warehouse)
                                .ThenInclude(w => w!.ShippingOptions)
                                    
                    .Include(p => p.ProductWarehouses)
                        .ThenInclude(pw => pw.Warehouse)
                    .Include(p => p.ShippingOptions)
                    .Include(p => p.AllowedShippingOptions)
                    .Include(p => p.ExcludedShippingOptions)
                    .Where(p => productIds.Contains(p.Id))
                    .AsSplitQuery()
                    .ToDictionaryAsync(p => p.Id, ct)
                : new Dictionary<Guid, Product>();

            var warehouseIds = loadedProducts.Values
                .SelectMany(p => p.ProductRoot?.ProductRootWarehouses?.Select(prw => prw.WarehouseId) ?? [])
                .Concat(loadedProducts.Values.SelectMany(p => p.ProductWarehouses?.Select(pw => pw.WarehouseId) ?? []))
                .Concat(orders.Select(o => o.WarehouseId))
                .Distinct()
                .ToList();

            var loadedWarehouses = await db.Warehouses
                .AsNoTracking()
                .Include(w => w.ShippingOptions)
                    
                
                .Where(w => warehouseIds.Contains(w.Id))
                .ToDictionaryAsync(w => w.Id, ct);

            return (loadedProducts, loadedWarehouses);
        });
        scope.Complete();

        if (!products.TryGetValue(productToAdd.ProductId, out var newProduct))
        {
            return ([], "Product not found.");
        }

        List<LineItem> virtualLineItems = [];
        var lineItemShippingSelections = new Dictionary<Guid, (Guid WarehouseId, string SelectionKey)>();

        foreach (var order in orders)
        {
            var selectionKey = ResolveOrderSelectionKey(order);
            foreach (var lineItem in order.LineItems?.Where(li => li.ProductId.HasValue) ?? [])
            {
                if (!products.TryGetValue(lineItem.ProductId!.Value, out var product))
                {
                    continue;
                }

                var virtualLineItem = lineItemFactory.CreateForOrder(
                    lineItem,
                    lineItem.Quantity,
                    product.Price,
                    lineItem.Cost);
                virtualLineItem.Id = lineItem.Id;
                virtualLineItems.Add(virtualLineItem);

                if (!string.IsNullOrWhiteSpace(selectionKey))
                {
                    lineItemShippingSelections[lineItem.Id] = (order.WarehouseId, selectionKey);
                }
            }
        }

        var newLineItem = lineItemFactory.CreateFromProduct(newProduct, productToAdd.Quantity);
        newLineItem.Name ??= newProduct.ProductRoot?.RootName ?? "Product";
        var newLineItemId = newLineItem.Id;
        virtualLineItems.Add(newLineItem);

        if (!string.IsNullOrWhiteSpace(productToAdd.SelectionKey) && productToAdd.WarehouseId != Guid.Empty)
        {
            lineItemShippingSelections[newLineItemId] = (productToAdd.WarehouseId, productToAdd.SelectionKey);
        }

        var storeCurrency = string.IsNullOrWhiteSpace(invoice.StoreCurrencyCode)
            ? GetEffectiveStoreSettings().StoreCurrencyCode
            : invoice.StoreCurrencyCode;

        var currencySymbol = currencyService.GetCurrency(storeCurrency).Symbol;
        var virtualBasket = basketFactory.Create(invoice.CustomerId, storeCurrency, currencySymbol);
        virtualBasket.LineItems = virtualLineItems;
        virtualBasket.BillingAddress = invoice.BillingAddress;
        virtualBasket.ShippingAddress = invoice.ShippingAddress;

        var context = new OrderGroupingContext
        {
            Basket = virtualBasket,
            BillingAddress = invoice.BillingAddress,
            ShippingAddress = invoice.ShippingAddress,
            CustomerId = invoice.CustomerId,
            CustomerEmail = invoice.BillingAddress?.Email,
            Products = products,
            Warehouses = warehouses,
            LineItemShippingSelections = lineItemShippingSelections
        };

        var strategy = strategyResolver.GetStrategy();
        var groupingResult = await strategy.GroupItemsAsync(context, ct);
        if (!groupingResult.Success)
        {
            return ([], string.Join("; ", groupingResult.Errors));
        }

        var newItemGroup = groupingResult.Groups
            .FirstOrDefault(g => g.LineItems.Any(li => li.LineItemId == newLineItemId));
        if (newItemGroup != null && !string.IsNullOrWhiteSpace(newItemGroup.SelectedShippingOptionId))
        {
            productToAdd.SelectionKey = newItemGroup.SelectedShippingOptionId;
            if (SelectionKeyExtensions.TryParse(productToAdd.SelectionKey, out var optionId, out _, out _) &&
                optionId.HasValue)
            {
                productToAdd.ShippingOptionId = optionId.Value;
            }
        }

        var updates = new List<OrderShippingUpdateDto>();
        foreach (var group in groupingResult.Groups)
        {
            var matchingOrder = FindMatchingOrder(orders, group);
            if (matchingOrder == null)
            {
                continue;
            }

            var newShippingCost = ResolveGroupShippingCost(group, invoice);
            if (newShippingCost != matchingOrder.ShippingCost)
            {
                updates.Add(new OrderShippingUpdateDto
                {
                    OrderId = matchingOrder.Id,
                    ShippingCost = newShippingCost
                });
            }
        }

        return (updates, null);
    }

    private static string? ResolveOrderSelectionKey(Order order)
    {
        if (order.ShippingOptionId != Guid.Empty)
        {
            return SelectionKeyExtensions.ForShippingOption(order.ShippingOptionId);
        }

        if (!string.IsNullOrWhiteSpace(order.ShippingProviderKey) &&
            !string.IsNullOrWhiteSpace(order.ShippingServiceCode))
        {
            return SelectionKeyExtensions.ForDynamicProvider(order.ShippingProviderKey, order.ShippingServiceCode);
        }

        return null;
    }

    private static string? ResolveSelectionKeyForWarehouse(Invoice invoice, Guid warehouseId)
    {
        var order = invoice.Orders?
            .FirstOrDefault(o => o.WarehouseId == warehouseId &&
                                 !string.IsNullOrWhiteSpace(ResolveOrderSelectionKey(o)));

        return order == null ? null : ResolveOrderSelectionKey(order);
    }

    private static Order? FindMatchingOrder(IReadOnlyCollection<Order> orders, OrderGroup group)
    {
        if (!group.WarehouseId.HasValue)
        {
            return null;
        }

        var warehouseId = group.WarehouseId.Value;
        var selectionKey = group.SelectedShippingOptionId;

        if (!string.IsNullOrWhiteSpace(selectionKey) &&
            SelectionKeyExtensions.TryParse(selectionKey, out var optionId, out var providerKey, out var serviceCode))
        {
            if (optionId.HasValue && optionId.Value != Guid.Empty)
            {
                return orders.FirstOrDefault(o =>
                    o.WarehouseId == warehouseId &&
                    o.ShippingOptionId == optionId.Value);
            }

            if (!string.IsNullOrWhiteSpace(providerKey) && !string.IsNullOrWhiteSpace(serviceCode))
            {
                return orders.FirstOrDefault(o =>
                    o.WarehouseId == warehouseId &&
                    string.Equals(o.ShippingProviderKey, providerKey, StringComparison.OrdinalIgnoreCase) &&
                    string.Equals(o.ShippingServiceCode, serviceCode, StringComparison.OrdinalIgnoreCase));
            }
        }

        var warehouseOrders = orders.Where(o => o.WarehouseId == warehouseId).ToList();
        return warehouseOrders.Count == 1 ? warehouseOrders[0] : null;
    }

    private decimal ResolveGroupShippingCost(OrderGroup group, Invoice invoice)
    {
        if (group.AvailableShippingOptions == null || group.AvailableShippingOptions.Count == 0)
        {
            return 0m;
        }

        var selectionKey = group.SelectedShippingOptionId;
        var selectedOption = !string.IsNullOrWhiteSpace(selectionKey)
            ? group.AvailableShippingOptions.FirstOrDefault(o => o.SelectionKey == selectionKey)
            : null;

        var option = selectedOption ?? group.AvailableShippingOptions.OrderBy(o => o.Cost).FirstOrDefault();
        if (option == null)
        {
            return 0m;
        }

        return ConvertStoreToPresentmentCurrency(invoice, option.Cost);
    }

    private decimal ConvertStoreToPresentmentCurrency(Invoice invoice, decimal storeAmount)
    {
        var presentmentCurrency = string.IsNullOrWhiteSpace(invoice.CurrencyCode)
            ? GetEffectiveStoreSettings().StoreCurrencyCode
            : invoice.CurrencyCode;

        if (string.IsNullOrWhiteSpace(invoice.CurrencyCode) ||
            string.IsNullOrWhiteSpace(invoice.StoreCurrencyCode))
        {
            return currencyService.Round(storeAmount, presentmentCurrency);
        }

        if (string.Equals(invoice.CurrencyCode, invoice.StoreCurrencyCode, StringComparison.OrdinalIgnoreCase))
        {
            return currencyService.Round(storeAmount, presentmentCurrency);
        }

        if (!invoice.PricingExchangeRate.HasValue || invoice.PricingExchangeRate.Value <= 0m)
        {
            return currencyService.Round(storeAmount, presentmentCurrency);
        }

        return currencyService.ConvertToPresentmentCurrency(
            storeAmount,
            invoice.PricingExchangeRate.Value,
            presentmentCurrency);
    }

    private decimal ConvertPresentmentToStoreCurrency(Invoice invoice, decimal presentmentAmount)
    {
        var storeCurrency = string.IsNullOrWhiteSpace(invoice.StoreCurrencyCode)
            ? GetEffectiveStoreSettings().StoreCurrencyCode
            : invoice.StoreCurrencyCode;

        if (string.IsNullOrWhiteSpace(invoice.CurrencyCode) ||
            string.IsNullOrWhiteSpace(invoice.StoreCurrencyCode))
        {
            return currencyService.Round(presentmentAmount, storeCurrency);
        }

        if (string.Equals(invoice.CurrencyCode, invoice.StoreCurrencyCode, StringComparison.OrdinalIgnoreCase))
        {
            return currencyService.Round(presentmentAmount, storeCurrency);
        }

        if (!invoice.PricingExchangeRate.HasValue || invoice.PricingExchangeRate.Value <= 0m)
        {
            return currencyService.Round(presentmentAmount, storeCurrency);
        }

        return currencyService.Round(
            presentmentAmount * invoice.PricingExchangeRate.Value,
            storeCurrency);
    }

    private static bool TryGetPostPurchaseWindowEnd(Invoice invoice, out DateTime endsAt)
    {
        endsAt = default;
        if (!invoice.ExtendedData.TryGetValue(PostPurchaseWindowEndsKey, out var endsAtValue) || endsAtValue == null)
        {
            return false;
        }

        if (endsAtValue is DateTime dateTime)
        {
            endsAt = dateTime;
            return true;
        }

        var unwrapped = endsAtValue.UnwrapJsonElement();
        if (unwrapped is string endsAtString && DateTime.TryParse(endsAtString, out var parsed))
        {
            endsAt = parsed;
            return true;
        }

        return false;
    }

    private async Task ClearPostPurchaseMetadataAsync(Guid invoiceId, CancellationToken ct)
    {
        await UpdateInvoiceExtendedDataAsync(invoiceId, data =>
        {
            data.Remove(PostPurchaseEligibleKey);
            data.Remove(PostPurchaseWindowStartKey);
            data.Remove(PostPurchaseWindowEndsKey);
            data.Remove(PostPurchaseProviderAliasKey);
            data.Remove(PostPurchaseSavedMethodIdKey);
            data.Remove(PostPurchaseOriginalOrderStatusKey);
        }, ct);
    }

    private static Dictionary<Guid, OrderStatus> GetOriginalOrderStatuses(Dictionary<string, object> extendedData)
    {
        if (!extendedData.TryGetValue(PostPurchaseOriginalOrderStatusKey, out var value) || value == null)
        {
            return new Dictionary<Guid, OrderStatus>();
        }

        var json = value.UnwrapJsonElement()?.ToString();

        if (string.IsNullOrWhiteSpace(json))
        {
            return new Dictionary<Guid, OrderStatus>();
        }

        try
        {
            return JsonSerializer.Deserialize<Dictionary<Guid, OrderStatus>>(json) ?? new Dictionary<Guid, OrderStatus>();
        }
        catch
        {
            return new Dictionary<Guid, OrderStatus>();
        }
    }

    private MerchelloSettings GetEffectiveStoreSettings() =>
        _storeSettingsService?.GetRuntimeSettings().Merchello ?? _storeSettings;

    private static UpsellSuggestionDto MapSuggestionToDto(UpsellSuggestion s) => new()
    {
        UpsellRuleId = s.UpsellRuleId,
        Heading = s.Heading,
        Message = s.Message,
        CheckoutMode = s.CheckoutMode,
        DisplayStyles = s.DisplayStyles,
        Products = s.Products.Select(p => new UpsellProductDto
        {
            ProductId = p.ProductId,
            ProductRootId = p.ProductRootId,
            Name = p.Name,
            Description = p.Description,
            Sku = p.Sku,
            Price = p.Price,
            FormattedPrice = p.FormattedPrice,
            PriceIncludesTax = p.PriceIncludesTax,
            TaxRate = p.TaxRate,
            TaxAmount = p.TaxAmount,
            FormattedTaxAmount = p.FormattedTaxAmount,
            OnSale = p.OnSale,
            PreviousPrice = p.PreviousPrice,
            FormattedPreviousPrice = p.FormattedPreviousPrice,
            Url = p.Url,
            ImageUrl = p.Images.FirstOrDefault(),
            ProductTypeName = p.ProductTypeName,
            AvailableForPurchase = p.AvailableForPurchase,
            HasVariants = p.HasVariants,
            Variants = p.Variants?.Select(MapVariantToDto).ToList()
        }).ToList(),
    };

    private static UpsellVariantDto MapVariantToDto(UpsellVariant variant) => new()
    {
        ProductId = variant.ProductId,
        Name = variant.Name,
        Sku = variant.Sku,
        Price = variant.Price,
        FormattedPrice = variant.FormattedPrice,
        AvailableForPurchase = variant.AvailableForPurchase
    };

    private static StorefrontSavedMethodDto MapToStorefrontDto(SavedPaymentMethod method) => new()
    {
        Id = method.Id,
        ProviderAlias = method.ProviderAlias,
        MethodType = method.MethodType,
        CardBrand = method.CardBrand,
        Last4 = method.Last4,
        ExpiryFormatted = FormatExpiry(method.ExpiryMonth, method.ExpiryYear),
        IsExpired = IsExpired(method.ExpiryMonth, method.ExpiryYear),
        DisplayLabel = method.DisplayLabel,
        IsDefault = method.IsDefault,
    };

    private static string? FormatExpiry(int? month, int? year)
    {
        if (!month.HasValue || !year.HasValue)
            return null;

        return $"{month.Value:D2}/{year.Value % 100:D2}";
    }

    private static bool IsExpired(int? month, int? year)
    {
        if (!month.HasValue || !year.HasValue)
            return false;

        var now = DateTime.UtcNow;
        return new DateTime(year.Value, month.Value, 1).AddMonths(1) <= now;
    }
}


