using System;
using System.Collections.Generic;
using System.Collections.Immutable;
using Merchello.ArchitectureAnalyzers.Diagnostics;
using Microsoft.CodeAnalysis;
using Microsoft.CodeAnalysis.CSharp.Syntax;
using Microsoft.CodeAnalysis.Diagnostics;
using Microsoft.CodeAnalysis.Operations;

namespace Merchello.ArchitectureAnalyzers.Analyzers;

[DiagnosticAnalyzer(LanguageNames.CSharp)]
public sealed class MultiCurrencyDirectionGuardAnalyzer : DiagnosticAnalyzer
{
    // Classes where currency conversion should use DIVIDE (checkout/payment/invoice)
    private static readonly HashSet<string> DivideContextClasses = new(StringComparer.Ordinal)
    {
        "InvoiceService",
        "InvoiceEditService",
        "InvoiceFactory",
        "CheckoutService",
        "PaymentService"
    };

    // Classes where currency conversion should use MULTIPLY (display/storefront)
    private static readonly HashSet<string> MultiplyContextClasses = new(StringComparer.Ordinal)
    {
        "StorefrontContextService",
        "DisplayCurrencyExtensions",
        "DisplayPriceExtensions"
    };

    // Property/variable names that indicate an exchange rate
    private static readonly HashSet<string> ExchangeRateIdentifiers = new(StringComparer.OrdinalIgnoreCase)
    {
        "exchangeRate",
        "ExchangeRate",
        "pricingExchangeRate",
        "PricingExchangeRate",
        "rate"
    };

    public override ImmutableArray<DiagnosticDescriptor> SupportedDiagnostics
        => [DiagnosticDescriptors.MultiCurrencyDirectionGuard];

    public override void Initialize(AnalysisContext context)
    {
        context.ConfigureGeneratedCodeAnalysis(GeneratedCodeAnalysisFlags.None);
        context.EnableConcurrentExecution();
        context.RegisterOperationAction(AnalyzeBinaryOperation, OperationKind.Binary);
    }

    private static void AnalyzeBinaryOperation(OperationAnalysisContext context)
    {
        if (context.Operation is not IBinaryOperation binaryOp)
        {
            return;
        }

        if (binaryOp.OperatorKind is not (BinaryOperatorKind.Multiply or BinaryOperatorKind.Divide))
        {
            return;
        }

        if (context.ContainingSymbol?.ContainingType is not INamedTypeSymbol containingType)
        {
            return;
        }

        var className = containingType.Name;

        // Check if an exchange rate identifier is involved in this operation
        if (!InvolvesExchangeRate(binaryOp))
        {
            return;
        }

        // In divide-context classes, multiplication by rate is suspicious —
        // UNLESS it's assigning to a *InStoreCurrency property (reporting back-calculation)
        if (DivideContextClasses.Contains(className) && binaryOp.OperatorKind == BinaryOperatorKind.Multiply)
        {
            if (IsStoreCurrencyBackCalculation(binaryOp))
            {
                return;
            }

            context.ReportDiagnostic(Diagnostic.Create(
                DiagnosticDescriptors.MultiCurrencyDirectionGuard,
                binaryOp.Syntax.GetLocation(),
                className));
        }

        // In multiply-context classes, division by rate is suspicious
        if (MultiplyContextClasses.Contains(className) && binaryOp.OperatorKind == BinaryOperatorKind.Divide)
        {
            context.ReportDiagnostic(Diagnostic.Create(
                DiagnosticDescriptors.MultiCurrencyDirectionGuard,
                binaryOp.Syntax.GetLocation(),
                className));
        }
    }

    private static bool IsStoreCurrencyBackCalculation(IBinaryOperation binaryOp)
    {
        // Walk up the operation tree to find the assignment target.
        // Pattern: Binary → Argument → Invocation(Round) → SimpleAssignment
        // If the assignment target is a *InStoreCurrency property, this is a
        // legitimate reporting back-calculation (presentment * rate → store).
        var parent = binaryOp.Parent;

        // Traverse through wrapping operations (arguments, invocations, conversions)
        for (var i = 0; i < 10 && parent is not null; i++)
        {
            if (parent is ISimpleAssignmentOperation assignment
                && assignment.Target is IPropertyReferenceOperation targetProp
                && targetProp.Property.Name.EndsWith("InStoreCurrency", StringComparison.Ordinal))
            {
                return true;
            }

            // Keep walking up through arguments, invocations, conversions, parenthesized
            if (parent is IArgumentOperation or IInvocationOperation or IConversionOperation or IParenthesizedOperation)
            {
                parent = parent.Parent;
                continue;
            }

            break;
        }

        // Fallback: check the containing method name for well-known store-currency methods
        if (binaryOp.Syntax.FirstAncestorOrSelf<MethodDeclarationSyntax>() is { } methodSyntax
            && methodSyntax.Identifier.Text.Contains("StoreCurrency", StringComparison.Ordinal))
        {
            return true;
        }

        return false;
    }

    private static bool InvolvesExchangeRate(IBinaryOperation binaryOp)
    {
        return ContainsExchangeRateIdentifier(binaryOp.LeftOperand)
            || ContainsExchangeRateIdentifier(binaryOp.RightOperand);
    }

    private static bool ContainsExchangeRateIdentifier(IOperation operand)
    {
        switch (operand)
        {
            case IPropertyReferenceOperation propRef:
                return ExchangeRateIdentifiers.Contains(propRef.Property.Name);

            case ILocalReferenceOperation localRef:
                return ExchangeRateIdentifiers.Contains(localRef.Local.Name);

            case IParameterReferenceOperation paramRef:
                return ExchangeRateIdentifiers.Contains(paramRef.Parameter.Name);

            case IFieldReferenceOperation fieldRef:
                return ExchangeRateIdentifiers.Contains(fieldRef.Field.Name);

            case IMemberReferenceOperation memberRef:
                return ExchangeRateIdentifiers.Contains(memberRef.Member.Name);

            case IConversionOperation conversion:
                return ContainsExchangeRateIdentifier(conversion.Operand);

            default:
                return false;
        }
    }
}
