using System.Text.Json.Serialization;
using Merchello.Core.Shared.Dtos;
using Merchello.Core.Shared.Providers;

namespace Merchello.Core.Payments.Dtos;

/// <summary>
/// Checkout form field definition
/// </summary>
public class CheckoutFormFieldDto
{
    [JsonPropertyName("key")]
    public required string Key { get; set; }

    [JsonPropertyName("label")]
    public required string Label { get; set; }

    [JsonPropertyName("description")]
    public string? Description { get; set; }

    [JsonPropertyName("fieldType")]
    public required string FieldType { get; set; }

    [JsonPropertyName("isRequired")]
    public bool IsRequired { get; set; }

    [JsonPropertyName("defaultValue")]
    public string? DefaultValue { get; set; }

    [JsonPropertyName("placeholder")]
    public string? Placeholder { get; set; }

    [JsonPropertyName("validationPattern")]
    public string? ValidationPattern { get; set; }

    [JsonPropertyName("validationMessage")]
    public string? ValidationMessage { get; set; }

    [JsonPropertyName("options")]
    public List<SelectOptionDto>? Options { get; set; }
}
