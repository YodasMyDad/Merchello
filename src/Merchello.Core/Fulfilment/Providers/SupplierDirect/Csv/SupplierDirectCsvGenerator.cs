using System.Text;
using Merchello.Core.Fulfilment.Models;
using Merchello.Core.Shared.Extensions;

namespace Merchello.Core.Fulfilment.Providers.SupplierDirect.Csv;

/// <summary>
/// Generates CSV content for supplier order submissions.
/// Includes security measures against formula injection.
/// </summary>
public sealed class SupplierDirectCsvGenerator
{
    /// <summary>
    /// UTF-8 BOM bytes for Excel compatibility.
    /// </summary>
    private static readonly byte[] Utf8Bom = [0xEF, 0xBB, 0xBF];

    /// <summary>
    /// Generates CSV content from a fulfilment order request.
    /// </summary>
    /// <param name="request">The order request to convert to CSV.</param>
    /// <param name="mapping">Optional column mapping. Uses default if not provided.</param>
    /// <returns>UTF-8 encoded CSV content with BOM.</returns>
    public byte[] Generate(FulfilmentOrderRequest request, CsvColumnMapping? mapping = null)
    {
        mapping ??= CsvColumnMapping.Default;

        using var memoryStream = new MemoryStream();

        // Write UTF-8 BOM for Excel compatibility
        memoryStream.Write(Utf8Bom, 0, Utf8Bom.Length);

        using var writer = new StreamWriter(memoryStream, Encoding.UTF8, leaveOpen: true);

        // Write header row
        WriteHeaderRow(writer, mapping);

        // Write data rows (one per line item)
        foreach (var lineItem in request.LineItems)
        {
            WriteDataRow(writer, request, lineItem, mapping);
        }

        writer.Flush();
        return memoryStream.ToArray();
    }

    /// <summary>
    /// Generates a deterministic file name for idempotency.
    /// Format: {OrderNumber}-{OrderId:N}.csv
    /// </summary>
    /// <param name="request">The order request.</param>
    /// <returns>A safe, deterministic file name.</returns>
    public static string GenerateFileName(FulfilmentOrderRequest request)
    {
        var safeOrderNumber = CsvSanitizer.SanitizeFileName(request.OrderNumber);
        var orderId = request.OrderId.ToString("N");
        return $"{safeOrderNumber}-{orderId}.csv";
    }

    /// <summary>
    /// Generates the full remote path including file name.
    /// </summary>
    /// <param name="remotePath">Base remote path.</param>
    /// <param name="request">The order request.</param>
    /// <returns>Full remote path with file name.</returns>
    public static string GenerateRemotePath(string remotePath, FulfilmentOrderRequest request)
    {
        var sanitizedPath = CsvSanitizer.SanitizeRemotePath(remotePath);
        var fileName = GenerateFileName(request);

        // Ensure proper path separator
        if (!sanitizedPath.EndsWith('/'))
        {
            sanitizedPath += '/';
        }

        return sanitizedPath + fileName;
    }

    private static void WriteHeaderRow(StreamWriter writer, CsvColumnMapping mapping)
    {
        var headers = mapping.Columns.Values.Concat(mapping.StaticColumns.Keys);
        writer.WriteLine(string.Join(",", headers.Select(CsvSanitizer.EscapeCsvField)));
    }

    private static void WriteDataRow(
        StreamWriter writer,
        FulfilmentOrderRequest request,
        FulfilmentLineItem lineItem,
        CsvColumnMapping mapping)
    {
        var values = new List<string>();

        // Add mapped column values
        foreach (var (fieldName, _) in mapping.Columns)
        {
            var value = GetFieldValue(fieldName, request, lineItem);
            values.Add(CsvSanitizer.EscapeCsvField(value));
        }

        // Add static column values
        foreach (var (_, staticValue) in mapping.StaticColumns)
        {
            values.Add(CsvSanitizer.EscapeCsvField(staticValue));
        }

        writer.WriteLine(string.Join(",", values));
    }

    private static string GetFieldValue(
        string fieldName,
        FulfilmentOrderRequest request,
        FulfilmentLineItem lineItem)
    {
        return fieldName switch
        {
            // Order fields
            "OrderNumber" => request.OrderNumber,
            "CustomerEmail" => request.CustomerEmail ?? "",
            "CustomerPhone" => request.CustomerPhone ?? "",
            "RequestedDeliveryDate" => request.RequestedDeliveryDate?.ToString("yyyy-MM-dd") ?? "",
            "InternalNotes" => request.InternalNotes ?? "",
            "ShippingServiceCode" => request.ShippingServiceCode ?? "",

            // Line item fields
            "Sku" => lineItem.Sku,
            "ProductName" => lineItem.Name,
            "Quantity" => lineItem.Quantity.ToString(),
            "UnitPrice" => lineItem.UnitPrice.ToString("F2"),
            "Weight" => lineItem.Weight?.ToString("F2") ?? "",
            "Barcode" => lineItem.Barcode ?? "",

            // Shipping address fields
            "RecipientName" => request.ShippingAddress.Name ?? "",
            "Company" => request.ShippingAddress.Company ?? "",
            "AddressOne" => request.ShippingAddress.AddressOne,
            "AddressTwo" => request.ShippingAddress.AddressTwo ?? "",
            "TownCity" => request.ShippingAddress.TownCity,
            "CountyState" => request.ShippingAddress.CountyState ?? "",
            "PostalCode" => request.ShippingAddress.PostalCode,
            "CountryCode" => request.ShippingAddress.CountryCode,
            "Phone" => request.ShippingAddress.Phone ?? "",

            // Look for custom fields in extended data
            _ => GetExtendedDataValue(fieldName, request, lineItem)
        };
    }

    private static string GetExtendedDataValue(
        string fieldName,
        FulfilmentOrderRequest request,
        FulfilmentLineItem lineItem)
    {
        // Check line item extended data first
        if (lineItem.ExtendedData.TryGetValue(fieldName, out var lineItemValue))
        {
            return lineItemValue?.UnwrapJsonElement()?.ToString() ?? "";
        }

        // Then check order extended data
        if (request.ExtendedData.TryGetValue(fieldName, out var orderValue))
        {
            return orderValue?.UnwrapJsonElement()?.ToString() ?? "";
        }

        return "";
    }
}
