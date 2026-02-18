namespace Merchello.Core.ProductFeeds.Services.Interfaces;

/// <summary>
/// Optional UI metadata contract for feed resolvers.
/// Implement this on resolvers that need richer backoffice presentation.
/// </summary>
public interface IProductFeedResolverMetadata
{
    string DisplayName { get; }
    string? HelpText { get; }
    bool SupportsArgs { get; }
    string? ArgsHelpText { get; }
    string? ArgsExampleJson { get; }
}
