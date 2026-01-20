namespace Merchello.Core.Payments.Models;

/// <summary>
/// Field types available for checkout form fields.
/// </summary>
public enum CheckoutFieldType
{
    /// <summary>
    /// Single-line text input.
    /// </summary>
    Text,

    /// <summary>
    /// Multi-line text input.
    /// </summary>
    Textarea,

    /// <summary>
    /// Dropdown select.
    /// </summary>
    Select,

    /// <summary>
    /// Date picker.
    /// </summary>
    Date,

    /// <summary>
    /// Email input with validation.
    /// </summary>
    Email,

    /// <summary>
    /// Phone number input.
    /// </summary>
    Phone
}
