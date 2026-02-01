namespace Merchello.Core.Checkout.Models;

/// <summary>
/// Configuration for order terms and conditions displayed above the place order button.
/// Supports template syntax {key:Label} for links that open a side-pane modal rendering a Razor view.
/// </summary>
public class OrderTermsSettings
{
    /// <summary>
    /// Whether to show an agreement checkbox.
    /// </summary>
    public bool ShowCheckbox { get; set; }

    /// <summary>
    /// Checkbox label text. Supports {key:Label} link tokens.
    /// Example: "I agree to the {terms:Terms &amp; Conditions} and {privacy:Privacy Policy}"
    /// </summary>
    public string? CheckboxText { get; set; }

    /// <summary>
    /// Whether the checkbox must be checked to submit the order.
    /// </summary>
    public bool CheckboxRequired { get; set; }
}
