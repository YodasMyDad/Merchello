namespace Merchello.ArchitectureAnalyzers.Diagnostics;

internal static class DiagnosticIds
{
    public const string NoDbContextInControllers = "MERCH001";
    public const string NoEfCoreCallsInControllers = "MERCH002";
    public const string EntityCreationViaFactory = "MERCH003";
    public const string NoBeginTransactionInsideScope = "MERCH004";
    public const string ConstructorInjectionOnly = "MERCH005";
    public const string NoAutoMapper = "MERCH006";
    public const string CrudResultForMutations = "MERCH007";
    public const string CancellationTokenOnAsyncServiceMethods = "MERCH008";
    public const string RoroParameterModel = "MERCH009";
    public const string NoQueryableMinMaxProjection = "MERCH010";
    public const string RequireUnwrapJsonElement = "MERCH011";
    public const string ShippingTaxSingleSourceOfTruth = "MERCH012";
    public const string OnePublicTypePerFile = "MERCH013";
    public const string NoBusinessLogicInControllers = "MERCH014";
    public const string CentralizedCalculationSourceOfTruth = "MERCH015";
    public const string MultiCurrencyDirectionGuard = "MERCH016";
    public const string NotificationHandlerFaultTolerance = "MERCH017";
    public const string NoDirectInventoryMutation = "MERCH018";
    public const string DigitalProductExtendedDataOnly = "MERCH019";
    public const string NotificationHandlerPriorityRange = "MERCH020";
    public const string TaxGroupIdPreservation = "MERCH021";
    public const string NoFixedCostOnDynamicShippingProvider = "MERCH022";
    public const string ShippingSelectionKeyContract = "MERCH023";
}
