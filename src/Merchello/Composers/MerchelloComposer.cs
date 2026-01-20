using System.Threading.RateLimiting;
using Asp.Versioning;
using Merchello.Core.Data;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc.ApiExplorer;
using Microsoft.AspNetCore.Mvc.Controllers;
using Microsoft.AspNetCore.Mvc.Razor;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.Extensions.Options;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;
using Microsoft.OpenApi;
using Swashbuckle.AspNetCore.SwaggerGen;
using Umbraco.Cms.Core;
using Umbraco.Cms.Core.Composing;
using Umbraco.Cms.Core.DependencyInjection;
using Umbraco.Cms.Core.Events;
using Umbraco.Cms.Core.Notifications;
using Umbraco.Cms.Core.Services;
using Umbraco.Cms.Api.Management.OpenApi;
using Umbraco.Cms.Api.Common.OpenApi;
using Merchello.Middleware;

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
    ///   <item><description>Configures Swagger/OpenAPI for the backoffice API</description></item>
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
            });

            // =====================================================
            // Swagger/OpenAPI Configuration
            // =====================================================

            // Custom operation ID handler for cleaner Swagger method names
            builder.Services.AddSingleton<IOperationIdHandler, CustomOperationHandler>();

            // Configure Swagger/OpenAPI documentation for the Merchello backoffice API
            builder.Services.Configure<SwaggerGenOptions>(opt =>
            {
                // Related documentation:
                // https://docs.umbraco.com/umbraco-cms/tutorials/creating-a-backoffice-api
                // https://docs.umbraco.com/umbraco-cms/tutorials/creating-a-backoffice-api/adding-a-custom-swagger-document
                // https://docs.umbraco.com/umbraco-cms/tutorials/creating-a-backoffice-api/versioning-your-api
                // https://docs.umbraco.com/umbraco-cms/tutorials/creating-a-backoffice-api/access-policies

                // Configure the Swagger generation options
                // Add in a new Swagger API document solely for our own package that can be browsed via Swagger UI
                // Along with having a generated swagger JSON file that we can use to auto generate a TypeScript client
                opt.SwaggerDoc(Core.Constants.ApiName, new OpenApiInfo
                {
                    Title = "Merchello Backoffice API",
                    Version = "1.0",
                });

                // Enable Umbraco authentication for the Merchello Swagger document
                opt.OperationFilter<MerchelloOperationSecurityFilter>();
            });
        }

        public class MerchelloOperationSecurityFilter : BackOfficeSecurityRequirementsOperationFilterBase
        {
            protected override string ApiName => Core.Constants.ApiName;
        }

        // This is used to generate nice operation IDs in our swagger json file
        // So that the generated TypeScript client has nice method names and not too verbose
        // https://docs.umbraco.com/umbraco-cms/tutorials/creating-a-backoffice-api/umbraco-schema-and-operation-ids#operation-ids
        public class CustomOperationHandler : OperationIdHandler
        {
            public CustomOperationHandler(IOptions<ApiVersioningOptions> apiVersioningOptions) : base(apiVersioningOptions)
            {
            }

            protected override bool CanHandle(ApiDescription apiDescription, ControllerActionDescriptor controllerActionDescriptor)
            {
                return controllerActionDescriptor.ControllerTypeInfo.Namespace?.StartsWith("Merchello.Controllers", comparisonType: StringComparison.InvariantCultureIgnoreCase) is true;
            }

            public override string Handle(ApiDescription apiDescription) => $"{apiDescription.ActionDescriptor.RouteValues["action"]}";
        }
    }

    /// <summary>
    /// Startup filter that adds Merchello middleware to the request pipeline.
    /// This allows middleware to be added from the NuGet package without requiring
    /// changes to the consuming application's Program.cs.
    /// </summary>
    public class MerchelloStartupFilter : IStartupFilter
    {
        public Action<IApplicationBuilder> Configure(Action<IApplicationBuilder> next)
        {
            return app =>
            {
                // Add rate limiter middleware before other middleware
                app.UseRateLimiter();

                // Add agent authentication middleware for protocol requests
                app.UseAgentAuthentication();

                // Continue with the rest of the pipeline
                next(app);
            };
        }
    }

    /// <summary>
    /// Notification handler that initializes Merchello DataTypes on application startup.
    /// This ensures required DataTypes (like the Product Description TipTap editor) exist.
    /// </summary>
    public class InitializeMerchelloDataTypesHandler(
        MerchelloDataTypeInitializer initializer,
        ILogger<InitializeMerchelloDataTypesHandler> logger,
        IRuntimeState runtimeState)
        : INotificationAsyncHandler<UmbracoApplicationStartedNotification>
    {
        public async Task HandleAsync(UmbracoApplicationStartedNotification notification, CancellationToken cancellationToken)
        {
            // Skip if Umbraco isn't fully installed/running
            if (runtimeState.Level != RuntimeLevel.Run)
            {
                logger.LogDebug("Skipping DataType initialization - Umbraco runtime level is {Level}", runtimeState.Level);
                return;
            }

            try
            {
                var dataTypeKey = await initializer.EnsureProductDescriptionDataTypeExistsAsync(cancellationToken);
                logger.LogInformation("Merchello DataTypes initialized. Product Description DataType: {Key}", dataTypeKey);
            }
            catch (Exception ex)
            {
                logger.LogError(ex, "Failed to initialize Merchello DataTypes");
                // Don't throw - allow app to continue even if DataType creation fails
                // The frontend will handle the missing DataType gracefully
            }
        }
    }
}
