using System.Collections.Concurrent;
using System.Reflection;
using PdfSharp.Fonts;

namespace Merchello.Core.Shared.Services;

/// <summary>
/// Font resolver that loads Liberation Sans fonts from embedded assembly resources.
/// Provides cross-platform font support without requiring system fonts to be installed.
/// </summary>
public class EmbeddedFontResolver : IFontResolver
{
    private static readonly ConcurrentDictionary<string, byte[]> FontCache = new();
    private static readonly Assembly FontAssembly = typeof(EmbeddedFontResolver).Assembly;

    // Resource names follow pattern: Merchello.Core.Shared.Fonts.{filename}
    private const string ResourcePrefix = "Merchello.Core.Shared.Fonts.";

    public FontResolverInfo? ResolveTypeface(string familyName, bool isBold, bool isItalic)
    {
        // Map any font family request to Liberation Sans (our embedded font)
        var variant = (isBold, isItalic) switch
        {
            (true, true) => "BoldItalic",
            (true, false) => "Bold",
            (false, true) => "Italic",
            _ => "Regular"
        };

        return new FontResolverInfo($"LiberationSans-{variant}");
    }

    public byte[]? GetFont(string faceName)
    {
        // Check cache first
        if (FontCache.TryGetValue(faceName, out var cached))
            return cached;

        // Load from embedded resource
        var resourceName = $"{ResourcePrefix}{faceName}.ttf";
        using var stream = FontAssembly.GetManifestResourceStream(resourceName);

        if (stream == null)
        {
            // Log available resources for debugging
            var available = FontAssembly.GetManifestResourceNames()
                .Where(n => n.Contains("Font") || n.EndsWith(".ttf"))
                .ToList();

            throw new InvalidOperationException(
                $"Font resource '{resourceName}' not found. " +
                $"Available font resources: {string.Join(", ", available)}");
        }

        using var memoryStream = new MemoryStream();
        stream.CopyTo(memoryStream);
        var bytes = memoryStream.ToArray();

        // Cache for subsequent requests
        FontCache[faceName] = bytes;
        return bytes;
    }
}
