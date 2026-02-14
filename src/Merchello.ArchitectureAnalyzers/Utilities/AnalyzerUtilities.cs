using System;
using System.Collections.Immutable;
using System.Linq;
using Microsoft.CodeAnalysis;

namespace Merchello.ArchitectureAnalyzers.Utilities;

internal static class AnalyzerUtilities
{
    private static readonly ImmutableHashSet<string> ScalarTypeDisplayNames = ImmutableHashSet.Create(
        StringComparer.Ordinal,
        "bool",
        "byte",
        "char",
        "decimal",
        "double",
        "float",
        "int",
        "long",
        "short",
        "string",
        "uint",
        "ulong",
        "ushort",
        "System.Guid",
        "System.DateTime",
        "System.DateTimeOffset",
        "System.TimeSpan");

    public static INamedTypeSymbol? GetType(Compilation compilation, string metadataName)
        => compilation.GetTypeByMetadataName(metadataName);

    public static bool InheritsFromOrEquals(ITypeSymbol? symbol, ITypeSymbol? baseType)
    {
        if (symbol is null || baseType is null)
        {
            return false;
        }

        if (SymbolEqualityComparer.Default.Equals(symbol, baseType))
        {
            return true;
        }

        if (symbol is INamedTypeSymbol namedType)
        {
            var current = namedType.BaseType;
            while (current is not null)
            {
                if (SymbolEqualityComparer.Default.Equals(current, baseType))
                {
                    return true;
                }

                current = current.BaseType;
            }

            foreach (var @interface in namedType.AllInterfaces)
            {
                if (SymbolEqualityComparer.Default.Equals(@interface, baseType))
                {
                    return true;
                }
            }
        }

        return false;
    }

    public static bool IsControllerType(INamedTypeSymbol type, INamedTypeSymbol? controllerBaseType)
    {
        if (type.TypeKind != TypeKind.Class)
        {
            return false;
        }

        if (type.Name.EndsWith("Controller", StringComparison.Ordinal))
        {
            return true;
        }

        return InheritsFromOrEquals(type, controllerBaseType);
    }

    public static bool IsServiceType(INamedTypeSymbol type)
    {
        if (type.TypeKind != TypeKind.Class)
        {
            return false;
        }

        if (!type.Name.EndsWith("Service", StringComparison.Ordinal))
        {
            return false;
        }

        var ns = type.ContainingNamespace?.ToDisplayString() ?? string.Empty;
        return ns.Contains(".Services", StringComparison.Ordinal);
    }

    public static bool IsServiceOrController(INamedTypeSymbol type, INamedTypeSymbol? controllerBaseType)
        => IsControllerType(type, controllerBaseType) || IsServiceType(type);

    public static bool IsTaskLike(ITypeSymbol type)
    {
        if (type is not INamedTypeSymbol namedType)
        {
            return false;
        }

        var fullName = namedType.ConstructedFrom.ToDisplayString();
        return fullName == "System.Threading.Tasks.Task"
            || fullName == "System.Threading.Tasks.Task<TResult>"
            || fullName == "System.Threading.Tasks.ValueTask"
            || fullName == "System.Threading.Tasks.ValueTask<TResult>";
    }

    public static bool HasCancellationTokenParameter(IMethodSymbol method)
        => method.Parameters.Any(p => p.Type.ToDisplayString() == "System.Threading.CancellationToken");

    public static bool IsCrudResultReturnType(ITypeSymbol returnType)
    {
        if (returnType is INamedTypeSymbol namedReturnType)
        {
            if (IsCrudResultNamedType(namedReturnType))
            {
                return true;
            }

            var constructed = namedReturnType.ConstructedFrom.ToDisplayString();
            if (constructed is "System.Threading.Tasks.Task<TResult>" or "System.Threading.Tasks.ValueTask<TResult>")
            {
                return namedReturnType.TypeArguments.Any(t => t is INamedTypeSymbol arg && IsCrudResultNamedType(arg));
            }
        }

        return false;
    }

    private static bool IsCrudResultNamedType(INamedTypeSymbol type)
        => type.Name == "CrudResult"
           && type.Arity == 1
           && type.ContainingNamespace.ToDisplayString().EndsWith(".Shared.Models", StringComparison.Ordinal);

    public static bool IsScalarLike(ITypeSymbol type)
    {
        if (type.TypeKind == TypeKind.Enum)
        {
            return true;
        }

        if (type is INamedTypeSymbol named && named.IsGenericType)
        {
            var genericDef = named.ConstructedFrom.ToDisplayString();
            if (genericDef is "System.Nullable<T>")
            {
                return IsScalarLike(named.TypeArguments[0]);
            }
        }

        return ScalarTypeDisplayNames.Contains(type.ToDisplayString());
    }

    public static bool IsTestAssembly(Compilation compilation)
        => compilation.AssemblyName?.EndsWith(".Tests", StringComparison.Ordinal) == true;
}
