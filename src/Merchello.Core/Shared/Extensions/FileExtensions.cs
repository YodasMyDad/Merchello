using Microsoft.Extensions.Hosting;

namespace Merchello.Core.Shared.Extensions;

public static class FileExtensions
{
    public static string MapPath(this IHostEnvironment webHostEnvironment, string path)
    {
        if (!string.IsNullOrWhiteSpace(path))
        {
            path = path.Replace("/", "\\");
            if (!path.StartsWith("\\", StringComparison.CurrentCultureIgnoreCase))
            {
                path = $"\\{path}";
            }
            return $"{webHostEnvironment.ContentRootPath}{path}";
        }
        return webHostEnvironment.ContentRootPath;
    }
}
