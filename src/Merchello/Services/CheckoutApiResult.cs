using Microsoft.AspNetCore.Http;

namespace Merchello.Services;

/// <summary>
/// Represents an HTTP status code plus payload returned by checkout orchestration services.
/// </summary>
public sealed record CheckoutApiResult(int StatusCode, object? Payload)
{
    public static CheckoutApiResult Ok(object? payload) =>
        new(StatusCodes.Status200OK, payload);

    public static CheckoutApiResult BadRequest(object? payload) =>
        new(StatusCodes.Status400BadRequest, payload);

    public static CheckoutApiResult NotFound(object? payload) =>
        new(StatusCodes.Status404NotFound, payload);

    public static CheckoutApiResult Forbidden(object? payload) =>
        new(StatusCodes.Status403Forbidden, payload);

    public static CheckoutApiResult Unauthorized(object? payload) =>
        new(StatusCodes.Status401Unauthorized, payload);

    public static CheckoutApiResult WithStatus(int statusCode, object? payload) =>
        new(statusCode, payload);
}
