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
}
