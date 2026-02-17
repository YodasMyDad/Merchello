using Merchello.Core.Products.Models;

namespace Merchello.Core.ProductFeeds.Models;

public class ProductFeedResolverContext
{
    public Product Product { get; set; } = null!;
    public ProductRoot ProductRoot { get; set; } = null!;
    public ProductFeed Feed { get; set; } = null!;
}