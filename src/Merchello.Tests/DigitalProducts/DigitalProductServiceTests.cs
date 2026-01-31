using Merchello.Core.Accounting.Models;
using Merchello.Core.DigitalProducts.Extensions;
using Merchello.Core.DigitalProducts.Models;
using Merchello.Core.DigitalProducts.Services.Interfaces;
using Merchello.Core.DigitalProducts.Services.Parameters;
using Merchello.Tests.TestInfrastructure;
using Microsoft.EntityFrameworkCore;
using Shouldly;
using Xunit;

namespace Merchello.Tests.DigitalProducts;

/// <summary>
/// Integration tests for DigitalProductService using real DB + services.
/// </summary>
[Collection("Integration Tests")]
public class DigitalProductServiceTests : IClassFixture<ServiceTestFixture>
{
    private readonly ServiceTestFixture _fixture;
    private readonly IDigitalProductService _digitalProductService;

    public DigitalProductServiceTests(ServiceTestFixture fixture)
    {
        _fixture = fixture;
        _fixture.ResetDatabase();
        _digitalProductService = fixture.GetService<IDigitalProductService>();
    }

    [Fact]
    public async Task CreateDownloadLinksAsync_WithDigitalProduct_CreatesLinksAndUrls()
    {
        var (invoice, fileIds) = await CreateDigitalInvoiceAsync(fileCount: 2);

        var result = await _digitalProductService.CreateDownloadLinksAsync(
            new CreateDownloadLinksParameters { InvoiceId = invoice.Id });

        result.Successful.ShouldBeTrue();
        result.ResultObject.ShouldNotBeNull();
        result.ResultObject.Count.ShouldBe(2);

        result.ResultObject.All(l => l.DownloadUrl.StartsWith("https://test.example.com/api/merchello/downloads/")).ShouldBeTrue();
        result.ResultObject.All(l => l.FileName.StartsWith("Media-")).ShouldBeTrue();
        result.ResultObject.Select(l => l.MediaId).ShouldBe(fileIds);
    }

    [Fact]
    public async Task ValidateDownloadTokenAsync_WithValidToken_ReturnsLink()
    {
        var (invoice, _) = await CreateDigitalInvoiceAsync(fileCount: 1);
        var createResult = await _digitalProductService.CreateDownloadLinksAsync(
            new CreateDownloadLinksParameters { InvoiceId = invoice.Id });
        var link = createResult.ResultObject!.Single();

        var result = await _digitalProductService.ValidateDownloadTokenAsync(
            new ValidateDownloadTokenParameters { Token = link.Token });

        result.Successful.ShouldBeTrue();
        result.ResultObject.ShouldNotBeNull();
        result.ResultObject.Id.ShouldBe(link.Id);
        result.ResultObject.DownloadUrl.ShouldNotBeNullOrWhiteSpace();
    }

    [Fact]
    public async Task RecordDownloadAsync_IncrementsDownloadCount()
    {
        var (invoice, _) = await CreateDigitalInvoiceAsync(fileCount: 1);
        var createResult = await _digitalProductService.CreateDownloadLinksAsync(
            new CreateDownloadLinksParameters { InvoiceId = invoice.Id });
        var link = createResult.ResultObject!.Single();

        var recordResult = await _digitalProductService.RecordDownloadAsync(link.Id);

        recordResult.Successful.ShouldBeTrue();

        _fixture.DbContext.ChangeTracker.Clear();
        var persisted = await _fixture.DbContext.DownloadLinks.FirstAsync(l => l.Id == link.Id);
        persisted.DownloadCount.ShouldBe(1);
    }

    [Fact]
    public async Task IsDigitalOnlyInvoiceAsync_ReturnsTrue_ForDigitalOnlyInvoice()
    {
        var (invoice, _) = await CreateDigitalInvoiceAsync(fileCount: 1);

        var isDigitalOnly = await _digitalProductService.IsDigitalOnlyInvoiceAsync(invoice.Id);

        isDigitalOnly.ShouldBeTrue();
    }

    private async Task<(Invoice Invoice, List<string> FileIds)> CreateDigitalInvoiceAsync(int fileCount)
    {
        var dataBuilder = _fixture.CreateDataBuilder();

        var customer = dataBuilder.CreateCustomer(email: "digital@example.com");
        var taxGroup = dataBuilder.CreateTaxGroup("Digital Tax", 0m);
        var productRoot = dataBuilder.CreateProductRoot("Digital Product", taxGroup);
        productRoot.IsDigitalProduct = true;
        productRoot.SetDigitalDeliveryMethod(DigitalDeliveryMethod.InstantDownload);

        var fileIds = Enumerable.Range(0, fileCount)
            .Select(_ => Guid.NewGuid().ToString())
            .ToList();
        productRoot.SetDigitalFileIds(fileIds);
        productRoot.SetDownloadLinkExpiryDays(7);
        productRoot.SetMaxDownloadsPerLink(2);

        var product = dataBuilder.CreateProduct("Digital Variant", productRoot, price: 25m);

        var warehouse = dataBuilder.CreateWarehouse("Digital Warehouse", "US");
        var shippingOption = dataBuilder.CreateShippingOption("Digital Delivery", warehouse, fixedCost: 0m);

        var invoice = dataBuilder.CreateInvoice(customer: customer, total: 25m);
        invoice.SubTotal = 25m;
        invoice.Tax = 0m;
        invoice.Total = 25m;

        var order = dataBuilder.CreateOrder(invoice, warehouse, shippingOption, OrderStatus.Pending);
        dataBuilder.CreateLineItem(order, product: product, quantity: 1, amount: 25m, taxRate: 0m);

        await dataBuilder.SaveChangesAsync();
        _fixture.DbContext.ChangeTracker.Clear();

        return (invoice, fileIds);
    }
}
