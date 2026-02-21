using System.Globalization;
using System.Text.Json;
using Merchello.Core.ProductSync.Models;
using Merchello.Core.ProductSync.Services.Interfaces;
using Merchello.Core.Shared.Security;

namespace Merchello.Core.ProductSync.Services;

public class ShopifyCsvImportValidator : IShopifyCsvImportValidator
{
    public Task<ProductSyncValidationResult> ValidateAsync(
        ProductSyncCsvDocument document,
        ProductSyncProfile profile,
        int maxIssues,
        CancellationToken cancellationToken = default)
    {
        var issues = new List<ProductSyncIssue>();
        maxIssues = Math.Max(1, maxIssues);

        foreach (var header in document.Headers)
        {
            cancellationToken.ThrowIfCancellationRequested();

            if (!ShopifyCsvSchema.IsAllowedColumn(profile, header))
            {
                AddIssue(issues, maxIssues, ProductSyncIssueSeverity.Error, ProductSyncStage.Validation, "unsupported_column",
                    $"Column '{header}' is not supported for profile '{profile}'.", field: header);
            }
        }

        if (document.Rows.Count == 0)
        {
            AddIssue(issues, maxIssues, ProductSyncIssueSeverity.Error, ProductSyncStage.Validation, "empty_file",
                "The file does not contain any product rows.");
            return Task.FromResult(new ProductSyncValidationResult
            {
                RowCount = 0,
                DistinctHandleCount = 0,
                Issues = issues
            });
        }

        var optionNamesByHandle = BuildOptionNameLookup(document.Rows);
        var seenHandles = new HashSet<string>(StringComparer.OrdinalIgnoreCase);

        foreach (var row in document.Rows)
        {
            cancellationToken.ThrowIfCancellationRequested();

            var handle = Normalize(row[ShopifyCsvSchema.Handle]);
            if (string.IsNullOrWhiteSpace(handle))
            {
                AddIssue(issues, maxIssues, ProductSyncIssueSeverity.Error, ProductSyncStage.Validation, "missing_handle",
                    "Handle is required.", row.RowNumber, field: ShopifyCsvSchema.Handle);
                continue;
            }

            var isFirstHandleRow = seenHandles.Add(handle);
            if (isFirstHandleRow && string.IsNullOrWhiteSpace(Normalize(row[ShopifyCsvSchema.Title])))
            {
                AddIssue(issues, maxIssues, ProductSyncIssueSeverity.Warning, ProductSyncStage.Validation, "missing_title",
                    "Title is empty on the first row for this handle.", row.RowNumber, handle: handle, field: ShopifyCsvSchema.Title);
            }

            optionNamesByHandle.TryGetValue(handle, out var handleOptionNames);
            ValidateOptionPair(issues, maxIssues, row, handle, ShopifyCsvSchema.Option1Name, ShopifyCsvSchema.Option1Value, optionIndex: 1, handleOptionNames);
            ValidateOptionPair(issues, maxIssues, row, handle, ShopifyCsvSchema.Option2Name, ShopifyCsvSchema.Option2Value, optionIndex: 2, handleOptionNames);
            ValidateOptionPair(issues, maxIssues, row, handle, ShopifyCsvSchema.Option3Name, ShopifyCsvSchema.Option3Value, optionIndex: 3, handleOptionNames);

            ValidateDecimal(issues, maxIssues, row, handle, ShopifyCsvSchema.VariantPrice);
            ValidateDecimal(issues, maxIssues, row, handle, ShopifyCsvSchema.VariantCompareAtPrice);
            ValidateDecimal(issues, maxIssues, row, handle, ShopifyCsvSchema.CostPerItem);

            ValidatePublished(issues, maxIssues, row, handle);
            ValidateImageUrl(issues, maxIssues, row, handle, ShopifyCsvSchema.ImageSrc);
            ValidateImageUrl(issues, maxIssues, row, handle, ShopifyCsvSchema.VariantImage);

            if (!string.IsNullOrWhiteSpace(Normalize(row[ShopifyCsvSchema.Collection])))
            {
                AddIssue(issues, maxIssues, ProductSyncIssueSeverity.Warning, ProductSyncStage.Validation, "collection_ignored",
                    "Collection values are ignored by this importer.", row.RowNumber, handle: handle, field: ShopifyCsvSchema.Collection);
            }

            if (!string.IsNullOrWhiteSpace(Normalize(row[ShopifyCsvSchema.Status])))
            {
                AddIssue(issues, maxIssues, ProductSyncIssueSeverity.Warning, ProductSyncStage.Validation, "status_ignored",
                    "Status is ignored on import. Published is used instead.", row.RowNumber, handle: handle, field: ShopifyCsvSchema.Status);
            }

            if (!string.IsNullOrWhiteSpace(Normalize(row[ShopifyCsvSchema.VariantInventoryQty])))
            {
                AddIssue(issues, maxIssues, ProductSyncIssueSeverity.Warning, ProductSyncStage.Validation, "inventory_qty_ignored",
                    "Variant Inventory Qty is ignored because imports do not assign warehouses.", row.RowNumber, handle: handle, field: ShopifyCsvSchema.VariantInventoryQty);
            }

            if (profile == ProductSyncProfile.MerchelloExtended)
            {
                ValidateJson(issues, maxIssues, row, handle, ShopifyCsvSchema.ExtendedAddonOptionsJson);
                ValidateJson(issues, maxIssues, row, handle, ShopifyCsvSchema.ExtendedOptionTypeMapJson);
                ValidateJson(issues, maxIssues, row, handle, ShopifyCsvSchema.ExtendedRootExtendedDataJson);
                ValidateJson(issues, maxIssues, row, handle, ShopifyCsvSchema.ExtendedVariantExtendedDataJson);
            }
        }

        return Task.FromResult(new ProductSyncValidationResult
        {
            RowCount = document.Rows.Count,
            DistinctHandleCount = document.Rows
                .Select(x => Normalize(x[ShopifyCsvSchema.Handle]))
                .Where(x => !string.IsNullOrWhiteSpace(x))
                .Distinct(StringComparer.OrdinalIgnoreCase)
                .Count(),
            Issues = issues
        });
    }

