using Asp.Versioning;
using Merchello.Core;
using Merchello.Core.Accounting.Handlers;
using Merchello.Core.Checkout.Services.Interfaces;
using Merchello.Core.Data;
using Merchello.Core.Data.Handlers;
using Merchello.Core.Payments.Handlers;
using Merchello.Core.Tax.Handlers;
using Merchello.Email.Services;
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
    /// <summary>
    /// Main Merchello composer for Umbraco web applications.
    /// </summary>
    /// <remarks>
    /// <para>This composer handles web-specific registrations that require Umbraco.Cms.Web.Common:</para>
    /// <list type="bullet">
    ///   <item><description>Calls AddMerch() to register all core Merchello services</description></item>
    ///   <item><description>Registers web-specific services (e.g., CheckoutMemberService)</description></item>
    ///   <item><description>Configures startup handlers (migrations, seeding, data types)</description></item>
    ///   <item><description>Registers content finders for product and checkout URL routing</description></item>
    ///   <item><description>Configures Swagger/OpenAPI for the backoffice API</description></item>
    /// </list>
    /// <para>
    /// Database-specific composers (EFCoreSqlServerComposer, EFCoreSqliteComposer) handle
    /// migration providers separately based on the configured database provider.
    /// </para>
    /// </remarks>
    public class MerchelloComposer : IComposer
    {
        public void Compose(IUmbracoBuilder builder)
        {
            // =====================================================
            // Core Services
            // =====================================================
            // Registers all Merchello services, factories, and background jobs.
            // See Merchello.Core.Startup.AddMerch() for full registration details.

            builder.AddMerch();

            // =====================================================
            // Web-Specific Services
            // =====================================================
            // Services that require Umbraco.Cms.Web.Common (not available in Core project).

            // CheckoutMemberService requires IMemberSignInManager for member authentication
            builder.Services.AddScoped<ICheckoutMemberService, CheckoutMemberService>();

            // EmailRazorViewRenderer for rendering email templates with MJML support
            builder.Services.AddScoped<IEmailRazorViewRenderer, EmailRazorViewRenderer>();

            // =====================================================
            // Startup Notification Handlers
            // =====================================================
            // These run once when Umbraco starts, in registration order.

            // 1. Run EF Core migrations to ensure database schema is up to date
            builder.AddNotificationAsyncHandler<UmbracoApplicationStartedNotification, RunMerchMigration>();

            // 2. Seed initial data (countries, currencies, etc.) if database is empty
            builder.AddNotificationAsyncHandler<UmbracoApplicationStartedNotification, SeedDataNotificationHandler>();

            // 3. Ensure built-in payment providers (Manual Payment) exist and are enabled
            builder.AddNotificationAsyncHandler<UmbracoApplicationStartedNotification, EnsureBuiltInPaymentProvidersHandler>();

            // 4. Initialize Merchello DataTypes (Product Description TipTap editor)
            builder.Services.AddSingleton<MerchelloDataTypeInitializer>();
            builder.AddNotificationAsyncHandler<UmbracoApplicationStartedNotification, InitializeMerchelloDataTypesHandler>();

            // 5. Seed US shipping tax overrides (states where shipping is not taxable)
            builder.AddNotificationAsyncHandler<UmbracoApplicationStartedNotification, EnsureShippingTaxOverridesHandler>();

            // =====================================================
            // Front-End Rendering
            // =====================================================
            // Factories and services for rendering products on the public storefront.

            builder.Services.AddScoped<MerchelloPublishedElementFactory>();
            builder.Services.AddScoped<IMerchelloViewModelFactory, MerchelloViewModelFactory>();
            builder.Services.AddSingleton<IRichTextRenderer, RichTextRenderer>();

            // =====================================================
            // Content Finders (URL Routing)
            // =====================================================
            // Custom content finders for product and checkout URL routing.

            builder.ContentFinders().InsertAfter<ContentFinderByUrlNew, ProductContentFinder>();
            builder.ContentFinders().InsertAfter<ProductContentFinder, CheckoutContentFinder>();

            // =====================================================
            // Razor & Swagger Configuration
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
