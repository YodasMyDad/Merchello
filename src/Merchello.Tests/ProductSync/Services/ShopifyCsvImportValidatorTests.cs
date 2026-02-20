using Merchello.Core.ProductSync.Models;
using Merchello.Core.ProductSync.Services;
using Shouldly;
using Xunit;

namespace Merchello.Tests.ProductSync.Services;

public class ShopifyCsvImportValidatorTests
{
    [Fact]
    public async Task ValidateAsync_StrictProfileRejectsUnknownColumns()
    {
        var validator = new ShopifyCsvImportValidator();
        var document = new ProductSyncCsvDocument
        {
            Headers = ["Handle", "Title", "Custom Column"],
            Rows =
            [
                new ProductSyncCsvRow(2, new Dictionary<string, string?>
                {
                    ["Handle"] = "shirt",
                    ["Title"] = "Shirt"
                })
            ]
        };

        var result = await validator.ValidateAsync(
            document,
            ProductSyncProfile.ShopifyStrict,
            maxIssues: 1000,
            cancellationToken: CancellationToken.None);

        result.Issues.ShouldContain(x =>
            x.Code == "unsupported_column" &&
            x.Field == "Custom Column" &&
            x.Severity == ProductSyncIssueSeverity.Error);
    }

    [Fact]
    public async Task ValidateAsync_ExtendedProfileAcceptsMerchelloExtensionColumns()
    {
        var validator = new ShopifyCsvImportValidator();
        var document = new ProductSyncCsvDocument
        {
            Headers = ["Handle", "Title", "Merchello:AddonOptionsJson"],
            Rows =
            [
                new ProductSyncCsvRow(2, new Dictionary<string, string?>
                {
                    ["Handle"] = "shirt",
                    ["Title"] = "Shirt",
                    ["Merchello:AddonOptionsJson"] = "[]"
                })
            ]
        };

        var result = await validator.ValidateAsync(
            document,
            ProductSyncProfile.MerchelloExtended,
            maxIssues: 1000,
            cancellationToken: CancellationToken.None);

        result.Issues.ShouldNotContain(x => x.Code == "unsupported_column");
        result.Issues.ShouldNotContain(x => x.Severity == ProductSyncIssueSeverity.Error);
    }

    [Fact]
    public async Task ValidateAsync_CollectionColumnProducesWarning()
    {
        var validator = new ShopifyCsvImportValidator();
        var document = new ProductSyncCsvDocument
        {
            Headers = ["Handle", "Title", "Collection"],
            Rows =
            [
                new ProductSyncCsvRow(2, new Dictionary<string, string?>
                {
                    ["Handle"] = "shirt",
                    ["Title"] = "Shirt",
                    ["Collection"] = "Summer"
                })
            ]
        };

        var result = await validator.ValidateAsync(
            document,
            ProductSyncProfile.ShopifyStrict,
            maxIssues: 1000,
            cancellationToken: CancellationToken.None);

        result.Issues.ShouldContain(x =>
            x.Code == "collection_ignored" &&
            x.Field == "Collection" &&
            x.Severity == ProductSyncIssueSeverity.Warning);
    }

    [Fact]
    public async Task ValidateAsync_BlocksPrivateImageUrls()
    {
        var validator = new ShopifyCsvImportValidator();
        var document = new ProductSyncCsvDocument
        {
            Headers = ["Handle", "Title", "Image Src"],
            Rows =
            [
                new ProductSyncCsvRow(2, new Dictionary<string, string?>
                {
                    ["Handle"] = "shirt",
                    ["Title"] = "Shirt",
                    ["Image Src"] = "http://127.0.0.1/private.jpg"
                })
            ]
        };

        var result = await validator.ValidateAsync(
            document,
            ProductSyncProfile.ShopifyStrict,
            maxIssues: 1000,
            cancellationToken: CancellationToken.None);

        result.Issues.ShouldContain(x =>
            x.Code == "invalid_image_url" &&
            x.Field == "Image Src" &&
            x.Severity == ProductSyncIssueSeverity.Error);
    }

    [Fact]
    public async Task ValidateAsync_AllowsOptionValueWhenHandleHasOptionNameElsewhere()
    {
        var validator = new ShopifyCsvImportValidator();
        var document = new ProductSyncCsvDocument
        {
            Headers = ["Handle", "Title", "Option1 Name", "Option1 Value"],
            Rows =
            [
                new ProductSyncCsvRow(2, new Dictionary<string, string?>
                {
                    ["Handle"] = "chair",
                    ["Title"] = "Chair",
                    ["Option1 Name"] = "Color",
                    ["Option1 Value"] = "Blue"
                }),
                new ProductSyncCsvRow(3, new Dictionary<string, string?>
                {
                    ["Handle"] = "chair",
                    ["Title"] = null,
                    ["Option1 Name"] = null,
                    ["Option1 Value"] = "Green"
                })
            ]
        };

        var result = await validator.ValidateAsync(
            document,
            ProductSyncProfile.ShopifyStrict,
            maxIssues: 1000,
            cancellationToken: CancellationToken.None);

        result.Issues.ShouldNotContain(x =>
            x.Code == "missing_option_name" &&
            x.RowNumber == 3 &&
            x.Field == "Option1 Name");
    }

    [Fact]
    public async Task ValidateAsync_AllowsLegacySingleVariantDefaultOptionValuesWithoutOptionName()
    {
        var validator = new ShopifyCsvImportValidator();
        var document = new ProductSyncCsvDocument
        {
            Headers = ["Handle", "Title", "Option1 Name", "Option1 Value"],
            Rows =
            [
                new ProductSyncCsvRow(2, new Dictionary<string, string?>
                {
                    ["Handle"] = "single-default",
                    ["Title"] = "Single Default",
                    ["Option1 Name"] = null,
                    ["Option1 Value"] = "Default"
                }),
                new ProductSyncCsvRow(3, new Dictionary<string, string?>
                {
                    ["Handle"] = "single-default-title",
                    ["Title"] = "Single Default Title",
                    ["Option1 Name"] = null,
                    ["Option1 Value"] = "Default Title"
                })
            ]
        };

        var result = await validator.ValidateAsync(
            document,
            ProductSyncProfile.ShopifyStrict,
            maxIssues: 1000,
            cancellationToken: CancellationToken.None);

        result.Issues.ShouldNotContain(x =>
            x.Code == "missing_option_name" &&
            x.Field == "Option1 Name");
    }

    [Fact]
    public async Task ValidateAsync_StillErrorsWhenOptionValueHasNoResolvableOptionName()
    {
        var validator = new ShopifyCsvImportValidator();
        var document = new ProductSyncCsvDocument
        {
            Headers = ["Handle", "Title", "Option1 Name", "Option1 Value"],
            Rows =
            [
                new ProductSyncCsvRow(2, new Dictionary<string, string?>
                {
                    ["Handle"] = "invalid-row",
                    ["Title"] = "Invalid Row",
                    ["Option1 Name"] = null,
                    ["Option1 Value"] = "Blue"
                })
            ]
        };

        var result = await validator.ValidateAsync(
            document,
            ProductSyncProfile.ShopifyStrict,
            maxIssues: 1000,
            cancellationToken: CancellationToken.None);

        result.Issues.ShouldContain(x =>
            x.Code == "missing_option_name" &&
            x.RowNumber == 2 &&
            x.Field == "Option1 Name" &&
            x.Severity == ProductSyncIssueSeverity.Error);
    }
}
