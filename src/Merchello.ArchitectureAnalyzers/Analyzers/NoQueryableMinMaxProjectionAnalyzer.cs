using System.Collections.Immutable;
using Merchello.ArchitectureAnalyzers.Diagnostics;
using Microsoft.CodeAnalysis;
using Microsoft.CodeAnalysis.Diagnostics;
using Microsoft.CodeAnalysis.Operations;

namespace Merchello.ArchitectureAnalyzers.Analyzers;

[DiagnosticAnalyzer(LanguageNames.CSharp)]
public sealed class NoQueryableMinMaxProjectionAnalyzer : DiagnosticAnalyzer
{
    public override ImmutableArray<DiagnosticDescriptor> SupportedDiagnostics
        => [DiagnosticDescriptors.NoQueryableMinMaxProjection];

    public override void Initialize(AnalysisContext context)
    {
        context.ConfigureGeneratedCodeAnalysis(GeneratedCodeAnalysisFlags.None);
        context.EnableConcurrentExecution();
        context.RegisterOperationAction(AnalyzeInvocation, OperationKind.Invocation);
    }

    private static void AnalyzeInvocation(OperationAnalysisContext context)
    {
        if (context.Operation is not IInvocationOperation invocation)
        {
            return;
        }

        var method = invocation.TargetMethod.ReducedFrom ?? invocation.TargetMethod;
        if (method.Name is not ("Min" or "Max"))
        {
            return;
        }

        if (method.ContainingNamespace.ToDisplayString() != "System.Linq")
        {
            return;
        }

        IAnonymousFunctionOperation? lambdaOperation = null;
        for (IOperation? current = invocation.Parent; current is not null; current = current.Parent)
        {
            if (current is IAnonymousFunctionOperation foundLambda)
            {
                lambdaOperation = foundLambda;
                break;
            }
        }

        if (lambdaOperation?.Parent is not IArgumentOperation argument
            || argument.Parent is not IInvocationOperation enclosingSelectInvocation)
        {
            return;
        }

        var selectMethod = enclosingSelectInvocation.TargetMethod.ReducedFrom ?? enclosingSelectInvocation.TargetMethod;
        var isQueryableSelect = selectMethod.Name == "Select"
                                && selectMethod.ContainingType.Name == "Queryable"
                                && selectMethod.ContainingNamespace.ToDisplayString() == "System.Linq";
        if (!isQueryableSelect)
        {
            return;
        }

        context.ReportDiagnostic(Diagnostic.Create(
            DiagnosticDescriptors.NoQueryableMinMaxProjection,
            invocation.Syntax.GetLocation(),
            method.Name));
    }
}
