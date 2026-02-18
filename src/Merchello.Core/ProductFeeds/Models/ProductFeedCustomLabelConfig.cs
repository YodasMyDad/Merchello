namespace Merchello.Core.ProductFeeds.Models;

public class ProductFeedCustomLabelConfig
{
    public int Slot { get; set; }
    public string SourceType { get; set; } = "static";
    public string? StaticValue { get; set; }
    public string? ResolverAlias { get; set; }
    public Dictionary<string, string> Args { get; set; } = [];
}