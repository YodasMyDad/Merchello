namespace Merchello.Core.Payments.Dtos;

/// <summary>
/// Checkout form field for DirectForm providers
/// </summary>
public class TestCheckoutFormFieldDto
{
    /// <summary>
    /// Field key
    /// </summary>
    public required string Key { get; set; }

    /// <summary>
    /// Field label
    /// </summary>
    public required string Label { get; set; }

    /// <summary>
    /// Field description
    /// </summary>
    public string? Description { get; set; }

    /// <summary>
    /// Field type
    /// </summary>
    public string FieldType { get; set; } = "Text";

    /// <summary>
    /// Whether the field is required
    /// </summary>
    public bool IsRequired { get; set; }
}
