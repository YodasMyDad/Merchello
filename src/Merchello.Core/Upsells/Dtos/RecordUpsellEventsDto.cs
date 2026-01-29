namespace Merchello.Core.Upsells.Dtos;

/// <summary>
/// Batch wrapper for storefront events endpoint.
/// </summary>
public class RecordUpsellEventsDto
{
    public List<RecordUpsellEventDto> Events { get; set; } = [];
}
