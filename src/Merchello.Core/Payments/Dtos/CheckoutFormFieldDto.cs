namespace Merchello.Core.Payments.Dtos;

/// <summary>
/// Checkout form field definition
/// </summary>
public class CheckoutFormFieldDto
{
    public required string Key { get; set; }
    public required string Label { get; set; }
    public string? Description { get; set; }
    public required string FieldType { get; set; }
    public bool IsRequired { get; set; }
    public string? DefaultValue { get; set; }
    public string? Placeholder { get; set; }
    public string? ValidationPattern { get; set; }
    public string? ValidationMessage { get; set; }
    public List<SelectOptionDto>? Options { get; set; }
}
