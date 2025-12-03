using System;
using System.Collections.Generic;
using System.Text.Json;

namespace Merchello.Core.Payments.Providers;

/// <summary>
/// Helper class for accessing payment provider configuration values.
/// </summary>
public class PaymentProviderConfiguration
{
    private readonly Dictionary<string, string> _values;

    /// <summary>
    /// Whether the provider is operating in test/sandbox mode.
    /// When true, providers should use test credentials and sandbox environments.
    /// </summary>
    public bool IsTestMode { get; }

    /// <summary>
    /// Creates a new configuration instance from JSON.
    /// </summary>
    /// <param name="json">JSON string containing configuration values.</param>
    /// <param name="isTestMode">Whether the provider is in test mode.</param>
    public PaymentProviderConfiguration(string? json, bool isTestMode = true)
    {
        IsTestMode = isTestMode;
        _values = new Dictionary<string, string>(StringComparer.OrdinalIgnoreCase);

        if (!string.IsNullOrWhiteSpace(json))
        {
            try
            {
                var parsed = JsonSerializer.Deserialize<Dictionary<string, string>>(json);
                if (parsed != null)
                {
                    foreach (var kvp in parsed)
                    {
                        _values[kvp.Key] = kvp.Value;
                    }
                }
            }
            catch (JsonException)
            {
                // Invalid JSON, leave dictionary empty
            }
        }
    }

    /// <summary>
    /// Creates configuration from a dictionary of values.
    /// </summary>
    /// <param name="values">Configuration values.</param>
    /// <param name="isTestMode">Whether the provider is in test mode.</param>
    public PaymentProviderConfiguration(IDictionary<string, string>? values, bool isTestMode = true)
    {
        IsTestMode = isTestMode;
        _values = values != null
            ? new Dictionary<string, string>(values, StringComparer.OrdinalIgnoreCase)
            : new Dictionary<string, string>(StringComparer.OrdinalIgnoreCase);
    }

    /// <summary>
    /// Gets a configuration value by key.
    /// </summary>
    /// <param name="key">The configuration key.</param>
    /// <returns>The value, or null if not found.</returns>
    public string? GetValue(string key)
    {
        return _values.TryGetValue(key, out var value) ? value : null;
    }

    /// <summary>
    /// Gets a configuration value by key, with a default value.
    /// </summary>
    /// <param name="key">The configuration key.</param>
    /// <param name="defaultValue">Default value if key not found.</param>
    /// <returns>The value, or the default if not found.</returns>
    public string GetValue(string key, string defaultValue)
    {
        return _values.TryGetValue(key, out var value) ? value : defaultValue;
    }

    /// <summary>
    /// Gets a boolean configuration value.
    /// </summary>
    /// <param name="key">The configuration key.</param>
    /// <param name="defaultValue">Default value if key not found or invalid.</param>
    /// <returns>The boolean value.</returns>
    public bool GetBool(string key, bool defaultValue = false)
    {
        var value = GetValue(key);
        if (string.IsNullOrWhiteSpace(value))
        {
            return defaultValue;
        }

        return bool.TryParse(value, out var result) ? result : defaultValue;
    }

    /// <summary>
    /// Gets an integer configuration value.
    /// </summary>
    /// <param name="key">The configuration key.</param>
    /// <param name="defaultValue">Default value if key not found or invalid.</param>
    /// <returns>The integer value.</returns>
    public int GetInt(string key, int defaultValue = 0)
    {
        var value = GetValue(key);
        if (string.IsNullOrWhiteSpace(value))
        {
            return defaultValue;
        }

        return int.TryParse(value, out var result) ? result : defaultValue;
    }

    /// <summary>
    /// Checks if a configuration key exists.
    /// </summary>
    /// <param name="key">The configuration key.</param>
    /// <returns>True if the key exists.</returns>
    public bool HasKey(string key)
    {
        return _values.ContainsKey(key);
    }

    /// <summary>
    /// Gets all configuration values as a dictionary.
    /// </summary>
    /// <returns>A copy of the configuration values.</returns>
    public IReadOnlyDictionary<string, string> GetAll()
    {
        return _values;
    }

    /// <summary>
    /// Serializes the configuration to JSON.
    /// </summary>
    /// <returns>JSON string.</returns>
    public string ToJson()
    {
        return JsonSerializer.Serialize(_values);
    }
}

