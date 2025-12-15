using Merchello.Models;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.ViewEngines;
using Microsoft.Extensions.Logging;
using Umbraco.Cms.Core.Web;
using Umbraco.Cms.Web.Common.Controllers;

namespace Merchello.Controllers;

/// <summary>
/// Renders product pages using the ViewAlias stored on ProductRoot.
/// Automatically invoked via Umbraco's route hijacking when ContentType.Alias = "MerchelloProduct".
/// </summary>
public class MerchelloProductController(
    ILogger<MerchelloProductController> logger,
    ICompositeViewEngine compositeViewEngine,
    IUmbracoContextAccessor umbracoContextAccessor)
    : RenderController(logger, compositeViewEngine, umbracoContextAccessor)
{
    /// <summary>
    /// Renders the product view using the ViewAlias from ProductRoot.
    /// </summary>
    public override IActionResult Index()
    {
        if (CurrentPage is not MerchelloPublishedProduct product)
        {
            logger.LogWarning("CurrentPage is not a MerchelloPublishedProduct");
            return NotFound();
        }

        var viewModel = CreateViewModel(product);
        var viewPath = ResolveViewPath(product);

        logger.LogDebug("Rendering product {ProductName} with view {ViewPath}",
            product.Name, viewPath);

        return View(viewPath, viewModel);
    }

    /// <summary>
    /// Creates the view model for the product. Override to customize or extend the model.
    /// </summary>
    /// <param name="product">The MerchelloPublishedProduct from route hijacking</param>
    /// <returns>The view model to pass to the Razor view</returns>
    protected virtual MerchelloProductViewModel CreateViewModel(MerchelloPublishedProduct product)
    {
        return product.ViewModel;
    }

    /// <summary>
    /// Resolves the view path for the product. Override to customize view resolution logic.
    /// </summary>
    /// <param name="product">The MerchelloPublishedProduct from route hijacking</param>
    /// <returns>The view path (e.g., ~/Views/Products/Gallery.cshtml)</returns>
    protected virtual string ResolveViewPath(MerchelloPublishedProduct product)
    {
        var viewAlias = product.ViewAlias ?? "Default";
        return $"~/Views/Products/{viewAlias}.cshtml";
    }
}
