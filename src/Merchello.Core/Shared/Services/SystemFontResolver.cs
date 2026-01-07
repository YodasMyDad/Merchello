using System.Runtime.InteropServices;
using PdfSharp.Fonts;

namespace Merchello.Core.Shared.Services;

/// <summary>
/// Cross-platform font resolver for PdfSharp that loads fonts from system fonts folders.
/// Required for PdfSharp 6.x in .NET Core environments.
/// </summary>
public class SystemFontResolver : IFontResolver
{
    private static readonly string[] FontPaths = GetFontPaths();

    private static string[] GetFontPaths()
    {
        if (RuntimeInformation.IsOSPlatform(OSPlatform.Windows))
        {
            return [Environment.GetFolderPath(Environment.SpecialFolder.Fonts)];
        }

        if (RuntimeInformation.IsOSPlatform(OSPlatform.OSX))
        {
            return
            [
                "/System/Library/Fonts",
                "/Library/Fonts",
                Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.UserProfile), "Library/Fonts")
            ];
        }

        // Linux
        return
        [
            "/usr/share/fonts/truetype",
            "/usr/share/fonts",
            "/usr/local/share/fonts",
            Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.UserProfile), ".fonts")
        ];
    }

    public FontResolverInfo? ResolveTypeface(string familyName, bool isBold, bool isItalic)
    {
        var fontStyle = (isBold, isItalic) switch
        {
            (true, true) => "bi",
            (true, false) => "b",
            (false, true) => "i",
            _ => ""
        };

        var fontName = familyName.ToLowerInvariant() switch
        {
            "arial" => $"arial{fontStyle}",
            "times new roman" => $"times{fontStyle}",
            "courier new" => $"cour{fontStyle}",
            // macOS/Linux alternatives
            "helvetica" => GetHelveticaVariant(fontStyle),
            _ => $"arial{fontStyle}" // Fallback to Arial
        };

        return new FontResolverInfo(fontName);
    }

    private static string GetHelveticaVariant(string style) => style switch
    {
        "b" => "Helvetica-Bold",
        "i" => "Helvetica-Oblique",
        "bi" => "Helvetica-BoldOblique",
        _ => "Helvetica"
    };

    public byte[]? GetFont(string faceName)
    {
        // Try to find the exact font file
        foreach (var fontPath in FontPaths)
        {
            if (!Directory.Exists(fontPath)) continue;

            var fontFile = FindFontFile(fontPath, faceName);
            if (fontFile != null)
                return File.ReadAllBytes(fontFile);
        }

        // Fallback: try to find any Arial or similar font
        foreach (var fontPath in FontPaths)
        {
            if (!Directory.Exists(fontPath)) continue;

            var fallback = FindFontFile(fontPath, "arial") ??
                           FindFontFile(fontPath, "Arial") ??
                           FindFontFile(fontPath, "LiberationSans-Regular") ?? // Linux alternative
                           FindFontFile(fontPath, "DejaVuSans"); // Another Linux alternative

            if (fallback != null)
                return File.ReadAllBytes(fallback);
        }

        return null;
    }

    private static string? FindFontFile(string directory, string faceName)
    {
        var directPath = Path.Combine(directory, $"{faceName}.ttf");
        if (File.Exists(directPath))
            return directPath;

        // Search recursively for the font file
        try
        {
            var files = Directory.GetFiles(directory, $"{faceName}.ttf", SearchOption.AllDirectories);
            if (files.Length > 0)
                return files[0];

            // Try case-insensitive search
            files = Directory.GetFiles(directory, "*.ttf", SearchOption.AllDirectories);
            return files.FirstOrDefault(f =>
                Path.GetFileNameWithoutExtension(f).Equals(faceName, StringComparison.OrdinalIgnoreCase));
        }
        catch (UnauthorizedAccessException)
        {
            // Some font directories may be restricted
            return null;
        }
    }
}
