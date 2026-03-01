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
public sealed class NoDirectInventoryMutationAnalyzer : DiagnosticAnalyzer
{
    private static readonly HashSet<string> ProtectedProperties = new(StringComparer.Ordinal)
    {
        "Stock",
        "ReservedStock"
    };

    // Services that legitimately mutate stock: order-flow (InventoryService),
    // warehouse CRUD (WarehouseService), product CRUD (ProductService),
    // and 3PL sync (FulfilmentSyncService).
    private static readonly HashSet<string> AllowedContainingTypes = new(StringComparer.Ordinal)
    {
        "InventoryService",
        "WarehouseService",
        "ProductService",
        "FulfilmentSyncService"
    };

    // Owner types that are domain entities with real stock fields (mutations are guarded)
    private static readonly HashSet<string> ProtectedOwnerTypes = new(StringComparer.Ordinal)
    {
        "ProductWarehouse"
    };

    public override ImmutableArray<DiagnosticDescriptor> SupportedDiagnostics
        => [DiagnosticDescriptors.NoDirectInventoryMutation];

    public override void Initialize(AnalysisContext context)
    {
        context.ConfigureGeneratedCodeAnalysis(GeneratedCodeAnalysisFlags.None);
        context.EnableConcurrentExecution();
        context.RegisterOperationAction(AnalyzeSimpleAssignment, OperationKind.SimpleAssignment);
        context.RegisterOperationAction(AnalyzeCompoundAssignment, OperationKind.CompoundAssignment);
    }

    private static void AnalyzeSimpleAssignment(OperationAnalysisContext context)
    {
        if (context.Operation is not ISimpleAssignmentOperation assignment)
        {
            return;
        }

        CheckTarget(context, assignment.Target);
    }

    private static void AnalyzeCompoundAssignment(OperationAnalysisContext context)
    {
        if (context.Operation is not ICompoundAssignmentOperation assignment)
        {
            return;
        }

        CheckTarget(context, assignment.Target);
    }

    private static void CheckTarget(OperationAnalysisContext context, IOperation target)
    {
        if (target is not IPropertyReferenceOperation propRef)
        {
            return;
        }

        if (!ProtectedProperties.Contains(propRef.Property.Name))
        {
            return;
        }

        // Only flag mutations on the actual domain entity (ProductWarehouse),
        // not on DTOs or other types that happen to have Stock/ReservedStock properties.
        var ownerType = propRef.Property.ContainingType;
        if (ownerType is null || !ProtectedOwnerTypes.Contains(ownerType.Name))
        {
            return;
        }

        if (context.ContainingSymbol?.ContainingType is not INamedTypeSymbol containingType)
        {
            return;
        }

        if (AllowedContainingTypes.Contains(containingType.Name))
        {
            return;
        }

        if (AnalyzerUtilities.IsTestAssembly(context.Compilation))
        {
            return;
        }

        context.ReportDiagnostic(Diagnostic.Create(
            DiagnosticDescriptors.NoDirectInventoryMutation,
            context.Operation.Syntax.GetLocation(),
            $"{ownerType.Name}.{propRef.Property.Name}"));
    }
}
