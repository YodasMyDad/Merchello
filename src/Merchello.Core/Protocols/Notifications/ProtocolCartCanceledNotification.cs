using Merchello.Core.Notifications.Base;
using Merchello.Core.Protocols.Authentication;

namespace Merchello.Core.Protocols.Notifications;

/// <summary>
/// Notification fired after a protocol cart session is canceled.
/// </summary>
public class ProtocolCartCanceledNotification : MerchelloNotification
{
    public ProtocolCartCanceledNotification(
        string cartId,
        string protocol,
        AgentIdentity? agent)
    {
        CartId = cartId;
        Protocol = protocol;
        Agent = agent;
    }

    /// <summary>
    /// The canceled cart ID.
    /// </summary>
    public string CartId { get; }

    /// <summary>
    /// The protocol being used (e.g., "ucp").
    /// </summary>
    public string Protocol { get; }

    /// <summary>
    /// The authenticated agent, if any.
    /// </summary>
    public AgentIdentity? Agent { get; }
}
