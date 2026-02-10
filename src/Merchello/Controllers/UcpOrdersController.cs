using Merchello.Core.Protocols;
using Merchello.Core.Protocols.Interfaces;
using Merchello.Middleware;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;

namespace Merchello.Controllers;

/// <summary>
/// UCP Orders API controller.
/// Exposes order operations per UCP spec.
/// </summary>
[ApiController]
[Route("api/v1/orders")]
public class UcpOrdersController(
    ICommerceProtocolManager protocolManager) : ControllerBase
{
    /// <summary>
    /// Retrieves an order by ID.
    /// </summary>
    [HttpGet("{orderId}")]
    [Produces("application/json")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> GetOrder(string orderId, CancellationToken ct)
    {
        // Ensure adapters are loaded (triggers ExtensionManager discovery on first call)
        await protocolManager.GetAdaptersAsync(ct);

        var adapter = protocolManager.GetAdapter(ProtocolAliases.Ucp);
        if (adapter == null)
        {
            return NotFound(new { error = "UCP protocol not available" });
        }

        var agent = AgentAuthenticationMiddleware.GetAgentIdentity(HttpContext);
        var response = await adapter.GetOrderAsync(orderId, agent, ct);

        if (response.Success)
        {
            return Ok(response.Data);
        }

        return StatusCode(response.StatusCode, new
        {
            error = response.Error?.Code,
            message = response.Error?.Message
        });
    }
}
