using System;
using System.Collections.Generic;
using System.Collections.Immutable;
using Merchello.ArchitectureAnalyzers.Diagnostics;
using Merchello.ArchitectureAnalyzers.Utilities;
using Microsoft.CodeAnalysis;
using Microsoft.CodeAnalysis.Diagnostics;

namespace Merchello.ArchitectureAnalyzers.Analyzers;

[DiagnosticAnalyzer(LanguageNames.CSharp)]
public sealed class CrudResultForMutationsAnalyzer : DiagnosticAnalyzer
{
    private static readonly HashSet<string> MutationMethodPrefixes = new(StringComparer.Ordinal)
    {
        "Create",
        "Update",
        "Delete",
        "Save",
        "Add",
        "Remove",
        "Cancel",
        "Apply",
        "Process",
        "Set",
        "Record",
        "Edit",
        "Activate",
        "Deactivate",
        "Mark",
        "Assign",
        "Submit",
        "Retry",
        "Transfer",
        "Adjust",
        "Reserve",
        "Allocate",
        "Release",
        "Reverse",
        "Configure"
    };

    public override ImmutableArray<DiagnosticDescriptor> SupportedDiagnostics
        => [DiagnosticDescriptors.CrudResultForMutations];

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
            || !AnalyzerUtilities.IsServiceType(containingType)
            || !IsLikelyMutationMethod(method.Name))
        {
            return;
        }

        if (AnalyzerUtilities.IsCrudResultReturnType(method.ReturnType))
        {
            return;
        }

        context.ReportDiagnostic(Diagnostic.Create(
            DiagnosticDescriptors.CrudResultForMutations,
            method.Locations[0],
            method.ToDisplayString()));
    }

    private static bool IsLikelyMutationMethod(string methodName)
    {
        foreach (var prefix in MutationMethodPrefixes)
        {
            if (methodName.StartsWith(prefix, StringComparison.Ordinal))
            {
                return true;
            }
        }

        return false;
    }
}
