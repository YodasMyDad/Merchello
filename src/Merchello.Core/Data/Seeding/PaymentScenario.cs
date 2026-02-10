namespace Merchello.Core.Data.Seeding;

/// <summary>
/// Payment scenarios for seed data variety.
/// </summary>
internal enum PaymentScenario
{
    Unpaid,
    StripeFull,
    ManualFull,
    PartialPayment,
    SplitPayment,
    Overpayment,
    Refunded,
    PurchaseOrder
}
