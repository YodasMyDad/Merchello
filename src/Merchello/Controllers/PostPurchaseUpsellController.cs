using Merchello.Core.Upsells.Dtos;
using Merchello.Core.Upsells.Services.Interfaces;
using Merchello.Core.Upsells.Services.Parameters;
using Microsoft.AspNetCore.Mvc;

namespace Merchello.Controllers;

/// <summary>
/// Storefront API for post-purchase upsell flows.
/// </summary>
[Route("api/merchello/checkout/post-purchase")]
[ApiController]
public class PostPurchaseUpsellController(
    IPostPurchaseUpsellService postPurchaseService) : ControllerBase
{
    /// <summary>
    /// Get available post-purchase upsells for an invoice.
    /// </summary>
    [HttpGet("{invoiceId:guid}")]
    public async Task<ActionResult<PostPurchaseUpsellsDto>> GetUpsells(
        Guid invoiceId, CancellationToken ct)
    {
        var result = await postPurchaseService.GetAvailableUpsellsAsync(invoiceId, ct);
        return result == null ? NotFound() : Ok(result);
    }

    /// <summary>
    /// Preview adding a post-purchase upsell item (price, tax, shipping calculation).
    /// </summary>
    [HttpPost("{invoiceId:guid}/preview")]
    public async Task<ActionResult<PostPurchasePreviewDto>> Preview(
        Guid invoiceId, [FromBody] PreviewPostPurchaseDto request, CancellationToken ct)
    {
        var result = await postPurchaseService.PreviewAddToOrderAsync(
            new PreviewPostPurchaseParameters
            {
                InvoiceId = invoiceId,
                ProductId = request.ProductId,
                Quantity = request.Quantity,
                Addons = request.Addons,
            }, ct);

        return result == null ? NotFound() : Ok(result);
    }

    /// <summary>
    /// Add a post-purchase upsell item and charge the saved payment method.
    /// </summary>
    [HttpPost("{invoiceId:guid}/add")]
    public async Task<ActionResult<PostPurchaseResultDto>> AddToOrder(
        Guid invoiceId, [FromBody] AddPostPurchaseUpsellDto request, CancellationToken ct)
    {
        var result = await postPurchaseService.AddToOrderAsync(
            new AddPostPurchaseUpsellParameters
            {
                InvoiceId = invoiceId,
                ProductId = request.ProductId,
                Quantity = request.Quantity,
                UpsellRuleId = request.UpsellRuleId,
                SavedPaymentMethodId = request.SavedPaymentMethodId,
                IdempotencyKey = request.IdempotencyKey,
                Addons = request.Addons,
            }, ct);

        return result.IsSuccess ? Ok(result.Data) : BadRequest(result.ErrorMessage);
    }

    /// <summary>
    /// Skip post-purchase upsells and release fulfillment hold.
    /// </summary>
    [HttpPost("{invoiceId:guid}/skip")]
    public async Task<ActionResult> Skip(Guid invoiceId, CancellationToken ct)
    {
        var result = await postPurchaseService.SkipUpsellsAsync(invoiceId, ct);
        return result.IsSuccess ? NoContent() : BadRequest(result.ErrorMessage);
    }
}
