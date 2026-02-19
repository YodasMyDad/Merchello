using Merchello.Core.Protocols.UCP.Dtos.Testing;

namespace Merchello.Core.Protocols.UCP.Services.Interfaces;

public interface IUcpFlowTestService
{
    Task<UcpFlowDiagnosticsDto> GetDiagnosticsAsync(CancellationToken ct = default);

    Task<UcpFlowStepResultDto> ExecuteManifestAsync(UcpTestManifestRequestDto request, CancellationToken ct = default);

    Task<UcpFlowStepResultDto> ExecuteCreateSessionAsync(UcpTestCreateSessionRequestDto request, CancellationToken ct = default);

    Task<UcpFlowStepResultDto> ExecuteGetSessionAsync(UcpTestGetSessionRequestDto request, CancellationToken ct = default);

    Task<UcpFlowStepResultDto> ExecuteUpdateSessionAsync(UcpTestUpdateSessionRequestDto request, CancellationToken ct = default);

    Task<UcpFlowStepResultDto> ExecuteCompleteSessionAsync(UcpTestCompleteSessionRequestDto request, CancellationToken ct = default);

    Task<UcpFlowStepResultDto> ExecuteCancelSessionAsync(UcpTestCancelSessionRequestDto request, CancellationToken ct = default);

    Task<UcpFlowStepResultDto> ExecuteGetOrderAsync(UcpTestGetOrderRequestDto request, CancellationToken ct = default);
}
