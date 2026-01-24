using Merchello.Core.Protocols.Models;

namespace Merchello.Core.Protocols.Payments.Interfaces;

/// <summary>
/// Exports Merchello payment providers as protocol payment handlers.
/// </summary>
public interface IPaymentHandlerExporter
{
    /// <summary>
    /// Exports available payment handlers for a protocol.
    /// </summary>
    /// <param name="protocolName">The protocol name (e.g., "ucp").</param>
    /// <param name="sessionId">Optional session ID for session-specific handlers.</param>
    /// <param name="ct">Cancellation token.</param>
    /// <returns>List of payment handlers in protocol format.</returns>
    Task<IReadOnlyList<ProtocolPaymentHandler>> ExportHandlersAsync(
        string protocolName,
        string? sessionId = null,
        CancellationToken ct = default);
}
