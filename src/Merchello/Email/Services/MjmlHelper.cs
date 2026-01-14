using System.Text;
using System.Text.Encodings.Web;
using Merchello.Core.Accounting.Models;
using Merchello.Core.Email.Models;
using Merchello.Core.Locality.Models;
using Microsoft.AspNetCore.Html;
using Microsoft.AspNetCore.Mvc.Rendering;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Options;
using Merchello.Core.Email;

namespace Merchello.Email.Services;

/// <summary>
/// Interface for MJML helper methods that output MJML markup.
/// </summary>
public interface IMjmlHelper
{
    // Structure
    IHtmlContent EmailStart(string title, string? preview = null);
    IHtmlContent EmailEnd();

    // Components
    IHtmlContent Header(EmailStoreContext store);
    IHtmlContent Footer(EmailStoreContext store);
    IHtmlContent Button(string text, string url, string? backgroundColor = null);
    IHtmlContent Text(string content, bool bold = false, string? fontSize = null);
    IHtmlContent Heading(string text, int level = 1);
    IHtmlContent Divider();
    IHtmlContent Spacer(int height = 20);

    // E-commerce specific
    IHtmlContent OrderSummary(Invoice invoice);
    IHtmlContent AddressBlock(Address? address, string? title = null);
    IHtmlContent LineItemsTable(IEnumerable<LineItem> items, string? currencySymbol = null);
}

/// <summary>
/// MJML helper implementation that outputs MJML markup for responsive emails.
/// All methods return IHtmlContent containing raw MJML tags.
/// </summary>
public class MjmlHelper : IMjmlHelper
{
    private readonly IHtmlHelper _html;
    private readonly EmailThemeSettings _theme;

    public MjmlHelper(IHtmlHelper html)
    {
        _html = html;
        // Try to get theme settings from DI, fall back to defaults
        var settings = html.ViewContext.HttpContext.RequestServices.GetService<IOptions<EmailSettings>>();
        _theme = settings?.Value.Theme ?? new EmailThemeSettings();
    }

    public IHtmlContent EmailStart(string title, string? preview = null)
    {
        var sb = new StringBuilder();
        sb.AppendLine("<mjml>");
        sb.AppendLine("  <mj-head>");
        sb.AppendLine($"    <mj-title>{HtmlEncode(title)}</mj-title>");
        if (!string.IsNullOrEmpty(preview))
        {
            sb.AppendLine($"    <mj-preview>{HtmlEncode(preview)}</mj-preview>");
        }
        sb.AppendLine("    <mj-attributes>");
        sb.AppendLine($"      <mj-all font-family=\"{HtmlEncode(_theme.FontFamily)}\" />");
        sb.AppendLine($"      <mj-text font-size=\"14px\" color=\"{HtmlEncode(_theme.TextColor)}\" line-height=\"1.6\" />");
        sb.AppendLine($"      <mj-section background-color=\"{HtmlEncode(_theme.ContentBackgroundColor)}\" padding=\"20px\" />");
        sb.AppendLine($"      <mj-button background-color=\"{HtmlEncode(_theme.PrimaryColor)}\" color=\"#ffffff\" border-radius=\"4px\" />");
        sb.AppendLine("    </mj-attributes>");
        sb.AppendLine("  </mj-head>");
        sb.AppendLine($"  <mj-body background-color=\"{HtmlEncode(_theme.BackgroundColor)}\">");

        return new HtmlString(sb.ToString());
    }

    public IHtmlContent EmailEnd()
    {
        return new HtmlString("  </mj-body>\n</mjml>");
    }

    public IHtmlContent Header(EmailStoreContext store)
    {
        var sb = new StringBuilder();
        sb.AppendLine($"<mj-section background-color=\"{HtmlEncode(_theme.PrimaryColor)}\" padding=\"20px\">");
        sb.AppendLine("  <mj-column>");

        if (!string.IsNullOrEmpty(store.LogoUrl))
        {
            sb.AppendLine($"    <mj-image src=\"{HtmlEncode(store.LogoUrl)}\" alt=\"{HtmlEncode(store.Name)}\" width=\"150px\" />");
        }
        else
        {
            sb.AppendLine($"    <mj-text font-size=\"24px\" font-weight=\"bold\" color=\"#ffffff\" align=\"center\">{HtmlEncode(store.Name)}</mj-text>");
        }

        sb.AppendLine("  </mj-column>");
        sb.AppendLine("</mj-section>");

        return new HtmlString(sb.ToString());
    }

