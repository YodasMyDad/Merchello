using Merchello.Core.Accounting.Models;
using Merchello.Core.Email.Models;
using Merchello.Core.Locality.Models;
using Merchello.Core.Notifications.Base;
using Microsoft.AspNetCore.Html;

namespace Merchello.Email.Services;

/// <summary>
/// Interface for MJML helper methods that output MJML markup.
/// </summary>
public interface IMjmlHelper
{
    IHtmlContent EmailStart(string title, string? preview = null);
    IHtmlContent EmailEnd();
    IHtmlContent Header(EmailStoreContext store);
    IHtmlContent Footer(EmailStoreContext store);
    IHtmlContent Button(string text, string url, string? backgroundColor = null);
    IHtmlContent Text(string content, bool bold = false, string? fontSize = null);
    IHtmlContent Heading(string text, int level = 1);
    IHtmlContent Divider();
    IHtmlContent Spacer(int height = 20);
    IHtmlContent OrderSummary(Invoice invoice);
    IHtmlContent AddressBlock(Address? address, string? title = null);
    IHtmlContent LineItemsTable(IEnumerable<LineItem> items, string? currencySymbol = null);
    IHtmlContent UpsellSuggestions(MerchelloNotification notification);
}
