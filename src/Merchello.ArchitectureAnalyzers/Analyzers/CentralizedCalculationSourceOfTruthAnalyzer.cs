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
public sealed class CentralizedCalculationSourceOfTruthAnalyzer : DiagnosticAnalyzer
{
    // Property names that indicate centralized stock calculations
    private static readonly HashSet<string> StockProperties = new(StringComparer.Ordinal)
    {
        "Stock",
        "ReservedStock"
    };

    public override ImmutableArray<DiagnosticDescriptor> SupportedDiagnostics
        => [DiagnosticDescriptors.CentralizedCalculationSourceOfTruth];

    public override void Initialize(AnalysisContext context)
    {
        context.ConfigureGeneratedCodeAnalysis(GeneratedCodeAnalysisFlags.None);
        context.EnableConcurrentExecution();
        context.RegisterCompilationStartAction(compilationContext =>
        {
            var controllerBaseType = AnalyzerUtilities.GetType(compilationContext.Compilation,
                "Microsoft.AspNetCore.Mvc.ControllerBase");

            compilationContext.RegisterOperationAction(
                ctx => AnalyzeBinaryOperation(ctx, controllerBaseType),
                OperationKind.Binary);
        });
    }

    private static void AnalyzeBinaryOperation(OperationAnalysisContext context, INamedTypeSymbol? controllerBaseType)
    {
        if (context.Operation is not IBinaryOperation binaryOp)
        {
            return;
        }

        if (binaryOp.OperatorKind is not BinaryOperatorKind.Subtract)
        {
            return;
        }

        if (context.ContainingSymbol?.ContainingType is not INamedTypeSymbol containingType)
        {
            return;
        }

        if (AnalyzerUtilities.IsTestAssembly(context.Compilation))
        {
            return;
        }

        // Only flag in controllers and notification handlers — services, models, extensions,
        // and DTOs legitimately perform read-only stock calculations for display/validation.
        if (!AnalyzerUtilities.IsControllerType(containingType, controllerBaseType)
            && !IsNotificationHandler(containingType))
        {
            return;
        }

        // Detect `Stock - ReservedStock` pattern
        if (IsStockMinusReserved(binaryOp))
        {
            context.ReportDiagnostic(Diagnostic.Create(
                DiagnosticDescriptors.CentralizedCalculationSourceOfTruth,
                binaryOp.Syntax.GetLocation(),
                "Stock - ReservedStock (use InventoryService.GetAvailableStockAsync)"));
        }
    }

    private static bool IsNotificationHandler(INamedTypeSymbol type)
    {
        foreach (var iface in type.AllInterfaces)
        {
            if (iface.Name == "INotificationAsyncHandler" && iface.IsGenericType)
            {
                return true;
            }
        }

        return false;
    }

    private static bool IsStockMinusReserved(IBinaryOperation binaryOp)
    {
        var leftName = GetPropertyName(binaryOp.LeftOperand);
        var rightName = GetPropertyName(binaryOp.RightOperand);

        return leftName != null && rightName != null
            && StockProperties.Contains(leftName) && StockProperties.Contains(rightName)
            && !string.Equals(leftName, rightName, StringComparison.Ordinal);
    }

    private static string? GetPropertyName(IOperation operation)
    {
        return operation switch
        {
            IPropertyReferenceOperation propRef => propRef.Property.Name,
            IFieldReferenceOperation fieldRef => fieldRef.Field.Name,
            IConversionOperation conversion => GetPropertyName(conversion.Operand),
            _ => null
        };
    }
}
