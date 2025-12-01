using System.Collections.Specialized;
using System.Web;
using AngleSharp.Text;
using Merchello.Core;

namespace Merchello.Core.Shared.Extensions;

public static class UriExtensions
{
    public static bool ContainsKey(this NameValueCollection collection, string key)
    {
        return collection[key] != null || collection.AllKeys.Any(k => k == key);
    }

    /// <summary>
    /// Adds a querystring parameter to a url
    /// </summary>
    /// <param name="url"></param>
    /// <param name="paramName"></param>
    /// <param name="paramValue"></param>
    /// <returns></returns>
    public static Uri AddUrlParameter(this Uri url, string paramName, string paramValue)
    {
        var uriBuilder = new UriBuilder(url);
        var query = HttpUtility.ParseQueryString(uriBuilder.Query);
        if (query.ContainsKey(paramName))
        {
            query.Set(paramName, paramValue);
        }
        else
        {
            query.Add(paramName, paramValue);
        }
        uriBuilder.Query = query.ToString();
        return new Uri(uriBuilder.ToString());
    }

    /// <summary>
    /// Removes a querystring parameter from a url
    /// </summary>
    /// <param name="url"></param>
    /// <param name="paramName"></param>
    /// <returns></returns>
    public static Uri RemoveUrlParameter(this Uri url, string paramName)
    {
        // Get querystring
        var query = HttpUtility.ParseQueryString(url.Query);

        // Remove the parameter
        query.Remove(paramName);

        // this gets the page path from root without QueryString
        var pagePathWithoutQueryString = url.GetLeftPart(UriPartial.Path);

        // See whether we return a url with a querystring or not
        var urlToReturn = query.Count > 0 ? $"{pagePathWithoutQueryString}?{query}" : pagePathWithoutQueryString;

        // Return the url
        return new Uri(urlToReturn);
    }

    /// <summary>
    /// Adds paging querystring paramaters to a url
    /// </summary>
    /// <param name="url"></param>
    /// <param name="currentPage"></param>
    /// <returns></returns>
    public static Uri AddPaging(this Uri url, long currentPage)
    {
        if (currentPage <= 1)
        {
            url = url.RemoveUrlParameter(Constants.DefaultPagingVariable);
        }
        else
        {
            url = url.AddUrlParameter(Constants.DefaultPagingVariable, currentPage.ToString());
        }

        return url;
    }
}
