using Merchello.Core.Protocols;
using Merchello.Core.Protocols.Interfaces;
using Merchello.Core.Protocols.Models;
using Merchello.Core.Protocols.UCP;
using Merchello.Core.Protocols.UCP.Dtos;
using Merchello.Middleware;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Options;

namespace Merchello.Controllers;

/// <summary>
/// UCP Checkout Sessions API controller.
/// Exposes checkout session operations per UCP spec.
/// </summary>
[ApiController]
[Route("api/v1/checkout-sessions")]
public class UcpCheckoutSessionsController(
    ICommerceProtocolManager protocolManager,
    IOptions<ProtocolSettings> settings) : ControllerBase
{
    /// <summary>
    /// Creates a new checkout session.
    /// </summary>
    [HttpPost]
    [Produces("application/json")]
    [ProducesResponseType(StatusCodes.Status201Created)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> CreateSession(
        [FromBody] UcpCreateSessionRequestDto request,
        CancellationToken ct)
    {
        var adapter = GetUcpAdapter();
        if (adapter == null)
        {
            return NotFound(new { error = "UCP protocol not available" });
        }

        var agent = AgentAuthenticationMiddleware.GetAgentIdentity(HttpContext);
        var response = await adapter.CreateSessionAsync(request, agent, ct);

        return ToActionResult(response);
    }

    /// <summary>
    /// Retrieves a checkout session by ID.
    /// </summary>
    [HttpGet("{sessionId}")]
    [Produces("application/json")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> GetSession(string sessionId, CancellationToken ct)
    {
        var adapter = GetUcpAdapter();
        if (adapter == null)
        {
            return NotFound(new { error = "UCP protocol not available" });
        }

        var agent = AgentAuthenticationMiddleware.GetAgentIdentity(HttpContext);
        var response = await adapter.GetSessionAsync(sessionId, agent, ct);

        return ToActionResult(response);
    }

    /// <summary>
    /// Updates a checkout session.
    /// </summary>
    [HttpPut("{sessionId}")]
    [Produces("application/json")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> UpdateSession(
        string sessionId,
        [FromBody] UcpUpdateSessionRequestDto request,
        CancellationToken ct)
    {
        var adapter = GetUcpAdapter();
        if (adapter == null)
        {
            return NotFound(new { error = "UCP protocol not available" });
        }

        var agent = AgentAuthenticationMiddleware.GetAgentIdentity(HttpContext);
        var response = await adapter.UpdateSessionAsync(sessionId, request, agent, ct);

        return ToActionResult(response);
    }

    /// <summary>
    /// Completes a checkout session (processes payment and creates order).
    /// </summary>
    [HttpPost("{sessionId}/complete")]
    [Produces("application/json")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> CompleteSession(
        string sessionId,
        [FromBody] UcpCompleteSessionRequestDto request,
        CancellationToken ct)
    {
        var adapter = GetUcpAdapter();
        if (adapter == null)
        {
            return NotFound(new { error = "UCP protocol not available" });
        }

        var agent = AgentAuthenticationMiddleware.GetAgentIdentity(HttpContext);
        var response = await adapter.CompleteSessionAsync(sessionId, request, agent, ct);

        return ToActionResult(response);
    }

    /// <summary>
    /// Cancels a checkout session.
    /// </summary>
    [HttpPost("{sessionId}/cancel")]
    [Produces("application/json")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> CancelSession(string sessionId, CancellationToken ct)
    {
        var adapter = GetUcpAdapter();
        if (adapter == null)
        {
            return NotFound(new { error = "UCP protocol not available" });
        }

        var agent = AgentAuthenticationMiddleware.GetAgentIdentity(HttpContext);
        var response = await adapter.CancelSessionAsync(sessionId, agent, ct);

        return ToActionResult(response);
    }

    private ICommerceProtocolAdapter? GetUcpAdapter()
    {
        if (!settings.Value.Enabled || !settings.Value.Ucp.Enabled)
        {
            return null;
        }

        return protocolManager.GetAdapter(ProtocolConstants.Protocols.Ucp);
    }

    private IActionResult ToActionResult(ProtocolResponse response)
    {
        if (response.Success)
        {
            return response.StatusCode == 201
                ? StatusCode(201, response.Data)
                : Ok(response.Data);
        }

        return StatusCode(response.StatusCode, new
        {
            error = response.Error?.Code,
            message = response.Error?.Message,
            details = response.Error?.Details
        });
    }
}
