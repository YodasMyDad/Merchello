namespace Merchello.Core.Email.Interfaces;

/// <summary>
/// Non-generic base interface for ExtensionManager discovery.
/// </summary>
public interface IEmailAttachment
{
    /// <summary>
    /// Globally unique identifier for this attachment type (e.g., "order-invoice-pdf").
    /// Must be lowercase-kebab-case format.
    /// </summary>
    string Alias { get; }

    /// <summary>
    /// Display name shown in backoffice dropdown.
    /// </summary>
    string DisplayName { get; }

    /// <summary>
    /// Optional description for the UI.
    /// </summary>
    string? Description { get; }

    /// <summary>
    /// Optional inline SVG for visual differentiation in the UI.
    /// If null, a default document icon is shown.
    /// </summary>
    string? IconSvg { get; }

    /// <summary>
    /// The notification type this attachment supports.
    /// Used for filtering in the UI based on selected topic.
    /// </summary>
    Type NotificationType { get; }
}
