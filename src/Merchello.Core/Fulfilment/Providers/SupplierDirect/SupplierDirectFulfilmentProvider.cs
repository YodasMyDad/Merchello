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
    private SupplierDirectSettings? _settings;

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
        return ValueTask.FromResult<IEnumerable<ProviderConfigurationField>>(
        [
            new ProviderConfigurationField
            {
                Key = "DefaultDeliveryMethod",
                Label = "Default Delivery Method",
                FieldType = ConfigurationFieldType.Select,
                IsRequired = true,
                DefaultValue = "Email",
                Description = "How orders are sent to suppliers by default",
                Options =
                [
                    new SelectOption { Value = "Email", Label = "Email" },
                    new SelectOption { Value = "Ftp", Label = "FTP" },
                    new SelectOption { Value = "Sftp", Label = "SFTP (Secure)" }
                ]
            },
            new ProviderConfigurationField
            {
                Key = "DefaultSupplierEmail",
                Label = "Fallback Supplier Email",
                FieldType = ConfigurationFieldType.Text,
                IsRequired = false,
                Description = "Used when supplier has no ContactEmail configured"
            },
            new ProviderConfigurationField
            {
                Key = "EmailSubjectTemplate",
                Label = "Email Subject Template",
                FieldType = ConfigurationFieldType.Text,
                IsRequired = false,
                DefaultValue = SupplierDirectProviderDefaults.DefaultEmailSubjectTemplate,
                Description = "Template for email subject. Supports {OrderNumber}, {SupplierName}"
            },
            new ProviderConfigurationField
            {
                Key = "SendCopyToStore",
                Label = "Send Copy To Store",
                FieldType = ConfigurationFieldType.Checkbox,
                IsRequired = false,
                DefaultValue = "true",
                Description = "When disabled, CC/BCC on the supplier email configuration are ignored"
            },
            new ProviderConfigurationField
            {
                Key = "FtpHost",
                Label = "FTP/SFTP Host",
                FieldType = ConfigurationFieldType.Text,
                IsRequired = false,
                Description = "Default FTP/SFTP server address",
                Placeholder = "ftp.supplier.com"
            },
            new ProviderConfigurationField
            {
                Key = "FtpPort",
                Label = "FTP Port",
                FieldType = ConfigurationFieldType.Number,
                IsRequired = false,
                DefaultValue = SupplierDirectProviderDefaults.DefaultFtpPort.ToString(),
                Description = "Port used when delivery method is FTP"
            },
            new ProviderConfigurationField
            {
                Key = "SftpPort",
                Label = "SFTP Port",
                FieldType = ConfigurationFieldType.Number,
                IsRequired = false,
                DefaultValue = SupplierDirectProviderDefaults.DefaultSftpPort.ToString(),
                Description = "Port used when delivery method is SFTP"
            },
            new ProviderConfigurationField
            {
                Key = "FtpUsername",
                Label = "FTP/SFTP Username",
                FieldType = ConfigurationFieldType.Text,
                IsRequired = false,
                Description = "Default FTP/SFTP username"
            },
            new ProviderConfigurationField
            {
                Key = "FtpPassword",
                Label = "FTP/SFTP Password",
                FieldType = ConfigurationFieldType.Password,
                IsRequired = false,
                IsSensitive = true,
                Description = "Default FTP/SFTP password"
            },
            new ProviderConfigurationField
            {
                Key = "FtpRemotePath",
                Label = "Remote Path",
                FieldType = ConfigurationFieldType.Text,
                IsRequired = false,
                DefaultValue = SupplierDirectProviderDefaults.DefaultRemotePath,
                Description = "Default directory for file uploads"
            },
            new ProviderConfigurationField
            {
                Key = "SftpHostFingerprint",
                Label = "SFTP Host Fingerprint",
                FieldType = ConfigurationFieldType.Text,
                IsRequired = false,
                Description = "Optional host fingerprint used to verify the remote SFTP server"
            },
            new ProviderConfigurationField
            {
                Key = "FtpPassiveMode",
                Label = "FTP Passive Mode",
                FieldType = ConfigurationFieldType.Checkbox,
                IsRequired = false,
                DefaultValue = "true",
                Description = "Recommended for most hosted FTP endpoints"
            },
            new ProviderConfigurationField
            {
                Key = "FtpUseTls",
                Label = "FTP TLS",
                FieldType = ConfigurationFieldType.Checkbox,
                IsRequired = false,
                DefaultValue = "true",
                Description = "Use explicit TLS when using FTP mode"
            },
            new ProviderConfigurationField
            {
                Key = "AllowInsecureFtp",
                Label = "Allow Plain FTP",
                FieldType = ConfigurationFieldType.Checkbox,
                IsRequired = false,
                DefaultValue = "false",
                Description = "Explicitly allow insecure FTP mode (SFTP is strongly recommended)"
            },
            new ProviderConfigurationField
            {
                Key = "TimeoutSeconds",
                Label = "Timeout (Seconds)",
                FieldType = ConfigurationFieldType.Number,
                IsRequired = false,
                DefaultValue = SupplierDirectProviderDefaults.DefaultTimeoutSeconds.ToString(),
                Description = "Connection and upload timeout in seconds"
            },
            new ProviderConfigurationField
            {
                Key = "FtpOverwriteExistingFiles",
                Label = "Overwrite Existing Files",
                FieldType = ConfigurationFieldType.Checkbox,
                IsRequired = false,
                DefaultValue = "false",
                Description = "When disabled, deterministic file names make retries idempotent"
            },
            new ProviderConfigurationField
            {
                Key = "FileNamePattern",
                Label = "File Name Pattern",
                FieldType = ConfigurationFieldType.Text,
                IsRequired = false,
                DefaultValue = "{OrderNumber}-{OrderId}.csv",
                Description = "Supports {OrderNumber} and {OrderId} placeholders"
            },
            new ProviderConfigurationField
            {
                Key = "CsvColumnMappingJson",
                Label = "CSV Column Mapping JSON",
                FieldType = ConfigurationFieldType.Textarea,
                IsRequired = false,
                Description = "Optional JSON payload to customize CSV headers and ordering"
            }
        ]);
    }

    /// <inheritdoc />
    public override ValueTask ConfigureAsync(
        FulfilmentProviderConfiguration? configuration,
        CancellationToken cancellationToken = default)
    {
        _settings = configuration?.SettingsJson != null
            ? SupplierDirectSettings.FromJson(configuration.SettingsJson)
            : null;
        return base.ConfigureAsync(configuration, cancellationToken);
    }

    #endregion

    #region Order Submission

    /// <inheritdoc />
    public override async Task<FulfilmentOrderResult> SubmitOrderAsync(
        FulfilmentOrderRequest request,
        CancellationToken cancellationToken = default)
    {
        var settings = _settings ?? new SupplierDirectSettings();
        var profile = ResolveSupplierProfile(request.ExtendedData);

        var supplierName = request.ExtendedData.GetValueOrDefault("SupplierName")?.UnwrapJsonElement()?.ToString() ?? "Unknown Supplier";
        var supplierEmail = request.ExtendedData.GetValueOrDefault("SupplierContactEmail")?.UnwrapJsonElement()?.ToString();

        var deliveryMethod = ResolveDeliveryMethod(request.ExtendedData, profile, settings.DefaultDeliveryMethod);

        return deliveryMethod switch
        {
            SupplierDirectDeliveryMethod.Email => await SubmitViaEmailAsync(
                request,
                supplierName,
                supplierEmail,
                profile,
                settings,
                cancellationToken),
            SupplierDirectDeliveryMethod.Ftp => await SubmitViaFileTransferAsync(
                request,
                settings,
                profile,
                useSftp: false,
                cancellationToken),
            SupplierDirectDeliveryMethod.Sftp => await SubmitViaFileTransferAsync(
                request,
                settings,
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
        SupplierDirectProfile? profile,
        SupplierDirectSettings settings,
        CancellationToken cancellationToken)
    {
        var explicitEmail = GetExtendedDataString(request.ExtendedData, SupplierDirectExtendedDataKeys.OrderEmail);
        var profileEmail = profile?.EmailSettings?.RecipientEmail;
        var targetEmail = FirstNonEmpty(explicitEmail, profileEmail, supplierEmail, settings.DefaultSupplierEmail);

        if (string.IsNullOrWhiteSpace(targetEmail))
        {
            return FulfilmentOrderResult.Failed(
                "No supplier email address configured. Set ContactEmail on the supplier or configure a default.",
                ErrorClassification.ConfigurationError.ToString());
        }

        var resolvedSubject = settings.EmailSubjectTemplate
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
                    settings.SendCopyToStore,
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
        SupplierDirectSettings settings,
        SupplierDirectProfile? profile,
        bool useSftp,
        CancellationToken cancellationToken)
    {
        if (!useSftp && !settings.FtpUseTls && !settings.AllowInsecureFtp)
        {
            return FulfilmentOrderResult.Failed(
                "Plain FTP (without TLS) requires explicit opt-in in provider settings (AllowInsecureFtp).",
                ErrorClassification.ConfigurationError.ToString());
        }

        var resolvedTransfer = ResolveTransferSettings(settings, profile, request.ExtendedData, useSftp);
        var validationErrors = GetTransferValidationErrors(resolvedTransfer).ToList();
        if (validationErrors.Count > 0)
        {
            return FulfilmentOrderResult.Failed(
                string.Join("; ", validationErrors),
                ErrorClassification.ConfigurationError.ToString());
        }

        try
        {
            CsvColumnMapping mapping;
            if (string.IsNullOrWhiteSpace(settings.CsvColumnMappingJson))
            {
                mapping = CsvColumnMapping.Default;
            }
            else
            {
                var parsedMapping = CsvColumnMapping.FromJson(settings.CsvColumnMappingJson);
                if (parsedMapping == null)
                {
                    return FulfilmentOrderResult.Failed(
                        "CsvColumnMappingJson is invalid JSON.",
                        ErrorClassification.ConfigurationError.ToString());
                }

                mapping = parsedMapping;
            }

            var csvBytes = _csvGenerator.Generate(request, mapping);

            var fileName = ResolveFileName(settings.FileNamePattern, request);
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
        var settings = _settings ?? new SupplierDirectSettings();

        if (settings.DefaultDeliveryMethod == SupplierDirectDeliveryMethod.Email)
        {
            var emailConfigs = await _emailConfigurationService.GetEnabledByTopicAsync(
                Constants.EmailTopics.FulfilmentSupplierOrder,
                cancellationToken);

            if (emailConfigs.Count == 0)
            {
                return FulfilmentConnectionTestResult.Failed(
                    $"No enabled email configuration found for topic '{Constants.EmailTopics.FulfilmentSupplierOrder}'.");
            }

            return new FulfilmentConnectionTestResult
            {
                Success = true,
                ProviderVersion = "1.0",
                AccountName = $"Supplier Direct (Email, {emailConfigs.Count} config(s))"
            };
        }

        var useSftp = settings.DefaultDeliveryMethod == SupplierDirectDeliveryMethod.Sftp;
        if (!useSftp && !settings.FtpUseTls && !settings.AllowInsecureFtp)
        {
            return FulfilmentConnectionTestResult.Failed(
                "Plain FTP (without TLS) requires explicit opt-in in provider settings (AllowInsecureFtp).");
        }

        var transferSettings = ResolveTransferSettings(settings, profile: null, extendedData: null, useSftp);
        var validationErrors = GetTransferValidationErrors(transferSettings).ToList();
        if (validationErrors.Count > 0)
        {
            return FulfilmentConnectionTestResult.Failed(string.Join("; ", validationErrors));
        }

        try
        {
            await using var client = await _ftpClientFactory.CreateClientAsync(transferSettings.ConnectionSettings, cancellationToken);
            var testResult = await client.TestConnectionAsync(cancellationToken);

            if (!testResult.Success)
            {
                var safeError = SupplierDirectSecretRedactor.RedactSecrets(testResult.ErrorMessage);
                return FulfilmentConnectionTestResult.Failed(safeError);
            }

            return new FulfilmentConnectionTestResult
            {
                Success = true,
                ProviderVersion = "1.0",
                AccountName = SupplierDirectSecretRedactor.SafeConnectionDescription(
                    transferSettings.ConnectionSettings.Host,
                    transferSettings.ConnectionSettings.Port,
                    transferSettings.ConnectionSettings.Username)
            };
        }
        catch (Exception ex)
        {
            var safeError = SupplierDirectSecretRedactor.RedactSecrets(ex.Message);
            return FulfilmentConnectionTestResult.Failed($"Connection test failed: {safeError}");
        }
    }

    #endregion

    private static SupplierDirectProfile? ResolveSupplierProfile(IReadOnlyDictionary<string, object> extendedData)
    {
        var rawProfile = GetExtendedDataString(extendedData, SupplierDirectExtendedDataKeys.Profile);
        return SupplierDirectProfile.FromJson(rawProfile);
    }

    private static SupplierDirectDeliveryMethod ResolveDeliveryMethod(
        IReadOnlyDictionary<string, object> extendedData,
        SupplierDirectProfile? profile,
        SupplierDirectDeliveryMethod defaultMethod)
    {
        var methodValue = GetExtendedDataString(extendedData, SupplierDirectExtendedDataKeys.DeliveryMethod);
        if (Enum.TryParse<SupplierDirectDeliveryMethod>(methodValue, true, out var explicitMethod))
        {
            return explicitMethod;
        }

        if (profile != null)
        {
            return profile.DeliveryMethod;
        }

        return defaultMethod;
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
        SupplierDirectSettings settings,
        SupplierDirectProfile? profile,
        IReadOnlyDictionary<string, object>? extendedData,
        bool useSftp)
    {
        var profileFtp = profile?.FtpSettings;

        var host = FirstNonEmpty(
            GetExtendedDataString(extendedData, SupplierDirectExtendedDataKeys.FtpHost),
            profileFtp?.Host,
            settings.FtpHost);

        var username = FirstNonEmpty(
            GetExtendedDataString(extendedData, SupplierDirectExtendedDataKeys.FtpUsername),
            profileFtp?.Username,
            settings.FtpUsername);

        var password = FirstNonEmpty(
            GetExtendedDataString(extendedData, SupplierDirectExtendedDataKeys.FtpPassword),
            profileFtp?.Password,
            settings.FtpPassword);

        var defaultPort = useSftp ? settings.SftpPort : settings.FtpPort;
        var port = GetExtendedDataInt(extendedData, SupplierDirectExtendedDataKeys.FtpPort)
                   ?? profileFtp?.Port
                   ?? defaultPort;

        var remotePath = FirstNonEmpty(
            GetExtendedDataString(extendedData, SupplierDirectExtendedDataKeys.FtpRemotePath),
            profileFtp?.RemotePath,
            settings.FtpRemotePath,
            SupplierDirectProviderDefaults.DefaultRemotePath)
            ?? SupplierDirectProviderDefaults.DefaultRemotePath;

        var fingerprint = FirstNonEmpty(
            GetExtendedDataString(extendedData, SupplierDirectExtendedDataKeys.SftpHostFingerprint),
            profileFtp?.HostFingerprint,
            settings.SftpHostFingerprint);

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
                UsePassiveMode = settings.FtpPassiveMode,
                UseTls = settings.FtpUseTls,
                TimeoutSeconds = settings.TimeoutSeconds
            },
            OverwriteExistingFiles = settings.FtpOverwriteExistingFiles
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

    private static string ResolveFileName(string? pattern, FulfilmentOrderRequest request)
    {
        if (string.IsNullOrWhiteSpace(pattern))
        {
            return SupplierDirectCsvGenerator.GenerateFileName(request);
        }

        var resolved = pattern
            .Replace("{OrderNumber}", request.OrderNumber)
            .Replace("{OrderId}", request.OrderId.ToString("N"));

        if (!resolved.EndsWith(".csv", StringComparison.OrdinalIgnoreCase))
        {
            resolved += ".csv";
        }

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
