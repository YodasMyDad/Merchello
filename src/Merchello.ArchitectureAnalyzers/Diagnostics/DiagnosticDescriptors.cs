using Microsoft.CodeAnalysis;

namespace Merchello.ArchitectureAnalyzers.Diagnostics;

internal static class DiagnosticDescriptors
{
    private const string CategoryArchitecture = "Architecture";

    public static readonly DiagnosticDescriptor NoDbContextInControllers = new(
        id: DiagnosticIds.NoDbContextInControllers,
        title: "Controllers must not use DbContext directly",
        messageFormat: "Controller '{0}' uses DbContext type '{1}'. Use a service instead.",
        category: CategoryArchitecture,
        defaultSeverity: DiagnosticSeverity.Warning,
        isEnabledByDefault: true,
        description: "Controllers should remain thin and avoid direct DbContext usage.");

    public static readonly DiagnosticDescriptor NoEfCoreCallsInControllers = new(
        id: DiagnosticIds.NoEfCoreCallsInControllers,
        title: "Controllers must not execute EF Core operations",
        messageFormat: "Controller '{0}' calls EF Core API '{1}'. Move query logic to a service.",
        category: CategoryArchitecture,
        defaultSeverity: DiagnosticSeverity.Warning,
        isEnabledByDefault: true,
        description: "EF Core operations should be performed in services only.");

    public static readonly DiagnosticDescriptor EntityCreationViaFactory = new(
        id: DiagnosticIds.EntityCreationViaFactory,
        title: "Domain entities must be created via factories",
        messageFormat: "Type '{0}' should be created via a factory, not with 'new'",
        category: CategoryArchitecture,
        defaultSeverity: DiagnosticSeverity.Warning,
        isEnabledByDefault: true,
        description: "Domain object creation should be centralized in factory classes.");

    public static readonly DiagnosticDescriptor NoBeginTransactionInsideScope = new(
        id: DiagnosticIds.NoBeginTransactionInsideScope,
        title: "Do not begin explicit transactions inside ExecuteWithContextAsync",
        messageFormat: "Call to '{0}' is inside ExecuteWithContextAsync. EFCoreScope already manages transactions.",
        category: CategoryArchitecture,
        defaultSeverity: DiagnosticSeverity.Warning,
        isEnabledByDefault: true,
        description: "Nested transactions inside EFCoreScope execution cause runtime failures.");

    public static readonly DiagnosticDescriptor ConstructorInjectionOnly = new(
        id: DiagnosticIds.ConstructorInjectionOnly,
        title: "Use constructor injection for dependencies",
        messageFormat: "Type '{0}' has public settable dependency property '{1}'. Use constructor injection.",
        category: CategoryArchitecture,
        defaultSeverity: DiagnosticSeverity.Warning,
        isEnabledByDefault: true,
        description: "Setter/property injection should not be used in services and controllers.");

    public static readonly DiagnosticDescriptor NoAutoMapper = new(
        id: DiagnosticIds.NoAutoMapper,
        title: "AutoMapper usage is forbidden",
        messageFormat: "AutoMapper usage detected: '{0}'. Use explicit mapping methods.",
        category: CategoryArchitecture,
        defaultSeverity: DiagnosticSeverity.Warning,
        isEnabledByDefault: true,
        description: "Merchello architecture requires explicit mapping, not AutoMapper.");

    public static readonly DiagnosticDescriptor CrudResultForMutations = new(
        id: DiagnosticIds.CrudResultForMutations,
        title: "Mutation service methods should return CrudResult<T>",
        messageFormat: "Method '{0}' appears to mutate state but does not return CrudResult<T>",
        category: CategoryArchitecture,
        defaultSeverity: DiagnosticSeverity.Warning,
        isEnabledByDefault: true,
        description: "Mutation operations should return CrudResult<T> for consistent failure handling.");

    public static readonly DiagnosticDescriptor CancellationTokenOnAsyncServiceMethods = new(
        id: DiagnosticIds.CancellationTokenOnAsyncServiceMethods,
        title: "Public async service methods should accept CancellationToken",
        messageFormat: "Method '{0}' is async and public but has no CancellationToken parameter",
        category: CategoryArchitecture,
        defaultSeverity: DiagnosticSeverity.Warning,
        isEnabledByDefault: true,
        description: "Public async service APIs should support cancellation.");