    public IHtmlContent Footer(EmailStoreContext store)
    {
        var sb = new StringBuilder();
        sb.AppendLine($"<mj-section background-color=\"{HtmlEncode(_theme.BackgroundColor)}\" padding=\"20px\">");
        sb.AppendLine("  <mj-column>");
        sb.AppendLine($"    <mj-divider border-color=\"#dddddd\" />");

        // Store info
        sb.AppendLine($"    <mj-text align=\"center\" color=\"{HtmlEncode(_theme.SecondaryTextColor)}\" font-size=\"12px\">");
        sb.AppendLine($"      {HtmlEncode(store.Name)}");
        if (store.Address != null)
        {
            var addressParts = new List<string>();
            if (!string.IsNullOrEmpty(store.Address.AddressOne)) addressParts.Add(store.Address.AddressOne);
            if (!string.IsNullOrEmpty(store.Address.TownCity)) addressParts.Add(store.Address.TownCity);
            if (!string.IsNullOrEmpty(store.Address.PostalCode)) addressParts.Add(store.Address.PostalCode);
            if (addressParts.Count > 0)
            {
                sb.AppendLine($"      <br/>{HtmlEncode(string.Join(", ", addressParts))}");
            }
        }
        sb.AppendLine("    </mj-text>");

        // Contact info
        if (!string.IsNullOrEmpty(store.SupportEmail) || !string.IsNullOrEmpty(store.Phone))
        {
            sb.AppendLine($"    <mj-text align=\"center\" color=\"{HtmlEncode(_theme.SecondaryTextColor)}\" font-size=\"12px\">");
            if (!string.IsNullOrEmpty(store.SupportEmail))
            {
                sb.AppendLine($"      Email: <a href=\"mailto:{HtmlEncode(store.SupportEmail)}\" style=\"color: {HtmlEncode(_theme.PrimaryColor)};\">{HtmlEncode(store.SupportEmail)}</a>");
            }
            if (!string.IsNullOrEmpty(store.Phone))
            {
                sb.AppendLine($"      {(!string.IsNullOrEmpty(store.SupportEmail) ? " | " : "")}Phone: {HtmlEncode(store.Phone)}");
            }
            sb.AppendLine("    </mj-text>");
        }

        sb.AppendLine("  </mj-column>");
        sb.AppendLine("</mj-section>");

        return new HtmlString(sb.ToString());
    }

    public IHtmlContent Button(string text, string url, string? backgroundColor = null)
    {
        var bg = backgroundColor ?? _theme.PrimaryColor;
        return new HtmlString($"<mj-button href=\"{HtmlEncode(url)}\" background-color=\"{HtmlEncode(bg)}\">{HtmlEncode(text)}</mj-button>");
    }

    public IHtmlContent Text(string content, bool bold = false, string? fontSize = null)
    {
        var sb = new StringBuilder();
        sb.Append("<mj-text");
        if (bold) sb.Append(" font-weight=\"bold\"");
        if (!string.IsNullOrEmpty(fontSize)) sb.Append($" font-size=\"{HtmlEncode(fontSize)}\"");
        sb.Append(">");
        sb.Append(HtmlEncode(content));
        sb.Append("</mj-text>");
        return new HtmlString(sb.ToString());
    }

    public IHtmlContent Heading(string text, int level = 1)
    {
        var fontSize = level switch
        {
            1 => "24px",
            2 => "20px",
            3 => "18px",
            _ => "16px"
        };
        return new HtmlString($"<mj-text font-size=\"{fontSize}\" font-weight=\"bold\">{HtmlEncode(text)}</mj-text>");
    }

    public IHtmlContent Divider()
    {
        return new HtmlString("<mj-divider border-color=\"#dddddd\" />");
    }

