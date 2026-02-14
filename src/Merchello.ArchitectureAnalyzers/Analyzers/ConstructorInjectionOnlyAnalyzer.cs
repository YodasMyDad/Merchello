using System;
using System.Collections.Immutable;
using System.Linq;
using Merchello.ArchitectureAnalyzers.Diagnostics;
using Merchello.ArchitectureAnalyzers.Utilities;
using Microsoft.CodeAnalysis;
using Microsoft.CodeAnalysis.Diagnostics;

namespace Merchello.ArchitectureAnalyzers.Analyzers;

[DiagnosticAnalyzer(LanguageNames.CSharp)]
public sealed class ConstructorInjectionOnlyAnalyzer : DiagnosticAnalyzer
{
    public override ImmutableArray<DiagnosticDescriptor> SupportedDiagnostics
        => [DiagnosticDescriptors.ConstructorInjectionOnly];

    public override void Initialize(AnalysisContext context)
    {
        context.ConfigureGeneratedCodeAnalysis(GeneratedCodeAnalysisFlags.None);
        context.EnableConcurrentExecution();

        context.RegisterCompilationStartAction(startContext =>
        {
            var controllerBaseType = AnalyzerUtilities.GetType(startContext.Compilation, "Microsoft.AspNetCore.Mvc.ControllerBase");
            startContext.RegisterSymbolAction(
                symbolContext => AnalyzeNamedType(symbolContext, controllerBaseType),
                SymbolKind.NamedType);
        });
    }

    private static void AnalyzeNamedType(SymbolAnalysisContext context, INamedTypeSymbol? controllerBaseType)
    {
        if (context.Symbol is not INamedTypeSymbol type
            || !AnalyzerUtilities.IsServiceOrController(type, controllerBaseType))
        {
            return;
        }

        foreach (var property in type.GetMembers().OfType<IPropertySymbol>())
        {
            if (property.IsStatic || property.SetMethod is null || property.SetMethod.DeclaredAccessibility != Accessibility.Public)
            {
                continue;
            }

            if (!IsDependencyType(property.Type))
            {
                continue;
            }

            context.ReportDiagnostic(Diagnostic.Create(
                DiagnosticDescriptors.ConstructorInjectionOnly,
                property.Locations.FirstOrDefault(),
                type.Name,
                property.Name));
        }
    }

    private static bool IsDependencyType(ITypeSymbol type)
    {
        if (type.SpecialType == SpecialType.System_String || type.IsValueType)
        {
            return false;
        }

        if (type.TypeKind == TypeKind.Interface)
        {
            return true;
        }

        if (type is not INamedTypeSymbol namedType)
        {
            return false;
        }

        var name = namedType.Name;
        return name.EndsWith("Service", StringComparison.Ordinal)
               || name.EndsWith("Manager", StringComparison.Ordinal)
               || name.EndsWith("Provider", StringComparison.Ordinal)
               || name.EndsWith("Factory", StringComparison.Ordinal)
               || name.EndsWith("DbContext", StringComparison.Ordinal);
    }
}
