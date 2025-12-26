using Merchello.Site.Category.Models;

namespace Umbraco.Cms.Web.Common.PublishedModels;

public partial class Category
{
    public CategoryPageViewModel ViewModel { get; set; } = new();
}
