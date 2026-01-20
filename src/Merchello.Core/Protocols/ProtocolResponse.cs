namespace Merchello.Core.Protocols;

/// <summary>
/// Standard response from protocol adapter operations.
/// </summary>
public class ProtocolResponse
{
    public required bool Success { get; init; }
    public required int StatusCode { get; init; }
    public object? Data { get; init; }
    public ProtocolError? Error { get; init; }

    public static ProtocolResponse Ok(object data) => new()
    {
        Success = true,
        StatusCode = 200,
        Data = data
    };

    public static ProtocolResponse Created(object data) => new()
    {
        Success = true,
        StatusCode = 201,
        Data = data
    };

    public static ProtocolResponse NotFound(string message) => new()
    {
        Success = false,
        StatusCode = 404,
        Error = new ProtocolError { Code = "not_found", Message = message }
    };

    public static ProtocolResponse BadRequest(string message, string? code = null) => new()
    {
        Success = false,
        StatusCode = 400,
        Error = new ProtocolError { Code = code ?? "bad_request", Message = message }
    };

    public static ProtocolResponse Unauthorized(string message) => new()
    {
        Success = false,
        StatusCode = 401,
        Error = new ProtocolError { Code = "unauthorized", Message = message }
    };

    public static ProtocolResponse Conflict(string message) => new()
    {
        Success = false,
        StatusCode = 409,
        Error = new ProtocolError { Code = "conflict", Message = message }
    };

    /// <summary>
    /// Returns version_unsupported error per UCP spec when platform version > business version.
    /// </summary>
    public static ProtocolResponse VersionUnsupported(string requestedVersion, string supportedVersion) => new()
    {
        Success = false,
        StatusCode = 400,
        Error = new ProtocolError
        {
            Code = "version_unsupported",
            Message = $"Protocol version '{requestedVersion}' is not supported. Maximum supported version: '{supportedVersion}'."
        }
    };
}
