using Merchello.Core.Email.Models;
using Merchello.Core.Email.Services.Interfaces;
using Merchello.Core.Fulfilment.Models;
using Merchello.Core.Fulfilment.Notifications;
using Merchello.Core.Fulfilment.Providers.SupplierDirect.Csv;
using Merchello.Core.Fulfilment.Providers.SupplierDirect.Models;
using Merchello.Core.Fulfilment.Providers.SupplierDirect.Transport;
using Merchello.Core.Shared.Extensions;
using Merchello.Core.Shared.Models.Enums;
using Merchello.Core.Shared.Providers;
using Microsoft.Extensions.Logging;

namespace Merchello.Core.Fulfilment.Providers.SupplierDirect;

/// <summary>
/// Built-in fulfilment provider for direct supplier order transmission.
/// Supports email delivery plus FTP/SFTP file transfer.
/// </summary>
public sealed class SupplierDirectFulfilmentProvider : FulfilmentProviderBase
{
    private readonly IEmailConfigurationService _emailConfigurationService;
    private readonly IEmailService _emailService;
    private readonly IFtpClientFactory _ftpClientFactory;
    private readonly SupplierDirectCsvGenerator _csvGenerator;
    private readonly ILogger<SupplierDirectFulfilmentProvider> _logger;

    private const bool SendCopyToStore = true;
    private const bool FtpPassiveMode = true;
    private const bool FtpUseTls = true;
    private const int TimeoutSeconds = SupplierDirectProviderDefaults.DefaultTimeoutSeconds;
    private const bool OverwriteExistingFiles = false;

    public SupplierDirectFulfilmentProvider(
        IEmailConfigurationService emailConfigurationService,
        IEmailService emailService,
        IFtpClientFactory ftpClientFactory,
        SupplierDirectCsvGenerator csvGenerator,
        ILogger<SupplierDirectFulfilmentProvider> logger)
    {
        _emailConfigurationService = emailConfigurationService;
        _emailService = emailService;
        _ftpClientFactory = ftpClientFactory;
        _csvGenerator = csvGenerator;
        _logger = logger;
    }

    /// <inheritdoc />
    public override FulfilmentProviderMetadata Metadata => new()
    {
        Key = SupplierDirectProviderDefaults.ProviderKey,
        DisplayName = SupplierDirectProviderDefaults.DisplayName,
        Description = SupplierDirectProviderDefaults.Description,
        Icon = "icon-mailbox",
        IconSvg = SupplierDirectIcon.Svg,
        SetupInstructions = SupplierDirectProviderDefaults.SetupInstructions,
        SupportsOrderSubmission = true,
        SupportsOrderCancellation = false, // Can't "unsend" deliveries.
        SupportsWebhooks = false,
        SupportsPolling = false,
        SupportsProductSync = false,
        SupportsInventorySync = false,
        CreatesShipmentOnSubmission = true,
        ApiStyle = FulfilmentApiStyle.Sftp
    };

    #region Configuration

    /// <inheritdoc />
    public override ValueTask<IEnumerable<ProviderConfigurationField>> GetConfigurationFieldsAsync(
        CancellationToken cancellationToken = default)
    {
        return ValueTask.FromResult<IEnumerable<ProviderConfigurationField>>([]);
    }

    /// <inheritdoc />
    public override ValueTask ConfigureAsync(
        FulfilmentProviderConfiguration? configuration,
        CancellationToken cancellationToken = default)
    {
        return base.ConfigureAsync(configuration, cancellationToken);
    }

    #endregion

    #region Order Submission

