using System.Text.Json;
using System.Text.Json.Serialization;
using System.Text.RegularExpressions;
using HtmlAgilityPack;
using Microsoft.Extensions.Logging;
using Umbraco.Cms.Core;
using Umbraco.Cms.Core.Blocks;
using Umbraco.Cms.Core.Models;
using Umbraco.Cms.Core.Models.Blocks;
using Umbraco.Cms.Core.Models.PublishedContent;
using Umbraco.Cms.Core.PropertyEditors;
using Umbraco.Cms.Core.PropertyEditors.ValueConverters;
using Umbraco.Cms.Core.Strings;
using Umbraco.Cms.Core.Templates;

namespace Merchello.Services;

/// <summary>
/// Renders TipTap rich text content with proper link, media, URL, and block resolution.
/// Uses Umbraco's infrastructure for full compatibility with RTE blocks.
/// </summary>
public partial class RichTextRenderer(
    HtmlLocalLinkParser linkParser,
    HtmlImageSourceParser imageParser,
    HtmlUrlParser urlParser,
    BlockEditorConverter blockEditorConverter,
    IPartialViewBlockEngine partialViewBlockEngine,
    ILogger<RichTextRenderer> logger) : IRichTextRenderer
{
    /// <inheritdoc />
    public IHtmlEncodedString Render(string? richTextJson) =>
        RenderAsync(richTextJson).GetAwaiter().GetResult();

    /// <inheritdoc />
    public async Task<IHtmlEncodedString> RenderAsync(string? richTextJson)
    {
        if (string.IsNullOrWhiteSpace(richTextJson))
            return new HtmlEncodedString(string.Empty);

        // 1. Parse JSON to get markup and blocks
        string markup;
        RichTextBlocksData? blocksData = null;

        try
        {
            using var doc = JsonDocument.Parse(richTextJson);
            var root = doc.RootElement;

            if (root.TryGetProperty("markup", out var markupElement))
            {
                markup = markupElement.GetString() ?? string.Empty;

                // Parse blocks if present
                if (root.TryGetProperty("blocks", out var blocksElement) &&
                    blocksElement.ValueKind != JsonValueKind.Null)
                {
                    blocksData = JsonSerializer.Deserialize<RichTextBlocksData>(
                        blocksElement.GetRawText(),
                        JsonOptions);
                }
            }
            else
            {
                // Backwards compatibility: treat as plain markup
                markup = richTextJson;
            }
        }
        catch (JsonException)
        {
            // Not valid JSON - treat as plain markup for backwards compatibility
            markup = richTextJson;
        }

        // 2. Resolve local links: {localLink:guid} -> actual URLs
        var result = linkParser.EnsureInternalLinks(markup);

        // 3. Resolve media: data-udi -> actual image URLs
        result = imageParser.EnsureImageSources(result);

        // 4. Resolve relative URLs: ~ -> application path
        result = urlParser.EnsureUrls(result);

        // 5. Render blocks if present
        if (blocksData?.ContentData?.Count > 0 && BlockRegex().IsMatch(result))
        {
            result = await RenderBlocksAsync(result, blocksData);
        }
        else if (BlockRegex().IsMatch(result))
        {
            // Blocks in markup but no block data - log warning and strip
            logger.LogWarning(
                "Rich text content contains block tags but no block data. " +
                "Blocks may not have been saved correctly.");
            result = BlockRegex().Replace(result, string.Empty);
        }

        // 6. Clean up UI attributes (data-udi, rel)
        result = CleanupHtml(result);

        return new HtmlEncodedString(result);
    }

    /// <summary>
    /// Renders blocks by replacing block tags with rendered partial view content.
    /// Partial views are loaded from ~/Views/Partials/richtext/Components/{ContentTypeAlias}.cshtml
    /// </summary>
    private async Task<string> RenderBlocksAsync(string markup, RichTextBlocksData blocksData)
    {
        // Build dictionaries for content and settings lookup by key
        var contentByKey = blocksData.ContentData?
            .Where(c => c.Key != Guid.Empty)
            .ToDictionary(c => c.Key) ?? [];

        var settingsByKey = blocksData.SettingsData?
            .Where(s => s.Key != Guid.Empty)
            .ToDictionary(s => s.Key) ?? [];

        // Build layout lookup to find settings key for each content key
        var layoutByContentKey = new Dictionary<Guid, RichTextLayoutItem>();
        if (blocksData.Layout != null)
        {
            foreach (var kvp in blocksData.Layout)
            {
                foreach (var item in kvp.Value)
                {
                    if (Guid.TryParse(item.ContentKey, out var contentKey))
                    {
                        layoutByContentKey[contentKey] = item;
                    }
                }
            }
        }

        // Find all matches first, then process asynchronously
        var matches = BlockRegex().Matches(markup);
        if (matches.Count == 0)
            return markup;

        // Process each match and collect replacements
        var replacements = new Dictionary<string, string>();
        foreach (Match match in matches)
        {
            if (replacements.ContainsKey(match.Value))
                continue;

            var replacement = await RenderBlockMatchAsync(
                match,
                contentByKey,
                settingsByKey,
                layoutByContentKey);

            replacements[match.Value] = replacement;
        }

        // Apply all replacements
        var result = markup;
        foreach (var kvp in replacements)
        {
            result = result.Replace(kvp.Key, kvp.Value);
        }

        return result;
    }

    /// <summary>
    /// Renders a single block match asynchronously.
    /// </summary>
    private async Task<string> RenderBlockMatchAsync(
        Match match,
        Dictionary<Guid, BlockContentData> contentByKey,
        Dictionary<Guid, BlockContentData> settingsByKey,
        Dictionary<Guid, RichTextLayoutItem> layoutByContentKey)
    {
        if (!Guid.TryParse(match.Groups["key"].Value, out var contentKey))
        {
            return string.Empty;
        }

        if (!contentByKey.TryGetValue(contentKey, out var contentData))
        {
            logger.LogWarning("Block with key {Key} not found in content data", contentKey);
            return string.Empty;
        }

        try
        {
            // Convert block data to IPublishedElement
            var blockItemData = CreateBlockItemData(contentData);
            var contentElement = blockEditorConverter.ConvertToElement(
                CreateMinimalOwner(),
                blockItemData,
                PropertyCacheLevel.None,
                preview: false);

            if (contentElement == null)
            {
                logger.LogWarning(
                    "Failed to convert block {Key} to published element. " +
                    "Content type {ContentTypeKey} may not be registered as an Element Type.",
                    contentKey, contentData.ContentTypeKey);
                return string.Empty;
            }

            // Get settings element if present
            IPublishedElement? settingsElement = null;
            Guid? settingsKey = null;

            if (layoutByContentKey.TryGetValue(contentKey, out var layoutItem) &&
                !string.IsNullOrEmpty(layoutItem.SettingsKey) &&
                Guid.TryParse(layoutItem.SettingsKey, out var parsedSettingsKey) &&
                settingsByKey.TryGetValue(parsedSettingsKey, out var settingsData))
            {
                settingsKey = parsedSettingsKey;
                var settingsItemData = CreateBlockItemData(settingsData);
                settingsElement = blockEditorConverter.ConvertToElement(
                    CreateMinimalOwner(),
                    settingsItemData,
                    PropertyCacheLevel.None,
                    preview: false);
            }

            // Create block item and render via partial view engine
            // Partial view path: ~/Views/Partials/richtext/Components/{ContentTypeAlias}.cshtml
            var blockItem = new RichTextBlockItem(contentKey, contentElement, settingsKey, settingsElement);
            return await partialViewBlockEngine.ExecuteAsync(blockItem);
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Error rendering block {Key}", contentKey);
            return string.Empty;
        }
    }

    /// <summary>
    /// Creates a BlockItemData from our stored block data.
    /// </summary>
    private static BlockItemData CreateBlockItemData(BlockContentData data)
    {
        var blockItemData = new BlockItemData(data.Key, data.ContentTypeKey, string.Empty)
        {
            Values = data.Values?.Select(v => new BlockPropertyValue
            {
                Alias = v.Alias,
                Value = v.Value,
                Culture = null,
                Segment = null
            }).ToList<BlockPropertyValue>() ?? []
        };

        return blockItemData;
    }

    /// <summary>
    /// Creates a minimal IPublishedElement to satisfy the owner requirement.
    /// This is used for variation context which isn't applicable for Merchello products.
    /// </summary>
    private static IPublishedElement CreateMinimalOwner()
    {
        return new MinimalPublishedElement();
    }

    /// <summary>
    /// Removes editor-specific attributes from the HTML that shouldn't appear in the output.
    /// </summary>
    private static string CleanupHtml(string html)
    {
        if (string.IsNullOrWhiteSpace(html))
            return html;

        var doc = new HtmlDocument();
        doc.LoadHtml(html);

        if (doc.ParseErrors.Any() || doc.DocumentNode == null)
            return html;

        var modified = false;

        // Remove data-udi attributes from anchors and images
        var nodesWithDataUdi = doc.DocumentNode.SelectNodes("(//a|//img)[@data-udi]");
        if (nodesWithDataUdi != null)
        {
            foreach (var node in nodesWithDataUdi)
            {
                node.Attributes.Remove("data-udi");
                modified = true;
            }
        }

        // Remove numeric rel attributes from images (legacy Umbraco UI attribute)
        var imgsWithRel = doc.DocumentNode.SelectNodes("//img[@rel]");
        if (imgsWithRel != null)
        {
            foreach (var img in imgsWithRel)
            {
                var rel = img.GetAttributeValue("rel", string.Empty);
                if (int.TryParse(rel, out _))
                {
                    img.Attributes.Remove("rel");
                    modified = true;
                }
            }
        }

        return modified ? doc.DocumentNode.OuterHtml : html;
    }

    /// <summary>
    /// Regex to match RTE block tags in the markup.
    /// </summary>
    [GeneratedRegex("""<umb-rte-block(?:-inline)?(?: class="(?:.[^"]*)")? data-content-key="(?<key>.[^"]*)">(?:<!--Umbraco-Block-->)?</umb-rte-block(?:-inline)?>""")]
    private static partial Regex BlockRegex();

    private static readonly JsonSerializerOptions JsonOptions = new()
    {
        PropertyNameCaseInsensitive = true
    };
}
