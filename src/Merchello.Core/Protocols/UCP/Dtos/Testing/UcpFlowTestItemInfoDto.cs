namespace Merchello.Core.Protocols.UCP.Dtos.Testing;

public class UcpFlowTestItemInfoDto
{
    public string? Id { get; set; }

    public string? Title { get; set; }

    public long Price { get; set; }

    public string? ImageUrl { get; set; }

    public string? Url { get; set; }

    public List<UcpFlowTestItemOptionDto>? Options { get; set; }
}
