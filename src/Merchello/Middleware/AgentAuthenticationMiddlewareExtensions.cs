using Microsoft.AspNetCore.Builder;

namespace Merchello.Middleware;

/// <summary>
/// Extension methods for adding agent authentication middleware.
/// </summary>
public static class AgentAuthenticationMiddlewareExtensions
{
    /// <summary>
    /// Adds agent authentication middleware to the pipeline.
    /// </summary>
    public static IApplicationBuilder UseAgentAuthentication(this IApplicationBuilder app)
    {
        return app.UseMiddleware<AgentAuthenticationMiddleware>();
    }
}
