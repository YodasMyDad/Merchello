namespace Merchello.Core.Protocols.Authentication;

/// <summary>
/// Parses the UCP-Agent header according to RFC 8941 Dictionary Structured Field format.
/// </summary>
/// <remarks>
/// The UCP-Agent header uses RFC 8941 (Structured Field Values for HTTP) dictionary format:
/// <code>
/// UCP-Agent: profile="https://platform.example/profile", version="2026-01-11"
/// </code>
/// This implementation provides basic parsing. For full RFC 8941 compliance,
/// consider using the StructuredFieldValues NuGet package.
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
        var result = new Dictionary<string, string>(StringComparer.OrdinalIgnoreCase);

        if (string.IsNullOrWhiteSpace(headerValue))
        {
            return result;
        }

        // Split on commas (RFC 8941 dictionary member separator)
        var members = SplitMembers(headerValue);

        foreach (var member in members)
        {
            var trimmed = member.Trim();
            if (string.IsNullOrEmpty(trimmed))
            {
                continue;
            }

            // Parse key="value" or key=value format
            var parsed = ParseMember(trimmed);
            if (parsed.HasValue)
            {
                result[parsed.Value.Key] = parsed.Value.Value;
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

    private static IEnumerable<string> SplitMembers(string headerValue)
    {
        // Split on commas, but respect quoted strings
        var members = new List<string>();
        var current = new System.Text.StringBuilder();
        var inQuotes = false;

        foreach (var c in headerValue)
        {
            if (c == '"')
            {
                inQuotes = !inQuotes;
                current.Append(c);
            }
            else if (c == ',' && !inQuotes)
            {
                members.Add(current.ToString());
                current.Clear();
            }
            else
            {
                current.Append(c);
            }
        }

        if (current.Length > 0)
        {
            members.Add(current.ToString());
        }

        return members;
    }

    private static (string Key, string Value)? ParseMember(string member)
    {
        // Handle key="value" format
        var equalsIndex = member.IndexOf('=');
        if (equalsIndex < 1)
        {
            return null;
        }

        var key = member[..equalsIndex].Trim();
        var value = member[(equalsIndex + 1)..].Trim();

        // Remove quotes from value if present
        if (value.StartsWith('"') && value.EndsWith('"') && value.Length >= 2)
        {
            value = value[1..^1];
        }

        return (key, value);
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
