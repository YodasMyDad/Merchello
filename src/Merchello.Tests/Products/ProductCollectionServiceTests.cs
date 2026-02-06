using Merchello.Core.Data;
using Merchello.Core.Products.Factories;
using Merchello.Core.Products.Services;
using Merchello.Tests.TestInfrastructure;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using Moq;
using Shouldly;
using Umbraco.Cms.Persistence.EFCore.Scoping;
using Xunit;

namespace Merchello.Tests.Products;

[Collection("Integration Tests")]
public class ProductCollectionServiceTests
{
    private readonly ServiceTestFixture _fixture;
    private readonly ProductCollectionService _service;
    private readonly TestDataBuilder _dataBuilder;

    public ProductCollectionServiceTests(ServiceTestFixture fixture)
    {
        _fixture = fixture;
        _fixture.ResetDatabase();

        _service = new ProductCollectionService(
            _fixture.GetService<IEFCoreScopeProvider<MerchelloDbContext>>(),
            _fixture.GetService<ProductCollectionFactory>(),
            new Mock<ILogger<ProductCollectionService>>().Object);

        _dataBuilder = _fixture.CreateDataBuilder();
    }

    [Fact]
    public async Task CreateAndUpdateProductCollection_PersistsChanges()
    {
        var created = await _service.CreateProductCollection("Seasonal");
        created.Successful.ShouldBeTrue();
        created.ResultObject.ShouldNotBeNull();

        var updated = await _service.UpdateProductCollection(created.ResultObject.Id, "Seasonal 2026");

        updated.Successful.ShouldBeTrue();
        updated.ResultObject.ShouldNotBeNull();
        updated.ResultObject.Name.ShouldBe("Seasonal 2026");
    }

    [Fact]
    public async Task GetProductCollectionsWithCounts_ReturnsAccurateCounts()
    {
        var summer = await _service.CreateProductCollection("Summer");
        var winter = await _service.CreateProductCollection("Winter");
        summer.ResultObject.ShouldNotBeNull();
        winter.ResultObject.ShouldNotBeNull();
        _fixture.DbContext.ChangeTracker.Clear();

        var summerCollection = await _fixture.DbContext.ProductCollections
            .SingleAsync(c => c.Id == summer.ResultObject.Id);
        var winterCollection = await _fixture.DbContext.ProductCollections
            .SingleAsync(c => c.Id == winter.ResultObject.Id);

        var productRootA = _dataBuilder.CreateProductRoot("Beach Hat");
        var productRootB = _dataBuilder.CreateProductRoot("Beach Towel");
        var productRootC = _dataBuilder.CreateProductRoot("Ski Jacket");

        productRootA.Collections.Add(summerCollection);
        productRootB.Collections.Add(summerCollection);
        productRootC.Collections.Add(winterCollection);
        await _dataBuilder.SaveChangesAsync();

        var result = await _service.GetProductCollectionsWithCounts();

        var summerCount = result.Single(x => x.Id == summer.ResultObject.Id);
        var winterCount = result.Single(x => x.Id == winter.ResultObject.Id);

        summerCount.ProductCount.ShouldBe(2);
        winterCount.ProductCount.ShouldBe(1);
    }

    [Fact]
    public async Task DeleteProductCollection_ClearsRelationshipsAndDeletesCollection()
    {
        var created = await _service.CreateProductCollection("Clearance");
        created.ResultObject.ShouldNotBeNull();
        _fixture.DbContext.ChangeTracker.Clear();

        var trackedCollection = await _fixture.DbContext.ProductCollections
            .SingleAsync(c => c.Id == created.ResultObject.Id);

        var root = _dataBuilder.CreateProductRoot("Clearance Product");
        root.Collections.Add(trackedCollection);
        await _dataBuilder.SaveChangesAsync();

        var result = await _service.DeleteProductCollection(created.ResultObject.Id);

        result.Successful.ShouldBeTrue();
        _fixture.DbContext.ChangeTracker.Clear();

        var collectionExists = await _fixture.DbContext.ProductCollections
            .AnyAsync(x => x.Id == created.ResultObject.Id);
        collectionExists.ShouldBeFalse();

        var refreshedRoot = await _fixture.DbContext.RootProducts
            .Include(x => x.Collections)
            .SingleAsync(x => x.Id == root.Id);
        refreshedRoot.Collections.ShouldBeEmpty();
    }

    [Fact]
    public async Task GetCollectionsByIds_ReturnsOnlyRequestedCollections()
    {
        var alpha = await _service.CreateProductCollection("Alpha");
        var beta = await _service.CreateProductCollection("Beta");
        var gamma = await _service.CreateProductCollection("Gamma");
        alpha.ResultObject.ShouldNotBeNull();
        beta.ResultObject.ShouldNotBeNull();
        gamma.ResultObject.ShouldNotBeNull();

        var result = await _service.GetCollectionsByIds([alpha.ResultObject.Id, gamma.ResultObject.Id]);

        result.Count.ShouldBe(2);
        result.ShouldContain(x => x.Id == alpha.ResultObject.Id);
        result.ShouldContain(x => x.Id == gamma.ResultObject.Id);
        result.ShouldNotContain(x => x.Id == beta.ResultObject.Id);
    }
}
