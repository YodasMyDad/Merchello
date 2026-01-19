using System.Text.Json;
using Merchello.Core.DigitalProducts.Models;
using Merchello.Core.Products.Models;

namespace Merchello.Core.DigitalProducts.Extensions;

/// <summary>
/// Extension methods for accessing digital product settings stored in ProductRoot.ExtendedData.
/// </summary>
public static class ProductRootDigitalExtensions
{
    /// <summary>
    /// Gets the digital delivery method for this product.
    /// </summary>
    public static DigitalDeliveryMethod GetDigitalDeliveryMethod(this ProductRoot product)
    {
        if (product.ExtendedData.TryGetValue(Constants.ExtendedDataKeys.DigitalDeliveryMethod, out var value) &&
            Enum.TryParse<DigitalDeliveryMethod>(value?.ToString(), out var method))
        {
            return method;
        }
        return DigitalDeliveryMethod.InstantDownload;
    }

    /// <summary>
    /// Sets the digital delivery method for this product.
    /// </summary>
    public static void SetDigitalDeliveryMethod(this ProductRoot product, DigitalDeliveryMethod method)
        => product.ExtendedData[Constants.ExtendedDataKeys.DigitalDeliveryMethod] = method.ToString();

    /// <summary>
    /// Gets the list of Umbraco Media IDs for digital files associated with this product.
    /// </summary>
    public static List<string> GetDigitalFileIds(this ProductRoot product)
    {
        if (product.ExtendedData.TryGetValue(Constants.ExtendedDataKeys.DigitalFileIds, out var value))
        {
            var valueStr = value?.ToString();
            if (!string.IsNullOrEmpty(valueStr))
            {
                try
                {
                    return JsonSerializer.Deserialize<List<string>>(valueStr) ?? [];
                }
                catch (JsonException)
                {
                    // Return empty list if JSON is malformed
                    return [];
                }
            }
        }
        return [];
    }

    /// <summary>
    /// Sets the list of Umbraco Media IDs for digital files associated with this product.
    /// </summary>
    public static void SetDigitalFileIds(this ProductRoot product, List<string> fileIds)
        => product.ExtendedData[Constants.ExtendedDataKeys.DigitalFileIds] = JsonSerializer.Serialize(fileIds);

    /// <summary>
    /// Gets the number of days download links remain valid. 0 means unlimited.
    /// </summary>
    public static int GetDownloadLinkExpiryDays(this ProductRoot product)
    {
        if (product.ExtendedData.TryGetValue(Constants.ExtendedDataKeys.DownloadLinkExpiryDays, out var value))
            return int.TryParse(value?.ToString(), out var days) ? days : 30;
        return 30;  // Default 30 days
    }

    /// <summary>
    /// Sets the number of days download links remain valid. 0 means unlimited.
    /// </summary>
    public static void SetDownloadLinkExpiryDays(this ProductRoot product, int days)
        => product.ExtendedData[Constants.ExtendedDataKeys.DownloadLinkExpiryDays] = days.ToString();

    /// <summary>
    /// Gets the maximum number of downloads allowed per link. 0 means unlimited.
    /// </summary>
    public static int GetMaxDownloadsPerLink(this ProductRoot product)
    {
        if (product.ExtendedData.TryGetValue(Constants.ExtendedDataKeys.MaxDownloadsPerLink, out var value))
            return int.TryParse(value?.ToString(), out var max) ? max : 0;
        return 0;  // 0 = unlimited
    }

    /// <summary>
    /// Sets the maximum number of downloads allowed per link. 0 means unlimited.
    /// </summary>
    public static void SetMaxDownloadsPerLink(this ProductRoot product, int maxDownloads)
        => product.ExtendedData[Constants.ExtendedDataKeys.MaxDownloadsPerLink] = maxDownloads.ToString();

    /// <summary>
    /// Returns true if this is a digital product with files configured.
    /// </summary>
    public static bool HasDigitalFiles(this ProductRoot product)
        => product.IsDigitalProduct && product.GetDigitalFileIds().Count > 0;
}
