namespace Merchello.Core.Settings.Dtos;

public class StoreConfigurationDto
{
    public string StoreKey { get; set; } = "default";

    public StoreConfigurationStorePanelDto Store { get; set; } = new();

    public StoreConfigurationInvoiceRemindersDto InvoiceReminders { get; set; } = new();

    public StoreConfigurationPoliciesDto Policies { get; set; } = new();

    public StoreConfigurationCheckoutDto Checkout { get; set; } = new();

    public StoreConfigurationAbandonedCheckoutDto AbandonedCheckout { get; set; } = new();

    public StoreConfigurationEmailDto Email { get; set; } = new();

    public StoreConfigurationUcpDto Ucp { get; set; } = new();
}
