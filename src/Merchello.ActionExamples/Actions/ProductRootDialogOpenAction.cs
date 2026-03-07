using Merchello.Core.Actions.Interfaces;
using Merchello.Core.Actions.Models;

namespace Merchello.ActionExamples.Actions;

public class ProductRootDialogOpenAction : IMerchelloAction
{
    public ActionMetadata Metadata => new()
    {
        Key = "merchello-examples.product-root-dialog-open",
        DisplayName = "Dialog Open",
        Category = ActionCategory.ProductRoot,
        Behavior = ActionBehavior.Sidebar,
        Icon = "icon-chat",
        Description = "Opens a sidebar panel showing product details.",
        SortOrder = 100,
        SidebarJsModule = "/_content/Merchello.ActionExamples/merchello-action-examples.js",
        SidebarElementTag = "merchello-product-root-panel",
        SidebarSize = "medium"
    };

    public Task<ActionResult> ExecuteAsync(
        ActionContext context,
        CancellationToken cancellationToken = default)
    {
        return Task.FromResult(ActionResult.Ok());
    }
}
