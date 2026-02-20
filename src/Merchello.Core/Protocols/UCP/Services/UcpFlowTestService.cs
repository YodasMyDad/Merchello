using System.Diagnostics;
using System.Net.Http.Headers;
using System.Text;
using System.Text.Json;
using System.Text.Json.Serialization;
using Merchello.Core.Protocols.Authentication;
using Merchello.Core.Protocols.Interfaces;
using Merchello.Core.Protocols.Models;
using Merchello.Core.Protocols.UCP.Dtos;
using Merchello.Core.Protocols.UCP.Dtos.Testing;
using Merchello.Core.Protocols.UCP.Services.Interfaces;
using Merchello.Core.Protocols.Webhooks.Interfaces;
using Merchello.Core.Settings.Services.Interfaces;
using Merchello.Core.Shared.Models;
using Merchello.Core.Shared.Security;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;

namespace Merchello.Core.Protocols.UCP.Services;

public class UcpFlowTestService(
    ICommerceProtocolManager protocolManager,
    ISigningKeyStore signingKeyStore,
    IWebhookSigner webhookSigner,
    IHttpClientFactory httpClientFactory,
    IOptions<ProtocolSettings> protocolSettings,
    IOptions<MerchelloSettings> merchelloSettings,
    IMerchelloStoreSettingsService storeSettingsService,
    ILogger<UcpFlowTestService> logger) : IUcpFlowTestService
{
    private const string AdapterMode = "adapter";
    private const string StrictMode = "strict";
    private const string StrictHttpClientName = "UcpFlowStrict";
    private const string DefaultAgentId = "merchello-ucp-test-agent";

    private readonly ProtocolSettings _protocolSettings = protocolSettings.Value;
    private readonly MerchelloSettings _merchelloSettings = merchelloSettings.Value;

    private static readonly JsonSerializerOptions SnapshotJsonOptions = new()
    {
        DefaultIgnoreCondition = JsonIgnoreCondition.WhenWritingNull
    };

    public async Task<UcpFlowDiagnosticsDto> GetDiagnosticsAsync(CancellationToken ct = default)
    {
        var strictAvailability = await ResolveStrictAvailabilityAsync(ct);
        var agentId = NormalizeAgentId(null);
        var configuredBaseUrl = await ResolveConfiguredPublicBaseUrlAsync(ct);

        return new UcpFlowDiagnosticsDto
        {
            ProtocolVersion = _protocolSettings.Ucp.Version,
            Capabilities = GetConfiguredCapabilities(),
            Extensions = GetConfiguredExtensions(),
            RequireHttps = _protocolSettings.RequireHttps,
            MinimumTlsVersion = _protocolSettings.MinimumTlsVersion,
            PublicBaseUrl = NormalizeOriginalBaseUrl(configuredBaseUrl),
            EffectiveBaseUrl = strictAvailability.EffectiveBaseUrl,
            StrictModeAvailable = strictAvailability.Available,
            StrictModeBlockReason = strictAvailability.Reason,
            StrictFallbackMode = AdapterMode,
            SimulatedAgentId = agentId,
            SimulatedAgentProfileUrl = BuildSimulatedAgentProfileUrl(strictAvailability.EffectiveBaseUrl, agentId),
            TimestampUtc = DateTime.UtcNow
        };
    }

    public Task<UcpFlowStepResultDto> ExecuteManifestAsync(UcpTestManifestRequestDto request, CancellationToken ct = default)
    {
        return ExecuteStepAsync(
            step: "manifest",
            modeRequestedRaw: request.ModeRequested,
            requestedAgentId: request.AgentId,
            strictMethod: HttpMethod.Get,
            strictPath: "/.well-known/ucp",
            strictPayload: null,
            strictTransactional: false,
            strictRequiresIdempotency: false,
            dryRun: false,
            dryRunSkipExecution: false,
            dryRunResponseData: null,
            adapterExecutor: async (adapter, _, token) => ProtocolResponse.Ok(await adapter.GenerateManifestAsync(token)),
            ct: ct);
    }

    public Task<UcpFlowStepResultDto> ExecuteCreateSessionAsync(UcpTestCreateSessionRequestDto request, CancellationToken ct = default)
    {
        var payload = MapCreatePayload(request.Request);

        return ExecuteStepAsync(
            step: "create_session",
            modeRequestedRaw: request.ModeRequested,
            requestedAgentId: request.AgentId,
            strictMethod: HttpMethod.Post,
            strictPath: "/api/v1/checkout-sessions",
            strictPayload: payload,
            strictTransactional: true,
            strictRequiresIdempotency: true,
            dryRun: false,
            dryRunSkipExecution: false,
            dryRunResponseData: null,
            adapterExecutor: (adapter, agent, token) => adapter.CreateSessionAsync(payload, agent, token),
            ct: ct);
    }

    public Task<UcpFlowStepResultDto> ExecuteGetSessionAsync(UcpTestGetSessionRequestDto request, CancellationToken ct = default)
    {
        var safeSessionId = request.SessionId?.Trim() ?? string.Empty;

        return ExecuteStepAsync(
            step: "get_session",
            modeRequestedRaw: request.ModeRequested,
            requestedAgentId: request.AgentId,
            strictMethod: HttpMethod.Get,
            strictPath: $"/api/v1/checkout-sessions/{Uri.EscapeDataString(safeSessionId)}",
            strictPayload: null,
            strictTransactional: true,
            strictRequiresIdempotency: false,
            dryRun: false,
            dryRunSkipExecution: false,
            dryRunResponseData: null,
            adapterExecutor: (adapter, agent, token) => adapter.GetSessionAsync(safeSessionId, agent, token),
            ct: ct);
    }

    public Task<UcpFlowStepResultDto> ExecuteUpdateSessionAsync(UcpTestUpdateSessionRequestDto request, CancellationToken ct = default)
    {
        var safeSessionId = request.SessionId?.Trim() ?? string.Empty;
        var payload = MapUpdatePayload(request.Request);

        return ExecuteStepAsync(
            step: "update_session",
            modeRequestedRaw: request.ModeRequested,
            requestedAgentId: request.AgentId,
            strictMethod: HttpMethod.Put,
            strictPath: $"/api/v1/checkout-sessions/{Uri.EscapeDataString(safeSessionId)}",
            strictPayload: payload,
            strictTransactional: true,
            strictRequiresIdempotency: true,
            dryRun: false,
            dryRunSkipExecution: false,
            dryRunResponseData: null,
            adapterExecutor: (adapter, agent, token) => adapter.UpdateSessionAsync(safeSessionId, payload, agent, token),
            ct: ct);
    }

    public Task<UcpFlowStepResultDto> ExecuteCompleteSessionAsync(UcpTestCompleteSessionRequestDto request, CancellationToken ct = default)
    {
        var safeSessionId = request.SessionId?.Trim() ?? string.Empty;
        var payload = MapCompletePayload(request.Request);
        var isDryRun = request.DryRun;

        return ExecuteStepAsync(
            step: "complete_session",
            modeRequestedRaw: request.ModeRequested,
            requestedAgentId: request.AgentId,
            strictMethod: HttpMethod.Post,
            strictPath: $"/api/v1/checkout-sessions/{Uri.EscapeDataString(safeSessionId)}/complete",
            strictPayload: payload,
            strictTransactional: true,
            strictRequiresIdempotency: true,
            dryRun: isDryRun,
            dryRunSkipExecution: isDryRun,
            dryRunResponseData: new
            {
                sessionId = safeSessionId,
                message = "Dry run enabled. /complete was not executed and no order was created.",
                paymentHandlerId = payload.PaymentHandlerId,
                paymentInstrument = payload.PaymentInstrument
            },
            adapterExecutor: (adapter, agent, token) => adapter.CompleteSessionAsync(safeSessionId, payload, agent, token),
            ct: ct);
    }

    public Task<UcpFlowStepResultDto> ExecuteCancelSessionAsync(UcpTestCancelSessionRequestDto request, CancellationToken ct = default)
    {
        var safeSessionId = request.SessionId?.Trim() ?? string.Empty;

        return ExecuteStepAsync(
            step: "cancel_session",
            modeRequestedRaw: request.ModeRequested,
            requestedAgentId: request.AgentId,
            strictMethod: HttpMethod.Post,
            strictPath: $"/api/v1/checkout-sessions/{Uri.EscapeDataString(safeSessionId)}/cancel",
            strictPayload: null,
            strictTransactional: true,
            strictRequiresIdempotency: false,
            dryRun: false,
            dryRunSkipExecution: false,
            dryRunResponseData: null,
            adapterExecutor: (adapter, agent, token) => adapter.CancelSessionAsync(safeSessionId, agent, token),
            ct: ct);
    }

    public Task<UcpFlowStepResultDto> ExecuteGetOrderAsync(UcpTestGetOrderRequestDto request, CancellationToken ct = default)
    {
        var safeOrderId = request.OrderId?.Trim() ?? string.Empty;

        return ExecuteStepAsync(
            step: "get_order",
            modeRequestedRaw: request.ModeRequested,
            requestedAgentId: request.AgentId,
            strictMethod: HttpMethod.Get,
            strictPath: $"/api/v1/orders/{Uri.EscapeDataString(safeOrderId)}",
            strictPayload: null,
            strictTransactional: true,
            strictRequiresIdempotency: false,
            dryRun: false,
            dryRunSkipExecution: false,
            dryRunResponseData: null,
            adapterExecutor: (adapter, agent, token) => adapter.GetOrderAsync(safeOrderId, agent, token),
            ct: ct);
    }
    private async Task<UcpFlowStepResultDto> ExecuteStepAsync(
        string step,
        string? modeRequestedRaw,
        string? requestedAgentId,
        HttpMethod strictMethod,
        string strictPath,
        object? strictPayload,
        bool strictTransactional,
        bool strictRequiresIdempotency,
        bool dryRun,
        bool dryRunSkipExecution,
        object? dryRunResponseData,
        Func<ICommerceProtocolAdapter, AgentIdentity, CancellationToken, Task<ProtocolResponse>> adapterExecutor,
        CancellationToken ct)
    {
        var stopwatch = Stopwatch.StartNew();
        var timestampUtc = DateTime.UtcNow;
        var modeRequested = NormalizeMode(modeRequestedRaw);
        var strictAvailability = await ResolveStrictAvailabilityAsync(ct);
        var modeExecuted = modeRequested;
        string? fallbackReason = null;

        if (modeRequested == StrictMode && !strictAvailability.Available)
        {
            modeExecuted = AdapterMode;
            fallbackReason = strictAvailability.Reason;
            logger.LogInformation(
                "UCP flow test step {Step} requested strict mode but strict is unavailable. Falling back to adapter mode: {Reason}",
                step,
                fallbackReason);
        }

        var agentId = NormalizeAgentId(requestedAgentId);
        var agentProfileUrl = BuildSimulatedAgentProfileUrl(strictAvailability.EffectiveBaseUrl, agentId);
        var agentIdentity = BuildAgentIdentity(agentId, agentProfileUrl);

        var requestBody = SerializeSnapshotBody(strictPayload);
        var requestSnapshot = new UcpFlowRequestSnapshotDto
        {
            Method = modeExecuted == StrictMode ? strictMethod.Method : GetAdapterPseudoMethod(strictMethod),
            Url = modeExecuted == StrictMode
                ? BuildStrictUrl(strictAvailability.EffectiveBaseUrl, strictPath)
                : BuildAdapterPseudoUrl(strictPath),
            Headers = [],
            Body = requestBody,
            TimestampUtc = timestampUtc
        };

        if (dryRun && dryRunSkipExecution)
        {
            var dryRunData = dryRunResponseData ?? new
            {
                message = "Dry run enabled. No protocol call was executed."
            };

            var dryRunBody = SerializeSnapshotBody(dryRunData);
            var responseSnapshot = new UcpFlowResponseSnapshotDto
            {
                StatusCode = StatusCodes.Status200OK,
                Headers = [],
                Body = dryRunBody,
                TimestampUtc = DateTime.UtcNow
            };

            stopwatch.Stop();

            return BuildStepResult(
                step,
                success: true,
                modeRequested,
                modeExecuted,
                fallbackReason,
                dryRun,
                dryRunSkippedExecution: true,
                timestampUtc,
                stopwatch.ElapsedMilliseconds,
                requestSnapshot,
                responseSnapshot,
                dryRunData,
                errorCode: null,
                errorMessage: null);
        }

        if (modeExecuted == StrictMode)
        {
            try
            {
                var strictResult = await ExecuteStrictHttpStepAsync(
                    step,
                    strictMethod,
                    strictAvailability.EffectiveBaseUrl,
                    strictPath,
                    requestBody,
                    strictTransactional,
                    strictRequiresIdempotency,
                    agentProfileUrl,
                    ct);

                requestSnapshot.Headers = strictResult.RequestHeaders;
                var responseSnapshot = new UcpFlowResponseSnapshotDto
                {
                    StatusCode = strictResult.StatusCode,
                    Headers = strictResult.ResponseHeaders,
                    Body = strictResult.ResponseBody,
                    TimestampUtc = DateTime.UtcNow
                };

                var responseData = DeserializeResponseData(strictResult.ResponseBody);
                var success = strictResult.StatusCode is >= 200 and < 300;
                var (errorCode, errorMessage) = ExtractError(strictResult.ResponseBody);

                stopwatch.Stop();

                return BuildStepResult(
                    step,
                    success,
                    modeRequested,
                    modeExecuted,
                    fallbackReason,
                    dryRun,
                    dryRunSkippedExecution: false,
                    timestampUtc,
                    stopwatch.ElapsedMilliseconds,
                    requestSnapshot,
                    responseSnapshot,
                    responseData,
                    errorCode,
                    errorMessage);
            }
            catch (Exception ex)
            {
                logger.LogWarning(ex, "UCP strict flow test step {Step} failed", step);

                var responseSnapshot = new UcpFlowResponseSnapshotDto
                {
                    StatusCode = StatusCodes.Status500InternalServerError,
                    Headers = [],
                    Body = ex.Message,
                    TimestampUtc = DateTime.UtcNow
                };

                stopwatch.Stop();

                return BuildStepResult(
                    step,
                    success: false,
                    modeRequested,
                    modeExecuted,
                    fallbackReason,
                    dryRun,
                    dryRunSkippedExecution: false,
                    timestampUtc,
                    stopwatch.ElapsedMilliseconds,
                    requestSnapshot,
                    responseSnapshot,
                    responseData: null,
                    errorCode: "strict_http_error",
                    errorMessage: ex.Message);
            }
        }

        var adapter = await ResolveUcpAdapterAsync(ct);
        if (adapter == null)
        {
            var responseSnapshot = new UcpFlowResponseSnapshotDto
            {
                StatusCode = StatusCodes.Status404NotFound,
                Headers = [],
                Body = "UCP protocol adapter is not available.",
                TimestampUtc = DateTime.UtcNow
            };

            stopwatch.Stop();

            return BuildStepResult(
                step,
                success: false,
                modeRequested,
                modeExecuted,
                fallbackReason,
                dryRun,
                dryRunSkippedExecution: false,
                timestampUtc,
                stopwatch.ElapsedMilliseconds,
                requestSnapshot,
                responseSnapshot,
                responseData: null,
                errorCode: "adapter_not_available",
                errorMessage: "UCP protocol adapter is not available.");
        }

        try
        {
            var adapterResponse = await adapterExecutor(adapter, agentIdentity, ct);
            var adapterResponseData = adapterResponse.Success
                ? adapterResponse.Data
                : new
                {
                    error = adapterResponse.Error?.Code,
                    message = adapterResponse.Error?.Message,
                    details = adapterResponse.Error?.Details
                };

            var adapterResponseBody = SerializeSnapshotBody(adapterResponseData);
            var adapterSnapshot = new UcpFlowResponseSnapshotDto
            {
                StatusCode = adapterResponse.StatusCode,
                Headers = [],
                Body = adapterResponseBody,
                TimestampUtc = DateTime.UtcNow
            };

            stopwatch.Stop();

            return BuildStepResult(
                step,
                adapterResponse.Success,
                modeRequested,
                modeExecuted,
                fallbackReason,
                dryRun,
                dryRunSkippedExecution: false,
                timestampUtc,
                stopwatch.ElapsedMilliseconds,
                requestSnapshot,
                adapterSnapshot,
                adapterResponseData,
                adapterResponse.Error?.Code,
                adapterResponse.Error?.Message);
        }
        catch (Exception ex)
        {
            logger.LogWarning(ex, "UCP adapter flow test step {Step} failed", step);

            var responseSnapshot = new UcpFlowResponseSnapshotDto
            {
                StatusCode = StatusCodes.Status500InternalServerError,
                Headers = [],
                Body = ex.Message,
                TimestampUtc = DateTime.UtcNow
            };

            stopwatch.Stop();

            return BuildStepResult(
                step,
                success: false,
                modeRequested,
                modeExecuted,
                fallbackReason,
                dryRun,
                dryRunSkippedExecution: false,
                timestampUtc,
                stopwatch.ElapsedMilliseconds,
                requestSnapshot,
                responseSnapshot,
                responseData: null,
                errorCode: "adapter_execution_error",
                errorMessage: ex.Message);
        }
    }

    private async Task<(Dictionary<string, string> RequestHeaders, Dictionary<string, string> ResponseHeaders, int StatusCode, string ResponseBody)> ExecuteStrictHttpStepAsync(
        string step,
        HttpMethod method,
        string? effectiveBaseUrl,
        string strictPath,
        string requestBody,
        bool includeTransactionalHeaders,
        bool requiresIdempotency,
        string agentProfileUrl,
        CancellationToken ct)
    {
        if (string.IsNullOrWhiteSpace(effectiveBaseUrl))
        {
            throw new InvalidOperationException("Strict mode cannot execute without an effective base URL.");
        }

        var requestHeaders = await BuildStrictRequestHeadersAsync(
            step,
            requestBody,
            includeTransactionalHeaders,
            requiresIdempotency,
            agentProfileUrl,
            ct);

        var url = BuildStrictUrl(effectiveBaseUrl, strictPath);
        using var request = new HttpRequestMessage(method, url);
        request.Headers.Accept.Add(new MediaTypeWithQualityHeaderValue("application/json"));

        foreach (var header in requestHeaders)
        {
            request.Headers.TryAddWithoutValidation(header.Key, header.Value);
        }

        if (!string.IsNullOrWhiteSpace(requestBody))
        {
            request.Content = new StringContent(requestBody, Encoding.UTF8, "application/json");
        }

        var client = httpClientFactory.CreateClient(StrictHttpClientName);
        using var response = await client.SendAsync(request, ct);
        var responseBody = await response.Content.ReadAsStringAsync(ct);
        var responseHeaders = CollectResponseHeaders(response);

        return (requestHeaders, responseHeaders, (int)response.StatusCode, responseBody);
    }

    private async Task<Dictionary<string, string>> BuildStrictRequestHeadersAsync(
        string step,
        string requestBody,
        bool includeTransactionalHeaders,
        bool requiresIdempotency,
        string agentProfileUrl,
        CancellationToken ct)
    {
        var headers = new Dictionary<string, string>(StringComparer.OrdinalIgnoreCase)
        {
            [ProtocolHeaders.UcpAgent] = BuildAgentHeader(agentProfileUrl),
            ["User-Agent"] = "Merchello-UCP-FlowTester/1.0"
        };

        if (!includeTransactionalHeaders)
        {
            return headers;
        }

        var requestId = Guid.NewGuid().ToString();
        headers[ProtocolHeaders.RequestId] = requestId;

        if (requiresIdempotency)
        {
            headers[ProtocolHeaders.IdempotencyKey] = $"ucp-flow-test:{step}:{requestId}";
        }

        var keyId = await signingKeyStore.GetCurrentKeyIdAsync(ct);
        var signature = await webhookSigner.SignAsync(requestBody, keyId, ct);
        headers[ProtocolHeaders.RequestSignature] = signature;

        return headers;
    }
    private async Task<ICommerceProtocolAdapter?> ResolveUcpAdapterAsync(CancellationToken ct)
    {
        await protocolManager.GetAdaptersAsync(ct);
        return protocolManager.GetAdapter(ProtocolAliases.Ucp);
    }

    private async Task<(bool Available, string? Reason, string? EffectiveBaseUrl)> ResolveStrictAvailabilityAsync(CancellationToken ct)
    {
        var effectiveBaseUrl = await ResolveEffectiveBaseUrlAsync(ct);
        if (string.IsNullOrWhiteSpace(effectiveBaseUrl))
        {
            return (false, "No effective public base URL is configured.", null);
        }

        if (!Uri.TryCreate(effectiveBaseUrl, UriKind.Absolute, out var parsedBaseUri))
        {
            return (false, "Effective base URL is not a valid absolute URI.", effectiveBaseUrl);
        }

        if (!string.Equals(parsedBaseUri.Scheme, Uri.UriSchemeHttps, StringComparison.OrdinalIgnoreCase))
        {
            return (false, "Strict mode requires an HTTPS effective base URL.", effectiveBaseUrl);
        }

        if (!UrlSecurityValidator.TryValidatePublicHttpUrl(
                effectiveBaseUrl,
                requireHttps: true,
                out _,
                out var validationReason))
        {
            return (false, validationReason, effectiveBaseUrl);
        }

        return (true, null, effectiveBaseUrl);
    }

    private async Task<string?> ResolveEffectiveBaseUrlAsync(CancellationToken ct)
    {
        try
        {
            var runtime = await storeSettingsService.GetRuntimeSettingsAsync(ct);

            // 1. DB UCP Public Base URL (set on the UCP settings tab)
            if (TryNormalizeBaseUrl(runtime.Ucp?.PublicBaseUrl, out var ucpDbBaseUrl))
            {
                return ucpDbBaseUrl;
            }

            // 2. appsettings Protocol PublicBaseUrl
            if (TryNormalizeBaseUrl(_protocolSettings.PublicBaseUrl, out var protocolBaseUrl))
            {
                return protocolBaseUrl;
            }

            // 3. DB Store Website URL
            if (TryNormalizeBaseUrl(runtime.Merchello.Store.WebsiteUrl, out var runtimeStoreBaseUrl))
            {
                return runtimeStoreBaseUrl;
            }
        }
        catch (Exception ex)
        {
            logger.LogDebug(ex, "Unable to resolve runtime settings for UCP flow tester diagnostics.");

            if (TryNormalizeBaseUrl(_protocolSettings.PublicBaseUrl, out var protocolBaseUrl))
            {
                return protocolBaseUrl;
            }
        }

        // 4. appsettings Store Website URL (final fallback)
        return TryNormalizeBaseUrl(_merchelloSettings.Store?.WebsiteUrl, out var appSettingsBaseUrl)
            ? appSettingsBaseUrl
            : null;
    }

    private bool TryNormalizeBaseUrl(string? value, out string normalized)
    {
        normalized = string.Empty;

        if (string.IsNullOrWhiteSpace(value) || !Uri.TryCreate(value, UriKind.Absolute, out var uri))
        {
            return false;
        }

        var builder = new UriBuilder(uri);
        if (_protocolSettings.RequireHttps)
        {
            builder.Scheme = Uri.UriSchemeHttps;
            if (builder.Port == 80)
            {
                builder.Port = 443;
            }
        }

        normalized = builder.Uri.GetLeftPart(UriPartial.Authority).TrimEnd('/');
        return true;
    }

    private async Task<string?> ResolveConfiguredPublicBaseUrlAsync(CancellationToken ct)
    {
        try
        {
            var runtime = await storeSettingsService.GetRuntimeSettingsAsync(ct);
            if (!string.IsNullOrWhiteSpace(runtime.Ucp?.PublicBaseUrl))
            {
                return runtime.Ucp.PublicBaseUrl;
            }
        }
        catch
        {
            // Fall through to appsettings
        }

        return _protocolSettings.PublicBaseUrl;
    }

    private static string NormalizeOriginalBaseUrl(string? value)
    {
        if (string.IsNullOrWhiteSpace(value) || !Uri.TryCreate(value, UriKind.Absolute, out var uri))
        {
            return string.Empty;
        }

        return uri.GetLeftPart(UriPartial.Authority).TrimEnd('/');
    }

    private static string NormalizeMode(string? modeRequested)
        => string.Equals(modeRequested, StrictMode, StringComparison.OrdinalIgnoreCase)
            ? StrictMode
            : AdapterMode;

    private static string NormalizeAgentId(string? requestedAgentId)
        => string.IsNullOrWhiteSpace(requestedAgentId)
            ? DefaultAgentId
            : requestedAgentId.Trim();

    private string BuildAgentHeader(string agentProfileUrl)
        => $"profile=\"{agentProfileUrl}\", version=\"{_protocolSettings.Ucp.Version}\"";

    private static string BuildSimulatedAgentProfileUrl(string? effectiveBaseUrl, string agentId)
    {
        var root = string.IsNullOrWhiteSpace(effectiveBaseUrl)
            ? "https://example.invalid"
            : effectiveBaseUrl.TrimEnd('/');

        return $"{root}/.well-known/ucp-test-agent/{Uri.EscapeDataString(agentId)}";
    }

    private static AgentIdentity BuildAgentIdentity(string agentId, string agentProfileUrl)
    {
        return new AgentIdentity
        {
            AgentId = agentId,
            ProfileUri = agentProfileUrl,
            Protocol = ProtocolAliases.Ucp,
            Capabilities = [
                UcpCapabilityNames.Checkout,
                UcpCapabilityNames.Order,
                UcpExtensionNames.Discount,
                UcpExtensionNames.Fulfillment
            ]
        };
    }

    private static string BuildStrictUrl(string? baseUrl, string path)
    {
        if (string.IsNullOrWhiteSpace(baseUrl))
        {
            return path;
        }

        var normalizedBase = baseUrl.TrimEnd('/') + "/";
        return new Uri(new Uri(normalizedBase), path.TrimStart('/')).ToString();
    }

    private static string BuildAdapterPseudoUrl(string strictPath)
        => $"adapter://ucp/{strictPath.TrimStart('/')}";

    private static string GetAdapterPseudoMethod(HttpMethod method)
        => method.Method.ToUpperInvariant();

    private static Dictionary<string, string> CollectResponseHeaders(HttpResponseMessage response)
    {
        Dictionary<string, string> headers = [];

        foreach (var header in response.Headers)
        {
            headers[header.Key] = string.Join(", ", header.Value);
        }

        foreach (var header in response.Content.Headers)
        {
            headers[header.Key] = string.Join(", ", header.Value);
        }

        return headers;
    }

    private static string SerializeSnapshotBody(object? payload)
    {
        if (payload == null)
        {
            return string.Empty;
        }

        if (payload is string value)
        {
            return value;
        }

        return JsonSerializer.Serialize(payload, SnapshotJsonOptions);
    }

    private static object? DeserializeResponseData(string? body)
    {
        if (string.IsNullOrWhiteSpace(body))
        {
            return null;
        }

        try
        {
            return JsonSerializer.Deserialize<object>(body, SnapshotJsonOptions);
        }
        catch (JsonException)
        {
            return body;
        }
    }

    private static (string? ErrorCode, string? ErrorMessage) ExtractError(string? responseBody)
    {
        if (string.IsNullOrWhiteSpace(responseBody))
        {
            return (null, null);
        }

        try
        {
            using var json = JsonDocument.Parse(responseBody);
            var root = json.RootElement;
            var errorCode = TryReadStringProperty(root, "error", "code");
            var errorMessage = TryReadStringProperty(root, "message", "error_message", "errorMessage");

            if (root.TryGetProperty("error", out var errorProperty) && errorProperty.ValueKind == JsonValueKind.Object)
            {
                errorCode ??= TryReadStringProperty(errorProperty, "code", "error");
                errorMessage ??= TryReadStringProperty(errorProperty, "message", "error_message", "errorMessage");
            }

            return (errorCode, errorMessage);
        }
        catch (JsonException)
        {
            return (null, responseBody);
        }
    }

    private static UcpFlowStepResultDto BuildStepResult(
        string step,
        bool success,
        string modeRequested,
        string modeExecuted,
        string? fallbackReason,
        bool dryRun,
        bool dryRunSkippedExecution,
        DateTime timestampUtc,
        long durationMs,
        UcpFlowRequestSnapshotDto requestSnapshot,
        UcpFlowResponseSnapshotDto responseSnapshot,
        object? responseData,
        string? errorCode,
        string? errorMessage)
    {
        var (sessionId, status, orderId) = ExtractIdentifiers(responseData, responseSnapshot.Body);

        return new UcpFlowStepResultDto
        {
            Step = step,
            Success = success,
            ModeRequested = modeRequested,
            ModeExecuted = modeExecuted,
            FallbackApplied = !string.IsNullOrWhiteSpace(fallbackReason),
            FallbackReason = fallbackReason,
            DryRun = dryRun,
            DryRunSkippedExecution = dryRunSkippedExecution,
            TimestampUtc = timestampUtc,
            DurationMs = durationMs,
            Request = requestSnapshot,
            Response = responseSnapshot,
            SessionId = sessionId,
            Status = status,
            OrderId = orderId,
            ResponseData = responseData,
            ErrorCode = errorCode,
            ErrorMessage = errorMessage
        };
    }

    private static (string? SessionId, string? Status, string? OrderId) ExtractIdentifiers(object? responseData, string? responseBody)
    {
        if (TryExtractIdentifiersFromObject(responseData, out var fromObject))
        {
            return fromObject;
        }

        if (TryExtractIdentifiersFromJson(responseBody, out var fromJson))
        {
            return fromJson;
        }

        return (null, null, null);
    }

    private static bool TryExtractIdentifiersFromObject(
        object? payload,
        out (string? SessionId, string? Status, string? OrderId) identifiers)
    {
        identifiers = (null, null, null);
        if (payload == null)
        {
            return false;
        }

        try
        {
            var json = JsonSerializer.Serialize(payload, SnapshotJsonOptions);
            return TryExtractIdentifiersFromJson(json, out identifiers);
        }
        catch (Exception)
        {
            return false;
        }
    }

    private static bool TryExtractIdentifiersFromJson(
        string? json,
        out (string? SessionId, string? Status, string? OrderId) identifiers)
    {
        identifiers = (null, null, null);
        if (string.IsNullOrWhiteSpace(json))
        {
            return false;
        }

        try
        {
            using var document = JsonDocument.Parse(json);
            var root = document.RootElement;

            identifiers = (
                SessionId: TryReadStringProperty(root, "id", "session_id", "sessionId"),
                Status: TryReadStringProperty(root, "status"),
                OrderId: TryReadStringProperty(root, "order_id", "orderId"));

            return identifiers.SessionId != null || identifiers.Status != null || identifiers.OrderId != null;
        }
        catch (JsonException)
        {
            return false;
        }
    }

    private static string? TryReadStringProperty(JsonElement element, params string[] names)
    {
        foreach (var name in names)
        {
            if (element.TryGetProperty(name, out var property))
            {
                if (property.ValueKind == JsonValueKind.String)
                {
                    var value = property.GetString();
                    if (!string.IsNullOrWhiteSpace(value))
                    {
                        return value;
                    }
                }

                if (property.ValueKind is JsonValueKind.Number or JsonValueKind.True or JsonValueKind.False)
                {
                    return property.ToString();
                }
            }
        }

        return null;
    }

    private List<string> GetConfiguredCapabilities()
    {
        List<string> capabilities = [];

        if (_protocolSettings.Ucp.Capabilities.Checkout)
        {
            capabilities.Add(UcpCapabilityNames.Checkout);
        }

        if (_protocolSettings.Ucp.Capabilities.Order)
        {
            capabilities.Add(UcpCapabilityNames.Order);
        }

        if (_protocolSettings.Ucp.Capabilities.IdentityLinking)
        {
            capabilities.Add(UcpCapabilityNames.IdentityLinking);
        }

        return capabilities;
    }

    private List<string> GetConfiguredExtensions()
    {
        List<string> extensions = [];

        if (_protocolSettings.Ucp.Extensions.Discount)
        {
            extensions.Add(UcpExtensionNames.Discount);
        }

        if (_protocolSettings.Ucp.Extensions.Fulfillment)
        {
            extensions.Add(UcpExtensionNames.Fulfillment);
        }

        if (_protocolSettings.Ucp.Extensions.BuyerConsent)
        {
            extensions.Add(UcpExtensionNames.BuyerConsent);
        }

        if (_protocolSettings.Ucp.Extensions.Ap2Mandates)
        {
            extensions.Add(UcpExtensionNames.Ap2Mandates);
        }

        return extensions;
    }

    private static UcpCreateSessionRequestDto MapCreatePayload(UcpFlowTestCreateSessionPayloadDto? request)
    {
        return new UcpCreateSessionRequestDto
        {
            LineItems = MapLineItems(request?.LineItems),
            Currency = NormalizeNullableString(request?.Currency),
            Buyer = MapBuyer(request?.Buyer),
            Discounts = MapDiscounts(request?.Discounts),
            Fulfillment = MapFulfillment(request?.Fulfillment)
        };
    }

    private static UcpUpdateSessionRequestDto MapUpdatePayload(UcpFlowTestUpdateSessionPayloadDto? request)
    {
        return new UcpUpdateSessionRequestDto
        {
            LineItems = MapLineItems(request?.LineItems),
            Buyer = MapBuyer(request?.Buyer),
            Discounts = MapDiscounts(request?.Discounts),
            Fulfillment = MapFulfillment(request?.Fulfillment)
        };
    }

    private static UcpCompleteSessionRequestDto MapCompletePayload(UcpFlowTestCompleteSessionPayloadDto? request)
    {
        return new UcpCompleteSessionRequestDto
        {
            PaymentHandlerId = NormalizeNullableString(request?.PaymentHandlerId),
            PaymentInstrument = MapPaymentInstrument(request?.PaymentInstrument)
        };
    }

    private static List<UcpLineItemRequestDto>? MapLineItems(List<UcpFlowTestLineItemDto>? lineItems)
    {
        if (lineItems == null || lineItems.Count == 0)
        {
            return null;
        }

        var mapped = lineItems
            .Select(MapLineItem)
            .Where(x => x != null)
            .Cast<UcpLineItemRequestDto>()
            .ToList();

        return mapped.Count > 0 ? mapped : null;
    }

    private static UcpLineItemRequestDto? MapLineItem(UcpFlowTestLineItemDto? lineItem)
    {
        if (lineItem == null)
        {
            return null;
        }

        return new UcpLineItemRequestDto
        {
            Id = NormalizeNullableString(lineItem.Id),
            Item = MapItem(lineItem.Item),
            Quantity = lineItem.Quantity <= 0 ? 1 : lineItem.Quantity
        };
    }

    private static UcpItemInfoDto? MapItem(UcpFlowTestItemInfoDto? item)
    {
        if (item == null)
        {
            return null;
        }

        return new UcpItemInfoDto
        {
            Id = NormalizeNullableString(item.Id),
            Title = NormalizeNullableString(item.Title),
            Price = item.Price,
            ImageUrl = NormalizeNullableString(item.ImageUrl),
            Url = NormalizeNullableString(item.Url),
            Options = MapItemOptions(item.Options)
        };
    }

    private static List<UcpItemOptionDto>? MapItemOptions(List<UcpFlowTestItemOptionDto>? options)
    {
        if (options == null || options.Count == 0)
        {
            return null;
        }

        var mapped = options
            .Select(option => new UcpItemOptionDto
            {
                Name = NormalizeNullableString(option.Name),
                Value = NormalizeNullableString(option.Value)
            })
            .Where(option => !string.IsNullOrWhiteSpace(option.Name) || !string.IsNullOrWhiteSpace(option.Value))
            .ToList();

        return mapped.Count > 0 ? mapped : null;
    }

    private static UcpBuyerInfoDto? MapBuyer(UcpFlowTestBuyerInfoDto? buyer)
    {
        if (buyer == null)
        {
            return null;
        }

        var mapped = new UcpBuyerInfoDto
        {
            Email = NormalizeNullableString(buyer.Email),
            Phone = NormalizeNullableString(buyer.Phone),
            BillingAddress = MapAddress(buyer.BillingAddress),
            ShippingAddress = MapAddress(buyer.ShippingAddress),
            ShippingSameAsBilling = buyer.ShippingSameAsBilling
        };

        return mapped.Email == null &&
               mapped.Phone == null &&
               mapped.BillingAddress == null &&
               mapped.ShippingAddress == null &&
               mapped.ShippingSameAsBilling == null
            ? null
            : mapped;
    }

    private static UcpAddressDto? MapAddress(UcpFlowTestAddressDto? address)
    {
        if (address == null)
        {
            return null;
        }

        var mapped = new UcpAddressDto
        {
            GivenName = NormalizeNullableString(address.GivenName),
            FamilyName = NormalizeNullableString(address.FamilyName),
            Organization = NormalizeNullableString(address.Organization),
            AddressLine1 = NormalizeNullableString(address.AddressLine1),
            AddressLine2 = NormalizeNullableString(address.AddressLine2),
            Locality = NormalizeNullableString(address.Locality),
            AdministrativeArea = NormalizeNullableString(address.AdministrativeArea),
            PostalCode = NormalizeNullableString(address.PostalCode),
            CountryCode = NormalizeNullableString(address.CountryCode),
            Phone = NormalizeNullableString(address.Phone)
        };

        return mapped.GivenName == null &&
               mapped.FamilyName == null &&
               mapped.Organization == null &&
               mapped.AddressLine1 == null &&
               mapped.AddressLine2 == null &&
               mapped.Locality == null &&
               mapped.AdministrativeArea == null &&
               mapped.PostalCode == null &&
               mapped.CountryCode == null &&
               mapped.Phone == null
            ? null
            : mapped;
    }

    private static UcpDiscountsRequestDto? MapDiscounts(UcpFlowTestDiscountsDto? discounts)
    {
        if (discounts?.Codes == null || discounts.Codes.Count == 0)
        {
            return null;
        }

        var codes = discounts.Codes
            .Select(NormalizeNullableString)
            .Where(code => !string.IsNullOrWhiteSpace(code))
            .Cast<string>()
            .Distinct(StringComparer.OrdinalIgnoreCase)
            .ToList();

        return codes.Count == 0
            ? null
            : new UcpDiscountsRequestDto
            {
                Codes = codes
            };
    }

    private static UcpFulfillmentRequestDto? MapFulfillment(UcpFlowTestFulfillmentDto? fulfillment)
    {
        if (fulfillment == null)
        {
            return null;
        }

        var methods = MapFulfillmentMethods(fulfillment.Methods);
        var groups = MapFulfillmentGroupSelections(fulfillment.Groups);

        if (methods == null && groups == null)
        {
            return null;
        }

        return new UcpFulfillmentRequestDto
        {
            Methods = methods,
            Groups = groups
        };
    }

    private static List<UcpFulfillmentMethodRequestDto>? MapFulfillmentMethods(List<UcpFlowTestFulfillmentMethodDto>? methods)
    {
        if (methods == null || methods.Count == 0)
        {
            return null;
        }

        var mapped = methods
            .Select(method => new UcpFulfillmentMethodRequestDto
            {
                Type = NormalizeNullableString(method.Type),
                Destinations = MapFulfillmentDestinations(method.Destinations),
                Groups = MapFulfillmentGroupSelections(method.Groups)
            })
            .Where(method => method.Type != null || method.Destinations != null || method.Groups != null)
            .ToList();

        return mapped.Count > 0 ? mapped : null;
    }

    private static List<UcpFulfillmentDestinationDto>? MapFulfillmentDestinations(List<UcpFlowTestFulfillmentDestinationDto>? destinations)
    {
        if (destinations == null || destinations.Count == 0)
        {
            return null;
        }

        var mapped = destinations
            .Select(destination => new UcpFulfillmentDestinationDto
            {
                Type = NormalizeNullableString(destination.Type),
                Address = MapAddress(destination.Address)
            })
            .Where(destination => destination.Type != null || destination.Address != null)
            .ToList();

        return mapped.Count > 0 ? mapped : null;
    }

    private static List<UcpFulfillmentGroupSelectionDto>? MapFulfillmentGroupSelections(List<UcpFlowTestFulfillmentGroupSelectionDto>? groups)
    {
        if (groups == null || groups.Count == 0)
        {
            return null;
        }

        var mapped = groups
            .Select(group => new UcpFulfillmentGroupSelectionDto
            {
                Id = NormalizeNullableString(group.Id),
                SelectedOptionId = NormalizeNullableString(group.SelectedOptionId)
            })
            .Where(group => group.Id != null || group.SelectedOptionId != null)
            .ToList();

        return mapped.Count > 0 ? mapped : null;
    }

    private static UcpPaymentInstrumentDto? MapPaymentInstrument(UcpFlowTestPaymentInstrumentDto? paymentInstrument)
    {
        if (paymentInstrument == null)
        {
            return null;
        }

        var mapped = new UcpPaymentInstrumentDto
        {
            Type = NormalizeNullableString(paymentInstrument.Type),
            Token = NormalizeNullableString(paymentInstrument.Token),
            Data = MapPaymentDataDictionary(paymentInstrument.Data)
        };

        return mapped.Type == null && mapped.Token == null && mapped.Data == null
            ? null
            : mapped;
    }

    private static Dictionary<string, object>? MapPaymentDataDictionary(Dictionary<string, object>? data)
    {
        if (data == null || data.Count == 0)
        {
            return null;
        }

        Dictionary<string, object> mapped = [];

        foreach (var (key, value) in data)
        {
            var normalizedKey = NormalizeNullableString(key);
            if (normalizedKey == null || value == null)
            {
                continue;
            }

            mapped[normalizedKey] = value;
        }

        return mapped.Count > 0 ? mapped : null;
    }

    private static string? NormalizeNullableString(string? value)
    {
        if (string.IsNullOrWhiteSpace(value))
        {
            return null;
        }

        return value.Trim();
    }
}
