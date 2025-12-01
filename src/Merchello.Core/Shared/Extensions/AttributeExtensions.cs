using System.Reflection;

namespace Merchello.Core.Shared.Extensions;

public static class AttributeExtensions
{
    public static T? GetAttribute<T>(this PropertyInfo propertyInfo) where T : class
    {
        var dict = propertyInfo.GetCustomAttributes(false).ToDictionary(a => a.GetType().Name, a => a);
        var typeName = typeof(T).Name;
        if (dict.ContainsKey(typeName))
        {
            return dict[typeName] as T;
        }
        return default;
    }
}
