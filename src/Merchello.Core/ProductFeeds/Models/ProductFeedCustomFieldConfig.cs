namespace Merchello.Core.ProductFeeds.Models;

public class ProductFeedCustomFieldConfig
{
    public string Attribute { get; set; } = string.Empty;
    public string SourceType { get; set; } = "static";
    public string? StaticValue { get; set; }
    public string? ResolverAlias { get; set; }
    public Dictionary<string, string> Args { get; set; } = [];
}