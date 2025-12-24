using Merchello.Core.Products.Models;

namespace Umbraco.Cms.Web.Common.PublishedModels;

/// <summary>
/// Home page view model with best sellers data
/// </summary>
public partial class Home
{
    /// <summary>
    /// Best selling products for display on the home page
    /// </summary>
    public List<Product> BestSellers { get; set; } = [];
}