    /// <inheritdoc />
    public override async Task<FulfilmentOrderResult> SubmitOrderAsync(
        FulfilmentOrderRequest request,
        CancellationToken cancellationToken = default)
    {
        var profile = ResolveSupplierProfile(request.ExtendedData);

        var supplierName = request.ExtendedData.GetValueOrDefault("SupplierName")?.UnwrapJsonElement()?.ToString() ?? "Unknown Supplier";
        var supplierEmail = request.ExtendedData.GetValueOrDefault("SupplierContactEmail")?.UnwrapJsonElement()?.ToString();

        if (profile == null)
        {
            return FulfilmentOrderResult.Failed(
                $"Supplier '{supplierName}' is missing a Supplier Direct delivery profile. Configure Email/FTP/SFTP on the supplier before submitting orders.",
                ErrorClassification.ConfigurationError.ToString());
        }

        var deliveryMethod = ResolveDeliveryMethod(request.ExtendedData, profile);

        return deliveryMethod switch
        {
            SupplierDirectDeliveryMethod.Email => await SubmitViaEmailAsync(
                request,
                supplierName,
                supplierEmail,
                profile,
                cancellationToken),
            SupplierDirectDeliveryMethod.Ftp => await SubmitViaFileTransferAsync(
                request,
                profile,
                useSftp: false,
                cancellationToken),
            SupplierDirectDeliveryMethod.Sftp => await SubmitViaFileTransferAsync(
                request,
                profile,
                useSftp: true,
                cancellationToken),
            _ => FulfilmentOrderResult.Failed($"Unknown delivery method: {deliveryMethod}")
        };
    }

    private async Task<FulfilmentOrderResult> SubmitViaEmailAsync(
        FulfilmentOrderRequest request,
        string supplierName,
        string? supplierEmail,
        SupplierDirectProfile profile,
        CancellationToken cancellationToken)
    {
        var explicitEmail = GetExtendedDataString(request.ExtendedData, SupplierDirectExtendedDataKeys.OrderEmail);
        var profileEmail = profile.EmailSettings?.RecipientEmail;
        var targetEmail = FirstNonEmpty(explicitEmail, profileEmail, supplierEmail);

        if (string.IsNullOrWhiteSpace(targetEmail))
        {
            return FulfilmentOrderResult.Failed(
                "No supplier email address configured. Set Supplier Direct email recipient or supplier contact email.",
                ErrorClassification.ConfigurationError.ToString());
        }

        var resolvedSubject = SupplierDirectProviderDefaults.DefaultEmailSubjectTemplate
            .Replace("{OrderNumber}", request.OrderNumber)
            .Replace("{SupplierName}", supplierName);

        var emailConfigs = await _emailConfigurationService.GetEnabledByTopicAsync(
            Constants.EmailTopics.FulfilmentSupplierOrder,
            cancellationToken);

        if (emailConfigs.Count == 0)
        {
            return FulfilmentOrderResult.Failed(
                $"No enabled email configuration found for topic '{Constants.EmailTopics.FulfilmentSupplierOrder}'.",
                ErrorClassification.ConfigurationError.ToString());
        }

        var notification = new SupplierOrderNotification(
            request,
            supplierName,
            targetEmail,
            resolvedSubject);
        var profileCcAddresses = profile?.EmailSettings?.CcAddresses;

        Guid? firstQueuedDeliveryId = null;
        List<string> queueErrors = [];

        foreach (var config in emailConfigs)
        {
            try
            {
                var runtimeConfig = BuildRuntimeEmailConfiguration(
                    config,
                    targetEmail,
                    resolvedSubject,
                    SendCopyToStore,
                    profileCcAddresses);
                var delivery = await _emailService.QueueDeliveryAsync(
                    runtimeConfig,
                    notification,
                    request.OrderId,
                    "Order",
                    cancellationToken);

                if (delivery.Status == OutboundDeliveryStatus.Failed || delivery.Status == OutboundDeliveryStatus.Abandoned)
                {
                    queueErrors.Add($"{config.Name}: {delivery.ErrorMessage ?? "Queueing failed"}");
                    continue;
                }

                firstQueuedDeliveryId ??= delivery.Id;
            }
            catch (Exception ex)
            {
                var safeError = SupplierDirectSecretRedactor.RedactSecrets(ex.Message);
                queueErrors.Add($"{config.Name}: {safeError}");
            }
        }

        if (!firstQueuedDeliveryId.HasValue)
        {
            var error = queueErrors.Count > 0
                ? string.Join("; ", queueErrors)
                : "Failed to queue supplier order email.";
            return FulfilmentOrderResult.Failed(error, ErrorClassification.Unknown.ToString());
        }

        var providerReference = $"email:{firstQueuedDeliveryId.Value}";
        _logger.LogInformation(
            "Supplier order {OrderNumber} queued for email delivery to {SupplierEmail}. Reference: {Reference}",
            request.OrderNumber,
            targetEmail,
            providerReference);

        return new FulfilmentOrderResult
        {
            Success = true,
            ProviderReference = providerReference,
            ExtendedData = new Dictionary<string, object>
            {
                ["SupplierEmail"] = targetEmail,
                ["DeliveryMethod"] = SupplierDirectDeliveryMethod.Email.ToString()
            }
        };
    }

