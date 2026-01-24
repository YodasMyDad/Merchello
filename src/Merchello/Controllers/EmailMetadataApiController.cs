using Asp.Versioning;
using Merchello.Core.Email.Attachments;
using Merchello.Core.Email.Interfaces;
using Merchello.Core.Email.Dtos;
using Merchello.Core.Email.Extensions;
using Merchello.Core.Email.Services.Interfaces;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;

namespace Merchello.Controllers;

/// <summary>
/// API controller for email metadata (topics, tokens, templates, attachments).
/// </summary>
[ApiVersion("1.0")]
[ApiExplorerSettings(GroupName = "Merchello")]
public class EmailMetadataApiController(
    IEmailTopicRegistry topicRegistry,
    IEmailTokenResolver tokenResolver,
    IEmailTemplateDiscoveryService templateDiscovery,
    IEmailAttachmentResolver attachmentResolver) : MerchelloApiControllerBase
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

    /// <summary>
    /// Get all available email attachments.
    /// </summary>
    [HttpGet("emails/attachments")]
    [ProducesResponseType<List<EmailAttachmentDto>>(StatusCodes.Status200OK)]
    public List<EmailAttachmentDto> GetAttachments()
    {
        return attachmentResolver.GetAllAttachments()
            .Select(a => new EmailAttachmentDto
            {
                Alias = a.Alias,
                DisplayName = a.DisplayName,
                Description = a.Description,
                IconSvg = a.IconSvg,
                Topic = a.Topic
            })
            .ToList();
    }

    /// <summary>
    /// Get available attachments for a specific topic.
    /// </summary>
    [HttpGet("emails/topics/{topic}/attachments")]
    [ProducesResponseType<List<EmailAttachmentDto>>(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public IActionResult GetAttachmentsForTopic(string topic)
    {
        if (!topicRegistry.TopicExists(topic))
        {
            return NotFound($"Topic '{topic}' not found.");
        }

        var attachments = attachmentResolver.GetAttachmentsForTopic(topic)
            .Select(a => new EmailAttachmentDto
            {
                Alias = a.Alias,
                DisplayName = a.DisplayName,
                Description = a.Description,
                IconSvg = a.IconSvg,
                Topic = a.Topic
            })
            .ToList();

        return Ok(attachments);
    }
}
