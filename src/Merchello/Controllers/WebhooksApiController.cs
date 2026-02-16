using Asp.Versioning;
using Merchello.Core.Shared.Models;
using Merchello.Core.Shared.Models.Enums;
using Merchello.Core.Webhooks.Dtos;
using Merchello.Core.Webhooks.Models;
using Merchello.Core.Webhooks.Models.Enums;
using Merchello.Core.Webhooks.Services.Interfaces;
using Merchello.Core.Webhooks.Services.Parameters;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;

namespace Merchello.Controllers;

/// <summary>
/// API controller for webhook management.
/// </summary>
[ApiVersion("1.0")]
[ApiExplorerSettings(GroupName = "Merchello")]
public class WebhooksApiController(
    IWebhookService webhookService,
    IWebhookTopicRegistry topicRegistry) : MerchelloApiControllerBase
{
    #region Subscriptions

    /// <summary>
    /// Get all webhook subscriptions with optional filtering.
    /// </summary>
    [HttpGet("webhooks")]
    [ProducesResponseType<PaginatedList<WebhookSubscriptionDto>>(StatusCodes.Status200OK)]
    public async Task<PaginatedList<WebhookSubscriptionDto>> GetSubscriptions(
        [FromQuery] string? topic,
        [FromQuery] bool? isActive,
        [FromQuery] string? searchTerm,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 20,
        [FromQuery] string? sortBy = null,
        [FromQuery] string? sortDirection = null,
        CancellationToken ct = default)
    {
        var result = await webhookService.QuerySubscriptionsAsync(new WebhookSubscriptionQueryParameters
        {
            Topic = topic,
            IsActive = isActive,
            SearchTerm = searchTerm,
            Page = page,
            PageSize = pageSize,
            SortBy = sortBy,
            SortDirection = sortDirection
        }, ct);

        var items = result.Items.Select(s => MapToDto(s));
        return new PaginatedList<WebhookSubscriptionDto>(items, result.TotalItems, result.PageIndex, pageSize);
    }

    /// <summary>
    /// Get a webhook subscription by ID.
    /// </summary>
    [HttpGet("webhooks/{id:guid}")]
    [ProducesResponseType<WebhookSubscriptionDetailDto>(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> GetSubscription(Guid id, CancellationToken ct)
    {
        var subscription = await webhookService.GetSubscriptionAsync(id, ct);
        if (subscription == null)
        {
            return NotFound();
        }

        var deliveries = await webhookService.GetRecentDeliveriesAsync(id, 10, ct);
        return Ok(MapToDetailDto(subscription, deliveries));
    }

    /// <summary>
    /// Create a new webhook subscription.
    /// </summary>
    [HttpPost("webhooks")]
    [ProducesResponseType<WebhookSubscriptionDto>(StatusCodes.Status201Created)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> CreateSubscription(
        [FromBody] CreateWebhookSubscriptionDto dto,
        CancellationToken ct)
    {
        var result = await webhookService.CreateSubscriptionAsync(new CreateWebhookSubscriptionParameters
        {
            Name = dto.Name,
            Topic = dto.Topic,
            TargetUrl = dto.TargetUrl,
            AuthType = dto.AuthType,
            AuthHeaderName = dto.AuthHeaderName,
            AuthHeaderValue = dto.AuthHeaderValue,
            TimeoutSeconds = dto.TimeoutSeconds,
            FilterExpression = dto.FilterExpression,
            Headers = dto.Headers ?? []
        }, ct);

        if (!result.Success)
        {
            return BadRequest(result.Messages.FirstOrDefault()?.Message ?? "Failed to create webhook subscription.");
        }

        var subscriptionDto = MapToDto(result.ResultObject!);
        return Created($"/api/v1/webhooks/{result.ResultObject!.Id}", subscriptionDto);
    }

    /// <summary>
    /// Update an existing webhook subscription.
    /// </summary>
    [HttpPut("webhooks/{id:guid}")]
    [ProducesResponseType<WebhookSubscriptionDto>(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> UpdateSubscription(
        Guid id,
        [FromBody] UpdateWebhookSubscriptionDto dto,
        CancellationToken ct)
    {
        var result = await webhookService.UpdateSubscriptionAsync(new UpdateWebhookSubscriptionParameters
        {
            Id = id,
            Name = dto.Name,
            TargetUrl = dto.TargetUrl,
            IsActive = dto.IsActive,
            AuthType = dto.AuthType,
            AuthHeaderName = dto.AuthHeaderName,
            AuthHeaderValue = dto.AuthHeaderValue,
            TimeoutSeconds = dto.TimeoutSeconds,
            FilterExpression = dto.FilterExpression,
            Headers = dto.Headers
        }, ct);

        if (!result.Success)
        {
            var message = result.Messages.FirstOrDefault()?.Message ?? "Failed to update webhook subscription.";
            return message.Contains("not found", StringComparison.OrdinalIgnoreCase)
                ? NotFound(message)
                : BadRequest(message);
        }

        return Ok(MapToDto(result.ResultObject!));
    }

    /// <summary>
    /// Delete a webhook subscription.
    /// </summary>
    [HttpDelete("webhooks/{id:guid}")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> DeleteSubscription(Guid id, CancellationToken ct)
    {
        var deleted = await webhookService.DeleteSubscriptionAsync(id, ct);
        return deleted ? NoContent() : NotFound();
    }

    /// <summary>
    /// Send a test webhook to a subscription.
    /// </summary>
    [HttpPost("webhooks/{id:guid}/test")]
    [ProducesResponseType<OutboundDeliveryResultDto>(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> SendTest(Guid id, CancellationToken ct)
    {
        var subscription = await webhookService.GetSubscriptionAsync(id, ct);
        if (subscription == null)
        {
            return NotFound();
        }

        var result = await webhookService.SendTestAsync(id, ct);
        return Ok(new OutboundDeliveryResultDto
        {
            Success = result.Success,
            StatusCode = result.StatusCode,
            ResponseBody = result.ResponseBody,
            ErrorMessage = result.ErrorMessage,
            DurationMs = result.DurationMs,
            DeliveryId = result.DeliveryId
        });
    }

    /// <summary>
    /// Regenerate the secret for a subscription.
    /// </summary>
    [HttpPost("webhooks/{id:guid}/regenerate-secret")]
    [ProducesResponseType<object>(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> RegenerateSecret(Guid id, CancellationToken ct)
    {
        var subscription = await webhookService.GetSubscriptionAsync(id, ct);
        if (subscription == null)
        {
            return NotFound();
        }

        var newSecret = await webhookService.RegenerateSecretAsync(id, ct);
        if (newSecret == null)
        {
            return NotFound();
        }

        return Ok(new { secret = newSecret });
    }

    #endregion

    #region Topics

    /// <summary>
    /// Get all available webhook topics.
    /// </summary>
    [HttpGet("webhooks/topics")]
    [ProducesResponseType<List<WebhookTopicDto>>(StatusCodes.Status200OK)]
    public Task<List<WebhookTopicDto>> GetTopics(CancellationToken ct)
    {
        var topics = topicRegistry.GetAllTopics()
            .Select(t => new WebhookTopicDto
            {
                Key = t.Key,
                DisplayName = t.DisplayName,
                Description = t.Description,
                Category = t.Category,
                SamplePayload = t.SamplePayload
            })
            .OrderBy(t => t.Category)
            .ThenBy(t => t.DisplayName)
            .ToList();

        return Task.FromResult(topics);
    }

    /// <summary>
    /// Get webhook topics grouped by category.
    /// </summary>
    [HttpGet("webhooks/topics/by-category")]
    [ProducesResponseType<List<WebhookTopicCategoryDto>>(StatusCodes.Status200OK)]
    public async Task<List<WebhookTopicCategoryDto>> GetTopicsByCategory(CancellationToken ct)
    {
        var categories = await webhookService.GetTopicsByCategoryAsync(ct);
        return categories.ToList();
    }

    #endregion

    #region Deliveries

    /// <summary>
    /// Get deliveries for a subscription.
    /// </summary>
    [HttpGet("webhooks/{id:guid}/deliveries")]
    [ProducesResponseType<PaginatedList<OutboundDeliveryDto>>(StatusCodes.Status200OK)]
    public async Task<PaginatedList<OutboundDeliveryDto>> GetDeliveries(
        Guid id,
        [FromQuery] OutboundDeliveryStatus? status,
        [FromQuery] List<OutboundDeliveryStatus>? statuses,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 20,
        CancellationToken ct = default)
    {
        var effectiveStatuses = statuses is { Count: > 0 }
            ? statuses
            : status.HasValue
                ? [status.Value]
                : null;

        var result = await webhookService.QueryDeliveriesAsync(new OutboundDeliveryQueryParameters
        {
            ConfigurationId = id,
            DeliveryType = OutboundDeliveryType.Webhook,
            Status = status,
            Statuses = effectiveStatuses,
            Page = page,
            PageSize = pageSize
        }, ct);

        var items = result.Items.Select(d => MapToDto(d));
        return new PaginatedList<OutboundDeliveryDto>(items, result.TotalItems, result.PageIndex, pageSize);
    }

    /// <summary>
    /// Get a delivery by ID.
    /// </summary>
    [HttpGet("webhooks/deliveries/{id:guid}")]
    [ProducesResponseType<OutboundDeliveryDetailDto>(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> GetDelivery(Guid id, CancellationToken ct)
    {
        var delivery = await webhookService.GetDeliveryAsync(id, ct);
        if (delivery == null)
        {
            return NotFound();
        }

        return Ok(MapToDetailDto(delivery));
    }

    /// <summary>
    /// Retry a failed delivery.
    /// </summary>
    [HttpPost("webhooks/deliveries/{id:guid}/retry")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> RetryDelivery(Guid id, CancellationToken ct)
    {
        var delivery = await webhookService.GetDeliveryAsync(id, ct);
        if (delivery == null)
        {
            return NotFound();
        }

        await webhookService.RetryDeliveryAsync(id, ct);
        return Ok();
    }

    #endregion

    #region Statistics

    /// <summary>
    /// Get webhook delivery statistics.
    /// </summary>
    [HttpGet("webhooks/stats")]
    [ProducesResponseType<WebhookStatsDto>(StatusCodes.Status200OK)]
    public async Task<WebhookStatsDto> GetStats(
        [FromQuery] DateTime? from,
        [FromQuery] DateTime? to,
        CancellationToken ct)
    {
        return await webhookService.GetStatsAsync(from, to, ct);
    }

    #endregion

    #region Utilities

    /// <summary>
    /// Ping a URL to test connectivity.
    /// </summary>
    [HttpPost("webhooks/ping")]
    [ProducesResponseType<OutboundDeliveryResultDto>(StatusCodes.Status200OK)]
    public async Task<OutboundDeliveryResultDto> Ping([FromBody] PingWebhookDto dto, CancellationToken ct)
    {
        var result = await webhookService.PingAsync(dto.Url, ct);
        return new OutboundDeliveryResultDto
        {
            Success = result.Success,
            StatusCode = result.StatusCode,
            ResponseBody = result.ResponseBody,
            ErrorMessage = result.ErrorMessage,
            DurationMs = result.DurationMs
        };
    }

    #endregion

    #region Mapping

    private WebhookSubscriptionDto MapToDto(WebhookSubscription subscription)
    {
        var topic = topicRegistry.GetTopic(subscription.Topic);
        return new WebhookSubscriptionDto
        {
            Id = subscription.Id,
            Name = subscription.Name,
            Topic = subscription.Topic,
            TopicDisplayName = topic?.DisplayName ?? subscription.Topic,
            TargetUrl = subscription.TargetUrl,
            IsActive = subscription.IsActive,
            AuthType = subscription.AuthType,
            AuthTypeDisplay = GetAuthTypeDisplay(subscription.AuthType),
            SuccessCount = subscription.SuccessCount,
            FailureCount = subscription.FailureCount,
            LastTriggeredUtc = subscription.LastTriggeredUtc,
            LastSuccessUtc = subscription.LastSuccessUtc,
            LastErrorMessage = subscription.LastErrorMessage,
            DateCreated = subscription.DateCreated
        };
    }

    private WebhookSubscriptionDetailDto MapToDetailDto(
        WebhookSubscription subscription,
        IEnumerable<OutboundDelivery> deliveries)
    {
        var topic = topicRegistry.GetTopic(subscription.Topic);
        return new WebhookSubscriptionDetailDto
        {
            Id = subscription.Id,
            Name = subscription.Name,
            Topic = subscription.Topic,
            TopicDisplayName = topic?.DisplayName ?? subscription.Topic,
            TargetUrl = subscription.TargetUrl,
            IsActive = subscription.IsActive,
            AuthType = subscription.AuthType,
            AuthTypeDisplay = GetAuthTypeDisplay(subscription.AuthType),
            SuccessCount = subscription.SuccessCount,
            FailureCount = subscription.FailureCount,
            LastTriggeredUtc = subscription.LastTriggeredUtc,
            LastSuccessUtc = subscription.LastSuccessUtc,
            LastErrorMessage = subscription.LastErrorMessage,
            DateCreated = subscription.DateCreated,
            ApiVersion = subscription.ApiVersion,
            TimeoutSeconds = subscription.TimeoutSeconds,
            FilterExpression = subscription.FilterExpression,
            Headers = subscription.Headers,
            RecentDeliveries = deliveries.Select(d => MapToDto(d)).ToList()
        };
    }

    private static OutboundDeliveryDto MapToDto(OutboundDelivery delivery) => new()
    {
        Id = delivery.Id,
        DeliveryType = delivery.DeliveryType,
        DeliveryTypeDisplay = GetDeliveryTypeDisplay(delivery.DeliveryType),
        ConfigurationId = delivery.ConfigurationId,
        Topic = delivery.Topic,
        EntityId = delivery.EntityId,
        EntityType = delivery.EntityType,
        Status = delivery.Status,
        StatusDisplay = GetStatusDisplay(delivery.Status),
        StatusCssClass = GetStatusCssClass(delivery.Status),
        ResponseStatusCode = delivery.ResponseStatusCode,
        ErrorMessage = delivery.ErrorMessage,
        DateCreated = delivery.DateCreated,
        DateCompleted = delivery.DateCompleted,
        DurationMs = delivery.DurationMs,
        AttemptNumber = delivery.AttemptNumber
    };

    private static OutboundDeliveryDetailDto MapToDetailDto(OutboundDelivery delivery) => new()
    {
        Id = delivery.Id,
        DeliveryType = delivery.DeliveryType,
        DeliveryTypeDisplay = GetDeliveryTypeDisplay(delivery.DeliveryType),
        ConfigurationId = delivery.ConfigurationId,
        Topic = delivery.Topic,
        EntityId = delivery.EntityId,
        EntityType = delivery.EntityType,
        Status = delivery.Status,
        StatusDisplay = GetStatusDisplay(delivery.Status),
        StatusCssClass = GetStatusCssClass(delivery.Status),
        ResponseStatusCode = delivery.ResponseStatusCode,
        ErrorMessage = delivery.ErrorMessage,
        DateCreated = delivery.DateCreated,
        DateCompleted = delivery.DateCompleted,
        DurationMs = delivery.DurationMs,
        AttemptNumber = delivery.AttemptNumber,
        TargetUrl = delivery.TargetUrl,
        RequestBody = delivery.RequestBody,
        RequestHeaders = delivery.RequestHeaders,
        ResponseBody = delivery.ResponseBody,
        ResponseHeaders = delivery.ResponseHeaders,
        EmailRecipients = delivery.EmailRecipients,
        EmailSubject = delivery.EmailSubject,
        EmailFrom = delivery.EmailFrom,
        EmailBody = delivery.EmailBody
    };

    private static string GetAuthTypeDisplay(WebhookAuthType authType) => authType switch
    {
        WebhookAuthType.None => "None",
        WebhookAuthType.HmacSha256 => "HMAC SHA-256",
        WebhookAuthType.HmacSha512 => "HMAC SHA-512",
        WebhookAuthType.BearerToken => "Bearer Token",
        WebhookAuthType.ApiKey => "API Key",
        WebhookAuthType.BasicAuth => "Basic Auth",
        _ => authType.ToString()
    };

    private static string GetStatusDisplay(OutboundDeliveryStatus status) => status switch
    {
        OutboundDeliveryStatus.Pending => "Pending",
        OutboundDeliveryStatus.Sending => "Sending",
        OutboundDeliveryStatus.Succeeded => "Succeeded",
        OutboundDeliveryStatus.Failed => "Failed",
        OutboundDeliveryStatus.Retrying => "Retrying",
        OutboundDeliveryStatus.Abandoned => "Abandoned",
        _ => status.ToString()
    };

    private static string GetStatusCssClass(OutboundDeliveryStatus status)
    {
        return status switch
        {
            OutboundDeliveryStatus.Succeeded => "badge-positive",
            OutboundDeliveryStatus.Failed => "badge-danger",
            OutboundDeliveryStatus.Abandoned => "badge-danger",
            OutboundDeliveryStatus.Retrying => "badge-warning",
            _ => "badge-default"
        };
    }

    private static string GetDeliveryTypeDisplay(OutboundDeliveryType type) => type switch
    {
        OutboundDeliveryType.Webhook => "Webhook",
        OutboundDeliveryType.Email => "Email",
        _ => type.ToString()
    };

    #endregion
}
