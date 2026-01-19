namespace Merchello.Core.Protocols.Authentication;

/// <summary>
/// Result of authenticating an external agent.
/// </summary>
public class AgentAuthenticationResult
{
    public required bool IsAuthenticated { get; init; }
    public AgentIdentity? Identity { get; init; }
    public string? ErrorMessage { get; init; }
    public string? ErrorCode { get; init; }

    public static AgentAuthenticationResult Success(AgentIdentity identity) => new()
    {
        IsAuthenticated = true,
        Identity = identity
    };

    public static AgentAuthenticationResult Failure(string message, string? code = null) => new()
    {
        IsAuthenticated = false,
        ErrorMessage = message,
        ErrorCode = code
    };

    public static AgentAuthenticationResult Anonymous() => new()
    {
        IsAuthenticated = false
    };
}
