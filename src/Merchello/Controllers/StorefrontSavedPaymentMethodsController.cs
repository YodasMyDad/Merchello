using Merchello.Core.Customers.Services.Interfaces;
using Merchello.Core.Payments.Dtos;
using Merchello.Core.Payments.Models;
using Merchello.Core.Payments.Providers.Interfaces;
using Merchello.Core.Payments.Services.Interfaces;
using Merchello.Core.Payments.Services.Parameters;
using Microsoft.AspNetCore.Mvc;
using Umbraco.Cms.Core.Security;

namespace Merchello.Controllers;

/// <summary>
/// Storefront API controller for customer-facing saved payment method management.
/// Requires authentication - customers can only access their own payment methods.
/// </summary>
[ApiController]
[Route("api/merchello/storefront/payment-methods")]
public class StorefrontSavedPaymentMethodsController(
    ISavedPaymentMethodService savedPaymentMethodService,
    ICustomerService customerService,
    IPaymentProviderManager paymentProviderManager,
    IMemberManager memberManager) : ControllerBase
{
    /// <summary>
    /// Get all saved payment methods for the current customer.
    /// </summary>
    [HttpGet]
    public async Task<IActionResult> GetPaymentMethods(CancellationToken ct = default)
    {
        var customer = await GetCurrentCustomerAsync(ct);
        if (customer == null)
        {
            return Unauthorized(new { error = "Please sign in to access your saved payment methods." });
        }

        var methods = await savedPaymentMethodService.GetCustomerPaymentMethodsAsync(customer.Id, ct);
        var result = new List<StorefrontSavedMethodDto>();

        foreach (var method in methods)
        {
            var dto = await MapToStorefrontDtoAsync(method, ct);
            result.Add(dto);
        }

        return Ok(result);
    }

    /// <summary>
    /// Create a vault setup session to add a new payment method.
    /// </summary>
    [HttpPost("setup")]
    public async Task<IActionResult> CreateSetupSession(
        [FromBody] VaultSetupRequestDto request,
        CancellationToken ct = default)
    {
        var customer = await GetCurrentCustomerAsync(ct);
        if (customer == null)
        {
            return Unauthorized(new { error = "Please sign in to add a payment method." });
        }

        var ipAddress = HttpContext.Connection.RemoteIpAddress?.ToString();

        var result = await savedPaymentMethodService.CreateSetupSessionAsync(
            new CreateVaultSetupParameters
            {
                CustomerId = customer.Id,
                ProviderAlias = request.ProviderAlias,
                MethodAlias = request.MethodAlias,
                ReturnUrl = request.ReturnUrl,
                CancelUrl = request.CancelUrl,
                IpAddress = ipAddress
            },
            ct);

        if (!result.Success || result.ResultObject == null)
        {
            var errorMessage = result.Messages.FirstOrDefault()?.Message ?? "Failed to create setup session.";
            return BadRequest(new VaultSetupResponseDto
            {
                Success = false,
                ErrorMessage = errorMessage
            });
        }

        var setupResult = result.ResultObject;

        return Ok(new VaultSetupResponseDto
        {
            Success = true,
            SetupSessionId = setupResult.SetupSessionId,
            ClientSecret = setupResult.ClientSecret,
            RedirectUrl = setupResult.RedirectUrl,
            ProviderCustomerId = setupResult.ProviderCustomerId,
            SdkConfig = setupResult.SdkConfig
        });
    }

    /// <summary>
    /// Confirm a vault setup and save the payment method.
    /// </summary>
    [HttpPost("confirm")]
    public async Task<IActionResult> ConfirmSetup(
        [FromBody] VaultConfirmRequestDto request,
        CancellationToken ct = default)
    {
        var customer = await GetCurrentCustomerAsync(ct);
        if (customer == null)
        {
            return Unauthorized(new { error = "Please sign in to save a payment method." });
        }

        var ipAddress = HttpContext.Connection.RemoteIpAddress?.ToString();

        var result = await savedPaymentMethodService.ConfirmSetupAsync(
            new ConfirmVaultSetupParameters
            {
                CustomerId = customer.Id,
                ProviderAlias = request.ProviderAlias,
                SetupSessionId = request.SetupSessionId,
                PaymentMethodToken = request.PaymentMethodToken,
                ProviderCustomerId = request.ProviderCustomerId,
                SetAsDefault = request.SetAsDefault,
                IpAddress = ipAddress
            },
            ct);

        if (!result.Success || result.ResultObject == null)
        {
            var errorMessage = result.Messages.FirstOrDefault()?.Message ?? "Failed to save payment method.";
            return BadRequest(new { success = false, error = errorMessage });
        }

        var savedMethod = result.ResultObject;
        var dto = await MapToStorefrontDtoAsync(savedMethod, ct);

        return Ok(new { success = true, paymentMethod = dto });
    }

    /// <summary>
    /// Set a payment method as the default.
    /// </summary>
    [HttpPost("{id:guid}/set-default")]
    public async Task<IActionResult> SetDefault(Guid id, CancellationToken ct = default)
    {
        var customer = await GetCurrentCustomerAsync(ct);
        if (customer == null)
        {
            return Unauthorized(new { error = "Please sign in to manage your payment methods." });
        }

        // Verify the payment method belongs to this customer
        var method = await savedPaymentMethodService.GetPaymentMethodAsync(id, ct);
        if (method == null || method.CustomerId != customer.Id)
        {
            return NotFound(new { error = "Payment method not found." });
        }

        var result = await savedPaymentMethodService.SetDefaultAsync(id, ct);

        if (!result.Success)
        {
            var errorMessage = result.Messages.FirstOrDefault()?.Message ?? "Failed to set default payment method.";
            return BadRequest(new { success = false, error = errorMessage });
        }

        return Ok(new { success = true, message = "Default payment method updated." });
    }

    /// <summary>
    /// Delete a saved payment method.
    /// </summary>
    [HttpDelete("{id:guid}")]
    public async Task<IActionResult> Delete(Guid id, CancellationToken ct = default)
    {
        var customer = await GetCurrentCustomerAsync(ct);
        if (customer == null)
        {
            return Unauthorized(new { error = "Please sign in to manage your payment methods." });
        }

        // Verify the payment method belongs to this customer
        var method = await savedPaymentMethodService.GetPaymentMethodAsync(id, ct);
        if (method == null || method.CustomerId != customer.Id)
        {
            return NotFound(new { error = "Payment method not found." });
        }

        var result = await savedPaymentMethodService.DeleteAsync(id, ct);

        if (!result.Success)
        {
            var errorMessage = result.Messages.FirstOrDefault()?.Message ?? "Failed to delete payment method.";
            return BadRequest(new { success = false, error = errorMessage });
        }

        return Ok(new { success = true, message = "Payment method deleted." });
    }

    /// <summary>
    /// Get available vault-enabled payment providers.
    /// </summary>
    [HttpGet("providers")]
    public async Task<IActionResult> GetVaultProviders(CancellationToken ct = default)
    {
        var customer = await GetCurrentCustomerAsync(ct);
        if (customer == null)
        {
            return Unauthorized(new { error = "Please sign in to view payment options." });
        }

        var providers = await paymentProviderManager.GetEnabledProvidersAsync(ct);
        var vaultProviders = providers
            .Where(p => p.Metadata.SupportsVaultedPayments && p.Setting?.IsVaultingEnabled == true)
            .Select(p => new
            {
                Alias = p.Metadata.Alias,
                DisplayName = p.Metadata.DisplayName,
                IconHtml = p.Metadata.IconHtml,
                RequiresProviderCustomerId = p.Metadata.RequiresProviderCustomerId
            })
            .ToList();

        return Ok(vaultProviders);
    }

    // =====================================================
    // Helper Methods
    // =====================================================

    /// <summary>
    /// Get the current logged-in customer.
    /// </summary>
    private async Task<Core.Customers.Models.Customer?> GetCurrentCustomerAsync(CancellationToken ct)
    {
        var member = await memberManager.GetCurrentMemberAsync();
        if (member == null)
        {
            return null;
        }

        return await customerService.GetByMemberKeyAsync(member.Key, ct);
    }

    /// <summary>
    /// Map a SavedPaymentMethod to a StorefrontSavedMethodDto.
    /// </summary>
    private async Task<StorefrontSavedMethodDto> MapToStorefrontDtoAsync(
        SavedPaymentMethod method,
        CancellationToken ct)
    {
        string? iconHtml = null;

        var provider = await paymentProviderManager.GetProviderAsync(
            method.ProviderAlias,
            requireEnabled: false,
            ct);

        if (provider != null)
        {
            iconHtml = provider.Metadata.IconHtml;
        }

        return new StorefrontSavedMethodDto
        {
            Id = method.Id,
            ProviderAlias = method.ProviderAlias,
            MethodType = method.MethodType,
            CardBrand = method.CardBrand,
            Last4 = method.Last4,
            ExpiryFormatted = FormatExpiry(method.ExpiryMonth, method.ExpiryYear),
            IsExpired = IsExpired(method.ExpiryMonth, method.ExpiryYear),
            DisplayLabel = method.DisplayLabel,
            IsDefault = method.IsDefault,
            IconHtml = iconHtml
        };
    }

    private static string? FormatExpiry(int? month, int? year)
    {
        if (!month.HasValue || !year.HasValue)
        {
            return null;
        }
        return $"{month:D2}/{year % 100:D2}";
    }

    private static bool IsExpired(int? month, int? year)
    {
        if (!month.HasValue || !year.HasValue)
        {
            return false;
        }
        var now = DateTime.UtcNow;
        var expiryDate = new DateTime(year.Value, month.Value, 1).AddMonths(1);
        return now >= expiryDate;
    }
}
