using System.Collections.Immutable;
using Merchello.ArchitectureAnalyzers.Diagnostics;
using Microsoft.CodeAnalysis;
using Microsoft.CodeAnalysis.Diagnostics;
using Microsoft.CodeAnalysis.Operations;

namespace Merchello.ArchitectureAnalyzers.Analyzers;

[DiagnosticAnalyzer(LanguageNames.CSharp)]
public sealed class NoBeginTransactionInsideEfCoreScopeAnalyzer : DiagnosticAnalyzer
{
    public override ImmutableArray<DiagnosticDescriptor> SupportedDiagnostics
        => [DiagnosticDescriptors.NoBeginTransactionInsideScope];

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

        var methodName = invocation.TargetMethod.Name;
        if (methodName is not ("BeginTransaction" or "BeginTransactionAsync"))
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
            || argument.Parent is not IInvocationOperation enclosingInvocation)
        {
            return;
        }

        var enclosingMethod = enclosingInvocation.TargetMethod.ReducedFrom ?? enclosingInvocation.TargetMethod;
        if (enclosingMethod.Name != "ExecuteWithContextAsync")
        {
            return;
        }

        context.ReportDiagnostic(Diagnostic.Create(
            DiagnosticDescriptors.NoBeginTransactionInsideScope,
            invocation.Syntax.GetLocation(),
            invocation.TargetMethod.Name));
    }
}
