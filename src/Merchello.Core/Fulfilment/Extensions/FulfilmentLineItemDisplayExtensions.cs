using System.Text.Json;
using Merchello.Core.Accounting.Extensions;
using Merchello.Core.Accounting.Models;
using Merchello.Core.Fulfilment.Models;
using Merchello.Core.Shared.Extensions;

namespace Merchello.Core.Fulfilment.Extensions;

/// <summary>
/// Extension methods for formatting fulfilment line items with product root name and options.
/// Mirrors <see cref="LineItemDisplayExtensions"/> but operates on <see cref="FulfilmentLineItem"/>.
/// </summary>
public static class FulfilmentLineItemDisplayExtensions
{
    /// <summary>
    /// Gets the product root name from ExtendedData, falling back to the line item name.
    /// </summary>
    public static string GetProductRootName(this FulfilmentLineItem lineItem)
    {
        if (lineItem.ExtendedData.TryGetValue(Constants.ExtendedDataKeys.ProductRootName, out var value))
        {
            var rootName = value?.UnwrapJsonElement()?.ToString();
            if (!string.IsNullOrWhiteSpace(rootName))
            {
                return rootName;
            }
        }

        return lineItem.Name;
    }

    /// <summary>
    /// Gets the selected options from ExtendedData.
    /// </summary>
    public static List<SelectedOption> GetSelectedOptions(this FulfilmentLineItem lineItem)
    {
        if (!lineItem.ExtendedData.TryGetValue(Constants.ExtendedDataKeys.SelectedOptions, out var value))
        {
            return [];
        }

        try
        {
            var json = value.UnwrapJsonElement()?.ToString();

            if (string.IsNullOrWhiteSpace(json))
            {
                return [];
            }

            return JsonSerializer.Deserialize<List<SelectedOption>>(json) ?? [];
        }
        catch
        {
            return [];
        }
    }
}
