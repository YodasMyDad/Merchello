using Asp.Versioning;
using Merchello.Core.Actions.Dtos;
using Merchello.Core.Actions.Interfaces;
using Merchello.Core.Actions.Models;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using ActionContext = Merchello.Core.Actions.Models.ActionContext;

namespace Merchello.Controllers;

[ApiVersion("1.0")]
[ApiExplorerSettings(GroupName = "Merchello")]
public class ActionsApiController(IActionResolver actionResolver) : MerchelloApiControllerBase
{
    /// <summary>
    /// Lists available actions for a category.
    /// </summary>
    [HttpGet("actions")]
    [ProducesResponseType<List<ActionDto>>(StatusCodes.Status200OK)]
    public IActionResult GetActions([FromQuery] string category)
    {
        if (!Enum.TryParse<ActionCategory>(category, ignoreCase: true, out var actionCategory))
        {
            return BadRequest($"Invalid category: {category}");
        }

        var actions = actionResolver.GetActionsForCategory(actionCategory);

        var dtos = actions.Select(a => new ActionDto
        {
            Key = a.Metadata.Key,
            DisplayName = a.Metadata.DisplayName,
            Category = a.Metadata.Category.ToString(),
            Behavior = ToCamelCase(a.Metadata.Behavior.ToString()),
            Icon = a.Metadata.Icon,
            Description = a.Metadata.Description,
            SortOrder = a.Metadata.SortOrder,
            SidebarJsModule = a.Metadata.SidebarJsModule,
            SidebarElementTag = a.Metadata.SidebarElementTag,
            SidebarSize = a.Metadata.SidebarSize
        }).ToList();

        return Ok(dtos);
    }

    /// <summary>
    /// Executes a server-side action.
    /// </summary>
    [HttpPost("actions/execute")]
    [ProducesResponseType<ExecuteActionResultDto>(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> ExecuteAction(
        [FromBody] ExecuteActionDto dto,
        CancellationToken cancellationToken)
    {
        var action = actionResolver.GetAction(dto.ActionKey);
        if (action == null)
        {
            return NotFound($"Action '{dto.ActionKey}' not found.");
        }

        if (action.Metadata.Behavior != ActionBehavior.ServerSide)
        {
            return BadRequest($"Action '{dto.ActionKey}' is not a server-side action.");
        }

        var context = BuildContext(dto, action.Metadata.Category);
        var result = await action.ExecuteAsync(context, cancellationToken);

        return Ok(new ExecuteActionResultDto
        {
            Success = result.Success,
            Message = result.Message
        });
    }

    /// <summary>
    /// Executes a download action and returns the file.
    /// </summary>
    [HttpPost("actions/download")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> DownloadAction(
        [FromBody] ExecuteActionDto dto,
        CancellationToken cancellationToken)
    {
        var action = actionResolver.GetAction(dto.ActionKey);
        if (action == null)
        {
            return NotFound($"Action '{dto.ActionKey}' not found.");
        }

        if (action.Metadata.Behavior != ActionBehavior.Download)
        {
            return BadRequest($"Action '{dto.ActionKey}' is not a download action.");
        }

        var context = BuildContext(dto, action.Metadata.Category);
        var result = await action.ExecuteAsync(context, cancellationToken);

        if (!result.Success || result.FileBytes == null)
        {
            return BadRequest(result.Message ?? "Download action failed.");
        }

        return File(
            result.FileBytes,
            result.ContentType ?? "application/octet-stream",
            result.FileName ?? "download");
    }

    private static ActionContext BuildContext(ExecuteActionDto dto, ActionCategory category) => new()
    {
        Category = category,
        InvoiceId = dto.InvoiceId,
        OrderId = dto.OrderId,
        ProductRootId = dto.ProductRootId,
        ProductId = dto.ProductId,
        CustomerId = dto.CustomerId,
        WarehouseId = dto.WarehouseId,
        SupplierId = dto.SupplierId,
        Data = dto.Data
    };

    private static string ToCamelCase(string value) =>
        string.IsNullOrEmpty(value) ? value : char.ToLowerInvariant(value[0]) + value[1..];
}
