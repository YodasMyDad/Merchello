using Merchello.Core.Accounting.Models;
using Merchello.Core.Accounting.Factories;

namespace Merchello.Core.Accounting.Extensions;

public static class TaxGroupExtensions
{
    /// <summary>
    /// Creates a new TaxGroup with default values
    /// </summary>
    public static TaxGroup CreateTaxGroup(this TaxGroupFactory factory, string name, decimal taxPercentage)
    {
        return factory.Create(name, taxPercentage);
    }

    /// <summary>
    /// Creates a UK VAT tax group with 20% rate
    /// </summary>
    public static TaxGroup CreateUkVatTaxGroup(this TaxGroupFactory factory)
    {
        return factory.CreateTaxGroup("UK Standard VAT", 20m);
    }

    /// <summary>
    /// Creates a US sales tax group with specified rate
    /// </summary>
    public static TaxGroup CreateUsSalesTaxGroup(this TaxGroupFactory factory, decimal taxPercentage, string? stateName = null)
    {
        var name = stateName != null ? $"{stateName} Sales Tax" : "US Sales Tax";
        return factory.CreateTaxGroup(name, taxPercentage);
    }

    /// <summary>
    /// Creates a EU VAT tax group with specified rate
    /// </summary>
    public static TaxGroup CreateEuVatTaxGroup(this TaxGroupFactory factory, string countryName, decimal taxPercentage)
    {
        return factory.CreateTaxGroup($"{countryName} VAT", taxPercentage);
    }
}
