using Merchello.Core.Notifications.Base;

namespace Merchello.Core.Email.Services.Interfaces;

/// <summary>
/// Factory for creating sample notification instances for email preview and testing.
/// </summary>
public interface ISampleNotificationFactory
{
    /// <summary>
    /// Creates a sample notification instance for the given email topic.
    /// </summary>
    /// <param name="topic">The email topic (e.g., "invoice.created").</param>
    /// <returns>A sample notification instance with realistic test data, or null if the topic is unknown.</returns>
    MerchelloNotification? CreateSampleNotification(string topic);
}
