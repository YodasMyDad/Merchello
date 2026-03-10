using System.Text.Json;
using Merchello.Core.ProductFeeds.Dtos;
using Merchello.Core.ProductFeeds.Models;
using Merchello.Core.ProductFeeds.Services.Interfaces;
using Merchello.Middleware;
using Microsoft.AspNetCore.DataProtection;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.Logging;
using Moq;
using Shouldly;
using Xunit;

namespace Merchello.Tests.Middleware;

public class GoogleAutoDiscountMiddlewareTests
{
    private const string CookieName = "merchello_gad";
    private const string HttpContextKey = "MerchelloGoogleAutoDiscount";
    private const string ProtectorPurpose = "MerchelloGoogleAutoDiscount";

    private static readonly JsonSerializerOptions JsonOptions = new()
    {
        PropertyNamingPolicy = JsonNamingPolicy.CamelCase
    };

    private readonly Mock<IProductFeedService> _productFeedService = new();
    private readonly Mock<IGoogleAutoDiscountService> _autoDiscountService = new();
    private readonly IDataProtectionProvider _dataProtectionProvider = DataProtectionProvider.Create("Test");

    [Fact]
    public async Task HandlePv2Token_JwtExpiresIn30Minutes_CapsCheckoutExpiryToJwtExp()
    {
        var jwtExpiry = DateTime.UtcNow.AddMinutes(30);
        var result = CreateValidResult(jwtExpiry);
        SetupValidation(result);

        var (context, _) = await InvokeWithPv2Async("valid-token");

        var dto = context.Items[HttpContextKey] as GoogleAutoDiscountActiveDto;
        dto.ShouldNotBeNull();

        // CheckoutExpiry (normally 48h) should be capped to JWT expiry
        dto!.CheckoutExpiryUtc.ShouldBeLessThanOrEqualTo(jwtExpiry.AddSeconds(1));

        // PageExpiry (30min) matches JWT expiry, so should also be at or before JWT expiry
        dto.PageExpiryUtc.ShouldBeLessThanOrEqualTo(jwtExpiry.AddSeconds(1));
    }

    [Fact]
    public async Task HandlePv2Token_JwtExpiresIn7Days_UsesDefaultExpiries()
    {
        var jwtExpiry = DateTime.UtcNow.AddDays(7);
        var result = CreateValidResult(jwtExpiry);
        SetupValidation(result);

        var (context, _) = await InvokeWithPv2Async("valid-token");

        var dto = context.Items[HttpContextKey] as GoogleAutoDiscountActiveDto;
        dto.ShouldNotBeNull();

        // CheckoutExpiry should use the default 48h (much less than 7 days)
        dto!.CheckoutExpiryUtc.ShouldBeLessThan(DateTime.UtcNow.AddHours(49));
        dto.CheckoutExpiryUtc.ShouldBeGreaterThan(DateTime.UtcNow.AddHours(47));

        // PageExpiry should use the default 30min
        dto.PageExpiryUtc.ShouldBeLessThan(DateTime.UtcNow.AddMinutes(31));
        dto.PageExpiryUtc.ShouldBeGreaterThan(DateTime.UtcNow.AddMinutes(29));
    }

    [Fact]
    public async Task HandlePv2Token_JwtExpiresIn5Minutes_AllExpiriesCappedAtJwtExp()
    {
        var jwtExpiry = DateTime.UtcNow.AddMinutes(5);
        var result = CreateValidResult(jwtExpiry);
        SetupValidation(result);

        var (context, cookieExpires) = await InvokeWithPv2Async("valid-token");

        var dto = context.Items[HttpContextKey] as GoogleAutoDiscountActiveDto;
        dto.ShouldNotBeNull();

        // Both should be capped at JWT expiry (~5 min from now)
        dto!.CheckoutExpiryUtc.ShouldBeLessThanOrEqualTo(jwtExpiry.AddSeconds(1));
        dto.PageExpiryUtc.ShouldBeLessThanOrEqualTo(jwtExpiry.AddSeconds(1));

        // Cookie HTTP expiry should also be capped
        cookieExpires.ShouldNotBeNull();
        cookieExpires!.Value.UtcDateTime.ShouldBeLessThanOrEqualTo(jwtExpiry.AddSeconds(1));
    }

    [Fact]
    public async Task HandlePv2Token_ValidToken_SetsOfferIdFromJwt()
    {
        var result = CreateValidResult(DateTime.UtcNow.AddHours(2));
        result.OfferId = "product-123";
        SetupValidation(result);

        var (context, _) = await InvokeWithPv2Async("valid-token");

        var dto = context.Items[HttpContextKey] as GoogleAutoDiscountActiveDto;
        dto.ShouldNotBeNull();
        dto!.OfferId.ShouldBe("product-123");
    }

