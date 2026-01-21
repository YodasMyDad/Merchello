using System.Globalization;
using System.Text;

namespace Merchello.Core.Email.Attachments;

/// <summary>
/// Helper for generating CSV content for email attachments.
/// </summary>
public static class CsvAttachmentHelper
{
    /// <summary>
    /// Generates a CSV file as bytes from headers and rows.
    /// </summary>
    /// <param name="headers">Column headers.</param>
    /// <param name="rows">Data rows (each row is an array of cell values).</param>
    /// <returns>UTF-8 encoded CSV content with BOM.</returns>
    public static byte[] GenerateCsv(IEnumerable<string> headers, IEnumerable<string[]> rows)
    {
        var sb = new StringBuilder();

        // Write headers
        sb.AppendLine(string.Join(",", headers.Select(EscapeCsvField)));

        // Write rows
        foreach (var row in rows)
        {
            sb.AppendLine(string.Join(",", row.Select(EscapeCsvField)));
        }

        // Return with UTF-8 BOM for Excel compatibility
        var preamble = Encoding.UTF8.GetPreamble();
        var content = Encoding.UTF8.GetBytes(sb.ToString());

        var result = new byte[preamble.Length + content.Length];
        preamble.CopyTo(result, 0);
        content.CopyTo(result, preamble.Length);

        return result;
    }

    /// <summary>
    /// Escapes a field value for CSV (handles quotes, commas, newlines).
    /// </summary>
    private static string EscapeCsvField(string? value)
    {
        if (string.IsNullOrEmpty(value))
            return string.Empty;

        // If the value contains special characters, wrap in quotes and escape existing quotes
        if (value.Contains(',') || value.Contains('"') || value.Contains('\n') || value.Contains('\r'))
        {
            return $"\"{value.Replace("\"", "\"\"")}\"";
        }

        return value;
    }

    /// <summary>
    /// Formats a decimal as currency for CSV.
    /// </summary>
    public static string FormatCurrency(decimal value, string currencySymbol = "$")
    {
        return $"{currencySymbol}{value.ToString("N2", CultureInfo.InvariantCulture)}";
    }

    /// <summary>
    /// Formats a decimal as a number for CSV.
    /// </summary>
    public static string FormatNumber(decimal value, int decimals = 2)
    {
        return value.ToString($"N{decimals}", CultureInfo.InvariantCulture);
    }

    /// <summary>
    /// Formats a date for CSV.
    /// </summary>
    public static string FormatDate(DateTime date, string format = "yyyy-MM-dd")
    {
        return date.ToString(format, CultureInfo.InvariantCulture);
    }

    /// <summary>
    /// Formats a date/time for CSV.
    /// </summary>
    public static string FormatDateTime(DateTime dateTime, string format = "yyyy-MM-dd HH:mm:ss")
    {
        return dateTime.ToString(format, CultureInfo.InvariantCulture);
    }
}
