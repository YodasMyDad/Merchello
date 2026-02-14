using System;
using System.Collections.Immutable;
using Merchello.ArchitectureAnalyzers.Diagnostics;
using Microsoft.CodeAnalysis;
using Microsoft.CodeAnalysis.CSharp.Syntax;
using Microsoft.CodeAnalysis.Diagnostics;
using Microsoft.CodeAnalysis.Operations;

namespace Merchello.ArchitectureAnalyzers.Analyzers;

[DiagnosticAnalyzer(LanguageNames.CSharp)]
public sealed class NoAutoMapperAnalyzer : DiagnosticAnalyzer
{
    public override ImmutableArray<DiagnosticDescriptor> SupportedDiagnostics
        => [DiagnosticDescriptors.NoAutoMapper];

    public override void Initialize(AnalysisContext context)
    {
        context.ConfigureGeneratedCodeAnalysis(GeneratedCodeAnalysisFlags.None);
        context.EnableConcurrentExecution();
        context.RegisterSyntaxNodeAction(AnalyzeUsingDirective, Microsoft.CodeAnalysis.CSharp.SyntaxKind.UsingDirective);
        context.RegisterOperationAction(AnalyzeInvocation, OperationKind.Invocation);
        context.RegisterOperationAction(AnalyzeObjectCreation, OperationKind.ObjectCreation);
    }

    private static void AnalyzeUsingDirective(SyntaxNodeAnalysisContext context)
    {
        if (context.Node is not UsingDirectiveSyntax usingDirective)
        {
            return;
        }

        var usingText = usingDirective.Name?.ToString();
        if (usingText is null || !usingText.StartsWith("AutoMapper", StringComparison.Ordinal))
        {
            return;
        }

        context.ReportDiagnostic(Diagnostic.Create(
            DiagnosticDescriptors.NoAutoMapper,
            usingDirective.GetLocation(),
            usingText));
    }

    private static void AnalyzeInvocation(OperationAnalysisContext context)
    {
        if (context.Operation is not IInvocationOperation invocation)
        {
            return;
        }

        var method = invocation.TargetMethod.ReducedFrom ?? invocation.TargetMethod;
        var namespaceName = method.ContainingNamespace.ToDisplayString();
        if (!namespaceName.StartsWith("AutoMapper", StringComparison.Ordinal))
        {
            return;
        }

        context.ReportDiagnostic(Diagnostic.Create(
            DiagnosticDescriptors.NoAutoMapper,
            invocation.Syntax.GetLocation(),
            method.ToDisplayString()));
    }

    private static void AnalyzeObjectCreation(OperationAnalysisContext context)
    {
        if (context.Operation is not IObjectCreationOperation objectCreation
            || objectCreation.Type is not INamedTypeSymbol createdType)
        {
            return;
        }

        var namespaceName = createdType.ContainingNamespace.ToDisplayString();
        if (!namespaceName.StartsWith("AutoMapper", StringComparison.Ordinal))
        {
            return;
        }

        context.ReportDiagnostic(Diagnostic.Create(
            DiagnosticDescriptors.NoAutoMapper,
            objectCreation.Syntax.GetLocation(),
            createdType.ToDisplayString()));
    }
}