    public IHtmlContent Spacer(int height = 20)
    {
        return new HtmlString($"<mj-spacer height=\"{height}px\" />");
    }

    public IHtmlContent OrderSummary(Invoice invoice)
    {
        var currencySymbol = invoice.CurrencySymbol ?? "£";
        var sb = new StringBuilder();

        sb.AppendLine("<mj-section padding=\"10px 20px\">");
        sb.AppendLine("  <mj-column>");
        sb.AppendLine("    <mj-text font-size=\"18px\" font-weight=\"bold\">Order Summary</mj-text>");
        sb.AppendLine("  </mj-column>");
        sb.AppendLine("</mj-section>");

        // Line items table - gather all line items from all orders
        var allLineItems = invoice.Orders?
            .SelectMany(o => o.LineItems ?? Enumerable.Empty<LineItem>())
            .ToList() ?? [];

        if (allLineItems.Count > 0)
        {
            sb.AppendLine("<mj-section padding=\"0 20px\">");
            sb.AppendLine("  <mj-column>");
            sb.AppendLine("    <mj-table>");
            sb.AppendLine("      <tr style=\"border-bottom: 1px solid #ecedee;\">");
            sb.AppendLine("        <th style=\"padding: 10px 0; text-align: left;\">Item</th>");
            sb.AppendLine("        <th style=\"padding: 10px 0; text-align: center;\">Qty</th>");
            sb.AppendLine("        <th style=\"padding: 10px 0; text-align: right;\">Price</th>");
            sb.AppendLine("      </tr>");

            foreach (var item in allLineItems)
            {
                var itemTotal = item.Amount * item.Quantity;
                sb.AppendLine("      <tr style=\"border-bottom: 1px solid #ecedee;\">");
                sb.AppendLine($"        <td style=\"padding: 10px 0;\">{HtmlEncode(item.Name ?? item.Sku)}</td>");
                sb.AppendLine($"        <td style=\"padding: 10px 0; text-align: center;\">{item.Quantity}</td>");
                sb.AppendLine($"        <td style=\"padding: 10px 0; text-align: right;\">{currencySymbol}{itemTotal:N2}</td>");
                sb.AppendLine("      </tr>");
            }

            sb.AppendLine("    </mj-table>");
            sb.AppendLine("  </mj-column>");
            sb.AppendLine("</mj-section>");
        }

        // Calculate shipping total from orders
        var shippingTotal = invoice.Orders?.Sum(o => o.ShippingCost) ?? 0;

        // Totals
        sb.AppendLine("<mj-section padding=\"10px 20px\">");
        sb.AppendLine("  <mj-column>");
        sb.AppendLine("    <mj-table>");

        sb.AppendLine("      <tr>");
        sb.AppendLine($"        <td style=\"padding: 5px 0;\">Subtotal</td>");
        sb.AppendLine($"        <td style=\"padding: 5px 0; text-align: right;\">{currencySymbol}{invoice.SubTotal:N2}</td>");
        sb.AppendLine("      </tr>");

        if (invoice.Tax > 0)
        {
            sb.AppendLine("      <tr>");
            sb.AppendLine($"        <td style=\"padding: 5px 0;\">Tax</td>");
            sb.AppendLine($"        <td style=\"padding: 5px 0; text-align: right;\">{currencySymbol}{invoice.Tax:N2}</td>");
            sb.AppendLine("      </tr>");
        }

        if (shippingTotal > 0)
        {
            sb.AppendLine("      <tr>");
            sb.AppendLine($"        <td style=\"padding: 5px 0;\">Shipping</td>");
            sb.AppendLine($"        <td style=\"padding: 5px 0; text-align: right;\">{currencySymbol}{shippingTotal:N2}</td>");
            sb.AppendLine("      </tr>");
        }

        if (invoice.Discount > 0)
        {
            sb.AppendLine("      <tr>");
            sb.AppendLine($"        <td style=\"padding: 5px 0;\">Discount</td>");
            sb.AppendLine($"        <td style=\"padding: 5px 0; text-align: right;\">-{currencySymbol}{invoice.Discount:N2}</td>");
            sb.AppendLine("      </tr>");
        }

        sb.AppendLine("      <tr style=\"border-top: 2px solid #333;\">");
        sb.AppendLine($"        <td style=\"padding: 10px 0; font-weight: bold;\">Total</td>");
        sb.AppendLine($"        <td style=\"padding: 10px 0; text-align: right; font-weight: bold; font-size: 18px;\">{currencySymbol}{invoice.Total:N2}</td>");
        sb.AppendLine("      </tr>");

        sb.AppendLine("    </mj-table>");
        sb.AppendLine("  </mj-column>");
        sb.AppendLine("</mj-section>");

        return new HtmlString(sb.ToString());
    }

