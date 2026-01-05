using Merchello.Core.Webhooks.Models;

namespace Merchello.Core.Webhooks.Services.Interfaces;

/// <summary>
/// Registry of available webhook topics.
/// </summary>
public interface IWebhookTopicRegistry
{
    /// <summary>
    /// Gets all registered webhook topics.
    /// </summary>
    IEnumerable<WebhookTopic> GetAllTopics();

    /// <summary>
    /// Gets a topic by its key.
    /// </summary>
    WebhookTopic? GetTopic(string key);

    /// <summary>
    /// Checks if a topic exists.
    /// </summary>
    bool TopicExists(string key);
}
