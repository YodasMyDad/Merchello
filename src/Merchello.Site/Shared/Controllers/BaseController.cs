using Microsoft.AspNetCore.Mvc;
using Umbraco.Cms.Core.Cache;
using Umbraco.Cms.Core.Logging;
using Umbraco.Cms.Core.Routing;
using Umbraco.Cms.Core.Services;
using Umbraco.Cms.Core.Web;
using Umbraco.Cms.Infrastructure.Persistence;
using Umbraco.Cms.Web.Common.Controllers;
using Umbraco.Cms.Web.Website.Controllers;

namespace Merchello.Site.Shared.Controllers;

public class BaseController(IUmbracoContextAccessor umbracoContextAccessor,
    IUmbracoDatabaseFactory databaseFactory,
    ServiceContext services,
    AppCaches appCaches,
    IProfilingLogger profilingLogger,
    IPublishedUrlProvider publishedUrlProvider)
    : SurfaceController(umbracoContextAccessor, databaseFactory, services, appCaches, profilingLogger,
        publishedUrlProvider), IRenderController
{
    /// <summary>
        ///     Locates the template for the given route
        /// </summary>
        /// <typeparam name="T">Model type</typeparam>
        /// <param name="model">Instance of model</param>
        /// <param name="viewName">View name</param>
        /// <returns>Template for given route</returns>
        protected ActionResult CurrentTemplate<T>(T model, string viewName = "")
        {
            if (string.IsNullOrEmpty(viewName))
            {
#pragma warning disable CS8600 // Converting null literal or possible null value to non-nullable type.
                viewName = ControllerContext.RouteData.Values["action"]?.ToString();
#pragma warning restore CS8600 // Converting null literal or possible null value to non-nullable type.
            }

            return View(viewName, model);
        }

    }
