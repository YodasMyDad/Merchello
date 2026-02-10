namespace Merchello.Core.Fulfilment.Providers.SupplierDirect.Csv;

/// <summary>
/// Sanitizes values for CSV output to prevent formula injection attacks.
/// </summary>
public static class CsvSanitizer
{
    /// <summary>
    /// Characters that can trigger formula execution in spreadsheet applications.
    /// </summary>
    private static readonly char[] FormulaStartChars = ['=', '+', '-', '@', '\t', '\r', '\n'];

    /// <summary>
    /// Sanitizes a string value for CSV output.
    /// Protects against formula injection by prefixing dangerous characters with a single quote.
    /// </summary>
    /// <param name="value">The value to sanitize.</param>
    /// <returns>A sanitized value safe for CSV output.</returns>
    public static string Sanitize(string? value)
    {
        if (string.IsNullOrEmpty(value))
        {
            return string.Empty;
        }

        var trimmed = value.Trim();

        // Check for formula injection characters at start
        if (trimmed.Length > 0 && FormulaStartChars.Contains(trimmed[0]))
        {
            return "'" + trimmed;
        }

        return trimmed;
    }

    /// <summary>
    /// Escapes a CSV field value (handles quotes and commas).
    /// Wraps the field in quotes if it contains special characters.
    /// </summary>
    /// <param name="value">The value to escape.</param>
    /// <returns>A properly escaped CSV field value.</returns>
    public static string EscapeCsvField(string? value)
    {
        if (string.IsNullOrEmpty(value))
        {
            return string.Empty;
        }

        var sanitized = Sanitize(value);

        // If contains comma, newline, or quote, wrap in quotes and escape internal quotes
        if (sanitized.Contains(',') || sanitized.Contains('"') || sanitized.Contains('\n') || sanitized.Contains('\r'))
        {
            return "\"" + sanitized.Replace("\"", "\"\"") + "\"";
        }

        return sanitized;
    }

    /// <summary>
    /// Sanitizes a file name to remove or replace invalid characters.
    /// </summary>
    /// <param name="fileName">The file name to sanitize.</param>
    /// <returns>A safe file name.</returns>
    public static string SanitizeFileName(string fileName)
    {
        if (string.IsNullOrWhiteSpace(fileName))
        {
            return string.Empty;
        }

        var sanitized = fileName.Trim()
            .Replace('\\', '_')
            .Replace('/', '_')
            .Replace("..", "_");

        // Path.GetInvalidFileNameChars() is platform-dependent (Linux only returns \0 and /),
        // so explicitly include chars that are unsafe across all platforms.
        var invalidChars = Path.GetInvalidFileNameChars()
            .Union([':', '?', '*', '"', '<', '>', '|'])
            .ToHashSet();

        foreach (var invalidChar in invalidChars)
        {
            sanitized = sanitized.Replace(invalidChar, '_');
        }

        sanitized = CollapseRepeatedCharacter(sanitized, '_').Trim('_');
        return sanitized;
    }

    /// <summary>
    /// Sanitizes a remote path to prevent path traversal attacks.
    /// </summary>
    /// <param name="path">The path to sanitize.</param>
    /// <returns>A safe remote path.</returns>
    public static string SanitizeRemotePath(string path)
    {
        if (string.IsNullOrWhiteSpace(path))
        {
            return "/";
        }

        var normalized = path.Trim().Replace('\\', '/');

        var safeSegments = normalized
            .Split('/', StringSplitOptions.RemoveEmptyEntries)
            .Where(segment => segment != "." && segment != "..")
            .Select(segment => segment.Replace("..", string.Empty).Trim())
            .Where(segment => !string.IsNullOrWhiteSpace(segment))
            .ToList();

        return safeSegments.Count == 0
            ? "/"
            : "/" + string.Join("/", safeSegments);
    }

    private static string CollapseRepeatedCharacter(string value, char character)
    {
        if (string.IsNullOrEmpty(value))
        {
            return value;
        }

        Span<char> buffer = stackalloc char[value.Length];
        var writeIndex = 0;
        var previousWasTarget = false;

        foreach (var current in value)
        {
            var isTarget = current == character;
            if (isTarget && previousWasTarget)
            {
                continue;
            }

            buffer[writeIndex++] = current;
            previousWasTarget = isTarget;
        }

        return new string(buffer[..writeIndex]);
    }
}
