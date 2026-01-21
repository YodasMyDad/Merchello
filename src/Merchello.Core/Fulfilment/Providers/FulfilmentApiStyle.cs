namespace Merchello.Core.Fulfilment.Providers;

/// <summary>
/// API communication style used by a fulfilment provider.
/// </summary>
public enum FulfilmentApiStyle
{
    /// <summary>
    /// REST API
    /// </summary>
    Rest = 0,

    /// <summary>
    /// GraphQL API
    /// </summary>
    GraphQL = 1,

    /// <summary>
    /// SFTP file-based integration
    /// </summary>
    Sftp = 2
}
