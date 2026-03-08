using System.Text;
using Merchello.Core.Actions.Interfaces;
using Merchello.Core.Actions.Models;

namespace Merchello.ActionExamples.Actions;

public class CustomerCsvDownloadAction : IMerchelloAction
{
    public ActionMetadata Metadata => new()
    {
        Key = "merchello-examples.customer-csv-download",
        DisplayName = "CSV Download",
        Category = ActionCategory.Customer,
        Behavior = ActionBehavior.Download,
        Icon = "icon-download-alt",
        Description = "Downloads a Hello World CSV file.",
        SortOrder = 200
    };

    public Task<ActionResult> ExecuteAsync(
        ActionContext context,
        CancellationToken cancellationToken = default)
    {
        var csv = "Message\nHello World";
        return Task.FromResult(new ActionResult
        {
            Success = true,
            FileBytes = Encoding.UTF8.GetBytes(csv),
            FileName = "customer-hello-world.csv",
            ContentType = "text/csv"
        });
    }
}
