namespace Merchello.Core.Protocols.UCP.Dtos.Testing;

public class UcpFlowStepResultDto
{
    public string Step { get; set; } = string.Empty;

    public bool Success { get; set; }

    public string ModeRequested { get; set; } = "adapter";

    public string ModeExecuted { get; set; } = "adapter";

    public bool FallbackApplied { get; set; }

    public string? FallbackReason { get; set; }

    public bool DryRun { get; set; }

    public bool DryRunSkippedExecution { get; set; }

    public DateTime TimestampUtc { get; set; }

    public long DurationMs { get; set; }

    public UcpFlowRequestSnapshotDto? Request { get; set; }

    public UcpFlowResponseSnapshotDto? Response { get; set; }

    public string? SessionId { get; set; }

    public string? Status { get; set; }

    public string? OrderId { get; set; }

    public object? ResponseData { get; set; }

    public string? ErrorCode { get; set; }

    public string? ErrorMessage { get; set; }
}
