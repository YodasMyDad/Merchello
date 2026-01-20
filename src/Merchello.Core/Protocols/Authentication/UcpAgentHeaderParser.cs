using StructuredFieldValues;

namespace Merchello.Core.Protocols.Authentication;

/// <summary>
/// Parses the UCP-Agent header according to RFC 8941 Dictionary Structured Field format.
/// </summary>
/// <remarks>
/// The UCP-Agent header uses RFC 8941 (Structured Field Values for HTTP) dictionary format:
/// <code>
/// UCP-Agent: profile="https://platform.example/profile", version="2026-01-11"
/// </code>
/// This implementation uses the StructuredFieldValues NuGet package for full RFC 8941 compliance.
/// </remarks>
public static class UcpAgentHeaderParser
{
    /// <summary>
    /// Parses the UCP-Agent header and returns key-value pairs.
    /// </summary>
    /// <param name="headerValue">The raw header value.</param>
    /// <returns>Dictionary of parsed values.</returns>
    public static Dictionary<string, string> Parse(string headerValue)
    {
        if (string.IsNullOrWhiteSpace(headerValue))
        {
            return new Dictionary<string, string>(StringComparer.OrdinalIgnoreCase);
        }

        // Use RFC 8941 compliant parser from StructuredFieldValues
        var error = SfvParser.ParseDictionary(headerValue, out var dictionary);
        if (error != null)
        {
            return new Dictionary<string, string>(StringComparer.OrdinalIgnoreCase);
        }

        var result = new Dictionary<string, string>(StringComparer.OrdinalIgnoreCase);

        foreach (var (key, parsedItem) in dictionary)
        {
            var stringValue = ConvertToString(parsedItem.Value);
            if (stringValue != null)
            {
                result[key] = stringValue;
            }
        }

        return result;
    }

    /// <summary>
    /// Extracts the profile URI from a UCP-Agent header value.
    /// </summary>
    /// <param name="headerValue">The raw header value.</param>
    /// <returns>The profile URI, or null if not found.</returns>
    public static string? GetProfileUri(string headerValue)
    {
        var parsed = Parse(headerValue);
        return parsed.TryGetValue("profile", out var profile) ? profile : null;
    }

    /// <summary>
    /// Extracts the version from a UCP-Agent header value.
    /// </summary>
    /// <param name="headerValue">The raw header value.</param>
    /// <returns>The version string, or null if not found.</returns>
    public static string? GetVersion(string headerValue)
    {
        var parsed = Parse(headerValue);
        return parsed.TryGetValue("version", out var version) ? version : null;
    }

    /// <summary>
    /// Validates and extracts all UCP-Agent parameters.
    /// </summary>
    /// <param name="headerValue">The raw header value.</param>
    /// <returns>UcpAgentInfo if valid, null otherwise.</returns>
    public static UcpAgentInfo? ParseAgentInfo(string headerValue)
    {
        var parsed = Parse(headerValue);

        if (!parsed.TryGetValue("profile", out var profile) || string.IsNullOrEmpty(profile))
        {
            return null;
        }

        return new UcpAgentInfo
        {
            ProfileUri = profile,
            Version = parsed.TryGetValue("version", out var version) ? version : null
        };
    }

    /// <summary>
    /// Converts an RFC 8941 value to its string representation.
    /// Supports: String, Token, Integer, Decimal, Boolean, ByteSequence, DateTime.
    /// </summary>
    private static string? ConvertToString(object? value)
    {
        return value switch
        {
            string s => s,
            Token t => t.ToString(),
            long l => l.ToString(),
            decimal d => d.ToString(System.Globalization.CultureInfo.InvariantCulture),
            bool b => b ? "?1" : "?0",
            ReadOnlyMemory<byte> bytes => Convert.ToBase64String(bytes.Span),
            DateTime dt => dt.ToString("O"),
            DisplayString ds => ds.ToString(),
            null => null,
            _ => value.ToString()
        };
    }
}

/// <summary>
/// Information extracted from a UCP-Agent header.
/// </summary>
public class UcpAgentInfo
{
    /// <summary>
    /// The agent's profile URI.
    /// </summary>
    public required string ProfileUri { get; init; }

    /// <summary>
    /// The protocol version the agent supports.
    /// </summary>
    public string? Version { get; init; }
}
