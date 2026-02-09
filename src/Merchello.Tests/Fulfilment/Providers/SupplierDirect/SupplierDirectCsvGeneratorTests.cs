using System.Text;
using Merchello.Core.Fulfilment.Models;
using Merchello.Core.Fulfilment.Providers.SupplierDirect.Csv;
using Shouldly;
using Xunit;

namespace Merchello.Tests.Fulfilment.Providers.SupplierDirect;

public class SupplierDirectCsvGeneratorTests
{
    [Fact]
    public void Generate_IncludesUtf8Bom_AndSanitizesFormulaInjection()
    {
        var generator = new SupplierDirectCsvGenerator();
        var request = CreateRequest(sku: "=1+1", productName: "+Test Product");

        var csvBytes = generator.Generate(request);

        csvBytes.Length.ShouldBeGreaterThan(3);
        csvBytes[0].ShouldBe((byte)0xEF);
        csvBytes[1].ShouldBe((byte)0xBB);
        csvBytes[2].ShouldBe((byte)0xBF);

        var csvText = Encoding.UTF8.GetString(csvBytes);
        csvText.ShouldContain("'=1+1");
        csvText.ShouldContain("'+Test Product");
    }

    [Fact]
    public void Generate_RespectsCustomColumnMapping_AndStaticColumns()
    {
        var generator = new SupplierDirectCsvGenerator();
        var request = CreateRequest();
        var mapping = new CsvColumnMapping
        {
            Columns = new Dictionary<string, string>
            {
                ["OrderNumber"] = "Order #",
                ["Sku"] = "Item SKU"
            },
            StaticColumns = new Dictionary<string, string>
            {
                ["Source"] = "Merchello"
            }
        };

        var csvBytes = generator.Generate(request, mapping);
        var csvText = Encoding.UTF8.GetString(csvBytes);
        var lines = csvText
            .Split(["\r\n", "\n"], StringSplitOptions.RemoveEmptyEntries)
            .ToList();

        lines.Count.ShouldBe(2);
        lines[0].TrimStart('\uFEFF').ShouldBe("Order #,Item SKU,Source");
        lines[1].ShouldContain("ORD-1001,SKU-001,Merchello");
    }

    private static FulfilmentOrderRequest CreateRequest(string sku = "SKU-001", string productName = "Product A")
    {
        return new FulfilmentOrderRequest
        {
            OrderId = Guid.NewGuid(),
            OrderNumber = "ORD-1001",
            ShippingAddress = new FulfilmentAddress
            {
                Name = "Test Customer",
                AddressOne = "123 Test Street",
                TownCity = "London",
                PostalCode = "SW1A 1AA",
                CountryCode = "GB"
            },
            LineItems =
            [
                new FulfilmentLineItem
                {
                    LineItemId = Guid.NewGuid(),
                    Sku = sku,
                    Name = productName,
                    Quantity = 2,
                    UnitPrice = 19.99m
                }
            ],
            ExtendedData = new Dictionary<string, object>()
        };
    }
}
