using Merchello.Core.Notifications.Base;
using Merchello.Core.Protocols.Authentication;

namespace Merchello.Core.Protocols.Notifications;

/// <summary>
/// Notification fired before a protocol cart session is updated.
/// Handlers can cancel to reject the update.
/// </summary>
public class ProtocolCartUpdatingNotification : MerchelloCancelableNotification<object>
{
    public ProtocolCartUpdatingNotification(
        string cartId,
        object request,
        string protocol,
        AgentIdentity? agent)
        : base(request)
    {
        CartId = cartId;
        Protocol = protocol;
        Agent = agent;
    }

    /// <summary>
    /// The cart being updated.
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
