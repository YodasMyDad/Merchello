using System.Collections.Generic;
using Merchello.Core.Payments.Providers;

namespace Merchello.Core.Payments.Models;

/// <summary>
/// Defines a form field to be rendered at checkout for DirectForm payment providers.
/// </summary>
public class CheckoutFormField
{
    /// <summary>
    /// Unique key for this field (used in form data dictionary).
    /// </summary>
    public required string Key { get; init; }

    /// <summary>
    /// Display label for the field.
    /// </summary>
    public required string Label { get; init; }

    /// <summary>
    /// Optional description/help text for the field.
    /// </summary>
    public string? Description { get; init; }

    /// <summary>
    /// The type of input field to render.
    /// </summary>
    public required CheckoutFieldType FieldType { get; init; }

    /// <summary>
    /// Whether this field is required.
    /// </summary>
    public bool IsRequired { get; init; } = true;

    /// <summary>
    /// Default value for the field.
    /// </summary>
    public string? DefaultValue { get; init; }

    /// <summary>
    /// Placeholder text for text inputs.
    /// </summary>
    public string? Placeholder { get; init; }

    /// <summary>
    /// Regex pattern for client-side validation.
    /// </summary>
    public string? ValidationPattern { get; init; }

    /// <summary>
    /// Error message to show when validation fails.
    /// </summary>
    public string? ValidationMessage { get; init; }

    /// <summary>
    /// Options for Select field type.
    /// </summary>
    public IEnumerable<SelectOption>? Options { get; init; }
}
