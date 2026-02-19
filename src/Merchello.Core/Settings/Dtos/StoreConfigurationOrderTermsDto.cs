namespace Merchello.Core.Settings.Dtos;

public class StoreConfigurationOrderTermsDto
{
    public bool ShowCheckbox { get; set; } = true;

    public string CheckboxText { get; set; } = "I agree to the {terms:Terms & Conditions} and {privacy:Privacy Policy}";

    public bool CheckboxRequired { get; set; } = true;
}
