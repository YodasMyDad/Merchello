using Merchello.Core.Shared.Extensions;

namespace Merchello.Core.Returns.Models;

public class ReturnReason
{
    public Guid Id { get; set; } = GuidExtensions.NewSequentialGuid;
    public string Name { get; set; } = string.Empty;
    public string? Description { get; set; }
    public bool RequiresCustomerComment { get; set; }
    public bool IsActive { get; set; } = true;
    public int SortOrder { get; set; }
    public DateTime DateCreated { get; set; } = DateTime.UtcNow;
}
