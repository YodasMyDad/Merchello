using System.Text.Json;
using Merchello.Core.Checkout.Models;
using Merchello.Core.Checkout.Services.Interfaces;
using Merchello.Core.Checkout.Services.Parameters;
using Merchello.Core.Locality.Models;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;

namespace Merchello.Core.Checkout.Services;

/// <summary>
/// Manages checkout session state in HttpContext.Session.
/// </summary>
public class CheckoutSessionService(
    IHttpContextAccessor httpContextAccessor,
    IOptions<CheckoutSettings> checkoutSettings,
    ILogger<CheckoutSessionService> logger) : ICheckoutSessionService
{
    private readonly CheckoutSettings _settings = checkoutSettings.Value;

    private const string SessionKeyPrefix = "MerchelloCheckout_";
    private const string BasketSessionKey = "Basket";

    private static readonly JsonSerializerOptions JsonOptions = new()
    {
        PropertyNamingPolicy = JsonNamingPolicy.CamelCase
    };

    /// <inheritdoc />
    public Task<CheckoutSession> GetSessionAsync(Guid basketId, CancellationToken ct = default)
    {
        var session = GetHttpSession();
        var key = GetSessionKey(basketId);

        var json = session.GetString(key);
        if (string.IsNullOrEmpty(json))
        {
            return Task.FromResult(CreateFreshSession(basketId));
        }

        var checkoutSession = JsonSerializer.Deserialize<CheckoutSession>(json, JsonOptions);
        if (checkoutSession == null)
        {
            return Task.FromResult(CreateFreshSession(basketId));
        }

        // Validate session freshness (skip for sessions without timestamps - backward compatibility)
        if (checkoutSession.CreatedAt != default && IsSessionExpired(checkoutSession))
        {
            if (_settings.LogSessionExpirations)
            {
                logger.LogWarning(
                    "Checkout session expired for basket {BasketId}. Created: {CreatedAt}, LastActivity: {LastActivity}",
                    basketId, checkoutSession.CreatedAt, checkoutSession.LastActivityAt);
            }

            // Clear expired session and return fresh
            session.Remove(key);
            return Task.FromResult(CreateFreshSession(basketId));
        }

        // Update last activity time (sliding expiration)
        checkoutSession.LastActivityAt = DateTime.UtcNow;
        SaveSession(basketId, checkoutSession);

        return Task.FromResult(checkoutSession);
    }

    private CheckoutSession CreateFreshSession(Guid basketId) => new()
    {
        BasketId = basketId,
        CurrentStep = CheckoutStep.Information,
        CreatedAt = DateTime.UtcNow,
        LastActivityAt = DateTime.UtcNow
    };

    private bool IsSessionExpired(CheckoutSession checkoutSession)
    {
        var now = DateTime.UtcNow;

        // Check absolute timeout (if enabled)
        if (_settings.SessionAbsoluteTimeoutMinutes > 0)
        {
            var absoluteExpiry = checkoutSession.CreatedAt.AddMinutes(_settings.SessionAbsoluteTimeoutMinutes);
            if (now > absoluteExpiry)
            {
                return true;
            }
        }

        // Check sliding timeout (if enabled)
        if (_settings.SessionSlidingTimeoutMinutes > 0)
        {
            var slidingExpiry = checkoutSession.LastActivityAt.AddMinutes(_settings.SessionSlidingTimeoutMinutes);
            if (now > slidingExpiry)
            {
                return true;
            }
        }

        return false;
    }

    /// <inheritdoc />
    public async Task SaveAddressesAsync(SaveSessionAddressesParameters parameters, CancellationToken ct = default)
    {
        var checkoutSession = await GetSessionAsync(parameters.BasketId, ct);

        // Determine new shipping address
        var newShippingAddress = parameters.SameAsBilling
            ? parameters.Billing
            : (parameters.Shipping ?? parameters.Billing);

        // If shipping country changed, clear shipping selections as they may no longer be valid
        var oldShippingCountry = checkoutSession.ShippingAddress.CountryCode;
        var newShippingCountry = newShippingAddress.CountryCode;
        if (!string.Equals(oldShippingCountry, newShippingCountry, StringComparison.OrdinalIgnoreCase))
        {
            checkoutSession.SelectedShippingOptions.Clear();
            checkoutSession.SelectedDeliveryDates.Clear();
        }

        checkoutSession.BillingAddress = parameters.Billing;
        checkoutSession.ShippingAddress = newShippingAddress;
        checkoutSession.ShippingSameAsBilling = parameters.SameAsBilling;
        checkoutSession.AcceptsMarketing = parameters.AcceptsMarketing;

        SaveSession(parameters.BasketId, checkoutSession);
    }

    /// <inheritdoc />
    public async Task SetCurrentStepAsync(Guid basketId, CheckoutStep step, CancellationToken ct = default)
    {
        var checkoutSession = await GetSessionAsync(basketId, ct);
        checkoutSession.CurrentStep = step;
        SaveSession(basketId, checkoutSession);
    }

    /// <inheritdoc />
    public async Task SaveShippingSelectionsAsync(SaveSessionShippingSelectionsParameters parameters, CancellationToken ct = default)
    {
        var checkoutSession = await GetSessionAsync(parameters.BasketId, ct);
        checkoutSession.SelectedShippingOptions = parameters.Selections;

        if (parameters.DeliveryDates != null)
        {
            checkoutSession.SelectedDeliveryDates = parameters.DeliveryDates;
        }

        if (parameters.QuotedCosts != null)
        {
            checkoutSession.QuotedShippingCosts = parameters.QuotedCosts;
        }

        SaveSession(parameters.BasketId, checkoutSession);
    }

    /// <inheritdoc />
    public Task ClearSessionAsync(Guid basketId, CancellationToken ct = default)
    {
        var session = GetHttpSession();
        var key = GetSessionKey(basketId);
        session.Remove(key);
        return Task.CompletedTask;
    }

    /// <inheritdoc />
    public async Task SaveEmailAsync(Guid basketId, string email, CancellationToken ct = default)
    {
        var checkoutSession = await GetSessionAsync(basketId, ct);
        checkoutSession.BillingAddress.Email = email;
        SaveSession(basketId, checkoutSession);
    }

    /// <inheritdoc />
    public async Task SetInvoiceIdAsync(Guid basketId, Guid invoiceId, CancellationToken ct = default)
    {
        var checkoutSession = await GetSessionAsync(basketId, ct);
        checkoutSession.InvoiceId = invoiceId;
        SaveSession(basketId, checkoutSession);
    }

    /// <inheritdoc />
    public void SaveBasketToSession(Basket basket)
    {
        var session = GetHttpSession();
        var json = JsonSerializer.Serialize(basket, JsonOptions);
        session.SetString(BasketSessionKey, json);
    }

    /// <inheritdoc />
    public Basket? GetBasketFromSession()
    {
        var session = GetHttpSession();
        var json = session.GetString(BasketSessionKey);
        if (string.IsNullOrEmpty(json))
        {
            return null;
        }
        return JsonSerializer.Deserialize<Basket>(json, JsonOptions);
    }

    private ISession GetHttpSession()
    {
        var context = httpContextAccessor.HttpContext
            ?? throw new InvalidOperationException("HttpContext is not available");
        return context.Session;
    }

    private static string GetSessionKey(Guid basketId) => $"{SessionKeyPrefix}{basketId}";

    private void SaveSession(Guid basketId, CheckoutSession checkoutSession)
    {
        var session = GetHttpSession();
        var key = GetSessionKey(basketId);
        var json = JsonSerializer.Serialize(checkoutSession, JsonOptions);
        session.SetString(key, json);
    }
}
