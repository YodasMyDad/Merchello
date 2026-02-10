namespace Merchello.Core.Email.Services;

internal sealed class ResolvedEmailFields
{
    public required string To { get; init; }
    public string? Cc { get; init; }
    public string? Bcc { get; init; }
    public required string From { get; init; }
    public required string Subject { get; init; }
}
