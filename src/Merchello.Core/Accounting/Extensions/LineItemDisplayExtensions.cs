using System.Text.Json;
using Merchello.Core.Accounting.Models;

namespace Merchello.Core.Accounting.Extensions;

/// <summary>
/// Extension methods for line item display formatting.
/// Provides centralized methods for formatting product names with options.
/// </summary>
public static class LineItemDisplayExtensions
{
    /// <summary>
    /// Gets the product root name from ExtendedData, falling back to the line item name.
    /// </summary>
    public static string GetProductRootName(this LineItem lineItem)
    {
        if (lineItem.ExtendedData.TryGetValue(Constants.ExtendedDataKeys.ProductRootName, out var value))
        {
            var rootName = value?.ToString();
            if (!string.IsNullOrWhiteSpace(rootName))
            {
                return rootName;
            }
        }

        // Fall back to the line item name for backward compatibility
        return lineItem.Name ?? "";
    }

    /// <summary>
    /// Gets the selected options from ExtendedData.
    /// </summary>
    public static List<SelectedOption> GetSelectedOptions(this LineItem lineItem)
    {
        if (!lineItem.ExtendedData.TryGetValue(Constants.ExtendedDataKeys.SelectedOptions, out var value))
        {
            return [];
        }

        try
        {
            // Handle both string JSON and JsonElement (from deserialization)
            string? json = value switch
            {
                string s => s,
                JsonElement je => je.GetString(),
                _ => value?.ToString()
            };

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

    /// <summary>
    /// Formats selected options as separate lines (e.g., "Color: Grey\nSize: S").
    /// </summary>
    public static string FormatOptionsMultiLine(this List<SelectedOption> options)
    {
        if (options.Count == 0)
        {
            return "";
        }

        return string.Join("\n", options.Select(o => $"{o.OptionName}: {o.ValueName}"));
    }

    /// <summary>
    /// Formats selected options as comma-separated (e.g., "Color: Grey, Size: S").
    /// </summary>
    public static string FormatOptionsCommaSeparated(this List<SelectedOption> options)
    {
        if (options.Count == 0)
        {
            return "";
        }

        return string.Join(", ", options.Select(o => $"{o.OptionName}: {o.ValueName}"));
    }

    /// <summary>
    /// Gets the full display name including root name and options (multi-line format).
    /// </summary>
    public static string GetFullDisplayName(this LineItem lineItem)
    {
        var rootName = lineItem.GetProductRootName();
        var options = lineItem.GetSelectedOptions();

        if (options.Count == 0)
        {
            return rootName;
        }

        return $"{rootName}\n{options.FormatOptionsMultiLine()}";
    }
}
