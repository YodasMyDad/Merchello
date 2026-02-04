namespace Merchello.Core.Protocols;

/// <summary>
/// Checkout session status values.
/// </summary>
public static class ProtocolSessionStatuses
{
    public const string Incomplete = "incomplete";
    public const string RequiresEscalation = "requires_escalation";
    public const string ReadyForComplete = "ready_for_complete";
    public const string CompleteInProgress = "complete_in_progress";
    public const string Completed = "completed";
    public const string Canceled = "canceled";
}
