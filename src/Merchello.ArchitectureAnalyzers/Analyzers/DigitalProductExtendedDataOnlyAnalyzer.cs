using System;
using System.Collections.Generic;
using System.Collections.Immutable;
using Merchello.ArchitectureAnalyzers.Diagnostics;
using Merchello.ArchitectureAnalyzers.Utilities;
using Microsoft.CodeAnalysis;
using Microsoft.CodeAnalysis.CSharp;
using Microsoft.CodeAnalysis.CSharp.Syntax;
using Microsoft.CodeAnalysis.Diagnostics;

namespace Merchello.ArchitectureAnalyzers.Analyzers;

[DiagnosticAnalyzer(LanguageNames.CSharp)]
public sealed class DigitalProductExtendedDataOnlyAnalyzer : DiagnosticAnalyzer
{
    private static readonly HashSet<string> TargetModelTypes = new(StringComparer.Ordinal)
    {
        "ProductRoot",
        "Product"
    };

    private static readonly string[] DigitalPropertyKeywords =
    [
        "Digital",
        "Download",
        "Delivery"
    ];

    // Known ExtendedData constant names that are allowed as constants/fields
    private static readonly HashSet<string> AllowedConstantNames = new(StringComparer.Ordinal)
    {
        "DigitalDeliveryMethod",
        "DigitalFileIds",
        "DownloadLinkExpiryDays",
        "MaxDownloadsPerLink"
    };

    public override ImmutableArray<DiagnosticDescriptor> SupportedDiagnostics
        => [DiagnosticDescriptors.DigitalProductExtendedDataOnly];

    public override void Initialize(AnalysisContext context)
    {
        context.ConfigureGeneratedCodeAnalysis(GeneratedCodeAnalysisFlags.None);
        context.EnableConcurrentExecution();
        context.RegisterSyntaxNodeAction(AnalyzePropertyDeclaration, SyntaxKind.PropertyDeclaration);
    }

    private static void AnalyzePropertyDeclaration(SyntaxNodeAnalysisContext context)
    {
        if (context.Node is not PropertyDeclarationSyntax propertySyntax)
        {
            return;
        }

        if (AnalyzerUtilities.IsTestAssembly(context.Compilation))
        {
            return;
        }

        var propertySymbol = context.SemanticModel.GetDeclaredSymbol(propertySyntax, context.CancellationToken);
        if (propertySymbol is null)
        {
            return;
        }

        var containingType = propertySymbol.ContainingType;
        if (containingType is null || !TargetModelTypes.Contains(containingType.Name))
        {
            return;
        }

        // Only flag if it's in the Models namespace (domain entities, not DTOs)
        var ns = containingType.ContainingNamespace?.ToDisplayString() ?? string.Empty;
        if (!ns.Contains(".Models", StringComparison.Ordinal))
        {
            return;
        }

        var propertyName = propertySymbol.Name;

        // Don't flag allowed constant key names (these are used in ExtendedData lookups)
        if (AllowedConstantNames.Contains(propertyName))
        {
            return;
        }

        // Check if property name contains digital-related keywords
        foreach (var keyword in DigitalPropertyKeywords)
        {
            if (propertyName.Contains(keyword, StringComparison.OrdinalIgnoreCase))
            {
                context.ReportDiagnostic(Diagnostic.Create(
                    DiagnosticDescriptors.DigitalProductExtendedDataOnly,
                    propertySyntax.Identifier.GetLocation(),
                    propertyName,
                    containingType.Name));
                return;
            }
        }
    }
}
