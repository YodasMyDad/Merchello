namespace Merchello.Core.Caching.Models;

public class CacheOptions
{
    // Default TTL for entries, in seconds
    public int DefaultTtlSeconds { get; set; } = 300;

    // TTL for locality regions lists, in seconds
    public int LocalityRegionsTtlSeconds { get; set; } = 900;
}

