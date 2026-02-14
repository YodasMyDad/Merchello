using System.Collections.Immutable;
using System.Linq;
using Merchello.ArchitectureAnalyzers.Diagnostics;
using Merchello.ArchitectureAnalyzers.Utilities;
using Microsoft.CodeAnalysis;
using Microsoft.CodeAnalysis.Diagnostics;

namespace Merchello.ArchitectureAnalyzers.Analyzers;

[DiagnosticAnalyzer(LanguageNames.CSharp)]
public sealed class RoroParameterModelAnalyzer : DiagnosticAnalyzer
{
    public override ImmutableArray<DiagnosticDescriptor> SupportedDiagnostics
        => [DiagnosticDescriptors.RoroParameterModel];

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

        if (method.Parameters.Length < 4)
        {
            return;
        }

        var scalarCount = method.Parameters.Count(p => AnalyzerUtilities.IsScalarLike(p.Type));
        if (scalarCount < 4)
        {
            return;
        }

        context.ReportDiagnostic(Diagnostic.Create(
            DiagnosticDescriptors.RoroParameterModel,
            method.Locations[0],
            method.ToDisplayString(),
            scalarCount));
    }
}
