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
public sealed class NotificationHandlerFaultToleranceAnalyzer : DiagnosticAnalyzer
{
    // Cancelable notification base types — handlers for these are allowed to throw/not catch
    private static readonly string[] CancelableNotificationSuffixes =
    [
        "CreatingNotification",
        "SavingNotification",
        "DeletingNotification",
        "CancellingNotification",
        "ClearingNotification",
        "ChangingNotification",
        "AddingNotification",
        "RemovingNotification",
        "ModifyingNotification",
        "ReservingNotification",
        "ReleasingNotification",
        "AllocatingNotification",
        "SubmittingNotification",
        "RefundingNotification",
        "ApplyingNotification"
    ];

    // Notification types that are system-level (startup/migration) where throwing is appropriate
    private static readonly string[] SystemNotificationTypes =
    [
        "UmbracoApplicationStartedNotification",
        "UmbracoApplicationStartingNotification"
    ];

    public override ImmutableArray<DiagnosticDescriptor> SupportedDiagnostics
        => [DiagnosticDescriptors.NotificationHandlerFaultTolerance];

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

        // Check if this class implements INotificationAsyncHandler<T>
        var handlerInterface = classSymbol.AllInterfaces
            .FirstOrDefault(i => i.Name == "INotificationAsyncHandler" && i.IsGenericType && i.TypeArguments.Length == 1);

        if (handlerInterface is null)
        {
            return;
        }

        // Check if the notification type is cancelable (before-event) — skip those
        var notificationType = handlerInterface.TypeArguments[0];
        if (IsCancelableNotification(notificationType))
        {
            return;
        }

        // Skip system/startup notification handlers where throwing is appropriate
        if (IsSystemNotification(notificationType))
        {
            return;
        }

        // Find all HandleAsync methods (a handler may implement multiple INotificationAsyncHandler<T>)
        var handleAsyncMethods = classDecl.Members
            .OfType<MethodDeclarationSyntax>()
            .Where(m => m.Identifier.Text == "HandleAsync")
            .ToList();

        if (handleAsyncMethods.Count == 0)
        {
            return;
        }

        foreach (var handleAsyncMethod in handleAsyncMethods)
        {
            if (handleAsyncMethod.Body is null && handleAsyncMethod.ExpressionBody is null)
            {
                continue;
            }

            // Check if the method body itself has try/catch
            if (handleAsyncMethod.Body is not null && HasTryCatchWrappingBody(handleAsyncMethod.Body))
            {
                continue;
            }

            // Check if the method delegates to private methods that have try/catch
            if (DelegatesToFaultTolerantMethod(handleAsyncMethod, classDecl))
            {
                continue;
            }

            context.ReportDiagnostic(Diagnostic.Create(
                DiagnosticDescriptors.NotificationHandlerFaultTolerance,
                handleAsyncMethod.Identifier.GetLocation(),
                classSymbol.Name));
        }
    }

    private static bool IsCancelableNotification(ITypeSymbol notificationType)
    {
        var typeName = notificationType.Name;
        return CancelableNotificationSuffixes.Any(suffix =>
            typeName.EndsWith(suffix, StringComparison.Ordinal));
    }

    private static bool IsSystemNotification(ITypeSymbol notificationType)
    {
        var typeName = notificationType.Name;
        return SystemNotificationTypes.Contains(typeName, StringComparer.Ordinal);
    }

    private static bool HasTryCatchWrappingBody(BlockSyntax body)
    {
        foreach (var statement in body.Statements)
        {
            if (statement is TryStatementSyntax trySyntax && trySyntax.Catches.Count > 0)
            {
                return true;
            }
        }

        return false;
    }

    private static bool DelegatesToFaultTolerantMethod(MethodDeclarationSyntax handleAsync, ClassDeclarationSyntax classDecl)
    {
        // Find method invocations within HandleAsync
        var invocations = (handleAsync.Body?.DescendantNodes() ?? handleAsync.ExpressionBody?.DescendantNodes() ?? [])
            .OfType<InvocationExpressionSyntax>()
            .ToList();

        foreach (var invocation in invocations)
        {
            // Get the method name being called
            var methodName = invocation.Expression switch
            {
                IdentifierNameSyntax id => id.Identifier.Text,
                MemberAccessExpressionSyntax member => member.Name.Identifier.Text,
                _ => null
            };

            if (methodName is null)
            {
                continue;
            }

            // Check if this is a private/internal method on the same class that has try/catch
            var targetMethod = classDecl.Members
                .OfType<MethodDeclarationSyntax>()
                .FirstOrDefault(m => m.Identifier.Text == methodName && m != handleAsync);

            if (targetMethod?.Body is not null && HasTryCatchWrappingBody(targetMethod.Body))
            {
                return true;
            }
        }

        return false;
    }
}
