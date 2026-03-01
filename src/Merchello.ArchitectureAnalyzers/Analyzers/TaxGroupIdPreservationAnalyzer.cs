using System;
using System.Collections.Immutable;
using System.Linq;
using Merchello.ArchitectureAnalyzers.Diagnostics;
using Merchello.ArchitectureAnalyzers.Utilities;
using Microsoft.CodeAnalysis;
using Microsoft.CodeAnalysis.CSharp;
using Microsoft.CodeAnalysis.CSharp.Syntax;
using Microsoft.CodeAnalysis.Diagnostics;

namespace Merchello.ArchitectureAnalyzers.Analyzers;

[DiagnosticAnalyzer(LanguageNames.CSharp)]
public sealed class TaxGroupIdPreservationAnalyzer : DiagnosticAnalyzer
{
    private static readonly string[] LineItemCreationMethods =
    [
        "CreateFromProduct",
        "CreateForOrder",
        "CreateAddonForOrder",
        "CreateAddonForBasket",
        "CreateCustomLineItem"
    ];

    public override ImmutableArray<DiagnosticDescriptor> SupportedDiagnostics
        => [DiagnosticDescriptors.TaxGroupIdPreservation];

    public override void Initialize(AnalysisContext context)
    {
        context.ConfigureGeneratedCodeAnalysis(GeneratedCodeAnalysisFlags.None);
        context.EnableConcurrentExecution();
        context.RegisterSyntaxNodeAction(AnalyzeMethodDeclaration, SyntaxKind.MethodDeclaration);
    }

    private static void AnalyzeMethodDeclaration(SyntaxNodeAnalysisContext context)
    {
        if (context.Node is not MethodDeclarationSyntax methodDecl)
        {
            return;
        }

        var methodSymbol = context.SemanticModel.GetDeclaredSymbol(methodDecl, context.CancellationToken);
        if (methodSymbol is null)
        {
            return;
        }

        if (AnalyzerUtilities.IsTestAssembly(context.Compilation))
        {
            return;
        }

        var containingType = methodSymbol.ContainingType;
        if (containingType is null)
        {
            return;
        }

        // Only check in LineItemFactory
        if (!containingType.Name.Equals("LineItemFactory", StringComparison.Ordinal))
        {
            return;
        }

        // Only check known line item creation methods
        if (!LineItemCreationMethods.Contains(methodSymbol.Name, StringComparer.Ordinal))
        {
            return;
        }

        // Check if method body references TaxGroupId
        var body = methodDecl.Body ?? (SyntaxNode?)methodDecl.ExpressionBody;
        if (body is null)
        {
            return;
        }

        var hasTaxGroupIdReference = body.DescendantNodes()
            .OfType<IdentifierNameSyntax>()
            .Any(id => id.Identifier.Text == "TaxGroupId");

        if (!hasTaxGroupIdReference)
        {
            context.ReportDiagnostic(Diagnostic.Create(
                DiagnosticDescriptors.TaxGroupIdPreservation,
                methodDecl.Identifier.GetLocation(),
                methodSymbol.ToDisplayString()));
        }
    }
}
