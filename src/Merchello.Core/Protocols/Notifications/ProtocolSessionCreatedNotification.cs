using Merchello.Core.Notifications.Base;
using Merchello.Core.Protocols.Authentication;
using Merchello.Core.Protocols.Models;

namespace Merchello.Core.Protocols.Notifications;

/// <summary>
/// Notification fired after a protocol checkout session is created.
/// </summary>
public class ProtocolSessionCreatedNotification : MerchelloNotification
{
    public ProtocolSessionCreatedNotification(
        CheckoutSessionState session,
        string protocol,
        AgentIdentity? agent)
    {
        Session = session;
        Protocol = protocol;
        Agent = agent;
    }

    /// <summary>
    /// The created session state.
    /// </summary>
    public CheckoutSessionState Session { get; }

    /// <summary>
    /// The protocol being used (e.g., "ucp").
    /// </summary>
    public string Protocol { get; }

    /// <summary>
    /// The authenticated agent, if any.
    /// </summary>
    public AgentIdentity? Agent { get; }
}
