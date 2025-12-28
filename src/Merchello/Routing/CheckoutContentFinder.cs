using Merchello.Core.Checkout.Models;
using Merchello.Models;
using Microsoft.Extensions.Logging;
using Umbraco.Cms.Core.Routing;

namespace Merchello.Routing;

/// <summary>
/// Content finder that intercepts /checkout/* URLs and creates virtual IPublishedContent for checkout steps.
/// Registered after Umbraco's default ContentFinderByUrl so Umbraco content is checked first.
/// </summary>
public class CheckoutContentFinder(ILogger<CheckoutContentFinder> logger) : IContentFinder
{
    private const string CheckoutPrefix = "checkout";

    /// <summary>
    /// Attempts to find content for the request by matching checkout URLs.
    /// </summary>
    public Task<bool> TryFindContent(IPublishedRequestBuilder request)
    {
        var path = request.AbsolutePathDecoded.Trim('/');
        if (string.IsNullOrEmpty(path))
        {
            return Task.FromResult(false);
        }

        // Check if path starts with "checkout"
        if (!path.Equals(CheckoutPrefix, StringComparison.OrdinalIgnoreCase) &&
            !path.StartsWith($"{CheckoutPrefix}/", StringComparison.OrdinalIgnoreCase))
        {
            return Task.FromResult(false);
        }

        var segments = path.Split('/', StringSplitOptions.RemoveEmptyEntries);

        // Parse the checkout step from the URL
        var step = ParseCheckoutStep(segments);
        Guid? invoiceId = null;

        // For confirmation step, extract the invoice ID from the URL
        // e.g., /checkout/confirmation/12345678-1234-1234-1234-123456789012
        if (step == CheckoutStep.Confirmation && segments.Length > 2)
        {
            if (Guid.TryParse(segments[2], out var id))
            {
                invoiceId = id;
            }
        }

        var checkoutPage = new MerchelloCheckoutPage(step, invoiceId);
        request.SetPublishedContent(checkoutPage);

        logger.LogDebug("Resolved checkout step: {Step}, InvoiceId: {InvoiceId}", step, invoiceId);

        return Task.FromResult(true);
    }

    /// <summary>
    /// Parses the checkout step from URL segments.
    /// </summary>
    private static CheckoutStep ParseCheckoutStep(string[] segments)
    {
        // Default to Information if just /checkout
        if (segments.Length <= 1)
        {
            return CheckoutStep.Information;
        }

        var stepSegment = segments[1].ToLowerInvariant();

        return stepSegment switch
        {
            "information" => CheckoutStep.Information,
            "shipping" => CheckoutStep.Shipping,
            "payment" => CheckoutStep.Payment,
            "confirmation" => CheckoutStep.Confirmation,
            "return" => CheckoutStep.PaymentReturn,
            "cancel" => CheckoutStep.PaymentCancelled,
            _ => CheckoutStep.Information // Default to information for unknown steps
        };
    }
}
