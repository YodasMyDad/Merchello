using Merchello.Core.Notifications.Base;
using Merchello.Core.Protocols.Authentication;

namespace Merchello.Core.Protocols.Notifications;

/// <summary>
/// Notification fired before a protocol checkout session is updated.
/// Handlers can cancel to reject the update.
/// </summary>
public class ProtocolSessionUpdatingNotification : MerchelloCancelableNotification<object>
{
    public ProtocolSessionUpdatingNotification(
        string sessionId,
        object request,
        string protocol,
        AgentIdentity? agent)
        : base(request)
    {
        SessionId = sessionId;
        Protocol = protocol;
        Agent = agent;
    }

    /// <summary>
    /// The session being updated.
    /// </summary>
    public string SessionId { get; }

    /// <summary>
    /// The protocol being used (e.g., "ucp").
    /// </summary>
    public string Protocol { get; }

    /// <summary>
    /// The authenticated agent, if any.
    /// </summary>
    public AgentIdentity? Agent { get; }
}
