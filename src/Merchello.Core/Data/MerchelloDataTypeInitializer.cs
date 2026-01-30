using Merchello.Core.Shared.Models;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using Umbraco.Cms.Core.Models;
using Umbraco.Cms.Core.PropertyEditors;
using Umbraco.Cms.Core.Serialization;
using Umbraco.Cms.Core.Services;

namespace Merchello.Core.Data;

/// <summary>
/// Service responsible for ensuring Merchello's required DataTypes exist in Umbraco.
/// This is used to manage configurable property editors (like TipTap for rich text)
/// that users can customize through Umbraco's DataType management UI.
/// Thread-safe singleton service.
/// </summary>
public class MerchelloDataTypeInitializer : IDisposable
{
    private readonly IDataTypeService _dataTypeService;
    private readonly PropertyEditorCollection _propertyEditors;
    private readonly IConfigurationEditorJsonSerializer _serializer;
    private readonly IOptionsMonitor<MerchelloSettings> _settings;
    private readonly ILogger<MerchelloDataTypeInitializer> _logger;

    /// <summary>
    /// Name for the Product Description DataType
    /// </summary>
    public const string PRODUCT_DESCRIPTION_DATATYPE_NAME = "Merchello Product Description [TipTap]";

    /// <summary>
    /// Umbraco RichText property editor schema alias
    /// </summary>
    public const string TIPTAP_PROPERTY_EDITOR_ALIAS = "Umbraco.RichText";

    /// <summary>
    /// TipTap property editor UI alias
    /// </summary>
    public const string TIPTAP_PROPERTY_EDITOR_UI_ALIAS = "Umb.PropertyEditorUi.Tiptap";

    // Thread-safe cache for the DataType key using lock pattern
    private Guid? _cachedDataTypeKey;
    private readonly object _cacheLock = new();
    private readonly SemaphoreSlim _initializationLock = new(1, 1);

    public MerchelloDataTypeInitializer(
        IDataTypeService dataTypeService,
        PropertyEditorCollection propertyEditors,
        IConfigurationEditorJsonSerializer serializer,
        IOptionsMonitor<MerchelloSettings> settings,
        ILogger<MerchelloDataTypeInitializer> logger)
    {
        _dataTypeService = dataTypeService;
        _propertyEditors = propertyEditors;
        _serializer = serializer;
        _settings = settings;
        _logger = logger;
    }

    /// <summary>
    /// Ensures the Product Description DataType exists, creating it if necessary.
    /// Returns the DataType key (GUID) for use by the frontend.
    /// Thread-safe for concurrent calls.
    /// </summary>
    public async Task<Guid> EnsureProductDescriptionDataTypeExistsAsync(CancellationToken ct = default)
    {
        // Fast path: return cached key if already resolved (with lock for thread safety)
        lock (_cacheLock)
        {
            if (_cachedDataTypeKey.HasValue)
            {
                return _cachedDataTypeKey.Value;
            }
        }

        // Serialize initialization to prevent multiple DataType creations
        await _initializationLock.WaitAsync(ct);
        try
        {
            // Double-check after acquiring lock
            lock (_cacheLock)
            {
                if (_cachedDataTypeKey.HasValue)
                {
                    return _cachedDataTypeKey.Value;
                }
            }

            var key = await ResolveOrCreateDataTypeAsync(ct);
            
            // Thread-safe update of cached value
            lock (_cacheLock)
            {
                _cachedDataTypeKey = key;
            }
            
            return key;
        }
        finally
        {
            _initializationLock.Release();
        }
    }

    /// <summary>
    /// Resolves or creates the DataType. Called within initialization lock.
    /// </summary>
    private async Task<Guid> ResolveOrCreateDataTypeAsync(CancellationToken ct)
    {
        // Check if we have a configured key in settings
        var configuredKey = _settings.CurrentValue.ProductDescriptionDataTypeKey;
        if (configuredKey.HasValue)
        {
            var existing = await _dataTypeService.GetAsync(configuredKey.Value);
            if (existing != null)
            {
                _logger.LogDebug("Using configured Product Description DataType: {Key}", configuredKey.Value);
                return configuredKey.Value;
            }
            _logger.LogWarning("Configured ProductDescriptionDataTypeKey {Key} not found, will check for or create DataType", configuredKey.Value);
        }

        // Check if a DataType with our name already exists
        var allDataTypes = await _dataTypeService.GetAllAsync();
        var dataType = allDataTypes.FirstOrDefault(dt =>
            dt.Name?.Equals(PRODUCT_DESCRIPTION_DATATYPE_NAME, StringComparison.OrdinalIgnoreCase) == true);

        if (dataType != null)
        {
            _logger.LogDebug("Found existing Product Description DataType: {Key}", dataType.Key);
            return dataType.Key;
        }

        // Create a new DataType with default TipTap configuration
        _logger.LogInformation("Creating Product Description DataType: {Name}", PRODUCT_DESCRIPTION_DATATYPE_NAME);

        var newDataType = CreateProductDescriptionDataType();
        if (newDataType == null)
        {
            throw new InvalidOperationException($"Failed to create Product Description DataType: Property editor '{TIPTAP_PROPERTY_EDITOR_ALIAS}' not found");
        }

        var result = await _dataTypeService.CreateAsync(newDataType, Umbraco.Cms.Core.Constants.Security.SuperUserKey);

        if (result.Success && result.Result != null)
        {
            _logger.LogInformation("Successfully created Product Description DataType: {Key}", result.Result.Key);
            return result.Result.Key;
        }

        _logger.LogError("Failed to create Product Description DataType: {Status}", result.Status);
        throw new InvalidOperationException($"Failed to create Product Description DataType: {result.Status}");
    }

