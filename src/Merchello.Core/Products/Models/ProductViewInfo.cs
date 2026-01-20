namespace Merchello.Core.Products.Models;

/// <summary>
/// Information about a product view discovered from configured locations.
/// </summary>
/// <param name="Alias">The view alias (filename without extension, e.g., "Gallery")</param>
/// <param name="VirtualPath">The virtual path to the view (e.g., "~/Views/Products/Gallery.cshtml")</param>
public record ProductViewInfo(string Alias, string VirtualPath);
