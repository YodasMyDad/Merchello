using Umbraco.Cms.Api.Management.OpenApi;

namespace Merchello.Composers;

public class MerchelloOperationSecurityFilter : BackOfficeSecurityRequirementsOperationFilterBase
{
    protected override string ApiName => Core.Constants.ApiName;
}
