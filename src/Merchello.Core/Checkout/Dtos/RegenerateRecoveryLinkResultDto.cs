namespace Merchello.Core.Checkout.Dtos;

/// <summary>
/// Result DTO for regenerate recovery link endpoint.
/// </summary>
public class RegenerateRecoveryLinkResultDto
{
    public string RecoveryLink { get; set; } = string.Empty;
}
