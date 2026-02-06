using Asp.Versioning;
using Merchello.Core.Email.Dtos;
using Merchello.Core.Email.Models;
using Merchello.Core.Email.Services.Interfaces;
using Merchello.Core.Email.Services.Parameters;
using Merchello.Core.Shared.Models;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;

namespace Merchello.Controllers;

/// <summary>
/// API controller for email configuration management.
/// </summary>
[ApiVersion("1.0")]
[ApiExplorerSettings(GroupName = "Merchello")]
public class EmailConfigurationApiController(
    IEmailConfigurationService configurationService,
    IEmailService emailService,
    IEmailTopicRegistry topicRegistry) : MerchelloApiControllerBase
{
    /// <summary>
    /// Get all email configurations with optional filtering.
    /// </summary>
    [HttpGet("emails")]
    [ProducesResponseType<PaginatedList<EmailConfigurationDto>>(StatusCodes.Status200OK)]
    public async Task<PaginatedList<EmailConfigurationDto>> GetConfigurations(
        [FromQuery] string? topic,
        [FromQuery] string? category,
        [FromQuery] bool? enabled,
        [FromQuery] string? searchTerm,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 20,
        [FromQuery] string? sortBy = null,
        [FromQuery] string? sortDirection = null,
        CancellationToken ct = default)
    {
        var result = await configurationService.QueryAsync(new EmailConfigurationQueryParameters
        {
            Topic = topic,
            Category = category,
            Enabled = enabled,
            SearchTerm = searchTerm,
            Page = page,
            PageSize = pageSize,
            SortBy = sortBy,
            SortDirection = sortDirection
        }, ct);

        var items = result.Items.Select(MapToDto);
        return new PaginatedList<EmailConfigurationDto>(items, result.TotalItems, result.PageIndex, pageSize);
    }

    /// <summary>
    /// Get an email configuration by ID.
    /// </summary>
    [HttpGet("emails/{id:guid}")]
    [ProducesResponseType<EmailConfigurationDetailDto>(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> GetConfiguration(Guid id, CancellationToken ct)
    {
        var config = await configurationService.GetByIdAsync(id, ct);
        if (config == null)
        {
            return NotFound();
        }

        return Ok(MapToDetailDto(config));
    }

    /// <summary>
    /// Create a new email configuration.
    /// </summary>
    [HttpPost("emails")]
    [ProducesResponseType<EmailConfigurationDto>(StatusCodes.Status201Created)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> CreateConfiguration(
        [FromBody] CreateEmailConfigurationDto dto,
        CancellationToken ct)
    {
        var result = await configurationService.CreateAsync(new CreateEmailConfigurationParameters
        {
            Name = dto.Name,
            Topic = dto.Topic,
            TemplatePath = dto.TemplatePath,
            ToExpression = dto.ToExpression,
            SubjectExpression = dto.SubjectExpression,
            Enabled = dto.Enabled,
            CcExpression = dto.CcExpression,
            BccExpression = dto.BccExpression,
            FromExpression = dto.FromExpression,
            Description = dto.Description,
            AttachmentAliases = dto.AttachmentAliases
        }, ct);

        if (!result.Success)
        {
            return BadRequest(result.Messages.FirstOrDefault()?.Message ?? "Failed to create email configuration.");
        }

        var configDto = MapToDto(result.ResultObject!);
        return Created($"/api/v1/emails/{result.ResultObject!.Id}", configDto);
    }

    /// <summary>
    /// Update an existing email configuration.
    /// </summary>
    [HttpPut("emails/{id:guid}")]
    [ProducesResponseType<EmailConfigurationDto>(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> UpdateConfiguration(
        Guid id,
        [FromBody] UpdateEmailConfigurationDto dto,
        CancellationToken ct)
    {
        var result = await configurationService.UpdateAsync(new UpdateEmailConfigurationParameters
        {
            Id = id,
            Name = dto.Name,
            Topic = dto.Topic,
            TemplatePath = dto.TemplatePath,
            ToExpression = dto.ToExpression,
            SubjectExpression = dto.SubjectExpression,
            Enabled = dto.Enabled,
            CcExpression = dto.CcExpression,
            BccExpression = dto.BccExpression,
            FromExpression = dto.FromExpression,
            Description = dto.Description,
            AttachmentAliases = dto.AttachmentAliases
        }, ct);

        if (!result.Success)
        {
            var message = result.Messages.FirstOrDefault()?.Message ?? "Failed to update email configuration.";
            return message.Contains("not found", StringComparison.OrdinalIgnoreCase)
                ? NotFound(message)
                : BadRequest(message);
        }

        return Ok(MapToDto(result.ResultObject!));
    }

    /// <summary>
    /// Delete an email configuration.
    /// </summary>
    [HttpDelete("emails/{id:guid}")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> DeleteConfiguration(Guid id, CancellationToken ct)
    {
        var deleted = await configurationService.DeleteAsync(id, ct);
        if (!deleted)
        {
            return NotFound();
        }

        return NoContent();
    }

    /// <summary>
    /// Toggle the enabled status of an email configuration.
    /// </summary>
    [HttpPost("emails/{id:guid}/toggle")]
    [ProducesResponseType<EmailConfigurationDto>(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> ToggleEnabled(Guid id, CancellationToken ct)
    {
        var result = await configurationService.ToggleEnabledAsync(id, ct);
        if (!result.Success)
        {
            return NotFound(result.Messages.FirstOrDefault()?.Message ?? "Email configuration not found.");
        }

        return Ok(MapToDto(result.ResultObject!));
    }

    /// <summary>
    /// Preview an email without sending.
    /// </summary>
    [HttpGet("emails/{id:guid}/preview")]
    [ProducesResponseType<EmailPreviewDto>(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> Preview(Guid id, CancellationToken ct)
    {
        var config = await configurationService.GetByIdAsync(id, ct);
        if (config == null)
        {
            return NotFound();
        }

        var preview = await emailService.PreviewAsync(id, ct);
        return Ok(preview);
    }

    /// <summary>
    /// Send a test email.
    /// </summary>
    [HttpPost("emails/{id:guid}/test")]
    [ProducesResponseType<EmailSendTestResultDto>(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> SendTest(
        Guid id,
        [FromBody] SendTestEmailDto dto,
        CancellationToken ct)
    {
        var config = await configurationService.GetByIdAsync(id, ct);
        if (config == null)
        {
            return NotFound();
        }

        var result = await emailService.SendTestEmailAsync(id, dto.Recipient, ct);
        if (!result.Success)
        {
            return BadRequest(result);
        }

        return Ok(result);
    }

    private EmailConfigurationDto MapToDto(EmailConfiguration config)
    {
        var topic = topicRegistry.GetTopic(config.Topic);
        return new EmailConfigurationDto
        {
            Id = config.Id,
            Name = config.Name,
            Topic = config.Topic,
            TopicDisplayName = topic?.DisplayName,
            TopicCategory = topic?.Category,
            Enabled = config.Enabled,
            TemplatePath = config.TemplatePath,
            ToExpression = config.ToExpression,
            SubjectExpression = config.SubjectExpression,
            Description = config.Description,
            DateCreated = config.DateCreated,
            DateModified = config.DateModified,
            TotalSent = config.TotalSent,
            TotalFailed = config.TotalFailed,
            LastSentUtc = config.LastSentUtc,
            AttachmentAliases = config.AttachmentAliases
        };
    }

    private EmailConfigurationDetailDto MapToDetailDto(EmailConfiguration config)
    {
        var topic = topicRegistry.GetTopic(config.Topic);
        return new EmailConfigurationDetailDto
        {
            Id = config.Id,
            Name = config.Name,
            Topic = config.Topic,
            TopicDisplayName = topic?.DisplayName,
            TopicCategory = topic?.Category,
            Enabled = config.Enabled,
            TemplatePath = config.TemplatePath,
            ToExpression = config.ToExpression,
            SubjectExpression = config.SubjectExpression,
            CcExpression = config.CcExpression,
            BccExpression = config.BccExpression,
            FromExpression = config.FromExpression,
            Description = config.Description,
            DateCreated = config.DateCreated,
            DateModified = config.DateModified,
            TotalSent = config.TotalSent,
            TotalFailed = config.TotalFailed,
            LastSentUtc = config.LastSentUtc,
            AttachmentAliases = config.AttachmentAliases
        };
    }
}
