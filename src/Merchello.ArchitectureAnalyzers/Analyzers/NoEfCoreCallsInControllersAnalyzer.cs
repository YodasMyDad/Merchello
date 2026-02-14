using System;
using System.Collections.Immutable;
using Merchello.ArchitectureAnalyzers.Diagnostics;
using Merchello.ArchitectureAnalyzers.Utilities;
using Microsoft.CodeAnalysis;
using Microsoft.CodeAnalysis.Diagnostics;
using Microsoft.CodeAnalysis.Operations;

namespace Merchello.ArchitectureAnalyzers.Analyzers;

[DiagnosticAnalyzer(LanguageNames.CSharp)]
public sealed class NoEfCoreCallsInControllersAnalyzer : DiagnosticAnalyzer
{
    public override ImmutableArray<DiagnosticDescriptor> SupportedDiagnostics
        => [DiagnosticDescriptors.NoEfCoreCallsInControllers];

    public override void Initialize(AnalysisContext context)
    {
        context.ConfigureGeneratedCodeAnalysis(GeneratedCodeAnalysisFlags.None);
        context.EnableConcurrentExecution();

        context.RegisterCompilationStartAction(startContext =>
        {
            var dbContextType = AnalyzerUtilities.GetType(startContext.Compilation, "Microsoft.EntityFrameworkCore.DbContext");
            var controllerBaseType = AnalyzerUtilities.GetType(startContext.Compilation, "Microsoft.AspNetCore.Mvc.ControllerBase");

            startContext.RegisterOperationAction(
                operationContext => AnalyzeInvocation(operationContext, dbContextType, controllerBaseType),
                OperationKind.Invocation);
        });
    }

    private static void AnalyzeInvocation(
        OperationAnalysisContext context,
        INamedTypeSymbol? dbContextType,
        INamedTypeSymbol? controllerBaseType)
    {
        if (context.Operation is not IInvocationOperation invocation)
        {
            return;
        }

        if (context.ContainingSymbol?.ContainingType is not INamedTypeSymbol containingType
            || !AnalyzerUtilities.IsControllerType(containingType, controllerBaseType))
        {
            return;
        }

        var targetMethod = invocation.TargetMethod.ReducedFrom ?? invocation.TargetMethod;
        var containingMethodType = targetMethod.ContainingType;
        var namespaceName = containingMethodType.ContainingNamespace.ToDisplayString();

        var isEfCoreNamespace = namespaceName.StartsWith("Microsoft.EntityFrameworkCore", StringComparison.Ordinal);
        var isDbContextMember = AnalyzerUtilities.InheritsFromOrEquals(containingMethodType, dbContextType);
        if (!isEfCoreNamespace && !isDbContextMember)
        {
            return;
        }

        context.ReportDiagnostic(Diagnostic.Create(
            DiagnosticDescriptors.NoEfCoreCallsInControllers,
            invocation.Syntax.GetLocation(),
            containingType.Name,
            targetMethod.ToDisplayString()));
    }
}