    private async Task<FulfilmentOrderResult> SubmitViaFileTransferAsync(
        FulfilmentOrderRequest request,
        SupplierDirectProfile profile,
        bool useSftp,
        CancellationToken cancellationToken)
    {
        var resolvedTransfer = ResolveTransferSettings(profile, request.ExtendedData, useSftp);
        var validationErrors = GetTransferValidationErrors(resolvedTransfer).ToList();
        if (validationErrors.Count > 0)
        {
            return FulfilmentOrderResult.Failed(
                string.Join("; ", validationErrors),
                ErrorClassification.ConfigurationError.ToString());
        }

        try
        {
            var csvBytes = _csvGenerator.Generate(request, CsvColumnMapping.Default);
            var fileName = ResolveFileName(request);
            var remoteFilePath = BuildRemoteFilePath(resolvedTransfer.ConnectionSettings.RemotePath, fileName);
            var uploadMode = resolvedTransfer.ConnectionSettings.UseSftp ? "SFTP" : "FTP";

            await using var client = await _ftpClientFactory.CreateClientAsync(resolvedTransfer.ConnectionSettings, cancellationToken);
            var uploaded = await client.UploadFileAsync(
                remoteFilePath,
                csvBytes,
                resolvedTransfer.OverwriteExistingFiles,
                cancellationToken);

            if (!uploaded)
            {
                if (!resolvedTransfer.OverwriteExistingFiles)
                {
                    // Deterministic filename + existing file is considered idempotent success on retry.
                    var alreadyExists = await client.FileExistsAsync(remoteFilePath, cancellationToken);
                    if (alreadyExists)
                    {
                        _logger.LogInformation(
                            "Supplier order {OrderNumber} treated as idempotent success because file already exists at {RemotePath}.",
                            request.OrderNumber,
                            remoteFilePath);
                    }
                    else
                    {
                        return FulfilmentOrderResult.Failed(
                            $"Failed to upload supplier order file to {remoteFilePath}.",
                            ErrorClassification.Unknown.ToString());
                    }
                }
                else
                {
                    return FulfilmentOrderResult.Failed(
                        $"Failed to upload supplier order file to {remoteFilePath}.",
                        ErrorClassification.Unknown.ToString());
                }
            }

            var referencePrefix = resolvedTransfer.ConnectionSettings.UseSftp ? "sftp" : "ftp";
            var providerReference = $"{referencePrefix}:{remoteFilePath}";

            _logger.LogInformation(
                "Supplier order {OrderNumber} uploaded via {Mode} to {RemotePath}. Reference: {Reference}",
                request.OrderNumber,
                uploadMode,
                remoteFilePath,
                providerReference);

            return new FulfilmentOrderResult
            {
                Success = true,
                ProviderReference = providerReference,
                ExtendedData = new Dictionary<string, object>
                {
                    ["DeliveryMethod"] = resolvedTransfer.ConnectionSettings.UseSftp
                        ? SupplierDirectDeliveryMethod.Sftp.ToString()
                        : SupplierDirectDeliveryMethod.Ftp.ToString(),
                    ["RemotePath"] = remoteFilePath,
                    ["FileName"] = fileName
                }
            };
        }
        catch (Exception ex)
        {
            var classification = SupplierDirectErrorClassifier.Classify(ex);
            var safeError = SupplierDirectSecretRedactor.RedactSecrets(ex.Message);

            _logger.LogError(
                "Supplier order file transfer failed for {OrderNumber}. Classification: {Classification}. Error: {Error}",
                request.OrderNumber,
                classification,
                safeError);

            return FulfilmentOrderResult.Failed(
                $"Supplier order file transfer failed: {safeError}",
                classification.ToString());
        }
    }

