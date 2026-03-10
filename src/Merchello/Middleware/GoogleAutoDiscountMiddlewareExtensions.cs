using Microsoft.AspNetCore.Builder;

namespace Merchello.Middleware;

/// <summary>
/// Extension methods for adding Google auto discount middleware.
/// </summary>
public static class GoogleAutoDiscountMiddlewareExtensions
{
    /// <summary>
    /// Adds Google auto discount middleware to the pipeline.
    /// </summary>
    public static IApplicationBuilder UseGoogleAutoDiscount(this IApplicationBuilder app)
    {
        return app.UseMiddleware<GoogleAutoDiscountMiddleware>();
    }
}
