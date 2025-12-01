using System.Text.Json;

namespace Merchello.Core.Shared.Extensions;

public static class DictionaryExtensions
{
    public static object? GetDictValue(this Dictionary<string, object> data, string key)
    {
        if (data.TryGetValue(key, out var value))
        {
            return value;
        }
        return null;
    }

    /// <summary>
    /// Gets a value from a dict and returns
    /// </summary>
    /// <param name="data"></param>
    /// <param name="key"></param>
    /// <typeparam name="T"></typeparam>
    /// <returns></returns>
    public static T? GetDictValue<T>(this Dictionary<string, object> data, string key)
    {
        if (data.ContainsKey(key))
        {
            var dictValue = data[key];
            return ConvertValue<T>(dictValue);
        }
        return default(T);
    }

    private static T? ConvertValue<T>(object? value)
    {
        if (value == null)
        {
            return default(T);
        }
        /*if (typeof(T) == typeof(JArray))
        {
            return (T)ReturnAsObject(value)!;
        }*/
        if (typeof(T) == typeof(string))
        {
            return (T)ReturnAsObject(value)!;
        }
        if (typeof(T) == typeof(Guid))
        {
            if (Guid.TryParse(value.ToString(), out var result))
            {
                return (T)ReturnAsObject(result)!;
            }
        }
        if (typeof(T) == typeof(decimal))
        {
            if (value.ToString()!.Equals(""))
            {
                return (T)ReturnAsObject(0M)!;
            }
            return (T)Convert.ChangeType(value, typeof(T));
        }
        if (typeof(T) == typeof(bool))
        {
            if (value is bool)
            {
                return (T)value;
            }
            var returnValue = value.ToBool();
            return (T)ReturnAsObject(returnValue)!;
        }
        if (typeof(T) == typeof(List<int>))
        {
            return (T)StringExtensions.SplitStringUsing<int>(value.ToString());
        }
        if (typeof(T) == typeof(List<string>))
        {
            var valueString = value.ToString().RemoveAllLineBreaks();
            return (T)StringExtensions.SplitStringUsing<string>(valueString);
        }
        if (typeof(T) == typeof(List<Guid>))
        {
            return (T)StringExtensions.SplitStringGuid(value.ToString());
        }

        return (T)Convert.ChangeType(value, typeof(T));
    }

    /// <summary>
    /// Returns anything as object
    /// </summary>
    /// <typeparam name="T"></typeparam>
    /// <param name="s"></param>
    /// <returns></returns>
    private static object? ReturnAsObject<T>(T? s)
    {
        return s;
    }

    /// <summary>
    /// Converts object to dictionary
    /// </summary>
    /// <param name="obj"></param>
    /// <returns></returns>
    public static Dictionary<string, string>? ToDictionary(this object obj)
    {
        var json = JsonSerializer.Serialize(obj);
        return JsonSerializer.Deserialize<Dictionary<string, string>>(json);
    }

    /// <summary>
    /// Gets and converts data stored in Dictionary(string, object), used mainly for extended data
    /// </summary>
    /// <typeparam name="T"></typeparam>
    /// <param name="extendedData">The dictionary</param>
    /// <param name="key">The key for the data</param>
    /// <returns>T</returns>
    public static T? Get<T>(this Dictionary<string, object> extendedData, string key)
    {
        if (extendedData.ContainsKey(key))
        {
            if (extendedData[key] is T)
            {
                return (T)extendedData[key];
            }

            var value = extendedData[key].ToString();
            if (value.IsNullOrWhiteSpace())
            {
                return JsonSerializer.Deserialize<T>(value!);
            }
        }

        return default;
    }

    public static string? Get(this Dictionary<string, object> extendedData, string key)
    {
        if (extendedData.TryGetValue(key, out var value))
        {
            return value.ToString();
        }

        return null;
    }

    /// <summary>
    /// Adds or updates an item in the dictionary
    /// </summary>
    /// <typeparam name="T"></typeparam>
    /// <param name="extendedData"></param>
    /// <param name="key"></param>
    /// <param name="item"></param>
    public static void AddOrUpdate<T>(this Dictionary<string, object> extendedData, string key, T item)
    {
        if (item != null)
        {
            if (extendedData.ContainsKey(key))
            {
                extendedData[key] = item;
            }
            else
            {
                extendedData.Add(key, item);
            }
        }
    }
}