    #endregion

    #region Connection Testing

    /// <inheritdoc />
    public override async Task<FulfilmentConnectionTestResult> TestConnectionAsync(CancellationToken cancellationToken = default)
    {
        var emailConfigs = await _emailConfigurationService.GetEnabledByTopicAsync(
            Constants.EmailTopics.FulfilmentSupplierOrder,
            cancellationToken);

        var emailSummary = emailConfigs.Count > 0
            ? $"{emailConfigs.Count} email config(s)"
            : "no email topic configuration";

        return new FulfilmentConnectionTestResult
        {
            Success = true,
            ProviderVersion = "1.0",
            AccountName = $"Supplier Direct (per-supplier only, {emailSummary})"
        };
    }

    #endregion

    private static SupplierDirectProfile? ResolveSupplierProfile(IReadOnlyDictionary<string, object> extendedData)
    {
        var rawProfile = GetExtendedDataString(extendedData, SupplierDirectExtendedDataKeys.Profile);
        return SupplierDirectProfile.FromJson(rawProfile);
    }

    private static SupplierDirectDeliveryMethod ResolveDeliveryMethod(
        IReadOnlyDictionary<string, object> extendedData,
        SupplierDirectProfile profile)
    {
        var methodValue = GetExtendedDataString(extendedData, SupplierDirectExtendedDataKeys.DeliveryMethod);
        if (Enum.TryParse<SupplierDirectDeliveryMethod>(methodValue, true, out var explicitMethod))
        {
            return explicitMethod;
        }

        return profile.DeliveryMethod;
    }

    private static EmailConfiguration BuildRuntimeEmailConfiguration(
        EmailConfiguration source,
        string targetEmail,
        string subject,
        bool sendCopyToStore,
        IEnumerable<string>? additionalCcAddresses)
    {
        return new EmailConfiguration
        {
            Id = source.Id,
            Name = source.Name,
            Topic = source.Topic,
            Enabled = source.Enabled,
            TemplatePath = source.TemplatePath,
            ToExpression = targetEmail,
            CcExpression = BuildCcExpression(source.CcExpression, additionalCcAddresses, sendCopyToStore),
            BccExpression = sendCopyToStore ? source.BccExpression : null,
            FromExpression = source.FromExpression,
            SubjectExpression = subject,
            Description = source.Description,
            DateCreated = source.DateCreated,
            DateModified = source.DateModified,
            TotalSent = source.TotalSent,
            TotalFailed = source.TotalFailed,
            LastSentUtc = source.LastSentUtc,
            ExtendedData = new Dictionary<string, object>(source.ExtendedData),
            AttachmentAliases = source.AttachmentAliases.ToList()
        };
    }

    private static string? BuildCcExpression(
        string? sourceCcExpression,
        IEnumerable<string>? additionalCcAddresses,
        bool includeSourceCcExpression)
    {
        var additional = additionalCcAddresses?
            .Where(x => !string.IsNullOrWhiteSpace(x))
            .Select(x => x.Trim())
            .Distinct(StringComparer.OrdinalIgnoreCase)
            .ToList() ?? [];

        var includeSource = includeSourceCcExpression && !string.IsNullOrWhiteSpace(sourceCcExpression);
        if (!includeSource && additional.Count == 0)
        {
            return null;
        }

        if (!includeSource)
        {
            return string.Join(", ", additional);
        }

        if (additional.Count == 0)
        {
            return sourceCcExpression;
        }

        return $"{sourceCcExpression}, {string.Join(", ", additional)}";
    }

