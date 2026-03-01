using System;
using System.Collections.Generic;
using System.Collections.Immutable;
using Merchello.ArchitectureAnalyzers.Diagnostics;
using Merchello.ArchitectureAnalyzers.Utilities;
using Microsoft.CodeAnalysis;
using Microsoft.CodeAnalysis.Diagnostics;
using Microsoft.CodeAnalysis.Operations;

namespace Merchello.ArchitectureAnalyzers.Analyzers;

[DiagnosticAnalyzer(LanguageNames.CSharp)]
public sealed class NoBusinessLogicInControllersAnalyzer : DiagnosticAnalyzer
{
    private static readonly HashSet<string> ForbiddenAggregationMethods = new(StringComparer.Ordinal)
    {
        "Sum",
        "Average",
        "Aggregate",
        "GroupBy"
    };

    public override ImmutableArray<DiagnosticDescriptor> SupportedDiagnostics
        => [DiagnosticDescriptors.NoBusinessLogicInControllers];

    public override void Initialize(AnalysisContext context)
    {
        context.ConfigureGeneratedCodeAnalysis(GeneratedCodeAnalysisFlags.None);
        context.EnableConcurrentExecution();
        context.RegisterCompilationStartAction(compilationContext =>
        {
            var controllerBaseType = AnalyzerUtilities.GetType(compilationContext.Compilation,
                "Microsoft.AspNetCore.Mvc.ControllerBase");

            compilationContext.RegisterOperationAction(
                ctx => AnalyzeInvocation(ctx, controllerBaseType),
                OperationKind.Invocation);
        });
    }

    private static void AnalyzeInvocation(OperationAnalysisContext context, INamedTypeSymbol? controllerBaseType)
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

        var methodName = invocation.TargetMethod.Name;
        if (!ForbiddenAggregationMethods.Contains(methodName))
        {
            return;
        }

        // Only flag LINQ-style calls (extension methods on IEnumerable/IQueryable-like types)
        if (!invocation.TargetMethod.IsExtensionMethod)
        {
            return;
        }

        var receiverNamespace = invocation.TargetMethod.ContainingType?.ContainingNamespace?.ToDisplayString() ?? string.Empty;
        if (!receiverNamespace.StartsWith("System.Linq", StringComparison.Ordinal))
        {
            return;
        }

        context.ReportDiagnostic(Diagnostic.Create(
            DiagnosticDescriptors.NoBusinessLogicInControllers,
            invocation.Syntax.GetLocation(),
            containingType.Name,
            methodName));
    }
}
