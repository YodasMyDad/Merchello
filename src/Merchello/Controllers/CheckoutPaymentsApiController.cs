using Merchello.Core.Checkout.Dtos;
using Merchello.Core.Payments.Dtos;
using Merchello.Filters;
using Merchello.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;

namespace Merchello.Controllers;

/// <summary>
/// Public API controller for checkout payment operations.
/// </summary>
[ApiController]
[Route("api/merchello/checkout")]
[AllowAnonymous]
[ServiceFilter(typeof(CheckoutExceptionFilter))]
public class CheckoutPaymentsApiController(
    ICheckoutPaymentsOrchestrationService checkoutPaymentsOrchestrationService) : ControllerBase
{
    [HttpGet("payment-methods")]
    [ProducesResponseType<IReadOnlyCollection<PaymentMethodDto>>(StatusCodes.Status200OK)]
    public Task<IReadOnlyCollection<PaymentMethodDto>> GetPaymentMethods(CancellationToken cancellationToken = default) =>
        checkoutPaymentsOrchestrationService.GetPaymentMethodsAsync(cancellationToken);

    [HttpPost("{invoiceId:guid}/pay")]
    [ProducesResponseType<PaymentSessionResultDto>(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> CreatePaymentSession(
        Guid invoiceId,
        [FromBody] InitiatePaymentDto request,
        CancellationToken cancellationToken = default) =>
        ToActionResult(await checkoutPaymentsOrchestrationService.CreatePaymentSessionAsync(
            invoiceId,
            request,
            cancellationToken));

    [HttpGet("return")]
    [ProducesResponseType<PaymentReturnResultDto>(StatusCodes.Status200OK)]
    public Task<PaymentReturnResultDto> HandleReturn(
        [FromQuery] PaymentReturnQueryDto query,
        CancellationToken cancellationToken = default) =>
        checkoutPaymentsOrchestrationService.HandleReturnAsync(query, cancellationToken);

    [HttpGet("cancel")]
    [ProducesResponseType<PaymentReturnResultDto>(StatusCodes.Status200OK)]
    public Task<PaymentReturnResultDto> HandleCancel(
        [FromQuery] PaymentReturnQueryDto query,
        CancellationToken cancellationToken = default) =>
        checkoutPaymentsOrchestrationService.HandleCancelAsync(query, cancellationToken);

    [HttpPost("pay")]
    [ProducesResponseType<PaymentSessionResultDto>(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> InitiatePayment(
        [FromBody] InitiatePaymentDto request,
        CancellationToken cancellationToken = default) =>
        ToActionResult(await checkoutPaymentsOrchestrationService.InitiatePaymentAsync(request, cancellationToken));

    [HttpPost("process-payment")]
    [ProducesResponseType<ProcessPaymentResultDto>(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> ProcessPayment(
        [FromBody] ProcessPaymentDto request,
        CancellationToken cancellationToken = default) =>
        ToActionResult(await checkoutPaymentsOrchestrationService.ProcessPaymentAsync(request, cancellationToken));

    [HttpPost("process-direct-payment")]
    [ProducesResponseType<ProcessPaymentResultDto>(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> ProcessDirectPayment(
        [FromBody] ProcessDirectPaymentDto request,
        CancellationToken cancellationToken = default) =>
        ToActionResult(await checkoutPaymentsOrchestrationService.ProcessDirectPaymentAsync(request, cancellationToken));

    [HttpGet("express-methods")]
    [ProducesResponseType<IReadOnlyCollection<ExpressCheckoutMethodDto>>(StatusCodes.Status200OK)]
    public Task<IReadOnlyCollection<ExpressCheckoutMethodDto>> GetExpressCheckoutMethods(
        CancellationToken cancellationToken = default) =>
        checkoutPaymentsOrchestrationService.GetExpressCheckoutMethodsAsync(cancellationToken);

    [HttpPost("express")]
    [ProducesResponseType<ExpressCheckoutResponseDto>(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> ProcessExpressCheckout(
        [FromBody] ExpressCheckoutRequestDto request,
        CancellationToken cancellationToken = default) =>
        ToActionResult(await checkoutPaymentsOrchestrationService.ProcessExpressCheckoutAsync(
            request,
            cancellationToken));

    [HttpGet("express-config")]
    [ProducesResponseType<ExpressCheckoutConfigDto>(StatusCodes.Status200OK)]
    public Task<ExpressCheckoutConfigDto> GetExpressCheckoutConfig(
        CancellationToken cancellationToken = default) =>
        checkoutPaymentsOrchestrationService.GetExpressCheckoutConfigAsync(cancellationToken);

    [HttpPost("express-payment-intent")]
    [ProducesResponseType<ExpressPaymentIntentResponseDto>(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> CreateExpressPaymentIntent(
        [FromBody] ExpressPaymentIntentRequestDto request,
        CancellationToken cancellationToken = default) =>
        ToActionResult(await checkoutPaymentsOrchestrationService.CreateExpressPaymentIntentAsync(
            request,
            cancellationToken));

    [HttpPost("{providerAlias}/create-order")]
    [ProducesResponseType<CreateWidgetOrderResultDto>(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> CreateWidgetOrder(
        string providerAlias,
        [FromBody] CreateWidgetOrderDto request,
        CancellationToken cancellationToken = default) =>
        ToActionResult(await checkoutPaymentsOrchestrationService.CreateWidgetOrderAsync(
            providerAlias,
            request,
            cancellationToken));

    [HttpPost("{providerAlias}/capture-order")]
    [ProducesResponseType<CaptureWidgetOrderResultDto>(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> CaptureWidgetOrder(
        string providerAlias,
        [FromBody] CaptureWidgetOrderDto request,
        CancellationToken cancellationToken = default) =>
        ToActionResult(await checkoutPaymentsOrchestrationService.CaptureWidgetOrderAsync(
            providerAlias,
            request,
            cancellationToken));

    [HttpPost("worldpay/apple-pay-validate")]
    [ProducesResponseType<object>(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> ValidateWorldPayApplePayMerchant(
        [FromBody] ApplePayValidationRequestDto request,
        CancellationToken cancellationToken = default) =>
        ToActionResult(await checkoutPaymentsOrchestrationService.ValidateWorldPayApplePayMerchantAsync(
            request,
            cancellationToken));

    [HttpGet("payment-options")]
    [ProducesResponseType<CheckoutPaymentOptionsDto>(StatusCodes.Status200OK)]
    public async Task<IActionResult> GetPaymentOptions(CancellationToken cancellationToken = default) =>
        ToActionResult(await checkoutPaymentsOrchestrationService.GetPaymentOptionsAsync(cancellationToken));

    [HttpPost("process-saved-payment")]
    [ProducesResponseType<ProcessPaymentResultDto>(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> ProcessSavedPayment(
        [FromBody] ProcessSavedPaymentMethodDto request,
        CancellationToken cancellationToken = default) =>
        ToActionResult(await checkoutPaymentsOrchestrationService.ProcessSavedPaymentAsync(
            request,
            cancellationToken));

    private IActionResult ToActionResult(CheckoutApiResult result) =>
        StatusCode(result.StatusCode, result.Payload);
}
