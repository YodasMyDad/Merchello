using System.Globalization;
using System.Net.Http.Headers;
using System.Text;
using System.Text.Json;
using Merchello.Core.Accounting.Models;
using Merchello.Core.Accounting.Services.Interfaces;
using Merchello.Core.Data;
using Merchello.Core.ProductSync.Dtos;
using Merchello.Core.ProductSync.Factories;
using Merchello.Core.ProductSync.Models;
using Merchello.Core.ProductSync.Services.Interfaces;
using Merchello.Core.Products.Dtos;
using Merchello.Core.Products.Models;
using Merchello.Core.Products.Services.Interfaces;
using Merchello.Core.Shared.Extensions;
using Merchello.Core.Shared.Models;
using Merchello.Core.Shared.Security;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using Umbraco.Cms.Core.IO;
using Umbraco.Cms.Core.PropertyEditors;
using Umbraco.Cms.Core.Services;
using Umbraco.Cms.Core.Strings;
using Umbraco.Cms.Persistence.EFCore.Scoping;
using Umbraco.Extensions;

namespace Merchello.Core.ProductSync.Services;

public class ProductSyncService(
    IEFCoreScopeProvider<MerchelloDbContext> efCoreScopeProvider,
    IShopifyCsvMapper csvMapper,
    IShopifyCsvImportValidator importValidator,
    IProductSyncArtifactService artifactService,
    ProductSyncRunFactory runFactory,
    ProductSyncIssueFactory issueFactory,
    IProductService productService,
    IProductTypeService productTypeService,
    ITaxService taxService,
    IMediaService mediaService,
    MediaFileManager mediaFileManager,
    MediaUrlGeneratorCollection mediaUrlGenerators,
    IShortStringHelper shortStringHelper,
    IContentTypeBaseServiceProvider contentTypeBaseServiceProvider,
    IHttpClientFactory httpClientFactory,
    IOptions<MerchelloSettings> merchelloOptions,
    IOptions<ProductSyncSettings> options,
    ILogger<ProductSyncService> logger) : IProductSyncService
{
    private const string NoTaxGroupName = "No Tax";
    private const string ShopifyVendorKey = "Shopify:Vendor";
    private const string ShopifyTagsKey = "Shopify:Tags";
    private const string ShopifyTypeKey = "Shopify:Type";
    private const string ShopifyProductCategoryKey = "Shopify:ProductCategory";
    private const string ShopifyHandleKey = "Shopify:Handle";
    private const string ShopifyCollectionKey = "Shopify:Collection";
    private const string ImageMediaTypeAlias = "Image";
    private const string ImagePropertyAlias = "umbracoFile";
    private const string FolderMediaTypeAlias = "Folder";

    private static readonly JsonSerializerOptions JsonOptions = new()
    {
        PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
        PropertyNameCaseInsensitive = true,
        WriteIndented = false
    };

    private readonly ProductSyncSettings _settings = options.Value;
    private readonly string? _storeWebsiteUrl = merchelloOptions.Value.Store?.WebsiteUrl;

    public async Task<ProductImportValidationDto> ValidateImportAsync(
        Stream csvStream,
        string fileName,
        ValidateProductImportDto request,
        CancellationToken cancellationToken = default)
    {
        request ??= new ValidateProductImportDto();
        var maxIssues = Math.Clamp(
            request.MaxIssues ?? _settings.MaxValidationIssuesReturned,
            1,
            Math.Max(1, _settings.MaxValidationIssuesReturned));

        EnsureCsvSize(csvStream, fileName);

        if (csvStream.CanSeek)
        {
            csvStream.Seek(0, SeekOrigin.Begin);
        }

        var document = await csvMapper.ParseAsync(csvStream, request.Profile, cancellationToken);
        var validation = await importValidator.ValidateAsync(document, request.Profile, maxIssues, cancellationToken);

        var issueDtos = validation.Issues.Select(MapIssue).ToList();
        return new ProductImportValidationDto
        {
            IsValid = !issueDtos.Any(x => x.Severity == ProductSyncIssueSeverity.Error),
            RowCount = validation.RowCount,
            DistinctHandleCount = validation.DistinctHandleCount,
            WarningCount = issueDtos.Count(x => x.Severity == ProductSyncIssueSeverity.Warning),
            ErrorCount = issueDtos.Count(x => x.Severity == ProductSyncIssueSeverity.Error),
            Issues = issueDtos
        };
    }

    public async Task<CrudResult<ProductSyncRunDto>> StartImportAsync(
        Stream csvStream,
        string fileName,
        StartProductImportDto request,
        string? requestedByUserId,
        string? requestedByUserName,
        CancellationToken cancellationToken = default)
    {
        var result = new CrudResult<ProductSyncRunDto>();
        request ??= new StartProductImportDto();

        EnsureCsvSize(csvStream, fileName);

        using (var scope = efCoreScopeProvider.CreateScope())
        {
            var hasActiveImport = await scope.ExecuteWithContextAsync(async db =>
                await db.ProductSyncRuns
                    .AnyAsync(
                        x => x.Direction == ProductSyncDirection.Import &&
                             (x.Status == ProductSyncRunStatus.Queued || x.Status == ProductSyncRunStatus.Running),
                        cancellationToken));
            scope.Complete();

            if (hasActiveImport)
            {
                result.AddErrorMessage("An import is already queued or running.");
                return result;
            }
        }

        if (csvStream.CanSeek)
        {
            csvStream.Seek(0, SeekOrigin.Begin);
        }

        var validation = await ValidateImportAsync(
            csvStream,
            fileName,
            new ValidateProductImportDto
            {
                Profile = request.Profile,
                MaxIssues = request.MaxIssues
            },
            cancellationToken);

        if (!validation.IsValid)
        {
            result.AddErrorMessage("Validation failed. Fix CSV errors before starting import.");
            return result;
        }

        if (csvStream.CanSeek)
        {
            csvStream.Seek(0, SeekOrigin.Begin);
        }

        var (inputFileName, inputFilePath) = await artifactService.SaveImportArtifactAsync(
            fileName,
            csvStream,
            cancellationToken);

        var run = runFactory.CreateImportRun(
            request.Profile,
            requestedByUserId,
            requestedByUserName,
            inputFileName,
            inputFilePath,
            new ProductSyncImportRunOptions
            {
                ContinueOnImageFailure = request.ContinueOnImageFailure
            });

        using (var scope = efCoreScopeProvider.CreateScope())
        {
            await scope.ExecuteWithContextAsync(async db =>
            {
                db.ProductSyncRuns.Add(run);
                await db.SaveChangesAsync(cancellationToken);
                return true;
            });
            scope.Complete();
        }

        result.ResultObject = MapRun(run);
        return result;
    }

    public async Task<CrudResult<ProductSyncRunDto>> StartExportAsync(
        StartProductExportDto request,
        string? requestedByUserId,
        string? requestedByUserName,
        CancellationToken cancellationToken = default)
    {
        var result = new CrudResult<ProductSyncRunDto>();
        request ??= new StartProductExportDto();

        var run = runFactory.CreateExportRun(
            request.Profile,
            requestedByUserId,
            requestedByUserName,
            new ProductSyncExportRunOptions());

        using (var scope = efCoreScopeProvider.CreateScope())
        {
            await scope.ExecuteWithContextAsync(async db =>
            {
                db.ProductSyncRuns.Add(run);
                await db.SaveChangesAsync(cancellationToken);
                return true;
            });
            scope.Complete();
        }

        result.ResultObject = MapRun(run);
        return result;
    }

    public async Task<ProductSyncRunPageDto> GetRunsAsync(
        ProductSyncDirection? direction,
        ProductSyncRunStatus? status,
        int page,
        int pageSize,
        CancellationToken cancellationToken = default)
    {
        page = Math.Max(1, page);
        pageSize = Math.Clamp(pageSize, 1, 200);

        using var scope = efCoreScopeProvider.CreateScope();
        var data = await scope.ExecuteWithContextAsync(async db =>
        {
            var query = db.ProductSyncRuns.AsNoTracking().AsQueryable();

            if (direction.HasValue)
            {
                query = query.Where(x => x.Direction == direction.Value);
            }

            if (status.HasValue)
            {
                query = query.Where(x => x.Status == status.Value);
            }

            var totalItems = await query.CountAsync(cancellationToken);
            var items = await query
                .OrderByDescending(x => x.DateCreatedUtc)
                .Skip((page - 1) * pageSize)
                .Take(pageSize)
                .ToListAsync(cancellationToken);

            return (totalItems, items);
        });
        scope.Complete();

        var totalPages = Math.Max(1, (int)Math.Ceiling(data.totalItems / (double)pageSize));
        return new ProductSyncRunPageDto
        {
            Items = data.items.Select(MapRun).ToList(),
            Page = page,
            PageSize = pageSize,
            TotalItems = data.totalItems,
            TotalPages = totalPages,
            HasPreviousPage = page > 1,
            HasNextPage = page < totalPages
        };
    }

    public async Task<ProductSyncRunDto?> GetRunAsync(Guid runId, CancellationToken cancellationToken = default)
    {
        using var scope = efCoreScopeProvider.CreateScope();
        var run = await scope.ExecuteWithContextAsync(async db =>
            await db.ProductSyncRuns
                .AsNoTracking()
                .FirstOrDefaultAsync(x => x.Id == runId, cancellationToken));
        scope.Complete();

        return run == null ? null : MapRun(run);
    }

    public async Task<ProductSyncIssuePageDto> GetIssuesAsync(
        Guid runId,
        ProductSyncIssueSeverity? severity,
        int page,
        int pageSize,
        CancellationToken cancellationToken = default)
    {
        page = Math.Max(1, page);
        pageSize = Math.Clamp(pageSize, 1, 500);

        using var scope = efCoreScopeProvider.CreateScope();
        var data = await scope.ExecuteWithContextAsync(async db =>
        {
            var query = db.ProductSyncIssues
                .AsNoTracking()
                .Where(x => x.RunId == runId);

            if (severity.HasValue)
            {
                query = query.Where(x => x.Severity == severity.Value);
            }

            var totalItems = await query.CountAsync(cancellationToken);
            var items = await query
                .OrderByDescending(x => x.DateCreatedUtc)
                .ThenBy(x => x.RowNumber)
                .Skip((page - 1) * pageSize)
                .Take(pageSize)
                .ToListAsync(cancellationToken);

            return (totalItems, items);
        });
        scope.Complete();

        var totalPages = Math.Max(1, (int)Math.Ceiling(data.totalItems / (double)pageSize));
        return new ProductSyncIssuePageDto
        {
            Items = data.items.Select(MapIssue).ToList(),
            Page = page,
            PageSize = pageSize,
            TotalItems = data.totalItems,
            TotalPages = totalPages,
            HasPreviousPage = page > 1,
            HasNextPage = page < totalPages
        };
    }

    public async Task<(Stream Stream, string FileName, string ContentType)?> OpenExportArtifactAsync(
        Guid runId,
        CancellationToken cancellationToken = default)
    {
        using var scope = efCoreScopeProvider.CreateScope();
        var run = await scope.ExecuteWithContextAsync(async db =>
            await db.ProductSyncRuns
                .AsNoTracking()
                .FirstOrDefaultAsync(x => x.Id == runId, cancellationToken));
        scope.Complete();

        if (run == null ||
            run.Direction != ProductSyncDirection.Export ||
            run.Status != ProductSyncRunStatus.Completed ||
            string.IsNullOrWhiteSpace(run.OutputFilePath))
        {
            return null;
        }

        var stream = await artifactService.OpenReadAsync(run.OutputFilePath, cancellationToken);
        if (stream == null)
        {
            return null;
        }

        var fileName = string.IsNullOrWhiteSpace(run.OutputFileName)
            ? $"products-export-{run.Id:N}.csv"
            : run.OutputFileName!;

        return (stream, fileName, "text/csv");
    }

    public async Task<bool> TryProcessNextQueuedRunAsync(CancellationToken cancellationToken = default)
    {
        Guid? claimedRunId;
        using (var scope = efCoreScopeProvider.CreateScope())
        {
            claimedRunId = await scope.ExecuteWithContextAsync(async db =>
            {
                var queuedRuns = await db.ProductSyncRuns
                    .AsNoTracking()
                    .Where(x => x.Status == ProductSyncRunStatus.Queued)
                    .OrderBy(x => x.DateCreatedUtc)
                    .Select(x => new { x.Id, x.Direction })
                    .ToListAsync(cancellationToken);

                foreach (var queuedRun in queuedRuns)
                {
                    var claimQuery = db.ProductSyncRuns
                        .Where(x => x.Id == queuedRun.Id && x.Status == ProductSyncRunStatus.Queued);

                    if (queuedRun.Direction == ProductSyncDirection.Import)
                    {
                        claimQuery = claimQuery.Where(_ =>
                            !db.ProductSyncRuns.Any(x =>
                                x.Direction == ProductSyncDirection.Import &&
                                x.Status == ProductSyncRunStatus.Running));
                    }

                    var startedAtUtc = DateTime.UtcNow;
                    var affectedRows = await claimQuery.ExecuteUpdateAsync(setters => setters
                            .SetProperty(x => x.Status, ProductSyncRunStatus.Running)
                            .SetProperty(x => x.StartedAtUtc, startedAtUtc)
                            .SetProperty(x => x.ErrorMessage, (string?)null),
                        cancellationToken);

                    if (affectedRows == 1)
                    {
                        return (Guid?)queuedRun.Id;
                    }
                }

                return (Guid?)null;
            });
            scope.Complete();
        }

        if (!claimedRunId.HasValue)
        {
            return false;
        }

        ProductSyncRun? run;
        using (var scope = efCoreScopeProvider.CreateScope())
        {
            run = await scope.ExecuteWithContextAsync(async db =>
                await db.ProductSyncRuns
                    .AsNoTracking()
                    .FirstOrDefaultAsync(x => x.Id == claimedRunId.Value, cancellationToken));
            scope.Complete();
        }

        if (run == null)
        {
            return false;
        }

        try
        {
            if (run.Direction == ProductSyncDirection.Import)
            {
                var importResult = await ProcessImportRunAsync(run, cancellationToken);
                await CompleteRunAsync(
                    run.Id,
                    importResult.Success,
                    importResult.ErrorMessage,
                    importResult.ItemsProcessed,
                    importResult.ItemsSucceeded,
                    importResult.ItemsFailed,
                    importResult.Issues,
                    outputFileName: null,
                    outputFilePath: null,
                    cancellationToken);
            }
            else
            {
                var exportResult = await ProcessExportRunAsync(run, cancellationToken);
                await CompleteRunAsync(
                    run.Id,
                    exportResult.Success,
                    exportResult.ErrorMessage,
                    exportResult.ItemsProcessed,
                    exportResult.ItemsSucceeded,
                    exportResult.ItemsFailed,
                    exportResult.Issues,
                    exportResult.OutputFileName,
                    exportResult.OutputFilePath,
                    cancellationToken);
            }
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Product sync run {RunId} failed unexpectedly.", run.Id);
            var issue = issueFactory.Create(
                run.Id,
                ProductSyncIssueSeverity.Error,
                ProductSyncStage.System,
                "unexpected_error",
                ex.Message);

            await CompleteRunAsync(
                run.Id,
                success: false,
                errorMessage: ex.Message,
                itemsProcessed: 0,
                itemsSucceeded: 0,
                itemsFailed: 1,
                [issue],
                outputFileName: null,
                outputFilePath: null,
                cancellationToken);
        }

        return true;
    }

    public async Task CleanupRunsAsync(CancellationToken cancellationToken = default)
    {
        var now = DateTime.UtcNow;
        var runCutoffUtc = now.AddDays(-Math.Max(1, _settings.RunRetentionDays));
        var artifactCutoffUtc = now.AddDays(-Math.Max(1, _settings.ArtifactRetentionDays));

        List<(Guid Id, string? InputFilePath, string? OutputFilePath)> artifactRuns;
        List<(Guid Id, string? InputFilePath, string? OutputFilePath)> oldRuns;

        using (var scope = efCoreScopeProvider.CreateScope())
        {
            (artifactRuns, oldRuns) = await scope.ExecuteWithContextAsync(async db =>
            {
                var artifactRows = await db.ProductSyncRuns
                    .Where(x => x.DateCreatedUtc < artifactCutoffUtc)
                    .Where(x => x.InputFilePath != null || x.OutputFilePath != null)
                    .Select(x => new ValueTuple<Guid, string?, string?>(x.Id, x.InputFilePath, x.OutputFilePath))
                    .ToListAsync(cancellationToken);

                var oldRunRows = await db.ProductSyncRuns
                    .Where(x => x.DateCreatedUtc < runCutoffUtc)
                    .Select(x => new ValueTuple<Guid, string?, string?>(x.Id, x.InputFilePath, x.OutputFilePath))
                    .ToListAsync(cancellationToken);

                return (artifactRows, oldRunRows);
            });
            scope.Complete();
        }

        var artifactPathsToDelete = artifactRuns
            .Concat(oldRuns)
            .SelectMany(x => new[] { x.InputFilePath, x.OutputFilePath })
            .Where(x => !string.IsNullOrWhiteSpace(x))
            .Distinct(StringComparer.OrdinalIgnoreCase)
            .ToList();

        foreach (var path in artifactPathsToDelete)
        {
            await artifactService.DeleteIfExistsAsync(path, cancellationToken);
        }

        using (var scope = efCoreScopeProvider.CreateScope())
        {
            await scope.ExecuteWithContextAsync(async db =>
            {
                if (artifactRuns.Count > 0)
                {
                    var artifactRunIds = artifactRuns.Select(x => x.Id).ToHashSet();
                    var runs = await db.ProductSyncRuns
                        .Where(x => artifactRunIds.Contains(x.Id))
                        .ToListAsync(cancellationToken);

                    foreach (var run in runs)
                    {
                        run.InputFilePath = null;
                        run.OutputFilePath = null;
                    }
                }

                if (oldRuns.Count > 0)
                {
                    var oldRunIds = oldRuns.Select(x => x.Id).ToHashSet();
                    var runs = await db.ProductSyncRuns
                        .Where(x => oldRunIds.Contains(x.Id))
                        .ToListAsync(cancellationToken);

                    db.ProductSyncRuns.RemoveRange(runs);
                }

                await db.SaveChangesAsync(cancellationToken);
                return true;
            });
            scope.Complete();
        }
    }

    private async Task<(
        bool Success,
        string? ErrorMessage,
        int ItemsProcessed,
        int ItemsSucceeded,
        int ItemsFailed,
        List<ProductSyncIssue> Issues)> ProcessImportRunAsync(
        ProductSyncRun run,
        CancellationToken cancellationToken)
    {
        var issues = new List<ProductSyncIssue>();
        var itemsProcessed = 0;
        var itemsSucceeded = 0;
        var itemsFailed = 0;

        var importOptions = DeserializeImportOptions(run.OptionsJson);

        var stream = await artifactService.OpenReadAsync(run.InputFilePath, cancellationToken);
        if (stream == null)
        {
            issues.Add(issueFactory.Create(
                run.Id,
                ProductSyncIssueSeverity.Error,
                ProductSyncStage.System,
                "input_artifact_missing",
                "Input CSV artifact could not be opened."));

            return (false, "Input CSV artifact could not be opened.", 0, 0, 1, issues);
        }

        await using (stream)
        {
            var document = await csvMapper.ParseAsync(stream, run.Profile, cancellationToken);
            var validation = await importValidator.ValidateAsync(
                document,
                run.Profile,
                Math.Max(1, _settings.MaxValidationIssuesReturned),
                cancellationToken);

            issues.AddRange(validation.Issues.Select(x => issueFactory.Create(
                run.Id,
                x.Severity,
                x.Stage,
                x.Code,
                x.Message,
                x.RowNumber,
                x.Handle,
                x.Sku,
                x.Field)));

            if (validation.Issues.Any(x => x.Severity == ProductSyncIssueSeverity.Error))
            {
                return (false, "Import blocked by validation errors.", 0, 0, validation.RowCount, issues);
            }

            var rowsByHandle = document.Rows
                .Where(x => !string.IsNullOrWhiteSpace(Normalize(x[ShopifyCsvSchema.Handle])))
                .GroupBy(x => Normalize(x[ShopifyCsvSchema.Handle])!, StringComparer.OrdinalIgnoreCase)
                .ToList();

            var productTypes = await productTypeService.GetProductTypes(cancellationToken);
            var productTypeByName = productTypes.ToDictionary(x => x.Name ?? string.Empty, StringComparer.OrdinalIgnoreCase);

            var taxGroups = await taxService.GetTaxGroups(cancellationToken);
            var taxGroupByName = taxGroups.ToDictionary(x => x.Name ?? string.Empty, StringComparer.OrdinalIgnoreCase);

            foreach (var handleRows in rowsByHandle)
            {
                cancellationToken.ThrowIfCancellationRequested();

                var handle = handleRows.Key;
                itemsProcessed++;

                try
                {
                    var imported = await ImportHandleAsync(
                        run,
                        handle,
                        handleRows.OrderBy(x => x.RowNumber).ToList(),
                        importOptions,
                        productTypeByName,
                        taxGroupByName,
                        issues,
                        cancellationToken);

                    if (imported)
                    {
                        itemsSucceeded++;
                    }
                    else
                    {
                        itemsFailed++;
                    }
                }
                catch (Exception ex)
                {
                    logger.LogError(ex, "Import failed for handle {Handle} in run {RunId}.", handle, run.Id);
                    itemsFailed++;
                    issues.Add(issueFactory.Create(
                        run.Id,
                        ProductSyncIssueSeverity.Error,
                        ProductSyncStage.Import,
                        "handle_import_failed",
                        ex.Message,
                        handle: handle));
                }
            }
        }

        return (itemsFailed == 0, itemsFailed == 0 ? null : "One or more handles failed to import.", itemsProcessed, itemsSucceeded, itemsFailed, issues);
    }

    private async Task<bool> ImportHandleAsync(
        ProductSyncRun run,
        string handle,
        List<ProductSyncCsvRow> rows,
        ProductSyncImportRunOptions importOptions,
        Dictionary<string, ProductType> productTypeByName,
        Dictionary<string, TaxGroup> taxGroupByName,
        List<ProductSyncIssue> issues,
        CancellationToken cancellationToken)
    {
        var existingRootId = await FindRootIdByHandleAsync(handle, cancellationToken);
        if (!existingRootId.HasValue)
        {
            var fallbackRootIds = await FindRootIdsBySkusAsync(
                rows.Select(x => Normalize(x[ShopifyCsvSchema.VariantSku]))
                    .Where(x => !string.IsNullOrWhiteSpace(x))
                    .Cast<string>()
                    .Distinct(StringComparer.OrdinalIgnoreCase)
                    .ToList(),
                cancellationToken);

            if (fallbackRootIds.Count > 1)
            {
                issues.Add(issueFactory.Create(
                    run.Id,
                    ProductSyncIssueSeverity.Error,
                    ProductSyncStage.Matching,
                    "ambiguous_sku_match",
                    "SKU fallback matched multiple product roots. Handle cannot be resolved.",
                    handle: handle));
                return false;
            }

            if (fallbackRootIds.Count == 1)
            {
                existingRootId = fallbackRootIds[0];
            }
        }

        var existingRoot = existingRootId.HasValue
            ? await productService.GetProductRoot(existingRootId.Value, includeProducts: true, cancellationToken: cancellationToken)
            : null;

        var firstRow = rows[0];
        var resolvedTitle = Normalize(firstRow[ShopifyCsvSchema.Title]) ?? existingRoot?.RootName;
        var title = ResolveRequiredTitle(resolvedTitle, handle);
        var safeTitle = title ?? string.Empty;
        var bodyHtml = Normalize(firstRow[ShopifyCsvSchema.BodyHtml]) ?? string.Empty;
        var vendor = Normalize(firstRow[ShopifyCsvSchema.Vendor]);
        var tags = Normalize(firstRow[ShopifyCsvSchema.Tags]);
        var productCategory = Normalize(firstRow[ShopifyCsvSchema.ProductCategory]);
        var typeName = Normalize(firstRow[ShopifyCsvSchema.Type]);
        var collectionName = Normalize(firstRow[ShopifyCsvSchema.Collection]);

        if (!string.IsNullOrWhiteSpace(collectionName))
        {
            issues.Add(issueFactory.Create(
                run.Id,
                ProductSyncIssueSeverity.Warning,
                ProductSyncStage.Mapping,
                "collection_ignored",
                "Collection data is ignored in this import profile.",
                firstRow.RowNumber,
                handle: handle,
                field: ShopifyCsvSchema.Collection));
        }

        var productType = await ResolveProductTypeAsync(
            run.Id,
            handle,
            typeName,
            existingRoot?.ProductTypeId,
            productTypeByName,
            issues,
            cancellationToken);

        if (productType == null)
        {
            return false;
        }

        var taxCode = rows
            .Select(x => Normalize(x[ShopifyCsvSchema.VariantTaxCode]))
            .FirstOrDefault(x => !string.IsNullOrWhiteSpace(x));

        var taxGroup = await ResolveTaxGroupAsync(
            run.Id,
            handle,
            taxCode,
            existingRoot?.TaxGroupId,
            taxGroupByName,
            issues,
            cancellationToken);

        if (taxGroup == null)
        {
            return false;
        }

        var optionTypeMap = ParseOptionTypeMap(rows, run.Profile, run.Id, handle, issues);
        if (run.Profile == ProductSyncProfile.MerchelloExtended &&
            rows.Any(x => !string.IsNullOrWhiteSpace(Normalize(x[ShopifyCsvSchema.ExtendedVariantExtendedDataJson]))))
        {
            issues.Add(issueFactory.Create(
                run.Id,
                ProductSyncIssueSeverity.Warning,
                ProductSyncStage.Mapping,
                "variant_extended_data_ignored",
                "Merchello:VariantExtendedDataJson is not supported by the current variant model and was ignored.",
                handle: handle,
                field: ShopifyCsvSchema.ExtendedVariantExtendedDataJson));
        }

        var rootImages = new List<Guid>();
        var variantImageByRowNumber = new Dictionary<int, List<Guid>>();
        var imageCache = new Dictionary<string, Guid?>(StringComparer.OrdinalIgnoreCase);

        var productMediaFolderId = global::Umbraco.Cms.Core.Constants.System.Root;
        if (!string.IsNullOrWhiteSpace(_settings.MediaImportRootFolderName))
        {
            var rootFolderId = GetOrCreateMediaFolder(_settings.MediaImportRootFolderName, global::Umbraco.Cms.Core.Constants.System.Root);
            productMediaFolderId = GetOrCreateMediaFolder(safeTitle, rootFolderId);
        }

        foreach (var imageUrl in rows
                     .Select(x => Normalize(x[ShopifyCsvSchema.ImageSrc]))
                     .Where(x => !string.IsNullOrWhiteSpace(x))
                     .Cast<string>()
                     .Distinct(StringComparer.OrdinalIgnoreCase))
        {
            var mediaKey = await ImportImageAsync(
                run.Id,
                handle,
                null,
                ShopifyCsvSchema.ImageSrc,
                imageUrl,
                productMediaFolderId,
                importOptions.ContinueOnImageFailure,
                issues,
                imageCache,
                cancellationToken);

            if (mediaKey.HasValue)
            {
                rootImages.Add(mediaKey.Value);
            }
            else if (!importOptions.ContinueOnImageFailure)
            {
                return false;
            }
        }

        foreach (var row in rows)
        {
            var variantImageUrl = Normalize(row[ShopifyCsvSchema.VariantImage]);
            if (string.IsNullOrWhiteSpace(variantImageUrl))
            {
                continue;
            }

            var mediaKey = await ImportImageAsync(
                run.Id,
                handle,
                row.RowNumber,
                ShopifyCsvSchema.VariantImage,
                variantImageUrl!,
                productMediaFolderId,
                importOptions.ContinueOnImageFailure,
                issues,
                imageCache,
                cancellationToken);

            if (mediaKey.HasValue)
            {
                variantImageByRowNumber[row.RowNumber] = [mediaKey.Value];
            }
            else if (!importOptions.ContinueOnImageFailure)
            {
                return false;
            }
        }

        var publishedDefault = ParsePublished(firstRow[ShopifyCsvSchema.Published], fallback: true);
        var defaultPrice = ParseDecimal(firstRow[ShopifyCsvSchema.VariantPrice]) ?? 0m;
        var defaultCost = ParseDecimal(firstRow[ShopifyCsvSchema.CostPerItem]) ?? 0m;
        var defaultSku = Normalize(firstRow[ShopifyCsvSchema.VariantSku]);
        var defaultBarcode = Normalize(firstRow[ShopifyCsvSchema.VariantBarcode]);

        Guid productRootId;
        if (existingRoot == null)
        {
            var createResult = await productService.CreateProductRoot(
                new CreateProductRootDto
                {
                    RootName = safeTitle,
                    TaxGroupId = taxGroup.Id,
                    ProductTypeId = productType.Id,
                    RootImages = rootImages,
                    DefaultVariant = new CreateVariantDto
                    {
                        Name = safeTitle,
                        Price = defaultPrice,
                        CostOfGoods = defaultCost,
                        Sku = defaultSku,
                        Gtin = defaultBarcode,
                        AvailableForPurchase = publishedDefault,
                        CanPurchase = publishedDefault
                    }
                },
                cancellationToken);

            if (!createResult.Success || createResult.ResultObject == null)
            {
                var error = createResult.Messages.FirstOrDefault(m => m.ResultMessageType == Shared.Models.Enums.ResultMessageType.Error)?.Message
                            ?? "Unknown create product error.";
                issues.Add(issueFactory.Create(
                    run.Id,
                    ProductSyncIssueSeverity.Error,
                    ProductSyncStage.Import,
                    "create_product_root_failed",
                    error,
                    handle: handle));
                return false;
            }

            productRootId = createResult.ResultObject.Id;
        }
        else
        {
            productRootId = existingRoot.Id;
        }

        var updateRootResult = await productService.UpdateProductRoot(
            productRootId,
            new UpdateProductRootDto
            {
                RootName = safeTitle,
                RootUrl = handle,
                Description = ToTipTapJson(bodyHtml),
                RootImages = rootImages,
                ShoppingFeedBrand = vendor,
                ProductTypeId = productType.Id,
                TaxGroupId = taxGroup.Id
            },
            cancellationToken);

        if (!updateRootResult.Success)
        {
            var error = updateRootResult.Messages.FirstOrDefault(m => m.ResultMessageType == Shared.Models.Enums.ResultMessageType.Error)?.Message
                        ?? "Unknown update product error.";
            issues.Add(issueFactory.Create(
                run.Id,
                ProductSyncIssueSeverity.Error,
                ProductSyncStage.Import,
                "update_product_root_failed",
                error,
                handle: handle));
            return false;
        }

        var variantOptions = BuildVariantOptions(rows, optionTypeMap);
        var addonOptions = run.Profile == ProductSyncProfile.ShopifyStrict
            ? MapExistingAddonOptions(existingRoot)
            : ParseExtendedAddonOptions(run.Id, handle, rows, issues);

        var optionsToSave = variantOptions
            .Concat(addonOptions)
            .ToList();

        var saveOptionsResult = await productService.SaveProductOptions(productRootId, optionsToSave, cancellationToken);
        if (!saveOptionsResult.Success)
        {
            var error = saveOptionsResult.Messages.FirstOrDefault(m => m.ResultMessageType == Shared.Models.Enums.ResultMessageType.Error)?.Message
                        ?? "Unknown save options error.";
            issues.Add(issueFactory.Create(
                run.Id,
                ProductSyncIssueSeverity.Error,
                ProductSyncStage.Import,
                "save_options_failed",
                error,
                handle: handle));
            return false;
        }

        var refreshedRoot = await productService.GetProductRoot(productRootId, includeProducts: true, cancellationToken: cancellationToken);
        if (refreshedRoot == null)
        {
            issues.Add(issueFactory.Create(
                run.Id,
                ProductSyncIssueSeverity.Error,
                ProductSyncStage.Import,
                "refresh_product_failed",
                "The product could not be reloaded after saving options.",
                handle: handle));
            return false;
        }

        var variantGeneratingOptions = refreshedRoot.ProductOptions
            .Where(x => x.IsVariant)
            .OrderBy(x => x.SortOrder)
            .ThenBy(x => x.Id)
            .ToList();

        var rowFailures = 0;
        foreach (var row in rows)
        {
            cancellationToken.ThrowIfCancellationRequested();

            var variant = ResolveVariantForRow(refreshedRoot, variantGeneratingOptions, row, run.Id, handle, issues);
            if (variant == null)
            {
                rowFailures++;
                continue;
            }

            var variantName = BuildVariantName(row, safeTitle);
            var sku = Normalize(row[ShopifyCsvSchema.VariantSku]);
            var gtin = Normalize(row[ShopifyCsvSchema.VariantBarcode]);
            var price = ParseDecimal(row[ShopifyCsvSchema.VariantPrice]);
            var compareAt = ParseDecimal(row[ShopifyCsvSchema.VariantCompareAtPrice]);
            var cost = ParseDecimal(row[ShopifyCsvSchema.CostPerItem]);
            var published = ParsePublished(row[ShopifyCsvSchema.Published], fallback: true);

            var resolvedPrice = price ?? variant.Price;
            var isOnSale = compareAt.HasValue && compareAt.Value > resolvedPrice;

            var updateVariantResult = await productService.UpdateVariant(
                productRootId,
                variant.Id,
                new UpdateVariantDto
                {
                    Name = variantName,
                    Sku = sku,
                    Gtin = gtin,
                    Price = price,
                    CostOfGoods = cost,
                    AvailableForPurchase = published,
                    CanPurchase = published,
                    OnSale = isOnSale,
                    PreviousPrice = isOnSale ? compareAt : null,
                    Images = variantImageByRowNumber.TryGetValue(row.RowNumber, out var imageKeys)
                        ? imageKeys
                        : null
                },
                cancellationToken);

            if (!updateVariantResult.Success)
            {
                rowFailures++;
                var error = updateVariantResult.Messages.FirstOrDefault(m => m.ResultMessageType == Shared.Models.Enums.ResultMessageType.Error)?.Message
                            ?? "Unknown variant update error.";
                issues.Add(issueFactory.Create(
                    run.Id,
                    ProductSyncIssueSeverity.Error,
                    ProductSyncStage.Import,
                    "update_variant_failed",
                    error,
                    row.RowNumber,
                    handle,
                    variant.Sku,
                    ShopifyCsvSchema.VariantSku));
            }
        }

        var rootExtendedData = ParseRootExtendedData(rows, run.Profile);
        await ApplyRootExtendedDataAsync(
            productRootId,
            run.Profile,
            rootExtendedData,
            handle,
            vendor,
            tags,
            typeName,
            productCategory,
            collectionName,
            cancellationToken);

        return rowFailures == 0;
    }

    private List<SaveProductOptionDto> ParseExtendedAddonOptions(
        Guid runId,
        string handle,
        List<ProductSyncCsvRow> rows,
        List<ProductSyncIssue> issues)
    {
        var addonJson = rows
            .Select(x => Normalize(x[ShopifyCsvSchema.ExtendedAddonOptionsJson]))
            .FirstOrDefault(x => !string.IsNullOrWhiteSpace(x));

        if (string.IsNullOrWhiteSpace(addonJson))
        {
            return [];
        }

        try
        {
            var parsed = JsonSerializer.Deserialize<List<SaveProductOptionDto>>(addonJson, JsonOptions) ?? [];
            foreach (var option in parsed)
            {
                option.IsVariant = false;
                option.Id = null;
                foreach (var value in option.Values)
                {
                    value.Id = null;
                }
            }

            return parsed;
        }
        catch (Exception)
        {
            issues.Add(issueFactory.Create(
                runId,
                ProductSyncIssueSeverity.Error,
                ProductSyncStage.Mapping,
                "invalid_addon_options_json",
                "Merchello:AddonOptionsJson could not be parsed.",
                handle: handle,
                field: ShopifyCsvSchema.ExtendedAddonOptionsJson));
            return [];
        }
    }

    private Dictionary<string, object>? ParseRootExtendedData(List<ProductSyncCsvRow> rows, ProductSyncProfile profile)
    {
        if (profile != ProductSyncProfile.MerchelloExtended)
        {
            return null;
        }

        var json = rows
            .Select(x => Normalize(x[ShopifyCsvSchema.ExtendedRootExtendedDataJson]))
            .FirstOrDefault(x => !string.IsNullOrWhiteSpace(x));

        if (string.IsNullOrWhiteSpace(json))
        {
            return [];
        }

        try
        {
            using var document = JsonDocument.Parse(json);
            if (document.RootElement.ValueKind != JsonValueKind.Object)
            {
                return [];
            }

            var result = new Dictionary<string, object>(StringComparer.OrdinalIgnoreCase);
            foreach (var property in document.RootElement.EnumerateObject())
            {
                result[property.Name] = ConvertJsonElement(property.Value) ?? string.Empty;
            }

            return result;
        }
        catch
        {
            return [];
        }
    }

    private async Task<(
        bool Success,
        string? ErrorMessage,
        int ItemsProcessed,
        int ItemsSucceeded,
        int ItemsFailed,
        List<ProductSyncIssue> Issues,
        string? OutputFileName,
        string? OutputFilePath)> ProcessExportRunAsync(
        ProductSyncRun run,
        CancellationToken cancellationToken)
    {
        var issues = new List<ProductSyncIssue>();

        List<ProductRoot> productRoots;
        using (var scope = efCoreScopeProvider.CreateScope())
        {
            productRoots = await scope.ExecuteWithContextAsync(async db =>
                await db.RootProducts
                    .AsNoTracking()
                    .Include(x => x.ProductType)
                    .Include(x => x.TaxGroup)
                    .Include(x => x.Products)
                    .OrderBy(x => x.RootName)
                    .ToListAsync(cancellationToken));
            scope.Complete();
        }

        var rows = new List<ProductSyncCsvRow>();
        var itemsProcessed = 0;
        var itemsSucceeded = 0;
        var itemsFailed = 0;

        foreach (var root in productRoots)
        {
            cancellationToken.ThrowIfCancellationRequested();
            itemsProcessed++;

            try
            {
                var variants = root.Products
                    .OrderByDescending(x => x.Default)
                    .ThenBy(x => x.Name)
                    .ToList();

                if (variants.Count == 0)
                {
                    itemsFailed++;
                    issues.Add(issueFactory.Create(
                        run.Id,
                        ProductSyncIssueSeverity.Warning,
                        ProductSyncStage.Export,
                        "product_without_variants",
                        "Product root has no variants and was skipped.",
                        handle: root.RootUrl));
                    continue;
                }

                var variantOptions = root.ProductOptions
                    .Where(x => x.IsVariant)
                    .OrderBy(x => x.SortOrder)
                    .ThenBy(x => x.Id)
                    .ToList();

                if (variantOptions.Count > 3)
                {
                    issues.Add(issueFactory.Create(
                        run.Id,
                        ProductSyncIssueSeverity.Warning,
                        ProductSyncStage.Export,
                        "variant_options_truncated",
                        $"Product '{root.RootName}' has {variantOptions.Count} variant options. Export truncated to first 3 for Shopify compatibility.",
                        handle: root.RootUrl));
                }

                var exportOptions = variantOptions.Take(3).ToList();
                var optionTypeMap = exportOptions.ToDictionary(
                    x => x.Name ?? string.Empty,
                    x => x.OptionTypeAlias ?? InferOptionTypeAlias(x.Name),
                    StringComparer.OrdinalIgnoreCase);

                for (var variantIndex = 0; variantIndex < variants.Count; variantIndex++)
                {
                    var variant = variants[variantIndex];
                    var values = new Dictionary<string, string?>(StringComparer.OrdinalIgnoreCase);
                    var row = new ProductSyncCsvRow(variantIndex + 2, values);

                    var handle = Normalize(root.RootUrl) ?? string.Empty;
                    row[ShopifyCsvSchema.Handle] = handle;
                    row[ShopifyCsvSchema.Title] = root.RootName;
                    row[ShopifyCsvSchema.BodyHtml] = ExtractTipTapMarkup(root.Description);
                    row[ShopifyCsvSchema.Vendor] = root.ShoppingFeedBrand ?? ReadExtendedString(root.ExtendedData, ShopifyVendorKey);
                    row[ShopifyCsvSchema.ProductCategory] = ReadExtendedString(root.ExtendedData, ShopifyProductCategoryKey);
                    row[ShopifyCsvSchema.Type] = root.ProductType?.Name;
                    row[ShopifyCsvSchema.Tags] = ReadExtendedString(root.ExtendedData, ShopifyTagsKey);
                    row[ShopifyCsvSchema.Published] = variant.AvailableForPurchase ? "TRUE" : "FALSE";
                    row[ShopifyCsvSchema.Status] = variant.AvailableForPurchase ? "active" : "draft";
                    row[ShopifyCsvSchema.VariantSku] = variant.Sku;
                    row[ShopifyCsvSchema.VariantPrice] = FormatDecimal(variant.Price);
                    row[ShopifyCsvSchema.VariantCompareAtPrice] = variant.OnSale && variant.PreviousPrice.HasValue
                        ? FormatDecimal(variant.PreviousPrice.Value)
                        : null;
                    row[ShopifyCsvSchema.VariantInventoryQty] = null;
                    row[ShopifyCsvSchema.VariantBarcode] = variant.Gtin;
                    row[ShopifyCsvSchema.VariantTaxCode] = root.TaxGroup?.Name;
                    row[ShopifyCsvSchema.CostPerItem] = FormatDecimal(variant.CostOfGoods);

                    var rootImage = root.RootImages.FirstOrDefault();
                    row[ShopifyCsvSchema.ImageSrc] = variantIndex == 0 ? ResolveImageReference(rootImage) : null;
                    row[ShopifyCsvSchema.VariantImage] = ResolveImageReference(variant.Images.FirstOrDefault());

                    var variantOptionValueIds = ParseVariantOptionsKey(variant.VariantOptionsKey);
                    for (var optionIndex = 0; optionIndex < exportOptions.Count; optionIndex++)
                    {
                        var option = exportOptions[optionIndex];
                        var optionValueId = optionIndex < variantOptionValueIds.Count
                            ? variantOptionValueIds[optionIndex]
                            : Guid.Empty;

                        var valueName = option.ProductOptionValues
                            .FirstOrDefault(x => x.Id == optionValueId)
                            ?.Name;

                        row[$"Option{optionIndex + 1} Name"] = option.Name;
                        row[$"Option{optionIndex + 1} Value"] = valueName;
                    }

                    if (run.Profile == ProductSyncProfile.MerchelloExtended)
                    {
                        row[ShopifyCsvSchema.ExtendedAddonOptionsJson] = JsonSerializer.Serialize(
                            MapAddonOptionsForExport(root),
                            JsonOptions);
                        row[ShopifyCsvSchema.ExtendedOptionTypeMapJson] = JsonSerializer.Serialize(optionTypeMap, JsonOptions);
                        row[ShopifyCsvSchema.ExtendedRootExtendedDataJson] = JsonSerializer.Serialize(root.ExtendedData, JsonOptions);
                        row[ShopifyCsvSchema.ExtendedVariantExtendedDataJson] = null;
                    }

                    rows.Add(row);
                }

                itemsSucceeded++;
            }
            catch (Exception ex)
            {
                logger.LogError(ex, "Export failed for product root {ProductRootId}", root.Id);
                itemsFailed++;
                issues.Add(issueFactory.Create(
                    run.Id,
                    ProductSyncIssueSeverity.Error,
                    ProductSyncStage.Export,
                    "export_product_failed",
                    ex.Message,
                    handle: root.RootUrl));
            }
        }

        var suggestedName = $"products-export-{DateTime.UtcNow:yyyyMMddHHmmss}.csv";
        var (outputFileName, outputFilePath, outputStream) = await artifactService.CreateExportArtifactAsync(suggestedName, cancellationToken);

        try
        {
            await using (outputStream)
            {
                await csvMapper.WriteAsync(outputStream, run.Profile, rows, cancellationToken);
            }
        }
        catch (Exception ex)
        {
            await artifactService.DeleteIfExistsAsync(outputFilePath, cancellationToken);
            issues.Add(issueFactory.Create(
                run.Id,
                ProductSyncIssueSeverity.Error,
                ProductSyncStage.Export,
                "export_write_failed",
                ex.Message));
            return (false, ex.Message, itemsProcessed, itemsSucceeded, Math.Max(itemsFailed, 1), issues, null, null);
        }

        return (itemsFailed == 0, itemsFailed == 0 ? null : "One or more products failed to export.", itemsProcessed, itemsSucceeded, itemsFailed, issues, outputFileName, outputFilePath);
    }

    private async Task CompleteRunAsync(
        Guid runId,
        bool success,
        string? errorMessage,
        int itemsProcessed,
        int itemsSucceeded,
        int itemsFailed,
        List<ProductSyncIssue> issues,
        string? outputFileName,
        string? outputFilePath,
        CancellationToken cancellationToken)
    {
        var warnings = issues.Count(x => x.Severity == ProductSyncIssueSeverity.Warning);
        var errors = issues.Count(x => x.Severity == ProductSyncIssueSeverity.Error);

        using var scope = efCoreScopeProvider.CreateScope();
        await scope.ExecuteWithContextAsync(async db =>
        {
            var run = await db.ProductSyncRuns.FirstOrDefaultAsync(x => x.Id == runId, cancellationToken);
            if (run == null)
            {
                return false;
            }

            run.Status = success ? ProductSyncRunStatus.Completed : ProductSyncRunStatus.Failed;
            run.ItemsProcessed = itemsProcessed;
            run.ItemsSucceeded = itemsSucceeded;
            run.ItemsFailed = itemsFailed;
            run.WarningCount = warnings;
            run.ErrorCount = errors;
            run.CompletedAtUtc = DateTime.UtcNow;
            run.ErrorMessage = errorMessage;
            run.OutputFileName = outputFileName;
            run.OutputFilePath = outputFilePath;

            if (issues.Count > 0)
            {
                db.ProductSyncIssues.AddRange(issues);
            }

            await db.SaveChangesAsync(cancellationToken);
            return true;
        });
        scope.Complete();
    }

    private static string BuildVariantName(ProductSyncCsvRow row, string fallbackTitle)
    {
        var optionValues = new[]
            {
                Normalize(row[ShopifyCsvSchema.Option1Value]),
                Normalize(row[ShopifyCsvSchema.Option2Value]),
                Normalize(row[ShopifyCsvSchema.Option3Value])
            }
            .Where(x => !string.IsNullOrWhiteSpace(x))
            .Cast<string>()
            .ToList();

        if (optionValues.Count == 0)
        {
            return fallbackTitle;
        }

        return string.Join(" - ", optionValues);
    }

    private static string ToTipTapJson(string? html)
    {
        var document = new Dictionary<string, object?>
        {
            ["markup"] = html ?? string.Empty,
            ["blocks"] = null
        };

        return JsonSerializer.Serialize(document, JsonOptions);
    }

    private static string ExtractTipTapMarkup(string? description)
    {
        if (string.IsNullOrWhiteSpace(description))
        {
            return string.Empty;
        }

        try
        {
            using var document = JsonDocument.Parse(description);
            if (document.RootElement.ValueKind == JsonValueKind.Object &&
                document.RootElement.TryGetProperty("markup", out var markup) &&
                markup.ValueKind == JsonValueKind.String)
            {
                return markup.GetString() ?? string.Empty;
            }
        }
        catch
        {
            // Not tiptap JSON, return raw value.
        }

        return description;
    }

    private async Task<Guid?> FindRootIdByHandleAsync(string handle, CancellationToken cancellationToken)
    {
        if (string.IsNullOrWhiteSpace(handle))
        {
            return null;
        }

        var normalized = handle.Trim().ToLowerInvariant();

        using var scope = efCoreScopeProvider.CreateScope();
        var rootId = await scope.ExecuteWithContextAsync(async db =>
            await db.RootProducts
                .AsNoTracking()
                .Where(x => x.RootUrl != null && x.RootUrl.ToLower() == normalized)
                .Select(x => (Guid?)x.Id)
                .FirstOrDefaultAsync(cancellationToken));
        scope.Complete();

        return rootId;
    }

    private async Task<List<Guid>> FindRootIdsBySkusAsync(List<string> skus, CancellationToken cancellationToken)
    {
        if (skus.Count == 0)
        {
            return [];
        }

        using var scope = efCoreScopeProvider.CreateScope();
        var result = await scope.ExecuteWithContextAsync(async db =>
            await db.Products
                .AsNoTracking()
                .Where(x => x.Sku != null && skus.Contains(x.Sku))
                .Select(x => x.ProductRootId)
                .Distinct()
                .ToListAsync(cancellationToken));
        scope.Complete();
        return result;
    }

    private async Task<ProductType?> ResolveProductTypeAsync(
        Guid runId,
        string handle,
        string? typeName,
        Guid? existingProductTypeId,
        Dictionary<string, ProductType> productTypeByName,
        List<ProductSyncIssue> issues,
        CancellationToken cancellationToken)
    {
        if (!string.IsNullOrWhiteSpace(typeName))
        {
            if (productTypeByName.TryGetValue(typeName!, out var productType))
            {
                return productType;
            }

            var createResult = await productTypeService.CreateProductType(typeName!, cancellationToken);
            if (!createResult.Success || createResult.ResultObject == null)
            {
                issues.Add(issueFactory.Create(
                    runId,
                    ProductSyncIssueSeverity.Error,
                    ProductSyncStage.Matching,
                    "create_product_type_failed",
                    $"Could not create product type '{typeName}'.",
                    handle: handle,
                    field: ShopifyCsvSchema.Type));
                return null;
            }

            productTypeByName[typeName!] = createResult.ResultObject;
            return createResult.ResultObject;
        }

        if (existingProductTypeId.HasValue)
        {
            var types = await productTypeService.GetProductTypes(cancellationToken);
            var existingType = types.FirstOrDefault(x => x.Id == existingProductTypeId.Value);
            if (existingType != null)
            {
                return existingType;
            }
        }

        var fallback = productTypeByName.Values.FirstOrDefault();
        if (fallback != null)
        {
            return fallback;
        }

        var fallbackCreate = await productTypeService.CreateProductType("Default", cancellationToken);
        if (!fallbackCreate.Success || fallbackCreate.ResultObject == null)
        {
            issues.Add(issueFactory.Create(
                runId,
                ProductSyncIssueSeverity.Error,
                ProductSyncStage.Matching,
                "no_product_type_available",
                "No product type was available and fallback type creation failed.",
                handle: handle));
            return null;
        }

        productTypeByName[fallbackCreate.ResultObject.Name ?? "Default"] = fallbackCreate.ResultObject;
        return fallbackCreate.ResultObject;
    }

    private async Task<TaxGroup?> ResolveTaxGroupAsync(
        Guid runId,
        string handle,
        string? taxCode,
        Guid? existingTaxGroupId,
        Dictionary<string, TaxGroup> taxGroupByName,
        List<ProductSyncIssue> issues,
        CancellationToken cancellationToken)
    {
        if (!string.IsNullOrWhiteSpace(taxCode))
        {
            if (taxGroupByName.TryGetValue(taxCode!, out var taxGroup))
            {
                return taxGroup;
            }

            var noTax = await EnsureNoTaxGroupAsync(runId, handle, taxGroupByName, issues, cancellationToken);
            if (noTax != null)
            {
                issues.Add(issueFactory.Create(
                    runId,
                    ProductSyncIssueSeverity.Warning,
                    ProductSyncStage.Matching,
                    "tax_group_fallback_no_tax",
                    $"Tax code '{taxCode}' was not found. Assigned '{NoTaxGroupName}'.",
                    handle: handle,
                    field: ShopifyCsvSchema.VariantTaxCode));
            }

            return noTax;
        }

        if (existingTaxGroupId.HasValue)
        {
            var taxGroups = await taxService.GetTaxGroups(cancellationToken);
            var existingTax = taxGroups.FirstOrDefault(x => x.Id == existingTaxGroupId.Value);
            if (existingTax != null)
            {
                return existingTax;
            }
        }

        return await EnsureNoTaxGroupAsync(runId, handle, taxGroupByName, issues, cancellationToken);
    }

    private async Task<TaxGroup?> EnsureNoTaxGroupAsync(
        Guid runId,
        string handle,
        Dictionary<string, TaxGroup> taxGroupByName,
        List<ProductSyncIssue> issues,
        CancellationToken cancellationToken)
    {
        if (taxGroupByName.TryGetValue(NoTaxGroupName, out var noTaxGroup))
        {
            return noTaxGroup;
        }

        var createResult = await taxService.CreateTaxGroup(NoTaxGroupName, 0m, cancellationToken);
        if (!createResult.Success || createResult.ResultObject == null)
        {
            issues.Add(issueFactory.Create(
                runId,
                ProductSyncIssueSeverity.Error,
                ProductSyncStage.Matching,
                "create_no_tax_group_failed",
                $"The '{NoTaxGroupName}' tax group could not be created automatically.",
                handle: handle));
            return null;
        }

        taxGroupByName[NoTaxGroupName] = createResult.ResultObject;
        return createResult.ResultObject;
    }

    private List<SaveProductOptionDto> BuildVariantOptions(List<ProductSyncCsvRow> rows, Dictionary<string, string> optionTypeMap)
    {
        var options = new List<SaveProductOptionDto>();
        for (var optionIndex = 1; optionIndex <= 3; optionIndex++)
        {
            var optionNameColumn = $"Option{optionIndex} Name";
            var optionValueColumn = $"Option{optionIndex} Value";

            var optionName = rows
                .Select(x => Normalize(x[optionNameColumn]))
                .FirstOrDefault(x => !string.IsNullOrWhiteSpace(x));

            if (string.IsNullOrWhiteSpace(optionName))
            {
                continue;
            }

            var values = rows
                .Select(x => Normalize(x[optionValueColumn]))
                .Where(x => !string.IsNullOrWhiteSpace(x))
                .Cast<string>()
                .Distinct(StringComparer.OrdinalIgnoreCase)
                .ToList();

            if (values.Count == 0)
            {
                continue;
            }

            var optionTypeAlias = optionTypeMap.TryGetValue(optionName, out var mappedType)
                ? mappedType
                : InferOptionTypeAlias(optionName);

            var optionUiAlias = string.Equals(optionTypeAlias, "colour", StringComparison.OrdinalIgnoreCase)
                ? "colour"
                : "dropdown";

            options.Add(new SaveProductOptionDto
            {
                Name = optionName,
                Alias = optionName.ToLowerInvariant().Replace(" ", "-"),
                SortOrder = optionIndex - 1,
                OptionTypeAlias = optionTypeAlias,
                OptionUiAlias = optionUiAlias,
                IsVariant = true,
                IsMultiSelect = false,
                IsRequired = false,
                Values = values
                    .Select((valueName, valueIndex) => new SaveOptionValueDto
                    {
                        Name = valueName,
                        FullName = $"{optionName}: {valueName}",
                        SortOrder = valueIndex
                    })
                    .ToList()
            });
        }

        return options;
    }

    private List<SaveProductOptionDto> MapExistingAddonOptions(ProductRoot? existingRoot)
    {
        if (existingRoot?.ProductOptions == null)
        {
            return [];
        }

        return existingRoot.ProductOptions
            .Where(x => !x.IsVariant)
            .OrderBy(x => x.SortOrder)
            .Select(option => new SaveProductOptionDto
            {
                Id = option.Id,
                Name = option.Name ?? string.Empty,
                Alias = option.Alias,
                SortOrder = option.SortOrder,
                OptionTypeAlias = option.OptionTypeAlias,
                OptionUiAlias = option.OptionUiAlias,
                IsVariant = false,
                IsMultiSelect = option.IsMultiSelect,
                IsRequired = option.IsRequired,
                Values = option.ProductOptionValues
                    .OrderBy(x => x.SortOrder)
                    .Select(value => new SaveOptionValueDto
                    {
                        Id = value.Id,
                        Name = value.Name ?? string.Empty,
                        FullName = value.FullName,
                        SortOrder = value.SortOrder,
                        HexValue = value.HexValue,
                        MediaKey = value.MediaKey,
                        PriceAdjustment = value.PriceAdjustment,
                        CostAdjustment = value.CostAdjustment,
                        SkuSuffix = value.SkuSuffix,
                        WeightKg = value.WeightKg
                    })
                    .ToList()
            })
            .ToList();
    }

    private Dictionary<string, string> ParseOptionTypeMap(
        List<ProductSyncCsvRow> rows,
        ProductSyncProfile profile,
        Guid runId,
        string handle,
        List<ProductSyncIssue> issues)
    {
        var map = new Dictionary<string, string>(StringComparer.OrdinalIgnoreCase);
        if (profile != ProductSyncProfile.MerchelloExtended)
        {
            return map;
        }

        var json = rows
            .Select(x => Normalize(x[ShopifyCsvSchema.ExtendedOptionTypeMapJson]))
            .FirstOrDefault(x => !string.IsNullOrWhiteSpace(x));

        if (string.IsNullOrWhiteSpace(json))
        {
            return map;
        }

        try
        {
            var parsed = JsonSerializer.Deserialize<Dictionary<string, string>>(json, JsonOptions) ?? [];
            foreach (var (key, value) in parsed)
            {
                if (!string.IsNullOrWhiteSpace(key) && !string.IsNullOrWhiteSpace(value))
                {
                    map[key.Trim()] = value.Trim();
                }
            }
        }
        catch
        {
            issues.Add(issueFactory.Create(
                runId,
                ProductSyncIssueSeverity.Warning,
                ProductSyncStage.Mapping,
                "invalid_option_type_map",
                "Merchello:OptionTypeMapJson could not be parsed and inference was used.",
                handle: handle,
                field: ShopifyCsvSchema.ExtendedOptionTypeMapJson));
        }

        return map;
    }

    private Product? ResolveVariantForRow(
        ProductRoot root,
        List<ProductOption> variantOptions,
        ProductSyncCsvRow row,
        Guid runId,
        string handle,
        List<ProductSyncIssue> issues)
    {
        if (root.Products.Count == 0)
        {
            return null;
        }

        if (variantOptions.Count == 0)
        {
            return root.Products.FirstOrDefault(x => x.Default) ?? root.Products.FirstOrDefault();
        }

        var optionValueIds = new List<Guid>();
        for (var optionIndex = 0; optionIndex < variantOptions.Count; optionIndex++)
        {
            var option = variantOptions[optionIndex];
            var valueColumn = $"Option{optionIndex + 1} Value";
            var valueName = Normalize(row[valueColumn]);

            if (string.IsNullOrWhiteSpace(valueName))
            {
                issues.Add(issueFactory.Create(
                    runId,
                    ProductSyncIssueSeverity.Error,
                    ProductSyncStage.Mapping,
                    "missing_option_value",
                    $"{valueColumn} is required to resolve variant.",
                    row.RowNumber,
                    handle,
                    field: valueColumn));
                return null;
            }

            var optionValue = option.ProductOptionValues
                .FirstOrDefault(x => string.Equals(x.Name, valueName, StringComparison.OrdinalIgnoreCase));

            if (optionValue == null)
            {
                issues.Add(issueFactory.Create(
                    runId,
                    ProductSyncIssueSeverity.Error,
                    ProductSyncStage.Mapping,
                    "unknown_option_value",
                    $"Option value '{valueName}' was not found for option '{option.Name}'.",
                    row.RowNumber,
                    handle,
                    field: valueColumn));
                return null;
            }

            optionValueIds.Add(optionValue.Id);
        }

        var key = string.Join(",", optionValueIds);
        var variant = root.Products.FirstOrDefault(x => x.VariantOptionsKey == key);
        if (variant == null)
        {
            issues.Add(issueFactory.Create(
                runId,
                ProductSyncIssueSeverity.Error,
                ProductSyncStage.Mapping,
                "variant_not_found",
                "Generated variant key did not match any variant.",
                row.RowNumber,
                handle));
        }

        return variant;
    }

    private int GetOrCreateMediaFolder(string name, int parentId)
    {
        var existing = mediaService.GetPagedChildren(parentId, 0, int.MaxValue, out _)
            .FirstOrDefault(m =>
                m.ContentType.Alias == FolderMediaTypeAlias &&
                string.Equals(m.Name, name, StringComparison.OrdinalIgnoreCase));

        if (existing != null) return existing.Id;

        return mediaService.CreateMediaWithIdentity(name, parentId, FolderMediaTypeAlias).Id;
    }

    private async Task<Guid?> ImportImageAsync(
        Guid runId,
        string handle,
        int? rowNumber,
        string field,
        string imageUrl,
        int parentMediaId,
        bool continueOnImageFailure,
        List<ProductSyncIssue> issues,
        Dictionary<string, Guid?> cache,
        CancellationToken cancellationToken)
    {
        if (cache.TryGetValue(imageUrl, out var cached))
        {
            return cached;
        }

        if (!UrlSecurityValidator.TryValidatePublicHttpUrl(imageUrl, requireHttps: false, out var safeUri, out var validationError))
        {
            var severity = continueOnImageFailure ? ProductSyncIssueSeverity.Warning : ProductSyncIssueSeverity.Error;
            issues.Add(issueFactory.Create(
                runId,
                severity,
                ProductSyncStage.Images,
                "invalid_image_url",
                $"Image URL '{imageUrl}' was rejected: {validationError}",
                rowNumber,
                handle,
                field: field));
            cache[imageUrl] = null;
            return null;
        }

        if (safeUri == null)
        {
            var severity = continueOnImageFailure ? ProductSyncIssueSeverity.Warning : ProductSyncIssueSeverity.Error;
            issues.Add(issueFactory.Create(
                runId,
                severity,
                ProductSyncStage.Images,
                "invalid_image_url",
                $"Image URL '{imageUrl}' was rejected.",
                rowNumber,
                handle,
                field: field));
            cache[imageUrl] = null;
            return null;
        }

        try
        {
            using var timeoutCts = CancellationTokenSource.CreateLinkedTokenSource(cancellationToken);
            timeoutCts.CancelAfter(TimeSpan.FromSeconds(Math.Max(5, _settings.ImageDownloadTimeoutSeconds)));
            var token = timeoutCts.Token;

            var client = httpClientFactory.CreateClient(nameof(ProductSyncService));
            using var response = await client.GetAsync(safeUri, HttpCompletionOption.ResponseHeadersRead, token);
            if (!response.IsSuccessStatusCode)
            {
                throw new InvalidOperationException($"HTTP {(int)response.StatusCode} when downloading image.");
            }

            var contentLength = response.Content.Headers.ContentLength;
            if (contentLength.HasValue && contentLength.Value > _settings.MaxImageBytes)
            {
                throw new InvalidOperationException(
                    $"Image exceeded max size ({contentLength.Value} bytes > {_settings.MaxImageBytes} bytes).");
            }

            await using var sourceStream = await response.Content.ReadAsStreamAsync(token);
            var bytes = await ReadStreamWithLimitAsync(sourceStream, _settings.MaxImageBytes, token);
            if (bytes == null)
            {
                throw new InvalidOperationException($"Image exceeded max size ({_settings.MaxImageBytes} bytes).");
            }

            var fileName = BuildImageFileName(safeUri, response.Content.Headers.ContentType);
            var mediaName = Path.GetFileNameWithoutExtension(fileName);
            if (string.IsNullOrWhiteSpace(mediaName))
            {
                mediaName = $"imported-image-{DateTime.UtcNow:yyyyMMddHHmmss}";
            }

            var media = mediaService.CreateMedia(
                mediaName,
                parentMediaId,
                ImageMediaTypeAlias);

            await using var buffer = new MemoryStream(bytes, writable: false);
            media.SetValue(
                mediaFileManager,
                mediaUrlGenerators,
                shortStringHelper,
                contentTypeBaseServiceProvider,
                ImagePropertyAlias,
                fileName,
                buffer,
                null,
                null);

            mediaService.Save(media);
            cache[imageUrl] = media.Key;
            return media.Key;
        }
        catch (Exception ex)
        {
            var severity = continueOnImageFailure ? ProductSyncIssueSeverity.Warning : ProductSyncIssueSeverity.Error;
            issues.Add(issueFactory.Create(
                runId,
                severity,
                ProductSyncStage.Images,
                "image_import_failed",
                $"Failed to import image '{imageUrl}': {ex.Message}",
                rowNumber,
                handle,
                field: field));
            cache[imageUrl] = null;
            return null;
        }
    }

    private async Task<byte[]?> ReadStreamWithLimitAsync(Stream stream, int maxBytes, CancellationToken cancellationToken)
    {
        await using var memory = new MemoryStream();
        var buffer = new byte[81920];
        var total = 0;

        while (true)
        {
            var read = await stream.ReadAsync(buffer.AsMemory(0, buffer.Length), cancellationToken);
            if (read == 0)
            {
                break;
            }

            total += read;
            if (total > maxBytes)
            {
                return null;
            }

            await memory.WriteAsync(buffer.AsMemory(0, read), cancellationToken);
        }

        return memory.ToArray();
    }

    private async Task ApplyRootExtendedDataAsync(
        Guid productRootId,
        ProductSyncProfile profile,
        Dictionary<string, object>? rootExtendedData,
        string handle,
        string? vendor,
        string? tags,
        string? type,
        string? productCategory,
        string? collection,
        CancellationToken cancellationToken)
    {
        using var scope = efCoreScopeProvider.CreateScope();
        await scope.ExecuteWithContextAsync(async db =>
        {
            var root = await db.RootProducts.FirstOrDefaultAsync(x => x.Id == productRootId, cancellationToken);
            if (root == null)
            {
                return false;
            }

            if (profile == ProductSyncProfile.MerchelloExtended && rootExtendedData != null)
            {
                root.ExtendedData = rootExtendedData;
            }

            root.ExtendedData[ShopifyHandleKey] = handle;
            root.ExtendedData[ShopifyVendorKey] = vendor ?? string.Empty;
            root.ExtendedData[ShopifyTagsKey] = tags ?? string.Empty;
            root.ExtendedData[ShopifyTypeKey] = type ?? string.Empty;
            root.ExtendedData[ShopifyProductCategoryKey] = productCategory ?? string.Empty;
            root.ExtendedData[ShopifyCollectionKey] = collection ?? string.Empty;

            db.Entry(root).Property(x => x.ExtendedData).IsModified = true;
            await db.SaveChangesAsync(cancellationToken);
            return true;
        });
        scope.Complete();
    }

    private string? ResolveImageReference(string? imageReference)
    {
        if (string.IsNullOrWhiteSpace(imageReference))
        {
            return null;
        }

        var value = imageReference.Trim();
        if (value.StartsWith("http://", StringComparison.OrdinalIgnoreCase) ||
            value.StartsWith("https://", StringComparison.OrdinalIgnoreCase))
        {
            return value;
        }

        if (!Guid.TryParse(value, out var mediaKey))
        {
            return value.StartsWith('/') ? BuildAbsoluteUrl(value) : value;
        }

        var media = mediaService.GetById(mediaKey);
        if (media == null)
        {
            return null;
        }

        if (!mediaUrlGenerators.TryGetMediaPath(
                media.ContentType.Alias,
                media.GetValue<string>(ImagePropertyAlias),
                out var mediaPath))
        {
            return null;
        }

        return BuildAbsoluteUrl(mediaPath);
    }

    private string? BuildAbsoluteUrl(string? pathOrUrl)
    {
        if (string.IsNullOrWhiteSpace(pathOrUrl))
        {
            return null;
        }

        if (Uri.TryCreate(pathOrUrl, UriKind.Absolute, out var absolute))
        {
            return absolute.ToString();
        }

        if (string.IsNullOrWhiteSpace(_storeWebsiteUrl) ||
            !Uri.TryCreate(_storeWebsiteUrl, UriKind.Absolute, out var baseUri))
        {
            return pathOrUrl;
        }

        var relative = pathOrUrl.StartsWith('/')
            ? pathOrUrl
            : "/" + pathOrUrl;

        return new Uri(baseUri, relative).ToString();
    }

    private static string ReadExtendedString(Dictionary<string, object>? data, string key)
    {
        if (data == null || !data.TryGetValue(key, out var value))
        {
            return string.Empty;
        }

        return value.UnwrapJsonElement()?.ToString() ?? string.Empty;
    }

    private static List<Guid> ParseVariantOptionsKey(string? variantOptionsKey)
    {
        if (string.IsNullOrWhiteSpace(variantOptionsKey))
        {
            return [];
        }

        return variantOptionsKey
            .Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries)
            .Select(x => Guid.TryParse(x, out var id) ? id : Guid.Empty)
            .Where(x => x != Guid.Empty)
            .ToList();
    }

    private static string InferOptionTypeAlias(string? optionName)
    {
        var normalized = Normalize(optionName);
        if (string.IsNullOrWhiteSpace(normalized))
        {
            return "dropdown";
        }

        if (normalized.Contains("color", StringComparison.OrdinalIgnoreCase) ||
            normalized.Contains("colour", StringComparison.OrdinalIgnoreCase))
        {
            return "colour";
        }

        if (normalized.Contains("size", StringComparison.OrdinalIgnoreCase))
        {
            return "size";
        }

        if (normalized.Contains("material", StringComparison.OrdinalIgnoreCase))
        {
            return "material";
        }

        if (normalized.Contains("pattern", StringComparison.OrdinalIgnoreCase))
        {
            return "pattern";
        }

        return normalized.ToLowerInvariant().Replace(" ", "-");
    }

    private static decimal? ParseDecimal(string? value)
    {
        var normalized = Normalize(value);
        if (string.IsNullOrWhiteSpace(normalized))
        {
            return null;
        }

        return decimal.TryParse(normalized, NumberStyles.Number, CultureInfo.InvariantCulture, out var parsed)
            ? parsed
            : null;
    }

    private static bool ParsePublished(string? value, bool fallback)
    {
        var normalized = Normalize(value);
        if (string.IsNullOrWhiteSpace(normalized))
        {
            return fallback;
        }

        if (normalized.Equals("TRUE", StringComparison.OrdinalIgnoreCase) ||
            normalized.Equals("1", StringComparison.OrdinalIgnoreCase))
        {
            return true;
        }

        if (normalized.Equals("FALSE", StringComparison.OrdinalIgnoreCase) ||
            normalized.Equals("0", StringComparison.OrdinalIgnoreCase))
        {
            return false;
        }

        return bool.TryParse(normalized, out var parsed)
            ? parsed
            : fallback;
    }

    private static string FormatDecimal(decimal value)
        => value.ToString("0.####", CultureInfo.InvariantCulture);

    private static string? Normalize(string? value)
        => string.IsNullOrWhiteSpace(value) ? null : value.Trim();

    private static string ResolveRequiredTitle(string? resolvedTitle, string handle)
    {
        if (resolvedTitle is null)
        {
            return handle;
        }

        return string.IsNullOrWhiteSpace(resolvedTitle) ? handle : resolvedTitle;
    }

    private ProductSyncImportRunOptions DeserializeImportOptions(string? optionsJson)
    {
        if (string.IsNullOrWhiteSpace(optionsJson))
        {
            return new ProductSyncImportRunOptions();
        }

        try
        {
            return JsonSerializer.Deserialize<ProductSyncImportRunOptions>(optionsJson, JsonOptions) ??
                   new ProductSyncImportRunOptions();
        }
        catch
        {
            return new ProductSyncImportRunOptions();
        }
    }

    private static string BuildImageFileName(Uri safeUri, MediaTypeHeaderValue? contentType)
    {
        var fileName = Path.GetFileName(safeUri.LocalPath);
        fileName = string.IsNullOrWhiteSpace(fileName)
            ? $"image-{DateTime.UtcNow:yyyyMMddHHmmss}"
            : fileName;

        fileName = SanitizeFileName(fileName);
        if (Path.HasExtension(fileName))
        {
            return fileName;
        }

        var extension = contentType?.MediaType?.ToLowerInvariant() switch
        {
            "image/jpeg" => ".jpg",
            "image/png" => ".png",
            "image/webp" => ".webp",
            "image/gif" => ".gif",
            "image/svg+xml" => ".svg",
            _ => ".jpg"
        };

        return $"{fileName}{extension}";
    }

    private static string SanitizeFileName(string fileName)
    {
        var invalid = Path.GetInvalidFileNameChars();
        var builder = new StringBuilder(fileName.Length);
        foreach (var c in fileName)
        {
            builder.Append(invalid.Contains(c) ? '_' : c);
        }

        var sanitized = builder.ToString();
        return sanitized.Length > 180 ? sanitized[..180] : sanitized;
    }

    private static object? ConvertJsonElement(JsonElement element)
    {
        return element.ValueKind switch
        {
            JsonValueKind.Object => element.EnumerateObject()
                .ToDictionary(x => x.Name, x => ConvertJsonElement(x.Value) ?? string.Empty, StringComparer.OrdinalIgnoreCase),
            JsonValueKind.Array => element.EnumerateArray()
                .Select(ConvertJsonElement)
                .ToList(),
            JsonValueKind.String => element.GetString(),
            JsonValueKind.Number => element.TryGetInt64(out var longValue)
                ? longValue
                : element.TryGetDecimal(out var decimalValue)
                    ? decimalValue
                    : element.GetDouble(),
            JsonValueKind.True => true,
            JsonValueKind.False => false,
            JsonValueKind.Null or JsonValueKind.Undefined => null,
            _ => element.GetRawText()
        };
    }

    private static List<SaveProductOptionDto> MapAddonOptionsForExport(ProductRoot root)
    {
        return root.ProductOptions
            .Where(x => !x.IsVariant)
            .OrderBy(x => x.SortOrder)
            .ThenBy(x => x.Name)
            .Select(option => new SaveProductOptionDto
            {
                Name = option.Name ?? string.Empty,
                Alias = option.Alias,
                SortOrder = option.SortOrder,
                OptionTypeAlias = option.OptionTypeAlias,
                OptionUiAlias = option.OptionUiAlias,
                IsVariant = false,
                IsMultiSelect = option.IsMultiSelect,
                IsRequired = option.IsRequired,
                Values = option.ProductOptionValues
                    .OrderBy(x => x.SortOrder)
                    .ThenBy(x => x.Name)
                    .Select(value => new SaveOptionValueDto
                    {
                        Name = value.Name ?? string.Empty,
                        FullName = value.FullName,
                        SortOrder = value.SortOrder,
                        HexValue = value.HexValue,
                        MediaKey = value.MediaKey,
                        PriceAdjustment = value.PriceAdjustment,
                        CostAdjustment = value.CostAdjustment,
                        SkuSuffix = value.SkuSuffix,
                        WeightKg = value.WeightKg
                    })
                    .ToList()
            })
            .ToList();
    }

    private void EnsureCsvSize(Stream csvStream, string fileName)
    {
        if (!csvStream.CanSeek)
        {
            return;
        }

        if (csvStream.Length <= _settings.MaxCsvBytes)
        {
            return;
        }

        throw new InvalidOperationException(
            $"CSV '{fileName}' exceeded the maximum allowed size of {_settings.MaxCsvBytes} bytes.");
    }

    private static ProductSyncRunDto MapRun(ProductSyncRun run)
    {
        var (label, cssClass) = run.Status switch
        {
            ProductSyncRunStatus.Queued => ("Queued", "default"),
            ProductSyncRunStatus.Running => ("Running", "warning"),
            ProductSyncRunStatus.Completed => ("Completed", "positive"),
            ProductSyncRunStatus.Failed => ("Failed", "danger"),
            _ => (run.Status.ToString(), "default")
        };

        return new ProductSyncRunDto
        {
            Id = run.Id,
            Direction = run.Direction,
            Profile = run.Profile,
            Status = run.Status,
            StatusLabel = label,
            StatusCssClass = cssClass,
            RequestedByUserId = run.RequestedByUserId,
            RequestedByUserName = run.RequestedByUserName,
            InputFileName = run.InputFileName,
            OutputFileName = run.OutputFileName,
            ItemsProcessed = run.ItemsProcessed,
            ItemsSucceeded = run.ItemsSucceeded,
            ItemsFailed = run.ItemsFailed,
            WarningCount = run.WarningCount,
            ErrorCount = run.ErrorCount,
            StartedAtUtc = run.StartedAtUtc,
            CompletedAtUtc = run.CompletedAtUtc,
            DateCreatedUtc = run.DateCreatedUtc,
            ErrorMessage = run.ErrorMessage
        };
    }

    private static ProductSyncIssueDto MapIssue(ProductSyncIssue issue)
    {
        return new ProductSyncIssueDto
        {
            Id = issue.Id,
            RunId = issue.RunId,
            Severity = issue.Severity,
            Stage = issue.Stage,
            Code = issue.Code,
            Message = issue.Message,
            RowNumber = issue.RowNumber,
            Handle = issue.Handle,
            Sku = issue.Sku,
            Field = issue.Field,
            DateCreatedUtc = issue.DateCreatedUtc
        };
    }
}
