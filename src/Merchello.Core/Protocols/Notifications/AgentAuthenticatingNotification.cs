using Merchello.Core.Notifications.Base;
using Microsoft.AspNetCore.Http;

namespace Merchello.Core.Protocols.Notifications;

/// <summary>
/// Notification fired before agent authentication completes.
/// Handlers can cancel to reject the agent.
/// </summary>
public class AgentAuthenticatingNotification : MerchelloCancelableNotification<HttpRequest>
{
    public AgentAuthenticatingNotification(HttpRequest request, string protocol, string? agentId)
        : base(request)
    {
        Protocol = protocol;
        AgentId = agentId;
    }

    /// <summary>
    /// The protocol being used (e.g., "ucp").
    /// </summary>
    public string Protocol { get; }

    /// <summary>
    /// The agent identifier, if available from the request.
    /// </summary>
    public string? AgentId { get; }
}
