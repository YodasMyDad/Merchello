using Merchello.Core.Actions.Interfaces;
using Merchello.Core.Actions.Models;

namespace Merchello.ActionExamples.Actions;

public class SupplierDialogOpenAction : IMerchelloAction
{
    public ActionMetadata Metadata => new()
    {
        Key = "merchello-examples.supplier-dialog-open",
        DisplayName = "Dialog Open",
        Category = ActionCategory.Supplier,
        Behavior = ActionBehavior.Sidebar,
        Icon = "icon-chat",
        Description = "Opens a sidebar panel showing supplier details.",
        SortOrder = 100,
        SidebarJsModule = "/_content/Merchello.ActionExamples/merchello-action-examples.js",
        SidebarElementTag = "merchello-supplier-panel",
        SidebarSize = "medium"
    };

    public Task<ActionResult> ExecuteAsync(
        ActionContext context,
        CancellationToken cancellationToken = default)
    {
        return Task.FromResult(ActionResult.Ok());
    }
}
