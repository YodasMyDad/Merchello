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
public sealed class NotificationHandlerPriorityRangeAnalyzer : DiagnosticAnalyzer
{
    public override ImmutableArray<DiagnosticDescriptor> SupportedDiagnostics
        => [DiagnosticDescriptors.NotificationHandlerPriorityRange];

    public override void Initialize(AnalysisContext context)
    {
        context.ConfigureGeneratedCodeAnalysis(GeneratedCodeAnalysisFlags.None);
        context.EnableConcurrentExecution();
        context.RegisterSyntaxNodeAction(AnalyzeClassDeclaration, SyntaxKind.ClassDeclaration);
    }

    private static void AnalyzeClassDeclaration(SyntaxNodeAnalysisContext context)
    {
        if (context.Node is not ClassDeclarationSyntax classDecl)
        {
            return;
        }

        var classSymbol = context.SemanticModel.GetDeclaredSymbol(classDecl, context.CancellationToken);
        if (classSymbol is null)
        {
            return;
        }

        if (AnalyzerUtilities.IsTestAssembly(context.Compilation))
        {
            return;
        }

        // Check if implements INotificationAsyncHandler<T>
        var isHandler = classSymbol.AllInterfaces
            .Any(i => i.Name == "INotificationAsyncHandler" && i.IsGenericType);

        if (!isHandler)
        {
            return;
        }

        // Find NotificationHandlerPriority attribute
        var priorityAttr = classSymbol.GetAttributes()
            .FirstOrDefault(a => a.AttributeClass?.Name is "NotificationHandlerPriorityAttribute" or "NotificationHandlerPriority");

        if (priorityAttr is null || priorityAttr.ConstructorArguments.Length == 0)
        {
            return;
        }

        if (priorityAttr.ConstructorArguments[0].Value is not int priority)
        {
            return;
        }

        var className = classSymbol.Name;
        var (expectedCategory, expectedRange) = InferExpectedRange(className);

        if (expectedCategory is null)
        {
            return;
        }

        if (!IsInExpectedRange(priority, expectedCategory))
        {
            context.ReportDiagnostic(Diagnostic.Create(
                DiagnosticDescriptors.NotificationHandlerPriorityRange,
                classDecl.Identifier.GetLocation(),
                className,
                priority,
                expectedCategory,
                expectedRange));
        }
    }

    private static (string? category, string? range) InferExpectedRange(string className)
    {
        if (className.Contains("Email", StringComparison.Ordinal))
        {
            return ("email dispatch", "2100");
        }

        if (className.Contains("Webhook", StringComparison.Ordinal) && !className.Contains("Ucp", StringComparison.Ordinal))
        {
            return ("webhook dispatch", "2200");
        }

        if (className.Contains("Timeline", StringComparison.Ordinal) || className.Contains("Audit", StringComparison.Ordinal))
        {
            return ("audit/timeline", "2000");
        }

        if (className.Contains("Ucp", StringComparison.Ordinal) || className.Contains("Protocol", StringComparison.Ordinal))
        {
            return ("protocol-specific", "3000");
        }

        if (className.Contains("Fulfilment", StringComparison.Ordinal))
        {
            return ("fulfilment post-processing", "1800-1900");
        }

        if (className.Contains("Digital", StringComparison.Ordinal))
        {
            return ("digital product processing", "1500");
        }

        return (null, null);
    }

    private static bool IsInExpectedRange(int priority, string category)
    {
        return category switch
        {
            "email dispatch" => priority == 2100,
            "webhook dispatch" => priority == 2200,
            "audit/timeline" => priority == 2000,
            "protocol-specific" => priority == 3000,
            "fulfilment post-processing" => priority is >= 1800 and <= 1900,
            "digital product processing" => priority == 1500,
            _ => true
        };
    }
}
