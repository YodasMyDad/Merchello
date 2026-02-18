using System.Text;
using Merchello.Controllers;
using Merchello.Core.ProductSync.Dtos;
using Merchello.Core.ProductSync.Models;
using Merchello.Core.ProductSync.Services.Interfaces;
using Merchello.Core.Shared.Extensions;
using Merchello.Core.Shared.Models;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.Routing;
using Moq;
using Shouldly;
using Umbraco.Cms.Core.Security;
using Xunit;

namespace Merchello.Tests.Controllers;

public class ProductSyncApiControllerTests
{
    [Fact]
    public async Task ValidateImport_WhenFileProvided_ReturnsValidationResult()
    {
        var productSyncServiceMock = new Mock<IProductSyncService>();
        productSyncServiceMock
            .Setup(x => x.ValidateImportAsync(
                It.IsAny<Stream>(),
                It.IsAny<string>(),
                It.IsAny<ValidateProductImportDto>(),
                It.IsAny<CancellationToken>()))
            .ReturnsAsync(new ProductImportValidationDto
            {
                IsValid = true,
                RowCount = 1,
                DistinctHandleCount = 1,
                WarningCount = 0,
                ErrorCount = 0,
                Issues = []
            });

        var controller = CreateController(productSyncServiceMock);

        var csvFile = CreateCsvFile("products.csv", "Handle,Title\nshirt,Shirt");
        var result = await controller.ValidateImport(
            file: csvFile,
            profile: ProductSyncProfile.ShopifyStrict,
            maxIssues: null,
            cancellationToken: CancellationToken.None);

        var ok = result.ShouldBeOfType<OkObjectResult>();
        var dto = ok.Value.ShouldBeOfType<ProductImportValidationDto>();
        dto.IsValid.ShouldBeTrue();
        dto.RowCount.ShouldBe(1);
    }

    [Fact]
    public async Task ValidateImport_WhenFileMissing_ReturnsBadRequest()
    {
        var controller = CreateController(new Mock<IProductSyncService>());

        var result = await controller.ValidateImport(
            file: null,
            profile: ProductSyncProfile.ShopifyStrict,
            maxIssues: null,
            cancellationToken: CancellationToken.None);

        var badRequest = result.ShouldBeOfType<BadRequestObjectResult>();
        badRequest.Value.ShouldBe("CSV file is required.");
    }

    [Fact]
    public async Task StartImport_WhenServiceReturnsActiveImportError_ReturnsConflict()
    {
        var productSyncServiceMock = new Mock<IProductSyncService>();
        var conflictResult = new CrudResult<ProductSyncRunDto>();
        conflictResult.AddErrorMessage("An import is already queued or running.");

        productSyncServiceMock
            .Setup(x => x.StartImportAsync(
                It.IsAny<Stream>(),
                It.IsAny<string>(),
                It.IsAny<StartProductImportDto>(),
                It.IsAny<string?>(),
                It.IsAny<string?>(),
                It.IsAny<CancellationToken>()))
            .ReturnsAsync(conflictResult);

        var controller = CreateController(productSyncServiceMock);

        var csvFile = CreateCsvFile("products.csv", "Handle,Title\nshirt,Shirt");
        var result = await controller.StartImport(
            file: csvFile,
            profile: ProductSyncProfile.ShopifyStrict,
            continueOnImageFailure: false,
            maxIssues: null,
            cancellationToken: CancellationToken.None);

        result.ShouldBeOfType<ConflictObjectResult>();
    }

    [Fact]
    public async Task DownloadExport_WhenRunHasNoArtifact_ReturnsNotFound()
    {
        var productSyncServiceMock = new Mock<IProductSyncService>();
        productSyncServiceMock
            .Setup(x => x.OpenExportArtifactAsync(It.IsAny<Guid>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(((Stream Stream, string FileName, string ContentType)?)null);

        var controller = CreateController(productSyncServiceMock);

        var result = await controller.DownloadExport(Guid.NewGuid(), CancellationToken.None);

        result.ShouldBeOfType<NotFoundResult>();
    }

    [Fact]
    public async Task DownloadExport_WhenRunHasArtifact_ReturnsFileStreamResult()
    {
        var productSyncServiceMock = new Mock<IProductSyncService>();
        var exportStream = new MemoryStream(Encoding.UTF8.GetBytes("Handle,Title\nshirt,Shirt"));
        productSyncServiceMock
            .Setup(x => x.OpenExportArtifactAsync(It.IsAny<Guid>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync((exportStream, "shopify-export.csv", "text/csv"));

        var controller = CreateController(productSyncServiceMock);

        var result = await controller.DownloadExport(Guid.NewGuid(), CancellationToken.None);

        var fileResult = result.ShouldBeOfType<FileStreamResult>();
        fileResult.FileDownloadName.ShouldBe("shopify-export.csv");
        fileResult.ContentType.ShouldBe("text/csv");
    }

    [Fact]
    public void RouteAttributes_ContainExpectedTemplates()
    {
        GetHttpPostTemplates(nameof(ProductSyncApiController.ValidateImport))
            .ShouldContain("product-sync/imports/validate");
        GetHttpPostTemplates(nameof(ProductSyncApiController.StartImport))
            .ShouldContain("product-sync/imports/start");
        GetHttpPostTemplates(nameof(ProductSyncApiController.StartExport))
            .ShouldContain("product-sync/exports/start");

        GetHttpGetTemplates(nameof(ProductSyncApiController.GetRuns))
            .ShouldContain("product-sync/runs");
        GetHttpGetTemplates(nameof(ProductSyncApiController.GetRun))
            .ShouldContain("product-sync/runs/{id:guid}");
        GetHttpGetTemplates(nameof(ProductSyncApiController.GetRunIssues))
            .ShouldContain("product-sync/runs/{id:guid}/issues");
        GetHttpGetTemplates(nameof(ProductSyncApiController.DownloadExport))
            .ShouldContain("product-sync/runs/{id:guid}/download");
    }

    private static ProductSyncApiController CreateController(Mock<IProductSyncService> productSyncServiceMock)
    {
        var backOfficeSecurityAccessorMock = new Mock<IBackOfficeSecurityAccessor>();
        backOfficeSecurityAccessorMock
            .SetupGet(x => x.BackOfficeSecurity)
            .Returns((IBackOfficeSecurity?)null);

        return new ProductSyncApiController(
            productSyncServiceMock.Object,
            backOfficeSecurityAccessorMock.Object);
    }

    private static IFormFile CreateCsvFile(string fileName, string contents)
    {
        var bytes = Encoding.UTF8.GetBytes(contents);
        var stream = new MemoryStream(bytes);
        return new FormFile(stream, 0, bytes.Length, "file", fileName);
    }

    private static IReadOnlyList<string> GetHttpPostTemplates(string methodName)
    {
        var method = typeof(ProductSyncApiController).GetMethod(methodName);
        method.ShouldNotBeNull();

        return method!
            .GetCustomAttributes(typeof(HttpMethodAttribute), false)
            .OfType<HttpMethodAttribute>()
            .Select(x => x.Template ?? string.Empty)
            .ToList();
    }

    private static IReadOnlyList<string> GetHttpGetTemplates(string methodName)
    {
        var method = typeof(ProductSyncApiController).GetMethod(methodName);
        method.ShouldNotBeNull();

        return method!
            .GetCustomAttributes(typeof(HttpMethodAttribute), false)
            .OfType<HttpMethodAttribute>()
            .Select(x => x.Template ?? string.Empty)
            .ToList();
    }
}
