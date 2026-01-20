namespace Merchello.Core.Email.Models;

/// <summary>
/// Represents an email topic that can trigger automated emails.
/// </summary>
public class EmailTopic
{
    /// <summary>
    /// The topic identifier (e.g., "order.created").
    /// </summary>
    public string Topic { get; set; } = string.Empty;

    /// <summary>
    /// Display name for the UI (e.g., "Order Created").
    /// </summary>
    public string DisplayName { get; set; } = string.Empty;

    /// <summary>
    /// Description of when this topic fires.
    /// </summary>
    public string Description { get; set; } = string.Empty;

    /// <summary>
    /// Category for grouping in the UI (e.g., "Orders", "Customers", "Checkout").
    /// </summary>
    public string Category { get; set; } = string.Empty;

    /// <summary>
    /// The notification type that corresponds to this topic.
    /// </summary>
    public Type NotificationType { get; set; } = null!;

    /// <summary>
    /// Available tokens for this topic's notification type.
    /// </summary>
    public IReadOnlyList<TokenInfo> AvailableTokens { get; set; } = [];
}