    private static void ValidateOptionPair(
        List<ProductSyncIssue> issues,
        int maxIssues,
        ProductSyncCsvRow row,
        string handle,
        string optionNameColumn,
        string optionValueColumn,
        int optionIndex,
        string?[]? handleOptionNames)
    {
        var optionName = Normalize(row[optionNameColumn]);
        var optionValue = Normalize(row[optionValueColumn]);

        if (string.IsNullOrWhiteSpace(optionValue))
        {
            return;
        }

        var effectiveOptionName = optionName;
        if (string.IsNullOrWhiteSpace(effectiveOptionName) &&
            handleOptionNames != null &&
            optionIndex >= 1 &&
            optionIndex <= handleOptionNames.Length)
        {
            effectiveOptionName = handleOptionNames[optionIndex - 1];
        }

        if (string.IsNullOrWhiteSpace(effectiveOptionName) &&
            optionIndex == 1 &&
            IsLegacyDefaultOptionValue(optionValue))
        {
            return;
        }

        if (string.IsNullOrWhiteSpace(effectiveOptionName))
        {
            AddIssue(issues, maxIssues, ProductSyncIssueSeverity.Error, ProductSyncStage.Validation, "missing_option_name",
                $"{optionNameColumn} is required when {optionValueColumn} is provided.",
                row.RowNumber,
                handle: handle,
                field: optionNameColumn);
        }
    }

    private static Dictionary<string, string?[]> BuildOptionNameLookup(IReadOnlyList<ProductSyncCsvRow> rows)
    {
        var lookup = new Dictionary<string, string?[]>(StringComparer.OrdinalIgnoreCase);
        foreach (var row in rows)
        {
            var handle = Normalize(row[ShopifyCsvSchema.Handle]);
            if (string.IsNullOrWhiteSpace(handle))
            {
                continue;
            }

            if (!lookup.TryGetValue(handle, out var names))
            {
                names = new string?[3];
                lookup[handle] = names;
            }

            for (var optionIndex = 1; optionIndex <= 3; optionIndex++)
            {
                if (!string.IsNullOrWhiteSpace(names[optionIndex - 1]))
                {
                    continue;
                }

                var optionName = Normalize(row[$"Option{optionIndex} Name"]);
                if (!string.IsNullOrWhiteSpace(optionName))
                {
                    names[optionIndex - 1] = optionName;
                }
            }
        }

        return lookup;
    }