    /// <summary>
    /// Gets the Product Description DataType key synchronously.
    /// Returns null if not yet initialized (safe for use in API endpoints).
    /// Thread-safe.
    /// </summary>
    public Guid? TryGetProductDescriptionDataTypeKey()
    {
        lock (_cacheLock)
        {
            return _cachedDataTypeKey;
        }
    }

    /// <summary>
    /// Gets the Product Description DataType key.
    /// Should only be called after EnsureProductDescriptionDataTypeExistsAsync has been called on startup.
    /// For API endpoints, prefer TryGetProductDescriptionDataTypeKey which is non-blocking.
    /// Thread-safe.
    /// </summary>
    public Guid GetProductDescriptionDataTypeKey()
    {
        // First check the cache under lock
        lock (_cacheLock)
        {
            if (_cachedDataTypeKey.HasValue)
            {
                return _cachedDataTypeKey.Value;
            }
        }

        // Check configured key as last resort (non-blocking)
        var configuredKey = _settings.CurrentValue.ProductDescriptionDataTypeKey;
        if (configuredKey.HasValue)
        {
            lock (_cacheLock)
            {
                // Note: We cannot easily verify this exists synchronously without blocking
                // Trust the configuration and cache it
                _cachedDataTypeKey = configuredKey.Value;
            }
            return configuredKey.Value;
        }

        throw new InvalidOperationException("Product Description DataType has not been initialized. Ensure EnsureProductDescriptionDataTypeExistsAsync is called on startup.");
    }

    /// <summary>
    /// Creates a new DataType configured for TipTap rich text editing
    /// with sensible defaults for product descriptions.
    /// </summary>
    private IDataType? CreateProductDescriptionDataType()
    {
        // Get the RichText property editor
        if (!_propertyEditors.TryGet(TIPTAP_PROPERTY_EDITOR_ALIAS, out var propertyEditor))
        {
            _logger.LogError("Property editor '{Alias}' not found", TIPTAP_PROPERTY_EDITOR_ALIAS);
            return null;
        }

        // Create DataType with the property editor and serializer
        var dataType = new DataType(propertyEditor, _serializer, -1)
        {
            Name = PRODUCT_DESCRIPTION_DATATYPE_NAME,
            EditorUiAlias = TIPTAP_PROPERTY_EDITOR_UI_ALIAS,
            ConfigurationData = new Dictionary<string, object>
            {
                // Extensions that the editor will load - must match toolbar buttons
                ["extensions"] = new[]
                {
                    "Umb.Tiptap.RichTextEssentials",
                    "Umb.Tiptap.Bold",
                    "Umb.Tiptap.Italic",
                    "Umb.Tiptap.Underline",
                    "Umb.Tiptap.TextAlign",
                    "Umb.Tiptap.BulletList",
                    "Umb.Tiptap.OrderedList",
                    "Umb.Tiptap.Link",
                    "Umb.Tiptap.Image",
                    "Umb.Tiptap.MediaUpload"
                },
                // Toolbar configuration - defines which buttons appear
                ["toolbar"] = new object[]
                {
                    new object[]
                    {
                        new[] { "Umb.Tiptap.Toolbar.Bold", "Umb.Tiptap.Toolbar.Italic", "Umb.Tiptap.Toolbar.Underline" },
                        new[] { "Umb.Tiptap.Toolbar.TextAlignLeft", "Umb.Tiptap.Toolbar.TextAlignCenter", "Umb.Tiptap.Toolbar.TextAlignRight" },
                        new[] { "Umb.Tiptap.Toolbar.BulletList", "Umb.Tiptap.Toolbar.OrderedList" },
                        new[] { "Umb.Tiptap.Toolbar.Link", "Umb.Tiptap.Toolbar.Unlink" },
                        new[] { "Umb.Tiptap.Toolbar.MediaPicker" }
                    }
                },
                ["maxImageSize"] = 800,
                ["overlaySize"] = "medium"
            }
        };

        return dataType;
    }

    /// <summary>
    /// Disposes resources used by the initializer.
    /// </summary>
    public void Dispose()
    {
        _initializationLock.Dispose();
        GC.SuppressFinalize(this);
    }
}