    private static ResolvedTransferSettings ResolveTransferSettings(
        SupplierDirectProfile profile,
        IReadOnlyDictionary<string, object>? extendedData,
        bool useSftp)
    {
        var profileFtp = profile.FtpSettings;

        var host = FirstNonEmpty(
            GetExtendedDataString(extendedData, SupplierDirectExtendedDataKeys.FtpHost),
            profileFtp?.Host);

        var username = FirstNonEmpty(
            GetExtendedDataString(extendedData, SupplierDirectExtendedDataKeys.FtpUsername),
            profileFtp?.Username);

        var password = FirstNonEmpty(
            GetExtendedDataString(extendedData, SupplierDirectExtendedDataKeys.FtpPassword),
            profileFtp?.Password);

        var defaultPort = useSftp
            ? SupplierDirectProviderDefaults.DefaultSftpPort
            : SupplierDirectProviderDefaults.DefaultFtpPort;
        var port = GetExtendedDataInt(extendedData, SupplierDirectExtendedDataKeys.FtpPort)
                   ?? profileFtp?.Port
                   ?? defaultPort;

        var remotePath = FirstNonEmpty(
            GetExtendedDataString(extendedData, SupplierDirectExtendedDataKeys.FtpRemotePath),
            profileFtp?.RemotePath,
            SupplierDirectProviderDefaults.DefaultRemotePath)
            ?? SupplierDirectProviderDefaults.DefaultRemotePath;

        var fingerprint = FirstNonEmpty(
            GetExtendedDataString(extendedData, SupplierDirectExtendedDataKeys.SftpHostFingerprint),
            profileFtp?.HostFingerprint);

        return new ResolvedTransferSettings
        {
            ConnectionSettings = new FtpConnectionSettings
            {
                Host = host ?? string.Empty,
                Port = port,
                Username = username ?? string.Empty,
                Password = password ?? string.Empty,
                RemotePath = CsvSanitizer.SanitizeRemotePath(remotePath),
                UseSftp = useSftp,
                HostFingerprint = fingerprint,
                UsePassiveMode = FtpPassiveMode,
                UseTls = !useSftp && FtpUseTls,
                TimeoutSeconds = TimeoutSeconds
            },
            OverwriteExistingFiles = OverwriteExistingFiles
        };
    }

    private static IEnumerable<string> GetTransferValidationErrors(ResolvedTransferSettings settings)
    {
        if (string.IsNullOrWhiteSpace(settings.ConnectionSettings.Host))
        {
            yield return "FTP/SFTP host is required";
        }

        if (string.IsNullOrWhiteSpace(settings.ConnectionSettings.Username))
        {
            yield return "FTP/SFTP username is required";
        }

        if (string.IsNullOrWhiteSpace(settings.ConnectionSettings.Password))
        {
            yield return "FTP/SFTP password is required";
        }

        if (settings.ConnectionSettings.Port <= 0)
        {
            yield return "FTP/SFTP port must be greater than 0";
        }

        if (settings.ConnectionSettings.TimeoutSeconds <= 0)
        {
            yield return "TimeoutSeconds must be greater than 0";
        }
    }

    private static string ResolveFileName(FulfilmentOrderRequest request)
    {
        var resolved = SupplierDirectCsvGenerator.GenerateFileName(request);
        resolved = CsvSanitizer.SanitizeFileName(resolved);
        return string.IsNullOrWhiteSpace(resolved)
            ? SupplierDirectCsvGenerator.GenerateFileName(request)
            : resolved;
    }

    private static string BuildRemoteFilePath(string remoteDirectory, string fileName)
    {
        var safeRemotePath = CsvSanitizer.SanitizeRemotePath(remoteDirectory);
        if (!safeRemotePath.EndsWith('/'))
        {
            safeRemotePath += '/';
        }

        var safeFileName = CsvSanitizer.SanitizeFileName(fileName);
        return $"{safeRemotePath}{safeFileName}";
    }

    private static string? GetExtendedDataString(IReadOnlyDictionary<string, object>? extendedData, string key)
    {
        if (extendedData == null || !extendedData.TryGetValue(key, out var value))
        {
            return null;
        }

        return value.UnwrapJsonElement()?.ToString();
    }

    private static int? GetExtendedDataInt(IReadOnlyDictionary<string, object>? extendedData, string key)
    {
        var raw = GetExtendedDataString(extendedData, key);
        return int.TryParse(raw, out var parsed) ? parsed : null;
    }

    private static string? FirstNonEmpty(params string?[] values)
    {
        return values.FirstOrDefault(value => !string.IsNullOrWhiteSpace(value));
    }

    private sealed record ResolvedTransferSettings
    {
        public required FtpConnectionSettings ConnectionSettings { get; init; }
        public bool OverwriteExistingFiles { get; init; }
    }
}
