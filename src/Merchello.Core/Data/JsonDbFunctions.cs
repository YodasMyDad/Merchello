using Merchello.Core.Shared.Models;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Query;

namespace Merchello.Core.Data;

//https://stackoverflow.com/questions/72758030/using-json-query-as-dbfunction-in-ef-core-6
public static class JsonDbFunctions
{
    [DbFunction("JSON_VALUE", Schema = "", IsBuiltIn = true)]
    public static string JsonValue(string? source, [NotParameterized] string? path) => throw new NotSupportedException();

    [DbFunction("OPENJSON", Schema = "", IsBuiltIn = true)]
    public static IQueryable<ExtendedData> OpenJson(string? source, [NotParameterized] string? path) => throw new NotSupportedException();

    [DbFunction("JSON_QUERY", Schema = "", IsBuiltIn = true)]
    public static string JsonQuery(string? source, [NotParameterized] string? path) => throw new NotSupportedException();
}

//var results = _context.Pages.Where(p => JsonDbFunctions.OpenJson(p._PublishedContent, "$.array_item").Any(c => c.Value == "Choice 2"));
