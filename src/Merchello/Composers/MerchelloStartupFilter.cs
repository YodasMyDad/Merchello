using Merchello.Middleware;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Hosting;

namespace Merchello.Composers;

/// <summary>
/// Adds Merchello middleware to the request pipeline after the host opts in via AddMerchello().
/// </summary>
public class MerchelloStartupFilter : IStartupFilter
{
    public Action<IApplicationBuilder> Configure(Action<IApplicationBuilder> next)
    {
        return app =>
        {
            app.UseRateLimiter();
            app.UseAgentAuthentication();
            next(app);
        };
    }
}