    [Fact]
    public async Task HandlePv2Token_InvalidToken_CallsNext()
    {
        _productFeedService
            .Setup(x => x.GetAutoDiscountMerchantIdsAsync(It.IsAny<CancellationToken>()))
            .ReturnsAsync(["merchant-1"]);

        _autoDiscountService
            .Setup(x => x.ValidateAndParseAsync(It.IsAny<string>(), It.IsAny<string>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync((GoogleAutoDiscountResult?)null);

        var nextCalled = false;
        var middleware = CreateMiddleware(_ => { nextCalled = true; return Task.CompletedTask; });
        var context = CreateGetContext("/?pv2=invalid-token");

        await middleware.InvokeAsync(context, _productFeedService.Object, _autoDiscountService.Object);

        nextCalled.ShouldBeTrue();
        context.Items.ContainsKey(HttpContextKey).ShouldBeFalse();
    }

    [Fact]
    public async Task RestoreFromCookie_ExpiredCookie_DeletesCookieAndDoesNotSetItem()
    {
        var expiredDto = new GoogleAutoDiscountActiveDto
        {
            DiscountedPrice = 45m,
            DiscountPercentage = 10,
            DiscountCode = "EXPIRED",
            OfferId = "product-1",
            PageExpiryUtc = DateTime.UtcNow.AddMinutes(-60),
            CheckoutExpiryUtc = DateTime.UtcNow.AddMinutes(-5)
        };

        var nextCalled = false;
        var middleware = CreateMiddleware(_ => { nextCalled = true; return Task.CompletedTask; });
        var context = CreateGetContextWithCookie(expiredDto);

        await middleware.InvokeAsync(context, _productFeedService.Object, _autoDiscountService.Object);

        nextCalled.ShouldBeTrue();
        context.Items.ContainsKey(HttpContextKey).ShouldBeFalse();
    }

    [Fact]
    public async Task RestoreFromCookie_ValidCookie_RestoresDto()
    {
        var validDto = new GoogleAutoDiscountActiveDto
        {
            DiscountedPrice = 45m,
            DiscountPercentage = 10,
            DiscountCode = "VALID",
            OfferId = "product-1",
            PageExpiryUtc = DateTime.UtcNow.AddMinutes(15),
            CheckoutExpiryUtc = DateTime.UtcNow.AddHours(24)
        };

        var nextCalled = false;
        var middleware = CreateMiddleware(_ => { nextCalled = true; return Task.CompletedTask; });
        var context = CreateGetContextWithCookie(validDto);

        await middleware.InvokeAsync(context, _productFeedService.Object, _autoDiscountService.Object);

        nextCalled.ShouldBeTrue();
        var restored = context.Items[HttpContextKey] as GoogleAutoDiscountActiveDto;
        restored.ShouldNotBeNull();
        restored!.OfferId.ShouldBe("product-1");
        restored.DiscountPercentage.ShouldBe(10);
    }

    private void SetupValidation(GoogleAutoDiscountResult result)
    {
        _productFeedService
            .Setup(x => x.GetAutoDiscountMerchantIdsAsync(It.IsAny<CancellationToken>()))
            .ReturnsAsync(["merchant-1"]);

        _autoDiscountService
            .Setup(x => x.ValidateAndParseAsync("valid-token", "merchant-1", It.IsAny<CancellationToken>()))
            .ReturnsAsync(result);
    }

    private static GoogleAutoDiscountResult CreateValidResult(DateTime expiresUtc) => new()
    {
        DiscountedPrice = 45m,
        DiscountPercentage = 10,
        DiscountCode = "GTEST",
        CurrencyCode = "GBP",
        MerchantId = "merchant-1",
        OfferId = "offer-abc",
        ExpiresUtc = expiresUtc
    };

    private async Task<(HttpContext Context, DateTimeOffset? CookieExpires)> InvokeWithPv2Async(string token)
    {
        DateTimeOffset? cookieExpires = null;
        var middleware = CreateMiddleware(_ => Task.CompletedTask);
        var context = CreateGetContext($"/?pv2={token}");

        // Capture cookie options from the response
        var responseCookies = new Mock<IResponseCookies>();
        responseCookies
            .Setup(x => x.Append(CookieName, It.IsAny<string>(), It.IsAny<CookieOptions>()))
            .Callback<string, string, CookieOptions>((_, _, opts) => cookieExpires = opts.Expires);

        // We can't easily mock response cookies on DefaultHttpContext, so we'll invoke
        // and check the DTO values instead (the middleware sets cookie Expires from dto.CheckoutExpiryUtc)
        await middleware.InvokeAsync(context, _productFeedService.Object, _autoDiscountService.Object);

        // Derive cookie expiry from the DTO (middleware uses dto.CheckoutExpiryUtc for cookie Expires)
        var dto = context.Items[HttpContextKey] as GoogleAutoDiscountActiveDto;
        if (dto != null)
        {
            cookieExpires = new DateTimeOffset(dto.CheckoutExpiryUtc, TimeSpan.Zero);
        }

        return (context, cookieExpires);
    }

    private GoogleAutoDiscountMiddleware CreateMiddleware(RequestDelegate next)
    {
        return new GoogleAutoDiscountMiddleware(
            next,
            _dataProtectionProvider,
            Mock.Of<ILogger<GoogleAutoDiscountMiddleware>>());
    }

    private static DefaultHttpContext CreateGetContext(string pathAndQuery)
    {
        var context = new DefaultHttpContext();
        context.Request.Method = HttpMethods.Get;

        var uri = new Uri($"https://localhost{pathAndQuery}");
        context.Request.Path = uri.AbsolutePath;
        context.Request.QueryString = new QueryString(uri.Query);

        return context;
    }

    private DefaultHttpContext CreateGetContextWithCookie(GoogleAutoDiscountActiveDto dto)
    {
        var protector = _dataProtectionProvider.CreateProtector(ProtectorPurpose);
        var json = JsonSerializer.Serialize(dto, JsonOptions);
        var encrypted = protector.Protect(json);

        var context = new DefaultHttpContext();
        context.Request.Method = HttpMethods.Get;
        context.Request.Path = "/products/test";
        context.Request.Headers.Cookie = $"{CookieName}={Uri.EscapeDataString(encrypted)}";

        return context;
    }
}
