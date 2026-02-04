using Merchello.Core.Payments.Models;
using Merchello.Core.Payments.Providers.Interfaces;
using Merchello.Core.Protocols.Models;
using Merchello.Core.Protocols.Payments.Interfaces;
using Microsoft.Extensions.Logging;

namespace Merchello.Core.Protocols.Payments;

/// <summary>
/// Exports Merchello payment providers as protocol payment handlers.
/// </summary>
public class PaymentHandlerExporter(
    IPaymentProviderManager paymentProviderManager,
    ILogger<PaymentHandlerExporter> logger) : IPaymentHandlerExporter
{
    /// <inheritdoc />
    public async Task<IReadOnlyList<ProtocolPaymentHandler>> ExportHandlersAsync(
        string protocolName,
        string? sessionId = null,
        CancellationToken ct = default)
    {
        // Align exported handlers with checkout-visible methods (respects enable/disable + dedup).
        var checkoutMethods = await paymentProviderManager.GetCheckoutPaymentMethodsAsync(ct);
        var expressMethods = await paymentProviderManager.GetExpressCheckoutMethodsAsync(ct);
        var methods = checkoutMethods
            .Concat(expressMethods)
            .GroupBy(m => $"{m.ProviderAlias}:{m.MethodAlias}", StringComparer.OrdinalIgnoreCase)
            .Select(g => g.First())
            .ToList();

        List<ProtocolPaymentHandler> handlers = [];

        foreach (var method in methods)
        {
            try
            {
                handlers.Add(new ProtocolPaymentHandler
                {
                    HandlerId = $"{method.ProviderAlias}:{method.MethodAlias}",
                    Name = method.DisplayName,
                    Type = MapIntegrationType(method.IntegrationType),
                    SupportsExpressCheckout = method.IsExpressCheckout,
                    InstrumentSchemas = MapInstrumentSchemas(method.MethodType),
                    Config = null // Protocol-specific config would be added by UCP adapter
                });
            }
            catch (Exception ex)
            {
                logger.LogWarning(ex, "Failed to export payment handler for provider {ProviderAlias}, method {MethodAlias}",
                    method.ProviderAlias,
                    method.MethodAlias);
            }
        }

        return handlers;
    }

    private static string MapIntegrationType(PaymentIntegrationType type) => type switch
    {
        PaymentIntegrationType.Redirect => ProtocolPaymentHandlerTypes.Redirect,
        PaymentIntegrationType.HostedFields => ProtocolPaymentHandlerTypes.Tokenized,
        PaymentIntegrationType.Widget => ProtocolPaymentHandlerTypes.Wallet,
        PaymentIntegrationType.DirectForm => ProtocolPaymentHandlerTypes.Form,
        _ => "unknown"
    };

    private static IReadOnlyList<string>? MapInstrumentSchemas(string? methodType) => methodType switch
    {
        PaymentMethodTypes.Cards => ["card_payment_instrument"],
        PaymentMethodTypes.ApplePay => ["wallet_instrument"],
        PaymentMethodTypes.GooglePay => ["wallet_instrument"],
        PaymentMethodTypes.PayPal => ["wallet_instrument"],
        PaymentMethodTypes.Link => ["wallet_instrument"],
        PaymentMethodTypes.AmazonPay => ["wallet_instrument"],
        PaymentMethodTypes.Venmo => ["wallet_instrument"],
        PaymentMethodTypes.BankTransfer => ["bank_transfer_instrument"],
        "ideal" => ["bank_transfer_instrument"],
        PaymentMethodTypes.BuyNowPayLater => ["buy_now_pay_later_instrument"],
        _ => null
    };
}
