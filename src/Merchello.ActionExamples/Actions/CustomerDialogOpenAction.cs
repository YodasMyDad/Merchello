using Merchello.Core.Actions.Interfaces;
using Merchello.Core.Actions.Models;

namespace Merchello.ActionExamples.Actions;

public class CustomerDialogOpenAction : IMerchelloAction
{
    public ActionMetadata Metadata => new()
    {
        Key = "merchello-examples.customer-dialog-open",
        DisplayName = "Dialog Open",
        Category = ActionCategory.Customer,
        Behavior = ActionBehavior.Sidebar,
        Icon = "icon-chat",
        Description = "Opens a sidebar panel showing customer details.",
        SortOrder = 100,
        SidebarJsModule = "/_content/Merchello.ActionExamples/merchello-action-examples.js",
        SidebarElementTag = "merchello-customer-panel",
        SidebarSize = "medium"
    };

    public Task<ActionResult> ExecuteAsync(
        ActionContext context,
        CancellationToken cancellationToken = default)
    {
        return Task.FromResult(ActionResult.Ok());
    }
}
