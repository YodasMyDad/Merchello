using Merchello.Core.Data;
using Merchello.Core.Notifications.Interfaces;
using Merchello.Core.Suppliers.Factories;
using Merchello.Core.Suppliers.Services;
using Merchello.Core.Suppliers.Services.Parameters;
using Merchello.Tests.TestInfrastructure;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using Moq;
using Shouldly;
using Umbraco.Cms.Persistence.EFCore.Scoping;
using Xunit;

namespace Merchello.Tests.Suppliers;

[Collection("Integration Tests")]
public class SupplierServiceTests
{
    private readonly ServiceTestFixture _fixture;
    private readonly SupplierService _service;
    private readonly TestDataBuilder _dataBuilder;

    public SupplierServiceTests(ServiceTestFixture fixture)
    {
        _fixture = fixture;
        _fixture.ResetDatabase();

        _service = new SupplierService(
            _fixture.GetService<IEFCoreScopeProvider<MerchelloDbContext>>(),
            new SupplierFactory(),
            _fixture.GetService<IMerchelloNotificationPublisher>(),
            new Mock<ILogger<SupplierService>>().Object);

        _dataBuilder = _fixture.CreateDataBuilder();
    }

    [Fact]
    public async Task CreateSupplier_WithCompleteParameters_PersistsAllFields()
    {
        var createParameters = new CreateSupplierParameters
        {
            Name = "Acme Supply Co",
            Code = "ACME",
            Address = _dataBuilder.CreateTestAddress(countryCode: "US"),
            ContactName = "Alex Morgan",
            ContactEmail = "alex@example.com",
            ContactPhone = "555-0101",
            ExtendedData = new Dictionary<string, object> { ["tier"] = "gold" }
        };

        var result = await _service.CreateSupplierAsync(createParameters);

        result.Successful.ShouldBeTrue();
        result.ResultObject.ShouldNotBeNull();
        result.ResultObject.Name.ShouldBe("Acme Supply Co");
        result.ResultObject.Code.ShouldBe("ACME");
        result.ResultObject.ContactEmail.ShouldBe("alex@example.com");
        result.ResultObject.ExtendedData["tier"].ShouldBe("gold");
    }

    [Fact]
    public async Task UpdateSupplier_UpdatesFieldsAndPersistsDateUpdated()
    {
        var supplier = _dataBuilder.CreateSupplier("Original Supplier", "ORIG");
        await _dataBuilder.SaveChangesAsync();
        var originalDateUpdated = supplier.DateUpdated;

        var updateParameters = new UpdateSupplierParameters
        {
            SupplierId = supplier.Id,
            Name = "Updated Supplier",
            Code = "UPD",
            ContactName = "Updated Contact",
            ContactEmail = "updated@example.com",
            ExtendedData = new Dictionary<string, object> { ["priority"] = "high" }
        };

        var result = await _service.UpdateSupplierAsync(updateParameters);

        result.Successful.ShouldBeTrue();
        result.ResultObject.ShouldNotBeNull();
        result.ResultObject.Name.ShouldBe("Updated Supplier");
        result.ResultObject.Code.ShouldBe("UPD");
        result.ResultObject.ContactName.ShouldBe("Updated Contact");
        result.ResultObject.ContactEmail.ShouldBe("updated@example.com");
        result.ResultObject.ExtendedData["priority"].ShouldBe("high");
        result.ResultObject.DateUpdated.ShouldBeGreaterThanOrEqualTo(originalDateUpdated);
    }

    [Fact]
    public async Task DeleteSupplier_WithLinkedWarehousesAndNoForce_ReturnsError()
    {
        var supplier = _dataBuilder.CreateSupplier("Warehouse Supplier");
        _dataBuilder.CreateWarehouse("Linked Warehouse", supplier: supplier);
        await _dataBuilder.SaveChangesAsync();

        var result = await _service.DeleteSupplierAsync(supplier.Id, force: false);

        result.Successful.ShouldBeFalse();
        result.Messages.ShouldContain(m => m.Message!.Contains("force=true"));

        _fixture.DbContext.ChangeTracker.Clear();
        var exists = await _fixture.DbContext.Suppliers.AnyAsync(s => s.Id == supplier.Id);
        exists.ShouldBeTrue();
    }

    [Fact]
    public async Task DeleteSupplier_WithForce_UnlinksWarehousesAndDeletesSupplier()
    {
        var supplier = _dataBuilder.CreateSupplier("Force Delete Supplier");
        var warehouse = _dataBuilder.CreateWarehouse("Force Warehouse", supplier: supplier);
        await _dataBuilder.SaveChangesAsync();

        var result = await _service.DeleteSupplierAsync(supplier.Id, force: true);

        result.Successful.ShouldBeTrue();
        _fixture.DbContext.ChangeTracker.Clear();

        var supplierExists = await _fixture.DbContext.Suppliers.AnyAsync(s => s.Id == supplier.Id);
        supplierExists.ShouldBeFalse();

        var persistedWarehouse = await _fixture.DbContext.Warehouses.SingleAsync(w => w.Id == warehouse.Id);
        persistedWarehouse.SupplierId.ShouldBeNull();
    }

    [Fact]
    public async Task GetSuppliersAsync_ReturnsAlphabeticallyOrderedSuppliers()
    {
        _dataBuilder.CreateSupplier("Zulu Supplies");
        _dataBuilder.CreateSupplier("Alpha Supplies");
        _dataBuilder.CreateSupplier("Mid Supplies");
        await _dataBuilder.SaveChangesAsync();

        var suppliers = await _service.GetSuppliersAsync();

        suppliers.Count.ShouldBe(3);
        suppliers[0].Name.ShouldBe("Alpha Supplies");
        suppliers[1].Name.ShouldBe("Mid Supplies");
        suppliers[2].Name.ShouldBe("Zulu Supplies");
    }
}
