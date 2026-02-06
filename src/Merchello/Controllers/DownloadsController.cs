using Merchello.Core.Customers.Services.Interfaces;
using Merchello.Core.DigitalProducts.Dtos;
using Merchello.Core.DigitalProducts.Services.Interfaces;
using Merchello.Core.DigitalProducts.Services.Parameters;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using Umbraco.Cms.Core.Security;
using Umbraco.Cms.Core.Services;

namespace Merchello.Controllers;

/// <summary>
/// API controller for secure digital product downloads.
/// </summary>
[ApiController]
[Route("api/merchello/downloads")]
public class DownloadsController(
    IDigitalProductService digitalProductService,
    IMediaService mediaService,
    ICustomerService customerService,
    IMemberManager memberManager) : ControllerBase
{
    /// <summary>
    /// Downloads a file using a secure token.
    /// Rate limited to prevent abuse.
    /// </summary>
    [HttpGet("{token}")]
    [EnableRateLimiting("downloads")]
    public async Task<IActionResult> Download(string token, CancellationToken ct)
    {
        // Get current customer ID if authenticated
        Guid? customerId = null;
        var member = await memberManager.GetCurrentMemberAsync();
        if (member != null)
        {
            var customer = await customerService.GetByMemberKeyAsync(member.Key, ct);
            customerId = customer?.Id;
        }

        // Validate the token
        var validationResult = await digitalProductService.ValidateDownloadTokenAsync(
            new ValidateDownloadTokenParameters
            {
                Token = token,
                CustomerId = customerId
            }, ct);

        if (!validationResult.Success || validationResult.ResultObject == null)
        {
            var errorMessage = validationResult.Messages.FirstOrDefault()?.Message ?? "Invalid download token";
            return BadRequest(new { error = errorMessage });
        }

        var link = validationResult.ResultObject;

        // Get the media file
        if (!Guid.TryParse(link.MediaId, out var mediaGuid))
        {
            return NotFound(new { error = "Media file not found" });
        }

        var media = mediaService.GetById(mediaGuid);
        if (media == null)
        {
            return NotFound(new { error = "Media file not found" });
        }

        // Get the file path from the media
        var umbracoFile = media.GetValue<string>("umbracoFile");
        if (string.IsNullOrEmpty(umbracoFile))
        {
            return NotFound(new { error = "Media file path not found" });
        }

        // Parse the src from umbracoFile (may be JSON or direct path)
        string filePath;
        if (umbracoFile.StartsWith("{"))
        {
            // JSON format: {"src":"/media/...","crops":[]}
            try
            {
                var json = System.Text.Json.JsonDocument.Parse(umbracoFile);
                filePath = json.RootElement.GetProperty("src").GetString() ?? "";
            }
            catch
            {
                // Expected: JSON parsing may fail for legacy/malformed data - fall back to treating as direct path
                filePath = umbracoFile;
            }
        }
        else
        {
            filePath = umbracoFile;
        }

        if (string.IsNullOrEmpty(filePath))
        {
            return NotFound(new { error = "Media file path not found" });
        }

        // Map virtual path to physical path
        var physicalPath = Path.Combine(Directory.GetCurrentDirectory(), "wwwroot", filePath.TrimStart('/').Replace('/', Path.DirectorySeparatorChar));

        // Security: Validate path stays within wwwroot to prevent path traversal attacks
        var fullPath = Path.GetFullPath(physicalPath);
        var wwwrootPath = Path.GetFullPath(Path.Combine(Directory.GetCurrentDirectory(), "wwwroot"));
        if (!fullPath.StartsWith(wwwrootPath, StringComparison.OrdinalIgnoreCase))
        {
            return Forbid();
        }

        if (!System.IO.File.Exists(fullPath))
        {
            return NotFound(new { error = "File not found on disk" });
        }

        // Record the download
        await digitalProductService.RecordDownloadAsync(link.Id, ct);

        // Determine content type
        var contentType = GetContentType(Path.GetExtension(filePath));
        var fileName = link.FileName;
        if (string.IsNullOrEmpty(Path.GetExtension(fileName)))
        {
            fileName += Path.GetExtension(filePath);
        }

        // Stream the file using PhysicalFile for proper handling
        return PhysicalFile(fullPath, contentType, fileName);
    }

    /// <summary>
    /// Gets all download links for the current authenticated customer.
    /// </summary>
    [HttpGet("customer")]
    [Authorize]
    public async Task<IActionResult> GetCustomerDownloads([FromQuery] bool includeExpired = false, CancellationToken ct = default)
    {
        var member = await memberManager.GetCurrentMemberAsync();
        if (member == null)
        {
            return Unauthorized();
        }

        var customer = await customerService.GetByMemberKeyAsync(member.Key, ct);
        if (customer == null)
        {
            return NotFound(new { error = "Customer not found" });
        }

        var links = await digitalProductService.GetCustomerDownloadsAsync(
            new GetCustomerDownloadsParameters
            {
                CustomerId = customer.Id,
                IncludeExpired = includeExpired
            }, ct);

        var dtos = links.Select(MapToDto).ToList();
        return Ok(dtos);
    }

    /// <summary>
    /// Gets all download links for a specific invoice.
    /// Requires authentication - verifies the customer owns the invoice.
    /// </summary>
    [HttpGet("invoice/{invoiceId:guid}")]
    [Authorize]
    public async Task<IActionResult> GetInvoiceDownloads(Guid invoiceId, CancellationToken ct)
    {
        // Verify user is authenticated
        var member = await memberManager.GetCurrentMemberAsync();
        if (member == null)
        {
            return Unauthorized();
        }

        var customer = await customerService.GetByMemberKeyAsync(member.Key, ct);
        if (customer == null)
        {
            return NotFound(new { error = "Customer not found" });
        }

        // Get the download links
        var links = await digitalProductService.GetInvoiceDownloadsAsync(invoiceId, ct);

        // Verify customer owns the invoice by checking download link ownership
        if (links.Count > 0 && links[0].CustomerId != customer.Id)
        {
            return Forbid();
        }

        var dtos = links.Select(MapToDto).ToList();
        return Ok(dtos);
    }

    private static DownloadLinkDto MapToDto(Core.DigitalProducts.Models.DownloadLink link)
    {
        var now = DateTime.UtcNow;
        return new DownloadLinkDto
        {
            Id = link.Id,
            FileName = link.FileName,
            DownloadUrl = link.DownloadUrl,
            ExpiresUtc = link.ExpiresUtc,
            ProductName = "", // Could be populated from line item if needed
            MaxDownloads = link.MaxDownloads,
            DownloadCount = link.DownloadCount,
            RemainingDownloads = link.MaxDownloads.HasValue
                ? Math.Max(0, link.MaxDownloads.Value - link.DownloadCount)
                : null,
            LastDownloadUtc = link.LastDownloadUtc,
            IsExpired = link.ExpiresUtc.HasValue && link.ExpiresUtc < now,
            IsDownloadLimitReached = link.MaxDownloads.HasValue && link.DownloadCount >= link.MaxDownloads
        };
    }

    private static string GetContentType(string extension)
    {
        return extension.ToLowerInvariant() switch
        {
            ".pdf" => "application/pdf",
            ".zip" => "application/zip",
            ".mp3" => "audio/mpeg",
            ".mp4" => "video/mp4",
            ".jpg" or ".jpeg" => "image/jpeg",
            ".png" => "image/png",
            ".gif" => "image/gif",
            ".doc" => "application/msword",
            ".docx" => "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
            ".xls" => "application/vnd.ms-excel",
            ".xlsx" => "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            ".epub" => "application/epub+zip",
            ".mobi" => "application/x-mobipocket-ebook",
            _ => "application/octet-stream"
        };
    }
}
