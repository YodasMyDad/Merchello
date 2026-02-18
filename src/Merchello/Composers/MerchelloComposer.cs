using System.Threading.RateLimiting;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc.Razor;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.OpenApi;
using Swashbuckle.AspNetCore.SwaggerGen;
using Umbraco.Cms.Core.Composing;
using Umbraco.Cms.Core.DependencyInjection;
using Umbraco.Cms.Api.Common.OpenApi;
using Umbraco.Cms.Api.Management.OpenApi;

namespace Merchello.Composers
{
    /// <summary>
    /// Main Merchello composer for Umbraco web applications.
    /// </summary>
    /// <remarks>
    /// <para>This composer registers Merchello with Umbraco and configures web-specific settings:</para>
    /// <list type="bullet">
    ///   <item><description>Calls AddMerch() to register all Merchello services, handlers, and content finders</description></item>
    ///   <item><description>Configures rate limiting for download endpoints</description></item>
    ///   <item><description>Configures Razor view locations for email templates</description></item>
    ///   <item><description>Configures Swagger/OpenAPI for backoffice and storefront APIs</description></item>
    /// </list>
    /// <para>
    /// All service registrations are centralized in Startup.AddMerch().
    /// Database-specific composers (EFCoreSqlServerComposer, EFCoreSqliteComposer) handle
    /// migration providers separately based on the configured database provider.
    /// </para>
    /// </remarks>
    public class MerchelloComposer : IComposer
    {
        public void Compose(IUmbracoBuilder builder)
        {
            // =====================================================
            // Core Services & Handlers
            // =====================================================
            // Registers all Merchello services, factories, background jobs,
            // notification handlers, startup handlers, and content finders.
            // See Merchello.Startup.AddMerch() for full registration details.

            builder.AddMerch();

            // =====================================================
            // Rate Limiting
            // =====================================================
            // Configure rate limiting for download endpoints to prevent abuse.
            // Middleware is auto-registered via MerchelloStartupFilter.

            builder.Services.AddRateLimiter(options =>
            {
                // Fixed window limiter for download endpoint
                options.AddFixedWindowLimiter("downloads", limiterOptions =>
                {
                    limiterOptions.PermitLimit = 30;                    // 30 requests
                    limiterOptions.Window = TimeSpan.FromMinutes(1);    // per minute
                    limiterOptions.QueueProcessingOrder = QueueProcessingOrder.OldestFirst;
                    limiterOptions.QueueLimit = 5;                      // Allow 5 queued requests
                });

                options.OnRejected = async (context, token) =>
                {
                    context.HttpContext.Response.StatusCode = 429; // TooManyRequests
                    await context.HttpContext.Response.WriteAsync(
                        "Too many download requests. Please wait before trying again.", token);
                };
            });

            // Register startup filter to add rate limiter middleware to pipeline
            builder.Services.AddTransient<IStartupFilter, MerchelloStartupFilter>();

            // =====================================================
            // Razor View Locations
            // =====================================================

            // Add standard MVC view locations for Razor views
            builder.Services.Configure<RazorViewEngineOptions>(options =>
            {
                options.ViewLocationFormats.Add("/Views/{1}/{0}.cshtml");
                options.ViewLocationFormats.Add("/Views/Shared/{0}.cshtml");
                // Email template locations
                options.ViewLocationFormats.Add("/Views/Emails/{0}.cshtml");
                options.ViewLocationFormats.Add("/Views/Emails/Shared/{0}.cshtml");
                options.ViewLocationFormats.Add("/App_Plugins/Merchello/Views/Emails/{0}.cshtml");
                options.ViewLocationFormats.Add("/App_Plugins/Merchello/Views/Emails/Shared/{0}.cshtml");
            });

            // =====================================================
            // Swagger/OpenAPI Configuration
            // =====================================================

            // Custom operation ID handler for cleaner Swagger method names
            builder.Services.AddSingleton<IOperationIdHandler, CustomOperationHandler>();

            // Configure Swagger/OpenAPI documentation for Merchello APIs
            builder.Services.Configure<SwaggerGenOptions>(opt =>
            {
                // Related documentation:
                // https://docs.umbraco.com/umbraco-cms/tutorials/creating-a-backoffice-api
                // https://docs.umbraco.com/umbraco-cms/tutorials/creating-a-backoffice-api/adding-a-custom-swagger-document
                // https://docs.umbraco.com/umbraco-cms/tutorials/creating-a-backoffice-api/versioning-your-api
                // https://docs.umbraco.com/umbraco-cms/tutorials/creating-a-backoffice-api/access-policies

                // Backoffice API document (requires Umbraco backoffice auth)
                opt.SwaggerDoc(Core.Constants.ApiName, new OpenApiInfo
                {
                    Title = "Merchello Backoffice API",
                    Version = "1.0",
                });

                // Public/storefront API document for headless implementations
                opt.SwaggerDoc(Core.Constants.StorefrontApiName, new OpenApiInfo
                {
                    Title = "Merchello Storefront API",
                    Version = "1.0",
                    Description = "Public checkout and storefront endpoints for headless clients."
                });

                // Enable Umbraco authentication for the Merchello Swagger document
                opt.OperationFilter<MerchelloOperationSecurityFilter>();
            });
        }

    }
}
