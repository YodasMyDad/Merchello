using System.Text.Json;
using Merchello.Core.ProductFeeds.Dtos;
using Merchello.Core.ProductFeeds.Services.Interfaces;
using Microsoft.AspNetCore.DataProtection;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.Logging;

namespace Merchello.Middleware;

public class GoogleAutoDiscountMiddleware(
    RequestDelegate next,
    IDataProtectionProvider dataProtectionProvider,
    ILogger<GoogleAutoDiscountMiddleware> logger)
{
    private const string CookieName = "merchello_gad";
    private const string HttpContextKey = "MerchelloGoogleAutoDiscount";
    private const string ProtectorPurpose = "MerchelloGoogleAutoDiscount";
    private static readonly TimeSpan PageExpiry = TimeSpan.FromMinutes(30);
    private static readonly TimeSpan CheckoutExpiry = TimeSpan.FromHours(48);

    private static readonly JsonSerializerOptions JsonOptions = new()
    {
        PropertyNamingPolicy = JsonNamingPolicy.CamelCase
    };

    public async Task InvokeAsync(
        HttpContext context,
        IProductFeedService productFeedService,
        IGoogleAutoDiscountService autoDiscountService)
    {
        try
        {
            // Handle pv2 parameter on GET requests
            if (HttpMethods.IsGet(context.Request.Method) &&
                context.Request.Query.TryGetValue("pv2", out var pv2Values) &&
                !string.IsNullOrWhiteSpace(pv2Values.ToString()))
            {
                await HandlePv2TokenAsync(context, productFeedService, autoDiscountService, pv2Values.ToString()!);
                return;
            }

            // On every request, try to restore from cookie
            RestoreFromCookie(context);
        }
        catch (Exception ex)
        {
            logger.LogWarning(ex, "Error in Google auto discount middleware; continuing request pipeline.");
        }

        await next(context);
    }

    private async Task HandlePv2TokenAsync(
        HttpContext context,
        IProductFeedService productFeedService,
        IGoogleAutoDiscountService autoDiscountService,
        string pv2Token)
    {
        try
        {
            var merchantIds = await productFeedService.GetAutoDiscountMerchantIdsAsync(context.RequestAborted);
            if (merchantIds.Count == 0)
            {
                logger.LogDebug("No enabled product feeds with auto discount merchant IDs configured.");
                await next(context);
                return;
            }

            foreach (var merchantId in merchantIds)
            {
                var result = await autoDiscountService.ValidateAndParseAsync(pv2Token, merchantId, context.RequestAborted);
                if (result == null)
                {
                    continue;
                }

                var now = DateTime.UtcNow;
                var dto = new GoogleAutoDiscountActiveDto
                {
                    DiscountedPrice = result.DiscountedPrice,
                    DiscountPercentage = result.DiscountPercentage,
                    DiscountCode = result.DiscountCode,
                    CurrencyCode = result.CurrencyCode,
                    OfferId = result.OfferId,
                    PageExpiryUtc = now.Add(PageExpiry),
                    CheckoutExpiryUtc = now.Add(CheckoutExpiry)
                };

                // Set HttpContext item for immediate use
                context.Items[HttpContextKey] = dto;

                // Encrypt and store in cookie
                SetCookie(context, dto);

                // Redirect to same URL without pv2 parameter
                var redirectUrl = BuildUrlWithoutPv2(context.Request);
                context.Response.Redirect(redirectUrl, permanent: false);
                return;
            }

            logger.LogDebug("Google auto discount JWT did not validate against any configured merchant ID.");
        }
        catch (Exception ex)
        {
            logger.LogWarning(ex, "Error processing Google auto discount pv2 token; continuing request pipeline.");
        }

        await next(context);
    }

    private void RestoreFromCookie(HttpContext context)
    {
        if (!context.Request.Cookies.TryGetValue(CookieName, out var cookieValue) ||
            string.IsNullOrWhiteSpace(cookieValue))
        {
            return;
        }

        try
        {
            var protector = dataProtectionProvider.CreateProtector(ProtectorPurpose);
            var decrypted = protector.Unprotect(cookieValue);
            var dto = JsonSerializer.Deserialize<GoogleAutoDiscountActiveDto>(decrypted, JsonOptions);

            if (dto == null)
            {
                DeleteCookie(context);
                return;
            }

            // Check if the checkout expiry has passed (cookie-level expiry)
            if (dto.CheckoutExpiryUtc <= DateTime.UtcNow)
            {
                DeleteCookie(context);
                return;
            }

            context.Items[HttpContextKey] = dto;
        }
        catch (Exception ex)
        {
            logger.LogDebug(ex, "Failed to decrypt or parse Google auto discount cookie; removing it.");
            DeleteCookie(context);
        }
    }

    private void SetCookie(HttpContext context, GoogleAutoDiscountActiveDto dto)
    {
        try
        {
            var protector = dataProtectionProvider.CreateProtector(ProtectorPurpose);
            var json = JsonSerializer.Serialize(dto, JsonOptions);
            var encrypted = protector.Protect(json);

            context.Response.Cookies.Append(CookieName, encrypted, new CookieOptions
            {
                HttpOnly = true,
                Secure = true,
                SameSite = SameSiteMode.Lax,
                Expires = DateTimeOffset.UtcNow.Add(CheckoutExpiry),
                IsEssential = true
            });
        }
        catch (Exception ex)
        {
            logger.LogWarning(ex, "Failed to set Google auto discount cookie.");
        }
    }

    private static void DeleteCookie(HttpContext context)
    {
        context.Response.Cookies.Delete(CookieName, new CookieOptions
        {
            HttpOnly = true,
            Secure = true,
            SameSite = SameSiteMode.Lax
        });
    }

    private static string BuildUrlWithoutPv2(HttpRequest request)
    {
        var query = request.Query
            .Where(q => !string.Equals(q.Key, "pv2", StringComparison.OrdinalIgnoreCase))
            .ToList();

        var queryString = query.Count > 0
            ? "?" + string.Join("&", query.Select(q => $"{Uri.EscapeDataString(q.Key)}={Uri.EscapeDataString(q.Value.ToString()!)}"))
            : string.Empty;

        return $"{request.PathBase}{request.Path}{queryString}";
    }
}
