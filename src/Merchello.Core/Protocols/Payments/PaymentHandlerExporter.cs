using Merchello.Core.Payments.Models;
using Merchello.Core.Payments.Providers.Interfaces;
using Merchello.Core.Protocols.Models;
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
        var providers = await paymentProviderManager.GetEnabledProvidersAsync(ct);

        List<ProtocolPaymentHandler> handlers = [];

        foreach (var provider in providers)
        {
            try
            {
                var methods = provider.Provider.GetAvailablePaymentMethods();

                foreach (var method in methods)
                {
                    handlers.Add(new ProtocolPaymentHandler
                    {
                        HandlerId = $"{provider.Metadata.Alias}:{method.Alias}",
                        Name = method.DisplayName,
                        Type = MapIntegrationType(method.IntegrationType),
                        SupportsExpressCheckout = method.IsExpressCheckout,
                        InstrumentSchemas = MapInstrumentSchemas(method.MethodType),
                        Config = null // Protocol-specific config would be added by UCP adapter
                    });
                }
            }
            catch (Exception ex)
            {
                logger.LogWarning(ex, "Failed to export payment methods from provider {ProviderAlias}",
                    provider.Metadata.Alias);
            }
        }

        return handlers;
    }

    private static string MapIntegrationType(PaymentIntegrationType type) => type switch
    {
        PaymentIntegrationType.Redirect => ProtocolConstants.PaymentHandlerTypes.Redirect,
        PaymentIntegrationType.HostedFields => ProtocolConstants.PaymentHandlerTypes.Tokenized,
        PaymentIntegrationType.Widget => ProtocolConstants.PaymentHandlerTypes.Wallet,
        PaymentIntegrationType.DirectForm => ProtocolConstants.PaymentHandlerTypes.Form,
        _ => "unknown"
    };

    private static IReadOnlyList<string>? MapInstrumentSchemas(string? methodType) => methodType switch
    {
        "cards" => ["card_payment_instrument"],
        "apple-pay" => ["wallet_instrument"],
        "google-pay" => ["wallet_instrument"],
        "paypal" => ["wallet_instrument"],
        "bank-transfer" => ["bank_transfer_instrument"],
        "ideal" => ["bank_transfer_instrument"],
        "klarna" => ["buy_now_pay_later_instrument"],
        _ => null
    };
}
