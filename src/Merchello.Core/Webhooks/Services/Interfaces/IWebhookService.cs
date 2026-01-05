using Merchello.Core.Shared.Models;
using Merchello.Core.Webhooks.Dtos;
using Merchello.Core.Webhooks.Models;
using Merchello.Core.Webhooks.Services.Parameters;

namespace Merchello.Core.Webhooks.Services.Interfaces;

/// <summary>
/// Service for managing webhook subscriptions and deliveries.
/// </summary>
public interface IWebhookService
{
    #region Subscriptions

    /// <summary>
    /// Creates a new webhook subscription.
    /// </summary>
    Task<CrudResult<WebhookSubscription>> CreateSubscriptionAsync(
        CreateWebhookSubscriptionParameters parameters,
        CancellationToken ct = default);

    /// <summary>
    /// Updates an existing webhook subscription.
    /// </summary>
    Task<CrudResult<WebhookSubscription>> UpdateSubscriptionAsync(
        UpdateWebhookSubscriptionParameters parameters,
        CancellationToken ct = default);

    /// <summary>
    /// Deletes a webhook subscription.
    /// </summary>
    Task<bool> DeleteSubscriptionAsync(Guid subscriptionId, CancellationToken ct = default);

    /// <summary>
    /// Gets a webhook subscription by ID.
    /// </summary>
    Task<WebhookSubscription?> GetSubscriptionAsync(Guid id, CancellationToken ct = default);

    /// <summary>
    /// Queries webhook subscriptions with filtering and pagination.
    /// </summary>
    Task<PaginatedList<WebhookSubscription>> QuerySubscriptionsAsync(
        WebhookSubscriptionQueryParameters parameters,
        CancellationToken ct = default);

    /// <summary>
    /// Gets all active subscriptions for a specific topic.
    /// </summary>
    Task<IEnumerable<WebhookSubscription>> GetSubscriptionsForTopicAsync(
        string topic,
        CancellationToken ct = default);

    #endregion

    #region Topics

    /// <summary>
    /// Gets all available webhook topics.
    /// </summary>
    Task<IEnumerable<WebhookTopic>> GetAvailableTopicsAsync(CancellationToken ct = default);

    /// <summary>
    /// Gets webhook topics grouped by category.
    /// </summary>
    Task<IEnumerable<WebhookTopicCategoryDto>> GetTopicsByCategoryAsync(CancellationToken ct = default);

    #endregion

    #region Delivery

    /// <summary>
    /// Queues a webhook delivery for all active subscriptions of a topic.
    /// </summary>
    Task<Guid> QueueDeliveryAsync(
        string topic,
        object payload,
        Guid? entityId = null,
        string? entityType = null,
        CancellationToken ct = default);

    /// <summary>
    /// Executes a specific delivery attempt.
    /// </summary>
    Task<WebhookDeliveryResult> DeliverAsync(
        Guid deliveryId,
        CancellationToken ct = default);

    /// <summary>
    /// Gets a delivery by ID.
    /// </summary>
    Task<WebhookDelivery?> GetDeliveryAsync(Guid id, CancellationToken ct = default);

    /// <summary>
    /// Queries webhook deliveries with filtering and pagination.
    /// </summary>
    Task<PaginatedList<WebhookDelivery>> QueryDeliveriesAsync(
        WebhookDeliveryQueryParameters parameters,
        CancellationToken ct = default);

    /// <summary>
    /// Gets recent deliveries for a subscription.
    /// </summary>
    Task<IEnumerable<WebhookDelivery>> GetRecentDeliveriesAsync(
        Guid subscriptionId,
        int count = 10,
        CancellationToken ct = default);

    #endregion

    #region Testing

    /// <summary>
    /// Sends a test webhook to a subscription.
    /// </summary>
    Task<WebhookDeliveryResult> SendTestAsync(
        Guid subscriptionId,
        CancellationToken ct = default);

    /// <summary>
    /// Pings a URL to verify connectivity.
    /// </summary>
    Task<WebhookDeliveryResult> PingAsync(
        string url,
        CancellationToken ct = default);

    #endregion

    #region Retry

    /// <summary>
    /// Retries a failed delivery.
    /// </summary>
    Task RetryDeliveryAsync(Guid deliveryId, CancellationToken ct = default);

    /// <summary>
    /// Processes all pending retries.
    /// </summary>
    Task ProcessPendingRetriesAsync(CancellationToken ct = default);

    #endregion

    #region Statistics

    /// <summary>
    /// Gets delivery statistics for a time period.
    /// </summary>
    Task<WebhookStatsDto> GetStatsAsync(
        DateTime? from = null,
        DateTime? to = null,
        CancellationToken ct = default);

    #endregion

    #region Utilities

    /// <summary>
    /// Generates a secure random secret for HMAC signing.
    /// </summary>
    string GenerateSecret();

    /// <summary>
    /// Regenerates the secret for a subscription and returns the new secret.
    /// </summary>
    Task<string?> RegenerateSecretAsync(Guid subscriptionId, CancellationToken ct = default);

    #endregion
}
