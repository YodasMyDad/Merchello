using System.Text.Json.Serialization;

namespace Merchello.Core.Shipping.Providers.UPS.Models;

public class UpsResponseInfo
{
    [JsonPropertyName("ResponseStatus")]
    public UpsResponseStatus? ResponseStatus { get; set; }

    [JsonPropertyName("Alert")]
    public List<UpsAlert>? Alert { get; set; }

    [JsonPropertyName("TransactionReference")]
    public UpsTransactionReference? TransactionReference { get; set; }
}
