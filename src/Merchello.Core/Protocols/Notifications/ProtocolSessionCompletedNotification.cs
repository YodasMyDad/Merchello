using Merchello.Core.Notifications.Base;
using Merchello.Core.Protocols.Authentication;
using Merchello.Core.Protocols.Models;

namespace Merchello.Core.Protocols.Notifications;

/// <summary>
/// Notification fired after a protocol checkout session is completed.
/// </summary>
public class ProtocolSessionCompletedNotification : MerchelloNotification
{
    public ProtocolSessionCompletedNotification(
        CheckoutSessionState session,
        string orderId,
        string protocol,
        AgentIdentity? agent)
    {
        Session = session;
        OrderId = orderId;
        Protocol = protocol;
        Agent = agent;
    }

    /// <summary>
    /// The completed session state.
    /// </summary>
    public CheckoutSessionState Session { get; }

    /// <summary>
    /// The created order ID.
    /// </summary>
    public string OrderId { get; }

    /// <summary>
    /// The protocol being used (e.g., "ucp").
    /// </summary>
    public string Protocol { get; }

    /// <summary>
    /// The authenticated agent, if any.
    /// </summary>
    public AgentIdentity? Agent { get; }
}
