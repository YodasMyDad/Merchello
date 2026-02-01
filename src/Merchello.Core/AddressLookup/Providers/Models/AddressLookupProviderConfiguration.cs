using System.Text.Json;

namespace Merchello.Core.AddressLookup.Providers.Models;

/// <summary>
/// Configuration wrapper for address lookup provider settings.
/// </summary>
public class AddressLookupProviderConfiguration
{
    private readonly Dictionary<string, string> _values;

    public AddressLookupProviderConfiguration(string? json)
    {
        _values = new Dictionary<string, string>(StringComparer.OrdinalIgnoreCase);
        if (string.IsNullOrWhiteSpace(json))
        {
            return;
        }

        try
        {
            var parsed = JsonSerializer.Deserialize<Dictionary<string, string>>(json);
            if (parsed == null) return;
            foreach (var kvp in parsed)
            {
                _values[kvp.Key] = kvp.Value;
            }
        }
        catch (JsonException)
        {
            // Ignore invalid JSON and keep empty.
        }
    }

    public AddressLookupProviderConfiguration(IDictionary<string, string>? values)
    {
        _values = values != null
            ? new Dictionary<string, string>(values, StringComparer.OrdinalIgnoreCase)
            : new Dictionary<string, string>(StringComparer.OrdinalIgnoreCase);
    }

    public string? GetValue(string key) => _values.TryGetValue(key, out var value) ? value : null;

    public bool HasKey(string key) => _values.ContainsKey(key);

    public IReadOnlyDictionary<string, string> GetAll() => _values;

    public string ToJson() => JsonSerializer.Serialize(_values);
}
