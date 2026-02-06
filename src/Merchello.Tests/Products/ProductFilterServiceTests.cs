using Merchello.Core.Data;
using Merchello.Core.Products.Factories;
using Merchello.Core.Products.Services;
using Merchello.Core.Products.Services.Parameters;
using Merchello.Tests.TestInfrastructure;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using Moq;
using Shouldly;
using Umbraco.Cms.Persistence.EFCore.Scoping;
using Xunit;

namespace Merchello.Tests.Products;

[Collection("Integration Tests")]
public class ProductFilterServiceTests
{
    private readonly ServiceTestFixture _fixture;
    private readonly ProductFilterService _service;
    private readonly TestDataBuilder _dataBuilder;

    public ProductFilterServiceTests(ServiceTestFixture fixture)
    {
        _fixture = fixture;
        _fixture.ResetDatabase();

        _service = new ProductFilterService(
            _fixture.GetService<IEFCoreScopeProvider<MerchelloDbContext>>(),
            new ProductFilterGroupFactory(),
            new ProductFilterFactory(),
            new Mock<ILogger<ProductFilterService>>().Object);

        _dataBuilder = _fixture.CreateDataBuilder();
    }

    [Fact]
    public async Task CreateFilterGroupAndFilters_AssignsIncrementingSortOrder()
    {
        var groupResult = await _service.CreateFilterGroup("Color");
        groupResult.Successful.ShouldBeTrue();
        groupResult.ResultObject.ShouldNotBeNull();

        var redResult = await _service.CreateFilter(new CreateFilterParameters
        {
            FilterGroupId = groupResult.ResultObject.Id,
            Name = "Red",
            HexColour = "#FF0000"
        });

        var blueResult = await _service.CreateFilter(new CreateFilterParameters
        {
            FilterGroupId = groupResult.ResultObject.Id,
            Name = "Blue",
            HexColour = "#0000FF"
        });

        redResult.Successful.ShouldBeTrue();
        blueResult.Successful.ShouldBeTrue();
        redResult.ResultObject!.SortOrder.ShouldBe(0);
        blueResult.ResultObject!.SortOrder.ShouldBe(1);
    }

    [Fact]
    public async Task AssignFiltersToProduct_ReplacesExistingAssignments()
    {
        var group = await _service.CreateFilterGroup("Style");
        var modern = await _service.CreateFilter(new CreateFilterParameters
        {
            FilterGroupId = group.ResultObject!.Id,
            Name = "Modern"
        });
        var classic = await _service.CreateFilter(new CreateFilterParameters
        {
            FilterGroupId = group.ResultObject!.Id,
            Name = "Classic"
        });
        var minimal = await _service.CreateFilter(new CreateFilterParameters
        {
            FilterGroupId = group.ResultObject!.Id,
            Name = "Minimal"
        });

        var product = _dataBuilder.CreateProduct("Sofa");
        await _dataBuilder.SaveChangesAsync();

        var firstAssignment = await _service.AssignFiltersToProduct(
            product.Id,
            [modern.ResultObject!.Id, classic.ResultObject!.Id]);
        firstAssignment.Successful.ShouldBeTrue();

        var filtersAfterFirstAssignment = await _service.GetFiltersForProduct(product.Id);
        filtersAfterFirstAssignment.Count.ShouldBe(2);

        var secondAssignment = await _service.AssignFiltersToProduct(
            product.Id,
            [minimal.ResultObject!.Id]);
        secondAssignment.Successful.ShouldBeTrue();

        var filtersAfterSecondAssignment = await _service.GetFiltersForProduct(product.Id);
        filtersAfterSecondAssignment.Count.ShouldBe(1);
        filtersAfterSecondAssignment.Single().Id.ShouldBe(minimal.ResultObject.Id);
    }

