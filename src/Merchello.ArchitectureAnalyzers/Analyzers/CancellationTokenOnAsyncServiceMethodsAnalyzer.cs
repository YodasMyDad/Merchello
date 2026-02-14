using System.Collections.Immutable;
using Merchello.ArchitectureAnalyzers.Diagnostics;
using Merchello.ArchitectureAnalyzers.Utilities;
using Microsoft.CodeAnalysis;
using Microsoft.CodeAnalysis.Diagnostics;

namespace Merchello.ArchitectureAnalyzers.Analyzers;

[DiagnosticAnalyzer(LanguageNames.CSharp)]
public sealed class CancellationTokenOnAsyncServiceMethodsAnalyzer : DiagnosticAnalyzer
{
    public override ImmutableArray<DiagnosticDescriptor> SupportedDiagnostics
        => [DiagnosticDescriptors.CancellationTokenOnAsyncServiceMethods];

    public override void Initialize(AnalysisContext context)
    {
        context.ConfigureGeneratedCodeAnalysis(GeneratedCodeAnalysisFlags.None);
        context.EnableConcurrentExecution();
        context.RegisterSymbolAction(AnalyzeMethod, SymbolKind.Method);
    }

    private static void AnalyzeMethod(SymbolAnalysisContext context)
    {
        if (context.Symbol is not IMethodSymbol method
            || method.MethodKind != MethodKind.Ordinary
            || method.DeclaredAccessibility != Accessibility.Public
            || method.IsStatic
            || method.ContainingType is not INamedTypeSymbol containingType
            || !AnalyzerUtilities.IsServiceType(containingType))
        {
            return;
        }

        if (!AnalyzerUtilities.IsTaskLike(method.ReturnType))
        {
            return;
        }

        if (AnalyzerUtilities.HasCancellationTokenParameter(method))
        {
            return;
        }

        context.ReportDiagnostic(Diagnostic.Create(
            DiagnosticDescriptors.CancellationTokenOnAsyncServiceMethods,
            method.Locations[0],
            method.ToDisplayString()));
    }
}
