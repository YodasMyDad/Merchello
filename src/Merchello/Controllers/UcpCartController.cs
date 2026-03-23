using Merchello.Core.Protocols;
using Merchello.Core.Protocols.Interfaces;
using Merchello.Core.Protocols.UCP.Dtos;
using Merchello.Middleware;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;

namespace Merchello.Controllers;

/// <summary>
/// UCP Cart API controller (draft spec).
/// Exposes pre-checkout cart operations per UCP Cart capability.
/// </summary>
[ApiController]
[Route("api/v1/carts")]
public class UcpCartController(
    ICommerceProtocolManager protocolManager) : ControllerBase
{
    /// <summary>
    /// Creates a new cart session.
    /// </summary>
    [HttpPost]
    [Produces("application/json")]
    [ProducesResponseType(StatusCodes.Status201Created)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> CreateCart(
        [FromBody] UcpCreateCartRequestDto request,
        CancellationToken ct)
    {
        var adapter = await GetUcpAdapterAsync(ct);
        if (adapter == null)
        {
            return NotFound(new { error = "UCP protocol not available" });
        }

        var agent = AgentAuthenticationMiddleware.GetAgentIdentity(HttpContext);
        var response = await adapter.CreateCartAsync(request, agent, ct);

        return ToActionResult(response);
    }

    /// <summary>
    /// Retrieves a cart by ID.
    /// </summary>
    [HttpGet("{cartId}")]
    [Produces("application/json")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> GetCart(string cartId, CancellationToken ct)
    {
        var adapter = await GetUcpAdapterAsync(ct);
        if (adapter == null)
        {
            return NotFound(new { error = "UCP protocol not available" });
        }

        var agent = AgentAuthenticationMiddleware.GetAgentIdentity(HttpContext);
        var response = await adapter.GetCartAsync(cartId, agent, ct);

        return ToActionResult(response);
    }

    /// <summary>
    /// Updates a cart (full replacement).
    /// </summary>
    [HttpPut("{cartId}")]
    [Produces("application/json")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> UpdateCart(
        string cartId,
        [FromBody] UcpUpdateCartRequestDto request,
        CancellationToken ct)
    {
        var adapter = await GetUcpAdapterAsync(ct);
        if (adapter == null)
        {
            return NotFound(new { error = "UCP protocol not available" });
        }

        var agent = AgentAuthenticationMiddleware.GetAgentIdentity(HttpContext);
        var response = await adapter.UpdateCartAsync(cartId, request, agent, ct);

        return ToActionResult(response);
    }

    /// <summary>
    /// Cancels a cart session.
    /// </summary>
    [HttpPost("{cartId}/cancel")]
    [Produces("application/json")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> CancelCart(string cartId, CancellationToken ct)
    {
        var adapter = await GetUcpAdapterAsync(ct);
        if (adapter == null)
        {
            return NotFound(new { error = "UCP protocol not available" });
        }

        var agent = AgentAuthenticationMiddleware.GetAgentIdentity(HttpContext);
        var response = await adapter.CancelCartAsync(cartId, agent, ct);

        return ToActionResult(response);
    }

    private async Task<ICommerceProtocolAdapter?> GetUcpAdapterAsync(CancellationToken ct)
    {
        await protocolManager.GetAdaptersAsync(ct);
        return protocolManager.GetAdapter(ProtocolAliases.Ucp);
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
