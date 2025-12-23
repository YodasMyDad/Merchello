using Merchello.Core.Shared.Models;
using Merchello.Site.Shared.Controllers;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Options;
using Umbraco.Cms.Core.Cache;
using Umbraco.Cms.Core.Logging;
using Umbraco.Cms.Core.Routing;
using Umbraco.Cms.Core.Services;
using Umbraco.Cms.Core.Web;
using Umbraco.Cms.Infrastructure.Persistence;

namespace Merchello.Site.Home.Controllers;

public class HomeController(
    IOptions<MerchelloSettings> options,
    IUmbracoContextAccessor umbracoContextAccessor,
    IUmbracoDatabaseFactory databaseFactory,
    ServiceContext services,
    AppCaches appCaches,
    IProfilingLogger profilingLogger,
    IPublishedUrlProvider publishedUrlProvider)
    : BaseController(options, umbracoContextAccessor, databaseFactory, services, appCaches, profilingLogger,
        publishedUrlProvider)
{
    public IActionResult Home(Umbraco.Cms.Web.Common.PublishedModels.Home model)
    {
        return CurrentTemplate(model);
    }
}
