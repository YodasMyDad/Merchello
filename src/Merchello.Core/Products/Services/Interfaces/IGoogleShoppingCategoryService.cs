using Merchello.Core.Products.Dtos;
using Merchello.Core.Products.Services.Parameters;

namespace Merchello.Core.Products.Services.Interfaces;

public interface IGoogleShoppingCategoryService
{
    Task<GoogleShoppingCategoryResultDto> GetCategoriesAsync(
        GetGoogleShoppingCategoriesParameters parameters,
        CancellationToken cancellationToken = default);
}

