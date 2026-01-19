using System.Security.Cryptography;
using System.Text;
using Merchello.Core.DigitalProducts.Models;
using Merchello.Core.DigitalProducts.Services.Parameters;
using Merchello.Core.Shared.Models;
using Microsoft.Extensions.Options;

namespace Merchello.Core.DigitalProducts.Factories;

/// <summary>
/// Factory for creating DownloadLink entities with secure tokens.
/// </summary>
public class DownloadLinkFactory(IOptions<MerchelloSettings> settings)
{
    private readonly MerchelloSettings _settings = settings.Value;

    /// <summary>
    /// Creates a new download link with a secure HMAC-signed token.
    /// </summary>
    public DownloadLink Create(CreateDownloadLinkParameters parameters)
    {
        var expiryDays = parameters.ExpiryDays ?? _settings.DefaultDownloadLinkExpiryDays;
        var linkId = Guid.NewGuid();

        return new DownloadLink
        {
            Id = linkId,
            InvoiceId = parameters.InvoiceId,
            LineItemId = parameters.LineItemId,
            CustomerId = parameters.CustomerId,
            MediaId = parameters.MediaId,
            FileName = parameters.FileName,
            Token = GenerateSecureToken(linkId, parameters),
            ExpiresUtc = expiryDays > 0 ? DateTime.UtcNow.AddDays(expiryDays) : null,
            MaxDownloads = parameters.MaxDownloads > 0 ? parameters.MaxDownloads : null,
            DownloadCount = 0,
            DateCreated = DateTime.UtcNow
        };
    }

    /// <summary>
    /// Generates a secure HMAC-signed token for the download link.
    /// Format: {linkId:N}-{base64UrlSafeSignature}
    /// </summary>
    private string GenerateSecureToken(Guid linkId, CreateDownloadLinkParameters parameters)
    {
        var payload = $"{linkId}:{parameters.CustomerId}:{parameters.MediaId}";
        using var hmac = new HMACSHA256(Encoding.UTF8.GetBytes(_settings.DownloadTokenSecret));
        var hash = hmac.ComputeHash(Encoding.UTF8.GetBytes(payload));

        // URL-safe Base64 encoding
        var signature = Convert.ToBase64String(hash)
            .Replace("+", "-")
            .Replace("/", "_")
            .TrimEnd('=');

        return $"{linkId:N}-{signature}";
    }
}