    public static readonly DiagnosticDescriptor RoroParameterModel = new(
        id: DiagnosticIds.RoroParameterModel,
        title: "Service methods should use parameter models (RORO)",
        messageFormat: "Method '{0}' has {1} scalar parameters. Prefer a parameter model.",
        category: CategoryArchitecture,
        defaultSeverity: DiagnosticSeverity.Warning,
        isEnabledByDefault: true,
        description: "Service APIs should favor request/parameter objects over long scalar parameter lists.");

    public static readonly DiagnosticDescriptor NoQueryableMinMaxProjection = new(
        id: DiagnosticIds.NoQueryableMinMaxProjection,
        title: "Do not use Min/Max inside IQueryable Select projection",
        messageFormat: "Invocation '{0}' inside IQueryable Select projection is not SQLite-safe. Aggregate in memory.",
        category: CategoryArchitecture,
        defaultSeverity: DiagnosticSeverity.Warning,
        isEnabledByDefault: true,
        description: "SQLite provider cannot translate this pattern reliably.");

    public static readonly DiagnosticDescriptor RequireUnwrapJsonElement = new(
        id: DiagnosticIds.RequireUnwrapJsonElement,
        title: "Dictionary object values must be unwrapped before Convert.*",
        messageFormat: "Call to '{0}' should unwrap JsonElement first (e.g., .UnwrapJsonElement())",
        category: CategoryArchitecture,
        defaultSeverity: DiagnosticSeverity.Warning,
        isEnabledByDefault: true,
        description: "System.Text.Json dictionary object values may be JsonElement and require unwrapping.");

    public static readonly DiagnosticDescriptor ShippingTaxSingleSourceOfTruth = new(
        id: DiagnosticIds.ShippingTaxSingleSourceOfTruth,
        title: "Shipping tax logic must use provider/service entry points",
        messageFormat: "Potential hardcoded shipping tax calculation in '{0}'. Use tax provider manager and proportional tax service.",
        category: CategoryArchitecture,
        defaultSeverity: DiagnosticSeverity.Warning,
        isEnabledByDefault: true,
        description: "Shipping tax calculations must flow through centralized provider and tax calculation services.");

    public static readonly DiagnosticDescriptor OnePublicTypePerFile = new(
        id: DiagnosticIds.OnePublicTypePerFile,
        title: "Only one public type per file in domain folders",
        messageFormat: "File contains {0} public types but should contain only one. Type '{1}' should be in its own file.",
        category: CategoryArchitecture,
        defaultSeverity: DiagnosticSeverity.Warning,
        isEnabledByDefault: true,
        description: "Each public class, record, enum, and interface should be in its own file in Dtos, Models, Parameters, Interfaces, and Services folders.");

    public static readonly DiagnosticDescriptor NoBusinessLogicInControllers = new(
        id: DiagnosticIds.NoBusinessLogicInControllers,
        title: "Controllers must not contain business logic",
        messageFormat: "Controller '{0}' contains LINQ aggregation '{1}'. Move business logic to a service.",
        category: CategoryArchitecture,
        defaultSeverity: DiagnosticSeverity.Warning,
        isEnabledByDefault: true,
        description: "Controllers should be thin HTTP orchestration only. Business logic belongs in services.");

    public static readonly DiagnosticDescriptor CentralizedCalculationSourceOfTruth = new(
        id: DiagnosticIds.CentralizedCalculationSourceOfTruth,
        title: "Key calculations must use designated service methods",
        messageFormat: "'{0}' appears to duplicate centralized calculation logic. Use the designated service method instead.",
        category: CategoryArchitecture,
        defaultSeverity: DiagnosticSeverity.Warning,
        isEnabledByDefault: true,
        description: "Business calculations must be centralized in designated services to prevent duplication and inconsistency.");

    public static readonly DiagnosticDescriptor MultiCurrencyDirectionGuard = new(
        id: DiagnosticIds.MultiCurrencyDirectionGuard,
        title: "Multi-currency conversion direction must be correct",
        messageFormat: "Potential wrong currency conversion direction in '{0}'. Display uses multiply, checkout/payment uses divide.",
        category: CategoryArchitecture,
        defaultSeverity: DiagnosticSeverity.Warning,
        isEnabledByDefault: true,
        description: "Display calculations must multiply by exchange rate; checkout/invoice creation must divide. Mixing directions causes financial bugs.");