    public IHtmlContent AddressBlock(Address? address, string? title = null)
    {
        if (address == null)
        {
            return HtmlString.Empty;
        }

        var sb = new StringBuilder();

        if (!string.IsNullOrEmpty(title))
        {
            sb.AppendLine($"<mj-text font-weight=\"bold\" padding-bottom=\"5px\">{HtmlEncode(title)}</mj-text>");
        }

        sb.AppendLine("<mj-text padding-top=\"0\">");

        if (!string.IsNullOrEmpty(address.Name))
            sb.AppendLine($"  {HtmlEncode(address.Name)}<br/>");
        if (!string.IsNullOrEmpty(address.Company))
            sb.AppendLine($"  {HtmlEncode(address.Company)}<br/>");
        if (!string.IsNullOrEmpty(address.AddressOne))
            sb.AppendLine($"  {HtmlEncode(address.AddressOne)}<br/>");
        if (!string.IsNullOrEmpty(address.AddressTwo))
            sb.AppendLine($"  {HtmlEncode(address.AddressTwo)}<br/>");

        var cityState = new List<string>();
        if (!string.IsNullOrEmpty(address.TownCity)) cityState.Add(address.TownCity);
        if (!string.IsNullOrEmpty(address.CountyState?.Name)) cityState.Add(address.CountyState.Name);
        if (cityState.Count > 0)
            sb.AppendLine($"  {HtmlEncode(string.Join(", ", cityState))}<br/>");
        if (!string.IsNullOrEmpty(address.PostalCode))
            sb.AppendLine($"  {HtmlEncode(address.PostalCode)}<br/>");
        if (!string.IsNullOrEmpty(address.Country))
            sb.AppendLine($"  {HtmlEncode(address.Country)}");

        sb.AppendLine("</mj-text>");

        return new HtmlString(sb.ToString());
    }

    public IHtmlContent LineItemsTable(IEnumerable<LineItem> items, string? currencySymbol = null)
    {
        var symbol = currencySymbol ?? "£";
        var sb = new StringBuilder();

        sb.AppendLine("<mj-table>");
        sb.AppendLine("  <tr style=\"border-bottom: 1px solid #ecedee;\">");
        sb.AppendLine("    <th style=\"padding: 10px 0; text-align: left;\">Item</th>");
        sb.AppendLine("    <th style=\"padding: 10px 0; text-align: center;\">Qty</th>");
        sb.AppendLine("    <th style=\"padding: 10px 0; text-align: right;\">Price</th>");
        sb.AppendLine("  </tr>");

        foreach (var item in items)
        {
            var itemTotal = item.Amount * item.Quantity;
            sb.AppendLine("  <tr style=\"border-bottom: 1px solid #ecedee;\">");
            sb.AppendLine($"    <td style=\"padding: 10px 0;\">{HtmlEncode(item.Name ?? item.Sku)}</td>");
            sb.AppendLine($"    <td style=\"padding: 10px 0; text-align: center;\">{item.Quantity}</td>");
            sb.AppendLine($"    <td style=\"padding: 10px 0; text-align: right;\">{symbol}{itemTotal:N2}</td>");
            sb.AppendLine("  </tr>");
        }

        sb.AppendLine("</mj-table>");

        return new HtmlString(sb.ToString());
    }

    private static string HtmlEncode(string? value)
    {
        return HtmlEncoder.Default.Encode(value ?? string.Empty);
    }
}
