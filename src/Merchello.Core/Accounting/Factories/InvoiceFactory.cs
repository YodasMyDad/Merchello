using Merchello.Core.Accounting.Models;
using Merchello.Core.Checkout.Models;
using Merchello.Core.Locality.Models;
using Merchello.Core.Shared.Extensions;
using Merchello.Core.Shared.Services.Interfaces;

namespace Merchello.Core.Accounting.Factories;

/// <summary>
/// Factory for creating Invoice instances.
/// </summary>
public class InvoiceFactory(ICurrencyService currencyService)
{
    /// <summary>
    /// Creates an invoice from a basket during checkout.
    /// </summary>
    public Invoice CreateFromBasket(
        Basket basket,
        string invoiceNumber,
        Address billingAddress,
        Address shippingAddress,
        string presentmentCurrency,
        string storeCurrency)
    {
        var now = DateTime.UtcNow;
        return new Invoice
        {
            Id = GuidExtensions.NewSequentialGuid,
            InvoiceNumber = invoiceNumber,
            CustomerId = basket.CustomerId,
            BillingAddress = billingAddress,
            ShippingAddress = shippingAddress,
            CurrencyCode = presentmentCurrency,
            CurrencySymbol = basket.CurrencySymbol ?? currencyService.GetCurrency(presentmentCurrency).Symbol,
            StoreCurrencyCode = storeCurrency,
            SubTotal = basket.SubTotal,
            Discount = basket.Discount,
            AdjustedSubTotal = basket.AdjustedSubTotal,
            Tax = basket.Tax,
            Total = basket.Total,
            // Note: Discounts are now stored as LineItem with LineItemType.Discount on the Order,
            // not as Adjustments on the Invoice. The basket's discount line items will flow
            // through to the Order.LineItems during order creation.
            DateCreated = now,
            DateUpdated = now
        };
    }

    /// <summary>
    /// Creates a draft invoice for admin-created orders.
    /// </summary>
    public Invoice CreateDraft(
        string invoiceNumber,
        Address billingAddress,
        Address shippingAddress,
        string currencyCode,
        decimal subTotal,
        decimal tax,
        decimal total,
        string? authorName = null,
        Guid? authorId = null)
    {
        var now = DateTime.UtcNow;
        return new Invoice
        {
            Id = GuidExtensions.NewSequentialGuid,
            InvoiceNumber = invoiceNumber,
            BillingAddress = billingAddress,
            ShippingAddress = shippingAddress,
            Channel = "Draft order",
            CurrencyCode = currencyCode,
            CurrencySymbol = currencyService.GetCurrency(currencyCode).Symbol,
            StoreCurrencyCode = currencyCode,
            SubTotal = currencyService.Round(subTotal, currencyCode),
            Discount = 0,
            AdjustedSubTotal = currencyService.Round(subTotal, currencyCode),
            Tax = currencyService.Round(tax, currencyCode),
            Total = currencyService.Round(total, currencyCode),
            DateCreated = now,
            DateUpdated = now,
            Notes =
            [
                new InvoiceNote
                {
                    DateCreated = now,
                    Description = "Draft order created",
                    AuthorId = authorId,
                    Author = authorName ?? "System",
                    VisibleToCustomer = false
                }
            ]
        };
    }
}
