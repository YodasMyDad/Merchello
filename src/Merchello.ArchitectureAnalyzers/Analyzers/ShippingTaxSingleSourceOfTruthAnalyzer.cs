using System;
using System.Collections.Immutable;
using System.Linq;
using Merchello.ArchitectureAnalyzers.Diagnostics;
using Microsoft.CodeAnalysis;
using Microsoft.CodeAnalysis.CSharp.Syntax;
using Microsoft.CodeAnalysis.Diagnostics;
using Microsoft.CodeAnalysis.Operations;

namespace Merchello.ArchitectureAnalyzers.Analyzers;

[DiagnosticAnalyzer(LanguageNames.CSharp)]
public sealed class ShippingTaxSingleSourceOfTruthAnalyzer : DiagnosticAnalyzer
{
    private static readonly string[] TargetClassNames =
    [
        "CheckoutService",
        "InvoiceService",
        "StorefrontContextService"
    ];

    public override ImmutableArray<DiagnosticDescriptor> SupportedDiagnostics
        => [DiagnosticDescriptors.ShippingTaxSingleSourceOfTruth];

    public override void Initialize(AnalysisContext context)
    {
        context.ConfigureGeneratedCodeAnalysis(GeneratedCodeAnalysisFlags.None);
        context.EnableConcurrentExecution();
        context.RegisterOperationAction(AnalyzeBinaryOperation, OperationKind.Binary);
    }

    private static void AnalyzeBinaryOperation(OperationAnalysisContext context)
    {
        if (context.Operation is not IBinaryOperation binaryOperation)
        {
            return;
        }

        if (binaryOperation.OperatorKind is not (BinaryOperatorKind.Multiply or BinaryOperatorKind.Divide))
        {
            return;
        }

        if (context.ContainingSymbol is not IMethodSymbol containingMethod
            || containingMethod.ContainingType is not INamedTypeSymbol containingType
            || !TargetClassNames.Contains(containingType.Name, StringComparer.Ordinal))
        {
            return;
        }

        var methodSyntax = containingMethod.DeclaringSyntaxReferences.FirstOrDefault()?.GetSyntax() as MethodDeclarationSyntax;
        if (methodSyntax is null || !ContainsShippingTaxIdentifier(binaryOperation.Syntax.ToString()))
        {
            return;
        }

        if (UsesShippingTaxSourceOfTruth(methodSyntax))
        {
            return;
        }

        if (!ContainsNonTrivialNumericLiteral(binaryOperation))
        {
            return;
        }

        context.ReportDiagnostic(Diagnostic.Create(
            DiagnosticDescriptors.ShippingTaxSingleSourceOfTruth,
            binaryOperation.Syntax.GetLocation(),
            containingMethod.ToDisplayString()));
    }

    private static bool ContainsShippingTaxIdentifier(string expression)
    {
        var lower = expression.ToLowerInvariant();
        return lower.Contains("shipping") && lower.Contains("tax");
    }

    private static bool UsesShippingTaxSourceOfTruth(MethodDeclarationSyntax methodSyntax)
    {
        var invocations = methodSyntax.DescendantNodes().OfType<InvocationExpressionSyntax>();
        foreach (var invocation in invocations)
        {
            var text = invocation.Expression.ToString();
            if (text.Contains("IsShippingTaxedForLocationAsync", StringComparison.Ordinal)
                || text.Contains("GetShippingTaxRateForLocationAsync", StringComparison.Ordinal)
                || text.Contains("CalculateProportionalShippingTax", StringComparison.Ordinal))
            {
                return true;
            }
        }

        return false;
    }

    private static bool ContainsNonTrivialNumericLiteral(IBinaryOperation binaryOperation)
    {
        var literals = binaryOperation.DescendantsAndSelf().OfType<ILiteralOperation>();
        foreach (var literal in literals)
        {
            if (literal.ConstantValue is not { HasValue: true, Value: { } value })
            {
                continue;
            }

            if (value is int intValue && intValue is not (0 or 1 or 100))
            {
                return true;
            }

            if (value is long longValue && longValue is not (0L or 1L or 100L))
            {
                return true;
            }

            if (value is double doubleValue && doubleValue is not (0d or 1d or 100d))
            {
                return true;
            }

            if (value is float floatValue && floatValue is not (0f or 1f or 100f))
            {
                return true;
            }

            if (value is decimal decimalValue && decimalValue is not (0m or 1m or 100m))
            {
                return true;
            }
        }

        return false;
    }
}
