using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.Filters;
using Microsoft.Extensions.Logging;

namespace Merchello.Filters;

/// <summary>
/// Exception filter for checkout API controllers.
/// Catches unhandled exceptions, logs them with structured data, and returns
/// a consistent error response without leaking internal details.
/// </summary>
public class CheckoutExceptionFilter(
    ILogger<CheckoutExceptionFilter> logger) : IExceptionFilter
{
    public void OnException(ExceptionContext context)
    {
        var request = context.HttpContext.Request;
        var path = request.Path.Value;

        if (path is null || !path.StartsWith("/api/merchello/checkout", StringComparison.OrdinalIgnoreCase))
            return;

        logger.LogError(context.Exception,
            "Unhandled checkout exception on {Method} {Path} | IP={RemoteIp} | ContentLength={ContentLength}",
            request.Method,
            path,
            context.HttpContext.Connection.RemoteIpAddress,
            request.ContentLength);

        context.Result = new ObjectResult(new
        {
            success = false,
            errorMessage = "An unexpected error occurred. Please try again.",
            errorCode = "CHECKOUT_INTERNAL_ERROR"
        })
        {
            StatusCode = StatusCodes.Status500InternalServerError
        };

        context.ExceptionHandled = true;
    }
}
