using Asp.Versioning;
using Merchello.Core.Protocols.UCP.Dtos.Testing;
using Merchello.Core.Protocols.UCP.Services.Interfaces;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;

namespace Merchello.Controllers;

[ApiVersion("1.0")]
[ApiExplorerSettings(GroupName = "Merchello")]
public class UcpTestApiController(
    IUcpFlowTestService ucpFlowTestService) : MerchelloApiControllerBase
{
    [HttpGet("ucp-test/diagnostics")]
    [ProducesResponseType<UcpFlowDiagnosticsDto>(StatusCodes.Status200OK)]
    public async Task<IActionResult> GetDiagnostics(CancellationToken ct)
    {
        var result = await ucpFlowTestService.GetDiagnosticsAsync(ct);
        return Ok(result);
    }

    [HttpPost("ucp-test/manifest")]
    [ProducesResponseType<UcpFlowStepResultDto>(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> Manifest([FromBody] UcpTestManifestRequestDto? request, CancellationToken ct)
    {
        if (request == null)
        {
            return BadRequest(new { errors = new[] { "Request body is required." } });
        }

        var result = await ucpFlowTestService.ExecuteManifestAsync(request, ct);
        return Ok(result);
    }

    [HttpPost("ucp-test/sessions/create")]
    [ProducesResponseType<UcpFlowStepResultDto>(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> CreateSession([FromBody] UcpTestCreateSessionRequestDto? request, CancellationToken ct)
    {
        if (request == null)
        {
            return BadRequest(new { errors = new[] { "Request body is required." } });
        }

        var result = await ucpFlowTestService.ExecuteCreateSessionAsync(request, ct);
        return Ok(result);
    }

    [HttpPost("ucp-test/sessions/get")]
    [ProducesResponseType<UcpFlowStepResultDto>(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> GetSession([FromBody] UcpTestGetSessionRequestDto? request, CancellationToken ct)
    {
        if (request == null)
        {
            return BadRequest(new { errors = new[] { "Request body is required." } });
        }

        if (string.IsNullOrWhiteSpace(request.SessionId))
        {
            return BadRequest(new { errors = new[] { "SessionId is required." } });
        }

        var result = await ucpFlowTestService.ExecuteGetSessionAsync(request, ct);
        return Ok(result);
    }

    [HttpPost("ucp-test/sessions/update")]
    [ProducesResponseType<UcpFlowStepResultDto>(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> UpdateSession([FromBody] UcpTestUpdateSessionRequestDto? request, CancellationToken ct)
    {
        if (request == null)
        {
            return BadRequest(new { errors = new[] { "Request body is required." } });
        }

        if (string.IsNullOrWhiteSpace(request.SessionId))
        {
            return BadRequest(new { errors = new[] { "SessionId is required." } });
        }

        var result = await ucpFlowTestService.ExecuteUpdateSessionAsync(request, ct);
        return Ok(result);
    }

    [HttpPost("ucp-test/sessions/complete")]
    [ProducesResponseType<UcpFlowStepResultDto>(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> CompleteSession([FromBody] UcpTestCompleteSessionRequestDto? request, CancellationToken ct)
    {
        if (request == null)
        {
            return BadRequest(new { errors = new[] { "Request body is required." } });
        }

        if (string.IsNullOrWhiteSpace(request.SessionId))
        {
            return BadRequest(new { errors = new[] { "SessionId is required." } });
        }

        if (!request.DryRun && string.IsNullOrWhiteSpace(request.Request?.PaymentHandlerId))
        {
            return BadRequest(new { errors = new[] { "PaymentHandlerId is required when DryRun is false." } });
        }

        var result = await ucpFlowTestService.ExecuteCompleteSessionAsync(request, ct);
        return Ok(result);
    }

    [HttpPost("ucp-test/sessions/cancel")]
    [ProducesResponseType<UcpFlowStepResultDto>(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> CancelSession([FromBody] UcpTestCancelSessionRequestDto? request, CancellationToken ct)
    {
        if (request == null)
        {
            return BadRequest(new { errors = new[] { "Request body is required." } });
        }

        if (string.IsNullOrWhiteSpace(request.SessionId))
        {
            return BadRequest(new { errors = new[] { "SessionId is required." } });
        }

        var result = await ucpFlowTestService.ExecuteCancelSessionAsync(request, ct);
        return Ok(result);
    }

    [HttpPost("ucp-test/orders/get")]
    [ProducesResponseType<UcpFlowStepResultDto>(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> GetOrder([FromBody] UcpTestGetOrderRequestDto? request, CancellationToken ct)
    {
        if (request == null)
        {
            return BadRequest(new { errors = new[] { "Request body is required." } });
        }

        if (string.IsNullOrWhiteSpace(request.OrderId))
        {
            return BadRequest(new { errors = new[] { "OrderId is required." } });
        }

        var result = await ucpFlowTestService.ExecuteGetOrderAsync(request, ct);
        return Ok(result);
    }
}
