using System.Text;
using Merchello.Core.ProductSync.Models;
using Merchello.Core.ProductSync.Services.Interfaces;

namespace Merchello.Core.ProductSync.Services;

public class ShopifyCsvMapper : IShopifyCsvMapper
{
    public async Task<ProductSyncCsvDocument> ParseAsync(
        Stream csvStream,
        ProductSyncProfile profile,
        CancellationToken cancellationToken = default)
    {
        if (csvStream.CanSeek)
        {
            csvStream.Seek(0, SeekOrigin.Begin);
        }

        using var reader = new StreamReader(csvStream, Encoding.UTF8, detectEncodingFromByteOrderMarks: true, leaveOpen: true);
        var content = await reader.ReadToEndAsync();
        cancellationToken.ThrowIfCancellationRequested();

        var records = ParseRecords(content);
        if (records.Count == 0)
        {
            return new ProductSyncCsvDocument();
        }

        var headers = records[0]
            .Select(x => x.Trim())
            .ToList();

        var rows = new List<ProductSyncCsvRow>();
        for (var rowIndex = 1; rowIndex < records.Count; rowIndex++)
        {
            cancellationToken.ThrowIfCancellationRequested();

            var record = records[rowIndex];
            if (record.All(x => string.IsNullOrWhiteSpace(x)))
            {
                continue;
            }

            var values = new Dictionary<string, string?>(StringComparer.OrdinalIgnoreCase);
            for (var columnIndex = 0; columnIndex < headers.Count; columnIndex++)
            {
                var header = headers[columnIndex];
                var value = columnIndex < record.Count
                    ? record[columnIndex]
                    : null;

                values[header] = string.IsNullOrWhiteSpace(value) ? null : value.Trim();
            }

            // Row numbers are 1-based and include the header row.
            rows.Add(new ProductSyncCsvRow(rowIndex + 1, values));
        }

        return new ProductSyncCsvDocument
        {
            Headers = headers,
            Rows = rows
        };
    }

    public async Task WriteAsync(
        Stream destinationStream,
        ProductSyncProfile profile,
        IReadOnlyList<ProductSyncCsvRow> rows,
        CancellationToken cancellationToken = default)
    {
        var headers = profile == ProductSyncProfile.ShopifyStrict
            ? ShopifyCsvSchema.BaseExportHeaders.ToList()
            : ShopifyCsvSchema.ExtendedExportHeaders.ToList();

        var metaFieldHeaders = rows
            .SelectMany(x => x.Values.Keys)
            .Where(x => x.StartsWith("Metafield:", StringComparison.OrdinalIgnoreCase))
            .Distinct(StringComparer.OrdinalIgnoreCase)
            .OrderBy(x => x, StringComparer.OrdinalIgnoreCase)
            .ToList();

        foreach (var header in metaFieldHeaders)
        {
            if (!headers.Contains(header, StringComparer.OrdinalIgnoreCase))
            {
                headers.Add(header);
            }
        }

        using var writer = new StreamWriter(destinationStream, new UTF8Encoding(encoderShouldEmitUTF8Identifier: true), leaveOpen: true);
        await writer.WriteLineAsync(string.Join(",", headers.Select(EscapeCsvValue)));

        foreach (var row in rows)
        {
            cancellationToken.ThrowIfCancellationRequested();

            var values = headers
                .Select(header => row[header] ?? string.Empty)
                .Select(EscapeCsvValue);

            await writer.WriteLineAsync(string.Join(",", values));
        }

        await writer.FlushAsync();
    }

    private static List<List<string>> ParseRecords(string content)
    {
        List<List<string>> records = [];
        List<string> currentRecord = [];
        var fieldBuilder = new StringBuilder();
        var inQuotes = false;

        for (var i = 0; i < content.Length; i++)
        {
            var c = content[i];

            if (inQuotes)
            {
                if (c == '"')
                {
                    if (i + 1 < content.Length && content[i + 1] == '"')
                    {
                        fieldBuilder.Append('"');
                        i++;
                    }
                    else
                    {
                        inQuotes = false;
                    }
                }
                else
                {
                    if (c == '\r')
                    {
                        // Normalize quoted multiline fields to LF so behavior is platform-consistent.
                        fieldBuilder.Append('\n');
                        if (i + 1 < content.Length && content[i + 1] == '\n')
                        {
                            i++;
                        }
                    }
                    else
                    {
                        fieldBuilder.Append(c);
                    }
                }

                continue;
            }

            switch (c)
            {
                case '"':
                    inQuotes = true;
                    break;
                case ',':
                    currentRecord.Add(fieldBuilder.ToString());
                    fieldBuilder.Clear();
                    break;
                case '\r':
                    currentRecord.Add(fieldBuilder.ToString());
                    fieldBuilder.Clear();
                    records.Add(currentRecord);
                    currentRecord = [];
                    if (i + 1 < content.Length && content[i + 1] == '\n')
                    {
                        i++;
                    }
                    break;
                case '\n':
                    currentRecord.Add(fieldBuilder.ToString());
                    fieldBuilder.Clear();
                    records.Add(currentRecord);
                    currentRecord = [];
                    break;
                default:
                    fieldBuilder.Append(c);
                    break;
            }
        }

        // Final row
        if (inQuotes)
        {
            // Be permissive: keep content and close field at EOF.
            inQuotes = false;
        }

        if (fieldBuilder.Length > 0 || currentRecord.Count > 0)
        {
            currentRecord.Add(fieldBuilder.ToString());
            records.Add(currentRecord);
        }

        return records;
    }

    private static string EscapeCsvValue(string? value)
    {
        if (string.IsNullOrEmpty(value))
        {
            return string.Empty;
        }

        if (value.Contains(',') || value.Contains('"') || value.Contains('\n') || value.Contains('\r'))
        {
            return $"\"{value.Replace("\"", "\"\"")}\"";
        }

        return value;
    }
}
