using Merchello.Core.Data;
using Merchello.Core.Products.Factories;
using Merchello.Core.Products.Services;
using Merchello.Core.Shared.Extensions;
using Merchello.Tests.TestInfrastructure;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using Moq;
using Shouldly;
using Umbraco.Cms.Persistence.EFCore.Scoping;
using Xunit;

namespace Merchello.Tests.Products;

[Collection("Integration Tests")]
public class ProductTypeServiceTests
{
    private readonly ServiceTestFixture _fixture;
    private readonly ProductTypeService _service;
    private readonly TestDataBuilder _dataBuilder;

    public ProductTypeServiceTests(ServiceTestFixture fixture)
    {
        _fixture = fixture;
        _fixture.ResetDatabase();

        _service = new ProductTypeService(
            _fixture.GetService<IEFCoreScopeProvider<MerchelloDbContext>>(),
            _fixture.GetService<ProductTypeFactory>(),
            _fixture.GetService<SlugHelper>(),
            new Mock<ILogger<ProductTypeService>>().Object);

        _dataBuilder = _fixture.CreateDataBuilder();
    }

    [Fact]
    public async Task CreateProductType_WithUniqueName_CreatesWithSlugAlias()
    {
        var result = await _service.CreateProductType("Home Decor");

        result.Successful.ShouldBeTrue();
        result.ResultObject.ShouldNotBeNull();
        result.ResultObject.Name.ShouldBe("Home Decor");
        result.ResultObject.Alias.ShouldBe("home-decor");
    }

    [Fact]
    public async Task CreateProductType_WithDuplicateSlugAlias_ReturnsError()
    {
        await _service.CreateProductType("Mens Wear");

        var result = await _service.CreateProductType("Men's Wear");

        result.Successful.ShouldBeFalse();
        result.Messages.ShouldContain(m => m.Message!.Contains("already exists"));
    }

    [Fact]
    public async Task UpdateProductType_ChangesNameAndAlias()
    {
        var created = await _service.CreateProductType("Outdoor Furniture");
        created.ResultObject.ShouldNotBeNull();

        var result = await _service.UpdateProductType(created.ResultObject.Id, "Indoor Furniture");

        result.Successful.ShouldBeTrue();
        result.ResultObject.ShouldNotBeNull();
        result.ResultObject.Name.ShouldBe("Indoor Furniture");
        result.ResultObject.Alias.ShouldBe("indoor-furniture");
    }

    [Fact]
    public async Task UpdateProductType_ToExistingAlias_ReturnsError()
    {
        var first = await _service.CreateProductType("Furniture");
        var second = await _service.CreateProductType("Lighting");
        first.ResultObject.ShouldNotBeNull();
        second.ResultObject.ShouldNotBeNull();

        var result = await _service.UpdateProductType(second.ResultObject.Id, "Furniture");

        result.Successful.ShouldBeFalse();
        result.Messages.ShouldContain(m => m.Message!.Contains("already exists"));
    }

    [Fact]
    public async Task DeleteProductType_WhenLinkedToProductRoot_ReturnsError()
    {
        var productType = _dataBuilder.CreateProductType("Linked Type", "linked-type");
        _dataBuilder.CreateProductRoot("Linked Product Root", productType: productType);
        await _dataBuilder.SaveChangesAsync();

        var result = await _service.DeleteProductType(productType.Id);

        result.Successful.ShouldBeFalse();
        result.Messages.ShouldContain(m => m.Message!.Contains("Cannot delete product type"));
    }

    [Fact]
    public async Task DeleteProductType_WhenNotLinked_DeletesSuccessfully()
    {
        var created = await _service.CreateProductType("Disposable Type");
        created.ResultObject.ShouldNotBeNull();

        var result = await _service.DeleteProductType(created.ResultObject.Id);

        result.Successful.ShouldBeTrue();
        _fixture.DbContext.ChangeTracker.Clear();

        var exists = await _fixture.DbContext.ProductTypes.AnyAsync(x => x.Id == created.ResultObject.Id);
        exists.ShouldBeFalse();
    }
}
