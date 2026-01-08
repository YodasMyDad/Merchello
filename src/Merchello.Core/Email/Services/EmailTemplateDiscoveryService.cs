using Merchello.Core.Email.Models;
using Merchello.Core.Email.Services.Interfaces;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Options;

namespace Merchello.Core.Email.Services;

/// <summary>
/// Discovers email templates from the file system based on configured view locations.
/// </summary>
public class EmailTemplateDiscoveryService : IEmailTemplateDiscoveryService
{
    private readonly EmailSettings _settings;
    private readonly string _webRootPath;
    private readonly string _contentRootPath;

    public EmailTemplateDiscoveryService(
        IOptions<EmailSettings> settings,
        IHostEnvironment hostEnvironment)
    {
        _settings = settings.Value;
        _contentRootPath = hostEnvironment.ContentRootPath;
        _webRootPath = Path.Combine(hostEnvironment.ContentRootPath, "wwwroot");
    }

    public IReadOnlyList<EmailTemplateInfo> GetAvailableTemplates()
    {
        var templates = new List<EmailTemplateInfo>();

        foreach (var location in _settings.TemplateViewLocations)
        {
            var directory = GetTemplateDirectory(location);
            if (directory == null || !Directory.Exists(directory))
                continue;

            try
            {
                var files = Directory.GetFiles(directory, "*.cshtml", SearchOption.TopDirectoryOnly);
                foreach (var file in files)
                {
                    var fileName = Path.GetFileName(file);
                    var fileInfo = new FileInfo(file);

                    templates.Add(new EmailTemplateInfo
                    {
                        Path = fileName,
                        FullPath = file,
                        DisplayName = FormatDisplayName(Path.GetFileNameWithoutExtension(fileName)),
                        LastModified = fileInfo.LastWriteTimeUtc
                    });
                }
            }
            catch
            {
                // Directory access issues - skip this location
            }
        }

        return templates
            .DistinctBy(t => t.Path)
            .OrderBy(t => t.DisplayName)
            .ToList();
    }

    public bool TemplateExists(string templatePath)
    {
        return GetFullPath(templatePath) != null;
    }

    public EmailTemplateInfo? GetTemplate(string templatePath)
    {
        var fullPath = GetFullPath(templatePath);
        if (fullPath == null || !File.Exists(fullPath))
            return null;

        var fileInfo = new FileInfo(fullPath);
        return new EmailTemplateInfo
        {
            Path = templatePath,
            FullPath = fullPath,
            DisplayName = FormatDisplayName(Path.GetFileNameWithoutExtension(templatePath)),
            LastModified = fileInfo.LastWriteTimeUtc
        };
    }

    public string? GetFullPath(string templatePath)
    {
        if (string.IsNullOrWhiteSpace(templatePath))
            return null;

        // If it's already an absolute path, check if it exists
        if (Path.IsPathRooted(templatePath) && File.Exists(templatePath))
            return templatePath;

        // Normalize the template path
        var normalizedPath = templatePath.Replace("/", Path.DirectorySeparatorChar.ToString())
                                          .Replace("\\", Path.DirectorySeparatorChar.ToString());

        // Strip leading directory separators
        normalizedPath = normalizedPath.TrimStart(Path.DirectorySeparatorChar);

        // Try each configured location
        foreach (var location in _settings.TemplateViewLocations)
        {
            var directory = GetTemplateDirectory(location);
            if (directory == null)
                continue;

            // Try with the template name in the format string
            var templateName = Path.GetFileNameWithoutExtension(normalizedPath);
            var formattedPath = string.Format(location, templateName)
                .Replace("~", "")
                .TrimStart('/');

            var fullPath = Path.Combine(_contentRootPath, formattedPath);
            if (File.Exists(fullPath))
                return fullPath;

            // Try direct path in directory
            fullPath = Path.Combine(directory, normalizedPath);
            if (File.Exists(fullPath))
                return fullPath;

            // Try with .cshtml extension
            if (!normalizedPath.EndsWith(".cshtml", StringComparison.OrdinalIgnoreCase))
            {
                fullPath = Path.Combine(directory, normalizedPath + ".cshtml");
                if (File.Exists(fullPath))
                    return fullPath;
            }
        }

        return null;
    }

    private string? GetTemplateDirectory(string locationPattern)
    {
        // Remove format placeholder and extension to get directory
        var directory = locationPattern
            .Replace("{0}.cshtml", "")
            .Replace("{0}", "")
            .Replace("~", "")
            .TrimStart('/')
            .TrimEnd('/');

        var fullPath = Path.Combine(_contentRootPath, directory);
        return fullPath;
    }

    private static string FormatDisplayName(string fileName)
    {
        // Convert camelCase/PascalCase to readable format
        var result = System.Text.RegularExpressions.Regex.Replace(fileName, "([A-Z])", " $1").Trim();
        return result.Length > 0 ? char.ToUpperInvariant(result[0]) + result[1..] : result;
    }
}
