using Merchello.Core.Reporting.Services.Interfaces;
using Merchello.Site.Shared.Controllers;
using Microsoft.AspNetCore.Mvc;
using Umbraco.Cms.Core.Cache;
using Umbraco.Cms.Core.Logging;
using Umbraco.Cms.Core.Routing;
using Umbraco.Cms.Core.Services;
using Umbraco.Cms.Core.Web;
using Umbraco.Cms.Infrastructure.Persistence;

namespace Merchello.Site.Home.Controllers;

public class HomeController(
    IUmbracoContextAccessor umbracoContextAccessor,
    IUmbracoDatabaseFactory databaseFactory,
    ServiceContext services,
    AppCaches appCaches,
    IProfilingLogger profilingLogger,
    IPublishedUrlProvider publishedUrlProvider,
    IReportingService reportingService)
    : BaseController(umbracoContextAccessor, databaseFactory, services, appCaches, profilingLogger,
        publishedUrlProvider)
{
    public async Task<IActionResult> Home(Umbraco.Cms.Web.Common.PublishedModels.Home model)
    {
        // Query best sellers - all time, top 8 products
        model.BestSellers = await reportingService.GetBestSellersAsync(take: 8);

        return CurrentTemplate(model);
    }
}
