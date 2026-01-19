using Merchello.Core.Notifications.Base;
using Merchello.Core.Protocols.Authentication;

namespace Merchello.Core.Protocols.Notifications;

/// <summary>
/// Notification fired before a protocol checkout session is created.
/// Handlers can cancel to reject the session creation.
/// </summary>
public class ProtocolSessionCreatingNotification : MerchelloCancelableNotification<object>
{
    public ProtocolSessionCreatingNotification(
        object request,
        string protocol,
        AgentIdentity? agent)
        : base(request)
    {
        Protocol = protocol;
        Agent = agent;
    }

    /// <summary>
    /// The protocol being used (e.g., "ucp").
    /// </summary>
    public string Protocol { get; }

    /// <summary>
    /// The authenticated agent, if any.
    /// </summary>
    public AgentIdentity? Agent { get; }
}
