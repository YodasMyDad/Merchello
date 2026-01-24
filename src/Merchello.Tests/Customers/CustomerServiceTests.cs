using Merchello.Core.Customers.Services.Interfaces;
using Merchello.Tests.TestInfrastructure;
using Shouldly;
using Xunit;

namespace Merchello.Tests.Customers;

/// <summary>
/// Integration tests for CustomerService.
/// </summary>
[Collection("Integration")]
public class CustomerServiceTests : IClassFixture<ServiceTestFixture>
{
    private readonly ServiceTestFixture _fixture;
    private readonly ICustomerService _customerService;

    public CustomerServiceTests(ServiceTestFixture fixture)
    {
        _fixture = fixture;
        _fixture.ResetDatabase();
        _customerService = fixture.GetService<ICustomerService>();
    }

    #region SearchCustomersAsync Tests

    [Fact]
    public async Task SearchCustomersAsync_FindsByEmail()
    {
        // Arrange
        var dataBuilder = _fixture.CreateDataBuilder();
        dataBuilder.CreateCustomer(email: "john@example.com", firstName: "John", lastName: "Doe");
        dataBuilder.CreateCustomer(email: "jane@example.com", firstName: "Jane", lastName: "Doe");
        dataBuilder.CreateCustomer(email: "bob@test.com", firstName: "Bob", lastName: "Smith");
        await dataBuilder.SaveChangesAsync();

        // Act
        var result = await _customerService.SearchCustomersAsync(email: "john@example.com", name: null);

        // Assert
        result.ShouldNotBeEmpty();
        result.Count.ShouldBe(1);
        result[0].Email.ShouldBe("john@example.com");
    }

    [Fact]
    public async Task SearchCustomersAsync_FindsByPartialName()
    {
        // Arrange
        var dataBuilder = _fixture.CreateDataBuilder();
        dataBuilder.CreateCustomer(email: "john@example.com", firstName: "John", lastName: "Doe");
        dataBuilder.CreateCustomer(email: "jane@example.com", firstName: "Jane", lastName: "Doe");
        dataBuilder.CreateCustomer(email: "bob@test.com", firstName: "Bob", lastName: "Smith");
        await dataBuilder.SaveChangesAsync();

        // Act
        var result = await _customerService.SearchCustomersAsync(email: null, name: "Doe");

        // Assert
        result.ShouldNotBeEmpty();
        result.Count.ShouldBe(2);
        result.All(c => c.Name.Contains("Doe")).ShouldBeTrue();
    }

    #endregion
}
