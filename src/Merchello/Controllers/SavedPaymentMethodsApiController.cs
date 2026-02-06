using Asp.Versioning;
using Merchello.Core.Customers.Services.Interfaces;
using Merchello.Core.Payments.Dtos;
using Merchello.Core.Payments.Models;
using Merchello.Core.Payments.Providers.Interfaces;
using Merchello.Core.Payments.Services.Interfaces;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;

namespace Merchello.Controllers;

/// <summary>
/// API controller for managing saved payment methods in the backoffice.
/// </summary>
[ApiVersion("1.0")]
[ApiExplorerSettings(GroupName = "Merchello")]
public class SavedPaymentMethodsApiController(
    ISavedPaymentMethodService savedPaymentMethodService,
    ICustomerService customerService,
    IPaymentProviderManager paymentProviderManager) : MerchelloApiControllerBase
{
    /// <summary>
    /// Get all saved payment methods for a customer.
    /// </summary>
    [HttpGet("customers/{customerId:guid}/saved-payment-methods")]
    [ProducesResponseType<List<SavedPaymentMethodListItemDto>>(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> GetCustomerPaymentMethods(Guid customerId, CancellationToken ct = default)
    {
        var customer = await customerService.GetByIdAsync(customerId, ct);
        if (customer == null)
        {
            return NotFound("Customer not found.");
        }

        var methods = await savedPaymentMethodService.GetCustomerPaymentMethodsAsync(customerId, ct);
        var result = methods.Select(MapToListItemDto).ToList();

        return Ok(result);
    }

    /// <summary>
    /// Get a specific saved payment method by ID.
    /// </summary>
    [HttpGet("saved-payment-methods/{id:guid}")]
    [ProducesResponseType<SavedPaymentMethodDetailDto>(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> GetPaymentMethod(Guid id, CancellationToken ct = default)
    {
        var method = await savedPaymentMethodService.GetPaymentMethodAsync(id, ct);
        if (method == null)
        {
            return NotFound("Payment method not found.");
        }

        var dto = await MapToDetailDtoAsync(method, ct);
        return Ok(dto);
    }

    /// <summary>
    /// Delete a saved payment method.
    /// </summary>
    [HttpDelete("saved-payment-methods/{id:guid}")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> DeletePaymentMethod(Guid id, CancellationToken ct = default)
    {
        var result = await savedPaymentMethodService.DeleteAsync(id, ct);

        if (!result.Success)
        {
            var errorMessage = result.Messages.FirstOrDefault()?.Message;
            if (errorMessage?.Contains("not found") == true)
            {
                return NotFound(errorMessage);
            }
            return BadRequest(errorMessage ?? "Failed to delete payment method.");
        }

        return Ok(new { message = "Payment method deleted successfully." });
    }

    /// <summary>
    /// Set a payment method as the customer's default.
    /// </summary>
    [HttpPost("saved-payment-methods/{id:guid}/set-default")]
    [ProducesResponseType<SavedPaymentMethodDetailDto>(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> SetDefaultPaymentMethod(Guid id, CancellationToken ct = default)
    {
        var result = await savedPaymentMethodService.SetDefaultAsync(id, ct);

        if (!result.Success)
        {
            var errorMessage = result.Messages.FirstOrDefault()?.Message;
            if (errorMessage?.Contains("not found") == true)
            {
                return NotFound(errorMessage);
            }
            return BadRequest(errorMessage ?? "Failed to set default payment method.");
        }

        var dto = await MapToDetailDtoAsync(result.ResultObject!, ct);
        return Ok(dto);
    }

    // =====================================================
    // Mapping Helpers
    // =====================================================

    private static SavedPaymentMethodListItemDto MapToListItemDto(SavedPaymentMethod method)
    {
        return new SavedPaymentMethodListItemDto
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
            DateCreated = method.DateCreated,
            DateLastUsed = method.DateLastUsed
        };
    }

    private async Task<SavedPaymentMethodDetailDto> MapToDetailDtoAsync(
        SavedPaymentMethod method,
        CancellationToken ct)
    {
        string? providerDisplayName = null;

        var provider = await paymentProviderManager.GetProviderAsync(
            method.ProviderAlias,
            requireEnabled: false,
            ct);

        if (provider != null)
        {
            providerDisplayName = provider.Metadata.DisplayName;
        }

        return new SavedPaymentMethodDetailDto
        {
            Id = method.Id,
            CustomerId = method.CustomerId,
            ProviderAlias = method.ProviderAlias,
            ProviderDisplayName = providerDisplayName,
            MethodType = method.MethodType,
            CardBrand = method.CardBrand,
            Last4 = method.Last4,
            ExpiryMonth = method.ExpiryMonth,
            ExpiryYear = method.ExpiryYear,
            ExpiryFormatted = FormatExpiry(method.ExpiryMonth, method.ExpiryYear),
            IsExpired = IsExpired(method.ExpiryMonth, method.ExpiryYear),
            BillingName = method.BillingName,
            BillingEmail = method.BillingEmail,
            DisplayLabel = method.DisplayLabel,
            IsDefault = method.IsDefault,
            IsVerified = method.IsVerified,
            ConsentDateUtc = method.ConsentDateUtc,
            ConsentIpAddress = method.ConsentIpAddress,
            DateCreated = method.DateCreated,
            DateUpdated = method.DateUpdated,
            DateLastUsed = method.DateLastUsed
        };
    }

    private static string? FormatExpiry(int? month, int? year)
    {
        if (!month.HasValue || !year.HasValue)
        {
            return null;
        }
        // Format as MM/YY
        return $"{month:D2}/{year % 100:D2}";
    }

    private static bool IsExpired(int? month, int? year)
    {
        if (!month.HasValue || !year.HasValue)
        {
            return false;
        }
        var now = DateTime.UtcNow;
        // Card expires at the end of the expiry month
        var expiryDate = new DateTime(year.Value, month.Value, 1).AddMonths(1);
        return now >= expiryDate;
    }
}
