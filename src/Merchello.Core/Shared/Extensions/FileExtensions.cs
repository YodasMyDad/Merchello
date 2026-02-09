using Microsoft.Extensions.Hosting;

namespace Merchello.Core.Shared.Extensions;

public static class FileExtensions
{
    public static string MapPath(this IHostEnvironment webHostEnvironment, string path)
    {
        if (!string.IsNullOrWhiteSpace(path))
        {
            return Path.Combine(webHostEnvironment.ContentRootPath, path);
        }
        return webHostEnvironment.ContentRootPath;
    }
}
