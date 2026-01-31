namespace Merchello.Core.Subscriptions.Models;

public enum SubscriptionStatus
{
    Trialing = 10,
    Active = 20,
    PastDue = 30,
    Paused = 40,
    Cancelled = 50,
    Ended = 60,
    Unpaid = 70
}
