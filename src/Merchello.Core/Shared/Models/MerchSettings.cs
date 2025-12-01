namespace Merchello.Core.Shared.Models;

public class MerchSettings
{
    public Guid? WebsiteId { get; set; }
    public Guid? RepositoryId { get; set; }
    public string? DatabaseProvider { get; set; }
    public string? ConnectionString { get; set; }
}
