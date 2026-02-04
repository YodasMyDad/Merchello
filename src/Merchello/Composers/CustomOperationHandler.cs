using Asp.Versioning;
using Microsoft.AspNetCore.Mvc.ApiExplorer;
using Microsoft.AspNetCore.Mvc.Controllers;
using Microsoft.Extensions.Options;
using Umbraco.Cms.Api.Common.OpenApi;

namespace Merchello.Composers;

// Generates concise operation IDs in the generated OpenAPI document.
public class CustomOperationHandler(IOptions<ApiVersioningOptions> apiVersioningOptions)
    : OperationIdHandler(apiVersioningOptions)
{
    protected override bool CanHandle(ApiDescription apiDescription, ControllerActionDescriptor controllerActionDescriptor)
    {
        return controllerActionDescriptor.ControllerTypeInfo.Namespace?.StartsWith(
            "Merchello.Controllers",
            comparisonType: StringComparison.InvariantCultureIgnoreCase) is true;
    }

    public override string Handle(ApiDescription apiDescription)
        => $"{apiDescription.ActionDescriptor.RouteValues["action"]}";
}
