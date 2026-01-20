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
    /// <param name="basket">The basket to create an invoice from.</param>
    /// <param name="invoiceNumber">The invoice number to assign.</param>
    /// <param name="billingAddress">The billing address.</param>
    /// <param name="shippingAddress">The shipping address.</param>
    /// <param name="presentmentCurrency">The presentment currency code.</param>
    /// <param name="storeCurrency">The store currency code.</param>
    /// <param name="customerId">The customer ID.</param>
    /// <param name="source">Optional source tracking information. Defaults to web checkout if not provided.</param>
    /// <param name="hasAccountTerms">Whether the customer has account terms enabled.</param>
    /// <param name="paymentTermsDays">Payment terms in days (e.g., 30 for Net 30).</param>
    public Invoice CreateFromBasket(
        Basket basket,
        string invoiceNumber,
        Address billingAddress,
        Address shippingAddress,
        string presentmentCurrency,
        string storeCurrency,
        Guid customerId,
        InvoiceSource? source = null,
        bool hasAccountTerms = false,
        int? paymentTermsDays = null)
    {
        var now = DateTime.UtcNow;

        // Calculate due date for account customers
        DateTime? dueDate = hasAccountTerms && paymentTermsDays.HasValue
            ? now.AddDays(paymentTermsDays.Value)
            : null;

        return new Invoice
        {
            Id = GuidExtensions.NewSequentialGuid,
            InvoiceNumber = invoiceNumber,
            CustomerId = customerId,
            BasketId = basket.Id, // For finding existing unpaid invoices when user returns to checkout
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
            DueDate = dueDate,
            Source = source ?? new InvoiceSource
            {
                Type = Constants.InvoiceSources.Web,
                DisplayName = "Online Store",
                SessionId = basket.Id.ToString(),
                RecordedAtUtc = now
            },
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
    /// <param name="invoiceNumber">The invoice number to assign.</param>
    /// <param name="customerId">The customer ID.</param>
    /// <param name="billingAddress">The billing address.</param>
    /// <param name="shippingAddress">The shipping address.</param>
    /// <param name="currencyCode">The currency code.</param>
    /// <param name="subTotal">The sub total amount.</param>
    /// <param name="tax">The tax amount.</param>
    /// <param name="total">The total amount.</param>
    /// <param name="authorName">Optional author name for the note.</param>
    /// <param name="authorId">Optional author ID for the note.</param>
    /// <param name="hasAccountTerms">Whether the customer has account terms enabled.</param>
    /// <param name="paymentTermsDays">Payment terms in days (e.g., 30 for Net 30).</param>
    public Invoice CreateDraft(
        string invoiceNumber,
        Guid customerId,
        Address billingAddress,
        Address shippingAddress,
        string currencyCode,
        decimal subTotal,
        decimal tax,
        decimal total,
        string? authorName = null,
        Guid? authorId = null,
        bool hasAccountTerms = false,
        int? paymentTermsDays = null)
    {
        var now = DateTime.UtcNow;

        // Calculate due date for account customers
        DateTime? dueDate = hasAccountTerms && paymentTermsDays.HasValue
            ? now.AddDays(paymentTermsDays.Value)
            : null;

        return new Invoice
        {
            Id = GuidExtensions.NewSequentialGuid,
            InvoiceNumber = invoiceNumber,
            CustomerId = customerId,
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
            DueDate = dueDate,
            Source = new InvoiceSource
            {
                Type = Constants.InvoiceSources.Draft,
                DisplayName = "Draft order",
                SourceId = authorId?.ToString(),
                SourceName = authorName,
                RecordedAtUtc = now
            },
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
