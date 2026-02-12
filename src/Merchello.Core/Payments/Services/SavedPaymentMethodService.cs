using Merchello.Core.Customers.Services.Interfaces;
using Merchello.Core.Data;
using Merchello.Core.Notifications.Interfaces;
using Merchello.Core.Notifications.SavedPaymentMethodNotifications;
using Merchello.Core.Payments.Factories;
using Merchello.Core.Payments.Models;
using Merchello.Core.Payments.Providers.Interfaces;
using Merchello.Core.Payments.Services.Interfaces;
using Merchello.Core.Payments.Services.Parameters;
using Merchello.Core.Shared.Extensions;
using Merchello.Core.Shared.Models;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using Umbraco.Cms.Persistence.EFCore.Scoping;

namespace Merchello.Core.Payments.Services;

/// <summary>
/// Service for managing saved payment methods (vaulted at payment providers).
/// </summary>
public class SavedPaymentMethodService(
    IEFCoreScopeProvider<MerchelloDbContext> efCoreScopeProvider,
    IPaymentProviderManager providerManager,
    ICustomerService customerService,
    SavedPaymentMethodFactory factory,
    IMerchelloNotificationPublisher notificationPublisher,
    IPaymentIdempotencyService idempotencyService,
    ILogger<SavedPaymentMethodService> logger) : ISavedPaymentMethodService
{
    // =====================================================
    // Query
    // =====================================================

    /// <inheritdoc />
    public async Task<IEnumerable<SavedPaymentMethod>> GetCustomerPaymentMethodsAsync(
        Guid customerId,
        CancellationToken cancellationToken = default)
    {
        using var scope = efCoreScopeProvider.CreateScope();
        var result = await scope.ExecuteWithContextAsync(async db =>
            await db.SavedPaymentMethods
                .AsNoTracking()
                .Where(m => m.CustomerId == customerId)
                .OrderByDescending(m => m.IsDefault)
                .ThenByDescending(m => m.DateCreated)
                .ToListAsync(cancellationToken));
        scope.Complete();
        return result;
    }

    /// <inheritdoc />
    public async Task<SavedPaymentMethod?> GetPaymentMethodAsync(
        Guid id,
        CancellationToken cancellationToken = default)
    {
        using var scope = efCoreScopeProvider.CreateScope();
        var result = await scope.ExecuteWithContextAsync(async db =>
            await db.SavedPaymentMethods
                .AsNoTracking()
                .FirstOrDefaultAsync(m => m.Id == id, cancellationToken));
        scope.Complete();
        return result;
    }

    /// <inheritdoc />
    public async Task<SavedPaymentMethod?> GetDefaultPaymentMethodAsync(
        Guid customerId,
        CancellationToken cancellationToken = default)
    {
        using var scope = efCoreScopeProvider.CreateScope();
        var result = await scope.ExecuteWithContextAsync(async db =>
            await db.SavedPaymentMethods
                .AsNoTracking()
                .Where(m => m.CustomerId == customerId && m.IsDefault)
                .FirstOrDefaultAsync(cancellationToken));
        scope.Complete();
        return result;
    }

    // =====================================================
    // Vault Setup Flow
    // =====================================================

    /// <inheritdoc />
    public async Task<CrudResult<VaultSetupResult>> CreateSetupSessionAsync(
        CreateVaultSetupParameters parameters,
        CancellationToken cancellationToken = default)
    {
        var result = new CrudResult<VaultSetupResult>();

        // Validate customer exists
        var customer = await customerService.GetByIdAsync(parameters.CustomerId, cancellationToken);
        if (customer == null)
        {
            result.AddErrorMessage("Customer not found.");
            return result;
        }

        // Get provider
        var registeredProvider = await providerManager.GetProviderAsync(
            parameters.ProviderAlias, requireEnabled: true, cancellationToken);

        if (registeredProvider == null)
        {
            result.AddErrorMessage($"Payment provider '{parameters.ProviderAlias}' not found or not enabled.");
            return result;
        }

        var provider = registeredProvider.Provider;

        // Check vault support
        if (!provider.Metadata.SupportsVaultedPayments)
        {
            result.AddErrorMessage($"Payment provider '{parameters.ProviderAlias}' does not support vaulted payments.");
            return result;
        }

        // Check vault is enabled
        if (registeredProvider.Setting?.IsVaultingEnabled != true)
        {
            result.AddErrorMessage($"Vaulting is not enabled for provider '{parameters.ProviderAlias}'.");
            return result;
        }

        // Create setup session
        var setupRequest = new VaultSetupRequest
        {
            CustomerId = parameters.CustomerId,
            CustomerEmail = customer.Email,
            CustomerName = $"{customer.FirstName} {customer.LastName}".Trim(),
            MethodAlias = parameters.MethodAlias,
            ReturnUrl = parameters.ReturnUrl,
            CancelUrl = parameters.CancelUrl,
            IpAddress = parameters.IpAddress
        };

        var setupResult = await provider.CreateVaultSetupSessionAsync(setupRequest, cancellationToken);

        if (!setupResult.Success)
        {
            result.AddErrorMessage(setupResult.ErrorMessage ?? "Failed to create vault setup session.");
            return result;
        }

        result.ResultObject = setupResult;
        return result;
    }

    /// <inheritdoc />
    public async Task<CrudResult<SavedPaymentMethod>> ConfirmSetupAsync(
        ConfirmVaultSetupParameters parameters,
        CancellationToken cancellationToken = default)
    {
        var result = new CrudResult<SavedPaymentMethod>();

        // Get provider
        var registeredProvider = await providerManager.GetProviderAsync(
            parameters.ProviderAlias, requireEnabled: true, cancellationToken);

        if (registeredProvider == null)
        {
            result.AddErrorMessage($"Payment provider '{parameters.ProviderAlias}' not found or not enabled.");
            return result;
        }

        var provider = registeredProvider.Provider;

        // Check vault support
        if (!provider.Metadata.SupportsVaultedPayments)
        {
            result.AddErrorMessage($"Payment provider '{parameters.ProviderAlias}' does not support vaulted payments.");
            return result;
        }

        // Check vault is enabled
        if (registeredProvider.Setting?.IsVaultingEnabled != true)
        {
            result.AddErrorMessage($"Vaulting is not enabled for provider '{parameters.ProviderAlias}'.");
            return result;
        }

        // Confirm with provider
        var confirmRequest = new VaultConfirmRequest
        {
            CustomerId = parameters.CustomerId,
            SetupSessionId = parameters.SetupSessionId,
            PaymentMethodToken = parameters.PaymentMethodToken,
            ProviderCustomerId = parameters.ProviderCustomerId,
            RedirectParams = parameters.RedirectParams,
            SetAsDefault = parameters.SetAsDefault
        };

        var confirmResult = await provider.ConfirmVaultSetupAsync(confirmRequest, cancellationToken);

        if (!confirmResult.Success)
        {
            result.AddErrorMessage(confirmResult.ErrorMessage ?? "Failed to confirm vault setup.");
            return result;
        }

        // Create saved payment method
        var savedMethod = factory.CreateFromVaultConfirmation(
            parameters.CustomerId,
            parameters.ProviderAlias,
            confirmResult,
            parameters.IpAddress,
            parameters.SetAsDefault);

        // Save to database
        return await SavePaymentMethodAsync(savedMethod, parameters.SetAsDefault, cancellationToken);
    }

    // =====================================================
    // Save During Checkout
    // =====================================================

    /// <inheritdoc />
    public async Task<CrudResult<SavedPaymentMethod>> SaveFromCheckoutAsync(
        SavePaymentMethodFromCheckoutParameters parameters,
        CancellationToken cancellationToken = default)
    {
        var savedMethod = factory.CreateFromCheckout(parameters);
        return await SavePaymentMethodAsync(savedMethod, parameters.SetAsDefault, cancellationToken);
    }

    /// <summary>
    /// Internal method to save a payment method to the database.
    /// </summary>
    private async Task<CrudResult<SavedPaymentMethod>> SavePaymentMethodAsync(
        SavedPaymentMethod savedMethod,
        bool setAsDefault,
        CancellationToken cancellationToken)
    {
        var result = new CrudResult<SavedPaymentMethod>();

        // Publish creating notification
        var creatingNotification = new SavedPaymentMethodCreatingNotification(savedMethod);
        await notificationPublisher.PublishAsync(creatingNotification, cancellationToken);

        if (creatingNotification.Cancel)
        {
            result.AddErrorMessage(creatingNotification.CancelReason ?? "Operation cancelled.");
            return result;
        }

        using var scope = efCoreScopeProvider.CreateScope();
        await scope.ExecuteWithContextAsync<bool>(async db =>
        {
            // If setting as default, clear existing default
            if (setAsDefault)
            {
                var existingDefaults = await db.SavedPaymentMethods
                    .Where(m => m.CustomerId == savedMethod.CustomerId && m.IsDefault)
                    .ToListAsync(cancellationToken);

                foreach (var existing in existingDefaults)
                {
                    existing.IsDefault = false;
                    existing.DateUpdated = DateTime.UtcNow;
                }
            }

            db.SavedPaymentMethods.Add(savedMethod);
            await db.SaveChangesAsync(cancellationToken);
            return true;
        });
        scope.Complete();

        // Publish created notification
        await notificationPublisher.PublishAsync(
            new SavedPaymentMethodCreatedNotification(savedMethod), cancellationToken);

        result.ResultObject = savedMethod;
        return result;
    }

    // =====================================================
    // Manage
    // =====================================================

    /// <inheritdoc />
    public async Task<CrudResult<SavedPaymentMethod>> SetDefaultAsync(
        Guid id,
        CancellationToken cancellationToken = default)
    {
        var result = new CrudResult<SavedPaymentMethod>();

        using var scope = efCoreScopeProvider.CreateScope();
        var savedMethod = await scope.ExecuteWithContextAsync(async db =>
        {
            var method = await db.SavedPaymentMethods
                .FirstOrDefaultAsync(m => m.Id == id, cancellationToken);

            if (method == null)
                return null;

            // Clear other defaults for this customer
            var otherDefaults = await db.SavedPaymentMethods
                .Where(m => m.CustomerId == method.CustomerId && m.IsDefault && m.Id != id)
                .ToListAsync(cancellationToken);

            foreach (var other in otherDefaults)
            {
                other.IsDefault = false;
                other.DateUpdated = DateTime.UtcNow;
            }

            // Set this as default
            method.IsDefault = true;
            method.DateUpdated = DateTime.UtcNow;

            await db.SaveChangesAsync(cancellationToken);
            return method;
        });
        scope.Complete();

        if (savedMethod == null)
        {
            result.AddErrorMessage("Saved payment method not found.");
            return result;
        }

        result.ResultObject = savedMethod;
        return result;
    }

    /// <inheritdoc />
    public async Task<CrudResult<bool>> DeleteAsync(
        Guid id,
        CancellationToken cancellationToken = default)
    {
        var result = new CrudResult<bool>();

        // Get the saved method
        var savedMethod = await GetPaymentMethodAsync(id, cancellationToken);
        if (savedMethod == null)
        {
            result.AddErrorMessage("Saved payment method not found.");
            return result;
        }

        // Publish deleting notification
        var deletingNotification = new SavedPaymentMethodDeletingNotification(savedMethod);
        await notificationPublisher.PublishAsync(deletingNotification, cancellationToken);

        if (deletingNotification.Cancel)
        {
            result.AddErrorMessage(deletingNotification.CancelReason ?? "Operation cancelled.");
            return result;
        }

        // Delete from provider
        var registeredProvider = await providerManager.GetProviderAsync(
            savedMethod.ProviderAlias, requireEnabled: false, cancellationToken);

        if (registeredProvider != null)
        {
            try
            {
                await registeredProvider.Provider.DeleteVaultedMethodAsync(
                    savedMethod.ProviderMethodId,
                    savedMethod.ProviderCustomerId,
                    cancellationToken);
            }
            catch (Exception ex)
            {
                // Log but continue - we still want to remove from our database
                logger.LogWarning(ex,
                    "Failed to delete vaulted method from provider {Provider}. Continuing with database deletion.",
                    savedMethod.ProviderAlias);
            }
        }

        // Delete from database
        using var scope = efCoreScopeProvider.CreateScope();
        await scope.ExecuteWithContextAsync<bool>(async db =>
        {
            var method = await db.SavedPaymentMethods
                .FirstOrDefaultAsync(m => m.Id == id, cancellationToken);

            if (method != null)
            {
                db.SavedPaymentMethods.Remove(method);
                await db.SaveChangesAsync(cancellationToken);
            }
            return true;
        });
        scope.Complete();

        // Publish deleted notification
        await notificationPublisher.PublishAsync(
            new SavedPaymentMethodDeletedNotification(savedMethod), cancellationToken);

        result.ResultObject = true;
        return result;
    }

    // =====================================================
    // Charge
    // =====================================================

    /// <inheritdoc />
    public async Task<CrudResult<PaymentResult>> ChargeAsync(
        ChargeSavedMethodParameters parameters,
        CancellationToken cancellationToken = default)
    {
        var result = new CrudResult<PaymentResult>();

        // Get saved method
        var savedMethod = await GetPaymentMethodAsync(parameters.SavedPaymentMethodId, cancellationToken);
        if (savedMethod == null)
        {
            result.AddErrorMessage("Saved payment method not found.");
            return result;
        }

        // Get provider
        var registeredProvider = await providerManager.GetProviderAsync(
            savedMethod.ProviderAlias, requireEnabled: true, cancellationToken);

        if (registeredProvider == null)
        {
            result.AddErrorMessage($"Payment provider '{savedMethod.ProviderAlias}' not found or not enabled.");
            return result;
        }

        if (!registeredProvider.Provider.Metadata.SupportsVaultedPayments)
        {
            result.AddErrorMessage($"Payment provider '{savedMethod.ProviderAlias}' does not support vaulted payments.");
            return result;
        }

        if (registeredProvider.Setting?.IsVaultingEnabled != true)
        {
            result.AddErrorMessage($"Vaulting is not enabled for provider '{savedMethod.ProviderAlias}'.");
            return result;
        }

        // Get invoice for amount and currency
        using var scope = efCoreScopeProvider.CreateScope();
        var invoice = await scope.ExecuteWithContextAsync(async db =>
            await db.Invoices
                .AsNoTracking()
                .FirstOrDefaultAsync(i => i.Id == parameters.InvoiceId, cancellationToken));
        scope.Complete();

        if (invoice == null)
        {
            result.AddErrorMessage("Invoice not found.");
            return result;
        }

        var amount = parameters.Amount ?? invoice.Total;
        if (amount <= 0)
        {
            result.AddErrorMessage("Invalid charge amount.");
            return result;
        }

        // Apply idempotency guard for off-session/vaulted charges.
        // This provides consistent duplicate protection across all providers.
        if (!string.IsNullOrEmpty(parameters.IdempotencyKey))
        {
            var cachedResult = await idempotencyService.GetCachedPaymentResultAsync(
                parameters.IdempotencyKey,
                cancellationToken);

            if (cachedResult != null)
            {
                result.ResultObject = cachedResult;
                if (cachedResult.Success)
                    result.AddSuccessMessage("Payment already processed (idempotent request).");
                else
                    result.AddErrorMessage(cachedResult.ErrorMessage ?? "Payment previously failed.");
                return result;
            }

            if (!await idempotencyService.TryMarkAsProcessingAsync(parameters.IdempotencyKey, cancellationToken))
            {
                result.AddErrorMessage("Payment is already being processed. Please wait.");
                return result;
            }
        }

        var chargeRequest = new ChargeVaultedMethodRequest
        {
            InvoiceId = parameters.InvoiceId,
            CustomerId = savedMethod.CustomerId,
            ProviderMethodId = savedMethod.ProviderMethodId,
            ProviderCustomerId = savedMethod.ProviderCustomerId,
            Amount = amount,
            CurrencyCode = invoice.CurrencyCode,
            Description = parameters.Description,
            IdempotencyKey = parameters.IdempotencyKey
        };

        try
        {
            var paymentResult = await registeredProvider.Provider.ChargeVaultedMethodAsync(
                chargeRequest, cancellationToken);

            if (paymentResult.Success)
            {
                // Update last used date
                await UpdateLastUsedAsync(savedMethod.Id, cancellationToken);
            }

            if (!string.IsNullOrEmpty(parameters.IdempotencyKey))
            {
                idempotencyService.CachePaymentResult(parameters.IdempotencyKey, paymentResult);
            }

            result.ResultObject = paymentResult;
            return result;
        }
        catch (Exception ex)
        {
            if (!string.IsNullOrEmpty(parameters.IdempotencyKey))
            {
                idempotencyService.ClearProcessingMarker(parameters.IdempotencyKey);
            }

            logger.LogError(
                ex,
                "Failed to charge saved payment method {SavedPaymentMethodId} for invoice {InvoiceId}",
                parameters.SavedPaymentMethodId,
                parameters.InvoiceId);

            result.AddErrorMessage($"Payment processing failed: {ex.Message}");
            return result;
        }
    }

    /// <summary>
    /// Update the DateLastUsed for a saved payment method.
    /// </summary>
    private async Task UpdateLastUsedAsync(Guid id, CancellationToken cancellationToken)
    {
        try
        {
            using var scope = efCoreScopeProvider.CreateScope();
            await scope.ExecuteWithContextAsync<bool>(async db =>
            {
                var method = await db.SavedPaymentMethods
                    .FirstOrDefaultAsync(m => m.Id == id, cancellationToken);

                if (method != null)
                {
                    method.DateLastUsed = DateTime.UtcNow;
                    method.DateUpdated = DateTime.UtcNow;
                    await db.SaveChangesAsync(cancellationToken);
                }
                return true;
            });
            scope.Complete();
        }
        catch (Exception ex)
        {
            // Log but don't throw - this is non-critical
            logger.LogWarning(ex, "Failed to update DateLastUsed for saved payment method {Id}", id);
        }
    }

    // =====================================================
    // Provider Customer Management
    // =====================================================

    /// <inheritdoc />
    public async Task<string?> GetOrCreateProviderCustomerIdAsync(
        Guid customerId,
        string providerAlias,
        CancellationToken cancellationToken = default)
    {
        // First check if we have an existing saved method with a provider customer ID
        var existingMethods = await GetCustomerPaymentMethodsAsync(customerId, cancellationToken);
        var methodWithCustomerId = existingMethods
            .FirstOrDefault(m => m.ProviderAlias == providerAlias && !string.IsNullOrEmpty(m.ProviderCustomerId));

        if (methodWithCustomerId != null)
            return methodWithCustomerId.ProviderCustomerId;

        // If provider requires customer ID but we don't have one, we'd need to create it
        // This is typically done during the vault setup flow, so return null here
        return null;
    }
}
