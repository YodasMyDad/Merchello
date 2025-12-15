using Umbraco.Cms.Core.Composing;
using Umbraco.Cms.Core.DependencyInjection;
using Umbraco.Cms.Core.Routing;

namespace Merchello.Routing;

/// <summary>
/// Composer that registers ProductContentFinder in Umbraco's content finder pipeline.
/// Registered after default URL finder so Umbraco content is checked first.
/// </summary>
public class ProductContentFinderComposer : IComposer
{
    public void Compose(IUmbracoBuilder builder)
    {
        builder.ContentFinders().Insert<ProductContentFinder>();
    }
}
