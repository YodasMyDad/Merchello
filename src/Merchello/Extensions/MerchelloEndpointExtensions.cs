using Merchello.Presence;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Routing;

namespace Merchello.Extensions;

public static class MerchelloEndpointExtensions
{
    /// <summary>
    /// Maps Merchello's SignalR endpoints. Called automatically via Umbraco pipeline filter.
    /// </summary>
    public static void MapMerchelloHubs(this IEndpointRouteBuilder endpoints)
    {
        endpoints.MapHub<MerchelloPresenceHub>("/umbraco/merchello/presenceHub");
    }
}