    [Fact]
    public async Task GetFilterGroupsForCollection_ReturnsOnlyRelevantPurchasableFilters()
    {
        var group = await _service.CreateFilterGroup("Colour");
        var red = await _service.CreateFilter(new CreateFilterParameters
        {
            FilterGroupId = group.ResultObject!.Id,
            Name = "Red"
        });
        var blue = await _service.CreateFilter(new CreateFilterParameters
        {
            FilterGroupId = group.ResultObject!.Id,
            Name = "Blue"
        });

        var targetCollection = _dataBuilder.CreateProductCollection("Featured");
        var otherCollection = _dataBuilder.CreateProductCollection("Other");

        var rootInCollection = _dataBuilder.CreateProductRoot("In Collection");
        rootInCollection.Collections.Add(targetCollection);
        var purchasableProduct = _dataBuilder.CreateProduct("Purchasable", rootInCollection);

        var rootNotPurchasable = _dataBuilder.CreateProductRoot("Not Purchasable");
        rootNotPurchasable.Collections.Add(targetCollection);
        var notPurchasableProduct = _dataBuilder.CreateProduct("Unavailable", rootNotPurchasable);
        notPurchasableProduct.CanPurchase = false;

        var rootInDifferentCollection = _dataBuilder.CreateProductRoot("Different Collection");
        rootInDifferentCollection.Collections.Add(otherCollection);
        var differentCollectionProduct = _dataBuilder.CreateProduct("Different", rootInDifferentCollection);

        await _dataBuilder.SaveChangesAsync();

        var redFilter = await _fixture.DbContext.ProductFilters.SingleAsync(f => f.Id == red.ResultObject!.Id);
        var blueFilter = await _fixture.DbContext.ProductFilters.SingleAsync(f => f.Id == blue.ResultObject!.Id);

        purchasableProduct.Filters.Add(redFilter);
        notPurchasableProduct.Filters.Add(blueFilter);
        differentCollectionProduct.Filters.Add(blueFilter);
        await _dataBuilder.SaveChangesAsync();

        var result = await _service.GetFilterGroupsForCollection(targetCollection.Id);

        result.Count.ShouldBe(1);
        result.Single().Name.ShouldBe("Colour");
        result.Single().Filters.Count.ShouldBe(1);
        result.Single().Filters.Single().Name.ShouldBe("Red");
    }

    [Fact]
    public async Task ReorderFilterGroupsAndFilters_PersistsSortOrder()
    {
        var groupOne = await _service.CreateFilterGroup("Group One");
        var groupTwo = await _service.CreateFilterGroup("Group Two");

        var reorderGroupsResult = await _service.ReorderFilterGroups([groupTwo.ResultObject!.Id, groupOne.ResultObject!.Id]);
        reorderGroupsResult.Successful.ShouldBeTrue();

        var groups = await _service.GetFilterGroups();
        groups.Single(g => g.Id == groupTwo.ResultObject.Id).SortOrder.ShouldBe(0);
        groups.Single(g => g.Id == groupOne.ResultObject.Id).SortOrder.ShouldBe(1);

        var firstFilter = await _service.CreateFilter(new CreateFilterParameters
        {
            FilterGroupId = groupOne.ResultObject.Id,
            Name = "First"
        });
        var secondFilter = await _service.CreateFilter(new CreateFilterParameters
        {
            FilterGroupId = groupOne.ResultObject.Id,
            Name = "Second"
        });

        var reorderFiltersResult = await _service.ReorderFilters(
            groupOne.ResultObject.Id,
            [secondFilter.ResultObject!.Id, firstFilter.ResultObject!.Id]);
        reorderFiltersResult.Successful.ShouldBeTrue();

        var updatedGroup = await _service.GetFilterGroup(groupOne.ResultObject.Id);
        updatedGroup.ShouldNotBeNull();
        updatedGroup.Filters.Single(f => f.Id == secondFilter.ResultObject.Id).SortOrder.ShouldBe(0);
        updatedGroup.Filters.Single(f => f.Id == firstFilter.ResultObject.Id).SortOrder.ShouldBe(1);
    }

    [Fact]
    public async Task DeleteFilterGroup_RemovesGroupAndChildFilters()
    {
        var group = await _service.CreateFilterGroup("To Delete");
        await _service.CreateFilter(new CreateFilterParameters
        {
            FilterGroupId = group.ResultObject!.Id,
            Name = "Delete Me"
        });

        var result = await _service.DeleteFilterGroup(group.ResultObject.Id);

        result.Successful.ShouldBeTrue();
        _fixture.DbContext.ChangeTracker.Clear();

        var groupExists = await _fixture.DbContext.ProductFilterGroups.AnyAsync(g => g.Id == group.ResultObject.Id);
        var filtersExist = await _fixture.DbContext.ProductFilters.AnyAsync(f => f.ProductFilterGroupId == group.ResultObject.Id);

        groupExists.ShouldBeFalse();
        filtersExist.ShouldBeFalse();
    }
}
