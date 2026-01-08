using Merchello.Core.Email.Models;

namespace Merchello.Core.Email.Services.Interfaces;

/// <summary>
/// Registry of available email topics that can trigger automated emails.
/// </summary>
public interface IEmailTopicRegistry
{
    /// <summary>
    /// Gets all registered email topics.
    /// </summary>
    IReadOnlyList<EmailTopic> GetAllTopics();

    /// <summary>
    /// Gets a topic by its key.
    /// </summary>
    EmailTopic? GetTopic(string topic);

    /// <summary>
    /// Gets the notification type for a topic.
    /// </summary>
    Type? GetNotificationType(string topic);

    /// <summary>
    /// Checks if a topic exists.
    /// </summary>
    bool TopicExists(string topic);

    /// <summary>
    /// Gets topics grouped by category.
    /// </summary>
    IEnumerable<IGrouping<string, EmailTopic>> GetTopicsByCategory();
}
