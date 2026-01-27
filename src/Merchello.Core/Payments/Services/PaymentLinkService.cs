using Merchello.Core.Accounting.Models;
using Merchello.Core.Data;
using Merchello.Core.Payments.Models;
using Merchello.Core.Payments.Providers;
using Merchello.Core.Payments.Providers.Interfaces;
using Merchello.Core.Payments.Services.Interfaces;
using Merchello.Core.Shared.Extensions;
using Merchello.Core.Shared.Models;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using Umbraco.Cms.Persistence.EFCore.Scoping;

namespace Merchello.Core.Payments.Services;

/// <summary>
/// Service for creating and managing payment links for invoices.
/// </summary>
public class PaymentLinkService(
    IEFCoreScopeProvider<MerchelloDbContext> efCoreScopeProvider,
    IPaymentProviderManager providerManager,
    IPaymentService paymentService,
    ILogger<PaymentLinkService> logger) : IPaymentLinkService
{
    // ExtendedData keys for payment link storage
    private const string KeyPaymentLinkUrl = "PaymentLink:Url";
    private const string KeyPaymentLinkProviderId = "PaymentLink:ProviderId";
    private const string KeyPaymentLinkProviderAlias = "PaymentLink:ProviderAlias";
    private const string KeyPaymentLinkProviderDisplayName = "PaymentLink:ProviderDisplayName";
    private const string KeyPaymentLinkCreatedAt = "PaymentLink:CreatedAt";
    private const string KeyPaymentLinkCreatedBy = "PaymentLink:CreatedBy";

    /// <inheritdoc />
    public async Task<CrudResult<PaymentLinkInfo>> CreatePaymentLinkAsync(
        Guid invoiceId,
        string providerAlias,
        string? createdBy = null,
        CancellationToken cancellationToken = default)
    {
        var crudResult = new CrudResult<PaymentLinkInfo>();

        // Get the provider
        var registeredProvider = await providerManager.GetProviderAsync(providerAlias, requireEnabled: true, cancellationToken);
        if (registeredProvider is null)
        {
            crudResult.AddErrorMessage($"Payment provider '{providerAlias}' not found or not enabled.");
            return crudResult;
        }

        // Check if provider supports payment links
        if (!registeredProvider.Metadata.SupportsPaymentLinks)
        {
            crudResult.AddErrorMessage($"Payment provider '{providerAlias}' does not support payment links.");
            return crudResult;
        }

        using var scope = efCoreScopeProvider.CreateScope();

        // Get the invoice
        var invoice = await scope.ExecuteWithContextAsync(async db =>
            await db.Invoices
                .FirstOrDefaultAsync(x => x.Id == invoiceId && !x.IsDeleted && !x.IsCancelled, cancellationToken));

        if (invoice is null)
        {
            crudResult.AddErrorMessage("Invoice not found, deleted, or cancelled.");
            return crudResult;
        }

        // Check if invoice is already paid
        var paymentStatus = await paymentService.GetInvoicePaymentStatusAsync(invoiceId, cancellationToken);
        if (paymentStatus == InvoicePaymentStatus.Paid)
        {
            crudResult.AddErrorMessage("Cannot create payment link for an already paid invoice.");
            return crudResult;
        }

        // Check if there's an existing active payment link
        if (invoice.ExtendedData.TryGetValue(KeyPaymentLinkUrl, out var existingUrl) &&
            existingUrl is string existingUrlStr && !string.IsNullOrEmpty(existingUrlStr))
        {
            // Deactivate the existing link first
            var existingProviderId = invoice.ExtendedData.TryGetValue(KeyPaymentLinkProviderId, out var pid)
                ? pid?.ToString()
                : null;
            var existingProviderAlias = invoice.ExtendedData.TryGetValue(KeyPaymentLinkProviderAlias, out var pa)
                ? pa?.ToString()
                : null;

            if (!string.IsNullOrEmpty(existingProviderId) && !string.IsNullOrEmpty(existingProviderAlias))
            {
                var existingProvider = await providerManager.GetProviderAsync(existingProviderAlias, requireEnabled: false, cancellationToken);
                if (existingProvider is not null)
                {
                    await existingProvider.Provider.DeactivatePaymentLinkAsync(existingProviderId, cancellationToken);
                }
            }
        }

        // Build the payment link request
        var request = new PaymentLinkRequest
        {
            InvoiceId = invoiceId,
            Amount = invoice.Total,
            Currency = invoice.CurrencyCode,
            CustomerEmail = invoice.BillingAddress.Email,
            CustomerName = invoice.BillingAddress.Name,
            Description = $"Invoice {invoice.InvoiceNumber}",
            Metadata = new Dictionary<string, string>
            {
                ["invoiceNumber"] = invoice.InvoiceNumber,
                ["customerId"] = invoice.CustomerId.ToString()
            }
        };

        // Call the provider to create the payment link
        var result = await registeredProvider.Provider.CreatePaymentLinkAsync(request, cancellationToken);

        if (!result.Success)
        {
            logger.LogWarning(
                "Failed to create payment link for invoice {InvoiceId} with provider {Provider}: {Error}",
                invoiceId, providerAlias, result.ErrorMessage);
            crudResult.AddErrorMessage(result.ErrorMessage ?? "Failed to create payment link.");
            return crudResult;
        }

        // Store the payment link data in ExtendedData
        var now = DateTime.UtcNow;
        invoice.ExtendedData[KeyPaymentLinkUrl] = result.PaymentUrl!;
        invoice.ExtendedData[KeyPaymentLinkProviderId] = result.ProviderLinkId!;
        invoice.ExtendedData[KeyPaymentLinkProviderAlias] = providerAlias;
        invoice.ExtendedData[KeyPaymentLinkProviderDisplayName] = registeredProvider.DisplayName;
        invoice.ExtendedData[KeyPaymentLinkCreatedAt] = now.ToString("O");
        if (!string.IsNullOrEmpty(createdBy))
        {
            invoice.ExtendedData[KeyPaymentLinkCreatedBy] = createdBy;
        }

        invoice.DateUpdated = now;

        await scope.ExecuteWithContextAsync<bool>(async db =>
        {
            db.Invoices.Update(invoice);
            await db.SaveChangesAsync(cancellationToken);
            return true;
        });
        scope.Complete();

        logger.LogInformation(
            "Created payment link for invoice {InvoiceId} with provider {Provider}",
            invoiceId, providerAlias);

        crudResult.ResultObject = new PaymentLinkInfo
        {
            PaymentUrl = result.PaymentUrl,
            ProviderLinkId = result.ProviderLinkId,
            ProviderAlias = providerAlias,
            ProviderDisplayName = registeredProvider.DisplayName,
            CreatedAt = now,
            CreatedBy = createdBy,
            IsPaid = false
        };

        return crudResult;
    }

    /// <inheritdoc />
    public async Task<PaymentLinkInfo?> GetPaymentLinkForInvoiceAsync(
        Guid invoiceId,
        CancellationToken cancellationToken = default)
    {
        using var scope = efCoreScopeProvider.CreateScope();

        var invoice = await scope.ExecuteWithContextAsync(async db =>
            await db.Invoices
                .AsNoTracking()
                .FirstOrDefaultAsync(x => x.Id == invoiceId && !x.IsDeleted, cancellationToken));

        if (invoice is null)
        {
            return null;
        }

        // Check if there's a payment link stored
        if (!invoice.ExtendedData.TryGetValue(KeyPaymentLinkUrl, out var urlObj) ||
            urlObj is not string paymentUrl || string.IsNullOrEmpty(paymentUrl))
        {
            return null;
        }

        // Get payment status
        var paymentStatus = await paymentService.GetInvoicePaymentStatusAsync(invoiceId, cancellationToken);

        // Extract stored values
        var providerLinkId = invoice.ExtendedData.TryGetValue(KeyPaymentLinkProviderId, out var pid)
            ? pid?.ToString()
            : null;
        var providerAlias = invoice.ExtendedData.TryGetValue(KeyPaymentLinkProviderAlias, out var pa)
            ? pa?.ToString()
            : null;
        var providerDisplayName = invoice.ExtendedData.TryGetValue(KeyPaymentLinkProviderDisplayName, out var pdn)
            ? pdn?.ToString()
            : null;
        var createdAtStr = invoice.ExtendedData.TryGetValue(KeyPaymentLinkCreatedAt, out var ca)
            ? ca?.ToString()
            : null;
        var createdBy = invoice.ExtendedData.TryGetValue(KeyPaymentLinkCreatedBy, out var cb)
            ? cb?.ToString()
            : null;

        DateTime? createdAt = null;
        if (!string.IsNullOrEmpty(createdAtStr) && DateTime.TryParse(createdAtStr, out var parsed))
        {
            createdAt = parsed;
        }

        return new PaymentLinkInfo
        {
            PaymentUrl = paymentUrl,
            ProviderLinkId = providerLinkId,
            ProviderAlias = providerAlias,
            ProviderDisplayName = providerDisplayName,
            CreatedAt = createdAt,
            CreatedBy = createdBy,
            IsPaid = paymentStatus == InvoicePaymentStatus.Paid
        };
    }

    /// <inheritdoc />
    public async Task<CrudResult<bool>> DeactivatePaymentLinkAsync(
        Guid invoiceId,
        CancellationToken cancellationToken = default)
    {
        var crudResult = new CrudResult<bool>();

        using var scope = efCoreScopeProvider.CreateScope();

        var invoice = await scope.ExecuteWithContextAsync(async db =>
            await db.Invoices
                .FirstOrDefaultAsync(x => x.Id == invoiceId && !x.IsDeleted, cancellationToken));

        if (invoice is null)
        {
            crudResult.AddErrorMessage("Invoice not found.");
            return crudResult;
        }

        // Check if there's a payment link to deactivate
        if (!invoice.ExtendedData.TryGetValue(KeyPaymentLinkProviderId, out var pidObj) ||
            pidObj is not string providerLinkId || string.IsNullOrEmpty(providerLinkId))
        {
            crudResult.AddErrorMessage("No active payment link found.");
            return crudResult;
        }

        var providerAlias = invoice.ExtendedData.TryGetValue(KeyPaymentLinkProviderAlias, out var pa)
            ? pa?.ToString()
            : null;

        // Call the provider to deactivate
        if (!string.IsNullOrEmpty(providerAlias))
        {
            var provider = await providerManager.GetProviderAsync(providerAlias, requireEnabled: false, cancellationToken);
            if (provider is not null)
            {
                var deactivated = await provider.Provider.DeactivatePaymentLinkAsync(providerLinkId, cancellationToken);
                if (!deactivated)
                {
                    logger.LogWarning(
                        "Failed to deactivate payment link {LinkId} with provider {Provider} for invoice {InvoiceId}",
                        providerLinkId, providerAlias, invoiceId);
                    // Continue anyway to clear local data
                }
            }
        }

        // Clear the payment link data
        invoice.ExtendedData.Remove(KeyPaymentLinkUrl);
        invoice.ExtendedData.Remove(KeyPaymentLinkProviderId);
        invoice.ExtendedData.Remove(KeyPaymentLinkProviderAlias);
        invoice.ExtendedData.Remove(KeyPaymentLinkProviderDisplayName);
        invoice.ExtendedData.Remove(KeyPaymentLinkCreatedAt);
        invoice.ExtendedData.Remove(KeyPaymentLinkCreatedBy);
        invoice.DateUpdated = DateTime.UtcNow;

        await scope.ExecuteWithContextAsync<bool>(async db =>
        {
            db.Invoices.Update(invoice);
            await db.SaveChangesAsync(cancellationToken);
            return true;
        });
        scope.Complete();

        logger.LogInformation("Deactivated payment link for invoice {InvoiceId}", invoiceId);

        crudResult.ResultObject = true;
        return crudResult;
    }

    /// <inheritdoc />
    public async Task<IReadOnlyList<PaymentLinkProviderInfo>> GetPaymentLinkProvidersAsync(
        CancellationToken cancellationToken = default)
    {
        var providers = await providerManager.GetEnabledProvidersAsync(cancellationToken);

        return providers
            .Where(p => p.Metadata.SupportsPaymentLinks)
            .Select(p => new PaymentLinkProviderInfo
            {
                Alias = p.Metadata.Alias,
                DisplayName = p.DisplayName,
                IconHtml = p.Metadata.IconHtml
            })
            .ToList();
    }
}
