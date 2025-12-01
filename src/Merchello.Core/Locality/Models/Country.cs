using Microsoft.EntityFrameworkCore;

namespace Merchello.Core.Locality.Models;

[Owned]
public class Country
{
    public string? Name { get; set; }
    public string? CountryCode { get; set; }
    public List<CountyState> CountyStates { get; set; } = new();
}
