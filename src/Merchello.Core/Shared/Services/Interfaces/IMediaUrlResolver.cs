namespace Merchello.Core.Shared.Services.Interfaces;

/// <summary>
/// Resolves Umbraco media keys to public URLs.
/// </summary>
public interface IMediaUrlResolver
{
    string? ResolveMediaUrl(Guid? mediaKey);

    string? ResolveMediaUrl(string? mediaKey);
}
