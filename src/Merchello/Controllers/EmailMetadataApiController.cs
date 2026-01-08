using Asp.Versioning;
using Merchello.Core.Email.Dtos;
using Merchello.Core.Email.Services.Interfaces;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;

namespace Merchello.Controllers;

/// <summary>
/// API controller for email metadata (topics, tokens, templates).
/// </summary>
[ApiVersion("1.0")]
[ApiExplorerSettings(GroupName = "Merchello")]
public class EmailMetadataApiController(
    IEmailTopicRegistry topicRegistry,
    IEmailTokenResolver tokenResolver,
    IEmailTemplateDiscoveryService templateDiscovery) : MerchelloApiControllerBase
{
    /// <summary>
    /// Get all available email topics.
    /// </summary>
    [HttpGet("emails/topics")]
    [ProducesResponseType<List<EmailTopicDto>>(StatusCodes.Status200OK)]
    public List<EmailTopicDto> GetTopics()
    {
        return topicRegistry.GetAllTopics().Select(topic => new EmailTopicDto
        {
            Topic = topic.Topic,
            DisplayName = topic.DisplayName,
            Description = topic.Description,
            Category = topic.Category,
            AvailableTokens = tokenResolver.GetAvailableTokens(topic.Topic)
                .Select(t => t.ToDto())
                .ToList()
        }).ToList();
    }

    /// <summary>
    /// Get email topics grouped by category.
    /// </summary>
    [HttpGet("emails/topics/categories")]
    [ProducesResponseType<List<EmailTopicCategoryDto>>(StatusCodes.Status200OK)]
    public List<EmailTopicCategoryDto> GetTopicsByCategory()
    {
        return topicRegistry.GetTopicsByCategory().Select(group => new EmailTopicCategoryDto
        {
            Category = group.Key,
            Topics = group.Select(topic => new EmailTopicDto
            {
                Topic = topic.Topic,
                DisplayName = topic.DisplayName,
                Description = topic.Description,
                Category = topic.Category,
                AvailableTokens = tokenResolver.GetAvailableTokens(topic.Topic)
                    .Select(t => t.ToDto())
                    .ToList()
            }).ToList()
        }).ToList();
    }

    /// <summary>
    /// Get available tokens for a specific topic.
    /// </summary>
    [HttpGet("emails/topics/{topic}/tokens")]
    [ProducesResponseType<List<TokenInfoDto>>(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public IActionResult GetTokensForTopic(string topic)
    {
        if (!topicRegistry.TopicExists(topic))
        {
            return NotFound($"Topic '{topic}' not found.");
        }

        var tokens = tokenResolver.GetAvailableTokens(topic)
            .Select(t => t.ToDto())
            .ToList();

        return Ok(tokens);
    }

    /// <summary>
    /// Get all available email templates.
    /// </summary>
    [HttpGet("emails/templates")]
    [ProducesResponseType<List<EmailTemplateDto>>(StatusCodes.Status200OK)]
    public List<EmailTemplateDto> GetTemplates()
    {
        return templateDiscovery.GetAvailableTemplates()
            .Select(t => t.ToDto())
            .ToList();
    }

    /// <summary>
    /// Check if a template exists.
    /// </summary>
    [HttpGet("emails/templates/exists")]
    [ProducesResponseType<bool>(StatusCodes.Status200OK)]
    public bool TemplateExists([FromQuery] string path)
    {
        return templateDiscovery.TemplateExists(path);
    }
}
