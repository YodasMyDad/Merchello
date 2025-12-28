using Merchello.Core.Checkout.Models;
using Umbraco.Cms.Core.Models.PublishedContent;

namespace Merchello.Models;

/// <summary>
/// Virtual IPublishedContent for checkout pages.
/// Required for Umbraco's routing pipeline and Layout compatibility.
/// </summary>
public class MerchelloCheckoutPage : IPublishedContent
{
    public MerchelloCheckoutPage(CheckoutStep step, Guid? invoiceId = null)
    {
        Step = step;
        InvoiceId = invoiceId;
    }

    /// <summary>
    /// The current checkout step.
    /// </summary>
    public CheckoutStep Step { get; }

    /// <summary>
    /// The invoice ID for the confirmation step (extracted from /checkout/confirmation/{invoiceId}).
    /// </summary>
    public Guid? InvoiceId { get; }

    // Route hijacking trigger - Umbraco finds MerchelloCheckoutController
    public IPublishedContentType ContentType => MerchelloCheckoutContentType.Instance;

    // No element properties for checkout
    public IEnumerable<IPublishedProperty> Properties => [];

    public IPublishedProperty? GetProperty(string alias) => null;

    // IPublishedElement implementation
    public Guid Key => new("00000000-0000-0000-C0EC-000000000001");

    // IPublishedContent - Required for Layout compatibility
    public int Id => Step.GetHashCode();
    public string Name => Step switch
    {
        CheckoutStep.Information => "Checkout - Information",
        CheckoutStep.Shipping => "Checkout - Shipping",
        CheckoutStep.Payment => "Checkout - Payment",
        CheckoutStep.Confirmation => "Checkout - Confirmation",
        _ => "Checkout"
    };
    public string? UrlSegment => Step.ToString().ToLowerInvariant();
    public int SortOrder => 0;
    public int Level => 1;
    public string Path => $"-1,{Id}";
    public int? TemplateId => null;
    public int CreatorId => -1;
    public DateTime CreateDate => DateTime.MinValue;
    public int WriterId => -1;
    public DateTime UpdateDate => DateTime.UtcNow;

    public IReadOnlyDictionary<string, PublishedCultureInfo> Cultures =>
        new Dictionary<string, PublishedCultureInfo>();

    public PublishedItemType ItemType => PublishedItemType.Content;

    [Obsolete("Use IPublishedContent.ChildrenForAllCultures property instead")]
    public IPublishedContent? Parent => null;

    [Obsolete("Use IPublishedContent.ChildrenForAllCultures property instead")]
    public IEnumerable<IPublishedContent> Children => [];

    public IEnumerable<IPublishedContent> ChildrenForAllCultures => [];

    public bool IsDraft(string? culture = null) => false;
    public bool IsPublished(string? culture = null) => true;
}
