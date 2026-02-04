namespace Merchello.Core.Payments.Providers.Stripe;

/// <summary>
/// Settlement and risk data returned from charge lookup.
/// </summary>
internal sealed record ChargeInfo(
    string? SettlementCurrency,
    decimal? SettlementExchangeRate,
    decimal? SettlementAmount,
    decimal? RiskScore,
    string? RiskScoreSource);
