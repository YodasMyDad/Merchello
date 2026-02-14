using Merchello.Core.Tax.Providers.Models;

namespace Merchello.Core.Tax.Services.Models;

public class TaxOrchestrationResult
{
    public bool Success { get; init; }

    public string? ErrorMessage { get; init; }

    public bool UseCentralizedCalculation { get; init; }

    public TaxCalculationResult? ProviderResult { get; init; }

    public bool IsEstimated { get; init; }

    public string? EstimationReason { get; init; }

    public string? ProviderAlias { get; init; }

    public List<string> Warnings { get; init; } = [];

    public static TaxOrchestrationResult Centralized(
        string? providerAlias = null,
        bool isEstimated = false,
        string? estimationReason = null,
        List<string>? warnings = null) => new()
    {
        Success = true,
        UseCentralizedCalculation = true,
        ProviderAlias = providerAlias,
        IsEstimated = isEstimated,
        EstimationReason = estimationReason,
        Warnings = warnings ?? []
    };

    public static TaxOrchestrationResult Provider(
        string providerAlias,
        TaxCalculationResult providerResult) => new()
    {
        Success = providerResult.Success,
        ErrorMessage = providerResult.ErrorMessage,
        UseCentralizedCalculation = false,
        ProviderAlias = providerAlias,
        ProviderResult = providerResult,
        IsEstimated = providerResult.IsEstimated,
        EstimationReason = providerResult.EstimationReason,
        Warnings = providerResult.Warnings
    };

    public static TaxOrchestrationResult Failure(string errorMessage, string? providerAlias = null) => new()
    {
        Success = false,
        ErrorMessage = errorMessage,
        ProviderAlias = providerAlias
    };
}
