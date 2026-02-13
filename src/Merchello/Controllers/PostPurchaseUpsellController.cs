using Merchello.Core.Upsells.Dtos;
using Merchello.Core.Upsells.Services.Interfaces;
using Merchello.Core.Upsells.Services.Parameters;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Logging;
using Umbraco.Cms.Core.Media;
using Umbraco.Cms.Core.PropertyEditors;
using Umbraco.Cms.Core.Services;

namespace Merchello.Controllers;

/// <summary>
/// Storefront API for post-purchase upsell flows.
/// </summary>
[Route("api/merchello/checkout/post-purchase")]
[ApiController]
public class PostPurchaseUpsellController(
    IPostPurchaseUpsellService postPurchaseService,
    IMediaService mediaService,
    MediaUrlGeneratorCollection mediaUrlGenerators,
    ILogger<PostPurchaseUpsellController> logger) : ControllerBase
{
    /// <summary>
    /// Get available post-purchase upsells for an invoice.
    /// </summary>
    [HttpGet("{invoiceId:guid}")]
    public async Task<ActionResult<PostPurchaseUpsellsDto>> GetUpsells(
        Guid invoiceId, CancellationToken ct)
    {
        if (!HasValidConfirmationToken(invoiceId))
            return StatusCode(StatusCodes.Status403Forbidden, "You do not have permission to access this post-purchase session.");

        var result = await postPurchaseService.GetAvailableUpsellsAsync(invoiceId, ct);
        if (result == null) return NotFound();

        ResolveProductImageUrls(result.Suggestions);
        return Ok(result);
    }

    /// <summary>
    /// Preview adding a post-purchase upsell item (price, tax, shipping calculation).
    /// </summary>
    [HttpPost("{invoiceId:guid}/preview")]
    public async Task<ActionResult<PostPurchasePreviewDto>> Preview(
        Guid invoiceId, [FromBody] PreviewPostPurchaseDto request, CancellationToken ct)
    {
        if (!HasValidConfirmationToken(invoiceId))
            return StatusCode(StatusCodes.Status403Forbidden, "You do not have permission to access this post-purchase session.");

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
        if (!HasValidConfirmationToken(invoiceId))
            return StatusCode(StatusCodes.Status403Forbidden, "You do not have permission to access this post-purchase session.");

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

        return result.Success ? Ok(result.Data) : BadRequest(result.ErrorMessage);
    }

    /// <summary>
    /// Skip post-purchase upsells and release fulfillment hold.
    /// </summary>
    [HttpPost("{invoiceId:guid}/skip")]
    public async Task<ActionResult> Skip(Guid invoiceId, CancellationToken ct)
    {
        if (!HasValidConfirmationToken(invoiceId))
            return StatusCode(StatusCodes.Status403Forbidden, "You do not have permission to access this post-purchase session.");

        var result = await postPurchaseService.SkipUpsellsAsync(invoiceId, ct);
        return result.Success ? NoContent() : BadRequest(result.ErrorMessage);
    }

    private bool HasValidConfirmationToken(Guid invoiceId)
    {
        var confirmationToken = Request.Cookies[Core.Constants.Cookies.ConfirmationToken];
        if (!Guid.TryParse(confirmationToken, out var tokenInvoiceId) || tokenInvoiceId != invoiceId)
        {
            logger.LogWarning(
                "Unauthorized post-purchase API access attempt for invoice {InvoiceId}. Token: {Token}",
                invoiceId,
                confirmationToken ?? "missing");
            return false;
        }

        return true;
    }

    private void ResolveProductImageUrls(List<UpsellSuggestionDto> suggestions)
    {
        foreach (var product in suggestions.SelectMany(s => s.Products))
        {
            product.ImageUrl = ResolveMediaUrl(product.ImageUrl);
        }
    }

    private string? ResolveMediaUrl(string? image)
    {
        if (string.IsNullOrWhiteSpace(image)) return null;
        if (image.StartsWith('/') || image.StartsWith("http")) return image;

        if (Guid.TryParse(image, out var mediaKey))
        {
            var media = mediaService.GetById(mediaKey);
            if (media != null &&
                mediaUrlGenerators.TryGetMediaPath(media.ContentType.Alias, media.GetValue<string>("umbracoFile"), out var mediaPath))
            {
                return mediaPath;
            }
        }

        return null;
    }
}
