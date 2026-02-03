using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.Abstractions;
using Microsoft.AspNetCore.Mvc.ModelBinding;
using Microsoft.AspNetCore.Mvc.Razor;
using Microsoft.AspNetCore.Mvc.Rendering;
using Microsoft.AspNetCore.Mvc.ViewFeatures;
using Microsoft.AspNetCore.Routing;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using Merchello.Core.Email;
using Merchello.Core.Email.Services.Interfaces;

namespace Merchello.Email.Services;

/// <summary>
/// Renders Razor views to strings for email templates.
/// If the rendered output is MJML markup, it is automatically compiled to responsive HTML.
/// </summary>
public class EmailRazorViewRenderer(
    IHttpContextAccessor httpContextAccessor,
    IModelMetadataProvider modelMetadataProvider,
    ITempDataDictionaryFactory tempDataDictionaryFactory,
    IServiceProvider serviceProvider,
    IOptions<EmailSettings> emailSettings,
    IMjmlCompiler mjmlCompiler,
    ILogger<EmailRazorViewRenderer> logger) : IEmailTemplateRenderer
{
    private readonly EmailSettings _settings = emailSettings.Value;

    public async Task<string> RenderAsync(string viewPath, object model, CancellationToken ct = default)
    {
        var httpContext = httpContextAccessor.HttpContext;
        if (httpContext == null)
        {
            // Create a minimal HTTP context for background job scenarios
            httpContext = CreateMinimalHttpContext();
        }

        var razorViewEngine = httpContext.RequestServices.GetRequiredService<IRazorViewEngine>();

        // Try to find the view in configured locations
        var fullViewPath = ResolveViewPath(viewPath, razorViewEngine);
        if (fullViewPath == null)
        {
            logger.LogError("Email template not found: {ViewPath}. Searched in: {Locations}",
                viewPath, string.Join(", ", _settings.TemplateViewLocations));
            throw new FileNotFoundException($"Email template not found: {viewPath}");
        }

        var viewResult = razorViewEngine.GetView(null, fullViewPath, false);
        if (viewResult.View == null)
        {
            logger.LogError("Failed to get view for path: {ViewPath}", fullViewPath);
            throw new InvalidOperationException($"Failed to load email template: {fullViewPath}");
        }

        var viewData = new ViewDataDictionary(modelMetadataProvider, new ModelStateDictionary())
        {
            Model = model
        };

        var tempData = tempDataDictionaryFactory.GetTempData(httpContext);
        var routeData = httpContext.GetRouteData() ?? new RouteData();
        var actionContext = new ActionContext(httpContext, routeData, new ActionDescriptor());

        await using var writer = new StringWriter();
        var viewContext = new ViewContext(
            actionContext,
            viewResult.View,
            viewData,
            tempData,
            writer,
            new HtmlHelperOptions());

        await viewResult.View.RenderAsync(viewContext);
        var renderedContent = writer.ToString();

        // If the rendered content is MJML, compile it to responsive HTML
        if (mjmlCompiler.IsMjml(renderedContent))
        {
            logger.LogDebug("Compiling MJML template: {ViewPath}", viewPath);
            var result = mjmlCompiler.Compile(renderedContent);

            if (!result.Success)
            {
                logger.LogWarning("MJML compilation had errors for {ViewPath}: {Errors}",
                    viewPath, string.Join("; ", (IEnumerable<string>)result.Errors));
            }

            return result.Html;
        }

        return renderedContent;
    }

    public bool ViewExists(string viewPath)
    {
        var httpContext = httpContextAccessor.HttpContext;
        if (httpContext == null)
        {
            httpContext = CreateMinimalHttpContext();
        }

        var razorViewEngine = httpContext.RequestServices.GetRequiredService<IRazorViewEngine>();
        return ResolveViewPath(viewPath, razorViewEngine) != null;
    }

    /// <summary>
    /// Resolves the view path by searching configured template locations.
    /// </summary>
    private string? ResolveViewPath(string viewPath, IRazorViewEngine razorViewEngine)
    {
        // If it's already a full path, try it directly
        if (viewPath.StartsWith("~/") || viewPath.StartsWith("/"))
        {
            var result = razorViewEngine.GetView(null, viewPath, false);
            return result.View != null ? viewPath : null;
        }

        // Search in configured locations
        foreach (var location in _settings.TemplateViewLocations)
        {
            var fullPath = string.Format(location, Path.GetFileNameWithoutExtension(viewPath));

            // Ensure .cshtml extension
            if (!fullPath.EndsWith(".cshtml", StringComparison.OrdinalIgnoreCase))
                fullPath += ".cshtml";

            var result = razorViewEngine.GetView(null, fullPath, false);
            if (result.View != null)
                return fullPath;
        }

        // Try with original path as-is in case it includes the folder
        foreach (var location in _settings.TemplateViewLocations)
        {
            var basePath = location.Replace("{0}.cshtml", "").Replace("{0}", "").TrimEnd('/');
            var fullPath = $"{basePath}/{viewPath}";

            if (!fullPath.EndsWith(".cshtml", StringComparison.OrdinalIgnoreCase))
                fullPath += ".cshtml";

            var result = razorViewEngine.GetView(null, fullPath, false);
            if (result.View != null)
                return fullPath;
        }

        return null;
    }

    /// <summary>
    /// Creates a minimal HTTP context for rendering views outside of a request.
    /// This is needed for background job scenarios.
    /// </summary>
    private HttpContext CreateMinimalHttpContext()
    {
        var httpContext = new DefaultHttpContext
        {
            RequestServices = serviceProvider
        };

        return httpContext;
    }
}
