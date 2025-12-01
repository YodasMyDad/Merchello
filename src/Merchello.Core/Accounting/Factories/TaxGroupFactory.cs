using Merchello.Core.Accounting.Models;

namespace Merchello.Core.Accounting.Factories;

public class TaxGroupFactory
{
    public TaxGroup Create(string name, decimal taxPercentage)
    {
        return new TaxGroup
        {
            Name = name,
            TaxPercentage = taxPercentage
        };
    }
}
