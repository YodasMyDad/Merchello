using System;
using System.Collections.Immutable;
using System.IO;
using System.Linq;
using Merchello.ArchitectureAnalyzers.Diagnostics;
using Microsoft.CodeAnalysis;
using Microsoft.CodeAnalysis.CSharp;
using Microsoft.CodeAnalysis.CSharp.Syntax;
using Microsoft.CodeAnalysis.Diagnostics;

namespace Merchello.ArchitectureAnalyzers.Analyzers;

[DiagnosticAnalyzer(LanguageNames.CSharp)]
public sealed class OnePublicTypePerFileAnalyzer : DiagnosticAnalyzer
{
    private static readonly string[] TargetFolderSegments =
    [
        "Dtos",
        "Models",
        "Parameters",
        "Interfaces",
        "Services"
    ];

    public override ImmutableArray<DiagnosticDescriptor> SupportedDiagnostics
        => [DiagnosticDescriptors.OnePublicTypePerFile];

    public override void Initialize(AnalysisContext context)
    {
        context.ConfigureGeneratedCodeAnalysis(GeneratedCodeAnalysisFlags.None);
        context.EnableConcurrentExecution();
        context.RegisterSyntaxTreeAction(AnalyzeSyntaxTree);
    }

    private static void AnalyzeSyntaxTree(SyntaxTreeAnalysisContext context)
    {
        var filePath = context.Tree.FilePath;
        if (string.IsNullOrEmpty(filePath) || !IsInTargetFolder(filePath))
        {
            return;
        }

        var root = context.Tree.GetRoot(context.CancellationToken);

        var publicTypes = root.DescendantNodes()
            .Where(IsPublicTypeDeclaration)
            .ToList();

        if (publicTypes.Count <= 1)
        {
            return;
        }

        // Report on the second and subsequent types (the first one is allowed to stay)
        for (var i = 1; i < publicTypes.Count; i++)
        {
            var typeName = GetTypeName(publicTypes[i]);
            context.ReportDiagnostic(Diagnostic.Create(
                DiagnosticDescriptors.OnePublicTypePerFile,
                publicTypes[i].GetLocation(),
                publicTypes.Count,
                typeName));
        }
    }

    private static bool IsInTargetFolder(string filePath)
    {
        foreach (var folder in TargetFolderSegments)
        {
            var separator = Path.DirectorySeparatorChar;
            if (filePath.Contains($"{separator}{folder}{separator}", StringComparison.OrdinalIgnoreCase)
                || filePath.Contains($"/{folder}/", StringComparison.OrdinalIgnoreCase))
            {
                return true;
            }
        }

        return false;
    }

    private static bool IsPublicTypeDeclaration(SyntaxNode node)
    {
        return node switch
        {
            ClassDeclarationSyntax cls => cls.Modifiers.Any(SyntaxKind.PublicKeyword) && !IsNestedType(cls),
            RecordDeclarationSyntax rec => rec.Modifiers.Any(SyntaxKind.PublicKeyword) && !IsNestedType(rec),
            InterfaceDeclarationSyntax iface => iface.Modifiers.Any(SyntaxKind.PublicKeyword) && !IsNestedType(iface),
            EnumDeclarationSyntax enm => enm.Modifiers.Any(SyntaxKind.PublicKeyword) && !IsNestedType(enm),
            StructDeclarationSyntax str => str.Modifiers.Any(SyntaxKind.PublicKeyword) && !IsNestedType(str),
            _ => false
        };
    }

    private static bool IsNestedType(SyntaxNode node)
        => node.Parent is TypeDeclarationSyntax;

    private static string GetTypeName(SyntaxNode node)
    {
        return node switch
        {
            ClassDeclarationSyntax cls => cls.Identifier.Text,
            RecordDeclarationSyntax rec => rec.Identifier.Text,
            InterfaceDeclarationSyntax iface => iface.Identifier.Text,
            EnumDeclarationSyntax enm => enm.Identifier.Text,
            StructDeclarationSyntax str => str.Identifier.Text,
            _ => "Unknown"
        };
    }
}
