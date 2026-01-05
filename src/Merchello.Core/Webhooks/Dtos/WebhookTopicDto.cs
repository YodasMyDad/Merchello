namespace Merchello.Core.Webhooks.Dtos;

/// <summary>
/// DTO for webhook topic information.
/// </summary>
public class WebhookTopicDto
{
    public string Key { get; set; } = string.Empty;
    public string DisplayName { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public string Category { get; set; } = string.Empty;
    public string? SamplePayload { get; set; }
}

/// <summary>
/// DTO for webhook topics grouped by category.
/// </summary>
public class WebhookTopicCategoryDto
{
    public string Name { get; set; } = string.Empty;
    public List<WebhookTopicDto> Topics { get; set; } = [];
}
