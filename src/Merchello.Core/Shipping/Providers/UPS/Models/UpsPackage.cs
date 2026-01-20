using System.Text.Json.Serialization;

namespace Merchello.Core.Shipping.Providers.UPS.Models;

public class UpsPackage
{
    [JsonPropertyName("PackagingType")]
    public UpsPackagingType PackagingType { get; set; } = null!;

    [JsonPropertyName("Dimensions")]
    public UpsDimensions? Dimensions { get; set; }

    [JsonPropertyName("PackageWeight")]
    public UpsPackageWeight PackageWeight { get; set; } = null!;
}