    public static readonly DiagnosticDescriptor NotificationHandlerFaultTolerance = new(
        id: DiagnosticIds.NotificationHandlerFaultTolerance,
        title: "Notification handlers should be fault-tolerant",
        messageFormat: "Handler '{0}' does not wrap HandleAsync body in try/catch. Unhandled exceptions break the notification pipeline.",
        category: CategoryArchitecture,
        defaultSeverity: DiagnosticSeverity.Warning,
        isEnabledByDefault: true,
        description: "After-event notification handlers should catch and log exceptions to prevent pipeline failures.");

    public static readonly DiagnosticDescriptor NoDirectInventoryMutation = new(
        id: DiagnosticIds.NoDirectInventoryMutation,
        title: "Stock mutations must go through InventoryService",
        messageFormat: "Direct mutation of '{0}' detected outside InventoryService. Use InventoryService methods instead.",
        category: CategoryArchitecture,
        defaultSeverity: DiagnosticSeverity.Warning,
        isEnabledByDefault: true,
        description: "Stock and ReservedStock must only be modified through InventoryService to maintain consistency.");

    public static readonly DiagnosticDescriptor DigitalProductExtendedDataOnly = new(
        id: DiagnosticIds.DigitalProductExtendedDataOnly,
        title: "Digital product settings must use ExtendedData",
        messageFormat: "Property '{0}' on '{1}' appears to be a digital product setting. Use ExtendedData constant keys instead.",
        category: CategoryArchitecture,
        defaultSeverity: DiagnosticSeverity.Warning,
        isEnabledByDefault: true,
        description: "Digital product settings should be stored in ExtendedData to avoid model bloat and unnecessary migrations.");

    public static readonly DiagnosticDescriptor NotificationHandlerPriorityRange = new(
        id: DiagnosticIds.NotificationHandlerPriorityRange,
        title: "Notification handler priority should be in expected range",
        messageFormat: "Handler '{0}' has priority {1} which may not match its purpose. Expected range for {2}: {3}.",
        category: CategoryArchitecture,
        defaultSeverity: DiagnosticSeverity.Info,
        isEnabledByDefault: true,
        description: "Notification handler priorities should follow documented ranges for correct execution ordering.");

    public static readonly DiagnosticDescriptor TaxGroupIdPreservation = new(
        id: DiagnosticIds.TaxGroupIdPreservation,
        title: "TaxGroupId must be preserved through line item chain",
        messageFormat: "Line item creation in '{0}' may not preserve TaxGroupId. Ensure TaxGroupId is set for tax provider compatibility.",
        category: CategoryArchitecture,
        defaultSeverity: DiagnosticSeverity.Info,
        isEnabledByDefault: true,
        description: "TaxGroupId must flow from ProductRoot through line items to invoice for external tax provider support.");

    public static readonly DiagnosticDescriptor NoFixedCostOnDynamicShippingProvider = new(
        id: DiagnosticIds.NoFixedCostOnDynamicShippingProvider,
        title: "Dynamic shipping providers cannot have fixed costs",
        messageFormat: "Shipping configuration sets Cost alongside a dynamic provider key '{0}'. Dynamic providers fetch rates from carrier APIs.",
        category: CategoryArchitecture,
        defaultSeverity: DiagnosticSeverity.Warning,
        isEnabledByDefault: true,
        description: "External/dynamic shipping providers (UsesLiveRates=true) must not have fixed costs. Use flat-rate provider for fixed pricing.");

    public static readonly DiagnosticDescriptor ShippingSelectionKeyContract = new(
        id: DiagnosticIds.ShippingSelectionKeyContract,
        title: "Shipping selection keys must follow the documented format",
        messageFormat: "Selection key '{0}' does not match expected format 'so:id' or 'dyn:provider:serviceCode'",
        category: CategoryArchitecture,
        defaultSeverity: DiagnosticSeverity.Warning,
        isEnabledByDefault: true,
        description: "Shipping selection keys must follow the stable contract: 'so:{guid}' for flat-rate or 'dyn:{provider}:{serviceCode}' for dynamic.");
}
