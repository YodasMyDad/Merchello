using Merchello.Core.Checkout.Dtos;
using Merchello.Core.Payments.Dtos;

namespace Merchello.Services;

public interface ICheckoutPaymentsOrchestrationService
{
    Task<IReadOnlyCollection<PaymentMethodDto>> GetPaymentMethodsAsync(CancellationToken ct = default);

    Task<CheckoutApiResult> CreatePaymentSessionAsync(
        Guid invoiceId,
        InitiatePaymentDto request,
        CancellationToken ct = default);

    Task<PaymentReturnResultDto> HandleReturnAsync(
        PaymentReturnQueryDto query,
        CancellationToken ct = default);

    Task<PaymentReturnResultDto> HandleCancelAsync(
        PaymentReturnQueryDto query,
        CancellationToken ct = default);

    Task<CheckoutApiResult> InitiatePaymentAsync(
        InitiatePaymentDto request,
        CancellationToken ct = default);

    Task<CheckoutApiResult> ProcessPaymentAsync(
        ProcessPaymentDto request,
        CancellationToken ct = default);

    Task<CheckoutApiResult> ProcessDirectPaymentAsync(
        ProcessDirectPaymentDto request,
        CancellationToken ct = default);

    Task<IReadOnlyCollection<ExpressCheckoutMethodDto>> GetExpressCheckoutMethodsAsync(
        CancellationToken ct = default);

    Task<CheckoutApiResult> ProcessExpressCheckoutAsync(
        ExpressCheckoutRequestDto request,
        CancellationToken ct = default);

    Task<ExpressCheckoutConfigDto> GetExpressCheckoutConfigAsync(CancellationToken ct = default);

    Task<CheckoutApiResult> CreateExpressPaymentIntentAsync(
        ExpressPaymentIntentRequestDto request,
        CancellationToken ct = default);

    Task<CheckoutApiResult> CreateWidgetOrderAsync(
        string providerAlias,
        CreateWidgetOrderDto request,
        CancellationToken ct = default);

    Task<CheckoutApiResult> CaptureWidgetOrderAsync(
        string providerAlias,
        CaptureWidgetOrderDto request,
        CancellationToken ct = default);

    Task<CheckoutApiResult> ValidateWorldPayApplePayMerchantAsync(
        ApplePayValidationRequestDto request,
        CancellationToken ct = default);

    Task<CheckoutApiResult> GetPaymentOptionsAsync(CancellationToken ct = default);

    Task<CheckoutApiResult> ProcessSavedPaymentAsync(
        ProcessSavedPaymentMethodDto request,
        CancellationToken ct = default);
}
