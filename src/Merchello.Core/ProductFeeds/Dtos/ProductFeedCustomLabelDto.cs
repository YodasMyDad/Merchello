namespace Merchello.Core.ProductFeeds.Dtos;

public class ProductFeedCustomLabelDto
{
    public int Slot { get; set; }
    public string SourceType { get; set; } = "static";
    public string? StaticValue { get; set; }
    public string? ResolverAlias { get; set; }
    public Dictionary<string, string> Args { get; set; } = [];
}