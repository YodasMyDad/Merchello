namespace Merchello.Core.Webhooks.Dtos;

/// <summary>
/// DTO for webhook topics grouped by category.
/// </summary>
public class WebhookTopicCategoryDto
{
    public string Name { get; set; } = string.Empty;
    public List<WebhookTopicDto> Topics { get; set; } = [];
}
