using System;
using System.Collections.Immutable;
using System.Text.RegularExpressions;
using Merchello.ArchitectureAnalyzers.Diagnostics;
using Merchello.ArchitectureAnalyzers.Utilities;
using Microsoft.CodeAnalysis;
using Microsoft.CodeAnalysis.Diagnostics;
using Microsoft.CodeAnalysis.Operations;

namespace Merchello.ArchitectureAnalyzers.Analyzers;

[DiagnosticAnalyzer(LanguageNames.CSharp)]
public sealed class ShippingSelectionKeyContractAnalyzer : DiagnosticAnalyzer
{
    // Valid patterns: "so:{guid}" or "dyn:{provider}:{serviceCode}"
    private static readonly Regex FlatRatePattern = new(@"^so:[0-9a-fA-F\-]+$", RegexOptions.Compiled);
    private static readonly Regex DynamicPattern = new(@"^dyn:[a-zA-Z0-9\-]+:[A-Z0-9_]+$", RegexOptions.Compiled);

    // Only flag strings that start with known prefixes but have wrong format
    private static readonly string[] SelectionKeyPrefixes = ["so:", "dyn:"];

    public override ImmutableArray<DiagnosticDescriptor> SupportedDiagnostics
        => [DiagnosticDescriptors.ShippingSelectionKeyContract];

    public override void Initialize(AnalysisContext context)
    {
        context.ConfigureGeneratedCodeAnalysis(GeneratedCodeAnalysisFlags.None);
        context.EnableConcurrentExecution();
        context.RegisterOperationAction(AnalyzeStringLiteral, OperationKind.Literal);
    }

    private static void AnalyzeStringLiteral(OperationAnalysisContext context)
    {
        if (context.Operation is not ILiteralOperation literal)
        {
            return;
        }

        if (literal.ConstantValue is not { HasValue: true, Value: string stringValue })
        {
            return;
        }

        if (AnalyzerUtilities.IsTestAssembly(context.Compilation))
        {
            return;
        }

        // Only check strings that look like selection keys
        var isSelectionKeyLike = false;
        foreach (var prefix in SelectionKeyPrefixes)
        {
            if (stringValue.StartsWith(prefix, StringComparison.Ordinal))
            {
                isSelectionKeyLike = true;
                break;
            }
        }

        if (!isSelectionKeyLike)
        {
            return;
        }

        // Check the string is a valid format prefix ("so:" or "dyn:") alone — these are format
        // constants used in string interpolation/concatenation and should not be flagged.
        if (stringValue is "so:" or "dyn:")
        {
            return;
        }

        // Validate against known patterns
        if (FlatRatePattern.IsMatch(stringValue) || DynamicPattern.IsMatch(stringValue))
        {
            return;
        }

        context.ReportDiagnostic(Diagnostic.Create(
            DiagnosticDescriptors.ShippingSelectionKeyContract,
            literal.Syntax.GetLocation(),
            stringValue));
    }
}
