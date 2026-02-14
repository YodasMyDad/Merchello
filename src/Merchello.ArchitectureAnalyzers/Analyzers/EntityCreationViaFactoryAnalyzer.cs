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
public sealed class EntityCreationViaFactoryAnalyzer : DiagnosticAnalyzer
{
    private static readonly HashSet<string> ForbiddenEntityTypeNames = new(StringComparer.Ordinal)
    {
        "Invoice",
        "Order",
        "Product",
        "ProductRoot",
        "ProductOption",
        "Customer",
        "Basket",
        "Payment",
        "Shipment",
        "LineItem",
        "TaxGroup",
        "Warehouse",
        "Supplier",
        "Discount",
        "DownloadLink",
        "SavedPaymentMethod"
    };

    public override ImmutableArray<DiagnosticDescriptor> SupportedDiagnostics
        => [DiagnosticDescriptors.EntityCreationViaFactory];

    public override void Initialize(AnalysisContext context)
    {
        context.ConfigureGeneratedCodeAnalysis(GeneratedCodeAnalysisFlags.None);
        context.EnableConcurrentExecution();

        context.RegisterOperationAction(AnalyzeObjectCreation, OperationKind.ObjectCreation);
    }

    private static void AnalyzeObjectCreation(OperationAnalysisContext context)
    {
        if (context.Operation is not IObjectCreationOperation objectCreation || objectCreation.Type is not INamedTypeSymbol createdType)
        {
            return;
        }

        if (!createdType.ContainingNamespace.ToDisplayString().StartsWith("Merchello.Core.", StringComparison.Ordinal))
        {
            return;
        }

        if (!ForbiddenEntityTypeNames.Contains(createdType.Name))
        {
            return;
        }

        if (AnalyzerUtilities.IsTestAssembly(context.Compilation))
        {
            return;
        }

        if (context.ContainingSymbol?.ContainingType is not INamedTypeSymbol containingType)
        {
            return;
        }

        if (IsAllowedFactoryContext(containingType, objectCreation.Syntax.SyntaxTree.FilePath))
        {
            return;
        }

        context.ReportDiagnostic(Diagnostic.Create(
            DiagnosticDescriptors.EntityCreationViaFactory,
            objectCreation.Syntax.GetLocation(),
            createdType.ToDisplayString()));
    }

    private static bool IsAllowedFactoryContext(INamedTypeSymbol containingType, string filePath)
    {
        if (containingType.Name.EndsWith("Factory", StringComparison.Ordinal))
        {
            return true;
        }

        var containingNamespace = containingType.ContainingNamespace?.ToDisplayString() ?? string.Empty;
        if (containingNamespace.Contains(".Factories", StringComparison.Ordinal))
        {
            return true;
        }

        return filePath.Contains(@"\Factories\", StringComparison.OrdinalIgnoreCase);
    }
}
