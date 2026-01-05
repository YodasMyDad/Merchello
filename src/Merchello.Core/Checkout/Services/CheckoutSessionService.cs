using System.Text.Json;
using Merchello.Core.Checkout.Models;
using Merchello.Core.Checkout.Services.Interfaces;
using Merchello.Core.Locality.Models;
using Microsoft.AspNetCore.Http;

namespace Merchello.Core.Checkout.Services;

/// <summary>
/// Manages checkout session state in HttpContext.Session.
/// </summary>
public class CheckoutSessionService(IHttpContextAccessor httpContextAccessor) : ICheckoutSessionService
{
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
            return Task.FromResult(new CheckoutSession
            {
                BasketId = basketId,
                CurrentStep = CheckoutStep.Information
            });
        }

        var checkoutSession = JsonSerializer.Deserialize<CheckoutSession>(json, JsonOptions);
        return Task.FromResult(checkoutSession ?? new CheckoutSession
        {
            BasketId = basketId,
            CurrentStep = CheckoutStep.Information
        });
    }

    /// <inheritdoc />
    public async Task SaveAddressesAsync(
        Guid basketId,
        Address billing,
        Address? shipping,
        bool sameAsBilling,
        CancellationToken ct = default)
    {
        var checkoutSession = await GetSessionAsync(basketId, ct);

        // Determine new shipping address
        var newShippingAddress = sameAsBilling ? billing : (shipping ?? billing);

        // If shipping country changed, clear shipping selections as they may no longer be valid
        var oldShippingCountry = checkoutSession.ShippingAddress.CountryCode;
        var newShippingCountry = newShippingAddress.CountryCode;
        if (!string.Equals(oldShippingCountry, newShippingCountry, StringComparison.OrdinalIgnoreCase))
        {
            checkoutSession.SelectedShippingOptions.Clear();
            checkoutSession.SelectedDeliveryDates.Clear();
        }

        checkoutSession.BillingAddress = billing;
        checkoutSession.ShippingAddress = newShippingAddress;
        checkoutSession.ShippingSameAsBilling = sameAsBilling;

        SaveSession(basketId, checkoutSession);
    }

    /// <inheritdoc />
    public async Task SetCurrentStepAsync(Guid basketId, CheckoutStep step, CancellationToken ct = default)
    {
        var checkoutSession = await GetSessionAsync(basketId, ct);
        checkoutSession.CurrentStep = step;
        SaveSession(basketId, checkoutSession);
    }

    /// <inheritdoc />
    public async Task SaveShippingSelectionsAsync(
        Guid basketId,
        Dictionary<Guid, Guid> selections,
        Dictionary<Guid, DateTime>? deliveryDates = null,
        CancellationToken ct = default)
    {
        var checkoutSession = await GetSessionAsync(basketId, ct);
        checkoutSession.SelectedShippingOptions = selections;

        if (deliveryDates != null)
        {
            checkoutSession.SelectedDeliveryDates = deliveryDates;
        }

        SaveSession(basketId, checkoutSession);
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
