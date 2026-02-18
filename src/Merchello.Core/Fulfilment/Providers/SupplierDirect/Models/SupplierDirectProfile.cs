using System.Text.Json;
using Merchello.Core.Fulfilment.Providers.SupplierDirect.Csv;

namespace Merchello.Core.Fulfilment.Providers.SupplierDirect.Models;

/// <summary>
/// Supplier-level delivery profile for Supplier Direct fulfilment.
/// Stored in Supplier.ExtendedData["Fulfilment:SupplierDirect:Profile"].
/// </summary>
public record SupplierDirectProfile
{
    private static readonly JsonSerializerOptions JsonOptions = new()
    {
        PropertyNameCaseInsensitive = true,
        PropertyNamingPolicy = JsonNamingPolicy.CamelCase
    };

    /// <summary>
    /// Determines when orders should be submitted for this supplier.
    /// </summary>
    public SupplierDirectSubmissionTrigger SubmissionTrigger { get; init; } = SupplierDirectSubmissionTrigger.OnPaid;

    /// <summary>
    /// Delivery method for this supplier.
    /// </summary>
    public SupplierDirectDeliveryMethod DeliveryMethod { get; init; } = SupplierDirectDeliveryMethod.Email;

    /// <summary>
    /// Email-specific settings (when DeliveryMethod is Email).
    /// </summary>
    public EmailDeliverySettings? EmailSettings { get; init; }

    /// <summary>
    /// FTP/SFTP-specific settings (when DeliveryMethod is Ftp or Sftp).
    /// </summary>
    public FtpDeliverySettings? FtpSettings { get; init; }

    /// <summary>
    /// Optional CSV configuration for FTP/SFTP delivery.
    /// If omitted, default CSV mapping is used.
    /// </summary>
    public CsvColumnMapping? CsvSettings { get; init; }

    /// <summary>
    /// Parses a profile from JSON.
    /// </summary>
    public static SupplierDirectProfile? FromJson(string? json)
    {
        if (string.IsNullOrWhiteSpace(json))
        {
            return null;
        }

        try
        {
            return JsonSerializer.Deserialize<SupplierDirectProfile>(json, JsonOptions);
        }
        catch (JsonException)
        {
            return null;
        }
    }

    /// <summary>
    /// Serializes the profile to JSON.
    /// </summary>
    public string ToJson() => JsonSerializer.Serialize(this, JsonOptions);
}
