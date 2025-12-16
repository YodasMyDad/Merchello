using Asp.Versioning;
using Merchello.Core;
using Merchello.Core.Accounting.Handlers;
using Merchello.Core.Data;
using Merchello.Core.Data.Handlers;
using Merchello.Factories;
using Merchello.Routing;
using Merchello.Services;
using Microsoft.AspNetCore.Mvc.ApiExplorer;
using Microsoft.AspNetCore.Mvc.Controllers;
using Microsoft.AspNetCore.Mvc.Razor;
using Microsoft.Extensions.Options;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;
using Microsoft.OpenApi;
using Swashbuckle.AspNetCore.SwaggerGen;
using Umbraco.Cms.Core.Composing;
using Umbraco.Cms.Core.DependencyInjection;
using Umbraco.Cms.Core.Events;
using Umbraco.Cms.Core.Notifications;
using Umbraco.Cms.Api.Management.OpenApi;
using Umbraco.Cms.Api.Common.OpenApi;
using Umbraco.Cms.Core.Routing;

namespace Merchello.Composers
{
    public class MerchelloComposer : IComposer
    {
        public void Compose(IUmbracoBuilder builder)
        {
            // Register all Merchello services, DbContext, and dependencies
            builder.AddMerch();

            // Register Merchello EF Core migration handler
            builder.AddNotificationAsyncHandler<UmbracoApplicationStartedNotification, RunMerchMigration>();

            // Register seed data handler (runs after migrations, only seeds if no data exists)
            builder.AddNotificationAsyncHandler<UmbracoApplicationStartedNotification, SeedDataNotificationHandler>();

            // Register DataType initializer (ensures Product Description TipTap DataType exists)
            builder.Services.AddSingleton<MerchelloDataTypeInitializer>();
            builder.AddNotificationAsyncHandler<UmbracoApplicationStartedNotification, InitializeMerchelloDataTypesHandler>();

            // Register factories for front-end product rendering (Phase 4)
            builder.Services.AddScoped<MerchelloPublishedElementFactory>();
            builder.Services.AddScoped<IMerchelloViewModelFactory, MerchelloViewModelFactory>();

            // Register rich text renderer for TipTap content rendering
            builder.Services.AddSingleton<IRichTextRenderer, RichTextRenderer>();

            // Register ProductContentFinder for front-end product URL routing
            builder.ContentFinders().InsertAfter<ContentFinderByUrlNew, ProductContentFinder>();

            // Configure Razor to find views in standard MVC locations
            builder.Services.Configure<RazorViewEngineOptions>(options =>
            {
                options.ViewLocationFormats.Add("/Views/{1}/{0}.cshtml");
                options.ViewLocationFormats.Add("/Views/Shared/{0}.cshtml");
            });

            builder.Services.AddSingleton<IOperationIdHandler, CustomOperationHandler>();

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
                opt.SwaggerDoc(Constants.ApiName, new OpenApiInfo
                {
                    Title = "Merchello Backoffice API",
                    Version = "1.0",
                    // Contact = new OpenApiContact
                    // {
                    //     Name = "Some Developer",
                    //     Email = "you@company.com",
                    //     Url = new Uri("https://company.com")
                    // }
                });

                // Enable Umbraco authentication for the "Example" Swagger document
                // PR: https://github.com/umbraco/Umbraco-CMS/pull/15699
                opt.OperationFilter<MerchelloOperationSecurityFilter>();
            });
        }

        public class MerchelloOperationSecurityFilter : BackOfficeSecurityRequirementsOperationFilterBase
        {
            protected override string ApiName => Constants.ApiName;
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
    /// Notification handler that initializes Merchello DataTypes on application startup.
    /// This ensures required DataTypes (like the Product Description TipTap editor) exist.
    /// </summary>
    public class InitializeMerchelloDataTypesHandler(
        MerchelloDataTypeInitializer initializer,
        ILogger<InitializeMerchelloDataTypesHandler> logger)
        : INotificationAsyncHandler<UmbracoApplicationStartedNotification>
    {
        public async Task HandleAsync(UmbracoApplicationStartedNotification notification, CancellationToken cancellationToken)
        {
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
