using System.Collections.Concurrent;
using System.Reflection;
using System.Text.RegularExpressions;
using Merchello.Core.Email.Models;
using Merchello.Core.Email.Services.Interfaces;
using Merchello.Core.Notifications.Base;

namespace Merchello.Core.Email.Services;

/// <summary>
/// Resolves token expressions to actual values using reflection.
/// Tokens use the format {{path.to.property}}.
/// </summary>
public partial class EmailTokenResolver(IEmailTopicRegistry topicRegistry) : IEmailTokenResolver
{
    // Matches {{tokenPath}} patterns
    [GeneratedRegex(@"\{\{([a-zA-Z0-9_.]+)\}\}")]
    private static partial Regex TokenPattern();

    // Thread-safe cache of available tokens by notification type
    private readonly ConcurrentDictionary<Type, IReadOnlyList<TokenInfo>> _tokenCache = new();

    public string ResolveTokens<TNotification>(string template, EmailModel<TNotification> model)
        where TNotification : MerchelloNotification
    {
        if (string.IsNullOrEmpty(template))
            return template;

        return TokenPattern().Replace(template, match =>
        {
            var path = match.Groups[1].Value;
            var value = ResolveToken(path, model);
            return value ?? match.Value; // Keep original if not resolved
        });
    }

    public string? ResolveToken<TNotification>(string path, EmailModel<TNotification> model)
        where TNotification : MerchelloNotification
    {
        if (string.IsNullOrWhiteSpace(path))
            return null;

        var parts = path.Split('.');
        if (parts.Length == 0)
            return null;

        object? current = parts[0].ToLowerInvariant() switch
        {
            "store" => model.Store,
            "config" or "configuration" => model.Configuration,
            "notification" => model.Notification,
            // Direct access to notification properties (e.g., order.customerEmail instead of notification.order.customerEmail)
            _ => GetPropertyValue(model.Notification, parts[0]) ?? GetPropertyValue(model.Store, parts[0])
        };

        if (current == null)
            return null;

        // Navigate remaining path
        var startIndex = parts[0].ToLowerInvariant() switch
        {
            "store" or "config" or "configuration" or "notification" => 1,
            _ => 1 // Already resolved first part from notification/store
        };

        for (var i = startIndex; i < parts.Length; i++)
        {
            current = GetPropertyValue(current, parts[i]);
            if (current == null)
                return null;
        }

        return FormatValue(current);
    }

    public IReadOnlyList<TokenInfo> GetAvailableTokens(string topic)
    {
        var notificationType = topicRegistry.GetNotificationType(topic);
        if (notificationType == null)
            return [];

        return GetTokensForType(notificationType);
    }

    public IReadOnlyList<TokenInfo> GetAvailableTokens<TNotification>()
        where TNotification : MerchelloNotification
    {
        return GetTokensForType(typeof(TNotification));
    }

    private IReadOnlyList<TokenInfo> GetTokensForType(Type notificationType)
    {
        return _tokenCache.GetOrAdd(notificationType, type =>
        {
            var tokens = new List<TokenInfo>();

            // Add store context tokens
            tokens.AddRange(GetTokensFromType(typeof(EmailStoreContext), "store"));

            // Add notification tokens
            tokens.AddRange(GetTokensFromType(type, ""));

            return tokens.AsReadOnly();
        });
    }

    private static List<TokenInfo> GetTokensFromType(Type type, string prefix, int depth = 0)
    {
        if (depth > 3) // Prevent infinite recursion
            return [];

        var tokens = new List<TokenInfo>();

        foreach (var prop in type.GetProperties(BindingFlags.Public | BindingFlags.Instance))
        {
            if (!prop.CanRead)
                continue;

            var path = string.IsNullOrEmpty(prefix) ? prop.Name : $"{prefix}.{prop.Name}";
            var displayName = SplitCamelCase(prop.Name);

            // Simple types
            if (IsSimpleType(prop.PropertyType))
            {
                tokens.Add(new TokenInfo
                {
                    Path = ToCamelCase(path),
                    DisplayName = displayName,
                    DataType = GetDataTypeName(prop.PropertyType)
                });
            }
            // Complex types - recurse
            else if (!prop.PropertyType.IsGenericType &&
                     !prop.PropertyType.IsArray &&
                     prop.PropertyType.IsClass &&
                     prop.PropertyType != typeof(string))
            {
                tokens.AddRange(GetTokensFromType(prop.PropertyType, path, depth + 1));
            }
        }

        return tokens;
    }

    private static object? GetPropertyValue(object? obj, string propertyName)
    {
        if (obj == null)
            return null;

        var type = obj.GetType();

        // Try exact match first
        var property = type.GetProperty(propertyName, BindingFlags.Public | BindingFlags.Instance | BindingFlags.IgnoreCase);

        if (property != null)
            return property.GetValue(obj);

        // Try camelCase to PascalCase conversion
        if (propertyName.Length > 0)
        {
            var pascalCase = char.ToUpperInvariant(propertyName[0]) + propertyName[1..];
            property = type.GetProperty(pascalCase, BindingFlags.Public | BindingFlags.Instance);
            if (property != null)
                return property.GetValue(obj);
        }

        return null;
    }

    private static string FormatValue(object value)
    {
        return value switch
        {
            null => "",
            DateTime dt => dt.ToString("yyyy-MM-dd HH:mm:ss"),
            DateTimeOffset dto => dto.ToString("yyyy-MM-dd HH:mm:ss"),
            decimal d => d.ToString("0.00"),
            double dbl => dbl.ToString("0.00"),
            bool b => b ? "Yes" : "No",
            _ => value.ToString() ?? ""
        };
    }

    private static bool IsSimpleType(Type type)
    {
        var underlying = Nullable.GetUnderlyingType(type) ?? type;

        return underlying.IsPrimitive ||
               underlying.IsEnum ||
               underlying == typeof(string) ||
               underlying == typeof(decimal) ||
               underlying == typeof(DateTime) ||
               underlying == typeof(DateTimeOffset) ||
               underlying == typeof(Guid);
    }

    private static string GetDataTypeName(Type type)
    {
        var underlying = Nullable.GetUnderlyingType(type) ?? type;

        if (underlying == typeof(string)) return "string";
        if (underlying == typeof(int) || underlying == typeof(long)) return "integer";
        if (underlying == typeof(decimal) || underlying == typeof(double) || underlying == typeof(float)) return "decimal";
        if (underlying == typeof(bool)) return "boolean";
        if (underlying == typeof(DateTime) || underlying == typeof(DateTimeOffset)) return "datetime";
        if (underlying == typeof(Guid)) return "guid";

        return underlying.Name.ToLowerInvariant();
    }

    private static string SplitCamelCase(string input)
    {
        if (string.IsNullOrEmpty(input))
            return input;

        var result = System.Text.RegularExpressions.Regex.Replace(input, "([A-Z])", " $1").Trim();
        return char.ToUpperInvariant(result[0]) + result[1..];
    }

    private static string ToCamelCase(string input)
    {
        if (string.IsNullOrEmpty(input))
            return input;

        var parts = input.Split('.');
        return string.Join(".", parts.Select(p =>
            p.Length > 0 ? char.ToLowerInvariant(p[0]) + p[1..] : p));
    }
}
