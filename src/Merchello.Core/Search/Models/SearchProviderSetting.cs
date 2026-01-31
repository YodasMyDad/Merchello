using Merchello.Core.Shared.Extensions;

namespace Merchello.Core.Search.Models;

public class SearchProviderSetting
{
    public Guid Id { get; set; } = GuidExtensions.NewSequentialGuid;
    public string ProviderKey { get; set; } = string.Empty;
    public bool IsActive { get; set; }
    public string? SettingsJson { get; set; }
    public DateTime DateCreated { get; set; } = DateTime.UtcNow;
    public DateTime DateUpdated { get; set; } = DateTime.UtcNow;
}
