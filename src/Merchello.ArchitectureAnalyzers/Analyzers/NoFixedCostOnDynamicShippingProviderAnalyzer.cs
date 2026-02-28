using System;
using System.Collections.Generic;
using System.Collections.Immutable;
using System.Linq;
using Merchello.ArchitectureAnalyzers.Diagnostics;
using Merchello.ArchitectureAnalyzers.Utilities;
using Microsoft.CodeAnalysis;
using Microsoft.CodeAnalysis.CSharp.Syntax;
using Microsoft.CodeAnalysis.Diagnostics;
using Microsoft.CodeAnalysis.Operations;

namespace Merchello.ArchitectureAnalyzers.Analyzers;

[DiagnosticAnalyzer(LanguageNames.CSharp)]
public sealed class NoFixedCostOnDynamicShippingProviderAnalyzer : DiagnosticAnalyzer
{
    // Known dynamic provider keys that use live rates
    private static readonly HashSet<string> DynamicProviderKeys = new(StringComparer.OrdinalIgnoreCase)
    {
        "fedex",
        "ups",
        "usps",
        "dhl",
        "royalmail",
        "canadapost"
    };

    public override ImmutableArray<DiagnosticDescriptor> SupportedDiagnostics
        => [DiagnosticDescriptors.NoFixedCostOnDynamicShippingProvider];

    public override void Initialize(AnalysisContext context)
    {
        context.ConfigureGeneratedCodeAnalysis(GeneratedCodeAnalysisFlags.None);
        context.EnableConcurrentExecution();
        context.RegisterOperationAction(AnalyzeObjectCreation, OperationKind.ObjectCreation);
    }

    private static void AnalyzeObjectCreation(OperationAnalysisContext context)
    {
        if (context.Operation is not IObjectCreationOperation objectCreation)
        {
            return;
        }

        if (AnalyzerUtilities.IsTestAssembly(context.Compilation))
        {
            return;
        }

        var typeName = objectCreation.Type?.Name;
        if (typeName is null)
        {
            return;
        }

        // Look for types that represent shipping option configuration
        if (!typeName.Contains("ShippingOption", StringComparison.Ordinal))
        {
            return;
        }

        // Check if initializer sets both Cost and a dynamic ProviderKey
        if (objectCreation.Initializer is null)
        {
            return;
        }

        string? providerKey = null;
        var hasCost = false;

        foreach (var initializer in objectCreation.Initializer.Initializers)
        {
            if (initializer is not ISimpleAssignmentOperation assignment
                || assignment.Target is not IPropertyReferenceOperation propRef)
            {
                continue;
            }

            if (propRef.Property.Name == "ProviderKey" && assignment.Value.ConstantValue is { HasValue: true, Value: string key })
            {
                providerKey = key;
            }

            if (propRef.Property.Name == "Cost" && assignment.Value.ConstantValue is { HasValue: true, Value: not null })
            {
                hasCost = true;
            }
        }

        if (hasCost && providerKey != null && DynamicProviderKeys.Contains(providerKey))
        {
            context.ReportDiagnostic(Diagnostic.Create(
                DiagnosticDescriptors.NoFixedCostOnDynamicShippingProvider,
                objectCreation.Syntax.GetLocation(),
                providerKey));
        }
    }
}
