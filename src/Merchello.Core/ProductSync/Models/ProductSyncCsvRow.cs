namespace Merchello.Core.ProductSync.Models;

public class ProductSyncCsvRow
{
    private readonly Dictionary<string, string?> _values;

    public ProductSyncCsvRow(int rowNumber, Dictionary<string, string?> values)
    {
        RowNumber = rowNumber;
        _values = values;
    }

    public int RowNumber { get; }

    public string? this[string column]
    {
        get
        {
            return _values.TryGetValue(column, out var value)
                ? value
                : null;
        }
        set => _values[column] = value;
    }

    public IReadOnlyDictionary<string, string?> Values => _values;
}
