using Merchello.Core.Payments.Models;

namespace Merchello.Core.Payments.Dtos;

/// <summary>
/// Payment method available for checkout
/// </summary>
public class PaymentMethodDto
{
    public required string Alias { get; set; }
    public required string DisplayName { get; set; }
    public string? Icon { get; set; }
    public string? Description { get; set; }
    public PaymentIntegrationType IntegrationType { get; set; }
    public int SortOrder { get; set; }
}
