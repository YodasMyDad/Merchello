using System.Security.Cryptography;
using System.Text;
using Merchello.Core.Accounting.Services.Interfaces;
using Merchello.Core.Data;
using Merchello.Core.DigitalProducts.Extensions;
using Merchello.Core.DigitalProducts.Factories;
using Merchello.Core.DigitalProducts.Models;
using Merchello.Core.DigitalProducts.Services.Interfaces;
using Merchello.Core.DigitalProducts.Services.Parameters;
using Merchello.Core.Products.Models;
using Merchello.Core.Products.Services.Interfaces;
using Merchello.Core.Products.Services.Parameters;
using Merchello.Core.Settings.Services.Interfaces;
using Merchello.Core.Shared.Models;
using Merchello.Core.Shared.Models.Enums;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using Umbraco.Cms.Core.Services;
using Umbraco.Cms.Persistence.EFCore.Scoping;

namespace Merchello.Core.DigitalProducts.Services;

/// <summary>
/// Service for managing digital product downloads.
/// </summary>
public class DigitalProductService(
    IEFCoreScopeProvider<MerchelloDbContext> efCoreScopeProvider,
    IInvoiceService invoiceService,
    IProductService productService,
    IMediaService mediaService,
    DownloadLinkFactory factory,
    IOptions<MerchelloSettings> settings,
    ILogger<DigitalProductService> logger,
    IMerchelloStoreSettingsService? storeSettingsService = null) : IDigitalProductService
{
    private readonly MerchelloSettings _settings = settings.Value;
    private readonly IMerchelloStoreSettingsService? _storeSettingsService = storeSettingsService;

    /// <inheritdoc />
    public async Task<CrudResult<List<DownloadLink>>> CreateDownloadLinksAsync(
        CreateDownloadLinksParameters parameters,
        CancellationToken ct = default)
    {
        var result = new CrudResult<List<DownloadLink>>();

        // Idempotency check - return existing links if already created
        using var scope = efCoreScopeProvider.CreateScope();
        var existingLinks = await scope.ExecuteWithContextAsync(async db =>
            await db.DownloadLinks
                .Where(l => l.InvoiceId == parameters.InvoiceId)
                .ToListAsync(ct));

        if (existingLinks.Count > 0)
        {
            scope.Complete();
            var configError = ValidateConfiguration();
            if (configError != null)
            {
                result.Messages.Add(new ResultMessage
                {
                    ResultMessageType = ResultMessageType.Error,
                    Message = configError
                });
                return result;
            }
            PopulateDownloadUrls(existingLinks);
            result.ResultObject = existingLinks;
            result.Messages.Add(new ResultMessage
            {
                ResultMessageType = ResultMessageType.Success,
                Message = "Download links already exist"
            });
            return result;
        }

        // Load invoice with line items
        var invoice = await invoiceService.GetInvoiceAsync(parameters.InvoiceId, ct);
        if (invoice == null)
        {
            scope.Complete();
            result.Messages.Add(new ResultMessage
            {
                ResultMessageType = ResultMessageType.Error,
                Message = "Invoice not found"
            });
            return result;
        }

        if (invoice.CustomerId == Guid.Empty)
        {
            scope.Complete();
            result.Messages.Add(new ResultMessage
            {
                ResultMessageType = ResultMessageType.Error,
                Message = "Digital products require a customer account"
            });
            return result;
        }

        var links = new List<DownloadLink>();

        // Process each line item with a product
        var lineItems = (invoice.Orders?.SelectMany(o => o.LineItems ?? []) ?? []).ToList();
        var productIds = lineItems
            .Where(li => li.ProductId.HasValue)
            .Select(li => li.ProductId!.Value)
            .Distinct()
            .ToList();

        // Load products (variants) with their ProductRoot - EFCore scopes are not thread-safe for concurrent access
        var products = new Dictionary<Guid, ProductRoot>();
        foreach (var id in productIds)
        {
            var product = await productService.GetProduct(
                new GetProductParameters { ProductId = id, IncludeProductRoot = true }, ct);
            if (product?.ProductRoot != null)
                products[id] = product.ProductRoot;
        }

        foreach (var lineItem in lineItems.Where(li => li.ProductId.HasValue))
        {
            if (!products.TryGetValue(lineItem.ProductId!.Value, out var product))
                continue;

            if (!product.IsDigitalProduct)
                continue;

            var fileIds = product.GetDigitalFileIds();
            if (fileIds.Count == 0)
                continue;

            var expiryDays = product.GetDownloadLinkExpiryDays();
            var maxDownloads = product.GetMaxDownloadsPerLink();

            foreach (var mediaId in fileIds)
            {
                // Get file name from Umbraco media
                var fileName = "Download";
                if (Guid.TryParse(mediaId, out var mediaGuid))
                {
                    var media = mediaService.GetById(mediaGuid);
                    if (media != null)
                    {
                        fileName = media.Name ?? "Download";
                    }
                }

                links.Add(factory.Create(new CreateDownloadLinkParameters
                {
                    InvoiceId = invoice.Id,
                    LineItemId = lineItem.Id,
                    CustomerId = invoice.CustomerId,
                    MediaId = mediaId,
                    FileName = fileName,
                    ExpiryDays = expiryDays,
                    MaxDownloads = maxDownloads > 0 ? maxDownloads : null
                }));
            }
        }

        // No digital products in this invoice - return empty success
        if (links.Count == 0)
        {
            scope.Complete();
            result.ResultObject = [];
            return result;
        }

        // Only validate configuration when we actually have digital products to process
        var linkConfigError = ValidateConfiguration();
        if (linkConfigError != null)
        {
            scope.Complete();
            result.Messages.Add(new ResultMessage
            {
                ResultMessageType = ResultMessageType.Error,
                Message = linkConfigError
            });
            return result;
        }

        // Save all links
        await scope.ExecuteWithContextAsync<bool>(async db =>
        {
            await db.DownloadLinks.AddRangeAsync(links, ct);
            await db.SaveChangesAsync(ct);
            return true;
        });
        scope.Complete();

        PopulateDownloadUrls(links);
        result.ResultObject = links;
        result.Messages.Add(new ResultMessage
        {
            ResultMessageType = ResultMessageType.Success,
            Message = $"Created {links.Count} download link(s)"
        });

        return result;
    }

    /// <inheritdoc />
    public async Task<CrudResult<DownloadLink>> ValidateDownloadTokenAsync(
        ValidateDownloadTokenParameters parameters,
        CancellationToken ct = default)
    {
        var result = new CrudResult<DownloadLink>();
        const string invalidTokenMessage = "Invalid download token";

        // Parse link ID from token
        var parts = parameters.Token.Split('-', 2);
        if (parts.Length != 2 || !Guid.TryParse(parts[0], out var linkId))
        {
            result.Messages.Add(new ResultMessage
            {
                ResultMessageType = ResultMessageType.Error,
                Message = invalidTokenMessage
            });
            return result;
        }

        // Load the download link
        using var scope = efCoreScopeProvider.CreateScope();
        var link = await scope.ExecuteWithContextAsync(async db =>
            await db.DownloadLinks.FindAsync([linkId], ct));
        scope.Complete();

        if (link == null)
        {
            result.Messages.Add(new ResultMessage
            {
                ResultMessageType = ResultMessageType.Error,
                Message = invalidTokenMessage
            });
            return result;
        }

        // Validate HMAC signature
        if (!ValidateTokenSignature(link, parameters.Token))
        {
            logger.LogWarning("Invalid token signature for download link {LinkId}", linkId);
            result.Messages.Add(new ResultMessage
            {
                ResultMessageType = ResultMessageType.Error,
                Message = invalidTokenMessage
            });
            return result;
        }

        // Check ownership if customer ID provided
        if (parameters.CustomerId.HasValue && link.CustomerId != parameters.CustomerId.Value)
        {
            logger.LogWarning(
                "Customer {CustomerId} attempted to access download link {LinkId} belonging to {OwnerCustomerId}",
                parameters.CustomerId, linkId, link.CustomerId);
            result.Messages.Add(new ResultMessage
            {
                ResultMessageType = ResultMessageType.Error,
                Message = invalidTokenMessage
            });
            return result;
        }

        // Check if expired
        if (link.ExpiresUtc.HasValue && link.ExpiresUtc < DateTime.UtcNow)
        {
            result.Messages.Add(new ResultMessage
            {
                ResultMessageType = ResultMessageType.Error,
                Message = "Download link has expired"
            });
            return result;
        }

        // Check download limit
        if (link.MaxDownloads.HasValue && link.DownloadCount >= link.MaxDownloads)
        {
            result.Messages.Add(new ResultMessage
            {
                ResultMessageType = ResultMessageType.Error,
                Message = "Download limit reached"
            });
            return result;
        }

        PopulateDownloadUrls([link]);
        result.ResultObject = link;
        result.Messages.Add(new ResultMessage
        {
            ResultMessageType = ResultMessageType.Success,
            Message = "Token validated"
        });

        return result;
    }

    /// <inheritdoc />
    public async Task<CrudResult<bool>> RecordDownloadAsync(Guid downloadLinkId, CancellationToken ct = default)
    {
        var result = new CrudResult<bool>();

        using var scope = efCoreScopeProvider.CreateScope();
        var link = await scope.ExecuteWithContextAsync(async db =>
            await db.DownloadLinks.FindAsync([downloadLinkId], ct));

        if (link == null)
        {
            scope.Complete();
            result.Messages.Add(new ResultMessage
            {
                ResultMessageType = ResultMessageType.Error,
                Message = "Download link not found"
            });
            return result;
        }

        link.DownloadCount++;
        link.LastDownloadUtc = DateTime.UtcNow;

        await scope.ExecuteWithContextAsync<bool>(async db =>
            { await db.SaveChangesAsync(ct); return true; });
        scope.Complete();

        result.ResultObject = true;
        result.Messages.Add(new ResultMessage
        {
            ResultMessageType = ResultMessageType.Success,
            Message = "Download recorded"
        });

        return result;
    }

    /// <inheritdoc />
    public async Task<List<DownloadLink>> GetCustomerDownloadsAsync(
        GetCustomerDownloadsParameters parameters,
        CancellationToken ct = default)
    {
        return await GetDownloadLinksAsync(
            customerId: parameters.CustomerId,
            invoiceId: null,
            includeExpired: parameters.IncludeExpired,
            orderBy: q => q.OrderByDescending(l => l.DateCreated),
            ct);
    }

    /// <inheritdoc />
    public async Task<List<DownloadLink>> GetInvoiceDownloadsAsync(Guid invoiceId, CancellationToken ct = default)
    {
        return await GetDownloadLinksAsync(
            customerId: null,
            invoiceId: invoiceId,
            includeExpired: true,
            orderBy: q => q.OrderBy(l => l.FileName),
            ct);
    }

    /// <inheritdoc />
    public async Task<bool> IsDigitalOnlyInvoiceAsync(Guid invoiceId, CancellationToken ct = default)
    {
        var invoice = await invoiceService.GetInvoiceAsync(invoiceId, ct);
        if (invoice == null)
            return false;

        var lineItems = (invoice.Orders?.SelectMany(o => o.LineItems ?? []) ?? []).ToList();
        var productIds = lineItems
            .Where(li => li.ProductId.HasValue)
            .Select(li => li.ProductId!.Value)
            .Distinct()
            .ToList();

        if (productIds.Count == 0)
            return false;

        // Load products (variants) with their ProductRoot sequentially - EFCore scopes are not thread-safe
        var productRoots = new List<ProductRoot?>();
        foreach (var id in productIds)
        {
            var product = await productService.GetProduct(
                new GetProductParameters { ProductId = id, IncludeProductRoot = true }, ct);
            productRoots.Add(product?.ProductRoot);
        }

        // Return false if any product is physical (not digital)
        return productRoots.All(p => p == null || p.IsDigitalProduct);
    }

    /// <inheritdoc />
    public async Task<CrudResult<List<DownloadLink>>> RegenerateDownloadLinksAsync(
        RegenerateDownloadLinksParameters parameters,
        CancellationToken ct = default)
    {
        var result = new CrudResult<List<DownloadLink>>();

        // Delete existing links (invalidates old tokens)
        using var scope = efCoreScopeProvider.CreateScope();
        var oldLinks = await scope.ExecuteWithContextAsync(async db =>
            await db.DownloadLinks
                .Where(l => l.InvoiceId == parameters.InvoiceId)
                .ToListAsync(ct));

        if (oldLinks.Count > 0)
        {
            await scope.ExecuteWithContextAsync<bool>(async db =>
            {
                db.DownloadLinks.RemoveRange(oldLinks);
                await db.SaveChangesAsync(ct);
                return true;
            });
            logger.LogInformation(
                "Invalidated {Count} old download links for invoice {InvoiceId}",
                oldLinks.Count, parameters.InvoiceId);
        }
        scope.Complete();

        // Create fresh links
        var createResult = await CreateDownloadLinksAsync(
            new CreateDownloadLinksParameters { InvoiceId = parameters.InvoiceId },
            ct);

        if (!createResult.Success)
        {
            result.Messages = createResult.Messages;
            return result;
        }

        // If custom expiry was specified, update the links
        if (parameters.NewExpiryDays.HasValue && createResult.ResultObject != null)
        {
            var newExpiry = parameters.NewExpiryDays.Value > 0
                ? DateTime.UtcNow.AddDays(parameters.NewExpiryDays.Value)
                : (DateTime?)null;

            foreach (var link in createResult.ResultObject)
            {
                link.ExpiresUtc = newExpiry;
            }

            using var updateScope = efCoreScopeProvider.CreateScope();
            await updateScope.ExecuteWithContextAsync<bool>(async db =>
                { await db.SaveChangesAsync(ct); return true; });
            updateScope.Complete();
        }

        result.ResultObject = createResult.ResultObject;
        result.Messages.Add(new ResultMessage
        {
            ResultMessageType = ResultMessageType.Success,
            Message = $"Regenerated {createResult.ResultObject?.Count ?? 0} download link(s)"
        });

        return result;
    }

    private async Task<List<DownloadLink>> GetDownloadLinksAsync(
        Guid? customerId,
        Guid? invoiceId,
        bool includeExpired,
        Func<IQueryable<DownloadLink>, IOrderedQueryable<DownloadLink>> orderBy,
        CancellationToken ct)
    {
        using var scope = efCoreScopeProvider.CreateScope();
        var links = await scope.ExecuteWithContextAsync(async db =>
        {
            var query = db.DownloadLinks.AsQueryable();

            if (customerId.HasValue)
            {
                query = query.Where(l => l.CustomerId == customerId.Value);
            }

            if (invoiceId.HasValue)
            {
                query = query.Where(l => l.InvoiceId == invoiceId.Value);
            }

            if (!includeExpired)
            {
                var now = DateTime.UtcNow;
                query = query.Where(l =>
                    (!l.ExpiresUtc.HasValue || l.ExpiresUtc > now) &&
                    (!l.MaxDownloads.HasValue || l.DownloadCount < l.MaxDownloads));
            }

            return await orderBy(query).ToListAsync(ct);
        });
        scope.Complete();

        PopulateDownloadUrls(links);
        return links;
    }

    /// <summary>
    /// Populates the DownloadUrl property on download links using the configured WebsiteUrl.
    /// </summary>
    private void PopulateDownloadUrls(IEnumerable<DownloadLink> links)
    {
        var baseUrl = (GetWebsiteUrl() ?? string.Empty).TrimEnd('/');
        foreach (var link in links)
        {
            link.DownloadUrl = $"{baseUrl}/api/merchello/downloads/{link.Token}";
        }
    }

    /// <summary>
    /// Validates the HMAC signature in the token using constant-time comparison.
    /// </summary>
    private bool ValidateTokenSignature(DownloadLink link, string providedToken)
    {
        // Recompute expected signature
        var payload = $"{link.Id}:{link.CustomerId}:{link.MediaId}";
        using var hmac = new HMACSHA256(Encoding.UTF8.GetBytes(_settings.DownloadTokenSecret));
        var expectedHash = hmac.ComputeHash(Encoding.UTF8.GetBytes(payload));

        // Extract hash from provided token (after the hyphen)
        var parts = providedToken.Split('-', 2);
        if (parts.Length != 2)
            return false;

        // Restore URL-safe Base64 to standard Base64
        var providedHashBase64 = parts[1].Replace("-", "+").Replace("_", "/");

        // Pad base64 if needed
        switch (providedHashBase64.Length % 4)
        {
            case 2: providedHashBase64 += "=="; break;
            case 3: providedHashBase64 += "="; break;
        }

        byte[] providedHash;
        try
        {
            providedHash = Convert.FromBase64String(providedHashBase64);
        }
        catch (FormatException)
        {
            return false;
        }

        // Use constant-time comparison to prevent timing attacks
        return CryptographicOperations.FixedTimeEquals(expectedHash, providedHash);
    }

    /// <summary>
    /// Validates that digital product configuration is complete.
    /// Returns an error message if configuration is missing, null if valid.
    /// </summary>
    private string? ValidateConfiguration()
    {
        if (string.IsNullOrEmpty(GetWebsiteUrl()))
        {
            logger.LogError(
                "Digital products require Merchello:Store:WebsiteUrl to be configured (e.g., \"https://shop.example.com\")");
            return "Digital product configuration incomplete: Store.WebsiteUrl not configured";
        }

        if (string.IsNullOrEmpty(_settings.DownloadTokenSecret) || _settings.DownloadTokenSecret.Length < 32)
        {
            logger.LogError(
                "Digital products require Merchello:DownloadTokenSecret to be configured with at least 32 characters");
            return "Digital product configuration incomplete: DownloadTokenSecret not configured or too short";
        }

        return null;
    }

    private string? GetWebsiteUrl() =>
        _storeSettingsService?.GetRuntimeSettings().Merchello.Store.WebsiteUrl ?? _settings.Store.WebsiteUrl;
}
