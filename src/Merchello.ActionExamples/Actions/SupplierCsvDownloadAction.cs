using System.Text;
using Merchello.Core.Actions.Interfaces;
using Merchello.Core.Actions.Models;

namespace Merchello.ActionExamples.Actions;

public class SupplierCsvDownloadAction : IMerchelloAction
{
    public ActionMetadata Metadata => new()
    {
        Key = "merchello-examples.supplier-csv-download",
        DisplayName = "CSV Download",
        Category = ActionCategory.Supplier,
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
            FileName = "supplier-hello-world.csv",
            ContentType = "text/csv"
        });
    }
}
