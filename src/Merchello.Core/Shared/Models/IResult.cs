namespace Merchello.Core.Shared.Models;

/// <summary>
/// Common interface for result types that indicate success or failure.
/// </summary>
public interface IResult
{
    bool Success { get; }
}
