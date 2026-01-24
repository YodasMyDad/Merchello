using System.Text.Json;
using System.Text.Json.Serialization;

namespace Merchello.Core.Payments.Providers.WorldPay.Models;

/// <summary>
/// JSON serialization options for WorldPay API.
/// </summary>
internal static class WorldPayJsonOptions
{
    public static JsonSerializerOptions Default { get; } = new()
    {
        PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
        DefaultIgnoreCondition = JsonIgnoreCondition.WhenWritingNull
    };
}
