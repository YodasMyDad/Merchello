using System.Collections.Concurrent;
using System.Reflection;

namespace Merchello.Core.Shared.Reflection;

public static class AssemblyManager
{
    private static IEnumerable<Assembly?> _assemblies = [];
    private static ConcurrentDictionary<Type, IEnumerable<Type>> _types = new();

    /// <summary>
    /// Gets the cached assemblies that have been set by the SetAssemblies method.
    /// </summary>
    public static IEnumerable<Assembly?> Assemblies => _assemblies;

    /// <summary>
    /// Sets the assemblies and invalidates the type cache.
    /// </summary>
    /// <param name="assems">The assemblies to set.</param>
    public static void SetAssemblies(IEnumerable<Assembly?> assems)
    {
        _assemblies = assems;
        _types = new ConcurrentDictionary<Type, IEnumerable<Type>>();
    }

    /// <summary>
    /// Tries to get cached types for the specified type.
    /// </summary>
    public static bool TryGetTypes(Type type, out IEnumerable<Type> types)
    {
        return _types.TryGetValue(type, out types!);
    }

    /// <summary>
    /// Caches the types for the specified type.
    /// </summary>
    public static void CacheTypes(Type type, IEnumerable<Type> types)
    {
        _types[type] = types;
    }
}
