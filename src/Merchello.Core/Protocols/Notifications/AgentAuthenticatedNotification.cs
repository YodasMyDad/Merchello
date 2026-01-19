using Merchello.Core.Notifications.Base;
using Merchello.Core.Protocols.Authentication;

namespace Merchello.Core.Protocols.Notifications;

/// <summary>
/// Notification fired after an agent is successfully authenticated.
/// </summary>
public class AgentAuthenticatedNotification : MerchelloNotification
{
    public AgentAuthenticatedNotification(AgentIdentity identity)
    {
        Identity = identity;
    }

    /// <summary>
    /// The authenticated agent's identity.
    /// </summary>
    public AgentIdentity Identity { get; }
}
