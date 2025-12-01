using Microsoft.EntityFrameworkCore;

namespace Merchello.Core.Locality.Models;

[Owned]
public class CountyState
{
    public string? Name { get; set; }
    public string? RegionCode { get; set; }
}
