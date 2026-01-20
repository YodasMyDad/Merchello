namespace Merchello.Controllers.Dtos;

/// <summary>
/// Payment provider that supports payment links.
/// </summary>
public class PaymentLinkProviderDto
{
    /// <summary>
    /// Provider alias.
    /// </summary>
    public required string Alias { get; init; }

    /// <summary>
    /// Display name.
    /// </summary>
    public required string DisplayName { get; init; }

    /// <summary>
    /// Optional icon HTML/SVG.
    /// </summary>
    public string? IconHtml { get; init; }
}
