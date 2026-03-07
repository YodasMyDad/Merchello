using Merchello.Core.Actions.Interfaces;
using Merchello.Core.Actions.Models;

namespace Merchello.ActionExamples.Actions;

public class OrderDialogOpenAction : IMerchelloAction
{
    public ActionMetadata Metadata => new()
    {
        Key = "merchello-examples.order-dialog-open",
        DisplayName = "Dialog Open",
        Category = ActionCategory.Order,
        Behavior = ActionBehavior.Sidebar,
        Icon = "icon-chat",
        Description = "Opens a sidebar panel showing fulfillment order details.",
        SortOrder = 100,
        SidebarJsModule = "/_content/Merchello.ActionExamples/merchello-action-examples.js",
        SidebarElementTag = "merchello-order-panel",
        SidebarSize = "medium"
    };

    public Task<ActionResult> ExecuteAsync(
        ActionContext context,
        CancellationToken cancellationToken = default)
    {
        return Task.FromResult(ActionResult.Ok());
    }
}
