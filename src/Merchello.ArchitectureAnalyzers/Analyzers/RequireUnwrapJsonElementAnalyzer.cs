using System.Collections.Immutable;
using Merchello.ArchitectureAnalyzers.Diagnostics;
using Microsoft.CodeAnalysis;
using Microsoft.CodeAnalysis.Diagnostics;
using Microsoft.CodeAnalysis.Operations;

namespace Merchello.ArchitectureAnalyzers.Analyzers;

[DiagnosticAnalyzer(LanguageNames.CSharp)]
public sealed class RequireUnwrapJsonElementAnalyzer : DiagnosticAnalyzer
{
    public override ImmutableArray<DiagnosticDescriptor> SupportedDiagnostics
        => [DiagnosticDescriptors.RequireUnwrapJsonElement];

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

        var targetMethod = invocation.TargetMethod.ReducedFrom ?? invocation.TargetMethod;
        if (targetMethod.ContainingType.ToDisplayString() != "System.Convert"
            || !targetMethod.Name.StartsWith("To", System.StringComparison.Ordinal))
        {
            return;
        }

        if (invocation.Arguments.Length == 0)
        {
            return;
        }

        var argument = invocation.Arguments[0].Value;
        if (ContainsUnwrapJsonElementCall(argument))
        {
            return;
        }

        if (!IsDictionaryObjectIndexerAccess(argument))
        {
            return;
        }

        context.ReportDiagnostic(Diagnostic.Create(
            DiagnosticDescriptors.RequireUnwrapJsonElement,
            invocation.Syntax.GetLocation(),
            targetMethod.Name));
    }

    private static bool ContainsUnwrapJsonElementCall(IOperation operation)
    {
        if (operation is IInvocationOperation invocation
            && invocation.TargetMethod.Name == "UnwrapJsonElement")
        {
            return true;
        }

        foreach (var descendant in operation.Descendants())
        {
            if (descendant is IInvocationOperation childInvocation
                && childInvocation.TargetMethod.Name == "UnwrapJsonElement")
            {
                return true;
            }
        }

        return false;
    }

    private static bool IsDictionaryObjectIndexerAccess(IOperation operation)
    {
        var current = operation;
        while (current is IConversionOperation conversion)
        {
            current = conversion.Operand;
        }

        if (current is not IPropertyReferenceOperation propertyReference || !propertyReference.Property.IsIndexer)
        {
            return false;
        }

        if (propertyReference.Instance?.Type is not INamedTypeSymbol instanceType)
        {
            return false;
        }

        return HasDictionaryObjectValueType(instanceType);
    }

    private static bool HasDictionaryObjectValueType(INamedTypeSymbol type)
    {
        if (IsObjectValueDictionary(type))
        {
            return true;
        }

        foreach (var @interface in type.AllInterfaces)
        {
            if (IsObjectValueDictionary(@interface))
            {
                return true;
            }
        }

        return false;
    }

    private static bool IsObjectValueDictionary(INamedTypeSymbol type)
    {
        if (!type.IsGenericType || type.TypeArguments.Length != 2)
        {
            return false;
        }

        var isKeyString = type.TypeArguments[0].SpecialType == SpecialType.System_String;
        var isValueObject = type.TypeArguments[1].SpecialType == SpecialType.System_Object;
        if (!isKeyString || !isValueObject)
        {
            return false;
        }

        var display = type.ConstructedFrom.ToDisplayString();
        return display is "System.Collections.Generic.IDictionary<TKey, TValue>"
            or "System.Collections.Generic.IReadOnlyDictionary<TKey, TValue>"
            or "System.Collections.Generic.Dictionary<TKey, TValue>";
    }
}