    private static bool IsLegacyDefaultOptionValue(string optionValue) =>
        optionValue.Equals("Default", StringComparison.OrdinalIgnoreCase) ||
        optionValue.Equals("Default Title", StringComparison.OrdinalIgnoreCase);

    private static void ValidateDecimal(
        List<ProductSyncIssue> issues,
        int maxIssues,
        ProductSyncCsvRow row,
        string handle,
        string column)
    {
        var value = Normalize(row[column]);
        if (string.IsNullOrWhiteSpace(value))
        {
            return;
        }

        if (!decimal.TryParse(value, NumberStyles.Number, CultureInfo.InvariantCulture, out _))
        {
            AddIssue(issues, maxIssues, ProductSyncIssueSeverity.Error, ProductSyncStage.Validation, "invalid_decimal",
                $"Column '{column}' value '{value}' is not a valid decimal.",
                row.RowNumber,
                handle: handle,
                field: column);
        }
    }

    private static void ValidatePublished(
        List<ProductSyncIssue> issues,
        int maxIssues,
        ProductSyncCsvRow row,
        string handle)
    {
        var value = Normalize(row[ShopifyCsvSchema.Published]);
        if (string.IsNullOrWhiteSpace(value))
        {
            return;
        }

        if (value is "TRUE" or "FALSE")
        {
            return;
        }

        if (bool.TryParse(value, out _))
        {
            return;
        }

        if (value is "1" or "0")
        {
            return;
        }

        AddIssue(issues, maxIssues, ProductSyncIssueSeverity.Error, ProductSyncStage.Validation, "invalid_published",
            $"Published value '{value}' is invalid. Use TRUE or FALSE.",
            row.RowNumber,
            handle: handle,
            field: ShopifyCsvSchema.Published);
    }

    private static void ValidateImageUrl(
        List<ProductSyncIssue> issues,
        int maxIssues,
        ProductSyncCsvRow row,
        string handle,
        string column)
    {
        var value = Normalize(row[column]);
        if (string.IsNullOrWhiteSpace(value))
        {
            return;
        }

        if (UrlSecurityValidator.TryValidatePublicHttpUrl(value, requireHttps: false, out _, out var error))
        {
            return;
        }

        AddIssue(issues, maxIssues, ProductSyncIssueSeverity.Error, ProductSyncStage.Validation, "invalid_image_url",
            $"Column '{column}' URL '{value}' is invalid: {error}",
            row.RowNumber,
            handle: handle,
            field: column);
    }

    private static void ValidateJson(
        List<ProductSyncIssue> issues,
        int maxIssues,
        ProductSyncCsvRow row,
        string handle,
        string column)
    {
        var value = Normalize(row[column]);
        if (string.IsNullOrWhiteSpace(value))
        {
            return;
        }

        try
        {
            using var _ = JsonDocument.Parse(value);
        }
        catch (JsonException)
        {
            AddIssue(issues, maxIssues, ProductSyncIssueSeverity.Error, ProductSyncStage.Validation, "invalid_json",
                $"Column '{column}' contains invalid JSON.",
                row.RowNumber,
                handle: handle,
                field: column);
        }
    }

    private static string? Normalize(string? value)
        => string.IsNullOrWhiteSpace(value) ? null : value.Trim();

    private static void AddIssue(
        List<ProductSyncIssue> issues,
        int maxIssues,
        ProductSyncIssueSeverity severity,
        ProductSyncStage stage,
        string code,
        string message,
        int? rowNumber = null,
        string? handle = null,
        string? sku = null,
        string? field = null)
    {
        if (issues.Count >= maxIssues)
        {
            return;
        }

        issues.Add(new ProductSyncIssue
        {
            RunId = Guid.Empty,
            Severity = severity,
            Stage = stage,
            Code = code,
            Message = message,
            RowNumber = rowNumber,
            Handle = handle,
            Sku = sku,
            Field = field,
            DateCreatedUtc = DateTime.UtcNow
        });
    }
}
