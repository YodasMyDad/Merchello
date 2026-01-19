using Merchello.Core.Notifications.Base;
using Merchello.Core.Protocols.Authentication;

namespace Merchello.Core.Protocols.Notifications;

/// <summary>
/// Notification fired before a protocol checkout session is completed (payment processed).
/// Handlers can cancel to reject the completion.
/// </summary>
public class ProtocolSessionCompletingNotification : MerchelloCancelableNotification<object>
{
    public ProtocolSessionCompletingNotification(
        string sessionId,
        object paymentData,
        string protocol,
        AgentIdentity? agent)
        : base(paymentData)
    {
        SessionId = sessionId;
        Protocol = protocol;
        Agent = agent;
    }

    /// <summary>
    /// The session being completed.
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
