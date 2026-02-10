using Merchello.Core.Shared.Models;
using Merchello.Core.Shared.Models.Enums;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Umbraco.Cms.Api.Common.Attributes;
using Umbraco.Cms.Web.Common.Authorization;
using Umbraco.Cms.Web.Common.Routing;

namespace Merchello.Controllers
{
    [ApiController]
    [BackOfficeRoute("api/v{version:apiVersion}")]
    [Authorize(Policy = AuthorizationPolicies.SectionAccessContent)]
    [MapToApi(Core.Constants.ApiName)]
    public class MerchelloApiControllerBase : ControllerBase
    {
        /// <summary>
        /// Returns an error IActionResult if the CrudResult failed, null if successful.
        /// Maps "not found" errors to 404, others to 400 with single message.
        /// </summary>
        protected IActionResult? CrudError<T>(CrudResult<T> result)
        {
            if (result.Success) return null;
            var msg = result.Messages
                .FirstOrDefault(m => m.ResultMessageType == ResultMessageType.Error)?.Message;
            if (msg?.Contains("not found", StringComparison.OrdinalIgnoreCase) == true)
                return NotFound(msg);
            return BadRequest(msg ?? "Operation failed.");
        }

        /// <summary>
        /// Returns an error IActionResult if the CrudResult failed, null if successful.
        /// Maps "not found" errors to 404, others to 400 with { errors } collection.
        /// </summary>
        protected IActionResult? CrudErrors<T>(CrudResult<T> result)
        {
            if (result.Success) return null;
            var errors = result.Messages
                .Where(m => m.ResultMessageType == ResultMessageType.Error)
                .Select(m => m.Message)
                .ToList();
            if (errors.Any(e => e?.Contains("not found", StringComparison.OrdinalIgnoreCase) == true))
                return NotFound();
            return BadRequest(new { errors });
        }
    }
}
