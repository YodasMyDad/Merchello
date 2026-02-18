namespace Merchello.Core.ProductFeeds.Dtos;

public class ProductFeedResolverDescriptorDto
{
    public string Alias { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public string DisplayName { get; set; } = string.Empty;
    public string? HelpText { get; set; }
    public bool SupportsArgs { get; set; }
    public string? ArgsHelpText { get; set; }
    public string? ArgsExampleJson { get; set; }
}
