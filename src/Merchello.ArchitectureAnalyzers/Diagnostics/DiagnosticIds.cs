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
}
