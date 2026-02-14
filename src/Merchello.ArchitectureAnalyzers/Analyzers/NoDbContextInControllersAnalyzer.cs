using System.Collections.Immutable;
using System.Linq;
using Merchello.ArchitectureAnalyzers.Diagnostics;
using Merchello.ArchitectureAnalyzers.Utilities;
using Microsoft.CodeAnalysis;
using Microsoft.CodeAnalysis.Diagnostics;

namespace Merchello.ArchitectureAnalyzers.Analyzers;

[DiagnosticAnalyzer(LanguageNames.CSharp)]
public sealed class NoDbContextInControllersAnalyzer : DiagnosticAnalyzer
{
    public override ImmutableArray<DiagnosticDescriptor> SupportedDiagnostics
        => [DiagnosticDescriptors.NoDbContextInControllers];

    public override void Initialize(AnalysisContext context)
    {
        context.ConfigureGeneratedCodeAnalysis(GeneratedCodeAnalysisFlags.None);
        context.EnableConcurrentExecution();

        context.RegisterCompilationStartAction(startContext =>
        {
            var dbContextType = AnalyzerUtilities.GetType(startContext.Compilation, "Microsoft.EntityFrameworkCore.DbContext");
            var controllerBaseType = AnalyzerUtilities.GetType(startContext.Compilation, "Microsoft.AspNetCore.Mvc.ControllerBase");
            if (dbContextType is null)
            {
                return;
            }

            startContext.RegisterSymbolAction(
                symbolContext => AnalyzeNamedType(symbolContext, dbContextType, controllerBaseType),
                SymbolKind.NamedType);
        });
    }

    private static void AnalyzeNamedType(
        SymbolAnalysisContext context,
        INamedTypeSymbol dbContextType,
        INamedTypeSymbol? controllerBaseType)
    {
        if (context.Symbol is not INamedTypeSymbol type || !AnalyzerUtilities.IsControllerType(type, controllerBaseType))
        {
            return;
        }

        foreach (var constructor in type.InstanceConstructors)
        {
            foreach (var parameter in constructor.Parameters.Where(p => AnalyzerUtilities.InheritsFromOrEquals(p.Type, dbContextType)))
            {
                context.ReportDiagnostic(Diagnostic.Create(
                    DiagnosticDescriptors.NoDbContextInControllers,
                    parameter.Locations.FirstOrDefault() ?? constructor.Locations.FirstOrDefault(),
                    type.Name,
                    parameter.Type.ToDisplayString()));
            }
        }

        foreach (var field in type.GetMembers().OfType<IFieldSymbol>()
                     .Where(f => !f.IsStatic && AnalyzerUtilities.InheritsFromOrEquals(f.Type, dbContextType)))
        {
            context.ReportDiagnostic(Diagnostic.Create(
                DiagnosticDescriptors.NoDbContextInControllers,
                field.Locations.FirstOrDefault(),
                type.Name,
                field.Type.ToDisplayString()));
        }

        foreach (var property in type.GetMembers().OfType<IPropertySymbol>()
                     .Where(p => !p.IsStatic && AnalyzerUtilities.InheritsFromOrEquals(p.Type, dbContextType)))
        {
            context.ReportDiagnostic(Diagnostic.Create(
                DiagnosticDescriptors.NoDbContextInControllers,
                property.Locations.FirstOrDefault(),
                type.Name,
                property.Type.ToDisplayString()));
        }
    }
}
